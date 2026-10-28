# Pipeline evaluation: said text

Run 2026-10-28. 12 conversations, 15 turns. Real Sarvam-105B and the real page code; fake product search and voice.
Input: what was said (typed), so this isolates the model and the page logic.

## Summary

| Measure | Result |
|---|---|
| Turns fully correct | 100% (15/15) |
| Right tool (search / refuse / ask / buttons) | 100% (15/15) |
| Right search details (category, price limit, page) | 100% (12/12) |
| Search words contain what the user meant | 100% (12/12) |
| Brand carried into the search | 100% (9/9) |
| No invented filters (platform, brand, price) | 100% (12/12) |
| Replies in the chosen language (final) | 100% (15/15) |
| Replies needing a language rewrite | 0 of 15 |
| Replies without tu/tum or masculine grammar for Pia | 100% (15/15) |
| Replies under 40 words | 100% (15/15) |
| Every number spoken is in the data (grounded) | 100% (15/15) |
| Out-of-scope refused without searching | n/a |
| Brand doubts asked, not guessed | 100% (3/3) |
| Mean time per turn / model calls per turn | 3.7 s (includes pacing for the rate limit) / 1.8 |

## Every turn

| Conversation | Type | Input to the model | Result | What went wrong |
|---|---|---|---|---|
| c11#1 | misheard | kay beauty ki creamy wali lipstick milegi | pass |  |
| c17#1 | no match | ferrari ke white sneakers 1500 ke andar | pass |  |
| c18#1 | no match | huda beauty ka concealer 100 rupaye ke andar | pass |  |
| c21#1 | misheard | K Beauty ki lipstick chahiye | pass |  |
| c21#1 | misheard | Mujhe Kay Beauty chahiye | pass |  |
| c11#2 | misheard | kay beauty ki creamy wali lipstick milegi | pass |  |
| c17#2 | no match | ferrari ke white sneakers 1500 ke andar | pass |  |
| c18#2 | no match | huda beauty ka concealer 100 rupaye ke andar | pass |  |
| c21#2 | misheard | K Beauty ki lipstick chahiye | pass |  |
| c21#2 | misheard | Mujhe Kay Beauty chahiye | pass |  |
| c11#3 | misheard | kay beauty ki creamy wali lipstick milegi | pass |  |
| c17#3 | no match | ferrari ke white sneakers 1500 ke andar | pass |  |
| c18#3 | no match | huda beauty ka concealer 100 rupaye ke andar | pass |  |
| c21#3 | misheard | K Beauty ki lipstick chahiye | pass |  |
| c21#3 | misheard | Mujhe Kay Beauty chahiye | pass |  |

## Replies

| Conversation | Reply |
|---|---|
| c11#1 | Sabse kam price Kay Beauty creamy lipstick style 1 ka hai: Myntra par 750 rupaye, rating 4.1. Kaunsa pick karna hai, ya aur options dikhaun? |
| c17#1 | Sorry, mujhe 'white sneakers, Ferrari, under 1500 rupees' ke liye kuch nahi mila. Kya aap colour ya budget change karna chahenge? |
| c18#1 | Sorry, mujhe 'Huda Beauty concealer under 100 rupees' ke liye kuch nahi mila. Kya aap colour ya budget change karna chahenge? |
| c21#1 | Aapka matlab kaunsa hai: Kay Beauty ya Korean beauty? |
| c21#1 | Sabse kam price Kay Beauty lipstick style 1 ka hai: Myntra par 750 rupaye, rating 4.1. Kaunsa pick karna hai, ya aur options dikhaun? |
| c11#2 | Sabse kam price Kay Beauty creamy lipstick style 1 ka hai: Myntra par 750 rupaye, rating 4.1. Kaunsa pick karna hai, ya aur options dikhaun? |
| c17#2 | Sorry, mujhe 'white sneakers, Ferrari, under 1500 rupees' ke liye kuch nahi mila. Kya aap colour ya budget change karna chahenge? |
| c18#2 | Sorry, mujhe 'huda beauty concealer under 100 rupees' ke liye kuch nahi mila. Kya aap colour ya budget change karna chahenge? |
| c21#2 | Aapka matlab kaunsa hai: Kay Beauty ya Korean beauty? |
| c21#2 | Sabse kam price Kay Beauty lipstick style 1 ka hai: Myntra par 750 rupaye, rating 4.1. Kaunsa pick karna hai, ya aur options dikhaun? |
| c11#3 | Sabse kam price Kay Beauty creamy lipstick style 1 ka hai: Myntra par 750 rupaye, rating 4.1. Kaunsa pick karna hai, ya aur options dikhaun? |
| c17#3 | Sorry, mujhe 'ferrari white sneakers 1500 ke andar' ke liye kuch nahi mila. Kya aap colour ya budget change karna chahenge? |
| c18#3 | Sorry, mujhe 'Huda Beauty concealer, under 100 rupees' ke liye kuch nahi mila. Kya aap colour ya budget change karna chahenge? |
| c21#3 | Aapka matlab kaunsa hai: Kay Beauty ya Korean beauty? |
| c21#3 | Sabse kam price Kay Beauty lipstick style 1 ka hai: Myntra par 750 rupaye, rating 4.1. Kaunsa pick karna hai, ya aur options dikhaun? |
