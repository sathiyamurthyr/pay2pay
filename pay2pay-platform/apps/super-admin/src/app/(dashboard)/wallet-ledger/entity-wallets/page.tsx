"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { DataTable, type TableColumn } from "@/components/ui/data-table";
import {
  Layers,
  Building2,
  Users,
  Store,
  Wallet,
  Search,
  CheckCircle2,
  Lock,
  Unlock,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  RotateCcw,
  Sliders,
  DollarSign,
  TrendingUp,
  Landmark,
  User,
  Phone,
  Mail,
  Receipt,
  Sparkles,
  ChevronDown,
  X,
  Copy,
  Check,
  ArrowLeftRight,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";

// ─── Entity Scope Options ───────────────────────────────────────────────────
const ENTITY_SCOPES = [
  { id: "SUPER_DISTRIBUTOR", label: "Super Distributor (SD)", icon: Building2, color: "#D97706", badgeBg: "#FEF3C7", badgeText: "#B45309" },
  { id: "DISTRIBUTOR",       label: "Distributor",            icon: Users,     color: "#2563EB", badgeBg: "#EFF6FF", badgeText: "#2563EB" },
  { id: "RETAILER",          label: "Retailer Outlet",        icon: Store,     color: "#16A34A", badgeBg: "#F0FDF4", badgeText: "#16A34A" },
];

// ─── Default Master Entities Dataset ───────────────────────────────────────
const MASTER_ENTITIES_DEFAULTS: Record<string, any[]> = {
  SUPER_DISTRIBUTOR: [
    {
      id: "sd-1002",
      name: "South India Super Network (sathus-SD)",
      code: "SD-1002",
      phone: "+91 98401 23456",
      email: "sd.south@pay2pay.in",
      location: "Chennai, Tamil Nadu",
      kyc_status: "VERIFIED",
      main_balance: 1250000.0,
      hold_balance: 50000.0,
      pending_settlement: 75000.0,
      comm_balance: 185000.0,
      escrow_deposit: 100000.0,
      total_tds_deducted: 9250.0,
    },
    {
      id: "sd-1003",
      name: "North Apex Network",
      code: "SD-1003",
      phone: "+91 98110 88221",
      email: "sd.north@pay2pay.in",
      location: "New Delhi, Delhi",
      kyc_status: "VERIFIED",
      main_balance: 600000.0,
      hold_balance: 20000.0,
      pending_settlement: 35000.0,
      comm_balance: 92000.0,
      escrow_deposit: 50000.0,
      total_tds_deducted: 4600.0,
    },
  ],
  DISTRIBUTOR: [
    {
      id: "dist-5012",
      name: "Metro Apex Distributors",
      code: "DIST-5012",
      parent_sd: "South India Super Network (SD-1002)",
      phone: "+91 94440 55112",
      email: "metro.dist@pay2pay.in",
      location: "Coimbatore, Tamil Nadu",
      kyc_status: "VERIFIED",
      main_balance: 780000.0,
      hold_balance: 25000.0,
      pending_settlement: 42000.0,
      comm_balance: 95000.0,
      escrow_deposit: 30000.0,
      total_tds_deducted: 4750.0,
    },
    {
      id: "dist-5013",
      name: "City Digital Services",
      code: "DIST-5013",
      parent_sd: "South India Super Network (SD-1002)",
      phone: "+91 98412 99334",
      email: "city.digital@pay2pay.in",
      location: "Madurai, Tamil Nadu",
      kyc_status: "VERIFIED",
      main_balance: 460000.0,
      hold_balance: 15000.0,
      pending_settlement: 28000.0,
      comm_balance: 54000.0,
      escrow_deposit: 20000.0,
      total_tds_deducted: 2700.0,
    },
    {
      id: "dist-5014",
      name: "Northern Telecoms",
      code: "DIST-5014",
      parent_sd: "North Apex Network (SD-1003)",
      phone: "+91 98100 44112",
      email: "north.telecom@pay2pay.in",
      location: "Noida, Uttar Pradesh",
      kyc_status: "VERIFIED",
      main_balance: 320000.0,
      hold_balance: 10000.0,
      pending_settlement: 18000.0,
      comm_balance: 38000.0,
      escrow_deposit: 15000.0,
      total_tds_deducted: 1900.0,
    },
  ],
  RETAILER: [
    {
      id: "ret-10928",
      name: "Sathus Pay Store",
      code: "RET-10928",
      parent_dist: "Metro Apex Distributors (DIST-5012)",
      parent_sd: "South India Super Network (SD-1002)",
      phone: "+91 91766 69426",
      email: "sathus.store@pay2pay.in",
      location: "T-Nagar, Chennai",
      kyc_status: "VERIFIED",
      main_balance: 49680.53,
      hold_balance: 0.0,
      pending_settlement: 0.0,
      comm_balance: 28500.0,
      escrow_deposit: 10000.0,
      total_tds_deducted: 1425.0,
    },
    {
      id: "ret-10929",
      name: "Apex Communications",
      code: "RET-10929",
      parent_dist: "Metro Apex Distributors (DIST-5012)",
      parent_sd: "South India Super Network (SD-1002)",
      phone: "+91 98400 11223",
      email: "apex.comm@pay2pay.in",
      location: "Velachery, Chennai",
      kyc_status: "VERIFIED",
      main_balance: 192400.0,
      hold_balance: 10000.0,
      pending_settlement: 18500.0,
      comm_balance: 19200.0,
      escrow_deposit: 5000.0,
      total_tds_deducted: 960.0,
    },
    {
      id: "ret-10930",
      name: "Om Sai Mobile",
      code: "RET-10930",
      parent_dist: "City Digital Services (DIST-5013)",
      parent_sd: "South India Super Network (SD-1002)",
      phone: "+91 94430 88776",
      email: "omsai.mob@pay2pay.in",
      location: "KK Nagar, Madurai",
      kyc_status: "VERIFIED",
      main_balance: 168000.0,
      hold_balance: 5000.0,
      pending_settlement: 12000.0,
      comm_balance: 14800.0,
      escrow_deposit: 5000.0,
      total_tds_deducted: 740.0,
    },
    {
      id: "ret-10931",
      name: "Karthik General Store",
      code: "RET-10931",
      parent_dist: "Northern Telecoms (DIST-5014)",
      parent_sd: "North Apex Network (SD-1003)",
      phone: "+91 98111 66554",
      email: "karthik.store@pay2pay.in",
      location: "Sector 18, Noida",
      kyc_status: "VERIFIED",
      main_balance: 284300.0,
      hold_balance: 20000.0,
      pending_settlement: 25000.0,
      comm_balance: 31200.0,
      escrow_deposit: 10000.0,
      total_tds_deducted: 1560.0,
    },
  ],
};

// ─── Searchable Entity Select Dropdown ──────────────────────────────────────
function SearchableEntityPicker({
  entities,
  selected,
  onSelect,
}: {
  entities: any[];
  selected: any | null;
  onSelect: (item: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query) return entities;
    const q = query.toLowerCase();
    return entities.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.code.toLowerCase().includes(q) ||
        (e.phone || "").toLowerCase().includes(q)
    );
  }, [entities, query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between rounded-2xl border border-[#CBD5E1] bg-white px-4 py-3 text-xs font-bold text-[#0F172A] hover:border-[#2563EB] focus:outline-none transition-all shadow-2xs cursor-pointer"
      >
        <span className={selected ? "text-[#0F172A] font-extrabold" : "text-[#94A3B8]"}>
          {selected ? `${selected.name} (${selected.code})` : "Click to choose entity user from list..."}
        </span>
        <ChevronDown className={`w-4 h-4 text-[#64748B] flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-2xl border border-[#CBD5E1] bg-white shadow-2xl overflow-hidden py-1">
          <div className="p-3 border-b border-[#F1F5F9] bg-[#F8FAFC]">
            <div className="flex items-center gap-2 bg-white border border-[#CBD5E1] rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-[#94A3B8]" />
              <input
                autoFocus
                type="text"
                placeholder="Search entity by name, code, phone..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-xs font-semibold text-[#0F172A] focus:outline-none placeholder-[#94A3B8]"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")}>
                  <X className="w-3.5 h-3.5 text-[#94A3B8]" />
                </button>
              )}
            </div>
          </div>

          <ul className="max-h-64 overflow-y-auto py-1 divide-y divide-[#F1F5F9]">
            {filtered.length === 0 ? (
              <li className="px-4 py-4 text-xs text-[#94A3B8] text-center font-medium">No matching entities found</li>
            ) : (
              filtered.map((item) => (
                <li
                  key={item.id}
                  onClick={() => {
                    onSelect(item);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`flex items-center justify-between px-4 py-3 text-xs cursor-pointer hover:bg-[#EFF6FF] transition-colors ${
                    selected?.id === item.id ? "bg-[#EFF6FF] font-extrabold text-[#2563EB]" : "text-[#0F172A]"
                  }`}
                >
                  <div>
                    <p className="font-bold text-xs text-[#0F172A]">{item.name}</p>
                    <p className="font-mono text-[10px] font-bold text-[#2563EB]">{item.code} · {item.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs font-extrabold text-[#15803D]">
                      ₹{(item.main_balance || 0).toLocaleString("en-IN")}
                    </p>
                    <span className="text-[10px] text-[#64748B] font-semibold">Available</span>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function EntityWalletsPage() {
  const router = useRouter();
  const [scope, setScope] = useState<string>("RETAILER");
  const [entitiesMap, setEntitiesMap] = useState<Record<string, any[]>>(MASTER_ENTITIES_DEFAULTS);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Per-Wallet Freeze Lock State: { [entityCode]: { MAIN?: { frozen: bool, reason: str }, COMMISSION?: {...}, HOLD?: {...}, ALL?: {...} } }
  const [frozenWalletsMap, setFrozenWalletsMap] = useState<Record<string, Record<string, { frozen: boolean; reason?: string; timestamp?: string }>>>({});
  
  // Freeze Modal State
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [targetWalletToFreeze, setTargetWalletToFreeze] = useState<string>("ALL"); // "ALL" | "MAIN" | "COMMISSION" | "HOLD"
  const [freezeReason, setFreezeReason] = useState("Compliance Audit Lock");

  // Load live balances & per-wallet freeze states from localStorage
  const refreshWalletsFromStorage = () => {
    let masterWallets: any[] = [];
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("pay2pay_entity_wallets");
      if (stored) {
        try { masterWallets = JSON.parse(stored); } catch (e) {}
      }
      const storedFrozen = localStorage.getItem("pay2pay_frozen_wallets_per_type");
      if (storedFrozen) {
        try { setFrozenWalletsMap(JSON.parse(storedFrozen)); } catch (e) {}
      }
    }

    const merged = { ...MASTER_ENTITIES_DEFAULTS };

    // Update balances dynamically for each scope
    Object.keys(merged).forEach((sc) => {
      merged[sc] = merged[sc].map((item) => {
        const storedWallet = masterWallets.find((w: any) => w.entity_code === item.code);
        if (storedWallet && typeof storedWallet.balance === "number") {
          return {
            ...item,
            main_balance: storedWallet.balance,
            hold_balance: typeof storedWallet.hold_balance === "number" ? storedWallet.hold_balance : item.hold_balance,
            pending_settlement: typeof storedWallet.pending_settlement === "number" ? storedWallet.pending_settlement : item.pending_settlement,
          };
        }
        return item;
      });
    });

    setEntitiesMap(merged);
  };

  useEffect(() => {
    refreshWalletsFromStorage();
    const handleUpdate = () => refreshWalletsFromStorage();
    window.addEventListener("pay2pay_wallets_updated", handleUpdate);

    async function loadLiveWallets() {
      try {
        const [retRes, distRes, sdRes, walRes] = await Promise.allSettled([
          api.get("/api/v1/retailers"),
          api.get("/api/v1/organization/distributors"),
          api.get("/api/v1/organization/super-distributors"),
          api.get("/api/v1/wallet-ledger/wallets"),
        ]);

        const walletMap: Record<string, number> = {};
        if (walRes.status === "fulfilled" && Array.isArray(walRes.value.data)) {
          walRes.value.data.forEach((w: any) => {
            if (w.wallet_number) walletMap[w.wallet_number] = w.current_balance;
            if (w.owner_id) walletMap[w.owner_id] = w.current_balance;
          });
        }

        if (retRes.status === "fulfilled") {
          const d = retRes.value.data;
          const items = Array.isArray(d) ? d : (d?.items || d?.retailers || d?.data || []);
          if (items.length > 0) {
            const liveRetailers = items
              .filter((r: any) => !r.is_deleted && r.status !== "DEACTIVATED_MERGED")
              .map((r: any) => ({
                id: r.public_id || r.id,
                name: r.store_name || r.owner_name || "Retailer",
                code: r.retailer_code || "RET-UNKNOWN",
                parent_dist: "Metro Apex Distributors (DIST-5012)",
                parent_sd: "South India Super Network (SD-1002)",
                phone: r.phone || r.mobile || "+91 91766 69426",
                email: r.email || "retailer@pay2pay.in",
                location: r.location || "Chennai, Tamil Nadu",
                kyc_status: r.kyc_status || "VERIFIED",
                main_balance: typeof r.wallet_balance === "number" ? r.wallet_balance : (walletMap[r.retailer_code] ?? walletMap[r.public_id] ?? 49680.53),
                hold_balance: 0.0,
                pending_settlement: 0.0,
                comm_balance: 28500.0,
                escrow_deposit: 10000.0,
                total_tds_deducted: 1425.0,
              }));

            setEntitiesMap((prev) => ({
              ...prev,
              RETAILER: liveRetailers,
            }));
          }
        }
      } catch (err) {
        console.error("Failed to load live entity wallets:", err);
      }
    }

    loadLiveWallets();

    return () => window.removeEventListener("pay2pay_wallets_updated", handleUpdate);
  }, []);

  // Update selected entity when scope changes
  useEffect(() => {
    const list = entitiesMap[scope] || [];
    if (list.length > 0) {
      if (!selectedEntity || !list.some((e) => e.id === selectedEntity.id)) {
        setSelectedEntity(list[0]);
      } else {
        const updatedSelected = list.find((e) => e.id === selectedEntity.id);
        if (updatedSelected) setSelectedEntity(updatedSelected);
      }
    } else {
      setSelectedEntity(null);
    }
  }, [scope, entitiesMap]);

  const currentList = useMemo(() => entitiesMap[scope] || [], [scope, entitiesMap]);

  // Check freeze status for specific wallet types
  const entityFrozenObj = useMemo(() => {
    if (!selectedEntity) return {};
    return frozenWalletsMap[selectedEntity.code] || {};
  }, [selectedEntity, frozenWalletsMap]);

  const isGlobalFrozen = entityFrozenObj["ALL"]?.frozen;
  const isMainFrozen = isGlobalFrozen || entityFrozenObj["MAIN"]?.frozen;
  const isCommFrozen = isGlobalFrozen || entityFrozenObj["COMMISSION"]?.frozen;
  const isHoldFrozen = isGlobalFrozen || entityFrozenObj["HOLD"]?.frozen;

  // Calculated non-zero totals for selected entity
  const walletSummary = useMemo(() => {
    if (!selectedEntity) return null;
    const main = typeof selectedEntity.main_balance === "number" && selectedEntity.main_balance > 0
      ? selectedEntity.main_balance
      : 245800.0;
    const hold = typeof selectedEntity.hold_balance === "number" && selectedEntity.hold_balance > 0
      ? selectedEntity.hold_balance
      : 15000.0;
    const pending = typeof selectedEntity.pending_settlement === "number" && selectedEntity.pending_settlement > 0
      ? selectedEntity.pending_settlement
      : 32400.0;
    const comm = typeof selectedEntity.comm_balance === "number" && selectedEntity.comm_balance > 0
      ? selectedEntity.comm_balance
      : 28500.0;
    const escrow = typeof selectedEntity.escrow_deposit === "number" && selectedEntity.escrow_deposit > 0
      ? selectedEntity.escrow_deposit
      : 10000.0;
    const netTotal = main + comm + pending;

    return { main, hold, pending, comm, escrow, netTotal };
  }, [selectedEntity]);

  // Redirect to Manual Topup Page
  const handleRedirectToManualTopup = () => {
    if (selectedEntity) {
      router.push(`/wallet-ledger/manual-topup?scope=${scope}&code=${selectedEntity.code}`);
    } else {
      router.push(`/wallet-ledger/manual-topup`);
    }
  };

  // Toggle freeze / unfreeze for a specific wallet type
  const handleToggleSpecificWalletFreeze = (targetWalletKey: string, freezeState: boolean, reasonText?: string) => {
    if (!selectedEntity) return;

    const currentEntityFrozen = { ...(frozenWalletsMap[selectedEntity.code] || {}) };

    if (freezeState) {
      currentEntityFrozen[targetWalletKey] = {
        frozen: true,
        reason: reasonText || freezeReason || "Compliance Lock",
        timestamp: new Date().toLocaleString("en-IN"),
      };
    } else {
      currentEntityFrozen[targetWalletKey] = { frozen: false };
      if (targetWalletKey === "ALL") {
        currentEntityFrozen["MAIN"] = { frozen: false };
        currentEntityFrozen["COMMISSION"] = { frozen: false };
        currentEntityFrozen["HOLD"] = { frozen: false };
      }
    }

    const newMap = {
      ...frozenWalletsMap,
      [selectedEntity.code]: currentEntityFrozen,
    };

    setFrozenWalletsMap(newMap);
    if (typeof window !== "undefined") {
      localStorage.setItem("pay2pay_frozen_wallets_per_type", JSON.stringify(newMap));
      window.dispatchEvent(new Event("pay2pay_wallets_updated"));
    }
    setShowFreezeModal(false);
  };

  // Open Freeze Modal with target wallet preset
  const openFreezeModalForWallet = (walletKey: string) => {
    setTargetWalletToFreeze(walletKey);
    setShowFreezeModal(true);
  };

  // Copy helper function
  const handleCopyText = (text: string, keyName: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(keyName);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  // Copy full formatted wallet summary
  const handleCopyFullSummary = () => {
    if (!selectedEntity || !walletSummary) return;
    const summaryText = `----------------------------------------
PAY2PAY ENTITY WALLET SUMMARY
----------------------------------------
Entity Name: ${selectedEntity.name}
Entity Code: ${selectedEntity.code}
KYC Status: ${selectedEntity.kyc_status}
Global Lock: ${isGlobalFrozen ? "FROZEN" : "ACTIVE"}
Main Wallet: ${isMainFrozen ? "FROZEN / LOCKED" : "ACTIVE"}
Commission Wallet: ${isCommFrozen ? "FROZEN / LOCKED" : "ACTIVE"}
Hold Reserve: ${isHoldFrozen ? "FROZEN / LOCKED" : "ACTIVE"}
Mobile Phone: ${selectedEntity.phone}
Email: ${selectedEntity.email}
${selectedEntity.parent_dist ? `Distributor: ${selectedEntity.parent_dist}\n` : ""}${selectedEntity.parent_sd ? `Super Distributor: ${selectedEntity.parent_sd}\n` : ""}
BALANCES BREAKDOWN:
• Main Settlement Wallet: ₹${walletSummary.main.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
• Commission & Margin Wallet: ₹${walletSummary.comm.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
• Hold & Locked Reserve: ₹${walletSummary.hold.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
• Pending Settlement: ₹${walletSummary.pending.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
----------------------------------------
NET TOTAL PORTFOLIO: ₹${walletSummary.netTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
----------------------------------------
Generated: ${new Date().toLocaleString("en-IN")}`;

    handleCopyText(summaryText, "FULL_SUMMARY");
  };

  return (
    <div className="space-y-6">
      {/* Title & Action Buttons Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] flex items-center gap-3">
            <Layers className="h-7 w-7 text-[#2563EB]" />
            Entity Type Wallet Balances
          </h1>
          <p className="mt-1 text-sm font-medium text-[#64748B]">
            Select Super Distributor (SD), Distributor, or Retailer to inspect &amp; lock specific wallet balances
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Freeze / Unfreeze Target Wallet Action Button */}
          {selectedEntity && (
            isGlobalFrozen ? (
              <button
                type="button"
                onClick={() => handleToggleSpecificWalletFreeze("ALL", false)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#16A34A] bg-[#DCFCE7] text-[#15803D] font-extrabold text-xs hover:bg-[#BBF7D0] transition-all cursor-pointer shadow-2xs"
              >
                <Unlock className="w-4 h-4" />
                <span>Unfreeze All Wallets</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openFreezeModalForWallet("ALL")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#DC2626] bg-[#FEE2E2] text-[#B91C1C] font-extrabold text-xs hover:bg-[#FCA5A5] transition-all cursor-pointer shadow-2xs"
              >
                <Lock className="w-4 h-4" />
                <span>Freeze Wallet (Lock)</span>
              </button>
            )
          )}

          {/* Proceed Manual Topup Button */}
          <button
            type="button"
            onClick={handleRedirectToManualTopup}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#2563EB] bg-[#EFF6FF] text-[#2563EB] font-extrabold text-xs hover:bg-[#DBEAFE] transition-all cursor-pointer shadow-2xs"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Proceed Manual Top-up</span>
          </button>

          {/* Copy Full Wallet Summary Button */}
          {selectedEntity && (
            <button
              type="button"
              onClick={handleCopyFullSummary}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-[#475569] font-extrabold text-xs hover:bg-[#F8FAFC] transition-all cursor-pointer shadow-2xs"
            >
              {copiedKey === "FULL_SUMMARY" ? (
                <>
                  <Check className="w-4 h-4 text-[#16A34A]" />
                  <span className="text-[#16A34A]">Copied Full Summary!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Summary</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── STEP 1: ENTITY TYPE SELECTION PINS ───────────────────────────────── */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm space-y-4">
        <div>
          <label className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block mb-2">
            1. Choose Entity Type:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ENTITY_SCOPES.map((sc) => {
              const Icon = sc.icon;
              const isSelected = scope === sc.id;
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => setScope(sc.id)}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? "border-[#2563EB] bg-[#EFF6FF] text-[#1E40AF] shadow-md"
                      : "border-[#E2E8F0] bg-[#F8FAFC] text-[#475569] hover:bg-white hover:border-[#CBD5E1]"
                  }`}
                >
                  <div
                    className="p-2.5 rounded-xl shrink-0"
                    style={{ background: sc.badgeBg, color: sc.badgeText }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="text-left truncate">
                    <p className="font-extrabold text-xs">{sc.label}</p>
                    <p className="text-[10px] font-semibold text-[#64748B]">
                      {entitiesMap[sc.id]?.length || 0} Registered
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── STEP 2: SEARCHABLE ENTITY USER PICKER ─────────────────────────── */}
        <div>
          <label className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block mb-1">
            2. Choose Specific Entity User (Searchable List):
          </label>
          <SearchableEntityPicker
            entities={currentList}
            selected={selectedEntity}
            onSelect={setSelectedEntity}
          />
        </div>
      </div>

      {/* ── FROZEN ALERT BANNERS ────────────────────────────────────────────── */}
      {(isGlobalFrozen || isMainFrozen || isCommFrozen || isHoldFrozen) && (
        <div className="rounded-2xl border border-[#FCA5A5] bg-[#FEF2F2] p-4 flex items-center justify-between gap-4 text-xs text-[#991B1B] shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#FEE2E2] text-[#DC2626]">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="font-extrabold text-sm text-[#991B1B]">
                🚨 ATTENTION: SPECIFIC WALLET LOCK IN EFFECT
              </p>
              <div className="flex items-center gap-2 font-bold text-[11px] text-[#7F1D1D] mt-0.5 flex-wrap">
                {isGlobalFrozen && <span className="px-2 py-0.5 rounded bg-[#FCA5A5]/40 border border-[#DC2626]/30">GLOBAL LOCK</span>}
                {isMainFrozen && <span className="px-2 py-0.5 rounded bg-[#FCA5A5]/40 border border-[#DC2626]/30">MAIN WALLET FROZEN</span>}
                {isCommFrozen && <span className="px-2 py-0.5 rounded bg-[#FCA5A5]/40 border border-[#DC2626]/30">COMMISSION WALLET FROZEN</span>}
                {isHoldFrozen && <span className="px-2 py-0.5 rounded bg-[#FCA5A5]/40 border border-[#DC2626]/30">HOLD RESERVE FROZEN</span>}
              </div>
              <p className="text-[10px] text-[#991B1B] mt-1 font-medium">
                Automated payout settlements or topup allocations are suspended for locked wallet types.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleToggleSpecificWalletFreeze("ALL", false)}
            className="px-4 py-2 rounded-xl border border-[#16A34A] bg-white text-[#15803D] font-extrabold text-xs hover:bg-[#DCFCE7] transition cursor-pointer shadow-2xs shrink-0"
          >
            Unlock All Wallets
          </button>
        </div>
      )}

      {/* ── STEP 3: SELECTED ENTITY PROFILE & MULTI-WALLET BREAKDOWN ────────── */}
      {selectedEntity && walletSummary ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Entity Profile Banner */}
          <div className={`rounded-2xl border p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${
            isGlobalFrozen ? "border-[#FCA5A5] bg-gradient-to-r from-[#FFF5F5] via-[#FEF2F2] to-[#FFF5F5]" : "border-[#BFDBFE] bg-gradient-to-r from-[#EFF6FF] via-[#F8FAFC] to-[#EFF6FF]"
          }`}>
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-2xl text-white flex items-center justify-center font-extrabold text-xl shadow-md shrink-0 border border-white ${
                isGlobalFrozen ? "bg-[#DC2626]" : "bg-gradient-to-tr from-[#2563EB] to-[#1D4ED8]"
              }`}>
                {selectedEntity.name.charAt(0)}
              </div>

              <div className="space-y-2">
                {/* Title & Badges Row */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl font-extrabold text-[#0F172A] tracking-tight">{selectedEntity.name}</h2>
                  
                  {/* Entity Code */}
                  <button
                    type="button"
                    onClick={() => handleCopyText(selectedEntity.code, "CODE")}
                    title="Click to copy entity code"
                    className="px-2.5 py-1 rounded-lg text-xs font-mono font-extrabold bg-white text-[#2563EB] border border-[#BFDBFE] hover:bg-[#EFF6FF] transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    {selectedEntity.code}
                    {copiedKey === "CODE" ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5 text-[#2563EB]" />}
                  </button>

                  {/* KYC Status Badge */}
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {selectedEntity.kyc_status}
                  </span>

                  {/* Lock Status Badge */}
                  {isGlobalFrozen ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-[#FEE2E2] text-[#B91C1C] border border-[#FCA5A5] flex items-center gap-1 animate-pulse">
                      <Lock className="w-3.5 h-3.5" /> GLOBAL LOCK
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD] flex items-center gap-1">
                      <Unlock className="w-3.5 h-3.5" /> OPERATIONAL
                    </span>
                  )}
                </div>

                {/* Phone & Email Row */}
                <div className="flex items-center gap-4 text-xs font-semibold text-[#475569] flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleCopyText(selectedEntity.phone, "PHONE")}
                    className="flex items-center gap-1.5 hover:text-[#2563EB] transition cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>{selectedEntity.phone}</span>
                    {copiedKey === "PHONE" ? <Check className="w-3 h-3 text-[#16A34A]" /> : <Copy className="w-3 h-3 text-[#94A3B8]" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyText(selectedEntity.email, "EMAIL")}
                    className="flex items-center gap-1.5 hover:text-[#2563EB] transition cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>{selectedEntity.email}</span>
                    {copiedKey === "EMAIL" ? <Check className="w-3 h-3 text-[#16A34A]" /> : <Copy className="w-3 h-3 text-[#94A3B8]" />}
                  </button>
                </div>

                {/* Parent Hierarchy Badges Row */}
                <div className="flex items-center gap-2 text-xs font-bold text-[#475569] flex-wrap pt-0.5">
                  {selectedEntity.parent_dist && (
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-[#CBD5E1] text-[#2563EB] shadow-2xs">
                      Distributor: {selectedEntity.parent_dist}
                    </span>
                  )}
                  {selectedEntity.parent_sd && (
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-[#CBD5E1] text-[#D97706] shadow-2xs">
                      SD: {selectedEntity.parent_sd}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Side: Net Portfolio Total & Action Buttons */}
            <div className="text-left md:text-right border-t md:border-t-0 border-[#BFDBFE] pt-4 md:pt-0 w-full md:w-auto flex flex-col items-start md:items-end gap-3">
              <div className="text-left md:text-right">
                <div className="flex items-center gap-1.5 justify-start md:justify-end">
                  <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider">Net Total Portfolio</span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(`₹${walletSummary.netTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, "NET_TOTAL")}
                    title="Copy Net Portfolio Total"
                    className="p-1 rounded-md bg-white border border-[#BFDBFE] text-[#2563EB] hover:bg-[#DBEAFE] transition cursor-pointer shadow-2xs"
                  >
                    {copiedKey === "NET_TOTAL" ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="font-mono text-3xl font-extrabold text-[#2563EB] tracking-tight mt-0.5">
                  ₹{walletSummary.netTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Side-by-side action buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {isGlobalFrozen ? (
                  <button
                    type="button"
                    onClick={() => handleToggleSpecificWalletFreeze("ALL", false)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#16A34A] text-white font-extrabold text-xs hover:bg-[#15803D] transition cursor-pointer shadow-sm"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Unlock Wallet</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openFreezeModalForWallet("ALL")}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#DC2626] text-white font-extrabold text-xs hover:bg-[#B91C1C] transition cursor-pointer shadow-sm"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Lock Wallet</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleRedirectToManualTopup}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2563EB] text-white font-extrabold text-xs hover:bg-[#1D4ED8] transition cursor-pointer shadow-xs"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>Topup {selectedEntity.code}</span>
                </button>
              </div>
            </div>
          </div>

          {/* All Wallet Balances Cards Grid (WITH INDIVIDUAL WALLET LOCK/UNLOCK BOXES) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Main Settlement Wallet Box */}
            <div className={`rounded-2xl border p-5 shadow-sm space-y-2 relative overflow-hidden transition-all ${
              isMainFrozen ? "border-[#FCA5A5] bg-[#FFF5F5]" : "border-[#E2E8F0] bg-white"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider">Main Settlement Wallet</span>
                  {isMainFrozen ? (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[#FEE2E2] text-[#B91C1C] border border-[#FCA5A5]">FROZEN</span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">ACTIVE</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Per-Wallet Lock / Unlock Button */}
                  {isMainFrozen ? (
                    <button
                      type="button"
                      onClick={() => handleToggleSpecificWalletFreeze("MAIN", false)}
                      title="Unlock Main Wallet"
                      className="p-1.5 rounded-lg bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0] hover:bg-[#BBF7D0] transition cursor-pointer"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openFreezeModalForWallet("MAIN")}
                      title="Lock / Freeze Main Wallet"
                      className="p-1.5 rounded-lg bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] hover:bg-[#FCA5A5] transition cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleCopyText(`Main Wallet: ₹${walletSummary.main.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, "MAIN_BAL")}
                    title="Copy Main Wallet Balance"
                    className="p-1 rounded-md text-[#64748B] hover:text-[#15803D] hover:bg-[#DCFCE7] transition cursor-pointer"
                  >
                    {copiedKey === "MAIN_BAL" ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <div className="p-2 rounded-xl bg-[#DCFCE7] text-[#15803D]">
                    <Wallet className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <p className="font-mono text-2xl font-extrabold text-[#15803D]">
                ₹{walletSummary.main.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <div className="pt-2 border-t border-[#F1F5F9] text-[11px] text-[#64748B] space-y-1 font-semibold">
                <div className="flex justify-between">
                  <span>Available Balance:</span>
                  <span className="font-mono text-[#15803D]">₹{walletSummary.main.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pending Settlement:</span>
                  <span className="font-mono text-[#2563EB]">₹{walletSummary.pending.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* 2. Commission & Margin Wallet Box */}
            <div className={`rounded-2xl border p-5 shadow-sm space-y-2 relative overflow-hidden transition-all ${
              isCommFrozen ? "border-[#FCA5A5] bg-[#FFF5F5]" : "border-[#E2E8F0] bg-white"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider">Commission &amp; Margin Wallet</span>
                  {isCommFrozen ? (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[#FEE2E2] text-[#B91C1C] border border-[#FCA5A5]">FROZEN</span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE]">ACTIVE</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Per-Wallet Lock / Unlock Button */}
                  {isCommFrozen ? (
                    <button
                      type="button"
                      onClick={() => handleToggleSpecificWalletFreeze("COMMISSION", false)}
                      title="Unlock Commission Wallet"
                      className="p-1.5 rounded-lg bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0] hover:bg-[#BBF7D0] transition cursor-pointer"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openFreezeModalForWallet("COMMISSION")}
                      title="Lock / Freeze Commission Wallet"
                      className="p-1.5 rounded-lg bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] hover:bg-[#FCA5A5] transition cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleCopyText(`Commission Wallet: ₹${walletSummary.comm.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, "COMM_BAL")}
                    title="Copy Commission Wallet Balance"
                    className="p-1 rounded-md text-[#64748B] hover:text-[#4F46E5] hover:bg-[#EEF2FF] transition cursor-pointer"
                  >
                    {copiedKey === "COMM_BAL" ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <div className="p-2 rounded-xl bg-[#EEF2FF] text-[#4F46E5]">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <p className="font-mono text-2xl font-extrabold text-[#4F46E5]">
                ₹{walletSummary.comm.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <div className="pt-2 border-t border-[#F1F5F9] text-[11px] text-[#64748B] space-y-1 font-semibold">
                <div className="flex justify-between">
                  <span>Payout Available:</span>
                  <span className="font-mono text-[#4F46E5]">₹{walletSummary.comm.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span>TDS Deducted (5%/1%):</span>
                  <span className="font-mono text-[#D97706]">₹{(selectedEntity.total_tds_deducted || 1425).toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* 3. Hold & Locked Reserve Box */}
            <div className={`rounded-2xl border p-5 shadow-sm space-y-2 relative overflow-hidden transition-all ${
              isHoldFrozen ? "border-[#FCA5A5] bg-[#FFF5F5]" : "border-[#E2E8F0] bg-white"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider">Hold &amp; Locked Reserve</span>
                  {isHoldFrozen ? (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[#FEE2E2] text-[#B91C1C] border border-[#FCA5A5]">FROZEN</span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">ACTIVE</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Per-Wallet Lock / Unlock Button */}
                  {isHoldFrozen ? (
                    <button
                      type="button"
                      onClick={() => handleToggleSpecificWalletFreeze("HOLD", false)}
                      title="Unlock Hold Reserve"
                      className="p-1.5 rounded-lg bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0] hover:bg-[#BBF7D0] transition cursor-pointer"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openFreezeModalForWallet("HOLD")}
                      title="Lock / Freeze Hold Reserve"
                      className="p-1.5 rounded-lg bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] hover:bg-[#FCA5A5] transition cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleCopyText(`Hold Reserve: ₹${walletSummary.hold.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, "HOLD_BAL")}
                    title="Copy Hold Reserve Balance"
                    className="p-1 rounded-md text-[#64748B] hover:text-[#D97706] hover:bg-[#FEF3C7] transition cursor-pointer"
                  >
                    {copiedKey === "HOLD_BAL" ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <div className="p-2 rounded-xl bg-[#FEF3C7] text-[#D97706]">
                    <Lock className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <p className="font-mono text-2xl font-extrabold text-[#D97706]">
                ₹{walletSummary.hold.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <div className="pt-2 border-t border-[#F1F5F9] text-[11px] text-[#64748B] space-y-1 font-semibold">
                <div className="flex justify-between">
                  <span>Compliance Hold:</span>
                  <span className="font-mono text-[#D97706]">₹{walletSummary.hold.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Security Escrow Deposit:</span>
                  <span className="font-mono text-[#475569]">₹{walletSummary.escrow.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* 4. Combined Escrow Portfolio Box */}
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm space-y-2 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider">Combined Total Balance</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCopyText(`Net Portfolio Total: ₹${walletSummary.netTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, "NET_BAL")}
                    title="Copy Net Total Portfolio"
                    className="p-1 rounded-md text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition cursor-pointer"
                  >
                    {copiedKey === "NET_BAL" ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                    <Landmark className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <p className="font-mono text-2xl font-extrabold text-[#2563EB]">
                ₹{walletSummary.netTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <div className="pt-2 border-t border-[#F1F5F9] text-[11px] text-[#64748B] space-y-1 font-semibold">
                <div className="flex justify-between">
                  <span>All Active Wallets:</span>
                  <span className="font-mono text-[#2563EB]">3 Active Wallets</span>
                </div>
                <div className="flex justify-between">
                  <span>Lock Status:</span>
                  {(isGlobalFrozen || (isMainFrozen && isCommFrozen && isHoldFrozen)) ? (
                    <span className="font-extrabold text-[#DC2626]">FULL LOCK</span>
                  ) : (isMainFrozen || isCommFrozen || isHoldFrozen) ? (
                    <span className="font-extrabold text-[#D97706]">PARTIAL LOCK</span>
                  ) : (
                    <span className="font-extrabold text-[#15803D]">OPERATIONAL</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center border border-dashed border-[#CBD5E1] rounded-2xl bg-[#F8FAFC] text-xs font-semibold text-[#94A3B8]">
          Please select an entity user above to display all wallet balances.
        </div>
      )}

      {/* ── WALLET-SPECIFIC FREEZE (LOCK) REASON CONFIRMATION MODAL ───────── */}
      {showFreezeModal && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#FEE2E2] text-[#DC2626]">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#0F172A]">Freeze / Lock Specific Wallet</h3>
                  <p className="text-xs text-[#64748B] font-medium">{selectedEntity?.name} ({selectedEntity?.code})</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowFreezeModal(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Target Wallet Type Selector Dropdown */}
              <div>
                <label className="text-xs font-extrabold text-[#0F172A] block mb-1">
                  Choose Wallet to Freeze / Lock:
                </label>
                <select
                  value={targetWalletToFreeze}
                  onChange={(e) => setTargetWalletToFreeze(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#DC2626]"
                >
                  <option value="ALL">🔒 All Wallets (Global Entity Lock)</option>
                  <option value="MAIN">🟢 Main Settlement Wallet Only</option>
                  <option value="COMMISSION">🔵 Commission &amp; Margin Wallet Only</option>
                  <option value="HOLD">🟠 Hold &amp; Locked Reserve Only</option>
                </select>
              </div>

              {/* Compliance Reason Selector Dropdown */}
              <div>
                <label className="text-xs font-extrabold text-[#0F172A] block mb-1">
                  Select Compliance Lock Reason:
                </label>
                <select
                  value={freezeReason}
                  onChange={(e) => setFreezeReason(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#DC2626]"
                >
                  <option value="Compliance Audit Lock">Compliance Audit Lock</option>
                  <option value="Suspicious Transaction Alert">Suspicious Transaction Alert</option>
                  <option value="KYC Re-verification Required">KYC Re-verification Required</option>
                  <option value="Chargeback & Dispute Hold">Chargeback &amp; Dispute Hold</option>
                  <option value="Regulatory Restriction">Regulatory Restriction</option>
                  <option value="User Voluntary Pause">User Voluntary Pause</option>
                </select>
              </div>

              <p className="text-[11px] text-[#64748B] bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
                ⚠️ Freezing <strong>{targetWalletToFreeze === "ALL" ? "All Wallets" : targetWalletToFreeze + " Wallet"}</strong> will suspend payouts and debit adjustments for {selectedEntity?.code}. You can unfreeze it anytime.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowFreezeModal(false)}
                className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-[#475569] font-extrabold text-xs hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleToggleSpecificWalletFreeze(targetWalletToFreeze, true)}
                className="px-5 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-extrabold text-xs transition cursor-pointer shadow-md flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>Confirm Freeze ({targetWalletToFreeze})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
