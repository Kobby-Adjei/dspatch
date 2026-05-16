import os
from flask import Flask, request, Response, jsonify
from twilio.twiml.voice_response import VoiceResponse, Connect, Stream
from twilio.twiml.messaging_response import MessagingResponse

from agent.watsonx import classify_urgency, classify_ticket_type, generate_response
from ticketing.ticket_router import TicketRouter

app          = Flask(__name__)
ticket_router = TicketRouter()

DEMO_BUSINESS_ID = os.getenv("DEMO_BUSINESS_ID", "detroit-plumbing-co")


# ── Business lookup ─────────────────────────────────────────────────────────

def _resolve_business(to_number: str = "") -> dict:
    """
    Look up business by Twilio To number.
    Falls back to demo profile when no DB match or in dev mode.
    """
    try:
        from onboarding.business_setup import load_business_profile
        path = f"onboarding/examples/{DEMO_BUSINESS_ID}.json"
        return load_business_profile(path)
    except Exception as exc:
        print(f"[business] profile lookup failed: {exc}, using hardcoded demo")
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


# ── SMS webhook ─────────────────────────────────────────────────────────────

@app.route("/sms", methods=["POST"])
def sms_webhook():
    body       = request.form.get("Body", "").strip()
    from_phone = request.form.get("From", "")
    to_phone   = request.form.get("To", "")
    msg_sid    = request.form.get("MessageSid", "")

    print(f"[sms] inbound from={from_phone} to={to_phone} sid={msg_sid}")

    resp = MessagingResponse()

    if not body:
        print("[sms] empty body — skipping ticket creation")
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


# ── Voice webhook ────────────────────────────────────────────────────────────

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
    connect.append(stream)
    response.append(connect)

    return Response(str(response), mimetype="text/xml")


# ── Health ───────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
