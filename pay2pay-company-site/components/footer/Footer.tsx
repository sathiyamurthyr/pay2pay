"use client";

import React from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site-config";
import { getCurrentYear } from "@/lib/utils";

interface FooterProps {
  onOpenLegal?: (docId: "terms" | "privacy" | "refund") => void;
}

export const Footer: React.FC<FooterProps> = () => {
  const currentYear = getCurrentYear();

  return (
    <footer className="bg-[#03070E] border-t border-slate-800 text-slate-400 text-xs pt-16 pb-12 2xl:pt-24 2xl:pb-16">
      <div className="max-w-[1920px] 2xl:max-w-[2200px] 3xl:max-w-[2600px] 4k:max-w-[3200px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 2xl:gap-14 pb-12 2xl:pb-16 border-b border-slate-800/80">
          {/* Col 1: Brand & Tagline (Span 2) */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3 inline-flex">
              <img
                src="/branding/pay2pay-logo.png"
                alt="Pay2Pay"
                className="h-10 w-auto max-w-[130px] object-contain rounded-lg border border-amber-500/30 shadow-md"
              />
              <span className="font-extrabold text-white text-lg tracking-wider">
                {siteConfig.company.brandName}
              </span>
            </Link>

            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              {siteConfig.company.tagline}. Powering secure, scalable, and connected digital financial services for retail networks across India.
            </p>

            <div className="text-[11px] text-slate-500 font-mono space-y-0.5">
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
                <Link href="/services" className="hover:text-blue-400 transition-colors">Services</Link>
              </li>
              <li>
                <Link href="/ecosystem" className="hover:text-blue-400 transition-colors">Ecosystem</Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-blue-400 transition-colors">How It Works</Link>
              </li>
              <li>
                <Link href="/security" className="hover:text-blue-400 transition-colors">Security</Link>
              </li>
              <li>
                <Link href="/workspaces" className="hover:text-blue-400 transition-colors">Workspaces</Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-blue-400 transition-colors">Contact</Link>
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
                  className="hover:text-blue-400 transition-colors font-medium text-blue-400"
                >
                  Partner Portals Hub →
                </Link>
              </li>
              <li>
                <Link
                  href="/retailer/login"
                  className="hover:text-blue-400 transition-colors"
                >
                  Retailer Login
                </Link>
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
              Legal
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
          <div>
            © {currentYear} {siteConfig.company.brandName} Financial Technologies Private Limited. All rights reserved.
          </div>
          <div className="text-center sm:text-right text-slate-500 max-w-md">
            Headquarters: {siteConfig.company.headquarters}
          </div>
        </div>
      </div>
    </footer>
  );
};
