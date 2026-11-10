/* Proves the app makes no outside requests, and that the shipped Lexend font
   loads both ways it gets opened: served over http, and double-clicked.
   Run:  node tests/offline-check.js      (needs a server on :8080) */
const path = require('path');
const { chromium } = require('playwright');

const HTTP = process.env.APP_URL || 'http://localhost:8080/index.html';
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html');

let failures = 0;
function check(name, cond, extra) {
  if (cond) console.log('  ok   ' + name);
  else { console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); failures++; }
}

async function run(browser, url, label) {
  console.log('\n=== ' + label + ' ===');
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const requests = [];
  page.on('request', (r) => requests.push(r.url()));
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(url);
  await page.waitForTimeout(900);

  const info = await page.evaluate(async () => {
    await document.fonts.ready;
    const families = [];
    document.fonts.forEach((f) => { if (f.status === 'loaded') families.push(f.family); });
    // Lexend measures differently from the fallback, so this catches a font
    // that is "declared" but never actually painted
    const span = document.createElement('span');
    span.textContent = 'Be the Boss! 12345';
    span.style.cssText = 'position:absolute;font-size:40px;white-space:nowrap';
    document.body.appendChild(span);
    span.style.fontFamily = 'Lexend';
    const withFont = span.getBoundingClientRect().width;
    span.style.fontFamily = 'monospace';
    const fallback = span.getBoundingClientRect().width;
    span.remove();
    return {
      loaded: families.indexOf('Lexend') > -1,
      check: document.fonts.check('700 20px Lexend'),
      differs: Math.abs(withFont - fallback) > 10
    };
  });

  // anything not served by the app itself
  const outside = requests.filter((u) =>
    !u.startsWith('http://localhost:8080/') && !u.startsWith('file://') && !u.startsWith('data:'));

  check(label + ': the shipped font loads', info.loaded && info.check);
  check(label + ': the font is really being used', info.differs);
  check(label + ': nothing is requested from outside the app',
    outside.length === 0, outside.join(', '));
  check(label + ': no page errors', errors.length === 0, errors.join(' | '));

  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  await run(browser, HTTP, 'served over http');
  await run(browser, FILE, 'opened as a file');
  await browser.close();

  console.log('\n' + (failures ? failures + ' CHECK(S) FAILED' : 'All checks passed.'));
  process.exit(failures ? 1 : 0);
})();
