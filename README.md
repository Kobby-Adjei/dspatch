# Dspatch

> **Enterprise customer support. Half the cost. Set up in minutes.**

[![HackMichigan 2026](https://img.shields.io/badge/HackMichigan-2026-blue?style=for-the-badge&logo=michigan)](https://hackmichigan.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-green?style=for-the-badge&logo=python)](https://python.org)
[![IBM watsonx](https://img.shields.io/badge/IBM-watsonx.ai-052FAD?style=for-the-badge&logo=ibm)](https://www.ibm.com/watsonx)
[![Google Gemini](https://img.shields.io/badge/Google-Gemini_Live-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev)

Dspatch gives small businesses and startups a full AI-powered support system: calls answered, tickets routed, customers never lost. It combines Gemini Live, IBM watsonx, Twilio, and a human-in-the-loop operator network of recent grads so local teams can get enterprise-grade support without enterprise software or a full support department.

Built in Michigan at HackMichigan 2026, Dspatch serves two audiences:

- **Small businesses and startups** that need affordable customer support, intake, and ticket routing.
- **Recent graduates** who want paid, flexible AI operations experience managing real business systems.

---

## What It Does

- **Answers every call** — Gemini Live handles customer calls 24/7, even when the team is busy
- **Routes tickets automatically** — Every call, message, or support issue becomes a tracked ticket
- **Knows the business** — IBM watsonx.ai + pgvector RAG answers from hours, services, FAQs, and policies
- **Keeps a person in the loop** — Dspatch-trained grads manage systems, catch AI misses, and keep accounts healthy
- **Works over SMS too** — Twilio handles both voice and text
- **Costs less than enterprise tools** — Starting at $29/month vs $150+/month for large support platforms

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Voice I/O | Google Gemini Live |
| LLM + RAG | IBM watsonx.ai (Granite) |
| Pipeline | Pipecat |
| Telephony | Twilio |
| Vector Database | PostgreSQL + pgvector |
| Landing + Dashboard | React (JSX) |
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
│   └── ticket_router.py     # Auto ticket creation logic
├── /dashboard
│   ├── index.html           # React landing page shell
│   └── app.jsx              # Dspatch landing page app
├── /onboarding
│   └── business_setup.py    # SMB knowledge base ingestion
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

### 1. Clone the repo

```bash
git clone https://github.com/Kobby-Adjei/dspatch.git
cd dspatch
```

### 2. Set up environment variables

```bash
cp .env.example .env
# Fill in your API keys in .env
```

### 3. Start with Docker Compose

```bash
docker compose up
```

This starts:
- PostgreSQL + pgvector on port `5432`
- Dspatch voice agent on port `5000` (webhooks) and `8765` (WebSocket)
- Dspatch web app on port `3000`

### 4. Onboard your first business

```bash
python onboarding/business_setup.py
```

### 5. Configure Twilio webhook

Point your Twilio phone number's voice webhook to:
```
https://your-server.com/voice
```

---

## How It Works

1. Customer calls your Twilio number
2. Audio streams via WebSocket to the Dspatch agent
3. **Gemini Live** transcribes speech in real time
4. **IBM watsonx.ai** queries your business knowledge base (pgvector)
5. AI generates a natural response, Gemini speaks it back
6. A ticket is auto-created and saved to the dashboard
7. The business sees tickets, customer context, urgency, and follow-up in the dashboard
8. A Dspatch-trained operator can monitor the system and catch what AI misses

See [docs/dspatch_overview.md](docs/dspatch_overview.md) for the team-facing product overview.

See [docs/architecture.md](docs/architecture.md) for the full system diagram.

For team execution, see [docs/team_sprints.md](docs/team_sprints.md). It breaks backend work across database/ticketing, business onboarding, Twilio webhooks, AI integration, and the end-to-end demo path.

---

## Built For

[![HackMichigan 2026](https://img.shields.io/badge/HackMichigan-2026-blue?style=for-the-badge)](https://hackmichigan.com)

Built at **HackMichigan 2026** in Detroit, MI. Dspatch is designed to give Michigan SMBs — HVAC companies, auto shops, plumbers, electricians, restaurants, salons, and startups — the same AI-powered customer support experience enterprise companies have, at a fraction of the cost.

It also creates a path for recent graduates to turn AI skills into real income by managing AI-powered support systems for local businesses.

---

## License

MIT — see [LICENSE](LICENSE) for details.
