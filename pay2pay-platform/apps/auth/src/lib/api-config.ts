export const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    // Relative path /api/v1 works seamlessly on any domain, IP, or port over HTTP or HTTPS
    return "/api/v1";
  }
  // Server-side default
  return "http://127.0.0.1:8000/api/v1";
};

export default getApiBaseUrl;
