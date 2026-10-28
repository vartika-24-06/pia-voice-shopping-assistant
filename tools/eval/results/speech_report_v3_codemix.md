# Speech evaluation: v3_codemix

Run on 2026-10-28 with 56 clips (13 held-out). Setup: `{"model": "saaras:v3", "mode": "codemix", "language_code": "unknown"}`.
Scoring rules: agreed spelling variants count as correct (`brand_variants.json`); hesitations in what was said are ignored; numbers are compared as digits; word error rate is reported but not used as a pass mark (Hinglish spelling varies).
**Limitation:** all clips are one speaker (the PM) with a fan running; the figures describe one voice and one accent, not all users.

## Summary

| Measure | All clips | Held-out only | Round 2 only (q43 onwards) |
|---|---|---|---|
| Brand accuracy (exact or agreed variant) | 55% (17/31) | 69% (9/13) | 0% (0/4) |
| Brands: exact / variant / needs confirm / missed | 12 / 5 / 2 / 12 | 6 / 3 / 1 / 3 | 0 / 0 / 0 / 4 |
| Product and colour words heard | 73% (61/84) | 84% (16/19) | 74% (14/19) |
| Prices heard correctly | 100% (6/6) | n/a | 100% (4/4) |
| Clips heard exactly (after normalising) | 20% (11/56) | 38% (5/13) | 0% (0/15) |
| Word error rate (reported only) | 0.50 | 0.41 | 0.66 |
| Clips returned in the wrong script (Devanagari) | 35 | 4 | 13 |
| Time per clip (mean / p90, seconds) | 0.60 / 0.93 | 0.56 / 0.67 | 0.37 / 0.45 |

## Error types

| Type | Count (all) | Count (held-out) | Count (round 2) |
|---|---|---|---|
| brand_confirm_needed | 2 | 1 | 0 |
| brand_misheard | 12 | 3 | 4 |
| brand_variant_accepted | 5 | 3 | 0 |
| number_mismatch | 1 | 0 | 1 |
| other_substitution | 38 | 3 | 15 |
| term_misheard | 13 | 0 | 3 |
| word_dropped_middle | 1 | 0 | 0 |
| word_inserted | 2 | 1 | 1 |

*Accepted variants are not errors; they are listed so you can see them.*

## By language

| Group | Clips | Brand accuracy | Terms heard | Clips exact | Word error rate |
|---|---|---|---|---|---|
| en | 12 | 86% (6/7) | 89% (16/18) | 58% (7/12) | 0.09 |
| hinglish | 44 | 46% (11/24) | 68% (45/66) | 9% (4/44) | 0.61 |

## By clip type

| Group | Clips | Brand accuracy | Terms heard | Clips exact | Word error rate |
|---|---|---|---|---|---|
| brand | 22 | 54% (13/24) | 71% (20/28) | 27% (6/22) | 0.53 |
| followup | 6 | n/a | 57% (4/7) | 0% (0/6) | 0.88 |
| noisy | 3 | 100% (1/1) | 86% (6/7) | 33% (1/3) | 0.32 |
| simple | 19 | 50% (2/4) | 81% (25/31) | 16% (3/19) | 0.40 |
| tricky | 6 | 50% (1/2) | 55% (6/11) | 17% (1/6) | 0.47 |

## By extra background noise

| Group | Clips | Brand accuracy | Terms heard | Clips exact | Word error rate |
|---|---|---|---|---|---|
| extra noise | 3 | 0% (0/1) | 75% (3/4) | 0% (0/3) | 0.75 |
| fan only | 53 | 57% (17/30) | 72% (58/80) | 21% (11/53) | 0.49 |

## Every brand mention

| Clip | Brand | Said | Heard as | Result |
|---|---|---|---|---|
| q03_simple_hinglish | Asics | asics | a6 के | MISSED |
| q04_simple_hinglish | Marks & Spencer | marks & spencers | marks and spencers | correct |
| q05_simple_hinglish | Van Heusen | van & heusen | van in houston west | MISSED |
| q06_simple_hinglish | Moxie | moxie | moxy | correct (variant) |
| q07_brand_hinglish | Garmin | garmin | garmin | correct |
| q13_noisy_hinglish | Huda Beauty | huda beauty | huda beauty | correct |
| q20_brand_hinglish | Schwarzkopf | schwazkorf | जो scorp का | MISSED |
| q21_brand_en | H&M | h&m | h and m | correct |
| q22_brand_hinglish | Zara | zara | zara | correct |
| q23_brand_hinglish | Kay Beauty | kay beauty | k beauty | needs a confirmation question |
| q24_brand_hinglish | Maybelline | maybelline | टेबल लाइन का मस्कारा दिखाओ | MISSED |
| q25_brand_hinglish | Reebok | reebuk | rebuck के जूते दिखाओ | correct (variant) |
| q29_brand_en (held-out) | Calvin Klein | calvin clean | calvin klein | correct |
| q31_brand_en (held-out) | Biba | biba's | bibas | correct (variant) |
| q32_brand_hinglish (held-out) | Fabindia | fabindia | crab india की | MISSED |
| q33_brand_hinglish (held-out) | Puma | pooma | पुमा के पजामे मिलेंगे मेरे लिए | correct (variant) |
| q34_brand_hinglish (held-out) | Nykaa | nykaa | nykaa | correct |
| q34_brand_hinglish (held-out) | Wanderlust | wanderlust | (dropped) | correct (variant) |
| q35_brand_hinglish (held-out) | Andamen | andamen | under man | MISSED |
| q36_brand_hinglish (held-out) | Revlon | revlon | revlon | correct |
| q37_brand_en (held-out) | Benefit Cosmetics | benefit cosmetics | benefit cosmetics | correct |
| q38_brand_en (held-out) | Fenty Beauty | fenty beauty | fenty beauty | correct |
| q38_brand_en (held-out) | Rare Beauty | rare beauty | rare beauty | correct |
| q39_brand_en (held-out) | Onitsuka Tiger | onitsuka | honetsuka snickers | needs a confirmation question |
| q40_brand_hinglish (held-out) | Hush Puppies | hush puppies | (dropped) | MISSED |
| q41_tricky_hinglish | Ferrari | ferrari | ferrari | correct |
| q42_tricky_hinglish | Huda Beauty | huda beauty | हुडा beauty | MISSED |
| q49_brand_hinglish | Libas | libas | libus का कुर्ता | MISSED |
| q50_brand_hinglish | Allen Solly | allen solly | एलन सोली की | MISSED |
| q51_brand_hinglish | Lakme | lakme | लक्मे का काजल मिलेगा | MISSED |
| q52_brand_hinglish | Mamaearth | mumma earth | mama का | MISSED |

## Every clip

| Clip | Said | Heard | Error types |
|---|---|---|---|
| q01_simple_hinglish | lime green saree ka petticoat chahiye | lime green साड़ी का petticoat चाहिए | other_substitution, term_misheard |
| q03_simple_hinglish | asics ke running wale gel wale shoes chahiye | A6 के running वाले gel वाले shoes चाहिए | brand_misheard, other_substitution |
| q04_simple_hinglish | i need a marks & spencers navy blue spaghetti | I need a Marks and Spencers navy blue spaghetti | (none) |
| q05_simple_hinglish | i need a van & heusen vest | I need a van in Houston West | brand_misheard |
| q06_simple_hinglish | i need a moxie shampoo | I need a Moxy shampoo | (variants only) |
| q07_brand_hinglish | i need a garmin forerunner 245 | I need a Garmin Forerunner 245. | (none) |
| q08_tricky_hinglish | aaj dinner mein kya banaoon | आज dinner में क्या बनाऊँ | other_substitution, term_misheard |
| q09_tricky_hinglish | how many amano shrimps should be kept together | How many Amanush rim should be kept together? | term_misheard |
| q10_tricky_hinglish | how many times paan mein kitni baar paani dena chahiye | How many times पान में कितनी बार पानी देना चाहिए | term_misheard |
| q12_noisy_hinglish | mujhe purple saree ka blouse chahiye | मुझे purple साड़ी का blouse चाहिए | other_substitution, term_misheard |
| q13_noisy_hinglish | huda beauty ka concealer milega | Huda Beauty का concealer मिलेगा | other_substitution |
| q14_noisy_hinglish | where can i find a black labrador puppy | Where can I find a black Labrador puppy? | (none) |
| q15_followup_hinglish | in mein se mujhe koi pasand nahi | इनमें से मुझे कोई पसंद नहीं | term_misheard |
| q16_followup_hinglish | purple ke alawa green nai chalega iss par | purple के अलावा green नहीं चलेगा इस पर | other_substitution |
| q17_followup_hinglish | show me isse accha kuch | Xiaomi इससे अच्छा कुछ | term_misheard |
| q18_followup_hinglish | iske alawa white mein nai milega kuch | इसके अलावा white में नहीं मिलेगा कुछ | other_substitution |
| q19_followup_hinglish | aur dikhao | और दिखाओ | term_misheard |
| q20_brand_hinglish | schwazkorf ka hair mask dikhao | जो scorp का hair mask दिखाओ। | brand_misheard, other_substitution |
| q21_brand_en | i need floral nice flowy dresses from h&m | I need floral nice flowy dresses from H&M. | (none) |
| q22_brand_hinglish | zara jaise kapde chahiye | Zara जैसे कपड़े चाहिए | term_misheard |
| q23_brand_hinglish | kay beauty ki creamy wali lipstick milegi | K-Beauty की creamy वाली lipstick मिलेगी | brand_confirm_needed, other_substitution |
| q24_brand_hinglish | maybelline ka mascara dikhao | टेबल लाइन का मस्कारा दिखाओ | brand_misheard |
| q25_brand_hinglish | reebuk ke joote dikhao | Rebuck के जूते दिखाओ | (variants only) |
| q27_simple_en | i need a pair of nice jeans | I need a pair of nice jeans. | (none) |
| q29_simple_en | striped tshirt please | Stripe T-shirt please | term_misheard |
| q30_simple_en | what will go with a brown skirt | What will go with a brown skirt? | (none) |
| q28_simple_en | white linen srr white linen shirt | White linen sir. White linen shirt. | word_inserted |
| q29_brand_en | cla calvin clean aaa women's jacket | Calvin Klein women's jacket | (variants only) |
| q30_tricky_en | why is the sky so blue | Why is the sky so blue? | (none) |
| q31_brand_en | i need aaa biba's kurta sets for rakshabandhan | I need Biba's kurta sets for Rakshabandhan | (none) |
| q32_brand_hinglish | fabindia ki nehru jacket chahiye | Crab India की Nehru jacket चाहिए | brand_misheard, other_substitution |
| q33_brand_hinglish | pooma ke pajame milenge mere liye | पुमा के पजामे मिलेंगे मेरे लिए | (variants only) |
| q34_brand_hinglish | nykaa se wanderlust ka cherry blossom wala shower gel | Nykaa से Wonderlust का Cherry Blossom वाला shower gel। | other_substitution |
| q35_brand_hinglish | andamen ki green linen shirt | Under Man ki Green Linen Shirt | brand_misheard |
| q36_brand_hinglish | revlon kajal | Revlon Kajal | (none) |
| q37_brand_en | benefit cosmetics the brow pencil | Benefit Cosmetics, the brow pencil. | (none) |
| q38_brand_en | blush from fenty beauty or rare beauty | Blush from Fenty Beauty or Rare Beauty | (none) |
| q39_brand_en | onitsuka sneakers | Honetsuka Snickers | brand_confirm_needed |
| q40_brand_hinglish | meri mummy ke liye hush puppies ki chappal | मेरी मम्मी ने हर्ष पापीस की चप्पल | brand_misheard |
| q41_tricky_hinglish | ferrari ke white sneakers 1500 ke andar | Ferrari के white sneakers 1500 के अंदर | other_substitution |
| q42_tricky_hinglish | huda beauty ka concealer 100 rupaye ke andar | हुडा Beauty Concealer ₹100 के अंदर। | brand_misheard, other_substitution, word_dropped_middle |
| q43_simple_hinglish | ik black kurta chaiyye | एक black चाहिए | other_substitution, term_misheard |
| q44_simple_hinglish | aur ek pink dupatta dikhao | और 1 pink दुपट्टा दिखाओ | number_mismatch, term_misheard |
| q45_simple_hinglish | mere liye sandal dikhao | मेरे लिए sandal दिखाओ | other_substitution |
| q46_simple_hinglish | ya phir red wala dikhao | या फिर red वाला दिखाओ। | other_substitution |
| q47_simple_hinglish | do hajaar ke neeche sneakers | 2000 के नीचे sneakers | other_substitution |
| q48_followup_hinglish | ya phir red wala dikhao | या फिर red वाला | other_substitution |
| q49_brand_hinglish | libas ka kurta set chahiye | Libus का कुर्ता set चाहिए। | brand_misheard, other_substitution |
| q50_brand_hinglish | allen solly ki shirt dikhao | एलन सोली की shirt दिखाओ। | brand_misheard, other_substitution |
| q51_brand_hinglish | lakme ka kajal milega | लक्मे का काजल मिलेगा? | brand_misheard |
| q52_brand_hinglish | Mumma earth ka face wash dikhao | Mama का face wash दिखाओ | brand_misheard, other_substitution |
| q53_simple_hinglish | teen sau ke andar shirt | 300 के अंदर शर्ट | term_misheard |
| q54_simple_hinglish | 1200 ke neeche jeans | 1200 के नीचे jeans। | other_substitution |
| q55_simple_en | five hundred rupees under lipstick | 500 is under lipstick | word_inserted |
| q56_simple_hinglish | bhaiya, ek good running shoes batao | भैया, a good running shoes बताओ। | other_substitution |
| q57_simple_hinglish | something for a wedding, ummm saree ya lehenga | Something for a wedding, saree or lehenga. | other_substitution |
