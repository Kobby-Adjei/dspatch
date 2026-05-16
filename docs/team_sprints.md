# Dspatch Backend Sprint Plan

This plan is organized for two working pairs:

- **Team 1: Salma & Kobby**
- **Team 2: Yasrib & Ify**

The sprint goal is to make the core Dspatch journey work:

1. An SMB or startup signs up.
2. The business enters its hours, services, pricing, FAQs, service area, and routing rules.
3. Dspatch turns that profile into support knowledge.
4. Customers call or text.
5. Dspatch creates tickets and can answer common questions from business context.
6. The business sees requests and status in a dashboard/API.
7. A Dspatch operator can review and improve the system.

## Product Goal

Dspatch gives small businesses enterprise-grade customer support at small-business pricing. The first working version should prove this:

- A business can be onboarded in under 10 minutes.
- Dspatch can generate useful knowledge from the business profile.
- Customers can text or call the Dspatch number.
- Dspatch creates a ticket with customer phone, summary, channel, priority, and status.
- Dspatch can answer common questions from the business profile.
- The dashboard/API can show current tickets and business state.
- A human operator can inspect and correct what AI misses.

## Pair Ownership

### Team 1: Salma & Kobby

Primary ownership:

```text
SMB signs up -> profile saved -> knowledge created -> AI can answer from context
```

This team owns the product intelligence layer. Their work should be easy to debug locally with JSON files and fallback AI mode before external APIs are connected.

Owned files:

- `onboarding/business_setup.py`
- `agent/watsonx.py`
- `.env.example`
- `README.md`
- `onboarding/examples/*.json`
- Optional tests: `tests/test_business_setup.py`, `tests/test_watsonx_fallback.py`

Core deliverables:

- Business profile validation.
- Sample business profiles.
- Knowledge chunk generation.
- Fallback AI responder.
- Prompt builder for real watsonx.
- Demo flow that works without IBM credentials.

#### Salma Tasks

Salma owns business profile structure and validation.

Tasks:

- Define the final business profile JSON shape.
- Add required field validation.
- Add helpful errors for missing fields.
- Create sample profiles:
  - HVAC company
  - auto shop
  - restaurant
- Update `BusinessSetup.load_business_profile()` so it supports:
  - `pricing`
  - `service_area`
  - `faqs`
  - `routing_rules`
- Update `_build_knowledge_chunks()` so it generates chunks from every important profile field.

Acceptance criteria:

- Running `python onboarding/business_setup.py` works.
- Missing `name`, `phone`, `hours`, or `services` gives a clear error.
- Knowledge chunks include hours, services, pricing, service area, FAQs, and emergency rules.
- No Twilio, Gemini, or watsonx credentials are required to test this path.

#### Kobby Tasks

Kobby owns AI fallback, integration, and demo reliability.

Tasks:

- Add `WATSONX_ENABLED=false` support in `agent/watsonx.py`.
- When watsonx is disabled, return a deterministic fake response using the available business context.
- Add a prompt builder:

```python
def build_support_prompt(business_profile, customer_message, context_chunks):
    ...
```

- Add a demo path that:
  - loads a business profile
  - generates knowledge chunks
  - passes a customer message
  - returns a support answer
- Update `.env.example` with:
  - `WATSONX_ENABLED=false`
  - `GEMINI_ENABLED=false`
  - `TWILIO_VALIDATE_SIGNATURES=false`
  - `DEMO_BUSINESS_ID=demo-plumbing-co`
- Keep the README aligned with the current product story.

Acceptance criteria:

- Demo works without real IBM credentials.
- Given this customer message:

```text
Do you serve Southfield and what does emergency service cost?
```

Dspatch can answer from the sample business profile:

```text
Yes, Detroit Plumbing Co. serves Southfield. Emergency visits start at $149.
```

- Logs clearly show:

```text
[business] profile loaded: demo-plumbing-co
[knowledge] chunks created: 12
[ai] WATSONX_ENABLED=false, using fallback responder
[ai] fallback response generated
```

### Team 2: Yasrib & Ify

Primary ownership:

```text
Customer texts/calls -> ticket created -> ticket can be listed/updated by dashboard/API
```

This team owns the support operations layer. Their work should be easy to debug with curl, Flask logs, and database queries.

Owned files:

- `ticketing/ticket_router.py`
- `agent/twilio_handler.py`
- New database schema file, recommended: `db/schema.sql`
- Optional tests: `tests/test_ticket_router.py`, `tests/test_twilio_handler.py`

Core deliverables:

- Database schema.
- Ticket creation, listing, status update, and resolution.
- SMS webhook that creates tickets.
- Message logging.
- JSON ticket API.

#### Yasrib Tasks

Yasrib owns database schema and ticket logic.

Tasks:

- Create schema for:
  - `businesses`
  - `tickets`
  - `messages`
  - later: `calls`
- Implement `TicketRouter.create_ticket()`.
- Implement `TicketRouter.list_tickets()`.
- Implement `TicketRouter.update_ticket_status()`.
- Implement `TicketRouter.resolve_ticket()`.
- Add priority classification tests.

Acceptance criteria:

- Creating a ticket without a database logs cleanly and does not crash.
- Creating a ticket with a database persists the ticket.
- Priority classification supports:
  - `urgent`
  - `high`
  - `medium`
  - `low`
- Ticket rows include:
  - `business_id`
  - `customer_phone`
  - `channel`
  - `issue_summary`
  - `raw_message`
  - `priority`
  - `status`
  - `created_at`

#### Ify Tasks

Ify owns Twilio webhooks and ticket API routes.

Tasks:

- Update `/sms` so inbound SMS creates a ticket.
- Read Twilio request fields:
  - `From`
  - `To`
  - `Body`
  - `MessageSid`
- Resolve the business from the Twilio `To` number.
- Add development fallback to `DEMO_BUSINESS_ID`.
- Store inbound messages.
- Return useful Twilio XML response.
- Add JSON endpoints:

```text
GET    /health
GET    /businesses/:business_id/tickets
POST   /businesses/:business_id/tickets
PATCH  /tickets/:ticket_id
POST   /tickets/:ticket_id/resolve
GET    /tickets/:ticket_id/messages
```

Acceptance criteria:

- Incoming SMS with `Body`, `From`, and `To` creates a ticket.
- Empty SMS returns a helpful response and does not create a blank ticket.
- Missing business lookup falls back to demo business in development.
- Logs include Twilio `MessageSid` when present.
- Tests can simulate Twilio form payloads without calling Twilio.
- API returns JSON, not HTML.

## Shared Data Contracts

Both teams should agree on these shapes before coding too far.

### Business Profile Shape

Team 1 owns this, Team 2 consumes `business_id` and business phone mapping.

```json
{
  "id": "detroit-plumbing-co",
  "name": "Detroit Plumbing Co.",
  "phone": "+13135550100",
  "hours": {
    "mon-fri": "8am-6pm",
    "sat": "9am-3pm",
    "sun": "closed"
  },
  "services": [
    "Emergency plumbing",
    "Drain cleaning",
    "Water heater installation"
  ],
  "pricing": [
    "Emergency visit starts at $149",
    "Drain cleaning starts at $99"
  ],
  "service_area": [
    "Detroit",
    "Dearborn",
    "Southfield"
  ],
  "faqs": [
    {
      "question": "Do you offer emergency services?",
      "answer": "Yes, 24/7 emergency service is available."
    }
  ],
  "routing_rules": {
    "emergency_keywords": ["flood", "burst pipe", "no heat"],
    "after_hours_action": "create urgent ticket"
  }
}
```

### Ticket Shape

Team 2 owns this, Team 1 can use it when AI creates summaries.

```json
{
  "id": "abc-123",
  "business_id": "demo-plumbing-co",
  "customer_phone": "+13135550101",
  "channel": "sms",
  "issue_summary": "My furnace is broken and I need help today",
  "raw_message": "My furnace is broken and I need help today",
  "priority": "urgent",
  "status": "open",
  "created_at": "2026-05-15T12:00:00Z"
}
```

### Knowledge Chunk Shape

Team 1 owns this.

First version can be strings:

```python
[
    "Detroit Plumbing Co. serves Detroit, Dearborn, and Southfield.",
    "Emergency visit pricing starts at $149.",
    "If a customer mentions flood, burst pipe, or no heat, create an urgent ticket.",
]
```

Later version can be structured:

```python
{
    "business_id": "demo-plumbing-co",
    "kind": "pricing",
    "text": "Emergency visit pricing starts at $149."
}
```

## Database Schema

Team 2 owns implementation. Team 1 should not change schema without talking to Team 2.

```sql
businesses (
  id text primary key,
  name text not null,
  phone text,
  hours jsonb not null default '{}',
  services jsonb not null default '[]',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)

tickets (
  id text primary key,
  business_id text not null references businesses(id),
  customer_phone text not null,
  channel text not null,
  issue_summary text not null,
  raw_message text,
  priority text not null,
  status text not null,
  assigned_operator_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
)

messages (
  id text primary key,
  business_id text not null references businesses(id),
  ticket_id text references tickets(id),
  customer_phone text,
  channel text not null,
  direction text not null,
  body text not null,
  created_at timestamptz not null default now()
)
```

## Sprint 1: Signup to Ticket

Timebox: 1 day

Goal: a business can be onboarded and a simulated SMS can create a ticket.

### Team 1 Tasks

- Create sample business profile JSON.
- Validate and load the profile.
- Generate knowledge chunks.
- Save business profile if database is available.
- Print clear logs for profile and knowledge creation.

### Team 2 Tasks

- Add database schema.
- Implement ticket creation.
- Update `/sms` to create a ticket.
- Add ticket listing endpoint.
- Print clear logs for inbound SMS and ticket creation.

Sprint 1 demo:

```bash
python onboarding/business_setup.py
curl -X POST http://localhost:5000/sms \
  -d "From=+13135550101" \
  -d "To=+13135550100" \
  -d "Body=My furnace is broken and I need help today"
curl http://localhost:5000/businesses/demo-plumbing-co/tickets
```

Expected result:

- Business profile loads.
- Knowledge chunks are created.
- SMS creates an urgent or high ticket.
- API returns the ticket.

## Sprint 2: Business-Aware AI Response

Timebox: 1 day

Goal: Dspatch can answer using the business profile instead of generic text.

### Team 1 Tasks

- Add fallback AI responder.
- Add support prompt builder.
- Add simple keyword retrieval from knowledge chunks.
- Return a business-aware response.

### Team 2 Tasks

- Store inbound and outbound messages.
- Update `/sms` to call Team 1's responder interface when available.
- Link messages to tickets.

Sprint 2 demo:

Customer message:

```text
Do you serve Southfield and what does emergency service cost?
```

Expected Dspatch response:

```text
Yes, Detroit Plumbing Co. serves Southfield. Emergency visits start at $149. I can create a request for the team now.
```

## Sprint 3: Dashboard API and Operator Review

Timebox: 1 day

Goal: a Dspatch operator can inspect businesses, tickets, and messages.

### Team 1 Tasks

- Add business profile read/update functions.
- Support changes to FAQs, pricing, routing rules, and service area.
- Regenerate knowledge chunks after profile updates.

### Team 2 Tasks

- Add ticket filters:
  - status
  - priority
  - business
  - date
- Add message history endpoint:

```text
GET /tickets/:ticket_id/messages
```

- Add ticket update endpoint:

```text
PATCH /tickets/:ticket_id
```

Operator review flow:

1. Operator opens dashboard/API.
2. Operator sees open tickets.
3. Operator opens a ticket.
4. Operator sees inbound/outbound messages.
5. Operator updates priority or status.
6. Operator updates profile knowledge if AI missed something.

## Sprint 4: Voice Path

Timebox: 1 to 2 days

Goal: incoming voice call creates a useful ticket.

This is the riskiest sprint. Keep SMS as the guaranteed demo path.

### Team 1 Tasks

- Build transcript-to-summary function.
- Extract:
  - issue summary
  - urgency
  - requested service
  - callback number
  - preferred time
- Use business profile context to classify the call.

### Team 2 Tasks

- Improve `/voice` TwiML.
- Add call logging.
- Store `CallSid`, `From`, and `To`.
- Add `calls` table:

```sql
calls (
  id text primary key,
  business_id text not null references businesses(id),
  customer_phone text,
  twilio_call_sid text,
  transcript text,
  summary text,
  ticket_id text references tickets(id),
  created_at timestamptz not null default now()
)
```

### Kobby Integration Task

Kobby owns the final call on demo reliability:

- If real-time voice is stable, demo voice.
- If not, demo SMS and simulated transcript-to-ticket.
- Keep fallback mode working.

Voice fallback demo:

1. Twilio call hits `/voice`.
2. Dspatch returns a message saying it received the call.
3. Call metadata is stored.
4. A simulated transcript creates the ticket.

## Coding Guidelines

### Keep Functions Small

Each function should do one thing:

- Parse input.
- Validate input.
- Save data.
- Classify priority.
- Generate response.

Avoid functions that parse, classify, save, and respond all at once.

### Use Clear Return Shapes

Prefer dictionaries that are easy for the dashboard to consume:

```python
{
    "id": ticket.id,
    "business_id": ticket.business_id,
    "customer_phone": ticket.customer_phone,
    "issue_summary": ticket.issue_summary,
    "priority": ticket.priority,
    "status": ticket.status,
    "created_at": ticket.created_at.isoformat(),
}
```

### Log Every Boundary

Log when data crosses a system boundary:

- HTTP request received.
- Twilio webhook parsed.
- Ticket created.
- Business profile saved.
- AI response generated.
- Database write failed.

Use consistent prefixes:

```text
[sms]
[voice]
[ticket]
[business]
[knowledge]
[ai]
[db]
```

### External APIs Must Have Fallbacks

Gemini, watsonx, and Twilio should never block local development.

Use flags:

```text
WATSONX_ENABLED=false
GEMINI_ENABLED=false
TWILIO_VALIDATE_SIGNATURES=false
```

When disabled:

- Watsonx returns a deterministic fake response.
- Gemini voice path can be skipped.
- Twilio validation is not required locally.

### No Silent Failures

Do not write this:

```python
except Exception:
    pass
```

Write this:

```python
except Exception as exc:
    print(f"[db] failed to save ticket: {exc}")
    raise
```

For demo fallback paths, log clearly:

```python
print("[ai] WATSONX_ENABLED=false, using fallback responder")
```

## Testing Priority

Highest priority tests:

1. Business profile validation.
2. Knowledge chunk generation.
3. Ticket priority classification.
4. SMS webhook creates ticket.
5. Missing env vars do not crash local fallback mode.
6. API returns expected JSON shape.

Lower priority tests:

- Real Twilio signature validation.
- Real Gemini streaming.
- Real watsonx generation.
- pgvector similarity quality.

## End-to-End Definition of Done

The backend is demo-ready when this works:

1. Start services:

```bash
docker compose up
```

2. Onboard a business:

```bash
python onboarding/business_setup.py
```

3. Simulate customer SMS:

```bash
curl -X POST http://localhost:5000/sms \
  -d "From=+13135550101" \
  -d "To=+13135550100" \
  -d "Body=My furnace is broken and I need help today"
```

4. Read tickets:

```bash
curl http://localhost:5000/businesses/demo-plumbing-co/tickets
```

5. Expected ticket:

```json
{
  "business_id": "demo-plumbing-co",
  "customer_phone": "+13135550101",
  "channel": "sms",
  "issue_summary": "My furnace is broken and I need help today",
  "priority": "urgent",
  "status": "open"
}
```

6. Ask a business-aware question:

```text
Do you serve Southfield and what does emergency service cost?
```

7. Expected AI answer:

```text
Yes, Detroit Plumbing Co. serves Southfield. Emergency visits start at $149.
```

If this path works, Dspatch has a credible SMB signup-to-support-system demo.
