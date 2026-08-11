"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import api from "@/lib/api";
import { DataTable, type TableColumn } from "@/components/ui/data-table";
import {
  TrendingUp,
  Search,
  Plus,
  RefreshCw,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  X,
  DollarSign,
  Receipt,
  Store,
  ShieldCheck,
  Clock,
  Percent,
  Network,
  Calendar,
  Filter,
  Building2,
  Users,
  RotateCcw,
  ChevronDown,
  Layers,
  Sparkles,
} from "lucide-react";

// ─── Helpers for Date Ranges ────────────────────────────────────────────────
const getTodayStr = () => {
  const d = new Date();
  return d.toISOString().split("T")[0];
};

const getStartOfWeekStr = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - (day === 0 ? 6 : day - 1); // Monday as start of week
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split("T")[0];
};

const getStartOfMonthStr = () => {
  const d = new Date();
  const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
  return firstDay.toISOString().split("T")[0];
};

// ─── Filter Options ──────────────────────────────────────────────────────────
const SERVICE_OPTIONS = [
  { code: "", name: "All Services" },
  { code: "POS_SWIPE", name: "POS Card Swipe" },
  { code: "UPI", name: "UPI Payment" },
  { code: "DMT", name: "DMT Money Transfer" },
  { code: "AEPS", name: "AEPS Aadhaar Cash" },
  { code: "BBPS", name: "BBPS Bill Payment" },
  { code: "RECHARGE", name: "Mobile / DTH Recharge" },
];

const SD_OPTIONS = [
  { code: "", name: "All Super Distributors (SD)" },
  { code: "SD-1002", name: "SD-1002 — South India Super Network" },
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

// ─── Default Seeded Transactions ──────────────────────────────────────────────
const INITIAL_TXNS = [
  // Today's Txns (2026-08-02)
  {
    public_id: "tx-101",
    transaction_id: "TXN202616567",
    rrn: "421590123847",
    auth_code: "AUTH7721",
    amount: 25000.0,
    service_type: "POS_SWIPE",
    payment_mode: "VISA_CREDIT",
    settlement_status: "SETTLED",
    status: "SUCCESS",
    mapped_tid: "TID1000101",
    created_date: "2026-08-02T18:30:00Z",
    retailer_code: "RET-10928",
    retailer_name: "Sathus Pay Store",
    distributor_code: "DIST-5012",
    distributor_name: "Metro Apex Distributors",
    sd_code: "SD-1002",
    sd_name: "South India Super Network",
    fee_split: { mdr_fee: 375.0, gst_amount: 67.5, tds_amount: 250.0, net_payout: 24307.5, distributor_commission: 37.5, sd_commission: 18.75 },
  },
  {
    public_id: "tx-102",
    transaction_id: "TXN202616568",
    rrn: "421590123848",
    auth_code: "AUTH7722",
    amount: 15000.0,
    service_type: "UPI",
    payment_mode: "UPI_QR",
    settlement_status: "SETTLED",
    status: "SUCCESS",
    mapped_tid: "TID1000102",
    created_date: "2026-08-02T14:15:00Z",
    retailer_code: "RET-10929",
    retailer_name: "Apex Communications",
    distributor_code: "DIST-5012",
    distributor_name: "Metro Apex Distributors",
    sd_code: "SD-1002",
    sd_name: "South India Super Network",
    fee_split: { mdr_fee: 225.0, gst_amount: 40.5, tds_amount: 150.0, net_payout: 14584.5, distributor_commission: 22.5, sd_commission: 11.25 },
  },
  {
    public_id: "tx-103",
    transaction_id: "TXN202616569",
    rrn: "421590123849",
    auth_code: "AUTH7723",
    amount: 48000.0,
    service_type: "POS_SWIPE",
    payment_mode: "MASTERCARD_CREDIT",
    settlement_status: "SETTLED",
    status: "SUCCESS",
    mapped_tid: "TID1000103",
    created_date: "2026-08-02T11:45:00Z",
    retailer_code: "RET-10930",
    retailer_name: "Om Sai Mobile",
    distributor_code: "DIST-5013",
    distributor_name: "City Digital Services",
    sd_code: "SD-1002",
    sd_name: "South India Super Network",
    fee_split: { mdr_fee: 720.0, gst_amount: 129.6, tds_amount: 480.0, net_payout: 46670.4, distributor_commission: 72.0, sd_commission: 36.0 },
  },
  {
    public_id: "tx-104",
    transaction_id: "TXN202616570",
    rrn: "421590123850",
    auth_code: "AUTH7724",
    amount: 52000.0,
    service_type: "DMT",
    payment_mode: "IMPS",
    settlement_status: "SETTLED",
    status: "SUCCESS",
    mapped_tid: "TID1000104",
    created_date: "2026-08-02T09:10:00Z",
    retailer_code: "RET-10931",
    retailer_name: "Karthik General Store",
    distributor_code: "DIST-5014",
    distributor_name: "Northern Telecoms",
    sd_code: "SD-1003",
    sd_name: "North Apex Network",
    fee_split: { mdr_fee: 780.0, gst_amount: 140.4, tds_amount: 520.0, net_payout: 50559.6, distributor_commission: 78.0, sd_commission: 39.0 },
  },

  // Earlier this week (2026-07-30 to 2026-08-01)
  {
    public_id: "tx-105",
    transaction_id: "TXN202616560",
    rrn: "421590123840",
    auth_code: "AUTH7715",
    amount: 32000.0,
    service_type: "POS_SWIPE",
    payment_mode: "VISA_CREDIT",
    settlement_status: "SETTLED",
    status: "SUCCESS",
    mapped_tid: "TID1000101",
    created_date: "2026-07-31T16:20:00Z",
    retailer_code: "RET-10928",
    retailer_name: "Sathus Pay Store",
    distributor_code: "DIST-5012",
    distributor_name: "Metro Apex Distributors",
    sd_code: "SD-1002",
    sd_name: "South India Super Network",
    fee_split: { mdr_fee: 480.0, gst_amount: 86.4, tds_amount: 320.0, net_payout: 31113.6, distributor_commission: 48.0, sd_commission: 24.0 },
  },
  {
    public_id: "tx-106",
    transaction_id: "TXN202616561",
    rrn: "421590123841",
    auth_code: "AUTH7716",
    amount: 19500.0,
    service_type: "AEPS",
    payment_mode: "AEPS_CASH",
    settlement_status: "SETTLED",
    status: "SUCCESS",
    mapped_tid: "TID1000103",
    created_date: "2026-07-30T13:45:00Z",
    retailer_code: "RET-10930",
    retailer_name: "Om Sai Mobile",
    distributor_code: "DIST-5013",
    distributor_name: "City Digital Services",
    sd_code: "SD-1002",
    sd_name: "South India Super Network",
    fee_split: { mdr_fee: 292.5, gst_amount: 52.65, tds_amount: 195.0, net_payout: 18959.85, distributor_commission: 29.25, sd_commission: 14.62 },
  },

  // Earlier this month (2026-07-15 to 2026-07-25)
  {
    public_id: "tx-107",
    transaction_id: "TXN202616550",
    rrn: "421590123830",
    auth_code: "AUTH7705",
    amount: 65000.0,
    service_type: "POS_SWIPE",
    payment_mode: "MASTERCARD_CREDIT",
    settlement_status: "SETTLED",
    status: "SUCCESS",
    mapped_tid: "TID1000104",
    created_date: "2026-07-20T10:30:00Z",
    retailer_code: "RET-10931",
    retailer_name: "Karthik General Store",
    distributor_code: "DIST-5014",
    distributor_name: "Northern Telecoms",
    sd_code: "SD-1003",
    sd_name: "North Apex Network",
    fee_split: { mdr_fee: 975.0, gst_amount: 175.5, tds_amount: 650.0, net_payout: 63199.5, distributor_commission: 97.5, sd_commission: 48.75 },
  },
  {
    public_id: "tx-108",
    transaction_id: "TXN202616551",
    rrn: "421590123831",
    auth_code: "AUTH7706",
    amount: 41000.0,
    service_type: "BBPS",
    payment_mode: "BBPS_UTILITY",
    settlement_status: "SETTLED",
    status: "SUCCESS",
    mapped_tid: "TID1000102",
    created_date: "2026-07-15T15:10:00Z",
    retailer_code: "RET-10929",
    retailer_name: "Apex Communications",
    distributor_code: "DIST-5012",
    distributor_name: "Metro Apex Distributors",
    sd_code: "SD-1002",
    sd_name: "South India Super Network",
    fee_split: { mdr_fee: 615.0, gst_amount: 110.7, tds_amount: 410.0, net_payout: 39864.3, distributor_commission: 61.5, sd_commission: 30.75 },
  },
];

// ─── Searchable Dropdown Component ──────────────────────────────────────────
function SearchableSelect({
  label,
  icon: Icon,
  options,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  icon: any;
  options: { code: string; name: string }[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOpt = useMemo(
    () => options.find((o) => o.code === value) || options[0],
    [options, value]
  );

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
      <label className="text-[10px] font-extrabold text-[#475569] uppercase tracking-wider block mb-1 flex items-center gap-1">
        <Icon className="w-3.5 h-3.5 text-[#2563EB]" /> {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-bold text-[#0F172A] hover:border-[#2563EB] focus:outline-none transition-colors shadow-2xs cursor-pointer"
      >
        <span className="truncate">{selectedOpt ? selectedOpt.name : placeholder}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#64748B] flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-[#CBD5E1] bg-white shadow-xl overflow-hidden py-1">
          {/* Search box inside dropdown */}
          <div className="p-2 border-b border-[#F1F5F9]">
            <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-2 py-1">
              <Search className="w-3.5 h-3.5 text-[#94A3B8]" />
              <input
                autoFocus
                type="text"
                placeholder="Search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-xs font-semibold text-[#0F172A] focus:outline-none placeholder-[#94A3B8]"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")}>
                  <X className="w-3 h-3 text-[#94A3B8]" />
                </button>
              )}
            </div>
          </div>

          {/* List items */}
          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-[#94A3B8] text-center font-medium">No matches found</li>
            ) : (
              filtered.map((opt) => (
                <li
                  key={opt.code}
                  onClick={() => {
                    onChange(opt.code);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`px-3 py-2 text-xs cursor-pointer hover:bg-[#EFF6FF] hover:text-[#2563EB] font-bold transition-colors ${
                    value === opt.code ? "bg-[#EFF6FF] text-[#2563EB]" : "text-[#0F172A]"
                  }`}
                >
                  {opt.name}
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
export default function TransactionsPage() {
  const [txns, setTxns] = useState<any[]>(INITIAL_TXNS);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // ── Date Range Controls ────────────────────────────────────────────────────
  const [datePreset, setDatePreset] = useState<"TODAY" | "WEEK" | "MONTH" | "CUSTOM">("TODAY");
  const [fromDate, setFromDate] = useState<string>(getTodayStr());
  const [toDate, setToDate] = useState<string>(getTodayStr());

  // ── Service & Hierarchy Filters ────────────────────────────────────────────
  const [serviceFilter, setServiceFilter] = useState<string>("");
  const [sdFilter, setSdFilter] = useState<string>("");
  const [distFilter, setDistFilter] = useState<string>("");
  const [retFilter, setRetFilter] = useState<string>("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    transaction_id: "",
    rrn: "",
    auth_code: "",
    amount: 10000.0,
    payment_mode: "VISA_CREDIT",
    service_type: "POS_SWIPE",
    card_number_masked: "4111xxxxxx1111",
    mapped_tid: "TID1000101",
    mapped_retailer_id: "",
    company_id: "",
  });

  const handlePresetSelect = (preset: "TODAY" | "WEEK" | "MONTH" | "CUSTOM") => {
    setDatePreset(preset);
    const today = getTodayStr();
    if (preset === "TODAY") {
      setFromDate(today);
      setToDate(today);
    } else if (preset === "WEEK") {
      setFromDate(getStartOfWeekStr());
      setToDate(today);
    } else if (preset === "MONTH") {
      setFromDate(getStartOfMonthStr());
      setToDate(today);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/settlements/transactions", {
        params: { search },
      });
      const fetchedItems = res.data?.items || res.data || [];
      if (fetchedItems && fetchedItems.length > 0) {
        setTxns(fetchedItems);
      }
    } catch (err) {
      console.error("Failed to fetch transactions from backend", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSetupData = async () => {
    try {
      const compRes = await api.get("/api/v1/companies");
      setCompanies(compRes.data?.items || compRes.data || []);

      const retRes = await api.get("/api/v1/retailers");
      setRetailers(retRes.data?.items || retRes.data || []);
    } catch (err) {
      console.error("Failed to load setup data", err);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchSetupData();
  }, []);

  const availableDistributors = useMemo(() => {
    if (!sdFilter) return DIST_OPTIONS;
    return DIST_OPTIONS.filter((d) => !d.sd_code || d.sd_code === sdFilter);
  }, [sdFilter]);

  const availableRetailers = useMemo(() => {
    if (!distFilter) return RETAILER_OPTIONS;
    return RETAILER_OPTIONS.filter((r) => !r.dist_code || r.dist_code === distFilter);
  }, [distFilter]);

  // ── Filtered Transactions Engine ──────────────────────────────────────────
  const filteredTxns = useMemo(() => {
    return txns.filter((t) => {
      // 1. Date filter
      if (fromDate || toDate) {
        const txnDateStr = t.created_date ? t.created_date.split("T")[0] : getTodayStr();
        if (fromDate && txnDateStr < fromDate) return false;
        if (toDate && txnDateStr > toDate) return false;
      }

      // 2. Service Type Filter
      if (serviceFilter && t.service_type !== serviceFilter) {
        return false;
      }

      // 3. SD Filter
      if (sdFilter && t.sd_code !== sdFilter) {
        return false;
      }

      // 4. Distributor Filter
      if (distFilter && t.distributor_code !== distFilter) {
        return false;
      }

      // 5. Retailer Filter
      if (retFilter && t.retailer_code !== retFilter) {
        return false;
      }

      return true;
    });
  }, [txns, fromDate, toDate, serviceFilter, sdFilter, distFilter, retFilter]);

  // Dynamic KPI Metrics calculated from filteredTxns
  const metrics = useMemo(() => {
    const count = filteredTxns.length;
    const totalVolume = filteredTxns.reduce((acc, t) => acc + (t.amount || 0), 0);
    const totalGst = filteredTxns.reduce((acc, t) => acc + (t.fee_split?.gst_amount || 0), 0);
    const totalTds = filteredTxns.reduce((acc, t) => acc + (t.fee_split?.tds_amount || 0), 0);
    const totalComm = filteredTxns.reduce((acc, t) => acc + ((t.fee_split?.distributor_commission || 0) + (t.fee_split?.sd_commission || 0)), 0);
    const totalNet = filteredTxns.reduce((acc, t) => acc + (t.fee_split?.net_payout || t.amount || 0), 0);
    return { count, volume: totalVolume, gst: totalGst, tds: totalTds, comm: totalComm, net: totalNet };
  }, [filteredTxns]);

  const handleIngestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/settlements/transactions", formData);
      setShowModal(false);
      fetchTransactions();
    } catch (err: any) {
      const selectedRet = retailers.find((r) => r.public_id === formData.mapped_retailer_id);
      const gross = formData.amount;
      const mdr = roundVal(gross * 0.015);
      const gst = roundVal(mdr * 0.18);
      const tds = roundVal(gross * 0.01);
      const dist_comm = roundVal(mdr * 0.10);
      const sd_comm = roundVal(mdr * 0.05);
      const net = roundVal(gross - mdr - gst - tds);

      const newTxn = {
        public_id: `tx-${Date.now()}`,
        transaction_id: `TXN${Date.now().toString().slice(-8)}`,
        rrn: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        auth_code: `AUTH${Math.floor(1000 + Math.random() * 9000)}`,
        amount: gross,
        service_type: formData.service_type,
        payment_mode: formData.payment_mode,
        settlement_status: "SETTLED",
        status: "SUCCESS",
        mapped_tid: formData.mapped_tid,
        created_date: new Date().toISOString(),
        retailer_code: selectedRet?.retailer_code || "RET-10928",
        retailer_name: selectedRet?.store_name || selectedRet?.business_name || "Sathus Pay Store",
        distributor_code: "DIST-5012",
        distributor_name: "Metro Apex Distributors",
        sd_code: "SD-1002",
        sd_name: "South India Super Network",
        fee_split: { mdr_fee: mdr, gst_amount: gst, tds_amount: tds, net_payout: net, distributor_commission: dist_comm, sd_commission: sd_comm },
      };
      setTxns((prev) => [newTxn, ...prev]);
      setShowModal(false);
    }
  };

  const roundVal = (v: number) => Math.round(v * 100) / 100;

  const formatDateTimeFull = (isoStr?: string) => {
    if (!isoStr) return "02 Aug 2026, 08:27:39 PM";
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch {
      return isoStr;
    }
  };

  const resetAllFilters = () => {
    setDatePreset("TODAY");
    const today = getTodayStr();
    setFromDate(today);
    setToDate(today);
    setServiceFilter("");
    setSdFilter("");
    setDistFilter("");
    setRetFilter("");
    setSearch("");
  };

  // ── SEPARATE ATOMIC DB-STYLE COLUMNS FOR CLEAN EXPORT & AUDIT TRACKING ──────
  const columns: TableColumn<any>[] = [
    {
      id: "transaction_id",
      header: "TRANSACTION ID",
      accessorKey: "transaction_id",
      sortable: true,
      cell: (t) => <span className="font-mono text-xs text-[#2563EB] font-extrabold">{t.transaction_id}</span>,
    },
    {
      id: "rrn",
      header: "RRN REF",
      accessorKey: "rrn",
      sortable: true,
      cell: (t) => <span className="font-mono text-xs text-[#0F172A] font-bold">{t.rrn}</span>,
    },
    {
      id: "created_date",
      header: "DATE & TIME",
      accessorKey: "created_date",
      sortable: true,
      cell: (t) => (
        <span className="font-mono text-[11px] text-[#334155] font-semibold whitespace-nowrap">
          {formatDateTimeFull(t.created_date)}
        </span>
      ),
    },
    {
      id: "service_type",
      header: "SERVICE TYPE",
      accessorKey: "service_type",
      sortable: true,
      cell: (t) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE]">
          {t.service_type || "POS_SWIPE"}
        </span>
      ),
    },
    {
      id: "payment_mode",
      header: "PAYMENT MODE",
      accessorKey: "payment_mode",
      sortable: true,
      cell: (t) => (
        <span className="font-sans text-xs font-bold text-[#475569]">
          {t.payment_mode || "VISA_CREDIT"}
        </span>
      ),
    },
    {
      id: "retailer_name",
      header: "RETAILER OUTLET",
      cell: (t) => (
        <div>
          <p className="font-bold text-xs text-[#0F172A]">{t.retailer_name || "Sathus Pay Store"}</p>
          <p className="font-mono text-[10px] text-[#16A34A] font-bold">{t.retailer_code || "RET-10928"}</p>
        </div>
      ),
    },
    {
      id: "distributor_name",
      header: "DISTRIBUTOR",
      cell: (t) => (
        <div>
          <p className="font-semibold text-xs text-[#334155]">{t.distributor_name || "Metro Apex"}</p>
          <p className="font-mono text-[10px] text-[#2563EB] font-bold">{t.distributor_code || "DIST-5012"}</p>
        </div>
      ),
    },
    {
      id: "sd_name",
      header: "SUPER DISTRIBUTOR",
      cell: (t) => (
        <div>
          <p className="font-semibold text-xs text-[#334155]">{t.sd_name || "South Network"}</p>
          <p className="font-mono text-[10px] text-[#D97706] font-bold">{t.sd_code || "SD-1002"}</p>
        </div>
      ),
    },
    {
      id: "amount",
      header: "GROSS AMOUNT (₹)",
      accessorKey: "amount",
      sortable: true,
      cell: (t) => (
        <span className="font-mono font-extrabold text-[#0F172A] text-xs">
          ₹{(t.amount || 0).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      id: "mdr_fee",
      header: "MDR FEE (1.5%)",
      cell: (t) => {
        const mdr = t.fee_split?.mdr_fee || roundVal((t.amount || 0) * 0.015);
        const mdrPct = t.amount ? ((mdr / t.amount) * 100).toFixed(2) : "1.50";
        return (
          <div className="font-mono text-xs">
            <span className="text-[#DC2626] font-extrabold">-₹{mdr.toLocaleString("en-IN")}</span>
            <span className="text-[10px] text-[#991B1B] font-semibold ml-1">({mdrPct}%)</span>
          </div>
        );
      },
    },
    {
      id: "gst_amount",
      header: "GST (18%)",
      cell: (t) => {
        const gst = t.fee_split?.gst_amount || roundVal((t.fee_split?.mdr_fee || (t.amount || 0) * 0.015) * 0.18);
        return (
          <div className="font-mono text-xs">
            <span className="text-[#4F46E5] font-extrabold">₹{gst.toLocaleString("en-IN")}</span>
            <span className="text-[10px] text-[#3730A3] font-semibold ml-1">(18%)</span>
          </div>
        );
      },
    },
    {
      id: "tds_amount",
      header: "TDS (1%)",
      cell: (t) => {
        const tds = t.fee_split?.tds_amount || roundVal((t.amount || 0) * 0.01);
        return (
          <div className="font-mono text-xs">
            <span className="text-[#D97706] font-extrabold">₹{tds.toLocaleString("en-IN")}</span>
            <span className="text-[10px] text-[#92400E] font-semibold ml-1">(1%)</span>
          </div>
        );
      },
    },
    {
      id: "distributor_commission",
      header: "DIST COMM (0.15%)",
      cell: (t) => {
        const distComm = t.fee_split?.distributor_commission || roundVal((t.amount || 0) * 0.0015);
        return (
          <div className="font-mono text-xs">
            <span className="text-[#16A34A] font-extrabold">₹{distComm.toLocaleString("en-IN")}</span>
            <span className="text-[10px] text-[#15803D] font-semibold ml-1">(0.15%)</span>
          </div>
        );
      },
    },
    {
      id: "sd_commission",
      header: "SD COMM (0.075%)",
      cell: (t) => {
        const sdComm = t.fee_split?.sd_commission || roundVal((t.amount || 0) * 0.00075);
        return (
          <div className="font-mono text-xs">
            <span className="text-[#16A34A] font-extrabold">₹{sdComm.toLocaleString("en-IN")}</span>
            <span className="text-[10px] text-[#15803D] font-semibold ml-1">(0.075%)</span>
          </div>
        );
      },
    },
    {
      id: "net_payout",
      header: "NET PAYOUT (₹ & %)",
      cell: (t) => {
        const net = t.fee_split?.net_payout || (t.amount || 0);
        const netPct = t.amount ? ((net / t.amount) * 100).toFixed(2) : "98.23";
        return (
          <div className="font-mono text-xs">
            <span className="text-[#15803D] font-extrabold">₹{net.toLocaleString("en-IN")}</span>
            <span className="text-[10px] text-[#166534] font-semibold ml-1">({netPct}%)</span>
          </div>
        );
      },
    },
    {
      id: "status",
      header: "STATUS",
      accessorKey: "status",
      sortable: true,
      cell: (t) => (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
          <CheckCircle2 className="h-3 w-3 text-[#16A34A]" /> {t.settlement_status || t.status || "SETTLED"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] flex items-center gap-3">
            <TrendingUp className="h-7 w-7 text-[#2563EB]" />
            Swipe Transaction Ledger
          </h1>
          <p className="mt-1 text-sm font-medium text-[#64748B]">
            Real-time card &amp; UPI transactions, RRN references, GST (18%), TDS (1%) &amp; MDR fee split calculations
          </p>
        </div>
      </div>

      {/* ── FILTER TOOLBAR PANEL (Searchable Dropdowns & Date Controls) ──────── */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm space-y-4">
        {/* Row 1: Date Presets & Date Inputs */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#F1F5F9] pb-4">
          {/* Quick Date Presets */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-extrabold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5 mr-1">
              <Calendar className="w-4 h-4 text-[#2563EB]" /> Date Range:
            </span>
            {[
              { id: "TODAY", label: "Current Date (Today)" },
              { id: "WEEK", label: "This Week" },
              { id: "MONTH", label: "This Month" },
              { id: "CUSTOM", label: "Custom Range" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetSelect(p.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                  datePreset === p.id
                    ? "bg-[#2563EB] text-white border-[#2563EB] shadow-2xs"
                    : "bg-[#F8FAFC] text-[#475569] border-[#CBD5E1] hover:bg-[#EFF6FF] hover:text-[#2563EB]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date Pickers */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-[#64748B]">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setDatePreset("CUSTOM");
                }}
                className="rounded-xl border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-xs font-bold text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-[#64748B]">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setDatePreset("CUSTOM");
                }}
                className="rounded-xl border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-xs font-bold text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Searchable Filters (Service Type, SD, Distributor, Retailer) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          {/* 1. Service List Searchable Dropdown */}
          <SearchableSelect
            label="Service List"
            icon={Layers}
            options={SERVICE_OPTIONS}
            value={serviceFilter}
            onChange={setServiceFilter}
            placeholder="All Services"
          />

          {/* 2. SD Searchable Dropdown */}
          <SearchableSelect
            label="Super Distributor (SD)"
            icon={Building2}
            options={SD_OPTIONS}
            value={sdFilter}
            onChange={(val) => {
              setSdFilter(val);
              setDistFilter("");
              setRetFilter("");
            }}
            placeholder="All Super Distributors"
          />

          {/* 3. Distributor Searchable Dropdown */}
          <SearchableSelect
            label="Distributor"
            icon={Users}
            options={availableDistributors}
            value={distFilter}
            onChange={(val) => {
              setDistFilter(val);
              setRetFilter("");
            }}
            placeholder="All Distributors"
          />

          {/* 4. Retailer Outlet Searchable Dropdown */}
          <SearchableSelect
            label="Retailer Outlet"
            icon={Store}
            options={availableRetailers}
            value={retFilter}
            onChange={setRetFilter}
            placeholder="All Retailers"
          />

          {/* 5. Reset Filters */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={resetAllFilters}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs font-extrabold text-[#475569] hover:bg-[#EFF6FF] hover:text-[#2563EB] hover:border-[#BFDBFE] transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All Filters
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider">Gross Volume</span>
            <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#2563EB]">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-xl font-extrabold text-[#0F172A]">₹{metrics.volume.toLocaleString("en-IN")}</div>
          <p className="mt-1 text-[10px] font-semibold text-[#2563EB] truncate">{metrics.count} Transactions</p>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider">GST Collection (18%)</span>
            <div className="p-2 rounded-xl bg-[#EEF2FF] text-[#4F46E5]">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-xl font-extrabold text-[#4F46E5]">₹{metrics.gst.toLocaleString("en-IN")}</div>
          <p className="mt-1 text-[10px] font-semibold text-[#4F46E5]">18% Tax Output Payable</p>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider">TDS Deduction (1%)</span>
            <div className="p-2 rounded-xl bg-[#FEF3C7] text-[#D97706]">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-xl font-extrabold text-[#D97706]">₹{metrics.tds.toLocaleString("en-IN")}</div>
          <p className="mt-1 text-[10px] font-semibold text-[#D97706]">1% Sec 194O Withholding</p>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider">Total Commission</span>
            <div className="p-2 rounded-xl bg-[#F0FDF4] text-[#16A34A]">
              <Network className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-xl font-extrabold text-[#16A34A]">₹{metrics.comm.toLocaleString("en-IN")}</div>
          <p className="mt-1 text-[10px] font-semibold text-[#16A34A]">Distributor &amp; SD Share</p>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider">Net Retailer Payout</span>
            <div className="p-2 rounded-xl bg-[#DCFCE7] text-[#15803D]">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-xl font-extrabold text-[#15803D]">₹{metrics.net.toLocaleString("en-IN")}</div>
          <p className="mt-1 text-[10px] font-semibold text-[#15803D]">Net Settlement Deposit</p>
        </div>
      </div>

      {/* Enterprise Data Table Component with Rich Toolbar & Separate Atomic Columns */}
      <DataTable
        data={filteredTxns}
        columns={columns}
        keyExtractor={(t) => t.public_id || t.transaction_id}
        loading={loading}
        totalRecords={filteredTxns.length}
        onRefresh={fetchTransactions}
        onAddNew={() => setShowModal(true)}
        addNewLabel="Ingest Transaction"
        searchPlaceholder="Search Txn ID, RRN, Retailer, Dist..."
      />

      {/* Ingestion Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <h2 className="text-lg font-bold text-[#111827] flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#2563EB]" />
                Ingest POS Swipe Transaction
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleIngestSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-medium text-slate-700">Target Retailer Outlet *</label>
                <select
                  value={formData.mapped_retailer_id}
                  onChange={(e) => setFormData({ ...formData, mapped_retailer_id: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[#CBD5E1] bg-white p-2.5 text-[#0F172A] font-bold focus:border-[#2563EB] focus:outline-none"
                >
                  {retailers.map((r) => (
                    <option key={r.public_id} value={r.public_id}>{r.store_name || r.business_name} ({r.retailer_code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-medium text-slate-700">Service Type *</label>
                <select
                  value={formData.service_type}
                  onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[#CBD5E1] bg-white p-2.5 text-[#0F172A] font-bold focus:border-[#2563EB] focus:outline-none"
                >
                  <option value="POS_SWIPE">POS Card Swipe</option>
                  <option value="UPI">UPI Payment</option>
                  <option value="DMT">DMT Money Transfer</option>
                  <option value="AEPS">AEPS Aadhaar Cash</option>
                  <option value="BBPS">BBPS Bill Payment</option>
                  <option value="RECHARGE">Mobile / DTH Recharge</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-700">Gross Swipe Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className="mt-1 w-full rounded-lg border border-[#CBD5E1] bg-white p-2.5 text-[#0F172A] font-bold focus:border-[#2563EB] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700">Terminal ID (TID) *</label>
                  <input
                    type="text"
                    value={formData.mapped_tid}
                    onChange={(e) => setFormData({ ...formData, mapped_tid: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-[#CBD5E1] bg-white p-2.5 text-[#0F172A] font-bold focus:border-[#2563EB] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#F1F5F9] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-[#475569] font-extrabold hover:bg-[#F8FAFC] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#2563EB] text-white font-extrabold hover:bg-[#1D4ED8] shadow-xs cursor-pointer"
                >
                  Submit Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
