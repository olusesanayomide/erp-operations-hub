const DEFAULT_LOCAL_API_BASE_URL = "http://localhost:3000";
const DEFAULT_LOCAL_SITE_URL = "http://localhost:8080";

function readEnvValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeUrl(value: string) {
  return value.replace(/\/$/, "");
}

export const isProductionBuild = import.meta.env.PROD;

export const supabaseUrl = readEnvValue(import.meta.env.VITE_SUPABASE_URL);
export const supabaseAnonKey = readEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY);

export const SUPABASE_CONFIG_ERROR_MESSAGE =
  "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.";

export function getApiBaseUrl() {
  const configuredBaseUrl = readEnvValue(import.meta.env.VITE_API_BASE_URL);

  if (configuredBaseUrl) {
    return normalizeUrl(configuredBaseUrl);
  }

  if (isProductionBuild) {
    throw new Error("VITE_API_BASE_URL must be configured for production builds.");
  }

  return DEFAULT_LOCAL_API_BASE_URL;
}

export function getSiteUrl() {
  const configuredSiteUrl = readEnvValue(import.meta.env.VITE_SITE_URL);

  if (configuredSiteUrl) {
    return normalizeUrl(configuredSiteUrl);
  }

  if (typeof window !== "undefined" && window.location.origin) {
    return normalizeUrl(window.location.origin);
  }

  if (isProductionBuild) {
    throw new Error("VITE_SITE_URL must be configured for production password reset links.");
  }

  return DEFAULT_LOCAL_SITE_URL;
}
