# Dspatch Sprint Plan

Teams:

- **Team 1: Salma & Kobby**
- **Team 2: Yasrib & Ify**

---

## Product Goal

Dspatch is an AI-powered customer operations layer for small businesses.

The first working version must prove this:

- A business can be onboarded in under 10 minutes.
- Every inbound contact (call or SMS) gets an immediate AI response.
- The AI collects structured information and detects urgency.
- The AI creates an operational record with the correct type and priority.
- The dashboard shows a live command center, not a generic ticket list.
- The command center feels different depending on the business type.

This is not a support chatbot. This is an intake, classification, and dispatch system.

---

## Core Demo Target

**Business:** Detroit Plumbing Co.

**Customer texts:**
```
My basement is flooding.
```

**DSPatch AI extracts:**
```json
{
  "ticket_type": "Emergency Service",
  "issue_type": "water leak",
  "urgency": "emergency",
  "priority": "high",
  "suggested_action": "Immediate callback"
}
```

**Dashboard shows:**
```
EMERGENCY SERVICE REQUEST
Priority: HIGH
Issue: Water Leak — 123 Main St
Suggested Action: Immediate Callback
Created: 2 seconds ago
```

**Customer receives:**
```
Your emergency request has been received.
A technician from Detroit Plumbing Co. will contact you shortly.
```

Everything below is in service of making that demo work cleanly.

---

## Pair Ownership

### Team 1: Salma & Kobby

Ownership:

```
Business onboards → profile saved → AI answers from business context → urgency detected
```

Owned files:

- `onboarding/business_setup.py`
- `agent/watsonx.py`
- `.env.example`
- `README.md`
- `onboarding/examples/*.json`

---

#### Salma Tasks

Salma owns business profile structure, validation, and knowledge generation.

**Business Profile Shape**

The profile must include an `industry` field so the dashboard knows which command center to render.

```json
{
  "id": "detroit-plumbing-co",
  "name": "Detroit Plumbing Co.",
  "industry": "home_services",
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
  "service_area": ["Detroit", "Dearborn", "Southfield"],
  "faqs": [
    {
      "question": "Do you offer emergency services?",
      "answer": "Yes, 24/7 emergency service is available."
    }
  ],
  "routing_rules": {
    "emergency_keywords": ["flood", "flooding", "burst pipe", "no heat", "no hot water", "gas leak"],
    "urgent_keywords": ["broken", "not working", "leaking", "backed up"],
    "after_hours_action": "create urgent ticket"
  }
}
```

Valid `industry` values: `home_services`, `hospitality`, `retail`

**Tasks:**

- Add `industry` as a required field with validation
- Create sample profiles:
  - `demo-plumbing-co` (home_services)
  - `demo-restaurant` (hospitality)
  - `demo-boutique` (retail)
- Update `_build_knowledge_chunks()` to include hours, services, pricing, service area, FAQs, routing rules, and emergency keywords
- Add clear errors for missing required fields

**Acceptance criteria:**

- `python onboarding/business_setup.py` runs without credentials
- Missing `name`, `phone`, `hours`, `services`, or `industry` gives a clear error
- Knowledge chunks cover every important profile field
- Emergency keywords from `routing_rules` appear in chunks

---

#### Kobby Tasks

Kobby owns AI fallback, urgency detection, and demo reliability.

**Urgency Signal Table**

The AI must classify urgency using this signal priority:

| Signal | Priority |
|---|---|
| Emergency keyword match (flood, burst pipe, no heat) | emergency |
| After-hours contact | urgent |
| Angry or frustrated sentiment | high |
| Repeat customer with open issue | elevated |
| Standard inquiry | medium |
| General question | low |

**Tasks:**

- Add `WATSONX_ENABLED=false` support in `agent/watsonx.py`
- Build `classify_urgency(message, routing_rules)` function:
  - Check emergency keywords → `emergency`
  - Check urgent keywords → `urgent`
  - Simple sentiment scan (words like "frustrated", "unacceptable", "furious") → `high`
  - Default → `medium`
- Build `classify_ticket_type(message, industry)` function:
  - Home services: `Emergency Service`, `Appointment Request`, `Quote Request`, `Status Update`
  - Hospitality: `Reservation`, `Food Order`, `Complaint`, `Catering Inquiry`
  - Retail: `Product Inquiry`, `Order Request`, `Return Request`, `Complaint`
- Add prompt builder:

```python
def build_support_prompt(business_profile, customer_message, context_chunks):
    ...
```

- Add `WATSONX_ENABLED=false` fallback that returns a deterministic business-aware response
- Update `.env.example`:

```
WATSONX_ENABLED=false
GEMINI_ENABLED=false
TWILIO_VALIDATE_SIGNATURES=false
DEMO_BUSINESS_ID=detroit-plumbing-co
```

**Acceptance criteria:**

- `"My basement is flooding."` → `urgency: emergency`, `ticket_type: Emergency Service`
- `"What are your hours?"` → `urgency: low`, `ticket_type: Quote Request`
- Demo works without IBM credentials
- Logs show:

```
[business] profile loaded: detroit-plumbing-co
[knowledge] chunks created: 12
[ai] WATSONX_ENABLED=false, using fallback responder
[urgency] emergency keyword detected: flooding
[ai] ticket_type: Emergency Service, priority: high
```

---

### Team 2: Yasrib & Ify

Ownership:

```
Customer contacts → operational record created → dashboard/API reflects live state
```

Owned files:

- `ticketing/ticket_router.py`
- `agent/twilio_handler.py`
- `db/schema.sql`

---

#### Yasrib Tasks

Yasrib owns database schema and operational record logic.

**Schema**

```sql
businesses (
  id              text primary key,
  name            text not null,
  industry        text not null,
  phone           text,
  hours           jsonb not null default '{}',
  services        jsonb not null default '[]',
  routing_rules   jsonb not null default '{}',
  metadata        jsonb not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
)

tickets (
  id                  text primary key,
  business_id         text not null references businesses(id),
  customer_phone      text not null,
  channel             text not null,
  ticket_type         text not null,
  issue_summary       text not null,
  raw_message         text,
  urgency             text not null,
  priority            text not null,
  status              text not null default 'open',
  suggested_action    text,
  assigned_to         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  resolved_at         timestamptz
)

messages (
  id              text primary key,
  business_id     text not null references businesses(id),
  ticket_id       text references tickets(id),
  customer_phone  text,
  channel         text not null,
  direction       text not null,
  body            text not null,
  created_at      timestamptz not null default now()
)
```

`ticket_type` valid values by industry:

| Industry | Types |
|---|---|
| home_services | Emergency Service, Appointment Request, Quote Request, Status Update |
| hospitality | Reservation, Food Order, Complaint, Catering Inquiry |
| retail | Product Inquiry, Order Request, Return Request, Complaint |

`urgency` values: `emergency`, `urgent`, `high`, `medium`, `low`
`priority` values: `high`, `medium`, `low`
`status` values: `open`, `in_progress`, `resolved`

**Tasks:**

- Implement `TicketRouter.create_ticket()`
- Implement `TicketRouter.list_tickets(business_id, filters={})`
  - Filters: `status`, `priority`, `urgency`, `ticket_type`, `date_from`
- Implement `TicketRouter.update_ticket_status(ticket_id, status)`
- Implement `TicketRouter.resolve_ticket(ticket_id)`

**Acceptance criteria:**

- Ticket row includes `ticket_type`, `urgency`, `priority`, and `suggested_action`
- `list_tickets` supports filtering by `urgency=emergency` to populate the Emergency Queue
- Creating without a database logs and does not crash

---

#### Ify Tasks

Ify owns Twilio webhooks and the ticket API.

**SMS Webhook**

Inbound SMS → classify → create operational record → return confirmation to customer.

The response to the customer must be business-aware, not generic.

For an emergency:
```
Your emergency request has been received.
A technician from Detroit Plumbing Co. will contact you shortly.
```

For a standard inquiry:
```
Thanks for reaching out to Detroit Plumbing Co.
We've noted your request and will follow up during business hours.
```

**API Routes**

```
GET    /health
GET    /businesses/:business_id/tickets
GET    /businesses/:business_id/tickets?urgency=emergency
GET    /businesses/:business_id/tickets?ticket_type=Appointment+Request
POST   /businesses/:business_id/tickets
PATCH  /tickets/:ticket_id
POST   /tickets/:ticket_id/resolve
GET    /tickets/:ticket_id/messages
```

**Acceptance criteria:**

- `"My basement is flooding."` from SMS creates an `Emergency Service` ticket with `urgency: emergency`
- `GET /tickets?urgency=emergency` returns only emergency tickets (for Emergency Queue)
- Empty SMS returns a helpful response and does not create a blank ticket
- Missing business lookup falls back to `DEMO_BUSINESS_ID` in development
- All responses are JSON

---

## Shared Data Contract

### Ticket Shape

```json
{
  "id": "abc-123",
  "business_id": "detroit-plumbing-co",
  "customer_phone": "+13135550101",
  "channel": "sms",
  "ticket_type": "Emergency Service",
  "issue_summary": "Basement flooding — water leak",
  "raw_message": "My basement is flooding.",
  "urgency": "emergency",
  "priority": "high",
  "status": "open",
  "suggested_action": "Immediate callback",
  "created_at": "2026-05-15T12:00:00Z"
}
```

---

## Sprint 1 — Intake to Record

**Timebox:** 1 day

**Goal:** Business onboards. Customer SMS creates a correctly typed, correctly prioritized operational record.

### Team 1
- Load and validate business profile with `industry` field
- Generate knowledge chunks from full profile including routing rules
- Implement `classify_urgency()` with keyword matching

### Team 2
- Ship database schema with `ticket_type` and `urgency` columns
- Implement `create_ticket()` with all required fields
- Update `/sms` to create a typed ticket

### Sprint 1 Demo

```bash
python onboarding/business_setup.py

curl -X POST http://localhost:5000/sms \
  -d "From=+13135550101" \
  -d "To=+13135550100" \
  -d "Body=My basement is flooding."

curl http://localhost:5000/businesses/detroit-plumbing-co/tickets
```

Expected:

```json
{
  "ticket_type": "Emergency Service",
  "issue_summary": "Basement flooding — water leak",
  "urgency": "emergency",
  "priority": "high",
  "status": "open",
  "suggested_action": "Immediate callback"
}
```

---

## Sprint 2 — Business-Aware AI Response

**Timebox:** 1 day

**Goal:** DSPatch answers using business context, not generic text.

### Team 1
- Implement fallback AI responder using knowledge chunks
- Build `build_support_prompt()` with business context
- Simple keyword retrieval from chunks

### Team 2
- Store inbound and outbound messages
- Link messages to tickets
- Call Team 1's responder interface from `/sms`

### Sprint 2 Demo

Customer: `"Do you serve Southfield and what does emergency service cost?"`

Expected: `"Yes, Detroit Plumbing Co. serves Southfield. Emergency visits start at $149. I can log a request for the team now."`

---

## Sprint 3 — Dashboard API and Command Center

**Timebox:** 1 day

**Goal:** The dashboard API reflects the live state of the command center, filtered by industry and urgency.

### Team 1
- Support profile updates (FAQs, pricing, routing rules)
- Regenerate knowledge chunks after update

### Team 2
- Add `urgency` and `ticket_type` filters to ticket list endpoint
- Add message history endpoint
- Add ticket update endpoint

Dashboard queries the backend needs to support:

| Dashboard Module | API Query |
|---|---|
| Emergency Queue | `GET /tickets?urgency=emergency&status=open` |
| Appointment Requests | `GET /tickets?ticket_type=Appointment+Request` |
| All Open | `GET /tickets?status=open` |
| Resolved today | `GET /tickets?status=resolved&date_from=today` |

---

## Sprint 4 — Voice Path

**Timebox:** 1–2 days

**This is the riskiest sprint. SMS is the guaranteed demo path. Do not skip SMS to chase voice.**

### Team 1
- Build `transcript_to_record(transcript, business_profile)`:
  - Extract issue summary, urgency, ticket type, callback number
  - Use business routing rules to classify

### Team 2
- Add `/voice` TwiML handler
- Add call logging
- Add `calls` table:

```sql
calls (
  id                text primary key,
  business_id       text not null references businesses(id),
  customer_phone    text,
  twilio_call_sid   text,
  transcript        text,
  summary           text,
  urgency           text,
  ticket_id         text references tickets(id),
  created_at        timestamptz not null default now()
)
```

### Kobby — Demo Reliability Call

Kobby decides the final demo path:

- If real-time voice is stable → demo voice
- If not → demo SMS + simulated transcript-to-ticket, which is still compelling

---

## Coding Guidelines

### One function, one job

- Parse input
- Validate input
- Classify urgency
- Create record
- Generate response

Never in the same function.

### Log every boundary

```
[sms]       inbound message received
[urgency]   emergency keyword detected: flooding
[ticket]    Emergency Service ticket created: abc-123
[business]  profile loaded: detroit-plumbing-co
[knowledge] chunks created: 12
[ai]        WATSONX_ENABLED=false, using fallback responder
[db]        failed to save ticket: connection refused
```

### Every external API has a fallback

```
WATSONX_ENABLED=false
GEMINI_ENABLED=false
TWILIO_VALIDATE_SIGNATURES=false
```

### No silent failures

```python
# Never
except Exception:
    pass

# Always
except Exception as exc:
    print(f"[db] failed to save ticket: {exc}")
    raise
```

---

## Testing Priority

1. `classify_urgency("My basement is flooding.")` → `emergency`
2. `classify_ticket_type("basement is flooding", "home_services")` → `Emergency Service`
3. Business profile validation — missing `industry` gives a clear error
4. SMS webhook creates a ticket with `ticket_type` and `urgency`
5. `GET /tickets?urgency=emergency` returns only emergency tickets
6. Missing env vars do not crash local fallback mode

---

## Definition of Done

The platform is demo-ready when this full path works:

```bash
# 1. Start
docker compose up

# 2. Onboard
python onboarding/business_setup.py

# 3. Emergency SMS
curl -X POST http://localhost:5000/sms \
  -d "From=+13135550101" \
  -d "To=+13135550100" \
  -d "Body=My basement is flooding."

# 4. Check emergency queue
curl "http://localhost:5000/businesses/detroit-plumbing-co/tickets?urgency=emergency"

# 5. Business-aware question
curl -X POST http://localhost:5000/sms \
  -d "From=+13135550102" \
  -d "To=+13135550100" \
  -d "Body=Do you serve Southfield and what does emergency service cost?"
```

Expected results:

- Emergency SMS → `ticket_type: Emergency Service`, `urgency: emergency`, `priority: high`
- Emergency queue endpoint → returns that ticket
- Business question → `"Yes, Detroit Plumbing Co. serves Southfield. Emergency visits start at $149."`

That is a credible platform demo: live intake, urgency detection, typed operational records, business-aware AI, and a filterable command center API.
