"use client";

import React, { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import { DataTable, type TableColumn } from "@/components/ui/data-table";
import {
  Sliders,
  Plus,
  RefreshCw,
  Power,
  X,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Lock,
  LayoutGrid,
  List,
  Activity,
  ShieldCheck,
  Ban,
} from "lucide-react";

export default function FraudRulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [showModal, setShowModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Form states
  const [ruleName, setRuleName] = useState("");
  const [entityType, setEntityType] = useState("SETTLEMENT");
  const [category, setCategory] = useState("VELOCITY");
  const [thresholdValue, setThresholdValue] = useState(100000);
  const [action, setAction] = useState("HOLD");

  const fetchRules = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/fraud/rules");
      setRules(res.data || []);
    } catch (err) {
      console.error("Failed to fetch rules", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/fraud/rules", {
        rule_name: ruleName,
        entity_type: entityType,
        category,
        threshold_value: thresholdValue,
        action
      });
      setSuccessMsg(`Fraud rule "${ruleName}" created successfully!`);
      setShowModal(false);
      setRuleName("");
      fetchRules();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Rule creation failed");
    }
  };

  const handleStatusChange = async (ruleId: string, newStatus: string) => {
    if (newStatus === "DELETE") {
      if (!confirm("Are you sure you want to delete this fraud rule?")) return;
      setRules(prev => prev.filter(r => r.public_id !== ruleId));
      try {
        await api.delete(`/fraud/rules/${ruleId}`);
        setSuccessMsg("Fraud rule deleted successfully");
        fetchRules();
      } catch (err: any) {
        alert(err.response?.data?.detail || "Delete failed");
        fetchRules();
      }
      return;
    }

    setRules(prev => prev.map(r => r.public_id === ruleId ? { ...r, status: newStatus } : r));
    try {
      await api.patch(`/fraud/rules/${ruleId}/status`, null, {
        params: { status: newStatus }
      });
      setSuccessMsg(`Fraud rule status updated to ${newStatus}`);
      fetchRules();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Status update failed");
      fetchRules();
    }
  };

  const metrics = useMemo(() => {
    const total = rules.length;
    const active = rules.filter(r => r.status === "ACTIVE").length;
    const velocityCount = rules.filter(r => r.category === "VELOCITY").length;
    const highRisk = rules.filter(r => r.action === "FREEZE_WALLET" || r.action === "REJECT" || r.action === "BLOCK").length;
    return { total, active, velocityCount, highRisk };
  }, [rules]);

  const columns: TableColumn<any>[] = [
    {
      id: "rule_code",
      header: "RULE CODE",
      accessorKey: "rule_code",
      sortable: true,
      cell: (r) => (
        <span className="font-mono font-extrabold text-[#2563EB] text-xs">{r.rule_code}</span>
      ),
    },
    {
      id: "rule_name",
      header: "RULE NAME & DESCRIPTION",
      accessorKey: "rule_name",
      sortable: true,
      cell: (r) => (
        <div>
          <div className="font-bold text-[#0F172A]">{r.rule_name}</div>
          <div className="text-[10px] text-[#64748B]">Scope: {r.entity_type} Target</div>
        </div>
      ),
    },
    {
      id: "entity_type",
      header: "ENTITY TARGET",
      accessorKey: "entity_type",
      sortable: true,
      cell: (r) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] font-bold text-xs">
          {r.entity_type}
        </span>
      ),
    },
    {
      id: "category",
      header: "RISK CATEGORY",
      accessorKey: "category",
      sortable: true,
      cell: (r) => (
        <span className="font-mono text-xs font-bold text-[#475569]">{r.category}</span>
      ),
    },
    {
      id: "threshold_value",
      header: "SCREENING THRESHOLD",
      accessorKey: "threshold_value",
      sortable: true,
      cell: (r) => (
        <span className="font-mono text-xs font-extrabold text-[#0F172A]">
          ₹{(r.threshold_value || 0).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      id: "action",
      header: "DECISION ACTION",
      accessorKey: "action",
      sortable: true,
      cell: (r) => (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-extrabold bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">
          <ShieldAlert className="w-3.5 h-3.5" />
          {r.action}
        </span>
      ),
    },
    {
      id: "status",
      header: "STATUS & ACTIONS",
      cell: (r) => {
        const isAct = r.status === "ACTIVE";
        return (
          <select
            value={r.status || "ACTIVE"}
            onChange={(e) => handleStatusChange(r.public_id, e.target.value)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-extrabold transition-all cursor-pointer focus:outline-none ${
              isAct
                ? "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]"
                : "bg-[#FEF2F2] text-[#991B1B] border-[#FCA5A5]"
            }`}
          >
            <option value="ACTIVE">🟢 Active</option>
            <option value="INACTIVE">🔴 Inactive</option>
            <option value="DELETE">🗑️ Delete Rule</option>
          </select>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] flex items-center gap-3">
            <Sliders className="h-7 w-7 text-[#2563EB]" />
            Fraud Detection Rules Engine &amp; Threshold Builder
          </h1>
          <p className="mt-1 text-sm font-medium text-[#64748B]">
            Configure real-time screening thresholds, velocity limits, &amp; automated decision actions
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Switcher */}
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

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] px-4 py-2.5 text-xs font-extrabold text-white shadow-2xs transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Fraud Rule
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-between text-xs font-bold text-[#166534]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="text-[#166534] hover:text-[#14532D]">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider">Active Fraud Rules</span>
            <div className="p-2 rounded-xl bg-[#DCFCE7] text-[#15803D]">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-xl font-extrabold text-[#15803D]">{metrics.active} Rules Active</div>
          <p className="mt-1 text-[10px] font-semibold text-[#15803D]">Real-Time Transaction Screening</p>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider">Velocity Rules</span>
            <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#2563EB]">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-xl font-extrabold text-[#2563EB]">{metrics.velocityCount} Controls</div>
          <p className="mt-1 text-[10px] font-semibold text-[#2563EB]">Hourly/Daily Spike Monitors</p>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider">High Risk Auto Actions</span>
            <div className="p-2 rounded-xl bg-[#FEF3C7] text-[#D97706]">
              <Lock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-xl font-extrabold text-[#D97706]">{metrics.highRisk} Rules</div>
          <p className="mt-1 text-[10px] font-semibold text-[#D97706]">Freeze &amp; Reject Policies</p>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider">Total Rule Set</span>
            <div className="p-2 rounded-xl bg-[#EEF2FF] text-[#4F46E5]">
              <Sliders className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-xl font-extrabold text-[#0F172A]">{metrics.total} Rules</div>
          <p className="mt-1 text-[10px] font-semibold text-[#4F46E5]">Risk Mitigation Engine</p>
        </div>
      </div>

      {/* Main Display: Table View vs Grid View */}
      {viewMode === "grid" ? (
        /* GRID VIEW CARDS DESIGN WITH SECTION HEADER */
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-extrabold text-[#0F172A]">Fraud Detection Cards</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-extrabold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                {rules.length} Cards
              </span>
            </div>
            <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider">
              Grid View Layout
            </span>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rules.map((r) => (
              <div
                key={r.public_id}
                className="group relative rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-2xs hover:shadow-md hover:border-[#BFDBFE] transition-all duration-200"
              >
                {/* Grid Card Header */}
                <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                      <Sliders className="h-5 w-5 text-[#2563EB]" />
                    </div>
                    <div>
                      <span className="font-mono text-xs font-extrabold text-[#2563EB] tracking-wide block">
                        {r.rule_code}
                      </span>
                      <span className="font-bold text-xs text-[#0F172A] truncate max-w-[140px] block">
                        {r.rule_name}
                      </span>
                    </div>
                  </div>

                  <select
                    value={r.status || "ACTIVE"}
                    onChange={(e) => handleStatusChange(r.public_id, e.target.value)}
                    className={`rounded-xl border px-2.5 py-1 text-[11px] font-extrabold transition-all cursor-pointer focus:outline-none ${
                      r.status === "ACTIVE"
                        ? "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]"
                        : "bg-[#FEF2F2] text-[#991B1B] border-[#FCA5A5]"
                    }`}
                  >
                    <option value="ACTIVE">🟢 Active</option>
                    <option value="INACTIVE">🔴 Inactive</option>
                    <option value="DELETE">🗑️ Delete</option>
                  </select>
                </div>

                {/* Grid Card Content */}
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E2E8F0]">
                    <span className="text-[#64748B] font-bold">Target &amp; Category:</span>
                    <span className="font-bold text-[#0F172A]">{r.entity_type} ({r.category})</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 font-mono">
                    <div className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                      <span className="text-[10px] text-[#64748B] font-sans font-extrabold block uppercase">Threshold Limit</span>
                      <span className="font-extrabold text-[#0F172A]">₹{(r.threshold_value || 0).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-[#FEF3C7] border border-[#FDE68A]">
                      <span className="text-[10px] text-[#B45309] font-sans font-extrabold block uppercase">Action</span>
                      <span className="font-extrabold text-[#D97706]">{r.action}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* DATATABLE COMPONENT WITH RICH HEADER TOOLBAR (Search, Filter, Density, Columns, Export, Refresh, Auto-Refresh, Fullscreen, Primary Action Button, Record Counter Badge) */
        <DataTable
          data={rules}
          columns={columns}
          keyExtractor={(r) => r.public_id || r.rule_code}
          loading={loading}
          totalRecords={rules.length}
          onRefresh={fetchRules}
          onAddNew={() => setShowModal(true)}
          addNewLabel="Add Fraud Rule"
          searchPlaceholder="Search fraud rules by code, name, threshold..."
          filterOptions={[
            {
              key: "entity_type",
              label: "Entity Target",
              options: [
                { label: "SETTLEMENT", value: "SETTLEMENT" },
                { label: "PAYOUT", value: "PAYOUT" },
                { label: "RETAILER", value: "RETAILER" },
                { label: "POS TERMINAL", value: "POS" },
              ],
            },
            {
              key: "status",
              label: "Status",
              options: [
                { label: "ACTIVE", value: "ACTIVE" },
                { label: "INACTIVE", value: "INACTIVE" },
              ],
            },
          ]}
        />
      )}

      {/* Create Rule Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <h3 className="text-lg font-bold text-[#111827] flex items-center gap-2">
                <Sliders className="h-5 w-5 text-[#2563EB]" /> Create Fraud Detection Rule
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#374151] font-bold mb-1">Rule Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. High Value Spike Detection (> ₹100,000)"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="w-full rounded-xl border border-[#D1D5DB] bg-white p-2.5 text-[#0F172A] font-bold focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#374151] font-bold mb-1">Entity Target *</label>
                  <select
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value)}
                    className="w-full rounded-xl border border-[#D1D5DB] bg-white p-2.5 text-[#0F172A] font-bold focus:border-[#2563EB] focus:outline-none cursor-pointer"
                  >
                    <option value="SETTLEMENT">SETTLEMENT</option>
                    <option value="PAYOUT">PAYOUT</option>
                    <option value="RETAILER">RETAILER</option>
                    <option value="POS_TERMINAL">POS TERMINAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#374151] font-bold mb-1">Risk Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-[#D1D5DB] bg-white p-2.5 text-[#0F172A] font-bold focus:border-[#2563EB] focus:outline-none cursor-pointer"
                  >
                    <option value="VELOCITY">VELOCITY</option>
                    <option value="IDENTITY">IDENTITY</option>
                    <option value="BLACK_LIST">BLACK LIST</option>
                    <option value="GEO_LOCATION">GEO LOCATION</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#374151] font-bold mb-1">Threshold Value (₹) *</label>
                  <input
                    type="number"
                    value={thresholdValue}
                    onChange={(e) => setThresholdValue(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-[#D1D5DB] bg-white p-2.5 text-[#0F172A] font-bold focus:border-[#2563EB] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[#374151] font-bold mb-1">Decision Action *</label>
                  <select
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    className="w-full rounded-xl border border-[#D1D5DB] bg-white p-2.5 text-[#0F172A] font-bold focus:border-[#2563EB] focus:outline-none cursor-pointer"
                  >
                    <option value="HOLD">HOLD ON APPROVAL</option>
                    <option value="FREEZE_WALLET">FREEZE WALLET</option>
                    <option value="REJECT">REJECT TRANSACTION</option>
                    <option value="FLAG_FOR_REVIEW">FLAG FOR REVIEW</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#D1D5DB] text-[#374151] font-extrabold hover:bg-[#F8FAFC] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#16A34A] text-white font-extrabold hover:bg-[#15803D] shadow-2xs transition cursor-pointer"
                >
                  Save Fraud Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
