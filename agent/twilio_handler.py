# agent/twilio_handler.py
# Twilio webhook handler for incoming calls and SMS

import os
from flask import Flask, request, Response
from twilio.twiml.voice_response import VoiceResponse, Connect, Stream
from twilio.twiml.messaging_response import MessagingResponse

app = Flask(__name__)

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

if __name__ == "__main__":
    app.run(debug=True, port=5000)
