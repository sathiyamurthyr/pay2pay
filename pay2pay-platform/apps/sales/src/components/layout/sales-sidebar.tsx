"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSalesAuth } from "@/lib/auth";
import {
  LayoutDashboard, Users, Store, Network, Receipt, CreditCard,
  Sliders, Activity, FileText, LogOut, Building2, Layers,
  QrCode, X, UserPlus, ClipboardCheck, UserCog
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
    category: "OVERVIEW",
    items: [
      { label: "Sales Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Registrations & KYC Hub", href: "/registrations", icon: ClipboardCheck, badge: "LIVE" },
    ],
  },
  {
    category: "REGISTER NEW ENTITY",
    items: [
      { label: "Register Super Distributor", href: "/register/super-distributor", icon: UserCog },
      { label: "Register Distributor", href: "/register/distributor", icon: UserPlus },
      { label: "Register Retailer", href: "/register/retailer", icon: Store, badge: "KYC" },
    ],
  },
  {
    category: "HIERARCHY MANAGEMENT",
    items: [
      { label: "Super Distributors", href: "/hierarchy/super-distributors", icon: Users },
      { label: "Distributors", href: "/hierarchy/distributors", icon: Layers },
      { label: "Retailers Network", href: "/hierarchy/retailers", icon: Store },
    ],
  },
  {
    category: "TRANSACTIONS & SETTLEMENTS",
    items: [
      { label: "Transaction Hub", href: "/transactions", icon: Receipt },
      { label: "POS Ledger & MDR", href: "/transactions/pos", icon: CreditCard, badge: "MDR" },
    ],
  },
  {
    category: "POS HARDWARE & MDR",
    items: [
      { label: "POS Machines", href: "/pos-machines", icon: QrCode },
      { label: "POS MDR Setup", href: "/pos-mdr", icon: Sliders, badge: "Config" },
    ],
  },
  {
    category: "ANALYTICS & AUDIT",
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

  const userInitial = (user?.full_name || "Sales User").charAt(0).toUpperCase();

  const entityName = user?.company_name || user?.tenant_name || "SUPER REX PRODUCTS PVT LTD";
  const scopeText = (() => {
    if (!user) return "Authorized Scope";
    if (user.mappings_count === 0 || (user as any).is_full_tenant || (user as any).scope_type === "FULL_TENANT") {
      return "Full Tenant";
    }
    if (typeof user.mappings_count === "number" && user.mappings_count > 0) {
      return `${user.mappings_count} Mapped Entities`;
    }
    return "Full Tenant";
  })();

  const renderBadge = (badge: string) => {
    const badgeUpper = badge.toUpperCase();
    if (badgeUpper === "KYC") {
      return (
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#FFF7D6] text-[#8A6800] border border-[#EDC11E]">
          {badge}
        </span>
      );
    }
    if (badgeUpper === "LIVE") {
      return (
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]">
          {badge}
        </span>
      );
    }
    return (
      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#F8E6EE] text-[#94003A] border border-[#F3C4D7]">
        {badge}
      </span>
    );
  };

  const sidebarContent = (
    <div className="w-64 bg-[#FFFFFF] border-r border-[#E5E7EB] flex flex-col shrink-0 h-full select-none shadow-sm">
      {/* ── Brand Header ── */}
      <div className="p-4 border-b border-[#F3F4F6] flex items-center justify-between">
        <Link href="/dashboard" onClick={handleLinkClick} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-[#94003A] flex items-center justify-center text-[#EDC11E] font-bold shadow-sm transition group-hover:scale-105">
            <Network className="w-5 h-5 text-[#EDC11E]" />
          </div>
          <div>
            <div className="font-extrabold text-base tracking-tight text-[#94003A] flex items-center gap-1.5">
              Pay2Pay <span className="text-[#E7B631]">Sales</span>
            </div>
            <div className="text-[10px] uppercase font-bold text-[#6B7280] tracking-wider">
              FIELD FORCE PORTAL
            </div>
          </div>
        </Link>

        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-[#6B7280] hover:text-[#1F2937] hover:bg-[#F8E6EE] transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ── Tenant / Company Box ── */}
      <div className="p-3 mx-3 mt-3 rounded-2xl bg-[#F8E6EE] border border-[#F3C4D7]">
        <div className="flex items-center gap-2 text-[#94003A] text-xs font-bold">
          <Building2 className="w-4 h-4 text-[#94003A] shrink-0" />
          <span className="truncate" title={entityName}>{entityName}</span>
        </div>
        <div className="text-[11px] text-[#6B7280] mt-1.5 flex items-center justify-between">
          <span className="font-medium">Scope:</span>
          <span className="font-semibold text-[#94003A]">
            {scopeText}
          </span>
        </div>
      </div>

      {/* ── Navigation List ── */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {SALES_NAV.map((cat, idx) => (
          <div key={idx} className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
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
                    className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                      isActive
                        ? "bg-[#F8E6EE] text-[#94003A] font-bold border-l-4 border-[#94003A] shadow-none"
                        : "bg-transparent text-[#4B5563] hover:bg-[#F8E6EE] hover:text-[#94003A]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 transition ${isActive ? "text-[#94003A]" : "text-[#6B7280] group-hover:text-[#94003A]"}`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <div className="shrink-0 ml-2">
                        {renderBadge(item.badge)}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── User Profile Footer Card ── */}
      <div className="p-3 border-t border-[#F3F4F6] bg-[#FFFFFF]">
        <div className="p-2.5 rounded-xl bg-[#F5F6FA] border border-[#E5E7EB] flex items-center justify-between">
          <Link href="/profile" onClick={handleLinkClick} className="flex items-center gap-2.5 overflow-hidden flex-1 group">
            <div className="w-8 h-8 rounded-lg bg-[#94003A] text-[#EDC11E] flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
              {userInitial}
            </div>
            <div className="overflow-hidden min-w-0">
              <div className="text-xs font-bold text-[#1F2937] truncate group-hover:text-[#94003A] transition">
                {user?.full_name || "Sales User"}
              </div>
              <div className="text-[10px] text-[#6B7280] font-mono truncate">
                {user?.employee_code || user?.designation || "ASM-FIELD"}
              </div>
            </div>
          </Link>

          <button
            onClick={logout}
            className="p-1.5 text-[#6B7280] hover:text-red-600 hover:bg-red-50 rounded-lg transition shrink-0 ml-1"
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
