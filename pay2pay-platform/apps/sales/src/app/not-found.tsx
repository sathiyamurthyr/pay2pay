"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, FileQuestion, Home } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#F5F6FA] flex flex-col items-center justify-center p-4 text-[#1F2937]">
      <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-3xl p-8 text-center shadow-sm space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#F8E6EE] border border-[#94003A]/20 text-[#94003A] flex items-center justify-center mx-auto">
          <FileQuestion className="w-8 h-8" />
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#94003A] bg-[#F8E6EE] px-3 py-1 rounded-full">
            404 Not Found
          </span>
          <h1 className="text-2xl font-black text-[#1F2937] mt-3">Page Not Found</h1>
          <p className="text-xs text-[#6B7280] mt-1.5 leading-relaxed">
            The requested Sales Portal page does not exist or has been relocated within your authorized hierarchy.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#94003A] hover:bg-[#78002F] text-white text-xs font-bold shadow-sm transition"
          >
            <Home className="w-4 h-4 text-[#E7B631]" />
            <span>Sales Dashboard</span>
          </Link>
          <Link
            href="/registrations"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#4B5563] border border-[#D1D5DB] text-xs font-bold transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Registrations</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
