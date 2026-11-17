"use client";

import React, { Suspense } from "react";
import { PayInStatusView } from "@/components/payin/PayInStatusView";
import { RefreshCw } from "lucide-react";

export default function PublicPayInStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-slate-200">
          <RefreshCw className="w-10 h-10 text-blue-400 animate-spin mb-4" />
          <p className="text-sm font-semibold tracking-wide">
            Loading Official Payment Receipt...
          </p>
        </div>
      }
    >
      <PayInStatusView />
    </Suspense>
  );
}
