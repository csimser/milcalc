# MilCalc - Step by Step Setup (ELI5)

You'll need: a computer, a terminal/command line, and about 10 minutes. MilCalc is simpler than Debriefed because there's no database.

## Step 1: Get the code

Go to https://github.com/csimser/milcalc and click the green "Code" button. Click "Download ZIP." Unzip it somewhere on your computer. Or if you know git:

```
git clone https://github.com/csimser/milcalc.git
cd milcalc
```

## Step 2: Install Node.js

If you don't have it, download it from https://nodejs.org (pick the LTS version). This is what runs the app.

## Step 3: Install the app's dependencies

Open a terminal in the project folder and run:

```
npm install
```

This downloads all the libraries the app needs. Wait for it to finish.

## Step 4: Set up your environment variables (optional)

Copy the example file:

```
cp .env.example .env.local
```

Open `.env.local` in any text editor. The main variables are:

- **VITE_PUBLIC_URL**: The URL where you'll host it (use http://localhost:5173 for local dev)
- **VITE_SUPPORT_EMAIL**: A support email address
- **VITE_MIXPANEL_TOKEN**: Optional. Only if you want analytics tracking. Leave blank if you don't care.

MilCalc works without any environment variables. Everything runs in the browser. The env vars just customize branding and analytics.

## Step 5: Run it

```
npm run dev
```

Open your browser and go to http://localhost:5173. You should see MilCalc running.

## Step 6: Deploy it (optional)

If you want it live on the internet for others to use:

1. Sign up at https://vercel.com
2. Connect your GitHub account
3. Import the repo
4. Click Deploy

That's it. Vercel gives you a free URL. No environment variables are required for it to work. You can add a custom domain later if you want.

That's it. You're running MilCalc. The whole thing runs in the browser so there's no server, no database, no API keys needed.
