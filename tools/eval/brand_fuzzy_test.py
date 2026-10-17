"""Offline test of a brand-repair step: match mis-heard text against a known brand list.

No credits used. The brand list below is a generic list of well-known fashion, footwear
and beauty brands, written as a stand-in for the brands a real catalogue would hold.
CAVEAT: the test brands are in this list, as they would be in a real catalogue, so this
shows what repair can do when the brand IS in the catalogue. It says nothing about
brands missing from the list.
"""
import re
import sys
from difflib import SequenceMatcher

sys.stdout.reconfigure(encoding="utf-8")

BRANDS = """Fabindia, Hush Puppies, Onitsuka Tiger, Asics, Reebok, Puma, Nike, Adidas, Skechers, Bata, Woodland,
Red Tape, Liberty, Campus, Crocs, Van Heusen, Louis Philippe, Allen Solly, Peter England, Raymond, Park Avenue,
Arrow, Zara, H&M, Marks & Spencer, Mango, Uniqlo, Levi's, Wrangler, Pepe Jeans, Jack & Jones, Vero Moda, Biba,
Aurelia, Libas, Global Desi, Anouk, Soch, Manyavar, Tanishq, Titan, Fastrack, Casio, Garmin, Fossil, Maybelline,
L'Oreal, Lakme, Mamaearth, Nykaa, Kay Beauty, Huda Beauty, Fenty Beauty, Rare Beauty, Benefit Cosmetics, Revlon,
Schwarzkopf, Pilgrim, Plum, Minimalist, The Body Shop, Forest Essentials, Wanderlust, Moxie, Calvin Klein,
Tommy Hilfiger, Ralph Lauren, Gucci, Michael Kors, Scuderia Ferrari, Andamen, Studio Shringaar, Tikhi Imli,
Rare Rabbit, Killer, Roadster, Highlander, Dennis Lingo, Westside, Pantaloons, Jockey, Streax, Himalaya,
Biotique, Lotus, Colorbar, Sugar, Swiss Beauty, Faces Canada, Clinique, Estee Lauder, Neutrogena, Dove""".replace("\n", " ")
BRANDS = [b.strip() for b in BRANDS.split(",") if b.strip()]


def norm(s):
    return re.sub(r"[^a-z0-9]", "", s.lower().replace("&", "and"))


NORM = {b: norm(b) for b in BRANDS}


def repair(text, threshold):
    """Return list of (heard_window, brand, score) for windows that fuzzy-match a brand."""
    toks = re.findall(r"[A-Za-z0-9&']+", text)
    found = []
    for n in (1, 2, 3):
        for i in range(len(toks) - n + 1):
            w = norm(" ".join(toks[i:i + n]))
            if len(w) < 4:
                continue
            best = max(((SequenceMatcher(None, w, nb).ratio(), b) for b, nb in NORM.items() if len(nb) >= 4), default=(0, None))
            if best[0] >= threshold:
                found.append((" ".join(toks[i:i + n]), best[1], round(best[0], 2)))
    # keep best-scoring non-duplicate brand matches
    found.sort(key=lambda x: -x[2])
    seen, out = set(), []
    for f in found:
        if f[1] not in seen:
            seen.add(f[1]); out.append(f)
    return out


CASES = [  # (what the speech-to-text produced, brand the user meant)
    ("A6 ke running wale gel wale shoes", "Asics"),
    ("I need a van in Houston West", "Van Heusen"),
    ("Table line ka mascara dikhao", "Maybelline"),
    ("Thorax ka hair mass dikhao", "Schwarzkopf"),
    ("Crab India ki Nehru jacket chahiye", "Fabindia"),
    ("Meri mummy ne harsh papis ki chappal", "Hush Puppies"),
    ("Honetsuka Snickers", "Onitsuka Tiger"),
    ("Rebuck ke joote dikhao", "Reebok"),
    ("K Beauty ki creamy vali lipstick milegi", "Kay Beauty"),
    ("Ika se Wonderlust ka Cherry Blossom wala shower gel", "Wanderlust"),
    ("I need a Moxy shampoo", "Moxie"),
    ("Underwear ki green linen shirt", "Andamen"),
    ("Andaman ki green linen shirt", "Andamen"),
]

NO_BRAND = [
    "I need a pair of nice jeans", "Casual T-shirts to go with jeans", "Why is the sky so blue",
    "Where can I find a black Labrador puppy", "Aaj dinner mein kya banaun", "Mujhe purple saree ka blouse chahiye",
    "How many times paan mein kitni baar paani dena chahiye", "Show me isse achha kuch", "White linen shirt",
    "Women's jacket", "Kurta sets for Rakshabandhan", "Lime green saree ka petticoat chahiye", "Striped T-shirt please",
    "What will go with a brown skirt", "Iske alawa white mein nahi milega kuch", "Purple ke alawa green nahi chalega is par",
    "I need floral nice flowy dresses from H&M", "Zara jaise kapde chahiye", "Revlon Kajal", "Blush from Fenty Beauty or Rare Beauty",
]

for T in (0.7, 0.75, 0.8):
    ok = 0
    print(f"\n=== threshold {T} ===")
    for heard, meant in CASES:
        r = repair(heard, T)
        hit = any(b == meant for _, b, _ in r)
        wrong = [x for x in r if x[1] != meant]
        ok += hit
        print(f"{'OK  ' if hit else 'MISS'} {heard[:50]:50} -> {r[:2]}")
    fp = [(t, repair(t, T)) for t in NO_BRAND]
    # a repair on a correctly heard brand is fine; flag only matches on text with no brand at all
    brandless = [(t, r) for t, r in fp if t not in ("I need floral nice flowy dresses from H&M", "Zara jaise kapde chahiye", "Revlon Kajal", "Blush from Fenty Beauty or Rare Beauty") and r]
    print(f"recovered {ok}/{len(CASES)} | false matches on brand-free text: {len(brandless)}")
    for t, r in brandless:
        print("   FALSE:", t, "->", r[:2])
