"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, LogIn, ExternalLink, Shield, Users, Landmark, Store, Layers } from "lucide-react";
import { siteConfig } from "@/config/site-config";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative ml-auto w-[85%] max-w-sm h-full bg-[#050C1A]/95 border-l border-slate-800/80 p-6 flex flex-col justify-between shadow-2xl backdrop-blur-2xl overflow-y-auto z-10 animate-in slide-in-from-right duration-250">
        <div>
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-5 border-b border-slate-800/80">
            <Link href="/" onClick={onClose} className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                <img
                  src="/branding/pay2pay-logo.png"
                  alt="Pay2Pay"
                  width={120}
                  height={28}
                  style={{ maxHeight: "28px", width: "auto", objectFit: "contain" }}
                  className="h-7 w-auto object-contain rounded-md"
                />
              </div>
              <span className="font-extrabold text-white text-base tracking-wider block leading-none">
                {siteConfig.company.brandName}
              </span>
            </Link>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 border border-slate-800/60"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="mt-5 flex flex-col gap-1.5">
            {siteConfig.navigation.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href + "/"));

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onClose}
                  className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-between ${
                    isActive
                      ? "bg-blue-600/20 text-white font-bold border border-blue-500/40 shadow-sm shadow-blue-500/10"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                </Link>
              );
            })}

            <Link
              href="/partner-portals"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-between ${
                pathname === "/partner-portals"
                  ? "bg-blue-600/20 text-white font-bold border border-blue-500/40 shadow-sm shadow-blue-500/10"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <span>Partner Portals Hub</span>
              {pathname === "/partner-portals" && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
            </Link>
          </nav>
        </div>

        {/* Portal Access Actions */}
        <div className="pt-6 border-t border-slate-800/80 flex flex-col gap-2.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
            Access Portals
          </span>
          <a
            href="https://retailer.pay2pay.in/retailer/login"
            onClick={onClose}
            className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-sm shadow-xl shadow-blue-500/30 border border-white/20 active:scale-95 transition-all"
          >
            <span className="flex items-center gap-2.5">
              <Store size={16} /> Retailer Login
            </span>
            <ExternalLink size={14} className="opacity-80" />
          </a>
          <Link
            href="/distributor/login"
            onClick={onClose}
            className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-200 hover:text-white font-medium text-xs transition-colors"
          >
            <span className="flex items-center gap-2">
              <Users size={14} className="text-indigo-400" /> Distributor Portal
            </span>
            <ExternalLink size={12} className="opacity-50" />
          </Link>
          <Link
            href="/super-distributor/login"
            onClick={onClose}
            className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-200 hover:text-white font-medium text-xs transition-colors"
          >
            <span className="flex items-center gap-2">
              <Landmark size={14} className="text-amber-400" /> Super-Distributor Hub
            </span>
            <ExternalLink size={12} className="opacity-50" />
          </Link>
          <Link
            href="/dit/login"
            onClick={onClose}
            className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-200 hover:text-white font-medium text-xs transition-colors"
          >
            <span className="flex items-center gap-2">
              <Layers size={14} className="text-cyan-400" /> DIT Operations
            </span>
            <ExternalLink size={12} className="opacity-50" />
          </Link>
        </div>
      </div>
    </div>
  );
};

