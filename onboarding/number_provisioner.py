import os
from twilio.rest import Client

FLASK_URL = os.getenv(
    "FLASK_PUBLIC_URL",
    "https://dspatch-flask.29wb2lul59qv.ca-tor.codeengine.appdomain.cloud",
)


def _client() -> Client:
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    api_key     = os.getenv("TWILIO_API_KEY")
    api_secret  = os.getenv("TWILIO_API_SECRET")
    auth_token  = os.getenv("TWILIO_AUTH_TOKEN")

    if api_key and api_secret:
        return Client(api_key, api_secret, account_sid)
    return Client(account_sid, auth_token)


def provision_number(business_id: str, area_code: str = None, country: str = "US") -> dict:
    """
    Searches for an available Twilio number, purchases it, and wires up
    the SMS and Voice webhooks to point at this DSPatch deployment.

    Returns:
        {
            "phone_number": "+13135550100",
            "sid":          "PN...",
            "sms_url":      "https://.../sms",
            "voice_url":    "https://.../voice",
        }
    """
    client = _client()

    sms_url   = f"{FLASK_URL}/sms"
    voice_url = f"{FLASK_URL}/voice"

    print(f"[provision] searching for number in area_code={area_code} country={country}")

    search_params = {"limit": 1, "sms_enabled": True, "voice_enabled": True}
    if area_code:
        search_params["area_code"] = area_code

    available = (
        client.available_phone_numbers(country)
        .local.list(**search_params)
    )

    if not available:
        raise RuntimeError(
            f"No available numbers found for area_code={area_code} country={country}"
        )

    phone_number = available[0].phone_number
    print(f"[provision] found number: {phone_number}")

    purchased = client.incoming_phone_numbers.create(
        phone_number  = phone_number,
        sms_url       = sms_url,
        sms_method    = "POST",
        voice_url     = voice_url,
        voice_method  = "POST",
        friendly_name = f"DSPatch — {business_id}",
    )

    print(f"[provision] purchased {purchased.phone_number} sid={purchased.sid}")
    print(f"[provision] SMS  webhook → {sms_url}")
    print(f"[provision] Voice webhook → {voice_url}")

    return {
        "phone_number": purchased.phone_number,
        "sid":          purchased.sid,
        "sms_url":      sms_url,
        "voice_url":    voice_url,
    }


def release_number(phone_number_sid: str) -> None:
    """Releases a provisioned number back to Twilio."""
    client = _client()
    client.incoming_phone_numbers(phone_number_sid).delete()
    print(f"[provision] released number sid={phone_number_sid}")


def update_webhooks(phone_number_sid: str) -> None:
    """Re-points an existing number's webhooks at the current deployment URL."""
    client = _client()
    client.incoming_phone_numbers(phone_number_sid).update(
        sms_url   = f"{FLASK_URL}/sms",
        voice_url = f"{FLASK_URL}/voice",
    )
    print(f"[provision] webhooks updated for sid={phone_number_sid}")


if __name__ == "__main__":
    import json, sys

    business_id = sys.argv[1] if len(sys.argv) > 1 else "demo-business"
    area_code   = sys.argv[2] if len(sys.argv) > 2 else "313"

    result = provision_number(business_id, area_code=area_code)
    print(json.dumps(result, indent=2))
