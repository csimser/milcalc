// UpdateCheck.jsx — the "Check for Updates" footer block.
//
// Renders "MilCalc v{current} · [Check for Updates]". On click it calls
// checkForUpdate() (network only, and only when clicked) and shows one of
// three states: up to date, update available, or check failed. Results are
// cached in localStorage for an hour, so repeat clicks are free/offline.
//
// IMPORTANT: this component must be imported and rendered by the actual
// rendered pages (src/pages/*.jsx) — App.jsx ProfileTab is dead code.

import { useState } from "react";
import { checkForUpdate, lastCheckedLabel, getCachedCheck } from "../lib/updateChecker.js";

const FONT = "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";

// __APP_VERSION__ is injected by Vite's `define` at build time. Guard for
// dev/test contexts where it may not be defined.
const CURRENT_VERSION =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0";

export default function UpdateCheck({ marginTop = 12 }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  // Seed the "last checked" label from any prior cached check.
  const [cached] = useState(() => getCachedCheck());

  const onClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const r = await checkForUpdate({ currentVersion: CURRENT_VERSION });
      setResult(r);
    } finally {
      setLoading(false);
    }
  };

  const checkedAt = result?.checkedAt || cached?.checkedAt || null;
  const lastChecked = lastCheckedLabel(checkedAt);

  return (
    <div style={{ marginTop, fontSize: 12, fontFamily: FONT, lineHeight: 1.6 }}>
      <div>
        <span style={{ color: "#6b7280" }}>MilCalc v{CURRENT_VERSION}</span>
        <span style={{ color: "#374151" }}> &nbsp;·&nbsp; </span>
        <button
          onClick={onClick}
          disabled={loading}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            font: "inherit",
            fontSize: 12,
            color: loading ? "#4b5563" : "#d4a017",
            textDecoration: "underline",
            cursor: loading ? "default" : "pointer",
            fontWeight: 600,
          }}
        >
          {loading ? "Checking…" : "Check for Updates"}
        </button>
      </div>

      {result && !loading && <ResultLine result={result} />}

      {lastChecked && (
        <div style={{ fontSize: 11, color: "#4b5563", marginTop: 4 }}>
          {lastChecked}
        </div>
      )}

      <div style={{ fontSize: 11, color: "#4b5563", marginTop: 6, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
        Checks GitHub's release API only when you click. No tracking, no
        analytics on this check. Skip it if you prefer to stay fully offline.
      </div>
    </div>
  );
}

function ResultLine({ result }) {
  if (result.status === "update") {
    return (
      <div style={{ fontSize: 12, color: "#d4a017", marginTop: 4, fontWeight: 600 }}>
        {result.latestVersion} is available —{" "}
        <a
          href={result.downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#d4a017", textDecoration: "underline" }}
        >
          Download latest version
        </a>
      </div>
    );
  }
  if (result.status === "current") {
    return (
      <div style={{ fontSize: 12, color: "#34d399", marginTop: 4 }}>
        You're on v{result.currentVersion} — the latest release.
      </div>
    );
  }
  // error
  return (
    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
      Couldn't check for updates. Visit {result.siteUrl} to verify.
    </div>
  );
}
