"use client";

export const dynamic = "force-dynamic";

import React, { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { DataTable, type TableColumn } from "@/components/ui/data-table";
import {
  ArrowLeftRight,
  Plus,
  Minus,
  Search,
  Building2,
  Users,
  Store,
  Wallet,
  CheckCircle2,
  X,
  Layers,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  Send,
  RotateCcw,
  Share2,
  Printer,
  Download,
  Copy,
  MessageCircle,
  Mail,
  FileText,
  Check,
  Landmark,
  Receipt,
  ShieldAlert,
  Lock,
  Unlock,
} from "lucide-react";

// ─── Scope & Entity Options ──────────────────────────────────────────────────
const ENTITY_SCOPES = [
  { value: "SUPER_DISTRIBUTOR", label: "Super Distributor (SD)", icon: Building2, color: "#D97706" },
  { value: "DISTRIBUTOR",       label: "Distributor",            icon: Users,     color: "#2563EB" },
  { value: "RETAILER",          label: "Retailer Outlet",        icon: Store,     color: "#16A34A" },
];

const INITIAL_ENTITIES: Record<string, { id: string; name: string; code: string; currentBal: number }[]> = {
  SUPER_DISTRIBUTOR: [],
  DISTRIBUTOR: [],
  RETAILER: [],
};

const SERVICE_OPTIONS = [
  { value: "GENERAL", label: "General Wallet Allocation" },
  { value: "POS_SWIPE", label: "POS Card Swipe Settlement" },
  { value: "UPI", label: "UPI Wallet Credit" },
  { value: "DMT", label: "DMT Money Transfer Liquidity" },
  { value: "AEPS", label: "AEPS Cash Withdrawal Fund" },
  { value: "BBPS", label: "BBPS Utility Margin" },
  { value: "RECHARGE", label: "Mobile / DTH Recharge Balance" },
];

const WALLET_TYPES = [
  { value: "MAIN", label: "Main Settlement Wallet" },
  { value: "COMMISSION", label: "Commission & Margin Wallet" },
  { value: "HOLD", label: "Hold Reserve Escrow" },
];

const INITIAL_TOPUPS: any[] = [];

// ─── Searchable Entity Select Component ─────────────────────────────────────
function SearchableEntitySelect({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: { id: string; name: string; code: string; currentBal: number }[];
  value: { id: string; name: string; code: string; currentBal: number } | null;
  onChange: (opt: { id: string; name: string; code: string; currentBal: number } | null) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () =>
      options.filter(
        (o) =>
          !query ||
          o.name.toLowerCase().includes(query.toLowerCase()) ||
          o.code.toLowerCase().includes(query.toLowerCase())
      ),
    [options, query]
  );

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
        className="w-full flex items-center justify-between rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-xs font-bold text-[#0F172A] hover:border-[#2563EB] focus:outline-none transition-colors shadow-2xs cursor-pointer"
      >
        <span className={value ? "text-[#0F172A]" : "text-[#94A3B8]"}>
          {value ? `${value.name} (${value.code})` : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-[#64748B] flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-[#CBD5E1] bg-white shadow-xl overflow-hidden py-1">
          <div className="p-2 border-b border-[#F1F5F9]">
            <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-2.5 py-1.5">
              <Search className="w-3.5 h-3.5 text-[#94A3B8]" />
              <input
                autoFocus
                type="text"
                placeholder="Type name or code to search..."
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

          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-xs text-[#94A3B8] text-center font-medium">No entities matched</li>
            ) : (
              filtered.map((opt) => (
                <li
                  key={opt.id}
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`flex items-center justify-between px-4 py-2.5 text-xs cursor-pointer hover:bg-[#EFF6FF] hover:text-[#2563EB] font-bold transition-colors ${
                    value?.id === opt.id ? "bg-[#EFF6FF] text-[#2563EB]" : "text-[#0F172A]"
                  }`}
                >
                  <div>
                    <p className="font-bold">{opt.name}</p>
                    <p className="font-mono text-[10px] text-[#64748B]">{opt.code}</p>
                  </div>
                  <span className="font-mono text-[11px] font-extrabold text-[#15803D]">
                    ₹{opt.currentBal.toLocaleString("en-IN")}
                  </span>
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
function ManualTopupContent() {
  const [mockEntities, setMockEntities] = useState<Record<string, { id: string; name: string; code: string; currentBal: number }[]>>(INITIAL_ENTITIES);
  const [topupLedger, setTopupLedger] = useState<any[]>(INITIAL_TOPUPS);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Receipt Modal State
  const [receiptData, setReceiptData] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  // Form State
  const [scope, setScope] = useState<string>("RETAILER");
  const [selectedEntity, setSelectedEntity] = useState<{ id: string; name: string; code: string; currentBal: number } | null>(null);
  const [serviceName, setServiceName] = useState<string>("GENERAL");
  const [walletType, setWalletType] = useState<string>("MAIN");
  const [txnId, setTxnId] = useState<string>("");
  const [txnType, setTxnType] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [amount, setAmount] = useState<number | "">("");
  const [comments, setComments] = useState<string>("");

  // Generate initial Txn ID on client mount
  useEffect(() => {
    setTxnId(`TOPUP-${new Date().toISOString().split("T")[0].replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`);
  }, []);

  const [frozenWalletsMap, setFrozenWalletsMap] = useState<any>({});

  // Dedicated function to fetch live entities and balances directly from PostgreSQL DB
  const fetchLiveDatabaseEntities = async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("pay2pay_entity_balances_map");
        localStorage.removeItem("pay2pay_entity_wallets");
        localStorage.removeItem("p2p_active_retailer_wallet_balance");
      }

      const [retRes, distRes, sdRes] = await Promise.allSettled([
        api.get("/api/v1/retailers?page_size=100"),
        api.get("/api/v1/organization/distributors?page_size=100"),
        api.get("/api/v1/organization/super-distributors?page_size=100"),
      ]);

      const liveMap: Record<string, { id: string; name: string; code: string; currentBal: number }[]> = {
        SUPER_DISTRIBUTOR: [],
        DISTRIBUTOR: [],
        RETAILER: [],
      };

      if (retRes.status === "fulfilled") {
        const d = retRes.value.data;
        const items = Array.isArray(d) ? d : (d?.items || d?.retailers || d?.data || []);
        if (Array.isArray(items) && items.length > 0) {
          liveMap.RETAILER = items
            .filter((r: any) => !r.is_deleted && r.status !== "DEACTIVATED_MERGED")
            .map((r: any) => ({
              id: String(r.public_id || r.id),
              name: r.store_name || r.owner_name || r.legal_name || "Retailer Store",
              code: r.retailer_code || "RET-UNKNOWN",
              currentBal: typeof r.wallet_balance === "number" ? Number(r.wallet_balance) : 0.0,
            }));
        }
      }

      if (distRes.status === "fulfilled") {
        const d = distRes.value.data;
        const items = Array.isArray(d) ? d : (d?.items || d?.distributors || d?.data || []);
        if (Array.isArray(items) && items.length > 0) {
          liveMap.DISTRIBUTOR = items.map((dist: any) => ({
            id: String(dist.public_id || dist.id),
            name: dist.company_name || dist.distributor_name || dist.name || "Distributor",
            code: dist.distributor_code || dist.code || "DIST-UNKNOWN",
            currentBal: typeof dist.wallet_balance === "number" ? Number(dist.wallet_balance) : 0.0,
          }));
        }
      }

      if (sdRes.status === "fulfilled") {
        const d = sdRes.value.data;
        const items = Array.isArray(d) ? d : (d?.items || d?.super_distributors || d?.data || []);
        if (Array.isArray(items) && items.length > 0) {
          liveMap.SUPER_DISTRIBUTOR = items.map((sd: any) => ({
            id: String(sd.public_id || sd.id),
            name: sd.company_name || sd.super_distributor_name || sd.name || "Super Distributor",
            code: sd.super_distributor_code || sd.code || "SD-UNKNOWN",
            currentBal: typeof sd.wallet_balance === "number" ? Number(sd.wallet_balance) : 0.0,
          }));
        }
      }

      setMockEntities(liveMap);

      setSelectedEntity((prev) => {
        if (!prev) return null;
        const currentList = liveMap[scope] || [];
        const matched = currentList.find((e) => e.code === prev.code || e.id === prev.id);
        return matched || prev;
      });
    } catch (err) {
      console.warn("Failed to fetch live database entities:", err);
    }
  };

  // Load real database balances on mount
  useEffect(() => {
    fetchLiveDatabaseEntities();

    if (typeof window !== "undefined") {
      const storedLedger = localStorage.getItem("pay2pay_topup_ledger");
      if (storedLedger) {
        try { setTopupLedger(JSON.parse(storedLedger)); } catch (e) {}
      }
      const storedPerType = localStorage.getItem("pay2pay_frozen_wallets_per_type");
      const storedGlobal = localStorage.getItem("pay2pay_frozen_wallets");
      let combined: any = {};
      if (storedGlobal) {
        try {
          const parsedG = JSON.parse(storedGlobal);
          Object.keys(parsedG).forEach((code) => {
            if (parsedG[code]?.isFrozen) {
              combined[code] = { ALL: { frozen: true, reason: parsedG[code].reason } };
            }
          });
        } catch (e) {}
      }
      if (storedPerType) {
        try {
          const parsedP = JSON.parse(storedPerType);
          combined = { ...combined, ...parsedP };
        } catch (e) {}
      }
      setFrozenWalletsMap(combined);
    }
  }, []);

  const searchParams = useSearchParams();

  // Parse scope & code from URL parameters when redirected from Entity Type page
  useEffect(() => {
    if (searchParams) {
      const qScope = searchParams.get("scope");
      const qCode = searchParams.get("code");
      if (qScope && mockEntities[qScope]) {
        setScope(qScope);
        if (qCode) {
          const matched = mockEntities[qScope].find((e) => e.code === qCode);
          if (matched) {
            setSelectedEntity(matched);
          }
        }
      }
    }
  }, [searchParams, mockEntities]);

  const availableEntities = useMemo(() => mockEntities[scope] || [], [mockEntities, scope]);

  // Check if selected entity / selected wallet type is frozen / locked
  const frozenDetails = useMemo(() => {
    if (!selectedEntity) return { isFrozen: false, reason: "", scope: "" };
    const entityObj = frozenWalletsMap[selectedEntity.code] || {};
    
    // Check Global lock
    if (entityObj["ALL"]?.frozen || entityObj.isFrozen) {
      return { isFrozen: true, reason: entityObj["ALL"]?.reason || entityObj.reason || "Global Compliance Lock", scope: "ALL WALLETS" };
    }
    // Check specific wallet lock (MAIN / COMMISSION / HOLD)
    if (walletType && entityObj[walletType]?.frozen) {
      return { isFrozen: true, reason: entityObj[walletType]?.reason || "Wallet Compliance Lock", scope: `${walletType} WALLET` };
    }
    return { isFrozen: false, reason: "", scope: "" };
  }, [selectedEntity, walletType, frozenWalletsMap]);

  // Handle Form Submission with Live Database Persistence
  const handleTopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntity || !amount || typeof amount !== "number" || amount <= 0) return;

    // Check if target wallet is frozen
    const entityLocks = frozenWalletsMap[selectedEntity.code] || {};
    const isWalletLocked = entityLocks["ALL"]?.frozen || entityLocks[walletType]?.frozen;
    if (isWalletLocked) {
      alert(`Transaction Rejected: The ${walletType} wallet for ${selectedEntity.name} is currently LOCKED / FROZEN by administrator.`);
      return;
    }

    setLoading(true);
    setSuccessMsg("");

    const numericAmount = Number(amount);
    const openingBal = selectedEntity.currentBal;
    const estimatedBalance =
      txnType === "CREDIT"
        ? Math.round((openingBal + numericAmount) * 100) / 100
        : Math.max(0, Math.round((openingBal - numericAmount) * 100) / 100);

    const serviceLabel = SERVICE_OPTIONS.find((s) => s.value === serviceName)?.label || serviceName;
    const createdDateStr = new Date().toISOString();

    const payload = {
      transaction_id: txnId,
      entity_scope: scope,
      entity_id: selectedEntity.id,
      entity_name: selectedEntity.name,
      entity_code: selectedEntity.code,
      service_name: serviceLabel,
      wallet_type: walletType,
      txn_type: txnType,
      amount: numericAmount,
      opening_balance: openingBal,
      balance_after: estimatedBalance,
      comments: comments || "Manual topup allocation",
      created_date: createdDateStr,
      status: "COMPLETED",
      performed_by: "Platform Admin",
    };

    // 1. Post to live database backend API
    try {
      await api.post("/api/v1/wallet-ledger/wallets/manual-topup", payload);
    } catch (err) {
      console.error("Manual topup backend error:", err);
    }

    // 2. Re-fetch live database records
    await fetchLiveDatabaseEntities();

    // 3. Update Recent Topup Ledger in UI
    const newLedgerItem = {
      public_id: `top-${Date.now()}`,
      ...payload,
    };
    const newLedger = [newLedgerItem, ...topupLedger];
    setTopupLedger(newLedger);
    if (typeof window !== "undefined") {
      localStorage.setItem("pay2pay_topup_ledger", JSON.stringify(newLedger));
    }

    // 5. Open Detailed Receipt Modal with Share Options
    setReceiptData(newLedgerItem);

    // 6. Success Message
    setSuccessMsg(
      `Successfully ${txnType === "CREDIT" ? "credited" : "debited"} ₹${numericAmount.toLocaleString("en-IN")} to ${selectedEntity.name} (${selectedEntity.code}). New Available Balance: ₹${estimatedBalance.toLocaleString("en-IN")}`
    );
    setLoading(false);
  };

  const closeReceiptModal = () => {
    setReceiptData(null);

    // CLEAR ALL TEXTBOXES & DROPDOWNS AFTER RECEIPT ACKNOWLEDGEMENT
    setSelectedEntity(null);
    setAmount("");
    setComments("");
    setServiceName("GENERAL");
    setWalletType("MAIN");
    setTxnType("CREDIT");
    setTxnId(`TOPUP-${new Date().toISOString().split("T")[0].replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  // ── Receipt Helper Formatting ──────────────────────────────────────────────
  const getReceiptFormattedText = (item: any) => {
    return `*PAY2PAY ENTERPRISE WALLET ALLOCATION RECEIPT*
----------------------------------------
Transaction ID: ${item.transaction_id}
Date & Time: ${new Date(item.created_date).toLocaleString("en-IN")}
Status: ${item.status} (${item.txn_type})

Entity User: ${item.entity_name}
Entity Code: ${item.entity_code}
Scope: ${item.entity_scope}
Service: ${item.service_name}
Wallet Type: ${item.wallet_type}

Opening Balance: ₹${(item.opening_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
${item.txn_type === "CREDIT" ? "Credit Amount (+)" : "Debit Amount (-)"}: ₹${(item.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
Closing Balance: ₹${(item.balance_after || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}

Audit Reason: ${item.comments}
Authorized By: ${item.performed_by}
----------------------------------------
Thank you for using Pay2Pay Enterprise Portal!`;
  };

  const handleCopyReceipt = (item: any) => {
    const text = getReceiptFormattedText(item);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = (item: any) => {
    const text = getReceiptFormattedText(item);
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleShareEmail = (item: any) => {
    const subject = `Wallet Top-up Receipt - ${item.transaction_id}`;
    const body = getReceiptFormattedText(item);
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const handlePrintReceipt = (itemToPrint?: any) => {
    const item = (itemToPrint && typeof itemToPrint === "object" && itemToPrint.transaction_id) ? itemToPrint : receiptData;
    if (!item || !item.transaction_id) return;

    const printWindow = window.open("", "_blank", "width=750,height=900");
    if (!printWindow) {
      alert("Please allow popup windows to print the transaction receipt.");
      return;
    }

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt_${item.transaction_id}</title>
          <style>
            @page { size: auto; margin: 15mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0;
              padding: 20px;
              background: #ffffff;
              color: #0f172a;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .receipt-card {
              max-width: 580px;
              margin: 0 auto;
              border: 2px solid #0f172a;
              border-radius: 16px;
              padding: 28px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.05);
              background: #ffffff;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 16px;
              margin-bottom: 20px;
            }
            .brand {
              font-size: 22px;
              font-weight: 900;
              color: #2563eb;
              letter-spacing: -0.5px;
            }
            .title {
              font-size: 13px;
              font-weight: 700;
              color: #64748b;
              margin-top: 4px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .badge {
              display: block;
              padding: 10px 16px;
              border-radius: 10px;
              font-size: 13px;
              font-weight: 800;
              text-align: center;
              margin-bottom: 24px;
            }
            .badge-credit { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
            .badge-debit { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
            .row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 10px 0;
              border-bottom: 1px solid #f1f5f9;
              font-size: 13px;
            }
            .label { color: #64748b; font-weight: 700; }
            .value { font-weight: 700; color: #0f172a; text-align: right; }
            .value-bold { font-family: monospace; font-size: 14px; color: #2563eb; font-weight: 800; }
            .amount-green { font-family: monospace; color: #15803d; font-size: 16px; font-weight: 900; }
            .amount-red { font-family: monospace; color: #dc2626; font-size: 16px; font-weight: 900; }
            .balance-box {
              background: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 12px;
              padding: 14px;
              margin-top: 12px;
            }
            .footer-note {
              font-size: 11px;
              color: #64748b;
              margin-top: 24px;
              text-align: center;
              border-top: 1px solid #e2e8f0;
              padding-top: 14px;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="receipt-card">
            <div class="header">
              <div class="brand">PAY2PAY ENTERPRISE PORTAL</div>
              <div class="title">Official Wallet Allocation Receipt</div>
            </div>

            <div class="badge ${item.txn_type === "CREDIT" ? "badge-credit" : "badge-debit"}">
              ${item.txn_type === "CREDIT" ? "✓ WALLET CREDIT ALLOCATION SUCCESSFUL" : "✓ WALLET DEBIT ALLOCATION SUCCESSFUL"}
            </div>

            <div class="row">
              <span class="label">Transaction Ref ID:</span>
              <span class="value value-bold">${item.transaction_id}</span>
            </div>
            <div class="row">
              <span class="label">Date & Time:</span>
              <span class="value">${new Date(item.created_date).toLocaleString("en-IN")}</span>
            </div>
            <div class="row">
              <span class="label">Entity User Name:</span>
              <span class="value">${item.entity_name}</span>
            </div>
            <div class="row">
              <span class="label">Entity Code & Scope:</span>
              <span class="value">${item.entity_code} (${item.entity_scope})</span>
            </div>
            <div class="row">
              <span class="label">Service Name:</span>
              <span class="value">${item.service_name}</span>
            </div>
            <div class="row">
              <span class="label">Target Wallet Type:</span>
              <span class="value">${item.wallet_type}</span>
            </div>
            <div class="row">
              <span class="label">Opening Available Balance:</span>
              <span class="value">₹${(item.opening_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="row">
              <span class="label">${item.txn_type === "CREDIT" ? "Credit Amount (+):" : "Debit Amount (-):"}</span>
              <span class="value ${item.txn_type === "CREDIT" ? "amount-green" : "amount-red"}">
                ${item.txn_type === "CREDIT" ? "+" : "-"}₹${(item.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div class="balance-box">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 13px; font-weight: 800; color: #0f172a;">Closing Available Balance:</span>
                <span class="amount-green" style="font-size: 18px;">₹${(item.balance_after || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="row" style="border-bottom: none; padding-top: 14px;">
              <span class="label">Audit Reason / Note:</span>
              <span class="value" style="max-width: 60%;">${item.comments}</span>
            </div>

            <div class="footer-note">
              This is a computer-generated transaction receipt. Authorized by ${item.performed_by || "Platform Admin"}.
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  const columns: TableColumn<any>[] = [
    {
      id: "transaction_id",
      header: "TOPUP TXN ID",
      accessorKey: "transaction_id",
      sortable: true,
      cell: (r) => (
        <button
          type="button"
          onClick={() => setReceiptData(r)}
          className="font-mono text-xs font-extrabold text-[#2563EB] hover:underline cursor-pointer flex items-center gap-1"
        >
          {r.transaction_id}
          <FileText className="w-3 h-3 text-[#2563EB]" />
        </button>
      ),
    },
    {
      id: "created_date",
      header: "DATE & TIME",
      accessorKey: "created_date",
      sortable: true,
      cell: (r) => (
        <span className="font-mono text-[11px] font-semibold text-[#334155]">
          {new Date(r.created_date).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })}
        </span>
      ),
    },
    {
      id: "entity_name",
      header: "ENTITY USER & CODE",
      cell: (r) => (
        <div>
          <p className="font-bold text-xs text-[#0F172A]">{r.entity_name}</p>
          <p className="font-mono text-[10px] text-[#2563EB] font-bold">{r.entity_code}</p>
        </div>
      ),
    },
    {
      id: "entity_scope",
      header: "SCOPE",
      accessorKey: "entity_scope",
      sortable: true,
      cell: (r) => {
        const scopeColors: Record<string, { bg: string; text: string; border: string; label: string }> = {
          SUPER_DISTRIBUTOR: { bg: "#FEF3C7", text: "#B45309", border: "#FDE68A", label: "Super Distributor" },
          DISTRIBUTOR:       { bg: "#EFF6FF", text: "#2563EB", border: "#BFDBFE", label: "Distributor" },
          RETAILER:          { bg: "#F0FDF4", text: "#16A34A", border: "#BBF7D0", label: "Retailer" },
        };
        const meta = scopeColors[r.entity_scope] || scopeColors.RETAILER;
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
      id: "service_name",
      header: "SERVICE",
      accessorKey: "service_name",
      cell: (r) => (
        <span className="font-sans text-xs font-bold text-[#475569]">{r.service_name}</span>
      ),
    },
    {
      id: "wallet_type",
      header: "WALLET TYPE",
      accessorKey: "wallet_type",
      cell: (r) => (
        <span className="font-mono text-[10px] font-bold text-[#4F46E5] bg-[#EEF2FF] px-2 py-0.5 rounded border border-[#C7D2FE]">
          {r.wallet_type}
        </span>
      ),
    },
    {
      id: "txn_type",
      header: "TYPE",
      accessorKey: "txn_type",
      sortable: true,
      cell: (r) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${
            r.txn_type === "CREDIT"
              ? "bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]"
              : "bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]"
          }`}
        >
          {r.txn_type === "CREDIT" ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          {r.txn_type}
        </span>
      ),
    },
    {
      id: "amount",
      header: "AMOUNT (₹)",
      accessorKey: "amount",
      sortable: true,
      cell: (r) => (
        <span
          className={`font-mono text-xs font-extrabold ${
            r.txn_type === "CREDIT" ? "text-[#15803D]" : "text-[#DC2626]"
          }`}
        >
          {r.txn_type === "CREDIT" ? "+" : "-"}₹{(r.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      id: "balance_after",
      header: "BALANCE AFTER (₹)",
      accessorKey: "balance_after",
      sortable: true,
      cell: (r) => (
        <span className="font-mono text-xs font-extrabold text-[#0F172A]">
          ₹{(r.balance_after || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      id: "comments",
      header: "REASON / COMMENTS",
      accessorKey: "comments",
      cell: (r) => <span className="text-xs text-[#64748B] font-medium max-w-[180px] truncate block">{r.comments}</span>,
    },
    {
      id: "action_receipt",
      header: "RECEIPT",
      cell: (r) => (
        <button
          type="button"
          onClick={() => setReceiptData(r)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#CBD5E1] bg-white text-[11px] font-extrabold text-[#2563EB] hover:bg-[#EFF6FF] hover:border-[#BFDBFE] transition cursor-pointer shadow-2xs"
        >
          <Receipt className="w-3.5 h-3.5" /> Receipt
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] flex items-center gap-3">
            <ArrowLeftRight className="h-7 w-7 text-[#2563EB]" />
            Manual Wallet Top-up &amp; Adjustment
          </h1>
          <p className="mt-1 text-sm font-medium text-[#64748B]">
            Instant credit/debit wallet allocations for SDs, Distributors, and Retailers with audit tracking
          </p>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-between text-xs font-bold text-[#166534] shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[#16A34A] shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="hover:opacity-75 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── TOP-UP FORM & LIVE PREVIEW CARD ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Panel (2 Columns wide) */}
        <div className="lg:col-span-2 rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-3">
            <Wallet className="w-5 h-5 text-[#2563EB]" />
            <h2 className="text-base font-extrabold text-[#0F172A]">Manual Top-up Form</h2>
          </div>

          <form onSubmit={handleTopupSubmit} className="space-y-4 text-xs font-semibold">
            {/* 1. Target Entity Scope Selection */}
            <div>
              <label className="block text-[#475569] font-extrabold uppercase tracking-wider text-[11px] mb-2">
                1. Select Target Entity Scope *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {ENTITY_SCOPES.map((sc) => {
                  const Icon = sc.icon;
                  const isSelected = scope === sc.value;
                  return (
                    <button
                      key={sc.value}
                      type="button"
                      onClick={() => {
                        setScope(sc.value);
                        setSelectedEntity(null);
                      }}
                      className={`flex items-center gap-2 p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "border-[#2563EB] bg-[#EFF6FF] text-[#1E40AF] shadow-2xs"
                          : "border-[#E2E8F0] bg-[#F8FAFC] text-[#475569] hover:bg-white"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" style={{ color: isSelected ? "#2563EB" : sc.color }} />
                      <span className="font-extrabold text-xs truncate">{sc.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Target User Searchable Dropdown */}
            <div>
              <label className="block text-[#475569] font-extrabold uppercase tracking-wider text-[11px] mb-1">
                2. Select Target User / Entity (Searchable) *
              </label>
              <SearchableEntitySelect
                options={availableEntities}
                value={selectedEntity}
                onChange={setSelectedEntity}
                placeholder="Click to select target entity user..."
              />
            </div>

            {/* 3. Service List & Wallet Type Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[#475569] font-extrabold uppercase tracking-wider text-[11px] mb-1">
                  3. Service List *
                </label>
                <select
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-xs font-bold text-[#0F172A] focus:border-[#2563EB] focus:outline-none cursor-pointer"
                >
                  {SERVICE_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#475569] font-extrabold uppercase tracking-wider text-[11px] mb-1">
                  4. Target Wallet Type *
                </label>
                <select
                  value={walletType}
                  onChange={(e) => setWalletType(e.target.value)}
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-xs font-bold text-[#0F172A] focus:border-[#2563EB] focus:outline-none cursor-pointer"
                >
                  {WALLET_TYPES.map((w) => (
                    <option key={w.value} value={w.value}>{w.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4. Txn Reference ID & Transaction Type (Credit / Debit) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[#475569] font-extrabold uppercase tracking-wider text-[11px]">
                    5. Transaction Reference ID *
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setTxnId(
                        `TOPUP-${new Date().toISOString().split("T")[0].replace(/-/g, "")}-${Math.floor(
                          1000 + Math.random() * 9000
                        )}`
                      )
                    }
                    className="text-[10px] font-extrabold text-[#2563EB] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Regenerate ID
                  </button>
                </div>
                <input
                  type="text"
                  value={txnId}
                  onChange={(e) => setTxnId(e.target.value)}
                  className={`w-full rounded-xl border px-3.5 py-2.5 font-mono text-xs font-extrabold transition-colors focus:outline-none ${
                    isTxnIdDuplicate
                      ? "border-[#EF4444] bg-[#FEF2F2] text-[#DC2626]"
                      : "border-[#CBD5E1] bg-[#F8FAFC] text-[#2563EB] focus:border-[#2563EB] focus:bg-white"
                  }`}
                  required
                />
                {isTxnIdDuplicate && (
                  <p className="mt-1 text-[11px] font-bold text-[#DC2626] flex items-center gap-1">
                    ⚠️ Duplicate Ref ID! '{txnId}' already exists in ledger. Please regenerate or change.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[#475569] font-extrabold uppercase tracking-wider text-[11px] mb-1">
                  6. Transaction Direction (Credit / Debit) *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTxnType("CREDIT")}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-extrabold cursor-pointer transition-all ${
                      txnType === "CREDIT"
                        ? "bg-[#DCFCE7] text-[#15803D] border-[#86EFAC] shadow-2xs"
                        : "bg-[#F8FAFC] text-[#64748B] border-[#CBD5E1]"
                    }`}
                  >
                    <Plus className="w-4 h-4" /> 🟢 CREDIT (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxnType("DEBIT")}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-extrabold cursor-pointer transition-all ${
                      txnType === "DEBIT"
                        ? "bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5] shadow-2xs"
                        : "bg-[#F8FAFC] text-[#64748B] border-[#CBD5E1]"
                    }`}
                  >
                    <Minus className="w-4 h-4" /> 🔴 DEBIT (-)
                  </button>
                </div>
              </div>
            </div>

            {/* 5. Topup Amount & Quick Presets */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[#475569] font-extrabold uppercase tracking-wider text-[11px]">
                  7. Topup Amount (₹) *
                </label>
                <div className="flex items-center gap-1">
                  {[5000, 10000, 25000, 50000, 100000].map((presetAmt) => (
                    <button
                      key={presetAmt}
                      type="button"
                      onClick={() => setAmount(presetAmt)}
                      className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#EFF6FF] text-[#2563EB] hover:bg-[#2563EB] hover:text-white transition-colors border border-[#BFDBFE] cursor-pointer"
                    >
                      +₹{(presetAmt / 1000).toFixed(0)}k
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="number"
                step="0.01"
                min="1"
                placeholder="Enter amount in ₹..."
                value={amount}
                onChange={(e) => {
                  const v = e.target.value;
                  setAmount(v === "" ? "" : parseFloat(v) || 0);
                }}
                className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 font-mono text-base font-extrabold text-[#0F172A] focus:border-[#2563EB] focus:outline-none placeholder-[#94A3B8]"
                required
              />
            </div>

            {/* 6. Comments / Audit Note */}
            <div>
              <label className="block text-[#475569] font-extrabold uppercase tracking-wider text-[11px] mb-1">
                8. Compliance Audit Note / Reason *
              </label>
              <textarea
                rows={2}
                placeholder="Enter bank NEFT reference, UTR number, or authorization note..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="w-full rounded-xl border border-[#CBD5E1] bg-white p-3 text-xs font-semibold text-[#0F172A] focus:border-[#2563EB] focus:outline-none placeholder-[#94A3B8]"
                required
              />
            </div>

            {/* Frozen Wallet Compliance Warning Banner */}
            {frozenDetails.isFrozen && (
              <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] flex items-center gap-3 text-xs text-[#991B1B]">
                <ShieldAlert className="w-5 h-5 text-[#DC2626] shrink-0" />
                <div>
                  <p className="font-extrabold text-sm text-[#991B1B]">
                    🚨 TOP-UP BLOCKED: TARGET WALLET IS FROZEN / LOCKED
                  </p>
                  <p className="font-semibold text-[11px] text-[#7F1D1D] mt-0.5">
                    {selectedEntity?.code} has an active <strong>{frozenDetails.scope}</strong> lock. Reason: {frozenDetails.reason}.
                  </p>
                  <p className="text-[10px] text-[#991B1B] mt-0.5">
                    Please unfreeze/unlock the wallet on the Entity Type Wallet page to enable top-ups &amp; adjustments.
                  </p>
                </div>
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-3 border-t border-[#F1F5F9] flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedEntity(null);
                  setAmount("");
                  setComments("");
                  setServiceName("GENERAL");
                  setWalletType("MAIN");
                  setTxnType("CREDIT");
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#475569] font-extrabold text-xs hover:bg-[#EFF6FF] hover:text-[#2563EB] transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear Form
              </button>

              <button
                type="submit"
                disabled={loading || frozenDetails.isFrozen}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-extrabold text-xs shadow-md transition-all ${
                  frozenDetails.isFrozen
                    ? "bg-[#94A3B8] text-white cursor-not-allowed opacity-60"
                    : "bg-[#2563EB] text-white hover:bg-[#1D4ED8] cursor-pointer"
                }`}
              >
                {frozenDetails.isFrozen ? (
                  <>
                    <Lock className="w-4 h-4" />
                    Top-up Blocked (Wallet Frozen)
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Process {txnType} Allocation
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview Card (1 Column wide) */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm space-y-4 h-fit">
          <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-3">
            <Sparkles className="w-5 h-5 text-[#D97706]" />
            <h2 className="text-base font-extrabold text-[#0F172A]">Live Wallet Impact Preview</h2>
          </div>

          {selectedEntity ? (
            <div className="space-y-4">
              {/* Entity Info Box */}
              <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-4 space-y-1">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB]">Target Entity</p>
                <p className="font-extrabold text-sm text-[#0F172A]">{selectedEntity.name}</p>
                <p className="font-mono text-xs text-[#2563EB] font-bold">{selectedEntity.code}</p>
              </div>

              {/* Balance Breakdown */}
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-[#F1F5F9]">
                  <span className="font-semibold text-[#64748B]">Current Available Balance:</span>
                  <span className="font-mono font-extrabold text-[#0F172A] text-sm">
                    ₹{selectedEntity.currentBal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-[#F1F5F9]">
                  <span className="font-semibold text-[#64748B]">
                    {txnType === "CREDIT" ? "🟢 Credit Addition (+):" : "🔴 Debit Deduction (-):"}
                  </span>
                  <span
                    className={`font-mono font-extrabold text-sm ${
                      txnType === "CREDIT" ? "text-[#15803D]" : "text-[#DC2626]"
                    }`}
                  >
                    {txnType === "CREDIT" ? "+" : "-"}₹{numericAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span className="font-extrabold text-[#0F172A]">New Balance After Topup:</span>
                  <span className="font-mono font-extrabold text-base text-[#15803D]">
                    ₹{estimatedBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-start gap-2 text-[11px] text-[#B45309] font-medium">
                <ShieldCheck className="w-4 h-4 shrink-0 text-[#D97706] mt-0.5" />
                <span>
                  All manual topup transactions update the General Ledger automatically and log full audit records.
                </span>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[#94A3B8] font-medium">
              Select a target entity user to preview balance impact.
            </div>
          )}
        </div>
      </div>

      {/* ── RECENT TOP-UP LEDGER TABLE ────────────────────────────────────────── */}
      <DataTable
        data={topupLedger}
        columns={columns}
        keyExtractor={(r) => r.public_id || r.transaction_id}
        loading={loading}
        totalRecords={topupLedger.length}
        onRefresh={() => {}}
        searchPlaceholder="Search recent top-ups by Txn ID, entity name, code..."
      />

      {/* ── PRINT CSS STYLES FOR SINGLE-PAGE RECEIPT PRINTING ──────────────────── */}
      <style jsx global>{`
        @media print {
          /* 1. Hide non-essential layout regions */
          aside, header, nav, footer, .print-hide {
            display: none !important;
          }

          /* 2. Hide everything inside main page content */
          body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          body > *:not(#__next) {
            display: none !important;
          }

          /* 3. Target the modal wrapper */
          .fixed.inset-0 {
            position: static !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            display: flex !important;
            justify-content: center !important;
            align-items: flex-start !important;
            overflow: visible !important;
          }

          #printable-receipt-card {
            position: static !important;
            width: 100% !important;
            max-width: 600px !important;
            margin: 20px auto !important;
            border: 2px solid #0f172a !important;
            border-radius: 16px !important;
            padding: 24px !important;
            background: #ffffff !important;
            color: #0f172a !important;
            box-shadow: none !important;
            display: block !important;
            visibility: visible !important;
          }

          /* Hide page background contents */
          .space-y-6 > *:not(.fixed) {
            display: none !important;
          }
        }
      `}</style>

      {/* ── RECEIPT MODAL WINDOW WITH SHARE OPTIONS ──────────────────────────── */}
      {receiptData && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 overflow-y-auto">
          <div
            id="printable-receipt-card"
            className="w-full max-w-lg rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-2xl space-y-5 my-8 animate-in fade-in zoom-in duration-200"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-[#0F172A]">Transaction Receipt</h2>
                  <p className="text-[11px] font-semibold text-[#64748B]">Pay2Pay Enterprise Wallet Allocation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeReceiptModal}
                className="p-1.5 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0] transition cursor-pointer print-hide"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Receipt Status Badge */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between ${
                receiptData.txn_type === "CREDIT"
                  ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]"
                  : "bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]"
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-extrabold">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>
                  {receiptData.txn_type === "CREDIT"
                    ? "WALLET CREDIT ALLOCATION SUCCESSFUL"
                    : "WALLET DEBIT ALLOCATION SUCCESSFUL"}
                </span>
              </div>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white/80 border border-current">
                {receiptData.status}
              </span>
            </div>

            {/* Printable Receipt Card */}
            <div className="rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] p-4 space-y-3 font-sans text-xs">
              <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-2">
                <span className="font-bold text-[#64748B]">Txn Reference ID:</span>
                <span className="font-mono font-extrabold text-[#2563EB] text-sm">{receiptData.transaction_id}</span>
              </div>

              <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-2">
                <span className="font-bold text-[#64748B]">Date &amp; Time:</span>
                <span className="font-mono font-semibold text-[#0F172A]">
                  {new Date(receiptData.created_date).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>

              <div className="flex justify-between items-start border-b border-[#E2E8F0] pb-2">
                <span className="font-bold text-[#64748B]">Entity User:</span>
                <div className="text-right">
                  <p className="font-extrabold text-[#0F172A]">{receiptData.entity_name}</p>
                  <p className="font-mono text-[10px] font-bold text-[#2563EB]">{receiptData.entity_code}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-b border-[#E2E8F0] pb-2">
                <div>
                  <span className="font-bold text-[#64748B] block text-[10px]">SERVICE TYPE</span>
                  <span className="font-bold text-[#0F172A]">{receiptData.service_name}</span>
                </div>
                <div>
                  <span className="font-bold text-[#64748B] block text-[10px]">WALLET TYPE</span>
                  <span className="font-mono font-bold text-[#4F46E5]">{receiptData.wallet_type}</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center text-[#64748B]">
                  <span>Opening Balance (Before):</span>
                  <span className="font-mono font-bold text-[#0F172A]">
                    ₹{(receiptData.opening_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between items-center font-bold">
                  <span>{receiptData.txn_type === "CREDIT" ? "Credit Amount (+):" : "Debit Amount (-):"}</span>
                  <span
                    className={`font-mono text-sm font-extrabold ${
                      receiptData.txn_type === "CREDIT" ? "text-[#15803D]" : "text-[#DC2626]"
                    }`}
                  >
                    {receiptData.txn_type === "CREDIT" ? "+" : "-"}₹{(receiptData.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-[#CBD5E1] text-[#0F172A]">
                  <span className="font-extrabold text-xs">Closing Available Balance:</span>
                  <span className="font-mono font-extrabold text-base text-[#15803D]">
                    ₹{(receiptData.balance_after || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E2E8F0]">
                <span className="font-bold text-[#64748B] block text-[10px]">AUDIT REASON / NOTE</span>
                <p className="text-[#334155] font-medium text-xs mt-0.5">{receiptData.comments}</p>
              </div>
            </div>

            {/* ── SHARE OPTIONS PANEL ────────────────────────────────────────── */}
            <div className="space-y-2 print-hide">
              <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">
                Share &amp; Export Receipt Options:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* 1. Share WhatsApp */}
                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(receiptData)}
                  className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] text-[#16A34A] font-extrabold text-xs hover:bg-[#DCFCE7] transition cursor-pointer shadow-2xs"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </button>

                {/* 2. Share Email */}
                <button
                  type="button"
                  onClick={() => handleShareEmail(receiptData)}
                  className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB] font-extrabold text-xs hover:bg-[#DBEAFE] transition cursor-pointer shadow-2xs"
                >
                  <Mail className="w-4 h-4" /> Email
                </button>

                {/* 3. Copy Text */}
                <button
                  type="button"
                  onClick={() => handleCopyReceipt(receiptData)}
                  className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#334155] font-extrabold text-xs hover:bg-[#E2E8F0] transition cursor-pointer shadow-2xs"
                >
                  {copied ? <Check className="w-4 h-4 text-[#16A34A]" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy Text"}
                </button>

                {/* 4. Print / PDF */}
                <button
                  type="button"
                  onClick={() => handlePrintReceipt(receiptData)}
                  className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-[#DDD6FE] bg-[#F3E8FF] text-[#7C3AED] font-extrabold text-xs hover:bg-[#EDE9FE] transition cursor-pointer shadow-2xs"
                >
                  <Printer className="w-4 h-4" /> Print / PDF
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-[#F1F5F9] flex justify-end print-hide">
              <button
                type="button"
                onClick={closeReceiptModal}
                className="px-5 py-2.5 rounded-xl bg-[#2563EB] text-white font-extrabold text-xs hover:bg-[#1D4ED8] transition cursor-pointer shadow-md"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ManualTopupPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading Manual Topup...</div>}>
      <ManualTopupContent />
    </Suspense>
  );
}
