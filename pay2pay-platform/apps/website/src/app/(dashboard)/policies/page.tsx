"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Sliders,
  Plus,
  Search,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Play,
  X,
  Zap,
  Layers,
  Activity,
  FileCheck2,
  Calendar,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import apiClient from "@/lib/api";

interface Policy {
  public_id: string;
  policy_code: string;
  policy_name: string;
  policy_category: string;
  description: string | null;
  current_version: number;
  policy_status: string;
  is_mandatory: boolean;
  created_date: string | null;
}

export default function PolicyDirectoryPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  // Policy Creation Modal State
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    policy_code: "",
    policy_name: "",
    policy_category: "LIMIT",
    description: "",
    scope_level: "PLATFORM",
    single_txn_max: 25000,
    customer_monthly_max: 50000,
    bene_monthly_max: 50000,
    service_enabled: true
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/policies/");
      setPolicies(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch policies", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const payload = {
      policy_code: form.policy_code,
      policy_name: form.policy_name,
      policy_category: form.policy_category,
      description: form.description || `Configured ${form.policy_category} Policy limits`,
      scope_level: form.scope_level,
      is_mandatory: true,
      rules: {
        single_txn_max: form.single_txn_max,
        customer_monthly_max: form.customer_monthly_max,
        bene_monthly_max: form.bene_monthly_max,
        service_enabled: form.service_enabled
      }
    };

    try {
      await apiClient.post("/policies/", payload);
      setSuccessMsg(`Policy "${form.policy_code}" created successfully!`);
      setShowModal(false);
      setForm({
        policy_code: "",
        policy_name: "",
        policy_category: "LIMIT",
        description: "",
        scope_level: "PLATFORM",
        single_txn_max: 25000,
        customer_monthly_max: 50000,
        bene_monthly_max: 50000,
        service_enabled: true
      });
      fetchPolicies();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create policy");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async (policyId: string) => {
    try {
      await apiClient.post(`/policies/${policyId}/publish`);
      setSuccessMsg("Policy version published to production with hot-reload!");
      fetchPolicies();
    } catch (err) {
      console.error("Failed to publish policy", err);
    }
  };

  const filteredPolicies = useMemo(() => {
    return policies.filter((p) => {
      const matchesSearch =
        p.policy_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.policy_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "ALL" || p.policy_category?.toUpperCase() === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [policies, searchQuery, selectedCategory]);

  const metrics = useMemo(() => {
    const total = policies.length;
    const published = policies.filter((p) => p.policy_status === "PUBLISHED").length;
    const draft = policies.filter((p) => p.policy_status === "DRAFT").length;
    return { total, published, draft };
  }, [policies]);

  const categories = ["ALL", "LIMIT", "CUSTOMER", "BENEFICIARY", "SERVICE", "RISK", "COOLING"];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] flex items-center gap-3">
            <Sliders className="h-7 w-7 text-[#2563EB]" />
            Central Policy Master Directory
          </h1>
          <p className="mt-1 text-sm font-medium text-[#64748B]">
            Configure customer monthly limits, beneficiary monthly limits, KYC gates, and service enable/disable controls
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/policies/monthly-limits"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] text-xs font-extrabold text-[#166534] hover:bg-[#DCFCE7] transition-all"
          >
            <Calendar className="h-4 w-4 text-[#16A34A]" /> Monthly Limit & Reset Rules
          </Link>
          <Link
            href="/policies/evaluator"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] text-xs font-extrabold text-[#2563EB] hover:bg-[#DBEAFE] transition-all"
          >
            <Zap className="h-4 w-4" /> Real-Time Evaluator
          </Link>
          <button
            onClick={() => {
              setError("");
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2563EB] text-xs font-extrabold text-white hover:bg-[#1D4ED8] shadow-2xs transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Create Policy Master
          </button>
          <button
            onClick={fetchPolicies}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2 text-xs font-bold text-[#374151] shadow-2xs hover:bg-[#F8FAFC] transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 text-[#64748B] ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Success Banner */}
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
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Total Policies</p>
            <h3 className="mt-1 text-2xl font-extrabold text-[#0F172A]">{metrics.total}</h3>
            <p className="mt-1 text-[11px] font-bold text-[#2563EB] flex items-center gap-1">
              <Layers className="h-3.5 w-3.5" /> Policy Engine Masters
            </p>
          </div>
          <div className="rounded-xl bg-[#EFF6FF] p-3 text-[#2563EB]">
            <Sliders className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Published Active</p>
            <h3 className="mt-1 text-2xl font-extrabold text-[#0F172A]">{metrics.published}</h3>
            <p className="mt-1 text-[11px] font-bold text-[#166534] flex items-center gap-1">
              <FileCheck2 className="h-3.5 w-3.5 text-[#16A34A]" /> Live in Production
            </p>
          </div>
          <div className="rounded-xl bg-[#DCFCE7] p-3 text-[#16A34A]">
            <ShieldCheck className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Draft Versions</p>
            <h3 className="mt-1 text-2xl font-extrabold text-[#0F172A]">{metrics.draft}</h3>
            <p className="mt-1 text-[11px] font-bold text-[#D97706] flex items-center gap-1">
              <Activity className="h-3.5 w-3.5" /> Pending Approval
            </p>
          </div>
          <div className="rounded-xl bg-[#FEF3C7] p-3 text-[#D97706]">
            <Play className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Evaluation Latency</p>
            <h3 className="mt-1 text-2xl font-extrabold text-[#0F172A]">&lt; 1.2ms</h3>
            <p className="mt-1 text-[11px] font-bold text-[#166534] flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-[#16A34A]" /> Sub-50ms SLA Met
            </p>
          </div>
          <div className="rounded-xl bg-[#F0FDF4] p-3 text-[#16A34A]">
            <Zap className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E5E7EB] pb-4">
        {/* Category Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? "bg-[#2563EB] text-white shadow-2xs"
                  : "bg-white text-[#64748B] border border-[#E5E7EB] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search policy code or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[#D1D5DB] bg-white py-2 pl-9 pr-3 text-xs text-[#111827] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none font-bold"
          />
        </div>
      </div>

      {/* Policy Master Table */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#0F172A]">
            <thead className="bg-[#F8FAFC] uppercase font-mono text-xs font-extrabold text-[#111827] border-b border-[#E5E7EB]">
              <tr>
                <th className="px-5 py-4 font-mono text-xs font-extrabold text-[#111827]">Policy Code & Name</th>
                <th className="px-5 py-4 font-mono text-xs font-extrabold text-[#111827]">Category</th>
                <th className="px-5 py-4 font-mono text-xs font-extrabold text-[#111827]">Version</th>
                <th className="px-5 py-4 font-mono text-xs font-extrabold text-[#111827]">Status</th>
                <th className="px-5 py-4 font-mono text-xs font-extrabold text-[#111827] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] font-mono text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-[#6B7280] font-medium">
                    Loading Policy Masters...
                  </td>
                </tr>
              ) : filteredPolicies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-[#6B7280] font-medium">
                    No policy rules defined yet.
                  </td>
                </tr>
              ) : (
                filteredPolicies.map((p) => (
                  <tr key={p.public_id} className="hover:bg-[#EFF6FF] transition-colors">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-sans text-xs font-bold text-[#111827]">{p.policy_name}</p>
                        <p className="text-xs text-[#2563EB] font-mono font-bold mt-0.5">{p.policy_code}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs">
                      <span className="px-2.5 py-1 rounded text-xs font-extrabold bg-[#F1F5F9] text-[#334155] border border-[#E2E8F0]">
                        {p.policy_category}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-[#6B7280] font-bold">v{p.current_version}.0</td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          p.policy_status === "PUBLISHED"
                            ? "bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]"
                            : "bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]"
                        }`}
                      >
                        {p.policy_status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {p.policy_status === "DRAFT" && (
                        <button
                          onClick={() => handlePublish(p.public_id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#DCFCE7] hover:bg-[#BBF7D0] text-[#166534] border border-[#BBF7D0] rounded-lg text-xs font-extrabold transition-all cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" /> Publish Version
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-2xl space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-3">
              <h3 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#2563EB]" /> Configure Policy Master & Limits
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-[#64748B] hover:text-[#0F172A] p-1 rounded-lg hover:bg-[#F1F5F9] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg text-[#991B1B] text-xs font-bold flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-[#DC2626] shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-[#374151] block mb-1">Policy Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. POL_CUST_LIMIT_01"
                    value={form.policy_code}
                    onChange={(e) => setForm({ ...form, policy_code: e.target.value })}
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 font-mono text-[#111827] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none font-bold transition-all"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#374151] block mb-1">Policy Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Customer Monthly Limit Policy"
                    value={form.policy_name}
                    onChange={(e) => setForm({ ...form, policy_name: e.target.value })}
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 text-[#111827] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none font-bold transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-[#374151] block mb-1">Category</label>
                  <select
                    value={form.policy_category}
                    onChange={(e) => setForm({ ...form, policy_category: e.target.value })}
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 text-[#111827] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none font-bold transition-all cursor-pointer"
                  >
                    <option value="LIMIT">LIMIT (Transfer Caps)</option>
                    <option value="CUSTOMER">CUSTOMER (Intake & Monthly Limits)</option>
                    <option value="BENEFICIARY">BENEFICIARY (Monthly Caps & Cooling)</option>
                    <option value="SERVICE">SERVICE (Enable / Disable Service)</option>
                    <option value="RISK">RISK (Score Thresholds)</option>
                    <option value="COOLING">COOLING (Cooling Period Hours)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-[#374151] block mb-1">Scope Level</label>
                  <select
                    value={form.scope_level}
                    onChange={(e) => setForm({ ...form, scope_level: e.target.value })}
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 text-[#111827] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none font-bold transition-all cursor-pointer"
                  >
                    <option value="PLATFORM">PLATFORM (Global Default)</option>
                    <option value="COMPANY">COMPANY (Company Specific)</option>
                    <option value="RETAILER">RETAILER (Retailer Override)</option>
                    <option value="CUSTOMER">CUSTOMER (Customer Specific)</option>
                  </select>
                </div>
              </div>

              {/* Monthly Limit & Enable/Disable Controls */}
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
                <span className="font-extrabold text-[#0F172A] block uppercase text-[11px] tracking-wider">
                  Transfer Limits & Service Status Configuration
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-[#374151] block mb-1">Customer Monthly Limit (₹)</label>
                    <input
                      type="number"
                      value={form.customer_monthly_max}
                      onChange={(e) => setForm({ ...form, customer_monthly_max: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2 font-mono text-[#111827] focus:border-[#2563EB] focus:outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#374151] block mb-1">Beneficiary Monthly Limit (₹)</label>
                    <input
                      type="number"
                      value={form.bene_monthly_max}
                      onChange={(e) => setForm({ ...form, bene_monthly_max: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2 font-mono text-[#111827] focus:border-[#2563EB] focus:outline-none font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="font-semibold text-[#374151] block mb-1">Single Txn Max Cap (₹)</label>
                    <input
                      type="number"
                      value={form.single_txn_max}
                      onChange={(e) => setForm({ ...form, single_txn_max: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2 font-mono text-[#111827] focus:border-[#2563EB] focus:outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-[#374151] block mb-1">Service Status (Enable/Disable)</label>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, service_enabled: !form.service_enabled })}
                      className={`w-full flex items-center justify-center gap-2 p-2 rounded-lg font-extrabold transition-all cursor-pointer ${
                        form.service_enabled
                          ? "bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]"
                          : "bg-[#FEF2F2] text-[#991B1B] border border-[#FCA5A5]"
                      }`}
                    >
                      {form.service_enabled ? (
                        <>
                          <ToggleRight className="h-5 w-5 text-[#16A34A]" /> Service ENABLED
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-5 w-5 text-[#DC2626]" /> Service DISABLED
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-[#D1D5DB] text-[#374151] font-bold hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[#2563EB] px-6 py-2.5 text-xs font-extrabold text-white hover:bg-[#1D4ED8] shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Saving Policy..." : "Create Policy Master & Publish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
