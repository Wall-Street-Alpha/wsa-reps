// Friends: invite links, friends who joined, and challenge-a-friend with a leaderboard (website accounts only).
const Friends = (() => {
  const params = new URLSearchParams(location.search);
  if (params.get('ref')) Store.lsSet('pendingRef', params.get('ref').slice(0, 10));
  if (params.get('challenge')) Store.lsSet('pendingChallenge', params.get('challenge').replace(/[^a-z0-9]/gi, '').slice(0, 20));
  if (params.get('ref') || params.get('challenge')) history.replaceState(null, '', location.pathname + location.hash);
  const base = () => location.origin + location.pathname;
  const inviteUrl = () => `${base()}?ref=${Store.inviteCode()}`;
  const challengeUrl = id => `${base()}?challenge=${id}&ref=${Store.inviteCode()}`;

  async function afterSignIn() {
    if (Store.mode !== 'account' || !Store.signedIn) return;
    const ref = Store.lsGet('pendingRef');
    if (ref && !S.profile.referredBy && ref !== Store.inviteCode()) {
      try { await Store.recordReferral(ref, S.profile.name || S.viewer); S.profile.referredBy = ref; saveProfile(); Telemetry.track('referral_joined'); } catch {}
    }
    Store.lsSet('pendingRef', null);
    const ch = Store.lsGet('pendingChallenge');
    if (ch) { Store.lsSet('pendingChallenge', null); location.hash = 'ch-' + ch; }
    try {
      const refs = await Store.myReferrals();
      const paid = S.profile.refRewarded || 0;
      if (refs.length > paid) { addXp(50 * (refs.length - paid)); S.profile.refRewarded = refs.length; saveProfile(); App.toast(`${refs.length - paid} friend${refs.length - paid === 1 ? '' : 's'} joined with your link. +${50 * (refs.length - paid)} XP`); }
    } catch {}
  }

  async function share(url, text) {
    if (navigator.share) { try { await navigator.share({ title: 'WSA Reps', text, url }); return true; } catch { } }
    try { await navigator.clipboard.writeText(url); App.toast('Link copied'); return true; } catch { App.toast('Copy the link from the box'); return false; }
  }

  return { afterSignIn, share, inviteUrl, challengeUrl, authNote() {
    const ch = Store.lsGet('pendingChallenge'), ref = Store.lsGet('pendingRef');
    return ch ? 'A friend challenged you. Sign in or create an account to take the challenge.' : ref ? 'A friend invited you to WSA Reps. Create an account to get started.' : '';
  } };
})();

const onlyOnWebsite = el => { el.innerHTML = `<div class="page" style="max-width:640px"><div class="card empty">${boSays('think', 'Friends and challenges live on the website version of WSA Reps.', 64)}<a class="btn go" href="https://wall-street-alpha.github.io/wsa-reps/" target="_blank" rel="noopener">Open the website</a></div></div>`; };

Pages.friends = async el => {
  if (Store.mode !== 'account') return onlyOnWebsite(el);
  const url = Friends.inviteUrl();
  const cats = [...new Set(S.cards.map(c => c.category))];
  el.innerHTML = `<div class="page"><div class="hello"><div class="eyebrow">Friends</div><h1>Prep together</h1><p class="muted">Invite friends and challenge them to beat your score.</p></div>
    <div class="grid cols-2">
      <div class="card grid" style="gap:14px;align-content:start">${boSays('cheer', 'Studying with friends keeps the streak alive. Each friend who joins earns you 50 XP.', 60)}
        <h2>Invite friends</h2>
        <div class="invite-link"><code id="inv-url">${h(url)}</code><button class="btn sm" id="inv-copy">Copy</button><button class="btn sm go" id="inv-share">Share</button></div>
        <div id="inv-list" class="grid" style="gap:6px"><span class="faint">Loading friends...</span></div></div>
      <div class="card grid" style="gap:14px;align-content:start"><h2>Challenge a friend</h2><p class="muted" style="font-size:.92rem">Pick a set, answer it first to set the score, then send the link. Everyone who takes it lands on the leaderboard.</p>
        <label class="field" for="ch-topic">Topic<select class="input" id="ch-topic"><option value="__mixed">Mixed</option><option value="__fit">Fit and behavioral</option><option value="__tech">Technical</option>${cats.map(c => `<option>${h(c)}</option>`).join('')}</select></label>
        <label class="field" for="ch-n">Questions<select class="input" id="ch-n"><option>5</option><option>3</option><option>8</option></select></label>
        <button class="btn go big" id="ch-create">${I.trophy} Create challenge</button></div>
    </div>
    <div class="card grid" style="gap:12px"><h2>Your challenges</h2><div id="ch-list"><span class="faint">Loading...</span></div></div></div>`;
  $('#inv-copy', el).onclick = async () => { try { await navigator.clipboard.writeText(url); App.toast('Invite link copied'); } catch { const r = document.createRange(); r.selectNodeContents($('#inv-url', el)); getSelection().removeAllRanges(); getSelection().addRange(r); } };
  $('#inv-share', el).onclick = () => { Telemetry.track('invite_share'); Friends.share(url, 'Join me on WSA Reps for investment banking interview prep.'); };
  $('#ch-create', el).onclick = async () => {
    const t = $('#ch-topic', el).value, n = +$('#ch-n', el).value;
    let pool = S.cards.filter(c => t === '__mixed' ? true : t === '__fit' ? c.track === 'Behavioral' : t === '__tech' ? c.track !== 'Behavioral' : c.category === t);
    pool = pool.sort(() => Math.random() - .5).slice(0, n);
    if (!pool.length) return App.toast('No questions in that topic yet.');
    const id = rid(10);
    const title = t === '__mixed' ? 'Mixed interview questions' : t === '__fit' ? 'Fit and behavioral' : t === '__tech' ? 'Technical questions' : t;
    const btn = $('#ch-create', el); btn.disabled = true; btn.textContent = 'Creating...';
    try {
      await Store.createChallenge({ id, creator_name: (S.profile.name || S.viewer || 'A friend').slice(0, 80), title, questions: pool.map(c => ({ q: c.q, a: c.a.slice(0, 4000), category: c.category, difficulty: c.difficulty })) });
      Telemetry.track('challenge_created', { questions: pool.length });
      CHAL = { id, i: 0, answers: [], ratings: [], times: [], started: Date.now(), creating: true };
      location.hash = 'ch-' + id;
    } catch (e) { btn.disabled = false; btn.textContent = 'Create challenge'; App.toast('Could not create the challenge. Run the latest setup SQL if this keeps happening.'); }
  };
  try {
    const refs = await Store.myReferrals();
    $('#inv-list', el).innerHTML = refs.length ? `<b>${refs.length} friend${refs.length === 1 ? '' : 's'} joined</b>${refs.slice(0, 8).map(r => `<div class="row spread" style="font-weight:700"><span>${h(r.invitee_name || 'A friend')}</span><span class="faint" style="font-size:.8rem">${new Date(r.created_at).toLocaleDateString()}</span></div>`).join('')}` : '<span class="faint">No friends yet. Share your link to get started.</span>';
  } catch { $('#inv-list', el).innerHTML = '<span class="faint">Friend tracking turns on after the latest setup SQL is run.</span>'; }
  try {
    const { mine, others } = await Store.myChallenges();
    const all = [...mine.map(c => ({ ...c, by: 'You' })), ...others.map(c => ({ ...c, by: c.creator_name }))];
    $('#ch-list', el).innerHTML = all.length ? `<div class="grid" style="gap:8px">${all.map(c => `<a class="row spread" href="#ch-${c.id}" style="text-decoration:none;color:inherit;background:var(--layer);border-radius:12px;padding:10px 14px"><span><b>${h(c.title)}</b><div class="faint" style="font-size:.8rem">${(c.questions || []).length} questions · by ${h(c.by)} · ${new Date(c.created_at).toLocaleDateString()}</div></span><span class="btn sm">Open</span></a>`).join('')}</div>` : '<span class="faint">No challenges yet. Create one above.</span>';
  } catch { $('#ch-list', el).innerHTML = '<span class="faint">Challenges turn on after the latest setup SQL is run.</span>'; }
};

let CHAL = null;
Pages.challenge = async (el, id) => {
  if (Store.mode !== 'account') return onlyOnWebsite(el);
  el.innerHTML = `<div class="page" style="max-width:760px"><div class="card empty"><b>Loading challenge...</b></div></div>`;
  let data;
  try { data = await Store.getChallenge(id); } catch { data = null; }
  if (!data || !data.challenge) { el.innerHTML = `<div class="page" style="max-width:640px"><div class="card empty">${boSays('think', 'That challenge link did not work. Ask your friend to send it again.', 64)}<a class="btn" href="#friends">Go to Friends</a></div></div>`; return; }
  const ch = data.challenge, qs = ch.questions || [];
  if (CHAL && CHAL.id === id && CHAL.i < qs.length) return challengeRun(el, ch);
  const me = Store.userId, mineRes = data.results.find(r => r.user_id === me);
  const url = Friends.challengeUrl(id);
  el.innerHTML = `<div class="page" style="max-width:760px">
    <div class="card grid" style="gap:14px;justify-items:center;text-align:center;padding:26px 20px">
      ${boSays(mineRes ? 'cheer' : 'happy', h(mineRes ? `You scored ${mineRes.score} of ${mineRes.total}. Send it to friends and see who beats you.` : `${ch.creator_name || 'A friend'} challenged you. Answer each question, then rate yourself honestly.`), 72)}
      <div class="eyebrow">Challenge</div><h1>${h(ch.title || 'Interview challenge')}</h1>
      <p class="muted">${qs.length} questions · set by ${h(ch.creator === me ? 'you' : ch.creator_name || 'a friend')}</p>
      <div class="row" style="justify-content:center"><button class="btn go big" id="ch-go">${mineRes ? 'Try again' : 'Take the challenge'}</button><button class="btn big" id="ch-share">Challenge a friend</button></div>
    </div>
    <div class="card grid" style="gap:10px"><h2>Leaderboard</h2>${data.results.length ? `<div class="lb">${data.results.map((r, i) => `<div class="lb-row ${r.user_id === me ? 'me' : ''}"><span class="lb-rank">${i + 1}</span><span>${h(r.name || 'Player')}${r.user_id === me ? ' <span class="faint">(you)</span>' : ''}</span><span class="num">${r.score}/${r.total}</span><span class="faint num">${Math.floor(r.seconds / 60)}:${String(r.seconds % 60).padStart(2, '0')}</span></div>`).join('')}</div>` : '<p class="muted">No scores yet. Be the first.</p>'}
      <p class="faint" style="font-size:.8rem">Ranked by score, then by time.</p></div>
    <div class="card grid" style="gap:8px"><h3>Share this challenge</h3><div class="invite-link"><code>${h(url)}</code><button class="btn sm" id="ch-copy">Copy</button></div></div></div>`;
  $('#ch-go', el).onclick = () => { CHAL = { id, i: 0, answers: [], ratings: [], times: [], started: Date.now() }; challengeRun(el, ch); };
  $('#ch-share', el).onclick = () => { Telemetry.track('challenge_share'); Friends.share(url, `Can you beat my score on "${ch.title}"? WSA Reps interview challenge.`); };
  $('#ch-copy', el).onclick = async () => { try { await navigator.clipboard.writeText(url); App.toast('Challenge link copied'); } catch {} };
};

function challengeRun(el, ch) {
  const c = CHAL, qs = ch.questions, q = qs[c.i];
  const t0 = Date.now();
  const card = { q: q.q, a: q.a, category: q.category || 'General', difficulty: q.difficulty || 'Medium', track: 'Technical' };
  const fw = frameworkFor(card);
  el.innerHTML = `<div class="page" style="max-width:760px"><div class="session-top"><a class="icon-btn" href="#friends" id="cr-quit" aria-label="Leave challenge">${I.x}</a><div class="progress"><i style="width:${Math.round(100 * c.i / qs.length)}%"></i></div><span class="timer" id="cr-timer">0:00</span></div>
    <div class="card grid" style="gap:14px"><div class="row spread"><span class="eyebrow">${h(ch.title)} · Question ${c.i + 1} of ${qs.length}</span>${diffPill(card.difficulty)}</div><div class="q-text">${h(card.q)}</div>
      <div class="pad"><div class="fw" style="padding-bottom:0"><span class="fw-label">${h(fw.name)}</span>${fw.steps.map(x => `<button type="button" class="fw-chip" data-fw="${h(x)}">${h(x)}</button>`).join('')}</div><textarea id="cr-ans" style="min-height:160px" placeholder="Answer the way you would say it to the interviewer." aria-label="Your answer"></textarea></div>
      <div id="cr-out"></div>
      <div class="row" id="cr-actions" style="justify-content:flex-end"><button class="btn go" id="cr-reveal">Submit</button></div></div></div>`;
  const ta = $('#cr-ans', el); ta.focus({ preventScroll: true });
  el.querySelectorAll('[data-fw]').forEach(b => b.onclick = () => { const pre = ta.value && !ta.value.endsWith('\n') ? '\n' : ''; ta.value += `${pre}${b.dataset.fw}: `; b.classList.add('used'); ta.focus(); });
  const timer = setInterval(() => { const tEl = $('#cr-timer', el); if (!tEl) return clearInterval(timer); const s = Math.floor((Date.now() - t0) / 1000); tEl.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }, 500);
  $('#cr-quit', el).onclick = () => { clearInterval(timer); CHAL = null; };
  $('#cr-reveal', el).onclick = () => {
    clearInterval(timer);
    c.answers[c.i] = ta.value; c.times[c.i] = Date.now() - t0; ta.readOnly = true;
    const sc = ta.value.trim() ? Scoring.scoreAnswer(ta.value, card.a) : null;
    $('#cr-actions', el).hidden = true;
    $('#cr-out', el).innerHTML = `<div class="console"><div class="console-head">Model answer${sc ? `<span style="margin-left:auto">${sc.hits.filter(x => x.hit).length} of ${sc.hits.length} key points</span>` : ''}</div><div class="console-body"><div class="answer-text model">${paras(card.a)}</div></div></div>
      <div class="grid" style="gap:8px;margin-top:12px"><span class="eyebrow">Rate yourself honestly. Good or Easy counts toward your score.</span><div class="rates">${['again', 'hard', 'good', 'easy'].map((k, i) => `<button class="rate ${k}" data-r="${i + 1}">${RATE_LABELS[i + 1]}<small>${i >= 2 ? '+1 point' : '0 points'}</small></button>`).join('')}</div></div>`;
    el.querySelectorAll('.rate').forEach(b => b.onclick = async () => {
      c.ratings[c.i] = +b.dataset.r; c.i++;
      if (c.i < qs.length) return challengeRun(el, ch);
      const score = c.ratings.filter(r => r >= 3).length, secs = Math.round(c.times.reduce((a, t) => a + t, 0) / 1000);
      try { await Store.postResult({ challenge_id: ch.id, name: (S.profile.name || S.viewer || 'Player').slice(0, 80), score, total: qs.length, seconds: secs }); } catch { App.toast('Could not save your score.'); }
      Telemetry.track('challenge_complete', { score, total: qs.length, own: ch.creator === Store.userId });
      addXp(10 * score + 20); checkAchievements(); saveProfile();
      CHAL = null; confetti(); Pages.challenge(el, ch.id);
    });
  };
}
