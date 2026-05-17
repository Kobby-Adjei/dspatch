# Dspatch System Architecture

## Overview

Dspatch is a two-sided AI support platform for small businesses, startups, and recent graduates. Businesses get an AI-powered support system that answers calls and messages, creates and routes tickets, and responds with business context. Recent graduates become Dspatch operators who monitor the system, catch what AI misses, and improve each business's support knowledge over time.

---

## High-Level Architecture

```
                    CUSTOMER
                       |
                  Phone Call / SMS
                       |
                   [ TWILIO ]
                       |
              /voice or /sms webhook
                       |
              [ twilio_handler.py ]
                       |
            +----------+-----------+
            |                      |
     [ VOICE PIPELINE ]    [ SMS HANDLER ]
            |                      |
    [ Pipecat Pipeline ]   [ ticket_router.py ]
            |                      |
  +---------+---------+            |
  |                   |            |
[ Gemini Live ]  [ Watsonx LLM ]  |
  (Voice I/O)    (Reasoning/RAG)   |
                       |            |
              [ pgvector DB ] ------+
              (Knowledge Base)
                       |
              [ ticket_router.py ]
                       |
              [ Business Dashboard ]
              (React + API)
                       |
              [ Dspatch Operator ]
              (Human-in-the-loop review)
```

---

## Components

### 1. Voice Ingestion Layer
- **Twilio**: Receives inbound calls and SMS
- **WebSocket Stream**: Streams audio in real-time to Pipecat pipeline
- **twilio_handler.py**: Flask webhook server for Twilio events

### 2. AI Voice Pipeline (Pipecat)
- **Gemini Live**: Google's real-time audio model for natural voice I/O
- **IBM watsonx.ai**: Granite LLM for business-context reasoning and RAG
- **main.py**: Orchestrates the full pipeline with Pipecat

### 3. Knowledge Base (pgvector)
- Business profiles stored as vector embeddings
- Enables semantic search for accurate, context-aware responses
- Populated via `onboarding/business_setup.py`
- Embedding model: IBM Slate (slate-125m-english-rtrvr)

### 4. Ticketing System
- **ticket_router.py**: Auto-creates tickets from every interaction
- Priority classification based on keyword analysis
- Persisted to PostgreSQL with pgvector extension

### 5. Business Dashboard
- **React SPA**: View of tickets, calls, customer history, and support state
- **index.html + app.jsx**: Lightweight landing page/dashboard shell
- Connects to Flask API backend

### 6. Operator Layer
- **Dspatch-trained grads**: Review tickets, correct AI misses, improve FAQs, and tune routing rules
- **Human-in-the-loop workflow**: Keeps the system reliable for small teams that cannot hire full support staff

---

## Data Flow

1. Customer calls Twilio number
2. Twilio streams audio via WebSocket to DSPatch server
3. Gemini Live transcribes speech in real-time
4. Watsonx.ai queries pgvector knowledge base for business context
5. AI generates a response, Gemini synthesizes speech
6. Audio response streamed back to customer
7. Ticket automatically created and saved to PostgreSQL
8. Business sees ticket in dashboard
9. Dspatch operator can review, correct, or improve the system

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Voice I/O | Google Gemini Live |
| LLM / RAG | IBM watsonx.ai (Granite) |
| Pipeline | Pipecat |
| Telephony | Twilio |
| Vector DB | PostgreSQL + pgvector |
| Dashboard | React (JSX) |
| Backend | Python / Flask |
| Infra | Docker Compose |

---

## Deployment

See `docker-compose.yml` for local development setup.

Production deployment targets:
- **Agent**: Cloud Run or Railway
- **Database**: Supabase (PostgreSQL + pgvector)
- **Dashboard**: Vercel or Netlify

---

*Built for HackMichigan 2026 — Detroit, MI*
