"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import {
  Network,
  ChevronDown,
  ChevronRight,
  Building2,
  UserCheck,
  Users,
  Plus,
  ArrowLeftRight,
  RefreshCw,
  Search,
  CheckCircle,
  FileSpreadsheet,
  X
} from "lucide-react";

interface TreeNode {
  id: string;
  type: string;
  name: string;
  code_or_email: string;
  status: string;
  children: TreeNode[];
}

export default function OrganizationPage() {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tree" | "rms" | "sds" | "distributors">("tree");

  // Grid states
  const [rms, setRms] = useState<any[]>([]);
  const [sds, setSds] = useState<any[]>([]);
  const [dists, setDists] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  // Modal State for Onboarding RM/SD/Distributor
  const [showRmModal, setShowRmModal] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [rmFormData, setRmFormData] = useState({
    employee_code: "",
    full_name: "",
    mobile: "",
    email: "",
    designation: "Regional Manager",
    company_id: ""
  });

  const fetchTree = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/organization/tree");
      setTree(res.data);
    } catch (err) {
      console.error("Failed to load organization tree", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await api.get("/api/v1/companies");
      setCompanies(res.data.items);
      if (res.data.items.length > 0) {
        setRmFormData(prev => ({ ...prev, company_id: res.data.items[0].public_id }));
      }
    } catch (err) {
      console.error("Failed to fetch companies", err);
    }
  };

  const fetchRms = async () => {
    try {
      const res = await api.get("/api/v1/organization/rms", { params: { search } });
      setRms(res.data.items);
    } catch (err) { console.error(err); }
  };

  const fetchSds = async () => {
    try {
      const res = await api.get("/api/v1/organization/super-distributors", { params: { search } });
      setSds(res.data.items);
    } catch (err) { console.error(err); }
  };

  const fetchDists = async () => {
    try {
      const res = await api.get("/api/v1/organization/distributors", { params: { search } });
      setDists(res.data.items);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchTree();
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (activeTab === "rms") fetchRms();
    if (activeTab === "sds") fetchSds();
    if (activeTab === "distributors") fetchDists();
  }, [activeTab, search]);

  const handleCreateRm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/organization/rms", rmFormData);
      setShowRmModal(false);
      fetchTree();
      if (activeTab === "rms") fetchRms();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to create Regional Manager");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Network className="h-8 w-8 text-emerald-400" />
            Enterprise Organization Topology
          </h1>
          <p className="mt-1 text-slate-400">
            5-tier hierarchical tree mapping (Company → RM → Super Distributor → Distributor)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/organization/transfers"
            className="flex items-center gap-2 rounded-lg bg-slate-800/80 px-4 py-2.5 text-sm font-medium text-slate-200 border border-slate-700 hover:bg-slate-700 transition-all"
          >
            <ArrowLeftRight className="h-4 w-4 text-emerald-400" />
            Manage Transfers
          </Link>
          <button
            onClick={() => setShowRmModal(true)}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Regional Manager
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-950/40 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("tree")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "tree" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Network className="h-4 w-4" />
          Interactive Tree View
        </button>
        <button
          onClick={() => setActiveTab("rms")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "rms" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <UserCheck className="h-4 w-4" />
          Regional Managers
        </button>
        <button
          onClick={() => setActiveTab("sds")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "sds" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Building2 className="h-4 w-4" />
          Super Distributors
        </button>
        <button
          onClick={() => setActiveTab("distributors")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "distributors" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Users className="h-4 w-4" />
          Distributors
        </button>
      </div>

      {/* Tab 1: Interactive Hierarchy Tree */}
      {activeTab === "tree" && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-sm font-semibold text-slate-300">Enterprise Node Topology</span>
            <button onClick={fetchTree} className="text-xs text-emerald-400 hover:underline flex items-center gap-1">
              <RefreshCw className="h-3.5 w-3.5" /> Reload Topology
            </button>
          </div>
          {loading ? (
            <div className="py-12 text-center text-slate-400">Rendering Hierarchy Tree...</div>
          ) : tree.length === 0 ? (
            <div className="py-12 text-center text-slate-400">No organizational hierarchy nodes created yet.</div>
          ) : (
            <div className="space-y-4">
              {tree.map((node) => (
                <TreeNodeItem key={node.id} node={node} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Grid Tab Views */}
      {activeTab !== "tree" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${activeTab.toUpperCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950/60 pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-2xl">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 uppercase font-mono text-xs text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-4">Name / Business</th>
                  <th className="px-5 py-4">Code / Email</th>
                  <th className="px-5 py-4">Mobile</th>
                  <th className="px-5 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(activeTab === "rms" ? rms : activeTab === "sds" ? sds : dists).map((item: any) => (
                  <tr key={item.public_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 font-medium text-slate-100">{item.full_name || item.business_name}</td>
                    <td className="px-5 py-4 font-mono text-xs text-emerald-400">{item.employee_code || item.email}</td>
                    <td className="px-5 py-4 font-mono text-xs">{item.mobile}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Onboard RM Modal */}
      {showRmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-emerald-400" />
                Add Regional Manager (RM)
              </h2>
              <button onClick={() => setShowRmModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRm} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300">Target Company *</label>
                <select
                  required
                  value={rmFormData.company_id}
                  onChange={(e) => setRmFormData({ ...rmFormData, company_id: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  {companies.map((c) => (
                    <option key={c.public_id} value={c.public_id}>{c.company_name} ({c.company_code})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-300">Employee Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="RM-CHE-01"
                    value={rmFormData.employee_code}
                    onChange={(e) => setRmFormData({ ...rmFormData, employee_code: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Rajesh Kumar"
                    value={rmFormData.full_name}
                    onChange={(e) => setRmFormData({ ...rmFormData, full_name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-300">Mobile (10 Digits) *</label>
                  <input
                    type="text"
                    required
                    placeholder="9876543210"
                    value={rmFormData.mobile}
                    onChange={(e) => setRmFormData({ ...rmFormData, mobile: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="rm@pay2pay.com"
                    value={rmFormData.email}
                    onChange={(e) => setRmFormData({ ...rmFormData, email: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                >
                  Create Regional Manager
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Collapsible Tree Node Component
function TreeNodeItem({ node }: { node: TreeNode }) {
  const [expanded, setExpanded] = useState(true);

  const getIcon = () => {
    if (node.type === "COMPANY") return Building2;
    if (node.type === "REGIONAL_MANAGER") return UserCheck;
    if (node.type === "SUPER_DISTRIBUTOR") return Network;
    return Users;
  };

  const Icon = getIcon();

  return (
    <div className="ml-4 border-l border-slate-800 pl-4 py-1">
      <div className="flex items-center gap-3 rounded-lg border border-slate-800/80 bg-slate-950/40 p-3 hover:border-emerald-500/40 transition-all">
        {node.children.length > 0 ? (
          <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-slate-200">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <div className="w-4" />
        )}
        <Icon className="h-4 w-4 text-emerald-400" />
        <div className="flex-1">
          <span className="font-semibold text-slate-100 text-sm">{node.name}</span>
          <span className="ml-2 font-mono text-xs text-slate-400">({node.code_or_email})</span>
        </div>
        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
          {node.type}
        </span>
      </div>

      {expanded && node.children.length > 0 && (
        <div className="mt-2 space-y-2">
          {node.children.map((child) => (
            <TreeNodeItem key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}
