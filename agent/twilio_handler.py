import os
import re
import uuid
from urllib.parse import urlsplit, urlunsplit
from datetime import datetime, timezone, timedelta
from functools import wraps
from dotenv import load_dotenv
from flask import Flask, request, Response, jsonify, g
from flask_cors import CORS

load_dotenv()
import jwt
from werkzeug.security import generate_password_hash, check_password_hash
from twilio.twiml.voice_response import VoiceResponse, Connect, Stream, Parameter
from twilio.twiml.messaging_response import MessagingResponse
from twilio.request_validator import RequestValidator

from agent.watsonx import classify_urgency, classify_ticket_type, generate_response
from ticketing.ticket_router import TicketRouter

app           = Flask(__name__)

_cors_origin_env = os.getenv("FRONTEND_ORIGIN", "*")
if _cors_origin_env.strip() == "*":
    CORS(app)
else:
    _cors_origins = [o.strip() for o in _cors_origin_env.split(",") if o.strip()]
    CORS(app, origins=_cors_origins or ["http://localhost:3000"])
ticket_router = TicketRouter()

# Ensure Cloudant indexes exist for fast phone + email lookups
try:
    from onboarding.business_store import ensure_indexes
    ensure_indexes()
except Exception as _idx_err:
    print(f"[startup] index setup skipped: {_idx_err}")

DEMO_BUSINESS_ID    = os.getenv("DEMO_BUSINESS_ID", "detroit-plumbing-co")
FLASK_PUBLIC_URL    = os.getenv("FLASK_PUBLIC_URL", "")
JWT_SECRET          = os.getenv("JWT_SECRET", "")
ADMIN_API_KEY       = os.getenv("ADMIN_API_KEY", "")
_VALIDATE_TWILIO    = os.getenv("TWILIO_VALIDATE_SIGNATURES", "false").lower() == "true"


def _require_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not ADMIN_API_KEY:
            return jsonify({"error": "admin API key not configured"}), 503
        if request.headers.get("X-Admin-Key", "") != ADMIN_API_KEY:
            return jsonify({"error": "invalid admin key"}), 401
        return f(*args, **kwargs)
    return decorated


# ── Auth helpers ──────────────────────────────────────────────────────────────

def _jwt_secret() -> str:
    if JWT_SECRET:
        return JWT_SECRET
    if app.config.get("TESTING") or os.getenv("FLASK_DEBUG", "false").lower() == "true":
        return "dev-only-insecure-jwt-secret"
    raise RuntimeError("JWT_SECRET is required")


def _create_token(business_id: str) -> str:
    payload = {
        "business_id": business_id,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
    }
    return jwt.encode(payload, _jwt_secret(), algorithm="HS256")


def _decode_token(token: str) -> dict:
    return jwt.decode(token, _jwt_secret(), algorithms=["HS256"])


def _create_oauth_state(business_id: str, provider: str) -> str:
    payload = {
        "business_id": business_id,
        "provider": provider,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=10),
    }
    return jwt.encode(payload, _jwt_secret(), algorithm="HS256")


def _decode_oauth_state(state: str, provider: str) -> str:
    payload = jwt.decode(state, _jwt_secret(), algorithms=["HS256"])
    if payload.get("provider") != provider or not payload.get("business_id"):
        raise jwt.InvalidTokenError("invalid oauth state")
    return payload["business_id"]


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return jsonify({"error": "missing or invalid token"}), 401
        try:
            payload = _decode_token(header[7:])
            g.business_id = payload["business_id"]
        except RuntimeError as exc:
            return jsonify({"error": str(exc)}), 503
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "token expired, please log in again"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "invalid token"}), 401
        return f(*args, **kwargs)
    return decorated


def _check_business_scope(business_id: str):
    if business_id != g.business_id:
        return jsonify({"error": "business_id does not match authenticated business"}), 403
    return None


def _get_authorized_ticket(ticket_id: str):
    ticket = ticket_router.get_ticket(ticket_id)
    if not ticket or ticket.get("business_id") != g.business_id:
        return None
    return ticket


def _twilio_valid(req) -> bool:
    if not _VALIDATE_TWILIO:
        return True
    auth_token = os.getenv("TWILIO_AUTH_TOKEN", "")
    if not auth_token:
        return False
    validator  = RequestValidator(auth_token)
    if FLASK_PUBLIC_URL:
        public = urlsplit(FLASK_PUBLIC_URL)
        query = req.query_string.decode("utf-8")
        full_url = urlunsplit((public.scheme, public.netloc, req.path, query, ""))
    else:
        full_url = req.url
    return validator.validate(full_url, req.form, req.headers.get("X-Twilio-Signature", ""))


# ── Business lookup ──────────────────────────────────────────────────────────

FORCE_BUSINESS_ID = os.getenv("FORCE_BUSINESS_ID", "")


def _resolve_business(to_number: str = "") -> dict:
    from onboarding.business_store import find_by_phone, find_by_id

    # Test mode: pin all traffic to one business regardless of number called
    if FORCE_BUSINESS_ID:
        profile = find_by_id(FORCE_BUSINESS_ID)
        if profile:
            print(f"[business] FORCE_BUSINESS_ID active → {FORCE_BUSINESS_ID}")
            return profile

    if to_number:
        profile = find_by_phone(to_number)
        if profile:
            return profile
        print(f"[business] no match for {to_number}, falling back to demo")

    profile = find_by_id(DEMO_BUSINESS_ID)
    if profile:
        return profile

    return {
        "id":       DEMO_BUSINESS_ID,
        "name":     "Detroit Plumbing Co.",
        "industry": "home_services",
        "hours":    {"mon-fri": "8am-6pm", "sat": "9am-3pm", "sun": "closed"},
        "routing_rules": {
            "emergency_keywords": ["flood", "flooding", "burst pipe", "no heat", "gas leak"],
            "urgent_keywords":    ["broken", "not working", "leaking", "backed up"],
        },
    }


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9-]+", "-", value.lower()).strip("-")
    return slug or "business"


# ── Business signup ──────────────────────────────────────────────────────────

@app.route("/auth/login", methods=["POST"])
def login():
    data     = request.get_json(silent=True) or {}
    email    = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    from onboarding.business_store import find_by_email
    profile = find_by_email(email)
    if not profile or not check_password_hash(profile.get("password_hash", ""), password):
        return jsonify({"error": "invalid email or password"}), 401

    token        = _create_token(profile["id"])
    profile_safe = {k: v for k, v in profile.items() if k not in ("password_hash", "_rev")}
    return jsonify({"token": token, "business": profile_safe})


@app.route("/auth/me", methods=["GET"])
@require_auth
def me():
    from onboarding.business_store import find_by_id
    profile = find_by_id(g.business_id)
    if not profile:
        return jsonify({"error": "business not found"}), 404
    profile_safe = {k: v for k, v in profile.items() if k not in ("password_hash", "_rev")}
    return jsonify({"business": profile_safe})




@app.route("/admin/force-business", methods=["GET"])
@_require_admin
def get_force_business():
    return jsonify({"force_business_id": FORCE_BUSINESS_ID})


@app.route("/admin/force-business", methods=["POST"])
@_require_admin
def set_force_business():
    global FORCE_BUSINESS_ID
    data = request.get_json(silent=True) or {}
    biz_id = data.get("business_id", "").strip()
    if biz_id:
        from onboarding.business_store import find_by_id
        profile = find_by_id(biz_id)
        if not profile:
            return jsonify({"error": f"business '{biz_id}' not found"}), 404
        FORCE_BUSINESS_ID = biz_id
        print(f"[admin] forcing all traffic → {biz_id} ({profile.get('name')})")
        return jsonify({"force_business_id": FORCE_BUSINESS_ID, "name": profile.get("name"), "phone": profile.get("phone")})
    else:
        FORCE_BUSINESS_ID = ""
        print("[admin] force-business cleared — back to multi-tenant routing")
        return jsonify({"force_business_id": "", "status": "multi-tenant routing restored"})


@app.route("/businesses", methods=["POST"])
def create_business():
    data = request.get_json(force=True, silent=True) or {}

    required = ["name", "industry", "email", "password"]
    missing  = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing required fields: {missing}"}), 400

    valid_industries = ["home_services", "hospitality", "retail"]
    if data["industry"] not in valid_industries:
        return jsonify({"error": f"industry must be one of {valid_industries}"}), 400
    if len(data["password"]) < 8:
        return jsonify({"error": "password must be at least 8 characters"}), 400

    _default_services = {
        "home_services": ["Emergency service", "Appointment scheduling", "Quote requests"],
        "hospitality":   ["Reservations", "Takeout orders", "Catering inquiries"],
        "retail":        ["Product inquiries", "Order requests", "Returns & exchanges"],
    }
    services = data.get("services") or _default_services.get(data["industry"], ["General inquiries"])
    hours    = data.get("hours") or {"mon-fri": "8am-6pm", "sat-sun": "9am-5pm"}

    email = data["email"].strip().lower()
    from onboarding.business_store import find_by_email
    if find_by_email(email):
        return jsonify({"error": "an account with this email already exists"}), 409

    business_id   = data.get("id") or f"{_slugify(data['name'])}-{str(uuid.uuid4())[:8]}"
    business_id   = _slugify(business_id)
    area_code     = data.get("area_code")
    password_hash = generate_password_hash(data["password"])

    profile = {
        "id":            business_id,
        "name":          data["name"],
        "email":         email,
        "password_hash": password_hash,
        "industry":      data["industry"],
        "hours":         hours,
        "services":      services,
        "pricing":       data.get("pricing", []),
        "faqs":          data.get("faqs", []),
        "ai_goals":      data.get("ai_goals", []),
        "routing_rules": data.get("routing_rules", {
            "emergency_keywords": ["flood", "flooding", "burst pipe", "no heat", "gas leak"],
            "urgent_keywords":    ["broken", "not working", "leaking", "backed up"],
        }),
    }

    try:
        from onboarding.number_provisioner import provision_number
        result = provision_number(business_id, area_code=area_code)
        profile["phone"]      = result["phone_number"]
        profile["twilio_sid"] = result["sid"]
        print(f"[signup] provisioned {result['phone_number']} for {business_id}")
    except Exception as exc:
        print(f"[signup] number provisioning failed: {exc}")
        return jsonify({"error": "number provisioning failed", "detail": str(exc)}), 502

    from onboarding.business_store import save_business
    save_business(profile)

    token        = _create_token(business_id)
    profile_safe = {k: v for k, v in profile.items() if k != "password_hash"}
    print(f"[signup] business created: {business_id}")
    return jsonify({"token": token, "business": profile_safe}), 201


# ── SMS webhook ──────────────────────────────────────────────────────────────

@app.route("/sms", methods=["POST"])
def sms_webhook():
    if not _twilio_valid(request):
        return Response("Forbidden", status=403)

    body       = request.form.get("Body", "").strip()
    from_phone = request.form.get("From", "")
    to_phone   = request.form.get("To", "")
    msg_sid    = request.form.get("MessageSid", "")

    print(f"[sms] inbound from={from_phone} to={to_phone} sid={msg_sid}")

    resp = MessagingResponse()

    if not body:
        resp.message("We received your message but it was empty. Please describe how we can help.")
        return str(resp)

    business    = _resolve_business(to_phone)
    urgency     = classify_urgency(body, business.get("routing_rules", {}))
    ticket_type = classify_ticket_type(body, business.get("industry", "home_services"))

    try:
        ticket = ticket_router.create_ticket(
            business_id    = business["id"],
            customer_phone = from_phone,
            issue_summary  = body,
            ticket_type    = ticket_type,
            urgency        = urgency,
            raw_message    = body,
            channel        = "sms",
        )
        print(f"[ticket] {ticket_type} created: {ticket.id} urgency={urgency}")
        if urgency == "emergency":
            from agent.notifications import send_emergency_alert
            send_emergency_alert(business, ticket)
    except Exception as exc:
        print(f"[ticket] failed to create ticket: {exc}")

    # Retrieve relevant knowledge chunks + customer CRM context
    try:
        from agent.knowledge import search_chunks
        context_chunks = search_chunks(business["id"], body, top_k=4)
    except Exception:
        context_chunks = []

    try:
        from agent.integrations import lookup_customer
        customer_ctx = lookup_customer(business, from_phone)
        if customer_ctx:
            context_chunks = [customer_ctx] + context_chunks
    except Exception:
        pass

    ai_reply = generate_response(
        business_profile = business,
        customer_message = body,
        context_chunks   = context_chunks,
        urgency          = urgency,
    )

    resp.message(ai_reply)
    return str(resp)


# ── Voice webhook ─────────────────────────────────────────────────────────────

@app.route("/voice", methods=["POST"])
def voice_webhook():
    if not _twilio_valid(request):
        return Response("Forbidden", status=403)

    call_sid   = request.form.get("CallSid", "")
    from_phone = request.form.get("From", "")
    to_phone   = request.form.get("To", "")

    print(f"[voice] inbound call from={from_phone} to={to_phone} sid={call_sid}")

    websocket_url = os.getenv("WEBSOCKET_URL", "")
    if not websocket_url:
        print("[voice] WEBSOCKET_URL not set — cannot stream to Gemini Live")
        response = VoiceResponse()
        response.say("We are unable to connect your call right now. Please text this number and we will follow up.")
        return Response(str(response), status=503, mimetype="text/xml")

    response = VoiceResponse()
    connect  = Connect()
    stream   = Stream(url=websocket_url)
    stream.append(Parameter(name="from_phone", value=from_phone))
    stream.append(Parameter(name="to_phone",   value=to_phone))
    connect.append(stream)
    response.append(connect)

    return Response(str(response), mimetype="text/xml")


# ── Tickets API ───────────────────────────────────────────────────────────────

def _ticket_filters():
    filters = {}
    for key in ("status", "priority", "urgency", "ticket_type", "date_from"):
        value = request.args.get(key)
        if value:
            filters[key] = value
    return filters


@app.route("/businesses/<business_id>", methods=["PATCH"])
@require_auth
def update_business(business_id):
    scope_error = _check_business_scope(business_id)
    if scope_error:
        return scope_error
    data = request.get_json(silent=True) or {}
    allowed = {"alert_phone", "hours", "name", "services", "ai_goals"}
    updates = {k: v for k, v in data.items() if k in allowed}
    if not updates:
        return jsonify({"error": "no updatable fields provided"}), 400
    try:
        from onboarding.business_store import find_by_id, save_business
        profile = find_by_id(business_id)
        if not profile:
            return jsonify({"error": "business not found"}), 404
        profile.update(updates)
        save_business(profile)
        return jsonify({"ok": True, "business": profile})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/businesses/<business_id>/tickets", methods=["GET"])
@require_auth
def list_business_tickets(business_id):
    scope_error = _check_business_scope(business_id)
    if scope_error:
        return scope_error
    filters = _ticket_filters()
    try:
        tickets = ticket_router.list_tickets(business_id=g.business_id, filters=filters)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    return jsonify({"tickets": tickets, "count": len(tickets)})


@app.route("/tickets", methods=["GET"])
@require_auth
def list_all_tickets():
    filters = _ticket_filters()
    try:
        tickets = ticket_router.list_tickets(business_id=g.business_id, filters=filters)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    return jsonify({"tickets": tickets, "count": len(tickets)})


@app.route("/businesses/<business_id>/tickets", methods=["POST"])
@require_auth
def create_ticket_api(business_id):
    scope_error = _check_business_scope(business_id)
    if scope_error:
        return scope_error
    business_id = g.business_id
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "request body must be JSON"}), 400

    required = ["customer_phone", "issue_summary", "ticket_type", "urgency"]
    missing  = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": "missing required fields", "fields": missing}), 400

    try:
        ticket = ticket_router.create_ticket(
            business_id      = business_id,
            customer_phone   = data["customer_phone"],
            issue_summary    = data["issue_summary"],
            ticket_type      = data["ticket_type"],
            urgency          = data["urgency"],
            raw_message      = data.get("raw_message", ""),
            channel          = data.get("channel", "api"),
            priority         = data.get("priority"),
            suggested_action = data.get("suggested_action"),
            assigned_to      = data.get("assigned_to"),
            industry         = data.get("industry"),
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    return jsonify({"ticket": ticket_router.ticket_to_dict(ticket)}), 201


@app.route("/tickets/<ticket_id>", methods=["PATCH"])
@require_auth
def update_ticket(ticket_id):
    if not _get_authorized_ticket(ticket_id):
        return jsonify({"error": "ticket not found", "ticket_id": ticket_id}), 404

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "request body must be JSON"}), 400

    allowed  = {"status", "priority", "assigned_to"}
    rejected = sorted(set(data) - allowed)
    if rejected:
        return jsonify({
            "error": "unsupported fields",
            "fields": rejected,
            "allowed_fields": sorted(allowed),
        }), 400

    updates = {key: data[key] for key in allowed if key in data}
    if not updates:
        return jsonify({"error": "provide at least one of: status, priority, assigned_to"}), 400

    try:
        ticket = ticket_router.update_ticket(ticket_id, updates)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if not ticket:
        return jsonify({"error": "ticket not found", "ticket_id": ticket_id}), 404
    return jsonify({"ticket": ticket})


@app.route("/tickets/<ticket_id>/resolve", methods=["POST"])
@require_auth
def resolve_ticket(ticket_id):
    if not _get_authorized_ticket(ticket_id):
        return jsonify({"error": "ticket not found", "ticket_id": ticket_id}), 404

    ticket = ticket_router.resolve_ticket(ticket_id)
    if not ticket:
        return jsonify({"error": "ticket not found", "ticket_id": ticket_id}), 404
    return jsonify({"ticket": ticket, "resolved": ticket_id})


@app.route("/tickets/<ticket_id>/messages", methods=["GET"])
@require_auth
def list_ticket_messages(ticket_id):
    if not _get_authorized_ticket(ticket_id):
        return jsonify({"error": "ticket not found", "ticket_id": ticket_id}), 404

    messages = ticket_router.list_messages(ticket_id)
    return jsonify({"messages": messages, "count": len(messages)})


# ── Knowledge base ───────────────────────────────────────────────────────────

@app.route("/businesses/<business_id>/knowledge", methods=["GET"])
@require_auth
def list_knowledge(business_id):
    scope_error = _check_business_scope(business_id)
    if scope_error:
        return scope_error
    from agent.knowledge import list_chunks
    return jsonify({"chunks": list_chunks(g.business_id)})


@app.route("/businesses/<business_id>/knowledge", methods=["POST"])
@require_auth
def add_knowledge(business_id):
    scope_error = _check_business_scope(business_id)
    if scope_error:
        return scope_error
    data   = request.get_json(silent=True) or {}
    text   = (data.get("text") or "").strip()
    source = (data.get("source") or "manual").strip()
    if not text:
        return jsonify({"error": "text is required"}), 400
    from agent.knowledge import save_chunk
    result = save_chunk(g.business_id, text, source)
    return jsonify(result), 201


@app.route("/knowledge/<chunk_id>", methods=["DELETE"])
@require_auth
def delete_knowledge(chunk_id):
    from agent.knowledge import delete_chunk
    ok = delete_chunk(chunk_id, business_id=g.business_id)
    return jsonify({"deleted": ok}), (200 if ok else 404)


# ── Integrations ──────────────────────────────────────────────────────────────

@app.route("/businesses/<business_id>/integrations", methods=["GET"])
@require_auth
def get_integrations(business_id):
    scope_error = _check_business_scope(business_id)
    if scope_error:
        return scope_error
    from onboarding.business_store import find_by_id
    from agent.integrations import list_connected
    profile = find_by_id(g.business_id) or {}
    return jsonify(list_connected(profile))


# ·· HubSpot ··································································

@app.route("/integrations/hubspot/auth", methods=["GET"])
@require_auth
def hubspot_auth():
    from agent.integrations.hubspot import get_auth_url, HUBSPOT_CLIENT_ID
    if not HUBSPOT_CLIENT_ID:
        return jsonify({"error": "HubSpot not configured (missing HUBSPOT_CLIENT_ID)"}), 503
    state = _create_oauth_state(g.business_id, "hubspot")
    return jsonify({"auth_url": get_auth_url(state)})


@app.route("/integrations/hubspot/callback", methods=["GET"])
def hubspot_callback():
    code        = request.args.get("code", "")
    state       = request.args.get("state", "")
    if not code or not state:
        return "Missing code or state", 400
    try:
        business_id = _decode_oauth_state(state, "hubspot")
    except (jwt.InvalidTokenError, RuntimeError):
        return "Invalid or expired state", 400

    from agent.integrations.hubspot import exchange_code, get_portal_info
    from onboarding.business_store import update_integrations
    try:
        tokens      = exchange_code(code)
        portal_info = get_portal_info(tokens.get("access_token", ""))
        update_integrations(business_id, "hubspot", {
            "access_token":  tokens.get("access_token"),
            "refresh_token": tokens.get("refresh_token"),
            "expires_in":    tokens.get("expires_in"),
            "portal_id":     str(portal_info.get("hub_id", "")),
        })
        frontend = os.getenv("FRONTEND_ORIGIN", "").rstrip("/") or "https://dspatch-psi.vercel.app"
        return Response(
            f'<meta http-equiv="refresh" content="0;url={frontend}/dashboard?connected=hubspot">',
            mimetype="text/html",
        )
    except Exception as exc:
        return jsonify({"error": str(exc)}), 502


@app.route("/businesses/<business_id>/integrations/hubspot", methods=["DELETE"])
@require_auth
def disconnect_hubspot(business_id):
    scope_error = _check_business_scope(business_id)
    if scope_error:
        return scope_error
    from onboarding.business_store import update_integrations
    update_integrations(g.business_id, "hubspot", None)
    return jsonify({"disconnected": "hubspot"})


# ·· Google Sheets ·····························································

@app.route("/businesses/<business_id>/integrations/sheets", methods=["POST"])
@require_auth
def connect_sheets(business_id):
    scope_error = _check_business_scope(business_id)
    if scope_error:
        return scope_error
    data = request.get_json(silent=True) or {}
    url  = (data.get("url") or "").strip()
    if not url:
        return jsonify({"error": "url is required"}), 400

    from agent.integrations.sheets import import_from_url
    from agent.knowledge import save_chunk
    from onboarding.business_store import update_integrations
    try:
        rows = import_from_url(url)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400

    for row in rows:
        save_chunk(g.business_id, row, source="google_sheets")

    update_integrations(g.business_id, "sheets", {"url": url, "rows_imported": len(rows)})
    return jsonify({"imported": len(rows), "source": "google_sheets"})


@app.route("/businesses/<business_id>/integrations/sheets", methods=["DELETE"])
@require_auth
def disconnect_sheets(business_id):
    scope_error = _check_business_scope(business_id)
    if scope_error:
        return scope_error
    from onboarding.business_store import update_integrations
    update_integrations(g.business_id, "sheets", None)
    return jsonify({"disconnected": "sheets"})


# ·· Zendesk ···································································

@app.route("/businesses/<business_id>/integrations/zendesk", methods=["POST"])
@require_auth
def connect_zendesk(business_id):
    scope_error = _check_business_scope(business_id)
    if scope_error:
        return scope_error
    data        = request.get_json(silent=True) or {}
    subdomain   = (data.get("subdomain") or "").strip().lower()
    admin_email = (data.get("admin_email") or "").strip()
    api_key     = (data.get("api_key") or "").strip()

    if not subdomain or not admin_email or not api_key:
        return jsonify({"error": "subdomain, admin_email, and api_key are required"}), 400

    from agent.integrations.zendesk import test_connection, validate_subdomain
    from onboarding.business_store import update_integrations
    try:
        subdomain = validate_subdomain(subdomain)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    if not test_connection(subdomain, admin_email, api_key):
        return jsonify({"error": "Could not connect to Zendesk. Check subdomain, email, and API key."}), 401

    update_integrations(g.business_id, "zendesk", {
        "subdomain":   subdomain,
        "admin_email": admin_email,
        "api_key":     api_key,
    })
    return jsonify({"connected": "zendesk", "subdomain": subdomain})


@app.route("/businesses/<business_id>/integrations/zendesk", methods=["DELETE"])
@require_auth
def disconnect_zendesk(business_id):
    scope_error = _check_business_scope(business_id)
    if scope_error:
        return scope_error
    from onboarding.business_store import update_integrations
    update_integrations(g.business_id, "zendesk", None)
    return jsonify({"disconnected": "zendesk"})


# ── Health ────────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


# ── Error handlers ────────────────────────────────────────────────────────────

@app.errorhandler(404)
def json_not_found(error):
    return jsonify({"error": "not found", "path": request.path}), 404

@app.errorhandler(405)
def json_method_not_allowed(error):
    return jsonify({"error": "method not allowed", "path": request.path}), 405

@app.errorhandler(500)
def json_server_error(error):
    return jsonify({"error": "internal server error"}), 500


if __name__ == "__main__":
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    port  = int(os.getenv("FLASK_PORT", "5000"))
    app.run(host="0.0.0.0", debug=debug, port=port)
