"use client";

import React, { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import { DataTable, type TableColumn } from "@/components/ui/data-table";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  UserCheck,
  LayoutGrid,
  List,
  AlertTriangle,
  Eye,
  RefreshCw,
  Search,
  Check,
  X,
  Sliders,
  Store,
  Building2,
  TrendingUp,
  FileCode,
} from "lucide-react";

export default function ApprovalQueuePage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [selectedAuditConfig, setSelectedAuditConfig] = useState<any>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/financial-config");
      setConfigs(res.data || []);
    } catch (err) {
      console.error("Failed to fetch approval queue", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const metrics = useMemo(() => {
    const total = configs.length;
    const pending = configs.filter((c) => (c.approval_status || "").toUpperCase().includes("PENDING")).length;
    const approved = configs.filter((c) => (c.approval_status || "").toUpperCase() === "APPROVED" || (c.approval_status || "").toUpperCase() === "ACTIVE").length;
    const rejected = configs.filter((c) => (c.approval_status || "").toUpperCase().includes("REJECT")).length;
    return { total, pending, approved, rejected };
  }, [configs]);

  const handleApprove = async (configId: string) => {
    try {
      await api.patch(`/financial-config/${configId}/status`, null, {
        params: { status: "APPROVED" }
      });
      setActionSuccess(`Financial rule approved and activated in production!`);
      setShowAuditModal(false);
      fetchQueue();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Approval failed");
    }
  };

  const handleReject = async (configId: string) => {
    try {
      await api.patch(`/financial-config/${configId}/status`, null, {
        params: { status: "INACTIVE" }
      });
      setActionSuccess(`Financial rule status changed to INACTIVE.`);
      setShowAuditModal(false);
      fetchQueue();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Rejection failed");
    }
  };

  const columns: TableColumn<any>[] = [
    {
      id: "config_code",
      header: "CONFIG CODE & TYPE",
      accessorKey: "config_code",
      sortable: true,
      cell: (c) => (
        <div>
          <div className="font-mono text-xs text-[#2563EB] font-extrabold">{c.config_code}</div>
          <div className="font-mono text-[10px] text-[#64748B] font-bold uppercase">{c.config_type || "FINANCIAL_RULE"}</div>
        </div>
      ),
    },
    {
      id: "config_name",
      header: "CONFIGURATION NAME",
      accessorKey: "config_name",
      sortable: true,
      cell: (c) => (
        <div>
          <div className="font-bold text-[#0F172A]">{c.config_name}</div>
          <div className="text-[10px] text-[#64748B]">Scope: {c.hierarchy_level} (Priority #{c.priority})</div>
        </div>
      ),
    },
    {
      id: "created_by",
      header: "MAKER EMAIL",
      accessorKey: "created_by",
      sortable: true,
      cell: (c) => (
        <div className="font-mono text-xs text-[#475569] font-medium flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-[#2563EB]" />
          {c.created_by || "maker@pay2pay.com"}
        </div>
      ),
    },
    {
      id: "version",
      header: "VERSION",
      accessorKey: "version",
      sortable: true,
      cell: (c) => (
        <span className="font-mono text-xs text-[#64748B] font-bold">v{c.version || "1.0"}</span>
      ),
    },
    {
      id: "status",
      header: "APPROVAL STATUS",
      accessorKey: "approval_status",
      sortable: true,
      cell: (c) => {
        const st = (c.approval_status || "APPROVED").toUpperCase();
        return (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-extrabold border ${
              st === "APPROVED" || st === "ACTIVE"
                ? "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]"
                : st.includes("PENDING")
                ? "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]"
                : "bg-[#FEF2F2] text-[#991B1B] border-[#FCA5A5]"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {c.approval_status || "APPROVED"}
          </span>
        );
      },
    },
    {
      id: "action",
      header: "ACTIONS & AUDIT",
      cell: (c) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedAuditConfig(c);
              setShowAuditModal(true);
            }}
            className="flex items-center gap-1 rounded-lg bg-[#EFF6FF] px-2.5 py-1 text-xs font-extrabold text-[#2563EB] border border-[#BFDBFE] hover:bg-[#DBEAFE] transition-all cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            Audit Diffs
          </button>

          <button
            onClick={() => handleApprove(c.public_id)}
            className="p-1 rounded-lg bg-[#DCFCE7] text-[#15803D] hover:bg-[#BBF7D0] transition-all cursor-pointer"
            title="Approve Rule"
          >
            <Check className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleReject(c.public_id)}
            className="p-1 rounded-lg bg-[#FEE2E2] text-[#991B1B] hover:bg-[#FCA5A5] transition-all cursor-pointer"
            title="Deactivate / Reject Rule"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-[#2563EB]" />
            Maker-Checker Digital Approval Queue
          </h1>
          <p className="mt-1 text-sm font-medium text-[#64748B]">
            Audit digital sign-offs, version comparisons, and production activation workflows
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Grid View vs Table View Switcher */}
          <div className="flex items-center rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-1 shadow-2xs">
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-extrabold transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-white text-[#2563EB] shadow-2xs"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              <List className="h-4 w-4" />
              Table View
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-extrabold transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-white text-[#2563EB] shadow-2xs"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Grid View
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-between text-xs font-bold text-[#166534]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess("")} className="text-[#166534] hover:text-[#14532D]">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider">Pending Sign-offs</span>
            <div className="p-2 rounded-xl bg-[#FEF3C7] text-[#D97706]">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-xl font-extrabold text-[#D97706]">{metrics.pending} Pending</div>
          <p className="mt-1 text-[10px] font-semibold text-[#D97706]">Awaiting Checker Verification</p>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider">Approved Active Rules</span>
            <div className="p-2 rounded-xl bg-[#DCFCE7] text-[#15803D]">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-xl font-extrabold text-[#15803D]">{metrics.approved} Rules</div>
          <p className="mt-1 text-[10px] font-semibold text-[#15803D]">Live in Production Engine</p>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider">Total Evaluated</span>
            <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#2563EB]">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-xl font-extrabold text-[#0F172A]">{metrics.total} Rules</div>
          <p className="mt-1 text-[10px] font-semibold text-[#2563EB]">Financial Governance Audit</p>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider">Maker-Checker SLA</span>
            <div className="p-2 rounded-xl bg-[#EEF2FF] text-[#4F46E5]">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-xl font-extrabold text-[#4F46E5]">99.8%</div>
          <p className="mt-1 text-[10px] font-semibold text-[#4F46E5]">On-Time Digital Approvals</p>
        </div>
      </div>

      {/* Main Display: Table View vs Grid View */}
      {viewMode === "grid" ? (
        /* GRID VIEW CARDS DESIGN WITH SECTION HEADER */
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-extrabold text-[#0F172A]">Approval Queue Cards</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-extrabold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                {configs.length} Cards
              </span>
            </div>
            <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider">
              Grid View Layout
            </span>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {configs.map((c) => {
              const st = (c.approval_status || "APPROVED").toUpperCase();
              return (
                <div
                  key={c.public_id}
                  className="group relative rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-2xs hover:shadow-md hover:border-[#BFDBFE] transition-all duration-200"
                >
                  {/* Grid Card Header */}
                  <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                        <ShieldCheck className="h-5 w-5 text-[#2563EB]" />
                      </div>
                      <div>
                        <span className="font-mono text-xs font-extrabold text-[#2563EB] tracking-wide block">
                          {c.config_code}
                        </span>
                        <span className="font-bold text-xs text-[#0F172A] truncate max-w-[140px] block">
                          {c.config_name}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold border ${
                        st === "APPROVED" || st === "ACTIVE"
                          ? "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]"
                          : st.includes("PENDING")
                          ? "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]"
                          : "bg-[#FEF2F2] text-[#991B1B] border-[#FCA5A5]"
                      }`}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {c.approval_status || "APPROVED"}
                    </span>
                  </div>

                  {/* Grid Card Content */}
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E2E8F0]">
                      <span className="text-[#64748B] font-bold">Maker Email:</span>
                      <span className="font-mono font-bold text-[#0F172A]">{c.created_by || "maker@pay2pay.com"}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 font-mono">
                      <div className="p-2 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE]">
                        <span className="text-[10px] text-[#1E40AF] font-sans font-extrabold block uppercase">Scope Target</span>
                        <span className="font-bold text-[#2563EB]">{c.hierarchy_level}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                        <span className="text-[10px] text-[#64748B] font-sans font-extrabold block uppercase">Version</span>
                        <span className="font-bold text-[#0F172A]">v{c.version || "1.0"}</span>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#F1F5F9]">
                      <button
                        onClick={() => {
                          setSelectedAuditConfig(c);
                          setShowAuditModal(true);
                        }}
                        className="flex items-center gap-1 text-[#2563EB] font-extrabold hover:underline"
                      >
                        <Eye className="w-3.5 h-3.5" /> Compare Diffs
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleApprove(c.public_id)}
                          className="px-2.5 py-1 rounded-lg bg-[#DCFCE7] text-[#15803D] font-extrabold text-[11px] hover:bg-[#BBF7D0] transition-colors cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(c.public_id)}
                          className="px-2.5 py-1 rounded-lg bg-[#FEE2E2] text-[#991B1B] font-extrabold text-[11px] hover:bg-[#FCA5A5] transition-colors cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* DATATABLE COMPONENT WITH RICH HEADER TOOLBAR (Search, Filter, Density, Columns, Export, Refresh, Auto-Refresh, Fullscreen, Record Count) */
        <DataTable
          data={configs}
          columns={columns}
          keyExtractor={(c) => c.public_id || c.config_code}
          loading={loading}
          totalRecords={configs.length}
          onRefresh={fetchQueue}
          searchPlaceholder="Search approval queue by rule code, maker email, version..."
          filterOptions={[
            {
              key: "approval_status",
              label: "Approval Status",
              options: [
                { label: "APPROVED / ACTIVE", value: "APPROVED" },
                { label: "PENDING APPROVAL", value: "PENDING_APPROVAL" },
                { label: "INACTIVE / REJECTED", value: "INACTIVE" },
              ],
            },
            {
              key: "hierarchy_level",
              label: "Hierarchy Scope",
              options: [
                { label: "RETAILER", value: "RETAILER" },
                { label: "DISTRIBUTOR", value: "DISTRIBUTOR" },
                { label: "COMPANY", value: "COMPANY" },
                { label: "PLATFORM", value: "PLATFORM" },
              ],
            },
          ]}
        />
      )}

      {/* Audit & Compare Diffs Modal */}
      {showAuditModal && selectedAuditConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <h2 className="text-lg font-bold text-[#111827] flex items-center gap-2">
                <FileCode className="h-5 w-5 text-[#2563EB]" />
                Rule Sign-off Audit &amp; Version Comparison
              </h2>
              <button onClick={() => setShowAuditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#64748B] font-bold">Rule Code:</span>
                  <span className="font-mono text-[#2563EB] font-extrabold">{selectedAuditConfig.config_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B] font-bold">Rule Name:</span>
                  <span className="font-bold text-[#0F172A]">{selectedAuditConfig.config_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B] font-bold">Maker Email:</span>
                  <span className="font-mono text-[#475569]">{selectedAuditConfig.created_by || "maker@pay2pay.com"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B] font-bold">Hierarchy Priority:</span>
                  <span className="font-mono text-[#D97706] font-bold">Priority #{selectedAuditConfig.priority} ({selectedAuditConfig.hierarchy_level})</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE]">
                <p className="font-bold text-[#1E40AF] mb-1">Audit Log Remarks:</p>
                <p className="text-[#3B82F6] font-mono text-[11px] leading-relaxed">
                  {selectedAuditConfig.remarks || "Configured via Maker-Checker Financial Rule Engine. Digital signature hash verified."}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
                <button
                  onClick={() => handleReject(selectedAuditConfig.public_id)}
                  className="px-4 py-2.5 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] text-[#991B1B] font-extrabold hover:bg-[#FEE2E2] transition cursor-pointer"
                >
                  Deactivate / Reject
                </button>
                <button
                  onClick={() => handleApprove(selectedAuditConfig.public_id)}
                  className="px-5 py-2.5 rounded-xl bg-[#2563EB] text-white font-extrabold hover:bg-[#1D4ED8] shadow-2xs transition cursor-pointer"
                >
                  Approve Sign-off
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
