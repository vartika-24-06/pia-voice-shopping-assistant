"""Search pipeline: normalise listings, drop noise, group the same product across
platforms, apply the rating quality gate, and rank. Pure functions, no network.

Rules come from spec 03 (ranking, quality gate) and spec 04 (grouping).
"""
import hashlib
import re
from difflib import SequenceMatcher
from math import ceil

STOP = {"a", "an", "the", "for", "of", "and", "in", "with", "to", "me", "ke", "ka", "ki", "liye", "wala", "wale",
        "men", "mens", "man", "women", "womens", "woman", "ladies", "unisex", "adult", "adults", "new", "best", "good",
        "show", "dikhao", "chahiye", "please", "need", "want", "find"}
COLOURS = {"red", "pink", "purple", "green", "blue", "black", "white", "yellow", "orange", "brown", "grey", "gray", "navy",
           "maroon", "beige", "cream", "gold", "silver", "lime", "violet", "peach", "magenta", "multi", "multicolour"}
HINDI_FUNCTION = {"ke", "ka", "ki", "ko", "se", "mein", "me", "par", "pe", "wale", "wala", "wali", "hai", "ho", "hi", "aur", "andar", "tak", "kuch", "koi"}
KIDS = {"kids", "kid", "boys", "boy", "girls", "girl", "baby", "infant", "toddler", "junior"}

MIN_RATING = 3.5
MIN_REVIEWS = 20


def tokens(s):
    return re.findall(r"[a-z0-9]+", str(s or "").lower())


def norm_brand(b):
    return re.sub(r"[^a-z0-9]", "", str(b or "").lower())


def normalise(p, platform):
    """One raw product from the search API -> our listing format (or None if unusable)."""
    price = p.get("offer_price")
    if not price or price <= 0 or p.get("available") is False:
        return None
    mrp = p.get("mrp") or price
    rating = float(p.get("rating") or 0)
    count = int(p.get("rating_count") or 0)
    return {
        "platform": platform,
        "platform_product_id": str(p.get("id", "")),
        "name": str(p.get("name", "")).strip(),
        "brand": str(p.get("brand") or "").strip(),
        "mrp": float(max(mrp, price)),
        "offer_price": float(price),
        "discount_pct": round(100 * (1 - price / mrp)) if mrp and mrp > price else 0,
        "rating": round(rating, 1),
        "rating_count": count,
        "is_rated": rating > 0 and count > 0,
        "image_url": (p.get("images") or [None])[0],
        "link": p.get("deeplink"),
        "is_ad": bool(p.get("is_ad")),
    }


def collapse_same_platform(listings):
    """Identical names on one platform: keep the lowest price."""
    best = {}
    for l in listings:
        k = (l["platform"], re.sub(r"\s+", " ", l["name"].lower()))
        if k not in best or l["offer_price"] < best[k]["offer_price"]:
            best[k] = l
    return list(best.values())


def is_relevant(l, query, wants_kids):
    words = set(tokens(l["name"] + " " + l["brand"]))
    if not wants_kids and words & KIDS:
        return False
    need = [t for t in tokens(query) if t not in STOP and t not in COLOURS and not t.isdigit()]
    if not need:
        return True

    def hit(t):
        return t in words or (len(t) >= 5 and any(w.startswith(t[:5]) for w in words))

    return sum(1 for t in need if hit(t)) >= max(1, ceil(0.6 * len(need)))


def brand_matches(l, brand):
    if not brand:
        return True
    want = norm_brand(brand)
    have = norm_brand(l["brand"]) + norm_brand(l["name"])
    return want in have or SequenceMatcher(None, want, norm_brand(l["brand"])).ratio() >= 0.8


def _title_tokens(l):
    drop = set(tokens(l["brand"])) | STOP
    return {t for t in tokens(l["name"]) if t not in drop}


def _same_product(group, l):
    """Cautious rule: same brand, same MRP, similar title, and not already on this platform."""
    first = group["listings"][0]
    if l["platform"] in {x["platform"] for x in group["listings"]}:
        return False
    if norm_brand(first["brand"]).split("by")[0][:5] != norm_brand(l["brand"]).split("by")[0][:5]:
        return False
    if first["mrp"] != l["mrp"]:
        return False
    a, b = _title_tokens(first), _title_tokens(l)
    return bool(a and b) and len(a & b) / len(a | b) >= 0.6


def group_listings(listings):
    groups = []
    for l in sorted(listings, key=lambda x: x["offer_price"]):
        for g in groups:
            if _same_product(g, l):
                g["listings"].append(l)
                break
        else:
            groups.append({"listings": [l]})
    out = []
    for g in groups:
        ls = sorted(g["listings"], key=lambda x: x["offer_price"])
        rated = [x for x in ls if x["is_rated"]]
        ref = max(rated, key=lambda x: x["rating_count"]) if rated else None
        best = ls[0]
        out.append({
            "group_id": hashlib.md5((best["platform"] + best["platform_product_id"]).encode()).hexdigest()[:10],
            "display_name": best["name"], "brand": best["brand"], "image_url": best["image_url"] or next((x["image_url"] for x in ls if x["image_url"]), None),
            "listings": ls, "best": best, "mrp": best["mrp"], "discount_pct": best["discount_pct"],
            "is_rated": bool(ref), "rating": ref["rating"] if ref else None, "rating_count": ref["rating_count"] if ref else 0,
        })
    return out


def apply_gate(groups):
    """Rating floor with minimum reviews; unrated items only if fewer than 3 rated pass."""
    passed = [g for g in groups if g["is_rated"] and g["rating"] >= MIN_RATING and g["rating_count"] >= MIN_REVIEWS]
    unrated = [g for g in groups if not g["is_rated"]]
    return passed if len(passed) >= 3 else passed + unrated


def rank(groups, sort="lowest_price"):
    if sort == "highest_rating":
        return sorted(groups, key=lambda g: (-(g["rating"] or 0), g["best"]["offer_price"]))
    if sort == "highest_price":
        return sorted(groups, key=lambda g: (-g["best"]["offer_price"], -(g["rating"] or 0)))
    return sorted(groups, key=lambda g: (g["best"]["offer_price"], -(g["rating"] or 0)))


def run_pipeline(raw_by_platform, query, max_price=None, brand=None, sort="lowest_price"):
    """raw_by_platform: {platform: [raw product dicts]} -> ranked product groups (all pages)."""
    wants_kids = bool(set(tokens(query)) & KIDS)
    listings = []
    for platform, products in raw_by_platform.items():
        for p in products:
            l = normalise(p, platform)
            if l and is_relevant(l, query, wants_kids) and brand_matches(l, brand):
                listings.append(l)
    listings = collapse_same_platform(listings)
    if max_price:
        listings = [l for l in listings if l["offer_price"] <= max_price]
    return rank(apply_gate(group_listings(listings)), sort)


# ---------- brand repair (spec 04, section 4a) ----------
def repair_query(query, brands, threshold=0.8):
    """Replace near-miss brand words in the query with a known brand. brands: {norm: display}."""
    toks = re.findall(r"[A-Za-z0-9&']+", query)
    fixes, used = [], set()
    for n in (3, 2, 1):
        for i in range(len(toks) - n + 1):
            if any(j in used for j in range(i, i + n)):
                continue
            parts = [t.lower() for t in toks[i:i + n]]
            # skip windows with function words, or with a word that is already a known brand
            if any(t in STOP or t in HINDI_FUNCTION for t in parts) or any(norm_brand(t) in brands for t in parts):
                continue
            window = " ".join(toks[i:i + n])
            w = norm_brand(window)
            if len(w) < 4 or w in brands:
                continue
            # similar length too: stops a common word like "beauty" being swapped for "Kay Beauty"
            ratio, best = max(((SequenceMatcher(None, w, nb).ratio(), nb) for nb in brands
                               if len(nb) >= 4 and min(len(w), len(nb)) / max(len(w), len(nb)) >= 0.75), default=(0, None))
            if best and ratio >= threshold:
                fixes.append({"heard": window, "brand": brands[best], "score": round(ratio, 2)})
                used.update(range(i, i + n))
    new = query
    for f in fixes:
        new = re.sub(re.escape(f["heard"]), f["brand"], new, count=1, flags=re.I)
    return new, fixes


# ---------- brand confirmation (spec 03 and 06: accept / confirm / none) ----------
# Heard spellings that could mean more than one thing. The user is asked to pick.
AMBIGUOUS = {
    "kbeauty": ["Kay Beauty", "Korean beauty"],
    "honetsuka": ["Onitsuka Tiger"],
}


def find_ambiguous(text):
    """If the text contains a known ambiguous word, return (heard, candidates), else None."""
    toks = re.findall(r"[A-Za-z0-9&']+", text)
    for n in (2, 1):
        for i in range(len(toks) - n + 1):
            w = norm_brand(" ".join(toks[i:i + n]))
            if w in AMBIGUOUS:
                return " ".join(toks[i:i + n]), AMBIGUOUS[w]
    return None


def resolve_brand(text, brands, accept=0.8, confirm=0.62):
    """Three bands for a brand name that the speech recogniser may have misheard.

    accept:  exact or very close to one known brand  -> {'action': 'accept', 'brand': display}
    confirm: moderately close, or ambiguous           -> {'action': 'confirm', 'candidates': [...]}
    none:    nothing close (searched as heard)        -> {'action': 'none'}
    """
    n = norm_brand(text)
    if not n:
        return {"action": "none"}
    if n in AMBIGUOUS:
        return {"action": "confirm", "candidates": AMBIGUOUS[n]}
    if n in brands:
        return {"action": "accept", "brand": brands[n]}
    for nb, display in brands.items():
        if len(n) >= 4 and len(nb) >= 4 and (n in nb or nb in n):
            return {"action": "accept", "brand": display}
    scored = sorted(((SequenceMatcher(None, n, nb).ratio(), disp) for nb, disp in brands.items()
                     if len(nb) >= 4 and min(len(n), len(nb)) / max(len(n), len(nb)) >= 0.7), reverse=True)
    if scored and scored[0][0] >= accept:
        return {"action": "accept", "brand": scored[0][1]}
    near = [d for r, d in scored if r >= confirm][:3]
    if near:
        return {"action": "confirm", "candidates": near}
    return {"action": "none"}
