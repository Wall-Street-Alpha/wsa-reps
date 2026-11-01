// Mock interview
let MOCK = null;
const SUPERDAY = [
  { who: 'Analyst', initials: 'AN', color: '#1cb0f6', title: 'First round', focus: 'Your story and fit', tip: 'Keep each answer to about 90 seconds. Lead with the headline, then the detail.', pick: c => c.track === 'Behavioral' && !/why our|deal|pitch|stock/i.test(c.q) },
  { who: 'Vice President', initials: 'VP', color: '#2a62b0', title: 'Second round', focus: 'Core technicals', tip: 'Walk through the mechanics step by step and say the numbers out loud.', pick: c => /accounting|enterprise|equity value|valuation|dcf|discounted/i.test(c.category) },
  { who: 'Managing Director', initials: 'MD', color: '#7b61ff', title: 'Final round', focus: 'Judgment, deals and fit', tip: 'Have a view and defend it briefly. MDs listen for commercial judgment and conviction.', pick: c => /merger|lbo|restructur|distress|brain|transaction/i.test(c.category) || /why (our|this)|deal|pitch|stock|market/i.test(c.q) },
];
function startSuperday(el, perRound) {
  const used = new Set(), ids = [], rounds = [];
  const shuffle = a => a.sort(() => Math.random() - .5);
  SUPERDAY.forEach((r, ri) => {
    let pool = shuffle(S.cards.filter(c => r.pick(c) && !used.has(c.id)));
    if (pool.length < perRound) pool = pool.concat(shuffle(S.cards.filter(c => !used.has(c.id) && !pool.includes(c) && (ri === 0 ? c.track === 'Behavioral' : c.track !== 'Behavioral'))));
    if (pool.length < perRound) pool = pool.concat(shuffle(S.cards.filter(c => !used.has(c.id) && !pool.includes(c))));
    const pickd = pool.slice(0, perRound);
    pickd.forEach(c => used.add(c.id));
    rounds.push({ ...r, start: ids.length, end: ids.length + pickd.length });
    ids.push(...pickd.map(c => c.id));
  });
  if (!ids.length) { App.toast('Add some questions first.'); return; }
  MOCK = { phase: 'between', kind: 'superday', rounds, ids, i: 0, answers: [], times: [], started: Date.now() };
  Pages.mock(el);
}
const roundOf = (m, i) => m.rounds ? m.rounds.findIndex(r => i >= r.start && i < r.end) : -1;
function superdayBetween(el) {
  const m = MOCK, ri = roundOf(m, m.i), r = m.rounds[ri];
  const lines = ['Deep breath. Your next interviewer is ready.', 'Nice work so far. Reset and go again.', 'Last one. Finish strong.'];
  el.innerHTML = `<div class="page" style="max-width:640px"><div class="card grid" style="gap:16px;text-align:center;justify-items:center;padding:28px 20px">
    ${boSays(ri === 0 ? 'happy' : 'cheer', h(ri === 0 ? 'Welcome to your Superday. Three interviewers, back to back. You\'ve got this.' : lines[Math.min(ri, 2)]), 76)}
    <div class="eyebrow">Round ${ri + 1} of ${m.rounds.length}</div>
    <div class="row" style="justify-content:center"><span class="who" style="background:${r.color}">${r.initials}</span><div style="text-align:left"><h2>${h(r.who)}</h2><div class="faint" style="font-weight:700">${h(r.title)} · ${h(r.focus)}</div></div></div>
    <p class="muted" style="max-width:46ch">${h(r.tip)}</p>
    <p class="faint" style="font-size:.85rem">${r.end - r.start} questions · about ${Math.round((r.end - r.start) * 2)} minutes</p>
    <div class="row" style="justify-content:center"><button class="btn go big" id="sd-go">Start round ${ri + 1}</button><button class="btn big ghost" id="sd-quit">End Superday</button></div></div></div>`;
  $('#sd-go', el).onclick = () => { m.phase = 'run'; Pages.mock(el); };
  $('#sd-quit', el).onclick = () => { MOCK = null; Pages.mock(el); };
}
Pages.mock = el => {
  if (MOCK && MOCK.phase === 'between') return superdayBetween(el);
  if (MOCK && MOCK.phase === 'run') return mockRun(el);
  if (MOCK && MOCK.phase === 'review') return mockReview(el);
  el.innerHTML = `<div class="page" style="max-width:820px"><div class="hello"><div class="eyebrow">Interview practice</div><h1>Mock interviews</h1><p class="muted">Questions back to back with a two-minute clock each. Answers appear at the end, and every question is then scheduled for review.</p></div>
    <div class="mode-cards">
      <button class="mode-card featured" id="sd-start"><div class="row spread"><h2>Superday</h2><span class="pill" style="color:var(--brand)">Recommended</span></div><p class="muted" style="font-size:.92rem">Three back-to-back rounds with different interviewers, like the real day.</p>
        <div class="rounds">${SUPERDAY.map(r => `<div class="round-line"><span class="who" style="background:${r.color}">${r.initials}</span>${h(r.who)} <span class="faint" style="font-weight:600">· ${h(r.focus)}</span></div>`).join('')}</div>
        <span class="faint" style="font-size:.85rem">12 questions · about 25 minutes</span></button>
      <div class="mode-card" style="cursor:default"><h2>Quick mock</h2><p class="muted" style="font-size:.92rem">A short set from one track. Good for a 10-minute rep.</p>
    <div class="grid" style="gap:12px">
      <label class="field" for="m-track">Track<select class="input" id="m-track"><option value="Mixed">Mixed</option><option value="Behavioral">Behavioral / fit</option><option value="Technical">Technical</option></select></label>
      <label class="field" for="m-count">Questions<select class="input" id="m-count"><option>5</option><option>8</option><option>12</option></select></label>
      <label class="field" for="m-pool">Pull from<select class="input" id="m-pool"><option value="all">Everything</option><option value="weak">My weakest cards</option><option value="starred">Starred only</option></select></label>
      <button class="btn go" id="m-go">${I.play} Start quick mock</button></div></div></div></div>`;
  $('#sd-start', el).onclick = () => startSuperday(el, 4);
  $('#m-go', el).onclick = () => {
    const track = $('#m-track', el).value, n = +$('#m-count', el).value, pool = $('#m-pool', el).value;
    let cs = S.cards.filter(c => track === 'Mixed' || c.track === track);
    if (pool === 'starred') cs = cs.filter(c => S.star[c.id]);
    if (pool === 'weak') cs = cs.filter(c => S.st[c.id]).sort((a, b) => SRS.mastery(S.st[a.id]) - SRS.mastery(S.st[b.id])).slice(0, n * 3);
    cs = cs.sort(() => Math.random() - .5).slice(0, n);
    if (!cs.length) { App.toast('No questions match. Try a different pool.'); return; }
    MOCK = { phase: 'run', ids: cs.map(c => c.id), i: 0, answers: [], times: [], started: Date.now() };
    Pages.mock(el);
  };
};
function mockRun(el) {
  const m = MOCK, card = S.byId.get(m.ids[m.i]);
  const t0 = Date.now(), LIMIT = 120;
  el.innerHTML = `<div class="page" style="max-width:760px"><div class="session-top"><button class="icon-btn" id="m-quit" aria-label="End interview">${I.x}</button><div class="progress"><i style="width:${Math.round(100 * m.i / m.ids.length)}%"></i></div><span class="timer" id="m-timer" style="font-size:1.1rem">2:00</span></div>
    <div class="card grid" style="gap:14px"><div class="row spread"><span class="eyebrow">${m.rounds ? (() => { const ri = roundOf(m, m.i), r = m.rounds[ri]; return `Round ${ri + 1} · ${h(r.who)} · Question ${m.i - r.start + 1} of ${r.end - r.start}`; })() : `Question ${m.i + 1} of ${m.ids.length}`}</span><button class="icon-btn" id="m-speak" aria-label="Read aloud">${I.speak}</button></div><div class="q-text">${h(card.q)}</div>
      <div class="pad"><div class="fw" style="padding-bottom:0"><span class="fw-label">${h(frameworkFor(card).name)}</span>${frameworkFor(card).steps.map(x => `<button type="button" class="fw-chip" data-fw="${h(x)}">${h(x)}</button>`).join('')}</div><textarea id="m-ans" style="min-height:200px" placeholder="Answer the way you would say it to the interviewer." aria-label="Your answer"></textarea></div>
      <div class="row spread"><span class="faint" style="font-size:.82rem">Tip: on a Mac, press Fn twice to dictate your answer.</span><button class="btn go" id="m-next">${m.i + 1 === m.ids.length ? 'Finish' : 'Next question'}</button></div></div></div>`;
  const ta = $('#m-ans', el); ta.focus({ preventScroll: true });
  const fw = frameworkFor(card);
  el.querySelectorAll('[data-fw]').forEach(b => b.onclick = () => { const pre = ta.value && !ta.value.endsWith('\n') ? '\n' : ''; ta.value += `${pre}${b.dataset.fw}: `; b.classList.add('used'); ta.focus(); });
  const timer = setInterval(() => {
    const left = LIMIT - Math.floor((Date.now() - t0) / 1000), tEl = $('#m-timer', el);
    if (!tEl) return clearInterval(timer);
    tEl.textContent = `${left < 0 ? '-' : ''}${Math.floor(Math.abs(left) / 60)}:${String(Math.abs(left) % 60).padStart(2, '0')}`;
    tEl.classList.toggle('over', left < 0);
  }, 300);
  $('#m-speak', el).onclick = () => speak(card.q);
  $('#m-quit', el).onclick = () => { clearInterval(timer); MOCK = null; Pages.mock(el); };
  $('#m-next', el).onclick = () => {
    clearInterval(timer);
    m.answers[m.i] = ta.value; m.times[m.i] = Date.now() - t0; m.i++;
    if (m.i >= m.ids.length) { m.phase = 'review'; m.r = 0; }
    else if (m.rounds && roundOf(m, m.i) !== roundOf(m, m.i - 1)) m.phase = 'between';
    Pages.mock(el);
  };
}
function mockReview(el) {
  const m = MOCK;
  m.ratings ||= [];
  if (m.r >= m.ids.length) {
    S.profile.mocks = (S.profile.mocks || 0) + 1; finishSessionBonus();
    const rows = m.ids.map((id, i) => {
      const card = S.byId.get(id), ans = (m.answers[i] || '').trim();
      return { card, r: m.ratings[i] || 0, cov: ans ? Scoring.scoreAnswer(ans, card.a).coverage : null, secs: Math.round((m.times[i] || 0) / 1000) };
    });
    const n = rows.length, good = rows.filter(x => x.r >= 3).length;
    const answered = rows.filter(x => x.cov != null);
    const avgCov = answered.length ? Math.round(answered.reduce((t, x) => t + x.cov, 0) / answered.length) : null;
    const avgSecs = Math.round(rows.reduce((t, x) => t + x.secs, 0) / n);
    const pct = good / n;
    const sd = m.rounds;
    Telemetry.track(sd ? 'superday_complete' : 'mock_complete', { questions: n, good });
    const head = sd ? (pct >= 0.75 ? 'Superday ready.' : pct >= 0.5 ? 'Close. Tighten a few areas.' : 'More reps before the real thing.') : pct >= 0.8 ? 'Strong performance.' : pct >= 0.5 ? 'Solid, with a few to tighten.' : 'Worth another pass on these.';
    const roundRows = sd ? sd.map(r => { const rr = rows.slice(r.start, r.end); return { r, good: rr.filter(x => x.r >= 3).length, n: rr.length }; }) : [];
    MOCK = null;
    el.innerHTML = `<div class="page" style="max-width:820px"><div class="card done-hero">${boSays(pct >= 0.5 ? 'cheer' : 'gentle', h(pct >= 0.5 ? 'Nice work in the room. Review the misses and run it again soon.' : 'Tough set. Review these and they\'ll come back easier.'), 96)}<div class="eyebrow">${sd ? 'Superday complete' : 'Mock interview complete'}</div><div class="big-num">${good} of ${n}</div><h1>${head}</h1><p class="muted">Answered well, based on your own ratings. Every question is now on your review schedule.</p>
      ${sd ? `<div class="grid" style="gap:8px;width:100%;max-width:520px">${roundRows.map(x => `<div class="round-line" style="justify-content:space-between;background:var(--layer);border-radius:12px;padding:8px 12px"><span class="row" style="gap:10px"><span class="who" style="background:${x.r.color}">${x.r.initials}</span>${h(x.r.who)}</span><span class="num" style="color:var(--${x.good / x.n >= 0.75 ? 'gotit' : x.good / x.n >= 0.5 ? 'shaky' : 'again'})">${x.good} of ${x.n}</span></div>`).join('')}</div>` : ''}
      <div class="ticker" style="width:100%"><div class="tick"><b>${Math.round(pct * 100)}%</b><span>rated Good or Easy</span></div><div class="tick"><b>${avgCov == null ? '–' : avgCov + '%'}</b><span>key points covered</span></div><div class="tick"><b>${Math.floor(avgSecs / 60)}:${String(avgSecs % 60).padStart(2, '0')}</b><span>avg time per answer</span></div></div>
      <div class="row" style="justify-content:center"><a class="btn go" href="#mock">Run another</a><a class="btn" href="#today">Done</a></div></div>
      <div class="table-wrap"><table class="tbl"><thead><tr><th>Question</th><th>Your rating</th><th>Key points</th><th>Time</th></tr></thead><tbody>${rows.map(x => `<tr><td><a class="q-link" style="-webkit-line-clamp:2;min-width:220px" href="#p-${x.card.id}">${h(x.card.q)}</a></td><td style="font-weight:600;color:var(--${['ink-3', 'again', 'shaky', 'gotit', 'ez'][x.r]})">${RATE_LABELS[x.r] || '–'}</td><td class="num faint">${x.cov == null ? 'no answer' : x.cov + '%'}</td><td class="num faint">${x.secs}s</td></tr>`).join('')}</tbody></table></div>
      <p class="faint" style="font-size:.82rem">Key points is an automatic keyword match against the model answer. It runs low on fit questions, where the model answer is guidance rather than a script, so your rating is the headline score.</p></div>`;
    confetti();
    return;
  }
  el.innerHTML = `<div class="page" style="max-width:760px"><div class="row spread"><div><div class="eyebrow">Review</div><h2>Question ${m.r + 1} of ${m.ids.length}</h2></div><span class="faint num">${Math.round(m.times[m.r] / 1000)}s spent</span></div><div class="card" id="m-flow"></div></div>`;
  cardFlow($('#m-flow', el), m.ids[m.r], { mode: 'mock', layout: 'review', presetAnswer: m.answers[m.r] || '', presetMs: m.times[m.r], onRated: r => { m.ratings[m.r] = r; m.r++; Pages.mock(el); } });
}

// Import
let IMP = null;
Pages.import = el => {
  el.innerHTML = `<div class="page"><div class="hello"><div class="eyebrow">Import</div><h1>Import a question bank</h1><p class="muted">PDF, Word, text, CSV or JSON. Questions and answers are extracted in your browser; the file itself is never uploaded.</p></div>
    <div class="tabs" role="tablist"><button role="tab" aria-selected="true" data-tab="file">Upload a file</button><button role="tab" aria-selected="false" data-tab="paste">Paste text</button></div>
    <div id="imp-file"><label class="drop" id="drop" for="imp-input"><b style="font-size:1.05rem">Drop a file here or tap to choose</b><span class="faint">.pdf, .docx, .txt, .md, .csv, .json</span><input id="imp-input" type="file" accept=".pdf,.docx,.txt,.md,.csv,.json" hidden></label></div>
    <div id="imp-paste" hidden class="grid" style="gap:10px"><textarea class="input" id="imp-text" style="min-height:220px" placeholder="Paste questions. Works with numbered lists (1. Question? then the answer), Q: / A: pairs, or questions ending in a question mark. CSV files can include a banks column (for example: Goldman Sachs; Evercore)."></textarea><button class="btn go" id="imp-parse" style="justify-self:start">Find questions</button></div>
    <div id="imp-status"></div><div id="imp-preview"></div></div>`;
  el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => {
    el.querySelectorAll('[data-tab]').forEach(x => x.setAttribute('aria-selected', x === b));
    $('#imp-file', el).hidden = b.dataset.tab !== 'file'; $('#imp-paste', el).hidden = b.dataset.tab !== 'paste';
  });
  const drop = $('#drop', el);
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) handleFile(el, f); });
  $('#imp-input', el).onchange = e => { const f = e.target.files[0]; if (f) handleFile(el, f); };
  $('#imp-parse', el).onclick = () => showPreview(el, Parser.parseQA($('#imp-text', el).value, { source: 'Pasted text' }).cards, 'Pasted questions');
  if (IMP) renderPreview(el);
};

async function handleFile(el, file) {
  const st = $('#imp-status', el);
  st.innerHTML = `<div class="card row"><span class="dot warn"></span> Reading ${h(file.name)}...</div>`;
  try {
    const ext = file.name.split('.').pop().toLowerCase();
    let cards = [];
    if (ext === 'json') cards = fromJson(JSON.parse(await file.text()));
    else if (ext === 'csv') cards = fromCsv(await file.text());
    else {
      const text = ext === 'pdf' ? await Extract.pdf(file, p => st.innerHTML = `<div class="card row"><span class="dot warn"></span> Reading page ${p.page} of ${p.pages}...</div>`)
        : ext === 'docx' ? await Extract.docx(file) : await file.text();
      if (text.replace(/\s+/g, '').length < 40) {
        st.innerHTML = `<div class="banner">We couldn't read any text from ${h(file.name)}. If it's a scanned PDF (photos of pages), export it as a text PDF or Word file, or copy the text into the Paste tab.</div>`;
        return;
      }
      cards = Parser.parseQA(text, { source: file.name }).cards;
    }
    st.innerHTML = '';
    showPreview(el, cards, file.name.replace(/\.[^.]+$/, ''));
  } catch (e) {
    const ext = (file.name.split('.').pop() || '').toUpperCase();
    st.innerHTML = `<div class="banner">We couldn't open ${h(file.name)}. It may be damaged, password-protected, or not really a ${h(ext)} file. Try saving it again from the original app, or paste the text into the Paste tab.</div>`;
    Telemetry.report('Import failed: ' + (e && e.message || e));
  }
}
function splitBanks(v) {
  const list = Array.isArray(v) ? v : String(v || '').split(/[;|,]/);
  return list.map(x => String(x).trim()).filter(Boolean).map(x => BANKS.find(b => b.toLowerCase() === x.toLowerCase()) || x);
}
function fromJson(j) {
  const arr = Array.isArray(j) ? j : Array.isArray(j.cards) ? j.cards : [];
  return arr.map(x => ({ q: x.q || x.question, a: x.a || x.answer, category: x.category || Parser.guessCategory(x.q || x.question || '', x.a || x.answer || ''), difficulty: x.difficulty || 'Medium', track: x.track, banks: splitBanks(x.banks || x.bank) })).filter(x => x.q && x.a);
}
function fromCsv(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { row.push(cur); cur = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; } else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const head = rows[0]?.map(x => x.trim().toLowerCase()) || [];
  const hasHead = head.includes('question');
  const qi = hasHead ? head.indexOf('question') : 0, ai = hasHead ? head.indexOf('answer') : 1, ci = head.indexOf('category'), di = head.indexOf('difficulty'), bi = Math.max(head.indexOf('banks'), head.indexOf('bank'));
  return rows.slice(hasHead ? 1 : 0).filter(r => r[qi] && r[ai]).map(r => ({ q: r[qi].trim(), a: r[ai].trim(), category: (ci >= 0 && r[ci]) || Parser.guessCategory(r[qi], r[ai]), difficulty: (di >= 0 && r[di]) || 'Medium', banks: bi >= 0 ? splitBanks(r[bi]) : [] }));
}
function showPreview(el, cards, name) {
  for (const c of cards) { c.track ||= /accounting|valuation|dcf|merger|lbo|enterprise|equity|restructuring|distressed|brain|technical/i.test(c.category) ? 'Technical' : 'Behavioral'; c.on = true; }
  IMP = { cards, name };
  renderPreview(el);
}
function renderPreview(el) {
  const pv = $('#imp-preview', el);
  if (!IMP.cards.length) { pv.innerHTML = `<div class="card empty"><h2>No questions found</h2><p class="muted" style="max-width:520px">The file was read, but no question and answer pairs were recognized. Try the Paste tab with text formatted as numbered questions followed by answers, or as Q: and A: lines.</p></div>`; return; }
  const secs = new Set(IMP.cards.map(c => c.category));
  pv.innerHTML = `<div class="card grid" style="gap:14px"><div class="row spread"><div><h2>${IMP.cards.length} questions found in ${secs.size} section${secs.size === 1 ? '' : 's'}</h2><p class="faint" style="font-size:.88rem">Uncheck anything that isn't a real question. Edit topics and difficulty inline.</p></div></div>
    <div class="row"><label class="field" for="imp-name" style="flex:1;min-width:220px">Deck name<input class="input" id="imp-name" value="${h(IMP.name)}"></label><button class="btn go big" id="imp-add" style="align-self:end">Add ${IMP.cards.filter(c => c.on).length} cards</button></div>
    <div class="table-wrap"><table class="tbl"><thead><tr><th><input type="checkbox" id="imp-all" checked aria-label="Select all"></th><th>Question</th><th>Topic</th><th>Level</th></tr></thead><tbody>${IMP.cards.map((c, i) => `<tr><td><input type="checkbox" data-i="${i}" ${c.on ? 'checked' : ''} aria-label="Include"></td><td style="min-width:280px"><div class="preview-q">${h(c.q)}</div><details class="ans"><summary>Answer</summary><div>${h(c.a)}</div></details></td><td><input class="input" data-cat="${i}" value="${h(c.category)}" style="min-width:150px;padding:6px 8px"></td><td><select class="input" data-diff="${i}" style="padding:6px 8px">${['Easy', 'Medium', 'Hard'].map(d => `<option ${c.difficulty === d ? 'selected' : ''}>${d}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div></div>`;
  const upd = () => { $('#imp-add', pv).textContent = `Add ${IMP.cards.filter(c => c.on).length} cards`; };
  pv.querySelectorAll('[data-i]').forEach(x => x.onchange = () => { IMP.cards[+x.dataset.i].on = x.checked; upd(); });
  pv.querySelectorAll('[data-cat]').forEach(x => x.onchange = () => { IMP.cards[+x.dataset.cat].category = x.value.trim() || 'General'; });
  pv.querySelectorAll('[data-diff]').forEach(x => x.onchange = () => { IMP.cards[+x.dataset.diff].difficulty = x.value; });
  $('#imp-all', pv).onchange = e => { IMP.cards.forEach(c => c.on = e.target.checked); renderPreview(el); };
  $('#imp-name', pv).oninput = e => { IMP.name = e.target.value; };
  $('#imp-add', pv).onclick = async () => {
    const chosen = IMP.cards.filter(c => c.on);
    if (!chosen.length) return;
    const meta = await createDeck(IMP.name.trim() || 'Imported deck', IMP.name, chosen);
    checkAchievements(); saveProfile();
    Telemetry.track('import', { cards: chosen.length, source: /\.pdf$/i.test(IMP.name) ? 'pdf' : 'other' });
    IMP = null; Object.assign(PF, { q: '', cat: '', diff: '', status: '', starred: false, deck: meta.id });
    App.toast(`Added ${chosen.length} cards to ${meta.name}`);
    location.hash = 'problems';
  };
}

// Progress
Pages.progress = el => {
  const p = S.profile, logs = allLogs(), now = Date.now();
  const st = countStatus();
  const last30 = logs.filter(e => e[0] > now - 30 * DAY_MS);
  const rev = last30.filter(e => e[7] === 2);
  const retention = rev.length ? Math.round(100 * rev.filter(e => e[2] > 1).length / rev.length) : null;
  const studyMin = Math.round(Object.values(p.daily).reduce((n, d) => n + (d.ms || 0), 0) / 60000);
  const days30 = Array.from({ length: 30 }, (_, i) => { const k = dayKey(now - (29 - i) * DAY_MS); return { k, n: logs.filter(e => dayKey(e[0]) === k).length }; });
  const fc = Array.from({ length: 14 }, (_, i) => ({ i, n: 0 }));
  for (const c of S.cards) { const s = S.st[c.id]; if (!s || s.state === 0) continue; const d = Math.max(0, Math.floor((s.due - now) / DAY_MS)); if (d < 14) fc[d].n++; }
  const us = units();
  const diffs = ['Easy', 'Medium', 'Hard'].map(d => { const cs = S.cards.filter(c => c.difficulty === d); return { d, n: cs.length, m: cs.length ? Math.round(cs.reduce((a, c) => a + SRS.mastery(S.st[c.id]), 0) / cs.length) : 0 }; });
  el.innerHTML = `<div class="page"><div class="hello"><div class="eyebrow">Progress</div><h1>Your progress</h1><p class="muted" style="margin-top:6px">${Store.mode !== 'local' ? 'Synced to your account. Sign in on any device to pick up where you left off.' : 'Saved in this browser.'}</p></div>
    <div class="grid cols-4">
      ${[['Level ' + levelOf(p.xp), p.xp + ' XP'], ['Current streak', p.streak + 'd'], ['Best streak', (p.best || 0) + 'd'], ['Retention (30d)', retention == null ? '–' : retention + '%'], ['Mastered', st.mastered], ['Learning', st.learning], ['New', st.new], ['Study time', studyMin >= 60 ? (studyMin / 60).toFixed(1) + 'h' : studyMin + 'm']].map(([l, v]) => `<div class="card stat"><span>${l}</span><b>${v}</b></div>`).join('')}
    </div>
    <div class="card grid" style="gap:10px"><div class="row spread"><h3>Activity, last 26 weeks</h3><span class="faint num" style="font-size:.85rem">${logs.length} total reviews &middot; ${last30.length} in 30 days</span></div>${heatmap(26)}</div>
    <div class="grid cols-2">
      <div class="card grid" style="gap:8px"><h3>Reviews per day</h3>${barChart(days30.map(d => d.n), days30.map((d, i) => i % 7 === 0 ? d.k.slice(5) : ''), 'var(--brand)')}</div>
      <div class="card grid" style="gap:8px"><h3>Due in the next 14 days</h3>${barChart(fc.map(d => d.n), fc.map(d => d.i === 0 ? 'today' : d.i % 3 === 0 ? '+' + d.i + 'd' : ''), 'var(--easy)')}</div>
    </div>
    <div class="grid cols-2">
      <div class="card grid" style="gap:10px"><h3>Mastery by topic</h3>${us.length ? us.map(u => `<div class="hbar"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h(u.name)}</span><div class="bar"><i style="width:${u.mastery}%"></i></div><span class="num faint" style="text-align:right">${u.mastery}%</span></div>`).join('') : '<p class="muted">No topics yet.</p>'}</div>
      <div class="card grid" style="gap:10px;align-content:start"><h3>By difficulty</h3>${diffs.map(d => `<div class="hbar"><span>${diffPill(d.d)} <span class="faint num">${d.n}</span></span><div class="bar"><i style="width:${d.m}%"></i></div><span class="num faint" style="text-align:right">${d.m}%</span></div>`).join('')}
        <h3 style="margin-top:10px">Achievements</h3><div class="ach">${ACH.map(a => `<div class="badge ${p.ach[a.id] ? '' : 'locked'}"><span class="ico">${p.ach[a.id] ? I.check : I.lock}</span><b>${h(a.name)}</b><span class="faint" style="font-size:.8rem">${h(a.desc)}</span></div>`).join('')}</div></div>
    </div></div>`;
};
function barChart(vals, labels, color) {
  const W = 420, H = 150, pad = 22, max = Math.max(4, ...vals), bw = (W - pad) / vals.length;
  const ticks = [0, Math.round(max / 2), max];
  return `<svg class="chart" viewBox="0 0 ${W} ${H + 18}" role="img" aria-label="Bar chart">${ticks.map(t => { const y = H - (t / max) * (H - 10); return `<line x1="${pad}" x2="${W}" y1="${y}" y2="${y}" stroke="var(--line)" stroke-dasharray="2 3"/><text x="${pad - 4}" y="${y + 3}" text-anchor="end">${t}</text>`; }).join('')}
    ${vals.map((v, i) => { const bh = (v / max) * (H - 10); return `<rect x="${pad + i * bw + 1.5}" y="${H - bh}" width="${Math.max(1, bw - 3)}" height="${bh}" rx="2" fill="${color}"><title>${v}</title></rect>${labels[i] ? `<text x="${pad + i * bw + bw / 2}" y="${H + 13}" text-anchor="middle">${h(labels[i])}</text>` : ''}`; }).join('')}</svg>`;
}

// Prefs
Pages.prefs = el => {
  const p = S.profile;
  const theme = Store.lsGet('theme') || 'system';
  el.innerHTML = `<div class="page" style="max-width:760px"><div class="hello"><div class="eyebrow">Settings</div><h1>Prefs</h1></div>
    <div class="card grid" style="gap:16px">
      <label class="field" for="p-name">Display name<input class="input" id="p-name" value="${h(p.name)}" placeholder="${h(S.viewer || 'Your name')}"></label>
      <div class="grid cols-2">
        <label class="field" for="p-goal">Daily XP goal<select class="input" id="p-goal">${[20, 50, 100, 150].map(g => `<option ${p.goal === g ? 'selected' : ''} value="${g}">${g} XP ${({ 20: '(casual)', 50: '(regular)', 100: '(serious)', 150: '(recruiting season)' })[g]}</option>`).join('')}</select></label>
        <label class="field" for="p-new">New cards per day<input class="input" id="p-new" type="number" min="0" max="100" value="${p.newPerDay}"></label>
      </div>
      <label class="field" for="p-ret">Target recall <span class="faint" style="font-weight:500">Higher means more frequent reviews. <b class="num" id="p-ret-v">${Math.round(p.retention * 100)}%</b></span><input id="p-ret" type="range" min="0.8" max="0.95" step="0.01" value="${p.retention}"></label>
      <label class="field" for="p-theme">Theme<select class="input" id="p-theme">${[['system', 'Match system'], ['dark', 'Dark'], ['light', 'Light']].map(([v, l]) => `<option value="${v}" ${theme === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <button class="btn go" id="p-save" style="justify-self:start">Save preferences</button>
    </div>
    <div class="card grid" style="gap:12px"><h2>Decks</h2>${S.decks.map(d => `<div class="grid" style="gap:8px;border-top:1px solid var(--line);padding-top:12px" data-deck="${d.id}"><div class="row spread"><input class="input" value="${h(d.name)}" data-rename="${d.id}" style="max-width:360px" aria-label="Deck name"><span class="faint num">${d.cards.length} cards</span></div><div class="row"><button class="btn sm" data-reset="${d.id}">Reset progress</button><button class="btn sm danger" data-del="${d.id}">Delete deck</button></div><div data-confirm="${d.id}"></div></div>`).join('') || '<p class="muted">No decks.</p>'}</div>
    ${S.isAdmin ? `<div class="card row spread"><div><h2>Admin panel</h2><p class="muted" style="font-size:.9rem">See every student's progress.</p></div><a class="btn go" href="#admin">Open admin panel</a></div>` : ''}
    ${!isStandalone() && !window.claude ? `<div class="card grid" style="gap:8px"><h2>Install on your phone</h2>${installHelp()}</div>` : ''}
    <div class="card grid" style="gap:10px"><h2>Your data</h2><p class="muted">${Store.mode === 'account' ? 'Progress is stored privately under your account. Nobody else using this app can see it.' : Store.mode === 'cloud' ? 'Progress is stored privately under your claude.ai account. Nobody else using this app can see it.' : 'Progress is stored in this browser only.'}</p><div class="row"><button class="btn" id="p-export">Export my data (JSON)</button>${Store.mode === 'account' ? `<button class="btn" id="p-signout">Sign out ${h(Store.email)}</button>` : ''}</div><div id="p-export-out"></div></div></div>`;
  const so = $('#p-signout', el); if (so) so.onclick = () => Store.signOut();
  bindInstall(el);
  $('#p-ret', el).oninput = e => $('#p-ret-v', el).textContent = Math.round(e.target.value * 100) + '%';
  $('#p-save', el).onclick = () => {
    p.name = $('#p-name', el).value.trim(); p.goal = +$('#p-goal', el).value; p.newPerDay = Math.max(0, Math.min(100, +$('#p-new', el).value || 0)); p.retention = +$('#p-ret', el).value;
    const th = $('#p-theme', el).value; Store.lsSet('theme', th); applyTheme();
    saveProfile(); App.toast('Preferences saved');
  };
  el.querySelectorAll('[data-rename]').forEach(x => x.onchange = () => { renameDeck(x.dataset.rename, x.value.trim() || 'Untitled deck'); App.toast('Deck renamed'); });
  const confirmBox = (id, msg, action) => {
    const box = el.querySelector(`[data-confirm="${id}"]`);
    box.innerHTML = `<div class="confirm"><span>${msg}</span><button class="btn sm danger" data-yes>Yes, do it</button><button class="btn sm" data-no>Cancel</button></div>`;
    box.querySelector('[data-yes]').onclick = () => { action(); Pages.prefs(el); };
    box.querySelector('[data-no]').onclick = () => box.innerHTML = '';
  };
  el.querySelectorAll('[data-reset]').forEach(b => b.onclick = () => confirmBox(b.dataset.reset, 'Reset every card in this deck to new?', () => { resetDeck(b.dataset.reset); App.toast('Progress reset'); }));
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => confirmBox(b.dataset.del, 'Delete this deck and its progress for good?', () => { deleteDeck(b.dataset.del); App.toast('Deck deleted'); }));
  $('#p-export', el).onclick = async () => {
    const data = JSON.stringify({ exportedAt: new Date().toISOString(), profile: S.profile, decks: S.decks, states: S.st, starred: S.star, notes: S.notes, reviews: S.logs }, null, 1);
    const dl = await getCap('downloads');
    if (dl) { try { await dl.save({ filename: `wsa-reps-${dayKey()}.json`, data }); return; } catch {} }
    $('#p-export-out', el).innerHTML = `<textarea class="input" readonly style="min-height:160px" aria-label="Exported data">${h(data)}</textarea><button class="btn sm" id="p-copy">Copy</button>`;
    $('#p-copy', el).onclick = async () => { try { await navigator.clipboard.writeText(data); App.toast('Copied'); } catch { $('#p-export-out textarea', el).select(); } };
  };
};


// Admin panel (website accounts only). Data comes from admin-only database functions.
let ADMIN = { rows: null, q: '', sort: 'last', dir: -1, tab: 'students' };
const relDay = t => { if (!t) return '–'; const d = Math.floor((Date.now() - new Date(t).getTime()) / DAY_MS); return d <= 0 ? 'Today' : d === 1 ? 'Yesterday' : d < 30 ? `${d} days ago` : new Date(t).toLocaleDateString(); };
Pages.admin = async el => {
  if (!S.isAdmin) {
    el.innerHTML = `<div class="page" style="max-width:720px"><div class="card empty">${boSays('think', 'This page is for admins.', 64)}<p class="muted">Admins are set up in Supabase with <span class="mono">supabase/admin-setup.sql</span>.</p><a class="btn" href="#today">Back home</a></div></div>`;
    return;
  }
  el.innerHTML = `<div class="page wide"><div class="row spread"><div class="hello"><div class="eyebrow">Admin</div><h1>${{ students: 'Students', activity: 'Activity', errors: 'Errors' }[ADMIN.tab]}</h1></div><div class="row"><div class="tabs" role="tablist">${[['students', 'Students'], ['activity', 'Activity'], ['errors', 'Errors']].map(([k, l]) => `<button role="tab" data-adtab="${k}" aria-selected="${ADMIN.tab === k}">${l}</button>`).join('')}</div><button class="btn" id="ad-refresh">Refresh</button>${ADMIN.tab === 'students' ? '<button class="btn" id="ad-csv">Export CSV</button>' : ''}</div></div><div id="ad-body"><div class="card empty"><b>Loading...</b></div></div></div>`;
  el.querySelectorAll('[data-adtab]').forEach(b => b.onclick = () => { ADMIN.tab = b.dataset.adtab; Pages.admin(el); });
  $('#ad-refresh', el).onclick = () => { ADMIN.rows = null; Pages.admin(el); };
  const csv = $('#ad-csv', el); if (csv) csv.onclick = () => exportCsv();
  const body = $('#ad-body', el);
  if (ADMIN.tab === 'activity') return drawActivity(body);
  if (ADMIN.tab === 'errors') return drawErrors(body);
  try { if (!ADMIN.rows) ADMIN.rows = await Store.adminStudents(); }
  catch (e) { body.innerHTML = `<div class="banner">Could not load students: ${h(e.message || e)}</div>`; return; }
  drawAdmin(body);
};
function drawAdmin(box) {
  const rows = ADMIN.rows, wk = Date.now() - 7 * DAY_MS;
  const active = rows.filter(r => r.last_review_at && new Date(r.last_review_at).getTime() > wk).length;
  const rev7 = rows.reduce((n, r) => n + r.reviews_7d, 0);
  const tot = rows.reduce((n, r) => n + r.reviews_total, 0);
  const good = tot ? Math.round(rows.reduce((n, r) => n + (r.good_pct || 0) * r.reviews_total, 0) / tot) : null;
  const key = { name: r => (r.name || '').toLowerCase(), joined: r => +new Date(r.joined_at), last: r => r.last_review_at ? +new Date(r.last_review_at) : 0, streak: r => r.streak, xp: r => r.xp, r7: r => r.reviews_7d, total: r => r.reviews_total, good: r => r.good_pct ?? -1, mastered: r => r.mastered, mocks: r => r.mocks, time: r => +r.minutes_total }[ADMIN.sort];
  const q = ADMIN.q.toLowerCase();
  const list = rows.filter(r => !q || (r.name || '').toLowerCase().includes(q) || (r.email || '').toLowerCase().includes(q))
    .sort((a, b) => { const x = key(a), y = key(b); return (x > y ? 1 : x < y ? -1 : 0) * ADMIN.dir; });
  const th = (k, l) => `<th><button data-sort="${k}">${l}${ADMIN.sort === k ? (ADMIN.dir > 0 ? ' ↑' : ' ↓') : ''}</button></th>`;
  box.innerHTML = `<div class="grid" style="gap:16px">
    <div class="grid cols-4">${[['Students', rows.length], ['Active in last 7 days', active], ['Reviews in last 7 days', rev7], ['Rated Good or Easy', good == null ? '–' : good + '%']].map(([l, v]) => `<div class="card stat"><span>${l}</span><b>${v}</b></div>`).join('')}</div>
    <input class="input" id="ad-q" type="search" placeholder="Search by name or email" value="${h(ADMIN.q)}" aria-label="Search students" style="max-width:360px">
    <div class="table-wrap"><table class="tbl"><thead><tr>${th('name', 'Student')}${th('joined', 'Joined')}${th('last', 'Last active')}${th('streak', 'Streak')}${th('xp', 'Level')}${th('r7', 'Reviews 7d')}${th('total', 'Total')}${th('good', 'Good %')}${th('mastered', 'Mastered')}${th('mocks', 'Mocks')}${th('time', 'Time')}</tr></thead>
    <tbody>${list.map(r => `<tr class="ad-row" data-uid="${r.user_id}" tabindex="0"><td><b>${h(r.name)}</b><div class="faint" style="font-size:.8rem">${h(r.email)}</div></td><td class="faint">${new Date(r.joined_at).toLocaleDateString()}</td><td>${relDay(r.last_review_at)}</td><td class="num">${r.streak}d</td><td class="num">Lv ${levelOf(r.xp)} <span class="faint">${r.xp} XP</span></td><td class="num">${r.reviews_7d}</td><td class="num">${r.reviews_total}</td><td class="num">${r.good_pct == null ? '–' : Math.round(r.good_pct) + '%'}</td><td class="num">${r.mastered}<span class="faint">/${r.cards_seen}</span></td><td class="num">${r.mocks}</td><td class="num faint">${Math.round(r.minutes_total)}m</td></tr>`).join('') || '<tr><td colspan="11"><div class="empty">No students match.</div></td></tr>'}</tbody></table></div>
    <p class="faint" style="font-size:.8rem">Mastered means a card is in review with a stability of 21 days or more. Click a student for their activity.</p></div>`;
  $('#ad-q', box).oninput = e => { ADMIN.q = e.target.value; drawAdmin(box); const i = $('#ad-q', box); i.focus(); i.setSelectionRange(i.value.length, i.value.length); };
  box.querySelectorAll('[data-sort]').forEach(b => b.onclick = () => { if (ADMIN.sort === b.dataset.sort) ADMIN.dir *= -1; else { ADMIN.sort = b.dataset.sort; ADMIN.dir = -1; } drawAdmin(box); });
  box.querySelectorAll('.ad-row').forEach(tr => { const go = () => location.hash = 'a-' + tr.dataset.uid; tr.onclick = go; tr.onkeydown = e => { if (e.key === 'Enter') go(); }; });
}
const EVENT_NAMES = { app_open: 'App opened', sign_up: 'Signed up', sign_in: 'Signed in', session_complete: 'Session completed', mock_complete: 'Mock interview completed', superday_complete: 'Superday completed', import: 'Deck imported', bank_tag: 'Bank tagged', install_click: 'Install clicked', invite_share: 'Invite link shared', referral_joined: 'Joined from an invite', challenge_created: 'Challenge created', challenge_share: 'Challenge shared', challenge_complete: 'Challenge completed' };
async function drawActivity(box) {
  let days, counts;
  try { [days, counts] = await Promise.all([Store.adminActivity(14), Store.adminEventCounts(7)]); }
  catch (e) { box.innerHTML = `<div class="banner">Could not load activity: ${h(e.message || e)}. Run the latest supabase/admin-setup.sql if you have not yet.</div>`; return; }
  const today = days[days.length - 1] || {};
  const sum = k => days.reduce((n, d) => n + (d[k] || 0), 0);
  const label = d => new Date(d.day).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', timeZone: 'UTC' });
  box.innerHTML = `<div class="grid" style="gap:16px">
    <div class="grid cols-4">${[['Active today', today.active_users || 0], ['Sign-ups, 14 days', sum('sign_ups')], ['Sessions, 14 days', sum('sessions')], ['Events, 14 days', sum('events')]].map(([l, v]) => `<div class="card stat"><span>${l}</span><b>${v}</b></div>`).join('')}</div>
    <div class="grid cols-2">
      <div class="card grid" style="gap:8px"><h3>Daily active students</h3>${barChart(days.map(d => d.active_users), days.map((d, i) => i % 3 === 0 ? label(d) : ''), 'var(--sky)')}</div>
      <div class="card grid" style="gap:8px"><h3>Sign-ups per day</h3>${barChart(days.map(d => d.sign_ups), days.map((d, i) => i % 3 === 0 ? label(d) : ''), 'var(--gotit)')}</div>
    </div>
    <div class="card grid" style="gap:10px"><h3>What people did, last 7 days</h3>${counts.length ? `<table class="tbl"><thead><tr><th>Action</th><th>Times</th><th>People</th></tr></thead><tbody>${counts.map(c => `<tr><td>${h(EVENT_NAMES[c.name] || c.name)}</td><td class="num">${c.events}</td><td class="num">${c.users}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">No activity logged yet.</p>'}</div>
    <p class="faint" style="font-size:.8rem">Events are logged from the website only. No answer text is recorded.</p></div>`;
}
async function drawErrors(box) {
  let rows;
  try { rows = await Store.adminErrors(50); }
  catch (e) { box.innerHTML = `<div class="banner">Could not load errors: ${h(e.message || e)}. Run the latest supabase/admin-setup.sql if you have not yet.</div>`; return; }
  box.innerHTML = rows.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>When</th><th>Error</th><th>Who</th><th>Device</th><th>Version</th></tr></thead><tbody>${rows.map(r => `<tr><td class="faint" style="white-space:nowrap">${new Date(r.created_at).toLocaleString()}</td><td style="max-width:420px"><b>${h(r.message)}</b><div class="faint" style="font-size:.78rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h(r.url || '')}</div></td><td>${h(r.email || 'signed out')}</td><td class="faint" style="font-size:.78rem;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h(/iphone|ipad/i.test(r.user_agent) ? 'iPhone/iPad' : /android/i.test(r.user_agent) ? 'Android' : /mac/i.test(r.user_agent) ? 'Mac' : /windows/i.test(r.user_agent) ? 'Windows' : r.user_agent || '')}</td><td class="faint">${h(r.app_version || '')}</td></tr>`).join('')}</tbody></table></div>`
    : `<div class="card empty">${boSays('cheer', 'No errors reported. Smooth sailing.', 64)}</div>`;
}
function exportCsv() {
  if (!ADMIN.rows) return;
  const cols = ['name', 'email', 'joined_at', 'last_review_at', 'streak', 'best_streak', 'xp', 'reviews_7d', 'reviews_total', 'good_pct', 'cards_seen', 'mastered', 'mocks', 'minutes_total', 'decks'];
  const esc = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const csv = [cols.join(','), ...ADMIN.rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `wsa-reps-students-${dayKey()}.csv`; document.body.append(a); a.click(); a.remove();
}
Pages.adminStudent = async (el, uid) => {
  if (!S.isAdmin) return Pages.admin(el);
  if (!ADMIN.rows) { try { ADMIN.rows = await Store.adminStudents(); } catch {} }
  const r = (ADMIN.rows || []).find(x => x.user_id === uid);
  el.innerHTML = `<div class="page"><a class="btn sm ghost" href="#admin" style="justify-self:start">&larr; All students</a><div id="as-body"><div class="card empty"><b>Loading...</b></div></div></div>`;
  let docs;
  try { docs = await Store.adminDocs(uid); } catch (e) { $('#as-body', el).innerHTML = `<div class="banner">${h(e.message || e)}</div>`; return; }
  const logs = Object.entries(docs).filter(([k]) => k.startsWith('lg-')).flatMap(([, v]) => v.e || []).sort((a, b) => b[0] - a[0]);
  const cards = new Map();
  for (const [k, v] of Object.entries(docs)) if (k.startsWith('dk-')) for (const c of v.cards || []) cards.set(c.id, c);
  for (const c of SEED.map((c, i) => ({ ...c, id: 'starter-' + i.toString(36) }))) if (!cards.has(c.id)) cards.set(c.id, c);
  const byCat = new Map();
  for (const e of logs) { const c = cards.get(e[1]); const cat = c ? c.category : 'Other'; const x = byCat.get(cat) || { n: 0, g: 0 }; x.n++; if (e[2] >= 3) x.g++; byCat.set(cat, x); }
  const p = docs.profile || {};
  const names = ['', 'Again', 'Hard', 'Good', 'Easy'], cls = ['', 'again', 'shaky', 'gotit', 'ez'];
  $('#as-body', el).innerHTML = `<div class="grid" style="gap:16px">
    <div class="hello"><div class="eyebrow">${h(r ? r.email : uid)}</div><h1>${h(r ? r.name : 'Student')}</h1><p class="muted">Joined ${r ? new Date(r.joined_at).toLocaleDateString() : '–'} · last active ${relDay(r && r.last_review_at)}</p></div>
    <div class="grid cols-4">${[['Level', `Lv ${levelOf(p.xp || 0)} · ${p.xp || 0} XP`], ['Streak', `${p.streak || 0}d (best ${p.best || 0}d)`], ['Reviews', logs.length], ['Rated Good or Easy', logs.length ? Math.round(100 * logs.filter(e => e[2] >= 3).length / logs.length) + '%' : '–'], ['Cards mastered', r ? `${r.mastered} of ${r.cards_seen} seen` : '–'], ['Mock interviews', p.mocks || 0], ['Decks', (p.decks || []).length], ['Study time', r ? Math.round(r.minutes_total) + 'm' : '–']].map(([l, v]) => `<div class="card stat"><span>${l}</span><b style="font-size:1.15rem">${v}</b></div>`).join('')}</div>
    <div class="card grid" style="gap:10px"><h3>Activity, last 26 weeks</h3>${heatmapFrom(logs, 26)}</div>
    <div class="grid cols-2">
      <div class="card grid" style="gap:10px"><h3>Accuracy by topic</h3>${[...byCat].sort((a, b) => b[1].n - a[1].n).map(([c, x]) => `<div class="hbar"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h(c)} <span class="faint num">${x.n}</span></span><div class="bar"><i style="width:${Math.round(100 * x.g / x.n)}%"></i></div><span class="num faint" style="text-align:right">${Math.round(100 * x.g / x.n)}%</span></div>`).join('') || '<p class="muted">No reviews yet.</p>'}</div>
      <div class="card grid" style="gap:10px;align-content:start"><h3>Recent reviews</h3>${logs.length ? `<table class="tbl"><tbody>${logs.slice(0, 15).map(e => { const c = cards.get(e[1]); return `<tr><td style="max-width:280px"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h(c ? c.q : e[1])}</div><div class="faint" style="font-size:.78rem">${new Date(e[0]).toLocaleString()}</div></td><td style="font-weight:600;color:var(--${cls[e[2]]})">${names[e[2]]}</td><td class="num faint">${Math.round(e[3] / 1000)}s</td></tr>`; }).join('')}</tbody></table>` : '<p class="muted">No reviews yet.</p>'}</div>
    </div></div>`;
};

// Router and boot
function applyTheme() {
  const t = Store.lsGet('theme');
  if (t === 'dark' || t === 'light') document.documentElement.setAttribute('data-theme', t);
  else if (Store.lsGet('theme') === 'system') document.documentElement.removeAttribute('data-theme');
}
function route() {
  setKeys(null);
  const hash = location.hash.slice(1) || 'today';
  const main = $('#view');
  if (!S.ready) return;
  const [page, id] = hash.startsWith('p-') ? ['problem', hash.slice(2)] : hash.startsWith('a-') ? ['adminStudent', hash.slice(2)] : hash.startsWith('ch-') ? ['challenge', hash.slice(3)] : [hash, null];
  const navKey = page === 'problem' ? 'problems' : page === 'session' ? 'today' : page === 'adminStudent' ? 'admin' : page === 'challenge' ? 'friends' : page;
  document.querySelectorAll('.nav-link').forEach(a => a.toggleAttribute('aria-current', a.dataset.nav === navKey) || (a.dataset.nav === navKey && a.setAttribute('aria-current', 'page')));
  document.querySelectorAll('.nav-link').forEach(a => { if (a.dataset.nav === navKey) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  if (page !== 'session' && SESSION && SESSION.rated) { finishSessionBonus(); SESSION = null; }
  updateNavStats();
  (Pages[page] || Pages.today)(main, id);
  window.scrollTo(0, 0);
}
function updateNavStats() {
  const p = S.profile; if (!p) return;
  $('#np-streak').innerHTML = `${I.flame}${p.streak}`;
  $('#np-xp').innerHTML = `${I.bolt}${p.xp}`;
}
function renderNav() {
  const links = NAV.map(([k, l]) => `<a class="nav-link" href="#${k}" data-nav="${k}">${I[k]}<span>${l}</span></a>`).join('');
  $('#navlinks').innerHTML = links;
  $('#tabbar').innerHTML = links;
  Store.onStatus(s => {
    const el = $('#sync'); if (!el) return;
    el.innerHTML = s.mode === 'account' ? (s.offline ? `<span class="dot warn"></span>Offline · ${s.pending ? `${s.pending} change${s.pending === 1 ? '' : 's'} will sync` : 'will sync when online'}` : `<span class="dot ${s.error ? 'warn' : 'ok'}"></span>${s.error ? 'Sync issue, retrying' : s.pending ? 'Saving...' : 'Saved to your account'}`) : s.mode === 'cloud' ? `<span class="dot ${s.error ? 'warn' : 'ok'}"></span>${s.error ? 'Sync issue, retrying' : s.pending ? 'Saving...' : 'Synced to your account'}` : `<span class="dot warn"></span>Saved in this browser`;
  });
}
async function boot() {
  applyTheme();
  renderNav();
  $('#view').innerHTML = `<div class="page"><div class="card empty"><div class="dot warn"></div><b>Loading your reps...</b></div></div>`;
  const init = await Store.init();
  if (init.needsLogin) await authScreen();
  S.viewer = await Store.viewerName();
  try { await loadData(); }
  catch (e) { $('#view').innerHTML = `<div class="page"><div class="card empty"><h2>Couldn't load your progress</h2><p class="muted">Check your connection, then reload the page.</p></div></div>`; return; }
  Telemetry.track('app_open', { installed: isStandalone(), phone: matchMedia('(max-width: 900px)').matches });
  await Friends.afterSignIn();
  S.isAdmin = await Store.isAdmin();
  if (S.isAdmin) { $('#navlinks').insertAdjacentHTML('beforeend', `<a class="nav-link" href="#admin" data-nav="admin">${I.mock}<span>Admin</span></a>`); }
  const n = S.profile.name || S.viewer || '';
  $('#who').textContent = (n.trim()[0] || 'Y').toUpperCase();
  $('#who').title = n ? `${n} · prefs` : 'Prefs';
  route();
}
function authScreen() {
  document.body.classList.add('auth');
  let googleOn = false;
  return new Promise(resolve => {
    Store.googleEnabled().then(on => { googleOn = on; if (on && $('#a-google')) { $('#a-google').hidden = false; $('#a-google-btn').onclick = async () => { try { await Store.signInGoogle(); } catch (err) { draw(err.message || 'Google sign-in is not available right now.'); } }; } });
    let modeSU = !!(Store.lsGet('pendingRef') || Store.lsGet('pendingChallenge'));
    const keep = { email: '', name: '' };
    const draw = (msg = '', kind = '') => {
      const em0 = $('#a-email'), nm0 = $('#a-name');
      if (em0) keep.email = em0.value; if (nm0) keep.name = nm0.value;
      $('#view').innerHTML = `<div class="page" style="max-width:440px;padding-top:6vh"><div class="grid" style="gap:6px;text-align:center"><div style="justify-self:center">${boSays('happy', h(boLine('auth')), 72)}</div><div class="logo" style="justify-content:center;font-size:1.4rem;margin-top:8px"><span class="mark">WSA</span>WSA Reps</div><h1 style="margin-top:10px">IB interview prep <span class="grad">that sticks.</span></h1><p class="muted">Practice banking technicals and fit questions every day, with spaced repetition scheduling what to review next.</p></div>
        <form class="card grid" id="auth" style="gap:14px" novalidate>
          <div class="tabs" role="tablist" style="justify-self:center"><button type="button" role="tab" aria-selected="${!modeSU}" data-m="in">Sign in</button><button type="button" role="tab" aria-selected="${modeSU}" data-m="up">Create account</button></div>
          ${modeSU ? `<label class="field" for="a-name">Name<input class="input" id="a-name" autocomplete="name" required value="${h(keep.name)}"></label>` : ''}
          <label class="field" for="a-email">Email<input class="input" id="a-email" type="email" autocomplete="email" required value="${h(keep.email)}"></label>
          <label class="field" for="a-pass">Password<input class="input" id="a-pass" type="password" autocomplete="${modeSU ? 'new-password' : 'current-password'}" minlength="6" required></label>
          ${Friends.authNote() && !msg ? `<div class="banner" style="font-size:.88rem">${h(Friends.authNote())}</div>` : ''}
          ${msg ? `<div class="${kind === 'ok' ? 'card' : 'banner'}" style="font-size:.88rem">${h(msg)}</div>` : ''}
          <button class="btn go big" type="submit">${modeSU ? 'Create account' : 'Sign in'}</button>
          ${modeSU ? '' : '<button class="btn ghost sm" type="button" id="a-forgot">Forgot password?</button>'}
          <div id="a-google" hidden class="grid" style="gap:10px"><div class="or"><span>or</span></div><button class="btn big google" type="button" id="a-google-btn"><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>Continue with Google</button></div>
        </form></div>`;
      if (googleOn) { $('#a-google').hidden = false; $('#a-google-btn').onclick = async () => { try { await Store.signInGoogle(); } catch (err) { draw(err.message || 'Google sign-in is not available right now.'); } }; }
      $('#view').querySelectorAll('[data-m]').forEach(b => b.onclick = () => { modeSU = b.dataset.m === 'up'; draw(); });
      const f = $('#a-forgot'); if (f) f.onclick = async () => { const em = $('#a-email').value.trim(); if (!em) return draw('Enter your email first, then tap Forgot password.'); try { await Store.resetPassword(em); draw('Check your email for a reset link.', 'ok'); } catch (e) { draw(e.message || 'Could not send the reset email.'); } };
      $('#auth').onsubmit = async e => {
        e.preventDefault();
        const em = $('#a-email').value.trim(), pw = $('#a-pass').value, nm = modeSU ? $('#a-name').value.trim() : '';
        if (!em || pw.length < 6) return draw('Enter your email and a password of at least 6 characters.');
        const btn = e.target.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'One moment...';
        try {
          if (modeSU) { const r = await Store.signUp(em, pw, nm); if (r.confirm) { modeSU = false; return draw('Account created. Check your email to confirm it, then sign in.', 'ok'); } Telemetry.track('sign_up', { method: 'email' }); }
          else { await Store.signIn(em, pw); Telemetry.track('sign_in', { method: 'email' }); }
          document.body.classList.remove('auth');
          resolve();
        } catch (err) { draw(/invalid login/i.test(err.message) ? 'That email and password do not match.' : err.message || 'Something went wrong. Try again.'); }
      };
    };
    draw();
  });
}

// Home-screen install: service worker on the website, and a one-time tip on phones.
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
let deferredInstall = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; });
if ('serviceWorker' in navigator && location.protocol === 'https:' && !window.claude) navigator.serviceWorker.register('sw.js').catch(() => {});
function installHelp() {
  if (isStandalone() || window.claude) return '';
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const steps = ios ? 'Tap <b>Share</b>, then <b>Add to Home Screen</b>.'
    : 'Open the browser menu, then tap <b>Install app</b> or <b>Add to Home screen</b>.';
  return `<div class="install"><div class="row spread" style="align-items:flex-start;gap:10px"><div style="min-width:0"><b>Use WSA Reps like an app</b><p class="muted" style="font-size:.88rem;margin-top:4px">${steps} It opens full screen and remembers your sign-in.</p></div><div class="row" style="gap:6px">${deferredInstall ? '<button class="btn sm go" id="do-install">Install</button>' : ''}<button class="btn sm ghost" id="hide-install" aria-label="Dismiss">Not now</button></div></div></div>`;
}
function bindInstall(el) {
  const i = $('#do-install', el); if (i) i.onclick = async () => { Telemetry.track('install_click'); deferredInstall.prompt(); await deferredInstall.userChoice.catch(() => {}); deferredInstall = null; $('.install', el)?.remove(); };
  const hd = $('#hide-install', el); if (hd) hd.onclick = () => { Store.lsSet('installHidden', Date.now()); $('.install', el)?.remove(); };
}

addEventListener('hashchange', route);
addEventListener('pagehide', () => { if (SESSION && SESSION.rated) finishSessionBonus(); });
boot();
