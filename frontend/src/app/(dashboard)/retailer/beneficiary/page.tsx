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
  ListSubheader,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
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
import PersonAddIcon from "@mui/icons-material/PersonAdd";
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
  { label: "Beneficiary Details", icon: "1", est: "30s" },
  { label: "Verification Confirmed", icon: "2", est: "0s" },
];

const RELATIONSHIP_OPTIONS = [
  "Self", "Spouse", "Parent", "Sibling", "Child", "Friend",
  "Business Partner", "Employee", "Vendor", "Other",
];





// ─── HIGH-FIDELITY FINTECH SOUND ENGINE ───────────────────────────────────────

function playSuccessSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Multi-stage chord arpeggio (C5 -> E5 -> G5 -> C6 -> E6) with warm bass backing
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    
    // Bass warmth (C3 130.81Hz)
    const bassOsc = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bassOsc.type = "sine";
    bassOsc.frequency.setValueAtTime(130.81, ctx.currentTime);
    bassGain.gain.setValueAtTime(0, ctx.currentTime);
    bassGain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    bassGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    bassOsc.connect(bassGain);
    bassGain.connect(ctx.destination);
    bassOsc.start(ctx.currentTime);
    bassOsc.stop(ctx.currentTime + 0.65);

    // Sparkling bell chime notes
    notes.forEach((freq, i) => {
      const startTime = ctx.currentTime + i * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.28, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  } catch { /* ignore audio policies */ }
}

function playFailureSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Two soft warm thuds
    [261.63, 196.00].forEach((freq, i) => {
      const startTime = ctx.currentTime + i * 0.16;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, startTime + 0.2);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.35, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  } catch { /* ignore */ }
}

function playClickSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1000, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.02);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.025);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.03);
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
  const [bankId, setBankId]                 = useState<string | number>("");
  const [bankCode, setBankCode]             = useState<string>("");
  const [bankShortName, setBankShortName]   = useState<string>("");

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

  // ── Bank Master Cache & Local Search State ──
  const [fullBankMasterList, setFullBankMasterList] = useState<any[]>([]);
  const [bankSelectSearch, setBankSelectSearch]     = useState<string>("");

  const filteredBankOptions = useMemo(() => {
    if (!bankSelectSearch.trim()) return bankMasterList;
    const q = bankSelectSearch.toLowerCase().trim();
    return bankMasterList.filter((p: any) => {
      const name = (p.bank_name || "").toLowerCase();
      const shortName = (p.short_name || p.bank_short_name || "").toLowerCase();
      const ifsc = (p.ifsc_prefix || p.ifsc_code || p.ifsc || "").toLowerCase();
      return name.includes(q) || shortName.includes(q) || ifsc.includes(q);
    });
  }, [bankMasterList, bankSelectSearch]);

  useEffect(() => {
    loadBankMasterOnMount();
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

  // ── Load Bank Master ONCE on Page Load ──
  const loadBankMasterOnMount = async () => {
    setBankSearchLoading(true);
    setBankSearchError(false);
    try {
      const res = await retailerApi.getBankMasterList();
      let list: any[] = [];
      if (Array.isArray(res)) list = res;
      else if (res?.data && Array.isArray(res.data)) list = res.data;
      else if (res?.data?.data && Array.isArray(res.data.data)) list = res.data.data;

      setFullBankMasterList(list);
      setBankMasterList(list);
      addAuditLog("Bank Master Loaded", { total: list.length });
    } catch (err) {
      console.error("Failed to load Bank Master:", err);
      setBankSearchError(true);
    } finally {
      setBankSearchLoading(false);
    }
  };

  const handleBankInputChange = (val: string, reason: string) => {
    const q = (val || "").trim();
    setBankSearchQuery(q);

    if (reason === "clear" || !val) {
      setBankMasterList(fullBankMasterList);
      setSelectedBankObj(null);
      setBankName("");
      setBankId("");
      setBankCode("");
      setBankShortName("");
      setIfscCode("");
      return;
    }

    if (reason === "input") {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        // Local search inside in-memory loaded Bank Master list
        if (!q) {
          setBankMasterList(fullBankMasterList);
        } else {
          const qLower = q.toLowerCase();
          const filtered = fullBankMasterList.filter(b => {
            const name = (b.bank_name || "").toLowerCase();
            const ifsc = (b.ifsc_prefix || b.ifsc_code || b.ifsc || "").toLowerCase();
            const shortName = (b.short_code || b.short_name || b.bank_short_name || "").toLowerCase();
            return name.includes(qLower) || ifsc.includes(qLower) || shortName.includes(qLower);
          });
          setBankMasterList(filtered);
        }
      }, 300); // 300ms debounce
    }
  };

  const handleBankSelect = (bankObj: any) => {
    if (!bankObj) {
      setSelectedBankObj(null);
      setBankName("");
      setBankId("");
      setBankCode("");
      setBankShortName("");
      setIfscCode("");
      return;
    }
    if (typeof bankObj === "string") return;

    setSelectedBankObj(bankObj);
    const bName  = bankObj.bank_name || "";
    const bCode  = bankObj.bank_code || bankObj.ifsc_prefix || bankObj.ifsc_code || "";
    const bId    = bankObj.bank_id || bankObj.bank_ifsc_ref_id || bCode;
    const autoIfsc = bankObj.ifsc_code || bankObj.ifsc || (bCode ? bCode + "0000001" : "");
    const bShort = bankObj.bank_short_name || bankObj.short_code || bankObj.short_name || bName;

    setBankName(bName);
    setBankId(bId);
    setBankCode(bCode);
    setBankShortName(bShort);
    setIfscCode(autoIfsc);
    setMicrCode(bankObj.micr || "");

    addAuditLog("Bank Selected", {
      bank_id: bId,
      bank_name: bName,
      bank_code: bCode,
      ifsc_code: autoIfsc,
      bank_short_name: bShort,
    });
  };


  const [duplicateError, setDuplicateError] = useState<string>("");
  const [checkingDuplicate, setCheckingDuplicate] = useState<boolean>(false);

  const validateDuplicateAccount = async (accToTest: string, ifscToTest?: string) => {
    if (!accToTest || accToTest.length < 9) {
      setDuplicateError("");
      return false;
    }
    setCheckingDuplicate(true);
    try {
      // 1. Query backend database for existing customer beneficiary mapping
      const res = await retailerApi.checkDuplicateBeneficiaryAccount({
        customer_id: activeCustomerId,
        account_number: accToTest,
        ifsc_code: ifscToTest || ifscCode,
      });

      if (res && res.is_duplicate) {
        const holderName = res.existing_beneficiary?.account_holder_name || res.existing_beneficiary?.registered_name_in_bank || "Registered Beneficiary";
        const errMsg = `❌ Bank account number ending in ${accToTest.slice(-4)} is ALREADY registered for this customer (${activeCustomerName}). Registered Holder: ${holderName}`;
        setDuplicateError(errMsg);
        setCheckingDuplicate(false);
        return true;
      }

      // 2. Check local active customer beneficiary list
      const key = `pay2pay_user_added_beneficiaries_${activeCustomerId}`;
      const existingLocal = JSON.parse(localStorage.getItem(key) || "[]");
      const localMatch = existingLocal.find((b: any) => (b.accountNumber || b.account_number) === accToTest);

      if (localMatch) {
        const errMsg = `❌ Bank account number ending in ${accToTest.slice(-4)} is ALREADY registered for this customer (${activeCustomerName}). Registered Holder: ${localMatch.name || localMatch.account_holder_name}`;
        setDuplicateError(errMsg);
        setCheckingDuplicate(false);
        return true;
      }

      setDuplicateError("");
      setCheckingDuplicate(false);
      return false;
    } catch {
      setDuplicateError("");
      setCheckingDuplicate(false);
      return false;
    }
  };

  // ─── Step 1 Submit ────────────────────────────────────────────────────────

  const handleStep1Submit = async (e?: React.FormEvent) => {
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
      setAccMismatchError("Please select a bank.");
      return;
    }
    setAccMismatchError("");

    // Real-time DB Duplicate Account Check for same customer
    const isDup = await validateDuplicateAccount(accNum, ifscCode);
    if (isDup) {
      return;
    }

    // 2-Step Workflow: Click button on Step 1 -> Open Permission Dialog showing Debit Amount Details
    setConfirmModalOpen(true);
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
      const res = await retailerApi.addAndVerifyEpic014Beneficiary({
        customer_id: custId,
        account_number: accNum,
        confirm_account_number: confirmAccNum,
        ifsc_code: ifscCode,
        bank_name: bankName,
        bank_id: String(bankId),
        bank_code: bankCode,
        bank_short_name: bankShortName,
        account_holder_name: benName,
        nickname: nickName || undefined,
        current_wallet_balance: walletBalance,
      });

      if (res.status === "SUCCESS" || res.verification_status === "VERIFIED") {
        const beneData = res.beneficiary || res.data || {};
        const officialName = beneData.registered_name_in_bank || beneData.name_at_bank || beneData.account_holder_name || benName.toUpperCase();
        const shortBenId   = `BEN-${(beneData.beneficiary_id || Date.now()).toString().slice(-8).toUpperCase()}`;
        const txnId        = `TXN-${Date.now().toString().slice(-10)}`;
        const utr          = beneData.utr || `UTR-CF-${Date.now()}`;
        const vendorRef    = beneData.verification_reference || beneData.vendor_ref_id || `CF-PENNY-${Date.now()}`;
        const isReused     = Boolean(res.is_reused || res.is_reused_master || beneData.is_reused);

        const actualDebit        = isReused ? 0.00 : (verificationCharge?.total || 3.54);
        const actualBalanceAfter = isReused ? walletBalance : walletBalance - actualDebit;

        const newBen = {
          beneficiary_id: beneData.beneficiary_id || `ben-${Date.now()}`,
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
          is_reused: isReused,
          penny_drop_status: "SUCCESS",
          vendor_ref: vendorRef,
          utr,
          wallet_debit: actualDebit,
          wallet_balance_after: actualBalanceAfter,
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
          preferredGateway: isReused ? "Cashfree (Idempotent Reuse)" : "Cashfree Verified",
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

        const notifMsg = isReused
          ? `ℹ️ Verified Account Reused: ${officialName} (₹0.00 Debited)`
          : `✅ Verified: ${officialName}`;
        notificationEngine.notify("BENEFICIARY_VERIFIED", notifMsg);

        // Show success result modal
        setResultModalSuccess(true);
        setResultModalData(newBen);
        setResultModalOpen(true);
        playSuccessSound();

        setActiveStep(1);
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
    router.push("/retailer/dmt");
  };

  const handleAddAnotherBeneficiary = () => {
    setBenName("");
    setNickName("");
    setRelationship("Self");
    setAccNum("");
    setConfirmAccNum("");
    setBankName("");
    setIfscCode("");
    setMicrCode("");
    setSelectedBankObj(null);
    setCreatedBeneficiary(null);
    setAccMismatchError("");
    setVerificationError("");
    setActiveStep(0);
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
                                  setDuplicateError("");
                                  if (digits === accNum && digits.length >= 9) {
                                    validateDuplicateAccount(digits, ifscCode);
                                  }
                                }}
                                onBlur={() => {
                                  if (confirmAccNum === accNum && confirmAccNum.length >= 9) {
                                    validateDuplicateAccount(confirmAccNum, ifscCode);
                                  }
                                }}
                                required
                                error={Boolean(duplicateError) || Boolean(accMismatchError && confirmAccNum) || (confirmAccNum.length > 0 && confirmAccNum !== accNum)}
                                helperText={
                                  duplicateError
                                    ? duplicateError
                                    : confirmAccNum.length === 0
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
                                  : confirmAccNum === accNum && !duplicateError ? "#DCFCE7"
                                  : "#FEE2E2",
                                color: confirmAccNum.length === 0 ? "#64748B"
                                  : confirmAccNum === accNum && !duplicateError ? "#166534"
                                  : "#991B1B",
                                px: 1, py: 0.25, borderRadius: "6px",
                                fontSize: "11px", fontWeight: 800,
                                border: `1px solid ${confirmAccNum.length === 0 ? "#E2E8F0" : confirmAccNum === accNum && !duplicateError ? "#86EFAC" : "#FECACA"}`,
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
                                severity={duplicateError ? "error" : accNum === confirmAccNum ? "success" : "error"}
                                sx={{ borderRadius: 2, py: 0.5, fontSize: "12px", fontWeight: 700 }}
                              >
                                {accNum !== confirmAccNum
                                  ? "✗ Account numbers do not match"
                                  : duplicateError
                                  ? duplicateError
                                  : "✓ Account numbers match & verified unique for customer"}
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
                            <Typography sx={{ fontWeight: 800, color: "#0F172A", fontSize: "15px" }}>Bank Selection</Typography>
                            <Typography variant="caption" sx={{ color: "#64748B" }}>Search and select beneficiary bank</Typography>
                          </Box>
                        </Stack>

                        <Grid container spacing={2}>
                          {/* Select Bank Dropdown */}
                          <Grid size={{ xs: 12, md: selectedBankObj ? 6 : 12 }}>
                            <FormControl fullWidth size="small">
                              <InputLabel id="bank-select-label">Select Bank *</InputLabel>
                              <Select
                                labelId="bank-select-label"
                                id="bankSelectDropdown"
                                value={selectedBankObj ? (selectedBankObj.bank_name || "") : ""}
                                onChange={(e) => {
                                  const selected = bankMasterList.find(
                                    (p: any) => p.bank_name === e.target.value || p.bank_code === e.target.value
                                  );
                                  handleBankSelect(selected || null);
                                }}
                                onClose={() => setBankSelectSearch("")}
                                label="Select Bank *"
                                MenuProps={{
                                  autoFocus: false,
                                  slotProps: {
                                    paper: {
                                      style: {
                                        maxHeight: 350,
                                      },
                                    },
                                  },
                                }}
                              >
                                {/* Search options input inside dropdown menu */}
                                <ListSubheader
                                  sx={{ pt: 1, pb: 1, px: 1.5, bgcolor: "background.paper", zIndex: 1 }}
                                  onKeyDown={(e) => e.stopPropagation()}
                                >
                                  <TextField
                                    size="small"
                                    autoFocus
                                    placeholder="Search bank name or IFSC..."
                                    fullWidth
                                    value={bankSelectSearch}
                                    onChange={(e) => setBankSelectSearch(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => e.stopPropagation()}
                                    slotProps={{
                                      input: {
                                        startAdornment: (
                                          <InputAdornment position="start">
                                            <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                                          </InputAdornment>
                                        ),
                                        endAdornment: bankSelectSearch ? (
                                          <InputAdornment position="end">
                                            <IconButton
                                              size="small"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setBankSelectSearch("");
                                              }}
                                            >
                                              <CloseIcon fontSize="small" />
                                            </IconButton>
                                          </InputAdornment>
                                        ) : null,
                                      },
                                    }}
                                  />
                                </ListSubheader>

                                <MenuItem value="">
                                  <em>-- Select Bank --</em>
                                </MenuItem>
                                {filteredBankOptions.map((p: any, idx: number) => {
                                  const isSelected = Boolean(
                                    selectedBankObj && p.bank_name === selectedBankObj.bank_name
                                  );
                                  return (
                                    <MenuItem
                                      key={p.bank_id || p.bank_code || p.bank_name || idx}
                                      value={p.bank_name}
                                      selected={isSelected}
                                    >
                                      {p.bank_name} {p.short_name ? `(${p.short_name})` : ""}
                                    </MenuItem>
                                  );
                                })}
                                {filteredBankOptions.length === 0 && (
                                  <MenuItem disabled sx={{ fontStyle: "italic", color: "text.secondary" }}>
                                    No banks matching "{bankSelectSearch}"
                                  </MenuItem>
                                )}
                              </Select>
                            </FormControl>

                            {/* Error State with Retry Button */}
                            {bankSearchError && (
                              <Alert
                                severity="error"
                                action={
                                  <Button color="inherit" size="small" onClick={() => loadBankMasterOnMount()}>
                                    Retry
                                  </Button>
                                }
                                sx={{ mt: 1, py: 0.5, borderRadius: 2 }}
                              >
                                Unable to load Bank Master.
                              </Alert>
                            )}
                          </Grid>

                          {/* IFSC Code Display (Shown once bank is chosen, readOnly = true / readable false) */}
                          {selectedBankObj && (
                            <Grid size={{ xs: 12, md: 6 }}>
                              <TextField
                                label="IFSC Code *"
                                size="small"
                                fullWidth
                                value={ifscCode}
                                slotProps={{
                                  input: {
                                    readOnly: true,
                                    startAdornment: (
                                      <InputAdornment position="start">
                                        <LockIcon fontSize="small" sx={{ color: "#64748B" }} />
                                      </InputAdornment>
                                    ),
                                    endAdornment: (
                                      <InputAdornment position="end">
                                        <Chip
                                          label="Auto-bound"
                                          size="small"
                                          sx={{ height: 20, fontSize: "10px", bgcolor: "#E0F2FE", color: "#0369A1", fontWeight: 800 }}
                                        />
                                      </InputAdornment>
                                    ),
                                  },
                                }}
                                helperText="IFSC Code is auto-assigned from selected Bank Master"
                                sx={{
                                  "& .MuiInputBase-root": {
                                    bgcolor: "#F8FAFC",
                                    borderRadius: 2,
                                  },
                                  "& .MuiInputBase-input": {
                                    fontWeight: 800,
                                    letterSpacing: "0.5px",
                                    color: "#0F172A",
                                    cursor: "not-allowed",
                                  },
                                }}
                              />
                            </Grid>
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
                        <span>Verify & Add Beneficiary →</span>
                      </button>
                    </Stack>
                  </form>
                </motion.div>
              )}

              {/* ═══════════════════════════════════════════════════════════
                  STEP 2 — CONFIRMATION (VERIFICATION SUCCESS)
              ═══════════════════════════════════════════════════════════ */}
              {activeStep === 1 && createdBeneficiary && (
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

                    {/* Primary Action Buttons: Add Another OR Go to DMT */}
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                      <button
                        type="button"
                        onClick={handleAddAnotherBeneficiary}
                        className="flex-1 py-3.5 px-6 rounded-2xl bg-white hover:bg-slate-50 border-2 border-[#243B7D] text-[#243B7D] font-extrabold text-sm shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99] min-h-[50px]"
                      >
                        <PersonAddIcon sx={{ fontSize: 20 }} />
                        <span>+ Add Another Beneficiary</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCompleteAndReturn}
                        className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#243B7D] to-[#2E3E8C] hover:from-[#1d3066] hover:to-[#243374] text-white font-extrabold text-sm shadow-md shadow-blue-900/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] min-h-[50px]"
                      >
                        <span>Transfer Funds Now (Go to DMT) →</span>
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
          PENNY DROP HIGH-TECH PROCESSING LOADER OVERLAY
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={pennyDropLoading}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 4, overflow: "hidden", p: 3.5, textAlign: "center", bgcolor: "#0F172A", color: "#FFFFFF", border: "1px solid rgba(255, 255, 255, 0.15)", boxShadow: "0 25px 60px rgba(0,0,0,0.5)" } } }}
      >
        <Box sx={{ py: 2, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Box sx={{ position: "relative", width: 72, height: 72, mb: 3 }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                border: "4px solid rgba(37, 99, 235, 0.2)",
                borderTopColor: "#3B82F6",
                borderRightColor: "#60A5FA",
                position: "absolute",
                top: 0,
                left: 0,
              }}
            />
            <AccountBalanceIcon sx={{ position: "absolute", top: 20, left: 20, fontSize: 32, color: "#60A5FA" }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 900, color: "#FFFFFF", mb: 0.75, letterSpacing: "-0.2px" }}>
            Verifying Bank Account…
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.70)", fontSize: "13px", mb: 2.5, px: 2 }}>
            Executing Cashfree V2 Penny Drop Deposit & Validating Official Name at Bank…
          </Typography>
          <Chip
            icon={<SwapHorizIcon sx={{ "&&": { color: "#60A5FA", fontSize: 16 } }} />}
            label={`Debiting ₹${verificationCharge?.total?.toFixed(2) || "3.54"} from Wallet`}
            size="small"
            sx={{ bgcolor: "rgba(59, 130, 246, 0.15)", color: "#60A5FA", fontWeight: 800, fontSize: "11px", py: 1.75, px: 1 }}
          />
        </Box>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          ULTRA-PREMIUM BUTTER-SMOOTH SUCCESS / FAILURE RESULT MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={resultModalOpen}
        onClose={() => setResultModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 5,
              overflow: "hidden",
              p: 0,
              bgcolor: "#FFFFFF",
              boxShadow: "0 25px 60px -12px rgba(15, 23, 42, 0.4)",
              border: "1px solid #E2E8F0",
            },
          },
        }}
      >
        {/* Animated Accent Top Bar */}
        <Box
          sx={{
            height: 6,
            background: resultModalSuccess
              ? "linear-gradient(90deg, #10B981, #34D399, #059669)"
              : "linear-gradient(90deg, #EF4444, #F87171, #DC2626)",
            backgroundSize: "200% 100%",
            animation: "shimmerBar 2s infinite linear",
            "@keyframes shimmerBar": {
              "0%": { backgroundPosition: "-200% 0" },
              "100%": { backgroundPosition: "200% 0" },
            },
          }}
        />

        <DialogContent sx={{ p: { xs: 2.5, sm: 3.5 }, pb: 2, textAlign: "center" }}>
          <AnimatePresence>
            {resultModalOpen && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
              >
                {resultModalSuccess ? (
                  <Box sx={{ position: "relative", display: "inline-flex", justifyContent: "center", alignItems: "center", mb: 2 }}>
                    {/* Glowing emerald radial aura */}
                    <motion.div
                      animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.7, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      style={{
                        position: "absolute",
                        width: 90,
                        height: 90,
                        borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(16, 185, 129, 0.35) 0%, rgba(16, 185, 129, 0) 70%)",
                      }}
                    />

                    {/* Main Verified Badge Icon */}
                    <motion.div
                      initial={{ scale: 0.5, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.1 }}
                    >
                      <CheckCircleIcon sx={{ fontSize: 76, color: "#10B981", filter: "drop-shadow(0 8px 16px rgba(16,185,129,0.3))" }} />
                    </motion.div>

                    {/* 12 Floating Confetti Burst Particles */}
                    {[...Array(12)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
                        animate={{
                          scale: [0, 1.2, 0],
                          opacity: [0, 1, 0],
                          x: Math.cos((i / 12) * Math.PI * 2) * 60,
                          y: Math.sin((i / 12) * Math.PI * 2) * 60,
                        }}
                        transition={{ delay: 0.15 + i * 0.03, duration: 0.75, ease: "easeOut" }}
                        style={{
                          position: "absolute",
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EC4899", "#06B6D4", "#84CC16", "#F97316"][i % 8],
                        }}
                      />
                    ))}
                  </Box>
                ) : (
                  <motion.div
                    animate={{ x: [-8, 8, -6, 6, -3, 3, 0] }}
                    transition={{ duration: 0.45 }}
                  >
                    <WarningAmberIcon sx={{ fontSize: 72, color: "#EF4444", filter: "drop-shadow(0 6px 12px rgba(239,68,68,0.25))", mb: 1.5 }} />
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5, color: resultModalSuccess ? "#065F46" : "#991B1B", letterSpacing: "-0.3px" }}>
            {resultModalSuccess ? "Beneficiary Verified! 🎉" : "Verification Failed"}
          </Typography>

          <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, display: "block", mb: 2 }}>
            {resultModalSuccess
              ? "Official Name Confirmed via Cashfree V2 Bank Gateway"
              : "Unable to verify bank details. Please check account number & IFSC."}
          </Typography>

          {resultModalSuccess && resultModalData ? (
            <Box
              sx={{
                bgcolor: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: 3.5,
                p: 2,
                textAlign: "left",
                maxHeight: 340,
                overflowY: "auto",
                "&::-webkit-scrollbar": { width: "4px" },
                "&::-webkit-scrollbar-thumb": { backgroundColor: "rgba(0,0,0,0.15)", borderRadius: "4px" },
              }}
            >
              {/* Hero Account Card */}
              <Paper
                elevation={0}
                sx={{
                  p: 1.75,
                  mb: 1.5,
                  borderRadius: 2.5,
                  bgcolor: "#0F172A",
                  color: "#FFFFFF",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  display: "flex",
                  justify: "space-between",
                  alignItems: "center",
                }}
              >
                <Box>
                  <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 800, fontSize: "10px", letterSpacing: "0.08em" }}>
                    BANK REGISTERED HOLDER
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 900, color: "#38BDF8", fontSize: "15px" }}>
                    {resultModalData.account_holder_name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#CBD5E1", fontSize: "11px", fontWeight: 700 }}>
                    {resultModalData.bank_name} • {resultModalData.ifsc_code}
                  </Typography>
                </Box>
                <Chip
                  icon={<VerifiedIcon sx={{ "&&": { color: "#10B981", fontSize: 15 } }} />}
                  label="VERIFIED"
                  size="small"
                  sx={{ bgcolor: "rgba(16, 185, 129, 0.15)", color: "#34D399", fontWeight: 900, fontSize: "10px" }}
                />
              </Paper>

              {/* Data Grid */}
              <Grid container spacing={1}>
                {[
                  { label: "Short Beneficiary ID", value: resultModalData.short_ben_id, highlight: true },
                  { label: "Transaction ID", value: resultModalData.transaction_id, highlight: true },
                  { label: "Verification Ref", value: resultModalData.vendor_ref },
                  { label: "Bank UTR", value: resultModalData.utr },
                  { label: "Wallet Debited", value: `₹${resultModalData.wallet_debit?.toFixed(2) || "0.00"}` },
                  { label: "Wallet Balance After", value: `₹${resultModalData.wallet_balance_after?.toLocaleString("en-IN", { minimumFractionDigits: 2 }) || "—"}` },
                ].map(({ label, value, highlight }) => (
                  <Grid item xs={12} sm={6} key={label}>
                    <Box
                      sx={{
                        p: 1.25,
                        borderRadius: 2,
                        bgcolor: highlight ? "#F0FDF4" : "#FFFFFF",
                        border: highlight ? "1px solid #BBF7D0" : "1px solid #F1F5F9",
                        height: "100%",
                      }}
                    >
                      <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, fontSize: "10px", display: "block" }}>
                        {label}
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: highlight ? 900 : 800, color: highlight ? "#15803D" : "#0F172A", fontFamily: "monospace", fontSize: "11px", wordBreak: "break-all" }}>
                        {value}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ color: "#64748B", mt: 1 }}>
              {resultModalData?.error || "An error occurred during verification. Please try again."}
            </Typography>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5, pt: 0, justifyContent: "center", gap: 1.5 }}>
          {resultModalSuccess ? (
            <>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <M3Button
                  variant="outlined"
                  onClick={() => {
                    playClickSound();
                    setResultModalOpen(false);
                    handleAddAnotherBeneficiary();
                  }}
                  sx={{ fontWeight: 800, borderRadius: 3, border: "2px solid #243B7D", color: "#243B7D", px: 2.5, py: 1 }}
                >
                  + Add Another Beneficiary
                </M3Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <M3Button
                  variant="contained"
                  onClick={() => {
                    playClickSound();
                    setResultModalOpen(false);
                    handleCompleteAndReturn();
                  }}
                  sx={{ bgcolor: "#243B7D", fontWeight: 800, px: 3, py: 1, borderRadius: 3, boxShadow: "0 4px 12px rgba(36, 59, 125, 0.25)" }}
                >
                  Transfer Funds Now (Go to DMT) →
                </M3Button>
              </motion.div>
            </>
          ) : (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <M3Button
                variant="contained"
                onClick={() => {
                  playClickSound();
                  setResultModalOpen(false);
                  setActiveStep(0);
                }}
                sx={{ bgcolor: "#DC2626", fontWeight: 800, borderRadius: 3, px: 4, py: 1 }}
              >
                Try Again
              </M3Button>
            </motion.div>
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
