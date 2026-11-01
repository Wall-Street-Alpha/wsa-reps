// Views and interaction.
const I = {
  today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>',
  path: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h6a4 4 0 0 0 0-8h-4a4 4 0 0 1 0-8h6"/></svg>',
  problems: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18h2"/></svg>',
  mock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20c0-4 3.5-6 8-6s8 2 8 6"/><circle cx="12" cy="8" r="4"/></svg>',
  import: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v3h16v-3"/></svg>',
  progress: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  prefs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
  flame: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 1.5-5 3-6 0 2 1 3 2 3 0-4-1-6 1-9z"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
  starO: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
  friends: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M17 14.5c2.6 0 4.5 1.5 4.5 4"/></svg>',
  trophy: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 3h10v2h3v3a5 5 0 0 1-4.6 5A5 5 0 0 1 13 15.9V18h3v3H8v-3h3v-2.1A5 5 0 0 1 8.6 13 5 5 0 0 1 4 8V5h3zm-1 4v1a3 3 0 0 0 1.2 2.4A7 7 0 0 1 7 9V7zm12 0v2c0 .5 0 .9-.2 1.4A3 3 0 0 0 18 8V7z"/></svg>',
  gem: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 3h10l4 6-9 12L3 9z"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
  speak: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
  crown: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  sNew: '<svg class="status" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--ink-3)"><circle cx="10" cy="10" r="7"/></svg>',
  sLearn: '<svg class="status" viewBox="0 0 20 20" style="color:var(--shaky)"><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 3a7 7 0 0 1 0 14z" fill="currentColor"/></svg>',
  sDone: '<svg class="status" viewBox="0 0 20 20" style="color:var(--gotit)"><circle cx="10" cy="10" r="8" fill="currentColor"/><path d="M6 10l3 3 5-6" fill="none" stroke="var(--panel)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};
const NAV = [['today', 'Home'], ['path', 'Learn'], ['problems', 'Problems'], ['mock', 'Mock'], ['friends', 'Friends'], ['progress', 'Progress'], ['import', 'Import']];
const UNIT_COLORS = [['#2a62b0', '#1d4a87'], ['#1cb0f6', '#1593cf'], ['#2bb673', '#1f9459'], ['#7b61ff', '#5d47d6'], ['#ff9600', '#d97f00'], ['#ff6b8b', '#d9506f'], ['#00b8a9', '#00958a'], ['#3a74c4', '#2a5795']];

const App = {
  toast(msg) {
    const w = $('#toasts'); if (!w) return;
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; w.append(t);
    setTimeout(() => t.remove(), 3800);
  },
};

const statusIcon = s => ({ new: I.sNew, learning: I.sLearn, mastered: I.sDone }[SRS.status(s)]);
const diffPill = d => `<span class="pill ${h(String(d).toLowerCase())}">${h(d)}</span>`;
const diffText = d => `<span class="diff ${h(String(d).toLowerCase())}">${h(d)}</span>`;
const relDue = s => {
  if (!s || s.state === SRS.STATE.NEW) return '<span class="faint">New</span>';
  const ms = s.due - Date.now();
  if (ms <= 0) return '<span style="color:var(--brand);font-weight:700">Due now</span>';
  return `in ${SRS.formatInterval(ms)}`;
};
const paras = t => String(t || '').split(/\n{2,}/).map(p => `<p>${h(p)}</p>`).join('');

function speak(text) {
  try { const u = new SpeechSynthesisUtterance(text); u.rate = 1; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch {}
}

async function getCap(name) {
  try { return window.claude && typeof window.claude.use === 'function' ? await window.claude.use(name) : null; } catch { return null; }
}

// ---------- Practice card (shared by workspace, sessions, mock review) ----------
let keyHandler = null;
function setKeys(fn) { keyHandler = fn; }
document.addEventListener('keydown', e => { if (keyHandler) keyHandler(e); });

const RATE_LABELS = ['', 'Again', 'Hard', 'Good', 'Easy'];
const VIBES = {
  ok: ['Strong answer.', 'Well structured.', 'Nicely done.'],
  mid: ['Partially there. Compare with the model answer.', 'Close. A few key points are missing.'],
  bad: ['Not yet. This one will come back soon.', 'Review the model answer and try again later.'],
  peek: ['Study the model answer, then rate yourself.'],
};
function frameworkFor(card) {
  const c = (card.category + ' ' + card.q).toLowerCase();
  if (/why (investment )?banking|why our|why this|why .*firm/.test(c)) return { name: 'Structure', steps: ['Your story', 'What drew you in', 'Why now', 'Why this firm'] };
  if (/resume|walk me through (yourself|your background)|tell me about yourself/.test(c)) return { name: 'Structure', steps: ['Background', 'Turning point', 'Experience', 'Why banking now'] };
  if (/stock|pitch/.test(c)) return { name: 'Pitch', steps: ['Company', 'Financials', 'Thesis', 'Catalyst', 'Risks'] };
  if (/deal|transaction/.test(c)) return { name: 'Deal', steps: ['Parties & price', 'Multiples', 'Rationale', 'Financing', 'Your view'] };
  if (/dcf|discounted|wacc|terminal/.test(c)) return { name: 'Framework', steps: ['Projections', 'Terminal value', 'Discount at WACC', 'EV to equity value'] };
  if (/lbo|leveraged|sponsor|irr/.test(c)) return { name: 'Framework', steps: ['Purchase price', 'Sources & uses', 'Debt paydown', 'Exit', 'Returns'] };
  if (/merger|accret|dilut|synerg/.test(c)) return { name: 'Framework', steps: ['Purchase & funding', 'Combined income', 'Adjustments', 'Accretion / dilution'] };
  if (/enterprise|equity value/.test(c)) return { name: 'Framework', steps: ['Equity value', 'Add debt & preferred', 'Less cash', 'Result'] };
  if (/valuation|comps|precedent|multiple/.test(c)) return { name: 'Framework', steps: ['Comparable companies', 'Precedent transactions', 'DCF', 'Conclusion'] };
  if (/accounting|statement|depreciation|inventory|tax|goodwill|working capital/.test(c)) return { name: 'Three statements', steps: ['Income statement', 'Cash flow statement', 'Balance sheet', 'Check it balances'] };
  if (/restructur|distress|bankrupt|chapter/.test(c)) return { name: 'Framework', steps: ['Direct answer', 'Mechanics', 'Who is affected', 'Example'] };
  if (/brain|how many|estimate|angle/.test(c)) return { name: 'Approach', steps: ['Assumptions', 'Breakdown', 'Calculation', 'Sanity check'] };
  if (card.track === 'Technical') return { name: 'Structure', steps: ['Direct answer', 'Explanation', 'Example with numbers'] };
  return { name: 'STAR', steps: ['Situation', 'Task', 'Action', 'Result'] };
}
const pick = a => a[Math.floor(Math.random() * a.length)];
function verdictOf(score) {
  if (!score) return { cls: 'peek', label: 'Revealed', css: '' };
  if (score.coverage >= 50) return { cls: 'ok', label: 'Accepted', css: 'ac' };
  if (score.coverage >= 25) return { cls: 'mid', label: 'Partially Accepted', css: 'pa' };
  return { cls: 'bad', label: 'Wrong Answer', css: 'wa' };
}

function cardFlow(container, cardId, { onRated, mode = 'practice', combo = () => 0, layout = 'session', presetAnswer = null, presetMs = null } = {}) {
  const card = S.byId.get(cardId);
  const started = Date.now();
  let revealed = false, rated = false, score = null;
  const showQ = layout !== 'ws';
  const fw = frameworkFor(card);
  container.innerHTML = `
    <div class="grid" style="gap:14px">
      ${showQ ? `<div class="row spread"><div class="row" style="gap:6px">${diffPill(card.difficulty)}<span class="pill">${h(card.category)}</span></div><button class="icon-btn" id="cf-speak" title="Read the question aloud" aria-label="Read the question aloud">${I.speak}</button></div>
      <div class="q-text">${h(card.q)}</div>` : ''}
      <div class="pad">
        <div class="pad-head"><span class="pad-title">Your answer</span><span class="pad-meta"><span id="cf-words">0 words</span><span aria-hidden="true">·</span><span id="cf-spoken">0 sec spoken</span><span aria-hidden="true">·</span><span class="timer" id="cf-timer">0:00</span>${showQ ? '' : `<button class="icon-btn" id="cf-speak" title="Read the question aloud" aria-label="Read the question aloud">${I.speak}</button>`}</span></div>
        <div class="fw" aria-label="Answer framework"><span class="fw-label">${h(fw.name)}</span>${fw.steps.map(x => `<button type="button" class="fw-chip" data-fw="${h(x)}">${h(x)}</button>`).join('')}</div>
        <textarea id="cf-answer" spellcheck="true" aria-label="Your answer" placeholder="Answer the way you would say it to the interviewer. Aim for one to two minutes spoken."></textarea>
        <div class="pad-foot" id="cf-actions"><span class="hint">${layout === 'ws' ? 'Ctrl+Enter to submit' : 'Ctrl+Enter to submit · Space to reveal'}</span><button class="btn sm ghost" id="cf-reveal">Reveal answer</button><button class="btn sm" id="cf-run">Check key points</button><button class="btn sm go" id="cf-submit">Submit</button></div>
      </div>
      <div id="cf-run-out"></div>
      <div id="cf-result" hidden></div>
    </div>`;
  const ta = $('#cf-answer', container);
  const syncStats = () => {
    const w = ta.value.trim().split(/\s+/).filter(Boolean).length;
    const sec = Math.round(w / 150 * 60);
    $('#cf-words', container).textContent = `${w} word${w === 1 ? '' : 's'}`;
    const sp = $('#cf-spoken', container);
    sp.textContent = sec < 60 ? `${sec} sec spoken` : `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')} spoken`;
    sp.classList.toggle('long', sec > 150);
    ta.style.height = 'auto'; ta.style.height = Math.max(170, ta.scrollHeight + 2) + 'px';
  };
  ta.addEventListener('input', syncStats);
  container.querySelectorAll('[data-fw]').forEach(b => b.onclick = () => {
    if (ta.readOnly) return;
    const pre = ta.value && !ta.value.endsWith('\n') ? '\n' : '';
    ta.value += `${pre}${b.dataset.fw}: `;
    b.classList.add('used');
    ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); syncStats();
  });
  if (presetAnswer != null) ta.value = presetAnswer;
  syncStats();
  const timerEl = $('#cf-timer', container);
  const tick = setInterval(() => {
    if (!document.body.contains(timerEl)) return clearInterval(tick);
    if (revealed) return;
    const s = Math.floor((Date.now() - started) / 1000);
    timerEl.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    timerEl.classList.toggle('over', s > 120);
  }, 500);
  $('#cf-speak', container).onclick = () => speak(card.q);
  $('#cf-submit', container).onclick = () => reveal(true);
  $('#cf-reveal', container).onclick = () => reveal(false);
  $('#cf-run', container).onclick = () => {
    const out = $('#cf-run-out', container);
    const a = ta.value.trim();
    if (!a) { out.innerHTML = `<div class="console"><div class="console-head">Key points check</div><div class="console-body"><span class="faint">Write your answer first. A rough outline is fine.</span></div></div>`; return; }
    const sc = Scoring.scoreAnswer(a, card.a), hits = sc.hits.filter(x => x.hit).length;
    out.innerHTML = `<div class="console"><div class="console-head">Key points check <span class="faint" style="margin-left:auto;font-weight:500">not submitted</span></div><div class="console-body"><span class="verdict ${verdictOf(sc).css}">${hits} of ${sc.hits.length} key points covered</span><div class="cases">${sc.hits.map(x => `<span class="case ${x.hit ? 'hit' : 'hidden-case'}">${x.hit ? h(x.term) : 'hidden'}</span>`).join('')}</div><span class="faint" style="font-size:.82rem">Missing points stay hidden until you submit.</span></div></div>`;
  };
  if (presetAnswer != null) setTimeout(() => reveal(true), 0);

  function reveal(withAnswer) {
    if (revealed) return;
    revealed = true;
    clearInterval(tick);
    const answer = ta.value.trim();
    ta.readOnly = true;
    $('#cf-actions', container).hidden = true;
    $('#cf-run-out', container).innerHTML = '';
    score = withAnswer && answer ? Scoring.scoreAnswer(answer, card.a) : null;
    const v = verdictOf(score);
    const iv = SRS.previewIntervals(S.st[cardId], Date.now(), S.profile.retention);
    const sug = score ? score.suggested : null;
    const secs = Math.round(((presetMs ?? (Date.now() - started))) / 1000);
    const res = $('#cf-result', container);
    res.hidden = false;
    const rates = `<div class="rates">${['again', 'hard', 'good', 'easy'].map((k, i) => `<button class="rate ${k} ${sug === k ? 'suggested' : ''}" data-r="${i + 1}">${RATE_LABELS[i + 1]}<small>${iv[k]}</small><kbd>${i + 1}</kbd></button>`).join('')}</div>`;
    res.innerHTML = `
      <div class="grid" style="gap:14px">
        <div class="console"><div class="console-head">Result <span class="faint" style="margin-left:auto;font-weight:500">answered in ${secs}s</span></div><div class="console-body">
          <div class="row spread"><span class="verdict ${v.css}">${v.label}</span>${score ? `<span style="font-weight:600">${score.hits.filter(x => x.hit).length} of ${score.hits.length} key points</span>` : ''}</div>
          ${score ? `<div class="bar"><i style="width:${score.coverage}%;background:var(--${v.css === 'ac' ? 'go' : v.css === 'pa' ? 'shaky' : 'again'})"></i></div><div class="cases">${score.hits.map(x => `<span class="case ${x.hit ? 'hit' : ''}">${h(x.term)}</span>`).join('')}</div>` : ''}
          <div><div class="eyebrow" style="margin-bottom:8px">Model answer</div><div class="answer-text model">${paras(card.a)}</div></div>
          <div id="cf-coach"></div>
        </div></div>
        ${layout === 'ws' ? `<div class="grid" style="gap:8px"><div class="row spread"><span class="eyebrow">How well did you know it?</span>${sug ? '<span class="faint" style="font-size:.78rem">outlined = suggested</span>' : ''}</div>${rates}</div>`
          : `<div class="sheet ${v.cls === 'peek' ? '' : v.cls}">${boSays(v.cls === 'ok' ? 'cheer' : v.cls === 'mid' ? 'think' : 'gentle', h(pick(VIBES[v.cls])), 52)}${rates}</div>`}
      </div>`;
    res.querySelectorAll('.rate').forEach(b => b.onclick = () => rate(+b.dataset.r));
    coachBlock($('#cf-coach', res), card, answer);
    if (layout !== 'ws') setTimeout(() => res.querySelector('.sheet')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 60);
  }

  function rate(r) {
    if (rated) return;
    rated = true;
    const ms = presetMs ?? (Date.now() - started);
    const out = rateCard(cardId, r, { ms, coverage: score ? score.coverage : -1, mode, combo: r >= 3 ? combo() + 1 : 0 });
    setKeys(null);
    onRated && onRated(r, out);
  }

  setKeys(e => {
    const typing = document.activeElement === ta;
    if (!revealed) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); reveal(true); }
      else if (e.key === ' ' && !typing && layout !== 'ws') { e.preventDefault(); reveal(false); }
    } else if (!typing && ['1', '2', '3', '4'].includes(e.key)) { e.preventDefault(); rate(+e.key); }
  });
  if (presetAnswer == null && layout !== 'review') setTimeout(() => ta.focus({ preventScroll: true }), 50);
}

async function coachBlock(el, card, answer) {
  const sample = await getCap('sample');
  if (!sample || !el.isConnected) return;
  el.innerHTML = `<div class="coach"><div class="row spread"><div><b>AI interviewer</b><div class="faint" style="font-size:.82rem">Grades your answer like an interviewer and suggests a follow-up question.</div></div><button class="btn sm" id="coach-go">${answer ? 'Grade my answer' : 'Show a stronger answer'}</button></div><div id="coach-out"></div></div>`;
  $('#coach-go', el).onclick = async () => {
    const btn = $('#coach-go', el), out = $('#coach-out', el);
    btn.disabled = true; btn.textContent = 'Grading...';
    const prompt = `You are a senior investment banking interviewer at a bulge-bracket bank grading a candidate's spoken answer.\n\nQUESTION:\n${card.q}\n\nREFERENCE ANSWER (from the candidate's study guide):\n${card.a}\n\nCANDIDATE'S ANSWER:\n${answer || '(no answer given; the candidate wants to see a strong answer)'}\n\nReturn only JSON with these keys:\n{"score": integer 1-4 (1 = would fail this question, 2 = shaky, 3 = solid, 4 = excellent),\n "verdict": one sentence,\n "strengths": array of up to 3 short strings,\n "gaps": array of up to 3 short strings naming what was missing or wrong,\n "stronger_answer": a concise answer the candidate could say out loud in under 60 seconds,\n "follow_up": one follow-up question the interviewer would likely ask next}`;
    try {
      const r = await sample.json(prompt, { modelTier: 'default' });
      const sc = Math.max(1, Math.min(4, +r.score || 0));
      const names = RATE_LABELS;
      out.innerHTML = `<div class="grid" style="gap:10px;margin-top:6px">
        <div class="row"><span class="score-dial" style="color:var(--${['', 'again', 'shaky', 'gotit', 'ez'][sc]})">${sc}/4</span><span>${h(r.verdict || '')}</span></div>
        ${r.strengths?.length ? `<div><div class="eyebrow">What landed</div><ul>${r.strengths.map(s => `<li>${h(s)}</li>`).join('')}</ul></div>` : ''}
        ${r.gaps?.length ? `<div><div class="eyebrow">What was missing</div><ul>${r.gaps.map(s => `<li>${h(s)}</li>`).join('')}</ul></div>` : ''}
        ${r.stronger_answer ? `<div><div class="eyebrow">Say it like this</div><div class="answer-text">${paras(r.stronger_answer)}</div></div>` : ''}
        ${r.follow_up ? `<div><div class="eyebrow">Likely follow-up</div><p style="font-weight:600">${h(r.follow_up)}</p></div>` : ''}
        <div class="faint" style="font-size:.8rem">AI suggests: ${names[sc]}. You still choose the rating.</div></div>`;
      const btnR = el.closest('#cf-result')?.querySelector(`.rate[data-r="${sc}"]`);
      if (btnR) { el.closest('#cf-result').querySelectorAll('.rate').forEach(b => b.classList.remove('suggested')); btnR.classList.add('suggested'); }
      btn.remove();
    } catch (e) {
      btn.disabled = false; btn.textContent = 'Try again';
      if (e && e.code === 'not_granted') { el.innerHTML = ''; return; }
      out.innerHTML = `<p class="faint" style="font-size:.85rem">${e && e.code === 'rate_limited' ? 'Too many requests right now. Wait a moment and try again.' : 'The AI coach could not answer this time.'}</p>`;
    }
  };
}
