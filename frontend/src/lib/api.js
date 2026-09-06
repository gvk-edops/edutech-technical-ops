// Centralized API configuration
// All API calls should use this base URL instead of hardcoded localhost

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

export const API_URL = import.meta.env.PROD
  ? "/api"
  : configuredApiUrl
    ? /^https?:\/\//i.test(configuredApiUrl)
      ? configuredApiUrl.replace(/\/$/, "")
      : `https://${configuredApiUrl}`
    : "http://localhost:3000";

// Helper function to build full API endpoint URLs
export const apiUrl = (endpoint) => {
  // Ensure endpoint starts with /
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_URL}${path}`;
};

export default API_URL;
