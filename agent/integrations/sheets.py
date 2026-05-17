import io
import re
import csv
import socket
import ipaddress
from urllib.parse import urlparse
import requests


MAX_CSV_BYTES = 2 * 1024 * 1024


def import_from_url(url: str) -> list:
    """
    Fetch a Google Sheet (public) or any CSV URL and return rows as text chunks.
    Each row becomes one knowledge chunk: "Column: Value | Column: Value ..."
    """
    csv_url = _to_csv_url(url)
    _validate_public_url(csv_url)
    resp    = requests.get(csv_url, timeout=20, stream=True)
    resp.raise_for_status()
    content_type = resp.headers.get("content-type", "").lower()
    if "text/csv" not in content_type and "text/plain" not in content_type and "application/octet-stream" not in content_type:
        raise ValueError("URL did not return a CSV response")

    content = bytearray()
    for chunk in resp.iter_content(chunk_size=65536):
        if not chunk:
            continue
        content.extend(chunk)
        if len(content) > MAX_CSV_BYTES:
            raise ValueError("CSV is too large")

    chunks = []
    reader = csv.DictReader(io.StringIO(content.decode(resp.encoding or "utf-8", errors="replace")))
    for row in reader:
        parts = [f"{k.strip()}: {v.strip()}" for k, v in row.items() if v and v.strip()]
        if parts:
            chunks.append(" | ".join(parts))
    return chunks


def _to_csv_url(url: str) -> str:
    if "export?format=csv" in url or url.endswith(".csv"):
        return url

    match = re.search(r"/spreadsheets/d/([a-zA-Z0-9_-]+)", url)
    if not match:
        raise ValueError("Not a valid Google Sheets URL. Use File → Share → Publish to web → CSV.")

    sheet_id  = match.group(1)
    gid_match = re.search(r"[#&?]gid=(\d+)", url)
    gid       = gid_match.group(1) if gid_match else "0"

    return f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid={gid}"


def _validate_public_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname:
        raise ValueError("Only public HTTPS CSV URLs are supported")

    hostname = parsed.hostname.lower()
    if hostname in {"localhost", "127.0.0.1", "::1"} or hostname.endswith(".local"):
        raise ValueError("Local or private URLs are not supported")

    try:
        addresses = socket.getaddrinfo(hostname, 443, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise ValueError("Could not resolve URL host") from exc

    for result in addresses:
        ip = ipaddress.ip_address(result[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            raise ValueError("Local or private URLs are not supported")
