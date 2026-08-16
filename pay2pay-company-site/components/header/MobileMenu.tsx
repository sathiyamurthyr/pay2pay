"use client";

import React from "react";
import { X, LogIn, ExternalLink } from "lucide-react";
import { siteConfig } from "@/config/site-config";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex md:hidden">
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
            <div className="flex items-center gap-2">
              <img
                src="/branding/pay2pay-logo.png"
                alt="Pay2Pay"
                className="h-9 w-auto max-w-[100px] object-contain rounded-lg border border-amber-500/30"
              />
              <span className="font-extrabold text-white text-base tracking-wider">PAY2PAY</span>
            </div>
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
            {siteConfig.navigation.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={onClose}
                className="px-4 py-3 rounded-lg text-slate-300 hover:text-white hover:bg-blue-600/10 hover:border-l-2 hover:border-blue-500 font-medium text-sm transition-all"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Portal Access Actions */}
        <div className="pt-6 border-t border-slate-800 flex flex-col gap-2.5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Access Portals
          </span>
          <a
            href={process.env.NEXT_PUBLIC_RETAILER_LOGIN_URL || "https://pay2pay.in/retailer/login"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-600/30 active:scale-95 transition-transform"
          >
            <span className="flex items-center gap-2">
              <LogIn size={16} /> Retailer Login
            </span>
            <ExternalLink size={14} className="opacity-70" />
          </a>
          <a
            href={process.env.NEXT_PUBLIC_DIT_LOGIN_URL || "/dit-dashboard"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:text-white font-semibold text-xs transition-colors"
          >
            <span>DIT Portal Login</span>
            <ExternalLink size={12} className="opacity-50" />
          </a>
          <a
            href={process.env.NEXT_PUBLIC_SD_LOGIN_URL || "/sd-dashboard"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:text-white font-semibold text-xs transition-colors"
          >
            <span>Super-Distributor Login</span>
            <ExternalLink size={12} className="opacity-50" />
          </a>
        </div>
      </div>
    </div>
  );
};
