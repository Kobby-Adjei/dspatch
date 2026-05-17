TICKET_TYPES_BY_INDUSTRY = {
    "home_services": {"Emergency Service", "Appointment Request", "Quote Request", "Status Update"},
    "hospitality": {"Reservation", "Food Order", "Complaint", "Catering Inquiry"},
    "retail": {"Product Inquiry", "Order Request", "Return Request", "Complaint"},
}

VALID_CHANNELS = {"api", "sms", "voice"}
VALID_URGENCIES = {"emergency", "urgent", "high", "medium", "low"}
VALID_PRIORITIES = {"high", "medium", "low"}
VALID_STATUSES = {"open", "in_progress", "resolved"}
FILTER_FIELDS = {"status", "priority", "urgency", "ticket_type", "date_from"}

URGENCY_TO_PRIORITY = {
    "emergency": "high",
    "urgent": "high",
    "high": "high",
    "medium": "medium",
    "low": "low",
}

SUGGESTED_ACTIONS = {
    "emergency": "Immediate callback",
    "urgent": "Call back within 1 hour",
    "high": "Call back today",
    "medium": "Follow up within 24 hours",
    "low": "Respond during business hours",
}
