"use client";

import React from "react";
import { Phone, Mail, MapPin, Clock, MessageSquare, Headphones } from "lucide-react";
import { siteConfig } from "@/config/site-config";
import { ContactForm } from "./ContactForm";

import { Pay2PayPageHeader } from "@/components/ui/Pay2PayPageHeader";

export const ContactSection: React.FC = () => {
  return (
    <section id="contact" className="py-20 lg:py-28 2xl:py-36 relative">
      <div className="max-w-[1920px] 2xl:max-w-[2200px] 3xl:max-w-[2600px] 4k:max-w-[3200px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-24">
        {/* Section Header */}
        <Pay2PayPageHeader
          eyebrow="Contact"
          titlePrefix="Contact"
          highlightedTitle="Pay2Pay"
          description="Have a question about Pay2Pay services, partnerships or retailer onboarding? Contact our team for assistance."
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 2xl:gap-16 3xl:gap-24 items-start">
          {/* Left Column: Direct Corporate Contacts */}
          <div className="lg:col-span-5 space-y-4">
            <div className="glass-panel p-6 rounded-2xl flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
                <Headphones size={20} />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400">Toll-Free Merchant Helpline</div>
                <div className="text-base font-bold text-white mt-0.5">{siteConfig.company.tollFree}</div>
                <div className="text-[11px] text-slate-500 mt-1">{siteConfig.company.supportHours}</div>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0">
                <MessageSquare size={20} />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400">WhatsApp Merchant Desk</div>
                <div className="text-base font-bold text-white mt-0.5">{siteConfig.company.whatsapp}</div>
                <div className="text-[11px] text-slate-500 mt-1">Direct support & onboarding queries</div>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
                <Mail size={20} />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400">Official Support Email</div>
                <div className="text-base font-bold text-white mt-0.5">{siteConfig.company.supportEmail}</div>
                <div className="text-[11px] text-slate-500 mt-1">Grievance Desk: {siteConfig.company.grievanceEmail}</div>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center shrink-0">
                <MapPin size={20} />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400">Registered Headquarters</div>
                <div className="text-xs font-medium text-slate-200 mt-1 leading-relaxed">
                  {siteConfig.company.headquarters}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-2">
                  CIN: {siteConfig.company.cin} | GSTIN: {siteConfig.company.gstin}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Inquiry Form */}
          <div className="lg:col-span-7">
            <div className="glass-panel p-8 rounded-3xl border-slate-700/60 shadow-2xl relative">
              <h3 className="text-xl font-bold text-white mb-2">Send an Inquiry</h3>
              <p className="text-xs text-slate-400 mb-6">
                Fill out the form below and our operations specialist will get back to you within 24 hours.
              </p>
              <ContactForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
