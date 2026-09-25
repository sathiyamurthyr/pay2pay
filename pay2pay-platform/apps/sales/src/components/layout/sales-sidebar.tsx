"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSalesAuth } from "@/lib/auth";
import {
  LayoutDashboard, Users, Store, Network, Receipt, CreditCard,
  Sliders, Activity, FileText, UserCircle, LogOut, ShieldCheck,
  Building2, Layers, ChevronRight, Sparkles, Zap, QrCode, X,
  UserPlus, ClipboardCheck, Video, BadgeCheck, UserCog
} from "lucide-react";

interface NavCategory {
  category: string;
  items: {
    label: string;
    href: string;
    icon: React.ElementType;
    badge?: string;
  }[];
}

const SALES_NAV: NavCategory[] = [
  {
    category: "Overview",
    items: [
      { label: "Sales Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Registrations & KYC Hub", href: "/registrations", icon: ClipboardCheck, badge: "Status" },
    ],
  },
  {
    category: "Register New Entity",
    items: [
      { label: "Register Super Distributor", href: "/register/super-distributor", icon: UserCog },
      { label: "Register Distributor", href: "/register/distributor", icon: UserPlus },
      { label: "Register Retailer", href: "/register/retailer", icon: Store, badge: "KYC" },
    ],
  },
  {
    category: "Hierarchy Management",
    items: [
      { label: "Super Distributors", href: "/hierarchy/super-distributors", icon: Users },
      { label: "Distributors", href: "/hierarchy/distributors", icon: Layers },
      { label: "Retailers Network", href: "/hierarchy/retailers", icon: Store, badge: "Live" },
    ],
  },
  {
    category: "Transactions & Settlements",
    items: [
      { label: "Transaction Hub", href: "/transactions", icon: Receipt },
      { label: "POS Ledger & MDR", href: "/transactions/pos", icon: CreditCard, badge: "MDR" },
    ],
  },
  {
    category: "POS Hardware & MDR",
    items: [
      { label: "POS Machines", href: "/pos-machines", icon: QrCode },
      { label: "POS MDR Setup", href: "/pos-mdr", icon: Sliders, badge: "Config" },
    ],
  },
  {
    category: "Field Operations & Reports",
    items: [
      { label: "Field Activity & Retention", href: "/activity", icon: Activity, badge: "Alerts" },
      { label: "Reports Center", href: "/reports", icon: FileText },
    ],
  },
];

export const SalesSidebar: React.FC<{ isOpen?: boolean; onClose?: () => void }> = ({
  isOpen = false,
  onClose,
}) => {
  const pathname = usePathname();
  const { user, logout } = useSalesAuth();

  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  const sidebarContent = (
    <div className="w-64 bg-slate-950 border-r border-slate-800/80 flex flex-col shrink-0 h-full select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <Link href="/dashboard" onClick={handleLinkClick} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-600/30">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
              Pay2Pay <span className="text-indigo-400">Sales</span>
            </div>
            <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              Field Force Portal
            </div>
          </div>
        </Link>

        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Tenant Context Badge */}
      <div className="p-3 mx-3 mt-3 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-900/40">
        <div className="flex items-center gap-2 text-indigo-400 text-[11px] font-semibold">
          <Building2 className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{user?.tenant_name || "Active Tenant"}</span>
        </div>
        <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
          <span>Scope:</span>
          <span className="font-mono text-indigo-300">
            {user?.mappings_count === 0 ? "Full Tenant" : `${user?.mappings_count} Scoped`}
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {SALES_NAV.map((cat, idx) => (
          <div key={idx} className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {cat.category}
            </div>
            <div className="space-y-0.5 pt-1">
              {cat.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleLinkClick}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-semibold"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/70"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950">
        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
          <Link href="/profile" onClick={handleLinkClick} className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md">
              {(user?.full_name || "S").charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-white truncate">
                {user?.full_name || "Sales Executive"}
              </div>
              <div className="text-[10px] text-slate-400 font-mono truncate">
                {user?.employee_code || "SALES"}
              </div>
            </div>
          </Link>

          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />
          {/* Drawer Panel */}
          <div className="relative z-10 h-full shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
