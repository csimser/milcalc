// Centralized config.
//
// MilCalc ships as a single downloaded HTML file, so there is no build-time
// environment to inject values — these defaults are what end up in the
// released MilCalc.html. They point at the project's real public surfaces
// (the milcalc.app landing page and the Debriefed sister tool) so that share
// links, QR codes, and PDF footers reference somewhere real.
//
// The VITE_ env overrides are still honored for anyone forking and hosting
// their own variant.

const env = import.meta.env;

export const PUBLIC_URL        = env.VITE_PUBLIC_URL        || "https://milcalc.app";
export const PUBLIC_DOMAIN     = env.VITE_PUBLIC_DOMAIN     || "milcalc.app";
export const SUPPORT_EMAIL     = env.VITE_SUPPORT_EMAIL     || "chris@getdebriefed.co";
export const PARENT_BRAND_URL  = env.VITE_PARENT_BRAND_URL  || "https://getdebriefed.co";
export const PARENT_BRAND_DOMAIN = env.VITE_PARENT_BRAND_DOMAIN || "getdebriefed.co";
export const DISCORD_URL       = env.VITE_DISCORD_URL       || "https://discord.gg/mfN7dqnsaY";
