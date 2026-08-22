"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Building2, Users, ShieldCheck, Key,
  ScrollText, Settings, UserCircle, CreditCard, ChevronRight, ChevronDown, Network,
  ArrowLeftRight, Store, TrendingUp, Receipt, Code, Webhook, ShieldAlert, FileText,
  Sliders, UploadCloud, Cpu, BookOpen, Wallet, Scale, Send, BarChart3, Activity,
  Ticket, Landmark, GitMerge, CheckSquare, Bell, Zap, Fingerprint, Volume2, Music,
  Globe, Sparkles, Search, X, PanelLeftClose, PanelLeftOpen, AlertTriangle, Layers,
  Terminal,
} from "lucide-react";

import { useAuth } from "@/lib/auth";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

interface NavCategory {
  category: string;
  icon?: React.ElementType;
  items: NavItem[];
}

// ─── ADMIN PORTAL MENU STRUCTURE (Strict Governance & Administration) ───
const ADMIN_NAV: NavCategory[] = [
  {
    category: "Main",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    category: "Administration",
    items: [
      { label: "Company", href: "/companies", icon: Building2 },
      { label: "Organization", href: "/organization", icon: Network },
      { label: "RM", href: "/organization/transfers", icon: UserCircle },
      { label: "Super Distributor", href: "/retailers", icon: Store },
      { label: "Distributor", href: "/retailers", icon: Store },
      { label: "Retailer", href: "/retailers", icon: Store },
      { label: "Entity User", href: "/wallet-ledger/wallets", icon: Wallet },
      { label: "Manual Top-up", href: "/wallet-ledger/manual-topup", icon: ArrowLeftRight },
      { label: "POS Machine", href: "/machines", icon: CreditCard },
      { label: "Users", href: "/users", icon: Users },
      { label: "Roles", href: "/roles", icon: ShieldCheck },
    ],
  },
  {
    category: "Configuration",
    items: [
      { label: "Wallet", href: "/wallet-ledger/entity-wallets", icon: Wallet },
      { label: "Chart of Accounts", href: "/wallet-ledger/chart-of-accounts", icon: BookOpen },
      { label: "Settlement", href: "/payouts/gateways", icon: Receipt },
      { label: "Transactions", href: "/settlements/transactions", icon: TrendingUp },
      { label: "Commission", href: "/financial-config/rules", icon: BookOpen },
      { label: "Charges", href: "/financial-config/approvals", icon: Scale },
      { label: "Customer Policy", href: "/policies", icon: Sliders },
      { label: "Beneficiary Policy", href: "/policies/evaluator", icon: Sliders },
      { label: "Risk", href: "/fraud/rules", icon: ShieldAlert },
      { label: "AML", href: "/compliance/reports", icon: ShieldCheck },
      { label: "Notifications", href: "/notification-dashboard", icon: Bell },
      { label: "API", href: "/developer/api-keys", icon: Webhook },
      { label: "Security", href: "/settings/secrets", icon: Key },
    ],
  },
  {
    category: "Approvals",
    items: [
      { label: "KYC & Onboarding", href: "/approvals", icon: CheckSquare },
      { label: "Settlement", href: "/settlements/batches", icon: Receipt },
      { label: "Wallet Adjustments", href: "/wallet-ledger/wallets", icon: Wallet },
      { label: "Configuration", href: "/bpm/approvals", icon: CheckSquare },
      { label: "High Value", href: "/bpm/tasks", icon: AlertTriangle },
    ],
  },
  {
    category: "Monitoring",
    items: [
      { label: "Services", href: "/ops-dashboard", icon: Activity },
      { label: "API Logs", href: "/operations/api-logs", icon: Terminal },
      { label: "Queues", href: "/bpm/queues", icon: GitMerge },
      { label: "API", href: "/developer-dashboard", icon: Code },
      { label: "Wallet", href: "/wallet-ledger/reconciliation", icon: Wallet },
      { label: "Settlement", href: "/settlement-dashboard", icon: TrendingUp },
      { label: "Database", href: "/compliance-dashboard", icon: Landmark },
    ],
  },
  {
    category: "Reports",
    items: [
      { label: "Payout Report", href: "/retailer/dmt/reports", icon: FileText },
      { label: "Report Center", href: "/retailer/reports", icon: FileText },
      { label: "Settlement", href: "/settlement-processing/batches", icon: FileText },
      { label: "Wallet", href: "/settlement-processing/journals", icon: FileText },
      { label: "Retailers", href: "/retailer-dashboard", icon: BarChart3 },
      { label: "Machines", href: "/machine-dashboard", icon: CreditCard },
      { label: "Audit", href: "/compliance/audit-explorer", icon: ScrollText },
      { label: "Reconciliation", href: "/mis-dashboard", icon: Scale },
    ],
  },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const navigation = useMemo(() => {
    const email = (user?.email || "").toLowerCase();
    const roles = (user?.roles || []).map((r) => r.toLowerCase());
    const uType = (user?.user_type || "").toLowerCase();

    const isCrm = email.includes("crm") || roles.includes("crm_executive") || roles.includes("crm_manager") || uType.includes("crm");
    const isRm = email.includes("rm.") || email.startsWith("rm_") || roles.includes("regional_manager") || uType.includes("regional");
    const isFinance = roles.includes("finance") || roles.includes("settlement_mgr") || uType.includes("finance");
    const isCompliance = roles.includes("compliance") || uType.includes("compliance");

    if (isCrm) {
      const allowedLabels: Record<string, string[]> = {
        "Main": ["Dashboard"],
        "Administration": ["Super Distributor", "Distributor", "Retailer", "POS Machine"],
        "Configuration": ["Customer Policy", "Notifications"],
        "Approvals": ["KYC & Onboarding"],
        "Reports": ["Settlement", "Wallet", "Retailers", "Machines", "Audit", "Reconciliation"],
      };

      return ADMIN_NAV.map((cat) => {
        const allowed = allowedLabels[cat.category];
        if (!allowed) return null;
        const filteredItems = cat.items.filter((item) => allowed.includes(item.label));
        return filteredItems.length > 0 ? { ...cat, items: filteredItems } : null;
      }).filter(Boolean) as NavCategory[];
    }

    if (isRm) {
      const allowedLabels: Record<string, string[]> = {
        "Main": ["Dashboard"],
        "Administration": ["Organization", "RM", "Super Distributor", "Distributor", "Retailer", "POS Machine"],
        "Approvals": ["KYC & Onboarding"],
        "Reports": ["Retailers", "Machines"],
      };

      return ADMIN_NAV.map((cat) => {
        const allowed = allowedLabels[cat.category];
        if (!allowed) return null;
        const filteredItems = cat.items.filter((item) => allowed.includes(item.label));
        return filteredItems.length > 0 ? { ...cat, items: filteredItems } : null;
      }).filter(Boolean) as NavCategory[];
    }

    if (isFinance) {
      const allowedLabels: Record<string, string[]> = {
        "Main": ["Dashboard"],
        "Administration": ["Entity User", "Manual Top-up"],
        "Configuration": ["Wallet", "Chart of Accounts", "Settlement", "Transactions", "Commission", "Charges"],
        "Approvals": ["Settlement", "Wallet Adjustments"],
        "Reports": ["Settlement", "Wallet", "Reconciliation"],
      };

      return ADMIN_NAV.map((cat) => {
        const allowed = allowedLabels[cat.category];
        if (!allowed) return null;
        const filteredItems = cat.items.filter((item) => allowed.includes(item.label));
        return filteredItems.length > 0 ? { ...cat, items: filteredItems } : null;
      }).filter(Boolean) as NavCategory[];
    }

    if (isCompliance) {
      const allowedLabels: Record<string, string[]> = {
        "Main": ["Dashboard"],
        "Configuration": ["Customer Policy", "Beneficiary Policy", "Risk", "AML", "Security"],
        "Approvals": ["KYC & Onboarding", "High Value"],
        "Reports": ["Audit"],
      };

      return ADMIN_NAV.map((cat) => {
        const allowed = allowedLabels[cat.category];
        if (!allowed) return null;
        const filteredItems = cat.items.filter((item) => allowed.includes(item.label));
        return filteredItems.length > 0 ? { ...cat, items: filteredItems } : null;
      }).filter(Boolean) as NavCategory[];
    }

    // Default: Super Admin / Platform Admin sees all
    return ADMIN_NAV;
  }, [user]);

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return navigation;
    const q = searchQuery.toLowerCase().trim();

    return navigation
      .map((cat) => {
        const matchingItems = cat.items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            cat.category.toLowerCase().includes(q)
        );
        return { ...cat, items: matchingItems };
      })
      .filter((cat) => cat.items.length > 0);
  }, [navigation, searchQuery]);

  return (
    <aside
      className={`
        relative z-40 flex flex-col h-screen select-none shrink-0
        transition-all duration-300 ease-out
        ${isCollapsed ? "w-[68px]" : "w-[260px]"}
      `}
      style={{
        background: "rgba(15, 23, 42, 0.88)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderRight: "1px solid rgba(255, 255, 255, 0.12)",
        boxShadow: "inset -1px 0 0 0 rgba(255, 255, 255, 0.08), 0 20px 40px rgba(0, 0, 0, 0.35)",
      }}
    >
      {/* ── Brand Header ── */}
      <div
        className="h-16 px-4 flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}
      >
        {!isCollapsed && (
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden shadow-sm bg-gradient-to-tr from-[#2563EB] to-[#1D4ED8] border border-white/20"
            >
              <img
                src="/logo.svg"
                alt="Pay2Pay Logo"
                className="w-6 h-6 object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>
            <div className="min-w-0">
              <h1
                className="text-sm font-extrabold tracking-tight truncate leading-tight flex items-center gap-1.5"
                style={{ color: "#F8FAFC" }}
              >
                PAY2PAY
                <Sparkles className="w-3.5 h-3.5 text-[#60A5FA]" />
              </h1>
              <span
                className="text-[10px] font-mono font-bold tracking-widest uppercase"
                style={{ color: "#94A3B8" }}
              >
                Enterprise Portal
              </span>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto overflow-hidden shadow-sm bg-gradient-to-tr from-[#2563EB] to-[#1D4ED8] border border-white/20"
          >
            <img
              src="/logo.svg"
              alt="Pay2Pay Logo"
              className="w-6 h-6 object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`p-1.5 rounded-xl transition-all duration-200 focus:outline-none cursor-pointer ${
            isCollapsed ? "mx-auto" : "ml-2 shrink-0"
          }`}
          style={{
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            color: "#93C5FD",
          }}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* ── Glassmorphic Search Bar ── */}
      {!isCollapsed && (
        <div
          className="px-3.5 py-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="relative">
            <Search
              className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "#94A3B8" }}
            />
            <input
              id="sidebar-search"
              type="text"
              placeholder="Search menu…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8.5 pr-7 py-2 text-[12px] rounded-xl focus:outline-none transition-all duration-200 font-semibold"
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#F8FAFC",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "rgba(96, 165, 250, 0.6)";
                e.target.style.boxShadow = "0 0 12px rgba(37, 99, 235, 0.25)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255, 255, 255, 0.12)";
                e.target.style.boxShadow = "none";
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Glassmorphic Navigation Menu ── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 custom-scrollbar space-y-3">
        {filteredCategories.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-[12px] font-bold text-[#94A3B8]">No results for &quot;{searchQuery}&quot;</p>
          </div>
        ) : (
          filteredCategories.map((cat) => {
            const isCategoryCollapsed = collapsedCategories[cat.category] && !searchQuery;
            const itemCount = cat.items.length;
            return (
              <div key={cat.category} className="space-y-1">
                {!isCollapsed && (
                  <button
                    onClick={() => toggleCategory(cat.category)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] transition-colors duration-150 focus:outline-none text-[#94A3B8] hover:text-[#F8FAFC]"
                  >
                    <span className="truncate">{cat.category}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold"
                        style={{
                          background: "rgba(255, 255, 255, 0.1)",
                          backdropFilter: "blur(6px)",
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          color: "#93C5FD",
                        }}
                      >
                        {itemCount}
                      </span>
                      {isCategoryCollapsed ? (
                        <ChevronRight className="w-3 h-3 text-[#94A3B8]" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-[#94A3B8]" />
                      )}
                    </div>
                  </button>
                )}

                {(!isCategoryCollapsed || isCollapsed) && (
                  <div className="space-y-1">
                    {cat.items.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        pathname === item.href ||
                        (item.href !== "/" && pathname?.startsWith(`${item.href}/`));

                      return (
                        <Link
                          key={`${cat.category}-${item.label}-${item.href}`}
                          href={item.href}
                          prefetch={false}
                          title={isCollapsed ? item.label : undefined}
                          className={`
                            relative flex items-center gap-3 px-3 py-2 rounded-xl
                            text-[12.5px] font-extrabold transition-all duration-200 outline-none group
                            ${isCollapsed ? "justify-center px-2" : ""}
                          `}
                          style={
                            isActive
                              ? {
                                  background:
                                    "linear-gradient(135deg, rgba(37, 99, 235, 0.35) 0%, rgba(99, 102, 241, 0.25) 100%)",
                                  backdropFilter: "blur(12px)",
                                  WebkitBackdropFilter: "blur(12px)",
                                  color: "#FFFFFF",
                                  border: "1px solid rgba(147, 197, 253, 0.35)",
                                  boxShadow:
                                    "0 4px 14px rgba(37, 99, 235, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
                                }
                              : {
                                  color: "#CBD5E1",
                                  border: "1px solid transparent",
                                }
                          }
                          onMouseEnter={(e) => {
                            if (!isActive) {
                              (e.currentTarget as HTMLElement).style.background =
                                "rgba(255, 255, 255, 0.08)";
                              (e.currentTarget as HTMLElement).style.backdropFilter =
                                "blur(8px)";
                              (e.currentTarget as HTMLElement).style.borderColor =
                                "rgba(255, 255, 255, 0.12)";
                              (e.currentTarget as HTMLElement).style.color = "#F8FAFC";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) {
                              (e.currentTarget as HTMLElement).style.background =
                                "transparent";
                              (e.currentTarget as HTMLElement).style.backdropFilter =
                                "none";
                              (e.currentTarget as HTMLElement).style.borderColor =
                                "transparent";
                              (e.currentTarget as HTMLElement).style.color = "#CBD5E1";
                            }
                          }}
                        >
                          {/* Active Glowing Left Pill */}
                          {isActive && (
                            <span
                              className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full shadow-sm"
                              style={{
                                background: "#60A5FA",
                                boxShadow: "0 0 8px #60A5FA",
                              }}
                            />
                          )}

                          <Icon
                            className="w-4 h-4 shrink-0 transition-transform duration-150 group-hover:scale-110"
                            style={{
                              color: isActive ? "#60A5FA" : "#94A3B8",
                            }}
                          />

                          {!isCollapsed && (
                            <span className="truncate tracking-wide">{item.label}</span>
                          )}

                          {!isCollapsed && item.badge && (
                            <span
                              className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-extrabold shadow-2xs"
                              style={{
                                background: "linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)",
                                color: "#FFFFFF",
                                border: "1px solid rgba(255,255,255,0.2)",
                              }}
                            >
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </nav>

      {/* ── Glassmorphic Footer ── */}
      <div
        className="shrink-0 p-3.5"
        style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}
      >
        {!isCollapsed ? (
          <div
            className="flex items-center justify-between gap-2 p-2.5 rounded-xl"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold truncate" style={{ color: "#F8FAFC" }}>
                Platform HQ
              </p>
              <p className="text-[10px] truncate font-mono font-bold" style={{ color: "#94A3B8" }}>
                prod-asia-south1
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 px-2 py-1 rounded-full bg-[#10B981]/20 border border-[#10B981]/30">
              <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
              <span className="text-[10px] font-extrabold text-[#34D399]">Live</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-[#34D399] animate-pulse" />
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
