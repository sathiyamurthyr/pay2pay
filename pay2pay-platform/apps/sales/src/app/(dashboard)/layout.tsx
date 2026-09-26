"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSalesAuth } from "@/lib/auth";
import { SalesShell } from "@/components/layout/sales-shell";
import { RefreshCw, Network } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useSalesAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading && !user) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] flex flex-col items-center justify-center text-[#1F2937]">
        <div className="w-12 h-12 rounded-2xl bg-[#F8E6EE] border border-[#94003A]/20 flex items-center justify-center text-[#94003A] mb-4 animate-pulse">
          <Network className="w-6 h-6 animate-spin" />
        </div>
        <div className="text-sm font-bold tracking-wide text-[#1F2937]">Validating Sales Session & Tenant Scope...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <SalesShell>{children}</SalesShell>;
}
