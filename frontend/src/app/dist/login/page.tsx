"use client";

import React from "react";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { ShieldCheck, Users, Wallet } from "lucide-react";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";

export default function DistributorLoginPage() {
  const branding = useCompanyBranding();
  const brandPrimary = branding.primary_colour || "#A20A3A";
  const brandSecondary = branding.secondary_colour || "#EDC11E";
  const brandName = branding.display_name || "FinTech";

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#292329] flex flex-col justify-between overflow-x-hidden relative select-none">
      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full">
          {/* Left Column — Distributor Marketing Hero */}
          <div className="hidden lg:flex lg:col-span-6 flex-col justify-center space-y-6 pr-4">
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border w-fit"
              style={{
                backgroundColor: `${brandSecondary}15`,
                borderColor: `${brandSecondary}30`,
              }}
            >
              <ShieldCheck className="w-4 h-4" style={{ color: brandSecondary }} />
              <span className="text-xs font-semibold" style={{ color: brandPrimary }}>
                {brandName} Distributor Operations Hub
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-[#292329] leading-tight">
                {brandName} Distributor Portal <br />
                <span
                  className="bg-clip-text text-transparent font-black"
                  style={{
                    backgroundImage: `linear-gradient(to right, ${brandPrimary}, ${brandSecondary})`
                  }}
                >
                  Distributor Workspace
                </span>
              </h1>
              <p className="text-sm text-[#625B60] leading-relaxed max-w-md">
                Manage territory retail partners, process instant wallet top-ups, track settlement batches, and optimize distribution operations.
              </p>
            </div>

            {/* Feature Pills */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-[#FAF8F9] border border-[#E8E2E5] flex items-start gap-3">
                <div className="p-2 rounded-xl bg-[#FFF8DC] text-[#EDC11E] shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#292329]">Partner Management</h4>
                  <p className="text-[11px] text-[#625B60]">Onboard & monitor retail network</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FAF8F9] border border-[#E8E2E5] flex items-start gap-3">
                <div className="p-2 rounded-xl bg-[#FFF0F4] text-[#A20A3A] shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#292329]">Instant Top-ups</h4>
                  <p className="text-[11px] text-[#625B60]">Real-time wallet liquidity balance</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column — Shared Auth Panel */}
          <div className="lg:col-span-6 flex justify-center w-full">
            <div className="w-full max-w-md">
              <AuthPanel portalRole="DIST" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
