# Store Assets Required

Everything you need to create before submitting. Most can be made in Canva (free).

---

## App Icon

Design one 1024×1024 PNG. No rounded corners — the stores apply their own masks.
Use a clean, flat design. Suggested: a navy shield or star with "RET" text.

The Capacitor Asset Generator will automatically resize it for all required sizes:
  npm install -g @capacitor/assets
  npx capacitor-assets generate --iconBackgroundColor '#1B3F7A' --iconBackgroundColorDark '#1B3F7A'

---

## Google Play Store

### Screenshots (required)
- Phone: at least 2 screenshots, 16:9 or 9:16, min 320px on short side, max 3840px
- Recommended size: 1080×1920 (portrait)
- Format: PNG or JPEG
- You need screenshots of at least these screens:
  1. Pension calculator
  2. VA Disability / CRDP
  3. Tax comparison
  4. Income Gap / Summary

### Feature Graphic (required)
- Size: 1024×500 px PNG or JPEG
- Shown at top of Play Store listing
- Keep it simple: app name + tagline on navy background

### Store Listing Copy

SHORT DESCRIPTION (80 chars max):
  Military retirement financial planning — pension, VA, GI Bill & more.

FULL DESCRIPTION (4000 chars max — suggested):
  Plan your military retirement finances with confidence.

  MilCalc is a free, offline financial planning tool built
  specifically for veterans and transitioning service members. No account
  required. No data leaves your device.

  FEATURES:
  • Pension Calculator — High-3, BRS, and REDUX with 2026 DFAS pay tables
  • VA Disability — 2026 compensation rates with combined rating calculator
  • CRDP/CRSC — Concurrent receipt eligibility and explanation
  • State Tax Guide — All 50 states with military retirement exemption status
  • Cost of Living — 285 cities with category breakdown
  • GI Bill MHA — Post-9/11 MHA calculator with official 2026 BAH rates
  • Income Gap — Salary needed to close your retirement shortfall
  • Full Summary — Your complete financial picture in one view

  DATA ACCURACY:
  All figures sourced from official DoD, VA, and IRS publications.
  Updated for 2026: 3.8% military pay raise, 2.8% VA COLA, 2026 BAH rates.

  PRIVACY:
  This app works entirely offline. No accounts, no tracking, no ads.
  Your financial data stays on your device.

CATEGORY: Finance
CONTENT RATING: Everyone

---

## Apple App Store

### Screenshots (required)
You need screenshots for two device sizes minimum:
  - 6.5" display (iPhone 14 Plus / 15 Plus): 1290×2796 px
  - 5.5" display (iPhone 8 Plus): 1242×2208 px

Easiest approach: use the iOS Simulator screenshots from GitHub Actions artifacts,
then add a background frame in Canva.

### App Store Connect Metadata

Name (30 chars max):          MilCalc
Subtitle (30 chars max):      Military Pay & Retirement Calculator
Category:                     Finance
Secondary Category:           Utilities

Keywords (100 chars, comma-separated):
  military,retirement,pension,VA,disability,GI Bill,BAH,CRDP,veteran,finance

Description (4000 chars — reuse Google Play description above, same content is fine)

Privacy Policy URL (REQUIRED by Apple):
  You must host a privacy policy. Simplest option:
  1. Create a GitHub repo named "privacy-policy"
  2. Add an index.md:
     "This app does not collect, store, or transmit any personal data."
  3. Enable GitHub Pages
  URL will be: https://yourusername.github.io/privacy-policy

Support URL:
  Can be your GitHub repo URL or a simple landing page.

---

## Review Notes for Apple (paste in "Notes for Reviewer")

  This is a financial reference and calculator app for United States military
  retirees and veterans. It performs offline calculations using publicly
  available data from the Department of Defense, Department of Veterans Affairs,
  and the IRS. No account, network connection, or personal data is required.
  The app works entirely on-device.

  Test credentials: N/A — no login required.
