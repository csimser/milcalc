// updateChecker.js — opt-in, network-on-demand release check for MilCalc.
//
// MilCalc ships as a single downloadable HTML file used offline. This module
// hits GitHub's release API ONLY when the user explicitly clicks the
// "Check for Updates" button. There is no background polling, no analytics,
// and results are cached in localStorage so repeat clicks within an hour
// don't touch the network — preserving the offline-by-default guarantee.

export const RELEASES_API = "https://api.github.com/repos/csimser/milcalc/releases/latest";
export const DOWNLOAD_URL = "https://github.com/csimser/milcalc/releases/latest/download/MilCalc.html";
export const SITE_URL = "milcalc.app";

const CACHE_KEY = "milcalc-update-check";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const FETCH_TIMEOUT_MS = 5000;

// Strip a leading "v" and split into numeric [major, minor, patch].
function parseVersion(tag) {
  const cleaned = String(tag || "").trim().replace(/^v/i, "");
  const parts = cleaned.split(".").map((n) => parseInt(n, 10) || 0);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

// Simple numeric major.minor.patch comparison.
// Returns 1 if a > b, -1 if a < b, 0 if equal.
export function compareVersions(a, b) {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  for (let i = 0; i < 3; i++) {
    if (va[i] > vb[i]) return 1;
    if (va[i] < vb[i]) return -1;
  }
  return 0;
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeCache(latestVersion, checkedAt) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ checkedAt, latestVersion }));
  } catch {
    // localStorage may be unavailable (private mode); ignore.
  }
}

// Build the result state object the UI renders from.
function buildResult({ status, currentVersion, latestVersion, checkedAt, fromCache }) {
  return {
    status, // "current" | "update" | "error"
    currentVersion,
    latestVersion: latestVersion || null,
    checkedAt: checkedAt || null,
    fromCache: !!fromCache,
    downloadUrl: DOWNLOAD_URL,
    siteUrl: SITE_URL,
  };
}

// Compare a fetched latest version against the current one → status.
function statusFor(currentVersion, latestVersion) {
  return compareVersions(latestVersion, currentVersion) > 0 ? "update" : "current";
}

// checkForUpdate({ currentVersion, force }) → Promise<resultState>
//
// Returns the cached result if the last check was within the last hour
// (unless force is true). Otherwise fetches the latest release, caches it,
// and returns the result. Network/timeout/rate-limit errors resolve to a
// graceful { status: "error" } result — this never throws.
export async function checkForUpdate({ currentVersion, force = false } = {}) {
  const current = currentVersion || "0.0.0";
  const nowIso = new Date().toISOString();

  // Serve from cache when fresh.
  if (!force) {
    const cached = readCache();
    if (cached && cached.checkedAt && cached.latestVersion) {
      const age = Date.parse(nowIso) - Date.parse(cached.checkedAt);
      if (age >= 0 && age < CACHE_TTL_MS) {
        return buildResult({
          status: statusFor(current, cached.latestVersion),
          currentVersion: current,
          latestVersion: cached.latestVersion,
          checkedAt: cached.checkedAt,
          fromCache: true,
        });
      }
    }
  }

  // Fetch with a 5-second timeout.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(RELEASES_API, {
      signal: controller.signal,
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const latestVersion = data && data.tag_name;
    if (!latestVersion) throw new Error("No tag_name in response");

    writeCache(latestVersion, nowIso);
    return buildResult({
      status: statusFor(current, latestVersion),
      currentVersion: current,
      latestVersion,
      checkedAt: nowIso,
      fromCache: false,
    });
  } catch {
    return buildResult({
      status: "error",
      currentVersion: current,
      latestVersion: null,
      checkedAt: null,
      fromCache: false,
    });
  } finally {
    clearTimeout(timer);
  }
}

// Human-readable "Last checked: X ago" string. Returns null if never checked.
export function lastCheckedLabel(checkedAt, nowIso) {
  if (!checkedAt) return null;
  const now = nowIso ? Date.parse(nowIso) : new Date().getTime();
  const then = Date.parse(checkedAt);
  if (isNaN(then)) return null;
  const mins = Math.max(0, Math.round((now - then) / 60000));
  if (mins < 1) return "Last checked: just now";
  if (mins < 60) return `Last checked: ${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `Last checked: ${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  return `Last checked: ${days} day${days === 1 ? "" : "s"} ago`;
}

// Read the cached check (for showing "last checked" on first render).
export function getCachedCheck() {
  return readCache();
}
