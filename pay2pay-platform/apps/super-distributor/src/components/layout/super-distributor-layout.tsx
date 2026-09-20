"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Percent,
  ReceiptText,
  ShieldCheck,
  Wallet,
  LogOut,
  Menu,
  X,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Building2,
  Crown,
  Layers,
  ArrowUpRight
} from "lucide-react";
import { SuperDistributorAPI } from "@/services/super-distributor-api";

interface SuperDistributorLayoutProps {
  children: React.ReactNode;
}

export function SuperDistributorLayout({ children }: SuperDistributorLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [walletBalance, setWalletBalance] = useState<number>(0.0);
  const [sdName, setSdName] = useState<string>("Master Distributor Partner");
  const [sdCode, setSdCode] = useState<string>("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const profile = await SuperDistributorAPI.getProfile();
        if (isMounted && profile) {
          setSdName(profile.business_name || profile.owner_name || "Master Distributor Partner");
          setSdCode(profile.super_distributor_code || `SD-${profile.super_distributor_ref_id}`);
          setWalletBalance(Number(profile.wallet_balance) || 0.0);
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
    { label: "Wallet & Ledger", href: "/wallet", icon: Wallet },
    { label: "Distributors", href: "/distributors", icon: Users },
    { label: "Onboard Partner", href: "/distributors/onboard", icon: UserPlus },
    { label: "MDR Setup", href: "/mdr", icon: Percent },
    { label: "Transactions", href: "/transactions", icon: ReceiptText },
    { label: "Profile & Settings", href: "/profile", icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex">
      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-white/[0.08] bg-[#0c1220]/80 backdrop-blur-xl shrink-0 sticky top-0 h-screen z-30">
        {/* Brand Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 p-[1px] shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#090D16] rounded-xl flex items-center justify-center">
                <Crown className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <span className="text-base font-black tracking-tight bg-gradient-to-r from-amber-400 to-yellow-200 bg-clip-text text-transparent">
                PAY2PAY
              </span>
              <span className="block text-[10px] font-bold text-amber-400/80 uppercase tracking-widest">
                Master Hub
              </span>
            </div>
          </Link>
        </div>

        {/* SD Profile Badge */}
        <div className="p-4 mx-3 my-3 rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.08] shadow-inner">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 font-bold text-sm">
              {sdName.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-200 truncate">{sdName}</p>
              <p className="text-[10px] font-mono text-amber-400">{sdCode || "SUPER DISTRIBUTOR"}</p>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Wallet</span>
            <span className="text-xs font-extrabold text-emerald-400">
              ₹{walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? "bg-gradient-to-r from-amber-500/20 to-orange-500/10 text-amber-300 border border-amber-500/30 shadow-md shadow-amber-500/5 font-bold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                }`}
              >
                <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? "text-amber-400" : "text-slate-400 group-hover:text-slate-200"}`} />
                <span>{item.label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-amber-400" />}
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-white/[0.08]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT WRAPPER ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 h-16 border-b border-white/[0.08] bg-[#0c1220]/80 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 font-bold">
                Master Tier
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400 font-medium">Enterprise Super Distribution Network</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Balance Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-extrabold shadow-sm">
              <Wallet className="w-3.5 h-3.5" />
              <span>₹{walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <Link
              href="/distributors/onboard"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-sm shadow-amber-500/20 transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Distributor</span>
            </Link>
          </div>
        </header>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden flex">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <div className="relative w-64 bg-[#0c1220] border-r border-white/[0.08] p-4 flex flex-col h-full z-50">
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-400" />
                  <span className="font-bold text-amber-300 text-sm">Master Hub</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 py-4 space-y-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold ${
                        isActive ? "bg-amber-400/20 text-amber-300 font-bold" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="pt-3 border-t border-white/[0.08]">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
