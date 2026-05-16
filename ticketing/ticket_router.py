import os
import uuid
import psycopg2
from datetime import datetime
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Ticket:
    id:               str      = field(default_factory=lambda: str(uuid.uuid4()))
    business_id:      str      = ""
    customer_phone:   str      = ""
    channel:          str      = "sms"
    ticket_type:      str      = ""
    issue_summary:    str      = ""
    raw_message:      str      = ""
    urgency:          str      = "medium"
    priority:         str      = "medium"
    status:           str      = "open"
    suggested_action: str      = ""
    assigned_to:      Optional[str] = None
    created_at:       datetime = field(default_factory=datetime.utcnow)
    resolved_at:      Optional[datetime] = None


class TicketRouter:

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
        self.db_url = os.getenv("DATABASE_URL")

    def _get_conn(self):
        if not self.db_url:
            return None
        return psycopg2.connect(self.db_url)

    def create_ticket(
        self,
        business_id:    str,
        customer_phone: str,
        issue_summary:  str,
        ticket_type:    str,
        urgency:        str,
        raw_message:    str = "",
        channel:        str = "sms",
    ) -> Ticket:

        ticket = Ticket(
            business_id      = business_id,
            customer_phone   = customer_phone,
            channel          = channel,
            ticket_type      = ticket_type,
            issue_summary    = issue_summary,
            raw_message      = raw_message,
            urgency          = urgency,
            priority         = self.URGENCY_TO_PRIORITY.get(urgency, "medium"),
            suggested_action = self.SUGGESTED_ACTIONS.get(urgency, "Follow up"),
        )

        self._save_ticket(ticket)
        return ticket

    def _save_ticket(self, ticket: Ticket):
        conn = self._get_conn()
        if not conn:
            print(f"[db] no database configured — ticket not persisted: {ticket.id}")
            return

        try:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO tickets (
                  id, business_id, customer_phone, channel, ticket_type,
                  issue_summary, raw_message, urgency, priority, status,
                  suggested_action, created_at
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (
                ticket.id, ticket.business_id, ticket.customer_phone,
                ticket.channel, ticket.ticket_type, ticket.issue_summary,
                ticket.raw_message, ticket.urgency, ticket.priority,
                ticket.status, ticket.suggested_action, ticket.created_at,
            ))
            conn.commit()
            print(f"[db] ticket saved: {ticket.id}")
        except Exception as exc:
            print(f"[db] failed to save ticket: {exc}")
            raise
        finally:
            conn.close()

    def list_tickets(self, business_id: str, filters: dict = {}) -> list:
        conn = self._get_conn()
        if not conn:
            print("[db] no database configured — returning empty list")
            return []

        query  = "SELECT * FROM tickets WHERE business_id = %s"
        params = [business_id]

        for key in ("status", "urgency", "ticket_type", "priority"):
            if key in filters:
                query  += f" AND {key} = %s"
                params.append(filters[key])

        query += " ORDER BY created_at DESC"

        try:
            cur = conn.cursor()
            cur.execute(query, params)
            rows = cur.fetchall()
            cols = [desc[0] for desc in cur.description]
            return [dict(zip(cols, row)) for row in rows]
        except Exception as exc:
            print(f"[db] failed to list tickets: {exc}")
            raise
        finally:
            conn.close()

    def update_ticket_status(self, ticket_id: str, status: str):
        conn = self._get_conn()
        if not conn:
            return
        try:
            cur = conn.cursor()
            cur.execute(
                "UPDATE tickets SET status = %s, updated_at = %s WHERE id = %s",
                (status, datetime.utcnow(), ticket_id),
            )
            conn.commit()
            print(f"[db] ticket {ticket_id} status → {status}")
        except Exception as exc:
            print(f"[db] failed to update ticket: {exc}")
            raise
        finally:
            conn.close()

    def resolve_ticket(self, ticket_id: str):
        conn = self._get_conn()
        if not conn:
            return
        try:
            cur = conn.cursor()
            cur.execute(
                "UPDATE tickets SET status = 'resolved', resolved_at = %s, updated_at = %s WHERE id = %s",
                (datetime.utcnow(), datetime.utcnow(), ticket_id),
            )
            conn.commit()
            print(f"[db] ticket {ticket_id} resolved")
        except Exception as exc:
            print(f"[db] failed to resolve ticket: {exc}")
            raise
        finally:
            conn.close()
