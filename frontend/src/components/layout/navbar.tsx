"use client";

import React from "react";
import { useAuth } from "@/lib/auth";
import { LogOut, User, Building, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 glass-panel border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-40 bg-[#090d16]/90 backdrop-blur-md">
      {/* Active Tenant Indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <Building className="w-3.5 h-3.5 text-blue-400" />
          <span>Tenant:</span>
          <span className="font-mono font-semibold text-blue-400">
            {user?.tenant_id ? user.tenant_id.substring(0, 8) + "..." : "PLATFORM"}
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 live-pulse"></span>
          <span>System Healthy</span>
        </div>
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 font-bold text-sm">
            {user?.email ? user.email.charAt(0).toUpperCase() : "A"}
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-200">{user?.full_name || user?.email || "Platform Admin"}</p>
            <div className="flex items-center gap-1 justify-end">
              <Shield className="w-3 h-3 text-indigo-400" />
              <span className="text-[10px] text-slate-400">{user?.roles?.[0] || "PLATFORM_ADMIN"}</span>
            </div>
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={logout} className="text-slate-400 hover:text-rose-400">
          <LogOut className="w-4 h-4 mr-1.5" />
          Logout
        </Button>
      </div>
    </header>
  );
};
