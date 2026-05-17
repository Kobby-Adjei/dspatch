import os
import threading
import requests

SENDGRID_API_KEY  = os.getenv("SENDGRID_API_KEY", "")
NOTIFY_FROM_EMAIL = os.getenv("NOTIFY_FROM_EMAIL", "alerts@dspatch.ai")


def send_emergency_alert(business_profile: dict, ticket) -> None:
    """Fire email + SMS to the business owner for emergency tickets. Non-blocking."""
    threading.Thread(target=_send, args=(business_profile, ticket), daemon=True).start()


def _send(business_profile: dict, ticket) -> None:
    alert_email = business_profile.get("email", "")
    alert_phone = business_profile.get("alert_phone", "")
    biz_name    = business_profile.get("name", "Your Business")
    biz_phone   = business_profile.get("phone", "")

    ticket_id = str(getattr(ticket, "id", "") or "").replace("-", "")[-6:].upper()
    customer  = getattr(ticket, "customer_phone", None) or "Unknown"
    summary   = (
        getattr(ticket, "issue_summary", None)
        or getattr(ticket, "raw_message", None)
        or "No details provided"
    )

    sms_body = (
        f"[DSPatch] EMERGENCY — {biz_name}\n"
        f"Ticket #{ticket_id} | Customer: {customer}\n"
        f"{summary[:160]}"
    )

    if alert_email and SENDGRID_API_KEY:
        _send_email(alert_email, biz_name, customer, summary, ticket_id)

    if alert_phone and biz_phone:
        _send_sms(biz_phone, alert_phone, sms_body)


def _send_email(to_email: str, biz_name: str, customer: str, summary: str, ticket_id: str) -> None:
    try:
        requests.post(
            "https://api.sendgrid.com/v3/mail/send",
            headers={
                "Authorization": f"Bearer {SENDGRID_API_KEY}",
                "Content-Type":  "application/json",
            },
            json={
                "personalizations": [{"to": [{"email": to_email}]}],
                "from":    {"email": NOTIFY_FROM_EMAIL, "name": "DSPatch Alerts"},
                "subject": f"EMERGENCY Ticket #{ticket_id} — {biz_name}",
                "content": [{
                    "type":  "text/plain",
                    "value": (
                        f"Emergency ticket received for {biz_name}.\n\n"
                        f"Ticket:   #{ticket_id}\n"
                        f"Customer: {customer}\n"
                        f"Issue:    {summary}\n\n"
                        f"Log in to your DSPatch dashboard to respond immediately."
                    ),
                }],
            },
            timeout=10,
        )
        print(f"[notify] emergency email sent to {to_email}")
    except Exception as exc:
        print(f"[notify] email failed: {exc}")


def _send_sms(from_phone: str, to_phone: str, message: str) -> None:
    try:
        account_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
        auth_token  = os.getenv("TWILIO_AUTH_TOKEN", "")
        if not (account_sid and auth_token):
            return
        from twilio.rest import Client
        Client(account_sid, auth_token).messages.create(
            body=message, from_=from_phone, to=to_phone
        )
        print(f"[notify] emergency SMS sent to {to_phone}")
    except Exception as exc:
        print(f"[notify] sms failed: {exc}")
