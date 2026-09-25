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

  const userInitial = (user?.full_name || "Vikram").charAt(0).toUpperCase();

  return (
    <header className="h-16 bg-[#94003A] text-white border-b border-[#78002F] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-md">
      {/* Left side: Mobile Menu Button & Search */}
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 rounded-xl bg-[#78002F] text-pink-100 hover:text-white transition"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Global Search Bar (Tenant-Scoped) */}
        <form onSubmit={handleSearch} className="relative w-48 sm:w-72 lg:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-200" />
          <input
            type="text"
            placeholder="Search hierarchy & network..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 sm:pl-10 pr-4 py-2 bg-[#78002F] border border-pink-700/50 rounded-xl text-xs text-white placeholder:text-pink-200/70 focus:outline-none focus:ring-2 focus:ring-[#E7B631] focus:border-[#E7B631] transition"
          />
        </form>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Tenant badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#78002F] border border-pink-700/50 text-xs text-white">
          <Building2 className="w-3.5 h-3.5 text-[#E7B631] shrink-0" />
          <span className="text-pink-200 font-medium">Tenant:</span>
          <span className="text-white font-semibold truncate max-w-[130px] lg:max-w-[200px]">
            {user?.tenant_name || "SUPER REX PRODUCTS PVT LTD"}
          </span>
        </div>

        {/* Security badge */}
        <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-[#E7B631] text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-[#EDC11E]" />
          <span className="hidden sm:inline text-white">Tenant Isolated</span>
          <span className="sm:hidden text-white">Secured</span>
        </div>

        {/* User Info Link */}
        <Link
          href="/profile"
          className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-[#78002F] transition"
        >
          <div className="w-8 h-8 rounded-lg bg-[#E7B631] text-[#94003A] flex items-center justify-center font-extrabold text-xs shadow-md">
            {userInitial}
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-bold text-white">{user?.full_name || "Vikram Rathore"}</div>
            <div className="text-[10px] text-pink-200">{user?.designation || "Area Sales Manager"}</div>
          </div>
        </Link>
      </div>

      {/* Global Search Results Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-16 sm:pt-20 p-4">
          <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl text-[#1F2937]">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-[#F8E6EE]">
              <div className="flex items-center gap-2 text-sm font-bold text-[#94003A]">
                <Search className="w-4 h-4 text-[#94003A]" />
                <span>Search Results for &ldquo;{searchQuery}&rdquo;</span>
              </div>
              <button
                onClick={() => setShowSearchModal(false)}
                className="p-1 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
              {isSearching ? (
                <div className="py-12 text-center text-gray-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-[#94003A]" />
                  <span>Searching within your authorized hierarchy...</span>
                </div>
              ) : !searchResults ? null : (
                <>
                  {/* Retailers */}
                  {searchResults.retailers?.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold uppercase text-[#94003A] flex items-center gap-2">
                        <Store className="w-4 h-4 text-[#94003A]" />
                        Retailers ({searchResults.retailers.length})
                      </div>
                      <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                        {searchResults.retailers.map((r: any) => (
                          <div
                            key={r.public_id}
                            onClick={() => {
                              setShowSearchModal(false);
                              router.push(`/retailers/${r.public_id}`);
                            }}
                            className="p-3 bg-white hover:bg-[#F8E6EE]/50 cursor-pointer transition flex items-center justify-between"
                          >
                            <div>
                              <div className="text-xs font-semibold text-[#1F2937]">{r.store_name}</div>
                              <div className="text-[10px] text-gray-500">Code: {r.retailer_code} | Mobile: {r.mobile}</div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-[#94003A]" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Distributors */}
                  {searchResults.distributors?.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold uppercase text-[#94003A] flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#94003A]" />
                        Distributors ({searchResults.distributors.length})
                      </div>
                      <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                        {searchResults.distributors.map((d: any) => (
                          <div
                            key={d.id}
                            className="p-3 bg-white hover:bg-[#F8E6EE]/50 transition flex items-center justify-between"
                          >
                            <div>
                              <div className="text-xs font-semibold text-[#1F2937]">{d.name}</div>
                              <div className="text-[10px] text-gray-500">Code: {d.code} | Mobile: {d.mobile}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Transactions */}
                  {searchResults.transactions?.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold uppercase text-[#94003A] flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-[#94003A]" />
                        Transactions ({searchResults.transactions.length})
                      </div>
                      <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                        {searchResults.transactions.map((t: any) => (
                          <div
                            key={t.id}
                            className="p-3 bg-white flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-semibold text-[#1F2937]">{t.txn_id}</div>
                              <div className="text-[10px] text-gray-500">{t.service} | Status: {t.status}</div>
                            </div>
                            <div className="font-bold text-[#94003A]">₹{t.amount}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.retailers?.length === 0 &&
                    searchResults.distributors?.length === 0 &&
                    searchResults.transactions?.length === 0 && (
                      <div className="py-8 text-center text-gray-500 text-xs">
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
