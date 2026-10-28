# Pipeline evaluation: heard text

Run 2026-10-28. 21 conversations, 26 turns. Real Sarvam-105B and the real page code; fake product search and voice.
Input: what the speech recogniser returned, so recognition errors carry through.

## Summary

| Measure | Result |
|---|---|
| Turns fully correct | 81% (21/26) |
| Right tool (search / refuse / ask / buttons) | 92% (24/26) |
| Right search details (category, price limit, page) | 100% (18/18) |
| Search words contain what the user meant | 100% (17/17) |
| Brand carried into the search | 57% (4/7) |
| No invented filters (platform, brand, price) | 100% (18/18) |
| Replies in the chosen language (final) | 100% (26/26) |
| Replies needing a language rewrite | 0 of 26 |
| Replies without tu/tum or masculine grammar for Pia | 100% (26/26) |
| Replies under 40 words | 100% (26/26) |
| Every number spoken is in the data (grounded) | 100% (26/26) |
| Out-of-scope refused without searching | 100% (2/2) |
| Brand doubts asked, not guessed | 100% (3/3) |
| Mean time per turn / model calls per turn | 3.6 s (includes pacing for the rate limit) / 1.7 |

## Every turn

| Conversation | Type | Input to the model | Result | What went wrong |
|---|---|---|---|---|
| c01 | simple | Lime green saree ka petticoat chahiye | pass |  |
| c02 | simple | A6 ke running wale gel wale shoes chahiye | FAIL | brand ["asics"] not in "A6 running gel shoes" / brand "undefined" |
| c03 | simple | I need a pair of nice jeans. | pass |  |
| c04 | simple | Stripe T-shirt please. | pass |  |
| c05 | simple | White linen sir. White linen shirt. | pass |  |
| c06 | simple | I need a van and Hughes and West. | FAIL | expected search, got words only |
| c07 | brand | Thorax ka hair mass dikhao. | FAIL | expected search, got words only |
| c08 | brand | Zara jaise kapde chahiye | pass |  |
| c09 | brand | Crab India ki Nehru jacket chahiye | FAIL | brand ["fabindia"] not in "Nehru jacket" / brand "Crab India" |
| c10 | brand | Revlon Kajal. | pass |  |
| c11 | misheard | K Beauty ki creamy vali lipstick milegi? | pass |  |
| c12 | misheard | Honetsuka Snickers | pass |  |
| c13 | followup | Mujhe purple saree ka blouse chahiye | pass |  |
| c13 | followup | Purple ke alawa green nahi chalega is par | pass |  |
| c14 | followup | Mujhe purple saree ka blouse chahiye | pass |  |
| c14 | followup | Iske alava white mein nahi milega kuch | pass |  |
| c15 | followup | A6 ke running wale gel wale shoes chahiye | FAIL | brand ["asics"] not in "A6 running gel shoes" / brand "undefined" |
| c15 | followup | Show me isse achha kuchh | pass |  |
| c16 | followup | I need a pair of nice jeans. | pass |  |
| c16 | followup | Aur dikhao | pass |  |
| c17 | no match | Ferrari ke white sneakers fifteen hundred ke andar | pass |  |
| c18 | no match | Huda Beauty concealer Rs. 100 ke andar. | pass |  |
| c19 | out of scope | Aaj dinner mein kya banaun | pass |  |
| c20 | out of scope | Where can I find a black Labrador puppy? | pass |  |
| c21 | misheard | K Beauty ki lipstick chahiye | pass |  |
| c21 | misheard | Mujhe Kay Beauty chahiye | pass |  |

## Replies

| Conversation | Reply |
|---|---|
| c01 | Sabse kam price Puma lime green saree petticoat style 1 ka hai: Myntra par 750 rupaye, rating 4.1. Kaunsa pick karna hai, ya aur options dikhaun? |
| c02 | Sabse kam price Puma A6 running gel shoes style 1 ka hai: Myntra par 750 rupaye, rating 4.1. Kaunsa pick karna hai, ya aur options dikhaun? |
| c03 | The lowest listed price is Puma nice jeans style 1 at 750 rupees on Myntra, rated 4.1. Would you like to pick one, or see more? |
| c04 | The lowest listed price is Puma Stripe T-shirt style 1 at 750 rupees on Myntra, rated 4.1. Would you like to pick one, or see more? |
| c05 | The lowest listed price is Puma white linen shirt style 1 at 750 rupees on Myntra, rated 4.1. Would you like to pick one, or see more? |
| c06 | Main sirf fashion aur beauty products search karne mein help kar sakti hoon. Aap kya dekhna chahenge? |
| c07 | Main sirf fashion aur beauty products search karne mein help kar sakti hoon. Aap kya dekhna chahenge? |
| c08 | Sabse kam price Puma Zara jaise kapde style 1 ka hai: Myntra par 750 rupaye, rating 4.1. Kaunsa pick karna hai, ya aur options dikhaun? |
| c09 | Sabse kam price Crab India Nehru jacket style 1 ka hai: Myntra par 750 rupaye, rating 4.1. Kaunsa pick karna hai, ya aur options dikhaun? |
| c10 | Sabse kam price Puma Revlon Kajal style 1 ka hai: Myntra par 750 rupaye, rating 4.1. Kaunsa pick karna hai, ya aur options dikhaun? |
| c11 | Aapka matlab kaunsa hai: Kay Beauty ya Korean beauty? |
| c12 | Did you mean Onitsuka Tiger? |
| c13 | Sabse kam price Puma purple saree blouse style 1 ka hai: Myntra par 750 rupaye, rating 4.1. Kaunsa pick karna hai, ya aur options dikhaun? |
| c13 | Sabse kam price Puma green saree blouse style 1 ka hai: Myntra par 750 rupaye, rating 4.1. Kaunsa pick karna hai, ya aur options dikhaun? |
| c14 | Sabse kam price Puma purple saree blouse style 1 ka hai: Myntra par 750 rupaye, rating 4.1. Kaunsa pick karna hai, ya aur options dikhaun? |
| c14 | Sabse kam price Puma white saree blouse style 1 ka hai: Myntra par 750 rupaye, rating 4.1. Kaunsa pick karna hai, ya aur options dikhaun? |
| c15 | Sabse kam price Puma A6 running gel shoes style 1 ka hai: Myntra par 750 rupaye, rating 4.1. Kaunsa pick karna hai, ya aur options dikhaun? |
| c15 | Aap kya chahenge: zyada rating wale, mehenge wale, ya naya search? |
| c16 | The lowest listed price is Puma nice jeans style 1 at 750 rupees on Myntra, rated 4.1. Would you like to pick one, or see more? |
| c16 | The lowest listed price is Puma nice jeans style 1 at 750 rupees on Myntra, rated 4.1. Would you like to pick one, or see more? |
| c17 | Sorry, mujhe 'white sneakers Ferrari under 1500' ke liye kuch nahi mila. Kya aap colour ya budget change karna chahenge? |
| c18 | Sorry, mujhe 'Huda Beauty concealer Rs. 100 ke andar' ke liye kuch nahi mila. Kya aap colour ya budget change karna chahenge? |
| c19 | Main sirf fashion aur beauty products search karne mein help kar sakti hoon. Aap kya dekhna chahenge? |
| c20 | I can only help with finding fashion and beauty products. What would you like to look for? |
| c21 | Aapka matlab kaunsa hai: Kay Beauty ya Korean beauty? |
| c21 | Sabse kam price Kay Beauty lipstick style 1 ka hai: Myntra par 750 rupaye, rating 4.1. Kaunsa pick karna hai, ya aur options dikhaun? |
