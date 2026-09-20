"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  UserPlus,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Check,
  AlertCircle,
  Send,
  X
} from "lucide-react";
import { DistributorAPI, MappedRetailerItem } from "@/services/distributor-api";

export default function MappedRetailersPage() {
  const [retailers, setRetailers] = useState<MappedRetailerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Invitation Modal State
  const [inviteModalOpen, setInviteModalOpen] = useState<boolean>(false);
  const [inviteMobile, setInviteMobile] = useState<string>("");
  const [inviteName, setInviteName] = useState<string>("");
  const [inviteEmail, setInviteEmail] = useState<string>("");
  const [inviteSubmitting, setInviteSubmitting] = useState<boolean>(false);
  const [inviteSuccessData, setInviteSuccessData] = useState<any | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const fetchRetailers = async () => {
    try {
      setRefreshing(true);
      const res = await DistributorAPI.getRetailers({
        search: search || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined
      });
      setRetailers(res?.data || []);
    } catch (err: any) {
      console.error("Fetch retailers error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRetailers();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRetailers();
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteMobile || inviteMobile.trim().length < 10) {
      setInviteError("Please enter a valid 10-digit mobile number.");
      return;
    }
    try {
      setInviteSubmitting(true);
      setInviteError(null);
      const res = await DistributorAPI.inviteRetailer({
        retailer_mobile: inviteMobile.trim(),
        retailer_name: inviteName.trim() || undefined,
        retailer_email: inviteEmail.trim() || undefined
      });
      setInviteSuccessData(res?.data);
    } catch (err: any) {
      setInviteError(err?.response?.data?.detail || "Failed to create invitation. Please try again.");
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const resetInviteModal = () => {
    setInviteModalOpen(false);
    setInviteMobile("");
    setInviteName("");
    setInviteEmail("");
    setInviteSuccessData(null);
    setInviteError(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
            Mapped Retailers
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Manage retailers assigned to your network, monitor live verification status, and configure MDR.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchRetailers}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-amber-400" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setInviteModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-md shadow-amber-500/20 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Invite Retailer
          </button>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-[#111827]/80 backdrop-blur-xl border border-white/[0.08]">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, code, or mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Status:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
          >
            <option value="ALL" className="bg-[#111827]">All Statuses</option>
            <option value="ACTIVE" className="bg-[#111827]">Active</option>
            <option value="PENDING" className="bg-[#111827]">Pending</option>
            <option value="INACTIVE" className="bg-[#111827]">Inactive</option>
          </select>
        </div>
      </div>

      {/* Retailers Data Table or Empty State */}
      <div className="rounded-2xl bg-[#111827]/80 backdrop-blur-xl border border-white/[0.08] overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-400 mx-auto mb-2" />
            Loading network retailers...
          </div>
        ) : retailers.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="h-16 w-16 rounded-2xl bg-amber-500/[0.08] border border-amber-500/20 flex items-center justify-center mx-auto mb-3">
              <Users className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">No retailers mapped yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              You do not have any retailers mapped to your distributor network yet. Invite retailers to join Pay2Pay and they will appear here once registered.
            </p>
            <button
              onClick={() => setInviteModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-md shadow-amber-500/20 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              Invite your first retailer
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/[0.08] bg-white/[0.02]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Retailer</th>
                  <th className="py-3 px-4 font-semibold">Retailer Code</th>
                  <th className="py-3 px-4 font-semibold">Mobile Number</th>
                  <th className="py-3 px-4 font-semibold text-center">Account Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Wallet Balance</th>
                  <th className="py-3 px-4 font-semibold text-right">Volume</th>
                  <th className="py-3 px-4 font-semibold">Created Date</th>
                  <th className="py-3 px-4 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-200">
                {retailers.map((ret) => {
                  const isActive = ret.status === "ACTIVE" && ret.is_active;
                  return (
                    <tr key={ret.retailer_ref_id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white">
                        <div>{ret.owner_name || ret.store_name}</div>
                        {ret.store_name && ret.store_name !== ret.owner_name && (
                          <div className="text-[10px] text-slate-400 font-normal">{ret.store_name}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-amber-300 font-semibold">
                        {ret.retailer_code}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {ret.mobile}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isActive
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {isActive ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {ret.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                        ₹{Number(ret.wallet_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                        ₹{Number(ret.total_volume || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {ret.created_at ? new Date(ret.created_at).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Link
                          href={`/retailers/${ret.retailer_ref_id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/[0.08] hover:bg-amber-500/20 hover:border-amber-500/40 text-amber-300 text-[11px] font-semibold transition-colors"
                        >
                          Details
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Retailer Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={resetInviteModal}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-[#111827] border border-amber-500/30 p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                Invite Retailer to Network
              </h3>
              <button
                onClick={resetInviteModal}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {inviteSuccessData ? (
              <div className="space-y-4 text-center">
                <div className="h-12 w-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Invitation Created Successfully!</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Share this exclusive registration link with the retailer. Once they register, they will be mapped directly to your distributor account.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-left">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                    Registration Deep Link
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-amber-300 font-mono truncate">
                      {inviteSuccessData.invitation_url}
                    </span>
                    <button
                      onClick={() => handleCopyLink(inviteSuccessData.invitation_url)}
                      className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 text-xs shrink-0 flex items-center gap-1"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 p-2 rounded-lg bg-amber-500/[0.05] border border-amber-500/20">
                  <span>Invite Code:</span>
                  <span className="font-mono font-bold text-amber-300">{inviteSuccessData.invite_code}</span>
                </div>

                <button
                  onClick={resetInviteModal}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-sm transition-all"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleInviteSubmit} className="space-y-4 text-left">
                {inviteError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{inviteError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Retailer Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={inviteMobile}
                    onChange={(e) => setInviteMobile(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Retailer Name / Business (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Enter owner or shop name"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Retailer Email (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="name@business.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
                  />
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[11px] text-slate-400">
                  The retailer will complete existing KYC and document verification. Retailer approval remains with Pay2Pay Admin.
                </div>

                <button
                  type="submit"
                  disabled={inviteSubmitting}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {inviteSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Generate & Send Invitation
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
