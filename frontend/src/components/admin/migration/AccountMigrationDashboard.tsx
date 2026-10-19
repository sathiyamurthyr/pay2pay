"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeftRight,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Building2,
  User,
  Wallet,
  Phone,
  Mail,
  Copy,
  Check,
  RefreshCw,
  Lock,
  FileText,
  BadgeCheck,
  Info,
  ChevronRight,
  History,
  Sparkles,
  ExternalLink,
  Store,
  X
} from "lucide-react";
import {
  adminMigrationApi,
  MigrationType,
  SourceAccountItem,
  MigrationHistoryItem,
  ExecuteMigrationResponse
} from "@/services/admin-migration-api";
import { SearchableSelect, SelectOption } from "@/components/ui/searchable-select";

export const AccountMigrationDashboard: React.FC = () => {
  // ─── Active Tab / View ───
  const [activeTab, setActiveTab] = useState<"NEW_MIGRATION" | "HISTORY">("NEW_MIGRATION");

  // ─── Migration Form State ───
  const [migrationType, setMigrationType] = useState<MigrationType>("RETAILER_TO_DISTRIBUTOR");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searching, setSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<SourceAccountItem[]>([]);
  const [selectedSource, setSelectedSource] = useState<SourceAccountItem | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ─── Distributor Filter for Retailers ───
  const [distributorsList, setDistributorsList] = useState<SourceAccountItem[]>([]);
  const [selectedDistributorFilter, setSelectedDistributorFilter] = useState<string>("ALL");

  // ─── Destination Contact Input ───
  const [destinationMobile, setDestinationMobile] = useState<string>("");
  const [destinationEmail, setDestinationEmail] = useState<string>("");
  const [validatingContacts, setValidatingContacts] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    message: string;
  } | null>(null);

  // ─── Confirmation & Execution State ───
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [migrationSuccess, setMigrationSuccess] = useState<ExecuteMigrationResponse | null>(null);
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const [copiedPassword, setCopiedPassword] = useState<boolean>(false);

  // ─── History State ───
  const [historyItems, setHistoryItems] = useState<MigrationHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [historyTotal, setHistoryTotal] = useState<number>(0);
  const [historyTotalPages, setHistoryTotalPages] = useState<number>(1);
  const [historyTypeFilter, setHistoryTypeFilter] = useState<string>("");
  const [historySearch, setHistorySearch] = useState<string>("");

  // ─── Perform Source Search / Load Source Accounts List ───
  const fetchSourceAccounts = useCallback(async (queryParam?: string) => {
    setSearching(true);
    setFetchError(null);
    try {
      const q = queryParam !== undefined ? queryParam : searchQuery;
      const res = await adminMigrationApi.searchSource(migrationType, q, 100);
      setSearchResults(res.data || []);
    } catch (err: any) {
      const errMsg = err?.response?.data?.detail || err?.message || "Failed to load accounts directory.";
      setFetchError(errMsg);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [migrationType, searchQuery]);

  // Load parent distributors list for filtering retailers
  useEffect(() => {
    if (migrationType === "RETAILER_TO_DISTRIBUTOR") {
      adminMigrationApi
        .searchSource("DISTRIBUTOR_TO_SUPER_DISTRIBUTOR", "", 100)
        .then((res) => setDistributorsList(res.data || []))
        .catch(() => {});
    } else {
      setDistributorsList([]);
      setSelectedDistributorFilter("ALL");
    }
  }, [migrationType]);

  // Initial load when migrationType changes or tab opens
  useEffect(() => {
    fetchSourceAccounts("");
  }, [migrationType, fetchSourceAccounts]);

  // Debounced search when user types in search query
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSourceAccounts(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchSourceAccounts]);

  // ─── Reset Form when changing migration type ───
  const handleTypeChange = (type: MigrationType) => {
    setMigrationType(type);
    setSelectedSource(null);
    setSearchQuery("");
    setSelectedDistributorFilter("ALL");
    setDestinationMobile("");
    setDestinationEmail("");
    setValidationResult(null);
    setMigrationError(null);
    setFetchError(null);
  };

  // ─── Validate Destination Contacts ───
  const handleValidateContacts = async () => {
    if (!destinationMobile.trim() || !destinationEmail.trim()) {
      setValidationResult({
        valid: false,
        message: "Please enter both a new mobile number and email address."
      });
      return;
    }
    setValidatingContacts(true);
    setValidationResult(null);
    try {
      const res = await adminMigrationApi.validateContacts({
        migration_type: migrationType,
        mobile: destinationMobile,
        email: destinationEmail
      });
      setValidationResult({
        valid: res.valid,
        message: res.message
      });
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Validation failed or contact already in use.";
      setValidationResult({
        valid: false,
        message: msg
      });
    } finally {
      setValidatingContacts(false);
    }
  };

  // ─── Execute Migration ───
  const handleExecuteMigration = async () => {
    if (!selectedSource) return;
    setIsExecuting(true);
    setMigrationError(null);
    try {
      const res = await adminMigrationApi.executeMigration({
        migration_type: migrationType,
        source_identifier: selectedSource.code,
        new_mobile: destinationMobile,
        new_email: destinationEmail,
        confirmation_ack: true
      });
      setMigrationSuccess(res);
      setIsConfirmModalOpen(false);
      fetchHistory();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Migration execution failed. All changes have been safely rolled back.";
      setMigrationError(msg);
      setIsConfirmModalOpen(false);
    } finally {
      setIsExecuting(false);
    }
  };

  // ─── Fetch History ───
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await adminMigrationApi.getHistory({
        migration_type: (historyTypeFilter as MigrationType) || undefined,
        search: historySearch || undefined,
        page: historyPage,
        limit: 10
      });
      setHistoryItems(res.items || []);
      setHistoryTotal(res.total_records || 0);
      setHistoryTotalPages(res.total_pages || 1);
    } catch {
      setHistoryItems([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyTypeFilter, historySearch, historyPage]);

  useEffect(() => {
    if (activeTab === "HISTORY") {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  return (
    <div className="w-full min-h-screen bg-white text-slate-900 p-4 sm:p-6 lg:p-8 font-sans space-y-6">
      {/* ─── Top Header ─── */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 shadow-md shadow-indigo-500/20">
                <ArrowLeftRight className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
                  Account Migration Hub
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Admin Exclusive
                  </span>
                </h1>
                <p className="text-xs font-medium text-slate-500 mt-1">
                  Controlled hierarchical elevation (Retailer → Distributor → Super Distributor) with strict data preservation and ₹0.00 opening balance.
                </p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab("NEW_MIGRATION")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "NEW_MIGRATION"
                  ? "bg-white text-indigo-700 shadow-sm border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              New Migration
            </button>
            <button
              onClick={() => setActiveTab("HISTORY")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "HISTORY"
                  ? "bg-white text-indigo-700 shadow-sm border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Audit & History
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* ─── TAB 1: NEW MIGRATION WORKFLOW ─── */}
        {activeTab === "NEW_MIGRATION" && (
          <div className="space-y-6">
            {/* Step 1: Migration Type Selector */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">1</span>
                Select Migration Workflow
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleTypeChange("RETAILER_TO_DISTRIBUTOR")}
                  className={`relative p-5 rounded-2xl border text-left transition-all ${
                    migrationType === "RETAILER_TO_DISTRIBUTOR"
                      ? "bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm"
                      : "bg-slate-50/60 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">Retailer</span>
                        <ArrowLeftRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">Distributor</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-2">Retailer → Distributor</h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Elevates a proven retail merchant to partner distributor. Preserves existing retailer records and initializes ₹0.00 distributor ledger.
                      </p>
                    </div>
                    {migrationType === "RETAILER_TO_DISTRIBUTOR" && (
                      <CheckCircle2 className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleTypeChange("DISTRIBUTOR_TO_SUPER_DISTRIBUTOR")}
                  className={`relative p-5 rounded-2xl border text-left transition-all ${
                    migrationType === "DISTRIBUTOR_TO_SUPER_DISTRIBUTOR"
                      ? "bg-purple-50/70 border-purple-500 ring-2 ring-purple-500/20 shadow-sm"
                      : "bg-slate-50/60 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">Distributor</span>
                        <ArrowLeftRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">Super Distributor</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-2">Distributor → Super Distributor</h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Elevates high-volume distributor to master territorial network entity. Preserves distributor historical data and sets opening balance to ₹0.00.
                      </p>
                    </div>
                    {migrationType === "DISTRIBUTOR_TO_SUPER_DISTRIBUTOR" && (
                      <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0" />
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Step 2: Search & Select Source Account */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">2</span>
                  Select Source {migrationType === "RETAILER_TO_DISTRIBUTOR" ? "Retailer" : "Distributor"}
                </h2>
                {!selectedSource && (
                  <span className="text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                    {searching ? (
                      <span className="flex items-center gap-1.5 text-indigo-600">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Searching directory...
                      </span>
                    ) : (
                      <span>{searchResults.length} {migrationType === "RETAILER_TO_DISTRIBUTOR" ? "retailers" : "distributors"} available</span>
                    )}
                  </span>
                )}
              </div>

              {!selectedSource ? (
                <div className="space-y-4">
                  {/* Searchable Select Dropdown (same as Distributor search option) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-xs">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span>
                          {migrationType === "RETAILER_TO_DISTRIBUTOR" ? "Retailer Search Option" : "Distributor Search Option"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal lowercase">type to search</span>
                      </label>
                      <SearchableSelect
                        options={searchResults.map((item) => ({
                          value: item.code,
                          label: `${item.business_name} (${item.code})`,
                          subtext: `Owner: ${item.name} | Mobile: ${item.mobile || "N/A"}${item.pan_number ? ` | PAN: ${item.pan_number}` : ""}${item.already_migrated ? " [ALREADY MIGRATED]" : ""}`,
                        }))}
                        value={selectedSource?.code || ""}
                        onChange={(val) => {
                          const found = searchResults.find((s) => s.code === val);
                          if (found) {
                            if (found.already_migrated) {
                              alert(`Account ${found.code} has already been migrated to ${found.destination_code}.`);
                            } else {
                              setSelectedSource(found);
                            }
                          }
                        }}
                        placeholder={
                          searching
                            ? "Loading directory..."
                            : `-- Search and select ${migrationType === "RETAILER_TO_DISTRIBUTOR" ? "retailer" : "distributor"} from list --`
                        }
                        searchPlaceholder={`Search ${migrationType === "RETAILER_TO_DISTRIBUTOR" ? "retailer" : "distributor"} by business name, code, owner, mobile, PAN...`}
                        disabled={searching}
                      />
                    </div>

                    {/* Filter Retailers by Parent Distributor when RETAILER_TO_DISTRIBUTOR */}
                    {migrationType === "RETAILER_TO_DISTRIBUTOR" ? (
                      <div>
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                          <span>Distributor Search Option (Filter Retailers)</span>
                          <span className="text-[10px] text-slate-400 font-normal lowercase">optional filter</span>
                        </label>
                        <SearchableSelect
                          options={[
                            { value: "ALL", label: "All Distributors (Show all retailers)" },
                            ...distributorsList.map((d) => ({
                              value: d.code,
                              label: `${d.business_name} (${d.code})`,
                              subtext: `Owner: ${d.name} | Mobile: ${d.mobile || "N/A"}`,
                            })),
                          ]}
                          value={selectedDistributorFilter}
                          onChange={(val) => {
                            setSelectedDistributorFilter(val);
                            if (val === "ALL") {
                              fetchSourceAccounts("");
                            } else {
                              fetchSourceAccounts(val);
                            }
                          }}
                          placeholder="All Distributors"
                          searchPlaceholder="Search distributor by code, store, name..."
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                          Elevation Target
                        </label>
                        <div className="text-xs text-slate-600 py-2.5 px-3 bg-white rounded-xl border border-slate-200">
                          Elevates selected distributor to <strong className="text-purple-700">Super Distributor</strong>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Error State with Retry Button */}
                  {fetchError && (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>{fetchError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => fetchSourceAccounts()}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold transition-all shadow-xs"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {/* Search Bar with Clear & Refresh */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`Quick keyword filter: Search ${migrationType === "RETAILER_TO_DISTRIBUTOR" ? "Retailers" : "Distributors"} by Code, Name, Store, Mobile, Email, PAN...`}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="absolute right-3.5 top-3 w-4 h-4 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fetchSourceAccounts(searchQuery)}
                      disabled={searching}
                      className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${searching ? "animate-spin text-indigo-600" : ""}`} />
                      <span className="hidden sm:inline">Refresh</span>
                    </button>
                  </div>

                  {/* Retailer / Distributor List Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <div className="max-h-96 overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-50/90 sticky top-0 z-10 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="py-3 px-4">{migrationType === "RETAILER_TO_DISTRIBUTOR" ? "Retailer & Store" : "Distributor"}</th>
                            <th className="py-3 px-4">Owner & Contact</th>
                            <th className="py-3 px-4">KYC & Location</th>
                            <th className="py-3 px-4 text-right">Preserved Balance</th>
                            <th className="py-3 px-4 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {searchResults.map((item) => (
                            <tr
                              key={item.id}
                              onClick={() => {
                                if (!item.already_migrated) {
                                  setSelectedSource(item);
                                }
                              }}
                              className={`transition-colors ${
                                item.already_migrated
                                  ? "bg-slate-50/50 opacity-60 cursor-not-allowed"
                                  : "hover:bg-indigo-50/40 cursor-pointer"
                              }`}
                            >
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex-shrink-0">
                                    {migrationType === "RETAILER_TO_DISTRIBUTOR" ? (
                                      <Store className="w-4 h-4" />
                                    ) : (
                                      <Building2 className="w-4 h-4" />
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-900">{item.business_name}</div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/60">
                                        {item.code}
                                      </span>
                                      <span className="text-[10px] text-slate-400">ID #{item.account_ref_id}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-slate-800">{item.name}</div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  <span>{item.mobile || "—"}</span>
                                </div>
                                {item.email && (
                                  <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 truncate max-w-[180px]">
                                    <Mail className="w-3 h-3 text-slate-400" />
                                    <span>{item.email}</span>
                                  </div>
                                )}
                              </td>

                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                      item.kyc_status === "VERIFIED"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : "bg-amber-50 text-amber-700 border-amber-200"
                                    }`}
                                  >
                                    KYC: {item.kyc_status}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-600 font-mono mt-1">
                                  PAN: {item.pan_number || "—"}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {item.city ? `${item.city}, ${item.state}` : (item.state || "India")}
                                </div>
                              </td>

                              <td className="py-3.5 px-4 text-right">
                                <span className="font-bold text-emerald-700 text-sm block">
                                  ₹{item.current_wallet_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </span>
                                <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">
                                  Untouched Ledger
                                </span>
                              </td>

                              <td className="py-3.5 px-4 text-center">
                                {item.already_migrated ? (
                                  <div className="space-y-0.5">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                      <AlertTriangle className="w-3 h-3" /> Already Migrated
                                    </span>
                                    <span className="block text-[10px] font-mono font-semibold text-slate-500">
                                      → {item.destination_code}
                                    </span>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedSource(item);
                                    }}
                                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs hover:shadow inline-flex items-center gap-1"
                                  >
                                    Select
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}

                          {searchResults.length === 0 && !searching && (
                            <tr>
                              <td colSpan={5} className="py-12 text-center">
                                <div className="max-w-xs mx-auto text-slate-400 space-y-2">
                                  <Search className="w-8 h-8 mx-auto text-slate-300" />
                                  <p className="text-xs font-semibold text-slate-600">
                                    {searchQuery ? `No matching accounts found for "${searchQuery}"` : `No ${migrationType === "RETAILER_TO_DISTRIBUTOR" ? "retailers" : "distributors"} available.`}
                                  </p>
                                  <p className="text-[11px] text-slate-400">
                                    Try searching by name, store name, mobile number, code, or PAN.
                                  </p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Selected Source Account Card (Read-Only) */}
              {selectedSource && (
                <div className="mt-4 bg-slate-50 border border-indigo-200 rounded-2xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-bl-xl shadow-xs">
                    Selected Source Account (Read-Only)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Identity & Hierarchy</span>
                      <p className="text-sm font-bold text-slate-900 mt-1">{selectedSource.business_name}</p>
                      <p className="text-xs font-mono font-semibold text-indigo-700">{selectedSource.code}</p>
                      <p className="text-xs text-slate-700 mt-1">Owner: {selectedSource.name}</p>
                      <p className="text-xs text-slate-500">Location: {selectedSource.city}, {selectedSource.state} ({selectedSource.pincode})</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Eligible Reusable KYC</span>
                      <div className="mt-1 space-y-0.5 text-xs">
                        <p className="text-slate-700"><span className="text-slate-400 font-medium">PAN:</span> <span className="font-mono font-semibold">{selectedSource.pan_number || "N/A"}</span></p>
                        <p className="text-slate-700"><span className="text-slate-400 font-medium">GST:</span> <span className="font-mono font-semibold">{selectedSource.gst_number || "N/A"}</span></p>
                        <p className="text-slate-700"><span className="text-slate-400 font-medium">Bank:</span> <span className="font-mono font-semibold">{selectedSource.bank_account || "N/A"}</span> ({selectedSource.ifsc || "N/A"})</p>
                        <p className="text-emerald-700 font-semibold flex items-center gap-1 mt-1 text-[11px]">
                          <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" /> KYC Inheritance Permitted
                        </p>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Preserved Source Wallet</span>
                        <p className="text-lg font-black text-emerald-700 mt-0.5">
                          ₹{selectedSource.current_wallet_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[11px] text-amber-700 flex items-center gap-1 mt-1 font-medium">
                          <Lock className="w-3 h-3 flex-shrink-0 text-amber-600" />
                          Source wallet will NOT be transferred or altered.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSource(null);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs self-start mt-3"
                      >
                        ← Change / Reselect {migrationType === "RETAILER_TO_DISTRIBUTOR" ? "Retailer" : "Distributor"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Destination Contact Details & Validation */}
            {selectedSource && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">3</span>
                  Enter Destination Contact Details
                </h2>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-5 flex items-start gap-3">
                  <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-900 leading-relaxed">
                    <strong>Strict Security Invariant:</strong> The destination account must have its own distinct mobile number and email address. Source credentials and contact details are NEVER copied. Destination user will receive credentials at these contact details.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      New Destination Mobile Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="tel"
                        maxLength={10}
                        value={destinationMobile}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                          setDestinationMobile(val);
                          setValidationResult(null);
                        }}
                        placeholder="10-digit Indian Mobile (e.g. 9876543210)"
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono shadow-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      New Destination Email Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        value={destinationEmail}
                        onChange={(e) => {
                          setDestinationEmail(e.target.value);
                          setValidationResult(null);
                        }}
                        placeholder="corporate@partner-network.in"
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono shadow-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Validation Feedback */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleValidateContacts}
                    disabled={validatingContacts || !destinationMobile || !destinationEmail}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 transition-all flex items-center gap-2"
                  >
                    {validatingContacts && <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />}
                    Check Platform Uniqueness
                  </button>

                  {validationResult && (
                    <div
                      className={`text-xs font-medium px-3.5 py-1.5 rounded-lg border flex items-center gap-2 ${
                        validationResult.valid
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-rose-50 text-rose-800 border-rose-200"
                      }`}
                    >
                      {validationResult.valid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      )}
                      <span>{validationResult.message}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Review Invariants & Execute */}
            {selectedSource && validationResult?.valid && (
              <div className="bg-gradient-to-br from-white to-indigo-50/50 border border-indigo-200 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5 mb-5">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">4</span>
                      Confirm Migration Invariants & Execute
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Review key operational parameters prior to admin atomic execution.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-white border border-slate-200 px-3.5 py-2 rounded-xl text-right shadow-2xs">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Destination Opening Balance</span>
                      <span className="text-sm font-black text-emerald-700">₹0.00 (Zero)</span>
                    </div>
                    <div className="bg-white border border-slate-200 px-3.5 py-2 rounded-xl text-right shadow-2xs">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Approval Flow</span>
                      <span className="text-sm font-black text-indigo-700">Immediate Auto-Approved</span>
                    </div>
                  </div>
                </div>

                {migrationError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-4 rounded-xl mb-5 flex items-start gap-3">
                    <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Migration Error</p>
                      <p className="mt-0.5">{migrationError}</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsConfirmModalOpen(true)}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Review & Execute Migration
                  </button>
                </div>
              </div>
            )}

            {/* Success Feedback Banner/Card */}
            {migrationSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 shadow-sm animate-in fade-in duration-300">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-700 flex-shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Migration Completed Successfully</span>
                      <h3 className="text-lg font-black text-slate-900 mt-0.5">
                        {migrationSuccess.destination_account.role} Account Created
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Reference No: <span className="font-mono text-emerald-800 font-bold">{migrationSuccess.migration_reference_no}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMigrationSuccess(null)}
                    className="text-xs text-slate-500 hover:text-slate-800 px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs"
                  >
                    Dismiss
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5 pt-4 border-t border-emerald-200/80">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">New Destination Code</span>
                    <span className="text-base font-mono font-bold text-indigo-700 block mt-1">
                      {migrationSuccess.destination_account.code}
                    </span>
                    <span className="text-xs text-emerald-700 font-semibold">Status: ACTIVE (Auto-Approved)</span>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Opening Wallet Balance</span>
                    <span className="text-base font-mono font-bold text-emerald-700 block mt-1">
                      ₹{migrationSuccess.destination_account.opening_balance}
                    </span>
                    <span className="text-xs text-slate-500">Strictly ₹0.00 Opening</span>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs relative">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Temporary Password</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm font-mono font-bold text-amber-700">
                        {migrationSuccess.destination_account.temporary_password || "Generated & Sent"}
                      </span>
                      {migrationSuccess.destination_account.temporary_password && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(migrationSuccess.destination_account.temporary_password!)}
                          className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all border border-slate-200"
                          title="Copy temporary password"
                        >
                          {copiedPassword ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">Require password reset on first login</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: AUDIT & HISTORY ─── */}
        {activeTab === "HISTORY" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Migration Audit Trail</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete immutable history of all admin-executed account migrations with audit linkages.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={historyTypeFilter}
                  onChange={(e) => {
                    setHistoryTypeFilter(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="bg-white border border-slate-200 text-xs text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
                >
                  <option value="">All Types</option>
                  <option value="RETAILER_TO_DISTRIBUTOR">Retailer → Distributor</option>
                  <option value="DISTRIBUTOR_TO_SUPER_DISTRIBUTOR">Distributor → Super Distributor</option>
                </select>

                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => {
                      setHistorySearch(e.target.value);
                      setHistoryPage(1);
                    }}
                    placeholder="Search ref or code..."
                    className="bg-white border border-slate-200 text-xs text-slate-900 rounded-xl pl-8 pr-3 py-2 w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
                  />
                </div>

                <button
                  onClick={fetchHistory}
                  disabled={historyLoading}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-all shadow-xs"
                  title="Refresh history"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? "animate-spin text-indigo-600" : ""}`} />
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-3.5">Ref No</th>
                    <th className="py-3 px-3.5">Type</th>
                    <th className="py-3 px-3.5">Source Account</th>
                    <th className="py-3 px-3.5">Destination Account</th>
                    <th className="py-3 px-3.5">Opening Bal</th>
                    <th className="py-3 px-3.5">Approval</th>
                    <th className="py-3 px-3.5">Admin</th>
                    <th className="py-3 px-3.5">Timestamp</th>
                    <th className="py-3 px-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs bg-white">
                  {historyLoading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-600 mb-2" />
                        Loading migration history...
                      </td>
                    </tr>
                  ) : historyItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-slate-400">
                        No migration history records found.
                      </td>
                    </tr>
                  ) : (
                    historyItems.map((item) => (
                      <tr key={item.migration_history_ref_id} className="hover:bg-slate-50/70 transition-all">
                        <td className="py-3 px-3.5 font-mono font-semibold text-slate-800">
                          {item.migration_reference_no}
                        </td>
                        <td className="py-3 px-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.migration_type === "RETAILER_TO_DISTRIBUTOR"
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                : "bg-purple-50 text-purple-700 border border-purple-200"
                            }`}
                          >
                            {item.migration_type === "RETAILER_TO_DISTRIBUTOR" ? "RET → DIST" : "DIST → SD"}
                          </span>
                        </td>
                        <td className="py-3 px-3.5">
                          <span className="font-mono font-bold text-slate-900">{item.source_account_code}</span>
                          <span className="block text-[10px] text-slate-400">{item.source_role}</span>
                        </td>
                        <td className="py-3 px-3.5">
                          <span className="font-mono font-bold text-indigo-700">
                            {item.destination_account_code || "N/A"}
                          </span>
                          <span className="block text-[10px] text-slate-500">{item.destination_mobile}</span>
                        </td>
                        <td className="py-3 px-3.5 font-mono text-emerald-700 font-bold">
                          ₹{Number(item.opening_balance).toFixed(2)}
                        </td>
                        <td className="py-3 px-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {item.auto_approval_status}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-slate-600 font-medium">
                          {item.admin_username}
                        </td>
                        <td className="py-3 px-3.5 text-slate-500 text-[11px]">
                          {new Date(item.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.status === "COMPLETED"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-rose-50 text-rose-800 border border-rose-200"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {historyTotalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">
                  Showing page {historyPage} of {historyTotalPages} ({historyTotal} records)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    disabled={historyPage === 1}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold disabled:opacity-40 hover:bg-slate-200 border border-slate-200"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                    disabled={historyPage === historyTotalPages}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold disabled:opacity-40 hover:bg-slate-200 border border-slate-200"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── CONFIRMATION MODAL ─── */}
      {isConfirmModalOpen && selectedSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Confirm Account Migration</h3>
                  <p className="text-xs text-slate-500">Admin Authorization Required</p>
                </div>
              </div>
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Workflow:</span>
                <span className="font-bold text-slate-900">
                  {migrationType === "RETAILER_TO_DISTRIBUTOR" ? "Retailer → Distributor" : "Distributor → Super Distributor"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Source Account:</span>
                <span className="font-mono text-indigo-700 font-bold">{selectedSource.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Source Balance (Untouched):</span>
                <span className="font-mono text-emerald-700 font-bold">
                  ₹{selectedSource.current_wallet_balance.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Destination Mobile:</span>
                <span className="font-mono font-semibold text-slate-900">{destinationMobile}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Destination Email:</span>
                <span className="font-mono font-semibold text-slate-900">{destinationEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Destination Opening Balance:</span>
                <span className="font-mono text-emerald-700 font-black">₹0.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Approval Policy:</span>
                <span className="text-emerald-700 font-bold">Immediate Auto-Approved</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              By confirming, a separate account with a new unique reference ID will be created and linked for auditability. The original source account and its historical records will remain untouched.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isExecuting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteMigration}
                disabled={isExecuting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-2"
              >
                {isExecuting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Executing Migration...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirm & Execute
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountMigrationDashboard;
