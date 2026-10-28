/* Browser smoke test for the Pia page, with a simulated Sarvam (no key, no voice, no search credits).
   How to run: `python tools/smoke/run_smoke.py` (starts the server if needed, runs this file in headless Chrome and
   prints one line per check), or paste this whole file into the browser console on http://localhost:8000.
   Run it before every commit that touches app/static. */
(async () => {
  const results = [];
  const check = (name, pass, detail) => results.push({ name, pass: !!pass, detail: pass ? '' : JSON.stringify(detail) });
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const wav = (() => { const n = 2400, b = new ArrayBuffer(44 + n * 2), v = new DataView(b), w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 24000, true); v.setUint32(28, 48000, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true); let s = ''; new Uint8Array(b).forEach(x => s += String.fromCharCode(x)); return btoa(s); })();

  sessionStorage.clear();
  // A pretend audio player: sound is not what is being tested, and headless browsers have no audio device.
  window.Audio = class { constructor(src) { this.src = src; }
    play() { setTimeout(() => { this.onplaying && this.onplaying(); setTimeout(() => this.onended && this.onended(), 20); }, 10); return Promise.resolve(); }
    pause() {} };
  const realFetch = window.fetch.bind(window);
  let mode = 'normal'; const searches = []; const forced = [];
  const product = (i, brand) => ({ rank: i, name: `${brand} Item ${i}`, brand, image_url: null, mrp: 1000, discount_pct: 30, rating: 4.2, rating_count: 100,
    best: { platform: 'Myntra', price: 700, link: 'https://www.myntra.com/' }, listings: [{ platform: 'Myntra', price: 700, link: 'https://www.myntra.com/' }] });
  window.fetch = async (url, opts) => {
    if (url === '/api/ambiguity') return realFetch(url, opts);
    if (url === '/api/search') {
      const a = JSON.parse(opts.body); searches.push(a);
      const page = a.page || 1;
      return new Response(JSON.stringify({ status: 'ok', page, total_matches: 6, platforms_failed: [], searched_for: a.query,
        results: [1, 2, 3].map(i => product((page - 1) * 3 + i, a.brand || 'Puma')) }), { status: 200 });
    }
    if (url.endsWith('/v1/chat/completions')) {
      if (mode === 'badkey') return new Response(JSON.stringify({ error: { message: 'bad' } }), { status: 403 });
      const body = JSON.parse(opts.body), last = body.messages[body.messages.length - 1];
      if (typeof body.tool_choice === 'object') forced.push(last.content.slice(0, 60));
      const call = (name, args) => new Response(JSON.stringify({ choices: [{ message: { content: null, tool_calls: [{ id: 'c' + Math.random(), function: { name, arguments: JSON.stringify(args) } }] } }] }), { status: 200 });
      const say = txt => new Response(JSON.stringify({ choices: [{ message: { content: txt } }] }), { status: 200 });
      if (last.role === 'tool') return say(mode === 'wronglang' ? 'Mujhe kuch nahi mila, kya aap kuch aur dekhna chahenge?' : 'Sabse kam daam Puma Item 1 ka hai, 700 rupaye mein Myntra par, rating 4.2.');
      if (/Rewrite your last reply/.test(last.content)) return say('Sorry, I found nothing. Would you like to change the budget?');
      if (typeof body.tool_choice === 'object') return call('search_products', { query: 'lipstick', category: 'beauty', brand: 'Kay Beauty' });
      if (/accha kuch/.test(last.content)) return call('show_choices', { kind: 'refine' });
      if (/Agle 3/.test(last.content)) return call('search_products', { query: 'sneakers', category: 'footwear', page: 2 });
      if (/Mujhe Kay Beauty/.test(last.content)) return say('Aap Kay Beauty ya Korean beauty mein se kaunsa keh rahe hain?');
      return call('search_products', { query: 'sneakers', category: 'footwear' });
    }
    if (url.endsWith('/text-to-speech')) return new Response(JSON.stringify({ audios: [wav] }), { status: 200 });
    return new Response('{}', { status: 200 });
  };

  // intro page and languages (start from the intro even if this tab already held a session)
  if (!$('app').hidden) leaveMain();
  check('intro visible', !$('intro').hidden && $('app').hidden, 0);
  setLang('en'); check('english intro', /Tell Pia what you want/.test($('intro').innerText), $('intro').innerText.slice(0, 80));
  setLang('hi'); check('hinglish intro', /Pia ko bataiye/.test($('intro').innerText), 0);
  $('key').value = 'x'; $('name').value = 'Neha'; $('gender').value = 'female'; $('start').click();
  check('app visible', !$('app').hidden && $('intro').hidden, 0);
  check('hinglish starter chips', [...document.querySelectorAll('#chips button')].map(b => b.textContent).join('|') === '2000 ke andar white sneakers|pink saree ke liye blouse|Huda Beauty ka concealer', 0);

  // a search turn
  await runTurn('white sneakers dikhao', 'hi-IN', 0, performance.now());
  check('3 cards', document.querySelectorAll('.pcard').length === 3, document.querySelectorAll('.pcard').length);
  check('pia bubble with name and avatar', !!document.querySelector('.row-pia .avatar') && /Pia/.test(document.querySelector('.row-pia .pname').textContent), 0);
  check('next 3 visible in header', !$('more').hidden && !!$('more').closest('.rhead'), 0);
  check('platform chips', document.querySelectorAll('#platformChips button').length === 3, 0);
  $('more').click(); await wait(700);
  check('next 3 searches page 2', searches.at(-1).page === 2 && document.querySelector('.pcard .prank').textContent === '#4', searches.at(-1));
  check('earlier fold counts', /\(2\)|\(3\)|\(4\)/.test($('earlierSum').textContent), $('earlierSum').textContent);

  // vague request: refine buttons
  await runTurn('isse accha kuch dikhao', 'hi-IN', 0, performance.now());
  check('refine presets in hinglish', [...document.querySelectorAll('#chips button')].map(b => b.textContent).join('|') === 'Zyada rating wale|Zyada price wale|Naya search', [...document.querySelectorAll('#chips button')].map(b => b.textContent));

  // ambiguous brand: question first, answer forces the search, never asked twice
  const before = searches.length;
  await runTurn('K Beauty ki lipstick chahiye', 'hi-IN', 0, performance.now());
  check('K Beauty asks first (no search)', searches.length === before && [...document.querySelectorAll('#chips button')].map(b => b.textContent).join('|') === 'Kay Beauty|Korean beauty', 0);
  document.querySelectorAll('#chips button')[0].click(); await wait(900);
  check('answer forces a search with the brand', searches.at(-1).brand === 'Kay Beauty' && forced.length >= 1, searches.at(-1));
  check('no second question', ![...document.querySelectorAll('#latest .bubble.pia')].some(b => /kaunsa keh rahe/.test(b.textContent)), 0);

  // type instead of speaking, and fixing what was heard
  $('typeToggle').click();
  check('type box opens', !$('typebar').hidden, 0);
  const n0 = searches.length;
  $('typeInput').value = 'white sneakers dikhao'; $('typebar').dispatchEvent(new Event('submit', { cancelable: true })); await wait(900);
  check('typed request runs a search', searches.length > n0 && S.typed === 1, { searches: searches.length - n0, typed: S.typed });
  await runTurn('Ke koti ka kajal chahiye', 'hi-IN', 0, performance.now(), { spoken: true });
  const pencil = document.querySelector('#latest .row-me .edit');
  check('spoken bubble has a fix pencil', !!pencil, 0);
  pencil.click();
  check('pencil opens the box with the heard text', !$('typebar').hidden && $('typeInput').value === 'Ke koti ka kajal chahiye', $('typeInput').value);
  $('typeInput').value = 'Kay Beauty ka kajal chahiye'; $('typebar').dispatchEvent(new Event('submit', { cancelable: true })); await wait(900);
  check('correction is counted', S.edited === 1, S.edited);

  // English mode: a Hinglish reply is rewritten
  setLang('en'); mode = 'wronglang';
  await runTurn('white sneakers under 2000', 'en-IN', 0, performance.now());
  const last = [...document.querySelectorAll('#latest .bubble.pia')].pop().textContent;
  check('wrong-language reply rewritten to English', /Sorry, I found nothing/.test(last), last);
  mode = 'normal'; setLang('hi');

  // pronunciation list
  check('rating spoken in Devanagari', /रेटिंग/.test(applyLexicon('rating 4.3')) && /ढूँढ/.test(applyLexicon('dhoondh rahi hoon')), applyLexicon('rating dhoondh'));

  // bad key shows a Change key action
  mode = 'badkey'; await guarded(() => runTurn('kuch aur', 'hi-IN', 0, performance.now()));
  check('bad key shows Change key', !!document.querySelector('#error button') && /Sarvam key/.test($('error').textContent), $('error').textContent);

  const failed = results.filter(r => !r.pass);
  console.log(results.map(r => (r.pass ? 'PASS ' : 'FAIL ') + r.name + (r.detail ? ' ' + r.detail : '')).join('\n'));
  console.log(`${results.length - failed.length}/${results.length} checks passed`);
  window.__smoke = { results, failed };
  const out = document.getElementById('smokeResult');   // lets a headless run read the result from the page
  if (out) out.textContent = JSON.stringify({ passed: results.length - failed.length, total: results.length, lines: results.map(r => (r.pass ? 'PASS ' : 'FAIL ') + r.name + (r.detail ? ' ' + r.detail : '')) });
  return { passed: results.length - failed.length, total: results.length, failed };
})();
