"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import {
  Building2,
  Search,
  Filter,
  Plus,
  Download,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Clock,
  XCircle,
  X,
  CheckCircle,
  FileSpreadsheet,
  Layers
} from "lucide-react";

interface CompanyListItem {
  public_id: string;
  company_code: string;
  company_name: string;
  legal_name: string;
  tenant_code: string;
  company_type: string;
  gst_number?: string;
  pan_number?: string;
  cin_number?: string;
  status: string;
  version_no: number;
  created_date: string;
}

export default function CompanyListPage() {
  const [companies, setCompanies] = useState<CompanyListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal State for Onboarding Wizard
  const [showModal, setShowModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    company_code: "",
    company_name: "",
    legal_name: "",
    display_name: "",
    tenant_code: "",
    company_type: "PRIVATE_LIMITED",
    gst_number: "",
    pan_number: "",
    cin_number: "",
    primary_contact: "",
    designation: "Director",
    mobile: "",
    email: "",
    state: "Maharashtra",
    city: "Mumbai",
    address: "",
    pincode: "",
    settlement_bank_name: "HDFC Bank",
    account_holder: "",
    account_number: "",
    ifsc: "",
    admin_full_name: "Company Admin",
    admin_email: "",
    admin_password: ""
  });

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const params: any = { page, page_size: pageSize };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.company_type = typeFilter;

      const res = await api.get("/api/v1/companies", { params });
      setCompanies(res.data.items);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages || 1);
    } catch (err) {
      console.error("Failed to list companies", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [page, search, statusFilter, typeFilter]);

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);

    try {
      const payload = {
        company_code: formData.company_code,
        company_name: formData.company_name,
        legal_name: formData.legal_name || formData.company_name,
        display_name: formData.display_name || formData.company_name,
        tenant_code: formData.tenant_code,
        company_type: formData.company_type,
        gst_number: formData.gst_number || undefined,
        pan_number: formData.pan_number || undefined,
        cin_number: formData.cin_number || undefined,
        contact: {
          primary_contact: formData.primary_contact,
          designation: formData.designation,
          mobile: formData.mobile,
          email: formData.email
        },
        address: {
          state: formData.state,
          city: formData.city,
          address: formData.address || "HQ Address",
          pincode: formData.pincode
        },
        bank: {
          settlement_bank_name: formData.settlement_bank_name,
          account_holder: formData.account_holder || formData.company_name,
          account_number: formData.account_number,
          ifsc: formData.ifsc
        },
        admin_full_name: formData.admin_full_name,
        admin_email: formData.admin_email,
        admin_password: formData.admin_password
      };

      await api.post("/api/v1/companies", payload);
      setShowModal(false);
      fetchCompanies();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to onboard company. Check validations.");
    } finally {
      setSubmitting(false);
    }
  };

  const exportCSV = () => {
    const headers = ["Company Code,Company Name,Legal Name,Tenant Code,Type,GST,PAN,Status,Created Date"];
    const rows = companies.map(c =>
      `"${c.company_code}","${c.company_name}","${c.legal_name}","${c.tenant_code}","${c.company_type}","${c.gst_number || ""}","${c.pan_number || ""}","${c.status}","${c.created_date}"`
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pay2pay_companies_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Building2 className="h-8 w-8 text-emerald-400" />
            Company Enterprise Grid
          </h1>
          <p className="mt-1 text-slate-400">
            Multi-Tenant isolated company registry & lifecycle control ({total} Total Enrolled)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 rounded-lg bg-slate-800/80 px-4 py-2.5 text-sm font-medium text-slate-200 border border-slate-700 hover:bg-slate-700 transition-all"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            Export CSV
          </button>
          <button
            onClick={() => { setShowModal(true); setWizardStep(1); }}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition-all"
          >
            <Plus className="h-4 w-4" />
            Onboard Company
          </button>
        </div>
      </div>

      {/* Enterprise Filter & Search Toolbar */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Company Name, Code, GST, PAN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950/60 pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-950/60 px-3.5 py-2 text-sm text-slate-300 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="DRAFT">Draft</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-950/60 px-3.5 py-2 text-sm text-slate-300 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Company Types</option>
            <option value="PRIVATE_LIMITED">Private Limited</option>
            <option value="PUBLIC_LIMITED">Public Limited</option>
            <option value="PROPRIETORSHIP">Proprietorship</option>
            <option value="PARTNERSHIP">Partnership</option>
            <option value="LLP">LLP</option>
          </select>
        </div>
      </div>

      {/* Enterprise Data Table Grid */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 uppercase font-mono text-xs text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">Company</th>
                <th className="px-5 py-4">Tenant Code</th>
                <th className="px-5 py-4">Type</th>
                <th className="px-5 py-4">GST / PAN</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Version</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    Loading Enterprise Companies...
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    No matching companies found in platform registry.
                  </td>
                </tr>
              ) : (
                companies.map((c) => (
                  <tr key={c.public_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 font-medium text-slate-100">
                      <div>{c.company_name}</div>
                      <div className="text-xs font-mono text-slate-400 mt-0.5">{c.company_code}</div>
                    </td>
                    <td className="px-5 py-4 font-mono text-emerald-400">{c.tenant_code}</td>
                    <td className="px-5 py-4 font-mono text-xs">{c.company_type}</td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-400">
                      <div>GST: {c.gst_number || "N/A"}</div>
                      <div>PAN: {c.pan_number || "N/A"}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          c.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : c.status === "PENDING_APPROVAL"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-400">v{c.version_no}</td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/companies/${c.public_id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-all bg-emerald-500/10 px-3 py-1.5 rounded border border-emerald-500/20"
                      >
                        Details & Workflow
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/60 px-6 py-4">
          <div className="text-xs text-slate-400">
            Page <span className="font-mono text-slate-200">{page}</span> of <span className="font-mono text-slate-200">{totalPages}</span> ({total} Total)
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Onboarding Wizard Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-400" />
                Multi-Tenant Company Onboarding Wizard (Step {wizardStep} of 3)
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-400">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleOnboardSubmit} className="mt-4 space-y-4">
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Basic & Legal Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-300">Company Code *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. RETAIL_HQ"
                        value={formData.company_code}
                        onChange={(e) => setFormData({ ...formData, company_code: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300">Tenant Code *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. RETAIL_TENANT"
                        value={formData.tenant_code}
                        onChange={(e) => setFormData({ ...formData, tenant_code: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300">Company Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Retail Enterprise India Pvt Ltd"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-300">GST Number (15 Digits)</label>
                      <input
                        type="text"
                        placeholder="22AAAAA0000A1Z5"
                        value={formData.gst_number}
                        onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300">PAN Number (10 Digits)</label>
                      <input
                        type="text"
                        placeholder="AAAAA0000A"
                        value={formData.pan_number}
                        onChange={(e) => setFormData({ ...formData, pan_number: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Contact & Settlement Banking</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-300">Primary Contact Person *</label>
                      <input
                        type="text"
                        required
                        placeholder="Rajesh Sharma"
                        value={formData.primary_contact}
                        onChange={(e) => setFormData({ ...formData, primary_contact: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300">Mobile (10 Digits) *</label>
                      <input
                        type="text"
                        required
                        placeholder="9876543210"
                        value={formData.mobile}
                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-300">Settlement Bank Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="HDFC Bank Ltd"
                        value={formData.settlement_bank_name}
                        onChange={(e) => setFormData({ ...formData, settlement_bank_name: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300">IFSC Code (11 Chars) *</label>
                      <input
                        type="text"
                        required
                        placeholder="HDFC0000060"
                        value={formData.ifsc}
                        onChange={(e) => setFormData({ ...formData, ifsc: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300">Account Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="50200012345678"
                      value={formData.account_number}
                      onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Initial Company Admin Account</h3>
                  <div>
                    <label className="text-xs font-medium text-slate-300">Admin Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Rajesh Sharma"
                      value={formData.admin_full_name}
                      onChange={(e) => setFormData({ ...formData, admin_full_name: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300">Admin Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="admin@retail.com"
                      value={formData.admin_email}
                      onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300">Initial Password *</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={formData.admin_password}
                      onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Wizard Navigation Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                {wizardStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep((s) => s - 1)}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
                  >
                    Back
                  </button>
                ) : <div />}

                {wizardStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep((s) => s + 1)}
                    className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                  >
                    Next Step
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {submitting ? "Provisioning..." : "Submit Company Onboarding"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
