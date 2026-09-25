export const getApiBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    // In browser, use same-origin relative URL so Nginx routes /sales and /api seamlessly
    return "";
  }
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL.replace(/\/$/, "");
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }
  return "http://127.0.0.1:8000";
};

export default getApiBaseUrl;
