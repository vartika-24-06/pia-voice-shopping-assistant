"""Offline checks of the search pipeline on the saved spike responses (no credits used).
Run:  cd app/backend && python test_search.py
"""
import json
from pathlib import Path

import qc
from search import is_korean, is_korean, run_pipeline, repair_query, resolve_brand, find_ambiguous, detect_brand_in_query

RAW = Path(__file__).resolve().parents[2] / "spike" / "raw"


def load(name):
    return json.loads((RAW / name).read_text(encoding="utf-8"))["data"]["products"]


def show(title, groups, n=3):
    print(f"\n== {title}: {len(groups)} groups")
    for g in groups[:n]:
        sites = ", ".join(f"{l['platform']} {l['offer_price']:.0f}" for l in g["listings"])
        r = f"{g['rating']} ({g['rating_count']})" if g["is_rated"] else "unrated"
        print(f"  {g['display_name'][:55]:55} | {sites} | {r} | {g['brand']}")


qc.seed_brands_from_files(RAW)
print("known brands:", len(qc.BRANDS))

# 1. Cross-platform grouping of the same sneaker
g = run_pipeline({"Myntra": load("Myntra__puma_sneakers.json"), "Amazon": load("Amazon__puma_sneakers.json")}, "puma sneakers")
show("puma sneakers (Myntra + Amazon)", g)
multi = [x for x in g if len(x["listings"]) > 1]
print("  groups with 2 platforms:", len(multi))
assert multi, "expected at least one product grouped across platforms"

# 2. Saree blouse: relevance and the quality gate
g = run_pipeline({"Myntra": load("Myntra__pink_saree_blouse.json"), "Amazon": load("Amazon__pink_saree_blouse.json")}, "pink saree blouse")
show("pink saree blouse", g)
assert all(x["is_rated"] for x in g[:3]), "rated items should lead when enough rated items pass the gate"

# 3. Price limit and kids filter
g = run_pipeline({"Myntra": load("Myntra__white_sneakers.json"), "Amazon": load("Amazon__white_sneakers.json")}, "white sneakers", max_price=2000)
show("white sneakers under 2000", g)
assert all(x["best"]["offer_price"] <= 2000 for x in g)
assert not any("kids" in x["display_name"].lower() for x in g), "kids items should be removed"

# 4. Niche query with many unrated items
g = run_pipeline({"Myntra": load("Myntra__ferrari_sneakers.json"), "Amazon": load("Amazon__ferrari_sneakers.json")}, "ferrari sneakers")
show("ferrari sneakers", g, 5)
print("  rated:", sum(x["is_rated"] for x in g), "unrated:", sum(not x["is_rated"] for x in g))

# 5. No match
g = run_pipeline({"Myntra": load("Myntra__ferrari_sneakers.json"), "Amazon": load("Amazon__ferrari_sneakers.json")}, "ferrari sneakers", max_price=1500)
print("\nferrari sneakers under 1500 ->", len(g), "groups (expect 0 or very few)")

# 6. Sort options
base = {"Myntra": load("Myntra__puma_sneakers.json"), "Amazon": load("Amazon__puma_sneakers.json")}
by_price = run_pipeline(base, "puma sneakers")
by_rating = run_pipeline(base, "puma sneakers", sort="highest_rating")
by_high = run_pipeline(base, "puma sneakers", sort="highest_price")
assert by_price[0]["best"]["offer_price"] <= by_price[-1]["best"]["offer_price"]
assert by_high[0]["best"]["offer_price"] >= by_high[-1]["best"]["offer_price"]
print("\nsort check ok: lowest", by_price[0]["best"]["offer_price"], "| highest", by_high[0]["best"]["offer_price"],
      "| top rated", by_rating[0]["rating"])

# 7. Brand repair
for q in ["asics ke running shoes", "Crab India ki Nehru jacket", "Table line mascara", "I need a pair of nice jeans", "Rebuck shoes"]:
    print("repair:", q, "->", repair_query(q, qc.BRANDS))
# 8. Regression: a common word must not be swapped for a longer brand ("beauty" -> "Kay Beauty")
fixed, fixes = repair_query("huda beauty concealer", qc.BRANDS)
assert fixed == "huda beauty concealer" and not fixes, (fixed, fixes)
# 10. A brand left inside the query is found and enforced (the Kay Beauty / Swiss Beauty bug)
qc.seed_brands_from_list(Path(__file__).resolve().parent / "seed_brands.txt")
assert detect_brand_in_query("Kay Beauty lipstick", qc.BRANDS) == "Kay Beauty"
assert detect_brand_in_query("lipstick under 500 on Nykaa", qc.BRANDS) is None
lip = {"Myntra": load("Myntra__lipstick.json")}
g = run_pipeline(lip, "lipstick", brand="Lakme")
assert g and all("lakme" in (x["brand"] + x["display_name"]).lower() for x in g), "brand filter must only keep Lakme"
assert run_pipeline(lip, "Kay Beauty lipstick", brand="Kay Beauty") == [] or all("kay" in x["brand"].lower() for x in run_pipeline(lip, "Kay Beauty lipstick", brand="Kay Beauty"))
print("\nall assertions passed")

# 11. "Korean beauty": only Korean brands, never a brand that merely has "Beauty" in its name
kg = run_pipeline({"Myntra": load("Myntra__lipstick.json")}, "korean beauty lipstick")
print("korean lipstick groups:", [(x["brand"], x["display_name"][:30]) for x in kg][:6])
assert all("swiss" not in x["brand"].lower() for x in kg)
assert all(is_korean(x["best"]) for x in kg)
print("korean check ok")

# 13. Round 2 findings: a near-miss is repaired, a lookalike of a different brand is not
fixed, fx = repair_query("Libus ka kurta set chahiye", qc.BRANDS)
assert fixed.startswith("Libas"), fixed
fixed, fx = repair_query("Mama's ka face wash dikhao", qc.BRANDS)
assert fixed == "Mama's ka face wash dikhao" and not fx, (fixed, fx)
print("round 2 brand repair checks ok")

# 14. The daily cap stops a live search before any request is made
qc._spent.update(day=None, n=0)
old_limit, qc.DAILY_LIMIT = qc.DAILY_LIMIT, 0
try:
    qc.fetch("Myntra", "limit test query that is not cached")
    raise AssertionError("expected the daily limit to stop the search")
except qc.SearchError as e:
    assert e.limit and e.status == 429
finally:
    qc.DAILY_LIMIT = old_limit
print("daily limit check ok")

# 15. The Myntra tab for a beauty brand that only Nykaa sells: nothing on Myntra, but Nykaa is named as having results
import main
_nykaa = [{"id": str(i), "name": f"Kay Beauty Matte Drama Lipstick {i}", "brand": "Kay Beauty", "available": True, "mrp": 999, "offer_price": 699 + i,
           "rating": 4.3, "rating_count": 500, "images": [], "deeplink": "https://www.nykaa.com/"} for i in range(4)]
_real_fetch = qc.fetch
qc.fetch = lambda platform, query: {"products": _nykaa if platform == "Nykaa" else load("Myntra__lipstick.json"), "cached": True, "credits_remaining": None}
try:
    r = main.do_search(main.SearchRequest(query="lipstick", category="beauty", brand="Kay Beauty", platform="Myntra"))
    assert r["status"] == "no_match" and r["available_elsewhere"]["platforms"] == ["Nykaa"], r["available_elsewhere"]
finally:
    qc.fetch = _real_fetch
print("beauty platform fallback check ok")
