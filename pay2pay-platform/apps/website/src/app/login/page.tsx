"use client";

import React from "react";
import { HeroSection } from "@/components/auth/HeroSection";
import { AuthPanel } from "@/components/auth/AuthPanel";

export default function EnterpriseLoginPage() {
  return (
    <main className="w-full min-h-screen bg-slate-950 text-slate-50 font-sans antialiased flex flex-col lg:flex-row 2xl:max-w-[2560px] 2xl:mx-auto">
      {/* Left 58% Hero Section — hidden on mobile, sticky on desktop */}
      <div className="hidden lg:flex lg:w-[58%] xl:w-[60%] 2xl:w-[62%] min-h-screen sticky top-0 h-screen overflow-hidden flex-col justify-between shrink-0">
        <HeroSection />
      </div>

      {/* Right 42% Auth Panel — always full width mobile, fixed right panel desktop */}
      <div className="w-full lg:w-[42%] xl:w-[40%] 2xl:w-[38%] min-h-screen flex flex-col shrink-0">
        <AuthPanel />
      </div>
    </main>
  );
}
