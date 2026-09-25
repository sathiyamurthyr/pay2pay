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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 animate-pulse">
          <Network className="w-6 h-6 animate-spin" />
        </div>
        <div className="text-sm font-semibold tracking-wide">Validating Sales Session & Tenant Scope...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <SalesShell>{children}</SalesShell>;
}
