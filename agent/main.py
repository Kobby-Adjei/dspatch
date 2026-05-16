import os
import sys
import json
import base64
import asyncio
import http
import websockets


def log(msg):
    print(msg, flush=True)

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent.gemini import GeminiLiveSession
from agent.watsonx import classify_urgency, classify_ticket_type
from ticketing.ticket_router import TicketRouter

WEBSOCKET_PORT  = int(os.getenv("WEBSOCKET_PORT", "8765"))
DEMO_BUSINESS_ID = os.getenv("DEMO_BUSINESS_ID", "detroit-plumbing-co")

ticket_router = TicketRouter()


def _load_business_profile(to_phone: str = "") -> dict:
    from onboarding.business_store import find_by_phone, find_by_id

    if to_phone:
        profile = find_by_phone(to_phone)
        if profile:
            return profile
        log(f"[voice] no business found for {to_phone}, falling back to demo")

    profile = find_by_id(DEMO_BUSINESS_ID)
    if profile:
        return profile

    return {
        "id":       DEMO_BUSINESS_ID,
        "name":     "Detroit Plumbing Co.",
        "industry": "home_services",
        "services": ["emergency plumbing", "drain cleaning", "water heater repair", "pipe repair"],
        "hours":    {"mon-fri": "8am-6pm", "sat": "9am-3pm", "sun": "closed"},
        "routing_rules": {
            "emergency_keywords": ["flood", "flooding", "burst pipe", "no heat", "gas leak"],
            "urgent_keywords":    ["broken", "not working", "leaking", "backed up"],
        },
    }


async def transcript_to_record(transcript: str, business_profile: dict, customer_phone: str) -> None:
    urgency     = classify_urgency(transcript, business_profile.get("routing_rules", {}))
    ticket_type = classify_ticket_type(transcript, business_profile.get("industry", "home_services"))

    print(f"[voice] transcript → urgency={urgency} type={ticket_type}")

    try:
        ticket = ticket_router.create_ticket(
            business_id    = business_profile["id"],
            customer_phone = customer_phone,
            issue_summary  = transcript,
            ticket_type    = ticket_type,
            urgency        = urgency,
            raw_message    = transcript,
            channel        = "voice",
        )
        print(f"[ticket] voice ticket created: {ticket.id}")
    except Exception as exc:
        print(f"[ticket] failed to create voice ticket: {exc}")


async def handle_call(websocket) -> None:
    """
    Handles one Twilio MediaStream WebSocket connection.

    Twilio sends JSON events:
      {"event": "start",  "start":  {"callSid": "...", "streamSid": "..."}}
      {"event": "media",  "media":  {"payload": "<base64 mulaw>"}}
      {"event": "stop",   "stop":   {}}
    """
    call_sid       = ""
    stream_sid     = ""
    customer_phone = ""
    to_phone       = ""
    business_profile = {}

    audio_queue: asyncio.Queue = asyncio.Queue()

    async def twilio_audio_stream():
        while True:
            chunk = await audio_queue.get()
            if chunk is None:
                return
            yield chunk

    async def on_transcript(text: str) -> None:
        await transcript_to_record(text, business_profile, customer_phone)

    session      = GeminiLiveSession(business_profile, on_transcript)
    gemini_task  = None

    async def run_gemini():
        async for audio_out in session.run(twilio_audio_stream()):
            payload = base64.b64encode(audio_out).decode("utf-8")
            msg = json.dumps({
                "event":     "media",
                "streamSid": stream_sid,
                "media":     {"payload": payload},
            })
            try:
                await websocket.send(msg)
            except websockets.exceptions.ConnectionClosed:
                break

    try:
        async for raw in websocket:
            try:
                event = json.loads(raw)
            except json.JSONDecodeError:
                continue

            kind = event.get("event")

            if kind == "start":
                start_data     = event.get("start", {})
                call_sid       = start_data.get("callSid", "")
                stream_sid     = start_data.get("streamSid", "")
                params         = start_data.get("customParameters", {})
                customer_phone = params.get("from_phone", "unknown")
                to_phone       = params.get("to_phone", "")
                business_profile = _load_business_profile(to_phone)
                log(f"[voice] call started sid={call_sid} business={business_profile.get('id')}")
                gemini_task = asyncio.create_task(run_gemini())

            elif kind == "media":
                payload = event.get("media", {}).get("payload", "")
                if payload:
                    audio_bytes = base64.b64decode(payload)
                    await audio_queue.put(audio_bytes)

            elif kind == "stop":
                log(f"[voice] call stopped sid={call_sid}")
                await audio_queue.put(None)
                break

    except websockets.exceptions.ConnectionClosed:
        log(f"[voice] connection closed sid={call_sid}")
        await audio_queue.put(None)

    if gemini_task:
        try:
            await asyncio.wait_for(asyncio.shield(gemini_task), timeout=10)
        except asyncio.TimeoutError:
            gemini_task.cancel()
            await asyncio.gather(gemini_task, return_exceptions=True)


async def _health_check(connection, request):
    if request.path == "/health":
        return connection.respond(http.HTTPStatus.OK, "ok\n")


async def main():
    log(f"[main] DSPatch voice WebSocket server starting on port {WEBSOCKET_PORT}")
    async with websockets.serve(handle_call, "0.0.0.0", WEBSOCKET_PORT,
                                process_request=_health_check):
        log(f"[main] listening on ws://0.0.0.0:{WEBSOCKET_PORT}")
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
