"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { RetailerMobileShell } from "@/components/layout/retailer-mobile-shell";

const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isRetailer } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Skip auth redirect entirely in dev bypass mode
    if (DEV_BYPASS) return;
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Loading spinner — only shown in production auth flow
  if (!DEV_BYPASS && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9]">
        <div className="flex flex-col items-center gap-4 p-8 bg-white rounded-2xl shadow-lg border border-[#E2E8F0]">
          <div className="w-10 h-10 border-[3px] border-[#6C63FF] border-t-transparent rounded-full animate-spin" />
          <div className="text-center">
            <p className="text-[14px] font-bold text-[#0F172A]">Authenticating…</p>
            <p className="text-[11px] text-[#94A3B8] mt-1 font-mono">Enterprise Session Verification</p>
          </div>
        </div>
      </div>
    );
  }

  // In production: hide content while redirecting
  if (!DEV_BYPASS && !user) return null;

  // ── Retailer Mode: Render Dedicated Mobile Agent App Shell ──
  if (isRetailer) {
    return <RetailerMobileShell>{children}</RetailerMobileShell>;
  }

  // ── Platform Admin Mode: Render Desktop Command Center Layout ──
  return (
    <div className="flex min-h-screen bg-[#F1F5F9] text-[#0F172A]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 p-5 lg:p-6 overflow-y-auto custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
