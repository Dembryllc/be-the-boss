# Tests

Start the app first, then run the tests in a second terminal.

```bash
cd ~/Desktop/be-the-boss && python3 -m http.server 8080
```

```bash
cd ~/Desktop/be-the-boss && npm install playwright && node tests/clickthrough.js
```

```bash
cd ~/Desktop/be-the-boss && node tests/print-check.js
```

```bash
cd ~/Desktop/be-the-boss && node tests/offline-check.js
```

```bash
cd ~/Desktop/be-the-boss && node tests/review-check.js
```

## What `clickthrough.js` covers

- All 5 steps at all 3 levels (Guided, On Track, Stretch), end to end.
- The level rules: word chips only in Guided, hints in Guided and On Track,
  the Challenge box only in Stretch.
- The logo maker: name recipe, 3-colour cap, checklist, PNG download.
- The survey tally and bar, the pitch lines, the timer.
- Budget maths against 5 worked cases, and that $20 cannot be overspent.
- Progress survives a reload; **Start over** really clears it.
- Save to a file and open it again: the file is named after the student, holds
  the whole business, is refused if it is not ours, and a refused file leaves
  the student's work alone.
- The logo and poster download as PNGs named after the student.
- Reduced motion: no confetti, animations off, nothing breaks.
- Keyboard only, and every tap target at least 48 × 48 px on every screen.
- No console errors (a missing optional picture in `/assets` is ignored).

`print-check.js` prints the certificate to PDF and checks it is one page.

`review-check.js` builds three pretend students — one finished and in profit,
one who skipped a step, one making a loss — opens them in the teacher review
page, and checks the table, the summary counts, sorting, the per-student detail,
the CSV, that a file which is not ours is refused, that re-opening a file does
not duplicate the student, and that **no student data is written to the
browser**.

`offline-check.js` opens the app both ways it gets used — served over http and
double-clicked as a file — and checks that the shipped font really loads and
that **nothing at all is requested from outside the app folder**. This is the
test that keeps the privacy promise honest.

Screenshots land in `tests/screens/` at Chromebook (1366 × 768) and
tablet (820 × 1180) size, for all 3 levels and all 8 screens.
