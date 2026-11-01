// App state, data operations, and gamification rules.
const DAY_MS = 86400000;
const S = { sharedTags: {}, myTags: {}, ready: false, profile: null, decks: [], cards: [], byId: new Map(), st: {}, star: {}, notes: {}, logs: {}, viewer: '' };
const $ = (sel, el = document) => el.querySelector(sel);
const h = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rid = (n = 6) => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');
const dayKey = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const monthKey = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`; };
const levelOf = xp => Math.floor(Math.sqrt(xp / 50)) + 1;
const xpForLevel = l => 50 * (l - 1) * (l - 1);

const BANKS = ['Goldman Sachs', 'Morgan Stanley', 'J.P. Morgan', 'Bank of America', 'Citi', 'Barclays', 'Deutsche Bank', 'UBS', 'Wells Fargo', 'RBC', 'Jefferies', 'Evercore', 'Lazard', 'Centerview', 'PJT Partners', 'Moelis', 'Perella Weinberg', 'Guggenheim', 'Houlihan Lokey', 'Qatalyst', 'Greenhill', 'William Blair', 'Piper Sandler', 'Harris Williams', 'Lincoln International'];
function qhash(text) {
  const t = String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 160);
  let h1 = 5381, h2 = 52711;
  for (let i = 0; i < t.length; i++) { const c = t.charCodeAt(i); h1 = (h1 * 33) ^ c; h2 = (h2 * 31) ^ c; }
  return 'q' + (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36);
}
function banksOf(card) {
  const set = new Set([...(card.banks || []), ...(S.sharedTags[qhash(card.q)] || []), ...(S.myTags[card.id] || [])]);
  return [...set].sort((a, b) => BANKS.indexOf(a) - BANKS.indexOf(b));
}
function saveMyTags() { Store.put('tags', { m: S.myTags }); }

const DEFAULT_PROFILE = () => ({ name: '', xp: 0, streak: 0, best: 0, lastDay: null, freezes: 1, goal: 50, newPerDay: 15, retention: 0.9, created: Date.now(), ach: {}, intro: { day: null, count: 0 }, mocks: 0, daily: {}, decks: [] });

async function loadData() {
  const docs = await Store.loadAll();
  let profile = docs.profile;
  const fresh = !profile;
  if (fresh) profile = DEFAULT_PROFILE();
  S.profile = Object.assign(DEFAULT_PROFILE(), profile);
  S.decks = []; S.cards = []; S.byId = new Map(); S.st = {}; S.star = {}; S.notes = {}; S.logs = {};
  for (const meta of S.profile.decks) {
    const cards = [];
    for (let i = 0; i < (meta.chunks || 1); i++) {
      const d = docs[`dk-${meta.id}-${i}`];
      if (d && Array.isArray(d.cards)) cards.push(...d.cards);
    }
    addDeckToMemory(meta, cards);
    const st = Object.assign({}, ...Object.keys(docs).filter(k => k === 'st-' + meta.id || k.startsWith(`st-${meta.id}~`)).map(k => docs[k]?.m || {}));
    for (const [cid, v] of Object.entries(st)) {
      S.st[cid] = { state: v[0], due: v[1], s: v[2], d: v[3], reps: v[4], lapses: v[5], last: v[6] };
      if (v[7]) S.star[cid] = true;
    }
    Object.assign(S.notes, docs['nt-' + meta.id]?.m || {});
  }
  for (const [k, v] of Object.entries(docs)) if (k.startsWith('lg-') && v && Array.isArray(v.e)) S.logs[k.slice(3)] = v.e;
  S.myTags = docs.tags?.m || {};
  S.sharedTags = await Store.loadSharedTags();
  if (fresh) {
    await createDeck('Starter Deck', 'Built in', SEED.map(c => ({ ...c })), 'starter');
    saveProfile();
  }
  S.ready = true;
}

function addDeckToMemory(meta, cards) {
  const deck = { ...meta, cards };
  S.decks.push(deck);
  for (const c of cards) { c.deck = meta.id; S.cards.push(c); S.byId.set(c.id, c); }
  return deck;
}

async function createDeck(name, source, rawCards, forcedId) {
  const id = forcedId || rid(6);
  const cards = rawCards.map((c, i) => ({ id: `${id}-${i.toString(36)}`, q: c.q, a: c.a, category: c.category || 'General', difficulty: c.difficulty || 'Medium', track: c.track || 'Behavioral', pos: i, ...(c.banks && c.banks.length ? { banks: c.banks } : {}) }));
  const chunks = Store.chunkCards(cards);
  const meta = { id, name, source, createdAt: Date.now(), chunks: chunks.length, count: cards.length };
  chunks.forEach((part, i) => Store.put(`dk-${id}-${i}`, { cards: part }));
  S.profile.decks.push(meta);
  addDeckToMemory(meta, cards);
  saveProfile();
  return meta;
}

function deleteDeck(id) {
  const meta = S.profile.decks.find(d => d.id === id);
  if (!meta) return;
  for (let i = 0; i < (meta.chunks || 1); i++) Store.put(`dk-${id}-${i}`, null);
  const blocks = Math.max(1, Math.ceil((meta.count || 0) / STATE_BLOCK));
  for (let i = 0; i < blocks; i++) Store.put(stateKey(id, i), null);
  Store.put('nt-' + id, null);
  S.profile.decks = S.profile.decks.filter(d => d.id !== id);
  S.decks = S.decks.filter(d => d.id !== id);
  S.cards = S.cards.filter(c => c.deck !== id);
  S.byId = new Map(S.cards.map(c => [c.id, c]));
  saveProfile();
}

function renameDeck(id, name) {
  const meta = S.profile.decks.find(d => d.id === id);
  const deck = S.decks.find(d => d.id === id);
  if (meta) meta.name = name; if (deck) deck.name = name;
  saveProfile();
}

function resetDeck(id) {
  for (const c of S.cards) if (c.deck === id) delete S.st[c.id];
  saveStates(id);
}

const saveProfile = () => Store.put('profile', S.profile);
// Card progress per deck, split into blocks of STATE_BLOCK cards for very large decks.
const STATE_BLOCK = 500;
const fullySaved = new Set();
const stateKey = (deckId, i) => i === 0 ? 'st-' + deckId : `st-${deckId}~${i}`;
function saveStates(deckId, onlyCardId) {
  if (onlyCardId && !fullySaved.has(deckId)) { fullySaved.add(deckId); onlyCardId = null; }
  const cards = S.cards.filter(c => c.deck === deckId).sort((a, b) => a.pos - b.pos);
  const blocks = Math.max(1, Math.ceil(cards.length / STATE_BLOCK));
  for (let i = 0; i < blocks; i++) {
    const part = cards.slice(i * STATE_BLOCK, (i + 1) * STATE_BLOCK);
    if (onlyCardId && !part.some(c => c.id === onlyCardId)) continue;
    const m = {};
    for (const c of part) {
      const s = S.st[c.id];
      if (!s && !S.star[c.id]) continue;
      const v = s ? [s.state, s.due, +s.s.toFixed(4), +s.d.toFixed(4), s.reps, s.lapses, s.last] : [0, 0, 0, 0, 0, 0, 0];
      if (S.star[c.id]) v.push(1);
      m[c.id] = v;
    }
    Store.put(stateKey(deckId, i), { m });
  }
}
let notesTimer = null;
function saveNotes(deckId) {
  clearTimeout(notesTimer);
  notesTimer = setTimeout(() => {
    const m = {};
    for (const c of S.cards) if (c.deck === deckId && S.notes[c.id]) m[c.id] = S.notes[c.id].slice(0, 4000);
    Store.put('nt-' + deckId, { m });
  }, 700);
}

const stateOf = id => S.st[id] || null;
const deckName = id => S.decks.find(d => d.id === id)?.name || '';

// Gamification
const ACH = [
  { id: 'first-rep', name: 'First Rep', desc: 'Review your first card', test: () => totalReviews() >= 1 },
  { id: 'streak-7', name: 'Week Warrior', desc: '7-day streak', test: () => S.profile.best >= 7 },
  { id: 'streak-30', name: 'Superday Ready', desc: '30-day streak', test: () => S.profile.best >= 30 },
  { id: 'reviews-100', name: 'Century', desc: '100 reviews', test: () => totalReviews() >= 100 },
  { id: 'reviews-500', name: 'Bulge Bracket', desc: '500 reviews', test: () => totalReviews() >= 500 },
  { id: 'import-1', name: 'Deal Flow', desc: 'Import your first deck', test: () => S.profile.decks.some(d => d.id !== 'starter') },
  { id: 'mastered-25', name: 'Technicals Locked', desc: 'Master 25 cards', test: () => countStatus().mastered >= 25 },
  { id: 'mock-1', name: 'In the Room', desc: 'Finish a mock interview', test: () => (S.profile.mocks || 0) >= 1 },
  { id: 'level-5', name: 'Associate', desc: 'Reach level 5', test: () => levelOf(S.profile.xp) >= 5 },
];
const totalReviews = () => Object.values(S.logs).reduce((n, e) => n + e.length, 0);
function countStatus() {
  const out = { new: 0, learning: 0, mastered: 0 };
  for (const c of S.cards) out[SRS.status(S.st[c.id])]++;
  return out;
}
function checkAchievements() {
  for (const a of ACH) if (!S.profile.ach[a.id] && a.test()) { S.profile.ach[a.id] = Date.now(); App.toast(`Achievement unlocked: ${a.name}`); }
}

function touchStreak() {
  const p = S.profile, today = dayKey();
  if (p.lastDay === today) return false;
  const yesterday = dayKey(Date.now() - DAY_MS);
  if (p.lastDay === yesterday) p.streak += 1;
  else if (p.lastDay && p.freezes > 0) {
    const gap = Math.round((new Date(today) - new Date(p.lastDay)) / DAY_MS);
    if (gap === 2) { p.freezes -= 1; p.streak += 1; App.toast('Streak freeze used. Your streak is safe.'); } else p.streak = 1;
  } else p.streak = 1;
  if (p.streak > 0 && p.streak % 7 === 0) p.freezes = Math.min(2, (p.freezes || 0) + 1);
  p.best = Math.max(p.best || 0, p.streak);
  p.lastDay = today;
  return true;
}

function addXp(n) {
  const before = levelOf(S.profile.xp);
  S.profile.xp += n;
  const d = (S.profile.daily[dayKey()] ||= { xp: 0, n: 0, ms: 0 });
  d.xp += n;
  const after = levelOf(S.profile.xp);
  if (after > before) App.toast(`Level up! You reached level ${after}.`);
}

// Record a rating: schedules the card, logs it, awards XP. Returns {xp, next}.
function rateCard(cardId, rating, { ms = 0, coverage = -1, mode = 'practice', combo = 0 } = {}) {
  const card = S.byId.get(cardId);
  if (!card) return { xp: 0 };
  const prev = S.st[cardId];
  const wasNew = !prev || prev.state === SRS.STATE.NEW;
  const next = SRS.schedule(prev, rating, Date.now(), S.profile.retention);
  S.st[cardId] = next;
  const first = touchStreak();
  let xp = SRS.XP[rating];
  if (combo > 0 && combo % 5 === 0) xp += 5;
  addXp(xp);
  const d = S.profile.daily[dayKey()];
  d.n += 1; d.ms += Math.min(ms, 10 * 60000);
  if (wasNew) {
    if (S.profile.intro.day !== dayKey()) S.profile.intro = { day: dayKey(), count: 0 };
    S.profile.intro.count += 1;
  }
  const mk = currentLogKey();
  (S.logs[mk] ||= []).push([Date.now(), cardId, rating, Math.round(ms), coverage, xp, mode, wasNew ? 0 : (prev.state === SRS.STATE.REVIEW ? 2 : 1)]);
  Store.put('lg-' + mk, { e: S.logs[mk] });
  saveStates(card.deck, cardId);
  checkAchievements();
  saveProfile();
  if (first && S.profile.streak > 1) App.toast(`${S.profile.streak}-day streak`);
  if (typeof updateNavStats === 'function') updateNavStats();
  return { xp, next };
}

// Review history is stored per month, split into blocks of LOG_BLOCK reviews so no saved record grows too large.
const LOG_BLOCK = 500;
function currentLogKey() {
  const m = monthKey();
  let n = 1;
  while (S.logs[n === 1 ? m : `${m}-${n}`] && S.logs[n === 1 ? m : `${m}-${n}`].length >= LOG_BLOCK) n++;
  return n === 1 ? m : `${m}-${n}`;
}

function finishSessionBonus() { addXp(20); checkAchievements(); saveProfile(); if (typeof updateNavStats === 'function') updateNavStats(); }

// Queues
const isDue = (s, now) => s && s.state !== SRS.STATE.NEW && s.due <= now;
function newAllowanceToday() {
  const p = S.profile;
  const used = p.intro.day === dayKey() ? p.intro.count : 0;
  return Math.max(0, p.newPerDay - used);
}
function dueCounts() {
  const now = Date.now();
  let due = 0, learning = 0, fresh = 0;
  for (const c of S.cards) {
    const s = S.st[c.id];
    if (!s || s.state === SRS.STATE.NEW) fresh++;
    else { if (s.state !== SRS.STATE.REVIEW) learning++; if (s.due <= now) due++; }
  }
  return { due, learning, fresh, newToday: Math.min(fresh, newAllowanceToday()) };
}
function orderedCards() {
  const deckOrder = new Map(S.decks.map((d, i) => [d.id, i]));
  return [...S.cards].sort((a, b) => (deckOrder.get(a.deck) - deckOrder.get(b.deck)) || (a.pos - b.pos));
}
function buildDailyQueue(max = 30) {
  const now = Date.now();
  const learn = [], review = [], fresh = [];
  for (const c of orderedCards()) {
    const s = S.st[c.id];
    if (!s || s.state === SRS.STATE.NEW) fresh.push(c);
    else if (s.due <= now) (s.state === SRS.STATE.REVIEW ? review : learn).push(c);
  }
  learn.sort((a, b) => S.st[a.id].due - S.st[b.id].due);
  review.sort((a, b) => S.st[a.id].due - S.st[b.id].due);
  const q = [...learn, ...review].slice(0, max);
  const room = Math.min(max - q.length, newAllowanceToday());
  q.push(...fresh.slice(0, Math.max(0, room)));
  return q.map(c => c.id);
}
function buildCategoryQueue(category, max = 20) {
  const now = Date.now();
  const cs = orderedCards().filter(c => c.category === category);
  const due = cs.filter(c => isDue(S.st[c.id], now));
  const fresh = cs.filter(c => !S.st[c.id] || S.st[c.id].state === SRS.STATE.NEW);
  const rest = cs.filter(c => !due.includes(c) && !fresh.includes(c)).sort((a, b) => SRS.mastery(S.st[a.id]) - SRS.mastery(S.st[b.id]));
  return [...due, ...fresh, ...rest].slice(0, max).map(c => c.id);
}

// Units for the path: category -> lessons of 8 cards.
function units() {
  const byCat = new Map();
  for (const c of orderedCards()) {
    if (!byCat.has(c.category)) byCat.set(c.category, { name: c.category, track: c.track, cards: [] });
    byCat.get(c.category).cards.push(c);
  }
  const list = [...byCat.values()];
  list.sort((a, b) => (a.track === b.track ? 0 : a.track === 'Behavioral' ? -1 : 1));
  return list.map(u => {
    const lessons = [];
    for (let i = 0; i < u.cards.length; i += 8) lessons.push(u.cards.slice(i, i + 8));
    const m = u.cards.reduce((n, c) => n + SRS.mastery(S.st[c.id]), 0) / u.cards.length;
    return { ...u, lessons, mastery: Math.round(m) };
  });
}

function allLogs() { return Object.values(S.logs).flat(); }
