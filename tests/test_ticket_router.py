import os
import unittest
from unittest.mock import patch

from ticketing.ticket_router import TicketRouter


def create_demo_ticket(router, **overrides):
    payload = {
        "business_id": "detroit-plumbing-co",
        "customer_phone": "+13135550101",
        "channel": "sms",
        "ticket_type": "Emergency Service",
        "issue_summary": "Basement flooding - water leak",
        "raw_message": "My basement is flooding.",
        "urgency": "emergency",
        "priority": "high",
        "suggested_action": "Immediate callback",
        "industry": "home_services",
    }
    payload.update(overrides)
    return router.create_ticket(**payload)


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

    def test_create_ticket_includes_operational_fields(self):
        ticket = create_demo_ticket(self.router)
        data = ticket.to_dict()

        self.assertEqual(data["business_id"], "detroit-plumbing-co")
        self.assertEqual(data["ticket_type"], "Emergency Service")
        self.assertEqual(data["urgency"], "emergency")
        self.assertEqual(data["priority"], "high")
        self.assertEqual(data["suggested_action"], "Immediate callback")
        self.assertEqual(data["status"], "open")
        self.assertEqual(data["raw_message"], "My basement is flooding.")
        self.assertTrue(data["created_at"].endswith("Z"))

    def test_create_without_database_keeps_ticket_queryable(self):
        ticket = create_demo_ticket(self.router)

        tickets = self.router.list_tickets("detroit-plumbing-co")

        self.assertEqual(len(tickets), 1)
        self.assertEqual(tickets[0]["id"], ticket.id)

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

    def test_list_tickets_filters_by_status_priority_and_date(self):
        emergency = create_demo_ticket(self.router)
        quote = create_demo_ticket(
            self.router,
            customer_phone="+13135550102",
            ticket_type="Quote Request",
            issue_summary="Need a quote for drain cleaning",
            raw_message="What does drain cleaning cost?",
            urgency="medium",
            priority="medium",
            suggested_action="Standard follow-up",
        )

        self.assertEqual(
            [ticket["id"] for ticket in self.router.list_tickets("detroit-plumbing-co", {"priority": "high"})],
            [emergency.id],
        )
        self.assertEqual(
            {ticket["id"] for ticket in self.router.list_tickets("detroit-plumbing-co", {"status": "open", "date_from": "today"})},
            {emergency.id, quote.id},
        )

    def test_update_ticket_accepts_status_priority_and_assigned_to(self):
        ticket = create_demo_ticket(self.router, ticket_type="Quote Request", urgency="medium", priority="medium")

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

    def test_update_ticket_status(self):
        ticket = create_demo_ticket(self.router)

        updated = self.router.update_ticket_status(ticket.id, "in_progress")

        self.assertEqual(updated["status"], "in_progress")
        self.assertIsNone(updated["resolved_at"])

    def test_resolve_ticket_sets_status_and_resolved_at(self):
        ticket = create_demo_ticket(self.router)

        resolved = self.router.resolve_ticket(ticket.id)

        self.assertEqual(resolved["status"], "resolved")
        self.assertTrue(resolved["resolved_at"].endswith("Z"))

    def test_get_missing_ticket_returns_none(self):
        self.assertIsNone(self.router.get_ticket("missing-ticket-id"))

    def test_messages_include_raw_message_for_created_ticket(self):
        ticket = create_demo_ticket(self.router)

        messages = self.router.list_messages(ticket.id)

        self.assertEqual(len(messages), 1)
        self.assertEqual(messages[0]["ticket_id"], ticket.id)
        self.assertEqual(messages[0]["direction"], "inbound")
        self.assertEqual(messages[0]["body"], "My basement is flooding.")

    def test_invalid_status_raises_clear_error(self):
        ticket = create_demo_ticket(self.router)

        with self.assertRaisesRegex(ValueError, "Invalid status"):
            self.router.update_ticket_status(ticket.id, "closed")

    def test_invalid_ticket_type_for_industry_raises_clear_error(self):
        with self.assertRaisesRegex(ValueError, "Invalid ticket_type"):
            create_demo_ticket(
                self.router,
                business_id="demo-boutique",
                ticket_type="Emergency Service",
                industry="retail",
            )

    def test_invalid_industry_raises_clear_error(self):
        with self.assertRaisesRegex(ValueError, "Invalid industry"):
            create_demo_ticket(self.router, industry="healthcare")

    def test_invalid_channel_raises_clear_error(self):
        with self.assertRaisesRegex(ValueError, "Invalid channel"):
            create_demo_ticket(self.router, channel="fax")

    def test_missing_required_field_raises_clear_error(self):
        with self.assertRaisesRegex(ValueError, "Missing required ticket field"):
            create_demo_ticket(self.router, customer_phone="")

    def test_invalid_date_from_raises_clear_error(self):
        create_demo_ticket(self.router)

        with self.assertRaisesRegex(ValueError, "Invalid date_from"):
            self.router.list_tickets("detroit-plumbing-co", {"date_from": "not-a-date"})


if __name__ == "__main__":
    unittest.main()
