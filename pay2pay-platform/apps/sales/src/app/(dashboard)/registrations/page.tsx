"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ClipboardCheck, Search, Filter, RefreshCw, UserCog, UserPlus,
  Store, Building2, ShieldCheck, CheckCircle2, XCircle, Clock,
  ChevronRight, Copy, Check, Eye, AlertCircle, Plus, ExternalLink,
  Layers, ArrowUpRight
} from "lucide-react";
import apiClient from "@/lib/api";

const REGISTRATION_TABS = [
  { id: "ALL", label: "All Entities" },
  { id: "SUPER_DISTRIBUTOR", label: "Super Distributors" },
  { id: "DISTRIBUTOR", label: "Distributors" },
  { id: "RETAILER", label: "Retailers" },
  { id: "PENDING_KYC", label: "Pending KYC" },
  { id: "VIDEO_KYC_PENDING", label: "Video KYC Pending" },
  { id: "ADMIN_APPROVAL_PENDING", label: "Approval Pending" },
  { id: "APPROVED", label: "Approved" },
  { id: "REJECTED", label: "Rejected" },
  { id: "ACTIVE", label: "Active" },
  { id: "INACTIVE", label: "Inactive" },
];

export default function SalesRegistrationsHubPage() {
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.append("tab", activeTab);
      if (searchTerm.trim()) {
        params.append("search", searchTerm.trim());
      }
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      const res = await apiClient.get(`/sales/registrations?${params.toString()}`);
      setItems(res.data.items || []);
      setCounts(res.data.counts || {});
      setTotal(res.data.total || 0);
    } catch (err: any) {
      console.error("Error fetching registrations:", err);
      setError(err.response?.data?.detail || "Failed to load registrations. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [activeTab, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRegistrations();
  };

  const handleCopyLink = (url: string, id: string) => {
    if (url) {
      navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 3000);
    }
  };

  const getEntityTypeBadge = (type: string) => {
    switch (type) {
      case "SUPER_DISTRIBUTOR":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#F8E6EE] text-[#94003A] border border-pink-200">
            <UserCog className="w-3 h-3 text-[#94003A]" /> SD
          </span>
        );
      case "DISTRIBUTOR":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#DBEAFE] text-[#1E40AF] border border-blue-200">
            <UserPlus className="w-3 h-3 text-[#2563EB]" /> Dist
          </span>
        );
      case "RETAILER":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#DCFCE7] text-[#166534] border border-emerald-200">
            <Store className="w-3 h-3 text-[#16A34A]" /> Retailer
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-700">
            {type}
          </span>
        );
    }
  };

  const getApprovalBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#166534] border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEE2E2] text-[#991B1B] border border-rose-200">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF3C7] text-[#92400E] border border-amber-200">
            <Clock className="w-3 h-3" /> Admin Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#F8E6EE] border border-pink-200 text-[#94003A] flex items-center justify-center font-bold">
              <ClipboardCheck className="w-5 h-5 text-[#94003A]" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-[#1F2937] tracking-tight">
                Registrations & KYC Hub
              </h1>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Tenant-scoped onboarding registry across Super Distributors, Distributors, and Retailers
              </p>
            </div>
          </div>
        </div>

        {/* Quick New Registration CTAs */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/register/retailer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#94003A] hover:bg-[#78002F] text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95"
          >
            <Plus className="w-4 h-4 text-[#E7B631]" />
            <span>New Retailer</span>
          </Link>
          <Link
            href="/register/distributor"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#E7B631] hover:bg-[#D3A51F] text-[#1F2937] text-xs font-bold rounded-xl shadow-xs transition active:scale-95"
          >
            <Plus className="w-4 h-4 text-[#94003A]" />
            <span>New Dist</span>
          </Link>
          <Link
            href="/register/super-distributor"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 text-[#1F2937] border border-[#D1D5DB] text-xs font-bold rounded-xl shadow-xs transition active:scale-95"
          >
            <Plus className="w-4 h-4 text-[#94003A]" />
            <span>New SD</span>
          </Link>
          <button
            onClick={() => fetchRegistrations()}
            className="p-2 bg-white hover:bg-gray-50 border border-[#D1D5DB] text-[#6B7280] hover:text-[#94003A] rounded-xl transition"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#94003A]" : ""}`} />
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 border-b border-[#E5E7EB] overflow-x-auto pb-px scrollbar-thin">
        {REGISTRATION_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = counts[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? "border-[#94003A] text-[#94003A] bg-[#F8E6EE]/60 rounded-t-lg"
                  : "border-transparent text-[#6B7280] hover:text-[#1F2937] hover:bg-white"
              }`}
            >
              <span>{tab.label}</span>
              {count !== undefined && count > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive
                      ? "bg-[#94003A] text-white"
                      : "bg-[#E5E7EB] text-[#4B5563]"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search Bar & Summary */}
      <div className="bg-white border border-[#E5E7EB] p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search by name, mobile, registration ID, PAN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#D1D5DB] rounded-xl text-xs text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#94003A] focus:ring-2 focus:ring-[#F8E6EE] transition"
          />
        </form>

        <div className="text-xs text-[#6B7280] font-medium flex items-center gap-2">
          <span>Showing <strong>{items.length}</strong> of <strong>{total}</strong> registrations</span>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B] text-xs rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Registrations Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#FAFAFC] border-b border-[#E5E7EB] text-[#6B7280] font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Entity & Reg ID</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Owner / Contact</th>
                <th className="py-3 px-4">KYC Progress</th>
                <th className="py-3 px-4">Approval Status</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#6B7280]">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#94003A]" />
                      <span>Loading registration records...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#6B7280]">
                    <div className="max-w-sm mx-auto space-y-2">
                      <ClipboardCheck className="w-8 h-8 text-[#9CA3AF] mx-auto" />
                      <p className="font-bold text-[#1F2937]">No registrations found</p>
                      <p className="text-xs text-[#6B7280]">No matching onboarding requests in this tab scope.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.registration_id} className="hover:bg-[#FAFAFC] transition">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-bold text-[#1F2937] text-xs flex items-center gap-1.5">
                          <span>{item.retailer_name || item.shop_name || "Merchant"}</span>
                        </div>
                        <div className="font-mono text-[10px] text-[#94003A] font-bold mt-0.5">
                          {item.registration_id}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {getEntityTypeBadge(item.entity_type)}
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-xs font-semibold text-[#1F2937]">{item.retailer_name || "--"}</div>
                      <div className="text-[10px] text-[#6B7280] font-mono">{item.mobile_number}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-[#4B5563]">
                            {item.onboarding_step || item.current_step || "Draft"}
                          </span>
                          <span className="font-bold text-[#94003A]">{item.completion_percentage || 0}%</span>
                        </div>
                        <div className="w-24 h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#94003A] rounded-full transition-all"
                            style={{ width: `${item.completion_percentage || 0}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {getApprovalBadge(item.approval_status || item.verification_status)}
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.account_status === "ACTIVE"
                          ? "bg-[#DCFCE7] text-[#166534] border border-emerald-200"
                          : "bg-[#FEF3C7] text-[#92400E] border border-amber-200"
                      }`}>
                        {item.account_status || "PENDING"}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-[#6B7280] font-mono text-[11px]">
                      {item.submitted_at || item.created_at ? new Date(item.submitted_at || item.created_at).toLocaleDateString("en-IN") : "--"}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.onboarding_url && (
                          <button
                            onClick={() => handleCopyLink(item.onboarding_url, item.registration_id)}
                            className="p-1.5 rounded-lg bg-gray-100 hover:bg-[#F8E6EE] text-gray-600 hover:text-[#94003A] transition"
                            title="Copy Onboarding Link"
                          >
                            {copiedId === item.registration_id ? (
                              <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                        <Link
                          href={`/registrations/${(item.entity_type || "retailer").toLowerCase()}/${item.registration_id}`}
                          className="px-2.5 py-1 rounded-lg bg-[#F8E6EE] hover:bg-[#94003A] text-[#94003A] hover:text-white font-bold text-[11px] transition flex items-center gap-1"
                        >
                          <span>Review</span>
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
