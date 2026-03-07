import mixpanel from "mixpanel-browser";

const TOKEN = "5a769edaf6084cba27f762e53e752aea";
let initialized = false;

export function initAnalytics() {
  if (!import.meta.env.PROD) return;
  try {
    mixpanel.init(TOKEN, {
      track_pageview: false,
      persistence: "localStorage",
    });
    initialized = true;
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    mixpanel.people.set_once({
      first_seen: new Date().toISOString(),
      platform: isMobile ? "mobile" : "desktop",
    });
  } catch (e) {
    // analytics must never break the app
  }
}

export function track(event, props) {
  if (!initialized) return;
  try {
    mixpanel.track(event, props);
  } catch (e) {
    // silent
  }
}

// Round dollar amounts to nearest $100 for privacy
export function r100(n) {
  return Math.round(n / 100) * 100;
}
