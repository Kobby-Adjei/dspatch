import importlib
import os
import sys
import types
import unittest
from unittest.mock import patch


try:
    import flask  # noqa: F401
except ImportError:
    flask = None


def _install_twilio_stub():
    voice_response = types.ModuleType("twilio.twiml.voice_response")
    messaging_response = types.ModuleType("twilio.twiml.messaging_response")

    class VoiceResponse:
        def __init__(self):
            self.children = []

        def append(self, child):
            self.children.append(child)

        def __str__(self):
            return "<Response />"

    class Connect:
        def __init__(self):
            self.children = []

        def append(self, child):
            self.children.append(child)

    class Stream:
        def __init__(self, url=None):
            self.url = url

    class MessagingResponse:
        def __init__(self):
            self.messages = []

        def message(self, body):
            self.messages.append(body)

        def __str__(self):
            body = "".join(f"<Message>{message}</Message>" for message in self.messages)
            return f"<Response>{body}</Response>"

    voice_response.VoiceResponse = VoiceResponse
    voice_response.Connect = Connect
    voice_response.Stream = Stream
    messaging_response.MessagingResponse = MessagingResponse

    sys.modules.setdefault("twilio", types.ModuleType("twilio"))
    sys.modules.setdefault("twilio.twiml", types.ModuleType("twilio.twiml"))
    sys.modules["twilio.twiml.voice_response"] = voice_response
    sys.modules["twilio.twiml.messaging_response"] = messaging_response


@unittest.skipIf(flask is None, "Flask is not installed")
class TicketApiTest(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {}, clear=True)
        self.env.start()
        self.print_patch = patch("builtins.print")
        self.print_patch.start()
        _install_twilio_stub()
        sys.modules.pop("agent.twilio_handler", None)
        self.module = importlib.import_module("agent.twilio_handler")
        self.module.ticket_router = self.module.TicketRouter()
        self.client = self.module.app.test_client()

    def tearDown(self):
        self.print_patch.stop()
        self.env.stop()

    def _post_ticket(self, **overrides):
        payload = {
            "customer_phone": "+13135550101",
            "issue_summary": "My basement is flooding.",
            "ticket_type": "Emergency Service",
            "urgency": "emergency",
            "raw_message": "My basement is flooding.",
        }
        payload.update(overrides)
        return self.client.post("/businesses/detroit-plumbing-co/tickets", json=payload)

    def test_health_returns_json(self):
        response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"status": "ok"})

    def test_create_ticket_returns_json_ticket(self):
        response = self._post_ticket()
        data = response.get_json()

        self.assertEqual(response.status_code, 201)
        self.assertEqual(data["ticket"]["business_id"], "detroit-plumbing-co")
        self.assertEqual(data["ticket"]["urgency"], "emergency")
        self.assertEqual(data["ticket"]["ticket_type"], "Emergency Service")

    def test_sms_creates_typed_emergency_ticket(self):
        response = self.client.post(
            "/sms",
            data={
                "From": "+13135550101",
                "To": "+13135550100",
                "Body": "My basement is flooding.",
            },
        )

        tickets_response = self.client.get("/businesses/detroit-plumbing-co/tickets?urgency=emergency")
        data = tickets_response.get_json()

        self.assertEqual(response.status_code, 200)
        self.assertIn("Your emergency request has been received", response.get_data(as_text=True))
        self.assertEqual(data["count"], 1)
        self.assertEqual(data["tickets"][0]["ticket_type"], "Emergency Service")
        self.assertEqual(data["tickets"][0]["urgency"], "emergency")
        self.assertEqual(data["tickets"][0]["priority"], "high")
        self.assertEqual(data["tickets"][0]["suggested_action"], "Immediate callback")
        self.assertEqual(data["tickets"][0]["issue_summary"], "Basement flooding - water leak")

        messages_response = self.client.get(f"/tickets/{data['tickets'][0]['id']}/messages")
        messages = messages_response.get_json()["messages"]

        self.assertEqual(len(messages), 2)
        self.assertEqual(messages[0]["direction"], "inbound")
        self.assertEqual(messages[0]["body"], "My basement is flooding.")
        self.assertEqual(messages[1]["direction"], "outbound")
        self.assertIn("Your emergency request has been received", messages[1]["body"])
        self.assertEqual({message["ticket_id"] for message in messages}, {data["tickets"][0]["id"]})
        self.assertEqual({message["business_id"] for message in messages}, {"detroit-plumbing-co"})
        self.assertEqual({message["customer_phone"] for message in messages}, {"+13135550101"})
        self.assertEqual({message["channel"] for message in messages}, {"sms"})

    def test_sms_calls_team1_responder_and_stores_exact_outbound_reply(self):
        with patch.object(self.module, "generate_response", return_value="Team 1 generated this reply.") as responder:
            response = self.client.post(
                "/sms",
                data={
                    "From": "+13135550104",
                    "To": "+13135550100",
                    "Body": "Can I book an appointment?",
                },
            )

        tickets_response = self.client.get("/businesses/detroit-plumbing-co/tickets?ticket_type=Appointment+Request")
        ticket = tickets_response.get_json()["tickets"][0]
        messages = self.client.get(f"/tickets/{ticket['id']}/messages").get_json()["messages"]

        self.assertEqual(response.status_code, 200)
        self.assertIn("<Message>Team 1 generated this reply.</Message>", response.get_data(as_text=True))
        responder.assert_called_once()
        responder_kwargs = responder.call_args.kwargs
        self.assertEqual(responder_kwargs["business_profile"]["id"], "detroit-plumbing-co")
        self.assertEqual(responder_kwargs["customer_message"], "Can I book an appointment?")
        self.assertEqual(responder_kwargs["urgency"], "medium")
        self.assertEqual(messages[0]["direction"], "inbound")
        self.assertEqual(messages[0]["body"], "Can I book an appointment?")
        self.assertEqual(messages[1]["direction"], "outbound")
        self.assertEqual(messages[1]["body"], "Team 1 generated this reply.")
        self.assertEqual(messages[1]["ticket_id"], ticket["id"])

    def test_sms_question_creates_lower_priority_quote_request(self):
        self.client.post(
            "/sms",
            data={
                "From": "+13135550102",
                "To": "+13135550100",
                "Body": "What are your hours?",
            },
        )

        tickets_response = self.client.get("/businesses/detroit-plumbing-co/tickets?ticket_type=Quote+Request")
        data = tickets_response.get_json()

        self.assertEqual(data["count"], 1)
        self.assertEqual(data["tickets"][0]["urgency"], "low")
        self.assertEqual(data["tickets"][0]["priority"], "low")

    def test_create_ticket_missing_fields_returns_json_400(self):
        response = self.client.post(
            "/businesses/detroit-plumbing-co/tickets",
            json={"customer_phone": "+13135550101"},
        )
        data = response.get_json()

        self.assertEqual(response.status_code, 400)
        self.assertEqual(data["error"], "missing required fields")
        self.assertIn("issue_summary", data["fields"])
        self.assertIn("ticket_type", data["fields"])
        self.assertIn("urgency", data["fields"])

    def test_business_tickets_filters_by_urgency(self):
        self._post_ticket()
        self._post_ticket(
            customer_phone="+13135550102",
            issue_summary="Can I schedule a visit?",
            ticket_type="Appointment Request",
            urgency="medium",
            raw_message="",
        )

        response = self.client.get("/businesses/detroit-plumbing-co/tickets?urgency=emergency")
        data = response.get_json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(data["count"], 1)
        self.assertEqual(data["tickets"][0]["urgency"], "emergency")

    def test_tickets_alias_filters_by_ticket_type(self):
        self._post_ticket()
        self._post_ticket(
            customer_phone="+13135550102",
            issue_summary="Can I schedule a visit?",
            ticket_type="Appointment Request",
            urgency="medium",
            raw_message="",
        )

        response = self.client.get("/tickets?ticket_type=Appointment+Request")
        data = response.get_json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(data["count"], 1)
        self.assertEqual(data["tickets"][0]["ticket_type"], "Appointment Request")

    def test_patch_ticket_accepts_status_priority_and_assigned_to(self):
        created = self._post_ticket().get_json()["ticket"]

        response = self.client.patch(
            f"/tickets/{created['id']}",
            json={"status": "in_progress", "priority": "high", "assigned_to": "Ify"},
        )
        data = response.get_json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(data["ticket"]["status"], "in_progress")
        self.assertEqual(data["ticket"]["priority"], "high")
        self.assertEqual(data["ticket"]["assigned_to"], "Ify")

    def test_patch_ticket_rejects_unsupported_fields(self):
        created = self._post_ticket().get_json()["ticket"]

        response = self.client.patch(
            f"/tickets/{created['id']}",
            json={"ticket_type": "Appointment Request"},
        )
        data = response.get_json()

        self.assertEqual(response.status_code, 400)
        self.assertEqual(data["error"], "unsupported fields")
        self.assertEqual(data["allowed_fields"], ["assigned_to", "priority", "status"])

    def test_resolve_ticket_returns_resolved_ticket(self):
        created = self._post_ticket().get_json()["ticket"]

        response = self.client.post(f"/tickets/{created['id']}/resolve")
        data = response.get_json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(data["ticket"]["status"], "resolved")
        self.assertTrue(data["ticket"]["resolved_at"].endswith("Z"))

    def test_ticket_messages_returns_json(self):
        created = self._post_ticket().get_json()["ticket"]

        response = self.client.get(f"/tickets/{created['id']}/messages")
        data = response.get_json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(data["count"], 1)
        self.assertEqual(data["messages"][0]["body"], "My basement is flooding.")

    def test_unknown_api_route_returns_json_404(self):
        response = self.client.get("/tickets/not-found/messages")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"messages": [], "count": 0})

        response = self.client.get("/missing")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.get_json()["error"], "not found")


if __name__ == "__main__":
    unittest.main()
