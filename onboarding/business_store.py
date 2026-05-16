import os
import json
from datetime import datetime

CLOUDANT_URL    = os.getenv("CLOUDANT_URL", "")
CLOUDANT_APIKEY = os.getenv("CLOUDANT_APIKEY", "")
CLOUDANT_ENABLED = bool(CLOUDANT_URL and CLOUDANT_APIKEY)

DB = "businesses"


def _client():
    from ibmcloudant.cloudant_v1 import CloudantV1
    from ibm_cloud_sdk_core.authenticators import IAMAuthenticator
    auth   = IAMAuthenticator(CLOUDANT_APIKEY)
    client = CloudantV1(authenticator=auth)
    client.set_service_url(CLOUDANT_URL)
    return client


def _ensure_db(client):
    try:
        client.put_database(db=DB).get_result()
    except Exception:
        pass


def save_business(profile: dict) -> dict:
    """
    Persist a business profile. Uses Cloudant when configured,
    falls back to local JSON file in dev mode.
    """
    business_id = profile["id"]

    if not CLOUDANT_ENABLED:
        os.makedirs("onboarding/examples", exist_ok=True)
        path = f"onboarding/examples/{business_id}.json"
        with open(path, "w") as f:
            json.dump(profile, f, indent=2)
        print(f"[business] saved to {path}")
        return profile

    client = _client()
    _ensure_db(client)

    doc = {
        "_id":        business_id,
        "created_at": datetime.utcnow().isoformat(),
        **profile,
    }

    try:
        existing = client.get_document(db=DB, doc_id=business_id).get_result()
        doc["_rev"] = existing["_rev"]
    except Exception:
        pass

    client.put_document(db=DB, doc_id=business_id, document=doc).get_result()
    print(f"[business] saved to Cloudant: {business_id}")
    return profile


def find_by_phone(phone_number: str) -> dict | None:
    """
    Look up a business by their Twilio phone number.
    Returns the profile dict or None if not found.
    """
    if not CLOUDANT_ENABLED:
        return _find_local_by_phone(phone_number)

    client = _client()
    _ensure_db(client)

    try:
        result = client.post_find(
            db       = DB,
            selector = {"phone": {"$eq": phone_number}},
            limit    = 1,
        ).get_result()
        docs = result.get("docs", [])
        if docs:
            print(f"[business] found by phone {phone_number}: {docs[0]['id']}")
            return docs[0]
    except Exception as exc:
        print(f"[business] phone lookup failed: {exc}")

    return None


def find_by_id(business_id: str) -> dict | None:
    """Load a business profile by ID."""
    if not CLOUDANT_ENABLED:
        path = f"onboarding/examples/{business_id}.json"
        try:
            with open(path) as f:
                return json.load(f)
        except Exception:
            return None

    client = _client()
    try:
        return client.get_document(db=DB, doc_id=business_id).get_result()
    except Exception as exc:
        print(f"[business] id lookup failed: {exc}")
        return None


def _find_local_by_phone(phone_number: str) -> dict | None:
    """Scan local example JSON files for a matching phone number."""
    import glob
    for path in glob.glob("onboarding/examples/*.json"):
        try:
            with open(path) as f:
                profile = json.load(f)
            if profile.get("phone") == phone_number:
                return profile
        except Exception:
            continue
    return None
