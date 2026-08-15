export const getApiBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    // Relative path /api/v1 works seamlessly on any domain, IP, or port over HTTP or HTTPS
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
  return "http://127.0.0.1:8000/api/v1";
};

export default getApiBaseUrl;
