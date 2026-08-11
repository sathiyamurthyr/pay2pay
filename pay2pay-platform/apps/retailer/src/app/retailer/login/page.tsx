import React from "react";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { ShieldCheck, Zap, Lock } from "lucide-react";

export default function RetailerLoginPage() {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col justify-between overflow-x-hidden relative select-none">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/15 rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/15 rounded-full filter blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full">
          {/* Left Column — Hero / Marketing (Hidden on Mobile) */}
          <div className="hidden lg:flex lg:col-span-6 flex-col justify-center space-y-6 pr-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 w-fit backdrop-blur-md">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-slate-300">
                RBI Compliant · Enterprise PPI Portal
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Retailer Business <br />
                <span className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-200 bg-clip-text text-transparent">
                  Workstation Portal
                </span>
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed max-w-md">
                Empowering financial retailers across India with real-time DMT, AEPS, BBPS, and instant multi-channel settlements.
              </p>
            </div>

            {/* Feature Pills */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex items-start gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Instant Payouts</h4>
                  <p className="text-[11px] text-slate-400">Sub-second IMPS & NEFT settlements</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Biometric Auth</h4>
                  <p className="text-[11px] text-slate-400">UIDAI RD Service & FIDO2 Passkey</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column — Auth Panel Card */}
          <div className="lg:col-span-6 flex justify-center w-full">
            <div className="w-full max-w-md">
              <AuthPanel portalRole="RETAILER" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
