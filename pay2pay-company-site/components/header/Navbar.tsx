"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LogIn, ChevronDown, Shield, Users, Landmark, Store, Layers } from "lucide-react";
import { siteConfig } from "@/config/site-config";
import { MobileMenu } from "./MobileMenu";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [portalDropdownOpen, setPortalDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setPortalDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          isScrolled
            ? "glass-nav py-2.5 shadow-2xl shadow-black/80"
            : "bg-transparent py-3.5 sm:py-4"
        }`}
      >
        <div className="max-w-[1920px] 2xl:max-w-[2200px] 3xl:max-w-[2600px] 4k:max-w-[3200px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-24 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 2xl:gap-3.5 group">
            <div className="relative p-1.5 rounded-xl bg-slate-900/90 border border-slate-700/60 shadow-md group-hover:border-blue-500/50 transition-all flex items-center justify-center">
              <img
                src="/branding/pay2pay-logo.png"
                alt="Pay2Pay Logo"
                width={140}
                height={36}
                style={{ maxHeight: "36px", width: "auto", objectFit: "contain" }}
                className="h-8 2xl:h-9 3xl:h-10 w-auto object-contain rounded-lg group-hover:scale-105 transition-transform"
              />
            </div>
            <span className="font-extrabold text-white text-lg sm:text-xl 2xl:text-2xl tracking-wider block leading-none">
              {siteConfig.company.brandName}
            </span>
          </Link>

          {/* Desktop Navigation with Active State Highlighting */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 2xl:gap-2 bg-slate-900/75 border border-slate-800/80 rounded-full px-3 py-1.5 xl:px-4 2xl:px-5 2xl:py-2 backdrop-blur-xl shadow-lg shadow-black/20">
            {siteConfig.navigation.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href + "/"));

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`px-3 py-1.5 xl:px-3.5 2xl:px-4 text-xs 2xl:text-sm font-semibold rounded-full transition-all whitespace-nowrap ${
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
            <div className="relative" ref={dropdownRef}>
              <div className="flex items-center rounded-xl bg-slate-900/75 border border-slate-800 hover:border-slate-700 transition-colors shadow-sm">
                <Link
                  href="/partner-portals"
                  className={`px-3.5 py-2 text-xs font-semibold rounded-l-xl transition-colors ${
                    pathname === "/partner-portals"
                      ? "bg-blue-600/20 text-white"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  Partner Portals
                </Link>
                <button
                  type="button"
                  onClick={() => setPortalDropdownOpen(!portalDropdownOpen)}
                  className="px-2 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-r-xl border-l border-slate-800 hover:bg-slate-800/60 transition-colors cursor-pointer"
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
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#091122]/98 border border-slate-700/80 shadow-2xl backdrop-blur-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800/80 flex items-center justify-between">
                    <span>Select Workspace</span>
                    <Link
                      href="/partner-portals"
                      onClick={() => setPortalDropdownOpen(false)}
                      className="text-[10px] text-blue-400 hover:underline normal-case font-semibold"
                    >
                      View All →
                    </Link>
                  </div>
                  <a
                    href="https://retailer.pay2pay.in/retailer/login"
                    onClick={() => setPortalDropdownOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-600/15 text-slate-200 hover:text-white text-xs font-medium transition-colors group mt-1"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                      <Store size={14} />
                    </div>
                    <div>
                      <div className="font-semibold text-white">Retailer Portal</div>
                      <div className="text-[10px] text-slate-400">Point of Sale Workspace</div>
                    </div>
                  </a>
                  <Link
                    href="/distributor/login"
                    onClick={() => setPortalDropdownOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-indigo-600/15 text-slate-200 hover:text-white text-xs font-medium transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
                      <Users size={14} />
                    </div>
                    <div>
                      <div className="font-semibold text-white">Distributor Portal</div>
                      <div className="text-[10px] text-slate-400">Network Liquidity & Agents</div>
                    </div>
                  </Link>
                  <Link
                    href="/super-distributor/login"
                    onClick={() => setPortalDropdownOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-amber-600/15 text-slate-200 hover:text-white text-xs font-medium transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors shrink-0">
                      <Landmark size={14} />
                    </div>
                    <div>
                      <div className="font-semibold text-white">Super-Distributor</div>
                      <div className="text-[10px] text-slate-400">Master Franchise Zonal Hub</div>
                    </div>
                  </Link>
                  <Link
                    href="/dit/login"
                    onClick={() => setPortalDropdownOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-cyan-600/15 text-slate-200 hover:text-white text-xs font-medium transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center group-hover:bg-cyan-600 group-hover:text-white transition-colors shrink-0">
                      <Layers size={14} />
                    </div>
                    <div>
                      <div className="font-semibold text-white">DIT Operations</div>
                      <div className="text-[10px] text-slate-400">Technical Diagnostics</div>
                    </div>
                  </Link>
                  <Link
                    href="/company-admin/login"
                    onClick={() => setPortalDropdownOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-purple-600/15 text-slate-200 hover:text-white text-xs font-medium transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors shrink-0">
                      <Shield size={14} />
                    </div>
                    <div>
                      <div className="font-semibold text-white">Company Admin</div>
                      <div className="text-[10px] text-slate-400">Enterprise Control</div>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            {/* Primary Retailer Login Button */}
            <a
              href="https://retailer.pay2pay.in/retailer/login"
              className="inline-flex items-center justify-center gap-2 h-10 2xl:h-11 px-5 2xl:px-6 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white font-bold text-xs 2xl:text-sm tracking-wide shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/45 hover:-translate-y-0.5 active:translate-y-0 border border-white/20 transition-all duration-200 cursor-pointer"
            >
              <LogIn size={15} className="text-white shrink-0" />
              <span className="whitespace-nowrap">Retailer Login</span>
            </a>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2.5 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800/80 lg:hidden border border-slate-800"
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

