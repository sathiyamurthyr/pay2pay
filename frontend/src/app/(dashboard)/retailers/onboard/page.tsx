"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import {
  Store,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Building2,
  UserCheck,
  CreditCard,
  Upload,
  ShieldCheck,
  RefreshCw,
  Network,
} from "lucide-react";
import KycUpload, { DEFAULT_RETAILER_DOCS } from "@/components/ui/kyc-upload";
import { SearchableSelect } from "@/components/ui/searchable-select";

function parseError(err: any): string {
  const detail = err?.response?.data?.detail;
  if (!detail) return "An unexpected error occurred.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((d: any) => `${(d.loc || []).join(" → ")}: ${d.msg}`).join("\n");
  return JSON.stringify(detail);
}

export default function RetailerOnboardPage() {
  const router = useRouter();

  const [companies, setCompanies] = useState<any[]>([]);
  const [rms, setRms] = useState<any[]>([]);
  const [distributors, setDistributors] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [formData, setFormData] = useState({
    retailer_code: "",
    store_name: "",
    legal_name: "",
    owner_name: "",
    business_category: "Electronics & Mobiles",
    store_type: "BRICK_AND_MORTAR",
    company_id: "",
    mapped_rm_id: "",
    mapped_distributor_id: "",

    primary_contact: "",
    mobile: "",
    email: "",
    state: "Tamil Nadu",
    city: "Chennai",
    address: "",
    pincode: "600001",

    settlement_bank_name: "HDFC Bank",
    account_holder: "",
    account_number: "",
    ifsc: "HDFC0001234",

    pan_number: "",
    gst_number: "",
    aadhaar_number: "",
  });

  const [kycUploads, setKycUploads] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadSetupData() {
      try {
        setLoadingData(true);
        const [compRes, rmRes, distRes] = await Promise.all([
          api.get("/api/v1/companies"),
          api.get("/api/v1/organization/rms"),
          api.get("/api/v1/organization/distributors"),
        ]);

        const comps = compRes.data.items || [];
        const rmList = rmRes.data.items || [];
        const dists = distRes.data.items || [];
        setCompanies(comps);
        setRms(rmList);
        setDistributors(dists);

        if (comps.length > 0) {
          setFormData((prev) => ({ ...prev, company_id: comps[0].public_id }));
        }
        if (rmList.length > 0) {
          setFormData((prev) => ({ ...prev, mapped_rm_id: rmList[0].public_id }));
        }
        if (dists.length > 0) {
          setFormData((prev) => ({ ...prev, mapped_distributor_id: dists[0].public_id }));
        }
      } catch (err) {
        console.error("Failed to load onboarding setup data", err);
      } finally {
        setLoadingData(false);
      }
    }
    loadSetupData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload: any = {
        ...formData,
        primary_contact: formData.owner_name,
        account_holder: formData.owner_name,
      };

      if (!payload.mapped_rm_id) delete payload.mapped_rm_id;

      if (Object.keys(kycUploads).length > 0) {
        payload.kyc_docs = kycUploads;
      }

      await api.post("/api/v1/retailers", payload);
      router.push("/retailers?onboarded=true");
    } catch (err: any) {
      setError(parseError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Top Navigation Header */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/retailers"
            className="flex items-center justify-center w-10 h-10 rounded-xl border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight flex items-center gap-2.5">
              <Store className="w-7 h-7 text-[#6C63FF]" /> Onboard New Retailer
            </h1>
            <p className="text-xs font-medium text-[#64748B] mt-0.5">
              Register merchant outlet, hierarchy mapping (Company, RM, Distributor), bank details, and KYC verification documents
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/retailers"
            className="px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs font-extrabold text-[#475569] hover:bg-[#F8FAFC]"
          >
            Cancel
          </Link>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-xs font-bold text-[#991B1B]">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-[#DC2626]" />
          <div className="space-y-1">
            <p className="font-extrabold">Onboarding Error</p>
            <pre className="whitespace-pre-wrap font-sans text-[11px] leading-relaxed">{error}</pre>
          </div>
        </div>
      )}

      {loadingData ? (
        <div className="flex items-center justify-center py-20 gap-3 text-sm font-semibold text-[#64748B]">
          <RefreshCw className="w-5 h-5 animate-spin text-[#6C63FF]" /> Loading setup data…
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Hierarchy Mapping */}
          <div className="rounded-2xl border border-[#DDD6FE] bg-gradient-to-r from-[#F5F3FF] to-[#FAF5FF] p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Network className="w-5 h-5 text-[#6D28D9]" />
              <h2 className="text-sm font-extrabold text-[#581C87] uppercase tracking-wider">
                1. Hierarchy Mapping — Company, Regional Manager (RM) & Distributor
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
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
                  Mapped Regional Manager (RM)
                </label>
                <SearchableSelect
                  placeholder="Select RM (Optional)"
                  searchPlaceholder="Search RM by name or code…"
                  options={[
                    { value: "", label: "-- No Direct RM Mapping --" },
                    ...rms.map((rm) => ({
                      value: rm.public_id,
                      label: `${rm.full_name} (${rm.employee_code})`,
                      subtext: rm.email,
                    })),
                  ]}
                  value={formData.mapped_rm_id}
                  onChange={(val) => setFormData({ ...formData, mapped_rm_id: val })}
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#374151] block mb-1.5">
                  Mapped Distributor *
                </label>
                <SearchableSelect
                  required
                  placeholder="Select Distributor"
                  searchPlaceholder="Search distributor by business name or email…"
                  options={distributors.map((d) => ({
                    value: d.public_id,
                    label: `${d.business_name} (${d.email})`,
                    subtext: `Owner: ${d.owner_name} | Mobile: ${d.mobile}`,
                  }))}
                  value={formData.mapped_distributor_id}
                  onChange={(val) => setFormData({ ...formData, mapped_distributor_id: val })}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Store & Business Identity */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-3">
              <Store className="w-5 h-5 text-[#2563EB]" />
              <h2 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider">
                2. Store & Legal Business Information
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-extrabold text-[#374151] block mb-1.5">
                  Retailer Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="RET-CHE-101"
                  value={formData.retailer_code}
                  onChange={(e) => setFormData({ ...formData, retailer_code: e.target.value })}
                  className="w-full rounded-xl border border-[#D1D5DB] p-3 font-mono text-xs font-bold text-[#111827] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#374151] block mb-1.5">
                  Business Category *
                </label>
                <SearchableSelect
                  required
                  placeholder="Select Business Category"
                  searchPlaceholder="Search category…"
                  options={[
                    "Electronics & Mobiles",
                    "General Store",
                    "Grocery & Supermarket",
                    "Pharmacy & Medical",
                    "Travel & Tours",
                    "Mobile Recharge",
                    "Financial Services",
                  ].map((cat) => ({ value: cat, label: cat }))}
                  value={formData.business_category}
                  onChange={(val) => setFormData({ ...formData, business_category: val })}
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#374151] block mb-1.5">
                  Store Display Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Sri Venkateswara Mobiles"
                  value={formData.store_name}
                  onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                  className="w-full rounded-xl border border-[#D1D5DB] p-3 text-xs font-bold text-[#111827] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#374151] block mb-1.5">
                  Legal Business Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Sri Venkateswara Traders Pvt Ltd"
                  value={formData.legal_name}
                  onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                  className="w-full rounded-xl border border-[#D1D5DB] p-3 text-xs font-bold text-[#111827] focus:border-[#2563EB] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Owner Contact & Tax Numbers */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-3">
              <UserCheck className="w-5 h-5 text-[#16A34A]" />
              <h2 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider">
                3. Owner Contact & Tax Identifiers
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="text-xs font-extrabold text-[#374151] block mb-1.5">
                  Owner Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Venkatesh Rao"
                  value={formData.owner_name}
                  onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                  className="w-full rounded-xl border border-[#D1D5DB] p-3 text-xs font-bold text-[#111827] focus:border-[#16A34A] focus:outline-none"
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
                  className="w-full rounded-xl border border-[#D1D5DB] p-3 font-mono text-xs font-bold text-[#111827] focus:border-[#16A34A] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#374151] block mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="store@pay2pay.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-xl border border-[#D1D5DB] p-3 text-xs font-bold text-[#111827] focus:border-[#16A34A] focus:outline-none"
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
                  className="w-full rounded-xl border border-[#D1D5DB] p-3 font-mono text-xs font-bold text-[#111827] focus:border-[#16A34A] focus:outline-none"
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
                  className="w-full rounded-xl border border-[#D1D5DB] p-3 font-mono text-xs font-bold text-[#111827] focus:border-[#16A34A] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#374151] block mb-1.5">
                  Aadhaar Number
                </label>
                <input
                  type="text"
                  placeholder="1234 5678 9012"
                  value={formData.aadhaar_number}
                  onChange={(e) => setFormData({ ...formData, aadhaar_number: e.target.value })}
                  className="w-full rounded-xl border border-[#D1D5DB] p-3 font-mono text-xs font-bold text-[#111827] focus:border-[#16A34A] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Settlement Bank & Address */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-3">
              <CreditCard className="w-5 h-5 text-[#F59E0B]" />
              <h2 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider">
                4. Settlement Bank Account & Physical Address
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="text-xs font-extrabold text-[#374151] block mb-1.5">
                  Settlement Bank Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="HDFC Bank"
                  value={formData.settlement_bank_name}
                  onChange={(e) => setFormData({ ...formData, settlement_bank_name: e.target.value })}
                  className="w-full rounded-xl border border-[#D1D5DB] p-3 text-xs font-bold text-[#111827] focus:border-[#F59E0B] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#374151] block mb-1.5">
                  Account Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="50100234567890"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  className="w-full rounded-xl border border-[#D1D5DB] p-3 font-mono text-xs font-bold text-[#111827] focus:border-[#F59E0B] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#374151] block mb-1.5">
                  IFSC Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="HDFC0001234"
                  value={formData.ifsc}
                  onChange={(e) => setFormData({ ...formData, ifsc: e.target.value.toUpperCase() })}
                  className="w-full rounded-xl border border-[#D1D5DB] p-3 font-mono text-xs font-bold text-[#111827] focus:border-[#F59E0B] focus:outline-none"
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
                  className="w-full rounded-xl border border-[#D1D5DB] p-3 text-xs font-bold text-[#111827] focus:border-[#F59E0B] focus:outline-none"
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
                  className="w-full rounded-xl border border-[#D1D5DB] p-3 text-xs font-bold text-[#111827] focus:border-[#F59E0B] focus:outline-none"
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
                  className="w-full rounded-xl border border-[#D1D5DB] p-3 font-mono text-xs font-bold text-[#111827] focus:border-[#F59E0B] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-extrabold text-[#374151] block mb-1.5">
                Full Street Address *
              </label>
              <input
                type="text"
                required
                placeholder="78 Anna Salai, Opposite LIC Building, Chennai"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full rounded-xl border border-[#D1D5DB] p-3 text-xs font-bold text-[#111827] focus:border-[#F59E0B] focus:outline-none"
              />
            </div>
          </div>

          {/* Section 5: KYC Verification Uploads */}
          <div className="rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#DBEAFE] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#2563EB]" />
                <h2 className="text-sm font-extrabold text-[#1E40AF] uppercase tracking-wider">
                  5. Mandatory KYC Verification Uploads
                </h2>
              </div>
            </div>

            <KycUpload
              entityType="RET"
              documents={DEFAULT_RETAILER_DOCS}
              onChange={setKycUploads}
            />
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
              className="flex items-center gap-2 rounded-xl bg-[#6C63FF] px-7 py-3 text-xs font-extrabold text-white shadow-md hover:bg-[#5B52E5] disabled:opacity-60 transition-all cursor-pointer"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Submitting Retailer Onboarding…
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Submit Retailer Onboarding Profile
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
