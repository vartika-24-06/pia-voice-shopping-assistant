# Sarvam browser check: first run (2026-10-17)

Run by the PM in Chrome with their own key, from `spike/sarvam_browser_check/index.html`.

## Results
| Area | Result |
|---|---|
| Browser access (CORS) | Works for the chat and voice endpoints. The speech endpoint also answered the browser (it returned a readable 400), so CORS is not the problem there |
| Tool calling (Sarvam-105B, reasoning off) | 7 of 7 passed, median 319 ms. Numbers in words ("fifteen hundred") and "Rs. 100" were read correctly. The refusal was polite, in "aap", with feminine grammar |
| Invented filter | On "Ferrari ke white sneakers fifteen hundred ke andar" the model added `platform: Myntra`, which the user never said. The test did not check for it. In the real app this would silently hide Amazon results |
| Voice (Bulbul v4 Flash) | 0.9 to 1.8 s per sentence. Ratings: Devanagari+English format 4, 4, 4, 3 (average 3.75); all-Roman format 3, 4, 4, 4 (average 3.75). No visible difference |
| Rating noise | The English sample was identical text in both formats but rated 3 and 4. A one-point gap is within the rater's own noise |
| Speech in from the browser | Failed with 400: the browser labels its recording `audio/webm;codecs=opus`, and Sarvam only accepts plain `audio/webm`. Fix applied to the page (send the same bytes labelled `audio/webm`) |

## Re-test of speech in (after the fix)
Passed. The browser recording, relabelled as plain `audio/webm`, was accepted: 324 ms, transcript "Can you help me find YSL ka koi achha sa blush jo 3500 se kam ka ho?". The brand (YSL) and the price (3500) came through correctly. **Risk 1 in spec 05 is cleared:** the browser can call Sarvam for chat, voice and speech without a backend. Lesson for the app: always send recordings labelled `audio/webm`, and hard-refresh when testing a changed page.

## Consequences
1. **Risk 1 (browser access):** mostly cleared. Speech upload needs the content-type fix, to be re-checked.
2. **Risk 3 (tool calling):** looks good, but the model invents filters. Add to the system prompt: set platform and brand only if the user said them. Add "no invented filters" to the intent scoring (spec 06).
3. **Voice format:** no clear winner. If the Roman format is as good, the speech-formatting step in spec 03 is unnecessary, and the model can write one Roman Hinglish reply for both screen and speech. Needs a fairer test: same voice, same sentences, blind order.
4. **Speed:** chat 0.3 s plus voice 1 to 1.8 s leaves room in the budget; search (2 to 4 s) is the largest stage.
