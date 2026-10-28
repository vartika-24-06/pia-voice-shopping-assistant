# Speech evaluation: v4_auto

Run on 2026-10-28 with 41 clips (13 held-out). Setup: `{"model": "saaras:v4", "language_code": "unknown"}`.
Scoring rules: agreed spelling variants count as correct (`brand_variants.json`); hesitations in what was said are ignored; numbers are compared as digits; word error rate is reported but not used as a pass mark (Hinglish spelling varies).

## Summary

| Measure | All clips | Held-out only |
|---|---|---|
| Brand accuracy (exact or agreed variant) | 48% (13/27) | 69% (9/13) |
| Brands: exact / variant / needs confirm / missed | 8 / 5 / 0 / 14 | 5 / 4 / 0 / 4 |
| Product and colour words heard | 45% (29/65) | 74% (14/19) |
| Prices heard correctly | 100% (2/2) | n/a |
| Clips heard exactly (after normalising) | 27% (11/41) | 46% (6/13) |
| Word error rate (reported only) | 0.59 | 0.46 |
| Clips returned in the wrong script (Devanagari) | 21 | 4 |
| Time per clip (mean / p90, seconds) | 0.86 / 1.17 | 0.63 / 0.70 |

## Error types

| Type | Count (all) | Count (held-out) |
|---|---|---|
| brand_misheard | 14 | 4 |
| brand_variant_accepted | 3 | 2 |
| other_substitution | 3 | 0 |
| term_misheard | 11 | 0 |
| word_dropped_start | 1 | 1 |

*Accepted variants are not errors; they are listed so you can see them.*

## By language

| Group | Clips | Brand accuracy | Terms heard | Clips exact | Word error rate |
|---|---|---|---|---|---|
| en | 11 | 100% (7/7) | 88% (15/17) | 64% (7/11) | 0.08 |
| hinglish | 30 | 30% (6/20) | 29% (14/48) | 13% (4/30) | 0.76 |

## By clip type

| Group | Clips | Brand accuracy | Terms heard | Clips exact | Word error rate |
|---|---|---|---|---|---|
| brand | 18 | 60% (12/20) | 58% (14/24) | 33% (6/18) | 0.54 |
| followup | 5 | n/a | 0% (0/6) | 0% (0/5) | 1.00 |
| noisy | 3 | 0% (0/1) | 43% (3/7) | 33% (1/3) | 0.58 |
| simple | 9 | 25% (1/4) | 53% (9/17) | 33% (3/9) | 0.39 |
| tricky | 6 | 0% (0/2) | 27% (3/11) | 17% (1/6) | 0.70 |

## By extra background noise

| Group | Clips | Brand accuracy | Terms heard | Clips exact | Word error rate |
|---|---|---|---|---|---|
| extra noise | 3 | 0% (0/1) | 0% (0/4) | 0% (0/3) | 1.00 |
| fan only | 38 | 50% (13/26) | 48% (29/61) | 29% (11/38) | 0.55 |

## Every brand mention

| Clip | Brand | Said | Heard as | Result |
|---|---|---|---|---|
| q03_simple_hinglish | Asics | asics | ए सिक्स के रनिंग वाले जेल वाले शूज चाहिए। | MISSED |
| q04_simple_hinglish | Marks & Spencer | marks & spencers | marks and spencers | correct |
| q05_simple_hinglish | Van Heusen | van & heusen | van and hughes and west | MISSED |
| q06_simple_hinglish | Moxie | moxie | moxi | MISSED |
| q07_brand_hinglish | Garmin | garmin | garmin | correct |
| q13_noisy_hinglish | Huda Beauty | huda beauty | हुडा ब्यूटी का कंसीलर मिलेगा | MISSED |
| q20_brand_hinglish | Schwarzkopf | schwazkorf | कोस्कॉर्फ का हेयर मास्क दिखाओ। | MISSED |
| q21_brand_en | H&M | h&m | h and m | correct |
| q22_brand_hinglish | Zara | zara | ज़ारा जैसे कपड़े चाहिए। | MISSED |
| q23_brand_hinglish | Kay Beauty | kay beauty | के ब्यूटी की क्रीमी वाली लिपस्टिक मिलेगी | MISSED |
| q24_brand_hinglish | Maybelline | maybelline | table line | MISSED |
| q25_brand_hinglish | Reebok | reebuk | रीबक के जूते दिखाओ। | correct (variant) |
| q29_brand_en (held-out) | Calvin Klein | calvin clean | calvin klein | correct |
| q31_brand_en (held-out) | Biba | biba's | bibas | correct (variant) |
| q32_brand_hinglish (held-out) | Fabindia | fabindia | क्लब इंडिया की नेहरू जैकेट चाहिए। | MISSED |
| q33_brand_hinglish (held-out) | Puma | pooma | पूमा के पजामे मिलेंगे मेरे लिए | correct (variant) |
| q34_brand_hinglish (held-out) | Nykaa | nykaa | आईका से वोंडरलास्ट का चेरी ब्लॉसम वाला शावर जेल। | MISSED |
| q34_brand_hinglish (held-out) | Wanderlust | wanderlust | (dropped) | correct (variant) |
| q35_brand_hinglish (held-out) | Andamen | andamen | underwear | MISSED |
| q36_brand_hinglish (held-out) | Revlon | revlon | revlon | correct |
| q37_brand_en (held-out) | Benefit Cosmetics | benefit cosmetics | benefit cosmetics | correct |
| q38_brand_en (held-out) | Fenty Beauty | fenty beauty | fenty beauty | correct |
| q38_brand_en (held-out) | Rare Beauty | rare beauty | rare beauty | correct |
| q39_brand_en (held-out) | Onitsuka Tiger | onitsuka | onitsuka | correct (variant) |
| q40_brand_hinglish (held-out) | Hush Puppies | hush puppies | (dropped) | MISSED |
| q41_tricky_hinglish | Ferrari | ferrari | फेरारी के वाइट स्नीकर्स | MISSED |
| q42_tricky_hinglish | Huda Beauty | huda beauty | हुडा ब्यूटी कंसीलर | MISSED |

## Every clip

| Clip | Said | Heard | Error types |
|---|---|---|---|
| q01_simple_hinglish | lime green saree ka petticoat chahiye | लाइम ग्रीन साड़ी का पेटीकोट चाहिए। | term_misheard |
| q03_simple_hinglish | asics ke running wale gel wale shoes chahiye | ए सिक्स के रनिंग वाले जेल वाले शूज चाहिए। | brand_misheard |
| q04_simple_hinglish | i need a marks & spencers navy blue spaghetti | I need a Marks and Spencer's navy blue spaghetti. | (none) |
| q05_simple_hinglish | i need a van & heusen vest | I need a van and Hughes and West. | brand_misheard |
| q06_simple_hinglish | i need a moxie shampoo | I need a Moxi shampoo. | brand_misheard |
| q07_brand_hinglish | i need a garmin forerunner 245 | I need a Garmin Forerunner 245. | (none) |
| q08_tricky_hinglish | aaj dinner mein kya banaoon | आज डिनर में क्या बनाऊँ? | term_misheard |
| q09_tricky_hinglish | how many amano shrimps should be kept together | How many Amanoshrims should be kept together? | other_substitution |
| q10_tricky_hinglish | how many times paan mein kitni baar paani dena chahiye | हाउ मेनी टाइम्स पान में कितनी बार पानी देना चाहिए? | term_misheard |
| q12_noisy_hinglish | mujhe purple saree ka blouse chahiye | मुझे पर्पल साड़ी का ब्लाउज चाहिए। | term_misheard |
| q13_noisy_hinglish | huda beauty ka concealer milega | हुडा ब्यूटी का कंसीलर मिलेगा? | brand_misheard |
| q14_noisy_hinglish | where can i find a black labrador puppy | Where can I find a black Labrador puppy? | (none) |
| q15_followup_hinglish | in mein se mujhe koi pasand nahi | इनमें से मुझे कोई पसंद नहीं। | term_misheard |
| q16_followup_hinglish | purple ke alawa green nai chalega iss par | पर्पल के अलावा ग्रीन नहीं चलेगा इस पर। | term_misheard |
| q17_followup_hinglish | show me isse accha kuch | शोमी इससे अच्छा कुछ। | term_misheard |
| q18_followup_hinglish | iske alawa white mein nai milega kuch | इसके अलावा वाइट में नहीं मिलेगा कुछ। | term_misheard |
| q19_followup_hinglish | aur dikhao | और दिखाओ। | term_misheard |
| q20_brand_hinglish | schwazkorf ka hair mask dikhao | कोस्कॉर्फ का हेयर मास्क दिखाओ। | brand_misheard |
| q21_brand_en | i need floral nice flowy dresses from h&m | I need francy nice flowy dresses from H&M. | term_misheard |
| q22_brand_hinglish | zara jaise kapde chahiye | ज़ारा जैसे कपड़े चाहिए। | brand_misheard |
| q23_brand_hinglish | kay beauty ki creamy wali lipstick milegi | के ब्यूटी की क्रीमी वाली लिपस्टिक मिलेगी? | brand_misheard |
| q24_brand_hinglish | maybelline ka mascara dikhao | Table Line ka mascara dikhao. | brand_misheard |
| q25_brand_hinglish | reebuk ke joote dikhao | रीबक के जूते दिखाओ। | (variants only) |
| q27_simple_en | i need a pair of nice jeans | I need a pair of nice jeans. | (none) |
| q29_simple_en | striped tshirt please | Strip T-shirt, please. | term_misheard |
| q30_simple_en | what will go with a brown skirt | What will go with a brown skirt? | (none) |
| q28_simple_en | white linen srr white linen shirt | White linen shirt. | word_dropped_start |
| q29_brand_en | cla calvin clean aaa women's jacket | Calvin Klein women's jacket. | (variants only) |
| q30_tricky_en | why is the sky so blue | Why is the sky so blue? | (none) |
| q31_brand_en | i need aaa biba's kurta sets for rakshabandhan | I need Biba's kurta sets for Rakshabandhan. | (none) |
| q32_brand_hinglish | fabindia ki nehru jacket chahiye | क्लब इंडिया की नेहरू जैकेट चाहिए। | brand_misheard |
| q33_brand_hinglish | pooma ke pajame milenge mere liye | पूमा के पजामे मिलेंगे मेरे लिए? | (variants only) |
| q34_brand_hinglish | nykaa se wanderlust ka cherry blossom wala shower gel | आईका से वोंडरलास्ट का चेरी ब्लॉसम वाला शावर जेल। | brand_misheard |
| q35_brand_hinglish | andamen ki green linen shirt | Underwear ki green linen shirt. | brand_misheard |
| q36_brand_hinglish | revlon kajal | Revlon Kajal. | (none) |
| q37_brand_en | benefit cosmetics the brow pencil | Benefit Cosmetics The Brow Pencil. | (none) |
| q38_brand_en | blush from fenty beauty or rare beauty | Blush from Fenty Beauty or Rare Beauty. | (none) |
| q39_brand_en | onitsuka sneakers | Onitsuka sneakers. | (none) |
| q40_brand_hinglish | meri mummy ke liye hush puppies ki chappal | मेरी मम्मी ने हर्ष पापीस की चप्पल। | brand_misheard |
| q41_tricky_hinglish | ferrari ke white sneakers 1500 ke andar | फेरारी के वाइट स्नीकर्स 1500 के अंदर। | brand_misheard, other_substitution |
| q42_tricky_hinglish | huda beauty ka concealer 100 rupaye ke andar | हुडा ब्यूटी कंसीलर 100 रुपये के अंदर। | brand_misheard, other_substitution |
