#!/usr/bin/env node
// ── npm run stats ─────────────────────────────────────────────────────
// Adoption-metrics CLI for MilCalc + the Debriefed sister tool.
//
// Prints:
//   • GitHub Release download counts (per release + total) for both repos
//   • GitHub traffic (clones / views, last 14 days) when the token has push
//     access to the repo (the traffic API is owner-only)
//   • Discord member count, when DISCORD_GUILD_ID + DISCORD_BOT_TOKEN are set
//   • A one-line summary
//
// Everything runs through the `gh` CLI (so it uses your existing GitHub auth)
// plus a single fetch() to Discord. Each section degrades gracefully — a repo
// you can't see, or a metric you haven't configured, prints a short note
// instead of throwing.
//
// Config (all optional — sensible defaults below):
//   MILCALC_REPO     default "csimser/milcalc"
//   DEBRIEFED_REPO   default "csimser/debriefed"
//   DISCORD_GUILD_ID + DISCORD_BOT_TOKEN   to enable the Discord count

const { execFileSync } = require("node:child_process");

const MILCALC_REPO   = process.env.MILCALC_REPO   || "csimser/milcalc";
const DEBRIEFED_REPO = process.env.DEBRIEFED_REPO || "csimser/debriefed";

// ── helpers ───────────────────────────────────────────────────────────
const C = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  gold: "\x1b[33m", green: "\x1b[32m", red: "\x1b[31m", cyan: "\x1b[36m",
};
const num = n => Number(n || 0).toLocaleString("en-US");

function gh(args) {
  // Returns parsed JSON from a `gh` invocation, or throws with a clean message.
  const out = execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return out.trim() ? JSON.parse(out) : null;
}

function ghAvailable() {
  try {
    execFileSync("gh", ["auth", "status"], { stdio: ["ignore", "ignore", "ignore"] });
    return true;
  } catch {
    return false;
  }
}

// ── release downloads ───────────────────────────────────────────────────
function releaseStats(repo) {
  // gh api paginates releases; --paginate walks all pages.
  const releases = gh(["api", "--paginate", `repos/${repo}/releases`, "--jq", "."]) || [];
  const list = Array.isArray(releases) ? releases : [releases];
  let total = 0;
  const rows = [];
  for (const rel of list) {
    const assets = rel.assets || [];
    const relDownloads = assets.reduce((sum, a) => sum + (a.download_count || 0), 0);
    total += relDownloads;
    rows.push({ tag: rel.tag_name || rel.name || "(untagged)", downloads: relDownloads, assets: assets.length });
  }
  return { rows, total };
}

function printReleases(label, repo) {
  console.log(`\n${C.bold}${C.cyan}${label}${C.reset} ${C.dim}(${repo})${C.reset}`);
  let stats;
  try {
    stats = releaseStats(repo);
  } catch (e) {
    console.log(`  ${C.red}· releases unavailable${C.reset} ${C.dim}(${(e.message || "").split("\n")[0]})${C.reset}`);
    return 0;
  }
  if (!stats.rows.length) {
    console.log(`  ${C.dim}· no releases published yet${C.reset}`);
    return 0;
  }
  for (const r of stats.rows) {
    console.log(`  ${C.gold}${r.tag.padEnd(14)}${C.reset} ${num(r.downloads).padStart(9)} downloads ${C.dim}(${r.assets} asset${r.assets === 1 ? "" : "s"})${C.reset}`);
  }
  console.log(`  ${C.bold}${"TOTAL".padEnd(14)} ${C.green}${num(stats.total).padStart(9)} downloads${C.reset}`);
  return stats.total;
}

// ── traffic (owner-only) ─────────────────────────────────────────────────
function printTraffic(label, repo) {
  let views, clones;
  try {
    views  = gh(["api", `repos/${repo}/traffic/views`]);
    clones = gh(["api", `repos/${repo}/traffic/clones`]);
  } catch {
    console.log(`  ${C.dim}· traffic needs push access to ${repo} — skipped${C.reset}`);
    return;
  }
  console.log(`  ${C.dim}traffic (14d):${C.reset} ${num(views?.count)} views / ${num(views?.uniques)} unique · ${num(clones?.count)} clones / ${num(clones?.uniques)} unique`);
}

// ── Discord ───────────────────────────────────────────────────────────────
async function discordMembers() {
  const guild = process.env.DISCORD_GUILD_ID;
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!guild || !token) {
    return { ok: false, note: "set DISCORD_GUILD_ID + DISCORD_BOT_TOKEN to enable" };
  }
  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guild}?with_counts=true`, {
      headers: { Authorization: `Bot ${token}` },
    });
    if (!res.ok) return { ok: false, note: `Discord API ${res.status}` };
    const data = await res.json();
    return { ok: true, total: data.approximate_member_count || 0, online: data.approximate_presence_count || 0 };
  } catch (e) {
    return { ok: false, note: (e.message || "request failed").split("\n")[0] };
  }
}

// ── main ──────────────────────────────────────────────────────────────────
(async () => {
  console.log(`${C.bold}MilCalc · Adoption Stats${C.reset}`);

  if (!ghAvailable()) {
    console.log(`\n${C.red}GitHub CLI not authenticated.${C.reset} Run ${C.bold}gh auth login${C.reset} first.`);
    console.log(`${C.dim}(stats reads release/traffic data through your gh auth)${C.reset}`);
    process.exit(1);
  }

  const milTotal = printReleases("MilCalc", MILCALC_REPO);
  printTraffic("MilCalc", MILCALC_REPO);

  const debTotal = printReleases("Debriefed", DEBRIEFED_REPO);
  printTraffic("Debriefed", DEBRIEFED_REPO);

  console.log(`\n${C.bold}${C.cyan}Discord${C.reset}`);
  const discord = await discordMembers();
  if (discord.ok) {
    console.log(`  ${C.green}${num(discord.total)} members${C.reset} ${C.dim}(${num(discord.online)} online)${C.reset}`);
  } else {
    console.log(`  ${C.dim}· ${discord.note}${C.reset}`);
  }

  const discordStr = discord.ok ? num(discord.total) : "n/a";
  console.log(`\n${C.bold}Summary:${C.reset} Total MilCalc downloads: ${C.green}${num(milTotal)}${C.reset} · Total Debriefed downloads: ${C.green}${num(debTotal)}${C.reset} · Discord members: ${C.green}${discordStr}${C.reset}`);
})().catch(e => {
  console.error(`${C.red}stats failed:${C.reset} ${e.message}`);
  process.exit(1);
});
