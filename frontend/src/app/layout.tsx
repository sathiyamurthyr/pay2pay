import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
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
    <html lang="en" className="light" style={{ overflowX: "hidden", maxWidth: "100vw" }}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body className="antialiased min-h-screen bg-[#F8FAFC] text-[#111827]" style={{ overflowX: "hidden", maxWidth: "100vw" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
