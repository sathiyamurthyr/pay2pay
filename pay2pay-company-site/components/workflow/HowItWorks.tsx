"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2, FilePlus, FileCheck, Wallet2, CreditCard } from "lucide-react";
import { Pay2PayPageHeader } from "@/components/ui/Pay2PayPageHeader";

const simplifiedSteps = [
  {
    number: "01",
    title: "Register",
    subtitle: "Partner Onboarding",
    description: "Submit online application with basic mobile and business details in minutes.",
    icon: FilePlus,
  },
  {
    number: "02",
    title: "Verify",
    subtitle: "Paperless KYC",
    description: "Automated Aadhaar, PAN, and penny-drop bank account validation within 24 hours.",
    icon: FileCheck,
  },
  {
    number: "03",
    title: "Activate",
    subtitle: "Virtual Accounts",
    description: "Auto-provision dedicated virtual accounts for 24x7 wallet top-ups via IMPS/NEFT/UPI.",
    icon: Wallet2,
  },
  {
    number: "04",
    title: "Transact",
    subtitle: "Instant Settlement",
    description: "Process DMT, AEPS, and BBPS transactions with instant commission crediting to your wallet.",
    icon: CreditCard,
  },
];

export const HowItWorks: React.FC = () => {
  return (
    <section id="how-it-works" className="py-20 lg:py-28 2xl:py-36 relative">
      <div className="max-w-[1920px] 2xl:max-w-[2200px] 3xl:max-w-[2600px] 4k:max-w-[3200px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-24">
        {/* Section Header */}
        <Pay2PayPageHeader
          eyebrow="Workflow Preview"
          titlePrefix="How"
          highlightedTitle="Pay2Pay Works"
          description="From partner onboarding to secure transaction processing, Pay2Pay provides a structured digital workflow."
        />

        {/* Visual & Summary Card */}
        <div className="glass-panel p-6 sm:p-10 2xl:p-12 rounded-3xl border-slate-700/60 shadow-2xl mb-12 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left: Workflow Visual Image */}
            <div className="lg:col-span-6 relative rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl group">
              <div className="relative aspect-video w-full">
                <Image
                  src="/images/workflow-preview.jpg"
                  alt="Pay2Pay 4-Step Operational Lifecycle"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-slate-300 font-mono bg-slate-900/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700/80">
                <span className="text-blue-400 font-bold">Fast-Track Onboarding</span>
                <span>Live in 24 Hours</span>
              </div>
            </div>

            {/* Right: Operational Highlights */}
            <div className="lg:col-span-6 space-y-5">
              <h3 className="text-xl sm:text-2xl 2xl:text-3xl font-extrabold text-white leading-tight">
                Streamlined Digital Lifecycle for Frictionless Merchant Earnings
              </h3>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Pay2Pay eliminates manual paper delays. Experience instant automated document verification, automatic dedicated virtual bank account creation, and immediate access to high-margin banking rails.
              </p>

              <div className="space-y-2.5 pt-2">
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <CheckCircle2 size={16} className="text-blue-400 shrink-0" />
                  <span>Instant Aadhaar OTP & PAN penny-drop verification</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>Individual Virtual Account Numbers (VAN) for instant wallet top-ups</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <CheckCircle2 size={16} className="text-amber-400 shrink-0" />
                  <span>Sub-second multi-switch routing across sponsor banking rails</span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/how-it-works"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition-all hover:scale-105"
                >
                  <span>See How It Works</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 4-Step Simplified Flow Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {simplifiedSteps.map((step) => {
            const IconComp = step.icon;
            return (
              <div
                key={step.number}
                className="glass-panel p-7 rounded-2xl relative flex flex-col justify-between hover:border-blue-500/40 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 font-mono font-black text-lg text-white flex items-center justify-center shadow-lg shadow-blue-600/25 group-hover:scale-105 transition-transform">
                      {step.number}
                    </div>
                    <span className="text-[10px] font-bold text-blue-400 bg-blue-600/15 border border-blue-500/20 px-2.5 py-0.5 rounded-full uppercase">
                      Phase {step.number}
                    </span>
                  </div>

                  <h4 className="text-lg font-bold text-white mb-1 group-hover:text-blue-300 transition-colors">
                    {step.title}
                  </h4>
                  <div className="text-xs font-semibold text-blue-400 mb-2">
                    {step.subtitle}
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    {step.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center text-xs text-slate-500 font-medium">
                  <span className="group-hover:text-slate-300 transition-colors">Step 0{step.number} Completion →</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
