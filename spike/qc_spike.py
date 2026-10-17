"""Data spike: what does QuickCommerceAPI return for fashion/beauty queries?

Reads the key from the QCAPI_KEY environment variable (never printed).
Saves raw responses to spike/raw/ and prints a short summary per call.
Uses 12 search credits.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

BASE = "https://api.quickcommerceapi.com"
LAT, LON = 21.2514, 81.6296  # Raipur

QUERIES = [
    ("pink saree blouse", "Myntra"),
    ("pink saree blouse", "Amazon"),
    ("purple blouse", "Myntra"),
    ("ferrari sneakers", "Myntra"),
    ("ferrari sneakers", "Amazon"),
    ("white sneakers", "Myntra"),
    ("white sneakers", "Amazon"),
    ("puma sneakers", "Myntra"),
    ("puma sneakers", "Amazon"),
    ("silver earrings", "Amazon"),
    ("lipstick", "Nykaa"),
    ("lipstick", "Myntra"),
]


def get_key():
    key = os.environ.get("QCAPI_KEY")
    if key:
        return key
    try:
        import winreg

        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as k:
            return winreg.QueryValueEx(k, "QCAPI_KEY")[0]
    except Exception:
        return None


def call(key, q, platform):
    params = urllib.parse.urlencode({"q": q, "lat": LAT, "lon": LON, "platform": platform})
    req = urllib.request.Request(f"{BASE}/v1/search?{params}", headers={"X-API-Key": key})
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            body = r.read().decode("utf-8")
            return r.status, dict(r.headers), body, time.time() - t0
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read().decode("utf-8", "replace"), time.time() - t0
    except Exception as e:  # network error, timeout
        return None, {}, str(e), time.time() - t0


def main():
    key = get_key()
    if not key:
        sys.exit("QCAPI_KEY not found")
    out = Path(__file__).parent / "raw"
    out.mkdir(exist_ok=True)
    for q, platform in QUERIES:
        status, headers, body, secs = call(key, q, platform)
        name = f"{platform}__{q.replace(' ', '_')}.json"
        (out / name).write_text(body, encoding="utf-8")
        remaining = headers.get("X-Credits-Remaining") or headers.get("x-credits-remaining")
        n = "?"
        try:
            n = len(json.loads(body)["data"]["products"])
        except Exception:
            pass
        print(f"{platform:7} | {q:20} | status={status} | products={n} | {secs:.1f}s | credits_left={remaining}")
        if status in (401, 402):
            print("stopping:", body[:200])
            break


if __name__ == "__main__":
    main()
