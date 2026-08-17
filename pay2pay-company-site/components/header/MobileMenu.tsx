"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, LogIn, ExternalLink, Shield, Users, Landmark } from "lucide-react";
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
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity" 
        onClick={onClose} 
        aria-hidden="true" 
      />

      {/* Drawer Panel */}
      <div className="relative ml-auto w-4/5 max-w-sm h-full bg-[#08111F] border-l border-slate-800 p-6 flex flex-col justify-between shadow-2xl overflow-y-auto">
        <div>
          <div className="flex items-center justify-between pb-6 border-b border-slate-800/80">
            <Link href="/" onClick={onClose} className="flex items-center gap-2">
              <img
                src="/branding/pay2pay-logo.png"
                alt="Pay2Pay"
                className="h-9 w-auto max-w-[100px] object-contain rounded-lg border border-amber-500/30"
              />
              <span className="font-extrabold text-white text-base tracking-wider">PAY2PAY</span>
            </Link>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="mt-6 flex flex-col gap-1">
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
                  className={`px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                    isActive
                      ? "bg-blue-600/20 text-white font-bold border-l-4 border-blue-500 pl-3"
                      : "text-slate-300 hover:text-white hover:bg-blue-600/10"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            <Link
              href="/partner-portals"
              onClick={onClose}
              className={`px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                pathname === "/partner-portals"
                  ? "bg-blue-600/20 text-white font-bold border-l-4 border-blue-500 pl-3"
                  : "text-slate-300 hover:text-white hover:bg-blue-600/10"
              }`}
            >
              Partner Portals Hub
            </Link>
          </nav>
        </div>

        {/* Portal Access Actions */}
        <div className="pt-6 border-t border-slate-800 flex flex-col gap-2.5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Access Portals
          </span>
          <Link
            href="/retailer/login"
            onClick={onClose}
            className="flex items-center justify-between w-full px-4 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-sm shadow-xl shadow-blue-500/30 border border-white/20 active:scale-95 transition-all"
          >
            <span className="flex items-center gap-2">
              <LogIn size={16} /> Retailer Login
            </span>
            <ExternalLink size={14} className="opacity-70" />
          </Link>
          <Link
            href="/distributor/login"
            onClick={onClose}
            className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:text-white font-semibold text-xs transition-colors"
          >
            <span>Distributor Portal</span>
            <ExternalLink size={12} className="opacity-50" />
          </Link>
          <Link
            href="/super-distributor/login"
            onClick={onClose}
            className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:text-white font-semibold text-xs transition-colors"
          >
            <span>Super-Distributor Login</span>
            <ExternalLink size={12} className="opacity-50" />
          </Link>
          <Link
            href="/dit/login"
            onClick={onClose}
            className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:text-white font-semibold text-xs transition-colors"
          >
            <span>DIT Portal Login</span>
            <ExternalLink size={12} className="opacity-50" />
          </Link>
          <Link
            href="/company-admin/login"
            onClick={onClose}
            className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:text-white font-semibold text-xs transition-colors"
          >
            <span>Company Admin Login</span>
            <ExternalLink size={12} className="opacity-50" />
          </Link>
        </div>
      </div>
    </div>
  );
};
