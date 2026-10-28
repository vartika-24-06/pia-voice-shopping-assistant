'use strict';
/* Pipeline evaluation: runs the real page code (app/static/app.js) in a simulated browser against the real
   Sarvam chat model, with a fake product search (no search credits) and a fake voice.

   It measures understanding (does the model call the right tool with the right details, without inventing
   filters), brand confirmation, refusals and the checks on every reply (language, register, length, grounding).

   Usage (from the project root):
     node tools/eval/pipeline/run.js --mode said     # what the user meant (typed text): isolates understanding
     node tools/eval/pipeline/run.js --mode heard    # what the speech recogniser returned: shows how recognition errors carry through
     options: --only c01,c05    run some conversations
              --repeat 3        run every conversation 3 times (the model is not deterministic)
   Needs SARVAM_API_KEY (the real model is called: roughly a few rupees per run) and the app server (started if needed).
   Reports go to tools/eval/results/pipeline_report_<mode>.md */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync, spawn } = require('child_process');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const STATIC = path.join(ROOT, 'app', 'static');
const RESULTS = path.join(ROOT, 'tools', 'eval', 'results');
const argv = process.argv.slice(2);
const opt = (name, dflt) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : dflt);
const MODE = opt('--mode', 'said');
const ONLY = opt('--only', '') ? opt('--only', '').split(',') : null;
const MIN_GAP_MS = 1700; // the entry plan allows 40 chat requests a minute for this model

function getKey() {
  if (process.env.SARVAM_API_KEY) return process.env.SARVAM_API_KEY;
  try {
    return execSync('powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable(\'SARVAM_API_KEY\',\'User\')"').toString().trim();
  } catch { return ''; }
}

function parseCsv(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter(r => r.length > 1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] || ''])));
}

const WAV = (() => { const n = 2400, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(24000, 24); b.writeUInt32LE(48000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40); return b.toString('base64'); })();

const sleep = ms => new Promise(r => setTimeout(r, ms));
const jsonResponse = (obj, status = 200) => ({ ok: status < 400, status, json: async () => obj, text: async () => JSON.stringify(obj) });

/* fake product search: enough realistic fields; some requests have nothing, to test the no-match path */
function fixture(a) {
  const q = ((a.query || '') + ' ' + (a.brand || '')).toLowerCase();
  const none = (a.max_price && a.max_price <= 100) || (/ferrari/.test(q) && a.max_price && a.max_price <= 1500);
  if (none) return { status: 'no_match', page: 1, total_matches: 0, searched_for: a.query, platforms_searched: ['Myntra', 'Amazon'], platforms_failed: [], results: [], available_elsewhere: null };
  const page = a.page || 1, brand = a.brand || 'Puma';
  const mk = i => ({ rank: (page - 1) * 3 + i, name: `${brand} ${a.query} style ${i} | long marketing title text`, brand, image_url: null, mrp: 1500 + i * 100,
    discount_pct: 40, rating: 4.1, rating_count: 200 + i, best: { platform: 'Myntra', price: 700 + i * 50, link: 'https://www.myntra.com/' },
    listings: [{ platform: 'Myntra', price: 700 + i * 50, link: 'https://www.myntra.com/' }, { platform: 'Amazon', price: 760 + i * 50, link: 'https://www.amazon.in/' }] });
  return { status: 'ok', page, total_matches: 9, searched_for: a.query, platforms_searched: ['Myntra', 'Amazon'], platforms_failed: [], results: [1, 2, 3].map(mk), available_elsewhere: null };
}

async function ensureServer() {
  const up = async () => { try { return (await fetch('http://localhost:8000/api/health')).ok; } catch { return false; } };
  if (await up()) return null;
  const p = spawn('python', ['-m', 'uvicorn', 'main:app', '--port', '8000'], { cwd: path.join(ROOT, 'app', 'backend'), stdio: 'ignore' });
  for (let i = 0; i < 30; i++) { if (await up()) return p; await sleep(500); }
  p.kill(); throw new Error('Could not start the app server');
}

/* ------------------------------------------------------------- scoring one turn */
const has = (hay, needle) => (Array.isArray(needle) ? needle.some(n => hay.includes(n)) : hay.includes(needle));

function scoreTurn(expect, log, state) {
  const c = {}; const notes = [];
  const searches = log.searches, last = searches[searches.length - 1];
  const tools = log.chats.flatMap(x => x.toolCalls.map(t => t.name));
  if (expect.tool === 'search') c.tool = searches.length > 0 && !log.ambiguity;
  else if (expect.tool === 'none') c.tool = searches.length === 0 && !log.ambiguity && !tools.includes('show_choices');
  else if (expect.tool === 'confirm') c.tool = !!log.ambiguity && searches.length === 0 && state.chips.length >= 1;
  else if (expect.tool === 'choices') c.tool = tools.includes('show_choices') && searches.length === 0;
  if (!c.tool) notes.push(`expected ${expect.tool}, got ${log.ambiguity ? 'a brand question' : searches.length ? 'a search' : tools.includes('show_choices') ? 'choice buttons' : 'words only'}`);
  if (expect.tool === 'search' && last) {
    const text = ((last.query || '') + ' ' + (last.brand || '')).toLowerCase();
    if (expect.args) {
      c.args = Object.entries(expect.args).every(([k, v]) => last[k] === v);
      if (!c.args) notes.push('details: wanted ' + JSON.stringify(expect.args) + ' got ' + JSON.stringify(Object.fromEntries(Object.keys(expect.args).map(k => [k, last[k]]))));
    }
    if (expect.query_has) { c.query = expect.query_has.every(n => has(text, n)); if (!c.query) notes.push(`search words "${last.query}" lack ${JSON.stringify(expect.query_has)}`); }
    if (expect.brand) { c.brand = has(text, expect.brand); if (!c.brand) notes.push(`brand ${JSON.stringify(expect.brand)} not in "${last.query}" / brand "${last.brand}"`); }
    if (expect.forbid) { const bad = expect.forbid.filter(k => last[k] !== undefined && last[k] !== null && last[k] !== ''); c.no_invented = bad.length === 0; if (bad.length) notes.push('invented filters: ' + bad.map(k => `${k}=${last[k]}`).join(', ')); }
  }
  const flags = (state.check.split('⚠')[1] || '').trim();
  c.language = !/reply is in the wrong language/.test(flags);
  c.register = !/uses tu\/tum|masculine grammar/.test(flags);
  c.length = !/long \(/.test(flags);
  c.grounded = !/number not in data/.test(flags);
  c.reply = state.reply.length > 0;
  if (expect.reply_matches) { c.reply_says = new RegExp(expect.reply_matches, 'i').test(state.reply); if (!c.reply_says) notes.push('reply does not say nothing was found'); }
  const rewrote = /rewritten/.test(flags);
  if (flags && !/^reply was in the wrong language; rewritten$/.test(flags)) notes.push('flags: ' + flags);
  return { checks: c, pass: Object.values(c).every(Boolean), notes, rewrote };
}

/* ------------------------------------------------------------- main */
(async () => {
  const key = getKey();
  if (!key) { console.error('SARVAM_API_KEY not found'); process.exit(1); }
  const server = await ensureServer();
  const REPEAT = parseInt(opt('--repeat', '1'), 10);   // the model is not deterministic: repeat to see how often it goes wrong
  const base = JSON.parse(fs.readFileSync(path.join(__dirname, 'cases.json'), 'utf8')).filter(c => !ONLY || ONLY.includes(c.id));
  const cases = [];
  for (let r = 1; r <= REPEAT; r++) for (const c of base) cases.push(REPEAT > 1 ? { ...c, id: `${c.id}#${r}` } : c);
  const transcripts = Object.fromEntries(parseCsv(fs.readFileSync(path.join(ROOT, 'recordings', 'transcripts.csv'), 'utf8')).map(r => [r.file, r.what_i_said]));
  const heardRaw = JSON.parse(fs.readFileSync(path.join(RESULTS, 'raw', 'v3_translit.json'), 'utf8'));

  const html = fs.readFileSync(path.join(STATIC, 'index.html'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost:8000/', pretendToBeVisual: true });
  const win = dom.window, ctx = dom.getInternalVMContext();
  const run = code => new vm.Script(code).runInContext(ctx);
  win.sessionStorage.setItem('key', key); win.sessionStorage.setItem('name', 'Neha'); win.sessionStorage.setItem('gender', 'female');
  win.Audio = class { constructor(s) { this.src = s; } play() { setTimeout(() => { this.onplaying && this.onplaying(); setTimeout(() => this.onended && this.onended(), 5); }, 5); return Promise.resolve(); } pause() {} };

  let log = null, lastChat = 0;
  win.fetch = async (url, init = {}) => {
    url = String(url);
    if (url === '/api/search') { const a = JSON.parse(init.body); log.searches.push(a); return jsonResponse(fixture(a)); }
    if (url === '/api/ambiguity') {
      const r = await fetch('http://localhost:8000/api/ambiguity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: init.body });
      const j = await r.json(); log.ambiguity = j.ambiguous; return jsonResponse(j);
    }
    if (url.endsWith('/text-to-speech')) return jsonResponse({ audios: [WAV] });
    if (url.includes('/v1/chat/completions')) {
      for (let attempt = 0; attempt < 4; attempt++) {
        const wait = lastChat + MIN_GAP_MS - Date.now(); if (wait > 0) await sleep(wait);
        const t0 = Date.now();
        const r = await fetch(url, { method: 'POST', headers: init.headers, body: init.body }); lastChat = Date.now();
        const j = await r.json().catch(() => ({}));
        if (r.status === 429 || r.status >= 500) { await sleep(3000 * (attempt + 1)); continue; }
        const msg = (j.choices && j.choices[0] && j.choices[0].message) || {};
        log.chats.push({ ms: Date.now() - t0, forced: typeof JSON.parse(init.body).tool_choice === 'object', content: msg.content || '',
          toolCalls: (msg.tool_calls || []).map(t => ({ name: t.function.name, args: t.function.arguments })), status: r.status });
        return jsonResponse(j, r.status);
      }
      return jsonResponse({ error: { message: 'rate limited' } }, 429);
    }
    return jsonResponse({});
  };
  run(fs.readFileSync(path.join(STATIC, 'app.js'), 'utf8'));

  const out = [];
  for (const c of cases) {
    run(`S.messages = []; S.pending = null; S.last = null; S.chipMode = 'starter'; $('latest').textContent = ''; $('earlierList').textContent = ''; $('cards').textContent = ''; $('checks').textContent = ''; setLang(${JSON.stringify(c.lang)});`);
    const turns = [];
    for (const t of c.turns) {
      const said = t.clip ? transcripts[t.clip] : t.text;
      const heard = t.clip ? (heardRaw[t.clip] || {}).hypothesis : t.text;
      const text = MODE === 'heard' ? heard : said;
      const expect = MODE === 'heard' && t.expect_heard ? t.expect_heard : t.expect;
      log = { chats: [], searches: [], ambiguity: null };
      const t0 = Date.now();
      let err = null;
      try { await run(`guarded(() => runTurn(${JSON.stringify(text)}, speechLang(), 0, performance.now(), { spoken: true }))`); } catch (e) { err = String(e); }
      const state = JSON.parse(run(`JSON.stringify({ reply: (() => { const b = [...document.querySelectorAll('#latest .bubble.pia')].pop(); return b ? b.textContent : ''; })(),
        chips: [...document.querySelectorAll('#chips button')].map(b => b.textContent), check: (document.querySelector('#checks li') || {}).textContent || '', error: document.getElementById('error').textContent })`));
      const s = scoreTurn(expect, log, state);
      if (state.error) s.notes.push('screen error: ' + state.error);
      turns.push({ said, text, expect, ...s, reply: state.reply, chips: state.chips, ms: Date.now() - t0, llmCalls: log.chats.length, tools: log.chats.flatMap(x => x.toolCalls.map(y => y.name)), err });
      console.log(`${c.id} ${s.pass ? 'PASS' : 'FAIL'} | ${text} | ${s.notes.join('; ') || 'ok'}`);
    }
    out.push({ id: c.id, type: c.type, lang: c.lang, turns });
  }

  /* report */
  const all = out.flatMap(c => c.turns.map(t => ({ ...t, id: c.id, type: c.type })));
  const rate = (f, filter = () => true) => { const xs = all.filter(t => filter(t) && f(t) !== undefined); const ok = xs.filter(t => f(t)).length; return xs.length ? `${Math.round(100 * ok / xs.length)}% (${ok}/${xs.length})` : 'n/a'; };
  const L = [`# Pipeline evaluation: ${MODE} text`, '',
    `Run ${new Date().toISOString().slice(0, 10)}. ${out.length} conversations, ${all.length} turns. Real Sarvam-105B and the real page code; fake product search and voice.`,
    MODE === 'said' ? 'Input: what was said (typed), so this isolates the model and the page logic.' : 'Input: what the speech recogniser returned, so recognition errors carry through.', '',
    '## Summary', '', '| Measure | Result |', '|---|---|',
    `| Turns fully correct | ${rate(t => t.pass)} |`,
    `| Right tool (search / refuse / ask / buttons) | ${rate(t => t.checks.tool)} |`,
    `| Right search details (category, price limit, page) | ${rate(t => t.checks.args)} |`,
    `| Search words contain what the user meant | ${rate(t => t.checks.query)} |`,
    `| Brand carried into the search | ${rate(t => t.checks.brand)} |`,
    `| No invented filters (platform, brand, price) | ${rate(t => t.checks.no_invented)} |`,
    `| Replies in the chosen language (final) | ${rate(t => t.checks.language)} |`,
    `| Replies needing a language rewrite | ${all.filter(t => t.rewrote).length} of ${all.length} |`,
    `| Replies without tu/tum or masculine grammar for Pia | ${rate(t => t.checks.register)} |`,
    `| Replies under 40 words | ${rate(t => t.checks.length)} |`,
    `| Every number spoken is in the data (grounded) | ${rate(t => t.checks.grounded)} |`,
    `| Out-of-scope refused without searching | ${rate(t => t.checks.tool, t => t.type === 'out of scope')} |`,
    `| Brand doubts asked, not guessed | ${rate(t => t.checks.tool, t => t.expect.tool === 'confirm')} |`,
    `| Mean time per turn / model calls per turn | ${(all.reduce((a, t) => a + t.ms, 0) / all.length / 1000).toFixed(1)} s (includes pacing for the rate limit) / ${(all.reduce((a, t) => a + t.llmCalls, 0) / all.length).toFixed(1)} |`,
    '', '## Every turn', '', '| Conversation | Type | Input to the model | Result | What went wrong |', '|---|---|---|---|---|'];
  for (const t of all) L.push(`| ${t.id} | ${t.type} | ${t.text} | ${t.pass ? 'pass' : 'FAIL'} | ${t.notes.join('; ').replace(/\|/g, '/') || ''} |`);
  L.push('', '## Replies', '', '| Conversation | Reply |', '|---|---|');
  for (const t of all) L.push(`| ${t.id} | ${t.reply.replace(/\|/g, '/')} |`);
  fs.mkdirSync(RESULTS, { recursive: true });
  fs.writeFileSync(path.join(RESULTS, `pipeline_report_${MODE}.md`), L.join('\n') + '\n');
  fs.writeFileSync(path.join(RESULTS, `pipeline_eval_${MODE}.json`), JSON.stringify(out, null, 1));
  console.log(`\nturns fully correct: ${rate(t => t.pass)}`);
  if (server) server.kill();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
