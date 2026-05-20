# MilCalc — Build & Deploy Guide

Complete walkthrough from zero to live on both app stores.
Written for Windows + CLI, no Mac required for most steps.

---

## PHASE 1 — Local Development Setup

### 1.1 Install Prerequisites (Windows)

```powershell
# Install Node.js 20 LTS — https://nodejs.org
# Install Git — https://git-scm.com
# Install Android Studio — https://developer.android.com/studio
#   During install: check "Android SDK", "Android SDK Platform", "Android Virtual Device"
#   After install: open SDK Manager → install API level 34

# Install Java 17 (required for Android builds)
# Download Temurin JDK 17: https://adoptium.net
```

### 1.2 Clone and Install

```bash
git clone https://github.com/YOURUSERNAME/milcalc.git
cd milcalc
npm install
```

### 1.3 Run Locally in Browser

```bash
npm run dev
# Opens at http://localhost:3000
# This is your fastest iteration loop — test everything here first
```

### 1.4 Initialize Capacitor (first time only)

```bash
# Install Capacitor CLI globally
npm install -g @capacitor/cli

# Add Android and iOS platforms
npx cap add android
npx cap add ios      # This creates the Xcode project folder; building still needs a Mac

# Build web app and sync to native platforms
npm run build
npx cap sync
```

---

## PHASE 2 — Android Build (Local, Windows)

### 2.1 Generate Your Signing Keystore

Run this ONCE. Store the .keystore file and passwords somewhere permanent and safe.
Losing your keystore means you can never update your app on the Play Store.

```bash
bash scripts/generate-keystore.sh
# OR manually:
keytool -genkey -v -keystore release.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias key0
```

### 2.2 Build a Debug APK (test on your phone)

```bash
npm run build:android
# Then in Android Studio: Run → Run 'app' (or press Shift+F10)
# Or from CLI:
cd android
./gradlew assembleDebug
# APK is at: android/app/build/outputs/apk/debug/app-debug.apk
# ADB install: adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### 2.3 Build a Release AAB (for Play Store)

```bash
cd android
./gradlew bundleRelease \
  -Pandroid.injected.signing.store.file=../release.keystore \
  -Pandroid.injected.signing.store.password=YOUR_KEYSTORE_PASSWORD \
  -Pandroid.injected.signing.key.alias=key0 \
  -Pandroid.injected.signing.key.password=YOUR_KEY_PASSWORD

# AAB is at: android/app/build/outputs/bundle/release/app-release.aab
```

---

## PHASE 3 — iOS Build (GitHub Actions, no Mac needed)

### 3.1 One-Time Mac Access (for certificate setup only)

You need a Mac once to export your signing certificate as a .p12 file.
Options:
- Borrow a Mac for 30 minutes
- MacInCloud: https://www.macincloud.com (~$1.50/hr, pay-per-hour plan)
- GitHub Codespaces with macOS (limited availability)

On the Mac:
1. Go to https://developer.apple.com → Certificates, IDs & Profiles
2. Create a new "Apple Distribution" certificate
3. Download and double-click to add to Keychain
4. Open Keychain Access → find it → right-click → Export as .p12
5. Set a password — write it down

### 3.2 Encode Secrets for GitHub Actions

On Windows PowerShell:
```powershell
# Encode your .p12 certificate
[Convert]::ToBase64String([IO.File]::ReadAllBytes("certificate.p12")) | Set-Clipboard
# Paste into GitHub Secret: IOS_CERTIFICATE_P12_BASE64

# Encode your .mobileprovision
[Convert]::ToBase64String([IO.File]::ReadAllBytes("profile.mobileprovision")) | Set-Clipboard
# Paste into GitHub Secret: IOS_PROVISIONING_PROFILE_BASE64

# Encode your Android keystore
[Convert]::ToBase64String([IO.File]::ReadAllBytes("release.keystore")) | Set-Clipboard
# Paste into GitHub Secret: ANDROID_KEYSTORE_BASE64
```

### 3.3 Set All GitHub Secrets

Go to: github.com/YOURUSERNAME/milcalc → Settings → Secrets → Actions

Add these:

| Secret Name                     | Value                                    |
|----------------------------------|------------------------------------------|
| ANDROID_KEYSTORE_BASE64          | Base64 of release.keystore              |
| ANDROID_KEYSTORE_PASSWORD        | Your keystore password                   |
| ANDROID_KEY_ALIAS                | key0                                     |
| ANDROID_KEY_PASSWORD             | Your key password                        |
| IOS_CERTIFICATE_P12_BASE64       | Base64 of certificate.p12               |
| IOS_CERTIFICATE_PASSWORD         | .p12 export password                     |
| IOS_PROVISIONING_PROFILE_BASE64  | Base64 of profile.mobileprovision        |
| IOS_KEYCHAIN_PASSWORD            | Any random strong password               |
| IOS_TEAM_ID                      | Your 10-char Apple Team ID               |

### 3.4 Trigger a Build

```bash
git add .
git commit -m "chore: initial app build"
git push origin main
```

Go to github.com/YOURUSERNAME/milcalc → Actions
You'll see two workflows running: Build Android and Build iOS.
When complete, download the artifacts (.aab and .ipa).

---

## PHASE 4 — Create Developer Accounts

### Google Play Console
1. Go to https://play.google.com/console
2. Sign in with a Google account
3. Pay the $25 one-time registration fee
4. Fill out developer profile (name, email, address)
5. Accept policies
⏱  Account active within minutes

### Apple Developer Program
1. Go to https://developer.apple.com/programs/enroll/
2. Sign in with your Apple ID
3. Choose "Individual" enrollment
4. Pay $99/year
5. Apple may take 24-48 hours to verify
⏱  Email confirmation required; can take up to 2 business days

---

## PHASE 5 — App Store Submissions

### 5.1 Google Play Console

1. Create app: Play Console → "Create app"
   - App name: MilCalc
   - Default language: English (US)
   - App or game: App
   - Free or paid: Free

2. Complete the setup checklist on the dashboard:
   - App access: All features available without special access
   - Ads: No, this app does not contain ads
   - Content rating: Fill out questionnaire → Finance category
   - Target audience: Adults (13+)
   - News apps: No
   - COVID-19: No

3. Store listing (see store-assets/STORE_ASSETS.md for copy)
   - Upload screenshots
   - Upload feature graphic
   - Add descriptions

4. Upload your AAB:
   Production → Releases → Create new release
   Upload the .aab file from your GitHub Actions artifact

5. Submit for review
   ⏱  Usually 1-3 days for first submission

### 5.2 App Store Connect

1. Go to https://appstoreconnect.apple.com
2. My Apps → "+" → New App
   - Platform: iOS
   - Name: MilCalc
   - Primary language: English (U.S.)
   - Bundle ID: com.milcalc.app (must match capacitor.config.ts)
   - SKU: milcalc-001 (internal, anything unique)
   - User access: Full access

3. App Information tab:
   - Category: Finance
   - Privacy Policy URL: (required — see store-assets/STORE_ASSETS.md)

4. Pricing and Availability:
   - Price: Free
   - Available in all countries

5. App Store tab → Version 1.0.0:
   - Upload screenshots (see STORE_ASSETS.md for sizes)
   - Add description, keywords, support URL
   - Build: Upload your .ipa via Transporter app
     (Download Transporter from Mac App Store — free — you can use MacInCloud)

6. Submit for review
   ⏱  Usually 1-3 days; Apple may ask questions via Resolution Center

---

## PHASE 6 — Using Claude Code for Ongoing Development

Claude Code is ideal for iterating on this project. Install it:

```bash
npm install -g @anthropic-ai/claude-code
cd milcalc
claude
```

Useful Claude Code prompts for this project:
- "Add a dark mode toggle"
- "Make the sidebar collapsible on mobile"
- "Add a print/export to PDF button for the Summary section"
- "The VA disability section needs a note about SMC rates"
- "Fix the layout on small phone screens (320px wide)"

---

## MAINTENANCE — Keeping Data Current

Key annual updates needed:
| Data                    | When Updated         | Source                              |
|-------------------------|----------------------|-------------------------------------|
| Military pay tables     | January 1            | dfas.mil                            |
| VA disability rates     | December 1           | va.gov/disability/compensation-rates|
| BAH / GI Bill MHA       | January 1 (BAH)      | travel.dod.mil                      |
|                         | August 1 (GI Bill)   | va.gov/education/benefit-rates      |
| State tax laws          | Ongoing              | Each state revenue department       |

---

## TROUBLESHOOTING

**Android build fails: "SDK not found"**
  Set ANDROID_HOME in your environment:
  Windows: System Properties → Environment Variables
  Add: ANDROID_HOME = C:\Users\YOU\AppData\Local\Android\Sdk

**iOS build fails: "No signing certificate"**
  Double-check that your GitHub Secrets are set correctly.
  The IOS_TEAM_ID must match exactly what's in developer.apple.com.

**App looks wrong on mobile**
  Test in Chrome DevTools with device emulation before building.
  Check for horizontal scroll — set overflow-x: hidden on body.

**Capacitor sync fails**
  Run: npx cap sync --deployment
  If that fails: rm -rf node_modules && npm install && npx cap sync

**App Store rejection: "guideline 2.1 — app completeness"**
  Common for finance apps. Add a brief onboarding screen explaining what the app does.
  Make sure all nav sections work and have content.
