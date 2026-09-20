"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  Phone,
  Mail,
  MapPin,
  Wallet
} from "lucide-react";
import { SuperDistributorAPI, MappedDistributorItem } from "@/services/super-distributor-api";

export default function MappedDistributorsPage() {
  const [items, setItems] = useState<MappedDistributorItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageSize] = useState<number>(20);
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDistributors = async (targetPage = page) => {
    try {
      setRefreshing(true);
      setError(null);
      const res = await SuperDistributorAPI.listDistributors({
        page: targetPage,
        page_size: pageSize,
        search: search.trim() || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
      });
      setItems(res.items || []);
      setTotal(res.total || 0);
      setPage(res.page || 1);
      setTotalPages(res.total_pages || 1);
    } catch (err: any) {
      console.error("Error fetching mapped distributors:", err);
      setError(err?.response?.data?.detail || err?.message || "Failed to load distributors.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDistributors(1);
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDistributors(1);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
              Mapped Distributors
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/10 text-amber-300 border border-amber-500/20">
              {total} Total
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            View and manage all active & pending distributors authorized under your Master Hub.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchDistributors(page)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-amber-400" : ""}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/distributors/onboard"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-md shadow-amber-500/20 transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Onboard Distributor</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => fetchDistributors(1)} className="font-bold underline text-rose-200">
            Retry
          </button>
        </div>
      )}

      {/* ── FILTER & SEARCH BAR ── */}
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search code, name, mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {["ALL", "ACTIVE", "PENDING", "SUSPENDED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                statusFilter === st
                  ? "bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold"
                  : "bg-white/[0.03] text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] border border-transparent"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* ── TABLE / LIST ── */}
      <div className="rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.08] overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-white/[0.02] border border-white/[0.04] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Users className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-300">No Distributors Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {search || statusFilter !== "ALL"
                ? "Try adjusting your search criteria or status filter."
                : "No distributors are currently mapped to your Master Hub. Onboard your first partner now!"}
            </p>
            <div className="pt-2">
              <Link
                href="/distributors/onboard"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs hover:brightness-110 shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                <span>Onboard Distributor</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-4">Distributor</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Retailers</th>
                  <th className="p-4 text-right">Wallet Balance</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {items.map((dist) => (
                  <tr key={dist.distributor_ref_id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
                          {dist.business_name?.charAt(0) || "D"}
                        </div>
                        <div>
                          <p className="font-bold text-slate-200">{dist.business_name}</p>
                          <p className="font-mono text-[10px] text-amber-400">{dist.distributor_code}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="space-y-0.5">
                        <p className="text-slate-300 font-medium">{dist.owner_name}</p>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-500" /> {dist.mobile}
                        </p>
                      </div>
                    </td>

                    <td className="p-4">
                      <p className="text-slate-300 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" /> {dist.city || "—"}, {dist.state || "—"}
                      </p>
                    </td>

                    <td className="p-4">
                      {dist.status === "ACTIVE" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : dist.status === "PENDING" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Clock className="w-3 h-3" /> Pending Approval
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <AlertCircle className="w-3 h-3" /> {dist.status}
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      <span className="font-bold text-slate-200">{dist.retailers_count || 0}</span>
                    </td>

                    <td className="p-4 text-right">
                      <span className="font-extrabold text-emerald-400">
                        ₹{(Number(dist.wallet_balance) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </td>

                    <td className="p-4 text-center">
                      <Link
                        href={`/distributors/${dist.distributor_ref_id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-amber-400/20 hover:text-amber-300 text-[11px] font-semibold text-slate-300 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── PAGINATION BAR ── */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-white/[0.08] bg-white/[0.01] flex items-center justify-between text-xs text-slate-400">
            <span>
              Page {page} of {totalPages} ({total} total distributors)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => fetchDistributors(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => fetchDistributors(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
