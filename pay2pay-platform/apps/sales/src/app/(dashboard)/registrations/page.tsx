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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-300 border border-purple-500/30">
            <UserCog className="w-3 h-3" /> SD
          </span>
        );
      case "DISTRIBUTOR":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-300 border border-blue-500/30">
            <UserPlus className="w-3 h-3" /> Dist
          </span>
        );
      case "RETAILER":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            <Store className="w-3 h-3" /> Retailer
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-400">
            {type}
          </span>
        );
    }
  };

  const getApprovalBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <Clock className="w-3 h-3" /> Admin Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight">
                Registrations & KYC Hub
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Tenant-scoped onboarding registry across Super Distributors, Distributors, and Retailers
              </p>
            </div>
          </div>
        </div>

        {/* Quick Register Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/register/super-distributor"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-bold border border-purple-500/30 transition shadow-sm"
          >
            <UserCog className="w-3.5 h-3.5" />
            + Super Dist
          </Link>
          <Link
            href="/register/distributor"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-bold border border-blue-500/30 transition shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            + Distributor
          </Link>
          <Link
            href="/register/retailer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition"
          >
            <Store className="w-3.5 h-3.5" />
            + Retailer Onboarding
          </Link>
        </div>
      </div>

      {/* 11 Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800">
        {REGISTRATION_TABS.map((tab) => {
          const count = counts[tab.id] ?? 0;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition shrink-0 ${
                isActive
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Bar & Refresh */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by store name, business name, code, owner, mobile, PAN, GST..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700/60"
          >
            Search
          </button>
        </form>

        <button
          onClick={fetchRegistrations}
          disabled={loading}
          className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition shrink-0"
          title="Refresh Registrations"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Registrations Registry Table */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4">Entity & Code</th>
                <th className="py-3.5 px-4">Business / Store Name</th>
                <th className="py-3.5 px-4">Authorized Contact</th>
                <th className="py-3.5 px-4">Hierarchy Parent</th>
                <th className="py-3.5 px-4 text-center">KYC Status</th>
                <th className="py-3.5 px-4">Video KYC & Link</th>
                <th className="py-3.5 px-4">Admin Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                      <span>Loading registration entries...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ClipboardCheck className="w-8 h-8 text-slate-600" />
                      <span className="text-sm font-bold text-slate-300">No registrations found</span>
                      <p className="text-xs text-slate-500">
                        Try changing your tab filter or search query, or register a new merchant.
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                items.map((item) => {
                  const typeUrlParam = item.entity_type.toLowerCase();
                  const isCopied = copiedId === item.public_id;
                  return (
                    <tr
                      key={item.public_id}
                      className="hover:bg-slate-800/40 transition group"
                    >
                      {/* Entity & Code */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          {getEntityTypeBadge(item.entity_type)}
                          <span className="font-mono font-bold text-white text-[11px]">
                            {item.code}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Ref: #{item.reference_id}
                        </div>
                      </td>

                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white group-hover:text-indigo-300 transition">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {item.city}, {item.state}
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-200 font-semibold">{item.owner_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                          <span>{item.mobile}</span>
                        </div>
                      </td>

                      {/* Parent */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-300 text-[11px] truncate max-w-[140px]">
                          {item.parent_name}
                        </div>
                      </td>

                      {/* KYC Status */}
                      <td className="py-3.5 px-4 text-center">
                        {item.kyc_status === "VERIFIED" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            <Clock className="w-2.5 h-2.5" /> Pending
                          </span>
                        )}
                      </td>

                      {/* Video KYC Link & Copy Link Button */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.video_kyc_status === "COMPLETED"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-indigo-500/10 text-indigo-300"
                            }`}
                          >
                            <ShieldCheck className="w-3 h-3" />
                            {item.video_kyc_status}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyLink(item.video_kyc_url, item.public_id)}
                            className="p-1.5 rounded-lg bg-slate-950 hover:bg-indigo-600 text-slate-400 hover:text-white border border-slate-800 transition"
                            title="Copy Video KYC URL"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-300" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Admin Approval */}
                      <td className="py-3.5 px-4">
                        {getApprovalBadge(item.approval_status)}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/registrations/${typeUrlParam}/${item.public_id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[11px] font-bold transition shadow-sm"
                        >
                          <Eye className="w-3 h-3 text-indigo-400" />
                          View 360
                        </Link>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <span className="font-bold text-white">{items.length}</span> of{" "}
            <span className="font-bold text-white">{total}</span> records
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-40 transition font-bold"
            >
              Previous
            </button>
            <span className="px-2 font-mono text-slate-300 font-bold">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={items.length < limit || page * limit >= total || loading}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-40 transition font-bold"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
