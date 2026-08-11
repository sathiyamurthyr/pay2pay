"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, AlertCircle, ArrowRight } from "lucide-react";

export default function AdminStandaloneBeneficiaryRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/retailer/customers");
    }, 2000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="p-8 max-w-xl mx-auto mt-12">
      <div className="p-8 rounded-3xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 text-slate-900 dark:text-white space-y-6 text-center shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-500 mx-auto flex items-center justify-center">
          <Shield className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-extrabold tracking-tight">
            Standalone Beneficiary Directory Disabled
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Beneficiaries are customer-owned financial entities. Accessing beneficiaries without an active customer context is prohibited under banking security rules.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-800 dark:text-amber-300 text-left flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <strong>Architecture Rule:</strong> Please search and select a customer from the Customer Directory, then view or add beneficiaries inside the Customer 360° Workspace.
          </div>
        </div>

        <p className="text-xs text-slate-500 font-mono">
          Redirecting to Customer Directory...
        </p>

        <button
          onClick={() => router.replace("/retailer/customers")}
          className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs inline-flex items-center justify-center gap-2 transition-all"
        >
          <span>Go to Customer Directory</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
