# ticketing/ticket_router.py
# Auto ticket creation and routing logic

import os
import uuid
from datetime import datetime
from dataclasses import dataclass, field
from typing import Optional
import psycopg2

@dataclass
class Ticket:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    business_id: str = ""
    customer_phone: str = ""
    issue_summary: str = ""
    priority: str = "medium"  # low, medium, high, urgent
    status: str = "open"      # open, in_progress, resolved, closed
    created_at: datetime = field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None

class TicketRouter:
    """Automatically creates and routes support tickets from voice/SMS interactions."""

    PRIORITY_KEYWORDS = {
        "urgent": ["emergency", "fire", "flood", "broken", "down", "critical"],
        "high": ["asap", "urgent", "immediately", "today"],
        "low": ["when you can", "no rush", "whenever"],
    }

    def __init__(self):
        self.db_url = os.getenv("DATABASE_URL")

    def classify_priority(self, text: str) -> str:
        """Classify ticket priority based on message content."""
        text_lower = text.lower()
        for priority, keywords in self.PRIORITY_KEYWORDS.items():
            if any(kw in text_lower for kw in keywords):
                return priority
        return "medium"

    def create_ticket(self, business_id: str, customer_phone: str, issue_summary: str) -> Ticket:
        """Create a new support ticket and persist to database."""
        priority = self.classify_priority(issue_summary)
        ticket = Ticket(
            business_id=business_id,
            customer_phone=customer_phone,
            issue_summary=issue_summary,
            priority=priority,
        )
        self._save_ticket(ticket)
        return ticket

    def _save_ticket(self, ticket: Ticket):
        """Save ticket to PostgreSQL database."""
        if not self.db_url:
            print(f"[TicketRouter] No DB configured. Ticket: {ticket}")
            return
        conn = psycopg2.connect(self.db_url)
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO tickets (id, business_id, customer_phone, issue_summary, priority, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (ticket.id, ticket.business_id, ticket.customer_phone,
               ticket.issue_summary, ticket.priority, ticket.status, ticket.created_at))
        conn.commit()
        cur.close()
        conn.close()

    def resolve_ticket(self, ticket_id: str):
        """Mark a ticket as resolved."""
        if not self.db_url:
            return
        conn = psycopg2.connect(self.db_url)
        cur = conn.cursor()
        cur.execute("""
            UPDATE tickets SET status = 'resolved', resolved_at = %s WHERE id = %s
        """, (datetime.utcnow(), ticket_id))
        conn.commit()
        cur.close()
        conn.close()
