# Be the Boss!

A single-page web app for 4th-grade ICT: students create a pretend business in
five steps, then pitch it and print a certificate.

Plain HTML, CSS, and JavaScript. No frameworks, no build step, no server code.

## Open it locally

```bash
open ~/Desktop/be-the-boss/index.html
```

That is all it needs — it opens in your browser and everything works,
including saving progress and downloading the logo.

If you would rather see it the way a Chromebook will (served over http),
run this instead and go to **http://localhost:8080**:

```bash
cd ~/Desktop/be-the-boss && python3 -m http.server 8080
```

To put it on Chromebooks, copy this whole folder to Google Drive or any web
host. There is nothing to install and nothing to build.

## Saving, and getting work off the Chromebook

**There is no Save button to hunt for.** Every keystroke saves itself, and a
small green **Saved** flash in the header confirms it. That save lives in the
browser's own storage box on that one computer, for that one web address.

Three things follow from that, and the header buttons handle all three:

| Button | What it is for |
| ------ | -------------- |
| **💾 Save** | Downloads the whole business as one small file, named after the student (`captain-lemon-sunny-slime-shop-be-the-boss.json`). |
| **📂 Open** | Loads that file back, on any computer. |
| **↺ Start over** | Erases the business on this computer (it asks first). |

Use **Save** when a student needs to:

- **move to a different Chromebook** — work does not follow an account, it
  stays on the device, so it has to travel as a file;
- **share a device** — a second student on the same browser profile would
  otherwise overwrite the first;
- **hand it in** — have them drop the file in a Drive folder or a Classroom
  assignment.

Each student gets their own version automatically **if they sign into the
Chromebook with their own Google account** — separate profile, separate
storage box. On a shared profile, use the Save file.

### What students can take away as files

- **Logo** — "Download logo (PNG)" in step 2.
- **Poster** — "Download poster (PNG)" in step 3.
- **Certificate** — "Print or save as PDF" on the last screen (one page).

All three are named after the student and the business, so a folder of 25
files tells you whose is whose at a glance.

## Privacy

- No accounts, no backend, no analytics, no tracking.
- **Nothing is ever sent over the internet.** Progress is saved in the
  browser's `localStorage` on that one computer, and **Start over** erases it.
  The Save file goes only where the student puts it.
- Students are told to use a nickname and never type a last name. The saved
  file contains only what they typed into the app.
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
