CREATE TABLE IF NOT EXISTS tickets (
    id               TEXT PRIMARY KEY,
    business_id      TEXT NOT NULL,
    customer_phone   TEXT,
    channel          TEXT DEFAULT 'sms',
    ticket_type      TEXT,
    issue_summary    TEXT,
    raw_message      TEXT,
    urgency          TEXT DEFAULT 'medium',
    priority         TEXT DEFAULT 'medium',
    status           TEXT DEFAULT 'open',
    suggested_action TEXT,
    assigned_to      TEXT,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    resolved_at      TIMESTAMPTZ,
    updated_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tickets_business_created_at
    ON tickets (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tickets_business_urgency_status
    ON tickets (business_id, urgency, status);

CREATE INDEX IF NOT EXISTS idx_tickets_business_ticket_type
    ON tickets (business_id, ticket_type);
