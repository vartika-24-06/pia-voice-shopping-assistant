# Spec 01: Problem and Users

**Status:** CLOSED v1.0 (2026-10-17). Metric targets are **v0 and provisional**: they get recalibrated after the first baseline run (see section 6).
**Owner:** PM (you). Persona and targets drafted by Claude at your request; you have the right to overrule any line.

---

## 1. User persona

> Persona details are assumptions drawn from your description. **Validate with 3 to 5 conversations with real people who match this profile** (see "PM actions" in section 8).

**Neha, 27, Raipur.** Works at a private bank branch, earns about ₹30,000 a month. Android phone in the ₹12,000 to ₹15,000 range, 4G data, UPI and one credit card. Sends WhatsApp voice notes every day, so speaking to a phone is natural for her.

**Buying pattern:** she buys fashion **4 to 5 times in the second half of the financial year (Oct to Mar)**, driven by festive season, the change of weather and new launches. In Apr to Sep she buys once or twice at most. This makes October to March the peak window for this product, and today (mid-October) is the start of it.

**Situation:** evening, phone in hand, after seeing a pair of branded sneakers a friend posted. She knows the brand and style. Local shops in Raipur don't stock it. She will otherwise open Myntra, then Flipkart, then Amazon, and compare in her head.

**Behaviour that matters to the design:**
- Cost-conscious and platform-disloyal: she buys wherever the price after offers is lowest.
- Reads bank and card offers and follows deal communities.
- Speaks Hinglish by default for searching, following up and revising.
- Brand names are in English (Ferrari, Puma); everything around them is Hinglish.

## 2. The problem

Even when she is very specific about what she wants, she has to search platform by platform to find the item and compare prices. Time goes on scouting, not on deciding.

**Job to be done:** "When I know exactly what I want but it's hard to find locally, show me the best-priced options across platforms, and the best offer on the one I choose, without searching each site myself."

## 3. Why voice (hypothesis)

**Hypothesis:** For Hinglish-speaking shoppers, voice beats typing for finding a specific item, because **Hinglish has no standard spelling when typed** (for example "mein", "main" and "me" can all mean "in", and "main" also means "I"), which makes typed queries inconsistent and slow, and because **follow-ups and revisions are natural in speech** ("thoda sasta dikhao", "black mein hai?").

**How we'd know:** compare time-to-shortlist and number of query retries for the same task by voice vs typing, for a small group of target users. (Out of scope for the build; listed as a validation step.)

**Design consequences:**
- Speech-to-text may return Hindi words in Devanagari while catalogues are in Latin script, so the pipeline needs transliteration.
- Brand names are the most error-prone words in Hinglish speech, so brand recognition is a tracked metric.
- Because spelling varies, the assistant must handle spelling and script variants of the same word.

## 4. Language behaviour

**Decision:** the assistant replies in **the user's language** (English, or Hinglish if the user spoke Hinglish).
- Spoken replies use the format that Sarvam's text-to-speech handles best: Devanagari for the Hindi words, English words in Latin script.
- The on-screen text uses a readable Roman Hinglish version.
- Product titles and brand names always stay in the original Latin form.

## 5. Scope decisions made to close this spec (PM decisions)

| Question | Decision | Notes |
|---|---|---|
| How is "most suitable" judged? | Relevant items that pass a rating quality gate, sorted by lowest listed price, with **user ratings on the platform as the tiebreaker** (see spec 03, section 2) | Open for the functional spec: whether the data source returns ratings at all, and a minimum review count so that a 4.8 from 3 reviews doesn't beat a 4.4 from 1 lakh |
| Delivery to tier 2/3 pincodes | **Out of scope for v1.** The limitation is stated in the app and the write-up | |
| Clarifying questions | **Search first, refine through follow-ups.** At most one clarifying question, and only if the request is too vague to search | Voice replies must be short, and each extra question adds a full voice round trip. Exact rules go in the conversation design spec (spec 04) |

## 6. Goal and metrics

### Goal metric
**Conversion:** share of voice sessions that end in a purchase.
- In a real launch: tracked with affiliate or tracked links.
- In this portfolio piece, purchases can't be observed. The measured proxy is **click-out rate**: the user taps through to a platform page. A click-out is a lead, not a purchase, and the write-up says so.
- **No honest target exists yet** for click-out rate, because no baseline exists. The v0 target is that the metric is instrumented and every top-3 result has a working link. The first real number becomes the baseline.

### Quality metrics and guardrails (v0 targets)
"Floor" = must hit before the demo is published. "Target" = what we aim for.

| Metric | Definition | Floor | Target | How the number was derived |
|---|---|---|---|---|
| Search relevance | Precision@3: share of the top 3 results that are the intended kind of item, over the eval set | 80% | 90% | A wrong item in the top 3 wastes the user's attention but doesn't mislead them, so it's the most forgiving metric |
| Faithfulness (guardrail) | Every price, discount, code and condition spoken or shown exists in the retrieved data. Counted per response | 0 errors in 60 test conversations | Same | A wrong price breaks trust for a cost-conscious user. Also enforced by a code check before speaking, not only measured |
| Response speed, Phase 1 | Time from end of speech to first audio. p50 and p90 | p50 ≤ 7s, p90 ≤ 10s | p50 ≤ 5s, p90 ≤ 8s | Phase 1 is not streaming and searches several platforms. Human conversation gaps are well under a second and good voice agents aim around one second, so 1s is a Phase 2 goal, not Phase 1. A "searching" audio cue is used to cover the wait |
| Speech recognition | Brand and product-term accuracy on Hinglish recordings. Word error rate is reported, not gated | ≥ 70% | ≥ 85% | Baseline from the first run: about 67% on the first set and 77% on the held-out set, counting agreed spelling variants as correct. The target assumes brand repair and "did you mean" confirmation (spec 04). Measured as key-term accuracy, not word error rate, because Hinglish spelling varies |
| Discount correctness (descoped with offers, see spec 02) | On ~25 labelled cases, is "applicable" correct? | 0 false "applicable" claims | ≥ 90% overall correct | Saying a discount applies when it doesn't is worse than missing a real one |
| "I don't know" behaviour (guardrail) | On ~10 unanswerable queries, the agent says nothing matched and does not invent | 9 of 10 | 10 of 10 | An invented product is a faithfulness failure |
| Cost per session (guardrail) | Your cost per session. Sarvam is on the visitor's key | ≤ ₹2 | ≤ ₹1 | Search credits: ₹500 buys 2,500 credits, so about ₹0.2 per credit. A 3-platform search is about ₹0.6, so a 3-search session is about ₹1.8 before caching |

### How targets work (calibration)
These are v0 targets. After the first baseline run on the eval set, each target is re-confirmed or changed, with the reason added to the decisions log. A target changed after seeing results needs a reason, so we don't quietly move goalposts.

## 7. Decisions log

| Date | Decision | Reason |
|---|---|---|
| 2026-10-17 | Domain: fashion | Grocery already covered in another project |
| 2026-10-17 | Language: English + Hinglish | Target user |
| 2026-10-17 | Pipeline: hand-rolled, press-to-talk (Phase 1) | Learning goal, speed |
| 2026-10-17 | Web app only | Scope |
| 2026-10-17 | Sarvam key is BYOK; DesiDime offers via the user's own account (backend OAuth) | Cost control and privacy |
| 2026-10-17 | DesiDime offers descoped (spec 02); the discount-correctness metric goes with it | Time goes to the speech evaluation |
| 2026-10-28 | **Known limitation:** the speech test set has a single speaker (the PM) with a fan running in the background; no second speaker was available | Accuracy figures describe one voice and one accent and must not be read as the target users' average. A second and third speaker is the first fix when someone is available |
| 2026-10-28 | Speech baseline measured with the harness: brand accuracy 67% (held-out 69%), below the 70% floor; product words 91% | The floor stays; the gap is handled by confirmation questions and a type-instead fallback, and the result is reported honestly |
| 2026-10-17 | Core search: multi-platform through QuickCommerceAPI; deals are an add-on on the top 3 | Scope |
| 2026-10-17 | Persona: Neha, 27, Raipur | Drafted by Claude at PM's request; to be validated |
| 2026-10-17 | Replies in the user's language | PM decision |
| 2026-10-17 | v0 metric targets set; recalibrate after baseline run | Targets need data |
| 2026-10-17 | Tiebreaker: platform user ratings | PM decision |
| 2026-10-17 | Pincode serviceability skipped in v1 | PM decision |
| 2026-10-17 | Clarifying questions: first set to "ask", then reverted to "search first" (max one question, only if too vague) | PM decision |
| 2026-10-17 | Speed targets revised: floor p50 ≤ 7s and p90 ≤ 10s; target p50 ≤ 5s and p90 ≤ 8s | Data spike: one search alone takes 2 to 4 seconds. PM set p90 ≤ 10s; the other three numbers are Claude's proposals |

## 8. PM actions (outside the build)

1. **Time the manual task.** Search for 3 specific fashion items across Myntra, Flipkart and Amazon with a stopwatch. Record time to shortlist and what you found. This is the baseline the product has to beat.
2. **Talk to 3 to 5 people** who match the persona. Ask how they search for hard-to-find items and whether they use voice.
3. **Write the first 20 eval queries** (see spec 06). Include brand names, Hinglish phrasing, and a few unanswerable ones.
