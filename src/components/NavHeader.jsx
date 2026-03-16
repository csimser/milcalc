import { useState } from "react";
import { NavLink } from "react-router-dom";
import { track } from "../analytics.js";

// NAV_H is the pixel height of the fixed top bar.
// Kept in sync with .nh2 min-height below; used by all pages for offset padding.
export const NAV_H = 60;

const LINKS = [
  { to: "/serving",       label: "Still Serving" },
  { to: "/transitioning", label: "Transitioning" },
  { to: "/retired",       label: "Retired" },
];

function trackNav(to) {
  const src = window.location.pathname === "/" ? "landing" : "nav";
  track("Path Selected", { path: to.replace("/", "") || "home", source: src });
}

async function handleShare(setToast) {
  const url = "https://milcalc.app";
  const text = "Free military retirement calculator — milcalc.app";
  track("CTA Clicked", { location: "nav_share_milcalc" });
  if (navigator.share) {
    try { await navigator.share({ title: "MilCalc", text, url }); } catch {}
  } else {
    try {
      await navigator.clipboard.writeText(url);
      setToast(true);
      setTimeout(() => setToast(false), 2000);
    } catch {}
  }
}

export default function NavHeader() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <>
      <style>{`
        .nh2 {
          position: sticky; top: 0; left: 0; right: 0;
          min-height: ${NAV_H}px;
          background: rgba(15,15,20,0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 1.25rem;
          z-index: 100; box-sizing: border-box;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .nh2-logo {
          display: flex; align-items: center; gap: 9px;
          text-decoration: none; flex-shrink: 0; height: ${NAV_H}px;
        }
        .nh2-box {
          width: 32px; height: 32px; border-radius: 8px;
          background: #d4a017;
          display: flex; align-items: center; justify-content: center;
          font-size: 17px; font-weight: 800; color: #ffffff;
          flex-shrink: 0; line-height: 1;
        }
        .nh2-wordmark {
          font-size: 17px; font-weight: 700; color: #ffffff;
          letter-spacing: -0.3px;
        }
        .nh2-nav {
          display: flex; align-items: center;
          background: rgba(255,255,255,0.06);
          border-radius: 10px;
          padding: 3px;
          gap: 2px;
        }
        .nh2-pill {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 5px 12px;
          font-size: 12px; font-weight: 500;
          border-radius: 7px; text-decoration: none; white-space: nowrap;
          transition: background 0.13s, color 0.13s;
          min-height: 36px;
        }
        .nh2-pill-off { color: #6b7280; background: transparent; }
        .nh2-pill-on  { color: #d4a017; background: rgba(212,160,23,0.2); font-weight: 600; }
        .nh2-burger {
          background: none; border: none; color: #9ca3af;
          cursor: pointer; font-size: 22px; line-height: 1;
          display: flex; align-items: center; justify-content: center;
          min-width: 44px; min-height: 44px; padding: 0;
          -webkit-tap-highlight-color: transparent;
        }
        .nh2-drop {
          position: fixed; top: ${NAV_H}px; left: 0; right: 0;
          background: rgba(15,15,20,0.98);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          z-index: 9999;
        }
        .nh2-mob-link {
          display: flex; align-items: center;
          padding: 0 1.25rem;
          font-size: 15px; font-weight: 600; text-decoration: none;
          min-height: 52px; transition: background 0.1s;
        }
        .nh2-mob-off { color: #9ca3af; }
        .nh2-mob-on  { color: #d4a017; background: rgba(212,160,23,0.07); }
        .nh2-share {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 11px;
          font-size: 12px; font-weight: 500;
          border-radius: 7px; border: 1px solid rgba(212,160,23,0.4);
          background: transparent; color: #d4a017;
          cursor: pointer; white-space: nowrap; min-height: 36px;
          transition: background 0.13s;
          -webkit-tap-highlight-color: transparent;
        }
        .nh2-share:hover { background: rgba(212,160,23,0.12); }
        .nh2-mob-share {
          display: flex; align-items: center; gap: 8px;
          padding: 0 1.25rem;
          font-size: 15px; font-weight: 600;
          min-height: 52px; color: #d4a017;
          background: none; border: none; width: 100%;
          cursor: pointer; text-align: left;
          -webkit-tap-highlight-color: transparent;
        }

        /* Desktop: show nav, hide burger */
        @media (min-width: 520px) {
          .nh2-burger { display: none !important; }
        }
        /* Mobile: hide nav, show burger */
        @media (max-width: 519px) {
          .nh2-nav { display: none !important; }
        }
      `}</style>

      <header className="nh2">
        <NavLink
          className="nh2-logo"
          to="/transitioning"
          onClick={() => trackNav("/transitioning")}
        >
          <div className="nh2-box">M</div>
          <span className="nh2-wordmark">MilCalc</span>
        </NavLink>

        {/* Desktop nav */}
        <nav className="nh2-nav" aria-label="Main navigation">
          {LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `nh2-pill ${isActive ? "nh2-pill-on" : "nh2-pill-off"}`
              }
              onClick={() => trackNav(to)}
            >
              {label}
            </NavLink>
          ))}
          <button className="nh2-share" onClick={() => handleShare(setCopied)}>
            {copied ? "Copied!" : "↗ Share"}
          </button>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="nh2-burger"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? "✕" : "☰"}
        </button>
      </header>

      {/* Mobile dropdown */}
      {open && (
        <div className="nh2-drop" role="dialog" aria-label="Navigation menu">
          {LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `nh2-mob-link ${isActive ? "nh2-mob-on" : "nh2-mob-off"}`
              }
              onClick={() => { setOpen(false); trackNav(to); }}
            >
              {label}
            </NavLink>
          ))}
          <button
            className="nh2-mob-share"
            onClick={() => { handleShare(setCopied); setOpen(false); }}
          >
            ↗ {copied ? "Copied!" : "Share MilCalc"}
          </button>
        </div>
      )}
    </>
  );
}
