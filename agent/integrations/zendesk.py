import requests
import re
from base64 import b64encode


SUBDOMAIN_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$")


def validate_subdomain(subdomain: str) -> str:
    subdomain = subdomain.strip().lower()
    if not SUBDOMAIN_RE.fullmatch(subdomain):
        raise ValueError("Zendesk subdomain must contain only letters, numbers, and hyphens")
    return subdomain


def _headers(admin_email: str, api_key: str) -> dict:
    token = b64encode(f"{admin_email}/token:{api_key}".encode()).decode()
    return {"Authorization": f"Basic {token}"}


def test_connection(subdomain: str, admin_email: str, api_key: str) -> bool:
    """Verify the credentials are valid."""
    subdomain = validate_subdomain(subdomain)
    resp = requests.get(
        f"https://{subdomain}.zendesk.com/api/v2/users/me.json",
        headers = _headers(admin_email, api_key),
        timeout = 10,
    )
    return resp.ok


def lookup_user(subdomain: str, api_key: str, admin_email: str, phone: str) -> dict | None:
    """Find a Zendesk user by phone number and count their open tickets."""
    subdomain = validate_subdomain(subdomain)
    hdrs = _headers(admin_email, api_key)
    base = f"https://{subdomain}.zendesk.com/api/v2"

    resp = requests.get(
        f"{base}/search.json",
        params  = {"query": f"type:user phone:{phone}"},
        headers = hdrs,
        timeout = 10,
    )
    if not resp.ok:
        return None

    results = resp.json().get("results", [])
    if not results:
        return None

    user    = results[0]
    user_id = user["id"]

    ticket_resp = requests.get(
        f"{base}/search.json",
        params  = {"query": f"type:ticket requester_id:{user_id} status:open"},
        headers = hdrs,
        timeout = 10,
    )
    open_tickets = ticket_resp.json().get("count", 0) if ticket_resp.ok else 0

    return {
        "name":         user.get("name", ""),
        "email":        user.get("email", ""),
        "open_tickets": open_tickets,
    }
