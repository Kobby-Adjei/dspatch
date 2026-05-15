# agent/gemini.py
# Google Gemini Live voice layer

import os
import asyncio
import google.generativeai as genai

class GeminiLiveService:
    """Google Gemini Live API integration for real-time voice."""

    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        genai.configure(api_key=self.api_key)
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-live")

    async def stream_audio(self, audio_input: bytes) -> bytes:
        """Stream audio through Gemini Live API and return audio response."""
        model = genai.GenerativeModel(self.model_name)
        # Real-time streaming session
        async with model.connect() as session:
            await session.send(audio_input, end_of_turn=True)
            response_audio = b""
            async for response in session.receive():
                if response.data:
                    response_audio += response.data
            return response_audio

    async def text_to_speech(self, text: str) -> bytes:
        """Convert text to speech using Gemini."""
        model = genai.GenerativeModel(self.model_name)
        response = await model.generate_content_async(text)
        return response.audio if hasattr(response, 'audio') else b""
