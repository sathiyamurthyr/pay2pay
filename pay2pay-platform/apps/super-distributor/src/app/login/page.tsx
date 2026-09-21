"use client";

import React, { useState } from "react";
import { HeroSection } from "@/components/auth/HeroSection";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { Sparkles, ShieldCheck, Sun, Moon } from "lucide-react";

export default function SuperDistributorLoginPage() {
  const [darkMode, setDarkMode] = useState(true);

  return (
    <main
      className={`w-full min-h-screen min-h-[100dvh] font-sans antialiased flex flex-col lg:flex-row 2xl:max-w-[2560px] 2xl:mx-auto transition-colors duration-300 selection:bg-blue-500/30 selection:text-blue-200 ${
        darkMode ? "bg-slate-950 text-slate-50" : "bg-[#0A0E1A] text-slate-100"
      }`}
    >
      {/* ── Desktop Left Pane (58% Hero Section — hidden on mobile, sticky on desktop) ── */}
      <div className="hidden lg:flex lg:w-[58%] xl:w-[60%] 2xl:w-[62%] min-h-screen sticky top-0 h-screen overflow-hidden flex-col justify-between shrink-0 border-r border-slate-800/60 dark:border-slate-800/80">
        <HeroSection darkMode={darkMode} portalRole="SUPER_DISTRIBUTOR" />
      </div>

      {/* ── Mobile Top Header Bar (Shown only on < lg screens) ── */}
      <div className="lg:hidden w-full p-4 sm:p-6 bg-slate-950/80 backdrop-blur-xl border-b border-white/[0.08] flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 p-0.5 shadow-md shadow-blue-500/20 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <span className="text-xs font-black bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
                P2P
              </span>
            </div>
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold">
              <Sparkles className="w-3 h-3 text-blue-400" />
              <span>Super Distributor Workstation</span>
            </div>
            <h1 className="text-sm font-extrabold text-white tracking-tight leading-tight">
              Pay2Pay Enterprise
            </h1>
          </div>
        </div>

        {/* Theme Toggle Button for Mobile */}
        <button
          onClick={() => setDarkMode((prev) => !prev)}
          className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-blue-400 transition-colors flex items-center justify-center"
          title="Toggle Theme"
          aria-label="Toggle theme"
        >
          {darkMode ? <Sun className="w-4 h-4 text-blue-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
        </button>
      </div>

      {/* ── Right Auth Panel (Full width on mobile, 42% on desktop) ── */}
      <div className="w-full lg:w-[42%] xl:w-[40%] 2xl:w-[38%] min-h-screen flex flex-col justify-center items-center overflow-y-auto shrink-0 p-3 sm:p-6 lg:p-8">
        <div className="w-full max-w-md my-auto">
          <AuthPanel portalRole="SD" darkMode={darkMode} setDarkMode={setDarkMode} />
        </div>

        {/* Mobile Security Footer */}
        <div className="lg:hidden mt-6 mb-4 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>RBI Compliant & 256-Bit SSL Financial Encryption</span>
        </div>
      </div>
    </main>
  );
}
