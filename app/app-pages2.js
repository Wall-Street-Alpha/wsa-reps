// Mock interview
let MOCK = null;
Pages.mock = el => {
  if (MOCK && MOCK.phase === 'run') return mockRun(el);
  if (MOCK && MOCK.phase === 'review') return mockReview(el);
  el.innerHTML = `<div class="page" style="max-width:720px"><div class="hello"><div class="eyebrow">Superday simulator</div><h1>Mock interview</h1><p class="muted">Questions back to back with a two-minute clock each. Tap the speaker to hear a question. Answers appear at the end, and each question is then scheduled for review.</p></div>
    <div class="card grid" style="gap:16px">
      <label class="field" for="m-track">Track<select class="input" id="m-track"><option value="Mixed">Mixed</option><option value="Behavioral">Behavioral / fit</option><option value="Technical">Technical</option></select></label>
      <label class="field" for="m-count">Questions<select class="input" id="m-count"><option>5</option><option>8</option><option>12</option></select></label>
      <label class="field" for="m-pool">Pull from<select class="input" id="m-pool"><option value="all">Everything</option><option value="weak">My weakest cards</option><option value="starred">Starred only</option></select></label>
      <button class="btn go big" id="m-go">${I.play} Start the interview</button></div></div>`;
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
    <div class="card grid" style="gap:14px"><div class="row spread"><span class="eyebrow">Question ${m.i + 1} of ${m.ids.length}</span><button class="icon-btn" id="m-speak" aria-label="Read aloud">${I.speak}</button></div><div class="q-text">${h(card.q)}</div>
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
    const head = pct >= 0.8 ? 'Strong performance.' : pct >= 0.5 ? 'Solid, with a few to tighten.' : 'Worth another pass on these.';
    MOCK = null;
    el.innerHTML = `<div class="page" style="max-width:820px"><div class="card done-hero">${boSays(pct >= 0.5 ? 'cheer' : 'gentle', h(pct >= 0.5 ? 'Nice work in the room. Review the misses and run it again soon.' : 'Tough set. Review these and they\'ll come back easier.'), 96)}<div class="eyebrow">Mock interview complete</div><div class="big-num">${good} of ${n}</div><h1>${head}</h1><p class="muted">Answered well, based on your own ratings. Every question is now on your review schedule.</p>
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
    <div id="imp-paste" hidden class="grid" style="gap:10px"><textarea class="input" id="imp-text" style="min-height:220px" placeholder="Paste questions. Works with numbered lists (1. Question? then the answer), Q: / A: pairs, or questions ending in a question mark."></textarea><button class="btn go" id="imp-parse" style="justify-self:start">Find questions</button></div>
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
      cards = Parser.parseQA(text, { source: file.name }).cards;
    }
    st.innerHTML = '';
    showPreview(el, cards, file.name.replace(/\.[^.]+$/, ''));
  } catch (e) {
    st.innerHTML = `<div class="banner">Could not read that file: ${h(e && e.message || e)}. Try saving it as PDF or DOCX, or paste the text instead.</div>`;
  }
}
function fromJson(j) {
  const arr = Array.isArray(j) ? j : Array.isArray(j.cards) ? j.cards : [];
  return arr.map(x => ({ q: x.q || x.question, a: x.a || x.answer, category: x.category || Parser.guessCategory(x.q || x.question || '', x.a || x.answer || ''), difficulty: x.difficulty || 'Medium', track: x.track })).filter(x => x.q && x.a);
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
  const qi = hasHead ? head.indexOf('question') : 0, ai = hasHead ? head.indexOf('answer') : 1, ci = head.indexOf('category'), di = head.indexOf('difficulty');
  return rows.slice(hasHead ? 1 : 0).filter(r => r[qi] && r[ai]).map(r => ({ q: r[qi].trim(), a: r[ai].trim(), category: (ci >= 0 && r[ci]) || Parser.guessCategory(r[qi], r[ai]), difficulty: (di >= 0 && r[di]) || 'Medium' }));
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
    <div class="card grid" style="gap:10px"><h2>Your data</h2><p class="muted">${Store.mode === 'account' ? 'Progress is stored privately under your account. Nobody else using this app can see it.' : Store.mode === 'cloud' ? 'Progress is stored privately under your claude.ai account. Nobody else using this app can see it.' : 'Progress is stored in this browser only.'}</p><div class="row"><button class="btn" id="p-export">Export my data (JSON)</button>${Store.mode === 'account' ? `<button class="btn" id="p-signout">Sign out ${h(Store.email)}</button>` : ''}</div><div id="p-export-out"></div></div></div>`;
  const so = $('#p-signout', el); if (so) so.onclick = () => Store.signOut();
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
  const [page, id] = hash.startsWith('p-') ? ['problem', hash.slice(2)] : [hash, null];
  const navKey = page === 'problem' ? 'problems' : page === 'session' ? 'today' : page;
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
    el.innerHTML = s.mode === 'account' ? `<span class="dot ${s.error ? 'warn' : 'ok'}"></span>${s.error ? 'Sync issue, retrying' : s.pending ? 'Saving...' : 'Saved to your account'}` : s.mode === 'cloud' ? `<span class="dot ${s.error ? 'warn' : 'ok'}"></span>${s.error ? 'Sync issue, retrying' : s.pending ? 'Saving...' : 'Synced to your account'}` : `<span class="dot warn"></span>Saved in this browser`;
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
    let modeSU = false;
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
          if (modeSU) { const r = await Store.signUp(em, pw, nm); if (r.confirm) { modeSU = false; return draw('Account created. Check your email to confirm it, then sign in.', 'ok'); } }
          else await Store.signIn(em, pw);
          document.body.classList.remove('auth');
          resolve();
        } catch (err) { draw(/invalid login/i.test(err.message) ? 'That email and password do not match.' : err.message || 'Something went wrong. Try again.'); }
      };
    };
    draw();
  });
}

addEventListener('hashchange', route);
addEventListener('pagehide', () => { if (SESSION && SESSION.rated) finishSessionBonus(); });
boot();
