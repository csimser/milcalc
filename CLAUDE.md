# CLAUDE.md — Instructions for Claude Code

This is a React + Capacitor mobile app for military retiree financial planning.

## Project Structure

```
src/App.jsx          — Main app component (all-in-one: ~1700 lines)
src/main.jsx         — React entry point
index.html           — HTML shell
vite.config.js       — Build config
capacitor.config.ts  — iOS/Android native config
.github/workflows/   — CI/CD for building APK/IPA
store-assets/        — App store copy and asset specs
SETUP.md             — Full deployment guide
```

## Tech Stack

- React 18 (hooks, no router needed — all state in one component)
- Vite 5 (build tool)
- Capacitor 6 (native iOS/Android wrapper)
- CSS-in-JS (styles are embedded as a const CSS string in App.jsx)
- No external UI library — custom components only
- No backend — all calculations run client-side

## App Architecture

All state lives in a single `useState` object at the top of the App component.
The app has 8 sections rendered by a fixed sidebar nav.
All financial calculations are pure functions defined before the component.

Key data constants (all at top of App.jsx):
- `PAY2026` — DFAS 2026 military pay table
- `VA` — 2026 VA disability compensation rates
- `MHA_CITIES` — 2026 DTMO BAH rates by city (E-5 w/dep)
- `COL` — Cost of living index by city
- `STATES` — State military retirement tax exemption data

## Development Notes

- Run `npm run dev` for hot-reload browser development (fastest loop)
- Test layout at 390px width (iPhone 14) and 360px (Android)
- The sidebar is fixed at 218px; main content must account for this
- IBM Plex Mono is used for all dollar amounts
- Color palette: `--nv` (navy), `--gn` (green), `--rd` (red), `--bg` (parchment)

## Data Accuracy Standards

All data MUST be sourced from official government publications:
- Military pay: dfas.mil (DFAS pay tables)
- VA rates: va.gov/disability/compensation-rates
- BAH/MHA: travel.dod.mil (DTMO BAH rate lookup)
- GI Bill rates: va.gov/education/benefit-rates
- State taxes: each state's revenue department

Do not estimate or approximate financial figures — always find the official source.

## Common Tasks

**To add a new section:**
1. Add a new section ID to the `NAV` array
2. Create a new Tab component function
3. Add it to the section switch/render logic
4. Add relevant state fields to the initial state object

**To update data for a new year:**
1. Find the new official tables (see SETUP.md → Maintenance section)
2. Update the relevant constant objects in App.jsx
3. Update any hardcoded year references (search for "2026")

**To fix mobile layout issues:**
- Check for fixed widths that don't respect the container
- Use `min-width: 0` on flex children to prevent overflow
- Test the sidebar collapse behavior on narrow screens
