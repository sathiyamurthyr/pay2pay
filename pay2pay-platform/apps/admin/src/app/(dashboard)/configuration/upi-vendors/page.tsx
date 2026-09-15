"use client";

import React, { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import {
  QrCode,
  Plus,
  Search,
  RefreshCw,
  Eye,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  UploadCloud,
  ExternalLink,
  Clock,
  Building,
  TrendingUp,
  X,
  AlertCircle
} from "lucide-react";

interface UpiVendor {
  id: number;
  public_id: string;
  tenant_id: string;
  company_id?: string | null;
  vendor_name: string;
  vendor_code: string;
  company_mdr: number;
  retailer_mdr: number;
  qr_image_url: string;
  qr_image_storage_key: string;
  upi_id: string;
  payee_name?: string | null;
  merchant_code?: string | null;
  upi_uri: string;
  qr_payload: string;
  vendor_status: "ACTIVE" | "INACTIVE";
  qr_status: "ENABLED" | "DISABLED";
  created_by?: string | null;
  created_date: string;
  updated_by?: string | null;
  updated_date: string;
  audit_count?: number;
}

interface AuditEntry {
  id: number;
  admin_id: string;
  action: string;
  field_name?: string | null;
  previous_value?: string | null;
  new_value?: string | null;
  created_at: string;
}

interface DecodedQrData {
  qr_image_url: string;
  qr_image_storage_key: string;
  upi_id: string;
  payee_name?: string | null;
  merchant_code?: string | null;
  amount?: number | null;
  currency?: string | null;
  upi_uri: string;
  qr_payload: string;
}

export default function UpiVendorConfigurationPage() {
  const [vendors, setVendors] = useState<UpiVendor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [qrStatusFilter, setQrStatusFilter] = useState<string>("ALL");

  // Notification / Alert
  const [alert, setAlert] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: ""
  });

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);

  // Selected Vendor
  const [selectedVendor, setSelectedVendor] = useState<UpiVendor | null>(null);
  const [vendorAudits, setVendorAudits] = useState<AuditEntry[]>([]);
  const [loadingAudits, setLoadingAudits] = useState<boolean>(false);

  // Form State (Add / Edit)
  const [formVendorName, setFormVendorName] = useState<string>("");
  const [formVendorCode, setFormVendorCode] = useState<string>("");
  const [formCompanyMdr, setFormCompanyMdr] = useState<string>("0.50");
  const [formRetailerMdr, setFormRetailerMdr] = useState<string>("0.30");
  const [formVendorStatus, setFormVendorStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [formQrStatus, setFormQrStatus] = useState<"ENABLED" | "DISABLED">("ENABLED");

  // QR Upload & Decoding State
  const [uploadingQr, setUploadingQr] = useState<boolean>(false);
  const [qrDecodedData, setQrDecodedData] = useState<DecodedQrData | null>(null);
  const [qrUploadError, setQrUploadError] = useState<string | null>(null);
  const [submittingForm, setSubmittingForm] = useState<boolean>(false);

  // Copy helper
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleCopy = (text: string, id: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // ── Fetch Vendors ──────────────────────────────────────────────────────────
  const fetchVendors = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (qrStatusFilter !== "ALL") params.append("qr_status", qrStatusFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await api.get(`/api/v1/admin/upi/vendors?${params.toString()}`);
      if (res.data?.data) {
        setVendors(res.data.data);
      }
    } catch (err: any) {
      console.error("Failed to fetch UPI vendors:", err);
      setAlert({
        type: "error",
        message: err.response?.data?.detail || "Failed to load UPI vendors from server."
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, qrStatusFilter, searchQuery]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  // ── QR Upload & Decoding Handler ───────────────────────────────────────────
  const handleQrFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 10MB) and type
    if (file.size > 10 * 1024 * 1024) {
      setQrUploadError("File size exceeds 10MB limit. Please upload a smaller image.");
      return;
    }

    try {
      setUploadingQr(true);
      setQrUploadError(null);
      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post("/api/v1/admin/upi/vendors/decode-qr", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data?.success && res.data?.data) {
        const decoded = res.data.data;
        setQrDecodedData(decoded);

        // Auto-fill suggested vendor name and code if empty
        if (!formVendorName && decoded.payee_name) {
          setFormVendorName(decoded.payee_name);
        }
        if (!formVendorCode && decoded.upi_id) {
          const prefix = decoded.upi_id.split("@")[0]?.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
          if (prefix) setFormVendorCode(`${prefix}_UPI`);
        }
      } else {
        setQrUploadError("Could not decode UPI QR code. Please upload a clearer image.");
      }
    } catch (err: any) {
      console.error("QR decoding failed:", err);
      const detail =
        err.response?.data?.detail ||
        "Could not detect or decode valid UPI QR code. Please upload a sharp image.";
      setQrUploadError(detail);
    } finally {
      setUploadingQr(false);
    }
  };

  // ── Open Add Modal ─────────────────────────────────────────────────────────
  const openAddModal = () => {
    setFormVendorName("");
    setFormVendorCode("");
    setFormCompanyMdr("0.50");
    setFormRetailerMdr("0.30");
    setFormVendorStatus("ACTIVE");
    setFormQrStatus("ENABLED");
    setQrDecodedData(null);
    setQrUploadError(null);
    setIsAddModalOpen(true);
  };

  // ── Open Edit Modal ────────────────────────────────────────────────────────
  const openEditModal = (vendor: UpiVendor) => {
    setSelectedVendor(vendor);
    setFormVendorName(vendor.vendor_name);
    setFormVendorCode(vendor.vendor_code);
    setFormCompanyMdr(vendor.company_mdr.toString());
    setFormRetailerMdr(vendor.retailer_mdr.toString());
    setFormVendorStatus(vendor.vendor_status);
    setFormQrStatus(vendor.qr_status);
    setQrDecodedData({
      qr_image_url: vendor.qr_image_url,
      qr_image_storage_key: vendor.qr_image_storage_key,
      upi_id: vendor.upi_id,
      payee_name: vendor.payee_name,
      merchant_code: vendor.merchant_code,
      upi_uri: vendor.upi_uri,
      qr_payload: vendor.qr_payload
    });
    setQrUploadError(null);
    setIsEditModalOpen(true);
  };

  // ── Create Vendor Submit ───────────────────────────────────────────────────
  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrDecodedData) {
      setQrUploadError("Please upload and decode a valid Static UPI QR code image.");
      return;
    }

    try {
      setSubmittingForm(true);
      const payload = {
        vendor_name: formVendorName.trim(),
        vendor_code: formVendorCode.trim().toUpperCase(),
        company_mdr: parseFloat(formCompanyMdr) || 0,
        retailer_mdr: parseFloat(formRetailerMdr) || 0,
        qr_image_url: qrDecodedData.qr_image_url,
        qr_image_storage_key: qrDecodedData.qr_image_storage_key,
        upi_id: qrDecodedData.upi_id,
        payee_name: qrDecodedData.payee_name || formVendorName.trim(),
        merchant_code: qrDecodedData.merchant_code || null,
        upi_uri: qrDecodedData.upi_uri,
        qr_payload: qrDecodedData.qr_payload,
        vendor_status: formVendorStatus,
        qr_status: formQrStatus
      };

      const res = await api.post("/api/v1/admin/upi/vendors", payload);
      if (res.data?.success) {
        setAlert({
          type: "success",
          message: res.data.message || `UPI Vendor '${formVendorName}' created successfully.`
        });
        setIsAddModalOpen(false);
        fetchVendors();
      }
    } catch (err: any) {
      console.error("Create vendor error:", err);
      const detail = err.response?.data?.detail || "Failed to create UPI vendor.";
      setAlert({ type: "error", message: detail });
    } finally {
      setSubmittingForm(false);
    }
  };

  // ── Update Vendor Submit ───────────────────────────────────────────────────
  const handleUpdateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor) return;

    try {
      setSubmittingForm(true);
      const payload: any = {
        vendor_name: formVendorName.trim(),
        vendor_code: formVendorCode.trim().toUpperCase(),
        company_mdr: parseFloat(formCompanyMdr) || 0,
        retailer_mdr: parseFloat(formRetailerMdr) || 0,
        vendor_status: formVendorStatus,
        qr_status: formQrStatus
      };

      // If user uploaded a new QR
      if (
        qrDecodedData &&
        qrDecodedData.qr_image_storage_key !== selectedVendor.qr_image_storage_key
      ) {
        payload.qr_image_url = qrDecodedData.qr_image_url;
        payload.qr_image_storage_key = qrDecodedData.qr_image_storage_key;
        payload.upi_id = qrDecodedData.upi_id;
        payload.payee_name = qrDecodedData.payee_name || formVendorName.trim();
        payload.merchant_code = qrDecodedData.merchant_code || null;
        payload.upi_uri = qrDecodedData.upi_uri;
        payload.qr_payload = qrDecodedData.qr_payload;
      }

      const res = await api.put(`/api/v1/admin/upi/vendors/${selectedVendor.public_id}`, payload);
      if (res.data?.success) {
        setAlert({
          type: "success",
          message: res.data.message || `UPI Vendor '${formVendorName}' updated successfully.`
        });
        setIsEditModalOpen(false);
        fetchVendors();
      }
    } catch (err: any) {
      console.error("Update vendor error:", err);
      const detail = err.response?.data?.detail || "Failed to update UPI vendor.";
      setAlert({ type: "error", message: detail });
    } finally {
      setSubmittingForm(false);
    }
  };

  // ── Open View Modal ────────────────────────────────────────────────────────
  const openViewModal = async (vendor: UpiVendor) => {
    setSelectedVendor(vendor);
    setIsViewModalOpen(true);
    try {
      setLoadingAudits(true);
      const res = await api.get(`/api/v1/admin/upi/vendors/${vendor.public_id}`);
      if (res.data?.data?.audit_history) {
        setVendorAudits(res.data.data.audit_history);
      }
    } catch (err) {
      console.warn("Failed to load audit history:", err);
      setVendorAudits([]);
    } finally {
      setLoadingAudits(false);
    }
  };

  // ── Toggle Vendor Status ───────────────────────────────────────────────────
  const handleToggleVendorStatus = async (vendor: UpiVendor) => {
    const nextStatus = vendor.vendor_status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await api.patch(`/api/v1/admin/upi/vendors/${vendor.public_id}/status`, {
        vendor_status: nextStatus
      });
      if (res.data?.success) {
        setAlert({
          type: "success",
          message: `Vendor '${vendor.vendor_name}' status updated to ${nextStatus}.`
        });
        setVendors((prev) =>
          prev.map((v) => (v.public_id === vendor.public_id ? { ...v, vendor_status: nextStatus } : v))
        );
      }
    } catch (err: any) {
      console.error("Status toggle error:", err);
      setAlert({
        type: "error",
        message: err.response?.data?.detail || "Failed to update vendor status."
      });
    }
  };

  // ── Toggle QR Status ───────────────────────────────────────────────────────
  const handleToggleQrStatus = async (vendor: UpiVendor) => {
    const nextQrStatus = vendor.qr_status === "ENABLED" ? "DISABLED" : "ENABLED";
    try {
      const res = await api.patch(`/api/v1/admin/upi/vendors/${vendor.public_id}/qr-status`, {
        qr_status: nextQrStatus
      });
      if (res.data?.success) {
        setAlert({
          type: "success",
          message: `QR code for '${vendor.vendor_name}' is now ${nextQrStatus}.`
        });
        setVendors((prev) =>
          prev.map((v) => (v.public_id === vendor.public_id ? { ...v, qr_status: nextQrStatus } : v))
        );
      }
    } catch (err: any) {
      console.error("QR status toggle error:", err);
      setAlert({
        type: "error",
        message: err.response?.data?.detail || "Failed to update QR status."
      });
    }
  };

  // ── Metrics ────────────────────────────────────────────────────────────────
  const totalVendors = vendors.length;
  const activeVendors = vendors.filter((v) => v.vendor_status === "ACTIVE").length;
  const qrEnabledVendors = vendors.filter((v) => v.qr_status === "ENABLED").length;
  const avgRetailerMdr =
    totalVendors > 0
      ? (vendors.reduce((acc, v) => acc + Number(v.retailer_mdr), 0) / totalVendors).toFixed(2)
      : "0.00";

  return (
    <div className="space-y-6 bg-white min-h-full text-[#0F172A] p-2 sm:p-4">
      {/* ── Top Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563EB] shadow-2xs">
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#0F172A] flex items-center gap-2.5">
                UPI Vendor Configuration
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-50 text-[#1D4ED8] border border-[#BFDBFE] font-mono font-bold uppercase tracking-wider">
                  Admin Master
                </span>
              </h1>
              <p className="text-xs text-[#64748B] mt-0.5 font-medium">
                Manage UPI QR vendors, Backblaze B2 static QR storage, live MDR rates, and dynamic Retailer visibility.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchVendors}
            disabled={loading}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 transition-all shadow-2xs flex items-center justify-center cursor-pointer disabled:opacity-50"
            title="Refresh Vendors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            + Add UPI Vendor
          </button>
        </div>
      </div>

      {/* ── Alert Toast Banner ── */}
      {alert.type && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in duration-200 ${
            alert.type === "success"
              ? "bg-[#DCFCE7] border-[#BBF7D0] text-[#166534]"
              : "bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {alert.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-[#16A34A] shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-[#DC2626] shrink-0" />
            )}
            <span>{alert.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setAlert({ type: null, message: "" })}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Vendors */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Total UPI Vendors</span>
            <Building className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl md:text-3xl font-extrabold text-[#0F172A]">{totalVendors}</div>
          <span className="text-[11px] text-[#64748B] mt-1 block font-medium">Configured in Master Table</span>
        </div>

        {/* Active Vendors */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#166534]">Active Vendors</span>
            <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
          </div>
          <div className="mt-2 text-2xl md:text-3xl font-extrabold text-[#16A34A]">{activeVendors}</div>
          <span className="text-[11px] text-[#64748B] mt-1 block font-medium">Live & Ready for Routing</span>
        </div>

        {/* QR Enabled */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1D4ED8]">QR Code Enabled</span>
            <QrCode className="h-4 w-4 text-[#2563EB]" />
          </div>
          <div className="mt-2 text-2xl md:text-3xl font-extrabold text-[#2563EB]">{qrEnabledVendors}</div>
          <span className="text-[11px] text-[#64748B] mt-1 block font-medium">Visible on Retailer UPI Tab</span>
        </div>

        {/* Average Retailer MDR */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#B45309]">Avg Retailer MDR</span>
            <TrendingUp className="h-4 w-4 text-[#D97706]" />
          </div>
          <div className="mt-2 text-2xl md:text-3xl font-extrabold text-[#D97706]">{avgRetailerMdr}%</div>
          <span className="text-[11px] text-[#64748B] mt-1 block font-medium">Configured Fee Rate</span>
        </div>
      </div>

      {/* ── Filters & Search Bar ── */}
      <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by vendor name, code, or UPI ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none transition-all shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Vendor Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Vendor:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 transition-all shadow-2xs cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {/* QR Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">QR:</span>
            <select
              value={qrStatusFilter}
              onChange={(e) => setQrStatusFilter(e.target.value)}
              className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 transition-all shadow-2xs cursor-pointer"
            >
              <option value="ALL">All QR Status</option>
              <option value="ENABLED">Enabled</option>
              <option value="DISABLED">Disabled</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Main Vendors Table ── */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-[#F8FAFC] text-[#64748B] uppercase text-[11px] tracking-wider border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3.5 px-4">Vendor Details</th>
                <th className="py-3.5 px-4">UPI VPA & Payee</th>
                <th className="py-3.5 px-4">Company MDR</th>
                <th className="py-3.5 px-4">Retailer MDR</th>
                <th className="py-3.5 px-4">QR Status</th>
                <th className="py-3.5 px-4">Vendor Status</th>
                <th className="py-3.5 px-4">Timestamps</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading UPI vendors from database...
                  </td>
                </tr>
              ) : vendors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <QrCode className="h-8 w-8 mx-auto mb-2 text-slate-400 stroke-[1.5]" />
                    <span className="font-bold text-slate-700 block text-sm">No UPI Vendors Found</span>
                    <span className="text-xs text-slate-400 mt-1 block font-medium">
                      Click &quot;+ Add UPI Vendor&quot; to configure your first UPI QR vendor.
                    </span>
                  </td>
                </tr>
              ) : (
                vendors.map((v) => {
                  const isVendorActive = v.vendor_status === "ACTIVE";
                  const isQrEnabled = v.qr_status === "ENABLED";

                  return (
                    <tr key={v.public_id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Vendor Details */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {/* QR Thumbnail Preview */}
                          <div
                            onClick={() => openViewModal(v)}
                            className="h-11 w-11 rounded-xl bg-white p-1 border border-slate-200 shrink-0 cursor-pointer shadow-2xs hover:border-blue-400 hover:scale-105 transition-all"
                            title="Click to view QR preview"
                          >
                            <img
                              src={v.qr_image_url}
                              alt={v.vendor_name}
                              className="h-full w-full object-contain"
                            />
                          </div>
                          <div>
                            <span className="font-bold text-[#0F172A] block text-sm">{v.vendor_name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-mono font-bold">
                              {v.vendor_code}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* UPI ID & Payee */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-900">
                            <span>{v.upi_id}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(v.upi_id, `vpa-${v.id}`)}
                              className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                              title="Copy UPI ID"
                            >
                              {copiedId === `vpa-${v.id}` ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                          <span className="text-[11px] text-slate-500 block font-sans font-medium">
                            {v.payee_name || "Payee: Not Specified"}
                          </span>
                        </div>
                      </td>

                      {/* Company MDR */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        {Number(v.company_mdr).toFixed(2)}%
                      </td>

                      {/* Retailer MDR */}
                      <td className="py-3.5 px-4 font-mono font-extrabold text-[#2563EB]">
                        {Number(v.retailer_mdr).toFixed(2)}%
                      </td>

                      {/* QR Status Toggle */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleQrStatus(v)}
                          className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                            isQrEnabled
                              ? "bg-[#DCFCE7] text-[#166534] border-[#BBF7D0] hover:bg-[#bbf7d0]"
                              : "bg-[#F1F5F9] text-[#475569] border-[#E2E8F0] hover:bg-[#e2e8f0]"
                          }`}
                          title="Click to toggle QR Enabled/Disabled"
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isQrEnabled ? "bg-[#16A34A] animate-pulse" : "bg-slate-400"
                            }`}
                          />
                          {v.qr_status}
                        </button>
                      </td>

                      {/* Vendor Status Toggle */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleVendorStatus(v)}
                          className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                            isVendorActive
                              ? "bg-[#DCFCE7] text-[#166534] border-[#BBF7D0] hover:bg-[#bbf7d0]"
                              : "bg-[#FEF2F2] text-[#991B1B] border-[#FCA5A5] hover:bg-[#fca5a5]"
                          }`}
                          title="Click to toggle Vendor Active/Inactive"
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isVendorActive ? "bg-[#16A34A]" : "bg-[#DC2626]"
                            }`}
                          />
                          {v.vendor_status}
                        </button>
                      </td>

                      {/* Timestamps */}
                      <td className="py-3.5 px-4 text-[11px] text-slate-500">
                        <div className="font-medium">Created: {new Date(v.created_date).toLocaleDateString("en-IN")}</div>
                        <div className="text-[10px] text-slate-400">
                          Updated: {new Date(v.updated_date).toLocaleDateString("en-IN")}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openViewModal(v)}
                            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer shadow-2xs"
                            title="View Details & QR Preview"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(v)}
                            className="p-2 rounded-xl border border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#EFF6FF] hover:text-[#2563EB] hover:border-[#BFDBFE] transition-all cursor-pointer shadow-2xs"
                            title="Edit Configuration"
                          >
                            <Edit2 className="h-4 w-4" />
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

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* ADD UPI VENDOR MODAL */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto text-[#0F172A]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-[#2563EB] border border-blue-100 flex items-center justify-center font-bold">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0F172A]">Add New UPI Vendor</h3>
                  <p className="text-[11px] text-[#64748B] font-medium">Configure new static QR vendor and MDR parameters</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVendor} className="space-y-4 text-xs">
              {/* Vendor Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">
                    Vendor Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mswipe UPI, BharatPe"
                    value={formVendorName}
                    onChange={(e) => setFormVendorName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">
                    Vendor Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MSWIPE_UPI"
                    value={formVendorCode}
                    onChange={(e) => setFormVendorCode(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono uppercase text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-bold"
                  />
                </div>
              </div>

              {/* Company MDR & Retailer MDR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">
                    Company MDR (%) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    placeholder="0.50"
                    value={formCompanyMdr}
                    onChange={(e) => setFormCompanyMdr(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">
                    Retailer MDR (%) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    placeholder="0.30"
                    value={formRetailerMdr}
                    onChange={(e) => setFormRetailerMdr(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-bold"
                  />
                </div>
              </div>

              {/* Upload Static QR Image (Automatic B2 upload & QR Decoding) */}
              <div className="space-y-2 pt-1">
                <label className="font-bold text-slate-700 flex items-center justify-between">
                  <span>Upload Static QR Image <span className="text-rose-500">*</span></span>
                  <span className="text-[11px] text-blue-600 font-semibold">Stored in Backblaze B2</span>
                </label>

                <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-5 text-center bg-slate-50/70 hover:bg-blue-50/20 transition-all relative cursor-pointer">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    onChange={handleQrFileUpload}
                    disabled={uploadingQr}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {uploadingQr ? (
                    <div className="py-4 space-y-2">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-600" />
                      <p className="text-xs font-bold text-slate-700">Reading and decoding QR code...</p>
                    </div>
                  ) : (
                    <div className="py-2 space-y-1.5">
                      <UploadCloud className="h-8 w-8 mx-auto text-blue-600" />
                      <p className="text-xs font-bold text-slate-700">
                        Click or drag static QR image here to upload
                      </p>
                      <p className="text-[11px] text-slate-400 font-medium">Supports JPG, PNG, WEBP (Max 10MB)</p>
                    </div>
                  )}
                </div>

                {qrUploadError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 font-medium">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>{qrUploadError}</span>
                  </div>
                )}

                {/* Decoded Telemetry Preview Box */}
                {qrDecodedData && (
                  <div className="p-4 rounded-xl bg-[#DCFCE7] border border-[#BBF7D0] space-y-3">
                    <div className="flex items-center justify-between border-b border-[#BBF7D0] pb-2">
                      <span className="text-xs font-extrabold text-[#166534] flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                        QR Detected Successfully
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#BBF7D0] text-[#166534] font-mono font-extrabold">
                        B2 Stored
                      </span>
                    </div>

                    <div className="flex items-start gap-3.5">
                      {/* Image Preview */}
                      <div className="h-16 w-16 bg-white p-1 rounded-xl border border-slate-200 shrink-0 shadow-2xs">
                        <img
                          src={qrDecodedData.qr_image_url}
                          alt="Decoded QR"
                          className="h-full w-full object-contain"
                        />
                      </div>

                      <div className="space-y-1 text-[11px] flex-1 overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-600 font-bold">UPI ID:</span>
                          <span className="font-mono font-extrabold text-[#166534] truncate">{qrDecodedData.upi_id}</span>
                        </div>
                        {qrDecodedData.payee_name && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-600 font-bold">Payee Name:</span>
                            <span className="text-slate-900 font-semibold truncate">{qrDecodedData.payee_name}</span>
                          </div>
                        )}
                        <div className="pt-1">
                          <span className="text-[10px] text-slate-500 font-mono block truncate" title={qrDecodedData.upi_uri}>
                            {qrDecodedData.upi_uri}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Status & QR Status Toggles */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Vendor Status</label>
                  <select
                    value={formVendorStatus}
                    onChange={(e) => setFormVendorStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-[#0F172A] font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">QR Status</label>
                  <select
                    value={formQrStatus}
                    onChange={(e) => setFormQrStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-[#0F172A] font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="ENABLED">ENABLED</option>
                    <option value="DISABLED">DISABLED</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingForm || !qrDecodedData}
                  className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold rounded-xl shadow-2xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                >
                  {submittingForm ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-white" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 stroke-[3]" />
                      Save Configuration
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* EDIT UPI VENDOR MODAL */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {isEditModalOpen && selectedVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto text-[#0F172A]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-[#2563EB] border border-blue-100 flex items-center justify-center font-bold">
                  <Edit2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0F172A]">Edit UPI Vendor</h3>
                  <p className="text-[11px] text-[#64748B] font-medium">Modify configuration parameters for {selectedVendor.vendor_name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateVendor} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Vendor Name</label>
                  <input
                    type="text"
                    required
                    value={formVendorName}
                    onChange={(e) => setFormVendorName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-[#0F172A] font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Vendor Code</label>
                  <input
                    type="text"
                    required
                    value={formVendorCode}
                    onChange={(e) => setFormVendorCode(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono uppercase text-[#0F172A] font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Company MDR (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    value={formCompanyMdr}
                    onChange={(e) => setFormCompanyMdr(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-[#0F172A] font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Retailer MDR (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    value={formRetailerMdr}
                    onChange={(e) => setFormRetailerMdr(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-[#0F172A] font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Replace QR image if desired */}
              <div className="space-y-2 pt-1">
                <label className="font-bold text-slate-700 flex items-center justify-between">
                  <span>Current Static QR Code</span>
                  <span className="text-[11px] text-blue-600 font-semibold">Upload new image to replace</span>
                </label>

                {qrDecodedData && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                    <div className="h-14 w-14 bg-white p-1 rounded-xl border border-slate-200 shrink-0 shadow-2xs">
                      <img
                        src={qrDecodedData.qr_image_url}
                        alt="QR Preview"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="space-y-0.5 text-[11px] overflow-hidden flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-bold">UPI ID:</span>
                        <span className="font-mono font-bold text-[#2563EB] truncate">{qrDecodedData.upi_id}</span>
                      </div>
                      <div className="text-slate-600 truncate font-medium">
                        Payee: {qrDecodedData.payee_name || "N/A"}
                      </div>
                    </div>
                  </div>
                )}

                <div className="border border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-3.5 text-center bg-slate-50/50 hover:bg-blue-50/20 transition-all relative cursor-pointer">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    onChange={handleQrFileUpload}
                    disabled={uploadingQr}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <span className="text-xs font-semibold text-slate-600">
                    {uploadingQr ? "Decoding new QR..." : "Click to select a different QR image to replace"}
                  </span>
                </div>
                {qrUploadError && (
                  <p className="text-rose-600 text-[11px] font-semibold">{qrUploadError}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Vendor Status</label>
                  <select
                    value={formVendorStatus}
                    onChange={(e) => setFormVendorStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-[#0F172A] font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">QR Status</label>
                  <select
                    value={formQrStatus}
                    onChange={(e) => setFormQrStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-[#0F172A] font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="ENABLED">ENABLED</option>
                    <option value="DISABLED">DISABLED</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingForm}
                  className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold rounded-xl shadow-2xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {submittingForm ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* VIEW VENDOR DETAILS & QR PREVIEW DRAWER */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {isViewModalOpen && selectedVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto text-[#0F172A]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-[#2563EB] border border-blue-100 flex items-center justify-center font-bold">
                  <QrCode className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0F172A]">{selectedVendor.vendor_name}</h3>
                  <p className="text-[11px] text-[#64748B] font-mono font-bold">{selectedVendor.vendor_code}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* QR Preview Section */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col items-center justify-center text-center space-y-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Configured Static QR Code
                </span>
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200">
                  <img
                    src={selectedVendor.qr_image_url}
                    alt={selectedVendor.vendor_name}
                    className="w-44 h-44 object-contain"
                  />
                </div>
                <a
                  href={selectedVendor.qr_image_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#2563EB] font-bold hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open in Backblaze B2
                </a>
              </div>

              {/* Vendor Specs */}
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">UPI ID / VPA:</span>
                    <span className="font-mono font-extrabold text-[#2563EB]">{selectedVendor.upi_id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Payee Name:</span>
                    <span className="font-bold text-[#0F172A]">{selectedVendor.payee_name || "N/A"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Merchant Code:</span>
                    <span className="font-mono font-semibold text-slate-700">{selectedVendor.merchant_code || "N/A"}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Company MDR:</span>
                    <span className="font-mono font-bold text-[#0F172A]">{Number(selectedVendor.company_mdr).toFixed(2)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Retailer MDR:</span>
                    <span className="font-mono font-extrabold text-[#2563EB]">{Number(selectedVendor.retailer_mdr).toFixed(2)}%</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Vendor Status:</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        selectedVendor.vendor_status === "ACTIVE"
                          ? "bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]"
                          : "bg-[#FEF2F2] text-[#991B1B] border border-[#FCA5A5]"
                      }`}
                    >
                      {selectedVendor.vendor_status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">QR Status:</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        selectedVendor.qr_status === "ENABLED"
                          ? "bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]"
                          : "bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]"
                      }`}
                    >
                      {selectedVendor.qr_status}
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 space-y-1 pt-1 font-medium">
                  <div>Created By: {selectedVendor.created_by || "System"} • {new Date(selectedVendor.created_date).toLocaleString("en-IN")}</div>
                  <div>Updated By: {selectedVendor.updated_by || "System"} • {new Date(selectedVendor.updated_date).toLocaleString("en-IN")}</div>
                </div>
              </div>
            </div>

            {/* UPI URI Payload Box */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                Decoded UPI Payload
              </span>
              <p className="font-mono text-[11px] text-[#1D4ED8] break-all select-all bg-white p-2.5 rounded-lg border border-slate-200">
                {selectedVendor.upi_uri}
              </p>
            </div>

            {/* Audit History Timeline */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-extrabold text-[#0F172A] flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-[#2563EB]" />
                Audit Trail History
              </span>

              {loadingAudits ? (
                <div className="py-4 text-center text-xs text-slate-400">Loading audit history...</div>
              ) : vendorAudits.length === 0 ? (
                <div className="py-3 text-center text-xs text-slate-400 font-medium">No configuration changes logged yet.</div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {vendorAudits.map((a) => (
                    <div
                      key={a.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#2563EB]">{a.action}</span>
                          {a.field_name && (
                            <span className="text-slate-600 font-mono font-medium">({a.field_name})</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          By {a.admin_id} • {new Date(a.created_at).toLocaleString("en-IN")}
                        </div>
                      </div>
                      {a.previous_value && a.new_value && (
                        <div className="text-[10px] font-mono text-right text-slate-500">
                          <span className="text-rose-600 line-through">{a.previous_value}</span>
                          {" → "}
                          <span className="text-emerald-700 font-bold">{a.new_value}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
