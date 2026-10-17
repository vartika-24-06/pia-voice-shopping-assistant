"""Backend for the voice shopping assistant.

Serves the static page and /api/search. The voice loop itself runs in the browser with the
visitor's own Sarvam key; this server only holds the product-search key.

Run:  cd app/backend && python -m uvicorn main:app --port 8000
"""
import asyncio
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import qc
from search import norm_brand, detect_brand_in_query, find_ambiguous, repair_query, resolve_brand, run_pipeline, tokens

ROOT = Path(__file__).resolve().parent.parent
STATIC = ROOT / "static"
qc.seed_brands_from_files(ROOT.parent / "spike" / "raw")
qc.seed_brands_from_list(Path(__file__).resolve().parent / "seed_brands.txt")

app = FastAPI(title="Voice shopping assistant")


@app.middleware("http")
async def no_cache(request: Request, call_next):
    # While developing, never let the browser keep an old copy of the page.
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    return response


class SearchRequest(BaseModel):
    query: str
    category: str = "clothing"
    max_price: float | None = None
    brand: str | None = None
    platform: str | None = None
    sort: str = "lowest_price"
    page: int = 1


def route(category, platform):
    """Which platforms to search (spec 02): beauty -> Myntra then Nykaa; everything else -> Myntra + Amazon."""
    if platform in ("Myntra", "Amazon", "Nykaa"):
        return [platform]
    return ["Myntra"] if category == "beauty" else ["Myntra", "Amazon"]


def reword_from(products, query):
    """Second-source query for Nykaa: add the most common extra word seen in Myntra's top results."""
    have = set(tokens(query))
    counts = {}
    for p in products[:10]:
        for t in set(tokens(p.get("name", ""))):
            if len(t) >= 4 and t not in have and not t.isdigit():
                counts[t] = counts.get(t, 0) + 1
    if not counts:
        return None
    word = max(counts, key=counts.get)
    return f"{word} {query}"


def card(rank, g):
    return {
        "rank": rank, "group_id": g["group_id"], "name": g["display_name"], "brand": g["brand"], "image_url": g["image_url"],
        "mrp": g["mrp"], "discount_pct": g["discount_pct"], "rating": g["rating"], "rating_count": g["rating_count"],
        "best": {"platform": g["best"]["platform"], "price": g["best"]["offer_price"], "link": g["best"]["link"]},
        "listings": [{"platform": l["platform"], "price": l["offer_price"], "link": l["link"]} for l in g["listings"]],
    }


def confirm_response(heard, candidates, query):
    return {"status": "confirm_brand", "heard": heard, "candidates": candidates, "page": 1, "total_matches": 0,
            "searched_for": query, "corrections": [], "platforms_searched": [], "platforms_failed": [], "notes": [],
            "results": [], "available_elsewhere": None, "from_cache": True, "credits_remaining": None, "ms": 0}


def do_search(req: SearchRequest):
    t0 = time.time()
    # Brands that could mean two things: ask the user instead of guessing (no search credits spent)
    amb = find_ambiguous(req.query) or (find_ambiguous(req.brand) if req.brand else None)
    if amb:
        return confirm_response(amb[0], amb[1], req.query)
    query, fixes = repair_query(req.query, qc.BRANDS)
    brand = req.brand
    if brand:
        res = resolve_brand(brand, qc.BRANDS)
        if res["action"] == "confirm":
            return confirm_response(brand, res["candidates"], req.query)
        if res["action"] == "accept" and res["brand"] != brand:
            fixes.append({"heard": brand, "brand": res["brand"], "score": None})
            brand = res["brand"]
    if not brand:
        brand = detect_brand_in_query(query, qc.BRANDS)  # e.g. "Kay Beauty lipstick" typed into the query by the model
    # A brand search must send the brand to the store too, or the store's generic top results may not contain it
    search_q = query if (not brand or norm_brand(brand) in norm_brand(query)) else f"{brand} {query}"
    platforms = route(req.category, req.platform)

    raw, failed, notes, credits, cached_all = {}, [], [], None, True
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = {p: pool.submit(qc.fetch, p, search_q) for p in platforms}
        for p, fut in futures.items():
            try:
                r = fut.result()
                raw[p] = r["products"]
                cached_all &= r["cached"]
                credits = r["credits_remaining"] if r["credits_remaining"] is not None else credits
            except qc.SearchError as e:
                failed.append(p)
                notes.append(str(e))

    # Beauty: Nykaa as a second source, with a reworded query if the plain one finds nothing
    if req.category == "beauty" and not req.platform and "Myntra" in raw:
        try:
            r = qc.fetch("Nykaa", search_q)
            if not r["products"]:
                alt = reword_from(raw["Myntra"], search_q)
                if alt:
                    r = qc.fetch("Nykaa", alt)
                    notes.append(f"Nykaa searched as '{alt}'")
            raw["Nykaa"] = r["products"]
            cached_all &= r["cached"]
        except qc.SearchError as e:
            failed.append("Nykaa")
            notes.append(str(e))

    groups = run_pipeline(raw, query, max_price=req.max_price, brand=brand, sort=req.sort)
    page = max(1, req.page)
    shown = groups[(page - 1) * 3: page * 3]

    # The user asked for one platform and it has nothing: check whether the other platforms do,
    # so Pia can say so instead of just "no results" (usually free: the other searches are cached).
    elsewhere = None
    if not shown and req.platform:
        others = [p for p in route(req.category, None) if p != req.platform]
        raw_other = {}
        for p in others:
            try:
                raw_other[p] = qc.fetch(p, search_q)["products"]
            except qc.SearchError:
                pass
        alt = run_pipeline(raw_other, query, max_price=req.max_price, brand=brand, sort=req.sort)
        if alt:
            elsewhere = {"platforms": [p for p in raw_other if raw_other[p]], "count": len(alt)}

    return {
        "available_elsewhere": elsewhere,
        "status": "ok" if shown else "no_match",
        "page": page, "total_matches": len(groups),
        "searched_for": query, "corrections": fixes,
        "platforms_searched": list(raw), "platforms_failed": failed, "notes": notes,
        "results": [card((page - 1) * 3 + i + 1, g) for i, g in enumerate(shown)],
        "from_cache": cached_all, "credits_remaining": credits, "ms": round((time.time() - t0) * 1000),
    }


@app.post("/api/search")
async def search(req: SearchRequest):
    return await asyncio.to_thread(do_search, req)


@app.get("/api/health")
def health():
    return {"ok": True, "search_key_configured": bool(qc.get_key()), "known_brands": len(qc.BRANDS)}


app.mount("/", StaticFiles(directory=STATIC, html=True), name="static")
