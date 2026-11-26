"use client";

import React, { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
} from "lucide-react";
import DemoShell from "@/components/inspel-demo/DemoShell";
import {
  DemoContactInfo,
  fetchContactInfo,
  getStoredVendor,
  submitContactEnquiry,
} from "@/lib/inspel-demo-api";

export default function InspelDemoContactPage() {
  const [contact, setContact] = useState<DemoContactInfo>({
    company_name: "INSPEL TECHNOLOGIES SOLUTIONS",
    legal_name: "INSPEL TECHNOLOGIES SOLUTIONS",
    cin: "U62010PY2026PTC009663",
    address: "No. 113 (59), S.V. Patel Salai, Puducherry, 605001, India",
    email: "contact@inspeltech.com",
    phone: "+91 7845578719",
    whatsapp: "917845578719",
    website: "https://inspeltech.com",
    portal_url: "https://inspel.smspay.store",
    support_hours: "Monday - Saturday, 9:30 AM - 6:30 PM IST",
  });

  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [subject, setSubject] = useState("Product Sales & BankMe Demo Enquiry");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successCode, setSuccessCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchContactInfo()
      .then((res) => {
        if (res.contact) setContact(res.contact);
      })
      .catch(() => {});

    const v = getStoredVendor();
    if (v) {
      setName(v.name || "");
      setCompanyName(v.company_name || "");
      setEmail(v.email || "");
      setMobile(v.mobile || "");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessCode(null);
    setSubmitting(true);
    try {
      const res = await submitContactEnquiry({
        name,
        company_name: companyName,
        email,
        mobile,
        subject,
        message,
      });
      setSuccessCode(res.enquiry_code);
      setMessage("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit enquiry.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DemoShell>
      <div className="bg-gradient-to-r from-[#040E2B] to-[#0F1E5C] text-white py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-200">
            Official Company Contact
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold mt-1">
            Contact {contact.company_name}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-blue-100/90 max-w-2xl">
            Reach our Puducherry headquarters or submit a product demonstration enquiry directly below.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Official Published Contact Card */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-11 h-11 rounded-xl bg-[#EFF6FF] text-[#1A56DB] flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-base text-[#040E2B]">{contact.company_name}</h2>
                <p className="text-xs text-slate-500">CIN: {contact.cin}</p>
              </div>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#1A56DB] shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase">Registered Address</div>
                  <div className="text-slate-800 mt-0.5">{contact.address}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-[#1A56DB] shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase">Email Address</div>
                  <a href={`mailto:${contact.email}`} className="text-[#1A56DB] font-semibold hover:underline">
                    {contact.email}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-[#1A56DB] shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase">Phone / Support</div>
                  <a href={`tel:${contact.phone.replace(/\s+/g, "")}`} className="text-slate-900 font-semibold hover:underline">
                    {contact.phone}
                  </a>
                  <div className="text-xs text-slate-500 mt-0.5">{contact.support_hours}</div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-3">
              <a
                href={`https://wa.me/${contact.whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-emerald-600 text-white text-xs font-bold shadow-xs"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp Support
              </a>
              <a
                href={contact.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
              >
                Official Website <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Interactive Enquiry Form */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl border border-slate-200 p-7 shadow-xs">
            <h2 className="text-xl font-bold text-[#040E2B]">Send an Enquiry</h2>
            <p className="text-xs text-slate-500 mt-1">
              Questions about onboarding any of the eight INSPEL payment products or BankMe settlement integration? Write to us below.
            </p>

            {successCode && (
              <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Enquiry Submitted ({successCode})</div>
                  <p className="text-xs mt-0.5">
                    Thank you! Our Puducherry support team at INSPEL TECHNOLOGIES SOLUTIONS will reach out shortly.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Your Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#1A56DB] focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Company Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Your organization"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#1A56DB] focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email ID</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#1A56DB] focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mobile Number</label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                    placeholder="10-digit mobile"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#1A56DB] focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#1A56DB] focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Message</label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us which payment products you are evaluating..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#1A56DB] focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1A56DB] hover:bg-[#1648C8] disabled:opacity-60 text-white text-sm font-semibold shadow-sm cursor-pointer"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit Enquiry
              </button>
            </form>
          </div>
        </div>
      </div>
    </DemoShell>
  );
}
