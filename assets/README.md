# assets/

Drop images here later (made with ChatGPT or anywhere else) — the app works
with or without them. Nothing in here is required.

## How the image slots work

Every picture in **Be the Boss!** is drawn in the browser (inline SVG, canvas
shapes, and emoji), so the app never breaks when a file is missing.
If you add a file with one of the names below, the app will use it instead.

| File name you add        | Where it shows up                                  |
| ------------------------ | -------------------------------------------------- |
| `trail-background.png`   | Behind the trail map at the top                    |
| `step-1.png` … `step-5.png` | A picture at the top of that step's card        |
| `boss.png`               | Replaces the little shop-owner character           |
| `certificate-seal.png`   | A seal on the printable certificate                |

Just drop the file in with the right name and reload the page — there is
nothing to edit. While a slot is empty the browser's console shows a harmless
`404` for that file name; that is the app checking whether you added it yet,
and students never see it.

**Sizes that work well**

- `trail-background.png` — 2000 × 300 px, PNG with transparency
- `step-1.png` … `step-5.png` — 600 × 400 px
- `boss.png` — 300 × 300 px, transparent background
- `certificate-seal.png` — 400 × 400 px, transparent background

## Rules for art in this app

- Original art only. No copyrighted characters, mascots, brands, or logos.
- No photos of real children.
- Bright but soft colors; keep text large and high contrast.

## Prompt starters for ChatGPT

> Flat vector illustration, thick rounded outlines, soft bright colors
> (coral, sunny yellow, mint, blueberry), cream background, friendly and
> playful, no text, 4th-grade classroom market day theme.

Then add the subject, for example: "a lemonade stand with a striped awning",
"a kid shop owner in an apron waving", "a jar of colorful slime".
