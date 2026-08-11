import React from "react";
import { HeroSection } from "@/components/auth/HeroSection";
import AuthPanel from "@/components/auth/AuthPanel";

export default function RetailerLoginPage() {
  return (
    <main className="w-full h-screen overflow-hidden bg-[#0B0F19] text-slate-50 font-sans antialiased flex flex-col lg:flex-row">
      {/* Left 58% Hero Section — hidden on mobile, sticky on desktop */}
      <div className="hidden lg:flex lg:w-[58%] xl:w-[60%] 2xl:w-[62%] h-screen overflow-hidden flex-col justify-between shrink-0 border-r border-slate-800/80">
        <HeroSection />
      </div>

      {/* Right 42% Auth Panel — full width mobile, fixed right panel desktop */}
      <div className="w-full lg:w-[42%] xl:w-[40%] 2xl:w-[38%] h-screen flex flex-col shrink-0 bg-[#0B0F19] overflow-y-auto">
        <AuthPanel />
      </div>
    </main>
  );
}
