# Dspatch Implementation Guide

Deep technical breakdown for each team member. Follow the steps in order.

---

# KOBBY

Files: `agent/watsonx.py`, `agent/twilio_handler.py`, `agent/main.py`, `agent/gemini.py`

---

## Step 1 — `classify_urgency()` in `agent/watsonx.py`

This is the first function to write. No dependencies. Pure Python.

```python
def classify_urgency(message: str, routing_rules: dict) -> str:
    """
    Returns: 'emergency', 'urgent', 'high', 'medium', 'low'
    """
    text = message.lower()

    emergency_keywords = routing_rules.get("emergency_keywords", [])
    urgent_keywords    = routing_rules.get("urgent_keywords", [])

    sentiment_words = [
        "frustrated", "unacceptable", "furious", "angry",
        "ridiculous", "terrible", "awful", "outraged"
    ]

    if any(kw in text for kw in emergency_keywords):
        print(f"[urgency] emergency keyword detected in: '{message}'")
        return "emergency"

    if any(kw in text for kw in urgent_keywords):
        print(f"[urgency] urgent keyword detected in: '{message}'")
        return "urgent"

    if any(word in text for word in sentiment_words):
        print(f"[urgency] negative sentiment detected in: '{message}'")
        return "high"

    if "?" in message or any(w in text for w in ["hours", "price", "cost", "available", "when"]):
        return "low"

    return "medium"
```

**Test immediately — no infra needed:**

```python
routing_rules = {
    "emergency_keywords": ["flood", "flooding", "burst pipe", "no heat", "gas leak"],
    "urgent_keywords": ["broken", "not working", "leaking", "backed up"]
}

print(classify_urgency("My basement is flooding.", routing_rules))
# → emergency

print(classify_urgency("My furnace is not working.", routing_rules))
# → urgent

print(classify_urgency("This is ridiculous I've been waiting 3 days.", routing_rules))
# → high

print(classify_urgency("What are your hours?", routing_rules))
# → low
```

---

## Step 2 — `classify_ticket_type()` in `agent/watsonx.py`

Write this immediately after Step 1.

```python
TICKET_TYPES = {
    "home_services": [
        ("Emergency Service",    ["flood", "flooding", "burst", "gas leak", "no heat", "no hot water", "emergency"]),
        ("Appointment Request",  ["appointment", "schedule", "book", "come out", "send someone", "visit"]),
        ("Quote Request",        ["quote", "estimate", "how much", "cost", "price", "what do you charge"]),
        ("Status Update",        ["status", "update", "my ticket", "my request", "still waiting", "where is"]),
    ],
    "hospitality": [
        ("Reservation",          ["reservation", "reserve", "table", "book", "party of", "seats"]),
        ("Food Order",           ["order", "delivery", "pickup", "i want", "can i get", "menu"]),
        ("Complaint",            ["complaint", "wrong order", "cold", "bad", "terrible", "refund", "unhappy"]),
        ("Catering Inquiry",     ["catering", "event", "corporate", "large order", "bulk"]),
    ],
    "retail": [
        ("Return Request",       ["return", "refund", "exchange", "bring back", "doesn't fit", "wrong item"]),
        ("Order Request",        ["order", "buy", "purchase", "i want", "do you have", "in stock"]),
        ("Product Inquiry",      ["available", "stock", "carry", "sell", "price", "how much"]),
        ("Complaint",            ["complaint", "wrong", "damaged", "broken", "missing", "bad"]),
    ],
}

def classify_ticket_type(message: str, industry: str) -> str:
    """
    Returns the ticket type string for the given industry.
    Falls back to first type in the industry list if no match.
    """
    text = message.lower()
    types = TICKET_TYPES.get(industry, TICKET_TYPES["home_services"])

    for ticket_type, keywords in types:
        if any(kw in text for kw in keywords):
            print(f"[ai] ticket_type matched: {ticket_type}")
            return ticket_type

    default = types[1][0]  # second type (not emergency) as safe default
    print(f"[ai] no ticket_type match, defaulting to: {default}")
    return default
```

**Test:**

```python
print(classify_ticket_type("My basement is flooding.", "home_services"))
# → Emergency Service

print(classify_ticket_type("I want to book a table for 4.", "hospitality"))
# → Reservation

print(classify_ticket_type("Do you have this jacket in size M?", "retail"))
# → Product Inquiry
```

---

## Step 3 — `build_support_prompt()` in `agent/watsonx.py`

This builds the prompt sent to watsonx (or the fallback responder).

```python
def build_support_prompt(
    business_profile: dict,
    customer_message: str,
    context_chunks: list[str]
) -> str:

    name     = business_profile.get("name", "this business")
    industry = business_profile.get("industry", "home_services")
    context  = "\n".join(f"- {chunk}" for chunk in context_chunks)

    return f"""You are the AI assistant for {name}.
Your job is to help customers and collect information to create an operational record.

Business context:
{context}

Customer message: "{customer_message}"

Instructions:
- Answer directly using only the business context above.
- If this is an emergency, acknowledge it immediately and say a team member will contact them shortly.
- If you need more information (address, name, preferred time), ask for one thing at a time.
- Never make up pricing, hours, or services not listed above.
- Keep responses under 3 sentences.
- End every response with a next step.

Response:"""
```

---

## Step 4 — Fallback Responder in `agent/watsonx.py`

When `WATSONX_ENABLED=false`, this runs instead of the real IBM API.

```python
import os

WATSONX_ENABLED = os.getenv("WATSONX_ENABLED", "false").lower() == "true"

def generate_response(
    business_profile: dict,
    customer_message: str,
    context_chunks: list[str],
    urgency: str
) -> str:

    if not WATSONX_ENABLED:
        print("[ai] WATSONX_ENABLED=false, using fallback responder")
        return _fallback_response(business_profile, customer_message, urgency)

    prompt = build_support_prompt(business_profile, customer_message, context_chunks)
    # TODO: real watsonx call here
    return _call_watsonx(prompt)


def _fallback_response(business_profile: dict, message: str, urgency: str) -> str:
    name  = business_profile.get("name", "us")
    hours = business_profile.get("hours", {})
    hours_str = ", ".join(f"{k}: {v}" for k, v in hours.items())

    if urgency == "emergency":
        return (
            f"We've received your emergency request at {name}. "
            f"A team member will contact you shortly. "
            f"Please stay safe."
        )

    if urgency == "urgent":
        return (
            f"Thanks for contacting {name}. "
            f"We've noted your urgent request and will follow up as soon as possible."
        )

    if any(w in message.lower() for w in ["hours", "open", "close", "when"]):
        return f"{name} is open: {hours_str}. How can we help you today?"

    return (
        f"Thanks for reaching out to {name}. "
        f"We've received your message and will follow up during business hours."
    )
```

---

## Step 5 — `/sms` webhook in `agent/twilio_handler.py`

Now wire everything together for SMS. Kobby owns this file entirely.

Rewrite `agent/twilio_handler.py`:

```python
import os
from flask import Flask, request, Response
from twilio.twiml.voice_response import VoiceResponse, Connect, Stream
from twilio.twiml.messaging_response import MessagingResponse

from agent.watsonx import classify_urgency, classify_ticket_type, generate_response
from ticketing.ticket_router import TicketRouter

app = Flask(__name__)
ticket_router = TicketRouter()

DEMO_BUSINESS_ID = os.getenv("DEMO_BUSINESS_ID", "detroit-plumbing-co")


def _resolve_business(to_number: str) -> dict:
    """
    Look up business by Twilio 'To' number.
    Falls back to demo business in development.
    """
    # TODO: query database once Yasrib's schema is live
    # For now, return a hardcoded demo profile
    from onboarding.business_setup import load_business_profile
    try:
        return load_business_profile(f"onboarding/examples/{DEMO_BUSINESS_ID}.json")
    except Exception as exc:
        print(f"[business] profile lookup failed: {exc}, using demo fallback")
        return {
            "id": DEMO_BUSINESS_ID,
            "name": "Detroit Plumbing Co.",
            "industry": "home_services",
            "hours": {"mon-fri": "8am-6pm", "sat": "9am-3pm", "sun": "closed"},
            "routing_rules": {
                "emergency_keywords": ["flood", "flooding", "burst pipe", "no heat", "gas leak"],
                "urgent_keywords": ["broken", "not working", "leaking", "backed up"]
            }
        }


@app.route("/sms", methods=["POST"])
def sms_webhook():
    body       = request.form.get("Body", "").strip()
    from_phone = request.form.get("From", "")
    to_phone   = request.form.get("To", "")
    msg_sid    = request.form.get("MessageSid", "")

    print(f"[sms] inbound from={from_phone} to={to_phone} sid={msg_sid}")

    if not body:
        print("[sms] empty body, skipping ticket creation")
        resp = MessagingResponse()
        resp.message("We received your message but it was empty. Please describe how we can help.")
        return str(resp)

    business  = _resolve_business(to_phone)
    urgency   = classify_urgency(body, business.get("routing_rules", {}))
    ticket_type = classify_ticket_type(body, business.get("industry", "home_services"))

    ticket = ticket_router.create_ticket(
        business_id    = business["id"],
        customer_phone = from_phone,
        raw_message    = body,
        issue_summary  = body,
        ticket_type    = ticket_type,
        urgency        = urgency,
    )

    print(f"[ticket] {ticket_type} created: {ticket.id} urgency={urgency}")

    ai_reply = generate_response(
        business_profile = business,
        customer_message = body,
        context_chunks   = [],   # Salma's chunks plug in here
        urgency          = urgency,
    )

    resp = MessagingResponse()
    resp.message(ai_reply)
    return str(resp)


@app.route("/voice", methods=["POST"])
def voice_webhook():
    call_sid   = request.form.get("CallSid", "")
    from_phone = request.form.get("From", "")
    to_phone   = request.form.get("To", "")

    print(f"[voice] inbound call from={from_phone} to={to_phone} sid={call_sid}")

    websocket_url = os.getenv("WEBSOCKET_URL", "wss://localhost:8765")

    response = VoiceResponse()
    connect  = Connect()
    stream   = Stream(url=websocket_url)
    connect.append(stream)
    response.append(connect)

    return Response(str(response), mimetype="text/xml")


@app.route("/health", methods=["GET"])
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    app.run(debug=True, port=5000)
```

---

## Step 6 — Pipecat + Gemini Live in `agent/main.py` and `agent/gemini.py`

**Do this after Steps 1–5 are working.**

`agent/gemini.py`:

```python
import os
import asyncio
from google import genai
from google.genai import types

GEMINI_ENABLED = os.getenv("GEMINI_ENABLED", "false").lower() == "true"

class GeminiLiveSession:

    def __init__(self, business_profile: dict, on_transcript: callable):
        self.business_profile = business_profile
        self.on_transcript    = on_transcript  # called when a full transcript is ready
        self.client           = genai.Client(api_key=os.getenv("GEMINI_API_KEY")) if GEMINI_ENABLED else None
        self.transcript_parts = []

    async def run(self, audio_stream):
        if not GEMINI_ENABLED:
            print("[gemini] GEMINI_ENABLED=false, using transcript simulation")
            await self._simulate(audio_stream)
            return

        config = types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            system_instruction=self._system_prompt(),
        )
        async with self.client.aio.live.connect(
            model="gemini-2.0-flash-live-001",
            config=config
        ) as session:
            async for chunk in audio_stream:
                await session.send(input=chunk)
                async for response in session.receive():
                    if response.text:
                        self.transcript_parts.append(response.text)
                        yield response.audio  # speak back to customer

        full_transcript = " ".join(self.transcript_parts)
        print(f"[gemini] transcript complete: {full_transcript[:80]}...")
        await self.on_transcript(full_transcript)

    async def _simulate(self, audio_stream):
        """Fallback — simulates a transcript without real Gemini."""
        await asyncio.sleep(1)
        simulated = "My basement is flooding and I need help immediately."
        print(f"[gemini] simulated transcript: {simulated}")
        await self.on_transcript(simulated)

    def _system_prompt(self) -> str:
        name = self.business_profile.get("name", "this business")
        return (
            f"You are the voice assistant for {name}. "
            f"Collect the customer's name, issue, address, and urgency. "
            f"Keep responses brief and clear. "
            f"If this is an emergency say so and tell them a technician will call back shortly."
        )
```

`agent/main.py`:

```python
import asyncio
import json
import os
import websockets

from agent.gemini import GeminiLiveSession
from agent.watsonx import classify_urgency, classify_ticket_type
from ticketing.ticket_router import TicketRouter
from onboarding.business_setup import load_business_profile

ticket_router    = TicketRouter()
DEMO_BUSINESS_ID = os.getenv("DEMO_BUSINESS_ID", "detroit-plumbing-co")


def transcript_to_record(transcript: str, business_profile: dict) -> dict:
    """
    Turns a call transcript into a structured ticket payload.
    """
    routing_rules = business_profile.get("routing_rules", {})
    industry      = business_profile.get("industry", "home_services")
    urgency       = classify_urgency(transcript, routing_rules)
    ticket_type   = classify_ticket_type(transcript, industry)

    suggested_actions = {
        "emergency": "Immediate callback",
        "urgent":    "Call back within 1 hour",
        "high":      "Call back today",
        "medium":    "Follow up within 24 hours",
        "low":       "Respond during business hours",
    }

    return {
        "business_id":       business_profile["id"],
        "ticket_type":       ticket_type,
        "issue_summary":     transcript[:200],
        "raw_transcript":    transcript,
        "urgency":           urgency,
        "priority":          "high" if urgency in ("emergency", "urgent") else "medium",
        "suggested_action":  suggested_actions.get(urgency, "Follow up"),
        "channel":           "voice",
    }


async def handle_call(websocket):
    print("[main] new call connection opened")

    business = load_business_profile(
        f"onboarding/examples/{DEMO_BUSINESS_ID}.json"
    )

    async def on_transcript(transcript: str):
        record = transcript_to_record(transcript, business)
        print(f"[main] transcript_to_record: {json.dumps(record, indent=2)}")

        ticket = ticket_router.create_ticket(
            business_id    = record["business_id"],
            customer_phone = "unknown",   # extracted from call metadata
            raw_message    = record["raw_transcript"],
            issue_summary  = record["issue_summary"],
            ticket_type    = record["ticket_type"],
            urgency        = record["urgency"],
        )
        print(f"[ticket] {record['ticket_type']} created from voice: {ticket.id}")

    audio_stream = websocket_audio_stream(websocket)
    session = GeminiLiveSession(business, on_transcript)
    await session.run(audio_stream)


async def websocket_audio_stream(websocket):
    async for message in websocket:
        yield message


async def main():
    port = int(os.getenv("WEBSOCKET_PORT", 8765))
    print(f"[main] Pipecat WebSocket listening on port {port}")
    async with websockets.serve(handle_call, "0.0.0.0", port):
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
```

---

## Kobby Acceptance Criteria Checklist

Run these in order. Each one must pass before moving to the next.

- [ ] `classify_urgency("My basement is flooding.", rules)` → `"emergency"`
- [ ] `classify_ticket_type("My basement is flooding.", "home_services")` → `"Emergency Service"`
- [ ] `generate_response(...)` with `WATSONX_ENABLED=false` returns a business-aware string
- [ ] `curl -X POST /sms -d "Body=My basement is flooding."` creates a ticket and responds
- [ ] `curl -X POST /sms -d "Body="` returns a helpful message, no ticket created
- [ ] `curl -X POST /voice` returns valid TwiML XML with a `<Stream>` element
- [ ] `transcript_to_record("My basement is flooding.", profile)` returns correct urgency and ticket type
- [ ] Full voice path: WebSocket connects, transcript captured, ticket created

---

---

# SALMA

Files: `onboarding/business_setup.py`, `onboarding/examples/*.json`

---

## Step 1 — Business Profile JSON

Create `onboarding/examples/detroit-plumbing-co.json`:

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
    "Water heater installation",
    "Pipe repair"
  ],
  "pricing": [
    "Emergency visit starts at $149",
    "Drain cleaning starts at $99",
    "Water heater installation starts at $450"
  ],
  "service_area": ["Detroit", "Dearborn", "Southfield", "Warren"],
  "faqs": [
    {
      "question": "Do you offer emergency services?",
      "answer": "Yes, 24/7 emergency service is available."
    },
    {
      "question": "Do you serve Southfield?",
      "answer": "Yes, we serve Southfield and surrounding areas."
    }
  ],
  "routing_rules": {
    "emergency_keywords": ["flood", "flooding", "burst pipe", "no heat", "no hot water", "gas leak"],
    "urgent_keywords": ["broken", "not working", "leaking", "backed up", "clogged"],
    "after_hours_action": "create urgent ticket"
  }
}
```

Create two more: `demo-restaurant.json` (industry: `hospitality`) and `demo-boutique.json` (industry: `retail`).

---

## Step 2 — `load_business_profile()` in `onboarding/business_setup.py`

```python
import json
import os

REQUIRED_FIELDS = ["id", "name", "industry", "phone", "hours", "services", "routing_rules"]
VALID_INDUSTRIES = ["home_services", "hospitality", "retail"]

def load_business_profile(path: str) -> dict:
    if not os.path.exists(path):
        raise FileNotFoundError(f"[business] profile not found: {path}")

    with open(path) as f:
        profile = json.load(f)

    print(f"[business] profile loaded: {profile.get('id', 'unknown')}")
    validate_profile(profile)
    return profile


def validate_profile(profile: dict) -> None:
    for field in REQUIRED_FIELDS:
        if field not in profile:
            raise ValueError(f"[business] missing required field: '{field}'")

    if profile["industry"] not in VALID_INDUSTRIES:
        raise ValueError(
            f"[business] invalid industry '{profile['industry']}'. "
            f"Must be one of: {VALID_INDUSTRIES}"
        )

    print(f"[business] profile valid: {profile['name']} ({profile['industry']})")
```

---

## Step 3 — `build_knowledge_chunks()` in `onboarding/business_setup.py`

```python
def build_knowledge_chunks(profile: dict) -> list[str]:
    chunks = []
    name = profile["name"]

    # Hours
    hours_str = ", ".join(f"{k}: {v}" for k, v in profile["hours"].items())
    chunks.append(f"{name} is open {hours_str}.")

    # Services
    services_str = ", ".join(profile["services"])
    chunks.append(f"{name} offers: {services_str}.")

    # Pricing
    for price in profile.get("pricing", []):
        chunks.append(f"{name} pricing — {price}.")

    # Service area
    area = profile.get("service_area", [])
    if area:
        chunks.append(f"{name} serves: {', '.join(area)}.")

    # FAQs
    for faq in profile.get("faqs", []):
        chunks.append(f"Q: {faq['question']} A: {faq['answer']}")

    # Emergency keywords
    emergency_kws = profile.get("routing_rules", {}).get("emergency_keywords", [])
    if emergency_kws:
        chunks.append(
            f"If a customer mentions {', '.join(emergency_kws)}, treat this as an emergency."
        )

    print(f"[knowledge] chunks created: {len(chunks)}")
    return chunks
```

---

## Step 4 — Main runner in `onboarding/business_setup.py`

```python
if __name__ == "__main__":
    import sys
    path = sys.argv[1] if len(sys.argv) > 1 else "onboarding/examples/detroit-plumbing-co.json"
    profile = load_business_profile(path)
    chunks  = build_knowledge_chunks(profile)
    for chunk in chunks:
        print(f"  • {chunk}")
```

**Test:**
```bash
python onboarding/business_setup.py
```

Expected output:
```
[business] profile loaded: detroit-plumbing-co
[business] profile valid: Detroit Plumbing Co. (home_services)
[knowledge] chunks created: 12
  • Detroit Plumbing Co. is open mon-fri: 8am-6pm, sat: 9am-3pm, sun: closed.
  • Detroit Plumbing Co. offers: Emergency plumbing, Drain cleaning ...
  ...
```

---

## Salma Acceptance Criteria Checklist

- [ ] `python onboarding/business_setup.py` runs without any API keys
- [ ] Missing `industry` field raises a clear error
- [ ] Missing `name`, `phone`, `hours`, or `services` raises a clear error
- [ ] Knowledge chunks include hours, services, pricing, service area, FAQs, emergency keywords
- [ ] Three sample profiles exist: home_services, hospitality, retail

---

---

# YASRIB

Files: `db/schema.sql`, `ticketing/ticket_router.py`

---

## Step 1 — `db/schema.sql`

```sql
CREATE TABLE IF NOT EXISTS businesses (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  industry      TEXT NOT NULL,
  phone         TEXT,
  hours         JSONB NOT NULL DEFAULT '{}',
  services      JSONB NOT NULL DEFAULT '[]',
  routing_rules JSONB NOT NULL DEFAULT '{}',
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tickets (
  id               TEXT PRIMARY KEY,
  business_id      TEXT NOT NULL REFERENCES businesses(id),
  customer_phone   TEXT NOT NULL,
  channel          TEXT NOT NULL,
  ticket_type      TEXT NOT NULL,
  issue_summary    TEXT NOT NULL,
  raw_message      TEXT,
  urgency          TEXT NOT NULL,
  priority         TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'open',
  suggested_action TEXT,
  assigned_to      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS messages (
  id             TEXT PRIMARY KEY,
  business_id    TEXT NOT NULL REFERENCES businesses(id),
  ticket_id      TEXT REFERENCES tickets(id),
  customer_phone TEXT,
  channel        TEXT NOT NULL,
  direction      TEXT NOT NULL,
  body           TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calls (
  id               TEXT PRIMARY KEY,
  business_id      TEXT NOT NULL REFERENCES businesses(id),
  customer_phone   TEXT,
  twilio_call_sid  TEXT,
  transcript       TEXT,
  summary          TEXT,
  urgency          TEXT,
  ticket_id        TEXT REFERENCES tickets(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_tickets_business    ON tickets(business_id);
CREATE INDEX IF NOT EXISTS idx_tickets_urgency     ON tickets(urgency);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_type ON tickets(ticket_type);
CREATE INDEX IF NOT EXISTS idx_tickets_status      ON tickets(status);
```

---

## Step 2 — Rewrite `ticketing/ticket_router.py`

```python
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
        raw_message:    str  = "",
        channel:        str  = "sms",
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
                ticket.status, ticket.suggested_action, ticket.created_at
            ))
            conn.commit()
            print(f"[db] ticket saved: {ticket.id}")
        except Exception as exc:
            print(f"[db] failed to save ticket: {exc}")
            raise
        finally:
            conn.close()

    def list_tickets(self, business_id: str, filters: dict = {}) -> list[dict]:
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
                (status, datetime.utcnow(), ticket_id)
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
                (datetime.utcnow(), datetime.utcnow(), ticket_id)
            )
            conn.commit()
            print(f"[db] ticket {ticket_id} resolved")
        except Exception as exc:
            print(f"[db] failed to resolve ticket: {exc}")
            raise
        finally:
            conn.close()
```

---

## Yasrib Acceptance Criteria Checklist

- [ ] `db/schema.sql` runs against a fresh PostgreSQL database without errors
- [ ] `ticket_router.create_ticket(...)` with no `DATABASE_URL` logs cleanly and does not crash
- [ ] `ticket_router.create_ticket(...)` with a database persists the row
- [ ] `ticket_router.list_tickets(business_id, {"urgency": "emergency"})` returns only emergency tickets
- [ ] `ticket_router.resolve_ticket(ticket_id)` sets `status = resolved` and `resolved_at`

---

---

# IFY

Files: API routes in `agent/twilio_handler.py`

---

## Step 1 — API Routes

Add these routes to `agent/twilio_handler.py`. Do not touch `/sms` or `/voice` — those are Kobby's.

```python
import json
from ticketing.ticket_router import TicketRouter

ticket_router = TicketRouter()


@app.route("/businesses/<business_id>/tickets", methods=["GET"])
def list_tickets(business_id):
    filters = {}
    for key in ("status", "urgency", "ticket_type", "priority"):
        val = request.args.get(key)
        if val:
            filters[key] = val

    tickets = ticket_router.list_tickets(business_id, filters)
    return {"tickets": tickets, "count": len(tickets)}


@app.route("/businesses/<business_id>/tickets", methods=["POST"])
def create_ticket(business_id):
    data = request.get_json()
    if not data:
        return {"error": "request body must be JSON"}, 400

    required = ["customer_phone", "issue_summary", "ticket_type", "urgency"]
    missing  = [f for f in required if f not in data]
    if missing:
        return {"error": f"missing fields: {missing}"}, 400

    ticket = ticket_router.create_ticket(
        business_id    = business_id,
        customer_phone = data["customer_phone"],
        issue_summary  = data["issue_summary"],
        ticket_type    = data["ticket_type"],
        urgency        = data["urgency"],
        raw_message    = data.get("raw_message", ""),
        channel        = data.get("channel", "api"),
    )
    return {"ticket": ticket.__dict__}, 201


@app.route("/tickets/<ticket_id>", methods=["PATCH"])
def update_ticket(ticket_id):
    data   = request.get_json()
    status = data.get("status")
    if not status:
        return {"error": "status is required"}, 400
    ticket_router.update_ticket_status(ticket_id, status)
    return {"updated": ticket_id, "status": status}


@app.route("/tickets/<ticket_id>/resolve", methods=["POST"])
def resolve_ticket(ticket_id):
    ticket_router.resolve_ticket(ticket_id)
    return {"resolved": ticket_id}
```

---

## Ify Acceptance Criteria Checklist

- [ ] `GET /businesses/detroit-plumbing-co/tickets` returns JSON
- [ ] `GET /businesses/detroit-plumbing-co/tickets?urgency=emergency` returns only emergency tickets
- [ ] `GET /businesses/detroit-plumbing-co/tickets?ticket_type=Appointment+Request` filters correctly
- [ ] `POST /businesses/detroit-plumbing-co/tickets` with valid JSON creates a ticket
- [ ] `PATCH /tickets/:id` with `{"status": "in_progress"}` updates the ticket
- [ ] All responses are JSON, never HTML
- [ ] Missing fields return a `400` with a clear error message
