# Dspatch Team Overview

## What We Are Building

Dspatch is an AI-powered customer support system for small businesses and startups.

The goal is simple:

```text
Enterprise customer support. Half the cost. Set up in minutes.
```

Small businesses lose customers because they miss calls, forget follow-ups, and cannot afford expensive customer support tools or a full support team. Dspatch gives them a lightweight support system that answers calls and messages, creates tickets, routes issues, and keeps the owner organized.

Dspatch also creates work opportunities for recent graduates. These grads become Dspatch operators who help manage AI-powered support systems for real local businesses.

## Mission

Dspatch helps small businesses stop losing customers because they were too busy to respond.

We are building a system that makes customer support:

- Affordable
- Fast to set up
- Easy for owners to understand
- AI-powered but human-supervised
- Useful from day one

## Target Users

### 1. Small Businesses and Startups

These are businesses that need customer support but cannot afford enterprise tools or a large team.

Examples:

- HVAC companies
- Auto shops
- Plumbers
- Electricians
- Restaurants
- Salons
- Local service businesses
- Early-stage startups

Their problem:

- They miss customer calls.
- Their emails and texts get messy.
- Tickets fall through the cracks.
- Customers leave because nobody followed up.
- Tools like Zendesk, Salesforce, and Intercom are too expensive or too complex.

What Dspatch gives them:

- AI call answering
- SMS support
- Automatic ticket creation
- Business-aware responses
- Priority routing
- A simple dashboard
- Human-in-the-loop support from a trained operator

### 2. Recent Graduates

These are people who have AI, tech, business, or operations skills but need real work experience.

Their problem:

- They need paid experience.
- They need resume-worthy work.
- They want flexible work.
- They need a practical way to apply AI skills.

What Dspatch gives them:

- Paid operator work
- Real AI system management experience
- Flexible remote work
- A network of other Dspatch operators
- Real businesses to support

## The Core User Story

A small business owner signs up for Dspatch because they are missing customer calls and losing work.

They enter their business information:

- Business name
- Phone number
- Hours
- Services
- Pricing
- Service area
- FAQs
- Emergency rules
- Routing rules

Dspatch turns that information into a support knowledge base.

When a customer calls or texts, Dspatch:

1. Identifies the business.
2. Reads the customer message or call transcript.
3. Uses the business knowledge base to understand context.
4. Creates a support ticket.
5. Classifies the ticket priority.
6. Sends a useful response.
7. Shows the ticket in the dashboard.
8. Lets a Dspatch operator review or correct the system.

## Day 1 to Day 10 Usage

### Day 1

The business signs up and enters its profile. Dspatch stores the business information and generates support knowledge.

### Day 2

Dspatch starts handling simple texts and support requests. The owner can see tickets in the dashboard.

### Day 3

The owner reviews the first tickets and corrects anything Dspatch misunderstood.

### Day 4

A Dspatch operator reviews the setup, improves FAQs, and checks routing rules.

### Day 5

Dspatch handles common customer questions like hours, pricing, booking, rescheduling, and urgent requests.

### Day 6

The owner only focuses on high-priority tickets instead of answering every call manually.

### Day 7

The dashboard shows patterns: common issues, peak times, repeated questions, and unresolved tickets.

### Day 8

The operator improves automation based on those patterns.

### Day 9

The owner uses Dspatch as the daily command center for customer support.

### Day 10

Dspatch is part of the business workflow. Customers get faster responses, fewer opportunities are missed, and the business has a support system without hiring a full team.

## What The System Must Do

The first real version of Dspatch must support this flow:

```text
Business signs up
-> profile is saved
-> support knowledge is generated
-> customer texts/calls
-> ticket is created
-> AI responds with business context
-> owner/operator sees ticket
```

## Main System Components

### 1. Business Onboarding

Owned mainly by Team 1.

Purpose:

Collect and save the business profile.

Important fields:

- Business name
- Phone
- Hours
- Services
- Pricing
- Service area
- FAQs
- Emergency keywords
- Routing rules

Main file:

- `onboarding/business_setup.py`

### 2. Knowledge Base

Owned mainly by Team 1.

Purpose:

Turn business information into chunks the AI can use to answer customer questions.

Example chunks:

```text
Detroit Plumbing Co. serves Detroit, Dearborn, and Southfield.
Emergency visit pricing starts at $149.
If a customer mentions flood, burst pipe, or no heat, create an urgent ticket.
```

Main files:

- `onboarding/business_setup.py`
- `agent/watsonx.py`

### 3. AI Response Layer

Owned mainly by Team 1.

Purpose:

Use business context to respond to customer questions. In development, this must work even without real IBM watsonx credentials.

Important behavior:

- If `WATSONX_ENABLED=true`, use IBM watsonx.
- If `WATSONX_ENABLED=false`, use a deterministic fallback response.

Main file:

- `agent/watsonx.py`

### 4. Ticketing

Owned mainly by Team 2.

Purpose:

Create and manage customer support tickets.

Tickets should include:

- Business ID
- Customer phone
- Channel: SMS, voice, or web
- Issue summary
- Raw message
- Priority
- Status
- Created time

Main file:

- `ticketing/ticket_router.py`

### 5. Twilio Webhooks

Owned mainly by Team 2.

Purpose:

Receive SMS and phone call events from Twilio.

SMS flow:

```text
Customer texts business number
-> Twilio sends webhook to /sms
-> Dspatch creates ticket
-> Dspatch replies to customer
```

Voice flow:

```text
Customer calls business number
-> Twilio sends webhook to /voice
-> Dspatch streams or records call
-> transcript becomes ticket
```

Main file:

- `agent/twilio_handler.py`

### 6. Dashboard and Website

Purpose:

Explain the product, capture interest, and eventually show business tickets and support activity.

Current landing page files:

- `dashboard/index.html`
- `dashboard/app.jsx`

The landing page is already aligned with the two-audience Dspatch story:

- Businesses get early access.
- Recent grads join the operator network.

## Team Structure

### Team 1: Salma & Kobby

Focus:

```text
Business signup -> knowledge base -> AI response
```

Responsibilities:

- Business profile structure
- Business profile validation
- Sample business profiles
- Knowledge chunk generation
- AI fallback mode
- watsonx prompt builder
- Demo reliability

Team 1 success looks like:

```text
python onboarding/business_setup.py
```

prints:

```text
[business] profile loaded: demo-plumbing-co
[knowledge] chunks created: 12
[ai] fallback response generated
```

And a question like:

```text
Do you serve Southfield and what does emergency service cost?
```

returns an answer like:

```text
Yes, Detroit Plumbing Co. serves Southfield. Emergency visits start at $149.
```

### Team 2: Yasrib & Ify

Focus:

```text
Customer text/call -> ticket created -> ticket API/dashboard
```

Responsibilities:

- Database schema
- Ticket creation
- Ticket priority classification
- Ticket status updates
- SMS webhook
- Message logging
- Ticket API endpoints

Team 2 success looks like:

```bash
curl -X POST http://localhost:5000/sms \
  -d "From=+13135550101" \
  -d "To=+13135550100" \
  -d "Body=My furnace is broken and I need help today"
```

creates:

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

## Demo Path

The demo should prioritize reliability over complexity.

Guaranteed demo path:

```text
Business profile -> SMS webhook -> ticket created -> AI/context response -> dashboard/API
```

Stretch demo path:

```text
Business profile -> voice call -> transcript -> ticket created -> AI/context response
```

SMS should be treated as the main demo because it is easier to debug than real-time voice.

## What Not To Overbuild Yet

Avoid spending too much time on:

- Full authentication
- Billing
- Perfect pgvector search
- Advanced dashboard design
- Real-time voice if SMS is not working yet
- Complex operator scheduling
- Production deployment

The priority is proving that one small business can sign up and have Dspatch handle real customer support activity.

## Definition Of Done

Dspatch is demo-ready when this works:

1. A demo business profile can be loaded.
2. Knowledge chunks are generated.
3. A customer SMS creates a ticket.
4. The ticket has priority and status.
5. A business-aware response can be generated.
6. Tickets can be listed through an API.
7. The team can explain where a recent grad operator fits into the system.

If those seven things work, the product story is clear.
