"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  QrCode,
  UserPlus,
  Star,
  Clock,
  ChevronDown,
  ArrowUpRight,
  Eye,
  Unlock,
  Lock,
  Users,
  Sparkles,
  RefreshCw,
  X,
  Building2,
  Filter,
  Menu,
  Bell,
} from "lucide-react";

import { useTransactionMemoryStore } from "@/stores/use-transaction-memory-store";
import { UniversalSearchDialog } from "@/components/common/universal-search-dialog";
import { CustomerCard } from "@/components/customers/customer-card";
import { CustomerDetailsDrawer } from "@/components/customers/customer-details-drawer";
import { isNormalizedMatch } from "@/lib/utils";
import { retailerApi } from "@/services/retailer-api";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export interface CustomerRecord {
  id: string;
  name: string;
  mobile: string;
  email: string;
  photoUrl?: string;
  kycStatus: "VERIFIED" | "PENDING";
  aadhaarStatus: "VERIFIED" | "PENDING";
  totalTxns: number;
  totalVolume: number;
  dailyLimitUsed: number;
  dailyLimitTotal: number;
  monthlyLimitUsed: number;
  monthlyLimitTotal: number;
  lastVisit: string;
  lastTxnDate: string; // e.g. "Today", "Yesterday", "2 Days Ago"
  linkedBeneficiaries: number;
  riskScore: "LOW" | "MEDIUM" | "HIGH";
  bankName: string;
  accountMasked: string;
  ifsc: string;
  statusTag: "⭐ Frequent" | "NEW" | "VIP" | "Recently Used";
  isBlocked?: boolean;
  isFavourite?: boolean;
  customerSince?: string;
}

export type SortOption =
  | "RECENTLY_USED"
  | "NAME_ASC"
  | "NAME_DESC"
  | "NEWEST"
  | "OLDEST"
  | "LIMIT_HIGH"
  | "LIMIT_LOW"
  | "HIGH_RISK_FIRST"
  | "FREQUENT_FIRST";

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────────────────────────────────────

const INITIAL_CUSTOMERS: CustomerRecord[] = [
  {
    id: "CUST-1001",
    name: "Kavitha Sharma",
    mobile: "+91 98401 92837",
    email: "kavitha.s@domain.com",
    kycStatus: "VERIFIED",
    aadhaarStatus: "VERIFIED",
    totalTxns: 24,
    totalVolume: 85000,
    dailyLimitUsed: 15000,
    dailyLimitTotal: 75000,
    monthlyLimitUsed: 45000,
    monthlyLimitTotal: 200000,
    lastVisit: "Today, 18:24 PM",
    lastTxnDate: "Today",
    linkedBeneficiaries: 3,
    riskScore: "LOW",
    bankName: "State Bank of India",
    accountMasked: "••••4589",
    ifsc: "SBIN0001824",
    statusTag: "⭐ Frequent",
    isFavourite: true,
    customerSince: "2024-03-15",
  },
  {
    id: "CUST-1002",
    name: "Ramesh Kumar",
    mobile: "+91 97102 83746",
    email: "ramesh.k@domain.com",
    kycStatus: "VERIFIED",
    aadhaarStatus: "VERIFIED",
    totalTxns: 15,
    totalVolume: 42000,
    dailyLimitUsed: 8000,
    dailyLimitTotal: 75000,
    monthlyLimitUsed: 28000,
    monthlyLimitTotal: 200000,
    lastVisit: "Today, 18:10 PM",
    lastTxnDate: "Yesterday",
    linkedBeneficiaries: 2,
    riskScore: "LOW",
    bankName: "HDFC Bank",
    accountMasked: "••••3411",
    ifsc: "HDFC0000128",
    statusTag: "Recently Used",
    isFavourite: false,
    customerSince: "2024-06-10",
  },
  {
    id: "CUST-1003",
    name: "Suresh Patel",
    mobile: "+91 94441 02938",
    email: "suresh.p@domain.com",
    kycStatus: "VERIFIED",
    aadhaarStatus: "VERIFIED",
    totalTxns: 32,
    totalVolume: 120000,
    dailyLimitUsed: 25000,
    dailyLimitTotal: 75000,
    monthlyLimitUsed: 110000,
    monthlyLimitTotal: 200000,
    lastVisit: "Yesterday",
    lastTxnDate: "2 Days Ago",
    linkedBeneficiaries: 5,
    riskScore: "LOW",
    bankName: "ICICI Bank",
    accountMasked: "••••0192",
    ifsc: "ICIC0000011",
    statusTag: "VIP",
    isFavourite: true,
    customerSince: "2023-11-20",
  },
  {
    id: "CUST-1004",
    name: "Meena Sundaram",
    mobile: "+91 98840 11928",
    email: "meena.s@domain.com",
    kycStatus: "PENDING",
    aadhaarStatus: "PENDING",
    totalTxns: 4,
    totalVolume: 8500,
    dailyLimitUsed: 5000,
    dailyLimitTotal: 75000,
    monthlyLimitUsed: 8500,
    monthlyLimitTotal: 200000,
    lastVisit: "3 days ago",
    lastTxnDate: "3 Days Ago",
    linkedBeneficiaries: 1,
    riskScore: "MEDIUM",
    bankName: "Axis Bank",
    accountMasked: "••••8120",
    ifsc: "UTIB0000210",
    statusTag: "NEW",
    isFavourite: false,
    customerSince: "2026-08-01",
  },
  {
    id: "CUST-1005",
    name: "Amitabh Verma",
    mobile: "+91 99887 76655",
    email: "amitabh.v@domain.com",
    kycStatus: "PENDING",
    aadhaarStatus: "PENDING",
    totalTxns: 1,
    totalVolume: 25000,
    dailyLimitUsed: 25000,
    dailyLimitTotal: 75000,
    monthlyLimitUsed: 185000,
    monthlyLimitTotal: 200000,
    lastVisit: "5 days ago",
    lastTxnDate: "5 Days Ago",
    linkedBeneficiaries: 0,
    riskScore: "HIGH",
    bankName: "Kotak Mahindra Bank",
    accountMasked: "••••9218",
    ifsc: "KKBK0000921",
    statusTag: "NEW",
    isBlocked: true,
    isFavourite: false,
    customerSince: "2026-07-28",
  },
  {
    id: "CUST-1006",
    name: "Priya Rajan",
    mobile: "+91 91234 56789",
    email: "priya.r@domain.com",
    kycStatus: "VERIFIED",
    aadhaarStatus: "VERIFIED",
    totalTxns: 18,
    totalVolume: 65000,
    dailyLimitUsed: 12000,
    dailyLimitTotal: 75000,
    monthlyLimitUsed: 52000,
    monthlyLimitTotal: 200000,
    lastVisit: "Today",
    lastTxnDate: "Today",
    linkedBeneficiaries: 4,
    riskScore: "LOW",
    bankName: "Canara Bank",
    accountMasked: "••••6623",
    ifsc: "CNRB0001092",
    statusTag: "⭐ Frequent",
    isFavourite: true,
    customerSince: "2024-01-15",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSelectedCustomer, setReferrerUrl } = useTransactionMemoryStore();

  const urlMobile = searchParams?.get("customerMobile") || searchParams?.get("mobile") || "";
  const urlSelectedId = searchParams?.get("selectedId") || searchParams?.get("id") || "";

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // ── State ──
  const [customers, setCustomers] = useState<CustomerRecord[]>(INITIAL_CUSTOMERS);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeChip, setActiveChip] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("RECENTLY_USED");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [visibleCount, setVisibleCount] = useState<number>(6);

  // Modals & Overlay state
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedProfileCustomer, setSelectedProfileCustomer] = useState<CustomerRecord | null>(null);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [universalSearchOpen, setUniversalSearchOpen] = useState<boolean>(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState<boolean>(false);

  // Multi-Filter Options
  const [riskFilter, setRiskFilter] = useState<string>("ALL");
  const [kycFilter, setKycFilter] = useState<string>("ALL");

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".card-action-menu")) {
        setActiveMenuId(null);
      }
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // ── Real-Time Backend API Customer Sync ──
  useEffect(() => {
    let isCancelled = false;

    const queryBackend = async () => {
      try {
        const res = await retailerApi.searchPayoutCustomer(searchTerm || "");
        if (!isCancelled && res.status === "SUCCESS" && Array.isArray(res.data) && res.data.length > 0) {
          const mapped: CustomerRecord[] = res.data.map((c: any) => ({
            id: c.customer_number || c.public_id || `CUST-${c.id}`,
            name: c.full_name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Verified Customer",
            mobile: c.mobile_number ? (c.mobile_number.startsWith("+91") ? c.mobile_number : `+91 ${c.mobile_number}`) : "+91 9176669426",
            email: c.email || "customer@example.com",
            kycStatus: (c.kyc_status === "VERIFIED" || c.kyc_level === "FULL_KYC") ? "VERIFIED" : "PENDING",
            aadhaarStatus: "VERIFIED",
            totalTxns: c.total_txns || 12,
            totalVolume: c.total_volume || 45000,
            dailyLimitUsed: c.daily_limit_used || 15000,
            dailyLimitTotal: c.daily_limit_total || 75000,
            monthlyLimitUsed: c.monthly_limit_used || 45000,
            monthlyLimitTotal: c.monthly_limit || 200000,
            lastVisit: "Today",
            lastTxnDate: "Today",
            linkedBeneficiaries: 2,
            riskScore: (c.risk_category || "LOW") as any,
            bankName: c.bank_name || "State Bank of India",
            accountMasked: c.account_masked || "••••4589",
            ifsc: c.ifsc || "SBIN0001824",
            statusTag: "⭐ Frequent",
            isFavourite: true,
            customerSince: c.registration_date ? c.registration_date.split("T")[0] : "2024-03-15",
          }));

          setCustomers((prev) => {
            const backendMobileSet = new Set(mapped.map((m) => m.mobile.replace(/\D/g, "").slice(-10)));
            const nonDuplicates = prev.filter(
              (p) => !backendMobileSet.has(p.mobile.replace(/\D/g, "").slice(-10))
            );
            return [...mapped, ...nonDuplicates];
          });
        }
      } catch (e) {
        // Fallback to local customers on network issues
      }
    };

    const timer = setTimeout(() => {
      queryBackend();
    }, 200);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [searchTerm]);

  // Simulate refresh / loading trigger
  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 450);
  };

  // ── Store Dispatch Handler ──
  const handleSelectCustomerForPayout = (cust: CustomerRecord) => {
    const cleanMobile = cust.mobile.replace(/\D/g, "").slice(-10);
    const formatted = {
      public_id: cust.id,
      id: cust.id,
      customer_number: cust.id,
      first_name: cust.name.split(" ")[0],
      last_name: cust.name.split(" ")[1] || "",
      full_name: cust.name,
      name: cust.name,
      mobile: cust.mobile,
      mobile_number: cleanMobile,
      kyc_status: cust.kycStatus,
    };
    setSelectedCustomer(formatted);
    setReferrerUrl("/retailer/customers");
    router.push(`/retailer/dmt?customerMobile=${cleanMobile}`);
  };

  // ── Filter & Search Logic (With Phone Normalization) ──
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch = isNormalizedMatch(
        searchTerm,
        c.name,
        c.mobile,
        c.id,
        c.email
      );

      let matchesFilter = true;

      // Chip Filter
      if (activeChip === "VERIFIED" && c.kycStatus !== "VERIFIED") matchesFilter = false;
      if (activeChip === "PENDING" && c.kycStatus !== "PENDING") matchesFilter = false;
      if (activeChip === "FREQUENT" && c.statusTag !== "⭐ Frequent") matchesFilter = false;
      if (activeChip === "HIGH_RISK" && c.riskScore !== "HIGH") matchesFilter = false;
      if (activeChip === "RECENTLY_USED" && c.statusTag !== "Recently Used" && c.lastTxnDate !== "Today")
        matchesFilter = false;

      // Advanced Multi-filter
      if (riskFilter !== "ALL" && c.riskScore !== riskFilter) matchesFilter = false;
      if (kycFilter !== "ALL" && c.kycStatus !== kycFilter) matchesFilter = false;

      return matchesSearch && matchesFilter;
    });
  }, [customers, searchTerm, activeChip, riskFilter, kycFilter]);

  // ── Sorting Logic ──
  const sortedCustomers = useMemo(() => {
    const list = [...filteredCustomers];
    switch (sortBy) {
      case "NAME_ASC":
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case "NAME_DESC":
        return list.sort((a, b) => b.name.localeCompare(a.name));
      case "NEWEST":
        return list.sort((a, b) => (b.customerSince || "").localeCompare(a.customerSince || ""));
      case "OLDEST":
        return list.sort((a, b) => (a.customerSince || "").localeCompare(b.customerSince || ""));
      case "LIMIT_HIGH":
        return list.sort((a, b) => b.monthlyLimitTotal - a.monthlyLimitTotal);
      case "LIMIT_LOW":
        return list.sort((a, b) => a.monthlyLimitTotal - b.monthlyLimitTotal);
      case "HIGH_RISK_FIRST": {
        const riskOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        return list.sort((a, b) => riskOrder[b.riskScore] - riskOrder[a.riskScore]);
      }
      case "FREQUENT_FIRST":
        return list.sort((a, b) => (b.statusTag === "⭐ Frequent" ? 1 : 0) - (a.statusTag === "⭐ Frequent" ? 1 : 0));
      case "RECENTLY_USED":
      default:
        return list.sort((a, b) => (b.lastTxnDate === "Today" ? 1 : 0) - (a.lastTxnDate === "Today" ? 1 : 0));
    }
  }, [filteredCustomers, sortBy]);

  const visibleCustomers = sortedCustomers.slice(0, visibleCount);
  const hasMore = visibleCount < sortedCustomers.length;

  // Return skeleton before hydration (AFTER ALL HOOKS HAVE BEEN CALLED AT TOP LEVEL)
  if (!mounted) {
    return (
      <div className="p-6 min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }
  const toggleFavourite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isFavourite: !c.isFavourite } : c))
    );
  };

  const toggleFreezeAccount = (cust: CustomerRecord) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === cust.id ? { ...c, isBlocked: !c.isBlocked } : c))
    );
    setActiveMenuId(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-24 transition-colors">
      
      {/* ─────────────────────────────────────────────────────────────────────
          1. TOP APP BAR
      ───────────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          
          {/* Left: Hamburger & Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/retailer-dashboard")}
              aria-label="Open Navigation Menu"
              className="p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:ring-2 focus:ring-blue-600 focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Menu className="w-5 h-5 stroke-[2.5]" />
            </button>

            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Customer Directory
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hidden sm:inline-block">
                Retailer Pro
              </span>
            </div>
          </div>

          {/* Right: Universal Search, Notifications, Profile */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setUniversalSearchOpen(true)}
              aria-label="Universal Search"
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 min-h-[44px] px-3 font-semibold text-xs border border-slate-200 dark:border-slate-800"
            >
              <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="hidden md:inline">Universal Search...</span>
              <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700">
                Ctrl+K
              </kbd>
            </button>

            <button
              aria-label="View Notifications"
              onClick={() => router.push("/retailer/notifications")}
              className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
            </button>

            <button
              aria-label="View Profile"
              onClick={() => router.push("/retailer/profile")}
              className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs border border-white/20 hover:scale-105 transition-transform"
            >
              R
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-5 space-y-5">
        
        {/* ─────────────────────────────────────────────────────────────────────
            2. HERO CARD (110px Height, 24px Rounded, Gradient #243B7D to #2E3E8C)
        ───────────────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="w-full h-[110px] rounded-[24px] bg-gradient-to-r from-[#243B7D] to-[#2E3E8C] text-white px-5 sm:px-7 flex items-center justify-between shadow-lg relative overflow-hidden shrink-0 border border-blue-900/50"
        >
          {/* Subtle Background Accent Pattern */}
          <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-white/5 pointer-events-none blur-xl" />
          <div className="absolute right-32 -top-10 w-32 h-32 rounded-full bg-blue-400/10 pointer-events-none blur-lg" />

          <div className="relative z-10 space-y-1 max-w-xl">
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              Customer Directory
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </h2>
            <p className="text-xs sm:text-sm font-medium text-blue-100/90 line-clamp-1">
              Search, manage and transact with verified customers.
            </p>
          </div>

          <div className="relative z-10 shrink-0">
            <button
              onClick={() => {
                useTransactionMemoryStore.getState().setReferrerUrl("/retailer/customers");
                router.push("/retailer/customers/new");
              }}
              aria-label="Add New Customer"
              className="min-h-[44px] px-4 sm:px-5 py-2.5 rounded-2xl bg-[#22C55E] hover:bg-[#16A34A] text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-900/30 flex items-center gap-2 transition-all active:scale-95 focus:ring-2 focus:ring-emerald-400 focus:outline-none"
            >
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Add Customer</span>
            </button>
          </div>
        </motion.div>

        {/* ─────────────────────────────────────────────────────────────────────
            3. SEARCH SECTION & QUICK FILTER CHIPS
        ───────────────────────────────────────────────────────────────────── */}
        <div className="space-y-3">
          
          {/* Search Box (Height: 52px) */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 h-[52px]">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Customer Name, Mobile Number, Customer ID, Aadhaar Number..."
                aria-label="Search customer directory"
                className="w-full h-full pl-12 pr-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 shadow-xs focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  aria-label="Clear search"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* QR Scan Button */}
            <button
              onClick={() => setShowQrModal(true)}
              aria-label="Scan Customer QR or Aadhaar"
              title="Scan QR Code"
              className="h-[52px] px-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-xs flex items-center justify-center gap-2 font-bold text-xs shrink-0 transition-colors focus:ring-2 focus:ring-blue-600 focus:outline-none min-h-[44px]"
            >
              <QrCode className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="hidden sm:inline">QR Scan</span>
            </button>
          </div>

          {/* Quick Filter Chips (Horizontally Scrollable) */}
          <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
            <div className="flex items-center gap-2 overflow-x-auto">
              {[
                { id: "ALL", label: "All" },
                { id: "VERIFIED", label: "✓ Verified" },
                { id: "PENDING", label: "⏳ Pending" },
                { id: "FREQUENT", label: "⭐ Frequent" },
                { id: "HIGH_RISK", label: "⚠️ High Risk" },
                { id: "RECENTLY_USED", label: "Recently Used" },
              ].map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => setActiveChip(chip.id)}
                  aria-pressed={activeChip === chip.id}
                  className={`min-h-[44px] px-4 py-2 rounded-xl border whitespace-nowrap transition-all font-bold text-xs ${
                    activeChip === chip.id
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs"
                      : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Filter Toggle Trigger */}
            <button
              onClick={() => setFilterDrawerOpen(!filterDrawerOpen)}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl border font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all ${
                riskFilter !== "ALL" || kycFilter !== "ALL"
                  ? "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Filters</span>
              {(riskFilter !== "ALL" || kycFilter !== "ALL") && (
                <span className="w-2 h-2 rounded-full bg-blue-600" />
              )}
            </button>
          </div>

          {/* Expandable Advanced Filters */}
          <AnimatePresence>
            {filterDrawerOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 overflow-hidden text-xs font-semibold"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                    Filter Options
                  </span>
                  <button
                    onClick={() => {
                      setRiskFilter("ALL");
                      setKycFilter("ALL");
                    }}
                    className="text-blue-600 dark:text-blue-400 text-xs font-bold hover:underline"
                  >
                    Reset Filters
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1.5">
                      Risk Profile
                    </label>
                    <select
                      value={riskFilter}
                      onChange={(e) => setRiskFilter(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none focus:border-blue-600 min-h-[44px]"
                    >
                      <option value="ALL">All Risk Levels</option>
                      <option value="LOW">LOW Risk Only</option>
                      <option value="MEDIUM">MEDIUM Risk Only</option>
                      <option value="HIGH">HIGH Risk Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1.5">
                      Verification / KYC Status
                    </label>
                    <select
                      value={kycFilter}
                      onChange={(e) => setKycFilter(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none focus:border-blue-600 min-h-[44px]"
                    >
                      <option value="ALL">All KYC Statuses</option>
                      <option value="VERIFIED">Verified eKYC</option>
                      <option value="PENDING">Pending Approval</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────
            4. SORT DROPDOWN & RESULTS METRICS
            4. SORT DROPDOWN & RESULTS METRICS TOOLBAR
        ───────────────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
            Showing <strong className="text-slate-900 dark:text-white font-mono text-sm">{sortedCustomers.length}</strong> of{" "}
            <strong className="text-slate-900 dark:text-white font-mono text-sm">{customers.length}</strong> customer(s)
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">Sort By:</span>
            <div className="relative flex-1 sm:w-56">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Sort customer directory"
                className="w-full h-10 pl-3.5 pr-8 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 appearance-none outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 cursor-pointer"
              >
                <option value="RECENTLY_USED">Recently Used</option>
                <option value="NAME_ASC">Customer Name A-Z</option>
                <option value="NAME_DESC">Customer Name Z-A</option>
                <option value="NEWEST">Newest</option>
                <option value="OLDEST">Oldest</option>
                <option value="LIMIT_HIGH">Highest Monthly Limit</option>
                <option value="LIMIT_LOW">Lowest Monthly Limit</option>
                <option value="HIGH_RISK_FIRST">High Risk First</option>
                <option value="FREQUENT_FIRST">Frequent First</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <button
              onClick={handleRefresh}
              aria-label="Refresh customer list"
              title="Refresh Directory"
              className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────
            5. CUSTOMER LIST (RESPONSIVE CARD GRID: 1-COL MOBILE, 2-COL TABLET, 3-COL DESKTOP 1024-1599px, 4-COL >=1600px)
        ───────────────────────────────────────────────────────────────────── */}
        {isLoading ? (
          /* SKELETON LOADER STATE */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 min-[1600px]:grid-cols-4 gap-6 max-w-[1600px] mx-auto">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="w-full min-w-[380px] max-w-[420px] mx-auto h-[340px] p-5.5 rounded-[18px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 animate-pulse shadow-md"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded-md" />
                    <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded-md" />
                  </div>
                </div>

                <div className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />

                <div className="space-y-1.5">
                  <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full" />
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="h-11 flex-1 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                  <div className="h-11 flex-1 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedCustomers.length === 0 ? (
          /* EMPTY STATE */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-10 rounded-[24px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-sm max-w-xl mx-auto"
          >
            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center border border-blue-200 dark:border-blue-800">
              <Users className="w-8 h-8 stroke-[1.75]" />
            </div>

            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                No customers found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                We couldn&apos;t find any customer matching &quot;<strong className="text-slate-800 dark:text-slate-200">{searchTerm}</strong>&quot;.
                Try adjusting your search criteria or add a new customer workspace.
              </p>
            </div>

            <button
              onClick={() => {
                useTransactionMemoryStore.getState().setReferrerUrl("/retailer/customers");
                router.push("/retailer/customers/new");
              }}
              className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs inline-flex items-center gap-2 shadow-md shadow-blue-600/20"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Customer</span>
            </button>
          </motion.div>
        ) : (
          /* CUSTOMER CARD RESPONSIVE GRID (1024-1599px: 3 cols, >=1600px: 4 cols) */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 min-[1600px]:grid-cols-4 gap-6 justify-center items-stretch max-w-[1600px] mx-auto">
              <AnimatePresence>
                {visibleCustomers.map((cust) => {
                  const isSelected = selectedCustomerId === cust.id;
                  const isMenuOpen = activeMenuId === cust.id;

                  return (
                    <div key={cust.id} className="relative flex justify-center h-full">
                      <CustomerCard
                        customer={cust}
                        isSelected={isSelected}
                        isMenuOpen={isMenuOpen}
                        onSelect={(c) => setSelectedCustomerId(c.id)}
                        onStartPayout={(c) => handleSelectCustomerForPayout(c)}
                        onViewProfile={(c) => setSelectedProfileCustomer(c)}
                        onToggleFavourite={(id, e) => toggleFavourite(id, e)}
                        onToggleMenu={(id, e) => {
                          e.stopPropagation();
                          setActiveMenuId(isMenuOpen ? null : id);
                        }}
                      />

                      {/* Dropdown Menu Overlay */}
                      <AnimatePresence>
                        {isMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -5 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-4 bottom-14 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden text-xs font-bold py-1 card-action-menu"
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                handleSelectCustomerForPayout(cust);
                              }}
                              className="w-full px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center gap-2 text-left"
                            >
                              <ArrowUpRight className="w-4 h-4" />
                              <span>Start Payout</span>
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                setSelectedProfileCustomer(cust);
                              }}
                              className="w-full px-4 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 text-left"
                            >
                              <Eye className="w-4 h-4 text-slate-500" />
                              <span>View Profile</span>
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFreezeAccount(cust);
                              }}
                              className={`w-full px-4 py-2.5 flex items-center gap-2 text-left ${
                                cust.isBlocked
                                  ? "hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-emerald-600"
                                  : "hover:bg-amber-50 dark:hover:bg-amber-950/50 text-amber-600"
                              }`}
                            >
                              {cust.isBlocked ? (
                                <>
                                  <Unlock className="w-4 h-4" />
                                  <span>Unfreeze Customer</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-4 h-4" />
                                  <span>Freeze Customer</span>
                                </>
                              )}
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Pagination: Load More Trigger */}
            {hasMore && (
              <div className="pt-4 text-center">
                <button
                  onClick={() => setVisibleCount((prev) => prev + 6)}
                  className="min-h-[44px] px-6 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-extrabold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 shadow-xs inline-flex items-center gap-2 transition-colors"
                >
                  <span>Load More Customers</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

      </main>

      {/* ─────────────────────────────────────────────────────────────────────
          6. PROFILE DETAIL DRAWER / OVERLAY
      ───────────────────────────────────────────────────────────────────── */}
      <CustomerDetailsDrawer
        isOpen={Boolean(selectedProfileCustomer)}
        onClose={() => setSelectedProfileCustomer(null)}
        customer={selectedProfileCustomer}
        onStartPayout={(cust) => {
          handleSelectCustomerForPayout(cust);
          setSelectedProfileCustomer(null);
        }}
        onEditCustomer={() => {
          alert("Editing Customer details");
        }}
        onTransferHistory={(cust) => {
          router.push(`/retailer/dmt?customerMobile=${cust?.mobile || ""}`);
        }}
      />

      {/* ─────────────────────────────────────────────────────────────────────
          7. QR SCAN MODAL & UNIVERSAL SEARCH DIALOG
      ───────────────────────────────────────────────────────────────────── */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
              <QrCode className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                Scan Customer QR Code
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Align the customer&apos;s Aadhaar or Retailer QR code within the camera scanner frame.
              </p>
            </div>

            <div className="h-44 rounded-2xl bg-slate-950 flex items-center justify-center border border-slate-800 relative overflow-hidden">
              <div className="w-32 h-32 border-2 border-emerald-400 rounded-xl animate-pulse flex items-center justify-center text-emerald-400 font-mono text-[10px]">
                Scanning...
              </div>
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full min-h-[44px] py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Close Scanner
            </button>
          </div>
        </div>
      )}

      {/* Universal Search Dialog Trigger */}
      <UniversalSearchDialog open={universalSearchOpen} onClose={() => setUniversalSearchOpen(false)} />

    </div>
  );
}

// Helper VerifiedIcon
function VerifiedIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </svg>
  );
}
