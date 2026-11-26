"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck, Zap } from "lucide-react";
import DemoShell from "@/components/inspel-demo/DemoShell";
import ProductCatalogueGrid from "@/components/inspel-demo/ProductCatalogueGrid";
import { resolveDemoPath } from "@/lib/inspel-demo-api";

export default function InspelDemoLandingPage() {
  return (
    <DemoShell>
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#040E2B] via-[#0F1E5C] to-[#1A56DB] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.22),transparent_55%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-blue-200 mb-5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              INSPEL TECHNOLOGIES SOLUTIONS • Official Vendor Demo Portal
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Enterprise Payment Products with Live BankMe Checkout
            </h1>
            <p className="mt-4 text-base sm:text-lg text-blue-100/90 max-w-2xl leading-relaxed">
              Explore all eight INSPEL fintech modules individually, review automatic 18% GST pricing breakdowns, confirm your order, and complete real-time payment flows end-to-end.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href={resolveDemoPath("/catalogue")}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-[#040E2B] hover:bg-blue-50 font-bold text-sm shadow-lg transition-colors"
              >
                Browse 8 Products
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href={resolveDemoPath("/login")}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#1A56DB] hover:bg-[#1648C8] text-white font-semibold text-sm border border-white/20 transition-colors"
              >
                <LockKeyhole className="w-4 h-4" />
                Vendor Login
              </Link>
              <Link
                href={resolveDemoPath("/register")}
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-colors"
              >
                Register Account
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/15 pb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-200">
                  Demo Vendor Quick Access
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  LIVE SANDBOX / PAY-IN
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[11px] text-blue-200">User ID / Mobile</div>
                  <div className="font-mono font-bold text-white mt-0.5">9876512345</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[11px] text-blue-200">Password</div>
                  <div className="font-mono font-bold text-white mt-0.5">Demo2026!</div>
                </div>
              </div>
              <div className="space-y-2 text-xs text-blue-100/90 pt-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Individual fixed INR pricing under ₹50,000 + automated 18% GST</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Zero subscriptions or monthly plans — pay per individual product</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>Official BankMe Pay-in order, webhook verification &amp; GST receipt</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ProductCatalogueGrid />
    </DemoShell>
  );
}
