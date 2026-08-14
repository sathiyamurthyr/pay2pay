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
    const rawUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    const cleanUrl = rawUrl.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
    return [
      {
        source: "/api/v1/:path*",
        destination: `${cleanUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
