import os

try:
    from ibm_watsonx_ai import APIClient, Credentials
    from ibm_watsonx_ai.foundation_models import ModelInference
except ImportError:
    APIClient = None
    Credentials = None
    ModelInference = None


def watsonx_enabled() -> bool:
    return os.getenv("WATSONX_ENABLED", "false").lower() == "true"

class WatsonxLLMService:
    """IBM watsonx.ai LLM service for DSPatch."""

    def __init__(self):
        if not watsonx_enabled():
            raise RuntimeError("WATSONX_ENABLED=false")
        if APIClient is None or Credentials is None or ModelInference is None:
            raise RuntimeError("ibm_watsonx_ai is required when WATSONX_ENABLED=true")

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


def build_support_prompt(
    business_profile: dict,
    customer_message: str,
    context_chunks: list[str],
) -> str:
    name = business_profile.get("name", "this business")
    context = "\n".join(f"- {chunk}" for chunk in context_chunks) or "- No additional context provided."

    return f"""You are the AI assistant for {name}.
Your job is to help customers and collect information to create an operational record.

Business context:
{context}

Customer message: "{customer_message}"

Instructions:
- Answer directly using only the business context above.
- If this is an emergency, acknowledge it immediately and say a team member will contact them shortly.
- If you need more information, ask for one thing at a time.
- Never make up pricing, hours, or services not listed above.
- Keep responses under 3 sentences.
- End every response with a next step.

Response:"""


def generate_response(
    business_profile: dict,
    customer_message: str,
    context_chunks: list[str] | None = None,
    urgency: str = "medium",
) -> str:
    """Team 1 responder interface used by SMS/voice handlers."""
    context_chunks = context_chunks or []

    if not watsonx_enabled():
        print("[ai] WATSONX_ENABLED=false, using fallback responder")
        return _fallback_response(business_profile, customer_message, urgency)

    prompt = build_support_prompt(business_profile, customer_message, context_chunks)
    try:
        service = WatsonxLLMService()
        response = service.model.generate_text(prompt=prompt)
        return response.strip() if isinstance(response, str) else str(response)
    except Exception as exc:
        print(f"[ai] watsonx response failed, using fallback responder: {exc}")
        return _fallback_response(business_profile, customer_message, urgency)


def _fallback_response(business_profile: dict, message: str, urgency: str) -> str:
    name = business_profile.get("name", "the business")
    hours = business_profile.get("hours", {})
    hours_str = ", ".join(f"{day}: {value}" for day, value in hours.items())
    text = message.lower()

    if urgency == "emergency":
        return (
            f"Your emergency request has been received by {name}. "
            "A team member will contact you shortly. Please stay safe."
        )

    if urgency in {"urgent", "high"}:
        return (
            f"Thanks for contacting {name}. "
            "We've marked this as a priority request and will follow up as soon as possible."
        )

    if any(word in text for word in ("hours", "open", "closed", "close")) and hours_str:
        return f"{name} is open: {hours_str}. What would you like help with next?"

    return (
        f"Thanks for contacting {name}. "
        "We've received your message and will follow up during business hours."
    )
