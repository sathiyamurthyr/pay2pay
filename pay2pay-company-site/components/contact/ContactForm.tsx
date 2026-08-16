"use client";

import React, { useState } from "react";
import { Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export const ContactForm: React.FC = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    subject: "Retailer Partner Inquiry",
    message: "",
  });

  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    // Client-side quick validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.mobile.trim() || !formData.message.trim()) {
      setStatus("error");
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok && data.status === "ok") {
        setStatus("success");
        setFormData({
          name: "",
          email: "",
          mobile: "",
          subject: "Retailer Partner Inquiry",
          message: "",
        });
      } else {
        setStatus("error");
        setErrorMessage(data.message || "Unable to submit your request. Please try again.");
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage("Network error occurred. Please try again later.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {status === "success" && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-3">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
          <span>Thank you! Your inquiry has been received. Our partner desk will contact you shortly.</span>
        </div>
      )}

      {status === "error" && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-3">
          <AlertCircle size={18} className="shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Full Name *
          </label>
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. Ramesh Kumar"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Mobile Number *
          </label>
          <input
            type="tel"
            name="mobile"
            required
            value={formData.mobile}
            onChange={handleChange}
            placeholder="e.g. 9876543210"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Email Address *
          </label>
          <input
            type="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            placeholder="e.g. ramesh@example.com"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Inquiry Subject
          </label>
          <select
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="Retailer Partner Inquiry">Retailer Partner Inquiry</option>
            <option value="Distributor (DIT) Partnership">Distributor (DIT) Partnership</option>
            <option value="Super-Distributor Franchise">Super-Distributor Franchise</option>
            <option value="Technical / API Integration">Technical / API Integration</option>
            <option value="Corporate / Billing Helpdesk">Corporate / Billing Helpdesk</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
          Message / Requirement Details *
        </label>
        <textarea
          name="message"
          required
          rows={4}
          value={formData.message}
          onChange={handleChange}
          placeholder="Please describe your store location, services of interest, or queries..."
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition-colors resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 active:scale-95 transition-all disabled:opacity-50"
      >
        {status === "submitting" ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Sending Inquiry...</span>
          </>
        ) : (
          <>
            <Send size={14} />
            <span>Submit Partner Inquiry</span>
          </>
        )}
      </button>
    </form>
  );
};
