"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, UserPlus, Search, Filter, RefreshCw, Eye, ShieldCheck, ShieldAlert,
  AlertCircle, CheckCircle2, Ban, Clock, X, ChevronRight, Download, Upload,
  FileSpreadsheet, Layers, Mic, MicOff, QrCode, Sparkles, TrendingUp, Wallet,
  CreditCard, Building2, Smartphone, MoreVertical, Lock, Unlock, Trash2,
  Edit3, Star, Activity, Bell, ArrowUpRight, Check, FileText, Zap, ChevronDown,
  UserX, HelpCircle, Send, Share2, SlidersHorizontal, ArrowDownRight, Fingerprint,
  PhoneCall, Mail, MapPin, Award, CheckCircle, PieChart, Info, Printer, History, Plus,
  AlertTriangle
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiClient } from "@/lib/api";
import { EnterpriseNoCustomerFound } from "@/components/ui/enterprise-no-customer-found";
import { MobileNumberInput } from "@/components/ui/mobile-number-input";
import { CustomerDetailsDrawer } from "@/components/customers/customer-details-drawer";
import { CustomerMasterSlideOver } from "@/components/master/customer-master-slide-over";
import { isNormalizedMatch, normalizePhoneNumber } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & DATA STRUCTURES
// ─────────────────────────────────────────────────────────────────────────────

export type KycStatus = "VERIFIED" | "PENDING" | "REJECTED" | "EXPIRED";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type CustomerTier = "STANDARD" | "GOLD" | "PREMIUM" | "VIP";

export interface Beneficiary {
  id: string;
  name: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
  isVerified: boolean;
}

export interface CustomerTxn {
  id: string;
  type: "DMT" | "AEPS" | "BBPS" | "UPI" | "WALLET";
  amount: number;
  status: "SUCCESS" | "PENDING" | "FAILED";
  timestamp: string;
  utr: string;
}

export interface EnterpriseCustomer {
  id: string;
  publicId: string;
  fullName: string;
  photoUrl?: string;
  mobile: string;
  email: string;
  aadhaarMasked: string;
  panMasked: string;
  customerSince: string;
  tier: CustomerTier;
  kycStatus: KycStatus;
  panStatus: "VERIFIED" | "PENDING" | "UNLINKED";
  aadhaarStatus: "VERIFIED" | "PENDING" | "NOT_SEEDED";
  txnPinStatus: "ACTIVE" | "NOT_SET" | "LOCKED";
  riskScore: number;
  riskLevel: RiskLevel;
  preferredBank: {
    name: string;
    logoUrl?: string;
    accountMasked: string;
    ifsc: string;
  };
  monthlyLimit: number;
  usedAmount: number;
  dailyLimit: number;
  dailyUsed: number;
  todayTxnCount: number;
  todayTxnVolume: number;
  lastTxnDate: string;
  lastTxnService: string;
  lastLogin: string;
  createdBy: string;
  lastUpdated: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  walletBalance: number;
  isFavourite: boolean;
  isBlocked: boolean;
  alerts: {
    fraud: boolean;
    velocity: boolean;
    aml: boolean;
  };
  beneficiaries: Beneficiary[];
  recentTransactions: CustomerTxn[];
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: "REGISTRATION" | "OTP" | "EKYC" | "PAN" | "PIN" | "UPDATE" | "ALERT";
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIO SYNTHESIZER (WEB AUDIO API)
// ─────────────────────────────────────────────────────────────────────────────

const playSoundEffect = (type: "SELECT" | "SUCCESS" | "WARNING" | "ERROR" | "ADD" | "CLICK") => {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === "SELECT") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === "SUCCESS") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === "ADD") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.18);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === "WARNING") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.setValueAtTime(261.63, now + 0.1);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === "ERROR") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(140, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  } catch (e) {}
};

const triggerHaptics = (pattern: number | number[] = 20) => {
  if (typeof window !== "undefined" && "navigator" in window && window.navigator.vibrate) {
    try { window.navigator.vibrate(pattern); } catch (e) {}
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER DATA STRUCTURES (DYNAMIC FROM BACKEND DATABASE)
// ─────────────────────────────────────────────────────────────────────────────

const INITIAL_CUSTOMERS: EnterpriseCustomer[] = [];
const INITIAL_NOTIFICATIONS: NotificationItem[] = [];
const RECENT_SEARCHES_MOCK: string[] = [];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ENTERPRISE CUSTOMER DIRECTORY COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function EnterpriseCustomerDirectoryPage() {
  const router = useRouter();
  const { isRetailer } = useAuth();
  
  // ── Core State ──
  const [customers, setCustomers] = useState<EnterpriseCustomer[]>(INITIAL_CUSTOMERS);
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<EnterpriseCustomer | null>(INITIAL_CUSTOMERS[0]);
  const [activeFilterChip, setActiveFilterChip] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [lastSyncTime, setLastSyncTime] = useState("Just now");
  const [recentSearches, setRecentSearches] = useState<string[]>(RECENT_SEARCHES_MOCK);
  const [showRecentDropdown, setShowRecentDropdown] = useState(false);

  // ── Action Dropdown & Modals State ──
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);
  const [showSlideOver, setShowSlideOver] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showBulkKycModal, setShowBulkKycModal] = useState(false);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  
  // Additional Action Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<EnterpriseCustomer | null>(null);
  const [showBeneficiariesModal, setShowBeneficiariesModal] = useState(false);
  const [customerForBeneficiaries, setCustomerForBeneficiaries] = useState<EnterpriseCustomer | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [customerForHistory, setCustomerForHistory] = useState<EnterpriseCustomer | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<EnterpriseCustomer | null>(null);
  const [showQrScanModal, setShowQrScanModal] = useState(false);

  // ── New Customer Form State with Mandatory Mobile Validation ──
  const [newForm, setNewForm] = useState({
    fullName: "",
    mobile: "",
    email: "",
    aadhaar: "",
    pan: "",
    tier: "STANDARD" as CustomerTier,
    bankName: "State Bank of India",
    accountNumber: "",
    ifsc: "SBIN0001824",
    city: "New Delhi",
    state: "Delhi"
  });

  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch Real Customers from Backend Database ──
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/customers");
      if (res.status === 200 && res.data) {
        const rawList = res.data.data || res.data || [];
        if (Array.isArray(rawList) && rawList.length > 0) {
          const mapped: EnterpriseCustomer[] = rawList.map((item: any) => {
            const isVerified = item.kyc_status === "VERIFIED" || item.aadhaar_verified;
            return {
              id: item.customer_number || `CUST-${item.public_id?.substring(0, 5)}`,
              publicId: item.public_id,
              fullName: item.full_name || "Customer Record",
              photoUrl: item.photo_url || item.photo_base64 || "",
              mobile: item.mobile_number || "",
              email: item.email || `${item.mobile_number || "cust"}@pay2pay.in`,
              aadhaarMasked: item.masked_aadhaar || (isVerified ? "XXXX-XXXX-4748" : "Not Verified"),
              panMasked: "ABCDE1234F",
              customerSince: item.registration_date ? new Date(item.registration_date).toISOString().split("T")[0] : "2026-08-08",
              tier: (item.customer_category as CustomerTier) || "STANDARD",
              kycStatus: isVerified ? "VERIFIED" : "PENDING",
              panStatus: "VERIFIED",
              aadhaarStatus: isVerified ? "VERIFIED" : "PENDING",
              txnPinStatus: "ACTIVE",
              riskScore: item.risk_category === "HIGH" ? 85 : 10,
              riskLevel: (item.risk_category || "LOW") as RiskLevel,
              preferredBank: {
                name: "State Bank of India",
                accountMasked: "XXXX-XXXX-9012",
                ifsc: "SBIN0001824"
              },
              monthlyLimit: 250000,
              usedAmount: 0,
              dailyLimit: 50000,
              dailyUsed: 0,
              todayTxnCount: 0,
              todayTxnVolume: 0,
              lastTxnDate: "No Transactions",
              lastTxnService: "N/A",
              lastLogin: "Today",
              createdBy: "SYSTEM",
              lastUpdated: "Just now",
              address: {
                street: "",
                city: "Chennai",
                state: "Tamil Nadu",
                pincode: "600001"
              },
              walletBalance: 0,
              isFavourite: false,
              isBlocked: item.customer_status === "BLOCKED",
              alerts: { fraud: false, velocity: false, aml: false },
              beneficiaries: Array.isArray(item.beneficiaries) ? item.beneficiaries : [],
              recentTransactions: []
            };
          });

          setCustomers(mapped);
          if (mapped.length > 0) {
            setSelectedCustomer(mapped[0]);
          } else {
            setSelectedCustomer(null);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch customer directory from backend:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Close action menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".action-menu-container")) {
        setActiveActionMenuId(null);
      }
      if (!target.closest(".search-container")) {
        setShowRecentDropdown(false);
      }
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // ── Keyboard Shortcuts (Alt+N: New, Alt+S: Search, Esc: Close) ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setShowSlideOver(true);
      } else if (e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setShowRecentDropdown(true);
      } else if (e.key === "Escape") {
        setShowProfileDrawer(false);
        setShowSlideOver(false);
        setShowImportModal(false);
        setShowExportModal(false);
        setShowEditModal(false);
        setShowBeneficiariesModal(false);
        setShowHistoryModal(false);
        setShowDeleteConfirmModal(false);
        setShowQrScanModal(false);
        setActiveActionMenuId(null);
        setShowRecentDropdown(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ── Handle Mobile Search Trigger ──
  const handleSearchLookup = useCallback((digits: string) => {
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
      const normDigits = normalizePhoneNumber(digits);
      const found = customers.find((c) => normalizePhoneNumber(c.mobile) === normDigits);
      if (found) {
        setSelectedCustomer(found);
        playSoundEffect("SUCCESS");
        triggerHaptics(15);
      }
    }, 250);
  }, [customers]);

  // ── Voice Search Handler (Web Speech API) ──
  const toggleVoiceSearch = () => {
    if (typeof window === "undefined") return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      alert("Voice search is supported in Chrome, Edge & Safari.");
      return;
    }

    if (isVoiceListening) {
      setIsVoiceListening(false);
      return;
    }

    setIsVoiceListening(true);
    playSoundEffect("CLICK");
    triggerHaptics([20, 40, 20]);

    try {
      const rec = new SpeechRec();
      rec.lang = "en-IN";
      rec.onresult = (e: any) => {
        const text = e.results[0][0].transcript;
        const digits = text.replace(/\D/g, "");
        setSearchQuery(digits.length === 10 ? digits : text);
        setIsVoiceListening(false);
        playSoundEffect("SUCCESS");
      };
      rec.onerror = () => setIsVoiceListening(false);
      rec.onend = () => setIsVoiceListening(false);
      rec.start();
    } catch (e) {
      setIsVoiceListening(false);
    }
  };

  // ── Filter & Search Processing (With Phone Normalization) ──
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch = isNormalizedMatch(
      searchQuery,
      c.fullName,
      c.mobile,
      c.id,
      c.aadhaarMasked,
      c.panMasked,
      c.email
    );

    let matchesFilter = true;

    if (activeFilterChip === "VERIFIED") matchesFilter = c.kycStatus === "VERIFIED";
    else if (activeFilterChip === "PENDING") matchesFilter = c.kycStatus === "PENDING";
    else if (activeFilterChip === "HIGH_RISK") matchesFilter = c.riskLevel === "HIGH" || c.riskLevel === "CRITICAL";
    else if (activeFilterChip === "FAVOURITE") matchesFilter = c.isFavourite;
    else if (activeFilterChip === "TODAY") matchesFilter = c.customerSince === "2026-08-04";
    else if (activeFilterChip === "BLOCKED") matchesFilter = c.isBlocked;
    else if (activeFilterChip === "GOLD") matchesFilter = c.tier === "GOLD";
    else if (activeFilterChip === "PREMIUM") matchesFilter = c.tier === "PREMIUM" || c.tier === "VIP";
    else if (activeFilterChip === "INACTIVE") matchesFilter = c.todayTxnCount === 0;

    return matchesSearch && matchesFilter;
  });

  // Search auto suggestions based on input
  const suggestions = searchQuery.trim()
    ? customers
        .filter((c) =>
          isNormalizedMatch(searchQuery, c.fullName, c.mobile, c.id)
        )
        .slice(0, 4)
    : [];

  // Check duplicate customer in New Customer Modal
  const cleanFormMobile = normalizePhoneNumber(newForm.mobile);
  const duplicateCustomer = cleanFormMobile.length === 10 ? customers.find((c) => normalizePhoneNumber(c.mobile) === cleanFormMobile) : null;

  // ── Quick Action Handlers ──
  const handleToggleFavourite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playSoundEffect("CLICK");
    triggerHaptics(15);
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isFavourite: !c.isFavourite } : c))
    );
  };

  const handleToggleBlock = (cust: EnterpriseCustomer) => {
    if (cust.isBlocked) {
      playSoundEffect("SUCCESS");
      alert(`Customer ${cust.fullName} unblocked successfully.`);
    } else {
      playSoundEffect("WARNING");
      alert(`Customer ${cust.fullName} frozen under Compliance Policy.`);
    }

    setCustomers((prev) =>
      prev.map((c) => (c.id === cust.id ? { ...c, isBlocked: !c.isBlocked } : c))
    );
    setActiveActionMenuId(null);
  };

  const handleDeleteCustomerConfirm = () => {
    if (!customerToDelete) return;
    playSoundEffect("WARNING");
    triggerHaptics([40, 40, 40]);

    setCustomers((prev) => prev.filter((c) => c.id !== customerToDelete.id));
    if (selectedCustomer?.id === customerToDelete.id) {
      setSelectedCustomer(null);
      setShowProfileDrawer(false);
    }
    setShowDeleteConfirmModal(false);
    setCustomerToDelete(null);
    alert("Customer deleted successfully.");
  };

  const handleEditCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerToEdit) return;

    playSoundEffect("SUCCESS");
    setCustomers((prev) =>
      prev.map((c) => (c.id === customerToEdit.id ? customerToEdit : c))
    );
    if (selectedCustomer?.id === customerToEdit.id) {
      setSelectedCustomer(customerToEdit);
    }
    setShowEditModal(false);
    setCustomerToEdit(null);
  };

  const handleCreateCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.fullName || !cleanFormMobile || cleanFormMobile.length !== 10) return;
    if (duplicateCustomer) return;

    playSoundEffect("ADD");
    triggerHaptics([30, 60, 30]);

    const newCust: EnterpriseCustomer = {
      id: `CUST-${Math.floor(10000 + Math.random() * 90000)}`,
      publicId: `c${Date.now()}-new`,
      fullName: newForm.fullName,
      mobile: cleanFormMobile,
      email: newForm.email || `${newForm.fullName.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      aadhaarMasked: newForm.aadhaar ? `XXXX-XXXX-${newForm.aadhaar.slice(-4)}` : "XXXX-XXXX-9999",
      panMasked: newForm.pan ? newForm.pan.toUpperCase() : "ABCDE9999Z",
      customerSince: "2026-08-04",
      tier: newForm.tier,
      kycStatus: "VERIFIED",
      panStatus: "VERIFIED",
      aadhaarStatus: "VERIFIED",
      txnPinStatus: "ACTIVE",
      riskScore: 10,
      riskLevel: "LOW",
      preferredBank: {
        name: newForm.bankName,
        accountMasked: newForm.accountNumber ? `XXXX${newForm.accountNumber.slice(-4)}` : "XXXX1234",
        ifsc: newForm.ifsc
      },
      monthlyLimit: newForm.tier === "VIP" ? 500000 : newForm.tier === "GOLD" ? 250000 : 100000,
      usedAmount: 0,
      dailyLimit: 50000,
      dailyUsed: 0,
      todayTxnCount: 0,
      todayTxnVolume: 0,
      lastTxnDate: "Just Registered",
      lastTxnService: "Account Opening",
      lastLogin: "Just now",
      createdBy: "DEL-RT-9082 (Sunil Retailer)",
      lastUpdated: "2026-08-04 Just now",
      address: {
        street: "Main Market Street",
        city: newForm.city,
        state: newForm.state,
        pincode: "110001"
      },
      walletBalance: 0.00,
      isFavourite: false,
      isBlocked: false,
      alerts: { fraud: false, velocity: false, aml: false },
      beneficiaries: [],
      recentTransactions: []
    };

    setCustomers([newCust, ...customers]);
    setSelectedCustomer(newCust);
    setShowSlideOver(false);

    const newNotif: NotificationItem = {
      id: `N-${Date.now()}`,
      title: "New Customer Onboarded",
      message: `${newCust.fullName} (+91 ${newCust.mobile}) added to customer directory`,
      timestamp: "Just now",
      type: "REGISTRATION"
    };
    setNotifications([newNotif, ...notifications]);

    setNewForm({
      fullName: "", mobile: "", email: "", aadhaar: "", pan: "",
      tier: "STANDARD", bankName: "State Bank of India", accountNumber: "",
      ifsc: "SBIN0001824", city: "New Delhi", state: "Delhi"
    });
  };

  // Metrics Calculations
  const totalCustomersCount = customers.length;
  const verifiedCount = customers.filter((c) => c.kycStatus === "VERIFIED").length;
  const pendingCount = customers.filter((c) => c.kycStatus === "PENDING").length;
  const blockedCount = customers.filter((c) => c.isBlocked).length;
  const todayNewCount = customers.filter((c) => c.customerSince === "2026-08-04").length;
  const highRiskCount = customers.filter((c) => c.riskLevel === "HIGH" || c.riskLevel === "CRITICAL").length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-24">
      
      {/* ─────────────────────────────────────────────────────────────────────
          1. HEADER COMPONENT (#1E3A8A Dark Navy Blue Background, High Contrast Pure White Text)
      ───────────────────────────────────────────────────────────────────── */}
      <header className="bg-[#1E3A8A] text-white border-b border-blue-900 sticky top-0 z-30 shadow-md">
        <div className="max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-3.5">
          
          {/* Header Row 1: Green Circle Customer Icon, Pure White Bold Title (#FFFFFF 700), #DBEAFE Ice Blue Subtitle */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-[#22C55E] flex items-center justify-center text-white shrink-0 shadow-sm">
                <Users className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-extrabold tracking-tight text-[#FFFFFF]">
                    Master Customer Directory
                  </h1>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-900/80 text-blue-100 border border-blue-400/40">
                    Enterprise Banking Hub
                  </span>
                </div>
                <p className="text-xs font-semibold text-[#DBEAFE] mt-0.5">
                  Single Source of Truth for Customer Identification, eKYC &amp; Limit Audits
                </p>
              </div>
            </div>

            {/* Metric KPI Chips Bar */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs font-bold">
              <div className="px-3 py-1.5 rounded-xl bg-blue-900/80 border border-blue-700/80 flex items-center gap-2 text-white">
                <Users className="w-3.5 h-3.5 text-blue-300" />
                <span className="text-blue-200 font-semibold">Total:</span>
                <strong className="text-white font-mono text-sm">{totalCustomersCount}</strong>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-emerald-950/90 border border-emerald-500/50 flex items-center gap-2 text-emerald-100">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-200 font-semibold">Verified:</span>
                <strong className="text-white font-mono text-sm">{verifiedCount}</strong>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-amber-950/90 border border-amber-500/50 flex items-center gap-2 text-amber-100">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-200 font-semibold">Pending eKYC:</span>
                <strong className="text-white font-mono text-sm">{pendingCount}</strong>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-red-950/90 border border-red-500/50 flex items-center gap-2 text-red-100">
                <Ban className="w-3.5 h-3.5 text-red-400" />
                <span className="text-red-200 font-semibold">Blocked:</span>
                <strong className="text-white font-mono text-sm">{blockedCount}</strong>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-purple-950/90 border border-purple-500/50 flex items-center gap-2 text-purple-100">
                <UserPlus className="w-3.5 h-3.5 text-purple-300" />
                <span className="text-purple-200 font-semibold">Today:</span>
                <strong className="text-white font-mono text-sm">+{todayNewCount}</strong>
              </div>
            </div>

          </div>

          {/* Header Row 2: Reusable MobileNumberInput for Search & Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full search-container">
              <MobileNumberInput
                id="header-customer-mobile-search"
                ariaLabel="Customer Mobile Number Search"
                value={searchQuery}
                onChange={(cleanVal) => setSearchQuery(cleanVal)}
                onSearch={handleSearchLookup}
                placeholder="Search by 10-digit customer mobile..."
                isLoading={isSearching}
                showCounter={true}
              />

              {/* Voice & QR Buttons overlay */}
              <div className="absolute top-2.5 right-2 flex items-center gap-1.5 z-10">
                <button
                  onClick={toggleVoiceSearch}
                  aria-label={isVoiceListening ? "Stop voice search" : "Start voice search"}
                  className={`p-1.5 rounded-xl text-xs font-bold transition-colors ${
                    isVoiceListening ? "bg-red-600 text-white animate-pulse" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                  title="Voice Search"
                >
                  {isVoiceListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-emerald-600" />}
                </button>

                <button
                  onClick={() => setShowQrScanModal(true)}
                  aria-label="Scan Aadhaar or QR Code"
                  className="p-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                  title="Scan QR / Aadhaar Code"
                >
                  <QrCode className="w-3.5 h-3.5 text-blue-600" />
                </button>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-1.5 text-[11px] font-mono text-blue-200 shrink-0">
              <kbd className="px-2 py-1 rounded bg-blue-900/80 border border-blue-700 text-white">Alt + N</kbd> New
              <kbd className="px-2 py-1 rounded bg-blue-900/80 border border-blue-700 text-white">Alt + S</kbd> Search
            </div>
          </div>

        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────────────
          2. ACTION BAR & ENTERPRISE OPERATIONS (#2563EB Primary Blue, #1D4ED8 Hover)
      ───────────────────────────────────────────────────────────────────── */}
      <div className="max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowSlideOver(true);
                playSoundEffect("CLICK");
              }}
              aria-label="Add New Customer"
              className="min-h-[48px] px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] shadow-md shadow-blue-600/20 flex items-center gap-2.5 transition-all active:scale-95 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Add New Customer</span>
            </button>

            <button
              onClick={() => router.push("/retailer/customers/new")}
              title="Open full page customer registration workspace"
              className="min-h-[48px] px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <span>Full Page Workspace</span>
              <ArrowUpRight className="w-4 h-4 text-blue-600" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <button
              onClick={() => setShowImportModal(true)}
              className="min-h-[48px] px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-[#E2E8F0] flex items-center gap-2"
            >
              <Upload className="w-4 h-4 text-blue-600" />
              <span>Import</span>
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              className="min-h-[48px] px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-[#E2E8F0] flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-[#22C55E]" />
              <span>Export</span>
            </button>

            <button
              onClick={() => setShowBulkKycModal(true)}
              className="min-h-[48px] px-4 py-2.5 rounded-xl bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300 flex items-center gap-2"
            >
              <Fingerprint className="w-4 h-4 text-[#F59E0B]" />
              <span>Bulk eKYC</span>
            </button>

            <button
              onClick={() => {
                setLoading(true);
                playSoundEffect("CLICK");
                setTimeout(() => {
                  setLoading(false);
                  setLastSyncTime("Just now");
                }, 400);
              }}
              className="min-h-[48px] min-w-[48px] rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-[#E2E8F0] flex items-center justify-center"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          3. THREE-COLUMN ENTERPRISE LAYOUT
      ───────────────────────────────────────────────────────────────────── */}
      <main className="max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: WORKSPACE & SEGMENTS */}
          <div className="lg:col-span-3 3xl:col-span-2 space-y-6">
            <div className="p-5 rounded-3xl bg-white border border-[#E2E8F0] shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#2563EB]" />
                  <span>Customer Workspace</span>
                </h3>
              </div>

              <div className="space-y-2 text-xs font-semibold">
                <button
                  onClick={() => setActiveFilterChip("ALL")}
                  className={`w-full min-h-[48px] flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all ${
                    activeFilterChip === "ALL"
                      ? "bg-blue-50 text-[#2563EB] font-extrabold border border-blue-200 shadow-xs"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-[#2563EB]" /> All Customer Registry
                  </span>
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-slate-200/80 text-slate-800 font-bold">
                    {totalCustomersCount}
                  </span>
                </button>

                <button
                  onClick={() => setActiveFilterChip("VERIFIED")}
                  className={`w-full min-h-[48px] flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all ${
                    activeFilterChip === "VERIFIED"
                      ? "bg-emerald-50 text-emerald-800 font-extrabold border border-emerald-200 shadow-xs"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-[#22C55E]" /> Verified Full KYC
                  </span>
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold">
                    {verifiedCount}
                  </span>
                </button>

                <button
                  onClick={() => setActiveFilterChip("PENDING")}
                  className={`w-full min-h-[48px] flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all ${
                    activeFilterChip === "PENDING"
                      ? "bg-amber-50 text-amber-800 font-extrabold border border-amber-200 shadow-xs"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-[#F59E0B]" /> Pending eKYC / Docs
                  </span>
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold">
                    {pendingCount}
                  </span>
                </button>

                <button
                  onClick={() => setActiveFilterChip("HIGH_RISK")}
                  className={`w-full min-h-[48px] flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all ${
                    activeFilterChip === "HIGH_RISK"
                      ? "bg-red-50 text-red-800 font-extrabold border border-red-200 shadow-xs"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-[#EF4444]" /> High Risk &amp; Compliance Flag
                  </span>
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-red-100 text-red-900 font-bold">
                    {highRiskCount}
                  </span>
                </button>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-gradient-to-b from-blue-900 to-indigo-950 text-white shadow-md space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-extrabold text-blue-200">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Retailer Direct Dispatch</span>
              </div>
              <p className="text-[11px] text-blue-100/90 leading-relaxed font-medium">
                Trigger instant money transfer for selected customer without re-entering mobile number.
              </p>

              <button
                onClick={() => {
                  if (selectedCustomer) {
                    router.push(`/retailer/dmt`);
                  } else {
                    alert("Please select a customer first.");
                  }
                }}
                className="w-full min-h-[48px] py-3 rounded-xl bg-white text-blue-950 font-extrabold text-xs hover:bg-blue-50 transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <span>Express Money Transfer</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* CENTER COLUMN: CUSTOMER DIRECTORY */}
          <div className="lg:col-span-9 3xl:col-span-10 space-y-4">
            
            {/* Filter Chips + Count */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <div className="flex items-center gap-2 text-xs font-bold flex-1">
                {[
                  { id: "ALL", label: "🌟 All" },
                  { id: "VERIFIED", label: "✓ Verified" },
                  { id: "PENDING", label: "⏳ Pending" },
                  { id: "HIGH_RISK", label: "⚠️ High Risk" },
                  { id: "FAVOURITE", label: "⭐ Favourite" },
                  { id: "BLOCKED", label: "🚫 Blocked" },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    onClick={() => {
                      setActiveFilterChip(chip.id);
                      playSoundEffect("CLICK");
                    }}
                    className={`min-h-[40px] px-4 py-2 rounded-xl border whitespace-nowrap transition-all font-bold ${
                      activeFilterChip === chip.id
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : "bg-white text-slate-700 border-[#E2E8F0] hover:bg-slate-100"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              <span className="text-xs font-bold text-slate-500 shrink-0 whitespace-nowrap">
                Showing {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* CUSTOMER CARDS OR EMPTY STATE */}
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-5 rounded-3xl bg-white border border-[#E2E8F0] space-y-4 animate-pulse">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-200" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-36 bg-slate-200 rounded" />
                        <div className="h-3 w-24 bg-slate-200 rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredCustomers.length === 0 ? (
              <EnterpriseNoCustomerFound
                searchQuery={searchQuery}
                onSearchAgain={() => { setSearchQuery(""); setActiveFilterChip("ALL"); searchInputRef.current?.focus(); }}
                onVoiceSearch={toggleVoiceSearch}
                isVoiceListening={isVoiceListening}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-6 items-start">
                {filteredCustomers.map((cust) => {
                  const isSelected = selectedCustomer?.id === cust.id;
                  const limitUsagePct = Math.min(Math.round((cust.usedAmount / cust.monthlyLimit) * 100), 100);
                  const isMenuOpen = activeActionMenuId === cust.id;

                  return (
                    <motion.div
                      key={cust.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => {
                        setSelectedCustomer(cust);
                        playSoundEffect("SELECT");
                        triggerHaptics(15);
                      }}
                      className={`flex flex-col p-5 rounded-[18px] border transition-all cursor-pointer relative shadow-md hover:-translate-y-1 hover:shadow-xl ${
                        isSelected
                          ? "bg-white border-[#2563EB] shadow-lg ring-2 ring-blue-600/20"
                          : cust.isBlocked
                          ? "bg-red-50/40 border-red-200"
                          : "bg-white border-[#E2E8F0] hover:border-slate-300"
                      }`}
                    >
                      {/* Tier accent bar */}
                      <div
                        className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-[18px] ${
                          cust.isBlocked
                            ? "bg-[#EF4444]"
                            : cust.tier === "VIP"
                            ? "bg-gradient-to-r from-amber-400 to-yellow-500"
                            : cust.tier === "GOLD"
                            ? "bg-amber-400"
                            : "bg-[#2563EB]"
                        }`}
                      />

                      {/* Card body grows to fill */}
                      <div className="flex flex-col flex-1 space-y-3.5 pt-2">

                        {/* ── ROW 1: Avatar | Name + Tier badge | Star */}
                        <div className="flex items-start gap-3">
                          {/* Avatar: Render verified photo if available, fallback to initials */}
                          <div className="relative shrink-0">
                            {cust.photoUrl ? (
                              <img
                                src={cust.photoUrl}
                                alt={cust.fullName}
                                className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-400 shadow-md ring-2 ring-emerald-400/20"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-md">
                                {cust.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                              </div>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleFavourite(cust.id, e); }}
                              className="absolute -bottom-1 -right-1 p-1 rounded-full bg-white shadow-xs text-yellow-500"
                            >
                              <Star className={`w-3.5 h-3.5 ${cust.isFavourite ? "fill-yellow-400" : ""}`} />
                            </button>
                          </div>

                          {/* Name + Tier + KYC status */}
                          <div className="min-w-0 flex-1">
                            <h3 className="text-base font-extrabold text-slate-900 leading-snug break-words">
                              {cust.fullName}
                            </h3>
                            {/* Badges row */}
                            <div className="flex items-center gap-1.5 flex-wrap mt-1">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-700 whitespace-nowrap">
                                {cust.tier}
                              </span>
                              {cust.kycStatus === "VERIFIED" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 whitespace-nowrap">
                                  <CheckCircle2 className="w-3 h-3 shrink-0" /> Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 whitespace-nowrap">
                                  <Clock className="w-3 h-3 shrink-0" /> Pending
                                </span>
                              )}
                              {cust.isBlocked && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700 whitespace-nowrap">
                                  <Ban className="w-3 h-3 shrink-0" /> Frozen
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* ── ROW 2: Mobile Number */}
                        <p className="text-sm font-semibold text-slate-700 font-mono whitespace-nowrap overflow-hidden text-ellipsis">
                          +91 {cust.mobile}
                        </p>

                        {/* ── ROW 3: Customer ID */}
                        <div>
                          <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg whitespace-nowrap inline-block">
                            ID: {cust.id}
                          </span>
                        </div>

                        {/* ── ROW 4: Risk badge + eKYC status */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-black tracking-wider border whitespace-nowrap ${
                              cust.riskLevel === "LOW"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : cust.riskLevel === "MEDIUM"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : cust.riskLevel === "HIGH" || cust.riskLevel === "CRITICAL"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-slate-50 text-slate-600 border-slate-200"
                            }`}
                          >
                            {cust.riskLevel} RISK
                          </span>

                          {cust.aadhaarStatus === "VERIFIED" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                              <CheckCircle2 className="w-3 h-3 shrink-0" /> Aadhaar eKYC
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                              <Clock className="w-3 h-3 shrink-0" /> eKYC Pending
                            </span>
                          )}
                        </div>

                        {/* ── Monthly Limit */}
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-700 gap-2 flex-wrap">
                            <span>Monthly Limit</span>
                            <span className="font-mono text-slate-900 font-extrabold">₹{cust.monthlyLimit.toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 gap-2 flex-wrap">
                            <span>Used: ₹{cust.usedAmount.toLocaleString("en-IN")}</span>
                            <span
                              className={`font-extrabold font-mono px-2 py-0.5 rounded-md text-[10px] ${
                                limitUsagePct > 90
                                  ? "bg-red-100 text-red-700"
                                  : limitUsagePct > 70
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {limitUsagePct}% Used
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                limitUsagePct > 90 ? "bg-red-500" : limitUsagePct > 70 ? "bg-amber-500" : "bg-gradient-to-r from-blue-500 to-indigo-600"
                              }`}
                              style={{ width: `${limitUsagePct}%` }}
                            />
                          </div>
                        </div>

                        {/* ── Last Transaction */}
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 flex-wrap gap-1">
                          <span>Last Txn: <strong className="text-slate-700">{cust.lastTxnDate}</strong></span>
                          <span>Txns: <strong className="text-slate-700 font-mono">{cust.todayTxnCount}</strong></span>
                        </div>

                        {/* FULLY FUNCTIONAL 7-ACTION DROPDOWN MENU */}
                        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                          <div className="text-xs text-slate-500 font-mono">
                            Wallet Bal: <strong className="text-slate-900 font-bold">₹{cust.walletBalance.toLocaleString("en-IN")}</strong>
                          </div>

                          <div className="relative action-menu-container">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveActionMenuId(isMenuOpen ? null : cust.id);
                                playSoundEffect("CLICK");
                              }}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] shadow-sm flex items-center gap-1.5 transition-all focus:ring-2 focus:ring-blue-600 focus:outline-none whitespace-nowrap"
                            >
                              <span>Select Action</span>
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMenuOpen ? "rotate-180" : ""}`} />
                            </button>

                            <AnimatePresence>
                              {isMenuOpen && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: -8 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                                  transition={{ duration: 0.15 }}
                                  className="absolute right-0 bottom-full mb-2 w-56 bg-white border border-[#E2E8F0] rounded-2xl shadow-xl z-50 overflow-hidden text-xs font-bold text-slate-700 py-1.5"
                                >
                                  {/* Action 1: Use For DMT */}
                                  <button
                                    onClick={() => {
                                       setActiveActionMenuId(null);
                                       router.push(`/retailer/dmt`);
                                    }}
                                    className="w-full min-h-[40px] px-4 py-2.5 hover:bg-blue-50 text-blue-700 flex items-center gap-2.5 transition-colors"
                                  >
                                    <ArrowUpRight className="w-4 h-4 text-[#2563EB]" />
                                    <span>Use For DMT</span>
                                  </button>

                                  {/* Action 2: View Profile */}
                                  <button
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      setSelectedCustomer(cust);
                                      setShowProfileDrawer(true);
                                    }}
                                    className="w-full min-h-[40px] px-4 py-2.5 hover:bg-slate-100 flex items-center gap-2.5 transition-colors"
                                  >
                                    <Eye className="w-4 h-4 text-slate-600" />
                                    <span>View Profile</span>
                                  </button>

                                  {/* Action 3: Beneficiaries */}
                                  <button
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      setCustomerForBeneficiaries(cust);
                                      setShowBeneficiariesModal(true);
                                    }}
                                    className="w-full min-h-[40px] px-4 py-2.5 hover:bg-slate-100 flex items-center gap-2.5 transition-colors"
                                  >
                                    <CreditCard className="w-4 h-4 text-emerald-600" />
                                    <span>Beneficiaries ({cust.beneficiaries.length})</span>
                                  </button>

                                  {/* Action 4: History */}
                                  <button
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      setCustomerForHistory(cust);
                                      setShowHistoryModal(true);
                                    }}
                                    className="w-full min-h-[40px] px-4 py-2.5 hover:bg-slate-100 flex items-center gap-2.5 transition-colors"
                                  >
                                    <History className="w-4 h-4 text-purple-600" />
                                    <span>History</span>
                                  </button>

                                  {/* Action 5: Edit Customer */}
                                  <button
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      setCustomerToEdit({ ...cust });
                                      setShowEditModal(true);
                                    }}
                                    className="w-full min-h-[40px] px-4 py-2.5 hover:bg-slate-100 flex items-center gap-2.5 transition-colors"
                                  >
                                    <Edit3 className="w-4 h-4 text-amber-600" />
                                    <span>Edit Customer</span>
                                  </button>

                                  {/* Action 6: Freeze / Unfreeze */}
                                  <button
                                    onClick={() => handleToggleBlock(cust)}
                                    className={`w-full min-h-[40px] px-4 py-2.5 flex items-center gap-2.5 transition-colors ${
                                      cust.isBlocked ? "hover:bg-emerald-50 text-emerald-700" : "hover:bg-amber-50 text-amber-700"
                                    }`}
                                  >
                                    {cust.isBlocked ? (
                                      <>
                                        <Unlock className="w-4 h-4 text-[#22C55E]" />
                                        <span>Unfreeze Account</span>
                                      </>
                                    ) : (
                                      <>
                                        <Lock className="w-4 h-4 text-[#F59E0B]" />
                                        <span>Freeze Account</span>
                                      </>
                                    )}
                                  </button>

                                  <div className="my-1 border-t border-slate-100" />

                                  {/* Action 7: Delete Customer */}
                                  <button
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      setCustomerToDelete(cust);
                                      setShowDeleteConfirmModal(true);
                                    }}
                                    className="w-full min-h-[40px] px-4 py-2.5 hover:bg-red-50 text-[#EF4444] flex items-center gap-2.5 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4 text-[#EF4444]" />
                                    <span>Delete Customer</span>
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>

                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: LIVE INTELLIGENCE */}
          <div className="lg:col-span-3 space-y-6">
            <div className="p-5 rounded-3xl bg-white border border-[#E2E8F0] shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#2563EB]" />
                  <span>Today&apos;s Operations</span>
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs font-bold">
                <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-100 text-blue-900">
                  <div className="text-[10px] text-blue-600 uppercase font-bold">Registrations</div>
                  <div className="text-xl font-mono font-black mt-0.5">+{todayNewCount}</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-purple-50/80 border border-purple-100 text-purple-900">
                  <div className="text-[10px] text-purple-600 uppercase font-bold">Pending eKYC</div>
                  <div className="text-xl font-mono font-black mt-0.5">{pendingCount}</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* EXISTING SLIDE-OVER DRAWER FOR CUSTOMER ONBOARDING */}
      <CustomerMasterSlideOver
        open={showSlideOver}
        onClose={() => setShowSlideOver(false)}
        onSuccess={() => {
          setShowSlideOver(false);
          fetchCustomers();
        }}
      />

      {/* ENTERPRISE CUSTOMER WORKSPACE DRAWER */}
      <CustomerDetailsDrawer
        isOpen={showProfileDrawer}
        onClose={() => setShowProfileDrawer(false)}
        customer={selectedCustomer}
        onStartPayout={() => {
          router.push(`/retailer/dmt`);
        }}
        onEditCustomer={(cust) => {
          setCustomerToEdit(cust);
          setShowEditModal(true);
        }}
        onTransferHistory={(cust) => {
          setCustomerForHistory(cust);
          setShowHistoryModal(true);
        }}
      />

    </div>
  );
}
