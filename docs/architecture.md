# DSPatch System Architecture

## Overview

DSPatch is an AI-powered business operating system designed for Michigan small and medium-sized businesses (SMBs). It provides an intelligent voice agent that handles inbound calls, creates support tickets automatically, and communicates with customers — freeing business owners to focus on their craft.

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
              [ Owner Dashboard ]
              (React + API)
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

### 5. Owner Dashboard
- **React SPA**: Real-time view of tickets, calls, and customer history
- **index.html + app.jsx**: Lightweight, no build-step dashboard
- Connects to Flask API backend

---

## Data Flow

1. Customer calls Twilio number
2. Twilio streams audio via WebSocket to DSPatch server
3. Gemini Live transcribes speech in real-time
4. Watsonx.ai queries pgvector knowledge base for business context
5. AI generates a response, Gemini synthesizes speech
6. Audio response streamed back to customer
7. Ticket automatically created and saved to PostgreSQL
8. Business owner sees ticket in dashboard

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
