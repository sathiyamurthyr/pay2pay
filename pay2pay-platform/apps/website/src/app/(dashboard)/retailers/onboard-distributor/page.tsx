"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import {
  Users,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  ShieldCheck,
  RefreshCw,
  Network,
} from "lucide-react";
import KycUpload, { DEFAULT_DIST_DOCS } from "@/components/ui/kyc-upload";
import { SearchableSelect } from "@/components/ui/searchable-select";

function parseError(err: any): string {
  const detail = err?.response?.data?.detail;
  if (!detail) return "An unexpected error occurred.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((d: any) => `${(d.loc || []).join(" → ")}: ${d.msg}`).join("\n");
  return JSON.stringify(detail);
}

export default function DistributorOnboardPage() {
  const router = useRouter();

  const [companies, setCompanies] = useState<any[]>([]);
  const [sds, setSds] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [formData, setFormData] = useState({
    business_name: "",
    owner_name: "",
    mobile: "",
    email: "",
    gst_number: "",
    pan_number: "",
    bank_account_number: "",
    ifsc: "",
    credit_limit: 100000,
    state: "Tamil Nadu",
    city: "Chennai",
    address: "",
    pincode: "600001",
    company_id: "",
    mapped_super_distributor_id: "",
  });

  const [kycUploads, setKycUploads] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoadingData(true);
        const [compRes, sdRes] = await Promise.all([
          api.get("/api/v1/companies"),
          api.get("/api/v1/organization/super-distributors"),
        ]);
        const comps = compRes.data.items || [];
        const sdList = sdRes.data.items || [];

        setCompanies(comps);
        setSds(sdList);

        if (comps.length > 0) {
          setFormData((prev) => ({ ...prev, company_id: comps[0].public_id }));
        }
        if (sdList.length > 0) {
          setFormData((prev) => ({ ...prev, mapped_super_distributor_id: sdList[0].public_id }));
        }
      } catch (err) {
        console.error("Failed to load setup data", err);
      } finally {
        setLoadingData(false);
      }
    }
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload: any = {
        ...formData,
        credit_limit: Number(formData.credit_limit),
      };
      if (!payload.gst_number) delete payload.gst_number;
      if (!payload.pan_number) delete payload.pan_number;
      if (!payload.bank_account_number) delete payload.bank_account_number;
      if (!payload.ifsc) delete payload.ifsc;

      if (Object.keys(kycUploads).length > 0) {
        payload.kyc_docs = kycUploads;
      }

      await api.post("/api/v1/organization/distributors", payload);
      router.push("/retailers?tab=distributors&onboarded=true");
    } catch (err: any) {
      setError(parseError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/retailers"
            className="flex items-center justify-center w-10 h-10 rounded-xl border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC] transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight flex items-center gap-2.5">
              <Users className="w-7 h-7 text-[#3B82F6]" /> Onboard Distributor
            </h1>
            <p className="text-xs font-medium text-[#64748B] mt-0.5">
              Map Distributor to Super Distributor and Company, set credit limit and upload KYC documents
            </p>
          </div>
        </div>

        <Link
          href="/retailers"
          className="px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs font-extrabold text-[#475569] hover:bg-[#F8FAFC]"
        >
          Cancel
        </Link>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-xs font-bold text-[#991B1B]">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-[#DC2626]" />
          <div className="space-y-1">
            <p className="font-extrabold">Distributor Onboarding Error</p>
            <pre className="whitespace-pre-wrap font-sans text-[11px] leading-relaxed">{error}</pre>
          </div>
        </div>
      )}

      {loadingData ? (
        <div className="flex items-center justify-center py-20 gap-3 text-sm font-semibold text-[#64748B]">
          <RefreshCw className="w-5 h-5 animate-spin text-[#3B82F6]" /> Loading setup data…
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Hierarchy Mapping */}
          <div className="rounded-2xl border border-[#BAE6FD] bg-gradient-to-r from-[#EFF6FF] to-[#DBEAFE] p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Network className="w-5 h-5 text-[#0369A1]" />
              <h2 className="text-sm font-extrabold text-[#0369A1] uppercase tracking-wider">
                1. Hierarchy Mapping — Distributor → Super Distributor
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-extrabold text-[#374151] block mb-1.5">
                  Mapped Company *
                </label>
                <SearchableSelect
                  required
                  placeholder="Select Company"
                  searchPlaceholder="Search company by name or code…"
                  options={companies.map((c) => ({
                    value: c.public_id,
                    label: `${c.company_name} (${c.company_code})`,
                    subtext: c.email,
                  }))}
                  value={formData.company_id}
                  onChange={(val) => setFormData({ ...formData, company_id: val })}
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#374151] block mb-1.5">
                  Mapped Super Distributor *
                </label>
                <SearchableSelect
                  required
                  placeholder="Select Super Distributor"
                  searchPlaceholder="Search SD by business name or email…"
                  options={sds.map((s) => ({
                    value: s.public_id,
                    label: `${s.business_name} (${s.email})`,
                    subtext: `Owner: ${s.owner_name} | Mobile: ${s.mobile}`,
                  }))}
                  value={formData.mapped_super_distributor_id}
                  onChange={(val) => setFormData({ ...formData, mapped_super_distributor_id: val })}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Business & Contact Details */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-3">
              <Users className="w-5 h-5 text-[#3B82F6]" />
              <h2 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider">
                2. Business Profile & Contact Details
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-extrabold text-[#374151] block mb-1.5">
                  Business Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Murugan Distributors"
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  className="w-full rounded-xl border border-[#D1D5DB] p-3 text-xs font-bold text-[#111827] focus:border-[#3B82F6] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#374151] block mb-1.5">
                  Owner Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Murugan S"
                  value={formData.owner_name}
                  onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                  className="w-full rounded-xl border border-[#D1D5DB] p-3 text-xs font-bold text-[#111827] focus:border-[#3B82F6] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#374151] block mb-1.5">
                  Mobile Number (10 Digits) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="9876543210"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="w-full rounded-xl border border-[#D1D5DB] p-3 font-mono text-xs font-bold text-[#111827] focus:border-[#3B82F6] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#374151] block mb-1.5">
                  Corporate Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="dist@pay2pay.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-xl border border-[#D1D5DB] p-3 text-xs font-bold text-[#111827] focus:border-[#3B82F6] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#374151] block mb-1.5">
                  GST Number
                </label>
                <input
                  type="text"
                  placeholder="33AAAAA0000A1Z5"
                  value={formData.gst_number}
                  onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                  className="w-full rounded-xl border border-[#D1D5DB] p-3 font-mono text-xs font-bold text-[#111827] focus:border-[#3B82F6] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#374151] block mb-1.5">
                  PAN Number
                </label>
                <input
                  type="text"
                  placeholder="ABCDE1234F"
                  value={formData.pan_number}
                  onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase() })}
                  className="w-full rounded-xl border border-[#D1D5DB] p-3 font-mono text-xs font-bold text-[#111827] focus:border-[#3B82F6] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#374151] block mb-1.5">
                  Assigned Credit Limit (₹) *
                </label>
                <input
                  type="number"
                  required
                  value={formData.credit_limit}
                  onChange={(e) => setFormData({ ...formData, credit_limit: Number(e.target.value) })}
                  className="w-full rounded-xl border border-[#D1D5DB] p-3 font-mono text-xs font-bold text-[#111827] focus:border-[#3B82F6] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Bank & Address */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-3">
              <CreditCard className="w-5 h-5 text-[#2563EB]" />
              <h2 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider">
                3. Bank Account & Address
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="text-xs font-extrabold text-[#374151] block mb-1.5">
                  Bank Account Number
                </label>
                <input
                  type="text"
                  placeholder="50100234567890"
                  value={formData.bank_account_number}
                  onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                  className="w-full rounded-xl border border-[#D1D5DB] p-3 font-mono text-xs font-bold text-[#111827] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#374151] block mb-1.5">
                  IFSC Code
                </label>
                <input
                  type="text"
                  placeholder="HDFC0001234"
                  value={formData.ifsc}
                  onChange={(e) => setFormData({ ...formData, ifsc: e.target.value.toUpperCase() })}
                  className="w-full rounded-xl border border-[#D1D5DB] p-3 font-mono text-xs font-bold text-[#111827] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#374151] block mb-1.5">
                  State *
                </label>
                <input
                  type="text"
                  required
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full rounded-xl border border-[#D1D5DB] p-3 text-xs font-bold text-[#111827] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#374151] block mb-1.5">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full rounded-xl border border-[#D1D5DB] p-3 text-xs font-bold text-[#111827] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#374151] block mb-1.5">
                  Pincode *
                </label>
                <input
                  type="text"
                  required
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  className="w-full rounded-xl border border-[#D1D5DB] p-3 font-mono text-xs font-bold text-[#111827] focus:border-[#2563EB] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-extrabold text-[#374151] block mb-1.5">
                Address *
              </label>
              <input
                type="text"
                required
                placeholder="45 Market Road, Commercial Complex"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full rounded-xl border border-[#D1D5DB] p-3 text-xs font-bold text-[#111827] focus:border-[#2563EB] focus:outline-none"
              />
            </div>
          </div>

          {/* Section 4: Mandatory KYC Uploads */}
          <div className="rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#DBEAFE] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#2563EB]" />
                <h2 className="text-sm font-extrabold text-[#1E40AF] uppercase tracking-wider">
                  4. Mandatory KYC Document Uploads
                </h2>
              </div>
            </div>

            <KycUpload entityType="DIST" documents={DEFAULT_DIST_DOCS} onChange={setKycUploads} />
          </div>

          {/* Submit Action Bar */}
          <div className="flex items-center justify-end gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <Link
              href="/retailers"
              className="px-5 py-2.5 rounded-xl border border-[#D1D5DB] text-xs font-extrabold text-[#374151] hover:bg-[#F8FAFC]"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-[#3B82F6] px-7 py-3 text-xs font-extrabold text-white shadow-md hover:bg-[#2563EB] disabled:opacity-60 transition-all cursor-pointer"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Submitting Distributor…
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Onboard Distributor
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
