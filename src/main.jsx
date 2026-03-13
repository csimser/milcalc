import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { initAnalytics, captureUtm, track } from './analytics.js'

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

initAnalytics();
// Delay UTM capture to next tick so Mixpanel is fully initialized
setTimeout(captureUtm, 0);

const root = document.getElementById('root');
ReactDOM.createRoot(root).render(
  React.createElement(React.StrictMode, null,
    React.createElement(ErrorBoundary, null,
      React.createElement(App)
    )
  )
)
