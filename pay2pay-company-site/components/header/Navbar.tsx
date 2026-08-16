"use client";

import React, { useState, useEffect } from "react";
import { Menu, LogIn, ChevronDown, Shield, Users, Landmark } from "lucide-react";
import { siteConfig } from "@/config/site-config";
import { MobileMenu } from "./MobileMenu";

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [portalDropdownOpen, setPortalDropdownOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          isScrolled
            ? "glass-nav py-2.5 shadow-lg shadow-black/40"
            : "bg-transparent py-3.5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Brand Logo */}
          <a href="#home" className="flex items-center gap-3 group">
            <img
              src="/branding/pay2pay-logo.png"
              alt="Pay2Pay Logo"
              className="h-10 w-auto max-w-[130px] object-contain rounded-lg border border-amber-500/30 shadow-lg shadow-amber-500/10 group-hover:scale-105 transition-transform"
            />
            <div>
              <span className="font-extrabold text-white text-xl tracking-wider block leading-none">
                {siteConfig.company.brandName}
              </span>
              <span className="text-[10px] font-bold text-amber-400 tracking-widest uppercase block mt-1">
                Enterprise FinTech
              </span>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-900/60 border border-slate-800/80 rounded-full px-4 py-1.5 backdrop-blur-md">
            {siteConfig.navigation.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white rounded-full hover:bg-blue-600/10 transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Right Role Login Actions */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Multi-Portal Dropdown Menu */}
            <div className="relative">
              <button
                onClick={() => setPortalDropdownOpen(!portalDropdownOpen)}
                onBlur={() => setTimeout(() => setPortalDropdownOpen(false), 200)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors border border-transparent hover:border-slate-700"
                aria-expanded={portalDropdownOpen}
              >
                <span>Partner Portals</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${portalDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {portalDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#091122] border border-slate-700/80 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    Select Workspace
                  </div>
                  <a
                    href={process.env.NEXT_PUBLIC_RETAILER_LOGIN_URL || "https://pay2pay.in/retailer/login"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-600/15 text-slate-200 hover:text-white text-xs font-medium transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <StorefrontIcon />
                    </div>
                    <div>
                      <div className="font-semibold">Retailer Portal</div>
                      <div className="text-[10px] text-slate-400">Point of Sale Workspace</div>
                    </div>
                  </a>
                  <a
                    href={process.env.NEXT_PUBLIC_DIT_LOGIN_URL || "/dit-dashboard"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-indigo-600/15 text-slate-200 hover:text-white text-xs font-medium transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Users size={14} />
                    </div>
                    <div>
                      <div className="font-semibold">Distributor Portal</div>
                      <div className="text-[10px] text-slate-400">DIT Management</div>
                    </div>
                  </a>
                  <a
                    href={process.env.NEXT_PUBLIC_SD_LOGIN_URL || "/sd-dashboard"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-amber-600/15 text-slate-200 hover:text-white text-xs font-medium transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                      <Landmark size={14} />
                    </div>
                    <div>
                      <div className="font-semibold">Super-Distributor</div>
                      <div className="text-[10px] text-slate-400">Master Franchise Hub</div>
                    </div>
                  </a>
                </div>
              )}
            </div>

            {/* Primary Retailer Login Button */}
            <a
              href={process.env.NEXT_PUBLIC_RETAILER_LOGIN_URL || "https://pay2pay.in/retailer/login"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:brightness-110 active:scale-95 transition-all"
            >
              <LogIn size={14} />
              <span>Retailer Login</span>
            </a>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/60 lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </>
  );
};

function StorefrontIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
      <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
      <path d="M2 7h20"/>
      <path d="M22 7a5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1-5 5 5 5 0 0 1-5-5"/>
    </svg>
  );
}
