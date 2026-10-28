"""Speech evaluation harness: how well does the speech recogniser hear what was said, and what goes wrong?

Reads recordings/transcripts.csv (what was said) and tools/eval/key_terms.csv (the brands, product words
and prices that matter in each clip), sends the clips to Sarvam (results are cached), aligns what was heard
with what was said, labels every difference with an error type, and writes a report.

Usage:
    python tools/eval/speech_eval.py                       # production setup (v3_translit)
    python tools/eval/speech_eval.py v3_translit v4_auto   # compare setups
    python tools/eval/speech_eval.py v3_translit --refresh # call Sarvam again instead of using the cache

Reports go to tools/eval/results/. The 13 clips in heldout.txt are reported separately and must never be
used to tune anything. Calling Sarvam costs roughly one rupee per setup for all clips.
"""
import argparse
import csv
import json
import re
import sys
import time
import unicodedata
from collections import Counter, defaultdict
from datetime import date
from difflib import SequenceMatcher
from pathlib import Path

import requests

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
REC = ROOT / "recordings"
RESULTS = HERE / "results"
RAW = RESULTS / "raw"
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(ROOT / "app" / "backend"))
import stt_check  # noqa: E402  (setups and the Sarvam address)
import qc  # noqa: E402  (list of known brands)

sys.stdout.reconfigure(encoding="utf-8")
qc.seed_brands_from_list(ROOT / "app" / "backend" / "seed_brands.txt")
KNOWN_BRANDS = set(qc.BRANDS)

FILLERS = {"aaa", "srr", "cla", "um", "umm", "uh", "hmm", "aa"}      # hesitations in the reference: not words to recognise
CURRENCY = {"rs", "rupaye", "rupees", "rupee", "inr", "rupay"}
SPELLING = {"nai": "nahi", "nahin": "nahi", "achha": "accha", "acha": "accha", "kuchh": "kuch", "banaoon": "banaun",
            "alava": "alawa", "vali": "wali", "iss": "is"}   # same word, different Roman spelling: not a recognition error
SPLITS = {"inmein": ["in", "mein"]}
SMALL = {w: i for i, w in enumerate("zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split())}
SMALL.update({"twenty": 20, "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90})
HI_UNITS = {"ek": 1, "do": 2, "teen": 3, "char": 4, "chaar": 4, "paanch": 5, "panch": 5, "chhe": 6, "saat": 7, "aath": 8, "nau": 9, "das": 10}
MULTIPLIERS = {"hundred": 100, "sau": 100, "thousand": 1000, "hazaar": 1000, "hazar": 1000}
DEV = re.compile(r"[ऀ-ॿ]")


# ---------------------------------------------------------------- text normalisation
def number_words(seq):
    total = cur = 0
    for w in seq:
        if w in SMALL:
            cur += SMALL[w]
        elif w in HI_UNITS:
            cur += HI_UNITS[w]
        elif MULTIPLIERS.get(w) == 100:
            cur = max(cur, 1) * 100
        elif MULTIPLIERS.get(w) == 1000:
            total += max(cur, 1) * 1000
            cur = 0
        else:
            return None
    return total + cur


def normalise(text):
    """Lower-case words, with numbers as digits, no punctuation, no hesitations, agreed spelling variants merged."""
    t = unicodedata.normalize("NFKC", str(text).lower()).replace("&", " and ").replace("₹", " ")
    t = re.sub(r"(?<=\d),(?=\d)", "", t)
    t = re.sub(r"['’]", "", t)
    t = re.sub(r"[^\w\sऀ-ॿ]", " ", t)
    toks = []
    for w in t.split():
        if w in FILLERS or w in CURRENCY:
            continue
        toks.extend(SPLITS.get(w, [SPELLING.get(w, w)]))
    out, i = [], 0
    while i < len(toks):  # "fifteen hundred" -> "1500"
        j = i
        while j < len(toks) and (toks[j] in SMALL or toks[j] in HI_UNITS or toks[j] in MULTIPLIERS):
            j += 1
        run = toks[i:j]
        # Hindi units alone ("ek", "do") are ordinary words; they only count as a number with "sau" or "hazaar"
        hindi_only_unit = any(w in HI_UNITS and w not in SMALL for w in run) and not any(w in MULTIPLIERS for w in run)
        if j > i and not hindi_only_unit and (j - i > 1 or toks[i] in MULTIPLIERS) and number_words(run) is not None:
            out.append(str(number_words(toks[i:j])))
            i = j
        else:
            out.append(toks[i])
            i += 1
    merged, i = [], 0
    while i < len(out):  # "t shirt" -> "tshirt"
        if out[i] == "t" and i + 1 < len(out) and out[i + 1].rstrip("s") == "shirt":
            merged.append("tshirt")
            i += 2
        else:
            merged.append(out[i])
            i += 1
    return merged


def stem(w):
    return w[:-1] if len(w) > 3 and w.endswith("s") and not w.endswith("ss") and not w.isdigit() else w


def squash(s):
    return re.sub(r"\s+", "", s)


# ---------------------------------------------------------------- the data
def load_clips():
    terms = {r["file"]: r for r in csv.DictReader(open(HERE / "key_terms.csv", encoding="utf-8"))}
    by_text = {}
    if (HERE / "key_terms_by_text.csv").exists():
        for r in csv.DictReader(open(HERE / "key_terms_by_text.csv", encoding="utf-8")):
            by_text[" ".join(normalise(r["said"]))] = r
    held = {l.strip() for l in open(HERE / "heldout.txt", encoding="utf-8") if l.strip()}
    clips = []
    for r in csv.DictReader(open(REC / "transcripts.csv", encoding="utf-8")):
        k = terms.get(r["file"]) or by_text.get(" ".join(normalise(r["what_i_said"]))) or {}
        clips.append({
            "file": r["file"], "said": r["what_i_said"], "type": r["type"], "language": r["language"], "note": r["note"],
            "extra_noise": bool(re.search(r"tv|motor|reels|street", r["note"].lower())), "heldout": r["file"] in held,
            "brands": [b for b in (k.get("brands") or "").split(";") if b],
            "brand_spoken": [b for b in (k.get("brand_spoken") or "").split(";") if b],
            "terms": [t for t in (k.get("terms") or "").split(";") if t],
            "price": (k.get("price") or "").strip(),
        })
    return clips


VARIANTS = json.load(open(HERE / "brand_variants.json", encoding="utf-8"))


def stt(config, clips, refresh):
    """Hypotheses for every clip, from the cache or from Sarvam."""
    RAW.mkdir(parents=True, exist_ok=True)
    path = RAW / f"{config}.json"
    cache = json.loads(path.read_text(encoding="utf-8")) if path.exists() and not refresh else {}
    key = None
    for c in clips:
        if c["file"] in cache and cache[c["file"]].get("status") == 200:
            continue
        key = key or stt_check.get_key()
        if not key:
            sys.exit("SARVAM_API_KEY not found")
        t0 = time.time()
        with open(REC / c["file"], "rb") as f:
            r = requests.post(stt_check.URL, headers={"api-subscription-key": key}, data=stt_check.CONFIGS[config],
                              files={"file": (c["file"], f, "audio/webm")}, timeout=90)
        body = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
        cache[c["file"]] = {"status": r.status_code, "hypothesis": body.get("transcript", "") if r.ok else "",
                            "language_code": body.get("language_code"), "seconds": round(time.time() - t0, 2)}
        print(f"  {config} {c['file']}: {r.status_code}")
    path.write_text(json.dumps(cache, ensure_ascii=False, indent=1), encoding="utf-8")
    return cache


# ---------------------------------------------------------------- scoring one clip
def brand_verdict(brand, hyp_tokens):
    """hit (exact or variant) / confirm / miss, for one brand in one hypothesis."""
    forms = VARIANTS.get(brand, {"accept": [brand.lower()]})
    h = " " + " ".join(hyp_tokens) + " "
    hs = squash(" ".join(hyp_tokens))

    def present(form):
        f = normalise(form)
        if not f:
            return False
        fs = " ".join(f)
        return (" " + fs + " ") in h or (len(squash(fs)) >= 5 and squash(fs) in hs)

    canonical = " ".join(normalise(brand))
    if present(brand):
        return "hit", "exact"
    if any(present(f) for f in forms.get("accept", [])):
        return "hit", "variant"
    if any(present(f) for f in forms.get("confirm", [])):
        return "confirm", "ambiguous"
    return "miss", canonical


def find_span(tokens, phrase):
    p = normalise(phrase)
    for i in range(len(tokens) - len(p) + 1):
        if tokens[i:i + len(p)] == p:
            return i, i + len(p)
    return None


def edit_distance(a, b):
    d = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        prev, d[0] = d[0], i
        for j in range(1, len(b) + 1):
            cur = d[j]
            d[j] = min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] != b[j - 1]))
            prev = cur
    return d[len(b)]


def score_clip(clip, hyp):
    R, H = normalise(clip["said"]), normalise(hyp["hypothesis"])
    sm = SequenceMatcher(None, [stem(x) for x in R], [stem(x) for x in H], autojunk=False)
    ops = sm.get_opcodes()
    brand_spans = []
    for b, spoken in zip(clip["brands"], clip["brand_spoken"]):
        sp = find_span(R, spoken)
        verdict, how = brand_verdict(b, H)
        brand_spans.append({"brand": b, "spoken": spoken, "span": sp, "verdict": verdict, "how": how})
    term_spans = []
    for t in clip["terms"]:
        sp = find_span(R, t)
        nt = [stem(x) for x in normalise(t)]
        hs = " ".join(stem(x) for x in H)
        ok = (" " + " ".join(nt) + " ") in (" " + hs + " ") or squash(" ".join(nt)) in squash(hs)
        term_spans.append({"term": t, "span": sp, "hit": ok})

    def overlap(span, i1, i2):
        return span is not None and i1 < span[1] and i2 > span[0]

    mapped = {}  # reference word position -> what was heard there
    for tag, i1, i2, j1, j2 in ops:
        if tag == "equal":
            for k in range(i2 - i1):
                mapped[i1 + k] = H[j1 + k]
        elif tag == "replace":
            mapped[i1] = " ".join(H[j1:j2])
            for k in range(i1 + 1, i2):
                mapped[k] = ""
        elif tag == "delete":
            for k in range(i1, i2):
                mapped[k] = "(dropped)"
    heard_as = {}
    for x in brand_spans:
        if x["span"]:
            heard_as[x["brand"]] = " ".join(v for v in (mapped.get(k, "") for k in range(*x["span"])) if v) or "(dropped)"
    events = []
    for tag, i1, i2, j1, j2 in ops:
        if tag == "equal":
            continue
        ref_txt, hyp_txt = " ".join(R[i1:i2]), " ".join(H[j1:j2])
        pos = "start" if i1 == 0 else "end" if i2 == len(R) else "middle"
        b = next((x for x in brand_spans if overlap(x["span"], i1, i2)), None)
        t = next((x for x in term_spans if overlap(x["span"], i1, i2)), None)
        if tag == "delete":
            kind = ("brand_dropped" if b and b["verdict"] == "miss" else None) or ("term_dropped" if t and not t["hit"] else None) or f"word_dropped_{pos}"
        elif tag == "insert":
            invented = any(norm_b in KNOWN_BRANDS for norm_b in (re.sub(r"[^a-z0-9]", "", w) for w in H[j1:j2]) if len(norm_b) >= 5)
            kind = "invented_brand" if invented else "word_inserted"
        else:
            invented = any(norm_b in KNOWN_BRANDS for norm_b in (re.sub(r"[^a-z0-9]", "", w) for w in H[j1:j2]) if len(norm_b) >= 5) and not b
            if b:
                kind = {"hit": "brand_variant_accepted", "confirm": "brand_confirm_needed", "miss": "brand_misheard"}[b["verdict"]]
            elif t and not t["hit"]:
                kind = "term_misheard"
            elif invented:
                kind = "invented_brand"
            elif any(x.isdigit() for x in R[i1:i2] + H[j1:j2]):
                kind = "number_mismatch"
            else:
                kind = "other_substitution"
        events.append({"kind": kind, "said": ref_txt, "heard": hyp_txt})

    price_ok = None
    if clip["price"]:
        price_ok = clip["price"] in H
    wrong_script = bool(DEV.search(hyp["hypothesis"]))
    return {
        "file": clip["file"], "language": clip["language"], "type": clip["type"], "heldout": clip["heldout"], "extra_noise": clip["extra_noise"],
        "said": clip["said"], "heard": hyp["hypothesis"], "seconds": hyp.get("seconds"), "detected_language": hyp.get("language_code"),
        "exact": [stem(x) for x in R] == [stem(x) for x in H], "ref_words": len(R),
        "word_errors": edit_distance([stem(x) for x in R], [stem(x) for x in H]),
        "brands": [{**x, "heard_as": heard_as.get(x["brand"], "(same)" if x["verdict"] == "hit" else "?")} for x in brand_spans],
        "terms": term_spans, "price_ok": price_ok, "wrong_script": wrong_script, "events": events,
    }


# ---------------------------------------------------------------- aggregate and report
def pct(n, d):
    return f"{100 * n / d:.0f}% ({n}/{d})" if d else "n/a"


def summarise(rows):
    s = {}
    brands = [b for r in rows for b in r["brands"]]
    s["clips"] = len(rows)
    s["brand_mentions"] = len(brands)
    s["brand_exact"] = sum(1 for b in brands if b["verdict"] == "hit" and b["how"] == "exact")
    s["brand_variant"] = sum(1 for b in brands if b["verdict"] == "hit" and b["how"] == "variant")
    s["brand_confirm"] = sum(1 for b in brands if b["verdict"] == "confirm")
    s["brand_miss"] = sum(1 for b in brands if b["verdict"] == "miss")
    terms = [t for r in rows for t in r["terms"]]
    s["terms"], s["terms_hit"] = len(terms), sum(1 for t in terms if t["hit"])
    prices = [r["price_ok"] for r in rows if r["price_ok"] is not None]
    s["prices"], s["prices_ok"] = len(prices), sum(1 for p in prices if p)
    s["exact_clips"] = sum(1 for r in rows if r["exact"])
    s["wer_micro"] = sum(r["word_errors"] for r in rows) / max(1, sum(r["ref_words"] for r in rows))
    s["wrong_script"] = sum(1 for r in rows if r["wrong_script"])
    ev = Counter(e["kind"] for r in rows for e in r["events"])
    s["events"] = ev
    secs = sorted(r["seconds"] for r in rows if r["seconds"] is not None)
    s["secs_mean"] = sum(secs) / len(secs) if secs else 0
    s["secs_p90"] = secs[int(0.9 * (len(secs) - 1))] if secs else 0
    return s


def brand_rate(s):
    return pct(s["brand_exact"] + s["brand_variant"], s["brand_mentions"])


def write_report(config, rows):
    allx, held = summarise(rows), summarise([r for r in rows if r["heldout"]])
    by = lambda f: {k: summarise([r for r in rows if f(r) == k]) for k in sorted({f(r) for r in rows})}
    L = [f"# Speech evaluation: {config}", "",
         f"Run on {date.today().isoformat()} with {len(rows)} clips ({held['clips']} held-out). Setup: `{json.dumps(stt_check.CONFIGS[config])}`.",
         "Scoring rules: agreed spelling variants count as correct (`brand_variants.json`); hesitations in what was said are ignored; "
         "numbers are compared as digits; word error rate is reported but not used as a pass mark (Hinglish spelling varies).",
         "**Limitation:** all clips are one speaker (the PM) with a fan running; the figures describe one voice and one accent, not all users.", "",
         "## Summary", "", "| Measure | All clips | Held-out only |", "|---|---|---|",
         f"| Brand accuracy (exact or agreed variant) | {brand_rate(allx)} | {brand_rate(held)} |",
         f"| Brands: exact / variant / needs confirm / missed | {allx['brand_exact']} / {allx['brand_variant']} / {allx['brand_confirm']} / {allx['brand_miss']} | {held['brand_exact']} / {held['brand_variant']} / {held['brand_confirm']} / {held['brand_miss']} |",
         f"| Product and colour words heard | {pct(allx['terms_hit'], allx['terms'])} | {pct(held['terms_hit'], held['terms'])} |",
         f"| Prices heard correctly | {pct(allx['prices_ok'], allx['prices'])} | {pct(held['prices_ok'], held['prices'])} |",
         f"| Clips heard exactly (after normalising) | {pct(allx['exact_clips'], allx['clips'])} | {pct(held['exact_clips'], held['clips'])} |",
         f"| Word error rate (reported only) | {allx['wer_micro']:.2f} | {held['wer_micro']:.2f} |",
         f"| Clips returned in the wrong script (Devanagari) | {allx['wrong_script']} | {held['wrong_script']} |",
         f"| Time per clip (mean / p90, seconds) | {allx['secs_mean']:.2f} / {allx['secs_p90']:.2f} | {held['secs_mean']:.2f} / {held['secs_p90']:.2f} |", ""]
    L += ["## Error types", "", "| Type | Count (all) | Count (held-out) |", "|---|---|---|"]
    for k in sorted(set(allx["events"]) | set(held["events"])):
        L.append(f"| {k} | {allx['events'].get(k, 0)} | {held['events'].get(k, 0)} |")
    L += ["", "*Accepted variants are not errors; they are listed so you can see them.*", ""]
    for title, f in (("language", lambda r: r["language"]), ("clip type", lambda r: r["type"]), ("extra background noise", lambda r: "extra noise" if r["extra_noise"] else "fan only")):
        L += [f"## By {title}", "", "| Group | Clips | Brand accuracy | Terms heard | Clips exact | Word error rate |", "|---|---|---|---|---|---|"]
        for k, v in by(f).items():
            L.append(f"| {k} | {v['clips']} | {brand_rate(v)} | {pct(v['terms_hit'], v['terms'])} | {pct(v['exact_clips'], v['clips'])} | {v['wer_micro']:.2f} |")
        L.append("")
    L += ["## Every brand mention", "", "| Clip | Brand | Said | Heard as | Result |", "|---|---|---|---|---|"]
    for r in rows:
        for b in r["brands"]:
            label = {"hit": "correct" + (" (variant)" if b["how"] == "variant" else ""), "confirm": "needs a confirmation question", "miss": "MISSED"}[b["verdict"]]
            L.append(f"| {r['file'][:-5]}{' (held-out)' if r['heldout'] else ''} | {b['brand']} | {b['spoken']} | {b['heard_as']} | {label} |")
    L += ["", "## Every clip", "", "| Clip | Said | Heard | Error types |", "|---|---|---|---|"]
    for r in rows:
        kinds = ", ".join(sorted({e['kind'] for e in r["events"] if e["kind"] != "brand_variant_accepted"})) or ("(none)" if r["exact"] else "(variants only)")
        L.append(f"| {r['file'][:-5]} | {r['said']} | {r['heard']} | {kinds} |")
    (RESULTS / f"speech_report_{config}.md").write_text("\n".join(L) + "\n", encoding="utf-8")
    (RESULTS / f"speech_eval_{config}.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
    return allx, held


def write_compare(done):
    L = ["# Speech evaluation: setups compared", "", f"Run on {date.today().isoformat()}.", "",
         "| Measure | " + " | ".join(done) + " |", "|---|" + "---|" * len(done)]
    rows = [("Brand accuracy (all)", lambda a, h: brand_rate(a)), ("Brand accuracy (held-out)", lambda a, h: brand_rate(h)),
            ("Product and colour words heard", lambda a, h: pct(a["terms_hit"], a["terms"])),
            ("Prices heard correctly", lambda a, h: pct(a["prices_ok"], a["prices"])),
            ("Clips heard exactly", lambda a, h: pct(a["exact_clips"], a["clips"])),
            ("Clips in the wrong script", lambda a, h: str(a["wrong_script"])),
            ("Word error rate (reported only)", lambda a, h: f"{a['wer_micro']:.2f}"),
            ("Invented brands", lambda a, h: str(a["events"].get("invented_brand", 0))),
            ("Words dropped (start / middle / end)", lambda a, h: " / ".join(str(a["events"].get(f"word_dropped_{p}", 0)) for p in ("start", "middle", "end"))),
            ("Time per clip (mean, seconds)", lambda a, h: f"{a['secs_mean']:.2f}")]
    for name, f in rows:
        L.append(f"| {name} | " + " | ".join(f(*done[c]) for c in done) + " |")
    (RESULTS / "speech_compare.md").write_text("\n".join(L) + "\n", encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("configs", nargs="*", default=["v3_translit"])
    ap.add_argument("--refresh", action="store_true")
    args = ap.parse_args()
    clips = load_clips()
    done = {}
    for cfg in args.configs:
        hyps = stt(cfg, clips, args.refresh)
        rows = [score_clip(c, hyps[c["file"]]) for c in clips]
        done[cfg] = write_report(cfg, rows)
        a, h = done[cfg]
        print(f"{cfg}: brands {brand_rate(a)} | held-out {brand_rate(h)} | terms {pct(a['terms_hit'], a['terms'])} | exact clips {pct(a['exact_clips'], a['clips'])} | WER {a['wer_micro']:.2f}")
    if len(done) > 1:
        write_compare(done)


if __name__ == "__main__":
    main()
