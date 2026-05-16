import os
import unittest
from unittest.mock import patch

from ticketing.ticket_router import TicketRouter


class TicketRouterTest(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {}, clear=True)
        self.env.start()
        self.print_patch = patch("builtins.print")
        self.print_patch.start()
        self.router = TicketRouter()

    def tearDown(self):
        self.print_patch.stop()
        self.env.stop()

    def _create_sample_tickets(self):
        emergency = self.router.create_ticket(
            business_id="detroit-plumbing-co",
            customer_phone="+13135550101",
            issue_summary="My basement is flooding.",
            ticket_type="Emergency Service",
            urgency="emergency",
            raw_message="My basement is flooding.",
        )
        appointment = self.router.create_ticket(
            business_id="detroit-plumbing-co",
            customer_phone="+13135550102",
            issue_summary="Can I schedule a visit?",
            ticket_type="Appointment Request",
            urgency="medium",
        )
        other_business = self.router.create_ticket(
            business_id="demo-restaurant",
            customer_phone="+13135550103",
            issue_summary="I need a table for four.",
            ticket_type="Reservation",
            urgency="low",
        )
        return emergency, appointment, other_business

    def test_create_ticket_sets_operational_fields(self):
        ticket = self.router.create_ticket(
            business_id="detroit-plumbing-co",
            customer_phone="+13135550101",
            issue_summary="My basement is flooding.",
            ticket_type="Emergency Service",
            urgency="emergency",
        )

        data = self.router.ticket_to_dict(ticket)

        self.assertEqual(data["business_id"], "detroit-plumbing-co")
        self.assertEqual(data["ticket_type"], "Emergency Service")
        self.assertEqual(data["urgency"], "emergency")
        self.assertEqual(data["priority"], "high")
        self.assertEqual(data["status"], "open")
        self.assertEqual(data["suggested_action"], "Immediate callback")
        self.assertTrue(data["id"])
        self.assertTrue(data["created_at"].endswith("Z"))

    def test_list_tickets_filters_by_business(self):
        self._create_sample_tickets()

        tickets = self.router.list_tickets("detroit-plumbing-co")

        self.assertEqual(len(tickets), 2)
        self.assertEqual({ticket["business_id"] for ticket in tickets}, {"detroit-plumbing-co"})

    def test_list_tickets_filters_by_urgency(self):
        self._create_sample_tickets()

        tickets = self.router.list_tickets("detroit-plumbing-co", {"urgency": "emergency"})

        self.assertEqual(len(tickets), 1)
        self.assertEqual(tickets[0]["urgency"], "emergency")
        self.assertEqual(tickets[0]["ticket_type"], "Emergency Service")

    def test_list_tickets_filters_by_ticket_type(self):
        self._create_sample_tickets()

        tickets = self.router.list_tickets(
            "detroit-plumbing-co",
            {"ticket_type": "Appointment Request"},
        )

        self.assertEqual(len(tickets), 1)
        self.assertEqual(tickets[0]["ticket_type"], "Appointment Request")

    def test_update_ticket_accepts_status_priority_and_assigned_to(self):
        ticket = self.router.create_ticket(
            business_id="detroit-plumbing-co",
            customer_phone="+13135550101",
            issue_summary="Can I get an estimate?",
            ticket_type="Quote Request",
            urgency="medium",
        )

        updated = self.router.update_ticket(
            ticket.id,
            {
                "status": "in_progress",
                "priority": "high",
                "assigned_to": "Ify",
                "ticket_type": "Should Be Ignored",
            },
        )

        self.assertEqual(updated["status"], "in_progress")
        self.assertEqual(updated["priority"], "high")
        self.assertEqual(updated["assigned_to"], "Ify")
        self.assertEqual(updated["ticket_type"], "Quote Request")

    def test_resolve_ticket_sets_status_and_resolved_at(self):
        ticket = self.router.create_ticket(
            business_id="detroit-plumbing-co",
            customer_phone="+13135550101",
            issue_summary="Can I get an estimate?",
            ticket_type="Quote Request",
            urgency="medium",
        )

        resolved = self.router.resolve_ticket(ticket.id)

        self.assertEqual(resolved["status"], "resolved")
        self.assertTrue(resolved["resolved_at"].endswith("Z"))

    def test_get_missing_ticket_returns_none(self):
        self.assertIsNone(self.router.get_ticket("missing-ticket-id"))

    def test_messages_include_raw_message_for_created_ticket(self):
        ticket = self.router.create_ticket(
            business_id="detroit-plumbing-co",
            customer_phone="+13135550101",
            issue_summary="My basement is flooding.",
            ticket_type="Emergency Service",
            urgency="emergency",
            raw_message="My basement is flooding.",
        )

        messages = self.router.list_messages(ticket.id)

        self.assertEqual(len(messages), 1)
        self.assertEqual(messages[0]["ticket_id"], ticket.id)
        self.assertEqual(messages[0]["direction"], "inbound")
        self.assertEqual(messages[0]["body"], "My basement is flooding.")


if __name__ == "__main__":
    unittest.main()
