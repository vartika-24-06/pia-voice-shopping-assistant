# Speech evaluation: v3_translit

Run on 2026-10-28 with 56 clips (13 held-out). Setup: `{"model": "saaras:v3", "mode": "translit", "language_code": "unknown"}`.
Scoring rules: agreed spelling variants count as correct (`brand_variants.json`); hesitations in what was said are ignored; numbers are compared as digits; word error rate is reported but not used as a pass mark (Hinglish spelling varies).
**Limitation:** all clips are one speaker (the PM): 41 recorded with a fan running, 15 in a quiet room. The figures describe one voice and one accent, not all users.

## Summary

| Measure | All clips | Held-out only | Round 2 only (q43 onwards) |
|---|---|---|---|
| Brand accuracy (exact or agreed variant) | 65% (20/31) | 69% (9/13) | 50% (2/4) |
| Brands: exact / variant / needs confirm / missed | 14 / 6 / 2 / 9 | 6 / 3 / 1 / 3 | 1 / 1 / 0 / 2 |
| Product and colour words heard | 92% (77/84) | 95% (18/19) | 95% (18/19) |
| Prices heard correctly | 100% (6/6) | n/a | 100% (4/4) |
| Clips heard exactly (after normalising) | 57% (32/56) | 38% (5/13) | 60% (9/15) |
| Word error rate (reported only) | 0.11 | 0.20 | 0.10 |
| Clips returned in the wrong script (Devanagari) | 0 | 0 | 0 |
| Time per clip (mean / p90, seconds) | 0.64 / 0.95 | 0.79 / 0.68 | 0.47 / 0.53 |

## Error types

| Type | Count (all) | Count (held-out) | Count (round 2) |
|---|---|---|---|
| brand_confirm_needed | 2 | 1 | 0 |
| brand_misheard | 9 | 3 | 2 |
| brand_variant_accepted | 7 | 4 | 1 |
| term_dropped | 1 | 0 | 1 |
| term_misheard | 3 | 0 | 0 |
| word_dropped_end | 1 | 0 | 1 |
| word_dropped_middle | 1 | 0 | 0 |
| word_inserted | 2 | 1 | 1 |

*Accepted variants are not errors; they are listed so you can see them.*

## By language

| Group | Clips | Brand accuracy | Terms heard | Clips exact | Word error rate |
|---|---|---|---|---|---|
| en | 12 | 86% (6/7) | 89% (16/18) | 58% (7/12) | 0.09 |
| hinglish | 44 | 58% (14/24) | 92% (61/66) | 57% (25/44) | 0.12 |

## By clip type

| Group | Clips | Brand accuracy | Terms heard | Clips exact | Word error rate |
|---|---|---|---|---|---|
| brand | 22 | 62% (15/24) | 93% (26/28) | 36% (8/22) | 0.19 |
| followup | 6 | n/a | 100% (7/7) | 83% (5/6) | 0.03 |
| noisy | 3 | 100% (1/1) | 100% (7/7) | 100% (3/3) | 0.00 |
| simple | 19 | 50% (2/4) | 90% (28/31) | 63% (12/19) | 0.09 |
| tricky | 6 | 100% (2/2) | 82% (9/11) | 67% (4/6) | 0.07 |

## By background noise

| Group | Clips | Brand accuracy | Terms heard | Clips exact | Word error rate |
|---|---|---|---|---|---|
| extra noise (tv, motor, reels) | 3 | 100% (1/1) | 100% (4/4) | 67% (2/3) | 0.05 |
| fan running | 38 | 65% (17/26) | 90% (55/61) | 55% (21/38) | 0.12 |
| quiet room | 15 | 50% (2/4) | 95% (18/19) | 60% (9/15) | 0.10 |

## Every brand mention

| Clip | Brand | Said | Heard as | Result |
|---|---|---|---|---|
| q03_simple_hinglish | Asics | asics | a6 | MISSED |
| q04_simple_hinglish | Marks & Spencer | marks & spencers | marks and spencers | correct |
| q05_simple_hinglish | Van Heusen | van & heusen | van and hughes and west | MISSED |
| q06_simple_hinglish | Moxie | moxie | moxy | correct (variant) |
| q07_brand_hinglish | Garmin | garmin | garmin | correct |
| q13_noisy_hinglish | Huda Beauty | huda beauty | huda beauty | correct |
| q20_brand_hinglish | Schwarzkopf | schwazkorf | thorax | MISSED |
| q21_brand_en | H&M | h&m | h and m | correct |
| q22_brand_hinglish | Zara | zara | zara | correct |
| q23_brand_hinglish | Kay Beauty | kay beauty | k beauty | needs a confirmation question |
| q24_brand_hinglish | Maybelline | maybelline | table line | MISSED |
| q25_brand_hinglish | Reebok | reebuk | rebuck | correct (variant) |
| q29_brand_en (held-out) | Calvin Klein | calvin clean | calvin klein | correct |
| q31_brand_en (held-out) | Biba | biba's | bibas | correct (variant) |
| q32_brand_hinglish (held-out) | Fabindia | fabindia | crab india | MISSED |
| q33_brand_hinglish (held-out) | Puma | pooma | puma | correct |
| q34_brand_hinglish (held-out) | Nykaa | nykaa | ika | MISSED |
| q34_brand_hinglish (held-out) | Wanderlust | wanderlust | wonderlust | correct (variant) |
| q35_brand_hinglish (held-out) | Andamen | andamen | andaman | correct (variant) |
| q36_brand_hinglish (held-out) | Revlon | revlon | revlon | correct |
| q37_brand_en (held-out) | Benefit Cosmetics | benefit cosmetics | benefit cosmetics | correct |
| q38_brand_en (held-out) | Fenty Beauty | fenty beauty | fenty beauty | correct |
| q38_brand_en (held-out) | Rare Beauty | rare beauty | rare beauty | correct |
| q39_brand_en (held-out) | Onitsuka Tiger | onitsuka | honetsuka snickers | needs a confirmation question |
| q40_brand_hinglish (held-out) | Hush Puppies | hush puppies | (dropped) | MISSED |
| q41_tricky_hinglish | Ferrari | ferrari | ferrari | correct |
| q42_tricky_hinglish | Huda Beauty | huda beauty | huda beauty | correct |
| q49_brand_hinglish | Libas | libas | libus | MISSED |
| q50_brand_hinglish | Allen Solly | allen solly | alan solly | correct (variant) |
| q51_brand_hinglish | Lakme | lakme | lakme | correct |
| q52_brand_hinglish | Mamaearth | mumma earth | mamas | MISSED |

## Every clip

| Clip | Said | Heard | Error types |
|---|---|---|---|
| q01_simple_hinglish | lime green saree ka petticoat chahiye | Lime green saree ka petticoat chahiye | (none) |
| q03_simple_hinglish | asics ke running wale gel wale shoes chahiye | A6 ke running wale gel wale shoes chahiye | brand_misheard |
| q04_simple_hinglish | i need a marks & spencers navy blue spaghetti | I need a Marks and Spencers navy blue spaghetti. | (none) |
| q05_simple_hinglish | i need a van & heusen vest | I need a van and Hughes and West. | brand_misheard |
| q06_simple_hinglish | i need a moxie shampoo | I need a moxy shampoo | (variants only) |
| q07_brand_hinglish | i need a garmin forerunner 245 | I need a Garmin Forerunner 245. | (none) |
| q08_tricky_hinglish | aaj dinner mein kya banaoon | Aaj dinner mein kya banaun | (none) |
| q09_tricky_hinglish | how many amano shrimps should be kept together | How many Amanush shrim should be kept together? | term_misheard |
| q10_tricky_hinglish | how many times paan mein kitni baar paani dena chahiye | How many times paan mein kitni baar paani dena chahiye | (none) |
| q12_noisy_hinglish | mujhe purple saree ka blouse chahiye | Mujhe purple saree ka blouse chahiye | (none) |
| q13_noisy_hinglish | huda beauty ka concealer milega | Huda Beauty ka concealer milega | (none) |
| q14_noisy_hinglish | where can i find a black labrador puppy | Where can I find a black Labrador puppy? | (none) |
| q15_followup_hinglish | in mein se mujhe koi pasand nahi | Inmein se mujhe koi pasand nahi | (none) |
| q16_followup_hinglish | purple ke alawa green nai chalega iss par | Purple ke alawa green nahi chalega is par | (none) |
| q17_followup_hinglish | show me isse accha kuch | Show me isse achha kuchh | (none) |
| q18_followup_hinglish | iske alawa white mein nai milega kuch | Iske alava white mein nahi milega kuch | (none) |
| q19_followup_hinglish | aur dikhao | Aur dikhao | (none) |
| q20_brand_hinglish | schwazkorf ka hair mask dikhao | Thorax ka hair mass dikhao. | brand_misheard, term_misheard |
| q21_brand_en | i need floral nice flowy dresses from h&m | I need floral nice flowy dresses from H&M. | (none) |
| q22_brand_hinglish | zara jaise kapde chahiye | Zara jaise kapde chahiye | (none) |
| q23_brand_hinglish | kay beauty ki creamy wali lipstick milegi | K Beauty ki creamy vali lipstick milegi? | brand_confirm_needed |
| q24_brand_hinglish | maybelline ka mascara dikhao | Table line ka mascara dikhao. | brand_misheard |
| q25_brand_hinglish | reebuk ke joote dikhao | Rebuck ke joote dikhao | (variants only) |
| q27_simple_en | i need a pair of nice jeans | I need a pair of nice jeans. | (none) |
| q29_simple_en | striped tshirt please | Stripe T-shirt please. | term_misheard |
| q30_simple_en | what will go with a brown skirt | What will go with a brown skirt? | (none) |
| q28_simple_en | white linen srr white linen shirt | White linen sir. White linen shirt. | word_inserted |
| q29_brand_en | cla calvin clean aaa women's jacket | Calvin Klein women's jacket. | (variants only) |
| q30_tricky_en | why is the sky so blue | Why is the sky so blue? | (none) |
| q31_brand_en | i need aaa biba's kurta sets for rakshabandhan | I need Biba's kurta sets for Rakshabandhan. | (none) |
| q32_brand_hinglish | fabindia ki nehru jacket chahiye | Crab India ki Nehru jacket chahiye | brand_misheard |
| q33_brand_hinglish | pooma ke pajame milenge mere liye | Puma ke pajame milenge mere liye | (variants only) |
| q34_brand_hinglish | nykaa se wanderlust ka cherry blossom wala shower gel | Ika se Wonderlust ka Cherry Blossom wala shower gel. | brand_misheard |
| q35_brand_hinglish | andamen ki green linen shirt | Andaman ki green linen shirt | (variants only) |
| q36_brand_hinglish | revlon kajal | Revlon Kajal. | (none) |
| q37_brand_en | benefit cosmetics the brow pencil | Benefit Cosmetics the brow pencil. | (none) |
| q38_brand_en | blush from fenty beauty or rare beauty | Blush from Fenty Beauty or Rare Beauty | (none) |
| q39_brand_en | onitsuka sneakers | Honetsuka Snickers | brand_confirm_needed |
| q40_brand_hinglish | meri mummy ke liye hush puppies ki chappal | Meri mummy ne harsh papis ki chappal | brand_misheard |
| q41_tricky_hinglish | ferrari ke white sneakers 1500 ke andar | Ferrari ke white sneakers fifteen hundred ke andar | (none) |
| q42_tricky_hinglish | huda beauty ka concealer 100 rupaye ke andar | Huda Beauty concealer Rs. 100 ke andar. | word_dropped_middle |
| q43_simple_hinglish | ik black kurta chaiyye | Ek black chahiye. | term_dropped |
| q44_simple_hinglish | aur ek pink dupatta dikhao | Aur ek pink dupatta dikhao | (none) |
| q45_simple_hinglish | mere liye sandal dikhao | Mere liye sandal dikhao. | (none) |
| q46_simple_hinglish | ya phir red wala dikhao | Ya phir red wala dikhao. | (none) |
| q47_simple_hinglish | do hajaar ke neeche sneakers | 2000 ke neeche sneakers | (none) |
| q48_followup_hinglish | ya phir red wala dikhao | Ya phir red wala | word_dropped_end |
| q49_brand_hinglish | libas ka kurta set chahiye | Libus ka kurta set chahiye | brand_misheard |
| q50_brand_hinglish | allen solly ki shirt dikhao | Alan Solly ki shirt dikhao. | (variants only) |
| q51_brand_hinglish | lakme ka kajal milega | Lakme ka kajal milega? | (none) |
| q52_brand_hinglish | Mumma earth ka face wash dikhao | Mama's ka face wash dikhao | brand_misheard |
| q53_simple_hinglish | teen sau ke andar shirt | 300 ke andar shirt | (none) |
| q54_simple_hinglish | 1200 ke neeche jeans | 1200 ke neeche jeans. | (none) |
| q55_simple_en | five hundred rupees under lipstick | 500 is under lipstick. | word_inserted |
| q56_simple_hinglish | bhaiya, ek good running shoes batao | Bhaiya, ek good running shoes batao. | (none) |
| q57_simple_hinglish | something for a wedding, ummm saree ya lehenga | Something for a wedding, um saree ya lehenga. | (none) |
