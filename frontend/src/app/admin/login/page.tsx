import React from "react";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { ShieldAlert, KeyRound, Server } from "lucide-react";

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col justify-between overflow-x-hidden relative select-none">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/15 rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/15 rounded-full filter blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full">
          {/* Left Column — Hero / Marketing (Hidden on Mobile) */}
          <div className="hidden lg:flex lg:col-span-6 flex-col justify-center space-y-6 pr-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-950/60 border border-red-800/80 w-fit backdrop-blur-md">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span className="text-xs font-bold text-red-300">
                RESTRICTED ACCESS · Pay2Pay Admin Security Zone
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Enterprise Admin & <br />
                <span className="bg-gradient-to-r from-red-400 via-amber-400 to-yellow-300 bg-clip-text text-transparent">
                  Security Control Center
                </span>
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed max-w-md">
                Full platform administration, compliance oversight, financial risk controls, tenant policy definitions, and audit log inspection.
              </p>
            </div>

            {/* Feature Pills */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex items-start gap-3">
                <div className="p-2 rounded-xl bg-red-500/10 text-red-400 shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Privileged RBAC</h4>
                  <p className="text-[11px] text-slate-400">Strict multi-factor access control</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">System Audit Logs</h4>
                  <p className="text-[11px] text-slate-400">Immutable ledger transaction trace</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column — Auth Panel Card */}
          <div className="lg:col-span-6 flex justify-center w-full">
            <div className="w-full max-w-md">
              <AuthPanel portalRole="ADMIN" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
