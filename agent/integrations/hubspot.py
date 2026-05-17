import os
import urllib.parse
import requests

HUBSPOT_CLIENT_ID     = os.getenv("HUBSPOT_CLIENT_ID", "")
HUBSPOT_CLIENT_SECRET = os.getenv("HUBSPOT_CLIENT_SECRET", "")
FLASK_PUBLIC_URL      = os.getenv("FLASK_PUBLIC_URL", "")

REDIRECT_URI = f"{FLASK_PUBLIC_URL}/integrations/hubspot/callback"
SCOPES       = "crm.objects.contacts.read crm.objects.companies.read tickets"
AUTH_BASE    = "https://app.hubspot.com/oauth/authorize"
TOKEN_URL    = "https://api.hubapi.com/oauth/v1/token"


def get_auth_url(state: str) -> str:
    params = {
        "client_id":    HUBSPOT_CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "scope":        SCOPES,
        "state":        state,
    }
    return f"{AUTH_BASE}?{urllib.parse.urlencode(params)}"


def exchange_code(code: str) -> dict:
    resp = requests.post(TOKEN_URL, data={
        "grant_type":    "authorization_code",
        "client_id":     HUBSPOT_CLIENT_ID,
        "client_secret": HUBSPOT_CLIENT_SECRET,
        "redirect_uri":  REDIRECT_URI,
        "code":          code,
    }, timeout=15)
    resp.raise_for_status()
    return resp.json()


def refresh_access_token(refresh_token: str) -> dict:
    resp = requests.post(TOKEN_URL, data={
        "grant_type":    "refresh_token",
        "client_id":     HUBSPOT_CLIENT_ID,
        "client_secret": HUBSPOT_CLIENT_SECRET,
        "redirect_uri":  REDIRECT_URI,
        "refresh_token": refresh_token,
    }, timeout=15)
    resp.raise_for_status()
    return resp.json()


def get_portal_info(access_token: str) -> dict:
    resp = requests.get(
        "https://api.hubapi.com/oauth/v1/access-tokens/" + access_token,
        timeout=10,
    )
    return resp.json() if resp.ok else {}


def lookup_contact(access_token: str, phone: str) -> dict | None:
    """Search HubSpot contacts by phone number (tries multiple formats)."""
    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
    digits  = "".join(c for c in phone if c.isdigit())
    candidates = list({phone, digits, f"+{digits}"})

    for value in candidates:
        resp = requests.post(
            "https://api.hubapi.com/crm/v3/objects/contacts/search",
            headers = headers,
            json    = {
                "filterGroups": [{"filters": [{
                    "propertyName": "phone",
                    "operator":     "EQ",
                    "value":        value,
                }]}],
                "properties": [
                    "firstname", "lastname", "company", "email",
                    "hs_lead_status", "lifecyclestage", "notes_last_updated",
                ],
                "limit": 1,
            },
            timeout = 10,
        )
        if resp.ok:
            results = resp.json().get("results", [])
            if results:
                return results[0]
    return None
