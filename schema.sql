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
