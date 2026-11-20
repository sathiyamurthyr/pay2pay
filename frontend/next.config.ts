import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    webpackBuildWorker: false,
  },
  async rewrites() {
    const rawUrl =
      process.env.INTERNAL_BACKEND_URL ||
      process.env.BACKEND_URL ||
      (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.startsWith("http")
        ? process.env.NEXT_PUBLIC_API_URL
        : "") ||
      "http://backend:8000";
    const cleanUrl = rawUrl.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
    return [
      {
        source: "/api/v1/:path*",
        destination: `${cleanUrl}/api/v1/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${cleanUrl}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
