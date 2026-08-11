"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { RetailerLayout } from "@/components/layout/retailer-layout";

const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (DEV_BYPASS || !mounted) return;
    if (!loading && !user) {
      router.push("/retailer/login");
    }
  }, [user, loading, router, mounted]);

  // Render RetailerLayout during SSR & pre-hydration to guarantee 100% server/client HTML tree match
  if (!mounted) {
    return <RetailerLayout>{children}</RetailerLayout>;
  }

  if (!DEV_BYPASS && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4 p-8 bg-white rounded-2xl shadow-lg border border-[#E5E7EB]">
          <div className="w-10 h-10 border-[3px] border-[#2563EB] border-t-transparent rounded-full animate-spin" />
          <div className="text-center">
            <p className="text-[14px] font-bold text-[#111827]">Authenticating…</p>
            <p className="text-[11px] text-[#6B7280] mt-1 font-mono">Pay2Pay Retailer Platform</p>
          </div>
        </div>
      </div>
    );
  }

  return <RetailerLayout>{children}</RetailerLayout>;
}
