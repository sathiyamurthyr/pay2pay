import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  title: "Pay2Pay FinTech Retailer Platform",
  description: "Enterprise Merchant Banking & Settlement Terminal",
};

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
    <html lang="en" className="dark" suppressHydrationWarning style={{ overflowX: "hidden", maxWidth: "100vw" }}>
      <body className="antialiased min-h-screen bg-slate-950 text-slate-100" suppressHydrationWarning style={{ overflowX: "hidden", maxWidth: "100vw" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
