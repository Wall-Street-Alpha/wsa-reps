// Pages. Each render(el) fills the main view.
const Pages = {};

function dailyQuestion() {
  const list = orderedCards();
  if (!list.length) return null;
  const seed = [...dayKey()].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const pool = list.filter(c => SRS.status(S.st[c.id]) !== 'mastered');
  const from = pool.length ? pool : list;
  return from[seed % from.length];
}
function acceptance(id) {
  const e = allLogs().filter(x => x[1] === id);
  return e.length ? Math.round(100 * e.filter(x => x[2] >= 3).length / e.length) : null;
}
function solvedBy(diff) {
  const cs = S.cards.filter(c => !diff || c.difficulty === diff);
  return { n: cs.filter(c => S.st[c.id] && S.st[c.id].state === SRS.STATE.REVIEW).length, of: cs.length };
}
function firstName() { const n = S.profile.name || S.viewer || ''; return n ? n.split(/[ @]/)[0] : ''; }

Pages.today = el => {
  const p = S.profile, c = dueCounts(), lv = levelOf(p.xp);
  const lvFrom = xpForLevel(lv), lvTo = xpForLevel(lv + 1);
  const todayXp = p.daily[dayKey()]?.xp || 0;
  const goalPct = Math.min(1, todayXp / p.goal);
  const nm = firstName();
  const weak = units().filter(u => u.cards.some(x => S.st[x.id])).sort((a, b) => a.mastery - b.mastery).slice(0, 3);
  const queueLen = buildDailyQueue().length;
  const dq = dailyQuestion();
  const all = solvedBy(), byD = ['Easy', 'Medium', 'Hard'].map(d => [d, solvedBy(d)]);
  const R = 46, C = 2 * Math.PI * R;
  const hr = new Date().getHours();
  const greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const hello = goalPct >= 1 ? 'Daily goal complete.' : p.streak >= 3 ? `${p.streak}-day streak. Keep it going.` : queueLen ? 'Ready for today\'s reps.' : 'You\'re all caught up.';
  el.innerHTML = `<div class="page">
    <div class="hello"><div class="eyebrow">${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</div><h1>${greet}${nm ? `, ${h(nm)}` : ''}. <span class="grad">${h(hello)}</span></h1></div>
    ${Store.mode === 'local' ? `<div class="banner">Progress is saved in this browser only on this copy of the app.</div>` : ''}
    <div class="home">
      <div class="grid" style="gap:18px">
        <div class="card lockin">
          ${boSays(goalPct >= 1 ? 'cheer' : queueLen ? 'happy' : 'think', h(goalPct >= 1 ? boLine('home_goal') : p.streak >= 2 && queueLen ? boLine('home_streak', { streak: p.streak }) : queueLen ? boLine('home_queue', { n: queueLen }) : boLine('home_clear')), 84)}
          <div><div class="eyebrow">Today's reps</div><h2 style="margin-top:8px">${queueLen ? `${queueLen} card${queueLen === 1 ? '' : 's'} ready` : 'All caught up'}</h2>
            <p class="muted" style="margin-top:6px">${queueLen ? `Reviews first, then fresh ones. About ${Math.max(1, Math.round(queueLen * 0.6))} minutes.` : 'Nothing is due. Continue the learning path or run a mock interview.'}</p></div>
          <div class="ticker"><div class="tick"><b>${c.due}</b><span>due now</span></div><div class="tick"><b>${c.newToday}</b><span>new today</span></div><div class="tick"><b>${c.learning}</b><span>learning</span></div></div>
          <div class="row">${queueLen ? `<a class="btn go big" href="#session">Start reps</a>` : `<a class="btn go big" href="#path">Keep learning</a>`}<a class="btn big" href="#mock">Mock interview</a></div>
        </div>
        ${dq ? `<div class="card daily"><div class="cal-ico">${new Date().toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}<b>${new Date().getDate()}</b></div><div style="min-width:0"><div class="eyebrow" style="color:var(--brand)">Question of the day</div><a class="dq" href="#p-${dq.id}">${h(dq.q)}</a><div class="row" style="gap:8px;margin-top:4px">${diffText(dq.difficulty)}<span class="faint" style="font-size:.8rem">${h(dq.category)}</span></div></div><a class="btn brand" href="#p-${dq.id}">Solve</a></div>` : ''}
        <div class="grid cols-2">
          <div class="card grid" style="gap:12px;align-content:start"><div class="row spread"><h3>Weak spots</h3><a href="#progress" class="faint" style="font-size:.82rem">see all</a></div>
            ${weak.length ? weak.map(u => `<div class="grid" style="gap:6px"><div class="row spread"><b style="font-size:.92rem">${h(u.name)}</b><button class="btn sm" data-drill="${h(u.name)}">Drill</button></div><div class="bar"><i style="width:${u.mastery}%;background:${u.mastery < 30 ? 'var(--again)' : u.mastery < 60 ? 'var(--shaky)' : 'var(--go)'}"></i></div><span class="faint mono" style="font-size:.74rem">${u.mastery}% mastery</span></div>`).join('') : '<p class="muted">Review a few cards and your weakest topics will show here.</p>'}
          </div>
          <div class="card grid" style="gap:12px;align-content:start"><div class="row spread"><h3>Activity</h3><span class="faint mono" style="font-size:.76rem">${totalReviews()} reviews</span></div>${heatmap(12)}</div>
        </div>
      </div>
      <div class="grid" style="gap:18px">
        <div class="card grid" style="gap:14px">
          <div class="row spread"><h3>Daily goal</h3><span class="mono faint" style="font-size:.8rem">${todayXp}/${p.goal} XP</span></div>
          <div class="solved">
            <svg width="112" height="112" viewBox="0 0 112 112" role="img" aria-label="Daily goal ${Math.round(goalPct * 100)}%"><circle cx="56" cy="56" r="${R}" fill="none" stroke="var(--layer-2)" stroke-width="12"/><circle cx="56" cy="56" r="${R}" fill="none" stroke="var(--gold)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - goalPct)}" transform="rotate(-90 56 56)"/><text x="56" y="54" text-anchor="middle" style="fill:var(--ink);font:800 20px var(--font-display)">${todayXp}</text><text x="56" y="72" text-anchor="middle" style="fill:var(--ink-3);font:700 10px var(--font-mono)">XP TODAY</text></svg>
            <div class="grid" style="gap:8px"><div class="row spread"><span class="stat-pill fire">${I.flame}${p.streak}</span><span class="stat-pill xp">${I.bolt}Lv ${lv}</span></div><div class="bar" title="Level progress"><i style="width:${Math.round(100 * (p.xp - lvFrom) / (lvTo - lvFrom))}%;background:var(--gold)"></i></div><span class="faint mono" style="font-size:.74rem">${lvTo - p.xp} XP to level ${lv + 1}</span><span class="faint" style="font-size:.78rem">${I.gem.replace('<svg', '<svg width="12" height="12" style="color:var(--cyan);vertical-align:-1px"')} ${p.freezes || 0} streak freeze${p.freezes === 1 ? '' : 's'}</span></div>
          </div>
        </div>
        <div class="card grid" style="gap:12px">
          <div class="row spread"><h3>Solved</h3><span class="mono" style="font-weight:800">${all.n}<span class="faint">/${all.of}</span></span></div>
          ${byD.map(([d, x]) => `<div class="srow"><span class="diff ${d.toLowerCase()}">${d}</span><div class="bar"><i style="width:${x.of ? Math.round(100 * x.n / x.of) : 0}%;background:var(--${d.toLowerCase()})"></i></div><span class="mono faint">${x.n}/${x.of}</span></div>`).join('')}
        </div>
        <div class="card grid" style="gap:10px" id="cal-box"></div>
      </div>
    </div>
  </div>`;
  el.querySelectorAll('[data-drill]').forEach(b => b.onclick = () => startSession({ mode: 'category', ids: buildCategoryQueue(b.dataset.drill), title: b.dataset.drill }));
  drawCal($('#cal-box', el));
};

let CAL_OFFSET = 0;
function drawCal(box) {
  const counts = {};
  for (const e of allLogs()) { const k = dayKey(e[0]); counts[k] = (counts[k] || 0) + 1; }
  const now = new Date(), view = new Date(now.getFullYear(), now.getMonth() + CAL_OFFSET, 1);
  const y = view.getFullYear(), m = view.getMonth();
  const first = view.getDay(), days = new Date(y, m + 1, 0).getDate(), todayKey = dayKey();
  let cells = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => `<span>${d}</span>`).join('');
  let active = 0;
  for (let i = 0; i < first; i++) cells += '<i></i>';
  for (let d = 1; d <= days; d++) {
    const t = new Date(y, m, d), k = dayKey(t.getTime()), n = counts[k] || 0;
    if (n) active++;
    cells += `<i class="${n ? 'on' : ''} ${k === todayKey ? 'today' : ''} ${t > now ? 'future' : ''}" title="${k}: ${n} review${n === 1 ? '' : 's'}">${d}</i>`;
  }
  const label = view.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  box.innerHTML = `<div class="row spread"><h3>Streak calendar</h3><div class="row" style="gap:4px"><button class="icon-btn" data-cal="-1" aria-label="Previous month">&lsaquo;</button><span style="font-weight:600;font-size:.88rem;min-width:118px;text-align:center">${h(label)}</span><button class="icon-btn" data-cal="1" aria-label="Next month" ${CAL_OFFSET >= 0 ? 'disabled' : ''}>&rsaquo;</button></div></div>
    <div class="cal">${cells}</div>
    <div class="row spread faint" style="font-size:.8rem"><span>${active} active day${active === 1 ? '' : 's'} this month</span><span>Best streak ${S.profile.best || 0} day${S.profile.best === 1 ? '' : 's'}</span></div>`;
  box.querySelectorAll('[data-cal]').forEach(b => b.onclick = () => { CAL_OFFSET = Math.min(0, CAL_OFFSET + +b.dataset.cal); drawCal(box); });
}

function heatmap(weeks) {
  const counts = {};
  for (const e of allLogs()) { const k = dayKey(e[0]); counts[k] = (counts[k] || 0) + 1; }
  const end = new Date(); end.setHours(0, 0, 0, 0);
  const start = new Date(end); start.setDate(end.getDate() - end.getDay() - (weeks - 1) * 7);
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
  const all = [...us.filter(u => u.track === 'Behavioral'), ...us.filter(u => u.track !== 'Behavioral')];
  let current = null, idx = 0;
  const lessonState = cards => {
    const seen = cards.filter(c => S.st[c.id]).length;
    const m = cards.reduce((n, c) => n + SRS.mastery(S.st[c.id]), 0) / cards.length;
    return seen === cards.length ? (m >= 70 ? 'crown' : 'done') : 'todo';
  };
  const unitHtml = (u, ui) => {
    const [c1, c2] = UNIT_COLORS[ui % UNIT_COLORS.length];
    const nodes = u.lessons.map((ls, li) => {
      let st = lessonState(ls);
      if (st === 'todo' && !current) { current = `${ui}-${li}`; st = 'current'; }
      const x = Math.round(Math.sin(idx++ * 0.9) * 70);
      const icon = st === 'crown' ? I.crown : st === 'done' ? I.check : st === 'current' ? I.star : `<span>${li + 1}</span>`;
      return `<button class="node ${st}" style="--x:${x}px;--c:${c1};--cs:${c2}" data-unit="${ui}" data-lesson="${li}" aria-label="${h(u.name)} lesson ${li + 1}">${icon}</button><div class="node-label" style="--x:${x}px">Lesson ${li + 1} · ${ls.length} questions</div>`;
    }).join('');
    return `<section class="unit"><div class="unit-head" style="background:${c1}"><div><div class="sub">Unit ${ui + 1} · ${h(u.track)}</div><h2>${h(u.name)}</h2></div><div class="row"><span class="sub">${u.mastery}%</span><button class="btn sm" style="background:rgba(255,255,255,.16);color:#fff;border-color:rgba(255,255,255,.35)" data-drill="${h(u.name)}">Practice</button></div></div><div class="trail">${nodes}</div></section>`;
  };
  el.innerHTML = `<div class="page" style="max-width:620px"><div class="hello"><div class="eyebrow">Learn</div><h1>Learning path</h1><p class="muted">Fit questions first, then technicals. Each unit is a topic and each lesson is 8 questions. Complete a lesson for a check mark; master it for a crown.</p></div>
    ${all.length ? all.map(unitHtml).join('') : `<div class="card empty"><h2>No questions yet</h2><a class="btn go" href="#import">Import a question bank</a></div>`}</div>`;
  el.querySelectorAll('.node').forEach(b => b.onclick = () => {
    const u = all[+b.dataset.unit], ls = u.lessons[+b.dataset.lesson];
    startSession({ mode: 'lesson', ids: ls.map(c => c.id), title: `${u.name} · lesson ${+b.dataset.lesson + 1}` });
  });
  el.querySelectorAll('[data-drill]').forEach(b => b.onclick = () => startSession({ mode: 'category', ids: buildCategoryQueue(b.dataset.drill), title: b.dataset.drill }));
};

const PF = { q: '', deck: '', cat: '', diff: '', status: '', starred: false, sort: 'num', dir: 1 };
Pages.problems = el => {
  const catCount = new Map();
  for (const c of S.cards) catCount.set(c.category, (catCount.get(c.category) || 0) + 1);
  const dq = dailyQuestion();
  el.innerHTML = `<div class="page"><div class="row spread"><div class="hello"><div class="eyebrow">Problem set</div><h1>Problems</h1></div><div class="row"><button class="btn" id="pick">${I.bolt} Random</button><a class="btn brand" href="#import">Import</a></div></div>
    <div class="topics" role="toolbar" aria-label="Topics"><button class="topic" data-cat="" aria-pressed="${!PF.cat}">All topics <b>${S.cards.length}</b></button>${[...catCount].map(([c, n]) => `<button class="topic" data-cat="${h(c)}" aria-pressed="${PF.cat === c}">${h(c)} <b>${n}</b></button>`).join('')}</div>
    <div class="filters">
      <input class="input search" id="f-q" type="search" placeholder="Search questions" value="${h(PF.q)}" aria-label="Search">
      <select class="input" id="f-deck" aria-label="Deck"><option value="">All decks</option>${S.decks.map(d => `<option value="${d.id}" ${PF.deck === d.id ? 'selected' : ''}>${h(d.name)}</option>`).join('')}</select>
      <select class="input" id="f-diff" aria-label="Difficulty"><option value="">Difficulty</option>${['Easy', 'Medium', 'Hard'].map(d => `<option ${PF.diff === d ? 'selected' : ''}>${d}</option>`).join('')}</select>
      <select class="input" id="f-status" aria-label="Status"><option value="">Status</option>${[['new', 'Todo'], ['learning', 'Attempted'], ['mastered', 'Solved']].map(([v, l]) => `<option value="${v}" ${PF.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <select class="input" id="f-sort" aria-label="Sort"><option value="num">Sort: #</option><option value="due" ${PF.sort === 'due' ? 'selected' : ''}>Sort: due soonest</option><option value="mastery" ${PF.sort === 'mastery' ? 'selected' : ''}>Sort: weakest first</option></select>
      <button class="btn ${PF.starred ? 'brand' : ''}" id="f-star" aria-pressed="${PF.starred}">${I.star} Starred</button>
    </div>
    <div class="faint mono" id="count" style="font-size:.78rem"></div>
    <div class="table-wrap"><table class="tbl"><thead><tr><th>Status</th><th>Title</th><th>Acceptance</th><th>Difficulty</th><th>Mastery</th><th>Next</th><th></th></tr></thead><tbody id="rows"></tbody></table></div></div>`;
  const rowsEl = $('#rows', el);
  const nums = new Map(orderedCards().map((c, i) => [c.id, i + 1]));
  const filtered = () => {
    const q = PF.q.toLowerCase();
    let list = orderedCards().map(c => ({ c, n: nums.get(c.id) })).filter(({ c }) =>
      (!PF.deck || c.deck === PF.deck) && (!PF.cat || c.category === PF.cat) && (!PF.diff || c.difficulty === PF.diff) &&
      (!PF.status || SRS.status(S.st[c.id]) === PF.status) && (!PF.starred || S.star[c.id]) &&
      (!q || c.q.toLowerCase().includes(q) || c.a.toLowerCase().includes(q)));
    const key = { num: x => x.n, mastery: x => SRS.mastery(S.st[x.c.id]), due: x => { const s = S.st[x.c.id]; return !s || s.state === 0 ? Infinity : s.due; } }[PF.sort];
    list.sort((a, b) => (key(a) - key(b)) * PF.dir || a.n - b.n);
    return list;
  };
  const row = (c, n, isDq) => {
    const s = S.st[c.id], m = SRS.mastery(s), acc = acceptance(c.id);
    return `<tr class="${isDq ? 'dq-row' : ''}"><td>${isDq ? `<span class="stat-pill" style="color:var(--brand);padding:2px 8px;font-size:.7rem">Daily</span>` : statusIcon(s)}</td><td><a class="q-link" href="#p-${c.id}">${n}. ${h(c.q)}</a></td><td class="mono faint" style="font-size:.84rem">${acc == null ? '–' : acc + '%'}</td><td>${diffText(c.difficulty)}</td><td style="min-width:90px"><div class="bar"><i style="width:${m}%"></i></div></td><td class="mono" style="white-space:nowrap;font-size:.8rem">${relDue(s)}</td><td><button class="star ${S.star[c.id] ? 'on' : ''}" data-star="${c.id}" aria-label="Star">${S.star[c.id] ? I.star : I.starO}</button></td></tr>`;
  };
  const draw = () => {
    const list = filtered();
    const plain = !PF.q && !PF.deck && !PF.cat && !PF.diff && !PF.status && !PF.starred;
    $('#count', el).textContent = `${list.length} of ${S.cards.length} questions`;
    rowsEl.innerHTML = list.length ? (plain && dq ? row(dq, nums.get(dq.id), true) : '') + list.slice(0, 600).map(({ c, n }) => row(c, n, false)).join('')
      : `<tr><td colspan="7"><div class="empty"><b>Nothing matches. Loosen the filters.</b><button class="btn sm" id="clear">Clear filters</button></div></td></tr>`;
    rowsEl.querySelectorAll('[data-star]').forEach(b => b.onclick = () => { toggleStar(b.dataset.star); draw(); });
    const clr = $('#clear', rowsEl); if (clr) clr.onclick = () => { Object.assign(PF, { q: '', deck: '', cat: '', diff: '', status: '', starred: false }); Pages.problems(el); };
  };
  const bind = (id, k) => { $(id, el).oninput = e => { PF[k] = e.target.value; draw(); }; };
  bind('#f-q', 'q'); bind('#f-deck', 'deck'); bind('#f-diff', 'diff'); bind('#f-status', 'status');
  $('#f-sort', el).oninput = e => { PF.sort = e.target.value; PF.dir = 1; draw(); };
  el.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { PF.cat = b.dataset.cat; Pages.problems(el); });
  $('#f-star', el).onclick = () => { PF.starred = !PF.starred; Pages.problems(el); };
  $('#pick', el).onclick = () => { const l = filtered(); if (l.length) location.hash = 'p-' + l[Math.floor(Math.random() * l.length)].c.id; };
  draw();
};

function toggleStar(id) {
  if (S.star[id]) delete S.star[id]; else S.star[id] = true;
  saveStates(S.byId.get(id).deck);
}

let WS_TAB = 'desc';
Pages.problem = (el, id) => {
  const card = S.byId.get(id);
  if (!card) { el.innerHTML = `<div class="page"><div class="card empty"><h2>Question not found</h2><a class="btn" href="#problems">Back to problems</a></div></div>`; return; }
  const list = orderedCards();
  const i = list.findIndex(c => c.id === id);
  const attempts = allLogs().filter(e => e[1] === id).slice(-12).reverse();
  const acc = acceptance(id);
  el.innerHTML = `<div class="page wide"><div class="row spread"><a href="#problems" class="btn sm ghost">&larr; Problem list</a><div class="row" style="gap:6px"><span class="faint mono" style="font-size:.8rem">${i + 1}/${list.length}</span><a class="btn sm" href="#p-${list[Math.max(0, i - 1)].id}" aria-label="Previous">&larr;</a><a class="btn sm" href="#p-${list[Math.min(list.length - 1, i + 1)].id}" aria-label="Next">&rarr;</a></div></div>
    <div class="ws">
      <div class="pane"><div class="pane-tabs" role="tablist"><button role="tab" data-t="desc" aria-selected="${WS_TAB === 'desc'}">${I.problems}Description</button><button role="tab" data-t="notes" aria-selected="${WS_TAB === 'notes'}">${I.prefs}Notes</button><button role="tab" data-t="subs" aria-selected="${WS_TAB === 'subs'}">${I.progress}Submissions <span class="faint mono">${attempts.length}</span></button></div>
        <div class="pane-body" data-p="desc" ${WS_TAB === 'desc' ? '' : 'hidden'}><div class="row spread" style="align-items:flex-start"><div class="q-title">${i + 1}. ${h(card.q)}</div><button class="star ${S.star[id] ? 'on' : ''}" id="ws-star" aria-label="Star">${S.star[id] ? I.star : I.starO}</button></div>
          <div class="row" style="gap:6px">${diffPill(card.difficulty)}<span class="pill">${h(card.category)}</span><span class="pill">${h(deckName(card.deck))}</span></div>
          <div class="grid cols-3" style="gap:8px"><div class="tick"><b style="font-size:1.1rem">${acc == null ? '–' : acc + '%'}</b><span>acceptance</span></div><div class="tick"><b style="font-size:1.1rem">${SRS.mastery(S.st[id])}%</b><span>mastery</span></div><div class="tick"><b style="font-size:1.1rem">${attempts.length}</b><span>attempts</span></div></div>
          <p class="faint" style="font-size:.86rem">Answer in the editor as you would in the interview. Run checks which key concepts you covered. Submit shows the model answer and schedules your next review.</p></div>
        <div class="pane-body" data-p="notes" ${WS_TAB === 'notes' ? '' : 'hidden'}><label class="field" for="ws-notes">My notes <span class="faint" style="font-weight:500">saved to your account</span></label><textarea class="input" id="ws-notes" style="min-height:220px" placeholder="Your own framing, a story to use, a number to remember.">${h(S.notes[id] || '')}</textarea></div>
        <div class="pane-body" data-p="subs" ${WS_TAB === 'subs' ? '' : 'hidden'}>${attempts.length ? `<table class="tbl"><thead><tr><th>Result</th><th>Concepts</th><th>Time</th><th>When</th></tr></thead><tbody>${attempts.map(e => `<tr><td style="font-weight:800;color:var(--${['', 'again', 'shaky', 'gotit', 'ez'][e[2]]})">${e[2] >= 3 ? 'Accepted' : 'Wrong Answer'} <span class="faint" style="font-weight:600">(${RATE_LABELS[e[2]]})</span></td><td class="mono faint">${e[4] >= 0 ? e[4] + '%' : 'peeked'}</td><td class="mono faint">${Math.round(e[3] / 1000)}s</td><td class="mono faint">${new Date(e[0]).toLocaleDateString()}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">No submissions yet.</p>'}</div>
      </div>
      <div id="ws-flow"></div>
    </div></div>`;
  el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { WS_TAB = b.dataset.t; el.querySelectorAll('[data-t]').forEach(x => x.setAttribute('aria-selected', x === b)); el.querySelectorAll('[data-p]').forEach(p => p.hidden = p.dataset.p !== WS_TAB); });
  $('#ws-star', el).onclick = () => { toggleStar(id); Pages.problem(el, id); };
  $('#ws-notes', el).oninput = e => { S.notes[id] = e.target.value; saveNotes(card.deck); };
  cardFlow($('#ws-flow', el), id, {
    mode: 'practice', layout: 'ws',
    onRated: (r, out) => {
      App.toast(`+${out.xp} XP · next review in ${SRS.formatInterval(out.next.due - Date.now())}`);
      const due = buildDailyQueue(5).find(x => x !== id);
      $('#ws-flow', el).innerHTML = `<div class="console"><div class="console-body empty"><div class="verdict ${r >= 3 ? 'ac' : 'wa'}">${r >= 3 ? 'Saved.' : 'Saved. This one will come back soon.'}</div><p class="muted">Next review in ${SRS.formatInterval(out.next.due - Date.now())}.</p><div class="row" style="justify-content:center">${due ? `<a class="btn go" href="#p-${due}">Next due</a>` : ''}<a class="btn" href="#p-${list[Math.min(list.length - 1, i + 1)].id}">Next problem</a></div></div></div>`;
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
    if (!ids.length) { el.innerHTML = `<div class="page" style="max-width:720px"><div class="card empty"><h2>All caught up</h2><p class="muted">Nothing is due and today's new cards are done.</p><div class="row"><a class="btn go" href="#path">Keep learning</a><a class="btn" href="#mock">Mock interview</a></div></div></div>`; return; }
    SESSION = { mode: 'daily', title: "Today's reps", queue: ids, total: ids.length, done: 0, xp: 0, good: 0, rated: 0, combo: 0, bestCombo: 0, started: Date.now(), streakBefore: S.profile.streak };
  }
  const ss = SESSION;
  if (!ss.queue.length) return sessionDone(el);
  const pct = Math.round(100 * ss.done / ss.total);
  el.innerHTML = `<div class="page" style="max-width:760px">
    <div class="session-top"><a class="icon-btn" href="#today" id="quit" aria-label="End session">${I.x}</a><div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div><span class="combo">${ss.combo >= 2 ? ss.combo + 'x combo' : ''}</span></div>
    <div class="row spread"><span class="eyebrow">${h(ss.title)}</span><span class="faint mono" style="font-size:.78rem">${ss.done} done · ${ss.queue.length} left · +${ss.xp} XP</span></div>
    <div class="card" id="flow"></div></div>`;
  $('#quit', el).onclick = e => { e.preventDefault(); if (ss.rated) { finishSessionBonus(); } SESSION = null; location.hash = 'today'; };
  const id = ss.queue[0];
  cardFlow($('#flow', el), id, {
    mode: ss.mode, combo: () => ss.combo,
    onRated: (r, out) => {
      ss.queue.shift(); ss.rated++; ss.xp += out.xp;
      if (r >= 3) { ss.good++; ss.combo++; ss.bestCombo = Math.max(ss.bestCombo, ss.combo); } else ss.combo = 0;
      if (r === 1) { ss.queue.splice(Math.min(3, ss.queue.length), 0, id); } else ss.done++;
      if (ss.combo > 0 && ss.combo % 5 === 0) App.toast(`${ss.combo} in a row. +5 bonus XP`);
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
    ${boSays(acc >= 60 ? 'cheer' : 'gentle', h(boLine(acc >= 60 ? 'done_good' : 'done_ok')), 96)}
    <div class="eyebrow">Session complete</div><div class="big-num">+${ss.xp} XP</div>
    <h1>${acc >= 80 ? 'Excellent session.' : acc >= 50 ? 'Solid session.' : 'Session complete.'}</h1>
    <p class="muted">${extended ? `Streak extended to ${S.profile.streak} day${S.profile.streak === 1 ? '' : 's'}.` : `${S.profile.streak}-day streak.`}</p>
    <div class="ticker" style="width:100%"><div class="tick"><b>${acc}%</b><span>accuracy</span></div><div class="tick"><b>${ss.done}</b><span>cards</span></div><div class="tick"><b>${mins}m</b><span>time</span></div></div>
    <div class="row" style="justify-content:center"><button class="btn go big" id="more">Keep going</button><a class="btn big" href="#today">Done</a></div></div></div>`;
  $('#more', el).onclick = () => { const ids = buildDailyQueue(); if (ids.length) startSession({ mode: 'daily', ids, title: "Today's reps" }); else location.hash = 'path'; };
  confetti();
}

function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = document.createElement('canvas'); cv.className = 'confetti'; document.body.append(cv);
  const ctx = cv.getContext('2d'), W = cv.width = innerWidth, H = cv.height = innerHeight;
  const cols = ['#1f4e8c', '#2f6f73', '#a8801f', '#4a5d78', '#1e7a55'];
  const ps = Array.from({ length: 140 }, () => ({ x: W / 2 + (Math.random() - .5) * 200, y: H / 3, vx: (Math.random() - .5) * 12, vy: -Math.random() * 12 - 4, r: Math.random() * 6 + 4, c: cols[Math.floor(Math.random() * cols.length)], a: Math.random() * 6 }));
  let t = 0;
  (function f() {
    ctx.clearRect(0, 0, W, H);
    for (const p of ps) { p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.a += 0.2; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore(); }
    if (++t < 140) requestAnimationFrame(f); else cv.remove();
  })();
}
