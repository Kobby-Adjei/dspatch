import os
import uuid
from datetime import datetime, timezone
from dataclasses import dataclass, field
from typing import Optional

try:
    import psycopg2
except ImportError:
    psycopg2 = None

def utc_now():
    return datetime.now(timezone.utc)

@dataclass
class Ticket:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    business_id: str = ""
    customer_phone: str = ""
    channel: str = "api"
    ticket_type: str = ""
    issue_summary: str = ""
    raw_message: str = ""
    urgency: str = "medium"
    priority: str = "medium"
    status: str = "open"
    suggested_action: str = ""
    assigned_to: Optional[str] = None
    created_at: datetime = field(default_factory=utc_now)
    updated_at: datetime = field(default_factory=utc_now)
    resolved_at: Optional[datetime] = None

class TicketRouter:
    """Automatically creates and routes support tickets from voice/SMS interactions."""

    URGENCY_TO_PRIORITY = {
        "emergency": "high",
        "urgent": "high",
        "high": "high",
        "medium": "medium",
        "low": "low",
    }

    SUGGESTED_ACTIONS = {
        "emergency": "Immediate callback",
        "urgent": "Call back within 1 hour",
        "high": "Call back today",
        "medium": "Follow up within 24 hours",
        "low": "Respond during business hours",
    }

    def __init__(self):
        self.db_url = os.getenv("DATABASE_URL")
        self._memory_tickets = {}
        self._memory_messages = {}

    def _get_conn(self):
        if not self.db_url:
            return None
        if psycopg2 is None:
            raise RuntimeError("psycopg2 is required when DATABASE_URL is configured")
        return psycopg2.connect(self.db_url)

    def classify_priority(self, text: str) -> str:
        """Classify ticket priority based on message content."""
        text_lower = text.lower()
        if any(word in text_lower for word in ["emergency", "fire", "flood", "critical", "asap", "immediately"]):
            return "high"
        if any(word in text_lower for word in ["when you can", "no rush", "whenever"]):
            return "low"
        return "medium"

    def create_ticket(
        self,
        business_id: str,
        customer_phone: str,
        issue_summary: str,
        ticket_type: str = "General Inquiry",
        urgency: str = "medium",
        raw_message: str = "",
        channel: str = "api",
        priority: Optional[str] = None,
        suggested_action: Optional[str] = None,
        assigned_to: Optional[str] = None,
    ) -> Ticket:
        """Create a new support ticket and persist to database."""
        ticket = Ticket(
            business_id=business_id,
            customer_phone=customer_phone,
            channel=channel,
            ticket_type=ticket_type,
            issue_summary=issue_summary,
            raw_message=raw_message,
            urgency=urgency,
            priority=priority or self.URGENCY_TO_PRIORITY.get(urgency, self.classify_priority(issue_summary)),
            suggested_action=suggested_action or self.SUGGESTED_ACTIONS.get(urgency, "Follow up"),
            assigned_to=assigned_to,
        )
        self._save_ticket(ticket)
        return ticket

    def _save_ticket(self, ticket: Ticket):
        """Save ticket to PostgreSQL database."""
        conn = self._get_conn()
        if not conn:
            self._memory_tickets[ticket.id] = ticket
            self._memory_messages.setdefault(ticket.id, [])
            if ticket.raw_message:
                self._memory_messages[ticket.id].append({
                    "id": str(uuid.uuid4()),
                    "business_id": ticket.business_id,
                    "ticket_id": ticket.id,
                    "customer_phone": ticket.customer_phone,
                    "channel": ticket.channel,
                    "direction": "inbound",
                    "body": ticket.raw_message,
                    "created_at": ticket.created_at,
                })
            print(f"[TicketRouter] No DB configured. Ticket stored in memory: {ticket.id}")
            return

        cur = None
        try:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO tickets (
                    id, business_id, customer_phone, channel, ticket_type,
                    issue_summary, raw_message, urgency, priority, status,
                    suggested_action, assigned_to, created_at, updated_at, resolved_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                ticket.id, ticket.business_id, ticket.customer_phone, ticket.channel,
                ticket.ticket_type, ticket.issue_summary, ticket.raw_message,
                ticket.urgency, ticket.priority, ticket.status, ticket.suggested_action,
                ticket.assigned_to, ticket.created_at, ticket.updated_at, ticket.resolved_at,
            ))
            conn.commit()
        finally:
            if cur:
                cur.close()
            conn.close()

    def list_tickets(self, business_id: Optional[str] = None, filters: Optional[dict] = None) -> list[dict]:
        """List tickets, optionally scoped to a business and filtered for dashboard queues."""
        filters = filters or {}
        allowed_filters = ("status", "priority", "urgency", "ticket_type")
        conn = self._get_conn()

        if not conn:
            tickets = [self.ticket_to_dict(ticket) for ticket in self._memory_tickets.values()]
            if business_id:
                tickets = [ticket for ticket in tickets if ticket["business_id"] == business_id]
            for key in allowed_filters:
                if filters.get(key):
                    tickets = [ticket for ticket in tickets if ticket.get(key) == filters[key]]
            if filters.get("date_from"):
                tickets = [ticket for ticket in tickets if ticket["created_at"] >= filters["date_from"]]
            return sorted(tickets, key=lambda ticket: ticket["created_at"], reverse=True)

        cur = None
        try:
            cur = conn.cursor()
            query = "SELECT * FROM tickets"
            params = []
            clauses = []
            if business_id:
                clauses.append("business_id = %s")
                params.append(business_id)
            for key in allowed_filters:
                if filters.get(key):
                    clauses.append(f"{key} = %s")
                    params.append(filters[key])
            if filters.get("date_from"):
                clauses.append("created_at >= %s")
                params.append(filters["date_from"])
            if clauses:
                query += " WHERE " + " AND ".join(clauses)
            query += " ORDER BY created_at DESC"
            cur.execute(query, params)
            columns = [desc[0] for desc in cur.description]
            return [self._serialize_dict(dict(zip(columns, row))) for row in cur.fetchall()]
        finally:
            if cur:
                cur.close()
            conn.close()

    def update_ticket(self, ticket_id: str, updates: dict) -> Optional[dict]:
        """Update allowed editable ticket fields."""
        allowed = {"status", "priority", "assigned_to"}
        clean_updates = {key: value for key, value in updates.items() if key in allowed}
        if not clean_updates:
            return self.get_ticket(ticket_id)

        conn = self._get_conn()
        now = utc_now()
        if not conn:
            ticket = self._memory_tickets.get(ticket_id)
            if not ticket:
                return None
            for key, value in clean_updates.items():
                setattr(ticket, key, value)
            ticket.updated_at = now
            if clean_updates.get("status") == "resolved" and not ticket.resolved_at:
                ticket.resolved_at = now
            return self.ticket_to_dict(ticket)

        cur = None
        try:
            cur = conn.cursor()
            assignments = [f"{key} = %s" for key in clean_updates]
            params = list(clean_updates.values())
            assignments.append("updated_at = %s")
            params.append(now)
            if clean_updates.get("status") == "resolved":
                assignments.append("resolved_at = COALESCE(resolved_at, %s)")
                params.append(now)
            params.append(ticket_id)
            cur.execute(f"""
                UPDATE tickets
                SET {", ".join(assignments)}
                WHERE id = %s
                RETURNING *
            """, params)
            row = cur.fetchone()
            conn.commit()
            if not row:
                return None
            columns = [desc[0] for desc in cur.description]
            return self._serialize_dict(dict(zip(columns, row)))
        finally:
            if cur:
                cur.close()
            conn.close()

    def update_ticket_status(self, ticket_id: str, status: str):
        """Backwards-compatible status-only update."""
        return self.update_ticket(ticket_id, {"status": status})

    def resolve_ticket(self, ticket_id: str):
        """Mark a ticket as resolved."""
        return self.update_ticket(ticket_id, {"status": "resolved"})

    def get_ticket(self, ticket_id: str) -> Optional[dict]:
        conn = self._get_conn()
        if not conn:
            ticket = self._memory_tickets.get(ticket_id)
            return self.ticket_to_dict(ticket) if ticket else None

        cur = None
        try:
            cur = conn.cursor()
            cur.execute("SELECT * FROM tickets WHERE id = %s", (ticket_id,))
            row = cur.fetchone()
            if not row:
                return None
            columns = [desc[0] for desc in cur.description]
            return self._serialize_dict(dict(zip(columns, row)))
        finally:
            if cur:
                cur.close()
            conn.close()

    def list_messages(self, ticket_id: str) -> list[dict]:
        conn = self._get_conn()
        if not conn:
            return [self._serialize_dict(message) for message in self._memory_messages.get(ticket_id, [])]

        cur = None
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT * FROM messages WHERE ticket_id = %s ORDER BY created_at ASC",
                (ticket_id,),
            )
            columns = [desc[0] for desc in cur.description]
            return [self._serialize_dict(dict(zip(columns, row))) for row in cur.fetchall()]
        finally:
            if cur:
                cur.close()
            conn.close()

    def ticket_to_dict(self, ticket: Ticket) -> dict:
        return self._serialize_dict({
            "id": ticket.id,
            "business_id": ticket.business_id,
            "customer_phone": ticket.customer_phone,
            "channel": ticket.channel,
            "ticket_type": ticket.ticket_type,
            "issue_summary": ticket.issue_summary,
            "raw_message": ticket.raw_message,
            "urgency": ticket.urgency,
            "priority": ticket.priority,
            "status": ticket.status,
            "suggested_action": ticket.suggested_action,
            "assigned_to": ticket.assigned_to,
            "created_at": ticket.created_at,
            "updated_at": ticket.updated_at,
            "resolved_at": ticket.resolved_at,
        })

    def _serialize_dict(self, data: dict) -> dict:
        serialized = {}
        for key, value in data.items():
            if isinstance(value, datetime):
                if value.tzinfo is None:
                    value = value.replace(tzinfo=timezone.utc)
                serialized[key] = value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
            else:
                serialized[key] = value
        return serialized
