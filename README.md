# gta6-cover-art-01
[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/gtumbal51/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/gtumbal51/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

## Vice Heat Studio — multi-panel cover art maker

Vice Heat Studio turns a photo and a caption into finished cover art in
the multi-panel poster style: bold condensed lettering over a sunset
sky, a grid of photo panels split by dark comic gutters, and a warm
Vice City colour grade over everything. It is a static web app — no
build step, no network, every asset (including the headline font and
two built-in sample illustrations) is a file under `app/`, and it runs
fully offline in a desktop browser.

Everything in the art is original: the lettering is set in Anton (SIL
Open Font License, bundled under `app/fonts/` with its license), the
two sample images are hand-drawn flat illustrations made for this
entry, and no publisher logo, artwork, character or font is used.

### What it does

- **Photo → cover in under a minute.** The studio opens with a finished
  cover already on the canvas (two bundled samples in a classic
  layout). Drop in your own photos — file picker or drag-and-drop,
  as many as you like — and assign each panel its photo by clicking a
  thumbnail, or from the per-panel dropdown.
- **Four panel layouts.** Classic Poster (one tall hero panel plus a
  stacked column of three), Triple Split, Collage Six (a 3×2 comic
  grid) and Solo Hero, all separated by bold dark gutters inside a
  neon-rimmed backdrop.
- **Three colour grades**, applied per-pixel to the photos and matched
  by the sky, sun and lettering palettes: *Vice Sunset* (warm
  orange-to-pink blend, shadows lifted into plum), *Neon Nights*
  (magenta/cyan duotone over a midnight grade, ringed neon sun) and
  *Classic Print* (teal shadows against orange highlights, halftone
  dots and film grain).
- **Poster furniture drawn by the renderer**: a gradient sky with a
  retro striped sun disc, skyline and palm silhouettes, a letterspaced
  subtitle pill, and a footer strip — so even an empty area of the
  poster looks designed, not blank.
- **Headline lettering** in bundled Anton with a layered glow, fat
  dark stroke and gradient fill, an editable title and subtitle, and
  a tilt slider for that slightly cocked poster angle.
- **Direct manipulation.** Click a panel to select it, drag the photo
  inside it to reposition, and zoom with the slider (100–320%).
- **One-click PNG export** at 1080×1080, 1080×1350 or 1920×1080. The
  export renders through the exact same code as the preview, so what
  you see is the file you get.

### How it is built

`app/src/` is plain ES modules with no dependencies: `panels.js`
defines the layouts as pure rectangle functions, `grade.js` holds the
per-pixel grade passes and palettes, `render.js` paints the whole
poster (sky, sun, silhouettes, panels, lettering, grain) onto any
canvas, `export.js` renders the offscreen export, and `main.js` wires
the editor. `main.ts` is the hand-in program: it stages `app/` and
`screenshots/` into the output directory and writes `dossier.json`
with the vendored make.fun library.

## Run it

```sh
# Try the app: serves app/ on http://localhost:8080 (Node 22, no install)
node serve.ts

# Hand it in: stage app/ + screenshots/ and write dossier.json
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Then open <http://localhost:8080> in a desktop browser: pick a layout
and a grade, drop a photo onto the canvas, drag it into place inside
its panel, set your headline, and hit **Export PNG**.

Entered on [make.fun](https://make.fun/?ref=x9nsagvt&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
