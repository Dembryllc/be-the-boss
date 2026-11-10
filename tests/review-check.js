/* Checks the teacher review page: opening a pile of student files, the table,
   sorting, the per-student detail, the CSV, and that no student data is left
   behind in the browser.
   Run:  node tests/review-check.js        (needs a server on :8080) */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');

const URL = (process.env.APP_URL || 'http://localhost:8080/index.html')
  .replace(/index\.html$/, 'teacher-review.html');

let failures = [];
function check(name, cond, extra) {
  if (cond) console.log('  ok   ' + name);
  else { console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); failures.push(name); }
}

/* ---- three students: one finished and in profit, one half done, one at a loss ---- */
function student(over) {
  const base = {
    level: 'ontrack', screen: 0, nickname: '',
    s1: { kind: '', sells: '', for: '', because: '', challenge: '' },
    s2: { name: '', adj: '', noun: '', end: 'Shop', shape: 'circle', icon: '',
          colors: ['#FF6B5B'], font: 'round', readOk: false, challenge: '' },
    s3: { trick: '', a: '', b: '', c: '', winner: '', challenge: '' },
    s4: { who: '', age: '', likes: '', where: '', hear: '',
          survey: [null, null, null, null, null], challenge: '' },
    s5: { qty: {}, price: 0, sold: 0 },
    ready: [false, false, false, false, false],
    done: { 1: false, 2: false, 3: false, 4: false, 5: false }
  };
  const merged = JSON.parse(JSON.stringify(base));
  for (const k of Object.keys(over)) {
    merged[k] = (typeof over[k] === 'object' && !Array.isArray(over[k]))
      ? Object.assign(merged[k] || {}, over[k]) : over[k];
  }
  return { app: 'be-the-boss', version: 1, savedOn: '2026-11-10', business: merged };
}

const FILES = {
  'captain-lemon-sunny-slime-shop-be-the-boss.json': student({
    nickname: 'Captain Lemon',
    s1: { kind: 'Make It', sells: 'colorful slime', for: 'kids in my class',
          because: 'it is fun to squish', challenge: 'mine is handmade' },
    s2: { name: 'Sunny Slime Shop', shape: 'star', icon: '✨',
          colors: ['#FFC94A', '#4B7BEC'], font: 'round', readOk: true },
    s3: { trick: 'Command', a: 'Our slime is prime!', b: 'Squish the day away!',
          c: 'Need a smile?', winner: 'b' },
    s4: { who: 'a kid in 4th grade', age: '9 to 11 years old', likes: 'games',
          where: 'the school market day', hear: 'a poster at school',
          survey: ['yes', 'yes', 'yes', 'no', 'yes'] },
    s5: { qty: { paper: 1, markers: 1, cups: 1 }, price: 2, sold: 10 }   // in 20, out 7, +13
  }),
  'boss-bubbles-bubble-crew-be-the-boss.json': student({
    nickname: 'Boss Bubbles',
    s1: { kind: 'Do It', sells: 'car washing', for: 'families at school',
          because: 'it saves them time' },
    s2: { name: 'Bubble Crew', shape: 'circle', icon: '🧼',
          colors: ['#5AC8F5'], font: 'simple', readOk: true },
    s3: { trick: 'Rhyme', a: 'Shine in no time!', b: '', c: '', winner: 'a' },
    s5: { qty: { soap: 2, poster: 1 }, price: 5, sold: 3 }               // in 15, out 7, +8
  }),
  'doctor-fix-it-mighty-bike-works-be-the-boss.json': student({
    nickname: 'Doctor Fix-It',
    s1: { kind: 'Fix It', sells: 'bike fix-ups', for: 'kids who ride',
          because: 'flat tires are no fun' },
    s2: { name: 'Mighty Bike Works', shape: 'badge', icon: '🔧',
          colors: ['#2B2342', '#FF9B42', '#35C9A3'], font: 'blocky', readOk: true },
    s3: { trick: 'Question', a: 'Flat tire?', b: '', c: '', winner: 'a' },
    s4: { who: 'a kid who rides to school', age: '9 to 11 years old', likes: 'sports',
          where: 'a corner store', hear: 'a friend tells them',
          survey: ['yes', 'no', 'no', 'no', 'yes'] },
    s5: { qty: { beads: 5 }, price: 1, sold: 5 }                          // in 5, out 20, -15
  })
};

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'boss-review-'));
  const paths = [];
  for (const [name, data] of Object.entries(FILES)) {
    const p = path.join(dir, name);
    fs.writeFileSync(p, JSON.stringify(data, null, 2));
    paths.push(p);
  }
  const junk = path.join(dir, 'shopping-list.json');
  fs.writeFileSync(junk, JSON.stringify({ milk: true }));

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 },
    acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const outside = [];
  page.on('request', (r) => {
    if (!r.url().startsWith('http://localhost:8080/')) outside.push(r.url());
  });

  console.log('\n=== TEACHER REVIEW PAGE ===');
  await page.goto(URL);
  check('starts empty', await page.locator('#empty').isVisible());
  check('the table is hidden until files are open', !(await page.locator('#table').isVisible()));

  // open all three, plus one file that is not ours
  await page.setInputFiles('#files', paths.concat([junk]));
  await page.waitForSelector('#table:visible', { timeout: 8000 });

  const rowCount = await page.locator('#rows tr:not(.detail)').count();
  check('three students are listed', rowCount === 3, 'got ' + rowCount);
  check('the file that is not ours is reported',
    (await page.textContent('#problems')).includes('shopping-list.json'),
    await page.textContent('#problems'));

  // summary
  const stats = await page.locator('.stat b').allTextContents();
  check('summary counts the students', stats[0] === '3', stats.join(' | '));
  // Captain Lemon and Doctor Fix-It filled in all five; Boss Bubbles skipped step 4
  check('summary counts who finished all 5', stats[1] === '2 of 3', stats.join(' | '));
  check('summary counts who made a profit', stats[2] === '2 of 3', stats.join(' | '));
  check('summary averages the profit', stats[3] === '$2', stats.join(' | '));  // (13+8-15)/3

  // default sort is by student name
  let names = await page.locator('#rows tr:not(.detail) th').allTextContents();
  check('sorted by student name to start',
    names.join('|') === 'Boss Bubbles|Captain Lemon|Doctor Fix-It', names.join('|'));

  // the maths per student, read straight off the page
  const byName = {};
  for (const tr of await page.locator('#rows tr:not(.detail)').all()) {
    const cells = await tr.locator('th, td').allTextContents();
    byName[cells[0].trim()] = { in: cells[6].trim(), out: cells[7].trim(), profit: cells[8].trim() };
  }
  check('Captain Lemon: $20 in, $7 out, $13 profit',
    byName['Captain Lemon'].in === '$20' && byName['Captain Lemon'].out === '$7' &&
    byName['Captain Lemon'].profit === '$13', JSON.stringify(byName['Captain Lemon']));
  check('Boss Bubbles: $15 in, $7 out, $8 profit',
    byName['Boss Bubbles'].profit === '$8', JSON.stringify(byName['Boss Bubbles']));
  check('Doctor Fix-It: a loss, shown as −$15',
    byName['Doctor Fix-It'].profit === '−$15', JSON.stringify(byName['Doctor Fix-It']));

  // steps finished
  // Boss Bubbles never filled in the customer card, so step 4 is the only gap
  const steps = await page.locator('#rows tr:not(.detail)').first().locator('.steps i.on').count();
  check('Boss Bubbles shows 4 of 5 steps done', steps === 4, 'got ' + steps);
  const step4On = await page.locator('#rows tr:not(.detail)').first()
    .locator('.steps i >> nth=3').getAttribute('class');
  check('and the missing one is step 4', step4On === '', 'class=' + step4On);

  // sorting
  await page.click('thead th button[data-sort="profit"]');
  names = await page.locator('#rows tr:not(.detail) th').allTextContents();
  check('sorting by profit puts the loss first', names[0] === 'Doctor Fix-It', names.join('|'));
  await page.click('thead th button[data-sort="profit"]');
  names = await page.locator('#rows tr:not(.detail) th').allTextContents();
  check('sorting again reverses it', names[0] === 'Captain Lemon', names.join('|'));
  check('the sorted column is announced',
    (await page.getAttribute('thead th:nth-child(9)', 'aria-sort')) === 'descending');

  // per-student detail
  await page.click('#rows tr:not(.detail) >> nth=0 >> button');
  await page.waitForSelector('.detail:visible');
  const detail = await page.textContent('.detail:visible');
  check('detail shows the big idea sentence',
    detail.includes('My business sells') && detail.includes('colorful slime'), detail.slice(0, 80));
  check('detail marks the winning slogan',
    (await page.locator('.detail:visible .slogans li.win').textContent()).includes('Squish the day away!'));
  check('detail shows what they bought', detail.includes('1 × Paper pack'));
  check('detail shows the challenge answer', detail.includes('mine is handmade'));
  const ink = await page.evaluate(() => {
    const c = document.querySelector('.detail:not([hidden]) canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 8 && (d[i] < 245 || d[i + 1] < 245 || d[i + 2] < 245)) n++;
    }
    return n;
  });
  check('detail draws that student’s logo', ink > 3000, 'ink ' + ink);

  // CSV
  const dl = page.waitForEvent('download', { timeout: 8000 });
  await page.click('#csv');
  const csvFile = await dl;
  const csvPath = path.join(dir, 'out.csv');
  await csvFile.saveAs(csvPath);
  const csv = fs.readFileSync(csvPath, 'utf8');
  check('CSV is named for the class', csvFile.suggestedFilename() === 'be-the-boss-class.csv');
  check('CSV has a heading row and three students',
    csv.split('\n').length === 4 && csv.startsWith('Student,Business'), csv.split('\n')[0]);
  check('CSV keeps the profit numbers', csv.includes(',13,') && csv.includes(',-15'));
  check('CSV quotes a slogan containing a comma or quote', !/\n[^,]*,[^,]*,[^,]*,,,/.test(csv));

  // opening the same file again replaces it rather than doubling up
  await page.setInputFiles('#files', [paths[0]]);
  await page.waitForTimeout(400);
  check('re-opening a file does not duplicate the student',
    (await page.locator('#rows tr:not(.detail)').count()) === 3,
    String(await page.locator('#rows tr:not(.detail)').count()));

  // nothing about the students is left in the browser
  const stored = await page.evaluate(() => {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      out[k] = localStorage.getItem(k);
    }
    return { keys: Object.keys(out), blob: JSON.stringify(out) };
  });
  check('no student data is written to the browser',
    stored.keys.length === 0 && !/Captain Lemon/.test(stored.blob),
    stored.keys.join(', '));

  // clear
  page.once('dialog', (d) => d.accept());
  await page.click('#clear');
  await page.waitForSelector('#empty:visible');
  check('clear closes every file', (await page.locator('#rows tr').count()) === 0);

  check('nothing is requested from outside the app',
    outside.length === 0, outside.join(', '));
  check('no page errors', errors.length === 0, errors.join(' | '));

  await page.setInputFiles('#files', paths);
  await page.waitForSelector('#table:visible');
  await page.screenshot({ path: 'tests/screens/teacher-review.png', fullPage: true });

  await browser.close();
  fs.rmSync(dir, { recursive: true, force: true });

  console.log('\n' + (failures.length
    ? failures.length + ' CHECK(S) FAILED:\n - ' + failures.join('\n - ')
    : 'All checks passed.'));
  process.exit(failures.length ? 1 : 0);
})();
