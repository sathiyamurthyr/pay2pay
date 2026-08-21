/**
 * Unified API Configuration for Pay2Pay Frontend Apps
 * Ensures browser requests always use relative paths (/api/v1) to leverage
 * the same-origin reverse proxy (Nginx / Next.js rewrites) without Mixed Content or localhost issues.
 */
export const getApiBaseUrl = (): string => {
  // In the browser (client-side), ALWAYS use relative "/api/v1"
  if (typeof window !== "undefined") {
    // If an explicit external HTTPS API URL is provided and not localhost, use it
    if (
      process.env.NEXT_PUBLIC_API_URL &&
      !process.env.NEXT_PUBLIC_API_URL.includes("localhost") &&
      !process.env.NEXT_PUBLIC_API_URL.includes("127.0.0.1") &&
      process.env.NEXT_PUBLIC_API_URL.startsWith("https://")
    ) {
      const url = process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
      return url.endsWith("/api/v1") ? url : `${url}/api/v1`;
    }
    return "/api/v1";
  }

  // Server-side (Node.js / SSR)
  const serverUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";
  const cleanUrl = serverUrl.replace(/\/$/, "");
  return cleanUrl.endsWith("/api/v1") ? cleanUrl : `${cleanUrl}/api/v1`;
};

export default getApiBaseUrl;
