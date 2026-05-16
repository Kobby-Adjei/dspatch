import os
import uuid
from dataclasses import asdict, dataclass, field
from datetime import date, datetime, time, timezone
from typing import Optional

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    psycopg2 = None
    RealDictCursor = None


TICKET_TYPES_BY_INDUSTRY = {
    "home_services": {"Emergency Service", "Appointment Request", "Quote Request", "Status Update"},
    "hospitality":   {"Reservation", "Food Order", "Complaint", "Catering Inquiry"},
    "retail":        {"Product Inquiry", "Order Request", "Return Request", "Complaint"},
}
VALID_URGENCIES  = {"emergency", "urgent", "high", "medium", "low"}
VALID_PRIORITIES = {"high", "medium", "low"}
VALID_STATUSES   = {"open", "in_progress", "resolved"}
FILTER_FIELDS    = {"status", "priority", "urgency", "ticket_type", "date_from"}


def utc_now():
    return datetime.now(timezone.utc)


def format_datetime(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


@dataclass
class Ticket:
    id:               str      = field(default_factory=lambda: str(uuid.uuid4()))
    business_id:      str      = ""
    customer_phone:   str      = ""
    channel:          str      = "api"
    ticket_type:      str      = ""
    issue_summary:    str      = ""
    raw_message:      str      = ""
    urgency:          str      = "medium"
    priority:         str      = "medium"
    status:           str      = "open"
    suggested_action: str      = ""
    assigned_to:      Optional[str] = None
    created_at:       datetime = field(default_factory=utc_now)
    updated_at:       datetime = field(default_factory=utc_now)
    resolved_at:      Optional[datetime] = None

    def to_dict(self) -> dict:
        data = asdict(self)
        for key in ("created_at", "updated_at", "resolved_at"):
            if data[key] is not None:
                data[key] = format_datetime(data[key])
        return data


class TicketRouter:
    """Creates, lists, and updates typed operational records."""

    URGENCY_TO_PRIORITY = {
        "emergency": "high",
        "urgent":    "high",
        "high":      "high",
        "medium":    "medium",
        "low":       "low",
    }

    SUGGESTED_ACTIONS = {
        "emergency": "Immediate callback",
        "urgent":    "Call back within 1 hour",
        "high":      "Call back today",
        "medium":    "Follow up within 24 hours",
        "low":       "Respond during business hours",
    }

    def __init__(self):
        self.db_url          = os.getenv("DATABASE_URL")
        self._memory_tickets  = []
        self._memory_messages = {}

    def create_ticket(
        self,
        business_id:      str,
        customer_phone:   str,
        issue_summary:    str,
        ticket_type:      str      = "General Inquiry",
        urgency:          str      = "medium",
        raw_message:      str      = "",
        channel:          str      = "api",
        priority:         Optional[str] = None,
        suggested_action: Optional[str] = None,
        assigned_to:      Optional[str] = None,
        industry:         Optional[str] = None,
    ) -> Ticket:
        self._validate_required({
            "business_id":    business_id,
            "customer_phone": customer_phone,
            "channel":        channel,
            "ticket_type":    ticket_type,
            "issue_summary":  issue_summary,
            "urgency":        urgency,
        })
        self._validate_choice("urgency", urgency, VALID_URGENCIES)

        priority = priority or self.URGENCY_TO_PRIORITY.get(urgency, self.classify_priority(issue_summary))
        self._validate_choice("priority", priority, VALID_PRIORITIES)

        industry = industry or self._load_business_industry(business_id)
        if industry and industry in TICKET_TYPES_BY_INDUSTRY:
            if ticket_type not in TICKET_TYPES_BY_INDUSTRY[industry]:
                print(f"[ticket] unknown ticket_type '{ticket_type}' for {industry}, accepting anyway")

        ticket = Ticket(
            business_id      = business_id,
            customer_phone   = customer_phone,
            channel          = channel,
            ticket_type      = ticket_type,
            issue_summary    = issue_summary,
            raw_message      = raw_message,
            urgency          = urgency,
            priority         = priority,
            suggested_action = suggested_action or self.SUGGESTED_ACTIONS.get(urgency, "Follow up"),
            assigned_to      = assigned_to,
        )

        self._save_ticket(ticket)
        return ticket

    def classify_priority(self, text: str) -> str:
        text_lower = text.lower()
        if any(w in text_lower for w in ["emergency", "fire", "flood", "critical", "asap", "immediately"]):
            return "high"
        if any(w in text_lower for w in ["when you can", "no rush", "whenever"]):
            return "low"
        return "medium"

    def list_tickets(self, business_id: Optional[str] = None, filters: Optional[dict] = None) -> list:
        filters = self._clean_filters(filters or {})

        if not self._db_available():
            tickets = self._memory_tickets
            if business_id:
                tickets = [t for t in tickets if t.business_id == business_id]
            filtered = [t.to_dict() for t in tickets if self._matches_filters(t, filters)]
            return sorted(filtered, key=lambda t: t["created_at"], reverse=True)

        clauses = []
        params  = []
        if business_id:
            clauses.append("business_id = %s")
            params.append(business_id)
        for key, value in filters.items():
            if key == "date_from":
                clauses.append("created_at >= %s")
            else:
                clauses.append(f"{key} = %s")
            params.append(value)

        sql = "SELECT * FROM tickets"
        if clauses:
            sql += " WHERE " + " AND ".join(clauses)
        sql += " ORDER BY created_at DESC"

        conn = cur = None
        try:
            conn = psycopg2.connect(self.db_url)
            cur  = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute(sql, params)
            return [self._serialize_row(row) for row in cur.fetchall()]
        except Exception as exc:
            print(f"[db] failed to list tickets: {exc}")
            tickets = self._memory_tickets
            if business_id:
                tickets = [t for t in tickets if t.business_id == business_id]
            return [t.to_dict() for t in tickets if self._matches_filters(t, filters)]
        finally:
            if cur:  cur.close()
            if conn: conn.close()

    def get_ticket(self, ticket_id: str) -> Optional[dict]:
        if not self._db_available():
            t = self._find_memory_ticket(ticket_id)
            return t.to_dict() if t else None

        conn = cur = None
        try:
            conn = psycopg2.connect(self.db_url)
            cur  = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("SELECT * FROM tickets WHERE id = %s", (ticket_id,))
            row = cur.fetchone()
            return self._serialize_row(row) if row else None
        finally:
            if cur:  cur.close()
            if conn: conn.close()

    def update_ticket(self, ticket_id: str, updates: dict) -> Optional[dict]:
        allowed      = {"status", "priority", "assigned_to"}
        clean_updates = {k: v for k, v in updates.items() if k in allowed}
        if not clean_updates:
            return self.get_ticket(ticket_id)

        if "status" in clean_updates:
            self._validate_choice("status", clean_updates["status"], VALID_STATUSES)
        if "priority" in clean_updates:
            self._validate_choice("priority", clean_updates["priority"], VALID_PRIORITIES)

        if clean_updates.get("status") == "resolved":
            return self.resolve_ticket(ticket_id, extra_updates=clean_updates)

        if not self._db_available():
            t = self._find_memory_ticket(ticket_id)
            if not t:
                return None
            for k, v in clean_updates.items():
                setattr(t, k, v)
            t.updated_at = utc_now()
            return t.to_dict()

        conn = cur = None
        try:
            conn = psycopg2.connect(self.db_url)
            cur  = conn.cursor(cursor_factory=RealDictCursor)
            assignments = [f"{k} = %s" for k in clean_updates]
            params      = list(clean_updates.values())
            assignments.append("updated_at = now()")
            params.append(ticket_id)
            cur.execute(
                f"UPDATE tickets SET {', '.join(assignments)} WHERE id = %s RETURNING *",
                params,
            )
            row = cur.fetchone()
            conn.commit()
            return self._serialize_row(row) if row else None
        except Exception as exc:
            print(f"[db] failed to update ticket: {exc}")
            t = self._find_memory_ticket(ticket_id)
            if not t:
                return None
            for k, v in clean_updates.items():
                setattr(t, k, v)
            t.updated_at = utc_now()
            return t.to_dict()
        finally:
            if cur:  cur.close()
            if conn: conn.close()

    def update_ticket_status(self, ticket_id: str, status: str):
        return self.update_ticket(ticket_id, {"status": status})

    def resolve_ticket(self, ticket_id: str, extra_updates: Optional[dict] = None) -> Optional[dict]:
        updates = extra_updates or {}

        if not self._db_available():
            t = self._find_memory_ticket(ticket_id)
            if not t:
                return None
            for k, v in updates.items():
                if k in {"priority", "assigned_to"}:
                    setattr(t, k, v)
            t.status      = "resolved"
            t.updated_at  = utc_now()
            t.resolved_at = t.resolved_at or utc_now()
            return t.to_dict()

        conn = cur = None
        try:
            conn = psycopg2.connect(self.db_url)
            cur  = conn.cursor(cursor_factory=RealDictCursor)
            assignments = [
                "status = 'resolved'",
                "resolved_at = COALESCE(resolved_at, now())",
                "updated_at = now()",
            ]
            params = []
            for k in ("priority", "assigned_to"):
                if k in updates:
                    assignments.append(f"{k} = %s")
                    params.append(updates[k])
            params.append(ticket_id)
            cur.execute(
                f"UPDATE tickets SET {', '.join(assignments)} WHERE id = %s RETURNING *",
                params,
            )
            row = cur.fetchone()
            conn.commit()
            return self._serialize_row(row) if row else None
        except Exception as exc:
            print(f"[db] failed to resolve ticket: {exc}")
            t = self._find_memory_ticket(ticket_id)
            if not t:
                return None
            t.status      = "resolved"
            t.updated_at  = utc_now()
            t.resolved_at = t.resolved_at or utc_now()
            return t.to_dict()
        finally:
            if cur:  cur.close()
            if conn: conn.close()

    def list_messages(self, ticket_id: str) -> list:
        if not self._db_available():
            return [self._serialize_row(m) for m in self._memory_messages.get(ticket_id, [])]

        conn = cur = None
        try:
            conn = psycopg2.connect(self.db_url)
            cur  = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute(
                "SELECT * FROM messages WHERE ticket_id = %s ORDER BY created_at ASC",
                (ticket_id,),
            )
            return [self._serialize_row(row) for row in cur.fetchall()]
        finally:
            if cur:  cur.close()
            if conn: conn.close()

    def ticket_to_dict(self, ticket: Ticket) -> dict:
        return ticket.to_dict()

    # ── Internal ──────────────────────────────────────────────────────────────

    def _save_ticket(self, ticket: Ticket):
        if not self._db_available():
            self._memory_tickets.append(ticket)
            self._memory_messages.setdefault(ticket.id, [])
            if ticket.raw_message:
                self._memory_messages[ticket.id].append({
                    "id":             str(uuid.uuid4()),
                    "business_id":    ticket.business_id,
                    "ticket_id":      ticket.id,
                    "customer_phone": ticket.customer_phone,
                    "channel":        ticket.channel,
                    "direction":      "inbound",
                    "body":           ticket.raw_message,
                    "created_at":     ticket.created_at,
                })
            print(f"[db] no database — ticket kept in memory: {ticket.id}")
            return

        conn = cur = None
        try:
            conn = psycopg2.connect(self.db_url)
            cur  = conn.cursor()
            cur.execute(
                """
                INSERT INTO tickets (
                    id, business_id, customer_phone, channel, ticket_type, issue_summary,
                    raw_message, urgency, priority, status, suggested_action, assigned_to,
                    created_at, updated_at, resolved_at
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """,
                (
                    ticket.id, ticket.business_id, ticket.customer_phone,
                    ticket.channel, ticket.ticket_type, ticket.issue_summary,
                    ticket.raw_message, ticket.urgency, ticket.priority,
                    ticket.status, ticket.suggested_action, ticket.assigned_to,
                    ticket.created_at, ticket.updated_at, ticket.resolved_at,
                ),
            )
            conn.commit()
            print(f"[db] ticket saved: {ticket.id}")
        except Exception as exc:
            print(f"[db] failed to save ticket: {exc}")
            self._memory_tickets.append(ticket)
        finally:
            if cur:  cur.close()
            if conn: conn.close()

    def _db_available(self) -> bool:
        return bool(self.db_url and psycopg2 is not None)

    def _load_business_industry(self, business_id: str) -> Optional[str]:
        if not self._db_available():
            return None
        conn = cur = None
        try:
            conn = psycopg2.connect(self.db_url)
            cur  = conn.cursor()
            cur.execute("SELECT industry FROM businesses WHERE id = %s", (business_id,))
            row = cur.fetchone()
            return row[0] if row else None
        except Exception:
            return None
        finally:
            if cur:  cur.close()
            if conn: conn.close()

    def _find_memory_ticket(self, ticket_id: str) -> Optional[Ticket]:
        return next((t for t in self._memory_tickets if t.id == ticket_id), None)

    def _clean_filters(self, filters: dict) -> dict:
        cleaned = {}
        for key, value in filters.items():
            if key not in FILTER_FIELDS or value in (None, ""):
                continue
            if key == "date_from":
                cleaned[key] = self._parse_date_from(value)
            else:
                cleaned[key] = value
        return cleaned

    def _matches_filters(self, ticket: Ticket, filters: dict) -> bool:
        for key, value in filters.items():
            if key == "date_from":
                if ticket.created_at < value:
                    return False
            elif getattr(ticket, key) != value:
                return False
        return True

    def _parse_date_from(self, value) -> datetime:
        if isinstance(value, datetime):
            return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        if isinstance(value, date):
            return datetime.combine(value, time.min, tzinfo=timezone.utc)
        if str(value).lower() == "today":
            return datetime.combine(date.today(), time.min, tzinfo=timezone.utc)
        try:
            parsed = datetime.fromisoformat(str(value))
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except ValueError as exc:
            raise ValueError(f"Invalid date_from '{value}'. Use ISO format or 'today'.") from exc

    def _serialize_row(self, row) -> dict:
        data = dict(row)
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = format_datetime(value)
        return data

    def _validate_required(self, values: dict):
        missing = [k for k, v in values.items() if v in (None, "")]
        if missing:
            raise ValueError(f"Missing required ticket field(s): {', '.join(missing)}")

    def _validate_choice(self, field_name: str, value: str, valid_values):
        if value not in valid_values:
            valid = ", ".join(sorted(valid_values))
            raise ValueError(f"Invalid {field_name} '{value}'. Valid values: {valid}")
