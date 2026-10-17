"""Client for the product search API (QuickCommerceAPI), with a cache.

The API key is read from the QCAPI_KEY environment variable and never leaves the server.
"""
import json
import os
import threading
import time
from pathlib import Path

import requests

BASE = "https://api.quickcommerceapi.com"
LAT = float(os.environ.get("SEARCH_LAT", "21.2514"))   # Raipur
LON = float(os.environ.get("SEARCH_LON", "81.6296"))
TTL_SECONDS = 3600
TIMEOUT = 25

_cache = {}
_lock = threading.Lock()
BRANDS = {}  # normalised brand -> display name, grown from every result


class SearchError(Exception):
    def __init__(self, message, status=None):
        super().__init__(message)
        self.status = status


def get_key():
    key = os.environ.get("QCAPI_KEY")
    if key:
        return key
    try:  # Windows: the key was saved as a user environment variable
        import winreg
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as k:
            return winreg.QueryValueEx(k, "QCAPI_KEY")[0]
    except Exception:
        return None


def _harvest_brands(products):
    from search import norm_brand
    for p in products:
        b = (p.get("brand") or "").strip()
        n = norm_brand(b)
        if len(n) >= 3 and n not in BRANDS:
            BRANDS[n] = b


def seed_brands_from_files(folder):
    """Start the brand list from earlier saved responses, if any."""
    for f in Path(folder).glob("*.json"):
        try:
            _harvest_brands(json.loads(f.read_text(encoding="utf-8"))["data"]["products"])
        except Exception:
            pass


def fetch(platform, query):
    """Return {'products': [...], 'cached': bool, 'credits_remaining': int|None}. Raises SearchError."""
    ck = (platform, " ".join(query.lower().split()))
    with _lock:
        hit = _cache.get(ck)
    if hit and time.time() - hit["at"] < TTL_SECONDS:
        return {"products": hit["products"], "cached": True, "credits_remaining": None}
    key = get_key()
    if not key:
        raise SearchError("Search key is not configured on the server.")
    try:
        r = requests.get(f"{BASE}/v1/search", headers={"X-API-Key": key}, timeout=TIMEOUT,
                         params={"q": query, "lat": LAT, "lon": LON, "platform": platform})
    except requests.RequestException as e:
        raise SearchError(f"{platform} did not respond ({type(e).__name__}).")
    if r.status_code != 200:
        raise SearchError(f"{platform} returned {r.status_code}.", r.status_code)
    products = r.json().get("data", {}).get("products", [])
    _harvest_brands(products)
    with _lock:
        _cache[ck] = {"at": time.time(), "products": products}
    left = r.headers.get("X-Credits-Remaining")
    return {"products": products, "cached": False, "credits_remaining": int(left) if left and left.isdigit() else None}
