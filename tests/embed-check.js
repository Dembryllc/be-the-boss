/* Checks the single-file build (dist/be-the-boss.html) — the one used where the
   app has to live inside someone else's web page. That setting blocks downloads
   and printing, so this makes sure the app swaps those buttons for ones that
   work, and that the page still needs nothing from the internet.
   Run:  node tests/build-artifact.js first, then node tests/embed-check.js
         (needs a server on :8080) */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const BASE = (process.env.APP_URL || 'http://localhost:8080/index.html')
  .replace(/index\.html$/, '');

let failures = [];
function check(name, cond, extra) {
  if (cond) console.log('  ok   ' + name);
  else { console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); failures.push(name); }
}

(async () => {
  console.log('\n=== SINGLE-FILE BUILD ===');
  execFileSync('node', [path.join(root, 'tools', 'build-artifact.js')], { stdio: 'pipe' });

  const file = fs.readFileSync(path.join(root, 'dist', 'be-the-boss.html'), 'utf8');
  check('the host wraps the page, so it carries no <!doctype>, <html> or <body>',
    !/<!doctype|<html[\s>]|<head>|<body[\s>]/i.test(file));
  check('it has a title', /<title>Be the Boss<\/title>/.test(file));
  check('the font travels inside the file', file.includes('font/woff2;base64,'));
  check('nothing is loaded from another website', !/https?:\/\//.test(
    file.replace(/https?:\/\/www\.w3\.org\/\d{4}\/svg/g, '')      // the SVG name tag
        .replace(/https?:\/\/scripts\.sil\.org\S*/g, '')));       // the font licence line

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  const errors = [];
  const outside = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', (r) => {
    if (!r.url().startsWith(BASE)) outside.push(r.url());
  });

  await page.goto(BASE + 'dist/embed-test.html');
  const app = page.frameLocator('iframe');
  await app.locator('#screen-0.is-active').waitFor({ timeout: 8000 });
  const frame = page.frames()[1];

  check('the app knows it is inside another page',
    await frame.evaluate(() => document.body.classList.contains('is-embedded')));

  // the three things this setting blocks are not offered
  for (const [what, sel] of [['save to a file', '#save-work'],
                             ['download the logo', '#s2-download'],
                             ['download the poster', '#s3-download'],
                             ['print the certificate', '#print-btn']]) {
    check('no button to ' + what + ', because it would do nothing',
      !(await app.locator(sel).isVisible()));
  }
  check('copy my work is offered instead', await app.locator('#copy-work').isVisible());
  check('paste my work is offered instead', await app.locator('#paste-work').isVisible());
  check('the labels keep their spaces',
    (await app.locator('#copy-work').textContent()).includes('Copy my work'),
    await app.locator('#copy-work').textContent());

  // the browser's own pop-up boxes never appear here, so the app asks on the page
  let nativeDialog = false;
  page.on('dialog', (d) => { nativeDialog = true; d.dismiss(); });
  await app.locator('#start-over').click();
  check('start over asks on the page itself', await app.locator('#modal').isVisible());
  await app.locator('#modal-no').click();
  check('and saying no leaves the work alone', !(await app.locator('#modal').isVisible()));

  // copy and paste carry the work out and back
  const text = await frame.evaluate(() => {
    Store.data.nickname = 'Captain Lemon';
    Store.data.s1 = { kind: 'Make It', sells: 'colorful slime', for: 'kids in my class',
      because: 'it is fun to squish', challenge: '' };
    Store.save();
    return Store.toFile();
  });
  await frame.evaluate(() => Store.reset());
  await app.locator('#paste-work').click();
  await app.locator('#modal-extra textarea').fill(text);
  await app.locator('#modal-yes').click();
  await page.waitForTimeout(900);
  const back = await page.frames()[1].evaluate(() => ({
    nick: Store.data.nickname, sells: Store.data.s1.sells
  }));
  check('pasted work comes back whole',
    back.nick === 'Captain Lemon' && back.sells === 'colorful slime', JSON.stringify(back));

  // the app itself still works in here
  await app.locator('[data-go="1"]').first().click();
  await app.locator('#screen-1.is-active').waitFor({ timeout: 5000 });
  check('the steps still work inside the page', true);
  check('the shipped font is really being used', await frame.evaluate(() => {
    const el = document.createElement('span');
    el.textContent = 'MMMMMMMMMM';
    el.style.cssText = 'position:absolute;font-size:40px;font-family:Lexend';
    document.body.appendChild(el);
    const w1 = el.offsetWidth;
    el.style.fontFamily = 'monospace';
    const w2 = el.offsetWidth;
    el.remove();
    return w1 !== w2;
  }));

  check('the browser is never asked for a pop-up box', !nativeDialog);
  check('nothing is requested from outside', outside.length === 0, outside.join(', '));
  check('no page errors', errors.length === 0, errors.join(' | '));

  await browser.close();
  console.log('\n' + (failures.length
    ? failures.length + ' CHECK(S) FAILED:\n - ' + failures.join('\n - ')
    : 'All checks passed.'));
  process.exit(failures.length ? 1 : 0);
})();
