# Be the Boss!

A single-page web app for 4th-grade ICT: students create a pretend business in
five steps, then pitch it and print a certificate.

Plain HTML, CSS, and JavaScript. No frameworks, no build step, no server code.

## Open it locally

```bash
cd ~/Desktop/be-the-boss && python3 -m http.server 8080
```

Then go to **http://localhost:8080** in Chrome.

(It also works by double-clicking `index.html`, but a local server is closer to
how it will run on a Chromebook.)

## Privacy

- No accounts, no backend, no analytics, no tracking.
- Nothing is sent anywhere. Progress is saved in the browser's `localStorage`
  on that one computer, and **Start over** erases it.
- Students are told to use a nickname and never type a last name.
- The one network request is the Lexend font from Google Fonts. If the school
  network blocks it, the app falls back to a system font and still works.

## The five steps

1. **Big Idea** — Make It / Do It / Fix It, plus a sentence frame and word bank.
2. **Name & Logo** — name recipe, logo maker, checklist, PNG download.
3. **Slogan** — four slogan tricks, write three, pick a winner, poster preview.
4. **Customers** — a customer card and a 5-classmate survey with a bar.
5. **Budget** — $20 pretend cash, class price list, profit math, confetti.

Then **Pitch Day** (auto-filled pitch, checklist, 1-minute timer) and a
printable **Business Card & Certificate**.

## Levels

The toggle in the top right is always visible:

- **Guided** — tap-to-choose word chips, pre-filled helpers, less typing.
- **On Track** — sentence starters as optional hints.
- **Stretch** — a Challenge box on every step.

A **Read Aloud** button on every card uses the browser's own speech.

## Accessibility notes

- Body text 20px, tap targets 48px or larger, high contrast.
- Respects `prefers-reduced-motion` (animations and confetti turn off).
- Keyboard reachable throughout; headings take focus on each screen change.

## Files

```
index.html          all five steps and both finish screens
css/styles.css      the look and feel, plus the level toggle rules
css/print.css       one-page certificate print layout
js/state.js         saved progress and the money math
js/logo.js          canvas drawing for the logo and poster
js/steps.js         the five steps, Pitch Day, certificate
js/app.js           navigation, trail map, read aloud, celebrations
assets/README.md    how to drop in your own images later
tests/              Playwright click-through and screenshots
```
