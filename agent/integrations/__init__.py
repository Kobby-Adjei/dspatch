"""
Aggregate customer context from all connected integrations at call/SMS time.
"""


def lookup_customer(business_profile: dict, customer_phone: str) -> str:
    """
    Query every connected integration for this phone number.
    Returns a plain-text summary injected into the AI's context.
    """
    parts        = []
    integrations = business_profile.get("integrations", {})

    # ── HubSpot ──────────────────────────────────────────────────────────────
    hs = integrations.get("hubspot", {})
    if hs.get("access_token"):
        try:
            from agent.integrations.hubspot import lookup_contact
            contact = lookup_contact(hs["access_token"], customer_phone)
            if contact:
                p       = contact.get("properties", {})
                name    = f"{p.get('firstname','').strip()} {p.get('lastname','').strip()}".strip()
                company = p.get("company", "")
                stage   = p.get("lifecyclestage", "")
                status  = p.get("hs_lead_status", "")
                line    = f"CRM (HubSpot): {name or 'known contact'}"
                if company: line += f" · {company}"
                if stage:   line += f" · {stage}"
                if status:  line += f" · {status}"
                parts.append(line)
        except Exception as exc:
            print(f"[integrations] hubspot lookup error: {exc}")

    # ── Zendesk ──────────────────────────────────────────────────────────────
    zd = integrations.get("zendesk", {})
    if zd.get("subdomain") and zd.get("api_key") and zd.get("admin_email"):
        try:
            from agent.integrations.zendesk import lookup_user
            user = lookup_user(zd["subdomain"], zd["api_key"], zd["admin_email"], customer_phone)
            if user:
                line = f"Zendesk: {user['name']}"
                if user.get("open_tickets"):
                    line += f" · {user['open_tickets']} open ticket(s)"
                parts.append(line)
        except Exception as exc:
            print(f"[integrations] zendesk lookup error: {exc}")

    # ── Salesforce (stub) ─────────────────────────────────────────────────────
    # sf = integrations.get("salesforce", {})
    # if sf.get("access_token"): ...

    # ── Shopify (stub) ────────────────────────────────────────────────────────
    # sh = integrations.get("shopify", {})
    # if sh.get("access_token"): ...

    return "\n".join(parts)


def list_connected(business_profile: dict) -> dict:
    """Return which integrations are connected (safe to send to frontend)."""
    integrations = business_profile.get("integrations", {})
    return {
        "hubspot":    {"connected": bool(integrations.get("hubspot", {}).get("access_token")),
                       "portal_id": integrations.get("hubspot", {}).get("portal_id", "")},
        "zendesk":    {"connected": bool(integrations.get("zendesk", {}).get("api_key")),
                       "subdomain": integrations.get("zendesk", {}).get("subdomain", "")},
        "sheets":     {"connected": bool(integrations.get("sheets", {}).get("url")),
                       "url":       integrations.get("sheets", {}).get("url", "")},
        "salesforce": {"connected": False, "coming_soon": True},
        "shopify":    {"connected": False, "coming_soon": True},
    }
