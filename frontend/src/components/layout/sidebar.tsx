"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, Building2, Users, ShieldCheck, Key,
  ScrollText, Settings, UserCircle, CreditCard, ChevronRight, Network, ArrowLeftRight, Store
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Admin Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Company Telemetry", href: "/company-dashboard", icon: Building2 },
  { label: "Companies", href: "/companies", icon: Building2 },
  { label: "Org Telemetry", href: "/organization-dashboard", icon: Network },
  { label: "Hierarchy Tree", href: "/organization", icon: Network },
  { label: "Entity Transfers", href: "/organization/transfers", icon: ArrowLeftRight },
  { label: "Retailer Telemetry", href: "/retailer-dashboard", icon: Store },
  { label: "Retailers Directory", href: "/retailers", icon: Store },
  { label: "Users", href: "/users", icon: Users },
  { label: "Roles", href: "/roles", icon: ShieldCheck },
  { label: "Permissions", href: "/permissions", icon: Key },
  { label: "Audit Logs", href: "/audit-logs", icon: ScrollText },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Profile", href: "/profile", icon: UserCircle },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside className="w-64 glass-panel border-r border-slate-800 flex flex-col justify-between h-screen sticky top-0 bg-[#0b101d]">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base text-white tracking-wide">Pay2Pay Admin</h1>
            <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Enterprise v1.0
            </span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Core Modules
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                  isActive
                    ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-md shadow-blue-500/5 font-semibold"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", isActive ? "text-blue-400" : "text-slate-400")} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-blue-400" />}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60">
          <p className="text-xs text-slate-400">Multi-Tenant Platform</p>
          <p className="text-[11px] text-slate-500 mt-0.5">JWT Secured Isolation</p>
        </div>
      </div>
    </aside>
  );
};
