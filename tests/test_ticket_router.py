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


class TicketRouterTests(unittest.TestCase):
    def setUp(self):
        self.env_patch = patch.dict(os.environ, {}, clear=True)
        self.env_patch.start()
        self.router = TicketRouter()

    def tearDown(self):
        self.env_patch.stop()

    def test_create_ticket_includes_operational_fields(self):
        ticket = create_demo_ticket(self.router)
        data = ticket.to_dict()

        self.assertEqual(data["ticket_type"], "Emergency Service")
        self.assertEqual(data["urgency"], "emergency")
        self.assertEqual(data["priority"], "high")
        self.assertEqual(data["suggested_action"], "Immediate callback")
        self.assertEqual(data["status"], "open")
        self.assertEqual(data["raw_message"], "My basement is flooding.")

    def test_create_without_database_logs_and_keeps_ticket_queryable(self):
        ticket = create_demo_ticket(self.router)

        tickets = self.router.list_tickets("detroit-plumbing-co")

        self.assertEqual(len(tickets), 1)
        self.assertEqual(tickets[0]["id"], ticket.id)

    def test_list_tickets_filters_by_urgency_ticket_type_status_priority_and_date(self):
        emergency = create_demo_ticket(self.router)
        create_demo_ticket(
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
            [ticket["id"] for ticket in self.router.list_tickets("detroit-plumbing-co", {"urgency": "emergency"})],
            [emergency.id],
        )
        self.assertEqual(
            [ticket["id"] for ticket in self.router.list_tickets("detroit-plumbing-co", {"ticket_type": "Emergency Service"})],
            [emergency.id],
        )
        self.assertEqual(
            [ticket["id"] for ticket in self.router.list_tickets("detroit-plumbing-co", {"priority": "high"})],
            [emergency.id],
        )
        self.assertEqual(
            [ticket["id"] for ticket in self.router.list_tickets("detroit-plumbing-co", {"status": "open", "date_from": "today"})],
            [emergency.id, self.router._memory_tickets[1].id],
        )

    def test_update_ticket_status(self):
        ticket = create_demo_ticket(self.router)

        updated = self.router.update_ticket_status(ticket.id, "in_progress")

        self.assertEqual(updated["status"], "in_progress")
        self.assertIsNone(updated["resolved_at"])

    def test_resolve_ticket_sets_status_and_resolved_at(self):
        ticket = create_demo_ticket(self.router)

        resolved = self.router.resolve_ticket(ticket.id)

        self.assertEqual(resolved["status"], "resolved")
        self.assertIsNotNone(resolved["resolved_at"])

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

    def test_missing_required_field_raises_clear_error(self):
        with self.assertRaisesRegex(ValueError, "Missing required ticket field"):
            create_demo_ticket(self.router, customer_phone="")

    def test_invalid_date_from_raises_clear_error(self):
        create_demo_ticket(self.router)

        with self.assertRaisesRegex(ValueError, "Invalid date_from"):
            self.router.list_tickets("detroit-plumbing-co", {"date_from": "not-a-date"})


if __name__ == "__main__":
    unittest.main()
