# agent/main.py
# Pipecat voice agent entry point

import asyncio
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineTask
from watsonx import WatsonxLLMService
from gemini import GeminiLiveService
from twilio_handler import TwilioWebhookHandler

async def main():
    """Main entry point for the DSPatch voice agent."""
    print("Starting DSPatch Voice Agent...")

    # Initialize services
    llm = WatsonxLLMService()
    voice = GeminiLiveService()
    twilio = TwilioWebhookHandler()

    # Build pipeline
    pipeline = Pipeline([
        twilio,
        llm,
        voice,
    ])

    runner = PipelineRunner()
    task = PipelineTask(pipeline)
    await runner.run(task)

if __name__ == "__main__":
    asyncio.run(main())
