/* Prints the certificate screen to PDF and counts the pages. Must be exactly 1. */
const { chromium } = require('playwright');
const fs = require('fs');
const URL = process.env.APP_URL || 'http://localhost:8080/index.html';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(URL);
  await page.evaluate(() => {
    localStorage.clear();
    Object.assign(Store.data, {
      nickname: 'Captain Lemon',
      s1: { kind: 'Make It', sells: 'colorful handmade slime in ten colors',
            for: 'kids in my class', because: 'it is fun to squish', challenge: '' },
      s2: { name: 'Sunny Slime Shop', adj: 'Sunny', noun: 'Slime', end: 'Shop', shape: 'star',
            icon: '✨', colors: ['#FFC94A', '#4B7BEC', '#FF6B5B'], font: 'round',
            readOk: true, challenge: '' },
      s3: { trick: 'Command', a: 'x', b: 'Squish the day away!', c: 'y', winner: 'b', challenge: '' },
      s4: { who: 'a kid in 4th grade', age: '9 to 11 years old', likes: 'games',
            where: 'the school market day', hear: 'a poster at school',
            survey: ['yes','yes','yes','no','yes'], challenge: '' },
      s5: { qty: { paper: 1, markers: 1, cups: 1 }, price: 2, sold: 10 }
    });
    Store.save();
  });
  await page.reload();
  await page.evaluate(() => App.go(7));
  await page.waitForTimeout(400);

  const out = 'tests/screens/certificate.pdf';
  await page.pdf({ path: out, format: 'Letter', printBackground: true });
  const bytes = fs.readFileSync(out);
  const pages = (bytes.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  console.log(pages === 1 ? '  ok   certificate prints on 1 page' : '  FAIL pages: ' + pages);

  await page.emulateMedia({ media: 'print' });
  const hidden = await page.evaluate(() => ({
    head: getComputedStyle(document.querySelector('.site-head')).display,
    trail: getComputedStyle(document.querySelector('.trail-wrap')).display,
    nav: getComputedStyle(document.querySelector('#screen-7 .step-nav')).display,
    cert: getComputedStyle(document.querySelector('#cert-sheet')).display
  }));
  console.log(hidden.head === 'none' && hidden.trail === 'none' && hidden.nav === 'none'
    && hidden.cert !== 'none' ? '  ok   print hides the app chrome, keeps the certificate'
    : '  FAIL print layout: ' + JSON.stringify(hidden));

  await browser.close();
  process.exit(pages === 1 ? 0 : 1);
})();
