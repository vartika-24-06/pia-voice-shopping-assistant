# Spec 02: Goals and Non-Goals

**Status:** CLOSED v1.2 (2026-10-17; DesiDime offers descoped, see section 8). Assumed non-goals are accepted as written. v1.1: platforms changed to Myntra, Amazon and Nykaa with category routing; duplicates are grouped (section 7).
**Owner:** PM. Non-goal reasons drafted by Claude at PM's request.

---

## 1. Product goals

For the persona in spec 01 (Neha, tier 2/3, cost-conscious, Hinglish):
1. She can say what she wants and see the best-priced matching options across Myntra, Amazon and Nykaa (routed by category), in one place.
2. She can refine the results by speaking, in the language she naturally uses.
3. *(Descoped on 2026-10-17, see the decision log.)* For the product she picks, she can find the best applicable offers without leaving the conversation.
4. She always gets a trustworthy answer: never an invented price, and a clear "nothing matched" when that is true.

## 2. Portfolio and learning goals

1. Demonstrate an understanding of how a voice AI product works end to end (speech in, reasoning with tools, speech out) and how it is evaluated.
2. Demonstrate sound tool design: a tool layer behind a clean interface, and honest handling of third-party limits. (Third-party sign-in with OAuth was descoped; see the decision log.)
3. Show product judgment: defined user, measurable targets, explicit trade-offs, documented cuts.
4. **PM's own learning goal:** understand how voice AI works, and how voice AI is evaluated.

## 3. Scope

### Must (Phase 1)
| Feature | Fallback if it fails |
|---|---|
| Press-to-talk voice input in English and Hinglish | None. Core |
| Spoken replies in the user's language | None. Core |
| Search across 3 platforms (Myntra, Amazon, Nykaa), routed by category: clothing, footwear, accessories and jewellery to Myntra and Amazon; beauty to Myntra first, then Nykaa as a second source using a query reworded from Myntra's results | Frozen snapshot of results |
| Top 3 results by price, user ratings as tiebreaker | None. Core |
| Spoken follow-up refinement (price, brand, platform, "thoda sasta"). Colour words ("black mein") are added to the search text but results are **not verified for colour** | None. Core to the voice hypothesis |
| On-screen cards with links to each platform | None. Core |
| Saying clearly when nothing matches | None. Core |
| "Show more" by voice: the next 3 results | None. Core |
| Vague follow-ups such as "isse accha kuch" answered with preset choices on screen (higher rated, higher priced, new search) | None |
| BYOK for the Sarvam key | **Recorded demo** for visitors without a key |
| Eval set and scoring harness | None. Core to the portfolio |
| Public write-up of results and learnings (lightweight) | None. Core to the portfolio |

### Should (stretch)
- Usage and cost shown to the user during a session

### Cut order if time runs short
Cut from the top, and never cut below the Must line:
1. Usage and cost display
2. Nykaa (beauty would then route to Myntra only). The three platforms are the plan; this is only the last-resort cut

*(Draft order proposed by Claude. PM to confirm or reorder.)*

## 4. Non-goals

Each is a deliberate cut, with the reason.

| Non-goal | Because |
|---|---|
| **Barge-in** (interrupting the assistant) | It needs streaming audio and automatic speech detection. Phase 1 is turn-based by design; this is a Phase 2 topic |
| **Re-ranking by effective price after offers** | DesiDime's rate limit makes checking offers on every result impractical. Offers are checked on the one product the user picks. Ranking is therefore by listed price, and the assistant says "lowest listed price", never "cheapest overall". The user can check offers on a second option the same way, one at a time. Gives up the "cheapest sticker price loses to a better offer" moment |
| **Provider comparison** (Sarvam vs other STT/TTS) | Time. The evaluation focuses on one stack done well |
| **Pincode and delivery checks** | The data source's serviceability data is unverified, and the limitation is stated in the app. Not needed to prove the core idea |
| **Checkout and payments** | Money movement adds risk and does not support the learning goals |
| **User accounts and history** | Not needed; session-only keeps privacy simple |
| **Price-drop watchlist** | Needs background jobs and notifications. A separate product feature |
| **Voice-based product comparison** | A second conversation mode with its own design and tests. Out of scope for a first version |
| **Streaming and automatic end-of-speech detection** *(assumed, confirm)* | Phase 2. Press-to-talk is the Phase 1 decision |
| **Other Indian languages** *(assumed, confirm)* | English and Hinglish are the target user's languages. More languages multiply the eval work |
| **Stacking several offers into one final price** *(assumed, confirm)* | Needs precise rules on how offers combine, and a large labelled test set |
| **Offers and coupons from DesiDime** *(descoped 2026-10-17)* | Needs a per-user sign-in flow, token handling, rate-limit care and an unresolved terms question. The time is better spent on the speech evaluation. Kept in the specs as a documented option for later |

## 5. Phase 1 is done when
- Every Must works end to end on a laptop browser.
- All floors in spec 01 section 6 are met, or the misses are explained in the write-up.
- The recorded demo exists as the fallback.
- The write-up is published.

## 6. Notes on ranking

- Ranking basis: listed price among relevant results; platform user rating as tiebreaker.
- Brand: if the user names a brand, relevance handles it. If they don't, they can narrow by brand through a spoken follow-up (a Must).

## 7. Duplicates across platforms (decided)

If the same product is listed on more than one platform, it is shown as **one product with a price per platform**. This needs a matching rule (the data source does not list EAN/SKU, so matching has to use brand and title similarity). The rule and its error handling go in spec 04, and wrong matches are measured in the evals.

Category scope (decided): clothing, footwear, fashion accessories, jewellery and beauty.

## 8. Decisions log

| Date | Decision | Reason |
|---|---|---|
| 2026-10-17 | Follow-up refinement is a Must | Spec 01's voice hypothesis depends on it |
| 2026-10-17 | Barge-in is a non-goal for v1 | Needs streaming; Phase 1 is turn-based |
| 2026-10-17 | Public write-up is a Must (lightweight) | It is the deliverable a hiring manager reads |
| 2026-10-17 | DesiDime offers on the picked product only, one at a time | Rate limit and scope |
| 2026-10-17 | Fallback for BYOK and DesiDime is a recorded demo | PM decision |
| 2026-10-17 | **DesiDime offers descoped.** Moved from Must to a non-goal; the time goes to a speech-evaluation harness | The learning goal is voice AI and how it is evaluated, and the biggest lessons so far came from recognition and pronunciation, not offers. DesiDime also needed per-user sign-in, token handling and an unresolved terms question |
