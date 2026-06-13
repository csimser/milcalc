// MilCalc analytics — intentionally a no-op stub.
//
// MilCalc is a download-only, offline app. It collects no analytics and makes
// no network calls. The Mixpanel integration that used to live here was removed
// when MilCalc became a single downloadable HTML file.
//
// These functions are kept as inert stubs so the ~150 existing call sites
// across the app keep working without edits. They do nothing and return
// nothing — every caller is fire-and-forget, so this is safe.

export function initAnalytics() {}

export function captureUtm() {}

export function track(_event, _props) {}

// Round dollar amounts to nearest $100. Pure helper, still used by the
// calculators for display rounding — kept functional.
export function r100(n) {
  return Math.round(n / 100) * 100;
}
