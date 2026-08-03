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
  CheckCircle2,
  X,
  Store,
} from "lucide-react";
import { DataTable, type TableColumn } from "@/components/ui/data-table";

interface TreeNode {
  id: string;
  type: string;
  name: string;
  code_or_email: string;
  status: string;
  children: TreeNode[];
}

function TreeNodeItem({ node }: { node: TreeNode }) {
  const [isOpen, setIsOpen] = useState(true);

  const getBadgeColor = (type: string) => {
    switch (type) {
      case "COMPANY": return "bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]";
      case "REGIONAL_MANAGER": return "bg-[#F3E8FF] text-[#6D28D9] border-[#DDD6FE]";
      case "SUPER_DISTRIBUTOR": return "bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]";
      case "DISTRIBUTOR": return "bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]";
      case "RETAILER": return "bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]";
      default: return "bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]";
    }
  };

  return (
    <div className="pl-4 border-l-2 border-[#E2E8F0] my-2 font-mono text-xs">
      <div className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-white border border-[#E2E8F0] shadow-2xs hover:border-[#2563EB] transition-all">
        {node.children && node.children.length > 0 && (
          <button onClick={() => setIsOpen(!isOpen)} className="text-[#64748B] hover:text-[#0F172A]">
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        )}
        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${getBadgeColor(node.type)}`}>
          {node.type}
        </span>
        <span className="font-bold text-[#0F172A]">{node.name}</span>
        <span className="text-[#64748B] text-[11px]">({node.code_or_email})</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-[#166534]">
          <CheckCircle2 className="w-3 h-3 text-[#16A34A]" /> {node.status}
        </span>
      </div>

      {isOpen && node.children && node.children.length > 0 && (
        <div className="ml-3 space-y-1">
          {node.children.map((child) => (
            <TreeNodeItem key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}

type ActiveTab = "tree" | "rms" | "sds" | "distributors" | "retailers";

export default function OrganizationPage() {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("tree");

  // Grid states
  const [rms, setRms] = useState<any[]>([]);
  const [sds, setSds] = useState<any[]>([]);
  const [dists, setDists] = useState<any[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [gridLoading, setGridLoading] = useState(false);

  // Modal State for Onboarding RM
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
      setCompanies(res.data.items || []);
      if (res.data.items && res.data.items.length > 0) {
        setRmFormData(prev => ({ ...prev, company_id: res.data.items[0].public_id }));
      }
    } catch (err) {
      console.error("Failed to fetch companies", err);
    }
  };

  const fetchRms = async () => {
    try {
      setGridLoading(true);
      const res = await api.get("/api/v1/organization/rms");
      setRms(res.data.items || []);
    } catch (err) { console.error(err); }
    finally { setGridLoading(false); }
  };

  const fetchSds = async () => {
    try {
      setGridLoading(true);
      const res = await api.get("/api/v1/organization/super-distributors");
      setSds(res.data.items || []);
    } catch (err) { console.error(err); }
    finally { setGridLoading(false); }
  };

  const fetchDists = async () => {
    try {
      setGridLoading(true);
      const res = await api.get("/api/v1/organization/distributors");
      setDists(res.data.items || []);
    } catch (err) { console.error(err); }
    finally { setGridLoading(false); }
  };

  const fetchRetailers = async () => {
    try {
      setGridLoading(true);
      const res = await api.get("/api/v1/retailers");
      setRetailers(res.data.items || []);
    } catch (err) { console.error(err); }
    finally { setGridLoading(false); }
  };

  useEffect(() => {
    fetchTree();
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (activeTab === "rms") fetchRms();
    if (activeTab === "sds") fetchSds();
    if (activeTab === "distributors") fetchDists();
    if (activeTab === "retailers") fetchRetailers();
  }, [activeTab]);

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

  // Columns for RMs
  const rmColumns: TableColumn<any>[] = [
    {
      id: "full_name",
      header: "Full Name",
      sortable: true,
      cell: (item) => <span className="font-bold text-[#0F172A]">{item.full_name}</span>,
    },
    {
      id: "employee_code",
      header: "Employee Code",
      sortable: true,
      cell: (item) => <span className="font-mono text-xs font-bold text-[#2563EB]">{item.employee_code}</span>,
    },
    {
      id: "email",
      header: "Email",
      cell: (item) => <span className="text-xs text-[#475569]">{item.email}</span>,
    },
    {
      id: "mobile",
      header: "Mobile",
      cell: (item) => <span className="font-mono text-xs text-[#475569]">{item.mobile || "—"}</span>,
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      cell: (item) => (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
          item.status === "ACTIVE"
            ? "bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]"
            : "bg-[#FEF9C3] text-[#854D0E] border-[#FDE68A]"
        }`}>
          {item.status || "ACTIVE"}
        </span>
      ),
    },
  ];

  // Columns for SDs
  const sdColumns: TableColumn<any>[] = [
    {
      id: "business_name",
      header: "Business Name",
      sortable: true,
      cell: (item) => <span className="font-bold text-[#0F172A]">{item.business_name}</span>,
    },
    {
      id: "owner_name",
      header: "Owner Name",
      sortable: true,
      cell: (item) => <span className="text-xs text-[#374151]">{item.owner_name}</span>,
    },
    {
      id: "email",
      header: "Email",
      cell: (item) => <span className="text-xs text-[#475569]">{item.email}</span>,
    },
    {
      id: "mobile",
      header: "Mobile",
      cell: (item) => <span className="font-mono text-xs text-[#475569]">{item.mobile || "—"}</span>,
    },
    {
      id: "gst_number",
      header: "GST Number",
      cell: (item) => <span className="font-mono text-xs text-[#475569]">{item.gst_number || "—"}</span>,
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      cell: (item) => (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
          item.status === "ACTIVE"
            ? "bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]"
            : "bg-[#FEF9C3] text-[#854D0E] border-[#FDE68A]"
        }`}>
          {item.status || "ACTIVE"}
        </span>
      ),
    },
  ];

  // Columns for Distributors
  const distColumns: TableColumn<any>[] = [
    {
      id: "business_name",
      header: "Business Name",
      sortable: true,
      cell: (item) => <span className="font-bold text-[#0F172A]">{item.business_name}</span>,
    },
    {
      id: "owner_name",
      header: "Owner Name",
      sortable: true,
      cell: (item) => <span className="text-xs text-[#374151]">{item.owner_name}</span>,
    },
    {
      id: "email",
      header: "Email",
      cell: (item) => <span className="text-xs text-[#475569]">{item.email}</span>,
    },
    {
      id: "mobile",
      header: "Mobile",
      cell: (item) => <span className="font-mono text-xs text-[#475569]">{item.mobile || "—"}</span>,
    },
    {
      id: "city",
      header: "City / State",
      cell: (item) => (
        <span className="text-xs text-[#475569]">
          {[item.city, item.state].filter(Boolean).join(", ") || "—"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      cell: (item) => (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
          item.status === "ACTIVE"
            ? "bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]"
            : "bg-[#FEF9C3] text-[#854D0E] border-[#FDE68A]"
        }`}>
          {item.status || "ACTIVE"}
        </span>
      ),
    },
  ];

  // Columns for Retailers
  const retailerColumns: TableColumn<any>[] = [
    {
      id: "store_name",
      header: "Store Name",
      sortable: true,
      cell: (item) => (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#DCFCE7] text-[#166534]">
            <Store className="w-3.5 h-3.5" />
          </span>
          <span className="font-bold text-[#0F172A]">{item.store_name}</span>
        </div>
      ),
    },
    {
      id: "retailer_code",
      header: "Retailer Code",
      sortable: true,
      cell: (item) => <span className="font-mono text-xs font-bold text-[#16A34A]">{item.retailer_code}</span>,
    },
    {
      id: "owner_name",
      header: "Owner Name",
      cell: (item) => <span className="text-xs text-[#374151]">{item.owner_name}</span>,
    },
    {
      id: "legal_name",
      header: "Legal / Trade Name",
      cell: (item) => <span className="text-xs text-[#475569]">{item.legal_name || "—"}</span>,
    },
    {
      id: "business_category",
      header: "Category",
      cell: (item) => (
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]">
          {item.business_category || "—"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      cell: (item) => (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
          item.status === "ACTIVE" || item.status === "APPROVED"
            ? "bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]"
            : item.status === "PENDING_APPROVAL"
            ? "bg-[#FEF9C3] text-[#854D0E] border-[#FDE68A]"
            : "bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]"
        }`}>
          {item.status || "ACTIVE"}
        </span>
      ),
    },
  ];

  // Resolve current active grid data + columns + refresh
  const gridData = activeTab === "rms" ? rms
    : activeTab === "sds" ? sds
    : activeTab === "distributors" ? dists
    : retailers;

  const gridColumns = activeTab === "rms" ? rmColumns
    : activeTab === "sds" ? sdColumns
    : activeTab === "distributors" ? distColumns
    : retailerColumns;

  const gridRefresh = activeTab === "rms" ? fetchRms
    : activeTab === "sds" ? fetchSds
    : activeTab === "distributors" ? fetchDists
    : fetchRetailers;

  const tabLabels: Record<string, string> = {
    rms: "Regional Managers",
    sds: "Super Distributors",
    distributors: "Distributors",
    retailers: "Retailers",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight flex items-center gap-3">
            <Network className="w-7 h-7 text-[#2563EB]" /> Enterprise Organization Topology
          </h1>
          <p className="mt-1 text-sm font-medium text-[#64748B]">
            5-tier hierarchical topology (Company → Regional Manager → Super Distributor → Distributor → Retailer)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/organization/transfers"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] text-xs font-extrabold text-[#2563EB] hover:bg-[#DBEAFE] transition-all"
          >
            <ArrowLeftRight className="w-4 h-4" /> Manage Transfers
          </Link>
          <button
            onClick={() => setShowRmModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2563EB] text-xs font-extrabold text-white hover:bg-[#1D4ED8] shadow-2xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Regional Manager
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E2E8F0] pb-2">
        {[
          { id: "tree", label: "Interactive Tree View", icon: Network },
          { id: "rms", label: "Regional Managers", icon: UserCheck },
          { id: "sds", label: "Super Distributors", icon: Building2 },
          { id: "distributors", label: "Distributors", icon: Users },
          { id: "retailers", label: "Retailers", icon: Store },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                isActive
                  ? "bg-[#2563EB] text-white shadow-2xs"
                  : "bg-white text-[#475569] border border-[#E2E8F0] hover:bg-[#F8FAFC]"
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Interactive Hierarchy Tree */}
      {activeTab === "tree" && (
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <span className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">Enterprise Node Topology</span>
            <button onClick={fetchTree} className="text-xs text-[#2563EB] font-bold hover:underline flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5" /> Reload Topology
            </button>
          </div>
          {loading ? (
            <div className="py-12 text-center text-[#64748B] font-bold text-xs">Rendering Hierarchy Tree...</div>
          ) : tree.length === 0 ? (
            <div className="py-12 text-center text-[#64748B] font-bold text-xs">No organizational hierarchy nodes created yet.</div>
          ) : (
            <div className="space-y-4">
              {tree.map((node) => (
                <TreeNodeItem key={node.id} node={node} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Grid Tab Views using Standardized DataTable */}
      {activeTab !== "tree" && (
        <DataTable
          data={gridData}
          columns={gridColumns}
          keyExtractor={(item) => item.public_id || item.employee_code || item.retailer_code || item.email}
          loading={gridLoading}
          totalRecords={gridData.length}
          pageSize={10}
          onRefresh={gridRefresh}
          searchPlaceholder={`Search ${tabLabels[activeTab]} by name, code, mobile...`}
        />
      )}

      {/* Onboard RM Modal */}
      {showRmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#2563EB]" /> Add Regional Manager (RM)
              </h2>
              <button onClick={() => setShowRmModal(false)} className="text-[#64748B] hover:text-[#0F172A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRm} className="space-y-4 text-xs font-bold">
              <div>
                <label className="text-[#374151] block mb-1">Target Company *</label>
                <select
                  required
                  value={rmFormData.company_id}
                  onChange={(e) => setRmFormData({ ...rmFormData, company_id: e.target.value })}
                  className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 text-[#111827] focus:border-[#2563EB] focus:outline-none cursor-pointer"
                >
                  {companies.map((c) => (
                    <option key={c.public_id} value={c.public_id}>{c.company_name} ({c.company_code})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[#374151] block mb-1">Employee Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="RM-CHE-01"
                    value={rmFormData.employee_code}
                    onChange={(e) => setRmFormData({ ...rmFormData, employee_code: e.target.value })}
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 font-mono text-[#111827] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#374151] block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Rajesh Kumar"
                    value={rmFormData.full_name}
                    onChange={(e) => setRmFormData({ ...rmFormData, full_name: e.target.value })}
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 text-[#111827] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[#374151] block mb-1">Mobile (10 Digits) *</label>
                  <input
                    type="text"
                    required
                    placeholder="9876543210"
                    value={rmFormData.mobile}
                    onChange={(e) => setRmFormData({ ...rmFormData, mobile: e.target.value })}
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 font-mono text-[#111827] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#374151] block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="rm@pay2pay.com"
                    value={rmFormData.email}
                    onChange={(e) => setRmFormData({ ...rmFormData, email: e.target.value })}
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 text-[#111827] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-[#E2E8F0] gap-3">
                <button
                  type="button"
                  onClick={() => setShowRmModal(false)}
                  className="px-4 py-2 rounded-lg border border-[#D1D5DB] text-[#374151] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#2563EB] px-5 py-2 text-xs font-extrabold text-white hover:bg-[#1D4ED8]"
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
