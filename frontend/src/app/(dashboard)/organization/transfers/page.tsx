"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import {
  ArrowLeftRight,
  ChevronLeft,
  CheckCircle,
  Clock,
  Plus,
  X,
  AlertCircle,
} from "lucide-react";
import { DataTable, type TableColumn } from "@/components/ui/data-table";

interface TransferItem {
  public_id: string;
  entity_type: string;
  entity_id: string;
  old_parent_type: string;
  old_parent_id: string;
  new_parent_type: string;
  new_parent_id: string;
  effective_date: string;
  reason: string;
  status: string;
  approved_by?: string;
  created_date: string;
}

/** Parse FastAPI Pydantic validation errors or string errors into a readable message */
function parseErrorMessage(err: any): string {
  const detail = err?.response?.data?.detail;
  if (!detail) return "An unexpected error occurred. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d: any) => {
        const field = Array.isArray(d.loc) ? d.loc.join(" → ") : "field";
        return `${field}: ${d.msg}`;
      })
      .join("\n");
  }
  return JSON.stringify(detail);
}

export default function OrganizationTransfersPage() {
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [rms, setRms] = useState<any[]>([]);
  const [sds, setSds] = useState<any[]>([]);
  const [dists, setDists] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    entity_type: "SUPER_DISTRIBUTOR",
    entity_id: "",
    new_parent_type: "REGIONAL_MANAGER",
    new_parent_id: "",
    reason: "",
  });

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/organization/transfers");
      setTransfers(res.data.items || []);
    } catch (err) {
      console.error("Failed to fetch transfers", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHierarchyEntities = async () => {
    try {
      const [rmRes, sdRes, distRes] = await Promise.all([
        api.get("/api/v1/organization/rms"),
        api.get("/api/v1/organization/super-distributors"),
        api.get("/api/v1/organization/distributors"),
      ]);
      const rmItems = rmRes.data.items || [];
      const sdItems = sdRes.data.items || [];
      const distItems = distRes.data.items || [];

      setRms(rmItems);
      setSds(sdItems);
      setDists(distItems);

      setFormData((prev) => ({
        ...prev,
        entity_id: sdItems[0]?.public_id || "",
        new_parent_id: rmItems[0]?.public_id || "",
      }));
    } catch (err) {
      console.error("Failed to load hierarchy entities", err);
    }
  };

  useEffect(() => {
    fetchTransfers();
    fetchHierarchyEntities();
  }, []);

  // Auto-update entity_id when entity_type changes
  useEffect(() => {
    if (formData.entity_type === "SUPER_DISTRIBUTOR") {
      setFormData((prev) => ({ ...prev, entity_id: sds[0]?.public_id || "", new_parent_type: "REGIONAL_MANAGER", new_parent_id: rms[0]?.public_id || "" }));
    } else if (formData.entity_type === "DISTRIBUTOR") {
      setFormData((prev) => ({ ...prev, entity_id: dists[0]?.public_id || "", new_parent_type: "SUPER_DISTRIBUTOR", new_parent_id: sds[0]?.public_id || "" }));
    }
  }, [formData.entity_type]);

  // Options for entity_id dropdown
  const entityOptions = formData.entity_type === "SUPER_DISTRIBUTOR"
    ? sds.map((s) => ({ value: s.public_id, label: `${s.business_name} (${s.email})` }))
    : dists.map((d) => ({ value: d.public_id, label: `${d.business_name} (${d.email})` }));

  // Options for new_parent dropdown
  const parentOptions = formData.new_parent_type === "REGIONAL_MANAGER"
    ? rms.map((r) => ({ value: r.public_id, label: `${r.full_name} (${r.employee_code})` }))
    : formData.new_parent_type === "SUPER_DISTRIBUTOR"
    ? sds.map((s) => ({ value: s.public_id, label: `${s.business_name} (${s.email})` }))
    : dists.map((d) => ({ value: d.public_id, label: `${d.business_name} (${d.email})` }));

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!formData.reason || formData.reason.trim().length < 5) {
      setModalError("Transfer reason must be at least 5 characters.");
      return;
    }
    try {
      setSubmitting(true);
      await api.post("/api/v1/organization/transfers", formData);
      setShowModal(false);
      setFormData({ entity_type: "SUPER_DISTRIBUTOR", entity_id: sds[0]?.public_id || "", new_parent_type: "REGIONAL_MANAGER", new_parent_id: rms[0]?.public_id || "", reason: "" });
      fetchTransfers();
    } catch (err: any) {
      setModalError(parseErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (transferId: string) => {
    try {
      await api.post(`/api/v1/organization/transfers/${transferId}/approve`, { comments: "Approved by Admin" });
      fetchTransfers();
    } catch (err: any) {
      alert(parseErrorMessage(err));
    }
  };

  const columns: TableColumn<TransferItem>[] = [
    {
      id: "entity_type",
      header: "Entity Type",
      sortable: true,
      cell: (t) => (
        <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]">
          {t.entity_type}
        </span>
      ),
    },
    {
      id: "entity_id",
      header: "Entity ID",
      cell: (t) => (
        <span className="font-mono text-[11px] font-bold text-[#2563EB] truncate max-w-[140px] block">
          {t.entity_id}
        </span>
      ),
    },
    {
      id: "new_parent",
      header: "New Parent",
      cell: (t) => (
        <div className="font-mono text-xs">
          <span className="font-bold text-[#0F172A]">{t.new_parent_type}</span>
          <span className="text-[#64748B] block text-[11px] truncate max-w-[140px]">{t.new_parent_id}</span>
        </div>
      ),
    },
    {
      id: "reason",
      header: "Reason",
      cell: (t) => <span className="text-xs text-[#334155] font-medium">{t.reason || "Territory Realignment"}</span>,
    },
    {
      id: "effective_date",
      header: "Effective Date",
      cell: (t) => (
        <span className="text-xs text-[#475569]">
          {t.effective_date ? new Date(t.effective_date).toLocaleDateString("en-IN") : "—"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      cell: (t) => {
        const isPending = t.status === "PENDING_APPROVAL" || t.status === "PENDING";
        const isApproved = t.status === "APPROVED";
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
              isApproved
                ? "bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]"
                : isPending
                ? "bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]"
                : "bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]"
            }`}
          >
            {isApproved ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {t.status}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: (t) => {
        const isPending = t.status === "PENDING_APPROVAL" || t.status === "PENDING";
        return isPending ? (
          <button
            onClick={() => handleApprove(t.public_id)}
            className="px-3 py-1 rounded-md bg-[#16A34A] text-white font-extrabold text-[11px] hover:bg-[#15803D] transition-all cursor-pointer shadow-2xs"
          >
            Approve
          </button>
        ) : (
          <span className="text-[11px] font-mono text-[#64748B]">Processed</span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/organization"
            className="flex items-center justify-center rounded-lg border border-[#E2E8F0] bg-white p-2.5 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight flex items-center gap-3">
              <ArrowLeftRight className="w-7 h-7 text-[#2563EB]" />
              Organization Transfers & Workflow
            </h1>
            <p className="mt-0.5 text-xs text-[#64748B] font-medium">
              Audit trail of entity transfers between parent managers without settlement history mutation
            </p>
          </div>
        </div>
        <button
          onClick={() => { setShowModal(true); setModalError(null); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2563EB] text-xs font-extrabold text-white hover:bg-[#1D4ED8] shadow-2xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Request Entity Transfer
        </button>
      </div>

      {/* Transfer History Data Table */}
      <DataTable
        data={transfers}
        columns={columns}
        keyExtractor={(t) => t.public_id}
        loading={loading}
        totalRecords={transfers.length}
        pageSize={10}
        onRefresh={fetchTransfers}
        onAddNew={() => { setShowModal(true); setModalError(null); }}
        addNewLabel="Request Entity Transfer"
        searchPlaceholder="Search transfer requests by Entity ID, Reason, Status..."
        filterOptions={[
          {
            key: "status",
            label: "Status",
            options: [
              { label: "Approved", value: "APPROVED" },
              { label: "Pending Approval", value: "PENDING_APPROVAL" },
              { label: "Rejected", value: "REJECTED" },
            ],
          },
        ]}
      />

      {/* Transfer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-[#2563EB]" /> Request Node Transfer
              </h2>
              <button onClick={() => setShowModal(false)} className="text-[#64748B] hover:text-[#0F172A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Banner */}
            {modalError && (
              <div className="flex items-start gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-xs font-bold text-[#991B1B]">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#DC2626]" />
                <pre className="whitespace-pre-wrap font-sans">{modalError}</pre>
              </div>
            )}

            <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs font-bold">
              {/* Entity Type */}
              <div>
                <label className="text-[#374151] block mb-1">Entity Type to Transfer *</label>
                <select
                  value={formData.entity_type}
                  onChange={(e) => setFormData({ ...formData, entity_type: e.target.value })}
                  className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 text-[#111827] focus:border-[#2563EB] focus:outline-none cursor-pointer"
                >
                  <option value="SUPER_DISTRIBUTOR">Super Distributor</option>
                  <option value="DISTRIBUTOR">Distributor</option>
                </select>
              </div>

              {/* Target Entity — dynamic dropdown */}
              <div>
                <label className="text-[#374151] block mb-1">Select Entity to Transfer *</label>
                <select
                  required
                  value={formData.entity_id}
                  onChange={(e) => setFormData({ ...formData, entity_id: e.target.value })}
                  className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 text-[#111827] focus:border-[#2563EB] focus:outline-none cursor-pointer"
                >
                  {entityOptions.length === 0 && (
                    <option value="">No entities available</option>
                  )}
                  {entityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* New Parent Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[#374151] block mb-1">New Parent Type *</label>
                  <select
                    value={formData.new_parent_type}
                    onChange={(e) => setFormData({ ...formData, new_parent_type: e.target.value, new_parent_id: "" })}
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 text-[#111827] focus:border-[#2563EB] focus:outline-none cursor-pointer"
                  >
                    <option value="REGIONAL_MANAGER">Regional Manager</option>
                    <option value="SUPER_DISTRIBUTOR">Super Distributor</option>
                    <option value="DISTRIBUTOR">Distributor</option>
                  </select>
                </div>

                {/* New Parent — dynamic dropdown */}
                <div>
                  <label className="text-[#374151] block mb-1">Select New Parent *</label>
                  <select
                    required
                    value={formData.new_parent_id}
                    onChange={(e) => setFormData({ ...formData, new_parent_id: e.target.value })}
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 text-[#111827] focus:border-[#2563EB] focus:outline-none cursor-pointer"
                  >
                    {parentOptions.length === 0 && (
                      <option value="">No options available</option>
                    )}
                    {parentOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="text-[#374151] block mb-1">
                  Transfer Justification Reason *{" "}
                  <span className="font-normal text-[#64748B]">(min. 5 characters)</span>
                </label>
                <textarea
                  required
                  minLength={5}
                  rows={3}
                  placeholder="Describe territory realignment or business transfer reason (minimum 5 characters)..."
                  value={formData.reason}
                  onChange={(e) => { setFormData({ ...formData, reason: e.target.value }); setModalError(null); }}
                  className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 text-[#111827] focus:border-[#2563EB] focus:outline-none font-normal resize-none"
                />
                <span className="text-[10px] text-[#64748B] mt-0.5 block text-right">
                  {formData.reason.length} characters
                </span>
              </div>

              <div className="flex justify-end pt-4 border-t border-[#E2E8F0] gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-[#D1D5DB] text-[#374151] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[#2563EB] px-5 py-2 text-xs font-extrabold text-white hover:bg-[#1D4ED8] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting..." : "Submit Transfer Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
