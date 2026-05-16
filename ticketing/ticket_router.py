# ticketing/ticket_router.py
# Operational record creation and routing logic.

import os
import uuid
from dataclasses import asdict, dataclass, field
from datetime import UTC, date, datetime, time
from typing import Dict, Optional

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:  # pragma: no cover - local demo mode should not need DB deps
    psycopg2 = None
    RealDictCursor = None


TICKET_TYPES_BY_INDUSTRY = {
    "home_services": {"Emergency Service", "Appointment Request", "Quote Request", "Status Update"},
    "hospitality": {"Reservation", "Food Order", "Complaint", "Catering Inquiry"},
    "retail": {"Product Inquiry", "Order Request", "Return Request", "Complaint"},
}
VALID_URGENCIES = {"emergency", "urgent", "high", "medium", "low"}
VALID_PRIORITIES = {"high", "medium", "low"}
VALID_STATUSES = {"open", "in_progress", "resolved"}
FILTER_FIELDS = {"status", "priority", "urgency", "ticket_type", "date_from"}


def utc_now() -> datetime:
    return datetime.now(UTC)


def format_datetime(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


@dataclass
class Ticket:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    business_id: str = ""
    customer_phone: str = ""
    channel: str = "sms"
    ticket_type: str = ""
    issue_summary: str = ""
    raw_message: Optional[str] = None
    urgency: str = "medium"
    priority: str = "medium"
    status: str = "open"
    suggested_action: Optional[str] = None
    assigned_to: Optional[str] = None
    created_at: datetime = field(default_factory=utc_now)
    updated_at: datetime = field(default_factory=utc_now)
    resolved_at: Optional[datetime] = None

    def to_dict(self) -> Dict:
        data = asdict(self)
        for key in ("created_at", "updated_at", "resolved_at"):
            if data[key] is not None:
                data[key] = format_datetime(data[key])
        return data


class TicketRouter:
    """Creates, lists, and updates typed operational records."""

    def __init__(self):
        self.db_url = os.getenv("DATABASE_URL")
        self._memory_tickets = []

    def create_ticket(
        self,
        business_id: str,
        customer_phone: str,
        channel: str,
        ticket_type: str,
        issue_summary: str,
        urgency: str,
        priority: str,
        raw_message: Optional[str] = None,
        suggested_action: Optional[str] = None,
        assigned_to: Optional[str] = None,
        industry: Optional[str] = None,
    ) -> Ticket:
        """Create a typed operational ticket and persist it when a DB is configured."""
        self._validate_required({
            "business_id": business_id,
            "customer_phone": customer_phone,
            "channel": channel,
            "ticket_type": ticket_type,
            "issue_summary": issue_summary,
            "urgency": urgency,
            "priority": priority,
        })
        self._validate_choice("urgency", urgency, VALID_URGENCIES)
        self._validate_choice("priority", priority, VALID_PRIORITIES)
        industry = industry or self._load_business_industry(business_id)
        if industry:
            self._validate_ticket_type(industry, ticket_type)

        ticket = Ticket(
            business_id=business_id,
            customer_phone=customer_phone,
            channel=channel,
            ticket_type=ticket_type,
            issue_summary=issue_summary,
            raw_message=raw_message,
            urgency=urgency,
            priority=priority,
            suggested_action=suggested_action,
            assigned_to=assigned_to,
        )
        self._save_ticket(ticket)
        return ticket

    def list_tickets(self, business_id: str, filters: Optional[Dict] = None):
        """List tickets for a business with optional status, priority, urgency, type, and date filters."""
        filters = self._clean_filters(filters or {})

        if not self._db_available():
            tickets = [ticket for ticket in self._memory_tickets if ticket.business_id == business_id]
            return [ticket.to_dict() for ticket in tickets if self._matches_filters(ticket, filters)]

        clauses = ["business_id = %s"]
        params = [business_id]
        for key, value in filters.items():
            if key == "date_from":
                clauses.append("created_at >= %s")
            else:
                clauses.append(f"{key} = %s")
            params.append(value)

        sql = f"select * from tickets where {' and '.join(clauses)} order by created_at desc"
        try:
            conn = psycopg2.connect(self.db_url)
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute(sql, params)
            rows = cur.fetchall()
            cur.close()
            conn.close()
            return [self._serialize_row(row) for row in rows]
        except Exception as exc:
            print(f"[db] failed to list tickets: {exc}")
            tickets = [ticket for ticket in self._memory_tickets if ticket.business_id == business_id]
            return [ticket.to_dict() for ticket in tickets if self._matches_filters(ticket, filters)]

    def update_ticket_status(self, ticket_id: str, status: str):
        """Move a ticket to open, in_progress, or resolved."""
        self._validate_choice("status", status, VALID_STATUSES)

        if status == "resolved":
            return self.resolve_ticket(ticket_id)

        if not self._db_available():
            ticket = self._find_memory_ticket(ticket_id)
            if not ticket:
                return None
            ticket.status = status
            ticket.updated_at = utc_now()
            return ticket.to_dict()

        try:
            conn = psycopg2.connect(self.db_url)
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute(
                """
                update tickets
                set status = %s, updated_at = now()
                where id = %s
                returning *
                """,
                (status, ticket_id),
            )
            row = cur.fetchone()
            conn.commit()
            cur.close()
            conn.close()
            return self._serialize_row(row) if row else None
        except Exception as exc:
            print(f"[db] failed to update ticket status: {exc}")
            ticket = self._find_memory_ticket(ticket_id)
            if not ticket:
                return None
            ticket.status = status
            ticket.updated_at = utc_now()
            return ticket.to_dict()

    def resolve_ticket(self, ticket_id: str):
        """Mark a ticket as resolved and stamp resolved_at."""
        if not self._db_available():
            ticket = self._find_memory_ticket(ticket_id)
            if not ticket:
                return None
            ticket.status = "resolved"
            ticket.updated_at = utc_now()
            ticket.resolved_at = utc_now()
            return ticket.to_dict()

        try:
            conn = psycopg2.connect(self.db_url)
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute(
                """
                update tickets
                set status = 'resolved', resolved_at = now(), updated_at = now()
                where id = %s
                returning *
                """,
                (ticket_id,),
            )
            row = cur.fetchone()
            conn.commit()
            cur.close()
            conn.close()
            return self._serialize_row(row) if row else None
        except Exception as exc:
            print(f"[db] failed to resolve ticket: {exc}")
            ticket = self._find_memory_ticket(ticket_id)
            if not ticket:
                return None
            ticket.status = "resolved"
            ticket.updated_at = utc_now()
            ticket.resolved_at = utc_now()
            return ticket.to_dict()

    def _save_ticket(self, ticket: Ticket):
        if not self._db_available():
            print(f"[db] No database configured. Ticket kept in memory: {ticket.id}")
            self._memory_tickets.append(ticket)
            return

        try:
            conn = psycopg2.connect(self.db_url)
            cur = conn.cursor()
            cur.execute(
                """
                insert into tickets (
                    id, business_id, customer_phone, channel, ticket_type, issue_summary,
                    raw_message, urgency, priority, status, suggested_action, assigned_to,
                    created_at, updated_at, resolved_at
                )
                values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    ticket.id,
                    ticket.business_id,
                    ticket.customer_phone,
                    ticket.channel,
                    ticket.ticket_type,
                    ticket.issue_summary,
                    ticket.raw_message,
                    ticket.urgency,
                    ticket.priority,
                    ticket.status,
                    ticket.suggested_action,
                    ticket.assigned_to,
                    ticket.created_at,
                    ticket.updated_at,
                    ticket.resolved_at,
                ),
            )
            conn.commit()
            cur.close()
            conn.close()
        except Exception as exc:
            print(f"[db] failed to save ticket: {exc}")
            self._memory_tickets.append(ticket)

    def _db_available(self) -> bool:
        return bool(self.db_url and psycopg2 is not None)

    def _load_business_industry(self, business_id: str) -> Optional[str]:
        if not self._db_available():
            return None

        try:
            conn = psycopg2.connect(self.db_url)
            cur = conn.cursor()
            cur.execute("select industry from businesses where id = %s", (business_id,))
            row = cur.fetchone()
            cur.close()
            conn.close()
            return row[0] if row else None
        except Exception as exc:
            print(f"[db] failed to load business industry: {exc}")
            return None

    def _find_memory_ticket(self, ticket_id: str) -> Optional[Ticket]:
        return next((ticket for ticket in self._memory_tickets if ticket.id == ticket_id), None)

    def _clean_filters(self, filters: Dict) -> Dict:
        cleaned = {}
        for key, value in filters.items():
            if key not in FILTER_FIELDS or value in (None, ""):
                continue
            if key == "date_from":
                cleaned[key] = self._parse_date_from(value)
            else:
                cleaned[key] = value
        return cleaned

    def _matches_filters(self, ticket: Ticket, filters: Dict) -> bool:
        for key, value in filters.items():
            if key == "date_from":
                if ticket.created_at < value:
                    return False
            elif getattr(ticket, key) != value:
                return False
        return True

    def _parse_date_from(self, value) -> datetime:
        if isinstance(value, datetime):
            return value if value.tzinfo else value.replace(tzinfo=UTC)
        if isinstance(value, date):
            return datetime.combine(value, time.min, tzinfo=UTC)
        if str(value).lower() == "today":
            return datetime.combine(date.today(), time.min, tzinfo=UTC)
        try:
            parsed = datetime.fromisoformat(str(value))
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)
        except ValueError as exc:
            raise ValueError(f"Invalid date_from '{value}'. Use ISO format or today.") from exc

    def _serialize_row(self, row) -> Dict:
        data = dict(row)
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = format_datetime(value)
        return data

    def _validate_required(self, values: Dict):
        missing = [key for key, value in values.items() if value in (None, "")]
        if missing:
            raise ValueError(f"Missing required ticket field(s): {', '.join(missing)}")

    def _validate_choice(self, field_name: str, value: str, valid_values):
        if value not in valid_values:
            valid = ", ".join(sorted(valid_values))
            raise ValueError(f"Invalid {field_name} '{value}'. Valid values: {valid}")

    def _validate_ticket_type(self, industry: str, ticket_type: str):
        if industry not in TICKET_TYPES_BY_INDUSTRY:
            valid = ", ".join(sorted(TICKET_TYPES_BY_INDUSTRY))
            raise ValueError(f"Invalid industry '{industry}'. Valid values: {valid}")

        valid_types = TICKET_TYPES_BY_INDUSTRY[industry]
        if ticket_type not in valid_types:
            valid = ", ".join(sorted(valid_types))
            raise ValueError(f"Invalid ticket_type '{ticket_type}' for {industry}. Valid values: {valid}")
