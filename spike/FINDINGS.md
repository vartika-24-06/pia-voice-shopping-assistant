# Data spike findings: QuickCommerceAPI (2026-10-17)

Method: 14 single-platform searches (14 credits; 86 left of 100 free), location Raipur. Raw responses are in `spike/raw/`. Script: `spike/qc_spike.py`.

## What works
- All calls returned 200. Latency 1.7 to 3.7 seconds per call (0.5s for an empty Nykaa result). One call is one platform and one credit.
- 32 to 59 products per call, in the platform's own ranking order (field `rank`), not sorted by price.
- Fields per product: `id`, `name`, `brand`, `mrp`, `offer_price`, `rating`, `rating_count`, `images`, `deeplink`, `available`, `inventory`, `is_ad`, `rank`, platform info. No discount field (compute from MRP and offer price). No colour, gender or category field.
- `rating_count` exists, so a review-count gate is possible.

## What is messy
| Finding | Evidence |
|---|---|
| Many items have no rating | Myntra: rating 0 on 19 of 34 ("purple blouse"), 13 of 42 ("ferrari sneakers"). Amazon: rating missing on 12 of 59 ("ferrari sneakers") |
| Many items have few reviews | Fewer than 50 reviews: Amazon "ferrari sneakers" 37 of 59; Myntra "pink saree blouse" 21 of 34 |
| Colour is rarely in the title | "pink" in 4 of 34 Myntra titles and 2 of 59 Amazon titles; "white" in 0 of 32 Myntra and 7 of 48 Amazon titles |
| Query noise | Kids' sneakers in "white sneakers"; a blue sneaker on Amazon |
| Duplicates inside one platform | Same name, different prices (Myntra "Ferrari CA Pro Leather Sneakers" at 3869 and 4049); up to 11 of 42 results |
| Brand field vs query | "ferrari sneakers" returns brand "PUMA" / "PUMA Motorsport"; "ferrari" is in the title for 42 of 42 (Myntra) and 40 of 59 (Amazon) |
| Nykaa is unreliable | "lipstick": 0 results; "kajal": 0 results; "matte lipstick": 40 results |

## Cross-platform duplicates look matchable
"Puma Smashic Comfort Casual Sneakers" appears on Myntra (1664) and Amazon (1482 to 1659) with MRP 4499 on both. Titles differ slightly and the brand differs in capitals. Brand + normalised title + MRP is a strong matching signal.

## Open items for specs
- Speed target (spec 01): one search is 2 to 4 seconds before speech and reasoning are added.
- Unrated and low-review items vs the quality gate (spec 03).
- Colour handling in follow-ups (spec 04).
- Nykaa fallback (spec 04).
