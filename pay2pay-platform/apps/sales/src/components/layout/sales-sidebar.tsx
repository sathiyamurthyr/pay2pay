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
      { label: "Registrations & KYC Hub", href: "/registrations", icon: ClipboardCheck, badge: "Live" },
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
      { label: "Retailers Network", href: "/hierarchy/retailers", icon: Store },
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
      { label: "Field Activity & Retention", href: "/activity", icon: Activity },
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

  const userInitial = (user?.full_name || "Vikram").charAt(0).toUpperCase();

  const sidebarContent = (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 h-full select-none shadow-sm">
      {/* Brand Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <Link href="/dashboard" onClick={handleLinkClick} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#94003A] flex items-center justify-center text-[#E7B631] font-bold shadow-md">
            <Network className="w-5 h-5 text-[#E7B631]" />
          </div>
          <div>
            <div className="font-extrabold text-base tracking-tight text-[#94003A] flex items-center gap-1.5">
              Pay2Pay <span className="text-[#E7B631]">Sales</span>
            </div>
            <div className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">
              Field Force Portal
            </div>
          </div>
        </Link>

        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Tenant Context Badge */}
      <div className="p-3 mx-3 mt-3 rounded-2xl bg-[#F8E6EE] border border-pink-200/80">
        <div className="flex items-center gap-2 text-[#94003A] text-[11px] font-bold">
          <Building2 className="w-3.5 h-3.5 text-[#94003A] shrink-0" />
          <span className="truncate">{user?.tenant_name || "SUPER REX PRODUCTS PVT LTD"}</span>
        </div>
        <div className="text-[10px] text-gray-600 mt-1 flex items-center justify-between">
          <span>Scope:</span>
          <span className="font-semibold text-[#94003A]">
            {user?.mappings_count === 0 ? "Full Tenant" : `${user?.mappings_count} Mapped`}
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {SALES_NAV.map((cat, idx) => (
          <div key={idx} className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
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
                        ? "bg-[#F8E6EE] text-[#94003A] font-bold border-l-4 border-[#94003A] shadow-sm"
                        : "text-gray-600 hover:text-[#1F2937] hover:bg-[#F5F6FA]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? "text-[#94003A]" : "text-gray-400"}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          isActive
                            ? "bg-[#94003A] text-white"
                            : "bg-[#FEF3C7] text-[#92400E] border border-amber-200"
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
      <div className="p-3 border-t border-gray-100 bg-white">
        <div className="p-2.5 rounded-xl bg-[#F5F6FA] border border-gray-200 flex items-center justify-between">
          <Link href="/profile" onClick={handleLinkClick} className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-[#94003A] text-[#E7B631] flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
              {userInitial}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-[#1F2937] truncate">
                {user?.full_name || "Vikram Rathore"}
              </div>
              <div className="text-[10px] text-gray-500 font-mono truncate">
                {user?.employee_code || "SALES001"}
              </div>
            </div>
          </Link>

          <button
            onClick={logout}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
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
