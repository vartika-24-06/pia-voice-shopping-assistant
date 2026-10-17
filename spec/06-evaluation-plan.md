# Spec 06: Evaluation Plan

**Status:** CLOSED v1.0 (2026-10-17), with two clips left to record (c17, c18). Scoring rules and the three-band brand rule are agreed; the naturalness rubric is adjusted after the PM hears Pia.
**Learning goal this serves:** understand voice AI and how it is evaluated.

---

## 1. What the evaluation must answer
1. Where does the voice pipeline fail, and at which stage? (diagnosis, not just a score)
2. Do the products meet the targets in spec 01?
3. What changed between runs, and did it help?

## 2. Layers

| # | Layer | Question | Metric | Scoring | Judge |
|---|---|---|---|---|---|
| 1 | Speech recognition | Did it hear the key words? | **Key-term accuracy** (brands, product types) with agreed variants. Word error rate is reported, not gated | Automatic, using the variants list (section 4) | Automatic; variants approved by PM |
| 2 | Understanding | Did the LLM extract the right search and call the right tool? | Intent accuracy: product type, brand, price limit, category, platform | Compare to expected tool call | Automatic |
| 3 | Retrieval | Are the top 3 relevant, correctly grouped and correctly ranked? | Precision@3; grouping errors; ranking follows the rule in spec 03 | Labelled by PM on a sample; ranking rule checked in code | PM + automatic |
| 4 | Response | Are all prices and offers real? Is the reply in "aap", feminine grammar, the language the user selected (English or Hinglish, whatever language they spoke), correct Hinglish grammar, within the speech budget? | Hallucinated facts per 100 replies; register violations; reply length | Automatic checks on every reply | Automatic |
| 5 | Speech output | Does the Hinglish sound right? | Naturalness 1 to 5 on a sample | Human listening | PM |
| 6 | Speed | How long does each stage take? | p50 and p90 per stage and total | Timing logs | Automatic |
| 7 | Whole task | Did the user get what they wanted? | Task success on full conversations | Judged against the expected outcome | PM |

## 3. Datasets

| Set | What | Size now | Status |
|---|---|---|---|
| Speech set | Your recordings, English and Hinglish, fan noise throughout | 39 clips | Exists (`recordings/`) |
| Held-out brand set | The 13 later brand clips. Never used to tune anything | 13 of the 39 | Exists. Rule: keep untouched |
| Conversation set | Full multi-turn conversations with expected outcomes | 0 | **[PM TO WRITE]** 20 conversations (template in section 5) |
| Offers set | Products with known offers and known conditions, labelled applicable or not | 0 | Later, once DesiDime access works. About 25 cases |
| Refusal and no-match set | Out-of-scope and unanswerable requests | A few in the speech set | Part of the conversation set. At least 10 |

## 4. Scoring rules

### 4.1 Brand accuracy (PM agreed that spelling variants count as correct)
A heard brand is correct if it is an exact match or an **approved variant**. Below, the variants seen so far, with a proposed verdict. **[PM TO DECIDE]** approve or reject each.

| Intended brand | Heard as | Proposed verdict | Note |
|---|---|---|---|
| Moxie | Moxy | Accept | Your rule |
| Reebok | Rebuck, रीबक | Accept | Close in sound |
| Kay Beauty | K Beauty, K-Beauty | **Confirm** | Could mean Kay Beauty (Katrina Kaif's brand) or Korean beauty. Pia asks which |
| Onitsuka Tiger | Honetsuka | **Confirm** | The brand is close, but the next word came out as "Snickers" (a chocolate). Pia asks whether the user means Onitsuka Tiger sneakers |
| Wanderlust | Wonderlust | Accept | |
| Andamen | Andaman | Accept | PM decision: search for the brand. Context ("shirt") makes the place name unlikely |
| Puma | Pooma, पूमा, पुमा | Accept | |
| Nykaa | Ika, आईका | Reject (Ika), accept (नायका) | |
| Revlon | Revolon | Accept | |
| Asics | A6, ए सिक्स | Reject | Not the same sound |
| Van Heusen | van and Hughes and West | Reject | |
| Maybelline | Table Line | Reject | |
| Schwarzkopf | Thorax, scorp | Reject | |
| Fabindia | Crab India | Reject | |
| Hush Puppies | harsh papis | Reject | |

**Three verdicts (proposed from the PM's input):**
- **Accept:** a harmless spelling or sound variant. Counts as correct, and Pia searches straight away.
- **Confirm:** the heard text could mean two things (a brand and a common word or category). Pia asks one short question naming the brand. Scoring: asking the question is correct; silently searching either meaning is incorrect, even if it happens to be the right one.
- **Reject:** not the intended brand. Counts as a miss.

Pia's confirmation is the "repeat back what she heard" step already in spec 03 (failure 2), so it does not add a new kind of question. It stays within "at most one clarifying question" per request.

**PM's general rule (v1, to be tightened):** accept if the heard brand sounds similar to a known brand; confirm if there is ambiguity in finding the exact brand; if there is no brand match and no ambiguity, say so and ask the user to type it or pick from preset brands.

**Open point in the rule:** the PM's example ("andamaan shirt dikhao" leading to "do you mean Andamen?") shows a confirmation, while the decision on "Andaman" is to search straight away. Proposed way to reconcile them, using a similarity score against the brand list:
- High similarity to exactly one brand, and no other meaning: **accept**, search.
- Medium similarity, or more than one candidate, or the brand is also a common word: **confirm** by showing the candidate brands (name and logo) on screen to tap.
- Low similarity: **no match**, ask the user to type the brand or pick from preset brand chips.

Cut-off values are set from the evaluation data (the earlier test found zero false matches at 0.8 similarity on a small sample). **[PM TO DECIDE]** confirm this three-band version.

### 4.2 Intent accuracy
**Rule (v1):** each part is scored separately (product type, brand, colour, price limit, category, platform), and two figures are reported: accuracy per part, and the share of requests where **all** parts are right. Colour is scored as "was it passed into the search text", because results are not verified for colour (spec 04). **Invented filters count as errors:** a platform, brand or price limit the user did not say (seen once in the first browser check: `platform: Myntra` was added unprompted). Proposed by Claude; PM can change.

### 4.3 Grounded claims
Every price, discount, rating, coupon code and condition that Pia speaks or shows must appear in the data returned by the tools. Checked automatically. Target: zero in the final run (spec 01).

### 4.4 Retrieval
Precision@3: a result is relevant if it is the kind of item asked for (colour is not checked, see spec 04, limitations). Labelled by the PM on a sample of at least 30 searches.

### 4.5 Naturalness rubric (speech output)
**Draft rubric (v1, to be adjusted after the PM hears real samples of Pia):**
- **5:** sounds like a fluent Hinglish speaker; English words (brands, product names) pronounced naturally; feminine grammar correct; steady pace.
- **3:** understandable, but one or two words are clearly mispronounced or the rhythm is flat or rushed; grammar correct.
- **1:** hard to follow, many mispronunciations, wrong gender in grammar, or sounds like two different voices (a Hindi voice reading English words).
Scored on 20 spoken replies; the PM listens without seeing the text first.

## 5. Conversation template (for the PM's 20 conversations)

**First draft of the 20 conversations (Claude, from the PM's recordings; PM reviews).** "Audio" is the recording used as the user's spoken turn. Rows marked **[to record]** need a new recording. Every conversation also gets the automatic checks in layer 4 (grounded prices, "aap", feminine grammar, speech length).

| id | Type | User turns | A correct result contains | Must not appear |
|---|---|---|---|---|
| c01 | Simple | Audio q01: "lime green saree ka petticoat chahiye" | Petticoats; lime green passed into the search; top 3 with prices | Claim that results are lime green |
| c02 | Simple | Audio q03: "asics ke running wale gel wale shoes chahiye" | Asics running shoes (brand corrected from "A6" by platform search or repair) | Other brands as the top pick without saying so |
| c03 | Simple | Audio q27: "i need a pair of nice jeans" | Jeans, top 3 with prices | |
| c04 | Simple | Audio q29 (simple, en): "striped tshirt please" | T-shirts; stripes in the search text | Claim that stripes are verified |
| c05 | Simple | Audio q28 (simple, en): "white linen shirt" | Linen shirts, top 3 | |
| c06 | Simple | Audio q05: "i need a van & heusen vest" | Van Heusen vests (brand heard wrongly; platform search recovers it) | A different brand silently |
| c07 | Brand | Audio q20: "schwazkorf ka hair mask dikhao" | Schwarzkopf hair masks, or a candidate-brand confirmation | An unrelated brand's product as the top pick |
| c08 | Brand | Audio q22: "zara jaise kapde chahiye" | Zara-style clothing (Zara or similar); Pia says if Zara itself is not available | Pretending Zara is in the results if it is not |
| c09 | Brand | Audio q32: "fabindia ki nehru jacket chahiye" | Fabindia Nehru jackets, or a confirmation from "Crab India" | "Crab India" searched literally with no confirmation |
| c10 | Brand | Audio q36: "revlon kajal" | Revlon kajal, top 3 | |
| c11 | Misheard / confirm | Audio q23: "kay beauty ki creamy wali lipstick milegi" | Pia confirms Kay Beauty vs Korean beauty (on screen chips) | Silently searching either meaning |
| c12 | Misheard / confirm | Audio q39: "onitsuka sneakers" | Pia confirms Onitsuka Tiger sneakers | Snickers (chocolate) results |
| c13 | Follow-up | q12 "mujhe purple saree ka blouse chahiye" then q16 "purple ke alawa green nai chalega iss par" | Second search for green blouses with the saree context kept | Forgetting that it is a saree blouse |
| c14 | Follow-up | q12 then q18 "iske alawa white mein nai milega kuch" | New search with white; context kept | Claim that results are white |
| c15 | Follow-up | q03 then q17 "show me isse accha kuch" | "Better" is vague, so Pia shows preset choices on screen to tap: **higher rated, higher priced, new search** | Guessing one meaning silently |
| c16 | Follow-up | q27 then q19 "aur dikhao" | The next 3 results (ranks 4 to 6 in the same order) | Repeating the same 3 |
| c17 | No match | **[to record]** "ferrari ke white sneakers 1500 ke andar" | The no-match pattern (spec 03), repeating the search; then a budget change works | Invented products |
| c18 | No match | **[to record]** "huda beauty ka concealer 100 rupaye ke andar" | No-match pattern with the price named | Products above 100 presented as matches |
| c19 | Out of scope | Audio q08: "aaj dinner mein kya banaoon" | Polite redirect to fashion search | A recipe |
| c20 | Out of scope | Audio q14: "where can i find a black labrador puppy" | Polite redirect | Pet shop results |

Note on the files: the earlier clip "casual tshirts to go with jeans" was overwritten by a recorder bug, so c05 uses the later "white linen shirt" clip in its place.

## 6. Method
- **Baseline run:** run everything once on the current build. Store the results with the date and the setup used.
- **Change one thing at a time,** then re-run and compare to the baseline.
- **No tuning on the held-out set.** If it is used to tune, record that and build a new held-out set.
- **Small samples:** with 60 cases, "no errors" still allows a true error rate of up to about 5%. Reports state the sample size next to every figure.
- **Targets** from spec 01 are re-confirmed after the baseline, with the reason written down.

## 7. Results so far (speech layer, 2026-10-17)
See `tools/eval/STT_FINDINGS.md`. In short: translit gives Roman text; brands recovered about two thirds of the time; brand biasing hurt on held-out clips; layered repair is planned.

## 8. Report template for the write-up
1. What I built and for whom (spec 01).
2. How I evaluated it (layers, sets, rules).
3. Results per layer, with sample sizes.
4. What failed and why, with examples.
5. What I changed and what happened.
6. What I would do next.
