# agent/twilio_handler.py
# Twilio webhook handler for incoming calls and SMS

import os
import sys
from pathlib import Path

from flask import Flask, request, Response, jsonify
from twilio.twiml.voice_response import VoiceResponse, Connect, Stream
from twilio.twiml.messaging_response import MessagingResponse

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ticketing.ticket_router import TicketRouter

app = Flask(__name__)
ticket_router = TicketRouter()

class TwilioWebhookHandler:
    """Handles Twilio webhooks for voice and SMS."""

    def __init__(self):
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.phone_number = os.getenv("TWILIO_PHONE_NUMBER")
        self.websocket_url = os.getenv("WEBSOCKET_URL", "wss://localhost:8765")

@app.route("/voice", methods=["POST"])
def voice_webhook():
    """Handle incoming voice calls via Twilio."""
    response = VoiceResponse()
    connect = Connect()
    stream = Stream(url=os.getenv("WEBSOCKET_URL", "wss://localhost:8765"))
    connect.append(stream)
    response.append(connect)
    return Response(str(response), mimetype="text/xml")

@app.route("/sms", methods=["POST"])
def sms_webhook():
    """Handle incoming SMS messages via Twilio."""
    incoming_msg = request.form.get("Body", "").strip()
    response = MessagingResponse()
    response.message(f"DSPatch received your message: {incoming_msg}. We'll follow up shortly!")
    return str(response)

@app.route("/health", methods=["GET"])
def health():
    """Health check for the JSON API."""
    return jsonify({"status": "ok"})

@app.route("/businesses/<business_id>/tickets", methods=["GET"])
def list_business_tickets(business_id):
    """List tickets for a business, with dashboard queue filters."""
    filters = _ticket_filters()
    tickets = ticket_router.list_tickets(business_id=business_id, filters=filters)
    return jsonify({"tickets": tickets, "count": len(tickets)})

@app.route("/tickets", methods=["GET"])
def list_all_tickets():
    """List tickets across businesses, with the same filters as business-scoped listing."""
    filters = _ticket_filters()
    tickets = ticket_router.list_tickets(filters=filters)
    return jsonify({"tickets": tickets, "count": len(tickets)})

@app.route("/businesses/<business_id>/tickets", methods=["POST"])
def create_ticket(business_id):
    """Create a ticket from JSON."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "request body must be JSON"}), 400

    required = ["customer_phone", "issue_summary", "ticket_type", "urgency"]
    missing = [field for field in required if not data.get(field)]
    if missing:
        return jsonify({"error": "missing required fields", "fields": missing}), 400

    try:
        ticket = ticket_router.create_ticket(
            business_id=business_id,
            customer_phone=data["customer_phone"],
            issue_summary=data["issue_summary"],
            ticket_type=data["ticket_type"],
            urgency=data["urgency"],
            raw_message=data.get("raw_message", ""),
            channel=data.get("channel", "api"),
            priority=data.get("priority"),
            suggested_action=data.get("suggested_action"),
            assigned_to=data.get("assigned_to"),
            industry=data.get("industry"),
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    return jsonify({"ticket": ticket_router.ticket_to_dict(ticket)}), 201

@app.route("/tickets/<ticket_id>", methods=["PATCH"])
def update_ticket(ticket_id):
    """Patch editable ticket fields."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "request body must be JSON"}), 400

    allowed = {"status", "priority", "assigned_to"}
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
    """Mark a ticket resolved."""
    ticket = ticket_router.resolve_ticket(ticket_id)
    if not ticket:
        return jsonify({"error": "ticket not found", "ticket_id": ticket_id}), 404
    return jsonify({"ticket": ticket, "resolved": ticket_id})

@app.route("/tickets/<ticket_id>/messages", methods=["GET"])
def list_ticket_messages(ticket_id):
    """List messages attached to a ticket."""
    messages = ticket_router.list_messages(ticket_id)
    return jsonify({"messages": messages, "count": len(messages)})

@app.errorhandler(404)
def json_not_found(error):
    return jsonify({"error": "not found", "path": request.path}), 404

@app.errorhandler(405)
def json_method_not_allowed(error):
    return jsonify({"error": "method not allowed", "path": request.path}), 405

@app.errorhandler(500)
def json_server_error(error):
    return jsonify({"error": "internal server error"}), 500

def _ticket_filters():
    filters = {}
    for key in ("status", "priority", "urgency", "ticket_type", "date_from"):
        value = request.args.get(key)
        if value:
            filters[key] = value
    return filters

if __name__ == "__main__":
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    port = int(os.getenv("FLASK_PORT", "5000"))
    app.run(debug=debug, port=port)
