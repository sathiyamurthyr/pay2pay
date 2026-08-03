"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { ResetPasswordModal } from "@/components/ui/reset-password-modal";
import {
  Store,
  Building2,
  Users,
  Plus,
  Search,
  ChevronRight,
  RefreshCw,
  ShieldCheck,
  Network,
  CheckCircle2,
  KeyRound,
  Filter,
  AlignJustify,
  Columns3,
  Download,
  ChevronDown,
  Maximize2,
  RefreshCcw,
  Clock,
  FileText,
  Hash,
  Tag,
  MapPin,
  Phone,
} from "lucide-react";

type Tab = "retailers" | "distributors" | "super_distributors";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: "bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]",
    APPROVED: "bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]",
    PENDING_APPROVAL: "bg-[#FEF9C3] text-[#854D0E] border-[#FDE68A]",
    PENDING_KYC: "bg-[#FEF9C3] text-[#854D0E] border-[#FDE68A]",
    SUSPENDED: "bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]",
    BLOCKED: "bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]",
    INACTIVE: "bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
        map[status] || map.INACTIVE
      }`}
    >
      {status}
    </span>
  );
}

export default function OnboardingHubPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<Tab>(
    initialTab === "sd" ? "super_distributors" :
    initialTab === "distributors" ? "distributors" : "retailers"
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [density, setDensity] = useState<"compact" | "medium" | "spacious">("medium");

  // Data
  const [retailers, setRetailers] = useState<any[]>([]);
  const [distributors, setDistributors] = useState<any[]>([]);
  const [superDistributors, setSuperDistributors] = useState<any[]>([]);
  const [resetTarget, setResetTarget] = useState<{ type: string; item: any } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  useEffect(() => {
    if (searchParams.get("onboarded") === "true") {
      setShowSuccessBanner(true);
      const timer = setTimeout(() => setShowSuccessBanner(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [retRes, distRes, sdRes] = await Promise.all([
        api.get("/api/v1/retailers", { params: { search, status: statusFilter } }),
        api.get("/api/v1/organization/distributors"),
        api.get("/api/v1/organization/super-distributors"),
      ]);
      setRetailers(retRes.data.items || []);
      setDistributors(distRes.data.items || []);
      setSuperDistributors(sdRes.data.items || []);
    } catch (err) {
      console.error("Failed to fetch onboarding directory data", err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const tabs = [
    { id: "super_distributors" as Tab, label: "Super Distributors", icon: Building2, count: superDistributors.length, color: "#F59E0B", bg: "#FEF9C3" },
    { id: "distributors" as Tab, label: "Distributors", icon: Users, count: distributors.length, color: "#3B82F6", bg: "#DBEAFE" },
    { id: "retailers" as Tab, label: "Retailers", icon: Store, count: retailers.length, color: "#6C63FF", bg: "#EDE9FE" },
  ];

  const activeData =
    activeTab === "retailers" ? retailers :
    activeTab === "distributors" ? distributors :
    superDistributors;

  const filteredData = search
    ? activeData.filter((item) =>
        JSON.stringify(item).toLowerCase().includes(search.toLowerCase())
      )
    : activeData;

  const handleExportCSV = () => {
    if (!filteredData.length) return;
    let headers: string[] = [];
    let rows: string[][] = [];

    if (activeTab === "retailers") {
      headers = ["Retailer Code", "Store Name", "Legal Name", "Owner Name", "Category", "Status"];
      rows = filteredData.map((item) => [
        `"${item.retailer_code || ""}"`,
        `"${item.store_name || ""}"`,
        `"${item.legal_name || ""}"`,
        `"${item.owner_name || ""}"`,
        `"${item.business_category || ""}"`,
        `"${item.status || ""}"`,
      ]);
    } else {
      headers = ["Business Name", "Owner Name", "Mobile", "Email", "City", "State", "Status"];
      rows = filteredData.map((item) => [
        `"${item.business_name || ""}"`,
        `"${item.owner_name || ""}"`,
        `"${item.mobile || ""}"`,
        `"${item.email || ""}"`,
        `"${item.city || ""}"`,
        `"${item.state || ""}"`,
        `"${item.status || "ACTIVE"}"`,
      ]);
    }

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `${activeTab}_directory_export_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportDropdown(false);
  };

  const addButtonConfig = {
    super_distributors: {
      label: "Onboard Super Distributor",
      href: "/retailers/onboard-sd",
      color: "bg-[#F59E0B] hover:bg-[#D97706]",
    },
    distributors: {
      label: "Onboard Distributor",
      href: "/retailers/onboard-distributor",
      color: "bg-[#3B82F6] hover:bg-[#2563EB]",
    },
    retailers: {
      label: "Onboard Retailer Outlet",
      href: "/retailers/onboard",
      color: "bg-[#6C63FF] hover:bg-[#5B52E5]",
    },
  }[activeTab];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-[#6C63FF]" /> Onboarding Hub
          </h1>
          <p className="mt-1 text-sm font-medium text-[#64748B]">
            Multi-tier onboarding for Super Distributors, Distributors & Retailers with Backblaze B2 KYC verification
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/organization"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-xs font-extrabold text-[#475569] hover:bg-[#F8FAFC] transition-all"
          >
            <Network className="w-4 h-4" /> View Org Topology
          </Link>
          <Link
            href={addButtonConfig.href}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold text-white shadow-md transition-all cursor-pointer ${addButtonConfig.color}`}
          >
            <Plus className="w-4 h-4" /> {addButtonConfig.label}
          </Link>
        </div>
      </div>

      {showSuccessBanner && (
        <div className="flex items-center gap-3 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-4 text-xs font-bold text-[#166534] shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0" />
          <span>Onboarding profile created successfully! Document uploads stored securely in Backblaze B2.</span>
        </div>
      )}

      {/* Hierarchy Banner */}
      <div className="rounded-xl border border-[#E2E8F0] bg-gradient-to-r from-[#FAFBFF] to-[#EFF6FF] p-4 flex items-center gap-4 overflow-x-auto">
        <Network className="w-5 h-5 text-[#2563EB] shrink-0" />
        {["Company", "→ Regional Manager", "→ Super Distributor", "→ Distributor", "→ Retailer"].map((tier, i) => (
          <span
            key={i}
            className={`text-xs font-extrabold whitespace-nowrap ${
              i === 0
                ? "text-[#1E40AF]"
                : i === 2
                ? "text-[#92400E]"
                : i === 3
                ? "text-[#0369A1]"
                : i === 4
                ? "text-[#6D28D9]"
                : "text-[#475569]"
            }`}
          >
            {tier}
          </span>
        ))}
      </div>

      {/* KPI / Tab Selector */}
      <div className="grid grid-cols-3 gap-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl border-2 p-5 text-left transition-all cursor-pointer ${
                isActive
                  ? "border-[#2563EB] bg-white shadow-md"
                  : "border-[#E2E8F0] bg-white hover:border-[#BFDBFE] hover:bg-[#F8FAFF]"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: tab.bg }}>
                  <Icon style={{ color: tab.color, width: 20, height: 20 }} />
                </div>
                {isActive && <div className="w-3 h-3 rounded-full bg-[#2563EB]" />}
              </div>
              <div className="font-mono text-[28px] font-extrabold text-[#0F172A] tabular-nums">{tab.count}</div>
              <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mt-1">{tab.label}</p>
            </button>
          );
        })}
      </div>

      {/* ── DataGrid Toolbar ── */}
      <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-[#E2E8F0] shadow-xs">
        {/* Left Group */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
            <input
              type="text"
              placeholder={`Search ${tabs.find((t) => t.id === activeTab)?.label}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 w-52 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[12px] font-medium text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/15 transition-all"
            />
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-[#E2E8F0] mx-0.5" />

          {/* Filter button */}
          <div className="relative">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC] hover:border-[#6C63FF] transition cursor-pointer"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            >
              <Filter className="w-3.5 h-3.5 text-[#6C63FF]" />
              <span>Filter</span>
              {statusFilter !== "" && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-[#6C63FF] text-white text-[9px] font-extrabold">
                  1
                </span>
              )}
            </button>
            {/* Inline status filter flyout */}
            {showFilterDropdown && (
              <div className="absolute top-9 left-0 z-30 bg-white border border-[#E2E8F0] rounded-xl shadow-xl p-1.5 min-w-[170px]">
                <div className="text-[10px] font-extrabold text-[#94A3B8] uppercase px-2 py-1">Filter Status</div>
                {[
                  { id: "", label: "All Statuses" },
                  { id: "ACTIVE", label: "Active" },
                  { id: "PENDING_APPROVAL", label: "Pending Approval" },
                  { id: "SUSPENDED", label: "Suspended" },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setStatusFilter(s.id);
                      setShowFilterDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                      statusFilter === s.id
                        ? "bg-[#6C63FF]/10 text-[#6C63FF]"
                        : "text-[#374151] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Density toggle */}
          <button
            onClick={() => setDensity((d) => (d === "compact" ? "medium" : d === "medium" ? "spacious" : "compact"))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer"
            title="Toggle Row Density"
          >
            <AlignJustify className="w-3.5 h-3.5 text-[#6C63FF]" />
            <span className="capitalize">{density}</span>
          </button>

          {/* Columns */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer">
            <Columns3 className="w-3.5 h-3.5 text-[#6C63FF]" />
            <span>Columns</span>
          </button>

          {/* Export */}
          <div className="relative">
            <button
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#6C63FF]" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3 text-[#94A3B8]" />
            </button>
            {showExportDropdown && (
              <div className="absolute top-9 left-0 z-30 bg-white border border-[#E2E8F0] rounded-xl shadow-xl p-1.5 min-w-[150px]">
                <button
                  onClick={handleExportCSV}
                  className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-[#374151] hover:bg-[#F8FAFC] rounded-lg transition cursor-pointer flex items-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5 text-[#16A34A]" /> Export as CSV
                </button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-[#E2E8F0] mx-0.5" />

          {/* Refresh */}
          <button
            onClick={fetchData}
            className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#6C63FF] transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#6C63FF]" : ""}`} />
          </button>

          {/* Expand / Fullscreen */}
          <button
            className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC] transition cursor-pointer"
            title="Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Group: record count */}
        <span className="text-[12px] font-semibold text-[#64748B] whitespace-nowrap shrink-0">
          {filteredData.length} record{filteredData.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Data Grid */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gradient-to-r from-[#F8FAFC] to-[#EEF2FF] border-b-2 border-[#E2E8F0]">
              {activeTab === "retailers" ? (
                <>
                  <th className="px-5 py-3.5 text-left whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE]">
                        <Hash className="w-3.5 h-3.5 text-[#2563EB]" />
                      </div>
                      <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">Retailer Code</span>
                    </div>
                  </th>
                  <th className="px-5 py-3.5 text-left whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#F5F3FF] border border-[#DDD6FE]">
                        <Store className="w-3.5 h-3.5 text-[#7C3AED]" />
                      </div>
                      <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">Store &amp; Legal Name</span>
                    </div>
                  </th>
                  <th className="px-5 py-3.5 text-left whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0]">
                        <Users className="w-3.5 h-3.5 text-[#16A34A]" />
                      </div>
                      <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">Owner</span>
                    </div>
                  </th>
                  <th className="px-5 py-3.5 text-left whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#FFFBEB] border border-[#FDE68A]">
                        <Tag className="w-3.5 h-3.5 text-[#D97706]" />
                      </div>
                      <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">Category</span>
                    </div>
                  </th>
                  <th className="px-5 py-3.5 text-left whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#FDF4FF] border border-[#E9D5FF]">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#9333EA]" />
                      </div>
                      <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">Status</span>
                    </div>
                  </th>
                  <th className="px-5 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <div className="p-1.5 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5]">
                        <FileText className="w-3.5 h-3.5 text-[#DC2626]" />
                      </div>
                      <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">Actions</span>
                    </div>
                  </th>
                </>
              ) : (
                <>
                  <th className="px-5 py-3.5 text-left whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE]">
                        <Building2 className="w-3.5 h-3.5 text-[#2563EB]" />
                      </div>
                      <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">Business Name</span>
                    </div>
                  </th>
                  <th className="px-5 py-3.5 text-left whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#F5F3FF] border border-[#DDD6FE]">
                        <Users className="w-3.5 h-3.5 text-[#7C3AED]" />
                      </div>
                      <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">Owner</span>
                    </div>
                  </th>
                  <th className="px-5 py-3.5 text-left whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0]">
                        <Phone className="w-3.5 h-3.5 text-[#16A34A]" />
                      </div>
                      <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">Mobile / Email</span>
                    </div>
                  </th>
                  <th className="px-5 py-3.5 text-left whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#FFFBEB] border border-[#FDE68A]">
                        <MapPin className="w-3.5 h-3.5 text-[#D97706]" />
                      </div>
                      <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">City / State</span>
                    </div>
                  </th>
                  <th className="px-5 py-3.5 text-left whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#FDF4FF] border border-[#E9D5FF]">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#9333EA]" />
                      </div>
                      <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">Status</span>
                    </div>
                  </th>
                  <th className="px-5 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <div className="p-1.5 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5]">
                        <FileText className="w-3.5 h-3.5 text-[#DC2626]" />
                      </div>
                      <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">Actions</span>
                    </div>
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i} className="animate-pulse border-b border-[#F1F5F9]">
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-5 py-3.5">
                      <div className="h-4 bg-[#F1F5F9] rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#F1F5F9] flex items-center justify-center">
                      <Store className="w-5 h-5 text-[#94A3B8]" />
                    </div>
                    <p className="text-sm font-semibold text-[#334155]">No records found</p>
                    <Link
                      href={addButtonConfig.href}
                      className={`mt-1 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold text-white ${addButtonConfig.color}`}
                    >
                      <Plus className="w-3.5 h-3.5" /> {addButtonConfig.label}
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              filteredData.map((item, idx) => (
                <tr key={item.public_id || idx} className="border-b border-[#F1F5F9] hover:bg-[#FAFBFF] transition-colors">
                  {activeTab === "retailers" ? (
                    <>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-[12px] font-bold text-[#6C63FF]">{item.retailer_code}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-[#0F172A]">{item.store_name}</div>
                        <div className="text-[11px] text-[#64748B]">{item.legal_name}</div>
                      </td>
                      <td className="px-5 py-3.5 text-[#334155] font-medium">{item.owner_name}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB]">
                          {item.business_category}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setResetTarget({ type: "retailer", item })}
                          className="p-2 rounded-xl border border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#EFF6FF] hover:text-[#2563EB] hover:border-[#BFDBFE] transition-all cursor-pointer shadow-2xs"
                          title="Reset Retailer Password"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          href={`/retailers/${item.public_id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[11px] font-bold text-[#374151] hover:bg-[#F8FAFC] hover:border-[#6C63FF] hover:text-[#6C63FF] transition-all"
                        >
                          View Profile <ChevronRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-5 py-3.5 font-semibold text-[#0F172A]">{item.business_name}</td>
                      <td className="px-5 py-3.5 text-[#334155]">{item.owner_name}</td>
                      <td className="px-5 py-3.5">
                        <div className="font-mono text-[11px] text-[#475569]">{item.mobile}</div>
                        <div className="text-[11px] text-[#64748B]">{item.email}</div>
                      </td>
                      <td className="px-5 py-3.5 text-[11px] text-[#475569]">
                        {[item.city, item.state].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={item.status || "ACTIVE"} />
                      </td>
                      <td className="px-5 py-3.5 text-right flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setResetTarget({ type: activeTab === "super_distributors" ? "sd" : "dist", item })}
                          className="p-2 rounded-xl border border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#EFF6FF] hover:text-[#2563EB] hover:border-[#BFDBFE] transition-all cursor-pointer shadow-2xs"
                          title={`Reset ${activeTab === "super_distributors" ? "Super Distributor" : "Distributor"} Password`}
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Reset Password Modal */}
      {resetTarget && (
        <ResetPasswordModal
          isOpen={!!resetTarget}
          onClose={() => setResetTarget(null)}
          targetName={resetTarget.item.business_name || resetTarget.item.store_name || resetTarget.item.legal_name || "Partner"}
          targetCodeOrEmail={resetTarget.item.retailer_code || resetTarget.item.email || "partner@pay2pay.com"}
          onSubmit={async (newPassword) => {
            const endpoint =
              resetTarget.type === "retailer"
                ? `/api/v1/retailers/${resetTarget.item.public_id}/reset-password`
                : resetTarget.type === "sd"
                ? `/api/v1/organization/super-distributors/${resetTarget.item.public_id}/reset-password`
                : `/api/v1/organization/distributors/${resetTarget.item.public_id}/reset-password`;

            await api.post(endpoint, { new_password: newPassword });
          }}
        />
      )}
    </div>
  );
}
