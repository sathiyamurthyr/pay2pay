"use client";

import React, { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import { DataTable, type TableColumn } from "@/components/ui/data-table";
import {
  Wallet,
  Plus,
  RefreshCw,
  Lock,
  Unlock,
  Sliders,
  X,
  Building2,
  Users,
  Store,
  DollarSign,
  TrendingUp,
  ShieldAlert,
  CheckCircle2,
  Search,
  RotateCcw,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Landmark,
} from "lucide-react";

// ─── Hierarchy Options ───────────────────────────────────────────────────────
const SD_OPTIONS = [
  { code: "", name: "All Super Distributors (SD)" },
  { code: "SD-1002", name: "SD-1002 — South India Super Network (sathus-SD)" },
  { code: "SD-1003", name: "SD-1003 — North Apex Network" },
];

const DIST_OPTIONS = [
  { code: "", name: "All Distributors", sd_code: "" },
  { code: "DIST-5012", name: "DIST-5012 — Metro Apex Distributors", sd_code: "SD-1002" },
  { code: "DIST-5013", name: "DIST-5013 — City Digital Services", sd_code: "SD-1002" },
  { code: "DIST-5014", name: "DIST-5014 — Northern Telecoms", sd_code: "SD-1003" },
];

const RETAILER_OPTIONS = [
  { code: "", name: "All Retailers", dist_code: "" },
  { code: "RET-10928", name: "RET-10928 — Sathus Pay Store", dist_code: "DIST-5012" },
  { code: "RET-10929", name: "RET-10929 — Apex Communications", dist_code: "DIST-5012" },
  { code: "RET-10930", name: "RET-10930 — Om Sai Mobile", dist_code: "DIST-5013" },
  { code: "RET-10931", name: "RET-10931 — Karthik General Store", dist_code: "DIST-5014" },
];

// ─── Initial Seeded Entity Wallets Dataset ────────────────────────────────────
const INITIAL_ENTITY_WALLETS = [
  // Super Distributors
  {
    public_id: "w-sd-101",
    entity_code: "SD-1002",
    entity_name: "South India Super Network (sathus-SD)",
    entity_type: "SUPER_DISTRIBUTOR",
    wallet_type: "MAIN",
    currency: "INR",
    balance: 1250000.0,
    hold_balance: 50000.0,
    pending_settlement: 75000.0,
    status: "ACTIVE",
    last_txn_date: "2026-08-02T21:15:00Z",
  },
  {
    public_id: "w-sd-102",
    entity_code: "SD-1002",
    entity_name: "South India Super Network (sathus-SD)",
    entity_type: "SUPER_DISTRIBUTOR",
    wallet_type: "COMMISSION",
    currency: "INR",
    balance: 185000.0,
    hold_balance: 0.0,
    pending_settlement: 0.0,
    status: "ACTIVE",
    last_txn_date: "2026-08-02T20:30:00Z",
  },
  {
    public_id: "w-sd-103",
    entity_code: "SD-1003",
    entity_name: "North Apex Network",
    entity_type: "SUPER_DISTRIBUTOR",
    wallet_type: "MAIN",
    currency: "INR",
    balance: 600000.0,
    hold_balance: 20000.0,
    pending_settlement: 35000.0,
    status: "ACTIVE",
    last_txn_date: "2026-08-02T19:40:00Z",
  },

  // Distributors
  {
    public_id: "w-dist-201",
    entity_code: "DIST-5012",
    entity_name: "Metro Apex Distributors",
    sd_code: "SD-1002",
    entity_type: "DISTRIBUTOR",
    wallet_type: "MAIN",
    currency: "INR",
    balance: 780000.0,
    hold_balance: 25000.0,
    pending_settlement: 42000.0,
    status: "ACTIVE",
    last_txn_date: "2026-08-02T21:00:00Z",
  },
  {
    public_id: "w-dist-202",
    entity_code: "DIST-5012",
    entity_name: "Metro Apex Distributors",
    sd_code: "SD-1002",
    entity_type: "DISTRIBUTOR",
    wallet_type: "COMMISSION",
    currency: "INR",
    balance: 95000.0,
    hold_balance: 0.0,
    pending_settlement: 0.0,
    status: "ACTIVE",
    last_txn_date: "2026-08-02T18:20:00Z",
  },
  {
    public_id: "w-dist-203",
    entity_code: "DIST-5013",
    entity_name: "City Digital Services",
    sd_code: "SD-1002",
    entity_type: "DISTRIBUTOR",
    wallet_type: "MAIN",
    currency: "INR",
    balance: 460000.0,
    hold_balance: 15000.0,
    pending_settlement: 28000.0,
    status: "ACTIVE",
    last_txn_date: "2026-08-02T17:50:00Z",
  },

  // Retailers
  {
    public_id: "w-ret-301",
    entity_code: "RET-10928",
    entity_name: "Sathus Pay Store",
    distributor_code: "DIST-5012",
    sd_code: "SD-1002",
    entity_type: "RETAILER",
    wallet_type: "MAIN",
    currency: "INR",
    balance: 245800.0,
    hold_balance: 15000.0,
    pending_settlement: 32400.0,
    status: "ACTIVE",
    last_txn_date: "2026-08-02T21:45:00Z",
  },
  {
    public_id: "w-ret-302",
    entity_code: "RET-10928",
    entity_name: "Sathus Pay Store",
    distributor_code: "DIST-5012",
    sd_code: "SD-1002",
    entity_type: "RETAILER",
    wallet_type: "COMMISSION",
    currency: "INR",
    balance: 28500.0,
    hold_balance: 0.0,
    pending_settlement: 0.0,
    status: "ACTIVE",
    last_txn_date: "2026-08-02T21:10:00Z",
  },
  {
    public_id: "w-ret-303",
    entity_code: "RET-10929",
    entity_name: "Apex Communications",
    distributor_code: "DIST-5012",
    sd_code: "SD-1002",
    entity_type: "RETAILER",
    wallet_type: "MAIN",
    currency: "INR",
    balance: 192400.0,
    hold_balance: 10000.0,
    pending_settlement: 18500.0,
    status: "ACTIVE",
    last_txn_date: "2026-08-02T19:30:00Z",
  },
  {
    public_id: "w-ret-304",
    entity_code: "RET-10930",
    entity_name: "Om Sai Mobile",
    distributor_code: "DIST-5013",
    sd_code: "SD-1002",
    entity_type: "RETAILER",
    wallet_type: "MAIN",
    currency: "INR",
    balance: 168000.0,
    hold_balance: 5000.0,
    pending_settlement: 12000.0,
    status: "ACTIVE",
    last_txn_date: "2026-08-02T16:40:00Z",
  },
  {
    public_id: "w-ret-305",
    entity_code: "RET-10931",
    entity_name: "Karthik General Store",
    distributor_code: "DIST-5014",
    sd_code: "SD-1003",
    entity_type: "RETAILER",
    wallet_type: "MAIN",
    currency: "INR",
    balance: 284300.0,
    hold_balance: 20000.0,
    pending_settlement: 25000.0,
    status: "ACTIVE",
    last_txn_date: "2026-08-02T14:20:00Z",
  },
];

export default function EnterpriseWalletsPage() {
  const [wallets, setWallets] = useState<any[]>(INITIAL_ENTITY_WALLETS);
  const [loading, setLoading] = useState(false);

  // ── Filters ────────────────────────────────────────────────────────────────
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("ALL");
  const [walletTypeFilter, setWalletTypeFilter] = useState<string>("ALL");
  const [sdFilter, setSdFilter] = useState<string>("");
  const [distFilter, setDistFilter] = useState<string>("");
  const [retFilter, setRetFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<any>(null);

  const [createData, setCreateData] = useState({
    entity_type: "RETAILER",
    wallet_type: "MAIN",
    entity_name: "",
    entity_code: "",
    initial_balance: 10000.0,
  });

  const [adjustData, setAdjustData] = useState({
    adjustment_type: "CREDIT",
    amount: 5000.0,
    reason: "Promotional margin adjustment",
  });

  const fetchWallets = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/wallet-ledger/wallets");
      const fetched = res.data?.items || res.data || [];
      if (fetched && fetched.length > 0) {
        setWallets(fetched);
        return;
      }
    } catch (err) {
      console.log("Using local/localStorage wallet state");
    } finally {
      setLoading(false);
    }

    const stored = typeof window !== "undefined" ? localStorage.getItem("pay2pay_entity_wallets") : null;
    if (stored) {
      try {
        setWallets(JSON.parse(stored));
      } catch (e) {
        setWallets(INITIAL_ENTITY_WALLETS);
      }
    } else {
      setWallets(INITIAL_ENTITY_WALLETS);
    }
  };

  useEffect(() => {
    fetchWallets();
    const handleUpdate = () => fetchWallets();
    window.addEventListener("pay2pay_wallets_updated", handleUpdate);
    return () => window.removeEventListener("pay2pay_wallets_updated", handleUpdate);
  }, []);

  // Filter Distributors based on selected SD
  const availableDistributors = useMemo(() => {
    if (!sdFilter) return DIST_OPTIONS;
    return DIST_OPTIONS.filter((d) => !d.sd_code || d.sd_code === sdFilter);
  }, [sdFilter]);

  // Filter Retailers based on selected Distributor
  const availableRetailers = useMemo(() => {
    if (!distFilter) return RETAILER_OPTIONS;
    return RETAILER_OPTIONS.filter((r) => !r.dist_code || r.dist_code === distFilter);
  }, [distFilter]);

  // ── Filtering Engine ───────────────────────────────────────────────────────
  const filteredWallets = useMemo(() => {
    return wallets.filter((w) => {
      // 1. Entity Type Filter (SD, Distributor, Retailer, RM)
      if (entityTypeFilter !== "ALL" && w.entity_type !== entityTypeFilter) {
        return false;
      }

      // 2. Wallet Type Filter (MAIN, COMMISSION, HOLD)
      if (walletTypeFilter !== "ALL" && w.wallet_type !== walletTypeFilter) {
        return false;
      }

      // 3. SD Filter
      if (sdFilter && w.sd_code && w.sd_code !== sdFilter) {
        return false;
      }

      // 4. Distributor Filter
      if (distFilter && w.distributor_code && w.distributor_code !== distFilter) {
        return false;
      }

      // 5. Retailer Filter
      if (retFilter && w.entity_code && w.entity_code !== retFilter) {
        return false;
      }

      // 6. Freeform Search
      if (search) {
        const q = search.toLowerCase();
        const matchName = (w.entity_name || "").toLowerCase().includes(q);
        const matchCode = (w.entity_code || "").toLowerCase().includes(q);
        const matchType = (w.wallet_type || "").toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchType) return false;
      }

      return true;
    });
  }, [wallets, entityTypeFilter, walletTypeFilter, sdFilter, distFilter, retFilter, search]);

  // ── KPI Volume Totals ──────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const sdBal = filteredWallets
      .filter((w) => w.entity_type === "SUPER_DISTRIBUTOR")
      .reduce((s, w) => s + (w.balance || 0), 0);

    const distBal = filteredWallets
      .filter((w) => w.entity_type === "DISTRIBUTOR")
      .reduce((s, w) => s + (w.balance || 0), 0);

    const retBal = filteredWallets
      .filter((w) => w.entity_type === "RETAILER")
      .reduce((s, w) => s + (w.balance || 0), 0);

    const totalHold = filteredWallets.reduce((s, w) => s + (w.hold_balance || 0), 0);
    const totalNet = filteredWallets.reduce((s, w) => s + (w.balance || 0) + (w.pending_settlement || 0), 0);

    return { sdBal, distBal, retBal, totalHold, totalNet, count: filteredWallets.length };
  }, [filteredWallets]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/wallet-ledger/wallets", createData);
      setShowCreateModal(false);
      fetchWallets();
    } catch (err: any) {
      // Local creation fallback
      const newW = {
        public_id: `w-${Date.now()}`,
        entity_code: createData.entity_code || `ENT-${Math.floor(1000 + Math.random() * 9000)}`,
        entity_name: createData.entity_name || "New Entity Outlet",
        entity_type: createData.entity_type,
        wallet_type: createData.wallet_type,
        currency: "INR",
        balance: createData.initial_balance,
        hold_balance: 0.0,
        pending_settlement: 0.0,
        status: "ACTIVE",
        last_txn_date: new Date().toISOString(),
      };
      setWallets((prev) => [newW, ...prev]);
      setShowCreateModal(false);
    }
  };

  const handleToggleFreeze = async (w: any) => {
    try {
      const action = w.status === "ACTIVE" ? "FREEZE" : "UNFREEZE";
      await api.post(`/api/v1/wallet-ledger/wallets/${w.public_id}/freeze`, {
        action,
        reason: "Compliance status toggle",
      });
      fetchWallets();
    } catch (err: any) {
      // Local state update
      setWallets((prev) =>
        prev.map((item) =>
          item.public_id === w.public_id
            ? { ...item, status: item.status === "ACTIVE" ? "FROZEN" : "ACTIVE" }
            : item
        )
      );
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWallet) return;
    try {
      await api.post(`/api/v1/wallet-ledger/wallets/${selectedWallet.public_id}/adjust`, adjustData);
      setShowAdjustModal(false);
      fetchWallets();
    } catch (err: any) {
      // Local adjustment fallback
      setWallets((prev) =>
        prev.map((item) => {
          if (item.public_id === selectedWallet.public_id) {
            const delta = adjustData.adjustment_type === "CREDIT" ? adjustData.amount : -adjustData.amount;
            return { ...item, balance: Math.max(0, item.balance + delta) };
          }
          return item;
        })
      );
      setShowAdjustModal(false);
    }
  };

  const resetAllFilters = () => {
    setEntityTypeFilter("ALL");
    setWalletTypeFilter("ALL");
    setSdFilter("");
    setDistFilter("");
    setRetFilter("");
    setSearch("");
  };

  const columns: TableColumn<any>[] = [
    {
      id: "entity_details",
      header: "ENTITY USER NAME & CODE",
      accessorKey: "entity_name",
      sortable: true,
      cell: (w) => (
        <div>
          <p className="font-bold text-xs text-[#0F172A]">{w.entity_name}</p>
          <p className="font-mono text-[10px] font-bold text-[#2563EB]">{w.entity_code}</p>
        </div>
      ),
    },
    {
      id: "entity_type",
      header: "ENTITY TYPE",
      accessorKey: "entity_type",
      sortable: true,
      cell: (w) => {
        const typeColors: Record<string, { bg: string; text: string; border: string; label: string; icon: any }> = {
          SUPER_DISTRIBUTOR: { bg: "#FEF3C7", text: "#B45309", border: "#FDE68A", label: "Super Distributor", icon: Building2 },
          DISTRIBUTOR:       { bg: "#EFF6FF", text: "#2563EB", border: "#BFDBFE", label: "Distributor",       icon: Users },
          RETAILER:          { bg: "#F0FDF4", text: "#16A34A", border: "#BBF7D0", label: "Retailer",          icon: Store },
          REGIONAL_MANAGER:  { bg: "#F3E8FF", text: "#7C3AED", border: "#DDD6FE", label: "Regional Manager", icon: Layers },
        };
        const meta = typeColors[w.entity_type] || typeColors.RETAILER;
        const Icon = meta.icon;
        return (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold w-fit"
            style={{ background: meta.bg, color: meta.text, border: `1px solid ${meta.border}` }}
          >
            <Icon className="w-3 h-3" /> {meta.label}
          </span>
        );
      },
    },
    {
      id: "wallet_type",
      header: "WALLET TYPE",
      accessorKey: "wallet_type",
      sortable: true,
      cell: (w) => {
        const wColors: Record<string, { bg: string; text: string; border: string; label: string }> = {
          MAIN:       { bg: "#EEF2FF", text: "#4F46E5", border: "#C7D2FE", label: "Main Wallet" },
          COMMISSION: { bg: "#ECFDF5", text: "#047857", border: "#A7F3D0", label: "Commission Wallet" },
          HOLD:       { bg: "#FFFBEB", text: "#D97706", border: "#FDE68A", label: "Hold Reserve" },
        };
        const meta = wColors[w.wallet_type] || wColors.MAIN;
        return (
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold"
            style={{ background: meta.bg, color: meta.text, border: `1px solid ${meta.border}` }}
          >
            {meta.label}
          </span>
        );
      },
    },
    {
      id: "balance",
      header: "AVAILABLE BALANCE (₹)",
      accessorKey: "balance",
      sortable: true,
      cell: (w) => (
        <span className="font-mono text-xs font-extrabold text-[#15803D]">
          ₹{(w.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      id: "hold_balance",
      header: "HOLD / LOCKED (₹)",
      accessorKey: "hold_balance",
      sortable: true,
      cell: (w) => (
        <span className="font-mono text-xs font-bold text-[#D97706]">
          ₹{(w.hold_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      id: "pending_settlement",
      header: "SETTLEMENT PENDING (₹)",
      accessorKey: "pending_settlement",
      sortable: true,
      cell: (w) => (
        <span className="font-mono text-xs font-bold text-[#2563EB]">
          ₹{(w.pending_settlement || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      id: "net_total",
      header: "NET TOTAL BALANCE (₹)",
      cell: (w) => {
        const net = (w.balance || 0) + (w.pending_settlement || 0);
        return (
          <span className="font-mono text-xs font-extrabold text-[#0F172A]">
            ₹{net.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      id: "status_actions",
      header: "STATUS & ACTIONS",
      cell: (w) => (
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
              w.status === "ACTIVE"
                ? "bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]"
                : "bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]"
            }`}
          >
            {w.status === "ACTIVE" ? <CheckCircle2 className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            {w.status}
          </span>

          <button
            type="button"
            onClick={() => { setSelectedWallet(w); setShowAdjustModal(true); }}
            className="p-1.5 rounded-lg border border-[#CBD5E1] bg-white text-[#334155] hover:bg-[#EFF6FF] hover:text-[#2563EB] hover:border-[#BFDBFE] transition-all cursor-pointer shadow-2xs"
            title="Adjust Wallet Balance"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => handleToggleFreeze(w)}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer shadow-2xs ${
              w.status === "ACTIVE"
                ? "border-[#CBD5E1] bg-white text-[#D97706] hover:bg-[#FEF3C7] hover:border-[#FDE68A]"
                : "border-[#CBD5E1] bg-white text-[#16A34A] hover:bg-[#DCFCE7] hover:border-[#BBF7D0]"
            }`}
            title={w.status === "ACTIVE" ? "Freeze Wallet" : "Unfreeze Wallet"}
          >
            {w.status === "ACTIVE" ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] flex items-center gap-3">
            <Wallet className="h-7 w-7 text-[#2563EB]" />
            Entity User Wallet Ledger
          </h1>
          <p className="mt-1 text-sm font-medium text-[#64748B]">
            Multi-tier wallet balances, escrow hold reserves, and balance adjustments for SDs, Distributors, and Retailers
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-xs font-extrabold text-white shadow-2xs hover:bg-[#1D4ED8] transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Create Entity Wallet
        </button>
      </div>

      {/* ── FILTER TOOLBAR PANEL (Entity & Wallet Selection) ─────────────────── */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm space-y-4">
        {/* Entity Type Filter Tabs */}
        <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-extrabold text-[#64748B] uppercase tracking-wider flex items-center gap-1 mr-1">
              <Layers className="w-4 h-4 text-[#2563EB]" /> Entity Scope:
            </span>
            {[
              { id: "ALL", label: "All Entities", icon: Landmark },
              { id: "SUPER_DISTRIBUTOR", label: "Super Distributor (SD)", icon: Building2 },
              { id: "DISTRIBUTOR", label: "Distributor", icon: Users },
              { id: "RETAILER", label: "Retailer", icon: Store },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = entityTypeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setEntityTypeFilter(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                    isSelected
                      ? "bg-[#2563EB] text-white border-[#2563EB] shadow-2xs"
                      : "bg-[#F8FAFC] text-[#475569] border-[#CBD5E1] hover:bg-[#EFF6FF] hover:text-[#2563EB]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Wallet Type Selection */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-[#64748B] uppercase tracking-wider">Wallet Type:</span>
            <select
              value={walletTypeFilter}
              onChange={(e) => setWalletTypeFilter(e.target.value)}
              className="rounded-xl border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-bold text-[#0F172A] focus:border-[#2563EB] focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Wallet Types</option>
              <option value="MAIN">Main Wallet</option>
              <option value="COMMISSION">Commission Wallet</option>
              <option value="HOLD">Hold Reserve</option>
            </select>
          </div>
        </div>

        {/* Row 2: Searchable Hierarchy Filters (SD, Distributor, Retailer) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 items-end">
          {/* SD Dropdown */}
          <div>
            <label className="text-[11px] font-extrabold text-[#475569] uppercase tracking-wider block mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-[#D97706]" /> Super Distributor (SD)
            </label>
            <select
              value={sdFilter}
              onChange={(e) => {
                setSdFilter(e.target.value);
                setDistFilter("");
                setRetFilter("");
              }}
              className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-bold text-[#0F172A] focus:border-[#2563EB] focus:outline-none cursor-pointer"
            >
              {SD_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>{opt.name}</option>
              ))}
            </select>
          </div>

          {/* Distributor Dropdown */}
          <div>
            <label className="text-[11px] font-extrabold text-[#475569] uppercase tracking-wider block mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-[#2563EB]" /> Distributor
            </label>
            <select
              value={distFilter}
              onChange={(e) => {
                setDistFilter(e.target.value);
                setRetFilter("");
              }}
              className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-bold text-[#0F172A] focus:border-[#2563EB] focus:outline-none cursor-pointer"
            >
              {availableDistributors.map((opt) => (
                <option key={opt.code} value={opt.code}>{opt.name}</option>
              ))}
            </select>
          </div>

          {/* Retailer Dropdown */}
          <div>
            <label className="text-[11px] font-extrabold text-[#475569] uppercase tracking-wider block mb-1 flex items-center gap-1">
              <Store className="w-3.5 h-3.5 text-[#16A34A]" /> Retailer Outlet
            </label>
            <select
              value={retFilter}
              onChange={(e) => setRetFilter(e.target.value)}
              className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-bold text-[#0F172A] focus:border-[#2563EB] focus:outline-none cursor-pointer"
            >
              {availableRetailers.map((opt) => (
                <option key={opt.code} value={opt.code}>{opt.name}</option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={resetAllFilters}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs font-extrabold text-[#475569] hover:bg-[#EFF6FF] hover:text-[#2563EB] hover:border-[#BFDBFE] transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider">Super Distributor Volume</span>
            <div className="p-2 rounded-xl bg-[#FEF3C7] text-[#D97706]">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-xl font-extrabold text-[#D97706]">
            ₹{metrics.sdBal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <p className="mt-1 text-[10px] font-semibold text-[#D97706]">SD Main &amp; Comm Wallets</p>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider">Distributor Volume</span>
            <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#2563EB]">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-xl font-extrabold text-[#2563EB]">
            ₹{metrics.distBal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <p className="mt-1 text-[10px] font-semibold text-[#2563EB]">Distributor Working Capital</p>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider">Retailer Outlets Volume</span>
            <div className="p-2 rounded-xl bg-[#DCFCE7] text-[#15803D]">
              <Store className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-xl font-extrabold text-[#15803D]">
            ₹{metrics.retBal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <p className="mt-1 text-[10px] font-semibold text-[#15803D]">Merchant Terminal Balances</p>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider">Total Net Escrow Volume</span>
            <div className="p-2 rounded-xl bg-[#EEF2FF] text-[#4F46E5]">
              <Landmark className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-xl font-extrabold text-[#4F46E5]">
            ₹{metrics.totalNet.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <p className="mt-1 text-[10px] font-semibold text-[#4F46E5]">Total System Escrow Reserve</p>
        </div>
      </div>

      {/* Enterprise Data Table */}
      <DataTable
        data={filteredWallets}
        columns={columns}
        keyExtractor={(w) => w.public_id}
        loading={loading}
        totalRecords={filteredWallets.length}
        onRefresh={fetchWallets}
        onAddNew={() => setShowCreateModal(true)}
        addNewLabel="Create Entity Wallet"
        searchPlaceholder="Search by entity name, code, wallet type..."
      />

      {/* Modal: Create Entity Wallet */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <h2 className="text-lg font-bold text-[#111827] flex items-center gap-2">
                <Wallet className="h-5 w-5 text-[#2563EB]" />
                Provision Entity User Wallet
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[#374151] mb-1 font-bold">Target Entity Scope *</label>
                <select
                  value={createData.entity_type}
                  onChange={(e) => setCreateData({ ...createData, entity_type: e.target.value })}
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white p-2.5 text-[#0F172A] font-bold focus:border-[#2563EB] focus:outline-none"
                >
                  <option value="SUPER_DISTRIBUTOR">Super Distributor (SD)</option>
                  <option value="DISTRIBUTOR">Distributor</option>
                  <option value="RETAILER">Retailer</option>
                  <option value="REGIONAL_MANAGER">Regional Manager (RM)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#374151] mb-1 font-bold">Wallet Type *</label>
                <select
                  value={createData.wallet_type}
                  onChange={(e) => setCreateData({ ...createData, wallet_type: e.target.value })}
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white p-2.5 text-[#0F172A] font-bold focus:border-[#2563EB] focus:outline-none"
                >
                  <option value="MAIN">Main Settlement Wallet</option>
                  <option value="COMMISSION">Commission &amp; Margin Wallet</option>
                  <option value="HOLD">Hold Reserve Escrow</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#374151] mb-1 font-bold">Entity Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Sathus Pay Store"
                    value={createData.entity_name}
                    onChange={(e) => setCreateData({ ...createData, entity_name: e.target.value })}
                    className="w-full rounded-xl border border-[#CBD5E1] bg-white p-2.5 text-[#0F172A] font-bold focus:border-[#2563EB] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#374151] mb-1 font-bold">Entity Code *</label>
                  <input
                    type="text"
                    placeholder="e.g. RET-10928"
                    value={createData.entity_code}
                    onChange={(e) => setCreateData({ ...createData, entity_code: e.target.value })}
                    className="w-full rounded-xl border border-[#CBD5E1] bg-white p-2.5 text-[#0F172A] font-bold focus:border-[#2563EB] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#374151] mb-1 font-bold">Initial Opening Balance (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={createData.initial_balance}
                  onChange={(e) => setCreateData({ ...createData, initial_balance: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white p-2.5 text-[#0F172A] font-bold focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-[#F1F5F9] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-[#475569] font-extrabold hover:bg-[#F8FAFC] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#2563EB] text-white font-extrabold hover:bg-[#1D4ED8] shadow-2xs cursor-pointer"
                >
                  Provision Wallet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Adjust Wallet Balance */}
      {showAdjustModal && selectedWallet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <h2 className="text-lg font-bold text-[#111827] flex items-center gap-2">
                <Sliders className="h-5 w-5 text-[#2563EB]" />
                Adjust Wallet Balance
              </h2>
              <button onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-3 space-y-1 text-xs">
              <p className="font-extrabold text-[#1E40AF]">{selectedWallet.entity_name} ({selectedWallet.entity_code})</p>
              <p className="text-[11px] text-[#2563EB] font-bold">
                Wallet: {selectedWallet.wallet_type} | Current Available: ₹{(selectedWallet.balance || 0).toLocaleString("en-IN")}
              </p>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[#374151] mb-1 font-bold">Adjustment Direction *</label>
                <select
                  value={adjustData.adjustment_type}
                  onChange={(e) => setAdjustData({ ...adjustData, adjustment_type: e.target.value })}
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white p-2.5 text-[#0F172A] font-bold focus:border-[#2563EB] focus:outline-none"
                >
                  <option value="CREDIT">🟢 CREDIT (+) Add Balance</option>
                  <option value="DEBIT">🔴 DEBIT (-) Deduct Balance</option>
                </select>
              </div>

              <div>
                <label className="block text-[#374151] mb-1 font-bold">Adjustment Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={adjustData.amount}
                  onChange={(e) => setAdjustData({ ...adjustData, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white p-2.5 text-[#0F172A] font-bold focus:border-[#2563EB] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[#374151] mb-1 font-bold">Reason / Note *</label>
                <input
                  type="text"
                  placeholder="e.g. Promotional credit adjustment"
                  value={adjustData.reason}
                  onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white p-2.5 text-[#0F172A] font-bold focus:border-[#2563EB] focus:outline-none"
                  required
                />
              </div>

              <div className="pt-4 border-t border-[#F1F5F9] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-[#475569] font-extrabold hover:bg-[#F8FAFC] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#2563EB] text-white font-extrabold hover:bg-[#1D4ED8] shadow-2xs cursor-pointer"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
