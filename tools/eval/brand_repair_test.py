"""Does the platform's own search recover from a mis-heard brand name?

For each brand the speech-to-text got wrong, send the WRONG text as a Myntra search
and check whether the intended brand shows up in the results.
Uses about 9 search credits. Key is read from QCAPI_KEY (never printed).
"""
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "spike"))
import qc_spike as q  # noqa: E402

# (what the speech-to-text produced, brand the user meant, substring to look for in the brand field)
CASES = [
    ("A6 running gel shoes", "Asics", "asics"),
    ("van and Hughes and West vest", "Van Heusen", "van heusen"),
    ("Table Line mascara", "Maybelline", "maybelline"),
    ("Thorax hair mask", "Schwarzkopf", "schwarzkopf"),
    ("Crab India Nehru jacket", "Fabindia", "fabindia"),
    ("harsh papis chappal", "Hush Puppies", "hush puppies"),
    ("Honetsuka Snickers", "Onitsuka Tiger", "onitsuka"),
    ("Rebuck shoes", "Reebok", "reebok"),
    ("K Beauty creamy lipstick", "Kay Beauty", "kay beauty"),
]


def main():
    key = q.get_key()
    if not key:
        sys.exit("QCAPI_KEY not found")
    out = []
    for heard, meant, needle in CASES:
        status, headers, body, secs = q.call(key, heard, "Myntra")
        try:
            products = json.loads(body)["data"]["products"]
        except Exception:
            products = []
        brands = [(p.get("brand") or "") for p in products]
        pos = next((i + 1 for i, b in enumerate(brands) if needle in b.lower()), None)
        hits = sum(1 for b in brands if needle in b.lower())
        top3 = ", ".join(brands[:3])
        print(f"{heard:30} meant={meant:15} status={status} results={len(products):2} first_match_at={pos} matches={hits}  top3: {top3}")
        out.append({"heard": heard, "meant": meant, "status": status, "results": len(products), "first_match_rank": pos, "matches": hits, "top_brands": brands[:10]})
    Path(__file__).with_name("results").mkdir(exist_ok=True)
    (Path(__file__).parent / "results" / "brand_repair_platform_search.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
