"use client";

import React from "react";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { ShieldAlert, KeyRound, Server } from "lucide-react";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";

export default function AdminLoginPage() {
  const branding = useCompanyBranding();

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#292329] flex flex-col justify-between overflow-x-hidden relative select-none">
      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full">
          {/* Left Column — Hero / Marketing (Hidden on Mobile) */}
          <div className="hidden lg:flex lg:col-span-6 flex-col justify-center space-y-6 pr-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFF0F4] border border-[#FFD6E2] w-fit">
              <ShieldAlert className="w-4 h-4 text-[#A20A3A]" />
              <span className="text-xs font-bold text-[#A20A3A]">
                RESTRICTED ACCESS · {branding.company_name} Admin Security Zone
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-[#292329] leading-tight">
                Enterprise Admin & <br />
                <span className="bg-gradient-to-r from-[#A20A3A] via-[#C42555] to-[#EDC11E] bg-clip-text text-transparent">
                  Security Control Center
                </span>
              </h1>
              <p className="text-sm text-[#625B60] leading-relaxed max-w-md">
                Full platform administration, compliance oversight, financial risk controls, tenant policy definitions, and audit log inspection.
              </p>
            </div>

            {/* Feature Pills */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-2xl bg-[#FAF8F9] border border-[#E8E2E5] flex items-start gap-3">
                <div className="p-2 rounded-xl bg-[#FFF0F4] text-[#A20A3A] shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#292329]">Privileged RBAC</h4>
                  <p className="text-[11px] text-[#625B60]">Strict multi-factor access control</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#FAF8F9] border border-[#E8E2E5] flex items-start gap-3">
                <div className="p-2 rounded-xl bg-[#FFF8DC] text-[#EDC11E] shrink-0">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#292329]">System Audit Logs</h4>
                  <p className="text-[11px] text-[#625B60]">Immutable ledger transaction trace</p>
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
