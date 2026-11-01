// Scores a typed or spoken answer against the model answer by key-concept coverage.
const STOP = new Set('a an the and or but if then than so of to in on at by for with from into over under as is are was were be been being it its this that these those you your we our they their he she i me my not no do does did can could would should will may might must just also there here what which who whom whose when where why how all any each few more most other some such only own same too very s t about against between through during before after above below up down out off again further once because while both nor let say says like get got make makes made going go goes one two three'.split(' '));

const GLOSSARY = ['net income','cash flow','free cash flow','unlevered free cash flow','levered free cash flow','income statement','balance sheet','cash flow statement','shareholders equity','working capital','enterprise value','equity value','depreciation','amortization','deferred tax','goodwill','ebitda','ebit','revenue','cogs','sg&a','capex','capital expenditures','interest expense','tax rate','wacc','cost of equity','cost of debt','beta','terminal value','perpetuity growth','exit multiple','discount rate','multiples','comparable companies','precedent transactions','dcf','lbo','irr','leverage','debt','dividends','stock','accretion','dilution','synergies','purchase price','premium','assets','liabilities','inventory','accounts receivable','accounts payable','accrued expenses','pp&e','operating income','pre-tax income','retained earnings','cash','interest','principal','creditors','bankruptcy','chapter 11','covenants','restructuring','teamwork','leadership','analytical','deal','client','valuation','m&a','private equity'];

const norm = s => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9&%$.\s/-]/g, ' ').replace(/\s+/g, ' ');
const stem = w => w.replace(/(ings|ing|ies|es|s|ed|ly)$/,'');

export function keyTerms(answer, max = 10) {
  const a = norm(answer);
  const found = [];
  for (const g of GLOSSARY) if (a.includes(g) && !found.some(f => f.includes(g))) found.push(g);
  const freq = new Map();
  for (const w of a.split(' ')) {
    if (w.length < 5 || STOP.has(w) || /^\d+$/.test(w)) continue;
    const k = stem(w);
    freq.set(k, (freq.get(k) || 0) + 1);
  }
  const words = [...freq.entries()].sort((x, y) => y[1] - x[1]).map(([w]) => w).filter(w => !found.some(f => f.includes(w)));
  const nums = [...new Set((answer.match(/\$?\d+(\.\d+)?%?/g) || []).filter(n => n.length > 1))].slice(0, 3);
  return [...found.slice(0, 6), ...nums, ...words].slice(0, max);
}

export function scoreAnswer(userAnswer, modelAnswer) {
  const terms = keyTerms(modelAnswer);
  const u = norm(userAnswer || '');
  const uStems = new Set(u.split(' ').map(stem));
  const hits = terms.map(t => ({ term: t, hit: t.includes(' ') || /\d/.test(t) ? u.includes(t.replace(/^\$/, '')) : uStems.has(stem(t)) || u.includes(t) }));
  const coverage = terms.length ? hits.filter(h => h.hit).length / terms.length : 0;
  const words = (userAnswer || '').trim().split(/\s+/).filter(Boolean).length;
  let suggested = 'again';
  if (coverage >= 0.75) suggested = 'easy';
  else if (coverage >= 0.5) suggested = 'good';
  else if (coverage >= 0.25) suggested = 'hard';
  return { coverage: Math.round(coverage * 100), hits, words, suggested };
}
