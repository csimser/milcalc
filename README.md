# MilCalc

A free, offline-capable React + Capacitor app for military retirement
financial planning — pension, VA disability, BAH, GI Bill, state taxes,
and income-gap analysis. All calculations run client-side. No accounts,
no backend, no user data leaves the device.

See `CLAUDE.md` for architecture notes and `SETUP.md` for the full
build-and-ship-to-stores walkthrough (Android keystore, iOS certs,
GitHub Actions, Play Console, App Store Connect).

---

## Quick start

```bash
git clone <your-fork-url>
cd milcalc
npm install
cp .env.example .env.local   # edit values — see below
npm run dev                  # http://localhost:3000
```

## Environment variables

Every configurable value lives in `.env.local` (git-ignored). Copy
`.env.example` and fill in the ones you need — all are optional except
`VITE_PUBLIC_URL` if you want correct share/SEO links.

| Variable                   | Required | What it controls                                                          |
|----------------------------|----------|---------------------------------------------------------------------------|
| `VITE_PUBLIC_URL`          | ✓        | Full origin used in canonical URL, OG meta, share links, JSON-LD          |
| `VITE_PUBLIC_DOMAIN`       | ✓        | Bare domain shown in PDF footers and share text                           |
| `VITE_SUPPORT_EMAIL`       | ✓        | Email surfaced in FAQ, Terms, Partners page, support modal, review CTA    |
| `VITE_PARENT_BRAND_URL`    |          | URL for the "Part of <brand>" footer link and post-export promo modal     |
| `VITE_PARENT_BRAND_DOMAIN` |          | Bare domain shown alongside the parent-brand link                         |
| `VITE_MIXPANEL_TOKEN`      |          | Mixpanel project token. Leave blank to disable analytics entirely         |

Vite only exposes variables prefixed with `VITE_` to client code.
Restart `npm run dev` after editing the file so Vite reloads them.

### Where to get each value

- **`VITE_MIXPANEL_TOKEN`** — Mixpanel dashboard → Project Settings →
  Access Keys → "Project Token." A blank token disables all analytics
  calls; the app still works.
- **`VITE_PUBLIC_URL` / `VITE_PUBLIC_DOMAIN`** — whatever you deploy at
  (Vercel, Netlify, GitHub Pages, etc.). For local-only forks leave the
  `example.com` defaults.
- **`VITE_SUPPORT_EMAIL`** — any inbox you want users to reach you at.

### Files you'll also want to update before publishing

The following are static files that Vite can't substitute. Edit them
once with your final domain:

- `public/sitemap.xml` — replace `https://example.com` with your URL
- `public/robots.txt` — same
- `index.html` — replace `https://example.com` in canonical, OG, and
  JSON-LD tags with your URL
- `capacitor.config.ts` — change `appId: 'com.milcalc.app'` to your
  reverse-DNS bundle ID before building for iOS/Android

## Database / migrations / seed data

None. MilCalc has no backend. Every calculation is a pure function and
every user input is held in React state or `localStorage`. There is
nothing to migrate, seed, or provision.

## Building

```bash
npm run build           # web build → dist/
npm run build:android   # web + sync to Android project
npm run build:ios       # web + sync to iOS project
```

See `SETUP.md` for store-submission flow.
