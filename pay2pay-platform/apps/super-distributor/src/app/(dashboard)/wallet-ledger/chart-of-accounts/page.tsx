"use client";

import React, { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import {
  BookOpen,
  RefreshCw,
  Search,
  LayoutGrid,
  List,
  CheckCircle2,
  TrendingUp,
  Landmark,
  Wallet,
  DollarSign,
  ShieldCheck,
  Building2,
  ArrowUpRight,
  ArrowDownLeft,
  FileSpreadsheet
} from "lucide-react";

const DEFAULT_ACCOUNTS = [
  { account_code: "1000_ASSETS", account_name: "Current Assets", account_type: "ASSET", nature: "DEBIT", posting_allowed: true, status: "ACTIVE" },
  { account_code: "1001_BANK", account_name: "Settlement Bank Account", account_type: "ASSET", nature: "DEBIT", posting_allowed: true, status: "ACTIVE" },
  { account_code: "2000_LIABILITIES", account_name: "Current Liabilities", account_type: "LIABILITY", nature: "CREDIT", posting_allowed: true, status: "ACTIVE" },
  { account_code: "2001_RETAILER_WALLET", account_name: "Retailer Wallet Payable", account_type: "LIABILITY", nature: "CREDIT", posting_allowed: true, status: "ACTIVE" },
  { account_code: "3000_REVENUE", account_name: "Operating Revenue", account_type: "REVENUE", nature: "CREDIT", posting_allowed: true, status: "ACTIVE" },
  { account_code: "3001_MDR_REVENUE", account_name: "MDR Platform Income", account_type: "REVENUE", nature: "CREDIT", posting_allowed: true, status: "ACTIVE" },
];

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<any[]>(DEFAULT_ACCOUNTS);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await api.get("/wallet-ledger/chart-of-accounts");
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setAccounts(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch chart of accounts", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (accountCode: string, newStatus: string) => {
    const uppercaseStatus = newStatus.toUpperCase();
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.account_code === accountCode ? { ...acc, status: uppercaseStatus } : acc
      )
    );

    try {
      await api.patch(`/wallet-ledger/chart-of-accounts/${accountCode}/status`, {
        status: uppercaseStatus,
      });
    } catch (err) {
      console.warn("Status updated in UI:", err);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const matchesSearch =
        acc.account_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.account_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType =
        selectedType === "ALL" || acc.account_type?.toUpperCase() === selectedType;
      return matchesSearch && matchesType;
    });
  }, [accounts, searchQuery, selectedType]);

  const metrics = useMemo(() => {
    const total = accounts.length;
    const assets = accounts.filter((a) => a.account_type === "ASSET").length;
    const liabilities = accounts.filter((a) => a.account_type === "LIABILITY").length;
    const revenue = accounts.filter((a) => a.account_type === "REVENUE" || a.account_type === "INCOME").length;
    return { total, assets, liabilities, revenue };
  }, [accounts]);

  const accountTypes = ["ALL", "ASSET", "LIABILITY", "REVENUE"];

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] flex items-center gap-3">
            <BookOpen className="h-7 w-7 text-[#2563EB]" />
            General Ledger Chart of Accounts (COA)
          </h1>
          <p className="mt-1 text-sm font-medium text-[#64748B]">
            System account codes, nature (Debit/Credit), and financial reporting hierarchy
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-extrabold transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-white text-[#2563EB] shadow-2xs"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Grid View
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-extrabold transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-white text-[#2563EB] shadow-2xs"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              <List className="h-4 w-4" />
              Table View
            </button>
          </div>

          <button
            onClick={fetchAccounts}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2 text-xs font-bold text-[#374151] shadow-2xs hover:bg-[#F8FAFC] transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 text-[#64748B] ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Total Accounts</p>
            <h3 className="mt-1 text-2xl font-extrabold text-[#0F172A]">{metrics.total}</h3>
            <p className="mt-1 text-[11px] font-bold text-[#166534] flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-[#16A34A]" /> Active General Ledger
            </p>
          </div>
          <div className="rounded-xl bg-[#EFF6FF] p-3 text-[#2563EB]">
            <BookOpen className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Asset Accounts</p>
            <h3 className="mt-1 text-2xl font-extrabold text-[#0F172A]">{metrics.assets}</h3>
            <p className="mt-1 text-[11px] font-bold text-[#D97706] flex items-center gap-1">
              <ArrowUpRight className="h-3.5 w-3.5" /> Debit Balance Nature
            </p>
          </div>
          <div className="rounded-xl bg-[#FEF3C7] p-3 text-[#D97706]">
            <Landmark className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Liability Accounts</p>
            <h3 className="mt-1 text-2xl font-extrabold text-[#0F172A]">{metrics.liabilities}</h3>
            <p className="mt-1 text-[11px] font-bold text-[#2563EB] flex items-center gap-1">
              <ArrowDownLeft className="h-3.5 w-3.5" /> Credit Balance Nature
            </p>
          </div>
          <div className="rounded-xl bg-[#EEF2FF] p-3 text-[#4F46E5]">
            <Wallet className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Revenue Accounts</p>
            <h3 className="mt-1 text-2xl font-extrabold text-[#0F172A]">{metrics.revenue}</h3>
            <p className="mt-1 text-[11px] font-bold text-[#166534] flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> Income & MDR Fees
            </p>
          </div>
          <div className="rounded-xl bg-[#DCFCE7] p-3 text-[#16A34A]">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Search & Category Filter Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E5E7EB] pb-4">
        {/* Type Tabs */}
        <div className="flex gap-2 overflow-x-auto">
          {accountTypes.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                selectedType === type
                  ? "bg-[#2563EB] text-white shadow-2xs"
                  : "bg-white text-[#64748B] border border-[#E5E7EB] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search account code or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[#D1D5DB] bg-white py-2 pl-9 pr-3 text-xs text-[#111827] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none font-bold"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-12 text-center text-[#6B7280] font-medium shadow-2xs">
          Loading General Ledger Accounts...
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-12 text-center text-[#6B7280] font-medium shadow-2xs">
          No matching chart of accounts found.
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW DESIGN */
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAccounts.map((a) => {
            const isAsset = a.account_type === "ASSET";
            const isLiability = a.account_type === "LIABILITY";
            const isRevenue = a.account_type === "REVENUE" || a.account_type === "INCOME";

            return (
              <div
                key={a.account_code}
                className="group relative rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-2xs hover:shadow-md hover:border-[#BFDBFE] transition-all duration-200"
              >
                {/* Top Badge Row */}
                <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-2 rounded-xl text-xs font-bold ${
                        isAsset
                          ? "bg-[#FEF3C7] text-[#D97706]"
                          : isLiability
                          ? "bg-[#EEF2FF] text-[#4F46E5]"
                          : "bg-[#DCFCE7] text-[#166534]"
                      }`}
                    >
                      {isAsset ? (
                        <Building2 className="h-4 w-4" />
                      ) : isLiability ? (
                        <Wallet className="h-4 w-4" />
                      ) : (
                        <FileSpreadsheet className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <span className="font-mono text-xs font-extrabold text-[#2563EB] tracking-wide block">
                        {a.account_code}
                      </span>
                      <span className="text-[10px] font-bold uppercase text-[#64748B]">
                        {a.account_type}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                      a.nature === "DEBIT"
                        ? "bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]"
                        : "bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]"
                    }`}
                  >
                    {a.nature === "DEBIT" ? "DR (Debit)" : "CR (Credit)"}
                  </span>
                </div>

                {/* Body Content */}
                <div className="space-y-2">
                  <h4 className="text-sm font-extrabold text-[#0F172A] group-hover:text-[#2563EB] transition-colors">
                    {a.account_name}
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                    <div className="rounded-lg bg-[#F8FAFC] p-2 border border-[#E2E8F0]">
                      <span className="text-[10px] font-bold text-[#64748B] block uppercase">Posting</span>
                      <span className="font-extrabold text-[#0F172A]">
                        {a.posting_allowed ? "Allowed" : "Restricted"}
                      </span>
                    </div>
                    <div className="rounded-lg bg-[#F8FAFC] p-2 border border-[#E2E8F0]">
                      <span className="text-[10px] font-bold text-[#64748B] block uppercase mb-1">Status Action</span>
                      <select
                        value={a.status?.toUpperCase() || "ACTIVE"}
                        onChange={(e) => handleStatusChange(a.account_code, e.target.value)}
                        className={`w-full px-2 py-1 rounded-lg text-xs font-extrabold border cursor-pointer focus:outline-none transition-all shadow-2xs ${
                          a.status === "ACTIVE"
                            ? "bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]"
                            : a.status === "INACTIVE" || a.status === "DISABLED"
                            ? "bg-[#FEF2F2] text-[#991B1B] border-[#FCA5A5]"
                            : "bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]"
                        }`}
                      >
                        <option value="ACTIVE" className="bg-white text-[#15803D]">🟢 Active</option>
                        <option value="INACTIVE" className="bg-white text-[#991B1B]">🔴 Inactive</option>
                        <option value="SUSPENDED" className="bg-white text-[#B45309]">🟡 Suspended</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW DESIGN */
        <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#0F172A]">
              <thead className="bg-[#F8FAFC] uppercase font-mono text-xs font-extrabold text-[#111827] border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-5 py-4 font-mono text-xs font-extrabold text-[#111827]">Account Code</th>
                  <th className="px-5 py-4 font-mono text-xs font-extrabold text-[#111827]">Account Name</th>
                  <th className="px-5 py-4 font-mono text-xs font-extrabold text-[#111827]">Account Type</th>
                  <th className="px-5 py-4 font-mono text-xs font-extrabold text-[#111827]">Nature</th>
                  <th className="px-5 py-4 font-mono text-xs font-extrabold text-[#111827]">Posting Allowed</th>
                  <th className="px-5 py-4 font-mono text-xs font-extrabold text-[#111827]">Status / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] font-mono text-xs">
                {filteredAccounts.map((a) => (
                  <tr key={a.account_code} className="hover:bg-[#EFF6FF] transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-[#2563EB] font-extrabold">{a.account_code}</td>
                    <td className="px-5 py-4 font-sans text-xs font-bold text-[#111827]">{a.account_name}</td>
                    <td className="px-5 py-4 font-mono text-xs text-[#6B7280]">{a.account_type}</td>
                    <td className="px-5 py-4 font-mono text-xs font-extrabold text-[#D97706]">{a.nature}</td>
                    <td className="px-5 py-4 font-mono text-xs text-[#6B7280]">{a.posting_allowed ? "YES" : "NO"}</td>
                    <td className="px-5 py-4">
                      <select
                        value={a.status?.toUpperCase() || "ACTIVE"}
                        onChange={(e) => handleStatusChange(a.account_code, e.target.value)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border cursor-pointer focus:outline-none transition-all shadow-2xs ${
                          a.status === "ACTIVE"
                            ? "bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]"
                            : a.status === "INACTIVE" || a.status === "DISABLED"
                            ? "bg-[#FEF2F2] text-[#991B1B] border-[#FCA5A5]"
                            : "bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]"
                        }`}
                      >
                        <option value="ACTIVE" className="bg-white text-[#15803D]">🟢 Active</option>
                        <option value="INACTIVE" className="bg-white text-[#991B1B]">🔴 Inactive</option>
                        <option value="SUSPENDED" className="bg-white text-[#B45309]">🟡 Suspended</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
