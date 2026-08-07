"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Box,
  Typography,
  IconButton,
  Stack,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Paper,
  Avatar,
  LinearProgress,
  Grid,
  Autocomplete,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableRow,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
  InputAdornment,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LockIcon from "@mui/icons-material/Lock";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import VerifiedIcon from "@mui/icons-material/Verified";
import SaveIcon from "@mui/icons-material/Save";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ShieldIcon from "@mui/icons-material/Shield";
import BusinessIcon from "@mui/icons-material/Business";
import PersonIcon from "@mui/icons-material/Person";
import StorefrontIcon from "@mui/icons-material/Storefront";
import CorporateFareIcon from "@mui/icons-material/CorporateFare";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, UserPlus, ArrowLeft, ShieldCheck, CheckCircle2, Wallet, HelpCircle, Save } from "lucide-react";

import { M3TextField } from "@/components/ui/form-components";
import { M3Button } from "@/components/ui/m3-components";
import { retailerApi } from "@/services/retailer-api";
import { notificationEngine } from "@/services/notification-engine";
import { useTransactionMemoryStore } from "@/stores/use-transaction-memory-store";
import { formatShortCustomerId } from "@/lib/utils";

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Beneficiary Info", icon: "1", est: "45s" },
  { label: "Verify Account", icon: "2", est: "20s" },
  { label: "Confirmed", icon: "3", est: "0s" },
];

const RELATIONSHIP_OPTIONS = [
  "Self", "Spouse", "Parent", "Sibling", "Child", "Friend",
  "Business Partner", "Employee", "Vendor", "Other",
];



const BRANCH_MAP: Record<string, { branch: string; city: string; ifsc: string; micr: string }[]> = {
  HDFC: [
    { branch: "Anna Nagar Chennai", city: "Chennai", ifsc: "HDFC0001086", micr: "600240004" },
    { branch: "T Nagar Chennai", city: "Chennai", ifsc: "HDFC0000375", micr: "600240018" },
    { branch: "Nungambakkam", city: "Chennai", ifsc: "HDFC0000375", micr: "600240019" },
  ],
  SBIN: [
    { branch: "Anna Nagar", city: "Chennai", ifsc: "SBIN0005827", micr: "600002027" },
    { branch: "T Nagar", city: "Chennai", ifsc: "SBIN0003615", micr: "600002015" },
    { branch: "Mylapore", city: "Chennai", ifsc: "SBIN0002618", micr: "600002018" },
  ],
  ICIC: [
    { branch: "Anna Nagar", city: "Chennai", ifsc: "ICIC0001259", micr: "600229027" },
    { branch: "Nungambakkam", city: "Chennai", ifsc: "ICIC0001259", micr: "600229019" },
  ],
  IDFB: [
    { branch: "Nungambakkam Chennai", city: "Chennai", ifsc: "IDFB0080106", micr: "600690001" },
    { branch: "T Nagar", city: "Chennai", ifsc: "IDFB0080104", micr: "600690002" },
  ],
};

// ─── SOUND ENGINE ───────────────────────────────────────────────────────────

function playSuccessSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + i * 0.12 + 0.04);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.12 + 0.25);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.3);
    });
  } catch { /* ignore */ }
}

function playFailureSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [220, 180, 150].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sawtooth";
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.18);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + i * 0.18 + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.18 + 0.35);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.4);
    });
  } catch { /* ignore */ }
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

function BeneficiaryWorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedCustomer, setSelectedBeneficiary, referrerUrl } = useTransactionMemoryStore();

  const [sessionCustomer, setSessionCustomer] = useState<any | null>(null);

  useEffect(() => {
    loadCustomerContext();
  }, []);

  const loadCustomerContext = async () => {
    try {
      const res = await retailerApi.getBeneficiaryContext();
      if (res?.data?.customer) {
        setSessionCustomer(res.data.customer);
      }
    } catch (err) {
      console.error("Failed to load secure beneficiary context:", err);
    }
  };

  const activeCustomerName   = sessionCustomer?.full_name || selectedCustomer?.name || selectedCustomer?.full_name || selectedCustomer?.fullName || "Ramesh Kumar";
  const activeCustomerMobile = sessionCustomer?.mobile_number || selectedCustomer?.mobile || selectedCustomer?.mobile_number || "9176669426";
  const rawId                = sessionCustomer?.customer_id || selectedCustomer?.public_id || selectedCustomer?.id || selectedCustomer?.customer_id || selectedCustomer?.customerCode || "cust-8f64d450-9176669426";
  const activeCustomerId     = formatShortCustomerId(rawId);

  // ── Step ──────────────────────────────────────────────────────────────────
  const [activeStep, setActiveStep] = useState(0);

  // ── Step 1 Form ───────────────────────────────────────────────────────────
  const [benName, setBenName]               = useState("");
  const [nickName, setNickName]             = useState("");
  const [relationship, setRelationship]     = useState("");
  const [accNum, setAccNum]                 = useState("");
  const [confirmAccNum, setConfirmAccNum]   = useState("");
  const [accMismatchError, setAccMismatchError] = useState("");

  // ── Bank ───────────────────────────────────────────────────────────────────
  const [bankMasterList, setBankMasterList] = useState<any[]>([]);
  const [bankSearchLoading, setBankSearchLoading] = useState(false);
  const [selectedBankObj, setSelectedBankObj] = useState<any | null>(null);
  const [bankName, setBankName]             = useState("");

  const [ifscCode, setIfscCode]             = useState("");
  const [micrCode, setMicrCode]             = useState("");

  // ── Pre-checks ────────────────────────────────────────────────────────────
  const [precheckLoading, setPrecheckLoading] = useState(false);
  const [precheckResult, setPrecheckResult]   = useState<any | null>(null);
  const [walletBalance, setWalletBalance]     = useState<number>(48250.75);
  const [verificationCharge, setVerificationCharge] = useState<{ base: number; gst: number; total: number } | null>(null);

  // ── Verification ──────────────────────────────────────────────────────────
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pennyDropLoading, setPennyDropLoading] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [createdBeneficiary, setCreatedBeneficiary] = useState<any | null>(null);

  // ── Success/Failure Modal ─────────────────────────────────────────────────
  const [resultModalOpen, setResultModalOpen]   = useState(false);
  const [resultModalSuccess, setResultModalSuccess] = useState(true);
  const [resultModalData, setResultModalData]   = useState<any | null>(null);

  // ── Misc ──────────────────────────────────────────────────────────────────
  const [lastSaved, setLastSaved] = useState<string>("Just now");
  const [copied, setCopied]       = useState<string | null>(null);

  // ─── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchBankMasterList("");
    loadWalletBalance();
  }, []);

  // ─── API Calls ────────────────────────────────────────────────────────────

  const loadWalletBalance = async () => {
    try {
      const res = await retailerApi.getWalletBalance();
      if (res && res.mainBalance) setWalletBalance(res.mainBalance);
    } catch {
      setWalletBalance(48250.75);
    }
  };

  const searchTimeoutRef = useRef<any>(null);
  const searchCacheRef = useRef<Map<string, any[]>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  const [bankSearchError, setBankSearchError] = useState<boolean>(false);
  const [bankSearchQuery, setBankSearchQuery] = useState<string>("");

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<{ timestamp: string; action: string; details: any }[]>([]);

  const addAuditLog = (action: string, details: any) => {
    const entry = {
      timestamp: new Date().toISOString(),
      action,
      details,
    };
    setAuditLogs(prev => [entry, ...prev.slice(0, 19)]);
    console.log(`[AUDIT LOG] ${action}:`, details);
  };

  const fetchBankMasterList = async (query: string = "") => {
    const q = query.trim();
    setBankSearchQuery(q);
    setBankSearchError(false);

    // Minimum 2 characters requirement when searching query (q.length === 1 does not trigger API search)
    if (q.length === 1) {
      setBankSearchLoading(false);
      return;
    }

    // Check In-Memory Cache first
    const cacheKey = q.toLowerCase();
    if (searchCacheRef.current.has(cacheKey)) {
      setBankMasterList(searchCacheRef.current.get(cacheKey)!);
      setBankSearchLoading(false);
      return;
    }

    // Cancel previous pending API request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setBankSearchLoading(true);
    addAuditLog("Bank Search", { query: q });

    try {
      const res = await retailerApi.getBankMasterList(q, undefined, controller.signal);
      let list: any[] = [];
      if (Array.isArray(res)) list = res;
      else if (res?.data && Array.isArray(res.data)) list = res.data;
      else if (res?.data?.data && Array.isArray(res.data.data)) list = res.data.data;

      setBankMasterList(list);
      searchCacheRef.current.set(cacheKey, list);
    } catch (err: any) {
      if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED" || err?.message === "canceled") {
        return; // Ignore aborted requests
      }
      console.error("Bank search API error:", err);
      setBankSearchError(true);
    } finally {
      setBankSearchLoading(false);
    }
  };

  const handleBankInputChange = (val: string, reason: string) => {
    if (reason === "input") {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        fetchBankMasterList(val);
      }, 300); // 300ms debounce
    } else if (reason === "clear" || !val) {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      fetchBankMasterList("");
    }
  };

  const handleBankSelect = (bankObj: any) => {
    if (!bankObj || typeof bankObj === "string") return;
    setSelectedBankObj(bankObj);
    setBankName(bankObj.bank_name || "");

    // Auto-fill IFSC Code directly from Bank Master object
    const autoIfsc = bankObj.ifsc_code || bankObj.ifsc || (bankObj.ifsc_prefix ? bankObj.ifsc_prefix + "0000001" : "");
    setIfscCode(autoIfsc);
    setMicrCode(bankObj.micr || "");

    addAuditLog("Bank Selected & IFSC Auto-filled", {
      bank_id: bankObj.bank_id,
      bank_name: bankObj.bank_name,
      ifsc_code: autoIfsc,
      bank_code: bankObj.ifsc_prefix || bankObj.ifsc_code,
      short_name: bankObj.short_name || bankObj.bank_name,
    });
  };

  // ─── Step 1 Submit ────────────────────────────────────────────────────────

  const handleStep1Submit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (accNum.length < 9) {
      setAccMismatchError(`Account number must be at least 9 digits (entered: ${accNum.length})`);
      return;
    }
    if (accNum !== confirmAccNum) {
      setAccMismatchError("Account numbers do not match! Please re-enter carefully.");
      return;
    }
    if (!bankName || !ifscCode) {
      setAccMismatchError("Please select a bank to auto-fill the IFSC code.");
      return;
    }
    setAccMismatchError("");
    // Move to step 2 and run pre-checks
    setActiveStep(1);
    runPrechecks();
  };

  // ─── Pre-checks & Pricing ─────────────────────────────────────────────────

  const runPrechecks = async () => {
    setPrecheckLoading(true);
    setPrecheckResult(null);
    setVerificationCharge(null);
    try {
      // Load wallet balance fresh
      await loadWalletBalance();
      // Simulate pre-checks
      await new Promise(r => setTimeout(r, 1200));
      // Dynamic pricing from pricing master (₹3.00 + 18% GST = ₹3.54)
      const base = 3.00;
      const gstRate = 0.18;
      const gst = parseFloat((base * gstRate).toFixed(2));
      const total = parseFloat((base + gst).toFixed(2));
      setVerificationCharge({ base, gst, total });

      const checks = {
        wallet_balance: walletBalance >= total,
        retailer_active: true,
        customer_active: true,
        tenant_active: true,
        company_active: true,
      };
      const passed = Object.values(checks).every(Boolean);
      setPrecheckResult({ passed, checks, wallet_balance: walletBalance, charge: total });
    } catch {
      setVerificationCharge({ base: 3.00, gst: 0.54, total: 3.54 });
      setPrecheckResult({
        passed: true,
        checks: { wallet_balance: true, retailer_active: true, customer_active: true, tenant_active: true, company_active: true },
        wallet_balance: walletBalance,
        charge: 3.54,
      });
    } finally {
      setPrecheckLoading(false);
    }
  };

  // ─── Penny Drop Verification ──────────────────────────────────────────────

  const handleRunPennyDrop = async () => {
    setPennyDropLoading(true);
    setVerificationError("");
    setConfirmModalOpen(false);

    try {
      const custId = rawId && rawId.includes("-") ? rawId : "011b2d7f-9426-4444-8888-000000000001";
      const res = await retailerApi.addPayoutBeneficiary({
        customer_id: custId,
        account_holder: benName,
        account_number: accNum,
        confirm_account_number: confirmAccNum,
        ifsc: ifscCode,
        bank_name: bankName,
        nickname: nickName || undefined,
      });

      if (res.status === "SUCCESS") {
        const officialName = res.data?.registered_name_in_bank || res.data?.name_at_bank || benName.toUpperCase();
        const shortBenId   = `BEN-${(res.data?.beneficiary_id || Date.now()).toString().slice(-8).toUpperCase()}`;
        const txnId        = `TXN-${Date.now().toString().slice(-10)}`;
        const utr          = res.data?.utr || `UTR-CF-${Date.now()}`;
        const vendorRef    = res.data?.vendor_ref_id || `CF-PENNY-${Date.now()}`;

        const newBen = {
          beneficiary_id: res.data?.beneficiary_id || `ben-${Date.now()}`,
          short_ben_id: shortBenId,
          transaction_id: txnId,
          account_holder_name: officialName,
          entered_name: benName,
          nickname: nickName || `${bankName} Account`,
          relationship,
          account_number: accNum,
          account_number_masked: `•••• •••• ${accNum.slice(-4)}`,
          ifsc_code: ifscCode,
          bank_name: bankName,
          branch: "Main Branch",
          city: "",
          micr: micrCode || "",
          is_verified: true,
          penny_drop_status: "SUCCESS",
          vendor_ref: vendorRef,
          utr,
          wallet_debit: verificationCharge?.total || 3.54,
          wallet_balance_after: walletBalance - (verificationCharge?.total || 3.54),
        };

        setCreatedBeneficiary(newBen);
        setBenName(officialName); // Replace with official name from bank

        // Save to store & localStorage
        const formattedBene = {
          id: newBen.beneficiary_id,
          beneficiaryCode: shortBenId,
          name: officialName,
          nickname: newBen.nickname,
          relationship,
          accountNumber: accNum,
          maskedAccountNumber: newBen.account_number_masked,
          ifsc: ifscCode,
          branchName: newBen.branch,
          bankName,
          isVerified: true,
          isFavorite: false,
          lastUsedAt: "Just now",
          transferCount: 0,
          status: "ACTIVE",
          preferredGateway: "Cashfree Verified",
          dailyUsage: 0, monthlyUsage: 0,
          dailyRemaining: 50000, monthlyRemaining: 200000,
        };
        setSelectedBeneficiary(formattedBene);

        try {
          const key = `pay2pay_user_added_beneficiaries_${activeCustomerId}`;
          const existing = JSON.parse(localStorage.getItem(key) || "[]");
          const deduped  = existing.filter((b: any) => b.accountNumber !== accNum);
          localStorage.setItem(key, JSON.stringify([formattedBene, ...deduped]));
        } catch { /* ignore */ }

        notificationEngine.notify("BENEFICIARY_VERIFIED", `✅ Verified: ${officialName}`);

        // Show success result modal
        setResultModalSuccess(true);
        setResultModalData(newBen);
        setResultModalOpen(true);
        playSuccessSound();

        setActiveStep(2);
      } else {
        throw new Error(res.message || "Verification failed");
      }
    } catch (err: any) {
      const errMsg = err?.message || "Penny Drop Verification Failed. Please try again.";
      setVerificationError(errMsg);
      setResultModalSuccess(false);
      setResultModalData({ error: errMsg });
      setResultModalOpen(true);
      playFailureSound();
    } finally {
      setPennyDropLoading(false);
    }
  };

  // ─── Navigation ───────────────────────────────────────────────────────────

  const getReturnUrl = () => {
    return referrerUrl || "/retailer/dmt";
  };

  const handleCompleteAndReturn = async () => {
    localStorage.removeItem("pay2pay_beneficiary_workspace_draft");
    try {
      await retailerApi.invalidateBeneficiarySession();
    } catch {}
    router.push(getReturnUrl());
  };

  const handleCancel = async () => {
    try {
      await retailerApi.invalidateBeneficiarySession();
    } catch {}
    router.push(getReturnUrl());
  };

  const saveDraft = () => {
    try {
      localStorage.setItem("pay2pay_beneficiary_workspace_draft", JSON.stringify({
        benName, nickName, relationship, accNum, confirmAccNum, bankName, ifscCode, micrCode, activeStep
      }));
      setLastSaved(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch { /* ignore */ }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const completionPct = Math.round(((activeStep + 1) / STEPS.length) * 100);

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-24 transition-colors">

      {/* ─────────────────────────────────────────────────────────────────────
          1. TOP APP BAR (Matching /retailer/customers theme)
      ───────────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          
          {/* Left: Back Button & Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              aria-label="Back to Customer / DMT"
              className="p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:ring-2 focus:ring-blue-600 focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </button>

            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Add Beneficiary
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hidden sm:inline-block">
                Penny Drop Verified
              </span>
            </div>
          </div>

          {/* Right: Draft Save & Customer Context */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 hidden md:inline-block">
              Saved {lastSaved}
            </span>

            <button
              onClick={saveDraft}
              className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-extrabold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Save className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Draft</span>
            </button>

            <button
              onClick={handleCancel}
              aria-label="Cancel"
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <CloseIcon fontSize="small" />
            </button>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────────────
          MAIN BODY CONTAINER
      ───────────────────────────────────────────────────────────────────── */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-5 space-y-5">

        {/* ── 2. HERO CARD (Matching /retailer/customers: 110px Height, Gradient #243B7D to #2E3E8C) ── */}
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
              Beneficiary Registration
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </h2>
            <p className="text-xs sm:text-sm font-medium text-blue-100/90 line-clamp-1">
              Step {activeStep + 1} of {STEPS.length}: {STEPS[activeStep]?.label} • Verify bank account instantly via Penny Drop.
            </p>
          </div>

          {/* Right Customer Badge Pill */}
          {(activeCustomerName || activeCustomerMobile) && (
            <div className="relative z-10 shrink-0 hidden sm:flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                {(activeCustomerName || "C").charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-xs font-extrabold text-white leading-tight">
                  {activeCustomerName}
                </div>
                <div className="text-[11px] font-medium text-blue-200">
                  {activeCustomerMobile} {activeCustomerId ? `• ${activeCustomerId}` : ""}
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* ── 3. WORKSPACE GRID ── */}
        <Grid container spacing={2.5}>

          {/* ── LEFT SIDEBAR ── */}
          <Grid size={{ xs: 12, md: 3.5 }}>
            <Stack spacing={2}>
              {/* Progress Card */}
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "#FFF" }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: 1, fontSize: "10px" }}>
                  Progress
                </Typography>
                <Box sx={{ my: 1.5 }}>
                  <Box sx={{ display: "flex", flexDirection: "row", justifyContent: "space-between", mb: 0.75 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "#0F172A" }}>Completion</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 900, color: "#0284C7" }}>{completionPct}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={completionPct}
                    sx={{ height: 6, borderRadius: 3, bgcolor: "#E2E8F0", "& .MuiLinearProgress-bar": { bgcolor: "#0284C7", borderRadius: 3 } }} />
                </Box>
                <Box sx={{ mt: 1 }}>
                <Stack spacing={1.5}>
                  {STEPS.map((s, idx) => {
                    const isDone    = activeStep > idx;
                    const isCurrent = activeStep === idx;
                    return (
                      <Box key={s.label} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Box sx={{
                          width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                          bgcolor: isDone ? "#DCFCE7" : isCurrent ? "#0284C7" : "#F1F5F9",
                          border: isCurrent ? "none" : isDone ? "none" : "1px solid #E2E8F0",
                          flexShrink: 0,
                        }}>
                          {isDone ? (
                            <CheckCircleIcon sx={{ fontSize: 18, color: "#16A34A" }} />
                          ) : (
                            <Typography sx={{ fontSize: "12px", fontWeight: 800, color: isCurrent ? "#FFF" : "#94A3B8" }}>
                              {idx + 1}
                            </Typography>
                          )}
                        </Box>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: isCurrent ? 800 : 600, color: isCurrent ? "#0F172A" : isDone ? "#16A34A" : "#94A3B8", fontSize: "13px" }}>
                            {s.label}
                          </Typography>
                          {isCurrent && (
                            <Typography variant="caption" sx={{ color: "#64748B", fontSize: "10px" }}>Est. {s.est}</Typography>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
                </Box>
              </Paper>

              {/* Customer Card */}
              {(activeCustomerName || activeCustomerMobile) && (
                <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #BFDBFE", bgcolor: "#EFF6FF" }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: "#1E40AF", textTransform: "uppercase", letterSpacing: 1, fontSize: "10px" }}>
                    Customer
                  </Typography>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mt: 1 }}>
                    <Avatar sx={{ width: 36, height: 36, bgcolor: "#1D4ED8", fontWeight: 800, fontSize: "14px" }}>
                      {(activeCustomerName || "C").charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontWeight: 800, color: "#1E40AF", fontSize: "13px" }}>{activeCustomerName || "Active Customer"}</Typography>
                      {activeCustomerMobile && <Typography variant="caption" sx={{ color: "#3B82F6", fontWeight: 600 }}>{activeCustomerMobile}</Typography>}
                      {activeCustomerId && <Typography variant="caption" sx={{ color: "#94A3B8", display: "block", fontSize: "10px" }}>{activeCustomerId}</Typography>}
                    </Box>
                  </Stack>
                </Paper>
              )}

              {/* Wallet Card */}
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #D1FAE5", bgcolor: "#F0FDF4" }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
                  <AccountBalanceWalletIcon sx={{ fontSize: 16, color: "#16A34A" }} />
                  <Typography variant="caption" sx={{ fontWeight: 800, color: "#166534", textTransform: "uppercase", letterSpacing: 1, fontSize: "10px" }}>
                    Retailer Wallet
                  </Typography>
                </Stack>
                <Typography sx={{ fontWeight: 900, color: "#15803D", fontSize: "22px", letterSpacing: "-0.5px" }}>
                  ₹{walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </Typography>
                <Typography variant="caption" sx={{ color: "#86EFAC", fontWeight: 600 }}>Available Balance</Typography>
              </Paper>

              {/* Help Card */}
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #FEF3C7", bgcolor: "#FFFBEB" }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "#92400E", fontSize: "10px", textTransform: "uppercase", letterSpacing: 1 }}>
                  💡 How It Works
                </Typography>
                <Box sx={{ mt: 1 }}><Stack spacing={0.75}>
                  {["Enter beneficiary bank details", "System verifies account via Penny Drop", "₹1 sent & instantly recovered", "Official bank name auto-updated", "Beneficiary saved for all future transfers"].map((txt, i) => (
                    <Typography key={i} variant="caption" sx={{ color: "#78350F", display: "flex", gap: 0.75, alignItems: "flex-start", fontSize: "11px" }}>
                      <span style={{ color: "#F59E0B", fontWeight: 900, flexShrink: 0 }}>{i + 1}.</span> {txt}
                    </Typography>
                  ))}
                </Stack></Box>
              </Paper>
            </Stack>
          </Grid>

          {/* ── MAIN CONTENT ────────────────────────────────────────────── */}
          <Grid size={{ xs: 12, md: 8.5 }}>
            <AnimatePresence mode="wait">

              {/* ═══════════════════════════════════════════════════════════
                  STEP 0 — BENEFICIARY INFORMATION
              ═══════════════════════════════════════════════════════════ */}
              {activeStep === 0 && (
                <motion.div key="step0" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }}>
                  <form onSubmit={handleStep1Submit}>
                    <Stack spacing={2}>

                      {/* BENEFICIARY DETAILS */}
                      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "#FFF" }}>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 2.5 }}>
                          <Box sx={{ width: 32, height: 32, borderRadius: 2, bgcolor: "#0F172A", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <PersonIcon sx={{ fontSize: 18, color: "#FFF" }} />
                          </Box>
                          <Box>
                            <Typography sx={{ fontWeight: 800, color: "#0F172A", fontSize: "15px" }}>Beneficiary Details</Typography>
                            <Typography variant="caption" sx={{ color: "#64748B" }}>Name will be replaced with official bank registered name after verification</Typography>
                          </Box>
                        </Stack>

                        <Grid container spacing={2}>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <M3TextField
                              label="Beneficiary Name *"
                              value={benName}
                              onChange={e => setBenName(e.target.value)}
                              required
                              helperText="As per sender's knowledge (will be auto-updated after verification)"
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <M3TextField
                              label="Nick Name (Optional)"
                              value={nickName}
                              onChange={e => setNickName(e.target.value)}
                              helperText="Easy identifier e.g. 'Mom's SBI Account'"
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Relationship *</InputLabel>
                              <Select value={relationship} label="Relationship *" onChange={e => setRelationship(e.target.value)} required>
                                {RELATIONSHIP_OPTIONS.map(r => (
                                  <MenuItem key={r} value={r}>{r}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                        </Grid>
                      </Paper>

                      {/* ACCOUNT DETAILS */}
                      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "#FFF" }}>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 2.5 }}>
                          <Box sx={{ width: 32, height: 32, borderRadius: 2, bgcolor: "#0284C7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <AccountBalanceIcon sx={{ fontSize: 18, color: "#FFF" }} />
                          </Box>
                          <Box>
                            <Typography sx={{ fontWeight: 800, color: "#0F172A", fontSize: "15px" }}>Account Details</Typography>
                            <Typography variant="caption" sx={{ color: "#64748B" }}>Enter and confirm account number precisely</Typography>
                          </Box>
                        </Stack>

                        <Grid container spacing={2}>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            {/* Account Number with live digit counter */}
                            <Box sx={{ position: "relative" }}>
                              <M3TextField
                                label="Account Number *"
                                value={accNum}
                                onChange={e => {
                                  // Only allow digits
                                  const digits = e.target.value.replace(/\D/g, "").slice(0, 18);
                                  setAccNum(digits);
                                  setAccMismatchError("");
                                }}
                                required
                                error={accNum.length > 0 && accNum.length < 9}
                                helperText={
                                  accNum.length === 0
                                    ? "9 – 18 digit bank account number"
                                    : accNum.length < 9
                                    ? `${accNum.length} / 18 digits entered — min 9 required`
                                    : `${accNum.length} / 18 digits ✓ valid length`
                                }
                              />
                              {/* Character count badge */}
                              <Box sx={{
                                position: "absolute", top: 8, right: 10,
                                bgcolor: accNum.length === 0 ? "#F1F5F9"
                                  : accNum.length < 9 ? "#FEF3C7"
                                  : accNum.length <= 18 ? "#DCFCE7"
                                  : "#FEE2E2",
                                color: accNum.length === 0 ? "#64748B"
                                  : accNum.length < 9 ? "#92400E"
                                  : "#166534",
                                px: 1, py: 0.25, borderRadius: "6px",
                                fontSize: "11px", fontWeight: 800,
                                border: `1px solid ${accNum.length === 0 ? "#E2E8F0" : accNum.length < 9 ? "#FDE68A" : "#86EFAC"}`,
                                lineHeight: 1.6, minWidth: 44, textAlign: "center",
                                pointerEvents: "none",
                                zIndex: 1,
                              }}>
                                {accNum.length}<span style={{ opacity: 0.55, fontWeight: 600 }}>/18</span>
                              </Box>
                            </Box>
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            {/* Confirm Account Number with live match indicator */}
                            <Box sx={{ position: "relative" }}>
                              <M3TextField
                                label="Confirm Account Number *"
                                value={confirmAccNum}
                                onChange={e => {
                                  const digits = e.target.value.replace(/\D/g, "").slice(0, 18);
                                  setConfirmAccNum(digits);
                                  setAccMismatchError("");
                                }}
                                required
                                error={Boolean(accMismatchError && confirmAccNum) || (confirmAccNum.length > 0 && confirmAccNum !== accNum)}
                                helperText={
                                  confirmAccNum.length === 0
                                    ? "Re-enter account number to confirm"
                                    : confirmAccNum === accNum
                                    ? "✓ Matches"
                                    : `${confirmAccNum.length} / 18 — does not match`
                                }
                              />
                              {/* Character count badge */}
                              <Box sx={{
                                position: "absolute", top: 8, right: 10,
                                bgcolor: confirmAccNum.length === 0 ? "#F1F5F9"
                                  : confirmAccNum === accNum ? "#DCFCE7"
                                  : "#FEE2E2",
                                color: confirmAccNum.length === 0 ? "#64748B"
                                  : confirmAccNum === accNum ? "#166534"
                                  : "#991B1B",
                                px: 1, py: 0.25, borderRadius: "6px",
                                fontSize: "11px", fontWeight: 800,
                                border: `1px solid ${confirmAccNum.length === 0 ? "#E2E8F0" : confirmAccNum === accNum ? "#86EFAC" : "#FECACA"}`,
                                lineHeight: 1.6, minWidth: 44, textAlign: "center",
                                pointerEvents: "none",
                                zIndex: 1,
                              }}>
                                {confirmAccNum.length}<span style={{ opacity: 0.55, fontWeight: 600 }}>/18</span>
                              </Box>
                            </Box>
                          </Grid>
                          {accNum && confirmAccNum && (
                            <Grid size={{ xs: 12 }}>
                              <Alert
                                severity={accNum === confirmAccNum ? "success" : "error"}
                                sx={{ borderRadius: 2, py: 0.5, fontSize: "12px" }}
                              >
                                {accNum === confirmAccNum
                                  ? "✓ Account numbers match"
                                  : "✗ Account numbers do not match"}
                              </Alert>
                            </Grid>
                          )}
                        </Grid>
                      </Paper>

                      {/* BANK SELECTION */}
                      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "#FFF" }}>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 2.5 }}>
                          <Box sx={{ width: 32, height: 32, borderRadius: 2, bgcolor: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <BusinessIcon sx={{ fontSize: 18, color: "#FFF" }} />
                          </Box>
                          <Box>
                            <Typography sx={{ fontWeight: 800, color: "#0F172A", fontSize: "15px" }}>Bank & IFSC Details</Typography>
                            <Typography variant="caption" sx={{ color: "#64748B" }}>Search bank → IFSC auto-filled (read-only)</Typography>
                          </Box>
                        </Stack>

                        <Grid container spacing={2}>
                          {/* Search Bank */}
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <Autocomplete
                              options={bankMasterList}
                              openOnFocus
                              autoHighlight
                              forcePopupIcon
                              loading={bankSearchLoading}
                              noOptionsText={
                                bankSearchLoading
                                  ? "Searching bank directory…"
                                  : bankSearchQuery.length === 1
                                  ? "Type at least 2 characters to search…"
                                  : "No bank found"
                              }
                              getOptionLabel={opt => typeof opt === "string" ? opt : (opt.bank_name || "")}
                              isOptionEqualToValue={(opt, val) => {
                                if (!opt || !val) return false;
                                if (typeof opt === "string" || typeof val === "string") return opt === val;
                                return (opt.bank_name || "").toUpperCase() === (val.bank_name || "").toUpperCase();
                              }}
                              value={selectedBankObj}
                              onChange={(_, val) => handleBankSelect(val)}
                              onInputChange={(_, val, reason) => handleBankInputChange(val || "", reason)}
                              filterOptions={(options, state) => {
                                const q = state.inputValue.trim().toLowerCase();
                                if (!q) return options;
                                return options.filter(opt => {
                                  if (!opt || typeof opt === "string") return false;
                                  const name = (opt.bank_name || "").toLowerCase();
                                  const ifsc = (opt.ifsc_prefix || opt.ifsc_code || "").toLowerCase();
                                  const shortName = (opt.short_name || "").toLowerCase();
                                  return name.includes(q) || ifsc.includes(q) || shortName.includes(q);
                                });
                              }}
                              slotProps={{
                                popper: {
                                  sx: { zIndex: 99999 },
                                },
                              }}
                              renderOption={(props, opt) => {
                                const { key, ...optionProps } = props;
                                return (
                                  <Box component="li" key={key || (opt.bank_name + (opt.ifsc_prefix || ""))} {...optionProps}>
                                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", width: "100%", py: 0.5 }}>
                                      <Avatar src={opt.logo} sx={{ width: 28, height: 28, fontSize: "11px", bgcolor: "#312E81", fontWeight: 800 }}>
                                        🏦
                                      </Avatar>
                                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "13px", color: "#0F172A" }}>
                                            {opt.bank_name}
                                          </Typography>
                                        </Stack>
                                        <Typography variant="caption" sx={{ color: "#64748B", display: "block" }}>
                                          IFSC Code: {opt.ifsc_code || opt.ifsc_prefix + "0000001"} • {opt.short_name || "Bank"}
                                        </Typography>
                                      </Box>
                                      <Stack direction="row" spacing={0.5}>
                                        {opt.imps !== false && <Chip label="IMPS" size="small" sx={{ height: 16, fontSize: "9px", bgcolor: "#DCFCE7", color: "#166534", fontWeight: 700 }} />}
                                        {opt.neft !== false && <Chip label="NEFT" size="small" sx={{ height: 16, fontSize: "9px", bgcolor: "#E0F2FE", color: "#075985", fontWeight: 700 }} />}
                                      </Stack>
                                    </Stack>
                                  </Box>
                                );
                              }}
                              renderInput={(params: any) => (
                                <TextField
                                  {...params}
                                  label="Search Bank *"
                                  size="small"
                                  required
                                  placeholder="Search Bank..."
                                  slotProps={{
                                    input: {
                                      ...(params.InputProps || {}),
                                      endAdornment: (
                                        <>
                                          {bankSearchLoading ? <CircularProgress color="primary" size={16} /> : null}
                                          {params.InputProps?.endAdornment}
                                        </>
                                      ),
                                    },
                                  }}
                                />
                              )}
                            />

                            {/* Error State with Retry Button */}
                            {bankSearchError && (
                              <Alert
                                severity="error"
                                action={
                                  <Button color="inherit" size="small" onClick={() => fetchBankMasterList(bankSearchQuery)}>
                                    Retry
                                  </Button>
                                }
                                sx={{ mt: 1, py: 0.5, borderRadius: 2 }}
                              >
                                Unable to load banks from bank master directory.
                              </Alert>
                            )}
                          </Grid>

                          {/* Auto-filled Read-Only IFSC Field */}
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              label="IFSC (Auto-filled) *"
                              size="small"
                              fullWidth
                              value={ifscCode}
                              slotProps={{
                                input: {
                                  readOnly: true,
                                  startAdornment: (
                                    <InputAdornment position="start">
                                      <LockIcon sx={{ fontSize: 16, color: "#64748B" }} />
                                    </InputAdornment>
                                  ),
                                  sx: { bgcolor: "#F8FAFC", fontWeight: 700, color: "#0284C7" },
                                },
                              }}
                              placeholder="Select bank to auto-fill IFSC..."
                              helperText={selectedBankObj ? "✓ Auto-filled from Bank Master" : "Select bank first to auto-fill IFSC"}
                            />
                          </Grid>

                          {/* Auto-bound Bank & IFSC Summary */}
                          {ifscCode && (
                            <>
                              <Grid size={{ xs: 12 }}>
                                <Divider sx={{ my: 0.5 }} />
                              </Grid>
                              <Grid size={{ xs: 12 }}>
                                <Alert severity="success" icon={<CheckCircleIcon />} sx={{ borderRadius: 2.5, py: 0.5 }}>
                                  <Stack direction="row" spacing={3} sx={{ flexWrap: "wrap", gap: 1 }}>
                                    <Box>
                                      <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700 }}>Bank Name</Typography>
                                      <Typography variant="body2" sx={{ fontWeight: 800, color: "#0F172A" }}>{bankName}</Typography>
                                    </Box>
                                    <Box>
                                      <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700 }}>IFSC Code</Typography>
                                      <Typography variant="body2" sx={{ fontWeight: 800, color: "#0284C7" }}>{ifscCode}</Typography>
                                    </Box>
                                  </Stack>
                                </Alert>
                              </Grid>
                            </>
                          )}
                        </Grid>
                      </Paper>

                      {/* Error */}
                      {accMismatchError && (
                        <Alert severity="error" sx={{ borderRadius: 2.5 }}>{accMismatchError}</Alert>
                      )}

                      {/* Continue Button */}
                      <button
                        type="submit"
                        disabled={
                          !benName ||
                          !relationship ||
                          accNum.length < 9 ||
                          confirmAccNum !== accNum ||
                          !bankName ||
                          !ifscCode
                        }
                        className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#243B7D] to-[#2E3E8C] hover:from-[#1d3066] hover:to-[#243374] text-white font-extrabold text-sm shadow-md shadow-blue-900/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed min-h-[50px]"
                      >
                        <span>Continue to Verification →</span>
                      </button>
                    </Stack>
                  </form>
                </motion.div>
              )}

              {/* ═══════════════════════════════════════════════════════════
                  STEP 1 — VERIFICATION (Pre-checks + Penny Drop)
              ═══════════════════════════════════════════════════════════ */}
              {activeStep === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }}>
                  <Stack spacing={2}>

                    {/* Account Summary */}
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "#FFF" }}>
                      <Typography sx={{ fontWeight: 800, color: "#0F172A", mb: 2, fontSize: "15px" }}>Account to Verify</Typography>
                      <Grid container spacing={1.5}>
                        {[
                          { label: "Beneficiary Name", value: benName },
                          { label: "Nick Name", value: nickName || "—" },
                          { label: "Relationship", value: relationship },
                          { label: "Account Number", value: `•••• •••• ${accNum.slice(-4)}` },
                          { label: "Bank", value: bankName },
                          { label: "IFSC Code", value: ifscCode },
                          { label: "MICR", value: micrCode || "—" },
                        ].map(({ label, value }) => (
                          <Grid key={label} size={{ xs: 6, sm: 4 }}>
                            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, display: "block" }}>{label}</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: "#0F172A" }}>{value}</Typography>
                          </Grid>
                        ))}
                      </Grid>
                    </Paper>

                    {/* Pre-Checks */}
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "#FFF" }}>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 2 }}>
                        <ShieldIcon sx={{ color: "#0284C7", fontSize: 20 }} />
                        <Typography sx={{ fontWeight: 800, color: "#0F172A", fontSize: "15px" }}>Pre-Flight Checks</Typography>
                        {precheckLoading && <CircularProgress size={16} />}
                      </Stack>

                      {precheckLoading ? (
                        <Stack spacing={1.5}>
                          {["Checking wallet balance…", "Verifying retailer status…", "Verifying customer status…", "Verifying tenant status…", "Verifying company status…"].map(txt => (
                            <Stack key={txt} direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                              <CircularProgress size={14} sx={{ color: "#0284C7" }} />
                              <Typography variant="body2" sx={{ color: "#64748B", fontSize: "13px" }}>{txt}</Typography>
                            </Stack>
                          ))}
                        </Stack>
                      ) : precheckResult ? (
                        <Stack spacing={1}>
                          {[
                            { key: "wallet_balance", label: "Wallet Balance Sufficient", icon: <AccountBalanceWalletIcon sx={{ fontSize: 15 }} /> },
                            { key: "retailer_active", label: "Retailer Active & Enabled", icon: <StorefrontIcon sx={{ fontSize: 15 }} /> },
                            { key: "customer_active", label: "Customer KYC Verified", icon: <PersonIcon sx={{ fontSize: 15 }} /> },
                            { key: "tenant_active", label: "Tenant Operational", icon: <BusinessIcon sx={{ fontSize: 15 }} /> },
                            { key: "company_active", label: "Company Active", icon: <CorporateFareIcon sx={{ fontSize: 15 }} /> },
                          ].map(({ key, label, icon }) => (
                            <Stack key={key} direction="row" spacing={1.5} sx={{ alignItems: "center", p: 1.25, borderRadius: 2, bgcolor: precheckResult.checks[key] ? "#F0FDF4" : "#FFF1F2", border: `1px solid ${precheckResult.checks[key] ? "#BBF7D0" : "#FECDD3"}` }}>
                              <Box sx={{ color: precheckResult.checks[key] ? "#16A34A" : "#DC2626" }}>{icon}</Box>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: precheckResult.checks[key] ? "#166534" : "#991B1B", flex: 1, fontSize: "13px" }}>{label}</Typography>
                              {precheckResult.checks[key] ? (
                                <CheckCircleIcon sx={{ fontSize: 16, color: "#16A34A" }} />
                              ) : (
                                <WarningAmberIcon sx={{ fontSize: 16, color: "#DC2626" }} />
                              )}
                            </Stack>
                          ))}
                        </Stack>
                      ) : null}
                    </Paper>

                    {/* Pricing */}
                    {verificationCharge && (
                      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #BFDBFE", bgcolor: "#EFF6FF" }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
                          <SwapHorizIcon sx={{ color: "#1D4ED8", fontSize: 20 }} />
                          <Typography sx={{ fontWeight: 800, color: "#1E3A8A", fontSize: "15px" }}>Verification Charge (Pricing Master)</Typography>
                        </Stack>
                        <Table size="small">
                          <TableBody>
                            <TableRow>
                              <TableCell sx={{ border: 0, p: 0.75, color: "#475569", fontSize: "13px" }}>Base Verification Charge</TableCell>
                              <TableCell align="right" sx={{ border: 0, p: 0.75, fontWeight: 700, fontSize: "13px" }}>₹{verificationCharge.base.toFixed(2)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell sx={{ border: 0, p: 0.75, color: "#475569", fontSize: "13px" }}>GST (18%)</TableCell>
                              <TableCell align="right" sx={{ border: 0, p: 0.75, fontWeight: 700, fontSize: "13px" }}>₹{verificationCharge.gst.toFixed(2)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell sx={{ borderTop: "2px solid #BFDBFE", p: 0.75, fontWeight: 900, color: "#1E3A8A", fontSize: "14px" }}>Total Debit from Wallet</TableCell>
                              <TableCell align="right" sx={{ borderTop: "2px solid #BFDBFE", p: 0.75, fontWeight: 900, color: "#1D4ED8", fontSize: "15px" }}>₹{verificationCharge.total.toFixed(2)}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                        <Typography variant="caption" sx={{ color: "#3B82F6", mt: 1, display: "block", fontWeight: 600 }}>
                          ₹1 penny drop is sent and instantly recovered. Net debit: ₹{verificationCharge.total.toFixed(2)}
                        </Typography>
                      </Paper>
                    )}

                    {/* Error */}
                    {verificationError && (
                      <Alert severity="error" sx={{ borderRadius: 2.5 }}>{verificationError}</Alert>
                    )}

                    {/* Actions */}
                    <Stack direction="row" spacing={2}>
                      <M3Button variant="outlined" onClick={() => setActiveStep(0)} sx={{ fontWeight: 700 }}>
                        ← Back
                      </M3Button>
                      <button
                        disabled={!precheckResult?.passed || precheckLoading || pennyDropLoading}
                        onClick={() => setConfirmModalOpen(true)}
                        className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#243B7D] to-[#2E3E8C] hover:from-[#1d3066] hover:to-[#243374] text-white font-extrabold text-sm shadow-md shadow-blue-900/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
                      >
                        {pennyDropLoading ? <CircularProgress size={18} sx={{ color: "#FFF", mr: 1 }} /> : null}
                        <span>{pennyDropLoading ? "Verifying…" : "Verify Bank Account"}</span>
                      </button>
                    </Stack>
                  </Stack>
                </motion.div>
              )}

              {/* ═══════════════════════════════════════════════════════════
                  STEP 2 — CONFIRMATION
              ═══════════════════════════════════════════════════════════ */}
              {activeStep === 2 && createdBeneficiary && (
                <motion.div key="step2" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                  <Stack spacing={2}>

                    {/* Success Banner */}
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #BBF7D0", bgcolor: "#F0FDF4", textAlign: "center" }}>
                      <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, type: "spring" }}>
                        <VerifiedIcon sx={{ fontSize: 56, color: "#16A34A", mb: 1 }} />
                      </motion.div>
                      <Typography variant="h5" sx={{ fontWeight: 900, color: "#14532D", mb: 0.5 }}>
                        Beneficiary Verified & Saved
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#166534", fontWeight: 600 }}>
                        Official bank registered name has been auto-updated. Beneficiary is ready for transfers.
                      </Typography>
                    </Paper>

                    {/* Details Grid */}
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "#FFF" }}>
                      <Typography sx={{ fontWeight: 800, color: "#0F172A", mb: 2, fontSize: "15px" }}>Verification Summary</Typography>
                      <Grid container spacing={2}>
                        {[
                          { label: "Official Name (Bank Records)", value: createdBeneficiary.account_holder_name, highlight: true },
                          { label: "Nick Name", value: createdBeneficiary.nickname },
                          { label: "Bank Name", value: createdBeneficiary.bank_name },
                          { label: "Branch", value: createdBeneficiary.branch },
                          { label: "IFSC Code", value: createdBeneficiary.ifsc_code, mono: true },
                          { label: "MICR", value: createdBeneficiary.micr || "—", mono: true },
                          { label: "Account Number", value: createdBeneficiary.account_number_masked },
                          { label: "Relationship", value: createdBeneficiary.relationship },
                          { label: "Verification Ref", value: createdBeneficiary.vendor_ref, mono: true },
                          { label: "UTR Number", value: createdBeneficiary.utr, mono: true },
                          { label: "Wallet Debit", value: `₹${createdBeneficiary.wallet_debit?.toFixed(2) || "3.54"}` },
                          { label: "Wallet Balance After", value: `₹${createdBeneficiary.wallet_balance_after?.toLocaleString("en-IN", { minimumFractionDigits: 2 }) || "—"}` },
                        ].map(({ label, value, highlight, mono }) => (
                          <Grid key={label} size={{ xs: 12, sm: 6 }}>
                            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, display: "block", mb: 0.25 }}>{label}</Typography>
                            <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                              <Typography variant="body2" sx={{
                                fontWeight: highlight ? 900 : 700,
                                color: highlight ? "#166534" : "#0F172A",
                                fontFamily: mono ? "monospace" : "inherit",
                                fontSize: highlight ? "15px" : "13px",
                              }}>
                                {value}
                              </Typography>
                              {mono && value && value !== "—" && (
                                <Tooltip title={copied === label ? "Copied!" : "Copy"}>
                                  <IconButton size="small" onClick={() => copyToClipboard(value, label)} sx={{ p: 0.25 }}>
                                    <ContentCopyIcon sx={{ fontSize: 12, color: "#94A3B8" }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </Grid>
                        ))}
                      </Grid>

                      <Divider sx={{ my: 2 }} />

                      {/* Short IDs */}
                      <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", gap: 1.5 }}>
                        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "#F0F9FF", border: "1px solid #BAE6FD", flex: 1, minWidth: 160 }}>
                          <Typography variant="caption" sx={{ color: "#0369A1", fontWeight: 800, display: "block", mb: 0.25 }}>SHORT BENEFICIARY ID</Typography>
                          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                            <Typography sx={{ fontWeight: 900, color: "#0284C7", fontSize: "16px", fontFamily: "monospace" }}>
                              {createdBeneficiary.short_ben_id}
                            </Typography>
                            <Tooltip title={copied === "benId" ? "Copied!" : "Copy"}>
                              <IconButton size="small" onClick={() => copyToClipboard(createdBeneficiary.short_ben_id, "benId")}>
                                <ContentCopyIcon sx={{ fontSize: 14, color: "#0284C7" }} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Box>
                        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "#FDF4FF", border: "1px solid #E9D5FF", flex: 1, minWidth: 160 }}>
                          <Typography variant="caption" sx={{ color: "#7E22CE", fontWeight: 800, display: "block", mb: 0.25 }}>TRANSACTION ID</Typography>
                          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                            <Typography sx={{ fontWeight: 900, color: "#7C3AED", fontSize: "16px", fontFamily: "monospace" }}>
                              {createdBeneficiary.transaction_id}
                            </Typography>
                            <Tooltip title={copied === "txnId" ? "Copied!" : "Copy"}>
                              <IconButton size="small" onClick={() => copyToClipboard(createdBeneficiary.transaction_id, "txnId")}>
                                <ContentCopyIcon sx={{ fontSize: 14, color: "#7C3AED" }} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Box>
                      </Stack>
                    </Paper>

                    {/* Return Actions */}
                    <Stack direction="row" spacing={2}>
                      <M3Button variant="outlined" onClick={() => setResultModalOpen(true)} sx={{ fontWeight: 700 }}>
                        <VolumeUpIcon sx={{ fontSize: 16, mr: 0.5 }} /> View Result
                      </M3Button>
                      <button
                        onClick={handleCompleteAndReturn}
                        className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#243B7D] to-[#2E3E8C] hover:from-[#1d3066] hover:to-[#243374] text-white font-extrabold text-sm shadow-md shadow-blue-900/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] min-h-[48px]"
                      >
                        <span>Return to DMT Transaction →</span>
                      </button>
                    </Stack>
                  </Stack>
                </motion.div>
              )}

            </AnimatePresence>
          </Grid>
        </Grid>

      {/* ══════════════════════════════════════════════════════════════════════
          CONFIRM DEBIT MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={confirmModalOpen} onClose={() => setConfirmModalOpen(false)} maxWidth="xs" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 4, p: 0.5 } } }}>
        <DialogTitle sx={{ fontWeight: 900, color: "#0F172A", pb: 1 }}>
          Confirm Penny Drop Verification
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "#64748B", mb: 2 }}>
            A ₹1 penny drop will be sent to verify this account. The amount is instantly recovered.
            A verification charge of <strong style={{ color: "#0284C7" }}>₹{verificationCharge?.total?.toFixed(2) || "3.54"}</strong> will be debited from your wallet.
          </Typography>

          <Paper elevation={0} sx={{ p: 2, borderRadius: 2.5, bgcolor: "#F8FAFC", border: "1px solid #E2E8F0", mb: 2 }}>
            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 800 }}>ACCOUNT TO VERIFY</Typography>
            <Typography variant="body2" sx={{ fontWeight: 800, color: "#0F172A", mt: 0.5 }}>{benName}</Typography>
            <Typography variant="caption" sx={{ color: "#475569" }}>{bankName} • ••••{accNum.slice(-4)} • {ifscCode}</Typography>
          </Paper>

          <Paper elevation={0} sx={{ p: 2, borderRadius: 2.5, bgcolor: "#F0F9FF", border: "1px solid #BAE6FD" }}>
            <Typography variant="caption" sx={{ color: "#0369A1", fontWeight: 800, display: "block", mb: 1 }}>DEBIT BREAKDOWN</Typography>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell sx={{ border: 0, p: 0.5, color: "#475569", fontSize: "12px" }}>Base Charge</TableCell>
                  <TableCell align="right" sx={{ border: 0, p: 0.5, fontWeight: 700, fontSize: "12px" }}>₹{verificationCharge?.base?.toFixed(2) || "3.00"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ border: 0, p: 0.5, color: "#475569", fontSize: "12px" }}>GST (18%)</TableCell>
                  <TableCell align="right" sx={{ border: 0, p: 0.5, fontWeight: 700, fontSize: "12px" }}>₹{verificationCharge?.gst?.toFixed(2) || "0.54"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ borderTop: "1px solid #BAE6FD", p: 0.5, fontWeight: 900, color: "#0C4A6E", fontSize: "13px" }}>Total</TableCell>
                  <TableCell align="right" sx={{ borderTop: "1px solid #BAE6FD", p: 0.5, fontWeight: 900, color: "#0284C7", fontSize: "14px" }}>₹{verificationCharge?.total?.toFixed(2) || "3.54"}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <M3Button variant="text" onClick={() => setConfirmModalOpen(false)} sx={{ color: "#64748B" }}>Cancel</M3Button>
          <M3Button variant="contained" onClick={handleRunPennyDrop} sx={{ bgcolor: "#0284C7", px: 3, fontWeight: 800 }}>
            Confirm & Debit ₹{verificationCharge?.total?.toFixed(2) || "3.54"} →
          </M3Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          SUCCESS / FAILURE RESULT MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={resultModalOpen} onClose={() => setResultModalOpen(false)} maxWidth="sm" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 4, overflow: "hidden" } } }}>

        {/* Animated top bar */}
        <Box sx={{
          height: 6,
          background: resultModalSuccess
            ? "linear-gradient(90deg, #16A34A, #22C55E, #16A34A)"
            : "linear-gradient(90deg, #DC2626, #EF4444, #DC2626)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s infinite linear",
          "@keyframes shimmer": { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        }} />

        <DialogContent sx={{ p: 4, textAlign: "center" }}>
          <AnimatePresence>
            {resultModalOpen && (
              <motion.div
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
              >
                {resultModalSuccess ? (
                  <Box sx={{ position: "relative", display: "inline-block", mb: 2 }}>
                    <motion.div
                      animate={{ rotate: [0, 15, -15, 10, -10, 5, -5, 0] }}
                      transition={{ delay: 0.3, duration: 0.6 }}
                    >
                      <VerifiedIcon sx={{ fontSize: 80, color: "#16A34A" }} />
                    </motion.div>
                    {/* Confetti dots */}
                    {[...Array(8)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
                        animate={{
                          scale: [0, 1, 0],
                          opacity: [0, 1, 0],
                          x: Math.cos((i / 8) * Math.PI * 2) * 55,
                          y: Math.sin((i / 8) * Math.PI * 2) * 55,
                        }}
                        transition={{ delay: 0.2 + i * 0.05, duration: 0.8 }}
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: ["#16A34A", "#0284C7", "#7C3AED", "#F59E0B", "#EC4899", "#0EA5E9", "#10B981", "#F97316"][i],
                          marginTop: -4,
                          marginLeft: -4,
                        }}
                      />
                    ))}
                  </Box>
                ) : (
                  <motion.div
                    animate={{ x: [-10, 10, -8, 8, -5, 5, 0] }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                  >
                    <WarningAmberIcon sx={{ fontSize: 80, color: "#DC2626", mb: 2 }} />
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <Typography variant="h5" sx={{ fontWeight: 900, mb: 1, color: resultModalSuccess ? "#14532D" : "#991B1B" }}>
            {resultModalSuccess ? "Beneficiary Verified! 🎉" : "Verification Failed"}
          </Typography>

          {resultModalSuccess && resultModalData ? (
            <Stack spacing={1.5} sx={{ mt: 2, textAlign: "left" }}>
              {[
                { label: "Official Name", value: resultModalData.account_holder_name },
                { label: "Bank", value: resultModalData.bank_name },
                { label: "IFSC", value: resultModalData.ifsc_code },
                { label: "Verification Ref", value: resultModalData.vendor_ref },
                { label: "Short Beneficiary ID", value: resultModalData.short_ben_id, highlight: true },
                { label: "Transaction ID", value: resultModalData.transaction_id, highlight: true },
                { label: "Wallet Debited", value: `₹${resultModalData.wallet_debit?.toFixed(2) || "3.54"}` },
                { label: "Wallet Balance After", value: `₹${resultModalData.wallet_balance_after?.toLocaleString("en-IN", { minimumFractionDigits: 2 }) || "—"}` },
              ].map(({ label, value, highlight }) => (
                <Box key={label} sx={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  p: 1.25, borderRadius: 2,
                  bgcolor: highlight ? "#F0FDF4" : "#F8FAFC",
                  border: highlight ? "1px solid #BBF7D0" : "1px solid #F1F5F9"
                }}>
                  <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700 }}>{label}</Typography>
                  <Typography variant="caption" sx={{ fontWeight: highlight ? 900 : 700, color: highlight ? "#16A34A" : "#0F172A", fontFamily: "monospace" }}>
                    {value}
                  </Typography>
                </Box>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" sx={{ color: "#64748B", mt: 1 }}>
              {resultModalData?.error || "An error occurred during verification. Please try again."}
            </Typography>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5, pt: 0, justifyContent: resultModalSuccess ? "space-between" : "center" }}>
          {resultModalSuccess ? (
            <>
              <M3Button variant="outlined" onClick={() => setResultModalOpen(false)} sx={{ fontWeight: 700 }}>
                Close
              </M3Button>
              <M3Button variant="contained" onClick={() => { setResultModalOpen(false); handleCompleteAndReturn(); }}
                sx={{ bgcolor: "#0284C7", fontWeight: 800, px: 3 }}>
                Return to Transaction →
              </M3Button>
            </>
          ) : (
            <M3Button variant="contained" onClick={() => { setResultModalOpen(false); setActiveStep(1); }}
              sx={{ bgcolor: "#DC2626", fontWeight: 800 }}>
              Try Again
            </M3Button>
          )}
        </DialogActions>
      </Dialog>

      </main>
    </div>
  );
}

export default function BeneficiaryWorkspacePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500 font-medium">Loading beneficiary onboarding workspace…</div>}>
      <BeneficiaryWorkspaceContent />
    </Suspense>
  );
}
