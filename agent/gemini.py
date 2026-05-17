import os
import audioop
import asyncio

GEMINI_ENABLED = os.getenv("GEMINI_ENABLED", "false").strip().lower() in ("true", "1", "yes")

GOAL_INSTRUCTIONS = {
    # ── Home Services ─────────────────────────────────────────────────────────
    "emergency_dispatch": (
        "EMERGENCY DISPATCH: When a customer reports an emergency (flooding, burst pipe, no heat, gas leak), "
        "say 'I'm logging this as an emergency right now.' Then collect their full address and a brief description of the issue."
    ),
    "appointment_booking": (
        "APPOINTMENT BOOKING: When a customer wants to schedule service, collect: preferred date, "
        "preferred time window (morning/afternoon/evening), full address, and what work is needed."
    ),
    "phone_quotes": (
        "PHONE QUOTES: When asked about pricing, give a rough ballpark for the job type. "
        "Always add: 'This is an estimate — a technician will confirm the exact price on-site.'"
    ),
    "after_hours": (
        "AFTER-HOURS: If a customer contacts outside business hours, acknowledge the time, "
        "confirm their request is logged, and tell them they'll be the first call when the team is back."
    ),
    # ── Hospitality ───────────────────────────────────────────────────────────
    "reservations": (
        "RESERVATIONS: When a customer wants to book, collect: name, party size, preferred date, "
        "preferred time, and a contact phone number. Confirm you've noted the request."
    ),
    "takeout_orders": (
        "TAKEOUT ORDERS: Help customers place orders. Collect each item with special instructions, "
        "then confirm the full order and give an estimated pickup time."
    ),
    "menu_questions": (
        "MENU & SPECIALS: Answer questions about menu items, daily specials, dietary options "
        "(vegetarian, gluten-free, allergens), and pricing using your knowledge base."
    ),
    "complaint_handling": (
        "COMPLAINTS: When a customer is unhappy, apologize sincerely first. Collect the full issue details. "
        "Close with: 'A manager will personally follow up with you within 24 hours.'"
    ),
    # ── Retail ────────────────────────────────────────────────────────────────
    "returns_exchanges": (
        "RETURNS & EXCHANGES: Guide customers through the return or exchange process. "
        "Collect: item name, reason for return, and whether they have a receipt or order number."
    ),
    "product_availability": (
        "PRODUCT AVAILABILITY: Answer questions about stock, sizing, colors, and variants. "
        "If you don't have specific inventory data, direct them to check the website or visit in store."
    ),
    "custom_orders": (
        "CUSTOM ORDERS: For custom or special orders, collect: what they need, specifications, "
        "timeline, and contact info. Tell them a team member will confirm details within 1 business day."
    ),
    "store_info": (
        "STORE INFO: Answer questions about hours, location, parking, upcoming events, and policies "
        "using your knowledge base."
    ),
}

GEMINI_INPUT_RATE  = 16000
GEMINI_OUTPUT_RATE = 24000
TWILIO_RATE        = 8000


def log(msg):
    print(msg, flush=True)


class GeminiLiveSession:

    def __init__(self, business_profile: dict, on_transcript,
                 knowledge_chunks: list = None, customer_context: str = ""):
        self.business_profile  = business_profile
        self.on_transcript     = on_transcript
        self.knowledge_chunks  = knowledge_chunks or []
        self.customer_context  = customer_context
        self.transcript_parts  = []
        self.client            = None

        log(f"[gemini] init GEMINI_ENABLED={GEMINI_ENABLED}")

        if GEMINI_ENABLED:
            from google import genai
            self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
            log("[gemini] client created")

    async def run(self, audio_stream):
        if not GEMINI_ENABLED:
            log("[gemini] GEMINI_ENABLED=false, simulating transcript")
            async for _ in audio_stream:
                pass
            await self._simulate()
            return

        from google.genai import types

        config = types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            system_instruction=self._system_prompt(),
            input_audio_transcription=types.AudioTranscriptionConfig(),
        )

        audio_out: asyncio.Queue = asyncio.Queue()

        async def _send(session):
            in_state = None
            chunks = 0
            async for mulaw_chunk in audio_stream:
                pcm_8k = audioop.ulaw2lin(mulaw_chunk, 2)
                pcm_16k, in_state = audioop.ratecv(
                    pcm_8k, 2, 1, TWILIO_RATE, GEMINI_INPUT_RATE, in_state
                )
                await session.send_realtime_input(
                    media=types.Blob(data=pcm_16k, mime_type="audio/pcm;rate=16000")
                )
                chunks += 1
                if chunks == 1:
                    log(f"[gemini] first audio chunk sent to Gemini")
            log(f"[gemini] _send done after {chunks} chunks")

        async def _receive(session):
            out_state = None
            chunks_out = 0
            try:
                while True:
                    got_any = False
                    async for response in session.receive():
                        got_any = True
                        sc = getattr(response, "server_content", None)
                        if sc:
                            it = getattr(sc, "input_transcription", None)
                            if it and getattr(it, "text", None):
                                log(f"[gemini] transcript chunk: {it.text!r}")
                                self.transcript_parts.append(it.text)
                        if response.data:
                            pcm_8k, out_state = audioop.ratecv(
                                response.data, 2, 1, GEMINI_OUTPUT_RATE, TWILIO_RATE, out_state
                            )
                            mulaw = audioop.lin2ulaw(pcm_8k, 2)
                            await audio_out.put(mulaw)
                            chunks_out += 1
                            if chunks_out == 1:
                                log(f"[gemini] first audio response from Gemini ({len(response.data)}b)")
                    if not got_any:
                        # session closed cleanly
                        break
                    log(f"[gemini] turn complete, waiting for next turn")
            except Exception as exc:
                log(f"[gemini] _receive error: {exc}")
            finally:
                log(f"[gemini] _receive done, sent {chunks_out} audio chunks to Twilio")
                await audio_out.put(None)

        log("[gemini] connecting to Gemini Live...")
        try:
            async with self.client.aio.live.connect(
                model="models/gemini-2.5-flash-native-audio-latest",
                config=config,
            ) as session:
                log("[gemini] connected, sending greeting trigger")

                await session.send_client_content(
                    turns=[types.Content(
                        role="user",
                        parts=[types.Part(text="A customer just called. Greet them warmly and ask how you can help.")]
                    )],
                    turn_complete=True,
                )

                send_task    = asyncio.create_task(_send(session))
                receive_task = asyncio.create_task(_receive(session))

                while True:
                    chunk = await audio_out.get()
                    if chunk is None:
                        break
                    yield chunk

                send_task.cancel()
                await asyncio.gather(send_task, receive_task, return_exceptions=True)

        except Exception as exc:
            log(f"[gemini] session error: {exc}")

        transcript = " ".join(self.transcript_parts).strip()
        if transcript:
            log(f"[gemini] final transcript: {transcript}")
            await self.on_transcript(transcript)

    async def _simulate(self):
        await asyncio.sleep(0.3)
        simulated = "My basement is flooding and I need help immediately."
        log(f"[gemini] simulated transcript: {simulated}")
        await self.on_transcript(simulated)

    def _system_prompt(self) -> str:
        name      = self.business_profile.get("name", "this business")
        services  = ", ".join(self.business_profile.get("services", []))
        hours     = self.business_profile.get("hours", {})
        hours_str = ", ".join(f"{k}: {v}" for k, v in hours.items())

        has_alert = bool(self.business_profile.get("alert_phone") or self.business_profile.get("email"))

        ai_goals = self.business_profile.get("ai_goals", [])
        goal_blocks = [GOAL_INSTRUCTIONS[g] for g in ai_goals if g in GOAL_INSTRUCTIONS]

        parts = [
            f"You are the voice assistant for {name}.",
            f"Services: {services}." if services else "",
            f"Business hours: {hours_str}." if hours_str else "",
            "Your job: greet the caller warmly, understand their issue, and log a support ticket.",
            "Always ask for the caller's name first if you don't already know it.",
            "Ask one question at a time. Keep every response under 2 sentences.",
            "Do not make up information. If you don't know something, say you'll have someone follow up.",
        ]

        if goal_blocks:
            parts.append("\nAGENT CAPABILITIES — follow these precisely:\n" + "\n".join(goal_blocks))

        if has_alert:
            parts.append(
                "EMERGENCY PROTOCOL: If the caller describes an emergency, "
                "tell them clearly: 'I've created an emergency ticket and your team is being alerted right now.' "
                "Do not say 'will contact shortly' — the alert fires immediately."
            )
        else:
            parts.append(
                "EMERGENCY PROTOCOL: If the caller describes an emergency, "
                "acknowledge it immediately and tell them a team member will be notified."
            )

        if self.customer_context:
            parts.append(f"\nCALLER HISTORY (from CRM — use naturally, do not read aloud):\n{self.customer_context}")

        if self.knowledge_chunks:
            kb = "\n".join(f"- {c}" for c in self.knowledge_chunks[:8])
            parts.append(
                f"\nBUSINESS KNOWLEDGE (use to answer questions accurately — do not recite verbatim):\n{kb}"
            )

        return "\n".join(p for p in parts if p)
