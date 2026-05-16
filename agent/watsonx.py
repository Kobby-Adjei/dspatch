import os

WATSONX_ENABLED = os.getenv("WATSONX_ENABLED", "false").strip().lower() in ("true", "1", "yes")

# ── Urgency classification ──────────────────────────────────────────────────

SENTIMENT_WORDS = [
    "frustrated", "unacceptable", "furious", "angry",
    "ridiculous", "terrible", "awful", "outraged",
]

QUESTION_WORDS = ["hours", "price", "cost", "available", "when", "do you", "can you"]


def classify_urgency(message: str, routing_rules: dict) -> str:
    """
    Returns: 'emergency', 'urgent', 'high', 'medium', or 'low'
    """
    text = message.lower()

    emergency_keywords = routing_rules.get("emergency_keywords", [])
    urgent_keywords    = routing_rules.get("urgent_keywords", [])

    emergency_keywords = [kw.lower() for kw in emergency_keywords if kw.strip()]
    urgent_keywords    = [kw.lower() for kw in urgent_keywords if kw.strip()]

    if any(kw in text for kw in emergency_keywords):
        print(f"[urgency] emergency keyword detected in: '{message}'")
        return "emergency"

    if any(kw in text for kw in urgent_keywords):
        print(f"[urgency] urgent keyword detected in: '{message}'")
        return "urgent"

    if any(word in text for word in SENTIMENT_WORDS):
        print(f"[urgency] negative sentiment detected in: '{message}'")
        return "high"

    if "?" in message or any(w in text for w in QUESTION_WORDS):
        return "low"

    return "medium"


# ── Ticket type classification ──────────────────────────────────────────────

TICKET_TYPES = {
    "home_services": [
        ("Emergency Service",   ["flood", "flooding", "burst", "gas leak", "no heat", "no hot water", "emergency"]),
        ("Status Update",       ["status", "update", "my ticket", "my request", "still waiting", "waiting", "where is", "heard back"]),
        ("Appointment Request", ["appointment", "schedule", "book", "come out", "send someone", "visit", "technician"]),
        ("Quote Request",       ["quote", "estimate", "how much", "cost", "price", "what do you charge", "hours", "open"]),
    ],
    "hospitality": [
        ("Complaint",           ["complaint", "wrong order", "cold", "bad", "terrible", "refund", "unhappy", "disgusting", "unacceptable"]),
        ("Reservation",         ["reservation", "reserve", "table", "book", "party of", "seats"]),
        ("Catering Inquiry",    ["catering", "event", "corporate", "large order", "bulk"]),
        ("Food Order",          ["order", "delivery", "pickup", "i want", "can i get", "menu"]),
    ],
    "retail": [
        ("Complaint",           ["complaint", "wrong", "damaged", "broken", "missing", "bad"]),
        ("Return Request",      ["return", "refund", "exchange", "bring back", "doesn't fit", "wrong item"]),
        ("Product Inquiry",     ["available", "stock", "carry", "sell", "price", "how much", "do you have", "do you carry", "in stock"]),
        ("Order Request",       ["order", "buy", "purchase", "i want"]),
    ],
}


def classify_ticket_type(message: str, industry: str) -> str:
    """
    Returns the operational ticket type for the given industry.
    """
    text  = message.lower()
    types = TICKET_TYPES.get(industry, TICKET_TYPES["home_services"])

    for ticket_type, keywords in types:
        if any(kw in text for kw in keywords):
            print(f"[ai] ticket_type matched: {ticket_type}")
            return ticket_type

    default = types[1][0]
    print(f"[ai] no ticket_type match, defaulting to: {default}")
    return default


# ── Prompt builder ──────────────────────────────────────────────────────────

def build_support_prompt(
    business_profile: dict,
    customer_message: str,
    context_chunks: list,
    urgency: str = "medium",
) -> str:
    name    = business_profile.get("name", "this business")
    context = "\n".join(f"- {chunk}" for chunk in context_chunks)

    urgency_instruction = {
        "emergency": "This is an EMERGENCY. Acknowledge it immediately. Tell them a team member will contact them shortly.",
        "urgent":    "This is URGENT. Prioritize a fast response and offer to escalate.",
        "high":      "The customer is frustrated. Acknowledge their frustration before answering.",
        "medium":    "Handle this as a standard request.",
        "low":       "This is a general inquiry. Answer directly and briefly.",
    }.get(urgency, "Handle this as a standard request.")

    return f"""You are the AI assistant for {name}.
Your job is to help customers and collect information to create an operational record.

Business context:
{context}

Customer message: "{customer_message}"
Urgency level: {urgency.upper()}

Instructions:
- {urgency_instruction}
- Answer using only the business context above.
- If you need more information (address, name, preferred time), ask for one thing at a time.
- Never make up pricing, hours, or services not listed above.
- Keep responses under 3 sentences.
- End every response with a next step.

Response:"""


# ── Fallback responder ──────────────────────────────────────────────────────

def _fallback_response(business_profile: dict, message: str, urgency: str) -> str:
    name      = business_profile.get("name", "us")
    hours     = business_profile.get("hours", {})
    hours_str = ", ".join(f"{k}: {v}" for k, v in hours.items()) if hours else "regular business hours"
    text      = message.lower()

    if urgency == "emergency":
        return (
            f"We've received your emergency request at {name}. "
            f"A team member will contact you shortly. "
            f"Please stay safe."
        )

    if urgency == "urgent":
        return (
            f"Thanks for contacting {name}. "
            f"We've noted your urgent request and will follow up as soon as possible."
        )

    if urgency == "high":
        return (
            f"We hear you and we're sorry for the frustration. "
            f"Someone from {name} will personally follow up with you today."
        )

    if any(w in text for w in ["hours", "open", "close", "when"]):
        return f"{name} is open {hours_str}. How can we help you today?"

    return (
        f"Thanks for reaching out to {name}. "
        f"We've received your message and will follow up during business hours."
    )


# ── Real watsonx call ───────────────────────────────────────────────────────

def _call_watsonx(prompt: str) -> str:
    from ibm_watsonx_ai import APIClient, Credentials
    from ibm_watsonx_ai.foundation_models import ModelInference

    credentials = Credentials(
        url     = os.getenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com"),
        api_key = os.getenv("WATSONX_API_KEY"),
    )
    client = APIClient(credentials)
    model  = ModelInference(
        model_id   = os.getenv("WATSONX_MODEL_ID", "ibm/granite-13b-chat-v2"),
        api_client = client,
        project_id = os.getenv("WATSONX_PROJECT_ID"),
    )
    return model.generate_text(prompt=prompt)


# ── Main entry point ────────────────────────────────────────────────────────

def generate_response(
    business_profile: dict,
    customer_message: str,
    context_chunks: list,
    urgency: str,
) -> str:
    if not WATSONX_ENABLED:
        print("[ai] WATSONX_ENABLED=false, using fallback responder")
        return _fallback_response(business_profile, customer_message, urgency)

    prompt = build_support_prompt(business_profile, customer_message, context_chunks, urgency)
    print("[ai] calling watsonx...")
    try:
        return _call_watsonx(prompt)
    except Exception as exc:
        print(f"[ai] watsonx call failed: {exc}, falling back to local responder")
        return _fallback_response(business_profile, customer_message, urgency)


# ── Quick test ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    routing_rules = {
        "emergency_keywords": ["flood", "flooding", "burst pipe", "no heat", "gas leak"],
        "urgent_keywords":    ["broken", "not working", "leaking", "backed up"],
    }

    tests = [
        ("My basement is flooding.", "home_services"),
        ("My furnace is not working.", "home_services"),
        ("This is ridiculous I've been waiting 3 days.", "home_services"),
        ("What are your hours?", "home_services"),
        ("I want to book a table for 4 Saturday night.", "hospitality"),
        ("Do you have this jacket in size M?", "retail"),
    ]

    print("── urgency + ticket_type tests ──")
    for msg, industry in tests:
        urgency     = classify_urgency(msg, routing_rules)
        ticket_type = classify_ticket_type(msg, industry)
        print(f"  '{msg}'")
        print(f"  → urgency={urgency}, ticket_type={ticket_type}\n")

    print("── fallback response test ──")
    profile = {
        "name":    "Detroit Plumbing Co.",
        "industry": "home_services",
        "hours":   {"mon-fri": "8am-6pm", "sat": "9am-3pm", "sun": "closed"},
    }
    print(generate_response(profile, "My basement is flooding.", [], "emergency"))
