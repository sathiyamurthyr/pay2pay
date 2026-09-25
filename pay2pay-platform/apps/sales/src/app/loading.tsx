import React from "react";
import { Loader2 } from "lucide-react";

export default function GlobalLoadingPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-[#1F2937]">
      <div className="w-12 h-12 rounded-2xl bg-[#F8E6EE] border border-[#94003A]/20 flex items-center justify-center text-[#94003A] mb-4 shadow-sm animate-pulse">
        <Loader2 className="w-6 h-6 animate-spin text-[#94003A]" />
      </div>
      <div className="text-sm font-bold text-[#1F2937]">Loading Pay2Pay Portal...</div>
      <div className="text-xs text-[#6B7280] mt-1 font-medium">Resolving tenant hierarchy & security context</div>
    </div>
  );
}
