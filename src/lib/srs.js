// FSRS-4.5 scheduler (default weights) with short learning steps for new and lapsed cards.
const W = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755];
const DECAY = -0.5;
const FACTOR = 19 / 81;
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;
export const RATINGS = { again: 1, hard: 2, good: 3, easy: 4 };
export const STATE = { NEW: 0, LEARNING: 1, REVIEW: 2, RELEARNING: 3 };

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const initS = g => W[g - 1];
const initD = g => clamp(W[4] - (g - 3) * W[5], 1, 10);
export const retrievability = (elapsedDays, s) => Math.pow(1 + FACTOR * elapsedDays / s, DECAY);
const nextInterval = (s, retention) => Math.max(1, Math.round((s / FACTOR) * (Math.pow(retention, 1 / DECAY) - 1)));
const nextD = (d, g) => clamp(W[7] * initD(3) + (1 - W[7]) * (d - W[6] * (g - 3)), 1, 10);
const recallS = (d, s, r, g) =>
  s * (Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * (g === 2 ? W[15] : 1) * (g === 4 ? W[16] : 1) + 1);
const forgetS = (d, s, r) => W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r));

export function newCardState() {
  return { state: STATE.NEW, due: 0, s: 0, d: 0, reps: 0, lapses: 0, last: 0 };
}

// Returns the next state for a rating (1-4). Pure; does not mutate.
export function schedule(card, g, now = Date.now(), retention = 0.9) {
  const c = { ...(card || newCardState()) };
  const elapsed = c.last ? Math.max(0, (now - c.last) / DAY) : 0;
  if (c.state === STATE.NEW) {
    c.s = initS(g);
    c.d = initD(g);
    if (g === 1) { c.state = STATE.LEARNING; c.due = now + MIN; }
    else if (g === 2) { c.state = STATE.LEARNING; c.due = now + 5 * MIN; }
    else if (g === 3) { c.state = STATE.LEARNING; c.due = now + 10 * MIN; }
    else { c.state = STATE.REVIEW; c.due = now + nextInterval(c.s, retention) * DAY; }
  } else if (c.state === STATE.LEARNING || c.state === STATE.RELEARNING) {
    c.d = nextD(c.d, g);
    if (g === 1) c.due = now + 5 * MIN;
    else if (g === 2) c.due = now + 10 * MIN;
    else {
      if (g === 4) c.s = Math.max(c.s, recallS(c.d, c.s, 1, 4));
      c.state = STATE.REVIEW;
      c.due = now + nextInterval(c.s, retention) * DAY;
    }
  } else {
    const r = retrievability(elapsed, c.s);
    c.d = nextD(c.d, g);
    if (g === 1) {
      c.s = forgetS(c.d, c.s, r);
      c.lapses += 1;
      c.state = STATE.RELEARNING;
      c.due = now + 10 * MIN;
    } else {
      c.s = recallS(c.d, c.s, r, g);
      c.due = now + nextInterval(c.s, retention) * DAY;
    }
  }
  c.reps += 1;
  c.last = now;
  return c;
}

export function previewIntervals(card, now = Date.now(), retention = 0.9) {
  const out = {};
  for (const [k, g] of Object.entries(RATINGS)) out[k] = formatInterval(schedule(card, g, now, retention).due - now);
  return out;
}

export function formatInterval(ms) {
  const m = ms / MIN;
  if (m < 60) return `${Math.max(1, Math.round(m))}m`;
  const h = m / 60;
  if (h < 24) return `${Math.round(h)}h`;
  const d = h / 24;
  if (d < 30) return `${Math.round(d)}d`;
  if (d < 365) return `${(d / 30).toFixed(1).replace(/\.0$/, '')}mo`;
  return `${(d / 365).toFixed(1).replace(/\.0$/, '')}y`;
}

// Mastery 0-100 for progress bars: share of max useful stability (90 days), discounted by current recall odds.
export function mastery(card, now = Date.now()) {
  if (!card || card.state === STATE.NEW) return 0;
  const r = card.last ? retrievability((now - card.last) / DAY, Math.max(card.s, 0.1)) : 0;
  return Math.round(100 * Math.min(1, Math.log1p(card.s) / Math.log1p(90)) * r);
}

export function status(card) {
  if (!card || card.state === STATE.NEW) return 'new';
  if (card.state === STATE.REVIEW && card.s >= 21) return 'mastered';
  return 'learning';
}

export const XP = { 1: 2, 2: 6, 3: 10, 4: 12 };
