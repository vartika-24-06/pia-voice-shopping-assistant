# Spec 04: Functional Spec

**Status:** CLOSED v1.0 (2026-10-17). Mostly engineering, drafted by Claude from specs 01 to 03 and the data spike (`spike/FINDINGS.md`). The PM accepted all four proposals in section 9.

---

## 1. Categories and routing

In scope: clothing, footwear, fashion accessories, jewellery, beauty. Anything else is refused by Pia (spec 03, rule 9).

| Category | Platforms |
|---|---|
| Clothing, footwear, accessories, jewellery | Myntra and Amazon, searched in parallel |
| Beauty | Myntra first. Then Nykaa as a second source, with a query reworded from Myntra's results (for example "lipstick" becomes "matte lipstick"). If Nykaa returns nothing, use Myntra's results alone |

Routing is decided by the LLM when it calls the search tool (it passes a category).

## 2. Tools (exposed by the backend as a small MCP server)

| Tool | Input | Output | Cost |
|---|---|---|---|
| `search_products` | `query`, `category`, optional filters: `max_price`, `brand`, `platform`, `sort` (`lowest_price` by default, or `highest_rating` / `highest_price` for the "isse accha kuch" presets), and `page` (1 = top 3, 2 = next 3, and so on; later pages come from the already-fetched, cached results and cost no extra credits) | Up to 3 product groups, ranked (section 4), each with listings per platform | 1 credit per platform searched |
| ~~`find_offers`~~ *(descoped 2026-10-17)* | `product_group_id` (the one the user tapped) | Applicable offers (coupon codes, bank offers, price-drop note) from DesiDime, or a status: `not_connected`, `rate_limited`, `none_found` | DesiDime rate limit |

The browser runs the conversation with Sarvam and calls these two tools on the backend. A third tool, `show_choices` (kind `refine`), runs in the browser only: it shows the "higher rated / higher priced / new search" buttons when a request is vague. Platform buttons ("All", "Myntra", "Amazon" or "Nykaa") under the results re-run the **last search for that store directly: no model call and no voice** (found on the live site: a tab tap used to speak "Myntra par hi dikhao" and the model lost the brand). If the store has nothing, a note under the buttons says where results do exist (for beauty the other store is Nykaa). The search summary sent to the model always names the brand. The Sarvam key stays in the browser.

## 3. Data model

**Listing** (one product on one platform), normalised from QuickCommerceAPI:
`platform`, `platform_product_id`, `name`, `brand`, `mrp`, `offer_price`, `discount_pct` (computed from MRP and offer price), `rating`, `rating_count`, `is_rated` (false when the rating is missing or 0), `image_url`, `link`, `available`.

**Product group** (what the user sees): `group_id`, `display_name`, `brand`, `listings[]` (one or more platforms, each with its price), `best_listing` (the lowest-priced one).

**Fields we do not have:** colour, gender, category, discount percentage from the source, and anything about offers (descoped).

## 4. Search and ranking pipeline (one turn)

1. Speech to text (Saaras v3, `translit` mode, which returns Roman letters). Then a brand check, in layers: (a) trust the platform search where it recovers the brand by itself; (b) a cautious fuzzy match of the heard words against known brands (similarity at least 0.8); (c) if a brand-like word is still unrecognised, Pia repeats back what she heard (spec 03, failure 2). Brand biasing (`keyterms`) is not used: on held-out clips it replaced correct words with listed brands.
2. LLM (Sarvam-105B, reasoning off) extracts intent: query text, category, filters. It calls `search_products`.
3. Backend calls the platforms in parallel, normalises the listings.
4. **Same-platform duplicates:** listings with the same name on one platform are collapsed to the lowest-priced one.
5. **Cross-platform grouping:** two listings are the same product if the normalised brand matches, the MRP is equal, and the titles are similar enough (threshold to be tuned). The spike shows this works for the Puma Smashic sneaker (MRP 4,499 on both Myntra and Amazon).
6. **Quality gate** (spec 03, section 2): rating at least 3.5 and at least 20 reviews. Unrated items are included only if fewer than 3 rated items pass, ranked after the rated ones.
7. **Sort** by lowest listed price; rating breaks ties. Take the top 3 groups.
8. LLM writes the spoken line (under 15 seconds, spec 03) about the top pick. The screen shows all 3 cards.
9. Text to speech (Bulbul V4 Flash, female voice).

**Speed budget (estimates, to be measured):** speech to text 1 to 2s, LLM 1 to 3s, search 2 to 4s, text to speech 1 to 2s, which totals roughly 5 to 11 seconds against the p90 ≤ 10s floor. The tightest stage to tune is the LLM (reasoning off) and running the two platform searches in parallel. A short "searching" cue plays while the search runs.

### 4a. Brand list (for the brand check in step 1)
- **Source:** the `brand` field of every product the platforms return. The list grows with each search (cached). It can be seeded with a few dozen category searches ("shirts", "sneakers", "lipstick" and so on), at one credit each.
- **Aliases:** each time a user confirms a correction ("Crab India" means Fabindia), the pair is stored as an alias for the session's list, the way portals learn from search logs.
- **Normalisation:** brand fields vary ("PUMA Motorsport", "Puma"). Map them to one parent brand name where possible.
- **Not used:** scraping retailer websites directly. Their terms prohibit it and the search API already returns brands.
- **Three bands (built in step 4):** exact or very close to one known brand (similarity at least 0.8): accept and search; moderately close (0.62 to 0.8) or a known ambiguous spelling ("K Beauty", "Honetsuka"): no search, the screen shows the candidates as buttons and Pia asks once; nothing close: search as heard (the brand list is incomplete, so an unknown brand is not proof of a mishearing). Confirmations cost no search credits. Known ambiguous spellings are also checked on what the user said **before the model sees it** (`/api/ambiguity`), because the model can silently rewrite "K Beauty" into "Korean" and search before the backend ever sees the original words (found in the second retest).
- **Screen confirmation:** when a brand needs confirming, the candidates show as tappable chips with name and logo (logos from product images if available), so Pia need not spend another voice turn.

## 5. Offers flow (DesiDime): DESCOPED on 2026-10-17

*Kept for the record and for a possible later version. It is not being built; spec 02 gives the reason.*

1. The user taps a product card.
2. If DesiDime is not connected, the screen shows a "Connect DesiDime" button (backend OAuth flow). Pia says nothing about login by voice.
3. If connected, the backend queries DesiDime for the store plus product keywords, filters to `live` deals and coupons, and returns the best applicable offer with its conditions.
4. Pia speaks one line: the best offer found and the price after it, or says plainly that none was found.
5. Fallback for visitors who skip this: the recorded demo (spec 02).

**Known limits:** deal data is community-posted. The sale price is inside the title text, not a structured field. There is no expiry date, so staleness is judged from the post date and score. Many deals are brand-wide sales, not one product, and Pia does not present a brand-wide discount as a product's price. Calls are rate limited, so the backend caches and spaces them out.

## 6. State kept during a conversation

`current_query`, `category`, `filters` (max price, brand, platform), `last_results`, `selected_product`. A spoken follow-up changes the filters and runs the search again. Nothing is stored after the session.

## 7. Screens

1. **Key screen:** language choice (English or Hinglish, shown first, switchable on both screens and remembered for the tab), Sarvam key (required), name and gender (optional, for greetings and grammar), note that nothing is stored outside the browser, and a link to the recorded demo.
2. **Intro page** (before the key form): a warm headline, one line on what Pia does, a three-step "How it works", the try-it card, a link to the GitHub repository, and a disclaimer (portfolio project, not affiliated with the stores, prices may differ).
3. **Conversation screen (redesigned, light theme, minimal):** chat bubbles with Pia's name and avatar, only the latest exchange open (older ones folded under "Earlier"), a loudspeaker icon on each Pia reply (tap to stop or replay), example chips in the chosen language before the first message, a round mic icon with sound waves while listening, product cards as a swipe row on phones and a right-hand panel on wide screens, a keyboard button beside the mic that opens a **type-instead box**, a small pencil on each spoken bubble to **fix what the recogniser heard** (the text opens in the box to edit and resend), and a Details drawer for speed and checks (including how often typing or correcting was used). The earlier description follows for reference. **Main screen (earlier version):** a large press-to-talk mic button (disabled while Pia speaks), a visible state (listening, thinking, speaking), a stop button, three product cards (image, name, price per platform, rating, link), a DesiDime connect button, and an optional usage and cost line (Should).

## 8. Known limitations (to state in the app and the write-up)
- Colour is not verified in results (no colour field).
- Ratings are missing for many items; unrated items appear only as a fallback.
- Nykaa search is inconsistent.
- No pincode or delivery check.
- Product matching across platforms can be wrong.
- Offers are not offered (descoped, see spec 02).

## 9. Decisions (PM accepted each "I propose" below)
1. **Loud failure or quiet?** When one platform fails (timeout or error), does Pia mention it ("Amazon abhi nahi mila") or show the other platform's results silently? I propose mentioning it, in one short line.
2. **Grouping error cost.** If two different products are wrongly grouped, the price shown could mislead. Is it safer to group only when very sure (fewer groups, more duplicate cards), or group aggressively? I propose cautious.
3. **How many listings to show per group:** all platforms with prices, or only the cheapest with "also on Amazon"? I propose all, since it supports the "best price across platforms" promise.
4. **Language of cards on screen:** English product names (as platforms give them) with Hinglish labels, or fully English UI? I propose English product names and Hinglish labels.
