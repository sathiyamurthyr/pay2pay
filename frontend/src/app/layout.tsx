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
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-[#090d16] text-slate-100">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
