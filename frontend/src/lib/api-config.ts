export const getApiBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    if (window.location.hostname.includes("near4you.store")) {
      return "https://api.near4you.store/api/v1";
    }
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
