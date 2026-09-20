"use client";

import React, { useState } from "react";
import {
  LifeBuoy,
  Phone,
  Mail,
  MessageSquare,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck
} from "lucide-react";

export default function DistributorSupportPage() {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("WALLET_TOPUP");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setSubject("");
      setMessage("");
    }, 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="pb-2 border-b border-white/[0.06]">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
          Distributor Partner Support
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Dedicated assistance for distributor wallet liquidity, retailer onboarding, and MDR queries.
        </p>
      </div>

      {/* Support Channels Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-[#111827]/80 backdrop-blur-xl border border-white/[0.08] p-5 shadow-xl">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3">
            <Phone className="w-5 h-5 text-amber-400" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">Direct Help Desk</h3>
          <p className="text-xs text-slate-400 mb-2">Priority distributor hotline</p>
          <a
            href="tel:+918001234567"
            className="text-xs font-bold text-amber-300 font-mono hover:underline"
          >
            +91 800 123 4567
          </a>
        </div>

        <div className="rounded-2xl bg-[#111827]/80 backdrop-blur-xl border border-white/[0.08] p-5 shadow-xl">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
            <Mail className="w-5 h-5 text-blue-400" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">Email Support</h3>
          <p className="text-xs text-slate-400 mb-2">Response within 2 hours</p>
          <a
            href="mailto:distributor-support@pay2pay.in"
            className="text-xs font-bold text-blue-400 hover:underline"
          >
            distributor-support@pay2pay.in
          </a>
        </div>

        <div className="rounded-2xl bg-[#111827]/80 backdrop-blur-xl border border-white/[0.08] p-5 shadow-xl">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3">
            <Clock className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">Operating Hours</h3>
          <p className="text-xs text-slate-400 mb-2">Available 7 days a week</p>
          <span className="text-xs font-bold text-emerald-300">
            08:00 AM - 10:00 PM IST
          </span>
        </div>
      </div>

      {/* Ticket Submission Card */}
      <div className="rounded-2xl bg-[#111827]/80 backdrop-blur-xl border border-white/[0.08] p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-white/[0.06]">
          <MessageSquare className="w-4 h-4 text-amber-400" />
          Raise a Priority Support Ticket
        </h3>

        {submitted ? (
          <div className="py-8 text-center space-y-2">
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">Ticket Submitted Successfully!</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Our partner relationship desk has received your inquiry and will contact you shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Issue Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white focus:outline-none focus:border-amber-500/60"
                >
                  <option value="WALLET_TOPUP" className="bg-[#111827]">Wallet Top-up & Deposit</option>
                  <option value="RETAILER_MAPPING" className="bg-[#111827]">Retailer Mapping & Invitation</option>
                  <option value="MDR_RATES" className="bg-[#111827]">MDR Rate Configuration</option>
                  <option value="SETTLEMENT" className="bg-[#111827]">Commission & Settlements</option>
                  <option value="OTHER" className="bg-[#111827]">General Query</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Subject / Summary *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR status delay for topup req"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Detailed Description *</label>
              <textarea
                required
                rows={4}
                placeholder="Provide transaction IDs, retailer mobile, or specific details..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 resize-none"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Submit Priority Ticket
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
