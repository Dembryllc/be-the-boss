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

Screenshots land in `tests/screens/` at Chromebook (1366 × 768) and
tablet (820 × 1180) size, for all 3 levels and all 8 screens.
