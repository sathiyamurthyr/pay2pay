export const getApiBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    // In the browser, always use relative "/api/v1" so all API calls route
    // through the same-origin reverse proxy (Nginx or Next.js rewrites).
    // This avoids cross-origin CORS preflight failures and ensures cookies are preserved.
    return "/api/v1";
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    const url = process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
    return url.endsWith("/api/v1") ? url : `${url}/api/v1`;
  }
  if (process.env.BACKEND_URL) {
    const url = process.env.BACKEND_URL.replace(/\/$/, "");
    return url.endsWith("/api/v1") ? url : `${url}/api/v1`;
  }
  return "https://api.near4you.store/api/v1";
};

export default getApiBaseUrl;
