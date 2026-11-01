// Pages. Each render(el) fills the main view.
const Pages = {};

Pages.today = el => {
  const p = S.profile, c = dueCounts(), lv = levelOf(p.xp);
  const lvFrom = xpForLevel(lv), lvTo = xpForLevel(lv + 1);
  const todayXp = p.daily[dayKey()]?.xp || 0;
  const goalPct = Math.min(1, todayXp / p.goal);
  const name = p.name || S.viewer || '';
  const hr = new Date().getHours();
  const greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const weak = units().filter(u => u.cards.some(x => S.st[x.id])).sort((a, b) => a.mastery - b.mastery).slice(0, 3);
  const queueLen = buildDailyQueue().length;
  const R = 34, C = 2 * Math.PI * R;
  el.innerHTML = `<div class="page">
    <div class="row spread"><div><div class="eyebrow">${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div><h1>${greet}${name ? ', ' + h(name.split(' ')[0]) : ''}.</h1></div>
      <div class="row"><span class="flame" title="Day streak">${I.flame}${p.streak}</span><span class="level-chip">Lv ${lv}</span></div></div>
    ${Store.mode === 'local' ? `<div class="banner">You're in local mode: progress is saved in this browser only. Open this app from its claude.ai link while signed in to sync progress across devices.</div>` : ''}
    <div class="hero">
      <div class="card hero-main">
        <div><div class="eyebrow">Today's reps</div><h2 style="margin-top:6px;font-size:1.5rem">${queueLen ? `${queueLen} card${queueLen === 1 ? '' : 's'} ready` : 'All caught up'}</h2>
          <p class="muted" style="margin-top:4px">${queueLen ? 'Reviews first, then fresh questions. About ' + Math.max(1, Math.round(queueLen * 0.6)) + ' minutes.' : 'Nothing is due. Learn something new on the Path or run a mock interview.'}</p></div>
        <div class="ticker"><div class="tick"><b>${c.due}</b><span>Due now</span></div><div class="tick"><b>${c.newToday}</b><span>New today</span></div><div class="tick"><b>${c.learning}</b><span>Learning</span></div></div>
        <div class="row">${queueLen ? `<a class="btn primary big" href="#session">${I.play} Start today's reps</a>` : `<a class="btn primary big" href="#path">Open the path</a>`}<a class="btn" href="#mock">Mock interview</a></div>
      </div>
      <div class="card grid" style="gap:16px;align-content:start">
        <div class="ring-wrap">
          <svg width="84" height="84" viewBox="0 0 84 84" role="img" aria-label="Daily goal ${Math.round(goalPct * 100)}%"><circle cx="42" cy="42" r="${R}" fill="none" stroke="var(--surface-2)" stroke-width="9"/><circle cx="42" cy="42" r="${R}" fill="none" stroke="var(--accent)" stroke-width="9" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - goalPct)}" transform="rotate(-90 42 42)"/><text x="42" y="47" text-anchor="middle" style="fill:var(--ink);font:800 15px var(--font-mono)">${Math.round(goalPct * 100)}%</text></svg>
          <div><div class="eyebrow">Daily goal</div><div class="num" style="font-size:1.3rem;font-weight:800">${todayXp} / ${p.goal} XP</div><div class="faint" style="font-size:.85rem">${goalPct >= 1 ? 'Goal hit. Nice work.' : `${p.goal - todayXp} XP to go`}</div></div>
        </div>
        <div><div class="row spread" style="margin-bottom:6px"><span class="eyebrow">Level ${lv}</span><span class="num faint" style="font-size:.8rem">${p.xp - lvFrom} / ${lvTo - lvFrom} XP</span></div><div class="bar"><i style="width:${Math.round(100 * (p.xp - lvFrom) / (lvTo - lvFrom))}%"></i></div></div>
        <div class="faint" style="font-size:.82rem">Streak freezes: <b class="num">${p.freezes || 0}</b> &middot; Best streak: <b class="num">${p.best || 0}</b> days</div>
      </div>
    </div>
    <div class="grid cols-2">
      <div class="card grid" style="gap:12px;align-content:start"><div class="row spread"><h3>Weak spots</h3><a href="#progress" class="faint" style="font-size:.85rem">All topics</a></div>
        ${weak.length ? weak.map(u => `<div class="grid" style="gap:6px"><div class="row spread"><b>${h(u.name)}</b><button class="btn sm" data-drill="${h(u.name)}">Drill</button></div><div class="bar"><i style="width:${u.mastery}%;background:${u.mastery < 30 ? 'var(--again)' : u.mastery < 60 ? 'var(--hard)' : 'var(--good)'}"></i></div><span class="faint num" style="font-size:.78rem">${u.mastery}% mastery</span></div>`).join('') : '<p class="muted">Review a few cards and your weakest topics show up here.</p>'}
      </div>
      <div class="card grid" style="gap:12px;align-content:start"><div class="row spread"><h3>Last 12 weeks</h3><span class="faint num" style="font-size:.8rem">${totalReviews()} reviews</span></div>${heatmap(12)}</div>
    </div>
  </div>`;
  el.querySelectorAll('[data-drill]').forEach(b => b.onclick = () => startSession({ mode: 'category', ids: buildCategoryQueue(b.dataset.drill), title: b.dataset.drill }));
};

function heatmap(weeks) {
  const counts = {};
  for (const e of allLogs()) { const k = dayKey(e[0]); counts[k] = (counts[k] || 0) + 1; }
  const end = new Date(); end.setHours(0, 0, 0, 0);
  const start = new Date(end); start.setDate(start.getDate() - (weeks * 7 - 1) - start.getDay() + 0);
  start.setDate(end.getDate() - end.getDay() - (weeks - 1) * 7);
  let cells = '';
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const n = counts[dayKey(d.getTime())] || 0;
    const l = n === 0 ? '' : n < 5 ? 'l1' : n < 15 ? 'l2' : n < 30 ? 'l3' : 'l4';
    cells += `<i class="${l}" title="${dayKey(d.getTime())}: ${n} review${n === 1 ? '' : 's'}"></i>`;
  }
  return `<div class="heat" role="img" aria-label="Reviews per day">${cells}</div>`;
}

Pages.path = el => {
  const us = units();
  const behavioral = us.filter(u => u.track === 'Behavioral'), technical = us.filter(u => u.track !== 'Behavioral');
  let current = null;
  const lessonState = cards => {
    const seen = cards.filter(c => S.st[c.id]).length;
    const m = cards.reduce((n, c) => n + SRS.mastery(S.st[c.id]), 0) / cards.length;
    if (seen === cards.length) return m >= 70 ? 'crown' : 'done';
    return 'todo';
  };
  let idx = 0;
  const unitHtml = (u, ui) => {
    const color = UNIT_COLORS[ui % UNIT_COLORS.length];
    const nodes = u.lessons.map((ls, li) => {
      let st = lessonState(ls);
      if (st === 'todo' && !current) { current = `${ui}-${li}`; st = 'current'; }
      const x = Math.round(Math.sin(idx++ * 0.9) * 70);
      const icon = st === 'crown' ? I.crown : st === 'done' ? I.check : st === 'current' ? I.play : `<span>${li + 1}</span>`;
      return `<button class="node ${st}" style="--x:${x}px" data-unit="${ui}" data-lesson="${li}" aria-label="${h(u.name)} lesson ${li + 1}">${icon}</button><div class="node-label" style="--x:${x}px">Lesson ${li + 1} &middot; ${ls.length} cards</div>`;
    }).join('');
    return `<section class="unit"><div class="unit-head" style="background:${color}"><div><div class="sub">Unit ${ui + 1} &middot; ${h(u.track)}</div><h2>${h(u.name)}</h2></div><div class="row"><span class="sub num">${u.mastery}% mastery</span><button class="btn sm" style="background:rgba(255,255,255,.18);color:#fff;border-color:transparent" data-drill="${h(u.name)}">Practice all</button></div></div><div class="trail">${nodes}</div></section>`;
  };
  const all = [...behavioral, ...technical];
  el.innerHTML = `<div class="page" style="max-width:640px"><div><div class="eyebrow">Learning path</div><h1>From fit to technicals</h1><p class="muted" style="margin-top:6px">Each unit is a topic. Lessons are 8 questions. Finish a lesson to check it off; master it for a crown.</p></div>
    ${all.length ? all.map(unitHtml).join('') : `<div class="card empty"><h2>No questions yet</h2><a class="btn primary" href="#import">Import a question bank</a></div>`}</div>`;
  el.querySelectorAll('.node').forEach(b => b.onclick = () => {
    const u = all[+b.dataset.unit], ls = u.lessons[+b.dataset.lesson];
    startSession({ mode: 'lesson', ids: ls.map(c => c.id), title: `${u.name}: lesson ${+b.dataset.lesson + 1}` });
  });
  el.querySelectorAll('[data-drill]').forEach(b => b.onclick = () => startSession({ mode: 'category', ids: buildCategoryQueue(b.dataset.drill), title: b.dataset.drill }));
};

const PF = { q: '', deck: '', cat: '', diff: '', status: '', starred: false, sort: 'num', dir: 1 };
Pages.problems = el => {
  const cats = [...new Set(S.cards.map(c => c.category))];
  el.innerHTML = `<div class="page"><div class="row spread"><div><div class="eyebrow">Problem set</div><h1>Questions</h1></div><div class="row"><button class="btn" id="pick">Pick random</button><a class="btn primary" href="#import">Import</a></div></div>
    <div class="filters">
      <input class="input search" id="f-q" type="search" placeholder="Search questions and answers" value="${h(PF.q)}" aria-label="Search">
      <select class="input" id="f-deck" aria-label="Deck"><option value="">All decks</option>${S.decks.map(d => `<option value="${d.id}" ${PF.deck === d.id ? 'selected' : ''}>${h(d.name)}</option>`).join('')}</select>
      <select class="input" id="f-cat" aria-label="Category"><option value="">All topics</option>${cats.map(c => `<option ${PF.cat === c ? 'selected' : ''}>${h(c)}</option>`).join('')}</select>
      <select class="input" id="f-diff" aria-label="Difficulty"><option value="">Any difficulty</option>${['Easy', 'Medium', 'Hard'].map(d => `<option ${PF.diff === d ? 'selected' : ''}>${d}</option>`).join('')}</select>
      <select class="input" id="f-status" aria-label="Status"><option value="">Any status</option>${[['new', 'New'], ['learning', 'Learning'], ['mastered', 'Mastered']].map(([v, l]) => `<option value="${v}" ${PF.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <button class="btn ${PF.starred ? 'primary' : ''}" id="f-star" aria-pressed="${PF.starred}">${I.star} Starred</button>
    </div>
    <div class="faint" id="count" style="font-size:.85rem"></div>
    <div class="table-wrap"><table class="tbl"><thead><tr><th></th><th><button data-sort="num">#</button></th><th>Question</th><th>Topic</th><th>Level</th><th><button data-sort="mastery">Mastery</button></th><th><button data-sort="due">Next</button></th><th></th></tr></thead><tbody id="rows"></tbody></table></div></div>`;
  const rowsEl = $('#rows', el);
  const filtered = () => {
    const q = PF.q.toLowerCase();
    let list = orderedCards().map((c, i) => ({ c, n: i + 1 })).filter(({ c }) =>
      (!PF.deck || c.deck === PF.deck) && (!PF.cat || c.category === PF.cat) && (!PF.diff || c.difficulty === PF.diff) &&
      (!PF.status || SRS.status(S.st[c.id]) === PF.status) && (!PF.starred || S.star[c.id]) &&
      (!q || c.q.toLowerCase().includes(q) || c.a.toLowerCase().includes(q)));
    const key = { num: x => x.n, mastery: x => SRS.mastery(S.st[x.c.id]), due: x => { const s = S.st[x.c.id]; return !s || s.state === 0 ? Infinity : s.due; } }[PF.sort];
    list.sort((a, b) => (key(a) - key(b)) * PF.dir || a.n - b.n);
    return list;
  };
  const draw = () => {
    const list = filtered();
    $('#count', el).textContent = `${list.length} of ${S.cards.length} questions`;
    rowsEl.innerHTML = list.length ? list.slice(0, 600).map(({ c, n }) => {
      const s = S.st[c.id], m = SRS.mastery(s);
      return `<tr><td>${statusIcon(s)}</td><td class="num faint">${n}</td><td><a class="q-link" href="#p-${c.id}">${h(c.q)}</a></td><td class="muted" style="white-space:nowrap">${h(c.category)}</td><td>${diffPill(c.difficulty)}</td><td style="min-width:90px"><div class="bar"><i style="width:${m}%"></i></div></td><td class="num" style="white-space:nowrap;font-size:.82rem">${relDue(s)}</td><td><button class="star ${S.star[c.id] ? 'on' : ''}" data-star="${c.id}" aria-label="Star">${S.star[c.id] ? I.star : I.starO}</button></td></tr>`;
    }).join('') : `<tr><td colspan="8"><div class="empty"><b>No questions match these filters.</b><button class="btn sm" id="clear">Clear filters</button></div></td></tr>`;
    rowsEl.querySelectorAll('[data-star]').forEach(b => b.onclick = () => { toggleStar(b.dataset.star); draw(); });
    const clr = $('#clear', rowsEl); if (clr) clr.onclick = () => { Object.assign(PF, { q: '', deck: '', cat: '', diff: '', status: '', starred: false }); Pages.problems(el); };
  };
  const bind = (id, k) => { $(id, el).oninput = e => { PF[k] = e.target.value; draw(); }; };
  bind('#f-q', 'q'); bind('#f-deck', 'deck'); bind('#f-cat', 'cat'); bind('#f-diff', 'diff'); bind('#f-status', 'status');
  $('#f-star', el).onclick = () => { PF.starred = !PF.starred; Pages.problems(el); };
  el.querySelectorAll('[data-sort]').forEach(b => b.onclick = () => { if (PF.sort === b.dataset.sort) PF.dir *= -1; else { PF.sort = b.dataset.sort; PF.dir = 1; } draw(); });
  $('#pick', el).onclick = () => { const l = filtered(); if (l.length) location.hash = 'p-' + l[Math.floor(Math.random() * l.length)].c.id; };
  draw();
};

function toggleStar(id) {
  if (S.star[id]) delete S.star[id]; else S.star[id] = true;
  saveStates(S.byId.get(id).deck);
}

Pages.problem = (el, id) => {
  const card = S.byId.get(id);
  if (!card) { el.innerHTML = `<div class="page"><div class="card empty"><h2>Question not found</h2><a class="btn" href="#problems">Back to questions</a></div></div>`; return; }
  const list = orderedCards();
  const i = list.findIndex(c => c.id === id);
  const attempts = allLogs().filter(e => e[1] === id).slice(-8).reverse();
  const names = ['', 'Again', 'Hard', 'Good', 'Easy'];
  el.innerHTML = `<div class="page"><div class="row spread"><a href="#problems" class="btn ghost sm">&larr; All questions</a><div class="row"><span class="faint num">${i + 1} / ${list.length}</span><a class="btn sm" href="#p-${list[Math.max(0, i - 1)].id}" aria-label="Previous">&larr;</a><a class="btn sm" href="#p-${list[Math.min(list.length - 1, i + 1)].id}" aria-label="Next">&rarr;</a></div></div>
    <div class="ws">
      <div class="grid" style="gap:14px">
        <div class="card grid" style="gap:12px"><div class="row spread"><span class="eyebrow">Question ${i + 1}</span><button class="star ${S.star[id] ? 'on' : ''}" id="ws-star" aria-label="Star">${S.star[id] ? I.star : I.starO}</button></div><div class="q-text">${h(card.q)}</div>
          <div class="row" style="gap:6px">${diffPill(card.difficulty)}<span class="pill">${h(card.category)}</span><span class="pill">${h(deckName(card.deck))}</span></div>
          <div class="row faint" style="font-size:.85rem;gap:16px"><span>${statusIcon(S.st[id])} ${SRS.status(S.st[id])}</span><span>Mastery <b class="num">${SRS.mastery(S.st[id])}%</b></span><span>Next: ${relDue(S.st[id])}</span></div></div>
        <div class="card grid" style="gap:10px"><h3>Past attempts</h3>${attempts.length ? `<table class="tbl"><tbody>${attempts.map(e => `<tr><td class="num faint">${new Date(e[0]).toLocaleDateString()}</td><td style="color:var(--${['', 'again', 'hard', 'good', 'easy'][e[2]]});font-weight:700">${names[e[2]]}</td><td class="num faint">${e[4] >= 0 ? e[4] + '% coverage' : 'revealed'}</td><td class="num faint">${Math.round(e[3] / 1000)}s</td></tr>`).join('')}</tbody></table>` : '<p class="muted">No attempts yet.</p>'}</div>
        <div class="card grid" style="gap:8px"><label class="field" for="ws-notes">My notes <span class="faint" style="font-weight:500">Saved to your account</span></label><textarea class="input" id="ws-notes" placeholder="Your own framing, a story to use, a number to remember.">${h(S.notes[id] || '')}</textarea></div>
      </div>
      <div class="card" id="ws-flow"></div>
    </div></div>`;
  $('#ws-star', el).onclick = () => { toggleStar(id); Pages.problem(el, id); };
  $('#ws-notes', el).oninput = e => { S.notes[id] = e.target.value; saveNotes(card.deck); };
  cardFlow($('#ws-flow', el), id, {
    mode: 'practice',
    onRated: (r, out) => {
      App.toast(`+${out.xp} XP. Next review ${SRS.formatInterval(out.next.due - Date.now())}.`);
      const due = buildDailyQueue(5).find(x => x !== id);
      const flow = $('#ws-flow', el);
      flow.innerHTML = `<div class="empty"><h2>Saved</h2><p class="muted">Next review in ${SRS.formatInterval(out.next.due - Date.now())}.</p><div class="row" style="justify-content:center">${due ? `<a class="btn primary" href="#p-${due}">Next due question</a>` : ''}<a class="btn" href="#p-${list[Math.min(list.length - 1, i + 1)].id}">Next in list</a></div></div>`;
    },
  });
};

// ---------- Sessions ----------
let SESSION = null;
function startSession({ mode, ids, title }) {
  if (!ids.length) { App.toast('Nothing to practice here right now.'); return; }
  SESSION = { mode, title, queue: [...ids], total: ids.length, done: 0, xp: 0, good: 0, rated: 0, combo: 0, bestCombo: 0, started: Date.now(), streakBefore: S.profile.streak };
  if (location.hash === '#session') route(); else location.hash = 'session';
}

Pages.session = el => {
  if (!SESSION) {
    const ids = buildDailyQueue();
    if (!ids.length) { el.innerHTML = `<div class="page" style="max-width:720px"><div class="card empty"><h2>All caught up</h2><p class="muted">No reviews are due and today's new cards are done.</p><div class="row"><a class="btn primary" href="#path">Learn more on the Path</a><a class="btn" href="#mock">Mock interview</a></div></div></div>`; return; }
    SESSION = { mode: 'daily', title: "Today's reps", queue: ids, total: ids.length, done: 0, xp: 0, good: 0, rated: 0, combo: 0, bestCombo: 0, started: Date.now(), streakBefore: S.profile.streak };
  }
  const ss = SESSION;
  if (!ss.queue.length) return sessionDone(el);
  const pct = Math.round(100 * ss.done / ss.total);
  el.innerHTML = `<div class="page" style="max-width:760px">
    <div class="session-top"><a class="icon-btn" href="#today" id="quit" aria-label="End session">${I.x}</a><div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div><span class="combo">${ss.combo >= 2 ? ss.combo + 'x' : ''}</span></div>
    <div class="row spread"><span class="eyebrow">${h(ss.title)}</span><span class="faint num" style="font-size:.85rem">${ss.done} done &middot; ${ss.queue.length} left &middot; +${ss.xp} XP</span></div>
    <div class="card" id="flow"></div></div>`;
  $('#quit', el).onclick = e => { e.preventDefault(); if (ss.rated) { finishSessionBonus(); } SESSION = null; location.hash = 'today'; };
  const id = ss.queue[0];
  cardFlow($('#flow', el), id, {
    mode: ss.mode, combo: () => ss.combo,
    onRated: (r, out) => {
      ss.queue.shift(); ss.rated++; ss.xp += out.xp;
      if (r >= 3) { ss.good++; ss.combo++; ss.bestCombo = Math.max(ss.bestCombo, ss.combo); } else ss.combo = 0;
      if (r === 1) { ss.queue.splice(Math.min(3, ss.queue.length), 0, id); } else ss.done++;
      if (ss.combo > 0 && ss.combo % 5 === 0) App.toast(`${ss.combo} in a row! +5 bonus XP`);
      Pages.session(el);
    },
  });
};

function sessionDone(el) {
  const ss = SESSION;
  finishSessionBonus(); ss.xp += 20;
  if (ss.mode === 'mock') { S.profile.mocks = (S.profile.mocks || 0) + 1; checkAchievements(); saveProfile(); }
  const mins = Math.max(1, Math.round((Date.now() - ss.started) / 60000));
  const acc = ss.rated ? Math.round(100 * ss.good / ss.rated) : 0;
  const extended = S.profile.streak > ss.streakBefore;
  SESSION = null;
  el.innerHTML = `<div class="page" style="max-width:640px"><div class="card done-hero">
    <div class="eyebrow">Session complete</div><div class="big-num">+${ss.xp} XP</div>
    <h2>${extended ? `Streak extended to ${S.profile.streak} day${S.profile.streak === 1 ? '' : 's'}!` : `${S.profile.streak}-day streak`}</h2>
    <div class="ticker" style="width:100%"><div class="tick"><b>${acc}%</b><span>Accuracy</span></div><div class="tick"><b>${ss.done}</b><span>Cards</span></div><div class="tick"><b>${mins}m</b><span>Time</span></div></div>
    <div class="row" style="justify-content:center"><button class="btn primary" id="more">Keep going</button><a class="btn" href="#today">Done</a></div></div></div>`;
  $('#more', el).onclick = () => { const ids = buildDailyQueue(); if (ids.length) startSession({ mode: 'daily', ids, title: "Today's reps" }); else location.hash = 'path'; };
  confetti();
}

function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = document.createElement('canvas'); cv.className = 'confetti'; document.body.append(cv);
  const ctx = cv.getContext('2d'), W = cv.width = innerWidth, H = cv.height = innerHeight;
  const cols = ['#22b573', '#f2a93b', '#4c8dff', '#ef5b5b', '#e9c46a'];
  const ps = Array.from({ length: 140 }, () => ({ x: W / 2 + (Math.random() - .5) * 200, y: H / 3, vx: (Math.random() - .5) * 12, vy: -Math.random() * 12 - 4, r: Math.random() * 6 + 4, c: cols[Math.floor(Math.random() * cols.length)], a: Math.random() * 6 }));
  let t = 0;
  (function f() {
    ctx.clearRect(0, 0, W, H);
    for (const p of ps) { p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.a += 0.2; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore(); }
    if (++t < 140) requestAnimationFrame(f); else cv.remove();
  })();
}
