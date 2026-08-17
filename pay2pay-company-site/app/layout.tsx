import type { Metadata, Viewport } from "next";
import "./globals.css";
import { siteConfig } from "@/config/site-config";

export const viewport: Viewport = {
  themeColor: "#050B14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://pay2pay.in"),
  title: "Pay2Pay | Enterprise Digital Financial Services Platform",
  description:
    "Pay2Pay connects retailers, distributors, and service partners through a secure, high-throughput digital financial services ecosystem.",
  keywords: [
    "Pay2Pay",
    "Fintech",
    "Domestic Money Transfer",
    "BBPS",
    "Retailer Banking",
    "Digital Payments",
    "Virtual Accounts",
    "Enterprise Payouts",
  ],
  authors: [{ name: "Pay2Pay Financial Technologies Private Limited" }],
  creator: "Pay2Pay Financial Technologies",
  publisher: "Pay2Pay Financial Technologies",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://pay2pay.in",
    siteName: "Pay2Pay",
    title: "Pay2Pay | Enterprise Digital Financial Services Platform",
    description:
      "Pay2Pay connects retailers, distributors, and service partners through a secure, high-throughput digital financial services ecosystem.",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.png", type: "image/png" },
      { url: "/icon.png", type: "image/png", sizes: "192x192" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pay2Pay | Enterprise Digital Financial Services Platform",
    description:
      "Pay2Pay connects retailers, distributors, and service partners through a secure, high-throughput digital financial services ecosystem.",
  },
};

import { Navbar } from "@/components/header/Navbar";
import { Footer } from "@/components/footer/Footer";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col bg-[#050B14] text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        <Navbar />
        <main className="flex-grow flex flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
