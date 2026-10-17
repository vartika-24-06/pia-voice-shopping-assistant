"""Speech-to-text check: run the recorded clips through Sarvam Saaras and score them.

Usage:  python -I tools/eval/stt_check.py [config ...]
Configs: v4_auto, v3_codemix, v3_translit  (default: all three)

Reads the key from SARVAM_API_KEY (never printed). Reads recordings/transcripts.csv.
Writes tools/eval/results/<config>.json. Cost: roughly one rupee per config for ~27 short clips.
"""
import csv
import json
import os
import re
import sys
import time
from pathlib import Path

import requests

sys.stdout.reconfigure(encoding="utf-8")

ROOT =Path(__file__).resolve().parents[2]
REC = ROOT / "recordings"
OUT = Path(__file__).resolve().parent / "results"
URL = "https://api.sarvam.ai/speech-to-text"

CONFIGS = {
    "v4_auto": {"model": "saaras:v4", "language_code": "unknown"},
    "v3_codemix": {"model": "saaras:v3", "mode": "codemix", "language_code": "unknown"},
    "v3_translit": {"model": "saaras:v3", "mode": "translit", "language_code": "unknown"},
    # Bias towards brands from the FIRST recording set only; test it on the held-out set.
    "v4_keyterms": {
        "model": "saaras:v4",
        "language_code": "unknown",
        "keyterms": json.dumps(["Asics", "Van Heusen", "Schwarzkopf", "Maybelline", "Reebok", "Zara",
                                "Marks & Spencer", "Huda Beauty", "Kay Beauty", "Garmin", "H&M", "Moxie"]),
    },
}


def get_key():
    key = os.environ.get("SARVAM_API_KEY")
    if key:
        return key
    try:
        import winreg

        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as k:
            return winreg.QueryValueEx(k, "SARVAM_API_KEY")[0]
    except Exception:
        return None


def normalise(text):
    text = text.lower().replace("&", " and ")
    text = re.sub(r"[^\w\sऀ-ॿ]", " ", text)
    return text.split()


def wer(ref, hyp):
    r, h = normalise(ref), normalise(hyp)
    if not r:
        return None
    d = list(range(len(h) + 1))
    for i in range(1, len(r) + 1):
        prev, d[0] = d[0], i
        for j in range(1, len(h) + 1):
            cur = d[j]
            d[j] = min(d[j] + 1, d[j - 1] + 1, prev + (r[i - 1] != h[j - 1]))
            prev = cur
    return d[len(h)] / len(r)


def has_devanagari(text):
    return bool(re.search(r"[ऀ-ॿ]", text))


def run(name, key, rows, tag=""):
    cfg = CONFIGS[name]
    results = []
    for r in rows:
        path = REC / r["file"]
        t0 = time.time()
        with open(path, "rb") as f:
            resp = requests.post(
                URL,
                headers={"api-subscription-key": key},
                data=cfg,
                files={"file": (r["file"], f, "audio/webm")},
                timeout=90,
            )
        secs = time.time() - t0
        try:
            body = resp.json()
        except Exception:
            body = {"error": resp.text[:200]}
        hyp = body.get("transcript", "") if resp.status_code == 200 else ""
        results.append(
            {
                "file": r["file"],
                "type": r["type"],
                "reference": r["what_i_said"],
                "hypothesis": hyp,
                "status": resp.status_code,
                "language_code": body.get("language_code"),
                "seconds": round(secs, 2),
                "devanagari": has_devanagari(hyp),
                "wer": wer(r["what_i_said"], hyp) if hyp and not has_devanagari(hyp) else None,
                "error": None if resp.status_code == 200 else body,
            }
        )
        x = results[-1]
        print(f"{name:11} {x['file'][:18]:18} {x['status']} {x['seconds']:>4}s wer={x['wer'] if x['wer'] is None else round(x['wer'], 2)} | {x['reference']}  ->  {x['hypothesis']}")
        if resp.status_code in (401, 403, 429):
            print("stopping:", body)
            break
    OUT.mkdir(exist_ok=True)
    (OUT / f"{name}{tag}.json").write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")
    scored = [x["wer"] for x in results if x["wer"] is not None]
    dev = sum(1 for x in results if x["devanagari"])
    print(f"\n{name}: clips={len(results)} scored={len(scored)} devanagari_outputs={dev} mean_wer={sum(scored)/len(scored):.2f}" if scored else f"\n{name}: no scored clips")
    print()


def main():
    key = get_key()
    if not key:
        sys.exit("SARVAM_API_KEY not found")
    rows = list(csv.DictReader(open(REC / "transcripts.csv", encoding="utf-8")))
    rows = [r for r in rows if r["what_i_said"].strip() and (REC / r["file"]).exists()]
    args = sys.argv[1:]
    tag = ""
    if "--skip" in args:  # --skip N : ignore the first N rows (run only the held-out set)
        i = args.index("--skip")
        rows = rows[int(args[i + 1]):]
        args = args[:i] + args[i + 2:]
        tag = "_heldout"
    names = args or ["v4_auto", "v3_codemix", "v3_translit"]
    for n in names:
        run(n, key, rows, tag)


if __name__ == "__main__":
    main()
