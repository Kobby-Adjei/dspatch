import os
import uuid
from dotenv import load_dotenv
from flask import Flask, request, Response, jsonify
from flask_cors import CORS

load_dotenv()
from twilio.twiml.voice_response import VoiceResponse, Connect, Stream, Parameter
from twilio.twiml.messaging_response import MessagingResponse

from agent.watsonx import classify_urgency, classify_ticket_type, generate_response
from ticketing.ticket_router import TicketRouter

app           = Flask(__name__)
CORS(app)
ticket_router = TicketRouter()

DEMO_BUSINESS_ID = os.getenv("DEMO_BUSINESS_ID", "detroit-plumbing-co")
FLASK_PUBLIC_URL  = os.getenv(
    "FLASK_PUBLIC_URL",
    "https://dspatch-flask.29wb2lul59qv.ca-tor.codeengine.appdomain.cloud",
)


# ── Business lookup ──────────────────────────────────────────────────────────

def _resolve_business(to_number: str = "") -> dict:
    from onboarding.business_store import find_by_phone, find_by_id

    if to_number:
        profile = find_by_phone(to_number)
        if profile:
            return profile
        print(f"[business] no match for {to_number}, falling back to demo")

    profile = find_by_id(DEMO_BUSINESS_ID)
    if profile:
        return profile

    return {
        "id":       DEMO_BUSINESS_ID,
        "name":     "Detroit Plumbing Co.",
        "industry": "home_services",
        "hours":    {"mon-fri": "8am-6pm", "sat": "9am-3pm", "sun": "closed"},
        "routing_rules": {
            "emergency_keywords": ["flood", "flooding", "burst pipe", "no heat", "gas leak"],
            "urgent_keywords":    ["broken", "not working", "leaking", "backed up"],
        },
    }


# ── Business signup ──────────────────────────────────────────────────────────

@app.route("/businesses", methods=["POST"])
def create_business():
    data = request.get_json(force=True, silent=True) or {}

    required = ["name", "industry", "hours", "services"]
    missing  = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing required fields: {missing}"}), 400

    valid_industries = ["home_services", "hospitality", "retail"]
    if data["industry"] not in valid_industries:
        return jsonify({"error": f"industry must be one of {valid_industries}"}), 400

    business_id = data.get("id") or data["name"].lower().replace(" ", "-") + "-" + str(uuid.uuid4())[:8]
    area_code   = data.get("area_code")

    profile = {
        "id":       business_id,
        "name":     data["name"],
        "industry": data["industry"],
        "hours":    data["hours"],
        "services": data["services"],
        "pricing":  data.get("pricing", []),
        "faqs":     data.get("faqs", []),
        "routing_rules": data.get("routing_rules", {
            "emergency_keywords": ["flood", "flooding", "burst pipe", "no heat", "gas leak"],
            "urgent_keywords":    ["broken", "not working", "leaking", "backed up"],
        }),
    }

    try:
        from onboarding.number_provisioner import provision_number
        result  = provision_number(business_id, area_code=area_code)
        profile["phone"]       = result["phone_number"]
        profile["twilio_sid"]  = result["sid"]
        print(f"[signup] provisioned {result['phone_number']} for {business_id}")
    except Exception as exc:
        print(f"[signup] number provisioning failed: {exc}")

    from onboarding.business_store import save_business
    save_business(profile)

    print(f"[signup] business created: {business_id}")
    return jsonify(profile), 201


# ── SMS webhook ──────────────────────────────────────────────────────────────

@app.route("/sms", methods=["POST"])
def sms_webhook():
    body       = request.form.get("Body", "").strip()
    from_phone = request.form.get("From", "")
    to_phone   = request.form.get("To", "")
    msg_sid    = request.form.get("MessageSid", "")

    print(f"[sms] inbound from={from_phone} to={to_phone} sid={msg_sid}")

    resp = MessagingResponse()

    if not body:
        resp.message("We received your message but it was empty. Please describe how we can help.")
        return str(resp)

    business    = _resolve_business(to_phone)
    urgency     = classify_urgency(body, business.get("routing_rules", {}))
    ticket_type = classify_ticket_type(body, business.get("industry", "home_services"))

    try:
        ticket = ticket_router.create_ticket(
            business_id    = business["id"],
            customer_phone = from_phone,
            issue_summary  = body,
            ticket_type    = ticket_type,
            urgency        = urgency,
            raw_message    = body,
            channel        = "sms",
        )
        print(f"[ticket] {ticket_type} created: {ticket.id} urgency={urgency}")
    except Exception as exc:
        print(f"[ticket] failed to create ticket: {exc}")

    ai_reply = generate_response(
        business_profile = business,
        customer_message = body,
        context_chunks   = [],
        urgency          = urgency,
    )

    resp.message(ai_reply)
    return str(resp)


# ── Voice webhook ─────────────────────────────────────────────────────────────

@app.route("/voice", methods=["POST"])
def voice_webhook():
    call_sid   = request.form.get("CallSid", "")
    from_phone = request.form.get("From", "")
    to_phone   = request.form.get("To", "")

    print(f"[voice] inbound call from={from_phone} to={to_phone} sid={call_sid}")

    websocket_url = os.getenv("WEBSOCKET_URL", "wss://localhost:8765")

    response = VoiceResponse()
    connect  = Connect()
    stream   = Stream(url=websocket_url)
    stream.append(Parameter(name="from_phone", value=from_phone))
    stream.append(Parameter(name="to_phone", value=to_phone))
    connect.append(stream)
    response.append(connect)

    return Response(str(response), mimetype="text/xml")


# ── Tickets API ───────────────────────────────────────────────────────────────

def _ticket_filters():
    filters = {}
    for key in ("status", "priority", "urgency", "ticket_type", "date_from"):
        value = request.args.get(key)
        if value:
            filters[key] = value
    return filters


@app.route("/businesses/<business_id>/tickets", methods=["GET"])
def list_business_tickets(business_id):
    filters = _ticket_filters()
    tickets = ticket_router.list_tickets(business_id=business_id, filters=filters)
    return jsonify({"tickets": tickets, "count": len(tickets)})


@app.route("/tickets", methods=["GET"])
def list_all_tickets():
    filters = _ticket_filters()
    tickets = ticket_router.list_tickets(filters=filters)
    return jsonify({"tickets": tickets, "count": len(tickets)})


@app.route("/businesses/<business_id>/tickets", methods=["POST"])
def create_ticket_api(business_id):
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "request body must be JSON"}), 400

    required = ["customer_phone", "issue_summary", "ticket_type", "urgency"]
    missing  = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": "missing required fields", "fields": missing}), 400

    try:
        ticket = ticket_router.create_ticket(
            business_id      = business_id,
            customer_phone   = data["customer_phone"],
            issue_summary    = data["issue_summary"],
            ticket_type      = data["ticket_type"],
            urgency          = data["urgency"],
            raw_message      = data.get("raw_message", ""),
            channel          = data.get("channel", "api"),
            priority         = data.get("priority"),
            suggested_action = data.get("suggested_action"),
            assigned_to      = data.get("assigned_to"),
            industry         = data.get("industry"),
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    return jsonify({"ticket": ticket_router.ticket_to_dict(ticket)}), 201


@app.route("/tickets/<ticket_id>", methods=["PATCH"])
def update_ticket(ticket_id):
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "request body must be JSON"}), 400

    allowed  = {"status", "priority", "assigned_to"}
    rejected = sorted(set(data) - allowed)
    if rejected:
        return jsonify({
            "error": "unsupported fields",
            "fields": rejected,
            "allowed_fields": sorted(allowed),
        }), 400

    updates = {key: data[key] for key in allowed if key in data}
    if not updates:
        return jsonify({"error": "provide at least one of: status, priority, assigned_to"}), 400

    try:
        ticket = ticket_router.update_ticket(ticket_id, updates)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if not ticket:
        return jsonify({"error": "ticket not found", "ticket_id": ticket_id}), 404
    return jsonify({"ticket": ticket})


@app.route("/tickets/<ticket_id>/resolve", methods=["POST"])
def resolve_ticket(ticket_id):
    ticket = ticket_router.resolve_ticket(ticket_id)
    if not ticket:
        return jsonify({"error": "ticket not found", "ticket_id": ticket_id}), 404
    return jsonify({"ticket": ticket, "resolved": ticket_id})


@app.route("/tickets/<ticket_id>/messages", methods=["GET"])
def list_ticket_messages(ticket_id):
    messages = ticket_router.list_messages(ticket_id)
    return jsonify({"messages": messages, "count": len(messages)})


# ── Health ────────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


# ── Error handlers ────────────────────────────────────────────────────────────

@app.errorhandler(404)
def json_not_found(error):
    return jsonify({"error": "not found", "path": request.path}), 404

@app.errorhandler(405)
def json_method_not_allowed(error):
    return jsonify({"error": "method not allowed", "path": request.path}), 405

@app.errorhandler(500)
def json_server_error(error):
    return jsonify({"error": "internal server error"}), 500


if __name__ == "__main__":
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    port  = int(os.getenv("FLASK_PORT", "5000"))
    app.run(debug=debug, port=port)
