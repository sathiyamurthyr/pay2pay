export const getApiBaseUrl = (): string => {
  if (typeof window !== "undefined") {
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
  return "https://api.pay2pay.in/api/v1";
};

export default getApiBaseUrl;
