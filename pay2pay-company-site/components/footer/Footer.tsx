"use client";

import React from "react";
import { siteConfig } from "@/config/site-config";
import { getCurrentYear } from "@/lib/utils";

interface FooterProps {
  onOpenLegal: (docId: "terms" | "privacy" | "refund") => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenLegal }) => {
  const currentYear = getCurrentYear();

  return (
    <footer className="bg-[#03070E] border-t border-slate-800 text-slate-400 text-xs pt-16 pb-12 2xl:pt-24 2xl:pb-16">
      <div className="max-w-[1920px] 2xl:max-w-[2200px] 3xl:max-w-[2600px] 4k:max-w-[3200px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 2xl:gap-14 pb-12 2xl:pb-16 border-b border-slate-800/80">
          {/* Col 1: Brand & Tagline (Span 2) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="/branding/pay2pay-logo.png"
                alt="Pay2Pay"
                className="h-10 w-auto max-w-[130px] object-contain rounded-lg border border-amber-500/30 shadow-md"
              />
              <span className="font-extrabold text-white text-lg tracking-wider">
                {siteConfig.company.brandName}
              </span>
            </div>

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
                <a href="#about" className="hover:text-blue-400 transition-colors">About Pay2Pay</a>
              </li>
              <li>
                <a href="#services" className="hover:text-blue-400 transition-colors">Services</a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-blue-400 transition-colors">How It Works</a>
              </li>
              <li>
                <a href="#security" className="hover:text-blue-400 transition-colors">Security</a>
              </li>
              <li>
                <a href="#contact" className="hover:text-blue-400 transition-colors">Contact</a>
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
                <a
                  href={process.env.NEXT_PUBLIC_RETAILER_LOGIN_URL || "https://pay2pay.in/retailer/login"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-400 transition-colors font-medium"
                >
                  Retailer Login
                </a>
              </li>
              <li>
                <a
                  href={process.env.NEXT_PUBLIC_DISTRIBUTOR_LOGIN_URL || "/distributor/login"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-400 transition-colors"
                >
                  Distributor Login
                </a>
              </li>
              <li>
                <a
                  href={process.env.NEXT_PUBLIC_SD_LOGIN_URL || "/super-distributor/login"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-400 transition-colors"
                >
                  Super Distributor Login
                </a>
              </li>
              <li>
                <a
                  href={process.env.NEXT_PUBLIC_DIT_LOGIN_URL || "/dit-dashboard"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-400 transition-colors"
                >
                  DIT Login
                </a>
              </li>
              <li>
                <a
                  href={process.env.NEXT_PUBLIC_ADMIN_LOGIN_URL || "/admin/login"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-400 transition-colors"
                >
                  Company Admin Login
                </a>
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
                <button
                  onClick={() => onOpenLegal("terms")}
                  className="hover:text-blue-400 transition-colors text-left"
                >
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenLegal("privacy")}
                  className="hover:text-blue-400 transition-colors text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenLegal("refund")}
                  className="hover:text-blue-400 transition-colors text-left"
                >
                  Refund / Cancellation Policy
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Headquarters */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            © {currentYear} Pay2Pay. All rights reserved.
          </div>
          <div className="text-center sm:text-right text-slate-500 max-w-md">
            Headquarters: {siteConfig.company.headquarters}
          </div>
        </div>
      </div>
    </footer>
  );
};
