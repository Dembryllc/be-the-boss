/* Playwright click-through: all 5 steps at all 3 levels, plus budget math.
   Run:  node tests/clickthrough.js        (needs a server on :8080) */
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');

const URL = process.env.APP_URL || 'http://localhost:8080/index.html';
const LEVELS = ['guided', 'ontrack', 'stretch'];

let failures = [];
function check(name, cond, extra) {
  if (cond) console.log('  ok   ' + name);
  else { console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); failures.push(name); }
}

async function canvasInk(page, sel) {
  return page.evaluate((s) => {
    const c = document.querySelector(s);
    const ctx = c.getContext('2d');
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 8 && (d[i] < 245 || d[i + 1] < 245 || d[i + 2] < 245)) n++;
    }
    return n;
  }, sel);
}

async function runLevel(browser, level) {
  console.log('\n=== LEVEL: ' + level + ' ===');
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  // A missing optional picture in /assets logs a harmless 404. That is the
  // drop-in design, so ignore those and fail on anything else.
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const from = (m.location() && m.location().url) || '';
    if (from.includes('/assets/')) return;
    errors.push(m.text() + ' @ ' + from);
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.click(`.level-btn[data-level="${level}"]`);

  // ---- level visibility rules ----
  const guidedVis = await page.locator('#screen-0 .choice-row.guided-only').first().isVisible();
  check('guided chips visible only in guided', guidedVis === (level === 'guided'));

  // ---- welcome ----
  if (level === 'guided') {
    await page.click('#screen-0 .choice-row.guided-only .chip >> nth=0');
  } else {
    await page.fill('#nickname', 'Captain Lemon');
  }
  check('nickname saved', (await page.inputValue('#nickname')).length > 0);
  await page.click('#screen-0 .read-aloud');          // must not throw
  await page.click('#screen-0 .btn-next');

  // ---- STEP 1 ----
  await page.waitForSelector('#screen-1.is-active');
  check('step 1 hint visible per level',
    (await page.locator('#screen-1 .hint').first().isVisible()) === (level !== 'stretch'));
  check('step 1 challenge visible only in stretch',
    (await page.locator('#screen-1 .challenge').isVisible()) === (level === 'stretch'));

  await page.click('.kind-card[data-kind="Make It"]');
  check('kind selected', await page.getAttribute('.kind-card[data-kind="Make It"]', 'aria-pressed') === 'true');

  if (level === 'guided') {
    await page.click('.choice-row[data-fills="#s1-sells"] .chip >> nth=0');
    await page.click('.choice-row[data-fills="#s1-for"] .chip >> nth=0');
    await page.click('.choice-row[data-fills="#s1-because"] .chip >> nth=0');
  } else {
    await page.fill('#s1-sells', 'colorful slime');
    await page.fill('#s1-for', 'kids in my class');
    await page.fill('#s1-because', 'it is fun to squish');
  }
  // word bank appends to the focused field
  await page.click('#s1-sells');
  await page.click('.wordbank .chip-word >> nth=4');
  check('word bank adds a word', (await page.inputValue('#s1-sells')).includes('colorful'));

  const prev = await page.textContent('#s1-preview');
  check('sentence preview built', /^My business sells .+ for .+ because .+\.$/.test(prev.trim()), prev);
  if (level === 'stretch') await page.fill('#s1-challenge', 'mine is handmade');
  const stop1 = await page.getAttribute('.trail-stop[data-stop="1"]', 'class');
  check('step 1 marked done and current on trail',
    stop1.includes('is-done') && stop1.includes('is-current'), stop1);
  await page.click('#screen-1 .btn-next');

  // ---- STEP 2 ----
  await page.waitForSelector('#screen-2.is-active');
  await page.selectOption('#s2-adj', 'Sunny');
  await page.selectOption('#s2-noun', 'Slime');
  await page.selectOption('#s2-end', 'Shop');
  await page.click('#s2-use-recipe');
  check('name recipe fills the name', (await page.inputValue('#s2-name')) === 'Sunny Slime Shop');

  await page.click('#s2-shapes .pick >> nth=2');                   // star
  await page.click('#s2-icons .pick >> nth=0');                    // one picture
  await page.click('#s2-colors .pick >> nth=1');
  await page.click('#s2-colors .pick >> nth=2');
  await page.click('#s2-colors .pick >> nth=3');
  await page.click('#s2-colors .pick >> nth=4');                   // 4th must be refused
  check('3 colors is the cap', (await page.textContent('#s2-color-count')) === '3 of 3');
  await page.click('#s2-fonts .pick-font >> nth=0');
  await page.click('#s2-checklist li[data-check="read"]');

  check('logo preview has drawing', (await canvasInk(page, '#logo-canvas')) > 4000);
  const doneChecks = await page.locator('#s2-checklist li.is-done').count();
  check('all 4 checklist rows done', doneChecks === 4, 'got ' + doneChecks);

  const dl = page.waitForEvent('download', { timeout: 8000 });
  await page.click('#s2-download');
  const file = await dl;
  const logoName = file.suggestedFilename();
  check('logo downloads as PNG', /\.png$/.test(logoName), logoName);
  check('logo filename names the student and the business',
    logoName.startsWith('captain-lemon-sunny-slime-shop') && logoName.endsWith('-logo.png'), logoName);
  if (level === 'stretch') await page.fill('#s2-challenge', 'Sunny Slime');
  await page.click('#screen-2 .btn-next');

  // ---- STEP 3 ----
  await page.waitForSelector('#screen-3.is-active');
  await page.click('.trick-card[data-trick="Rhyme"]');
  await page.fill('#s3-a', 'Our slime is prime!');
  await page.fill('#s3-b', 'Squish the day away!');
  await page.fill('#s3-c', 'Need a smile? Grab some slime.');
  await page.click('.btn-winner[data-slogan="b"]');
  check('winner marked', (await page.textContent('.btn-winner[data-slogan="b"]')).includes('Winner!'));
  check('poster has drawing', (await canvasInk(page, '#poster-canvas')) > 20000);
  const pdl = page.waitForEvent('download', { timeout: 8000 });
  await page.click('#s3-download');
  const posterFile = await pdl;
  check('poster downloads as a named PNG',
    posterFile.suggestedFilename().startsWith('captain-lemon-sunny-slime-shop') &&
    posterFile.suggestedFilename().endsWith('-poster.png'), posterFile.suggestedFilename());
  if (level === 'stretch') await page.fill('#s3-challenge', 'Squish away!');
  await page.click('#screen-3 .btn-next');

  // ---- STEP 4 ----
  await page.waitForSelector('#screen-4.is-active');
  if (level === 'guided') await page.click('.choice-row[data-fills="#s4-who"] .chip >> nth=0');
  else await page.fill('#s4-who', 'a kid in 4th grade');
  await page.selectOption('#s4-age', '9 to 11 years old');
  if (level === 'guided') await page.click('.choice-row[data-fills="#s4-likes"] .chip >> nth=0');
  else await page.fill('#s4-likes', 'games and snacks');
  await page.selectOption('#s4-where', 'the school market day');
  await page.selectOption('#s4-hear', 'a poster at school');

  for (let i = 0; i < 5; i++) {
    const v = i < 4 ? 'yes' : 'no';
    await page.click(`#s4-survey tbody tr >> nth=${i} >> button[data-v="${v}"]`);
  }
  check('survey totals 4 yes / 1 no',
    (await page.textContent('#s4-yes')) === '4' && (await page.textContent('#s4-no')) === '1');
  const barW = await page.evaluate(() => document.querySelector('#s4-bar').style.width);
  check('bar at 80%', barW === '80%', barW);
  check('survey message shown', (await page.textContent('#s4-msg')).includes('4 out of 5'));
  if (level === 'stretch') await page.fill('#s4-challenge', 'make it cheaper');
  await page.click('#screen-4 .btn-next');

  // ---- STEP 5 ----
  await page.waitForSelector('#screen-5.is-active');
  if (level === 'guided') {
    await page.click('#s5-easy');
    check('easy way = 3 supplies, 10 at $2',
      (await page.textContent('#s5-out')) === '$7' &&
      (await page.inputValue('#s5-price')) === '2' &&
      (await page.inputValue('#s5-sold')) === '10');
  } else {
    await page.click('#s5-list tbody tr[data-id="paper"] button[data-d="1"]');
    await page.click('#s5-list tbody tr[data-id="markers"] button[data-d="1"]');
    await page.click('#s5-list tbody tr[data-id="cups"] button[data-d="1"]');
    await page.fill('#s5-price', '2');
    await page.fill('#s5-sold', '10');
  }
  check('money out $7', (await page.textContent('#s5-out')) === '$7');
  check('money in $20', (await page.textContent('#s5-in')) === '$20');
  check('profit $13', (await page.textContent('#s5-profit')) === '$13');
  check('cash left $13', (await page.textContent('#s5-left')) === '$13');
  check('profit message is happy', (await page.textContent('#s5-profit-msg')).includes('Profit!'));

  // over-budget block: beads x4 = $16, on top of $7 → refused
  for (let i = 0; i < 4; i++) await page.click('#s5-list tbody tr[data-id="beads"] button[data-d="1"]');
  const warn = await page.textContent('#s5-warn');
  check('spending past $20 is blocked', warn.includes('more than your $20'), warn);
  check('money out never passes $20',
    Number((await page.textContent('#s5-out')).replace('$', '')) <= 20);
  // put it back
  const beadQty = await page.textContent('#s5-list tbody tr[data-id="beads"] output');
  for (let i = 0; i < Number(beadQty); i++) {
    await page.click('#s5-list tbody tr[data-id="beads"] button[data-d="-1"]');
  }

  if (level === 'stretch') {
    await page.click('#s5-whatif');
    const wi = await page.textContent('#s5-whatif-out');
    check('what-if halves the sales', wi.includes('sold 5 instead of 10') && wi.includes('Profit $3'), wi);
  }
  check('all 5 trail stops done', (await page.locator('.trail-stop.is-done').count()) === 5);
  await page.click('#screen-5 .btn-next');

  // ---- PITCH DAY ----
  await page.waitForSelector('#screen-6.is-active');
  const lines = await page.locator('#pitch-lines li').allTextContents();
  check('pitch has lines', lines.length >= 6, lines.length + ' lines');
  check('pitch names the business', lines.some((l) => l.includes('Sunny Slime Shop')));
  check('pitch has the profit', lines.some((l) => l.includes('profit is $13')));
  check('pitch has the slogan', lines.some((l) => l.includes('Squish the day away!')));
  await page.click('#ready-list input >> nth=0');
  await page.click('#timer-start');
  await page.waitForTimeout(1200);
  const face = await page.textContent('#timer-face');
  check('timer counts down', /^0:5[0-9]$/.test(face), face);
  await page.click('#timer-reset');
  check('timer resets', (await page.textContent('#timer-face')) === '1:00');
  await page.click('#screen-6 .btn-next');

  // ---- CERTIFICATE ----
  await page.waitForSelector('#screen-7.is-active');
  check('certificate nickname', (await page.textContent('#cert-nick')).length > 2);
  check('certificate business', (await page.textContent('#cert-biz')) === 'Sunny Slime Shop');
  check('certificate profit', (await page.textContent('#cert-profit')) === '$13');
  check('certificate logo drawn', (await canvasInk(page, '#cert-canvas')) > 3000);

  // ---- saving and reloading keeps the work ----
  await page.reload();
  await page.waitForSelector('#screen-7.is-active');
  check('progress survives a reload', (await page.textContent('#cert-biz')) === 'Sunny Slime Shop');
  check('supplies survive a reload', (await page.textContent('#cert-out')) === '$7',
    await page.textContent('#cert-out'));
  check('trail stays finished after a reload',
    (await page.locator('.trail-stop.is-done').count()) === 5);
  check('level survives a reload', (await page.getAttribute('body', 'class')) === 'level-' + level);

  // ---- start over clears it ----
  await page.click('#start-over');
  await page.click('#modal-yes');          // the app asks on the page itself now
  await page.waitForSelector('#screen-0.is-active');
  check('start over empties the nickname', (await page.inputValue('#nickname')) === '');
  check('start over clears the trail', (await page.locator('.trail-stop.is-done').count()) === 0);

  check('no console errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* ---- saving work to a file and opening it again ---- */
async function workFiles(browser) {
  console.log('\n=== SAVE AND OPEN A FILE ===');
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 },
    acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // nothing filled in yet: saving should say so rather than make an empty file
  await page.click('#save-work');
  check('saving an empty start is refused',
    (await page.textContent('#toast')).includes('Fill in a little first'),
    await page.textContent('#toast'));

  // build a business
  await page.evaluate(() => {
    Object.assign(Store.data, {
      nickname: 'Captain Lemon',
      s1: { kind: 'Make It', sells: 'colorful slime', for: 'kids in my class',
            because: 'it is fun to squish', challenge: '' },
      s2: { name: 'Sunny Slime Shop', adj: 'Sunny', noun: 'Slime', end: 'Shop',
            shape: 'star', icon: '\u2728', colors: ['#FFC94A', '#4B7BEC'], font: 'round',
            readOk: true, challenge: '' },
      s3: { trick: 'Command', a: 'a', b: 'Squish the day away!', c: 'c',
            winner: 'b', challenge: '' },
      s4: { who: 'a kid in 4th grade', age: '9 to 11 years old', likes: 'games',
            where: 'the school market day', hear: 'a poster at school',
            survey: ['yes', 'yes', 'yes', 'no', 'yes'], challenge: '' },
      s5: { qty: { paper: 1, markers: 1, cups: 1 }, price: 2, sold: 10 }
    });
    Store.save();
  });
  await page.reload();

  // the "Saved" flash tells the student there is no Save button to hunt for
  await page.fill('#nickname', 'Captain Lemon!');
  await page.waitForTimeout(150);
  check('the Saved flash appears while typing',
    await page.locator('#saved-flag.is-on').isVisible());
  await page.fill('#nickname', 'Captain Lemon');

  const wdl = page.waitForEvent('download', { timeout: 8000 });
  await page.click('#save-work');
  const work = await wdl;
  const name = work.suggestedFilename();
  check('work file is named after the student',
    name === 'captain-lemon-sunny-slime-shop-be-the-boss.json', name);

  const saved = path.join(os.tmpdir(), 'be-the-boss-work.json');
  await work.saveAs(saved);
  const text = fs.readFileSync(saved, 'utf8');
  const parsed = JSON.parse(text);
  check('the file says what it is', parsed.app === 'be-the-boss' && parsed.version === 1);
  check('the file holds the whole business',
    parsed.business.s2.name === 'Sunny Slime Shop' &&
    parsed.business.s5.qty.markers === 1 &&
    parsed.business.s3.winner === 'b');
  check('the file holds no last name or anything typed outside the app',
    !/lastName|email|@/.test(text));

  // wipe this computer, the way a shared Chromebook would
  await page.click('#start-over');
  await page.click('#modal-yes');          // the app asks on the page itself now
  await page.waitForSelector('#screen-0.is-active');
  check('the computer is empty again', (await page.inputValue('#nickname')) === '');

  // open the file back up
  await page.setInputFiles('#work-file', saved);
  await page.waitForFunction(() => Store.data.s2.name === 'Sunny Slime Shop',
    null, { timeout: 8000 });
  await page.waitForSelector('#screen-0.is-active, #screen-7.is-active');
  const back = await page.evaluate(() => ({
    nick: Store.data.nickname,
    biz: Store.bizName(),
    slogan: Store.winningSlogan(),
    out: Store.moneyOut(),
    profit: Store.profit(),
    survey: Store.data.s4.survey.join(',')
  }));
  check('opening the file brings the nickname back', back.nick === 'Captain Lemon', back.nick);
  check('opening the file brings the business back', back.biz === 'Sunny Slime Shop', back.biz);
  check('opening the file brings the slogan back',
    back.slogan === 'Squish the day away!', back.slogan);
  check('opening the file brings the budget back',
    back.out === 7 && back.profit === 13, back.out + '/' + back.profit);
  check('opening the file brings the survey back', back.survey === 'yes,yes,yes,no,yes', back.survey);
  check('the trail shows the work as finished',
    (await page.locator('.trail-stop.is-done').count()) === 5);

  // a file that is not ours must be refused, and must not wipe their work
  const junk = path.join(os.tmpdir(), 'not-ours.json');
  fs.writeFileSync(junk, JSON.stringify({ hello: 'world' }));
  await page.setInputFiles('#work-file', junk);
  await page.waitForTimeout(500);
  check('a file that is not ours is refused',
    (await page.textContent('#toast')).includes('not a Be the Boss file'),
    await page.textContent('#toast'));
  check('a refused file leaves the work alone',
    (await page.evaluate(() => Store.bizName())) === 'Sunny Slime Shop');

  check('no page errors while saving and opening', errors.length === 0, errors.join(' | '));
  fs.unlinkSync(saved); fs.unlinkSync(junk);
  await ctx.close();
}

/* ---- budget math, checked straight against the page ---- */
async function budgetMath(browser) {
  console.log('\n=== BUDGET MATH ===');
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.click('#screen-0 .btn-next');
  for (let i = 0; i < 4; i++) await page.click('#screen-' + (i + 1) + ' .btn-next');
  await page.waitForSelector('#screen-5.is-active');

  const cases = [
    { supplies: { poster: 1 },                       price: 1, sold: 1,  out: 1,  inc: 1,  profit: 0,   good: false },
    { supplies: { paper: 1, markers: 1, cups: 1 },    price: 2, sold: 10, out: 7,  inc: 20, profit: 13,  good: true },
    { supplies: { beads: 5 },                        price: 1, sold: 5,  out: 20, inc: 5,  profit: -15, good: false },
    { supplies: { soap: 2, poster: 1 },              price: 5, sold: 3,  out: 7,  inc: 15, profit: 8,   good: true },
    { supplies: { markers: 1 },                      price: 0, sold: 20, out: 3,  inc: 0,  profit: -3,  good: false }
  ];

  for (const c of cases) {
    // clear every supply, then set this case
    await page.evaluate(() => {
      Store.data.s5.qty = {}; Store.data.s5.price = 0; Store.data.s5.sold = 0;
      Store.save();   // the reload below must read the cleared values back
    });
    await page.reload();
    await page.evaluate(() => { App.go(5); });
    await page.waitForSelector('#screen-5.is-active');

    for (const [id, n] of Object.entries(c.supplies)) {
      for (let i = 0; i < n; i++) {
        await page.click(`#s5-list tbody tr[data-id="${id}"] button[data-d="1"]`);
      }
    }
    await page.fill('#s5-price', String(c.price));
    await page.fill('#s5-sold', String(c.sold));

    const got = await page.evaluate(() => ({
      out: document.querySelector('#s5-out').textContent,
      inc: document.querySelector('#s5-in').textContent,
      profit: document.querySelector('#s5-profit').textContent,
      left: document.querySelector('#s5-left').textContent,
      msg: document.querySelector('#s5-profit-msg').textContent
    }));

    const expProfit = c.profit < 0 ? '−$' + Math.abs(c.profit) : '$' + c.profit;
    const label = JSON.stringify(c.supplies) + ' @ $' + c.price + ' × ' + c.sold;
    check(label + ' → out $' + c.out, got.out === '$' + c.out, got.out);
    check(label + ' → in $' + c.inc, got.inc === '$' + c.inc, got.inc);
    check(label + ' → profit ' + expProfit, got.profit === expProfit, got.profit);
    check(label + ' → cash left $' + (20 - c.out), got.left === '$' + (20 - c.out), got.left);
    check(label + ' → ' + (c.good ? 'celebrates' : 'says "Not yet"'),
      c.good ? got.msg.includes('Profit!') : got.msg.includes('Not yet!'), got.msg);
  }
  await ctx.close();
}

/* ---- screenshots ---- */
async function screenshots(browser) {
  console.log('\n=== SCREENSHOTS ===');
  const sizes = [
    { name: 'chromebook', width: 1366, height: 768 },
    { name: 'tablet', width: 820, height: 1180 }
  ];
  for (const size of sizes) {
    const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height } });
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // fill in a whole business so every screen has real content
    await page.evaluate(() => {
      Object.assign(Store.data, {
        nickname: 'Captain Lemon',
        s1: { kind: 'Make It', sells: 'colorful slime', for: 'kids in my class',
              because: 'it is fun to squish', challenge: 'mine is handmade' },
        s2: { name: 'Sunny Slime Shop', adj: 'Sunny', noun: 'Slime', end: 'Shop',
              shape: 'star', icon: '✨', colors: ['#FFC94A', '#4B7BEC', '#FF6B5B'],
              font: 'round', readOk: true, challenge: 'Sunny Slime' },
        s3: { trick: 'Command', a: 'Our slime is prime!', b: 'Squish the day away!',
              c: 'Need a smile? Grab some slime.', winner: 'b', challenge: 'Squish away!' },
        s4: { who: 'a kid in 4th grade', age: '9 to 11 years old', likes: 'games and snacks',
              where: 'the school market day', hear: 'a poster at school',
              survey: ['yes','yes','yes','no','yes'], challenge: 'make it cheaper' },
        s5: { qty: { paper: 1, markers: 1, cups: 1 }, price: 2, sold: 10 },
        ready: [true, true, true, false, false]
      });
      Store.save();
    });

    for (const level of ['guided', 'ontrack', 'stretch']) {
      await page.reload();
      await page.click(`.level-btn[data-level="${level}"]`);
      for (const n of [0, 1, 2, 3, 4, 5, 6, 7]) {
        await page.evaluate((s) => App.go(s), n);
        await page.waitForTimeout(260);
        const file = `tests/screens/${size.name}-${level}-${n}.png`;
        await page.screenshot({ path: file });
      }
    }
    console.log('  ok   ' + size.name + ' screenshots (24)');
    await ctx.close();
  }
}

/* ---- reduced motion: no confetti, no animation, still usable ---- */
async function reducedMotion(browser) {
  console.log('\n=== REDUCED MOTION ===');
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 },
    reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.evaluate(() => App.go(5));
  await page.click('#s5-list tbody tr[data-id="poster"] button[data-d="1"]');
  await page.fill('#s5-price', '5');
  await page.fill('#s5-sold', '4');
  check('profit still works with reduced motion', (await page.textContent('#s5-profit')) === '$19');
  await page.waitForTimeout(400);
  const ink = await canvasInk(page, '#confetti-canvas');
  check('no confetti is drawn with reduced motion', ink === 0, 'ink ' + ink);
  check('the celebration is still announced',
    (await page.textContent('#toast')).includes('profit'), await page.textContent('#toast'));
  const anim = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.screen.is-active')).animationDuration);
  check('screen animation is switched off', parseFloat(anim) < 0.01, anim);
  check('no page errors with reduced motion', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* ---- keyboard only: a student can tab to the controls and press them ---- */
async function keyboard(browser) {
  console.log('\n=== KEYBOARD ===');
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.evaluate(() => App.go(1));

  await page.focus('.kind-card[data-kind="Do It"]');
  await page.keyboard.press('Enter');
  check('a kind card works from the keyboard',
    (await page.getAttribute('.kind-card[data-kind="Do It"]', 'aria-pressed')) === 'true');

  await page.focus('#s1-sells');
  await page.keyboard.type('dog walking');
  check('typing works', (await page.inputValue('#s1-sells')) === 'dog walking');

  await page.evaluate(() => App.go(2));
  await page.focus('#s2-checklist li[data-check="read"]');
  await page.keyboard.press(' ');
  check('the checklist row toggles with the space bar',
    (await page.getAttribute('#s2-checklist li[data-check="read"]', 'aria-checked')) === 'true');

  // every tap target on every screen must be at least 48 x 48
  const small = [];
  for (const n of [0, 1, 2, 3, 4, 5, 6, 7]) {
    await page.evaluate((s) => App.go(s), n);
    await page.waitForTimeout(120);
    const bad = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('.screen.is-active button, .screen.is-active input, ' +
        '.screen.is-active select, .screen.is-active [role=checkbox], .site-head button')
        .forEach((el) => {
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height) return;
          // a small control inside a big label still has a big tap area
          const lab = el.closest('label');
          const h = lab ? Math.max(r.height, lab.getBoundingClientRect().height) : r.height;
          const w = lab ? Math.max(r.width, lab.getBoundingClientRect().width) : r.width;
          if (h < 48 || w < 48) out.push((el.id || el.className || el.tagName) +
            ' ' + Math.round(w) + 'x' + Math.round(h));
        });
      return out;
    });
    bad.forEach((b) => small.push('screen ' + n + ': ' + b));
  }
  check('every tap target on every screen is at least 48px', small.length === 0, small.join(' | '));
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  for (const level of LEVELS) await runLevel(browser, level);
  await reducedMotion(browser);
  await keyboard(browser);
  await workFiles(browser);
  await budgetMath(browser);
  await screenshots(browser);
  await browser.close();

  console.log('\n' + (failures.length
    ? failures.length + ' CHECK(S) FAILED:\n - ' + failures.join('\n - ')
    : 'All checks passed.'));
  process.exit(failures.length ? 1 : 0);
})();
