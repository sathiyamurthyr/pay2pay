import { headers } from "next/headers";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./(dashboard)/retailer/payin/payin.css";
import Providers from "./providers";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const headersList = await headers();
    const forwardedHost = headersList.get("x-forwarded-host") || "";
    const rawHost = headersList.get("host") || "";
    const host = (forwardedHost || rawHost).toLowerCase();
    const port = host.includes(":") ? host.split(":")[1] : "";

    if (host.includes("smspay") || port === "4002") {
      return {
        title: {
          default: "SMSPAY FinTech Retailer Platform",
          template: "%s | SMSPAY",
        },
        description: "Enterprise Merchant Banking & Settlement Terminal - SMSPAY",
        icons: {
          icon: [
            { url: "/branding/smspay-mark.svg", type: "image/svg+xml" },
            { url: "/branding/favicon.png", type: "image/png" },
            { url: "/favicon.ico" },
          ],
          shortcut: "/branding/smspay-mark.svg",
          apple: "/branding/smspay-mark.svg",
        },
        manifest: "/site.webmanifest",
      };
    }

    if (host.includes("near4you") || port === "4001") {
      return {
        title: {
          default: "Near4You FinTech Retailer Platform",
          template: "%s | Near4You",
        },
        description: "Enterprise Merchant Banking & Settlement Terminal - Near4You",
        icons: {
          icon: [
            { url: "/branding/logo.svg", type: "image/svg+xml" },
            { url: "/branding/favicon.png", type: "image/png" },
            { url: "/favicon.ico" },
          ],
          shortcut: "/favicon.ico",
          apple: "/branding/logo.svg",
        },
        manifest: "/site.webmanifest",
      };
    }

    // Default / Pay2Pay (pay2pay.in, port 3000, port 4003, or default)
    return {
      title: {
        default: "Pay2Pay FinTech Retailer Platform",
        template: "%s | Pay2Pay",
      },
      description: "Enterprise Merchant Banking & Settlement Terminal - Pay2Pay",
      icons: {
        icon: [
          { url: "/branding/pay2pay-logo.png", type: "image/png" },
          { url: "/branding/favicon-32x32.png", sizes: "32x32", type: "image/png" },
          { url: "/branding/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        ],
        shortcut: "/branding/pay2pay-logo.png",
        apple: "/branding/pay2pay-logo.png",
      },
      manifest: "/site.webmanifest",
    };
  } catch {}

  // Fallback default: Pay2Pay
  return {
    title: {
      default: "Pay2Pay FinTech Retailer Platform",
      template: "%s | Pay2Pay",
    },
    description: "Enterprise Merchant Banking & Settlement Terminal - Pay2Pay",
    icons: {
      icon: [
        { url: "/branding/pay2pay-logo.png", type: "image/png" },
        { url: "/branding/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/branding/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      ],
      shortcut: "/branding/pay2pay-logo.png",
      apple: "/branding/pay2pay-logo.png",
    },
    manifest: "/site.webmanifest",
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning style={{ overflowX: "hidden", maxWidth: "100vw" }}>
      <body className="antialiased min-h-screen bg-[#FFFFFF] text-[var(--text-primary,#0F172A)]" suppressHydrationWarning style={{ overflowX: "hidden", maxWidth: "100vw" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
