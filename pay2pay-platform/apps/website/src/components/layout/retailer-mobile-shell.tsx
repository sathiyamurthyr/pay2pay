"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  Store, Send, Fingerprint, Wallet, ShieldCheck, LogOut,
  Home, History, Users, Building2, Bell, QrCode, ArrowUpRight,
  ChevronRight, RefreshCw, CreditCard, Sparkles, CheckCircle2, Phone,
  Search, Plus, Copy, Check, Download, AlertTriangle, ArrowDownLeft, X, Volume2
} from "lucide-react";

export const RetailerMobileShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [walletBalance, setWalletBalance] = useState(48250.75);
  const [todayMargin, setTodayMargin] = useState(1480.00);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setWalletBalance((prev) => prev + Math.floor(Math.random() * 50));
      setIsRefreshing(false);
    }, 600);
  };

  const navItems = [
    { label: "Home", href: "/retailer-dashboard", icon: Home },
    { label: "DMT", href: "/dmt/transfer", icon: Send, badge: "Instant" },
    { label: "AEPS", href: "/aeps/services", icon: Fingerprint, badge: "Biometric" },
    { label: "Customers", href: "/customers", icon: Users },
    { label: "Wallet", href: "/wallet-ledger/wallets", icon: Wallet },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans max-w-md md:max-w-lg mx-auto shadow-2xl border-x border-slate-800 relative pb-24">

      {/* ── Glassmorphism Mobile Header ── */}
      <header className="sticky top-0 z-40 px-4 py-3 bg-slate-900/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-0.5 shadow-lg shadow-blue-500/20">
            <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center">
              <Store className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-extrabold tracking-tight text-white leading-tight">
                Sri Venkateswara Mobiles
              </h2>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" title="Outlet Active" />
            </div>
            <p className="text-[11px] text-blue-300/80 font-mono font-semibold mt-0.5">
              RET-0CFE2B &nbsp;·&nbsp; Chennai Outlet
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-extrabold">
            <Volume2 className="w-3 h-3 text-emerald-400 animate-bounce" /> Soundbox Active
          </div>

          <button
            onClick={logout}
            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer"
            title="Logout Session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── Merchant Wallet Glass Card ── */}
      <div className="p-4 bg-gradient-to-br from-indigo-900/90 via-slate-900 to-slate-950 backdrop-blur-2xl text-white pt-4 pb-6 rounded-b-3xl border-b border-indigo-500/20 shadow-xl relative overflow-hidden">
        {/* Background Glowing Orbs */}
        <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-44 h-44 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-extrabold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-blue-400" />
            Agent Wallet Balance
          </span>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1 text-[11px] font-extrabold text-blue-300 hover:text-white transition-all bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-full border border-white/10 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
            Sync Balance
          </button>
        </div>

        <div className="flex items-baseline justify-between mt-2">
          <div className="font-mono text-3xl font-extrabold text-white tracking-tight leading-none drop-shadow-md">
            ₹{walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-right">
            <span className="text-[10px] text-emerald-400 uppercase font-extrabold block">Today Margin</span>
            <span className="font-mono text-sm font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              +₹{todayMargin.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Quick Touch Action Buttons */}
        <div className="grid grid-cols-3 gap-2.5 mt-5 pt-4 border-t border-white/10">
          <Link
            href="/dmt/transfer"
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 border border-blue-400/30 text-white text-xs font-extrabold hover:brightness-110 transition-all shadow-lg shadow-blue-600/30"
          >
            <Send className="w-4 h-4" /> DMT Transfer
          </Link>
          <Link
            href="/aeps/services"
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-white text-xs font-extrabold hover:bg-slate-700 transition-all"
          >
            <Fingerprint className="w-4 h-4 text-emerald-400" /> AEPS Cash Out
          </Link>
          <Link
            href="/payouts/requests"
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-white text-xs font-extrabold hover:bg-slate-700 transition-all"
          >
            <QrCode className="w-4 h-4 text-amber-400" /> QR Collect
          </Link>
        </div>
      </div>

      {/* ── Main Mobile Content Area ── */}
      <main className="flex-1 p-4 relative z-10 space-y-4">
        {children}
      </main>

      {/* ── Mobile Merchant Bottom Navigation Dock ── */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md md:max-w-lg bg-slate-900/90 backdrop-blur-2xl border-t border-white/10 px-4 py-2 flex items-center justify-around z-50 shadow-2xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/retailer-dashboard" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all relative ${
                isActive ? "text-blue-400 font-extrabold scale-105" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <div className={`p-2 rounded-2xl transition-all ${isActive ? "bg-blue-600/20 border border-blue-500/30 text-blue-400 shadow-md" : "bg-transparent"}`}>
                <Icon className={`w-5 h-5 ${isActive ? "text-blue-400" : "text-slate-400"}`} />
              </div>
              <span className="text-[10px] tracking-tight">{item.label}</span>
              {item.badge && !isActive && (
                <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default RetailerMobileShell;
