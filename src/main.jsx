import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { initAnalytics, captureUtm, track } from './analytics.js'
import TransitioningPage from './pages/TransitioningPage.jsx'
import ServingPage from './pages/ServingPage.jsx'
import RetiredPage from './pages/RetiredPage.jsx'
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

// Unhide body once React has mounted (counterpart to `body { visibility: hidden }` in index.html)
function AppShell({ children }) {
  useEffect(() => { document.body.style.visibility = 'visible'; }, []);
  return children;
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
            // Share page + legacy /partners redirect
            React.createElement(Route, { path: "/share", element: React.createElement(SharePage) }),
            React.createElement(Route, { path: "/partners", element: React.createElement(Navigate, { to: "/share", replace: true }) }),
            // Fallback: unknown paths → transitioning
            React.createElement(Route, { path: "*", element: React.createElement(Navigate, { to: "/transitioning", replace: true }) })
          )
        )
      )
    )
  )
)
