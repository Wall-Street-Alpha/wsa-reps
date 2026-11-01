// Turns raw document text into question/answer cards. Pure JS so it runs in the browser and in Node tests.

const ASK_WORDS = /^(walk|tell|explain|describe|pitch|why|what|how|give|name|calculate|estimate|suppose|let'?s|assume|now|say|if|can|could|would|should|is|are|do|does|did|when|where|which|who|whom|imagine|compare|define|list|discuss|talk|rank|value|sell|convince|without|in|for|from|you|your|have|has|was|were|will|after|before|let|walk|i|we)\b/i;

const NOISE = [
  /^https?:\/\/\S+(\s+\[\])?(\s+\d+)?$/i,
  /^\[\]$/,
  /^\d{1,4}$/,
  /^page \d+( of \d+)?$/i,
  /^copyright\b/i,
  /all rights reserved/i,
  /\.{5,}/,
];

const HEADER = /((questions?\s*)?(&|and)\s*(suggested\s*)?answers?\b)|^(section|chapter|part)\s+\w+/i;

export function cleanText(s) {
  return s
    .replace(/ /g, ' ')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s*https?:\/\/(www\.)?(breakingintowallstreet|mergersandinquisitions)\.com\S*\s*(\[\])?\s*\d*\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Split text into paragraphs. Blank lines separate paragraphs; single newlines inside are joined.
export function toParagraphs(text) {
  return text
    .replace(/\r/g, '')
    // Pasted lists often use single line breaks: keep a question line, a Q:/A: line and a numbered item as their own paragraphs.
    .replace(/\?[ \t]*\n(?=[ \t]*\S)/g, '?\n\n')
    .replace(/\n(?=[ \t]*(?:Q(?:uestion)?|A(?:nswer)?)\s*\d*\s*:)/g, '\n\n')
    .replace(/\n(?=[ \t]*\d{1,3}[.)]\s+[A-Z"])/g, '\n\n')
    .split(/\n\s*\n/)
    .map(p => cleanText(p.replace(/-\n(?=[a-z])/g, '').replace(/\n/g, ' ')))
    .filter(p => p && !NOISE.some(rx => rx.test(p)));
}

function looksLikeQuestion(t) {
  if (!t || t.length < 8) return false;
  const head = t.slice(0, 400);
  if (head.includes('?')) return true;
  return ASK_WORDS.test(t) && t.length < 400;
}

function headerInfo(p) {
  if (p.length > 120 || /[.?!]$/.test(p)) return null;
  if (!HEADER.test(p)) return null;
  let name = p.replace(/(questions?\s*)?(&|and)\s*(suggested\s*)?answers?/i, '').replace(/["]/g, '').trim();
  let difficulty = 'Medium';
  if (/\bbasic\b/i.test(name)) difficulty = 'Easy';
  if (/\badvanced\b/i.test(name)) difficulty = 'Hard';
  name = name.replace(/[–—-]\s*(basic|advanced)\s*$/i, '').replace(/[–—-]\s*$/, '').trim();
  if (!name) name = 'General';
  return { name, difficulty };
}

// A short title line with no sentence punctuation, e.g. "Discussing Transaction Experience".
const SMALL = /^(&|\/|of|the|and|or|to|a|an|in|on|for|with|vs\.?|–|—|-)$/i;
function titleInfo(p) {
  if (p.length > 70 || /[.?!:;,"]$/.test(p) || /^\d/.test(p)) return null;
  const words = p.split(/\s+/);
  if (words.length < 2 || words.length > 8) return null;
  if (!words.every(w => SMALL.test(w) || /^["(]?[A-Z0-9]/.test(w))) return null;
  return { name: p.replace(/["]/g, '').trim(), difficulty: 'Medium' };
}

const TECH_HINTS = [
  ['Accounting', /\b(income statement|balance sheet|cash flow statement|depreciation|deferred tax|accrual|working capital|goodwill|inventory)\b/i],
  ['Enterprise / Equity Value', /\b(enterprise value|equity value|diluted shares|treasury stock method)\b/i],
  ['DCF', /\b(dcf|discounted cash flow|wacc|terminal value|unlevered free cash flow|discount rate)\b/i],
  ['Valuation', /\b(valuation|multiples?|comparable companies|precedent transactions|ev\/ebitda|p\/e)\b/i],
  ['Merger Model', /\b(merger model|accretion|dilution|accretive|dilutive|synergies|acquirer)\b/i],
  ['LBO', /\b(lbo|leveraged buyout|private equity|irr|sponsor)\b/i],
  ['Restructuring', /\b(restructuring|distressed|bankruptcy|chapter 11|creditors)\b/i],
  ['Brain Teasers', /\b(how many|brain ?teaser|estimate the number|golf balls)\b/i],
];

export function guessCategory(q, a = '') {
  const hay = q + ' ' + a.slice(0, 600);
  for (const [name, rx] of TECH_HINTS) if (rx.test(hay)) return name;
  if (/\b(you|your)\b/i.test(q)) return 'Behavioral';
  return 'General';
}

const TECH_CATS = /accounting|valuation|dcf|discounted|merger|lbo|enterprise|equity value|restructuring|distressed|brain|technical/i;

// Main entry. Returns { cards, sections }.
export function parseQA(text, opts = {}) {
  const paras = toParagraphs(text);
  if (/^\s*Q\s*[:.]/im.test(text) && /^\s*A\s*[:.]/im.test(text)) {
    const qa = parseExplicitQA(paras);
    if (qa.length >= 3) return finalize(qa, opts);
  }
  const numbered = parseNumbered(paras);
  const unnumbered = parseQuestionMarks(paras);
  const best = numbered.length >= Math.max(3, unnumbered.length * 0.5) ? numbered : unnumbered;
  return finalize(best, opts);
}

function parseExplicitQA(paras) {
  const out = [];
  let cur = null;
  let section = null;
  for (const p of paras) {
    const h = headerInfo(p);
    if (h) { section = h; continue; }
    const qm = p.match(/^Q(?:uestion)?\s*\d*\s*[:.)]\s*(.+)$/i);
    const am = p.match(/^A(?:nswer)?\s*\d*\s*[:.)]\s*(.*)$/i);
    if (qm) { cur = { q: qm[1], a: [], section }; out.push(cur); }
    else if (am && cur) cur.a.push(am[1]);
    else if (cur) (cur.a.length ? cur.a : cur.a).push(p);
  }
  return out;
}

function parseNumbered(paras) {
  const out = [];
  let section = null;
  let expected = 1;
  let cur = null;
  let track = 'Behavioral';
  let pendingTitle = null;
  const queue = [...paras];
  while (queue.length) {
    let p = queue.shift();
    const h = headerInfo(p);
    const t = !h && cur ? titleInfo(p) : null;
    if (t) { pendingTitle = t; cur.a.push(p); continue; }
    if (h) {
      if (/^technical$/i.test(h.name)) { track = 'Technical'; continue; }
      section = { ...h, track: TECH_CATS.test(h.name) ? 'Technical' : track };
      if (section.track === 'Technical') track = 'Technical';
      expected = 1;
      cur = null;
      continue;
    }
    // A question can be glued onto the end of the previous paragraph by PDF conversion.
    if (cur) {
      const rx = new RegExp(`(^|[.!?"')\\]]\\s+)(${expected})\\.\\s+(?=["A-Z])`);
      const m = p.match(rx);
      if (m && m.index > 0) {
        const cut = m.index + m[1].length;
        const rest = p.slice(cut);
        const restText = rest.replace(/^\d+\.\s+/, '');
        if (looksLikeQuestion(restText)) {
          queue.unshift(rest);
          p = p.slice(0, cut).trim();
          if (p) cur.a.push(p);
          continue;
        }
      }
    }
    const m = p.match(/^(\d{1,3})[.)]\s+(.+)$/);
    if (m) {
      const n = +m[1];
      const body = m[2];
      const restart = n === 1 && cur && pendingTitle && looksLikeQuestion(body);
      if (restart) {
        // The title line was swallowed into the previous answer; take it back out.
        const i = cur.a.lastIndexOf(pendingTitle.name);
        if (i >= 0) cur.a.splice(i);
        section = { ...pendingTitle, track: TECH_CATS.test(pendingTitle.name) ? 'Technical' : track };
        pendingTitle = null;
      }
      const isNext = n === expected || (n === 1 && !cur) || restart;
      if (isNext && looksLikeQuestion(body)) {
        pendingTitle = null;
        cur = { q: body, a: [], section, n };
        out.push(cur);
        expected = n + 1;
        continue;
      }
    }
    if (cur) cur.a.push(p);
  }
  // Questions whose wording spilled into a second paragraph ("...Can you explain" / "the impact?")
  for (const c of out) {
    if (!/[?.!"]$/.test(c.q) && c.a.length && c.a[0].length < 200 && /\?$/.test(c.a[0])) {
      c.q = c.q + ' ' + c.a.shift();
    }
  }
  return out;
}

function parseQuestionMarks(paras) {
  const out = [];
  let section = null;
  let cur = null;
  for (const p of paras) {
    const h = headerInfo(p);
    if (h) { section = h; cur = null; continue; }
    const stripped = p.replace(/^(\d{1,3}[.)]|Q\d*[:.)]|[-•*])\s+/, '');
    if (stripped.length < 300 && /\?$/.test(stripped)) {
      cur = { q: stripped, a: [], section };
      out.push(cur);
    } else if (cur) cur.a.push(p);
  }
  return out;
}

function finalize(raw, opts) {
  // Title pages and tables of contents can look like a one-question section; drop those.
  if (raw.length > 20) {
    const counts = new Map();
    for (const r of raw) counts.set(r.section, (counts.get(r.section) || 0) + 1);
    raw = raw.filter(r => !r.section || counts.get(r.section) > 1);
  }
  const cards = [];
  const sections = new Set();
  for (const r of raw) {
    const q = r.q.trim();
    const a = r.a.join('\n\n').trim();
    if (!q || a.length < 15) continue;
    const category = r.section?.name || guessCategory(q, a);
    sections.add(category);
    cards.push({
      q,
      a,
      category,
      difficulty: r.section?.difficulty || (a.length > 900 ? 'Hard' : a.length > 350 ? 'Medium' : 'Easy'),
      track: r.section?.track || (TECH_CATS.test(category) ? 'Technical' : 'Behavioral'),
      source: opts.source || 'Imported',
    });
  }
  return { cards, sections: [...sections] };
}
