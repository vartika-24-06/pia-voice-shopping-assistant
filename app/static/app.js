'use strict';
/* Pia, a voice shopping assistant. The voice loop runs in this page with the visitor's own Sarvam key;
   product search goes through our own backend (/api/search). */

const BASE = 'https://api.sarvam.ai';
const $ = id => document.getElementById(id);
const MAX_RECORD_MS = 25000;

const S = {
  key: '', name: '', gender: '', lang: 'hi', voice: 'simran_enhi_companion',
  messages: [], recording: false, busy: false, speaking: false,
  rec: null, stream: null, chunks: [], tStop: 0, startedAt: 0, autoStop: null,
  audio: null, cueAudio: null, playingEl: null, cues: {},
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
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

const ICON = {
  speaker: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a9 9 0 0 1 0 12"/></svg>',
  stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" stroke="none"/></svg>',
};

/* ---------------- the two languages: English and Hinglish (Hindi in English letters) ---------------- */
const I18N = {
  en: {
    resultsTitle: 'Results',
    heroTitle: 'Tell Pia what you want. She finds the best price.',
    heroSub: 'Say it in English or Hinglish. Pia checks Myntra, Amazon and Nykaa and shows you the three lowest prices.',
    howTitle: 'How it works',
    step1T: '1. Speak', step1P: 'Tap the mic and say what you need.',
    step2T: '2. Pia searches', step2P: 'She compares the stores live.',
    step3T: '3. You choose', step3P: 'Tap a result to open the store.',
    tryTitle: 'Try it',
    lblKey: 'Sarvam API key', phKey: 'Paste your Sarvam key',
    lblName: 'Your name (optional)', phName: 'e.g. Neha',
    lblGender: 'Gender (optional)', gNone: 'Prefer not to say', gFemale: 'Female', gMale: 'Male',
    advanced: 'Advanced', lblVoice: "Pia's voice", btnStart: 'Get started',
    keyNote: 'Your key stays in this browser tab and is sent only to Sarvam. It is never saved on our server.',
    getKey: 'How to get a Sarvam key', demoLink: 'Watch the recorded demo (coming soon)',
    github: 'View the code and specs on GitHub',
    disclaimer: 'A portfolio project built with Sarvam AI. Not affiliated with Myntra, Amazon or Nykaa. Prices come from a third-party search and may differ in the store.',
    needKey: 'Please paste your Sarvam key first.',
    greeting: n => `Hello${n ? ' ' + n : ''}! Tell me what you are looking for. I can search Myntra, Amazon and Nykaa.`,
    chips: ['white sneakers under 2000', 'pink saree blouse', 'Huda Beauty concealer'],
    statusReady: 'Tap to speak', statusListen: 'Listening... tap to send', statusThink: 'Thinking...', statusSpeak: 'Pia is speaking',
    earlier: n => `Earlier (${n})`, replay: 'Play this reply', stopPlay: 'Stop',
    btnMore: 'Show next 3', moreText: 'Show the next 3', changeKey: 'Change key',
    detailsTitle: 'Details', speedTitle: 'Speed (ms)', checksTitle: 'Automatic checks',
    refine: [{ label: 'Higher rated', send: 'Show higher rated ones' }, { label: 'Higher priced', send: 'Show higher priced ones' }, { label: 'New search', send: 'I want to start a new search' }],
    confirmSend: c => `I mean ${c}`, platformOnly: p => `Show only ${p}`, platformAll: 'All platforms', platformAllSend: 'Show all platforms',
    notRated: 'No ratings yet', viewOn: (p, price) => `${p} ${price}`, pniaName: 'Pia',
    errKeyBad: 'The Sarvam key does not look right. Please try a different key.',
    errCredits: 'Your Sarvam credits or rate limit seem to have run out. Please check the Sarvam dashboard.',
    errServer: 'Sarvam is not responding right now. Please try again in a moment.',
    errRejected: m => 'Sarvam did not accept the request' + (m ? ': ' + m : '.'),
    errNet: 'Could not reach the internet or Sarvam.',
    errSearchNet: 'Could not reach product search.',
    errSearch: 'Product search had a problem. Please try again in a moment.',
    errMic: 'Microphone permission was not given. Please allow the mic in your browser.',
    errShort: 'That was too short. Please try again.',
    noSpeech: 'I did not hear anything. Please try again.',
    errGeneric: 'Something went wrong: ',
    errPlay: 'The browser blocked the audio. Click on the page once and try again.',
    fallback: 'Sorry, something went wrong. Could you say that again?',
  },
  hi: {
    resultsTitle: 'Results',
    heroTitle: 'Pia ko bataiye aap kya chahte hain. Sabse achha price woh nikaal degi.',
    heroSub: 'English ya Hinglish mein bolein. Pia Myntra, Amazon aur Nykaa dekhkar sabse kam daam ke teen options dikhati hai.',
    howTitle: 'Yeh kaise kaam karta hai',
    step1T: '1. Bolein', step1P: 'Mic dabayein aur bataiye aapko kya chahiye.',
    step2T: '2. Pia dekhti hai', step2P: 'Woh stores ko live compare karti hai.',
    step3T: '3. Aap chunein', step3P: 'Kisi bhi option par tap karke store kholein.',
    tryTitle: 'Aazma kar dekhein',
    lblKey: 'Sarvam API key', phKey: 'Apni Sarvam key paste karein',
    lblName: 'Aapka naam (optional)', phName: 'jaise Neha',
    lblGender: 'Gender (optional)', gNone: 'Batana nahi chahte', gFemale: 'Female', gMale: 'Male',
    advanced: 'Advanced', lblVoice: 'Pia ki awaaz', btnStart: 'Shuru karein',
    keyNote: 'Aapki key sirf is browser tab mein rehti hai aur sirf Sarvam ko bheji jaati hai. Hamare server par save nahi hoti.',
    getKey: 'Sarvam key kaise paayein', demoLink: 'Recorded demo dekhein (jaldi aa raha hai)',
    github: 'Code aur specs GitHub par dekhein',
    disclaimer: 'Yeh ek portfolio project hai, Sarvam AI ke saath banaya gaya. Myntra, Amazon ya Nykaa se judaa nahi hai. Prices ek third-party search se aate hain aur store mein alag ho sakte hain.',
    needKey: 'Pehle apni Sarvam key paste karein.',
    greeting: n => `Namaste${n ? ' ' + n : ''}! Bolkar batayein aap kya dhoondh rahe hain. Main Myntra, Amazon aur Nykaa dekh sakti hoon.`,
    chips: ['2000 ke andar white sneakers', 'pink saree ke liye blouse', 'Huda Beauty ka concealer'],
    statusReady: 'Bolne ke liye tap karein', statusListen: 'Sun rahi hoon... bhejne ke liye tap karein', statusThink: 'Soch rahi hoon...', statusSpeak: 'Pia bol rahi hai',
    earlier: n => `Pehle ki baatein (${n})`, replay: 'Yeh jawab sunein', stopPlay: 'Roken',
    btnMore: 'Agle 3 dikhao', moreText: 'Agle 3 dikhao', changeKey: 'Key badlein',
    detailsTitle: 'Details', speedTitle: 'Speed (ms)', checksTitle: 'Automatic checks',
    refine: [{ label: 'Zyada rating wale', send: 'Zyada rating wale dikhao' }, { label: 'Zyada price wale', send: 'Zyada price wale dikhao' }, { label: 'Naya search', send: 'Mujhe naya search karna hai' }],
    confirmSend: c => `Mujhe ${c} chahiye`, platformOnly: p => `${p} par hi dikhao`, platformAll: 'Sab platforms', platformAllSend: 'Sab platforms dikhao',
    notRated: 'Abhi ratings nahi hain', viewOn: (p, price) => `${p} ${price}`, pniaName: 'Pia',
    errKeyBad: 'Sarvam key sahi nahi lag rahi. Key badal kar dekhein.',
    errCredits: 'Sarvam credits ya limit khatam ho gayi lagti hai. Dashboard mein check karein.',
    errServer: 'Sarvam abhi jawab nahi de raha. Thodi der baad try karein.',
    errRejected: m => 'Sarvam ne request nahi li' + (m ? ': ' + m : '.'),
    errNet: 'Internet ya Sarvam se connection nahi ho paaya.',
    errSearchNet: 'Product search se connection nahi ho paaya.',
    errSearch: 'Product search mein dikkat aayi. Thodi der baad try karein.',
    errMic: 'Microphone ki permission nahi mili. Browser mein mic allow karein.',
    errShort: 'Bahut chhota tha. Dobara bolein.',
    noSpeech: 'Mujhe kuch sunai nahi diya, kripya dobara bolein.',
    errGeneric: 'Kuch gadbad ho gayi: ',
    errPlay: 'Browser ne awaaz chalane se roka. Page par ek baar click karke dobara try karein.',
    fallback: 'Maaf kijiye, kuch gadbad ho gayi. Kya aap dobara bol sakte hain?',
  },
};
const t = (k, ...a) => { const v = (I18N[S.lang] || I18N.hi)[k]; return typeof v === 'function' ? v(...a) : v ?? k; };
const speechLang = () => (S.lang === 'en' ? 'en-IN' : 'hi-IN');

function applyLang() {
  document.documentElement.lang = S.lang === 'en' ? 'en' : 'hi-Latn';
  document.querySelectorAll('[data-i]').forEach(e => { e.textContent = t(e.dataset.i); });
  document.querySelectorAll('[data-ph]').forEach(e => { e.placeholder = t(e.dataset.ph); });
  document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === S.lang)));
  document.querySelectorAll('.row-pia .spk').forEach(b => { b.setAttribute('aria-label', t('replay')); });
  renderChips(); updateEarlier(); render();
}
function setLang(l) { S.lang = l; store.set('lang', l); applyLang(); }

/* ---------------- errors from the services ---------------- */
class ApiError extends Error {}
function friendly(status, body) {
  const msg = body?.error?.message || '';
  if (status === 401 || status === 403) return t('errKeyBad');
  if (status === 402 || status === 429) return t('errCredits');
  if (status >= 500) return t('errServer');
  return t('errRejected', msg ? msg.slice(0, 120) : '');
}
async function api(path, init) {
  let res;
  try { res = await fetch(BASE + path, init); }
  catch { throw new ApiError(t('errNet')); }
  let body = null;
  try { body = await res.json(); } catch { /* not json */ }
  if (!res.ok) { const err = new ApiError(friendly(res.status, body)); err.keyProblem = res.status === 401 || res.status === 403; throw err; }
  return body;
}
const headers = extra => ({ 'api-subscription-key': S.key, ...extra });

/* ---------------- screen state ---------------- */
function render() {
  const idle = !S.recording && !S.busy && !S.speaking;
  $('mic').disabled = !(idle || S.recording);
  $('mic').classList.toggle('recording', S.recording);
  $('waveL').classList.toggle('on', S.recording);
  $('waveR').classList.toggle('on', S.recording);
  $('status').textContent = S.recording ? t('statusListen') : S.speaking ? t('statusSpeak') : S.busy ? t('statusThink') : t('statusReady');
  $('more').disabled = !idle;
  document.querySelectorAll('#chips button').forEach(b => { b.disabled = !idle; });
}
function showError(text, keyProblem) {
  const box = $('error'); box.textContent = text || '';
  if (text && keyProblem) { const b = el('button', 'linklike', t('changeKey')); b.type = 'button'; b.onclick = leaveMain; box.append(' ', b); }
}

/* ---------------- conversation bubbles: only the latest exchange stays open ---------------- */
function shiftLatest() {
  const latest = $('latest');
  while (latest.firstChild) $('earlierList').append(latest.firstChild);
  updateEarlier();
}
function updateEarlier() {
  const n = $('earlierList').children.length;
  $('earlier').hidden = n === 0;
  $('earlierSum').textContent = t('earlier', n);
}
function scrollIntoViewSoft(node) { try { node.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch { /* ignore */ } }
function addUser(text) {
  shiftLatest(); $('chips').hidden = true; S.chipMode = 'none';
  const row = el('div', 'row-me'); row.append(el('div', 'bubble me', text));
  $('latest').append(row); scrollIntoViewSoft(row);
}
function addPia(text) {
  const row = el('div', 'row-pia');
  const avatar = el('span', 'avatar', 'P'); avatar.setAttribute('aria-hidden', 'true');
  const col = el('div', 'pia-col'); col.append(el('span', 'pname', t('pniaName')));
  const bubble = el('div', 'bubble pia');
  const btn = el('button', 'spk'); btn.type = 'button'; btn.disabled = true; btn.innerHTML = ICON.speaker; btn.setAttribute('aria-label', t('replay'));
  bubble.append(btn, el('span', null, text)); col.append(bubble); row.append(avatar, col);
  row.btn = btn; row.b64 = null;
  btn.onclick = () => toggleBubble(row);
  $('latest').append(row); scrollIntoViewSoft(row);
  return row;
}
function showChipList(items, mode) {
  const box = $('chips'); box.textContent = ''; box.hidden = false; S.chipMode = mode;
  for (const c of items) {
    const b = el('button', null, c.label); b.type = 'button';
    b.onclick = () => guarded(() => runTurn(c.send, speechLang(), 0, performance.now()));
    box.append(b);
  }
  render();
}
function renderChips() {
  if (S.chipMode !== 'starter') return;
  const list = t('chips');
  if (Array.isArray(list)) showChipList(list.map(text => ({ label: text, send: text })), 'starter');
}
function showChoices(items) { showChipList(items, 'choices'); }
function renderPlatformChips(category, active) {
  const box = $('platformChips'); box.textContent = '';
  const stores = category === 'beauty' ? ['Myntra', 'Nykaa'] : ['Myntra', 'Amazon'];
  const all = el('button', null, t('platformAll')); all.type = 'button'; all.setAttribute('aria-pressed', String(!active));
  all.onclick = () => guarded(() => runTurn(t('platformAllSend'), speechLang(), 0, performance.now()));
  box.append(all);
  for (const p of stores) {
    const b = el('button', null, p); b.type = 'button'; b.setAttribute('aria-pressed', String(active === p));
    b.onclick = () => guarded(() => runTurn(t('platformOnly', p), speechLang(), 0, performance.now()));
    box.append(b);
  }
  box.hidden = false;
}

/* ---------------- intro and entering the app ---------------- */
function enterMain() {
  $('intro').hidden = true; $('app').hidden = false; $('detailsBtn').hidden = false;
  $('latest').textContent = ''; $('earlierList').textContent = ''; $('cards').textContent = '';
  $('results').hidden = true; $('platformChips').textContent = ''; S.chipMode = 'starter';
  const row = addPia(t('greeting', S.name)); row.btn.hidden = true;
  updateEarlier(); renderChips(); render();
  if (S.key) preloadCues();
}
function leaveMain() {
  stopAudio(); store.del('key');
  $('app').hidden = true; $('detailsBtn').hidden = true; $('intro').hidden = false; $('key').value = '';
  if ($('details').open) $('details').close();
}
$('start').onclick = () => {
  const key = $('key').value.trim();
  if (!key) { $('setupError').textContent = t('needKey'); return; }
  $('setupError').textContent = '';
  S.key = key; S.name = $('name').value.trim(); S.gender = $('gender').value; S.voice = $('voice').value;
  store.set('key', S.key); store.set('name', S.name); store.set('gender', S.gender); store.set('voice', S.voice);
  S.messages = []; enterMain();
};
$('changeKey').onclick = leaveMain;
$('demoLink').onclick = e => e.preventDefault();
$('detailsBtn').onclick = () => { if (typeof $('details').showModal === 'function') $('details').showModal(); };
$('closeDetails').onclick = () => $('details').close();

/* ---------------- tools and prompt ---------------- */
const TOOLS = [{ type: 'function', function: {
  name: 'search_products',
  description: 'Search fashion and beauty products on Myntra, Amazon and Nykaa. Returns up to 3 results per page.',
  parameters: { type: 'object', properties: {
    query: { type: 'string', description: 'What to search for, in English letters, e.g. "purple saree blouse". Include a colour if the user said one. Do NOT put a brand name here: use the brand field.' },
    category: { type: 'string', enum: ['clothing', 'footwear', 'accessories', 'jewellery', 'beauty'] },
    max_price: { type: 'number', description: 'Maximum price in rupees. Only if the user gave one.' },
    brand: { type: 'string', description: 'Brand name, whenever the user names or confirms one (for example Kay Beauty). Never leave a brand inside query.' },
    platform: { type: 'string', enum: ['Myntra', 'Amazon', 'Nykaa'], description: 'Only if the user asked for one platform.' },
    sort: { type: 'string', enum: ['lowest_price', 'highest_rating', 'highest_price'], description: 'Default lowest_price.' },
    page: { type: 'number', description: '1 for the first 3 results, 2 for the next 3, and so on.' } },
    required: ['query', 'category'] } } },
  { type: 'function', function: {
    name: 'show_choices',
    description: 'Show tappable buttons on screen when the user is vague, for example "isse accha kuch". kind refine shows: higher rated, higher priced, new search.',
    parameters: { type: 'object', properties: { kind: { type: 'string', enum: ['refine'] } }, required: ['kind'] } } }];

function wording() {
  if (S.lang === 'en') return `Use these sentence patterns and fill in the gaps. Do not invent other forms.
- Results: "The lowest listed price is {short_name} at {price} rupees on {platform}, rated {rating}. Would you like to pick one, or see more?"
- No match: "Sorry, I could not find anything for '{searched_for}'. Would you like to change the colour or the budget?"
- Nothing on the chosen platform: "I found nothing on {platform}, but there are results on {platforms}. Shall I show them?"
- Vague request: "Would you like higher rated, higher priced, or a new search?"
- Not shopping: "I can only help with finding fashion and beauty products. What would you like to look for?"
- Brand check: "Did you mean {candidates}?"`;
  return `Use these sentence patterns and fill in the gaps. Do not invent other forms, and never use the word "dhoondh"; say "search" or "dekh".
- Results: "Sabse kam daam {short_name} ka hai, {price} rupaye mein {platform} par, rating {rating}. Aap pick kijiye ya aur dekhein?"
- No match: "Sorry, mujhe '{searched_for}' ke liye kuch nahi mila. Kya aap rang ya budget badalna chahenge?"
- Nothing on the chosen platform: "{platform} par yeh nahi mila, lekin {platforms} par mila hai. Kya main dikhaun?"
- Vague request: "Aap kya chahenge: zyada rating wale, zyada price wale, ya naya search?"
- Not shopping: "Main sirf fashion aur beauty products search karne mein madad kar sakti hoon. Aap kya dekhna chahenge?"
- Brand check: "Aap {candidates} mein se kaunsa keh rahe hain?"
Grammar: Pia is female and speaks about herself in feminine forms. Pia never offers to do something herself that she cannot do, such as trying another product or brand on her own. Address the user with neutral polite forms like "chahenge" and "dekhein".`;
}

function systemPrompt() {
  const who = S.gender === 'female' ? 'The user is a woman: when you address her, use feminine verb forms where Hindi needs them.'
    : S.gender === 'male' ? 'The user is a man: when you address him, use masculine verb forms where Hindi needs them.'
    : 'The user did not say their gender: avoid verb forms that depend on the user\'s gender.';
  const nm = S.name ? `The user's name is ${S.name}. Use it at most once in a while, never in every reply.` : '';
  return `You are Pia, a friendly, semi-formal Indian shopping assistant who helps people find fashion and beauty products on Myntra, Amazon and Nykaa.

Style:
- ${S.lang === 'en' ? 'Reply in simple English only.' : 'Reply in Hinglish: Hindi written in English letters (Roman script), mixed naturally with English words, never in Devanagari.'} Earlier replies in this conversation may be in the other language: ignore that and use only this language.
- Address the user as "aap". Never use "tu" or "tum". You are female: use feminine forms for yourself ("kar sakti hoon", "dekh rahi hoon").
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
- If the user says something vague like "isse accha kuch", do not guess: call show_choices with kind refine (the screen then shows buttons: higher rated, higher priced, new search) and ask in one short sentence which they would like. When they pick, search again with sort highest_rating or highest_price, or start a new search.
- When the user starts looking for a different item, start a fresh search: do not carry over the price limit, brand or platform from earlier searches. Carry them over only when they are refining the same search. If they ask for all platforms again after choosing one, search again without a platform.
- If status is confirm_brand, do not search yet: ask ONE short question naming the candidates. The screen shows them as buttons.
- If the user chooses Korean beauty ("I mean Korean beauty"), search with the word korean and the product in the query (for example "korean lipstick", category beauty) and no brand. That means brands from Korea, so never show other brands as Korean beauty.
- When the user confirms a brand ("I mean Kay Beauty", "Mujhe Kay Beauty chahiye") or rejects one of the candidates ("not Korean beauty"), take the other candidate as the answer and call search_products with that brand in the brand field. Never drop a brand the user asked for and show other brands instead; if nothing is found for that brand, say so.
- If a brand name sounds misheard or could mean two things, ask once to confirm it before searching.
- For anything that is not shopping for fashion or beauty (recipes, weather, general questions, whether an outfit suits them), politely say in one sentence that you can only help with finding fashion and beauty products. Do not call a tool.
- If the user is rude, stay polite and steer back to shopping once.

${wording()}`;
}

const shortName = n => String(n).split(/[|,(]/)[0].trim().split(/\s+/).slice(0, 7).join(' ');

/* ---------------- product search (our own backend) ---------------- */
async function realSearch(args) {
  let res;
  try {
    res = await fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
  } catch { throw new ApiError(t('errSearchNet')); }
  if (!res.ok) throw new ApiError(t('errSearch'));
  const d = await res.json();
  if (d.status === 'confirm_brand') {
    return { groups: [], llm: { status: 'confirm_brand', heard: d.heard, candidates: d.candidates }, total: 0, page: 1,
      confirm: d.candidates.map(c => ({ label: c, send: t('confirmSend', c) })) };
  }
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
    const card = el('article', 'pcard');
    const top = el('div', 'ptop');
    if (safeLink(g.image_url)) {
      const img = el('img', 'pimg'); img.src = g.image_url; img.alt = ''; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer'; top.append(img);
    } else top.append(el('div', 'pimg'));
    const info = el('div', 'pinfo');
    const price = el('div', 'pprice', rupees(g.best.price));
    if (g.mrp > g.best.price) { price.append(el('span', 'pmrp', rupees(g.mrp)), el('span', 'poff', g.discount_pct + '% off')); }
    info.append(el('span', 'prank', '#' + g.rank), el('span', 'pname-t', g.name), price,
      el('span', 'prate', g.rating ? `★ ${g.rating.toFixed(1)} (${g.rating_count.toLocaleString('en-IN')})` : t('notRated')));
    top.append(info);
    const stores = el('div', 'stores');
    g.listings.forEach((l, i) => {
      const href = safeLink(l.link); if (!href) return;
      const a = el('a', i === 0 ? 'best' : null, t('viewOn', l.platform, rupees(l.price))); a.href = href; a.target = '_blank'; a.rel = 'noopener'; stores.append(a);
    });
    card.append(top, stores); box.append(card);
  }
  $('results').hidden = groups.length === 0;
  $('more').hidden = !(groups.length && S.last && S.last.total > S.last.page * 3);
}

/* ---------------- Sarvam calls ---------------- */
async function transcribe(blob) {
  const fd = new FormData();
  fd.append('file', blob, 'recording.webm'); fd.append('model', 'saaras:v3'); fd.append('mode', 'translit'); fd.append('language_code', 'unknown');
  const t0 = performance.now();
  const body = await api('/speech-to-text', { method: 'POST', headers: headers(), body: fd });
  return { text: (body.transcript || '').trim(), lang: body.language_code || '', ms: performance.now() - t0 };
}
async function chat(messages) {
  const t0 = performance.now();
  const body = await api('/v1/chat/completions', { method: 'POST', headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ model: 'sarvam-105b', temperature: 0.3, max_tokens: 500, reasoning_effort: null, messages, tools: TOOLS, tool_choice: 'auto' }) });
  return { msg: body.choices?.[0]?.message || {}, ms: performance.now() - t0 };
}
async function speak(text, lang) {
  const t0 = performance.now();
  let clean = text.replace(/[*_`#]/g, '').slice(0, 2400);
  if (!/^en/i.test(lang)) clean = applyLexicon(clean);
  const body = await api('/text-to-speech', { method: 'POST', headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ text: clean, language_code: /^en/i.test(lang) ? 'en-IN' : 'hi-IN', model: 'bulbul:v4-flash',
      speaker: S.voice, pace: 1.0, speech_sample_rate: 24000, output_audio_codec: 'wav' }) });
  return { b64: body.audios?.[0] || '', ms: performance.now() - t0 };
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
function addCheck(reply, words, flags) {
  const li = el('li', null, `${words} words · ${reply.slice(0, 60)}${reply.length > 60 ? '…' : ''}`);
  if (flags.length) li.append(el('span', 'flag', ' ⚠ ' + flags.join('; ')));
  $('checks').prepend(li);
}

/* ---------------- language control and pronunciation ---------------- */
// Roman spellings the voice says badly are swapped for Devanagari just before speaking (add more as testing finds them).
const LEXICON = { dhoondh: 'ढूँढ', dhoondhne: 'ढूँढने', dhoondhna: 'ढूँढना', dhoondhti: 'ढूँढती', dhoondhta: 'ढूँढता', dhoondhein: 'ढूँढें' };
function applyLexicon(text) { return text.replace(/\b(dhoondh\w*)\b/gi, w => LEXICON[w.toLowerCase()] || w); }

const HI_WORDS = /\b(mujhe|nahi|kya|aap|hai|hain|kijiye|chahiye|dikhao|milega|mila|rahi|karein|bataiye|mein|liye|kuch|dekhna|chahenge)\b/gi;
function wrongLanguage(r) {
  if (S.lang === 'en') return (r.match(HI_WORDS) || []).length >= 2;
  return /[ऀ-ॿ]/.test(r);
}
// Models tend to copy the user's language, so remind them of the chosen one inside the latest user message.
function withLangReminder(msgs) {
  const i = msgs.map(m => m.role).lastIndexOf('user');
  if (i < 0) return msgs;
  const note = S.lang === 'en' ? '\n\n(Reply in English only, even if I spoke Hinglish.)' : '\n\n(Reply in Hinglish, English letters only, no Devanagari.)';
  return msgs.map((m, j) => (j === i ? { ...m, content: m.content + note } : m));
}

/* ---------------- audio: the searching line and Pia's replies ---------------- */
const CUES = { hi: 'एक मिनट, ढूँढ रही हूँ।', en: 'One moment, searching for you.' };
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
function markPlaying(row, on) {
  if (!row) return;
  row.classList.toggle('playing', on);
  row.btn.innerHTML = on ? ICON.stop : ICON.speaker;
  row.btn.setAttribute('aria-label', on ? t('stopPlay') : t('replay'));
}
function stopAudio() {
  if (S.audio) { S.audio.pause(); S.audio = null; }
  if (S.cueAudio) { S.cueAudio.pause(); S.cueAudio = null; }
  markPlaying(S.playingEl, false); S.playingEl = null;
  S.speaking = false; render();
}
function playBubble(row, b64, onStart) {
  return new Promise(resolve => {
    if (!b64) { resolve(); return; }
    stopAudio();
    const audio = new Audio('data:audio/wav;base64,' + b64);
    S.audio = audio; S.playingEl = row; markPlaying(row, true);
    let started = false;
    const begin = () => { if (started) return; started = true; if (onStart) onStart(); S.busy = false; S.speaking = true; render(); };
    const done = () => {
      begin();
      if (S.audio === audio) { S.audio = null; markPlaying(row, false); S.playingEl = null; S.speaking = false; render(); }
      resolve();
    };
    audio.onplaying = begin; audio.onended = done; audio.onerror = done;
    audio.play().catch(() => { showError(t('errPlay')); done(); });
  });
}
function toggleBubble(row) {
  if (S.playingEl === row) { stopAudio(); return; }
  if (row.b64 && !S.recording && !S.busy) playBubble(row, row.b64);
}

/* ---------------- one conversation turn ---------------- */
async function runTurn(text, lang, sttMs, tStart) {
  S.messages.push({ role: 'user', content: text });
  addUser(text);
  let llmMs = 0, searchMs = 0, reply = '', grounding = text, cue = null, cueAt = null;
  for (let i = 0; i < 3 && !reply; i++) {
    const { msg, ms } = await chat(withLangReminder([{ role: 'system', content: systemPrompt() }, ...S.messages.slice(-24)]));
    llmMs += ms;
    if (msg.tool_calls?.length) {
      if (!cue) { cue = playCue(S.lang); if (cue) cueAt = performance.now() - tStart; }
      S.messages.push({ role: 'assistant', content: msg.content || '', tool_calls: msg.tool_calls });
      for (const call of msg.tool_calls) {
        let args = {}; try { args = JSON.parse(call.function.arguments); } catch { /* keep {} */ }
        if (call.function.name === 'show_choices') {
          showChoices(t('refine'));
          S.messages.push({ role: 'tool', tool_call_id: call.id, name: call.function.name, content: JSON.stringify({ status: 'shown', buttons: ['higher rated', 'higher priced', 'new search'] }) });
          continue;
        }
        const t1 = performance.now();
        const out = await realSearch(args);
        searchMs += performance.now() - t1;
        if (out.confirm) showChoices(out.confirm);
        else {
          S.last = { args, total: out.total, page: out.page };
          renderCards(out.groups);
          if (out.groups.length) renderPlatformChips(args.category, args.platform); else $('platformChips').hidden = true;
        }
        grounding += ' ' + JSON.stringify(out.llm);
        S.messages.push({ role: 'tool', tool_call_id: call.id, name: call.function.name, content: JSON.stringify(out.llm) });
      }
      continue;
    }
    reply = (msg.content || '').trim();
  }
  let langNote = null;
  if (reply && wrongLanguage(reply)) {
    const ask = S.lang === 'en' ? 'Rewrite your last reply in English only, with the same meaning.' : 'Rewrite your last reply in Hinglish using English letters only, with the same meaning.';
    try {
      const fix = await chat(withLangReminder([{ role: 'system', content: systemPrompt() }, ...S.messages.slice(-24),
        { role: 'assistant', content: reply }, { role: 'user', content: ask }]));
      llmMs += fix.ms;
      const fixed = (fix.msg.content || '').trim();
      langNote = fixed && !wrongLanguage(fixed) ? 'reply was in the wrong language; rewritten' : 'reply is in the wrong language';
      if (fixed && !wrongLanguage(fixed)) reply = fixed;
    } catch { langNote = 'reply is in the wrong language'; }
  }
  if (!reply) reply = t('fallback');
  S.messages.push({ role: 'assistant', content: reply });
  const chk = checkReply(reply, grounding);
  if (langNote) chk.flags.push(langNote);
  addCheck(reply, chk.words, chk.flags);
  const row = addPia(reply);

  const tts = await speak(reply, speechLang());
  row.b64 = tts.b64; row.btn.disabled = !tts.b64;
  if (cue) await cue; // never talk over the searching line
  await playBubble(row, tts.b64, () => addTimingRow([sttMs, llmMs, searchMs, tts.ms], cueAt, performance.now() - tStart));
}

function addTimingRow([stt, llm, search, tts], cueAt, total) {
  const tb = $('timings');
  if (!tb.rows.length) tb.innerHTML = '<tr><th>Turn</th><th>Speech</th><th>Thinking</th><th>Search</th><th>Voice</th><th>Cue at</th><th>Answer at</th></tr>';
  S.turn += 1;
  const r = tb.insertRow();
  [S.turn, ...[stt, llm, search, tts].map(x => Math.round(x)), cueAt == null ? '-' : Math.round(cueAt), Math.round(total)]
    .forEach(v => { r.insertCell().textContent = v; });
}

async function guarded(fn) {
  showError(''); S.busy = true; render();
  try { await fn(); }
  catch (e) { showError(e instanceof ApiError ? e.message : t('errGeneric') + e.message, !!e.keyProblem); }
  finally { S.busy = false; render(); }
}

/* ---------------- microphone ---------------- */
$('mic').onclick = async () => {
  if (S.recording) return stopRecording();
  if (S.busy || S.speaking) return;
  showError('');
  try { S.stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch { showError(t('errMic')); return; }
  S.chunks = [];
  const rec = new MediaRecorder(S.stream); S.rec = rec;
  rec.ondataavailable = e => e.data.size && S.chunks.push(e.data);
  rec.onstop = () => {
    S.stream.getTracks().forEach(tr => tr.stop());
    // Sarvam accepts plain "audio/webm", not "audio/webm;codecs=opus".
    const blob = new Blob(S.chunks, { type: 'audio/webm' });
    const tStart = S.tStop;
    S.recording = false;
    if (performance.now() - S.startedAt < 500) { showError(t('errShort')); render(); return; }
    guarded(async () => {
      const stt = await transcribe(blob);
      if (!stt.text) {
        const row = addPia(t('noSpeech')); const tts = await speak(t('noSpeech'), speechLang());
        row.b64 = tts.b64; row.btn.disabled = !tts.b64; await playBubble(row, tts.b64); return;
      }
      await runTurn(stt.text, stt.lang, stt.ms, tStart);
    });
  };
  rec.start(); S.startedAt = performance.now(); S.recording = true; render();
  S.autoStop = setTimeout(() => S.recording && stopRecording(), MAX_RECORD_MS);
};
function stopRecording() { clearTimeout(S.autoStop); S.tStop = performance.now(); S.rec.stop(); }

$('more').onclick = () => guarded(() => runTurn(t('moreText'), speechLang(), 0, performance.now()));

/* ---------------- start ---------------- */
(function init() {
  S.lang = store.get('lang') || 'hi';
  document.querySelectorAll('[data-lang]').forEach(b => { b.onclick = () => setLang(b.dataset.lang); });
  S.key = store.get('key'); S.name = store.get('name'); S.gender = store.get('gender'); S.voice = store.get('voice') || S.voice;
  $('name').value = S.name; $('gender').value = S.gender; $('voice').value = S.voice;
  applyLang();
  if (S.key) enterMain();
})();
