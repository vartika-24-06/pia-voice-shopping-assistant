# Pia: a Hinglish voice shopping assistant

A voice assistant that helps shoppers in smaller Indian cities find fashion and beauty products across Myntra, Amazon and Nykaa by speaking naturally in English or Hinglish. Built as a product-management portfolio project to learn how voice AI works and, above all, how it is **evaluated**.

> **Status:** work in progress. The voice loop and live product search work locally. Not deployed yet. Offers from DesiDime were descoped (see spec 02). The speech evaluation harness and the demo video are next.

## The idea
Neha, 27, lives in Raipur and wants a specific item (branded sneakers, a saree blouse) that local shops do not stock. Today she searches platform by platform and compares prices in her head. Pia lets her say what she wants, shows the three lowest-priced matches across platforms, takes spoken follow-ups ("thoda sasta dikhao", "Myntra pe hi dikhao", "agle 3 dikhao"), and replies in the language she spoke.

## How it works
Mic → speech to text → LLM that decides what to search → product search → LLM writes a short reply → text to speech.

- **Voice and language:** Sarvam AI (Saaras for speech in, Sarvam-105B for tool calling, Bulbul for speech out). Visitors bring their own Sarvam key (BYOK); it stays in the browser and goes only to `api.sarvam.ai`.
- **Search:** a small FastAPI backend calls a product-search API, routes by category, groups the same product across platforms, applies a rating quality gate, and ranks by lowest listed price.
- **Hand-rolled pipeline:** press-to-talk, no voice framework, so every stage can be timed and tested.

## Built spec-first
The product was specified before it was built. Read the specs in order:

| Spec | What it covers |
|---|---|
| [01 Problem and users](spec/01-problem-and-users.md) | Persona, hypothesis, success metrics and how targets were set |
| [02 Goals and non-goals](spec/02-goals-and-non-goals.md) | Scope, cut order, and what was deliberately left out |
| [03 Conversation design](spec/03-conversation-design.md) | Pia's persona, sample dialogues, failure behaviour |
| [04 Functional spec](spec/04-functional-spec.md) | Tools, data model, search pipeline, brand handling |
| [05 Architecture and risks](spec/05-architecture-and-risks.md) | Components, risk register, build order |
| [06 Evaluation plan](spec/06-evaluation-plan.md) | Seven evaluation layers, datasets, scoring rules |

## Evaluation (the point of the project)
Voice products fail at different stages, so evaluation is layered: speech recognition, understanding, retrieval, response, speech output, speed, and whole-task success. Findings so far are in [`tools/eval/STT_FINDINGS.md`](tools/eval/STT_FINDINGS.md) and [`spike/`](spike/): for example, word error rate is a poor measure for Hinglish spelling, brand names are the weak point, and biasing the recogniser toward known brands made held-out results worse.

## Run it locally
You need Python 3.11+ and:
- a [Sarvam AI](https://www.sarvam.ai/) key (you paste it into the page),
- a [QuickCommerceAPI](https://quickcommerceapi.com/) key for product search, as an environment variable.

```powershell
# one time: save the search key (Windows, user level)
[Environment]::SetEnvironmentVariable("QCAPI_KEY", "your-key", "User")

pip install -r app/requirements.txt
cd app/backend
python -m uvicorn main:app --port 8000
```
Open http://localhost:8000 in Chrome or Edge. Search results are cached in memory for an hour to save credits.

Offline checks (no credits used): `python test_search.py` in `app/backend`, which needs saved sample responses in `spike/raw/` (not included).

## Repository layout
- `spec/`: the six specs
- `app/`: the backend (`backend/`) and the page (`static/`)
- `tools/recorder/`: a local page for recording evaluation clips in the same format the app sends
- `tools/eval/`: speech-to-text and brand-repair evaluation scripts and results
- `spike/`: early data and browser checks, with findings
- `recordings/`: transcripts for the evaluation clips (audio is not committed)

## Known limitations
- Colour is not verified in results (the data has no colour field).
- Many items have no ratings; unrated items appear only when too few rated ones qualify.
- Indian-pronounced brand names are the main speech-recognition error.
- No pincode or delivery check.
- Prices come from a third-party search API and can change.

## Licence
[MIT](LICENSE). The code is free to use; the product data, brand names and the Sarvam and QuickCommerceAPI services belong to their owners.
