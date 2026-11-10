/* Builds ONE self-contained HTML file from the app in this folder, for places
   that can only serve a single page (a Claude Artifact, a Google Sites embed,
   an LMS page). Everything goes inside it: the CSS, the JavaScript and the
   Lexend font as text, so the page needs nothing else from the internet.

   The page it writes has no <!doctype>, <html>, <head> or <body> tags on
   purpose — the place that hosts it wraps the file in those itself.

   Run:  node tools/build-artifact.js
   Out:  dist/be-the-boss.html
*/
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

/* ---- the font, written straight into the stylesheet as text ---- */
function fontCss() {
  let css = read('css/fonts.css');
  // swap each file path for the file itself, encoded as text
  return css.replace(/url\(['"]?\.\.\/fonts\/([^'")]+)['"]?\)/g, (_, file) => {
    const b64 = fs.readFileSync(path.join(root, 'fonts', file)).toString('base64');
    return `url(data:font/woff2;base64,${b64})`;
  });
}

/* ---- the body of the page, lifted out of index.html ---- */
function bodyHtml() {
  const html = read('index.html');
  const tag = html.match(/<body[^>]*>/);
  const close = html.lastIndexOf('</body>');
  if (!tag || close < 0) throw new Error('index.html has no <body>');
  let body = html.slice(tag.index + tag[0].length, close);
  // the scripts come back inline further down
  body = body.replace(/\s*<script src="[^"]*"><\/script>/g, '');
  return body.trim();
}

function scripts() {
  return ['js/prices.js', 'js/state.js', 'js/logo.js', 'js/steps.js', 'js/app.js']
    .map((f) => '<script>\n/* ' + f + ' */\n' + read(f).trim() + '\n</script>')
    .join('\n');
}

const out = [
  '<title>Be the Boss</title>',
  '',
  '<style>',
  '/* ---- Lexend, shipped inside this file (SIL Open Font License 1.1) ---- */',
  fontCss().trim(),
  '',
  '/* ---- the app ---- */',
  read('css/styles.css').trim(),
  '</style>',
  '',
  // the <body> tag cannot come along, so its starting class is set here instead
  '<script>(function s(){ if (document.body) document.body.classList.add("level-ontrack");'
    + ' else requestAnimationFrame(s); })();</script>',
  '',
  bodyHtml(),
  '',
  scripts(),
  ''
].join('\n');

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const dest = path.join(root, 'dist', 'be-the-boss.html');
fs.writeFileSync(dest, out);

const kb = (out.length / 1024).toFixed(0);
console.log(`dist/be-the-boss.html  —  ${kb} KB, one file, nothing loaded from outside`);
