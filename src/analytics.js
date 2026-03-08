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
    // Re-register stored UTM as super properties on every init
    try {
      const stored = localStorage.getItem("milcalc_utm");
      if (stored) mixpanel.register(JSON.parse(stored));
    } catch (e) {}
  } catch (e) {
    // analytics must never break the app
  }
}

export function captureUtm() {
  try {
    const params = new URLSearchParams(window.location.search);
    const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "ref"];
    const utm = {};
    keys.forEach(k => { const v = params.get(k); if (v) utm[k] = v; });
    if (Object.keys(utm).length === 0) return;
    localStorage.setItem("milcalc_utm", JSON.stringify(utm));
    if (!import.meta.env.PROD) {
      console.log("[MilCalc] UTM captured:", utm);
    }
    if (!initialized) return;
    mixpanel.track("Referral Visit", utm);
    mixpanel.people.set_once({
      referral_source: utm.utm_source || utm.ref || "",
      first_touch_url: window.location.href,
    });
    mixpanel.register(utm);
  } catch (e) {
    // silent
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
