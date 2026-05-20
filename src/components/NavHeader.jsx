import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { track } from "../analytics.js";
import { PUBLIC_URL } from "../config.js";

// NAV_H: fixed top bar height — pages use this for top padding offset.
export const NAV_H = 52;

// TAB_BAR_H: bottom tab bar height — pages use this for bottom padding clearance.
export const TAB_BAR_H = 72;

async function handleShare(setCopied) {
  const shareData = {
    title: "MilCalc",
    text: "Free military retirement calculator — see exactly what your pension, VA, and benefits pay.",
    url: PUBLIC_URL,
  };
  if (navigator.share) {
    try {
      await navigator.share(shareData);
      track("CTA Clicked", { location: "nav_share_milcalc", method: "native_share" });
    } catch (err) {
      if (err.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(PUBLIC_URL);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        track("CTA Clicked", { location: "nav_share_milcalc", method: "clipboard" });
      } catch {
        console.log("Share failed", err);
      }
    }
  } else {
    try {
      await navigator.clipboard.writeText(PUBLIC_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      track("CTA Clicked", { location: "nav_share_milcalc", method: "clipboard" });
    } catch {
      console.log("Share unavailable");
    }
  }
}

// ── SVG Icons (stroke-only, 20×20, strokeWidth 1.5) ───────────────────
function IconHouse() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
      <path d="M7 18V11h6v7"/>
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="8"/>
      <path d="M10 6v4l2.5 2.5"/>
    </svg>
  );
}

function IconHeart() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 16.5C10 16.5 3 12 3 7a4 4 0 018 0 4 4 0 018 0c0 5-7 9.5-7 9.5z"/>
    </svg>
  );
}

function IconBarChart() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="4" height="7" rx="1"/>
      <rect x="8" y="7" width="4" height="11" rx="1"/>
      <rect x="13" y="3" width="4" height="15" rx="1"/>
    </svg>
  );
}

function IconDocument() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 2h7l4 4v12a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z"/>
      <path d="M12 2v4h4"/>
      <line x1="7" y1="9" x2="13" y2="9"/>
      <line x1="7" y1="12" x2="13" y2="12"/>
      <line x1="7" y1="15" x2="11" y2="15"/>
    </svg>
  );
}

// ── Tab definitions ────────────────────────────────────────────────────
const TABS = [
  { id: "serving",    label: "Serving",    Icon: IconHouse,    route: "/serving" },
  { id: "transition", label: "Transition", Icon: IconClock,    route: "/transitioning" },
  { id: "retired",    label: "Retired",    Icon: IconHeart,    route: "/retired" },
  { id: "export",     label: "Export",     Icon: IconDocument, route: null },
];

export default function NavHeader() {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  function isActive(tab) {
    if (tab.id === "serving")    return path === "/serving";
    if (tab.id === "transition") return path === "/transitioning";
    if (tab.id === "retired")    return path === "/retired";
    return false;
  }

  function handleTab(tab) {
    try { navigator.vibrate(10); } catch {}

    if (tab.id === "export") {
      window.dispatchEvent(new CustomEvent("milcalc:export"));
      return;
    }

    track("Path Selected", { path: tab.route.replace("/", "") || "home", source: "nav" });
    navigate(tab.route);
  }

  return (
    <>
      <style>{`
        /* ── Top bar ── */
        .nh2 {
          position: fixed; top: 0; left: 0; right: 0;
          min-height: ${NAV_H}px;
          background: rgba(15,15,20,0.97);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 0.5px solid rgba(255,255,255,0.08);
          display: flex; align-items: center; justify-content: space-between;
          padding-top: env(safe-area-inset-top, 0px);
          padding-left: 16px; padding-right: 16px; padding-bottom: 0;
          z-index: 100; box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
        }
        .nh2-logo {
          display: flex; align-items: center; gap: 9px;
          text-decoration: none; flex-shrink: 0;
          -webkit-tap-highlight-color: transparent;
        }
        .nh2-box {
          width: 30px; height: 30px; border-radius: 8px;
          background: #d4a017;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; font-weight: 800; color: #ffffff;
          flex-shrink: 0; line-height: 1;
        }
        .nh2-wordmark {
          font-size: 16px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;
        }
        .nh2-share {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 11px;
          font-size: 12px; font-weight: 500;
          border-radius: 7px; border: 1px solid rgba(212,160,23,0.4);
          background: transparent; color: #d4a017;
          cursor: pointer; white-space: nowrap; min-height: 34px;
          transition: background 0.13s, transform 0.1s;
          -webkit-tap-highlight-color: transparent;
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
        }
        .nh2-share:hover  { background: rgba(212,160,23,0.12); }
        .nh2-share:active { transform: scale(0.97); }

        /* ── Bottom tab bar ── */
        .btab-bar {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
          background: rgba(15,15,20,0.97);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 0.5px solid rgba(255,255,255,0.08);
          padding-top: 8px;
          padding-bottom: env(safe-area-inset-bottom, 20px);
          display: flex;
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
        }
        .btab {
          flex: 1;
          display: flex; flex-direction: column; align-items: center;
          gap: 3px;
          min-height: 44px; padding: 0 2px 4px;
          background: none; border: none; cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          color: #6b7280;
          transition: color 0.12s, transform 0.1s;
        }
        .btab.btab-active { color: #d4a017; }
        .btab:active { transform: scale(0.92); }
        .btab-label {
          font-size: 10px; font-weight: 500; line-height: 1;
          white-space: nowrap; letter-spacing: 0.01em;
        }
        .btab-dot {
          width: 4px; height: 4px; border-radius: 50%;
          background: #d4a017; flex-shrink: 0;
        }
      `}</style>

      {/* Top bar — logo + share only */}
      <header className="nh2">
        <a className="nh2-logo" href="/transitioning" aria-label="MilCalc home">
          <div className="nh2-box">M</div>
          <span className="nh2-wordmark">MilCalc</span>
        </a>
        <button className="nh2-share" onClick={() => handleShare(setCopied)}>
          {copied ? "Copied!" : "↗ Share MilCalc"}
        </button>
      </header>

      {/* Bottom tab bar */}
      <nav className="btab-bar" aria-label="Main navigation">
        {TABS.map(tab => {
          const active = isActive(tab);
          return (
            <button
              key={tab.id}
              className={`btab${active ? " btab-active" : ""}`}
              onClick={() => handleTab(tab)}
              aria-label={tab.label}
              aria-current={active ? "page" : undefined}
            >
              <tab.Icon />
              <span className="btab-label">{tab.label}</span>
              {active && <div className="btab-dot" />}
            </button>
          );
        })}
      </nav>
    </>
  );
}
