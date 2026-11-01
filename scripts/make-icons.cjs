// Renders the app icons (Bo the Bull on navy) to PNG. Run: node scripts/make-icons.cjs (needs Playwright).
const { chromium } = require('playwright');
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = {}; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(__dirname, '../app/mascot.js'), 'utf8') + ';this.bo = bo;', ctx);
const out = path.join(__dirname, '../app/icons');
const jobs = [['icon-192.png', 192, 0.86], ['icon-512.png', 512, 0.86], ['apple-touch-icon.png', 180, 0.86], ['icon-maskable-512.png', 512, 0.66], ['favicon-32.png', 32, 0.98]];
(async () => {
  const b = await chromium.launch();
  for (const [name, size, scale] of jobs) {
    const p = await b.newPage({ viewport: { width: size, height: size } });
    const inner = Math.round(size * scale);
    await p.setContent(`<html><body style="margin:0;width:${size}px;height:${size}px;background:#1f4e8c;display:grid;place-items:center">${ctx.bo('happy', inner)}</body></html>`);
    await p.screenshot({ path: path.join(out, name), omitBackground: false });
    await p.close();
  }
  await b.close();
  console.log('icons written');
})();
