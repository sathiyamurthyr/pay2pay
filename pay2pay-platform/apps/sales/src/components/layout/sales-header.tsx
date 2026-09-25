"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSalesAuth } from "@/lib/auth";
import { apiClient } from "@/lib/api";
import {
  Search, Bell, Building2, ShieldCheck, UserCircle, LogOut,
  Store, Users, CreditCard, Receipt, ArrowRight, RefreshCw, X,
  Menu, Sparkles, QrCode
} from "lucide-react";

export const SalesHeader: React.FC<{ onMenuClick?: () => void }> = ({ onMenuClick }) => {
  const { user, logout } = useSalesAuth();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setShowSearchModal(true);
    try {
      const res = await apiClient.get(`/sales/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchResults(res.data);
    } catch {
      setSearchResults({ retailers: [], distributors: [], pos_machines: [], transactions: [] });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <header className="h-16 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left side: Mobile Menu Button & Search */}
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Global Search Bar (Tenant-Scoped) */}
        <form onSubmit={handleSearch} className="relative w-48 sm:w-72 lg:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search hierarchy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 sm:pl-10 pr-4 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition"
          />
        </form>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Tenant badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="text-slate-400 font-medium">Tenant:</span>
          <span className="text-white font-semibold truncate max-w-[120px] lg:max-w-[160px]">
            {user?.tenant_name || "Assigned Tenant"}
          </span>
        </div>

        {/* Security badge */}
        <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-400 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Tenant Isolated</span>
          <span className="sm:hidden">Secured</span>
        </div>

        {/* User Info Link */}
        <Link
          href="/profile"
          className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-900 transition"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
            {(user?.full_name || "S").charAt(0).toUpperCase()}
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-bold text-white">{user?.full_name}</div>
            <div className="text-[10px] text-slate-400">{user?.designation || "Sales Executive"}</div>
          </div>
        </Link>
      </div>

      {/* Global Search Results Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-16 sm:pt-20 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Search className="w-4 h-4 text-indigo-400" />
                <span>Search Results for &ldquo;{searchQuery}&rdquo;</span>
              </div>
              <button
                onClick={() => setShowSearchModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
              {isSearching ? (
                <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                  <span>Searching within your authorized hierarchy...</span>
                </div>
              ) : !searchResults ? null : (
                <>
                  {/* Retailers */}
                  {searchResults.retailers?.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold uppercase text-slate-400 flex items-center gap-2">
                        <Store className="w-4 h-4 text-indigo-400" />
                        Retailers ({searchResults.retailers.length})
                      </div>
                      <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
                        {searchResults.retailers.map((r: any) => (
                          <div
                            key={r.public_id}
                            onClick={() => {
                              setShowSearchModal(false);
                              router.push(`/retailers/${r.public_id}`);
                            }}
                            className="p-3 bg-slate-950/60 hover:bg-indigo-950/40 cursor-pointer transition flex items-center justify-between"
                          >
                            <div>
                              <div className="text-xs font-semibold text-white">{r.store_name}</div>
                              <div className="text-[10px] text-slate-400">Code: {r.retailer_code} | Mobile: {r.mobile}</div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-500" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Distributors */}
                  {searchResults.distributors?.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold uppercase text-slate-400 flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-400" />
                        Distributors ({searchResults.distributors.length})
                      </div>
                      <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
                        {searchResults.distributors.map((d: any) => (
                          <div
                            key={d.id}
                            className="p-3 bg-slate-950/60 hover:bg-indigo-950/40 transition flex items-center justify-between"
                          >
                            <div>
                              <div className="text-xs font-semibold text-white">{d.name}</div>
                              <div className="text-[10px] text-slate-400">Code: {d.code} | Mobile: {d.mobile}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Transactions */}
                  {searchResults.transactions?.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold uppercase text-slate-400 flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-indigo-400" />
                        Transactions ({searchResults.transactions.length})
                      </div>
                      <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
                        {searchResults.transactions.map((t: any) => (
                          <div
                            key={t.id}
                            className="p-3 bg-slate-950/60 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-semibold text-white">{t.txn_id}</div>
                              <div className="text-[10px] text-slate-400">{t.service} | Status: {t.status}</div>
                            </div>
                            <div className="font-bold text-indigo-400">₹{t.amount}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.retailers?.length === 0 &&
                    searchResults.distributors?.length === 0 &&
                    searchResults.transactions?.length === 0 && (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        No records found matching &ldquo;{searchQuery}&rdquo; within your authorized hierarchy.
                      </div>
                    )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
