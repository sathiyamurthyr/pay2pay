"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { LogOut, Building, Search, Bell, Crown, Monitor } from "lucide-react";
import { MultiDeviceSessionModal } from "@/components/auth/multi-device-session-modal";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [showSessionModal, setShowSessionModal] = useState(false);

  const initials = user?.full_name
    ? user.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() ?? "A";

  return (
    <>
      {/* Multi-Device Session Manager Modal */}
      <MultiDeviceSessionModal
        isOpen={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        onProceed={() => setShowSessionModal(false)}
        userEmail={user?.email}
      />

      <header className="h-14 border-b border-[#E2E8F0] px-5 flex items-center justify-between sticky top-0 z-30 bg-white/90 backdrop-blur-md select-none shadow-xs">
        {/* Left: Tenant Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F1F5F9] border border-[#E2E8F0]">
            <Building className="w-3.5 h-3.5 text-[#2563EB]" />
            <span className="text-[11px] font-medium text-[#475569]">Tenant:</span>
            <span className="font-mono text-[12px] font-bold text-[#0F172A]">
              {user?.tenant_id ? user.tenant_id.substring(0, 8) + "…" : "PLATFORM"}
            </span>
          </div>

          {/* System Health */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-[#F0FDF4] border-[#BBF7D0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
            <span className="text-[11px] font-extrabold text-[#166534]">System Healthy</span>
          </div>
        </div>

        {/* Center: Global Search */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search transactions, UTR, PAN… (Ctrl+K)"
              className="w-full pl-9 pr-4 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[12px] text-[#334155] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all font-medium"
            />
          </div>
        </div>

        {/* Right: Actions & Profile */}
        <div className="flex items-center gap-3">
          {/* Platform Admin Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] text-[#1E40AF]">
            <Crown className="w-3.5 h-3.5 text-[#2563EB]" />
            <span className="text-[11px] font-extrabold tracking-wide">Platform Admin</span>
          </div>

          {/* Active Sessions Monitor Button */}
          <button
            onClick={() => setShowSessionModal(true)}
            className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#FCD34D] bg-[#FFFBEB] text-[#92400E] hover:bg-[#FEF3C7] hover:border-[#F59E0B] transition-all cursor-pointer group"
            title="Manage Active Device Sessions"
          >
            <Monitor className="w-3.5 h-3.5 text-[#D97706]" />
            <span className="text-[11px] font-extrabold hidden sm:inline">Sessions</span>
            {/* Badge: 3 active sessions */}
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#DC2626] text-white text-[9px] font-extrabold flex items-center justify-center border border-white">
              3
            </span>
          </button>

          {/* Notifications */}
          <button
            className="relative p-2 rounded-lg text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-all"
            title="Notification Center"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 border border-white" />
          </button>

          {/* Divider */}
          <div className="h-6 w-px bg-[#E2E8F0]" />

          {/* User Profile */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-[13px] text-white shadow-2xs bg-[#2563EB]">
              {initials}
            </div>
            <div className="text-left hidden lg:block">
              <p className="text-[12px] font-extrabold text-[#0F172A] leading-tight">
                {user?.full_name || user?.email || "Platform Admin"}
              </p>
              <span className="text-[10px] font-bold text-[#2563EB]">PLATFORM ADMIN</span>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg border border-transparent hover:border-[#FCA5A5] transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>
    </>
  );
};

export default Navbar;
