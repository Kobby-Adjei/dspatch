# DSPatch

> **AI dispatch for Michigan small businesses**

[![HackMichigan 2026](https://img.shields.io/badge/HackMichigan-2026-blue?style=for-the-badge&logo=michigan)](https://hackmichigan.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-green?style=for-the-badge&logo=python)](https://python.org)
[![IBM watsonx](https://img.shields.io/badge/IBM-watsonx.ai-052FAD?style=for-the-badge&logo=ibm)](https://www.ibm.com/watsonx)
[![Google Gemini](https://img.shields.io/badge/Google-Gemini_Live-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev)

DSPatch is an AI-powered business operating system for Michigan small and medium-sized businesses (SMBs). It handles inbound calls using real-time voice AI, auto-generates support tickets, and keeps customers informed — so business owners can focus on what they do best.

---

## What It Does

- **Answers every call** — Gemini Live voice agent greets customers 24/7, even when you're busy
- **Knows your business** — IBM watsonx.ai + pgvector RAG answers questions about your hours, services, and pricing
- **Creates tickets automatically** — Every interaction becomes a prioritized support ticket
- **Keeps owners in the loop** — React dashboard with live ticket tracking and call history
- **Works over SMS too** — Twilio handles both voice and text

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Voice I/O | Google Gemini Live |
| LLM + RAG | IBM watsonx.ai (Granite) |
| Pipeline | Pipecat |
| Telephony | Twilio |
| Vector Database | PostgreSQL + pgvector |
| Dashboard | React (JSX) |
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
│   ├── index.html           # Owner dashboard
│   └── app.jsx              # React dashboard component
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
- DSPatch voice agent on port `5000` (webhooks) and `8765` (WebSocket)
- Owner dashboard on port `3000`

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
2. Audio streams via WebSocket to the DSPatch agent
3. **Gemini Live** transcribes speech in real time
4. **IBM watsonx.ai** queries your business knowledge base (pgvector)
5. AI generates a natural response, Gemini speaks it back
6. A ticket is auto-created and saved to the dashboard
7. You see everything in real time at `localhost:3000`

See [docs/architecture.md](docs/architecture.md) for the full system diagram.

---

## Built For

[![HackMichigan 2026](https://img.shields.io/badge/HackMichigan-2026-blue?style=for-the-badge)](https://hackmichigan.com)

Built at **HackMichigan 2026** in Detroit, MI. DSPatch is designed to give Michigan SMBs — plumbers, electricians, HVAC techs, salons, auto shops — the same AI-powered customer experience that enterprise companies have, at a fraction of the cost.

---

## License

MIT — see [LICENSE](LICENSE) for details.
