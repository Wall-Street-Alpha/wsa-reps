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
  speak: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
  crown: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  sNew: '<svg class="status" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--ink-3)"><circle cx="10" cy="10" r="7"/></svg>',
  sLearn: '<svg class="status" viewBox="0 0 20 20" style="color:var(--hard)"><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 3a7 7 0 0 1 0 14z" fill="currentColor"/></svg>',
  sDone: '<svg class="status" viewBox="0 0 20 20" style="color:var(--good)"><circle cx="10" cy="10" r="8" fill="currentColor"/><path d="M6 10l3 3 5-6" fill="none" stroke="var(--surface)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};
const NAV = [['today', 'Today'], ['path', 'Path'], ['problems', 'Problems'], ['mock', 'Mock'], ['import', 'Import'], ['progress', 'Progress'], ['prefs', 'Prefs']];
const UNIT_COLORS = ['#1f9d68', '#2f6fe0', '#b4472f', '#7b4bd1', '#c07a12', '#0f8a9c', '#c23a76', '#4f7a24', '#5b5fc7', '#a35a2a'];

const App = {
  toast(msg) {
    const w = $('#toasts'); if (!w) return;
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; w.append(t);
    setTimeout(() => t.remove(), 3800);
  },
};

const statusIcon = s => ({ new: I.sNew, learning: I.sLearn, mastered: I.sDone }[SRS.status(s)]);
const diffPill = d => `<span class="pill ${h(String(d).toLowerCase())}">${h(d)}</span>`;
const relDue = s => {
  if (!s || s.state === SRS.STATE.NEW) return '<span class="faint">New</span>';
  const ms = s.due - Date.now();
  if (ms <= 0) return '<span style="color:var(--accent);font-weight:700">Due now</span>';
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

function cardFlow(container, cardId, { onRated, mode = 'practice', combo = () => 0, compact = false, presetAnswer = null, presetMs = null } = {}) {
  const card = S.byId.get(cardId);
  const started = Date.now();
  let revealed = false, rated = false, score = null;
  container.innerHTML = `
    <div class="grid" style="gap:14px">
      <div class="row spread">
        <div class="row" style="gap:6px">${diffPill(card.difficulty)}<span class="pill">${h(card.category)}</span>${compact ? '' : `<span class="pill">${h(deckName(card.deck))}</span>`}</div>
        <div class="row" style="gap:8px"><span class="timer" id="cf-timer">0:00</span><button class="icon-btn" id="cf-speak" title="Read the question aloud" aria-label="Read the question aloud">${I.speak}</button></div>
      </div>
      <div class="q-text">${h(card.q)}</div>
      <label class="field" for="cf-answer"><span class="muted" style="font-weight:600">Your answer <span class="faint">(type it like you'd say it in the room)</span></span>
        <textarea class="input" id="cf-answer" placeholder="Talk it through. Ctrl+Enter to submit."></textarea></label>
      <div class="row" id="cf-actions"><button class="btn primary" id="cf-submit">Submit answer</button><button class="btn ghost" id="cf-reveal">Show answer <kbd class="faint mono" style="font-size:.7rem">Space</kbd></button></div>
      <div id="cf-result" hidden></div>
    </div>`;
  const ta = $('#cf-answer', container);
  if (presetAnswer != null) ta.value = presetAnswer;
  const timerEl = $('#cf-timer', container);
  const tick = setInterval(() => {
    if (!document.body.contains(timerEl)) return clearInterval(tick);
    if (revealed) return;
    const s = Math.floor((Date.now() - started) / 1000);
    timerEl.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    timerEl.classList.toggle('over', s > 120);
  }, 500);
  $('#cf-speak', container).onclick = () => speak(card.q);
  const submit = () => reveal(true);
  $('#cf-submit', container).onclick = submit;
  $('#cf-reveal', container).onclick = () => reveal(false);
  if (presetAnswer != null) setTimeout(() => reveal(true), 0);

  function reveal(withAnswer) {
    if (revealed) return;
    revealed = true;
    clearInterval(tick);
    const answer = ta.value.trim();
    ta.readOnly = true;
    $('#cf-actions', container).hidden = true;
    score = withAnswer && answer ? Scoring.scoreAnswer(answer, card.a) : null;
    const prev = S.st[cardId];
    const iv = SRS.previewIntervals(prev, Date.now(), S.profile.retention);
    const sug = score ? score.suggested : null;
    const res = $('#cf-result', container);
    res.hidden = false;
    res.innerHTML = `
      <div class="grid" style="gap:14px">
        ${score ? `<div class="grid" style="gap:8px"><div class="row spread"><span class="eyebrow">Concept coverage</span><span class="num" style="font-weight:800;color:${score.coverage >= 50 ? 'var(--good)' : score.coverage >= 25 ? 'var(--hard)' : 'var(--again)'}">${score.coverage}%</span></div>
          <div class="bar"><i style="width:${score.coverage}%"></i></div>
          <div class="chips">${score.hits.map(x => `<span class="chip ${x.hit ? 'hit' : ''}">${h(x.term)}</span>`).join('')}</div></div>` : ''}
        <div class="card" style="background:var(--bg-2)"><div class="eyebrow" style="margin-bottom:8px">Model answer</div><div class="answer-text">${paras(card.a)}</div></div>
        <div id="cf-coach"></div>
        <div><div class="row spread" style="margin-bottom:8px"><span class="eyebrow">How well did you know it?</span>${sug ? `<span class="faint" style="font-size:.8rem">Suggested from coverage</span>` : ''}</div>
          <div class="rates">${['again', 'hard', 'good', 'easy'].map((k, i) => `<button class="rate ${k} ${sug === k ? 'suggested' : ''}" data-r="${i + 1}">${k[0].toUpperCase() + k.slice(1)}<small>${iv[k]}</small><kbd>${i + 1}</kbd></button>`).join('')}</div></div>
      </div>`;
    res.querySelectorAll('.rate').forEach(b => b.onclick = () => rate(+b.dataset.r));
    coachBlock($('#cf-coach', res), card, answer);
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
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); submit(); }
      else if (e.key === ' ' && !typing) { e.preventDefault(); reveal(false); }
    } else if (!typing && ['1', '2', '3', '4'].includes(e.key)) { e.preventDefault(); rate(+e.key); }
  });
  if (!compact && presetAnswer == null) setTimeout(() => ta.focus({ preventScroll: true }), 50);
}

async function coachBlock(el, card, answer) {
  const sample = await getCap('sample');
  if (!sample || !el.isConnected) return;
  el.innerHTML = `<div class="coach"><div class="row spread"><div><b>AI interviewer feedback</b><div class="faint" style="font-size:.82rem">Grades your answer like a banker would and asks the follow-up.</div></div><button class="btn sm" id="coach-go">${answer ? 'Grade my answer' : 'Show a stronger answer'}</button></div><div id="coach-out"></div></div>`;
  $('#coach-go', el).onclick = async () => {
    const btn = $('#coach-go', el), out = $('#coach-out', el);
    btn.disabled = true; btn.textContent = 'Thinking...';
    const prompt = `You are a senior investment banking interviewer at a bulge-bracket bank grading a candidate's spoken answer.\n\nQUESTION:\n${card.q}\n\nREFERENCE ANSWER (from the candidate's study guide):\n${card.a}\n\nCANDIDATE'S ANSWER:\n${answer || '(no answer given; the candidate wants to see a strong answer)'}\n\nReturn only JSON with these keys:\n{"score": integer 1-4 (1 = would fail this question, 2 = shaky, 3 = solid, 4 = excellent),\n "verdict": one sentence,\n "strengths": array of up to 3 short strings,\n "gaps": array of up to 3 short strings naming what was missing or wrong,\n "stronger_answer": a concise answer the candidate could say out loud in under 60 seconds,\n "follow_up": one follow-up question the interviewer would likely ask next}`;
    try {
      const r = await sample.json(prompt, { modelTier: 'default' });
      const sc = Math.max(1, Math.min(4, +r.score || 0));
      const names = ['', 'Again', 'Hard', 'Good', 'Easy'];
      out.innerHTML = `<div class="grid" style="gap:10px;margin-top:6px">
        <div class="row"><span class="score-dial" style="color:var(--${['', 'again', 'hard', 'good', 'easy'][sc]})">${sc}/4</span><span>${h(r.verdict || '')}</span></div>
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
