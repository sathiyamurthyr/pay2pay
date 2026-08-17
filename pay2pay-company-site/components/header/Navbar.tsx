"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LogIn, ChevronDown, Shield, Users, Landmark } from "lucide-react";
import { siteConfig } from "@/config/site-config";
import { MobileMenu } from "./MobileMenu";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
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
        <div className="max-w-[1920px] 2xl:max-w-[2200px] 3xl:max-w-[2600px] 4k:max-w-[3200px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-24 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 2xl:gap-4 group">
            <img
              src="/branding/pay2pay-logo.png"
              alt="Pay2Pay Logo"
              className="h-10 2xl:h-12 3xl:h-14 w-auto max-w-[130px] 2xl:max-w-[160px] object-contain rounded-lg border border-amber-500/30 shadow-lg shadow-amber-500/10 group-hover:scale-105 transition-transform"
            />
            <div>
              <span className="font-extrabold text-white text-xl 2xl:text-2xl 3xl:text-3xl tracking-wider block leading-none">
                {siteConfig.company.brandName}
              </span>
              <span className="text-[10px] 2xl:text-xs 3xl:text-sm font-bold text-amber-400 tracking-widest uppercase block mt-1">
                Enterprise FinTech
              </span>
            </div>
          </Link>

          {/* Desktop Navigation with Active State Highlighting */}
          <nav className="hidden lg:flex items-center gap-1 2xl:gap-2 3xl:gap-3 bg-slate-900/60 border border-slate-800/80 rounded-full px-4 py-1.5 2xl:px-6 2xl:py-2 3xl:px-8 3xl:py-2.5 backdrop-blur-md">
            {siteConfig.navigation.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href + "/"));

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`px-3.5 py-1.5 2xl:px-4 2xl:py-2 text-xs 2xl:text-sm 3xl:text-base font-semibold rounded-full transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-blue-600/25 text-white border border-blue-500/40 shadow-sm shadow-blue-500/20"
                      : "text-slate-300 hover:text-white hover:bg-blue-600/10"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Role Login Actions */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Multi-Portal Dropdown Menu */}
            <div className="relative">
              <div className="flex items-center">
                <Link
                  href="/partner-portals"
                  className={`px-3 py-2 text-xs font-semibold rounded-l-lg transition-colors border border-r-0 ${
                    pathname === "/partner-portals"
                      ? "bg-blue-600/20 text-white border-blue-500/30"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/60 border-transparent hover:border-slate-700"
                  }`}
                >
                  Partner Portals
                </Link>
                <button
                  onClick={() => setPortalDropdownOpen(!portalDropdownOpen)}
                  onBlur={() => setTimeout(() => setPortalDropdownOpen(false), 200)}
                  className="px-2 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-r-lg hover:bg-slate-800/60 transition-colors border border-l-0 border-transparent hover:border-slate-700"
                  aria-expanded={portalDropdownOpen}
                  aria-label="Toggle portal menu"
                >
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${
                      portalDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>

              {portalDropdownOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-[#091122] border border-slate-700/80 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 flex items-center justify-between">
                    <span>Select Workspace</span>
                    <Link
                      href="/partner-portals"
                      className="text-[10px] text-blue-400 hover:underline normal-case"
                    >
                      View Hub →
                    </Link>
                  </div>
                  <Link
                    href="/retailer/login"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-600/15 text-slate-200 hover:text-white text-xs font-medium transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <StorefrontIcon />
                    </div>
                    <div>
                      <div className="font-semibold">Retailer Portal</div>
                      <div className="text-[10px] text-slate-400">Point of Sale Workspace</div>
                    </div>
                  </Link>
                  <Link
                    href="/distributor/login"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-indigo-600/15 text-slate-200 hover:text-white text-xs font-medium transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Users size={14} />
                    </div>
                    <div>
                      <div className="font-semibold">Distributor Portal</div>
                      <div className="text-[10px] text-slate-400">Network Management</div>
                    </div>
                  </Link>
                  <Link
                    href="/super-distributor/login"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-amber-600/15 text-slate-200 hover:text-white text-xs font-medium transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                      <Landmark size={14} />
                    </div>
                    <div>
                      <div className="font-semibold">Super-Distributor</div>
                      <div className="text-[10px] text-slate-400">Master Franchise Hub</div>
                    </div>
                  </Link>
                  <Link
                    href="/dit/login"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-cyan-600/15 text-slate-200 hover:text-white text-xs font-medium transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center group-hover:bg-cyan-600 group-hover:text-white transition-colors">
                      <Shield size={14} />
                    </div>
                    <div>
                      <div className="font-semibold">DIT Portal</div>
                      <div className="text-[10px] text-slate-400">Technical Operations</div>
                    </div>
                  </Link>
                  <Link
                    href="/company-admin/login"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-purple-600/15 text-slate-200 hover:text-white text-xs font-medium transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                      <Shield size={14} />
                    </div>
                    <div>
                      <div className="font-semibold">Company Admin</div>
                      <div className="text-[10px] text-slate-400">Enterprise Control</div>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            {/* Primary Retailer Login Button */}
            <Link
              href="/retailer/login"
              className="inline-flex items-center justify-center gap-2 h-11 px-5 sm:px-6 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm tracking-wide shadow-lg shadow-blue-500/35 hover:shadow-xl hover:shadow-blue-500/50 hover:-translate-y-0.5 active:translate-y-0 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-[#050B14] transition-all duration-200 cursor-pointer"
            >
              <LogIn size={16} className="text-white shrink-0" />
              <span className="whitespace-nowrap">Retailer Login</span>
            </Link>
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
