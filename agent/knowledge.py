import os
import uuid
import math
from datetime import datetime, timezone

KNOWLEDGE_DB    = "knowledge"
GEMINI_API_KEY  = os.getenv("GEMINI_API_KEY", "")
CLOUDANT_URL    = os.getenv("CLOUDANT_URL", "")
CLOUDANT_APIKEY = os.getenv("CLOUDANT_APIKEY", "")


def _cloudant_client():
    from ibmcloudant.cloudant_v1 import CloudantV1
    from ibm_cloud_sdk_core.authenticators import IAMAuthenticator
    auth = IAMAuthenticator(CLOUDANT_APIKEY)
    cl   = CloudantV1(authenticator=auth)
    cl.set_service_url(CLOUDANT_URL)
    return cl


def _ensure_db(client):
    try:
        client.put_database(db=KNOWLEDGE_DB).get_result()
    except Exception:
        pass


def _available() -> bool:
    return bool(CLOUDANT_URL and CLOUDANT_APIKEY)


# ── Embedding ─────────────────────────────────────────────────────────────────

def embed_text(text: str) -> list:
    if not GEMINI_API_KEY:
        return []
    try:
        from google import genai
        client   = genai.Client(api_key=GEMINI_API_KEY)
        response = client.models.embed_content(
            model    = "models/text-embedding-004",
            contents = text[:8000],
        )
        return list(response.embeddings[0].values)
    except Exception as exc:
        print(f"[knowledge] embed failed: {exc}")
        return []


def _cosine_sim(a: list, b: list) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na  = math.sqrt(sum(x * x for x in a))
    nb  = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na * nb else 0.0


def _keyword_score(query: str, text: str) -> float:
    q = set(query.lower().split())
    t = set(text.lower().split())
    return len(q & t) / len(q) if q else 0.0


# ── CRUD ──────────────────────────────────────────────────────────────────────

def save_chunk(business_id: str, text: str, source: str = "manual") -> dict:
    if not _available():
        return {"error": "Cloudant not configured"}

    chunk_id  = str(uuid.uuid4())
    embedding = embed_text(text)

    doc = {
        "_id":         chunk_id,
        "business_id": business_id,
        "text":        text,
        "source":      source,
        "embedding":   embedding,
        "created_at":  datetime.now(timezone.utc).isoformat(),
    }

    client = _cloudant_client()
    _ensure_db(client)
    client.put_document(db=KNOWLEDGE_DB, doc_id=chunk_id, document=doc).get_result()
    print(f"[knowledge] chunk saved: {chunk_id} source={source}")
    return {"id": chunk_id, "source": source, "preview": text[:120]}


def list_chunks(business_id: str) -> list:
    if not _available():
        return []
    client = _cloudant_client()
    _ensure_db(client)
    result = client.post_find(
        db       = KNOWLEDGE_DB,
        selector = {"business_id": {"$eq": business_id}},
        fields   = ["_id", "text", "source", "created_at"],
        sort     = [{"created_at": "desc"}],
        limit    = 200,
    ).get_result()
    return [
        {"id": d["_id"], "text": d["text"],
         "source": d.get("source", ""), "created_at": d.get("created_at", "")}
        for d in result.get("docs", [])
    ]


def delete_chunk(chunk_id: str, business_id: str | None = None) -> bool:
    if not _available():
        return False
    client = _cloudant_client()
    try:
        doc = client.get_document(db=KNOWLEDGE_DB, doc_id=chunk_id).get_result()
        if business_id and doc.get("business_id") != business_id:
            return False
        client.delete_document(db=KNOWLEDGE_DB, doc_id=chunk_id, rev=doc["_rev"]).get_result()
        return True
    except Exception:
        return False


# ── Retrieval ─────────────────────────────────────────────────────────────────

def search_chunks(business_id: str, query: str, top_k: int = 5) -> list:
    """Return top-k text strings most relevant to query."""
    if not _available():
        return []

    client = _cloudant_client()
    _ensure_db(client)

    result = client.post_find(
        db       = KNOWLEDGE_DB,
        selector = {"business_id": {"$eq": business_id}},
        fields   = ["text", "embedding"],
        limit    = 500,
    ).get_result()
    docs = result.get("docs", [])
    if not docs:
        return []

    query_emb = embed_text(query) if query else []

    scored = []
    for doc in docs:
        emb  = doc.get("embedding", [])
        text = doc.get("text", "")
        if query_emb and emb:
            score = _cosine_sim(query_emb, emb)
        else:
            score = _keyword_score(query, text)
        scored.append((score, text))

    scored.sort(reverse=True)
    return [text for _, text in scored[:top_k] if text]
