create table if not exists businesses (
  id              text primary key,
  name            text not null,
  industry        text not null check (industry in ('home_services', 'hospitality', 'retail')),
  phone           text,
  hours           jsonb not null default '{}',
  services        jsonb not null default '[]',
  routing_rules   jsonb not null default '{}',
  metadata        jsonb not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists tickets (
  id                  text primary key,
  business_id         text not null references businesses(id),
  customer_phone      text not null,
  channel             text not null,
  ticket_type         text not null,
  issue_summary       text not null,
  raw_message         text,
  urgency             text not null check (urgency in ('emergency', 'urgent', 'high', 'medium', 'low')),
  priority            text not null check (priority in ('high', 'medium', 'low')),
  status              text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  suggested_action    text,
  assigned_to         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  resolved_at         timestamptz
);

create table if not exists messages (
  id              text primary key,
  business_id     text not null references businesses(id),
  ticket_id       text references tickets(id),
  customer_phone  text,
  channel         text not null,
  direction       text not null,
  body            text not null,
  created_at      timestamptz not null default now()
);

create index if not exists idx_tickets_business_created_at
  on tickets (business_id, created_at desc);

create index if not exists idx_tickets_business_urgency_status
  on tickets (business_id, urgency, status);

create index if not exists idx_tickets_business_ticket_type
  on tickets (business_id, ticket_type);

create index if not exists idx_messages_ticket_created_at
  on messages (ticket_id, created_at);
