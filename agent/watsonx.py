# agent/watsonx.py
# IBM watsonx.ai integration

import os
from ibm_watsonx_ai import APIClient, Credentials
from ibm_watsonx_ai.foundation_models import ModelInference

class WatsonxLLMService:
    """IBM watsonx.ai LLM service for DSPatch."""

    def __init__(self):
        self.api_key = os.getenv("WATSONX_API_KEY")
        self.project_id = os.getenv("WATSONX_PROJECT_ID")
        self.url = os.getenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com")
        self.model_id = os.getenv("WATSONX_MODEL_ID", "ibm/granite-13b-chat-v2")

        credentials = Credentials(url=self.url, api_key=self.api_key)
        self.client = APIClient(credentials)
        self.model = ModelInference(
            model_id=self.model_id,
            api_client=self.client,
            project_id=self.project_id,
        )

    async def generate(self, prompt: str) -> str:
        """Generate a response from watsonx.ai."""
        response = self.model.generate_text(prompt=prompt)
        return response
