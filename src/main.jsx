import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { initAnalytics, captureUtm, track } from './analytics.js'
import TransitioningPage from './pages/TransitioningPage.jsx'
import ServingPage from './pages/ServingPage.jsx'
import RetiredPage from './pages/RetiredPage.jsx'
import TermsPage from './pages/TermsPage.jsx'
import PartnersPage from './pages/PartnersPage.jsx'
import { SharePage } from './App.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    track("App Error", {
      error: error?.message || "Unknown error",
      component: info?.componentStack?.slice(0, 200) || "",
    });
  }
  render() {
    if (this.state.hasError) {
      return React.createElement("div", {
        style: {
          minHeight: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "#151c2e", color: "#f0ece4", fontFamily: "Barlow, sans-serif",
          padding: 32, textAlign: "center",
        }
      },
        React.createElement("h1", { style: { fontSize: 24, marginBottom: 12 } }, "Something went wrong"),
        React.createElement("p", { style: { color: "#8a9ab5", marginBottom: 24, maxWidth: 400 } },
          "MilCalc encountered an unexpected error. Your saved data is safe."),
        React.createElement("button", {
          onClick: () => window.location.reload(),
          style: {
            background: "#c2782a", color: "#0A0E1A", border: "none", borderRadius: 10,
            padding: "12px 28px", fontWeight: 700, fontSize: 15, cursor: "pointer",
          }
        }, "Reload App")
      );
    }
    return this.props.children;
  }
}

// ── ToS first-visit modal ──────────────────────────────────────────────
const TOS_KEY = 'milcalc_tos_accepted';
function TosModal() {
  const [accepted, setAccepted] = useState(() => {
    try { return localStorage.getItem(TOS_KEY) === 'true'; } catch { return false; }
  });
  if (accepted) return null;
  const accept = () => {
    try { localStorage.setItem(TOS_KEY, 'true'); } catch {}
    setAccepted(true);
  };
  const FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  const bullets = [
    { text: '✓ Free for personal use — always', color: '#34d399' },
    { text: '✓ No account required', color: '#34d399' },
    { text: '✓ No data sold — ever', color: '#34d399' },
    { text: '✗ Not for commercial use without a license', color: '#f87171' },
  ];
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
      zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, fontFamily: FONT,
    }}>
      <div style={{
        background: '#17171f', borderRadius: 16,
        border: '0.5px solid rgba(255,255,255,0.08)',
        padding: 28, maxWidth: 360, width: '100%',
      }}>
        {/* Logo mark */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
          <div style={{
            width: 36, height: 36, background: '#0a0c0f',
            border: '1.5px solid #d4a017', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, color: '#f0c14b',
          }}>M</div>
        </div>
        {/* Headline */}
        <div style={{
          fontSize: 18, fontWeight: 600, color: '#ffffff',
          textAlign: 'center', marginTop: 12, marginBottom: 0,
        }}>Before you calculate</div>
        {/* Body */}
        <p style={{
          fontSize: 13, color: '#9ca3af', textAlign: 'center',
          lineHeight: 1.6, margin: '12px 0',
        }}>
          MilCalc provides free retirement income estimates for personal use only.
          Results are estimates — not financial advice. By continuing you agree to our Terms of Use.
        </p>
        {/* Bullets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
          {bullets.map(b => (
            <div key={b.text} style={{ fontSize: 12, color: b.color, lineHeight: 1.5 }}>
              {b.text}
            </div>
          ))}
        </div>
        {/* CTA */}
        <button
          onClick={accept}
          style={{
            width: '100%', padding: '14px 0', marginTop: 20,
            background: 'linear-gradient(135deg,#c2782a,#e09448)',
            color: '#0f0f14', border: 'none', borderRadius: 10,
            fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          I understand — Let's calculate
        </button>
        {/* Link to full terms */}
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, color: '#4b5563', textDecoration: 'underline', fontFamily: FONT }}
          >
            Read full Terms of Use →
          </a>
        </div>
      </div>
    </div>
  );
}

// Unhide body once React has mounted (counterpart to `body { visibility: hidden }` in index.html)
function AppShell({ children }) {
  useEffect(() => { document.body.style.visibility = 'visible'; }, []);
  return (
    <>
      <TosModal />
      {children}
    </>
  );
}

initAnalytics();
// Delay UTM capture to next tick so Mixpanel is fully initialized
setTimeout(captureUtm, 0);

// Track direct URL access (user typed the URL or followed an external link).
// Nav-click tracking is handled by NavHeader. This fires only for the initial page load.
(function trackInitialPath() {
  const seg = window.location.pathname.replace(/^\//, '').split('/')[0];
  if (['serving', 'transitioning', 'retired'].includes(seg)) {
    setTimeout(() => track("Path Selected", { path: seg, source: "direct" }), 0);
  }
})();

const root = document.getElementById('root');
ReactDOM.createRoot(root).render(
  React.createElement(React.StrictMode, null,
    React.createElement(AppShell, null,
      React.createElement(ErrorBoundary, null,
        React.createElement(BrowserRouter, null,
          React.createElement(Routes, null,
            // Root redirect: / → /transitioning until the real landing page is built
            React.createElement(Route, { path: "/", element: React.createElement(Navigate, { to: "/transitioning", replace: true }) }),
            React.createElement(Route, { path: "/transitioning", element: React.createElement(TransitioningPage) }),
            React.createElement(Route, { path: "/serving", element: React.createElement(ServingPage) }),
            React.createElement(Route, { path: "/retired", element: React.createElement(RetiredPage) }),
            // Share page
            React.createElement(Route, { path: "/share", element: React.createElement(SharePage) }),
            // Legal / B2B pages
            React.createElement(Route, { path: "/terms", element: React.createElement(TermsPage) }),
            React.createElement(Route, { path: "/partners", element: React.createElement(PartnersPage) }),
            // Fallback: unknown paths → transitioning
            React.createElement(Route, { path: "*", element: React.createElement(Navigate, { to: "/transitioning", replace: true }) })
          )
        )
      )
    )
  )
)
