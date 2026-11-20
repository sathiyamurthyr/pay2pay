"use client";

import React from "react";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { ShieldAlert, KeyRound, Server } from "lucide-react";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";
import "@/app/admin.css";

export default function AdminLoginPage() {
  const branding = useCompanyBranding();

  return (
    <div className="admin-portal-theme min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col justify-between overflow-x-hidden relative select-none" data-portal="admin">
      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full">
          {/* Left Column — Hero / Marketing (Hidden on Mobile) */}
          <div className="hidden lg:flex lg:col-span-6 flex-col justify-center space-y-6 pr-4">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border w-fit"
              style={{
                backgroundColor: branding.primary_colour ? `${branding.primary_colour}10` : "rgba(37, 99, 235, 0.08)",
                borderColor: branding.primary_colour ? `${branding.primary_colour}30` : "rgba(37, 99, 235, 0.2)"
              }}
            >
              <ShieldAlert className="w-4 h-4" style={{ color: branding.primary_colour || "#2563EB" }} />
              <span className="text-xs font-bold" style={{ color: branding.primary_colour || "#2563EB" }}>
                RESTRICTED ACCESS · {branding.company_name || branding.display_name || "Enterprise"} Admin Security Zone
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-[#0F172A] leading-tight">
                Enterprise Admin & <br />
                <span
                  className="bg-clip-text text-transparent font-black"
                  style={{
                    backgroundImage: `linear-gradient(to right, ${branding.primary_colour || "#2563EB"}, ${branding.secondary_colour || "#1E40AF"})`
                  }}
                >
                  Security Control Center
                </span>
              </h1>
              <p className="text-sm text-[#475569] leading-relaxed max-w-md">
                Full platform administration, compliance oversight, financial risk controls, tenant policy definitions, and audit log inspection.
              </p>
            </div>

            {/* Feature Pills */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex items-start gap-3">
                <div
                  className="p-2 rounded-xl shrink-0"
                  style={{
                    backgroundColor: branding.primary_colour ? `${branding.primary_colour}15` : "rgba(37, 99, 235, 0.1)",
                    color: branding.primary_colour || "#2563EB"
                  }}
                >
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#0F172A]">Privileged RBAC</h4>
                  <p className="text-[11px] text-[#64748B]">Strict multi-factor access control</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex items-start gap-3">
                <div
                  className="p-2 rounded-xl shrink-0"
                  style={{
                    backgroundColor: branding.secondary_colour ? `${branding.secondary_colour}15` : "rgba(30, 64, 175, 0.1)",
                    color: branding.secondary_colour || "#1E40AF"
                  }}
                >
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#0F172A]">System Audit Logs</h4>
                  <p className="text-[11px] text-[#64748B]">Immutable ledger transaction trace</p>
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
