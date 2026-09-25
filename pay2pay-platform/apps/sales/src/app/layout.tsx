import type { Metadata } from "next";
import "./globals.css";
import { SalesAuthProvider } from "@/lib/auth";
import { QueryProvider } from "@/components/providers/query-provider";

export const metadata: Metadata = {
  title: "Pay2Pay Sales Portal | Tenant-Isolated Field & Hierarchy Operations",
  description: "Enterprise Sales & Hierarchy Portal for Pay2Pay Payment Platform with strict backend tenant isolation and controlled hierarchy visibility.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-900 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        <QueryProvider>
          <SalesAuthProvider>
            {children}
          </SalesAuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
