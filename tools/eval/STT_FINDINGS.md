# Speech-to-text check: first run (2026-10-17)

Method: 27 usable clips (English and Hinglish, fan noise in the background for all) sent to Sarvam's speech-to-text with three configurations. Raw outputs: `tools/eval/results/*.json`. Script: `tools/eval/stt_check.py`.

| Config | What it returns | Scored clips | Mean WER (scored only) |
|---|---|---|---|
| v4, auto language | Devanagari for Hinglish (15 of 27), English words spelled phonetically in Devanagari | 12 | 0.25 (not comparable) |
| v3, `codemix` | Hindi words in Devanagari, English words in Latin (16 of 27 contain Devanagari) | 11 | 0.20 (not comparable) |
| v3, `translit` | Everything in Roman letters | 27 | 0.19 |

## Observations
- **Latency 0.3 to 1.0 s per clip** for all configs. Speech recognition is a small part of the speed budget.
- **WER is a poor measure for Hinglish:** "nai" vs "nahi", "inmein" vs "in mein", "kapde" vs "kapde" spelling variants count as errors although the meaning is identical. Needs a meaning-level metric.
- **Brands are the weak point.** Of 12 brand mentions: exact 5 (Marks & Spencer, Garmin, Huda Beauty, H&M, Zara); close variants 3 (Moxy, K Beauty, Rebuck); wrong 4 ("Asics" heard as "A6", Van Heusen, Schwarzkopf as "Thorax"/"scorp", Maybelline as "Table Line").
- **Hallucinated brand:** codemix turned "show me" into "Xiaomi" on one clip.
- Roman output (translit) is the easiest to feed into product search. Devanagari output needs transliterating first.

## Ideas to test next (not yet run)
- v4 `keyterms` to bias towards brand names, tested on **held-out brands** (not the brands already in this test set).
- A brand-correction step in the backend: fuzzy-match heard brand names against a known brand list.
