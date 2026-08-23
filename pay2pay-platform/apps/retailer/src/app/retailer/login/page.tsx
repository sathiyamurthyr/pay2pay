"use client";

import React, { useState } from "react";
import { HeroSection } from "@/components/auth/HeroSection";
import { AuthPanel } from "@/components/auth/AuthPanel";

export default function RetailerLoginPage() {
  const [darkMode, setDarkMode] = useState(true);

  return (
    <main className={`w-full min-h-screen min-h-[100dvh] font-sans antialiased flex flex-col lg:flex-row 2xl:max-w-[2560px] 2xl:mx-auto transition-colors duration-300 ${
      darkMode ? "bg-slate-950 text-slate-50" : "bg-slate-50 text-slate-900"
    }`}>
      {/* Left 58% Hero Section — hidden on mobile, sticky on desktop */}
      <div className="hidden lg:flex lg:w-[58%] xl:w-[60%] 2xl:w-[62%] min-h-screen sticky top-0 h-screen overflow-hidden flex-col justify-between shrink-0 border-r border-slate-800/40 dark:border-slate-800/60">
        <HeroSection darkMode={darkMode} />
      </div>

      {/* Right 42% Auth Panel — always full width mobile, scrollable on desktop */}
      <div className="w-full lg:w-[42%] xl:w-[40%] 2xl:w-[38%] min-h-screen flex flex-col justify-center overflow-y-auto shrink-0">
        <AuthPanel portalRole="RETAILER" darkMode={darkMode} setDarkMode={setDarkMode} />
      </div>
    </main>
  );
}
