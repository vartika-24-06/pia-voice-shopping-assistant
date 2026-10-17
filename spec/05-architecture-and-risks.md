# Spec 05: Architecture and Risks

**Status:** CLOSED v1.0 (2026-10-17). Stack and build order accepted by the PM.

---

## 1. Components

```
Browser (static page)                         Backend (small, one service)
 - mic recording (MediaRecorder)               - /search      -> QuickCommerceAPI (your key, cached)
 - Sarvam STT / LLM / TTS (visitor's key)      - /offers      -> DesiDime MCP (user's OAuth token)
 - conversation state, product cards           - /oauth/*     -> DesiDime OAuth flow
 - timing logs                                 - session store (in memory), cache
            |                                              |
            +------ tool calls (search, offers) -----------+
```

- The **visitor's Sarvam key never leaves the browser.** The browser calls Sarvam directly (the chat endpoint allows browser requests; STT and TTS still need a check).
- The **backend holds your QuickCommerceAPI key** and each connected user's DesiDime token (in memory, short lifetime, with a Disconnect button).
- Frontend and backend are served from **one domain**, so session cookies stay simple.

## 2. Proposed stack (PM may overrule)
| Part | Choice | Why |
|---|---|---|
| Frontend | Plain HTML and JavaScript, no framework | Fewest moving parts, easy to read in a portfolio |
| Backend | Python (FastAPI) with the MCP Python SDK | Quick to write, MCP support, same language as the eval scripts |
| Hosting | Free tier (Render or Fly), one service | Cost |
| Evals | Python scripts reading a test-set file | Same language as the backend |

## 3. Risk register

| # | Risk | Likelihood | Impact | Mitigation | Day-1 check |
|---|---|---|---|---|---|
| 1 | **CLEARED 2026-10-17:** the browser can call Sarvam chat, voice and speech directly (recordings must be labelled plain `audio/webm`). Was: browser cannot call Sarvam STT or TTS directly (CORS, file upload) | Medium | High | Chat endpoint passed a preflight. If STT or TTS fails, add a thin pass-through on the backend that does not store the key | Browser test of each endpoint with a real key |
| 2 | Bulbul reads mixed Hindi-English text unnaturally | Medium | High | Use the documented format (Devanagari for Hindi words, English words in Latin); test the `enhi` voices | Generate 10 sample sentences and listen |
| 3 | **MOSTLY CLEARED:** 7 of 7 tool-calling tests passed in the browser check, but the model invented a platform filter once (fix: prompt rule and eval check). Was: Sarvam-105B calls tools unreliably in Hinglish | Medium | High | Validate every tool call's arguments; retry once; measure in evals | 20 Hinglish prompts, count correct tool calls |
| 4 | Latency beyond p90 of 10s | High | Medium | Reasoning off, parallel searches, "searching" cue, short replies | Time each stage on a simple conversation |
| 5 | DesiDime refuses our client registration or restricts third-party apps | Medium | Medium | Recorded-demo fallback (spec 02) | Try registration with a local redirect URL |
| 6 | Wrong cross-platform grouping shows a misleading price | Medium | High | Cautious grouping; measure grouping errors in evals | Review 20 groups by hand |
| 7 | QuickCommerceAPI credits expire in 30 days | Certain | Low | Buy the pack close to the final evaluation run; cache results | Check the expiry header |
| 8 | Nykaa returns nothing for common queries | High | Low | Myntra first; Nykaa is optional | Already seen |
| 9 | Missing ratings and colours weaken relevance | Certain | Medium | Documented limitations (spec 04, section 8) | Already seen |
| 10 | Visitor's Sarvam free credits (₹100) run out mid-demo | Medium | Low | Show usage; clear message on a 402 or credit error | Test with a low-credit key |

## 4. Build order (checkpoints)
1. **Spike 2: Sarvam checks** (risks 1, 2, 3): STT, TTS and tool calling from a browser page. Decision point: if any fails, adjust before building more.
2. **Voice loop with a fake search:** press-to-talk, STT, LLM, TTS, with hard-coded products. Timing logs from the start.
3. **Real search:** backend, routing, normalisation, grouping, ranking.
4. **Follow-ups and the no-match, refusal and failure behaviours** from spec 03.
5. **Offers:** DesiDime OAuth (risk 5), with the fallback ready.
6. **Eval harness and the baseline run;** recalibrate targets.
7. **Recorded demo and write-up.**

## 5. Decision log
| Date | Decision |
|---|---|
| 2026-10-17 | One backend service, one domain; visitor's Sarvam key stays in the browser |
| 2026-10-17 | Stack: plain JS frontend, Python (FastAPI) backend, one free-tier host. PM accepted the proposal |
| 2026-10-17 | Build order in section 4 accepted by PM |
