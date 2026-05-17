# Dspatch

> **Never lose a customer because nobody answered.**

[![HackMichigan 2026](https://img.shields.io/badge/HackMichigan-2026-orange?style=for-the-badge)](https://hackmichigan.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-green?style=for-the-badge&logo=python)](https://python.org)
[![IBM watsonx](https://img.shields.io/badge/IBM-watsonx.ai-052FAD?style=for-the-badge&logo=ibm)](https://www.ibm.com/watsonx)
[![Google Gemini](https://img.shields.io/badge/Google-Gemini_Live-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev)

Dspatch is an **AI-powered customer operations layer** for small businesses. It is not a chatbot, not a helpdesk, not an AI receptionist. It is the intake, classification, and dispatch system that sits between a customer contacting a business and the owner knowing exactly what to do next.

The AI agent collects structured information, detects urgency, and creates operational records. The dashboard — which changes depending on the business type — becomes the command center.

Built at HackMichigan 2026. Focused on Home Services, Hospitality, and Retail.

---

## The Problem

Small businesses lose money because:

- Calls are missed
- Texts are forgotten
- Complaints are buried
- Urgent requests look the same as routine ones
- There is no system — just chaos

Dspatch becomes the intake, organization, and prioritization layer.

---

## What It Does

| Responsibility | Purpose |
|---|---|
| Answers every inbound contact | No missed calls, texts, or messages |
| Collects structured customer info | Name, issue, address, urgency, request type |
| Detects urgency automatically | Emergency keywords, sentiment, after-hours signals |
| Creates operational records | Appointments, orders, service requests, complaints |
| Routes to the right queue | Emergency vs. routine vs. inquiry |
| Updates the dashboard live | Owner sees reality, not a pile of notifications |

---

## Industry-Specific Dashboards

The dashboard is not a generic ticket list. It is a command center built for the business type.

### Home Services
*Plumbing, HVAC, Electrical, Auto Repair*

- Emergency Queue — urgent calls, property damage risk, after-hours
- Appointment Requests — pending jobs, preferred times, technician assignment
- Customer Timeline — repeat customers, recurring issues
- Revenue Recovery — calls answered by AI, jobs recovered, estimated revenue saved

### Hospitality & Food
*Restaurants, Cafes, Bakeries*

- Reservations Queue — upcoming reservations, party size, customer details
- Active Orders — order totals, pickup and delivery status
- Complaint Resolution — unhappy customers, unresolved issues, refund requests
- Peak Demand Analytics — busiest hours, common requests, order trends

### Retail
*Local Shops, Boutiques, Beauty Supply*

- Orders Queue — placed orders, totals, pickup status
- Product Demand Insights — most requested items, out-of-stock inquiries
- Returns & Exchanges — complaints, return reasons, customer info
- Sales Opportunity Alerts — repeat buyers, high-demand products, abandoned inquiries

---

## Demo Flow

```
Customer contacts business
    ↓
AI agent responds immediately
    ↓
AI collects structured information
    ↓
AI classifies request type + urgency
    ↓
AI creates operational record
    ↓
Dashboard updates in real time
    ↓
Owner reviews and acts
```

**Example:**

Customer texts: `"My basement is flooding."`

DSPatch extracts:
```json
{
  "issue_type": "water leak",
  "urgency": "emergency",
  "action": "immediate callback"
}
```

Dashboard shows:
```
EMERGENCY SERVICE REQUEST
Priority: HIGH
Issue: Water Leak
Suggested Action: Immediate Callback
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Voice I/O | Google Gemini Live |
| LLM + RAG | IBM watsonx.ai (Granite) |
| Pipeline | Pipecat |
| Telephony | Twilio |
| Vector Database | PostgreSQL + pgvector |
| Dashboard + Landing | React (JSX) |
| Backend | Python + Flask |
| Infrastructure | Docker Compose |

---

## Project Structure

```
dspatch/
├── README.md
├── .gitignore
├── .env.example
├── docker-compose.yml
├── /agent
│   ├── main.py              # Pipecat voice agent entry point
│   ├── watsonx.py           # IBM watsonx.ai integration
│   ├── gemini.py            # Google Gemini Live voice layer
│   └── twilio_handler.py    # Twilio webhook handler
├── /ticketing
│   └── ticket_router.py     # Operational record creation + routing
├── /dashboard
│   ├── index.html           # React shell + CSS
│   └── app.jsx              # Landing page + animations
├── /onboarding
│   └── business_setup.py    # Business knowledge base ingestion
└── /docs
    └── architecture.md      # System architecture overview
```

---

## Quick Start

### Prerequisites

- Python 3.11+
- Docker + Docker Compose
- Twilio account
- IBM watsonx.ai account
- Google AI Studio (Gemini API)

### 1. Clone

```bash
git clone https://github.com/Kobby-Adjei/dspatch.git
cd dspatch
```

### 2. Environment

```bash
cp .env.example .env
# Fill in your API keys
```

### 3. Start

```bash
docker compose up
```

Starts:
- PostgreSQL + pgvector on `5432`
- Dspatch voice agent on `5000` (webhooks) and `8765` (WebSocket)
- Dspatch web app on `3000`

### 4. Onboard a business

```bash
python onboarding/business_setup.py
```

By default this loads `onboarding/examples/demo-plumbing-co.json`. You can load another sample profile with:

```bash
python onboarding/business_setup.py onboarding/examples/demo-restaurant.json
python onboarding/business_setup.py onboarding/examples/demo-boutique.json
```

### 5. Configure Twilio webhook

```
https://your-server.com/voice
```

---

## Built For

**HackMichigan 2026 · Detroit, MI**

Small businesses in Michigan — HVAC companies, plumbers, auto shops, electricians, restaurants, retail stores — lose customers every day because they have no system. Dspatch is that system.

---

## License

MIT — see [LICENSE](LICENSE) for details.
