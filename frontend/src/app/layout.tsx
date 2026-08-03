import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Retailer Enterprise Platform — Admin Portal",
  description: "Enterprise Multi-Tenant Swipe Settlement Admin Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className="antialiased min-h-screen bg-[#F8FAFC] text-[#111827]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
