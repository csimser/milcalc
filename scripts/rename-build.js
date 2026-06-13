#!/usr/bin/env node
// Post-build step: rename the single-file Vite output (dist/index.html) to
// dist/MilCalc.html — the name users download from GitHub Releases.

const fs = require("fs");
const path = require("path");

const dist = path.join(__dirname, "..", "dist");
const src = path.join(dist, "index.html");
const dest = path.join(dist, "MilCalc.html");

if (!fs.existsSync(src)) {
  console.error("Expected build output not found: " + src);
  process.exit(1);
}

fs.renameSync(src, dest);

// vite-plugin-singlefile inlines everything, so any leftover asset folder is
// unused. Remove it so the release artifact is just the one HTML file.
const assets = path.join(dist, "assets");
if (fs.existsSync(assets)) {
  fs.rmSync(assets, { recursive: true, force: true });
}

const bytes = fs.statSync(dest).size;
console.log(`Built dist/MilCalc.html (${(bytes / 1024 / 1024).toFixed(2)} MB)`);
