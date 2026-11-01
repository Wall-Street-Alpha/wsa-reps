// Assembles app/ + src/lib modules into dist/index.html (single file, no bundler).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const r = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const wrap = (name, file, exportsList) => {
  const body = r(file).replace(/^export\s+(?=(const|function|let))/gm, '');
  return `const ${name} = (() => {\n${body}\nreturn { ${exportsList} };\n})();`;
};
const lib = [
  wrap('Parser', 'src/lib/parser.js', 'parseQA, guessCategory, toParagraphs'),
  wrap('SRS', 'src/lib/srs.js', 'RATINGS, STATE, schedule, previewIntervals, formatInterval, mastery, status, retrievability, newCardState, XP'),
  wrap('Scoring', 'src/lib/scoring.js', 'scoreAnswer, keyTerms'),
  wrap('SeedMod', 'src/lib/seed.js', 'SEED') + '\nconst SEED = SeedMod.SEED;',
].join('\n\n');
let cfg = {};
try { cfg = JSON.parse(r('app/config.json')); } catch {}
if (process.env.SUPABASE_URL) cfg.supabaseUrl = process.env.SUPABASE_URL;
if (process.env.SUPABASE_PUBLISHABLE_KEY) cfg.supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const target = process.argv[2] || 'artifact';
const cfgJs = target === 'site' ? `window.WSA_CONFIG = ${JSON.stringify(cfg)};` : 'window.WSA_CONFIG = {};';
const js = [cfgJs, lib, r('app/store.js'), r('app/extract.js'), r('app/app-core.js'), r('app/app-ui.js'), r('app/app-pages.js'), r('app/app-pages2.js')].join('\n\n');
const html = `<title>WSA Reps</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700;800&display=swap">
<style>
${r('app/styles.css')}
</style>
<div class="shell">
  <nav class="rail" aria-label="Main">
    <div class="brand"><span class="brand-mark">IB</span>WSA Reps</div>
    <div id="rail-links" style="display:grid;gap:4px"></div>
    <div class="rail-foot"><div class="faint" style="font-size:.82rem;font-weight:700" id="who"></div><div class="sync-pill" id="sync"></div></div>
  </nav>
  <main><div id="view"></div></main>
</div>
<nav class="tabbar" id="tabbar" aria-label="Main"></nav>
<div class="toast-wrap" id="toasts" aria-live="polite"></div>
<script>
${js}
</script>
`;
const out = target === 'site' ? '../site/' : '../dist/';
mkdirSync(new URL(out, import.meta.url), { recursive: true });
const page = target === 'site'
  ? `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="description" content="Spaced-repetition practice for investment banking interviews.">${html.replace('<title>WSA Reps</title>', '<title>WSA Reps</title>').split('<style>')[0]}<style>${html.split('<style>')[1].split('</style>')[0]}</style></head><body>${html.split('</style>')[1]}</body></html>`
  : html;
writeFileSync(new URL(out + 'index.html', import.meta.url), page);
console.log(out + 'index.html', page.length, 'bytes', target === 'site' ? JSON.stringify({ supabase: !!cfg.supabaseUrl }) : '');
