"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Building2, Users, ShieldCheck, Key,
  ScrollText, Settings, UserCircle, CreditCard, ChevronRight, ChevronDown, Network,
  ArrowLeftRight, Store, TrendingUp, Receipt, Code, Webhook, ShieldAlert, FileText,
  Sliders, UploadCloud, Cpu, BookOpen, Wallet, Scale, Send, BarChart3, Activity,
  Ticket, Landmark, GitMerge, CheckSquare, Bell, Zap, Fingerprint, Volume2, Music,
  Globe, Sparkles, Search, X, PanelLeftClose, PanelLeftOpen, AlertTriangle, Layers,
  Megaphone, Terminal, Star, Pin, MessageSquare
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import api from "@/lib/api";

// Subtle Web Audio synthesizer for crisp feedback
const playStarSound = (isAdded: boolean) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    if (isAdded) {
      // Pleasant bright chord
      [587.33, 739.99, 880.0].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(0.1, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.2);
      });
    } else {
      // Soft gentle unpin click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    }
  } catch {}
};

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

interface FavoriteItem {
  public_id?: string;
  menu_href: string;
  menu_label: string;
  menu_category?: string;
  icon_name?: string;
  display_order?: number;
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
      { label: "Topup Requests", href: "/operations/topup-requests", icon: ArrowLeftRight, badge: "Live" },
      { label: "POS Machine", href: "/machines", icon: CreditCard },
      { label: "Users", href: "/users", icon: Users },
      { label: "Roles", href: "/roles", icon: ShieldCheck },
    ],
  },
  {
    category: "Configuration",
    items: [
      { label: "Service Availability", href: "/configuration/services", icon: Sliders, badge: "Live" },
      { label: "Payout Slabs", href: "/configuration/payout-slabs", icon: Layers, badge: "New" },
      { label: "WhatsApp Alerts", href: "/configuration/whatsapp-alerts", icon: MessageSquare, badge: "Live" },
      { label: "Payout Switch", href: "/payouts/gateways", icon: ArrowLeftRight, badge: "Live" },
      { label: "Wallet", href: "/wallet-ledger/entity-wallets", icon: Wallet },
      { label: "Chart of Accounts", href: "/wallet-ledger/chart-of-accounts", icon: BookOpen },
      { label: "Transactions", href: "/settlements/transactions", icon: TrendingUp },
      { label: "Commission", href: "/financial-config/rules", icon: BookOpen },
      { label: "Charges", href: "/financial-config/approvals", icon: Scale },
      { label: "Customer Policy", href: "/policies", icon: Sliders },
      { label: "Beneficiary Policy", href: "/policies/evaluator", icon: Sliders },
      { label: "Risk", href: "/fraud/rules", icon: ShieldAlert },
      { label: "AML", href: "/compliance/reports", icon: ShieldCheck },
      { label: "Announcements", href: "/announcements", icon: Megaphone, badge: "Live" },
      { label: "Notifications", href: "/notifications", icon: Bell },
      { label: "API", href: "/developer/api-keys", icon: Webhook },
      { label: "Security", href: "/settings/secrets", icon: Key },
    ],
  },
  {
    category: "Approvals",
    items: [
      { label: "Topup Requests", href: "/operations/topup-requests", icon: ArrowLeftRight, badge: "P0" },
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
      { label: "Transaction Report", href: "/admin/reports/transactions", icon: FileText, badge: "Master" },
      { label: "Transaction Ledger", href: "/admin/reports/transaction-ledger", icon: ScrollText },
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

  // ── Database Favorites State ──
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);

  // Flat lookup dictionary of all nav items by href
  const allItemsMap = useMemo(() => {
    const map: Record<string, NavItem> = {};
    ADMIN_NAV.forEach((cat) => {
      cat.items.forEach((item) => {
        if (!map[item.href]) {
          map[item.href] = item;
        }
      });
    });
    return map;
  }, []);

  // Fetch user favorites from DB on mount or when user changes
  const fetchFavorites = async () => {
    try {
      setLoadingFavorites(true);
      const res = await api.get("/api/v1/admin/favorites");
      if (res.data?.favorites && Array.isArray(res.data.favorites)) {
        setFavorites(res.data.favorites);
      }
    } catch (e) {
      console.error("Failed to load admin favorites from DB", e);
    } finally {
      setLoadingFavorites(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  // Handle Toggle Favorite
  const handleToggleFavorite = async (item: NavItem, categoryName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const isFav = favorites.some((f) => f.menu_href === item.href);
    playStarSound(!isFav);

    // Optimistic state update
    if (isFav) {
      setFavorites((prev) => prev.filter((f) => f.menu_href !== item.href));
    } else {
      setFavorites((prev) => [
        ...prev,
        {
          menu_href: item.href,
          menu_label: item.label,
          menu_category: categoryName,
          icon_name: item.icon?.name || "Star",
        },
      ]);
    }

    try {
      const res = await api.post("/api/v1/admin/favorites/toggle", {
        menu_href: item.href,
        menu_label: item.label,
        menu_category: categoryName,
        icon_name: item.icon?.name || "Star",
      });
      if (res.data?.favorites && Array.isArray(res.data.favorites)) {
        setFavorites(res.data.favorites);
      }
    } catch (err) {
      console.error("Failed to toggle favorite in database", err);
      // Rollback to server state
      fetchFavorites();
    }
  };

  const navigation = useMemo(() => {
    const email = (user?.email || "").toLowerCase();
    const roles = (user?.roles || []).map((r) => r.toLowerCase());
    const uType = (user?.user_type || "").toLowerCase();

    const isCrm = email.includes("crm") || roles.includes("crm_executive") || roles.includes("crm_manager") || uType.includes("crm");
    const isRm = email.includes("rm.") || email.startsWith("rm_") || roles.includes("regional_manager") || uType.includes("regional");
    const isFinance = roles.includes("finance") || roles.includes("settlement_mgr") || uType.includes("finance");
    const isCompliance = roles.includes("compliance") || uType.includes("compliance");

    let baseNav = ADMIN_NAV;

    if (isCrm) {
      const allowedLabels: Record<string, string[]> = {
        "Main": ["Dashboard"],
        "Administration": ["Super Distributor", "Distributor", "Retailer", "POS Machine"],
        "Configuration": ["Customer Policy", "Notifications", "Announcements"],
        "Approvals": ["KYC & Onboarding"],
        "Reports": ["Transaction Report", "Transaction Ledger", "Settlement", "Wallet", "Retailers", "Machines", "Audit", "Reconciliation"],
      };

      baseNav = ADMIN_NAV.map((cat) => {
        const allowed = allowedLabels[cat.category];
        if (!allowed) return null;
        const filteredItems = cat.items.filter((item) => allowed.includes(item.label));
        return filteredItems.length > 0 ? { ...cat, items: filteredItems } : null;
      }).filter(Boolean) as NavCategory[];
    } else if (isRm) {
      const allowedLabels: Record<string, string[]> = {
        "Main": ["Dashboard"],
        "Administration": ["Organization", "RM", "Super Distributor", "Distributor", "Retailer", "POS Machine"],
        "Approvals": ["KYC & Onboarding"],
        "Reports": ["Transaction Report", "Retailers", "Machines"],
      };

      baseNav = ADMIN_NAV.map((cat) => {
        const allowed = allowedLabels[cat.category];
        if (!allowed) return null;
        const filteredItems = cat.items.filter((item) => allowed.includes(item.label));
        return filteredItems.length > 0 ? { ...cat, items: filteredItems } : null;
      }).filter(Boolean) as NavCategory[];
    } else if (isFinance) {
      const allowedLabels: Record<string, string[]> = {
        "Main": ["Dashboard"],
        "Administration": ["Entity User", "Manual Top-up", "Topup Requests"],
        "Configuration": ["Payout Switch", "Wallet", "Chart of Accounts", "Transactions", "Commission", "Charges"],
        "Approvals": ["Topup Requests", "Settlement", "Wallet Adjustments"],
        "Reports": ["Transaction Report", "Transaction Ledger", "Settlement", "Wallet", "Reconciliation"],
      };

      baseNav = ADMIN_NAV.map((cat) => {
        const allowed = allowedLabels[cat.category];
        if (!allowed) return null;
        const filteredItems = cat.items.filter((item) => allowed.includes(item.label));
        return filteredItems.length > 0 ? { ...cat, items: filteredItems } : null;
      }).filter(Boolean) as NavCategory[];
    } else if (isCompliance) {
      const allowedLabels: Record<string, string[]> = {
        "Main": ["Dashboard"],
        "Configuration": ["Customer Policy", "Beneficiary Policy", "Risk", "AML", "Security"],
        "Approvals": ["KYC & Onboarding", "High Value"],
        "Reports": ["Transaction Report", "Audit"],
      };

      baseNav = ADMIN_NAV.map((cat) => {
        const allowed = allowedLabels[cat.category];
        if (!allowed) return null;
        const filteredItems = cat.items.filter((item) => allowed.includes(item.label));
        return filteredItems.length > 0 ? { ...cat, items: filteredItems } : null;
      }).filter(Boolean) as NavCategory[];
    }

    // Prepend Dynamic Favorites Category if any are saved in DB
    if (favorites.length > 0) {
      const favCategory: NavCategory = {
        category: "Favorites",
        icon: Star,
        items: favorites.map((fav) => {
          const originalItem = allItemsMap[fav.menu_href];
          return {
            label: fav.menu_label || originalItem?.label || fav.menu_href,
            href: fav.menu_href,
            icon: originalItem?.icon || Star,
            badge: originalItem?.badge,
          };
        }),
      };
      return [favCategory, ...baseNav];
    }

    return baseNav;
  }, [user, favorites, allItemsMap]);

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
        ${isCollapsed ? "w-[64px]" : "w-[275px]"}
      `}
      style={{
        background: "rgba(15, 23, 42, 0.94)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderRight: "1px solid rgba(255, 255, 255, 0.10)",
        boxShadow: "inset -1px 0 0 0 rgba(255, 255, 255, 0.06), 0 20px 40px rgba(0, 0, 0, 0.4)",
      }}
    >
      {/* ── Brand Header ── */}
      <div
        className="h-14 px-3 flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}
      >
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden shadow-xs bg-gradient-to-tr from-[#2563EB] to-[#1D4ED8] border border-white/20"
            >
              <img
                src="/logo.svg"
                alt="Pay2Pay Logo"
                className="w-5 h-5 object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>
            <div className="min-w-0">
              <h1
                className="text-[14px] font-extrabold tracking-tight truncate leading-tight flex items-center gap-1"
                style={{ color: "#F8FAFC" }}
              >
                PAY2PAY
                <Sparkles className="w-3.5 h-3.5 text-[#60A5FA]" />
              </h1>
              <span
                className="text-[10px] font-mono font-bold tracking-wider uppercase block text-[#94A3B8]"
              >
                Enterprise Portal
              </span>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto overflow-hidden shadow-xs bg-gradient-to-tr from-[#2563EB] to-[#1D4ED8] border border-white/20"
          >
            <img
              src="/logo.svg"
              alt="Pay2Pay Logo"
              className="w-5 h-5 object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`p-1.5 rounded-lg transition-all duration-200 focus:outline-none cursor-pointer hover:bg-white/10 ${
            isCollapsed ? "mx-auto" : "ml-1.5 shrink-0"
          }`}
          style={{
            border: "1px solid rgba(255, 255, 255, 0.1)",
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
          className="px-2.5 py-2 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="relative">
            <Search
              className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#94A3B8]"
            />
            <input
              id="sidebar-search"
              type="text"
              placeholder="Search menu…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8.5 pr-7 py-1.5 text-[13px] rounded-lg focus:outline-none transition-all duration-200 font-semibold"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.10)",
                color: "#F8FAFC",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "rgba(96, 165, 250, 0.6)";
                e.target.style.boxShadow = "0 0 10px rgba(37, 99, 235, 0.25)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255, 255, 255, 0.10)";
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

      {/* ── Glassmorphic Navigation Menu with Sleek Scrollbar ── */}
      <nav
        className="flex-1 overflow-y-auto py-1.5 px-2 custom-scrollbar space-y-1.5"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255, 255, 255, 0.18) transparent",
        }}
      >
        {filteredCategories.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-[12px] font-bold text-[#94A3B8]">No results for &quot;{searchQuery}&quot;</p>
          </div>
        ) : (
          filteredCategories.map((cat) => {
            const isFavCat = cat.category === "Favorites";
            const isCategoryCollapsed = collapsedCategories[cat.category] && !searchQuery;
            const itemCount = cat.items.length;

            return (
              <div key={cat.category} className="space-y-0.5">
                {!isCollapsed && (
                  <button
                    onClick={() => toggleCategory(cat.category)}
                    className={`w-full flex items-center justify-between px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.1em] transition-colors duration-150 focus:outline-none ${
                      isFavCat ? "text-[#FBBF24] hover:text-[#FCD34D]" : "text-[#94A3B8] hover:text-[#F8FAFC]"
                    }`}
                  >
                    <span className="truncate flex items-center gap-1.5">
                      {isFavCat && <Star className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B]" />}
                      {cat.category}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9.5px] font-mono font-bold ${
                          isFavCat
                            ? "bg-[#FEF3C7]/20 border border-[#FDE68A]/30 text-[#FDE68A]"
                            : "bg-white/10 border border-white/12 text-[#93C5FD]"
                        }`}
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
                  <div className="space-y-0.5">
                    {cat.items.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        pathname === item.href ||
                        (item.href !== "/" && pathname?.startsWith(`${item.href}/`));

                      const isFavorited = favorites.some((f) => f.menu_href === item.href);

                      return (
                        <Link
                          key={`${cat.category}-${item.label}-${item.href}`}
                          href={item.href}
                          prefetch={false}
                          title={isCollapsed ? item.label : undefined}
                          className={`
                            relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg
                            text-[13.5px] font-bold transition-all duration-150 outline-none group
                            ${isCollapsed ? "justify-center px-1.5" : ""}
                          `}
                          style={
                            isActive
                              ? {
                                  background:
                                    "linear-gradient(135deg, rgba(37, 99, 235, 0.4) 0%, rgba(99, 102, 241, 0.3) 100%)",
                                  backdropFilter: "blur(12px)",
                                  WebkitBackdropFilter: "blur(12px)",
                                  color: "#FFFFFF",
                                  border: "1px solid rgba(147, 197, 253, 0.35)",
                                  boxShadow:
                                    "0 2px 10px rgba(37, 99, 235, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
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
                              (e.currentTarget as HTMLElement).style.borderColor =
                                "rgba(255, 255, 255, 0.12)";
                              (e.currentTarget as HTMLElement).style.color = "#F8FAFC";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) {
                              (e.currentTarget as HTMLElement).style.background =
                                "transparent";
                              (e.currentTarget as HTMLElement).style.borderColor =
                                "transparent";
                              (e.currentTarget as HTMLElement).style.color = "#CBD5E1";
                            }
                          }}
                        >
                          {/* Active Glowing Left Pill */}
                          {isActive && (
                            <span
                              className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full"
                              style={{
                                background: "#60A5FA",
                                boxShadow: "0 0 6px #60A5FA",
                              }}
                            />
                          )}

                          <Icon
                            className={`w-4 h-4 shrink-0 transition-transform duration-150 group-hover:scale-105 ${
                              isFavCat ? "text-[#F59E0B]" : ""
                            }`}
                            style={{
                              color: isActive ? "#60A5FA" : isFavCat ? "#F59E0B" : "#94A3B8",
                            }}
                          />

                          {!isCollapsed && (
                            <span className="truncate tracking-normal flex-1 text-[13.5px] leading-tight">{item.label}</span>
                          )}

                          {!isCollapsed && item.badge && (
                            <span
                              className="ml-auto px-1.5 py-0.2 rounded text-[9.5px] font-bold shadow-2xs shrink-0"
                              style={{
                                background: "linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)",
                                color: "#FFFFFF",
                                border: "1px solid rgba(255,255,255,0.2)",
                              }}
                            >
                              {item.badge}
                            </span>
                          )}

                          {/* Interactive Favorite Star Button */}
                          {!isCollapsed && (
                            <button
                              type="button"
                              onClick={(e) => handleToggleFavorite(item, cat.category, e)}
                              title={isFavorited ? "Remove from Favorites (DB)" : "Pin to Favorites (DB)"}
                              className={`p-0.5 rounded transition-all shrink-0 cursor-pointer ${
                                isFavorited
                                  ? "opacity-100 text-[#F59E0B] hover:text-[#D97706] hover:scale-115"
                                  : "opacity-0 group-hover:opacity-60 hover:!opacity-100 text-[#94A3B8] hover:text-[#F59E0B] hover:scale-115"
                              }`}
                            >
                              <Star
                                className={`w-3.5 h-3.5 ${
                                  isFavorited ? "fill-[#F59E0B] text-[#F59E0B]" : "text-[#94A3B8] hover:text-[#F59E0B]"
                                }`}
                              />
                            </button>
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

      {/* ── Ultra-Compact Minimal Footer ── */}
      <div
        className="shrink-0 px-3 py-2 flex items-center justify-between"
        style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", background: "rgba(15, 23, 42, 0.6)" }}
      >
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse shrink-0" />
              <span className="text-[10px] font-mono font-bold text-[#94A3B8] truncate">
                asia-south1
              </span>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/20">
              Live
            </span>
          </>
        ) : (
          <div className="flex justify-center w-full">
            <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
