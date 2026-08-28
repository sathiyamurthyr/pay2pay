"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import api from "@/lib/api";
import {
  Layers,
  Plus,
  Search,
  RefreshCcw,
  ShieldCheck,
  Filter,
  AlignJustify,
  Download,
  FileText,
  Hash,
  Tag,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Edit3,
  Power,
  History,
  AlertTriangle,
  Info,
  X,
  ArrowRight,
  TrendingUp,
  Percent,
  Coins,
  Building2,
  Calendar,
  Sparkles,
  Maximize2
} from "lucide-react";

interface PayoutSlab {
  public_id: string;
  tenant_id: string;
  company_id?: string | null;
  service_code: string;
  slab_name?: string | null;
  description?: string | null;
  min_amount: number;
  max_amount: number;
  commission: number;
  commission_type: "FIXED" | "PERCENTAGE";
  gst: number;
  gst_type: "FIXED" | "PERCENTAGE";
  vendor_charge: number;
  vendor_charge_type: "FIXED" | "PERCENTAGE";
  company_charges: number;
  company_charges_type: "FIXED" | "PERCENTAGE";
  company_gst: number;
  company_gst_type: "FIXED" | "PERCENTAGE";
  tds: number;
  tds_type: "FIXED" | "PERCENTAGE";
  other_charges: number;
  other_charges_type: "FIXED" | "PERCENTAGE";
  currency: string;
  effective_from?: string | null;
  effective_to?: string | null;
  is_active: boolean;
  is_deleted: boolean;
  version_no: number;
  notes?: string | null;
  created_date: string;
  created_by?: string | null;
  updated_date: string;
  updated_by?: string | null;
  audit_logs?: PayoutSlabAudit[];
}

interface PayoutSlabAudit {
  public_id: string;
  payout_slab_id: string;
  action: string;
  old_value?: any;
  new_value?: any;
  changed_by?: string | null;
  changed_at: string;
  reason?: string | null;
}

function FormatCurrency({ amount }: { amount: number }) {
  return <span>₹{amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
      ACTIVE
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]" />
      INACTIVE
    </span>
  );
}

function PayoutSlabsContent() {
  const [slabs, setSlabs] = useState<PayoutSlab[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL"); // ALL, ACTIVE, INACTIVE
  const [density, setDensity] = useState<"compact" | "medium" | "spacious">("medium");

  // Modals & Drawers
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSlab, setEditingSlab] = useState<PayoutSlab | null>(null);
  const [statusTarget, setStatusTarget] = useState<{ slab: PayoutSlab; action: "ACTIVATE" | "DEACTIVATE" } | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [auditTarget, setAuditTarget] = useState<PayoutSlab | null>(null);
  const [auditLogs, setAuditLogs] = useState<PayoutSlabAudit[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Notifications
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Form State
  const [formData, setFormData] = useState({
    service_code: "PAYOUT",
    slab_name: "",
    description: "",
    min_amount: "0",
    max_amount: "500000",
    commission: "20",
    commission_type: "FIXED",
    gst: "18",
    gst_type: "PERCENTAGE",
    vendor_charge: "0",
    vendor_charge_type: "FIXED",
    company_charges: "0",
    company_charges_type: "FIXED",
    company_gst: "0",
    company_gst_type: "PERCENTAGE",
    tds: "0",
    tds_type: "PERCENTAGE",
    other_charges: "0",
    other_charges_type: "FIXED",
    currency: "INR",
    effective_from: "",
    effective_to: "",
    is_active: true,
    notes: "",
    reason: ""
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchSlabs = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page_size: 100 };
      if (statusFilter === "ACTIVE") params.is_active = true;
      if (statusFilter === "INACTIVE") params.is_active = false;
      if (search.trim()) params.search = search.trim();

      const res = await api.get("/api/v1/admin/payout-slabs", { params });
      setSlabs(res.data?.items || []);
    } catch (err: any) {
      console.error("Failed to load payout slabs", err);
      showToast(err.response?.data?.message || err.response?.data?.detail || "Failed to load payout slabs", "error");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchSlabs();
  }, [fetchSlabs]);

  const openCreateModal = () => {
    setEditingSlab(null);
    setFormData({
      service_code: "PAYOUT",
      slab_name: "",
      description: "",
      min_amount: "0",
      max_amount: "500000",
      commission: "20",
      commission_type: "FIXED",
      gst: "18",
      gst_type: "PERCENTAGE",
      vendor_charge: "0",
      vendor_charge_type: "FIXED",
      company_charges: "0",
      company_charges_type: "FIXED",
      company_gst: "0",
      company_gst_type: "PERCENTAGE",
      tds: "0",
      tds_type: "PERCENTAGE",
      other_charges: "0",
      other_charges_type: "FIXED",
      currency: "INR",
      effective_from: "",
      effective_to: "",
      is_active: true,
      notes: "",
      reason: ""
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (slab: PayoutSlab) => {
    setEditingSlab(slab);
    setFormData({
      service_code: slab.service_code,
      slab_name: slab.slab_name || "",
      description: slab.description || "",
      min_amount: String(slab.min_amount),
      max_amount: String(slab.max_amount),
      commission: String(slab.commission),
      commission_type: slab.commission_type,
      gst: String(slab.gst),
      gst_type: slab.gst_type,
      vendor_charge: String(slab.vendor_charge),
      vendor_charge_type: slab.vendor_charge_type,
      company_charges: String(slab.company_charges),
      company_charges_type: slab.company_charges_type,
      company_gst: String(slab.company_gst),
      company_gst_type: slab.company_gst_type,
      tds: String(slab.tds),
      tds_type: slab.tds_type,
      other_charges: String(slab.other_charges),
      other_charges_type: slab.other_charges_type,
      currency: slab.currency,
      effective_from: slab.effective_from ? slab.effective_from.slice(0, 16) : "",
      effective_to: slab.effective_to ? slab.effective_to.slice(0, 16) : "",
      is_active: slab.is_active,
      notes: slab.notes || "",
      reason: ""
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const min = parseFloat(formData.min_amount);
    const max = parseFloat(formData.max_amount);

    if (isNaN(min) || min < 0) {
      setFormError("Minimum amount must be 0 or greater.");
      return;
    }
    if (isNaN(max) || max < min) {
      setFormError(`Maximum amount must be equal to or greater than minimum amount (₹${min.toLocaleString("en-IN")}).`);
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        service_code: formData.service_code.trim().toUpperCase(),
        slab_name: formData.slab_name.trim() || undefined,
        description: formData.description.trim() || undefined,
        min_amount: min,
        max_amount: max,
        commission: parseFloat(formData.commission) || 0,
        commission_type: formData.commission_type,
        gst: parseFloat(formData.gst) || 0,
        gst_type: formData.gst_type,
        vendor_charge: parseFloat(formData.vendor_charge) || 0,
        vendor_charge_type: formData.vendor_charge_type,
        company_charges: parseFloat(formData.company_charges) || 0,
        company_charges_type: formData.company_charges_type,
        company_gst: parseFloat(formData.company_gst) || 0,
        company_gst_type: formData.company_gst_type,
        tds: parseFloat(formData.tds) || 0,
        tds_type: formData.tds_type,
        other_charges: parseFloat(formData.other_charges) || 0,
        other_charges_type: formData.other_charges_type,
        currency: formData.currency.trim().toUpperCase() || "INR",
        effective_from: formData.effective_from ? new Date(formData.effective_from).toISOString() : null,
        effective_to: formData.effective_to ? new Date(formData.effective_to).toISOString() : null,
        notes: formData.notes.trim() || undefined
      };

      if (editingSlab) {
        payload.is_active = formData.is_active;
        payload.reason = formData.reason.trim() || "Configuration modification";
        await api.put(`/api/v1/admin/payout-slabs/${editingSlab.public_id}`, payload);
        showToast("Payout Slab updated successfully with version increment!");
      } else {
        payload.is_active = formData.is_active;
        await api.post("/api/v1/admin/payout-slabs", payload);
        showToast("New Payout Slab created successfully!");
      }

      setIsFormOpen(false);
      fetchSlabs();
    } catch (err: any) {
      console.error("Failed to save payout slab", err);
      const msg = err.response?.data?.message || err.response?.data?.detail || "Error saving payout slab.";
      setFormError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async () => {
    if (!statusTarget) return;
    setSubmitting(true);
    try {
      const endpoint =
        statusTarget.action === "ACTIVATE"
          ? `/api/v1/admin/payout-slabs/${statusTarget.slab.public_id}/activate`
          : `/api/v1/admin/payout-slabs/${statusTarget.slab.public_id}/deactivate`;

      await api.post(endpoint, {
        reason: statusReason.trim() || `Administrative ${statusTarget.action.toLowerCase()}`
      });

      showToast(`Payout Slab ${statusTarget.action === "ACTIVATE" ? "activated" : "deactivated"} successfully!`);
      setStatusTarget(null);
      setStatusReason("");
      fetchSlabs();
    } catch (err: any) {
      console.error("Status change failed", err);
      showToast(err.response?.data?.message || err.response?.data?.detail || "Status change failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openAuditModal = async (slab: PayoutSlab) => {
    setAuditTarget(slab);
    setAuditLoading(true);
    setAuditLogs([]);
    try {
      const res = await api.get(`/api/v1/admin/payout-slabs/${slab.public_id}/audit`);
      setAuditLogs(res.data || []);
    } catch (err: any) {
      console.error("Failed to fetch audit history", err);
      showToast("Failed to fetch audit logs", "error");
    } finally {
      setAuditLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!slabs.length) return;
    const headers = [
      "Service Code",
      "Slab Name",
      "Min Amount (INR)",
      "Max Amount (INR)",
      "Commission",
      "Commission Type",
      "GST",
      "GST Type",
      "Vendor Charge",
      "Vendor Charge Type",
      "Company Charges",
      "Company Charges Type",
      "Company GST",
      "Company GST Type",
      "TDS",
      "TDS Type",
      "Other Charges",
      "Status",
      "Version",
      "Effective From",
      "Effective To"
    ];

    const rows = slabs.map((s) => [
      `"${s.service_code}"`,
      `"${s.slab_name || ""}"`,
      s.min_amount,
      s.max_amount,
      s.commission,
      `"${s.commission_type}"`,
      s.gst,
      `"${s.gst_type}"`,
      s.vendor_charge,
      `"${s.vendor_charge_type}"`,
      s.company_charges,
      `"${s.company_charges_type}"`,
      s.company_gst,
      `"${s.company_gst_type}"`,
      s.tds,
      `"${s.tds_type}"`,
      s.other_charges,
      `"${s.is_active ? "ACTIVE" : "INACTIVE"}"`,
      s.version_no,
      `"${s.effective_from || ""}"`,
      `"${s.effective_to || ""}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payout_slabs_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Metrics
  const activeCount = slabs.filter((s) => s.is_active).length;
  const inactiveCount = slabs.filter((s) => !s.is_active).length;
  const maxCovered = slabs.length ? Math.max(...slabs.map((s) => s.max_amount)) : 0;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl transition-all animate-in fade-in slide-in-from-top-4 text-xs font-extrabold ${
            toastMessage.type === "success"
              ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]"
              : "bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]"
          }`}
        >
          {toastMessage.type === "success" ? <CheckCircle2 className="w-4 h-4 text-[#16A34A]" /> : <XCircle className="w-4 h-4 text-[#DC2626]" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#64748B] uppercase tracking-wider mb-1">
            <span>Admin</span>
            <ChevronRight className="w-3 h-3 text-[#94A3B8]" />
            <span>Configuration</span>
            <ChevronRight className="w-3 h-3 text-[#94A3B8]" />
            <span className="text-[#2563EB]">Payout Slabs</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE]">
              <Layers className="w-6 h-6 text-[#2563EB]" />
            </div>
            Payout Slabs &amp; Fee Engine
          </h1>
          <p className="mt-1 text-xs font-medium text-[#64748B]">
            Configure multi-tier transaction amount slabs, retailer commissions, taxes (GST/TDS), vendor charges, and company margins.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-[#2563EB] hover:bg-[#1D4ED8] shadow-md shadow-[#2563EB]/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Payout Slab
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider">Total Slabs</span>
            <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
              <Layers className="w-4 h-4 text-[#2563EB]" />
            </div>
          </div>
          <div className="font-mono text-2xl font-extrabold text-[#0F172A]">{slabs.length}</div>
          <span className="text-[11px] font-semibold text-[#64748B] mt-1 block">Tier configurations configured</span>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold text-[#166534] uppercase tracking-wider">Active Slabs</span>
            <div className="w-8 h-8 rounded-lg bg-[#DCFCE7] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
            </div>
          </div>
          <div className="font-mono text-2xl font-extrabold text-[#166534]">{activeCount}</div>
          <span className="text-[11px] font-semibold text-[#16A34A] mt-1 block">{inactiveCount} inactive / draft</span>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold text-[#7C3AED] uppercase tracking-wider">Max Coverage</span>
            <div className="w-8 h-8 rounded-lg bg-[#F5F3FF] flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-[#7C3AED]" />
            </div>
          </div>
          <div className="font-mono text-2xl font-extrabold text-[#7C3AED]">₹{maxCovered.toLocaleString("en-IN")}</div>
          <span className="text-[11px] font-semibold text-[#64748B] mt-1 block">Maximum single slab ceiling</span>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold text-[#D97706] uppercase tracking-wider">Base Rate</span>
            <div className="w-8 h-8 rounded-lg bg-[#FEF9C3] flex items-center justify-center">
              <Coins className="w-4 h-4 text-[#D97706]" />
            </div>
          </div>
          <div className="font-mono text-2xl font-extrabold text-[#D97706]">₹20.00 <span className="text-xs font-bold text-[#64748B]">FIXED</span></div>
          <span className="text-[11px] font-semibold text-[#64748B] mt-1 block">Tier 1 (₹0 - ₹5,00,000) Rate</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search slabs, range, service…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 w-60 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center bg-[#F1F5F9] p-0.5 rounded-xl border border-[#E2E8F0]">
            {(["ALL", "ACTIVE", "INACTIVE"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer ${
                  statusFilter === st ? "bg-white text-[#2563EB] shadow-2xs" : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Density Toggle */}
          <button
            onClick={() => setDensity((d) => (d === "compact" ? "medium" : d === "medium" ? "spacious" : "compact"))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-white text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] transition cursor-pointer"
            title="Row Density"
          >
            <AlignJustify className="w-3.5 h-3.5 text-[#2563EB]" />
            <span className="capitalize">{density}</span>
          </button>

          {/* Export */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-white text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#16A34A]" />
            <span>Export CSV</span>
          </button>

          {/* Refresh */}
          <button
            onClick={fetchSlabs}
            className="p-2 rounded-xl border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#2563EB] transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#2563EB]" : ""}`} />
          </button>
        </div>

        <span className="text-xs font-bold text-[#64748B] self-end sm:self-center">
          {slabs.length} slab{slabs.length !== 1 ? "s" : ""} loaded
        </span>
      </div>

      {/* Data Table */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-[#F8FAFC] to-[#EFF6FF] border-b-2 border-[#E2E8F0]">
                <th className="px-4 py-3.5 text-left whitespace-nowrap font-extrabold text-[#374151] uppercase tracking-wider">Service</th>
                <th className="px-4 py-3.5 text-left whitespace-nowrap font-extrabold text-[#374151] uppercase tracking-wider">Amount Range</th>
                <th className="px-4 py-3.5 text-left whitespace-nowrap font-extrabold text-[#374151] uppercase tracking-wider">Commission</th>
                <th className="px-4 py-3.5 text-left whitespace-nowrap font-extrabold text-[#374151] uppercase tracking-wider">GST</th>
                <th className="px-4 py-3.5 text-left whitespace-nowrap font-extrabold text-[#374151] uppercase tracking-wider">Vendor Charge</th>
                <th className="px-4 py-3.5 text-left whitespace-nowrap font-extrabold text-[#374151] uppercase tracking-wider">Company Fee</th>
                <th className="px-4 py-3.5 text-left whitespace-nowrap font-extrabold text-[#374151] uppercase tracking-wider">Company GST</th>
                <th className="px-4 py-3.5 text-left whitespace-nowrap font-extrabold text-[#374151] uppercase tracking-wider">TDS</th>
                <th className="px-4 py-3.5 text-left whitespace-nowrap font-extrabold text-[#374151] uppercase tracking-wider">Other</th>
                <th className="px-4 py-3.5 text-center whitespace-nowrap font-extrabold text-[#374151] uppercase tracking-wider">Status</th>
                <th className="px-4 py-3.5 text-left whitespace-nowrap font-extrabold text-[#374151] uppercase tracking-wider">Effective Dates</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap font-extrabold text-[#374151] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="animate-pulse border-b border-[#F1F5F9]">
                    {[...Array(12)].map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-4 bg-[#F1F5F9] rounded w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : slabs.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] flex items-center justify-center">
                        <Layers className="w-6 h-6 text-[#2563EB]" />
                      </div>
                      <h3 className="text-sm font-extrabold text-[#0F172A]">No Payout Slabs Configured</h3>
                      <p className="text-xs text-[#64748B] max-w-sm">
                        Create transaction amount slabs with commissions, taxes, and fees to power the payout engine.
                      </p>
                      <button
                        onClick={openCreateModal}
                        className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-[#2563EB] hover:bg-[#1D4ED8]"
                      >
                        <Plus className="w-4 h-4" /> Add Payout Slab
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                slabs.map((slab) => {
                  const py = density === "compact" ? "py-2.5" : density === "spacious" ? "py-5" : "py-3.5";
                  return (
                    <tr key={slab.public_id} className={`border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors`}>
                      {/* Service */}
                      <td className={`px-4 ${py}`}>
                        <span className="font-mono text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]">
                          {slab.service_code}
                        </span>
                      </td>

                      {/* Amount Range */}
                      <td className={`px-4 ${py}`}>
                        <div className="font-mono text-xs font-extrabold text-[#0F172A]">
                          <FormatCurrency amount={slab.min_amount} /> — <FormatCurrency amount={slab.max_amount} />
                        </div>
                        {slab.slab_name && <div className="text-[11px] font-medium text-[#64748B] truncate max-w-[200px]">{slab.slab_name}</div>}
                      </td>

                      {/* Commission */}
                      <td className={`px-4 ${py}`}>
                        <div className="font-mono font-extrabold text-[#166534]">
                          {slab.commission_type === "PERCENTAGE" ? `${slab.commission}%` : `₹${slab.commission.toFixed(2)}`}
                        </div>
                        <span className="text-[10px] font-bold text-[#64748B] uppercase">{slab.commission_type}</span>
                      </td>

                      {/* GST */}
                      <td className={`px-4 ${py}`}>
                        <div className="font-mono font-bold text-[#0F172A]">
                          {slab.gst_type === "PERCENTAGE" ? `${slab.gst}%` : `₹${slab.gst.toFixed(2)}`}
                        </div>
                        <span className="text-[10px] text-[#64748B]">{slab.gst_type}</span>
                      </td>

                      {/* Vendor Charge */}
                      <td className={`px-4 ${py} font-mono text-[#475569]`}>
                        {slab.vendor_charge > 0 ? (
                          <>
                            {slab.vendor_charge_type === "PERCENTAGE" ? `${slab.vendor_charge}%` : `₹${slab.vendor_charge.toFixed(2)}`}
                          </>
                        ) : (
                          <span className="text-[#94A3B8]">—</span>
                        )}
                      </td>

                      {/* Company Charges */}
                      <td className={`px-4 ${py} font-mono text-[#0F172A]`}>
                        {slab.company_charges > 0 ? (
                          <>
                            {slab.company_charges_type === "PERCENTAGE" ? `${slab.company_charges}%` : `₹${slab.company_charges.toFixed(2)}`}
                          </>
                        ) : (
                          <span className="text-[#94A3B8]">—</span>
                        )}
                      </td>

                      {/* Company GST */}
                      <td className={`px-4 ${py} font-mono text-[#475569]`}>
                        {slab.company_gst > 0 ? (
                          <>
                            {slab.company_gst_type === "PERCENTAGE" ? `${slab.company_gst}%` : `₹${slab.company_gst.toFixed(2)}`}
                          </>
                        ) : (
                          <span className="text-[#94A3B8]">—</span>
                        )}
                      </td>

                      {/* TDS */}
                      <td className={`px-4 ${py} font-mono text-[#475569]`}>
                        {slab.tds > 0 ? (
                          <>
                            {slab.tds_type === "PERCENTAGE" ? `${slab.tds}%` : `₹${slab.tds.toFixed(2)}`}
                          </>
                        ) : (
                          <span className="text-[#94A3B8]">—</span>
                        )}
                      </td>

                      {/* Other */}
                      <td className={`px-4 ${py} font-mono text-[#475569]`}>
                        {slab.other_charges > 0 ? `₹${slab.other_charges.toFixed(2)}` : <span className="text-[#94A3B8]">—</span>}
                      </td>

                      {/* Status */}
                      <td className={`px-4 ${py} text-center`}>
                        <StatusBadge active={slab.is_active} />
                      </td>

                      {/* Effective Dates */}
                      <td className={`px-4 ${py} text-[11px] text-[#64748B]`}>
                        {slab.effective_from || slab.effective_to ? (
                          <div>
                            {slab.effective_from && <div>From: {new Date(slab.effective_from).toLocaleDateString()}</div>}
                            {slab.effective_to && <div>To: {new Date(slab.effective_to).toLocaleDateString()}</div>}
                          </div>
                        ) : (
                          <span className="text-[#94A3B8]">Always Effective</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className={`px-4 ${py} text-right whitespace-nowrap`}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Audit History Button */}
                          <button
                            onClick={() => openAuditModal(slab)}
                            className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:text-[#2563EB] hover:border-[#BFDBFE] hover:bg-[#EFF6FF] transition cursor-pointer"
                            title="Audit Trail"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => openEditModal(slab)}
                            className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:text-[#2563EB] hover:border-[#BFDBFE] hover:bg-[#EFF6FF] transition cursor-pointer"
                            title="Edit Slab"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Activate / Deactivate Button */}
                          <button
                            onClick={() => setStatusTarget({ slab, action: slab.is_active ? "DEACTIVATE" : "ACTIVATE" })}
                            className={`p-1.5 rounded-lg border transition cursor-pointer ${
                              slab.is_active
                                ? "border-[#FECACA] bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FEE2E2]"
                                : "border-[#BBF7D0] bg-[#F0FDF4] text-[#16A34A] hover:bg-[#DCFCE7]"
                            }`}
                            title={slab.is_active ? "Deactivate Slab" : "Activate Slab"}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add / Edit Slab Modal ── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-2xl w-full max-w-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="px-6 py-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div>
                <h2 className="text-lg font-extrabold text-[#0F172A] flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE]">
                    <Layers className="w-5 h-5 text-[#2563EB]" />
                  </div>
                  {editingSlab ? "Edit Payout Slab" : "Add New Payout Slab"}
                </h2>
                <p className="text-xs font-medium text-[#64748B] mt-0.5">
                  {editingSlab ? `Editing version ${editingSlab.version_no} (will increment version on save)` : "Define transaction threshold and fee parameters"}
                </p>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-2 rounded-xl text-[#64748B] hover:bg-[#E2E8F0] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="p-3.5 rounded-xl border border-[#FECACA] bg-[#FEF2F2] flex items-center gap-2.5 text-xs font-bold text-[#991B1B]">
                  <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Section: Basic Info */}
              <div className="space-y-3">
                <span className="text-[11px] font-extrabold text-[#2563EB] uppercase tracking-wider block">1. Scope &amp; Identification</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#475569] block mb-1">Service Code *</label>
                    <input
                      type="text"
                      required
                      value={formData.service_code}
                      onChange={(e) => setFormData({ ...formData, service_code: e.target.value.toUpperCase() })}
                      placeholder="PAYOUT"
                      className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-xs font-mono font-bold text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#475569] block mb-1">Slab Name</label>
                    <input
                      type="text"
                      value={formData.slab_name}
                      onChange={(e) => setFormData({ ...formData, slab_name: e.target.value })}
                      placeholder="e.g. Standard Payout Tier 1"
                      className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Amount Range */}
              <div className="space-y-3 pt-2 border-t border-[#F1F5F9]">
                <span className="text-[11px] font-extrabold text-[#2563EB] uppercase tracking-wider block">2. Transaction Amount Range (INR)</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#475569] block mb-1">Minimum Amount (₹) *</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={formData.min_amount}
                      onChange={(e) => setFormData({ ...formData, min_amount: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-mono font-bold text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#475569] block mb-1">Maximum Amount (₹) *</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={formData.max_amount}
                      onChange={(e) => setFormData({ ...formData, max_amount: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-mono font-bold text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Commission & GST */}
              <div className="space-y-3 pt-2 border-t border-[#F1F5F9]">
                <span className="text-[11px] font-extrabold text-[#2563EB] uppercase tracking-wider block">3. Commission &amp; GST</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[11px] font-bold text-[#475569] block mb-1">Commission *</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        required
                        value={formData.commission}
                        onChange={(e) => setFormData({ ...formData, commission: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-mono font-bold text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                    <div className="w-32">
                      <label className="text-[11px] font-bold text-[#475569] block mb-1">Type</label>
                      <select
                        value={formData.commission_type}
                        onChange={(e) => setFormData({ ...formData, commission_type: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#0F172A]"
                      >
                        <option value="FIXED">FIXED (₹)</option>
                        <option value="PERCENTAGE">PERCENT (%)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[11px] font-bold text-[#475569] block mb-1">GST *</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        required
                        value={formData.gst}
                        onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-mono font-bold text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                    <div className="w-32">
                      <label className="text-[11px] font-bold text-[#475569] block mb-1">Type</label>
                      <select
                        value={formData.gst_type}
                        onChange={(e) => setFormData({ ...formData, gst_type: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#0F172A]"
                      >
                        <option value="PERCENTAGE">PERCENT (%)</option>
                        <option value="FIXED">FIXED (₹)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Vendor Charge & Company Charges */}
              <div className="space-y-3 pt-2 border-t border-[#F1F5F9]">
                <span className="text-[11px] font-extrabold text-[#2563EB] uppercase tracking-wider block">4. Vendor &amp; Company Margins</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[11px] font-bold text-[#475569] block mb-1">Vendor Charge</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={formData.vendor_charge}
                        onChange={(e) => setFormData({ ...formData, vendor_charge: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-mono font-bold text-[#0F172A]"
                      />
                    </div>
                    <div className="w-32">
                      <label className="text-[11px] font-bold text-[#475569] block mb-1">Type</label>
                      <select
                        value={formData.vendor_charge_type}
                        onChange={(e) => setFormData({ ...formData, vendor_charge_type: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#0F172A]"
                      >
                        <option value="FIXED">FIXED (₹)</option>
                        <option value="PERCENTAGE">PERCENT (%)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[11px] font-bold text-[#475569] block mb-1">Company Charges</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={formData.company_charges}
                        onChange={(e) => setFormData({ ...formData, company_charges: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-mono font-bold text-[#0F172A]"
                      />
                    </div>
                    <div className="w-32">
                      <label className="text-[11px] font-bold text-[#475569] block mb-1">Type</label>
                      <select
                        value={formData.company_charges_type}
                        onChange={(e) => setFormData({ ...formData, company_charges_type: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#0F172A]"
                      >
                        <option value="FIXED">FIXED (₹)</option>
                        <option value="PERCENTAGE">PERCENT (%)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[11px] font-bold text-[#475569] block mb-1">Company GST</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={formData.company_gst}
                        onChange={(e) => setFormData({ ...formData, company_gst: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-mono font-bold text-[#0F172A]"
                      />
                    </div>
                    <div className="w-32">
                      <label className="text-[11px] font-bold text-[#475569] block mb-1">Type</label>
                      <select
                        value={formData.company_gst_type}
                        onChange={(e) => setFormData({ ...formData, company_gst_type: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#0F172A]"
                      >
                        <option value="PERCENTAGE">PERCENT (%)</option>
                        <option value="FIXED">FIXED (₹)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[11px] font-bold text-[#475569] block mb-1">TDS</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={formData.tds}
                        onChange={(e) => setFormData({ ...formData, tds: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-mono font-bold text-[#0F172A]"
                      />
                    </div>
                    <div className="w-32">
                      <label className="text-[11px] font-bold text-[#475569] block mb-1">Type</label>
                      <select
                        value={formData.tds_type}
                        onChange={(e) => setFormData({ ...formData, tds_type: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#0F172A]"
                      >
                        <option value="PERCENTAGE">PERCENT (%)</option>
                        <option value="FIXED">FIXED (₹)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Audit & Validity */}
              <div className="space-y-3 pt-2 border-t border-[#F1F5F9]">
                <span className="text-[11px] font-extrabold text-[#2563EB] uppercase tracking-wider block">5. Validity &amp; Status</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#475569] block mb-1">Effective From</label>
                    <input
                      type="datetime-local"
                      value={formData.effective_from}
                      onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-medium text-[#0F172A]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#475569] block mb-1">Effective To</label>
                    <input
                      type="datetime-local"
                      value={formData.effective_to}
                      onChange={(e) => setFormData({ ...formData, effective_to: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-medium text-[#0F172A]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="slab_active_chk"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-[#2563EB] focus:ring-[#2563EB]"
                  />
                  <label htmlFor="slab_active_chk" className="text-xs font-bold text-[#0F172A] cursor-pointer">
                    Activate Slab immediately upon saving
                  </label>
                </div>

                {editingSlab && (
                  <div>
                    <label className="text-[11px] font-bold text-[#475569] block mb-1">Audit Change Reason *</label>
                    <input
                      type="text"
                      required
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      placeholder="e.g. Revised slab commission rates for FY26"
                      className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-[#FFFBEB] text-xs font-medium text-[#0F172A]"
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl text-xs font-extrabold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 cursor-pointer shadow-md"
                >
                  {submitting ? "Saving..." : editingSlab ? "Save Changes" : "Create Slab"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Status Activation / Deactivation Modal ── */}
      {statusTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  statusTarget.action === "ACTIVATE" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEF2F2] text-[#DC2626]"
                }`}
              >
                <Power className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#0F172A]">
                  {statusTarget.action === "ACTIVATE" ? "Activate Payout Slab?" : "Deactivate Payout Slab?"}
                </h3>
                <p className="text-xs font-medium text-[#64748B]">
                  {statusTarget.slab.slab_name || statusTarget.slab.service_code} (₹{statusTarget.slab.min_amount.toLocaleString("en-IN")} — ₹
                  {statusTarget.slab.max_amount.toLocaleString("en-IN")})
                </p>
              </div>
            </div>

            <p className="text-xs text-[#475569]">
              {statusTarget.action === "ACTIVATE"
                ? "Activating this slab will make it available for real-time transaction fee calculation if no overlapping active slab exists."
                : "Deactivating this slab will remove it from real-time transaction matching without deleting historical audit records."}
            </p>

            <div>
              <label className="text-[11px] font-bold text-[#475569] block mb-1">Reason for {statusTarget.action.toLowerCase()} *</label>
              <input
                type="text"
                required
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder={`Reason for ${statusTarget.action.toLowerCase()}...`}
                className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setStatusTarget(null);
                  setStatusReason("");
                }}
                className="px-4 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleStatusChange}
                className={`px-5 py-2 rounded-xl text-xs font-extrabold text-white cursor-pointer shadow-md ${
                  statusTarget.action === "ACTIVATE" ? "bg-[#16A34A] hover:bg-[#15803D]" : "bg-[#DC2626] hover:bg-[#B91C1C]"
                }`}
              >
                {submitting ? "Processing..." : `Confirm ${statusTarget.action === "ACTIVATE" ? "Activation" : "Deactivation"}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Audit History Trail Modal ── */}
      {auditTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-2xl w-full max-w-3xl p-6 space-y-4 my-8 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <div>
                <h3 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2">
                  <History className="w-5 h-5 text-[#2563EB]" />
                  Audit Trail History
                </h3>
                <p className="text-xs font-medium text-[#64748B]">
                  {auditTarget.slab_name || auditTarget.service_code} (₹{auditTarget.min_amount.toLocaleString("en-IN")} — ₹
                  {auditTarget.max_amount.toLocaleString("en-IN")})
                </p>
              </div>
              <button
                onClick={() => setAuditTarget(null)}
                className="p-2 rounded-xl text-[#64748B] hover:bg-[#E2E8F0] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {auditLoading ? (
                <div className="py-12 text-center text-xs font-bold text-[#64748B]">Loading audit trail...</div>
              ) : auditLogs.length === 0 ? (
                <div className="py-12 text-center text-xs font-bold text-[#94A3B8]">No audit history found.</div>
              ) : (
                auditLogs.map((log) => {
                  const badgeColor =
                    log.action === "CREATE"
                      ? "bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]"
                      : log.action === "UPDATE"
                      ? "bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]"
                      : log.action === "ACTIVATE"
                      ? "bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]"
                      : "bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]";

                  return (
                    <div key={log.public_id} className="p-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${badgeColor}`}>
                            {log.action}
                          </span>
                          <span className="text-xs font-bold text-[#0F172A]">By {log.changed_by || "ADMIN"}</span>
                        </div>
                        <span className="text-[11px] font-mono text-[#64748B] flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#94A3B8]" />
                          {new Date(log.changed_at).toLocaleString()}
                        </span>
                      </div>

                      {log.reason && <p className="text-xs text-[#475569] font-medium italic bg-white p-2 rounded-lg border border-[#E2E8F0]">"{log.reason}"</p>}

                      {log.new_value && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono pt-1 text-[#334155]">
                          <div className="bg-white p-2 rounded-lg border border-[#E2E8F0]">
                            <span className="text-[10px] text-[#64748B] block">Range</span>
                            ₹{log.new_value.min_amount?.toLocaleString("en-IN")} — ₹{log.new_value.max_amount?.toLocaleString("en-IN")}
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-[#E2E8F0]">
                            <span className="text-[10px] text-[#64748B] block">Commission</span>
                            {log.new_value.commission_type === "PERCENTAGE" ? `${log.new_value.commission}%` : `₹${log.new_value.commission}`}
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-[#E2E8F0]">
                            <span className="text-[10px] text-[#64748B] block">GST</span>
                            {log.new_value.gst_type === "PERCENTAGE" ? `${log.new_value.gst}%` : `₹${log.new_value.gst}`}
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-[#E2E8F0]">
                            <span className="text-[10px] text-[#64748B] block">Status</span>
                            {log.new_value.is_active ? "ACTIVE" : "INACTIVE"}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PayoutSlabsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-[#64748B]">Loading Payout Slabs...</div>}>
      <PayoutSlabsContent />
    </Suspense>
  );
}
