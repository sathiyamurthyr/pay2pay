import type { Metadata } from "next";
import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageSquare,
  Headphones,
  Building2,
  ShieldCheck,
  CheckCircle2,
  FileCheck,
} from "lucide-react";
import { siteConfig } from "@/config/site-config";
import { ContactForm } from "@/components/contact/ContactForm";
import { Pay2PayPageHeader } from "@/components/ui/Pay2PayPageHeader";

export const metadata: Metadata = {
  title: "Contact Us | Pay2Pay Enterprise FinTech",
  description:
    "Get in touch with Pay2Pay for partner onboarding, business partnerships, retailer support, and technical inquiries.",
};

export default function ContactPage() {
  return (
    <div className="pt-28 pb-20 lg:pt-36 lg:pb-28 2xl:pt-40 2xl:pb-36">
      <div className="max-w-[1920px] 2xl:max-w-[2200px] 3xl:max-w-[2600px] 4k:max-w-[3200px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-24">
        {/* 1. Page Header */}
        <Pay2PayPageHeader
          eyebrow="Get In Touch"
          titlePrefix="Contact"
          highlightedTitle="Pay2Pay"
          description="Have a question regarding partner onboarding, service integration, or merchant workstation support? Our corporate desk is here to assist you."
        />

        {/* 2. Main Contact Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 2xl:gap-16 items-start mb-16 2xl:mb-24">
          {/* Left Column: Direct Corporate Channels (Span 5) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="glass-panel p-6 sm:p-7 rounded-3xl flex items-start gap-4 shadow-lg border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/10">
                <Headphones size={24} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Toll-Free Merchant Helpline</div>
                <div className="text-xl font-extrabold text-white mt-1 font-mono">{siteConfig.company.tollFree}</div>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                  <Clock size={12} className="text-blue-400" />
                  <span>{siteConfig.company.supportHours}</span>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 sm:p-7 rounded-3xl flex items-start gap-4 shadow-lg border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/10">
                <MessageSquare size={24} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">WhatsApp Merchant Desk</div>
                <div className="text-xl font-extrabold text-emerald-400 mt-1 font-mono">{siteConfig.company.whatsapp}</div>
                <div className="text-xs text-slate-400 mt-1">Direct support & onboarding queries</div>
              </div>
            </div>

            <div className="glass-panel p-6 sm:p-7 rounded-3xl flex items-start gap-4 shadow-lg border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/10">
                <Mail size={24} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Official Email Desks</div>
                <div className="text-base font-bold text-white mt-1">
                  <a href={`mailto:${siteConfig.company.supportEmail}`} className="hover:underline">
                    {siteConfig.company.supportEmail}
                  </a>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Grievance Desk:{" "}
                  <a href={`mailto:${siteConfig.company.grievanceEmail}`} className="text-blue-400 hover:underline">
                    {siteConfig.company.grievanceEmail}
                  </a>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 sm:p-7 rounded-3xl flex items-start gap-4 shadow-lg border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-amber-600/20 text-amber-400 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/10">
                <MapPin size={24} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Corporate Entity & Headquarters</div>
                <div className="text-sm font-bold text-white mt-1">SUPER REX PRODUCTS PRIVATE LIMITED</div>
                <div className="text-xs font-medium text-slate-300 mt-1 leading-relaxed">
                  {siteConfig.company.headquarters}
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-2 pt-2 border-t border-slate-800">
                  CIN: {siteConfig.company.cin} | GSTIN: {siteConfig.company.gstin}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Inquiry Form (Span 7) */}
          <div className="lg:col-span-7">
            <div className="glass-panel p-8 sm:p-10 rounded-3xl border-slate-700/60 shadow-2xl relative">
              <h3 className="text-2xl font-bold text-white mb-2">Send an Inquiry to Pay2Pay</h3>
              <p className="text-xs sm:text-sm text-slate-400 mb-8">
                Whether you want to become a retailer, apply for a distribution franchise, or need technical support, submit your details below and our operations specialist will reach out within 24 hours.
              </p>
              <ContactForm />
            </div>
          </div>
        </div>

        {/* 3. Departmental Directory */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 2xl:mb-24">
          <div className="glass-panel p-6 rounded-2xl border-slate-800">
            <h4 className="font-bold text-white text-base mb-2">Partner Onboarding</h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              For retailers, distributors, and super distributors looking to join the Pay2Pay network.
            </p>
            <div className="text-xs font-semibold text-blue-400">Email: {siteConfig.company.supportEmail}</div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border-slate-800">
            <h4 className="font-bold text-white text-base mb-2">Technical & API Support</h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              For device driver integration, biometric scanner assistance, and gateway telemetry.
            </p>
            <div className="text-xs font-semibold text-indigo-400">Phone: {siteConfig.company.tollFree}</div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border-slate-800">
            <h4 className="font-bold text-white text-base mb-2">Grievance & Redressal</h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              For escalated transaction disputes, data privacy concerns, and compliance inquiries.
            </p>
            <div className="text-xs font-semibold text-amber-400">Officer: {siteConfig.company.nodalOfficer}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
