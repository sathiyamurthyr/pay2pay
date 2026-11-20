import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host") || "";
  const rawHost = request.headers.get("host") || "";
  const host = (forwardedHost || rawHost).toLowerCase();
  const port = host.includes(":") ? host.split(":")[1] : "";

  let manifest;

  if (host.includes("smspay") || port === "4002") {
    manifest = {
      name: "SMSPAY FinTech Platform",
      short_name: "SMSPAY",
      description: "Enterprise Merchant Banking & Settlement Terminal - SMSPAY",
      icons: [
        {
          src: "/branding/smspay-favicon-32x32.png",
          sizes: "32x32",
          type: "image/png"
        },
        {
          src: "/branding/smspay-icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable"
        },
        {
          src: "/branding/smspay-icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable"
        }
      ],
      theme_color: "#059669",
      background_color: "#FFFFFF",
      display: "standalone"
    };
  } else if (host.includes("near4you") || port === "4001") {
    manifest = {
      name: "Near4You FinTech Platform",
      short_name: "Near4You",
      description: "Enterprise Merchant Banking & Settlement Terminal - Near4You",
      icons: [
        {
          src: "/branding/near4you-favicon-32x32.png",
          sizes: "32x32",
          type: "image/png"
        },
        {
          src: "/branding/icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable"
        },
        {
          src: "/branding/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable"
        }
      ],
      theme_color: "#A20A3A",
      background_color: "#FFFFFF",
      display: "standalone"
    };
  } else {
    manifest = {
      name: "Pay2Pay FinTech Platform",
      short_name: "Pay2Pay",
      description: "Enterprise Merchant Banking & Settlement Terminal - Pay2Pay",
      icons: [
        {
          src: "/branding/pay2pay-favicon-32x32.png",
          sizes: "32x32",
          type: "image/png"
        },
        {
          src: "/branding/pay2pay-icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable"
        },
        {
          src: "/branding/pay2pay-icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable"
        }
      ],
      theme_color: "#2563EB",
      background_color: "#FFFFFF",
      display: "standalone"
    };
  }

  return NextResponse.json(manifest, {
    status: 200,
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200"
    }
  });
}
