import { headers } from "next/headers";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  try {
    const headersList = await headers();
    const host = (headersList.get("host") || "").toLowerCase();

    if (host.includes("pay2pay")) {
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
  } catch {}

  // Default: Near 4 You
  return {
    title: {
      default: "Near4You FinTech Retailer Platform",
      template: "%s | Near4You",
    },
    description: "Enterprise Merchant Banking & Settlement Terminal - Near 4 You",
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
      <body className="antialiased min-h-screen bg-[#FFFFFF] text-[#292329]" suppressHydrationWarning style={{ overflowX: "hidden", maxWidth: "100vw" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
