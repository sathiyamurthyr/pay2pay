"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Wallet,
  Percent,
  ReceiptText,
  BarChart3,
  UserCheck,
  LifeBuoy,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronRight,
  PlusCircle,
  ShieldCheck,
  CreditCard,
  Building2,
  Sparkles,
  MoreHorizontal
} from "lucide-react";
import { DistributorAPI } from "@/services/distributor-api";

interface DistributorLayoutProps {
  children: React.ReactNode;
}

export function DistributorLayout({ children }: DistributorLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [walletBalance, setWalletBalance] = useState<number>(0.0);
  const [distributorName, setDistributorName] = useState<string>("Distributor Partner");
  const [distributorCode, setDistributorCode] = useState<string>("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load authoritative wallet & profile data
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const profile = await DistributorAPI.getProfile();
        if (isMounted && profile) {
          setDistributorName(profile.business_name || profile.owner_name || "Distributor Partner");
          setDistributorCode(profile.distributor_code || `DIST-${profile.distributor_ref_id}`);
        }
      } catch {
        // Safe fallback
      }

      try {
        const wallet = await DistributorAPI.getWallet();
        if (isMounted && wallet) {
          setWalletBalance(Number(wallet.balance) || 0.0);
        }
      } catch {
        // Safe fallback
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    const interval = setInterval(loadData, 30000); // Poll wallet every 30s
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    if (typeof document !== "undefined") {
      const cookieList = [
        "p2p_access_token",
        "pay2pay_access_token",
        "pay2pay_auth_token",
        "access_token"
      ];
      cookieList.forEach((c) => {
        document.cookie = `${c}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      });
      localStorage.clear();
      sessionStorage.clear();
    }
    router.replace("/login");
  };

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Retailers", href: "/retailers", icon: Users },
    { label: "Top-up Requests", href: "/topup", icon: Wallet },
    { label: "MDR Setup", href: "/mdr", icon: Percent },
    { label: "Transactions", href: "/transactions", icon: ReceiptText },
    { label: "Reports", href: "/reports", icon: BarChart3 },
    { label: "Profile", href: "/profile", icon: Building2 },
    { label: "Support", href: "/support", icon: LifeBuoy }
  ];

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Enterprise Glass Navigation Bar */}
      <header className="sticky top-0 z-40 h-16 w-full border-b border-white/[0.08] bg-[#0B0F19]/85 backdrop-blur-xl transition-all">
        <div className="mx-auto flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand and Mobile Toggle */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link href="/dashboard" className="flex items-center gap-2 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 text-slate-950 font-bold" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black tracking-wider text-white">PAY2PAY</span>
                  <span className="text-[10px] uppercase tracking-widest font-black px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-sm">
                    Distributor
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 hidden sm:inline -mt-0.5">
                  Enterprise Partner Portal
                </span>
              </div>
            </Link>
          </div>

          {/* Right Header: Dynamic Wallet Chip, Notifications, Profile Dropdown */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Dynamic Authoritative Wallet Balance Chip */}
            <div className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full bg-amber-500/[0.08] border border-amber-500/25 backdrop-blur-md hover:border-amber-500/40 transition-all">
              <div className="h-6 w-6 rounded-full bg-amber-400/20 flex items-center justify-center">
                <Wallet className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[9px] uppercase tracking-wider text-amber-400/80 font-medium hidden sm:block">
                  Distributor Wallet
                </span>
                <span className="text-xs sm:text-sm font-bold text-amber-300">
                  ₹{walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <Link
                href="/topup"
                className="ml-1 sm:ml-2 text-xs font-semibold px-2 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 hover:brightness-110 shadow-sm transition-all flex items-center gap-1"
              >
                <PlusCircle className="w-3 h-3" />
                <span className="hidden sm:inline">Top-up</span>
              </Link>
            </div>

            {/* Notifications */}
            <Link
              href="/notifications"
              className="relative p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-white/[0.05] transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-[#0B0F19]" />
            </Link>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/[0.05] border border-transparent hover:border-white/[0.08] transition-all"
              >
                <div className="h-8 w-8 rounded-xl bg-slate-800 border border-amber-400/30 flex items-center justify-center text-amber-400 font-bold text-xs">
                  {distributorName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-semibold text-white max-w-[120px] truncate">{distributorName}</span>
                  <span className="text-[10px] text-slate-400">{distributorCode || "Distributor"}</span>
                </div>
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#111827]/95 backdrop-blur-2xl border border-white/[0.1] shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
                    <p className="text-xs font-bold text-white truncate">{distributorName}</p>
                    <p className="text-[10px] text-amber-400 uppercase tracking-wide">Distributor Partner</p>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    <Building2 className="w-4 h-4 text-slate-400" />
                    Distributor Profile
                  </Link>
                  <Link
                    href="/reports"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    <BarChart3 className="w-4 h-4 text-slate-400" />
                    Business Reports
                  </Link>
                  <Link
                    href="/support"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    <LifeBuoy className="w-4 h-4 text-slate-400" />
                    Help & Support
                  </Link>
                  <div className="border-t border-white/[0.06] my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/[0.1] transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main App Layout: Desktop Sidebar + Page Content */}
      <div className="flex-1 flex w-full">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 border-r border-white/[0.08] bg-[#0E1322]/80 backdrop-blur-xl p-4 gap-6 shrink-0">
          {/* Navigation Links */}
          <nav className="flex-1 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-amber-400/15 to-yellow-500/10 text-amber-300 border border-amber-500/30 shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-amber-400" : "text-slate-400"}`} />
                  {item.label}
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Quick Action Card: Invite Retailer */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-b from-amber-500/[0.08] to-yellow-500/[0.02] border border-amber-500/20 backdrop-blur-md">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs mb-1">
              <UserCheck className="w-4 h-4 text-amber-400" />
              Grow Network
            </div>
            <p className="text-[11px] text-slate-400 mb-2.5">
              Invite retailers to your network to configure MDR & monitor transaction business.
            </p>
            <Link
              href="/retailers"
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-md shadow-amber-500/15 transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Invite Retailer
            </Link>
          </div>

          {/* Footer Security Badge */}
          <div className="flex items-center gap-2 px-2 text-[10px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>256-Bit Financial Encryption</span>
          </div>
        </aside>

        {/* Mobile Slide-over Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#0E1322] border-r border-white/[0.1] p-5 shadow-2xl z-10">
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-slate-950" />
                  </div>
                  <span className="font-bold text-white tracking-wide">Distributor Menu</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 space-y-1.5 py-4 overflow-y-auto">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold"
                          : "text-slate-300 hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "text-amber-400" : "text-slate-400"}`} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="pt-4 border-t border-white/[0.08]">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-400 bg-rose-500/[0.1] border border-rose-500/20 hover:bg-rose-500/[0.2] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page Content Viewport */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-10 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Mobile Responsive Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-white/[0.08] bg-[#0B0F19]/90 backdrop-blur-2xl px-2 flex items-center justify-around">
        <Link
          href="/dashboard"
          className={`flex flex-col items-center justify-center flex-1 h-full text-[10px] font-medium transition-colors ${
            pathname === "/dashboard" ? "text-amber-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          Home
        </Link>
        <Link
          href="/retailers"
          className={`flex flex-col items-center justify-center flex-1 h-full text-[10px] font-medium transition-colors ${
            pathname.startsWith("/retailers") ? "text-amber-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          Retailers
        </Link>
        <Link
          href="/transactions"
          className={`flex flex-col items-center justify-center flex-1 h-full text-[10px] font-medium transition-colors ${
            pathname.startsWith("/transactions") ? "text-amber-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <ReceiptText className="w-5 h-5 mb-0.5" />
          Transactions
        </Link>
        <Link
          href="/topup"
          className={`flex flex-col items-center justify-center flex-1 h-full text-[10px] font-medium transition-colors ${
            pathname.startsWith("/topup") ? "text-amber-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Wallet className="w-5 h-5 mb-0.5" />
          Wallet
        </Link>
        <button
          onClick={() => setMoreSheetOpen(!moreSheetOpen)}
          className={`flex flex-col items-center justify-center flex-1 h-full text-[10px] font-medium transition-colors ${
            moreSheetOpen ? "text-amber-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <MoreHorizontal className="w-5 h-5 mb-0.5" />
          More
        </button>
      </nav>

      {/* Mobile "More" Bottom Sheet */}
      {moreSheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMoreSheetOpen(false)}
          />
          <div className="relative w-full rounded-t-3xl bg-[#0E1322] border-t border-white/[0.1] p-5 shadow-2xl z-10 animate-in slide-in-from-bottom duration-200">
            <div className="w-12 h-1 rounded-full bg-slate-600 mx-auto mb-4" />
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              More Distributor Actions
            </h3>
            <div className="grid grid-cols-2 gap-2.5 pb-4">
              <Link
                href="/mdr"
                onClick={() => setMoreSheetOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-amber-500/30 text-xs font-semibold text-slate-200"
              >
                <Percent className="w-4 h-4 text-amber-400" />
                MDR Setup
              </Link>
              <Link
                href="/retailers"
                onClick={() => setMoreSheetOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-amber-500/30 text-xs font-semibold text-slate-200"
              >
                <UserCheck className="w-4 h-4 text-amber-400" />
                Invite Retailer
              </Link>
              <Link
                href="/reports"
                onClick={() => setMoreSheetOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-amber-500/30 text-xs font-semibold text-slate-200"
              >
                <BarChart3 className="w-4 h-4 text-amber-400" />
                Reports
              </Link>
              <Link
                href="/profile"
                onClick={() => setMoreSheetOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-amber-500/30 text-xs font-semibold text-slate-200"
              >
                <Building2 className="w-4 h-4 text-amber-400" />
                Profile
              </Link>
              <Link
                href="/support"
                onClick={() => setMoreSheetOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-amber-500/30 text-xs font-semibold text-slate-200"
              >
                <LifeBuoy className="w-4 h-4 text-amber-400" />
                Support
              </Link>
              <button
                onClick={() => {
                  setMoreSheetOpen(false);
                  handleLogout();
                }}
                className="flex items-center gap-3 p-3 rounded-xl bg-rose-500/[0.08] border border-rose-500/20 text-xs font-semibold text-rose-400"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
