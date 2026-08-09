"use client";

import React from "react";
import { HeroSection } from "@/components/auth/HeroSection";
import { AuthPanel } from "@/components/auth/AuthPanel";

export default function EnterpriseLoginPage() {
  return (
    <main className="w-full h-screen max-h-screen overflow-hidden bg-slate-950 font-sans antialiased flex flex-col lg:grid lg:grid-cols-12 2xl:max-w-[2560px] 2xl:mx-auto">
      {/* Left 60% Hero Section (Visible on LG+ desktop & 4K screens) */}
      <div className="hidden lg:block lg:col-span-7 xl:col-span-7 2xl:col-span-7 h-full w-full overflow-hidden">
        <HeroSection />
      </div>

      {/* Right 40% Authentication Panel (Full width on Mobile/Tablet, 40% on Desktop & 4K) */}
      <div className="w-full lg:col-span-5 xl:col-span-5 2xl:col-span-5 h-full overflow-y-auto lg:overflow-hidden">
        <AuthPanel />
      </div>
    </main>
  );
}
