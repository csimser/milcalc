# Developing MilCalc

MilCalc is a React + Vite app that builds to a single self-contained
`MilCalc.html` (all JS, CSS, and fonts inlined). Users download that one file
and open it from disk — there is no hosted version, no server, and no backend.

## Prerequisites

- Node.js (see `.nvmrc` — run `nvm use` if you use nvm)
- npm

## Run locally

```bash
git clone https://github.com/csimser/milcalc.git
cd milcalc
npm install
npm run dev          # http://localhost:3000 — hot-reload dev server
```

## Build the single-file app

```bash
npm run build        # produces dist/MilCalc.html (one self-contained file)
```

Open `dist/MilCalc.html` directly in a browser (double-click it) to test the
real downloadable artifact. It runs from `file://` and works fully offline.

## Inlined fonts

Web fonts are embedded as base64 woff2 in `src/fonts-embed.css` so the
downloaded file renders correctly offline. That file is generated and
committed — regenerate it only when the font set changes:

```bash
npm run fonts:embed  # re-fetches fonts and rewrites src/fonts-embed.css
```

## Project layout

```
index.html              — HTML shell (minimal; everything is inlined at build)
src/main.jsx            — entry point + HashRouter routes
src/App.jsx             — shared components, design-system CSS, calculators
src/pages/              — the route views (transitioning / serving / retired / …)
src/components/         — shared UI (NavHeader, ui.jsx design system)
src/lib/                — pure calculation functions and rate-table data
src/fonts-embed.css     — base64-inlined web fonts (generated)
scripts/                — build helpers (rename-build, generate-fonts-embed)
vite.config.js          — single-file build config (vite-plugin-singlefile)
capacitor.config.ts     — native iOS/Android wrapper config (inert for web)
```

## Routing note

The app uses **HashRouter** (`#/transitioning`, `#/serving`, …) on purpose:
a downloaded `file://` HTML has no server to resolve history-API paths, so all
in-app navigation must be hash-based.

## Updating rate data for a new year

1. Find the new official tables (DFAS pay, VA rates, DTMO BAH, etc.).
2. Update the relevant constants in `src/lib/data.js`.
3. Search for hardcoded year references (e.g. `2026`) and bump them.
4. `npm run build`, tag a release — `release.yml` attaches the new
   `MilCalc.html` to the GitHub Release.

## Mobile builds (optional, inert by default)

Capacitor configs are kept for potential native iOS/Android builds but are not
part of the web release. See `SETUP.md` for the native build/store walkthrough.

## Releasing

Push a tag matching `v*` (e.g. `git tag v1.1.0 && git push origin v1.1.0`).
`.github/workflows/release.yml` builds `MilCalc.html` and attaches it to the
GitHub Release. The `latest/download/MilCalc.html` link always points at the
newest release.
