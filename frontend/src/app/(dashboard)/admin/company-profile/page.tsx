"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";
import {
  Building2,
  ShieldCheck,
  UploadCloud,
  Save,
  RefreshCw,
  Globe,
  PhoneCall,
  Mail,
  MessageSquare,
  Clock,
  MapPin,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Briefcase,
  Lock,
} from "lucide-react";

interface AuthorizedCompanyOption {
  company_ref_id: number;
  company_id: string;
  company_code: string;
  company_name: string;
  legal_name: string;
  display_name?: string;
}

interface CompanyProfileFormState {
  company_ref_id?: number;
  company_code?: string;
  has_profile?: boolean;

  // A. Company Branding & Header
  logo_url: string;
  company_legal_name: string;
  brand_name: string;
  operating_partner_info: string;
  corporate_portal_url: string;
  regulatory_status_badge: string;

  // B. Corporate Entity Profile
  cin_number: string;
  gstin: string;
  business_entity_type: string;
  industry_sector: string;
  operating_status: string;
  entity_badge: string;

  // C. Merchant Helpdesk & Support Channels
  support_helpline: string;
  support_email: string;
  whatsapp_number: string;
  operating_hours: string;
  direct_operations_line: string;

  // D. Registered Headquarters & Grievance Redressal
  registered_office_address: string;
  official_website_url: string;
  grievance_officer_name: string;
  grievance_officer_designation: string;
  grievance_escalation_email: string;
  tat_level_1: string;
  tat_level_2: string;

  updated_at?: string | null;
  updated_by?: string | null;
}

const EMPTY_FORM: CompanyProfileFormState = {
  logo_url: "",
  company_legal_name: "",
  brand_name: "",
  operating_partner_info: "",
  corporate_portal_url: "",
  regulatory_status_badge: "RBI / NPCI Authorized",
  cin_number: "",
  gstin: "",
  business_entity_type: "Private Limited Company",
  industry_sector: "FinTech, Payments & Banking Correspondent Network",
  operating_status: "ACTIVE & REGULATED",
  entity_badge: "Registered Corporate",
  support_helpline: "",
  support_email: "",
  whatsapp_number: "",
  operating_hours: "",
  direct_operations_line: "",
  registered_office_address: "",
  official_website_url: "",
  grievance_officer_name: "",
  grievance_officer_designation: "",
  grievance_escalation_email: "",
  tat_level_1: "Level 1: 24h",
  tat_level_2: "Grievance Escalation: 48–72h",
};

function mapResponseToForm(d: any): CompanyProfileFormState {
  return {
    company_ref_id: d?.company_ref_id,
    company_code: d?.company_code || "",
    has_profile: Boolean(d?.has_profile),
    logo_url: d?.logo_url || "",
    company_legal_name: d?.company_legal_name || d?.legal_name || d?.company_name || "",
    brand_name: d?.brand_name || "",
    operating_partner_info: d?.operating_partner_info || "",
    corporate_portal_url: d?.corporate_portal_url || d?.website_url || "",
    regulatory_status_badge: d?.regulatory_status_badge || "RBI / NPCI Authorized",
    cin_number: d?.cin_number || d?.cin || "",
    gstin: d?.gstin || "",
    business_entity_type: d?.business_entity_type || "Private Limited Company",
    industry_sector: d?.industry_sector || "",
    operating_status: d?.operating_status || "ACTIVE & REGULATED",
    entity_badge: d?.entity_badge || "Registered Corporate",
    support_helpline: d?.support_helpline || d?.support_phone || "",
    support_email: d?.support_email || "",
    whatsapp_number: d?.whatsapp_number || "",
    operating_hours: d?.operating_hours || d?.support_hours || "",
    direct_operations_line: d?.direct_operations_line || d?.direct_phone || "",
    registered_office_address: d?.registered_office_address || d?.headquarters || "",
    official_website_url: d?.official_website_url || d?.website_url || "",
    grievance_officer_name: d?.grievance_officer_name || "",
    grievance_officer_designation: d?.grievance_officer_designation || "",
    grievance_escalation_email: d?.grievance_escalation_email || d?.grievance_email || "",
    tat_level_1: d?.tat_level_1 || "",
    tat_level_2: d?.tat_level_2 || "",
    updated_at: d?.updated_at || null,
    updated_by: d?.updated_by || null,
  };
}

export default function AdminCompanyProfilePage() {
  const branding = useCompanyBranding();
  const brandPrimary = branding?.primary_colour || "#0F3B7D";
  const brandSecondary = branding?.secondary_colour || "#1E40AF";

  const [companies, setCompanies] = useState<AuthorizedCompanyOption[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [selectedCompRef, setSelectedCompRef] = useState<number | undefined>(undefined);

  const [form, setForm] = useState<CompanyProfileFormState>(EMPTY_FORM);
  const [savedSnapshot, setSavedSnapshot] = useState<CompanyProfileFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  }, []);

  const loadCompaniesAndProfile = useCallback(async (overrideCompRef?: number) => {
    setLoading(true);
    try {
      const compListRes = await api.get("/api/v1/company-profile/admin/companies");
      const list: AuthorizedCompanyOption[] = compListRes?.data?.data || [];
      setCompanies(list);
      setIsSuperAdmin(Boolean(compListRes?.data?.is_super_admin));

      const params: Record<string, any> = {};
      if (overrideCompRef) {
        params.company_ref_id = overrideCompRef;
      }
      const profRes = await api.get("/api/v1/company-profile/admin", { params });
      const data = profRes?.data?.data;
      if (data) {
        const mapped = mapResponseToForm(data);
        setForm(mapped);
        setSavedSnapshot(mapped);
        setSelectedCompRef(mapped.company_ref_id);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to load company profile.";
      showToast("error", typeof msg === "string" ? msg : "Failed to load company profile.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadCompaniesAndProfile();
  }, [loadCompaniesAndProfile]);

  const handleFieldChange = (field: keyof CompanyProfileFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCopy = (val: string, label: string) => {
    if (!val) return;
    navigator.clipboard?.writeText(val);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (selectedCompRef) {
        fd.append("company_ref_id", String(selectedCompRef));
      }
      fd.append("persist", "true");

      const res = await api.post("/api/v1/company-profile/upload-logo", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const newUrl = res?.data?.logo_url || res?.data?.url;
      if (newUrl) {
        setForm((prev) => ({ ...prev, logo_url: newUrl }));
        setSavedSnapshot((prev) => ({ ...prev, logo_url: newUrl }));
        showToast("success", "Company logo uploaded and synchronized cleanly.");
      } else {
        showToast("error", "Logo upload completed without a valid URL.");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || "Logo upload failed.";
      showToast("error", typeof msg === "string" ? msg : "Logo upload failed.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_legal_name.trim() || !form.brand_name.trim()) {
      showToast("error", "Company Legal Name and Brand / Network Name are required.");
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form, company_ref_id: selectedCompRef };
      const res = form.has_profile
        ? await api.put("/api/v1/company-profile/admin", payload)
        : await api.post("/api/v1/company-profile/admin", payload);

      const updated = res?.data?.data;
      if (updated) {
        const mapped = mapResponseToForm(updated);
        setForm(mapped);
        setSavedSnapshot(mapped);
      }
      showToast("success", res?.data?.message || "Company profile saved and synced to Retailer Portal.");
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || "Failed to save company profile.";
      showToast("error", typeof msg === "string" ? msg : "Failed to save company profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm(savedSnapshot);
    showToast("success", "Reverted unsaved changes.");
  };

  const isDirty = JSON.stringify(form) !== JSON.stringify(savedSnapshot);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-bold animate-in fade-in slide-in-from-top-2 ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-2xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm"
            style={{ background: `linear-gradient(135deg, ${brandPrimary}, ${brandSecondary})` }}
          >
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] tracking-tight">
                Company Profile Management
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" /> Single Source of Truth
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#64748B] mt-1 font-medium">
              Configure corporate branding, legal credentials, merchant helpdesk, and grievance redressal. Changes reflect automatically in Retailer Portal → Profile → Company.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isSuperAdmin && companies.length > 1 ? (
            <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-1.5">
              <Building2 className="w-4 h-4 text-[#64748B]" />
              <select
                value={selectedCompRef ?? ""}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val) loadCompaniesAndProfile(val);
                }}
                className="bg-transparent text-xs font-bold text-[#0F172A] focus:outline-none cursor-pointer"
              >
                {companies.map((c) => (
                  <option key={c.company_ref_id} value={c.company_ref_id}>
                    {c.display_name || c.company_code} — {c.legal_name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-bold text-[#334155]">
              <Lock className="w-3.5 h-3.5 text-[#64748B]" />
              <span>Domain Locked: {form.company_code || branding?.company_code || "ACTIVE COMPANY"}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => loadCompaniesAndProfile(selectedCompRef)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-xs font-bold text-[#334155] transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Live Preview Banner matching Retailer Portal Company Header */}
      <div
        className="rounded-2xl border p-5 sm:p-6 bg-white shadow-2xs"
        style={{ borderColor: `${brandPrimary}30`, background: `linear-gradient(135deg, ${brandPrimary}0A 0%, #FFFFFF 100%)` }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#64748B]">
            Retailer Portal Header Preview (Profile → Company)
          </span>
          {form.updated_at && (
            <span className="text-[11px] text-[#64748B] font-medium">
              Last updated: {new Date(form.updated_at).toLocaleString("en-IN")}
              {form.updated_by ? ` by ${form.updated_by}` : ""}
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs p-2 flex items-center justify-center shrink-0">
              {form.logo_url ? (
                <img
                  src={form.logo_url}
                  alt={form.brand_name || "Company Logo"}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <Building2 className="w-8 h-8 text-[#94A3B8]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-[#0F172A] tracking-tight">
                  {form.company_legal_name || "Company Legal Name"}
                </h2>
                {form.regulatory_status_badge && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <ShieldCheck className="w-3 h-3" /> {form.regulatory_status_badge}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-[#64748B] font-medium mt-1">
                {form.operating_partner_info || "Official Operating Partner & Enterprise FinTech Network"}{" "}
                <strong style={{ color: brandPrimary }}>{form.brand_name}</strong>
              </p>
            </div>
          </div>

          {(form.corporate_portal_url || form.official_website_url) && (
            <a
              href={form.corporate_portal_url || form.official_website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-bold transition-colors shrink-0 self-start sm:self-center"
              style={{ borderColor: `${brandPrimary}40`, color: brandPrimary, backgroundColor: "#FFFFFF" }}
            >
              <span>Visit Corporate Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: brandPrimary, borderTopColor: "transparent" }} />
          <p className="text-sm font-semibold text-[#64748B]">Loading company profile configuration…</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Section A: Company Branding & Header */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${brandPrimary}15`, color: brandPrimary }}>
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#0F172A]">A. Company Branding & Header</h3>
                    <p className="text-[11px] text-[#64748B]">Logo, legal header, partner network & regulatory badge</p>
                  </div>
                </div>
              </div>

              {/* Logo Upload Row */}
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-dashed border-[#CBD5E1] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-xl bg-white border border-[#E2E8F0] p-1.5 flex items-center justify-center shrink-0">
                    {form.logo_url ? (
                      <img src={form.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <Building2 className="w-6 h-6 text-[#94A3B8]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#0F172A]">Company Logo</p>
                    <p className="text-[11px] text-[#64748B] truncate max-w-[230px]">
                      {form.logo_url || "PNG, JPG, WEBP, SVG up to 5 MB"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.svg"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-50"
                    style={{ backgroundColor: brandPrimary }}
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{uploadingLogo ? "Uploading…" : "Upload Logo"}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3.5">
                <InputField
                  label="Company Legal Name *"
                  value={form.company_legal_name}
                  onChange={(v) => handleFieldChange("company_legal_name", v)}
                  placeholder="e.g. SATHUS TECHNOLOGY PRIVATE LIMITED"
                  required
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <InputField
                    label="Brand / Network Name *"
                    value={form.brand_name}
                    onChange={(v) => handleFieldChange("brand_name", v)}
                    placeholder="e.g. Near4You"
                    required
                  />
                  <InputField
                    label="Regulatory Authorization Badge"
                    value={form.regulatory_status_badge}
                    onChange={(v) => handleFieldChange("regulatory_status_badge", v)}
                    placeholder="e.g. RBI / NPCI Authorized"
                  />
                </div>
                <InputField
                  label="Operating Partner Information"
                  value={form.operating_partner_info}
                  onChange={(v) => handleFieldChange("operating_partner_info", v)}
                  placeholder="e.g. Official Operating Partner & Enterprise FinTech Network"
                />
                <InputField
                  label="Corporate Portal URL"
                  value={form.corporate_portal_url}
                  onChange={(v) => handleFieldChange("corporate_portal_url", v)}
                  placeholder="https://near4you.store"
                  type="url"
                />
              </div>
            </div>

            {/* Section B: Corporate Entity Profile */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${brandPrimary}15`, color: brandPrimary }}>
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#0F172A]">B. Corporate Entity Profile</h3>
                    <p className="text-[11px] text-[#64748B]">Statutory registration, sector & operational status</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <InputField
                    label="Corporate Identification Number (CIN)"
                    value={form.cin_number}
                    onChange={(v) => handleFieldChange("cin_number", v.toUpperCase())}
                    placeholder="U74999TN2020PTC..."
                    onCopy={form.cin_number ? () => handleCopy(form.cin_number, "CIN") : undefined}
                    copied={copiedField === "CIN"}
                  />
                  <InputField
                    label="GSTIN"
                    value={form.gstin}
                    onChange={(v) => handleFieldChange("gstin", v.toUpperCase())}
                    placeholder="33AAACS..."
                    onCopy={form.gstin ? () => handleCopy(form.gstin, "GSTIN") : undefined}
                    copied={copiedField === "GSTIN"}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <InputField
                    label="Business Entity Type"
                    value={form.business_entity_type}
                    onChange={(v) => handleFieldChange("business_entity_type", v)}
                    placeholder="Private Limited Company"
                  />
                  <InputField
                    label="Entity Status Badge"
                    value={form.entity_badge}
                    onChange={(v) => handleFieldChange("entity_badge", v)}
                    placeholder="Registered Corporate"
                  />
                </div>

                <InputField
                  label="Industry Sector"
                  value={form.industry_sector}
                  onChange={(v) => handleFieldChange("industry_sector", v)}
                  placeholder="FinTech, Payments & Banking Correspondent Network"
                />

                <InputField
                  label="Operating Status"
                  value={form.operating_status}
                  onChange={(v) => handleFieldChange("operating_status", v)}
                  placeholder="ACTIVE & REGULATED"
                />
              </div>
            </div>

            {/* Section C: Merchant Helpdesk & Support Channels */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-[#F1F5F9] pb-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${brandPrimary}15`, color: brandPrimary }}>
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0F172A]">C. Merchant Helpdesk & Support Channels</h3>
                  <p className="text-[11px] text-[#64748B]">Helplines, official support email, WhatsApp & hours</p>
                </div>
              </div>

              <div className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <InputField
                    label="Toll-Free Support Helpline"
                    value={form.support_helpline}
                    onChange={(v) => handleFieldChange("support_helpline", v)}
                    placeholder="1800 292 982"
                    icon={<PhoneCall className="w-3.5 h-3.5" />}
                  />
                  <InputField
                    label="Direct Operations Line"
                    value={form.direct_operations_line}
                    onChange={(v) => handleFieldChange("direct_operations_line", v)}
                    placeholder="+91 44 4892 9820"
                    icon={<PhoneCall className="w-3.5 h-3.5" />}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <InputField
                    label="Official Support Email"
                    value={form.support_email}
                    onChange={(v) => handleFieldChange("support_email", v)}
                    placeholder="support@company.com"
                    type="email"
                    icon={<Mail className="w-3.5 h-3.5" />}
                  />
                  <InputField
                    label="WhatsApp Business Desk"
                    value={form.whatsapp_number}
                    onChange={(v) => handleFieldChange("whatsapp_number", v)}
                    placeholder="+91 98765 43210"
                    icon={<MessageSquare className="w-3.5 h-3.5" />}
                  />
                </div>

                <InputField
                  label="Operating Hours"
                  value={form.operating_hours}
                  onChange={(v) => handleFieldChange("operating_hours", v)}
                  placeholder="Monday - Saturday | 09:00 AM - 07:00 PM IST"
                  icon={<Clock className="w-3.5 h-3.5" />}
                />
              </div>
            </div>

            {/* Section D: Registered Headquarters & Grievance Redressal */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-[#F1F5F9] pb-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${brandPrimary}15`, color: brandPrimary }}>
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0F172A]">D. Registered Headquarters & Grievance Redressal</h3>
                  <p className="text-[11px] text-[#64748B]">Registered office address, nodal officer & escalation SLAs</p>
                </div>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1.5">
                    Corporate Registered Office Address
                  </label>
                  <textarea
                    rows={2}
                    value={form.registered_office_address}
                    onChange={(e) => handleFieldChange("registered_office_address", e.target.value)}
                    placeholder="Full registered corporate office address, City, State - PIN"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#FFFFFF] text-sm font-semibold text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-slate-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <InputField
                    label="Official Website Portal"
                    value={form.official_website_url}
                    onChange={(v) => handleFieldChange("official_website_url", v)}
                    placeholder="https://near4you.store"
                    type="url"
                    icon={<Globe className="w-3.5 h-3.5" />}
                  />
                  <InputField
                    label="Grievance Escalation Email"
                    value={form.grievance_escalation_email}
                    onChange={(v) => handleFieldChange("grievance_escalation_email", v)}
                    placeholder="grievance@company.com"
                    type="email"
                    icon={<Mail className="w-3.5 h-3.5" />}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <InputField
                    label="Grievance Officer Name"
                    value={form.grievance_officer_name}
                    onChange={(v) => handleFieldChange("grievance_officer_name", v)}
                    placeholder="Grievance Redressal Officer"
                    icon={<UserCheck className="w-3.5 h-3.5" />}
                  />
                  <InputField
                    label="Officer Designation"
                    value={form.grievance_officer_designation}
                    onChange={(v) => handleFieldChange("grievance_officer_designation", v)}
                    placeholder="Principal Nodal Officer"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <InputField
                    label="Resolution TAT (Level 1)"
                    value={form.tat_level_1}
                    onChange={(v) => handleFieldChange("tat_level_1", v)}
                    placeholder="Level 1: 24h"
                  />
                  <InputField
                    label="Resolution TAT (Level 2 Escalation)"
                    value={form.tat_level_2}
                    onChange={(v) => handleFieldChange("tat_level_2", v)}
                    placeholder="Grievance Escalation: 48–72h"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Save Action Bar */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs font-medium text-[#64748B]">
              {isDirty ? (
                <span className="text-amber-700 font-bold">Unsaved changes ready to publish to Retailer Portal.</span>
              ) : (
                <span>All changes are saved and synchronized with the Retailer Portal.</span>
              )}
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleReset}
                disabled={!isDirty || saving}
                className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-xs font-bold text-[#475569] disabled:opacity-40 cursor-pointer"
              >
                Reset Changes
              </button>
              <button
                type="submit"
                disabled={saving || uploadingLogo}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-white shadow-sm transition-opacity hover:opacity-95 disabled:opacity-50 cursor-pointer"
                style={{ backgroundColor: brandPrimary }}
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "Saving Profile…" : form.has_profile ? "Save Company Profile" : "Create Company Profile"}</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  icon,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  icon?: React.ReactNode;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1.5">
        {label}
      </label>
      <div className="relative flex items-center">
        {icon && <span className="absolute left-3 text-[#94A3B8] pointer-events-none">{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={`w-full ${icon ? "pl-9" : "pl-3.5"} ${onCopy ? "pr-10" : "pr-3.5"} py-2 rounded-xl border border-[#CBD5E1] bg-white text-sm font-semibold text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-slate-500 transition-all`}
        />
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            title="Copy value"
            className="absolute right-2.5 p-1 rounded-md text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}
