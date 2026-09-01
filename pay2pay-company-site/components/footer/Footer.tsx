"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Lock, Award, Clock } from "lucide-react";
import { siteConfig } from "@/config/site-config";

interface FooterProps {
  onOpenLegal?: (docId: "terms" | "privacy" | "refund") => void;
}

export const Footer: React.FC<FooterProps> = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#02050D] border-t border-slate-800/80 text-slate-400 text-xs pt-16 pb-12 2xl:pt-20 2xl:pb-16 relative">
      <div className="max-w-[1920px] 2xl:max-w-[2200px] 3xl:max-w-[2600px] 4k:max-w-[3200px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-24">
        
        {/* Trust & Compliance Badges Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-2xl bg-slate-900/50 border border-slate-800/70 mb-12 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/15 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/25">
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-white">NPCI BBPS</div>
              <div className="text-[10px] text-slate-400">Validated Infrastructure</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/15 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/25">
              <Lock size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-white">TLS 1.3 & 256-Bit</div>
              <div className="text-[10px] text-slate-400">End-to-End Encryption</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-600/15 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/25">
              <Award size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-white">ISO 27001 Ready</div>
              <div className="text-[10px] text-slate-400">Security Architecture</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/15 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/25">
              <Clock size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-white">99.98% Uptime</div>
              <div className="text-[10px] text-slate-400">24x7 Core Settlement</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 2xl:gap-14 pb-12 2xl:pb-16 border-b border-slate-800/80">
          {/* Col 1: Brand & Tagline (Span 2) */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3 inline-flex">
              <div className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                <img
                  src="/branding/pay2pay-logo.png"
                  alt="Pay2Pay"
                  width={130}
                  height={32}
                  style={{ maxHeight: "32px", width: "auto", objectFit: "contain" }}
                  className="h-8 w-auto object-contain rounded-md"
                />
              </div>
              <span className="font-extrabold text-white text-lg tracking-wider block leading-none">
                {siteConfig.company.brandName}
              </span>
            </Link>

            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              {siteConfig.company.tagline}. Powering secure, scalable, and connected digital financial services for retail networks across India.
            </p>

            <div className="text-[11px] text-slate-400 font-mono space-y-1">
              <div className="font-semibold text-slate-200">SUPER REX PRODUCTS PRIVATE LIMITED</div>
              <div>CIN: {siteConfig.company.cin}</div>
              <div>GSTIN: {siteConfig.company.gstin}</div>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-4">
              Company
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/about" className="hover:text-blue-400 transition-colors">About Pay2Pay</Link>
              </li>
              <li>
                <Link href="/services" className="hover:text-blue-400 transition-colors">Services Catalogue</Link>
              </li>
              <li>
                <Link href="/ecosystem" className="hover:text-blue-400 transition-colors">Ecosystem</Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-blue-400 transition-colors">How It Works</Link>
              </li>
              <li>
                <Link href="/security" className="hover:text-blue-400 transition-colors">Security Architecture</Link>
              </li>
              <li>
                <Link href="/workspaces" className="hover:text-blue-400 transition-colors">Workspaces</Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-blue-400 transition-colors">Contact Support</Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Portal Logins */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-4">
              Partner Access
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/partner-portals"
                  className="hover:text-blue-400 transition-colors font-semibold text-blue-400"
                >
                  Partner Portals Hub →
                </Link>
              </li>
              <li>
                <a
                  href="https://retailer.pay2pay.in/retailer/login"
                  className="hover:text-blue-400 transition-colors"
                >
                  Retailer Login
                </a>
              </li>
              <li>
                <Link
                  href="/distributor/login"
                  className="hover:text-blue-400 transition-colors"
                >
                  Distributor Login
                </Link>
              </li>
              <li>
                <Link
                  href="/super-distributor/login"
                  className="hover:text-blue-400 transition-colors"
                >
                  Super Distributor Login
                </Link>
              </li>
              <li>
                <Link
                  href="/dit/login"
                  className="hover:text-blue-400 transition-colors"
                >
                  DIT Login
                </Link>
              </li>
              <li>
                <Link
                  href="/company-admin/login"
                  className="hover:text-blue-400 transition-colors"
                >
                  Company Admin Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Legal & Policies */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-4">
              Compliance & Legal
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/terms"
                  className="hover:text-blue-400 transition-colors block"
                >
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-blue-400 transition-colors block"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/refund-policy"
                  className="hover:text-blue-400 transition-colors block"
                >
                  Refund & Cancellation Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Headquarters */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div className="space-y-1 text-center sm:text-left">
            <div className="text-slate-300 font-bold text-xs">SUPER REX PRODUCTS PRIVATE LIMITED</div>
            <div>© 2021 SUPER REX PRODUCTS PRIVATE LIMITED. All Rights Reserved.</div>
            <div className="text-slate-400 font-medium">{siteConfig.company.brandName} Enterprise Financial Network</div>
          </div>
          <div className="text-center sm:text-right text-slate-400 max-w-md">
            Headquarters: {siteConfig.company.headquarters}
          </div>
        </div>
      </div>
    </footer>
  );
};

