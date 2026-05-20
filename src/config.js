// Centralized config sourced from Vite env vars.
// All client-exposed values must use the VITE_ prefix — see .env.example.
// Defaults are placeholders so the app builds without configuration.

const env = import.meta.env;

export const PUBLIC_URL        = env.VITE_PUBLIC_URL        || "https://example.com";
export const PUBLIC_DOMAIN     = env.VITE_PUBLIC_DOMAIN     || "example.com";
export const SUPPORT_EMAIL     = env.VITE_SUPPORT_EMAIL     || "support@example.com";
export const PARENT_BRAND_URL  = env.VITE_PARENT_BRAND_URL  || "https://example.com";
export const PARENT_BRAND_DOMAIN = env.VITE_PARENT_BRAND_DOMAIN || "example.com";
export const MIXPANEL_TOKEN    = env.VITE_MIXPANEL_TOKEN    || "";
