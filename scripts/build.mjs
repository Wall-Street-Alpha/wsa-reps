// Assembles app/ + src/lib modules into dist/index.html (single file, no bundler).
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs';
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
const js = [cfgJs + `\nwindow.WSA_BUILD = '${new Date().toISOString().slice(0, 16)}';`, lib, r('app/store.js'), r('app/telemetry.js'), r('app/extract.js'), r('app/mascot.js'), r('app/app-core.js'), r('app/app-ui.js'), r('app/app-pages.js'), r('app/app-pages2.js')].join('\n\n');
const html = `<title>WSA Reps</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap">
<style>
${r('app/styles.css')}
</style>
<header class="topnav"><div class="topnav-in">
  <a class="logo" href="#today" aria-label="WSA Reps home"><span class="mark">WSA</span>WSA Reps</a>
  <nav class="navlinks" id="navlinks" aria-label="Main"></nav>
  <div class="nav-right"><span class="sync" id="sync"></span><span class="stat-pill fire" id="np-streak" title="Day streak"></span><span class="stat-pill xp" id="np-xp" title="Total XP"></span><a class="avatar" id="who" href="#prefs" aria-label="Prefs"></a></div>
</div></header>
<main><div id="view"></div></main>
<nav class="tabbar" id="tabbar" aria-label="Main mobile"></nav>
<div class="toast-wrap" id="toasts" aria-live="polite"></div>
<script>
${js}
</script>
`;
const out = target === 'site' ? '../site/' : '../dist/';
mkdirSync(new URL(out, import.meta.url), { recursive: true });
const pwaHead = `<link rel="manifest" href="manifest.webmanifest"><meta name="theme-color" content="#1f4e8c"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="WSA Reps"><meta name="apple-mobile-web-app-status-bar-style" content="default"><link rel="apple-touch-icon" href="icons/apple-touch-icon.png"><link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png">`;
const page = target === 'site'
  ? `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="description" content="Spaced-repetition practice for investment banking interviews.">${pwaHead}${html.replace('<title>WSA Reps</title>', '<title>WSA Reps</title>').split('<style>')[0]}<style>${html.split('<style>')[1].split('</style>')[0]}</style></head><body>${html.split('</style>')[1]}</body></html>`
  : html;
writeFileSync(new URL(out + 'index.html', import.meta.url), page);
if (target === 'site') {
  mkdirSync(new URL(out + 'icons/', import.meta.url), { recursive: true });
  for (const f of readdirSync(new URL('../app/icons/', import.meta.url))) copyFileSync(new URL('../app/icons/' + f, import.meta.url), new URL(out + 'icons/' + f, import.meta.url));
  writeFileSync(new URL(out + 'manifest.webmanifest', import.meta.url), JSON.stringify({
    name: 'WSA Reps', short_name: 'WSA Reps', description: 'Spaced-repetition practice for investment banking interviews.',
    id: './', start_url: './', scope: './', display: 'standalone', orientation: 'portrait',
    background_color: '#f4f6f9', theme_color: '#1f4e8c',
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }, null, 2));
  writeFileSync(new URL(out + 'sw.js', import.meta.url), r('app/sw.js').replace('__BUILD__', String(Date.now())));
}
console.log(out + 'index.html', page.length, 'bytes', target === 'site' ? JSON.stringify({ supabase: !!cfg.supabaseUrl }) : '');
