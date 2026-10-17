'use strict';
/* Pia, voice shopping assistant. Step 2: the voice loop with made-up sample products.
   Sarvam is called straight from this page with the visitor's own key. */

const BASE = 'https://api.sarvam.ai';
const $ = id => document.getElementById(id);
const MAX_RECORD_MS = 25000;

const S = {
  key: '', name: '', gender: '', voice: 'simran_enhi_companion',
  messages: [], recording: false, busy: false, speaking: false,
  rec: null, stream: null, chunks: [], tStop: 0, autoStop: null, audio: null,
  last: null, // last search: { args, total, page }
  turn: 0,
};

/* ---------------- small helpers ---------------- */
const store = {
  get(k) { try { return sessionStorage.getItem(k) || ''; } catch { return ''; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch { /* storage may be blocked */ } },
  del(k) { try { sessionStorage.removeItem(k); } catch { /* ignore */ } },
};
const titleCase = s => String(s || '').replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1));
const rupees = n => '₹' + Math.round(n).toLocaleString('en-IN');

class ApiError extends Error {}
function friendly(status, body) {
  const msg = body?.error?.message || '';
  if (status === 401 || status === 403) return 'Sarvam key sahi nahi lag rahi. Key badal kar dekhein.';
  if (status === 402 || status === 429) return 'Sarvam credits ya limit khatam ho gayi lagti hai. Dashboard mein check karein.';
  if (status >= 500) return 'Sarvam abhi jawab nahi de raha. Thodi der baad try karein.';
  return 'Sarvam ne request nahi li' + (msg ? ': ' + msg.slice(0, 120) : '.');
}
async function api(path, init) {
  let res;
  try { res = await fetch(BASE + path, init); }
  catch { throw new ApiError('Internet ya Sarvam se connection nahi ho paaya.'); }
  let body = null;
  try { body = await res.json(); } catch { /* not json */ }
  if (!res.ok) throw new ApiError(friendly(res.status, body));
  return body;
}
const headers = extra => ({ 'api-subscription-key': S.key, ...extra });

/* ---------------- UI state ---------------- */
function setChip(kind, text) {
  const c = $('chip'); c.className = 'chip ' + kind; c.textContent = text;
}
function render() {
  const idle = !S.recording && !S.busy && !S.speaking;
  $('mic').disabled = !(idle || S.recording);
  $('mic').classList.toggle('recording', S.recording);
  $('mic').classList.toggle('ready', idle);
  $('micLabel').textContent = S.recording ? 'Bol chuke? Rokne ke liye tap karein'
    : S.speaking ? 'Pia bol rahi hai...' : S.busy ? 'Pia soch rahi hai...' : 'Bolne ke liye tap karein';
  $('stop').hidden = !S.speaking;
  $('more').disabled = !idle;
  if (S.recording) setChip('listening', 'Sun rahi hoon');
  else if (S.busy) setChip('thinking', 'Soch rahi hoon');
  else if (S.speaking) setChip('speaking', 'Pia bol rahi hai');
  else setChip('', 'Aap bol sakte hain');
}
function showError(text) { $('error').textContent = text || ''; }
function addMsg(who, text, meta, flags) {
  const d = document.createElement('div'); d.className = 'msg ' + who;
  d.append(document.createTextNode(text));
  if (meta || (flags && flags.length)) {
    const m = document.createElement('span'); m.className = 'meta'; m.textContent = meta || '';
    if (flags && flags.length) {
      const f = document.createElement('span'); f.className = 'flag'; f.textContent = ' ⚠ ' + flags.join('; ');
      m.append(f);
    }
    d.append(m);
  }
  $('log').append(d); d.scrollIntoView({ block: 'nearest' });
}

/* ---------------- setup screen ---------------- */
function enterMain() {
  $('setup').hidden = true; $('main').hidden = false;
  $('log').textContent = '';
  addMsg('pia', `Namaste${S.name ? ' ' + S.name : ''}! Bolkar batayein aap kya dhoondh rahe hain. Main Myntra, Amazon aur Nykaa dekh sakti hoon.`);
  render();
  if (S.key) preloadCues();
}
$('start').onclick = () => {
  const key = $('key').value.trim();
  if (!key) { $('setupError').textContent = 'Pehle apni Sarvam key paste karein.'; return; }
  S.key = key; S.name = $('name').value.trim(); S.gender = $('gender').value; S.voice = $('voice').value;
  store.set('key', S.key); store.set('name', S.name); store.set('gender', S.gender); store.set('voice', S.voice);
  S.messages = []; enterMain();
};
$('changeKey').onclick = e => {
  e.preventDefault(); stopAudio(); store.del('key');
  $('main').hidden = true; $('setup').hidden = false; $('key').value = '';
};
$('demoLink').onclick = e => e.preventDefault();

/* ---------------- tools and prompt ---------------- */
const TOOLS = [{ type: 'function', function: {
  name: 'search_products',
  description: 'Search fashion and beauty products on Myntra, Amazon and Nykaa. Returns up to 3 results per page.',
  parameters: { type: 'object', properties: {
    query: { type: 'string', description: 'What to search for, in English letters, e.g. "purple saree blouse". Include a colour if the user said one.' },
    category: { type: 'string', enum: ['clothing', 'footwear', 'accessories', 'jewellery', 'beauty'] },
    max_price: { type: 'number', description: 'Maximum price in rupees. Only if the user gave one.' },
    brand: { type: 'string', description: 'Brand name. Only if the user named one.' },
    platform: { type: 'string', enum: ['Myntra', 'Amazon', 'Nykaa'], description: 'Only if the user asked for one platform.' },
    sort: { type: 'string', enum: ['lowest_price', 'highest_rating', 'highest_price'], description: 'Default lowest_price.' },
    page: { type: 'number', description: '1 for the first 3 results, 2 for the next 3, and so on.' } },
    required: ['query', 'category'] } } }];

function systemPrompt() {
  const who = S.gender === 'female' ? 'The user is a woman: when you address her, use feminine verb forms where Hindi needs them.'
    : S.gender === 'male' ? 'The user is a man: when you address him, use masculine verb forms where Hindi needs them.'
    : 'The user did not say their gender: avoid verb forms that depend on the user\'s gender.';
  const nm = S.name ? `The user's name is ${S.name}. Use it at most once in a while, never in every reply.` : '';
  return `You are Pia, a friendly, semi-formal Indian shopping assistant who helps people find fashion and beauty products on Myntra, Amazon and Nykaa.

Style:
- Reply in the user's language: English if they spoke English, Hinglish if they spoke Hinglish. Write Hinglish in English letters (Roman script), never in Devanagari.
- Address the user as "aap". Never use "tu" or "tum". You are female: use feminine forms for yourself ("dhoondh rahi hoon", "kar sakti hoon").
- ${who} ${nm}
- Be warm and calm, never pushy. Show options, then hand the decision to the customer ("aap pick kijiye").
- Spoken replies are SHORT: at most 35 words, one to three sentences. No lists, no markdown, no emojis.

Rules:
- For any product request, call search_products. Set brand and platform ONLY if the user said them. If the user gives a colour, put it in the query, but never claim that a result is that colour.
- The screen already shows all results. Speak only about the first result, in ONE short sentence: its short_name (never read a full product title), its lowest price and platform, and its rating. Then invite the user to pick one or ask for more. Say "lowest listed price", never "cheapest overall". If the rating is null, say "abhi iske ratings nahi hain". Use only numbers that appear in the tool result. The whole reply must stay under 30 words.
- If platforms_failed is not empty, add one short line saying those platforms did not respond this time.
- If status is no_match, say sorry, that you found nothing for what was searched (repeat it), and ask whether they would like to change the colour or the budget. If available_elsewhere is present, instead say there is nothing on the platform they asked for, but there are results on the platforms listed there, and ask if they want to see them.
- The only platforms are Myntra, Amazon and Nykaa. If the user says a word that sounds like a platform name followed by "par" or "pe" (for example "Nike par", "Naika pe", "Mintra par"), treat it as that platform, not as a brand.
- If the user wants more results, call search_products again with the same details and page + 1.
- If the user says something vague like "isse accha kuch", do not guess: offer three choices, higher rated, higher priced, or a new search. If they pick one, search again with sort highest_rating or highest_price.
- If a brand name sounds misheard or could mean two things, ask once to confirm it before searching.
- For anything that is not shopping for fashion or beauty (recipes, weather, general questions, whether an outfit suits them), politely say in one sentence that you can only help with finding fashion and beauty products. Do not call a tool.
- If the user is rude, stay polite and steer back to shopping once.`;
}

const shortName = n => String(n).split(/[|,(]/)[0].trim().split(/\s+/).slice(0, 7).join(' ');

/* ---------------- product search (our own backend) ---------------- */
async function realSearch(args) {
  let res;
  try {
    res = await fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
  } catch { throw new ApiError('Product search se connection nahi ho paaya.'); }
  if (!res.ok) throw new ApiError('Product search mein dikkat aayi. Thodi der baad try karein.');
  const d = await res.json();
  // compact version for the model: only what Pia may speak about
  const llm = d.status === 'ok'
    ? { status: 'ok', page: d.page, total_matches: d.total_matches, platforms_failed: d.platforms_failed,
        results: d.results.map(r => ({ rank: r.rank, short_name: shortName(r.name), lowest_price_rupees: r.best.price, lowest_price_platform: r.best.platform,
          mrp_rupees: r.mrp, discount_percent: r.discount_pct, rating: r.rating, rating_count: r.rating_count,
          also_on: r.listings.filter(l => l.platform !== r.best.platform).map(l => ({ platform: l.platform, price_rupees: l.price })) })) }
    : { status: 'no_match', searched_for: [d.searched_for, args.max_price ? 'under ' + args.max_price + ' rupees' : '', args.platform].filter(Boolean).join(', '),
        platforms_failed: d.platforms_failed, available_elsewhere: d.available_elsewhere || undefined };
  return { groups: d.results, llm, total: d.total_matches, page: d.page };
}

/* ---------------- product cards ---------------- */
function safeLink(u) { return typeof u === 'string' && /^https:\/\//.test(u) ? u : null; }
function renderCards(groups) {
  const box = $('cards'); box.textContent = '';
  for (const g of groups) {
    const el = document.createElement('article'); el.className = 'product';
    const top = document.createElement('div'); top.className = 'top';
    if (safeLink(g.image_url)) {
      const img = document.createElement('img'); img.src = g.image_url; img.alt = ''; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer'; top.append(img);
    }
    const info = document.createElement('div'); info.className = 'info';
    const rank = document.createElement('span'); rank.className = 'rank'; rank.textContent = '#' + g.rank;
    const name = document.createElement('span'); name.className = 'name'; name.textContent = g.name;
    const price = document.createElement('span'); price.className = 'price'; price.textContent = rupees(g.best.price);
    if (g.mrp > g.best.price) {
      const mrp = document.createElement('span'); mrp.className = 'mrp'; mrp.textContent = rupees(g.mrp);
      const off = document.createElement('span'); off.className = 'off'; off.textContent = g.discount_pct + '% off';
      price.append(mrp, off);
    }
    const rating = document.createElement('span'); rating.className = 'muted';
    rating.textContent = g.rating ? `★ ${g.rating.toFixed(1)} (${g.rating_count.toLocaleString('en-IN')})` : 'Abhi ratings nahi hain';
    info.append(rank, name, price, rating); top.append(info);
    const ul = document.createElement('ul');
    for (const l of g.listings) {
      const li = document.createElement('li');
      li.append(document.createTextNode(`${l.platform}: ${rupees(l.price)}`));
      const href = safeLink(l.link);
      if (href) { const a = document.createElement('a'); a.href = href; a.target = '_blank'; a.rel = 'noopener'; a.textContent = `${l.platform} par dekhein`; li.append(a); }
      ul.append(li);
    }
    el.append(top, ul); box.append(el);
  }
  const more = S.last && S.last.total > S.last.page * 3;
  $('moreRow').hidden = !more;
}

/* ---------------- Sarvam calls ---------------- */
async function transcribe(blob) {
  const fd = new FormData();
  fd.append('file', blob, 'recording.webm'); fd.append('model', 'saaras:v3'); fd.append('mode', 'translit'); fd.append('language_code', 'unknown');
  const t = performance.now();
  const body = await api('/speech-to-text', { method: 'POST', headers: headers(), body: fd });
  return { text: (body.transcript || '').trim(), lang: body.language_code || '', ms: performance.now() - t };
}
async function chat(messages) {
  const t = performance.now();
  const body = await api('/v1/chat/completions', { method: 'POST', headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ model: 'sarvam-105b', temperature: 0.3, max_tokens: 500, reasoning_effort: null, messages, tools: TOOLS, tool_choice: 'auto' }) });
  return { msg: body.choices?.[0]?.message || {}, ms: performance.now() - t };
}
async function speak(text, lang) {
  const t = performance.now();
  const clean = text.replace(/[*_`#]/g, '').slice(0, 2400);
  const body = await api('/text-to-speech', { method: 'POST', headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ text: clean, language_code: /^en/i.test(lang) ? 'en-IN' : 'hi-IN', model: 'bulbul:v4-flash',
      speaker: S.voice, pace: 1.0, speech_sample_rate: 24000, output_audio_codec: 'wav' }) });
  return { b64: body.audios?.[0] || '', ms: performance.now() - t };
}

/* ---------------- automatic checks on every reply ---------------- */
// "4.", "4.0" and "4" all count as the number 4; commas in "1,299" are ignored.
function numbersIn(s) { return (String(s).match(/\d[\d,]*\.?\d*/g) || []).map(x => String(parseFloat(x.replace(/,/g, '')))); }
function checkReply(reply, allowedText) {
  const flags = [];
  if (/\b(tu|tum|tumhara|tumhari|tumhare|tumhe|tera|teri|tujhe)\b/i.test(reply)) flags.push('uses tu/tum');
  if (/\b(raha hoon|sakta hoon|raha hun|sakta hun)\b/i.test(reply)) flags.push('masculine grammar for Pia');
  const words = reply.split(/\s+/).filter(Boolean).length;
  if (words > 40) flags.push(`long (${words} words)`);
  const allowed = new Set(numbersIn(allowedText));
  const bad = numbersIn(reply).filter(n => !allowed.has(n) && !['1', '2', '3'].includes(n));
  if (bad.length) flags.push('number not in data: ' + bad.join(', '));
  return { flags, words };
}

/* ---------------- one conversation turn ---------------- */
// A short "searching" line, made once at the start, is played while the product search runs.
const CUES = { hi: 'Ek minute, dhoondh rahi hoon.', en: 'One moment, searching for you.' };
function preloadCues() {
  S.cues = {};
  for (const [k, text] of Object.entries(CUES)) {
    speak(text, k === 'en' ? 'en-IN' : 'hi-IN').then(r => { S.cues[k] = r.b64; }).catch(() => { /* the cue is optional */ });
  }
}
function playCue(lang) {
  const b64 = S.cues && S.cues[/^en/i.test(lang) ? 'en' : 'hi'];
  if (!b64) return null;
  return new Promise(resolve => {
    const a = new Audio('data:audio/wav;base64,' + b64); S.cueAudio = a;
    a.onended = a.onerror = () => { S.cueAudio = null; resolve(); };
    a.play().catch(() => resolve());
  });
}

async function runTurn(text, lang, sttMs, tStart) {
  S.messages.push({ role: 'user', content: text });
  addMsg('me', text);
  let llmMs = 0, searchMs = 0, reply = '', grounding = text, cue = null, cueAt = null;
  for (let i = 0; i < 3 && !reply; i++) {
    const { msg, ms } = await chat([{ role: 'system', content: systemPrompt() }, ...S.messages.slice(-24)]);
    llmMs += ms;
    if (msg.tool_calls?.length) {
      if (!cue) { cue = playCue(lang); if (cue) cueAt = performance.now() - tStart; }
      S.messages.push({ role: 'assistant', content: msg.content || '', tool_calls: msg.tool_calls });
      for (const call of msg.tool_calls) {
        let args = {}; try { args = JSON.parse(call.function.arguments); } catch { /* keep {} */ }
        const t1 = performance.now();
        const out = await realSearch(args);
        searchMs += performance.now() - t1;
        S.last = { args, total: out.total, page: out.page };
        renderCards(out.groups);
        grounding += ' ' + JSON.stringify(out.llm);
        S.messages.push({ role: 'tool', tool_call_id: call.id, name: call.function.name, content: JSON.stringify(out.llm) });
      }
      continue;
    }
    reply = (msg.content || '').trim();
  }
  if (!reply) reply = 'Maaf kijiye, kuch gadbad ho gayi. Kya aap dobara bol sakte hain?';
  S.messages.push({ role: 'assistant', content: reply });
  const chk = checkReply(reply, grounding);
  addMsg('pia', reply, `${chk.words} words`, chk.flags);

  const tts = await speak(reply, lang);
  if (cue) await cue; // never talk over the searching line
  await play(tts.b64, tStart, [sttMs, llmMs, searchMs, tts.ms], cueAt);
}

function play(b64, tStart, parts, cueAt) {
  return new Promise(resolve => {
    if (!b64) { resolve(); return; }
    const audio = new Audio('data:audio/wav;base64,' + b64); S.audio = audio;
    let logged = false;
    const logOnce = () => {
      if (logged) return; logged = true;
      addTimingRow(parts, cueAt, performance.now() - tStart);
    };
    audio.onplaying = () => { logOnce(); S.busy = false; S.speaking = true; render(); };
    const done = () => { logOnce(); S.speaking = false; S.audio = null; render(); resolve(); };
    audio.onended = done; audio.onerror = done;
    audio.play().catch(() => {
      showError('Browser ne awaaz chalane se roka. Page par ek baar click karke dobara try karein.');
      done();
    });
  });
}
function stopAudio() {
  if (S.audio) { S.audio.pause(); S.audio = null; }
  if (S.cueAudio) { S.cueAudio.pause(); S.cueAudio = null; }
  S.speaking = false; render();
}
$('stop').onclick = stopAudio;

function addTimingRow([stt, llm, search, tts], cueAt, total) {
  const t = $('timings');
  if (!t.rows.length) t.innerHTML = '<tr><th>Turn</th><th>Speech</th><th>Thinking</th><th>Search</th><th>Voice</th><th>Cue at</th><th>Answer at</th></tr>';
  S.turn += 1;
  const r = t.insertRow();
  [S.turn, ...[stt, llm, search, tts].map(x => Math.round(x)), cueAt == null ? '-' : Math.round(cueAt), Math.round(total)]
    .forEach(v => { r.insertCell().textContent = v; });
}

async function guarded(fn) {
  showError(''); S.busy = true; render();
  try { await fn(); }
  catch (e) { showError(e instanceof ApiError ? e.message : 'Kuch gadbad ho gayi: ' + e.message); }
  finally { S.busy = false; render(); }
}

/* ---------------- microphone ---------------- */
$('mic').onclick = async () => {
  if (S.recording) return stopRecording();
  if (S.busy || S.speaking) return;
  showError('');
  try { S.stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch { showError('Microphone ki permission nahi mili. Browser mein mic allow karein.'); return; }
  S.chunks = [];
  const rec = new MediaRecorder(S.stream); S.rec = rec;
  rec.ondataavailable = e => e.data.size && S.chunks.push(e.data);
  rec.onstop = () => {
    S.stream.getTracks().forEach(t => t.stop());
    // Sarvam accepts plain "audio/webm", not "audio/webm;codecs=opus".
    const blob = new Blob(S.chunks, { type: 'audio/webm' });
    const tStart = S.tStop;
    if (performance.now() - S.startedAt < 500) { showError('Bahut chhota tha. Dobara bolein.'); S.recording = false; render(); return; }
    S.recording = false;
    guarded(async () => {
      const stt = await transcribe(blob);
      if (!stt.text) { addMsg('pia', 'Mujhe kuch sunai nahi diya, kripya dobara bolein.'); return; }
      await runTurn(stt.text, stt.lang, stt.ms, tStart);
    });
  };
  rec.start(); S.startedAt = performance.now(); S.recording = true; render();
  S.autoStop = setTimeout(() => S.recording && stopRecording(), MAX_RECORD_MS);
};
function stopRecording() { clearTimeout(S.autoStop); S.tStop = performance.now(); S.rec.stop(); }

$('more').onclick = () => guarded(() => runTurn('Agle 3 dikhao', 'hi-IN', 0, performance.now()));

/* ---------------- start ---------------- */
(function init() {
  S.key = store.get('key'); S.name = store.get('name'); S.gender = store.get('gender'); S.voice = store.get('voice') || S.voice;
  $('name').value = S.name; $('gender').value = S.gender; $('voice').value = S.voice;
  if (S.key) enterMain();
})();
