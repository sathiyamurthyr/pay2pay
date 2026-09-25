"use client";

import React, { useEffect } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Sales Portal Application Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F5F6FA] flex flex-col items-center justify-center p-4 text-[#1F2937]">
      <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-3xl p-8 text-center shadow-sm space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#FEE2E2] border border-[#DC2626]/20 text-[#DC2626] flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#DC2626] bg-[#FEE2E2] px-3 py-1 rounded-full">
            System Alert
          </span>
          <h1 className="text-2xl font-black text-[#1F2937] mt-3">An Error Occurred</h1>
          <p className="text-xs text-[#6B7280] mt-1.5 leading-relaxed">
            {error?.message || "An unexpected error occurred while processing your sales portal request."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#94003A] hover:bg-[#78002F] text-white text-xs font-bold shadow-sm transition"
          >
            <RefreshCw className="w-4 h-4 text-[#E7B631]" />
            <span>Try Again</span>
          </button>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#4B5563] border border-[#D1D5DB] text-xs font-bold transition"
          >
            <Home className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
