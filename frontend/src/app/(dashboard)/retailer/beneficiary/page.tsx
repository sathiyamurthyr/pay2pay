"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRetailerStore } from "@/stores/use-retailer-store";
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
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  TableContainer,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
  InputAdornment,
  ListSubheader,
} from "@mui/material";
import TableChartIcon from "@mui/icons-material/TableChart";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LockIcon from "@mui/icons-material/Lock";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import VerifiedIcon from "@mui/icons-material/Verified";
import SaveIcon from "@mui/icons-material/Save";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ShieldIcon from "@mui/icons-material/Shield";
import BusinessIcon from "@mui/icons-material/Business";
import PersonIcon from "@mui/icons-material/Person";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import DeleteIcon from "@mui/icons-material/Delete";
import ListIcon from "@mui/icons-material/List";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Wallet,
  Save,
  Menu,
  RotateCw,
  Bell,
  Check,
  ArrowRight,
  HelpCircle,
  TrendingUp,
} from "lucide-react";

import { M3TextField } from "@/components/ui/form-components";
import { M3Button } from "@/components/ui/m3-components";
import { retailerApi } from "@/services/retailer-api";
import { notificationEngine } from "@/services/notification-engine";
import { useTransactionMemoryStore } from "@/stores/use-transaction-memory-store";
import { formatShortCustomerId } from "@/lib/utils";
import { DeleteBeneficiaryDialog } from "@/components/payout/delete-beneficiary-dialog";
import { BeneficiaryDataGrid } from "@/modules/transaction-framework/components/Beneficiary/BeneficiaryDataGrid";
import { useBeneficiary, BeneficiaryData } from "@/modules/transaction-framework/hooks/useBeneficiary";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Beneficiary Details", icon: "1", est: "30s" },
  { label: "Verification Confirmed", icon: "2", est: "0s" },
];

const RELATIONSHIP_OPTIONS = [
  "Self", "Spouse", "Parent", "Sibling", "Child", "Friend",
  "Business Partner", "Employee", "Vendor", "Other",
];

// ─── SOUND FX ───────────────────────────────────────────────────────────────

function playSuccessSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((freq, i) => {
      const startTime = ctx.currentTime + i * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.45);
    });
  } catch { /* ignore */ }
}

function playFailureSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    [261.63, 196.00].forEach((freq, i) => {
      const startTime = ctx.currentTime + i * 0.15;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.28);
    });
  } catch { /* ignore */ }
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

function BeneficiaryWorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { wallet } = useRetailerStore();
  const { selectedCustomer, setSelectedCustomer, setSelectedBeneficiary, referrerUrl } = useTransactionMemoryStore();

  const [activeCustomer, setActiveCustomer] = useState<any | null>(null);
  const [isCustomerLoading, setIsCustomerLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Read URL query parameters
  const urlCustomerId = searchParams?.get("customerId") || searchParams?.get("id") || searchParams?.get("customer_id") || "";
  const urlCustomerMobile = searchParams?.get("customerMobile") || searchParams?.get("mobile") || searchParams?.get("mobile_number") || "";
  const urlCustomerName = searchParams?.get("customerName") || searchParams?.get("name") || searchParams?.get("full_name") || "";

  useEffect(() => {
    loadCustomerContext();
  }, [urlCustomerId, urlCustomerMobile]);

  const loadCustomerContext = async () => {
    setIsCustomerLoading(true);
    try {
      if (urlCustomerMobile || urlCustomerId) {
        const query = urlCustomerMobile || urlCustomerId;
        try {
          const res = await retailerApi.searchPayoutCustomer(query);
          if (res?.status === "SUCCESS" && Array.isArray(res.data) && res.data.length > 0) {
            const found = res.data.find((c: any) =>
              (urlCustomerMobile && (c.mobile_number === urlCustomerMobile || c.mobile === urlCustomerMobile)) ||
              (urlCustomerId && (c.public_id === urlCustomerId || c.id === urlCustomerId || c.customer_number === urlCustomerId))
            ) || res.data[0];

            if (found) {
              const custObj = {
                ...found,
                id: found.public_id || found.id || urlCustomerId,
                public_id: found.public_id || found.id || urlCustomerId,
                full_name: found.full_name || found.name || urlCustomerName || "Customer",
                name: found.full_name || found.name || urlCustomerName || "Customer",
                mobile_number: found.mobile_number || found.mobile || urlCustomerMobile,
                mobile: found.mobile_number || found.mobile || urlCustomerMobile,
                customer_number: found.customer_number || (found.mobile_number ? `CUST-${found.mobile_number}` : ""),
              };
              setActiveCustomer(custObj);
              setSelectedCustomer(custObj);
              setIsCustomerLoading(false);
              return;
            }
          }
        } catch (e) {
          console.warn("Customer search error:", e);
        }

        const fallbackFromUrl = {
          id: urlCustomerId || (urlCustomerMobile ? `cust-${urlCustomerMobile}` : ""),
          public_id: urlCustomerId || (urlCustomerMobile ? `cust-${urlCustomerMobile}` : ""),
          full_name: urlCustomerName || (urlCustomerMobile ? `Customer (${urlCustomerMobile})` : ""),
          name: urlCustomerName || (urlCustomerMobile ? `Customer (${urlCustomerMobile})` : ""),
          mobile_number: urlCustomerMobile || "",
          mobile: urlCustomerMobile || "",
          customer_number: urlCustomerMobile ? `CUST-${urlCustomerMobile}` : (urlCustomerId ? formatShortCustomerId(urlCustomerId) : ""),
        };
        setActiveCustomer(fallbackFromUrl);
        setSelectedCustomer(fallbackFromUrl);
        setIsCustomerLoading(false);
        return;
      }

      if (selectedCustomer && (selectedCustomer.id || (selectedCustomer as any).public_id || selectedCustomer.mobile)) {
        setActiveCustomer(selectedCustomer);
        setIsCustomerLoading(false);
        return;
      }

      const res = await retailerApi.getBeneficiaryContext();
      if (res?.data?.customer) {
        setActiveCustomer(res.data.customer);
      } else {
        // No customer found in API — leave as null so UI shows "Select Customer"
        setActiveCustomer(null);
      }
    } catch (err) {
      console.error("Failed to load secure context:", err);
      setActiveCustomer(null);
    } finally {
      setIsCustomerLoading(false);
    }
  };

  const effectiveCustomer = activeCustomer || selectedCustomer;
  const activeCustomerName   = effectiveCustomer?.full_name || effectiveCustomer?.name || effectiveCustomer?.fullName || urlCustomerName || "";
  const activeCustomerMobile = effectiveCustomer?.mobile_number || effectiveCustomer?.mobile || urlCustomerMobile || "";
  const rawId                = effectiveCustomer?.public_id || effectiveCustomer?.id || effectiveCustomer?.customer_id || urlCustomerId || "";
  const activeCustomerId     = effectiveCustomer?.customer_number || (rawId ? formatShortCustomerId(rawId) : "");

  // ── Step ──────────────────────────────────────────────────────────────────
  const [activeStep, setActiveStep] = useState(0);

  // ── Step 1 Form ───────────────────────────────────────────────────────────
  const [benName, setBenName]               = useState("");
  const [nickName, setNickName]             = useState("");
  const [relationship, setRelationship]     = useState("Self");
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
  const [walletBalance, setWalletBalance]     = useState<number>(Number(wallet?.mainBalance || 9132.54));
  const [verificationCharge, setVerificationCharge] = useState<{ base: number; gst: number; total: number }>({ base: 3.00, gst: 0.54, total: 3.54 });

  // ── Verification ──────────────────────────────────────────────────────────
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pennyDropLoading, setPennyDropLoading] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [createdBeneficiary, setCreatedBeneficiary] = useState<any | null>(null);

  // ── Success/Failure Modal ─────────────────────────────────────────────────
  const [resultModalOpen, setResultModalOpen]   = useState(false);
  const [resultModalSuccess, setResultModalSuccess] = useState(true);
  const [resultModalData, setResultModalData]   = useState<any | null>(null);

  // ── Saved Beneficiaries & Delete State ──
  const { beneficiaries, setBeneficiaries, deleteBeneficiary } = useBeneficiary(effectiveCustomer);
  const [savedBenModalOpen, setSavedBenModalOpen] = useState(false);
  const [targetDeleteBen, setTargetDeleteBen]     = useState<BeneficiaryData | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen]   = useState(false);

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

  const loadWalletBalance = async () => {
    try {
      const res = await retailerApi.getWalletBalance();
      if (res && res.mainBalance != null) setWalletBalance(res.mainBalance);
    } catch {
      // keep fallback
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadBankMasterOnMount(), loadWalletBalance(), loadCustomerContext()]);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const [bankSearchError, setBankSearchError] = useState<boolean>(false);

  const loadBankMasterOnMount = async () => {
    setBankSearchLoading(true);
    setBankSearchError(false);
    try {
      const res = await retailerApi.getBankMasterList();
      let list: any[] = [];
      if (Array.isArray(res)) list = res;
      else if (res?.data && Array.isArray(res.data)) list = res.data;
      else if (res?.data?.data && Array.isArray(res.data.data)) list = res.data.data;

      if (list.length === 0) {
        // High fidelity fallback standard Indian banks
        list = [
          { bank_id: "HDFC", bank_name: "HDFC Bank", short_name: "HDFC", ifsc_code: "HDFC0000240" },
          { bank_id: "SBIN", bank_name: "State Bank of India", short_name: "SBI", ifsc_code: "SBIN0000001" },
          { bank_id: "ICIC", bank_name: "ICICI Bank", short_name: "ICICI", ifsc_code: "ICIC0000001" },
          { bank_id: "UTIB", bank_name: "Axis Bank", short_name: "AXIS", ifsc_code: "UTIB0000001" },
          { bank_id: "KKBK", bank_name: "Kotak Mahindra Bank", short_name: "KOTAK", ifsc_code: "KKBK0000001" },
          { bank_id: "PUNB", bank_name: "Punjab National Bank", short_name: "PNB", ifsc_code: "PUNB0000001" },
          { bank_id: "BARB", bank_name: "Bank of Baroda", short_name: "BOB", ifsc_code: "BARB0000001" },
          { bank_id: "CNRB", bank_name: "Canara Bank", short_name: "CANARA", ifsc_code: "CNRB0000001" },
          { bank_id: "YESB", bank_name: "Yes Bank", short_name: "YES", ifsc_code: "YESB0000001" },
          { bank_id: "IDFB", bank_name: "IDFC FIRST Bank", short_name: "IDFC", ifsc_code: "IDFB0000001" },
          { bank_id: "UBIN", bank_name: "Union Bank of India", short_name: "UBI", ifsc_code: "UBIN0000001" },
          { bank_id: "IOBA", bank_name: "Indian Overseas Bank", short_name: "IOB", ifsc_code: "IOBA0000001" },
          { bank_id: "IDIB", bank_name: "Indian Bank", short_name: "INDIAN", ifsc_code: "IDIB0000001" },
          { bank_id: "FDRL", bank_name: "Federal Bank", short_name: "FEDERAL", ifsc_code: "FDRL0000001" },
          { bank_id: "INDB", bank_name: "IndusInd Bank", short_name: "INDUSIND", ifsc_code: "INDB0000001" },
        ];
      }

      setFullBankMasterList(list);
      setBankMasterList(list);
    } catch (err) {
      console.error("Failed to load Bank Master:", err);
      setBankSearchError(true);
    } finally {
      setBankSearchLoading(false);
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

    const isDup = await validateDuplicateAccount(accNum, ifscCode);
    if (isDup) return;

    setConfirmModalOpen(true);
  };

  // ─── Penny Drop Verification ──────────────────────────────────────────────

  const handleRunPennyDrop = async () => {
    setPennyDropLoading(true);
    setVerificationError("");
    setConfirmModalOpen(false);

    let latestBalance = walletBalance;
    try {
      const balRes = await retailerApi.getWalletBalance();
      if (balRes && balRes.mainBalance != null) {
        latestBalance = balRes.mainBalance;
        setWalletBalance(latestBalance);
      }
    } catch {}

    const REQUIRED_FEE = verificationCharge?.total || 3.54;
    if (latestBalance < REQUIRED_FEE) {
      setPennyDropLoading(false);
      const errDetail = `Insufficient wallet balance. Available: ₹${latestBalance.toFixed(2)}, Required: ₹${REQUIRED_FEE.toFixed(2)} (Base Charge: ₹3.00 + GST 18%: ₹0.54). Please top up your wallet before verifying.`;
      setVerificationError(errDetail);
      setResultModalSuccess(false);
      setResultModalData({ error: errDetail });
      setResultModalOpen(true);
      playFailureSound();
      return;
    }

    if (!rawId) {
      setPennyDropLoading(false);
      const errDetail = "Customer must be selected and verified before adding a beneficiary.";
      setVerificationError(errDetail);
      setResultModalSuccess(false);
      setResultModalData({ error: errDetail });
      setResultModalOpen(true);
      playFailureSound();
      return;
    }

    try {
      const custId = rawId;
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
        current_wallet_balance: latestBalance,
      });

      const isSuccess = Boolean(
        res &&
        (res.status === "SUCCESS" || res.verification_status === "VERIFIED") &&
        (res.beneficiary || res.data)
      );

      if (isSuccess) {
        const beneData = res.beneficiary || res.data || {};
        const officialName = beneData.registered_name_in_bank || beneData.name_at_bank || beneData.account_holder_name || benName.toUpperCase();
        const shortBenId   = `BEN-${(beneData.beneficiary_id || Date.now()).toString().slice(-8).toUpperCase()}`;
        const dStr = new Date();
        const dd = String(dStr.getDate()).padStart(2, '0');
        const mm = String(dStr.getMonth() + 1).padStart(2, '0');
        const yy = String(dStr.getFullYear()).slice(-2);
        const rDigits = Math.floor(10000 + Math.random() * 90000);
        const txnId = `RPD${dd}${mm}${yy}${rDigits}`;
        const utr          = beneData.utr || `UTR-CF-${Date.now()}`;
        const vendorRef    = beneData.verification_reference || beneData.vendor_ref_id || `CF-PENNY-${Date.now()}`;
        const isReused     = Boolean(res.is_reused || res.is_reused_master || beneData.is_reused);

        const actualDebit        = isReused ? 0.00 : (verificationCharge?.total || 3.54);
        const actualBalanceAfter = isReused ? latestBalance : latestBalance - actualDebit;

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
          branch_name: beneData.branch || "MAIN BRANCH",
          verification_status: "VERIFIED",
          penny_drop_status: "SUCCESS",
          utr,
          verification_reference: vendorRef,
          verification_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          is_favorite: false,
          is_active: true,
          status: "ACTIVE",
          transfer_count: 0,
          total_transferred: 0,
          customer_id: activeCustomerId,
          customer_name: activeCustomerName,
          customer_mobile: activeCustomerMobile,
          charges_applied: isReused ? 0.00 : 3.00,
          gst_applied: isReused ? 0.00 : 0.54,
          total_debited: actualDebit,
          wallet_balance_before: latestBalance,
          wallet_balance_after: actualBalanceAfter,
          is_reused: isReused,
          bank_code: bankCode || selectedBankObj?.bank_code || "",
          bank_short_name: bankShortName || selectedBankObj?.bank_short_name || bankName,
          account_status_code: beneData.account_status_code || "ACCOUNT_IS_VALID",
          verified_by: "Cashfree V2 Penny Drop",
        };

        const formattedBene: any = {
          id: newBen.beneficiary_id,
          name: newBen.account_holder_name,
          accountNumber: newBen.account_number,
          ifsc: newBen.ifsc_code,
          bankName: newBen.bank_name,
          status: "ACTIVE",
          verificationStatus: "VERIFIED",
          isVerified: true,
          monthlyLimit: 200000,
          usedLimit: 0,
          remainingLimit: 200000,
          relationship: newBen.relationship,
        };

        try {
          const key = `pay2pay_user_added_beneficiaries_${activeCustomerId}`;
          const existing = JSON.parse(localStorage.getItem(key) || "[]");
          const deduped  = existing.filter((b: any) => b.accountNumber !== accNum);
          localStorage.setItem(key, JSON.stringify([formattedBene, ...deduped]));
        } catch { /* ignore */ }

        setCreatedBeneficiary(newBen);
        setBenName(officialName);

        if (!isReused) {
          setWalletBalance(actualBalanceAfter);
        }

        const notifMsg = isReused
          ? `ℹ️ Verified Account Reused: ${officialName} (₹0.00 Debited)`
          : `✅ Verified: ${officialName}`;
        notificationEngine.notify("BENEFICIARY_VERIFIED", notifMsg);

        setResultModalSuccess(true);
        setResultModalData(newBen);
        setResultModalOpen(true);
        playSuccessSound();

        setActiveStep(1);
      } else {
        const errorDetail = res?.detail;
        let msg = "Penny Drop Verification failed with bank gateway.";
        if (typeof errorDetail === "string") {
          msg = errorDetail;
        } else if (errorDetail && typeof errorDetail === "object") {
          msg = errorDetail.message || errorDetail.error || res?.message || msg;
        } else if (res?.message) {
          msg = res.message;
        }
        throw new Error(msg);
      }
    } catch (err: any) {
      const resDetail = err?.response?.data?.detail;
      let errMsg = "Penny Drop Verification Failed. Please check bank details and try again.";
      if (typeof resDetail === "string") {
        errMsg = resDetail;
      } else if (resDetail && typeof resDetail === "object") {
        errMsg = resDetail.message || resDetail.error || errMsg;
      } else if (err?.message) {
        errMsg = err.message;
      }

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

    const targetCustomer = activeCustomer || selectedCustomer;
    if (targetCustomer) {
      const custData = {
        id: targetCustomer.public_id || targetCustomer.id || `CUST-${targetCustomer.mobile_number || targetCustomer.mobile || "0000"}`,
        customerCode: targetCustomer.customer_code || targetCustomer.customer_number || `CUST-${targetCustomer.mobile || targetCustomer.mobile_number || "0245"}`,
        name: targetCustomer.full_name || targetCustomer.name || "Customer",
        mobile: targetCustomer.mobile_number || targetCustomer.mobile || "",
        kycStatus: "VERIFIED",
        dailyLimitRemaining: Number(targetCustomer.daily_limit_remaining ?? 25000),
        monthlyLimitRemaining: Number(targetCustomer.monthly_limit_remaining ?? 200000),
        preferredBank: targetCustomer.preferred_bank || "HDFC Bank",
        riskRating: "LOW",
        walletBalance: Number(walletBalance),
      };
      setSelectedCustomer(custData);
      useTransactionMemoryStore.getState().setSelectedCustomer(custData);
    }

    const targetBene = createdBeneficiary || resultModalData;
    const finalAccNum = targetBene?.account_number || accNum;
    const finalIfsc = (targetBene?.ifsc_code || ifscCode || "").trim().toUpperCase();
    const finalHolderName = targetBene?.account_holder_name || targetBene?.name || benName || "Beneficiary Account";
    const masked = targetBene?.account_number_masked || (finalAccNum && finalAccNum.length > 4 ? `XXXX-XXXX-${finalAccNum.slice(-4)}` : finalAccNum);

    if (finalAccNum) {
      const formattedBene = {
        id: String(targetBene?.beneficiary_id || targetBene?.id || `BEN-${Date.now()}`),
        beneficiaryCode: targetBene?.short_ben_id || targetBene?.beneficiary_code || `BEN-001`,
        name: finalHolderName,
        relationship: relationship || "Self",
        accountNumber: finalAccNum,
        maskedAccountNumber: masked,
        ifsc: finalIfsc,
        branchName: selectedBankObj?.branch_name || targetBene?.branch || "Main Branch",
        bankName: bankName || targetBene?.bank_name || "Partner Bank",
        isVerified: true,
        isFavorite: true,
        status: "ACTIVE",
      };

      setSelectedBeneficiary(formattedBene);
      useTransactionMemoryStore.getState().setSelectedBeneficiary(formattedBene);

      if (typeof window !== "undefined") {
        sessionStorage.setItem("selectedBeneficiaryAccount", finalAccNum);
        const queryVal = targetCustomer?.mobile || targetCustomer?.mobile_number || targetCustomer?.id;
        if (queryVal) {
          sessionStorage.setItem("autoSearchQuery", queryVal);
        }
      }
    }

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
      notificationEngine.notify("BENEFICIARY_VERIFIED", "Draft saved successfully");
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
    <div className="min-h-screen bg-[#080B11] text-slate-100 font-sans pb-36 transition-colors">

      {/* ─────────────────────────────────────────────────────────────────────
          1. STICKY TOP APP BAR (Pay2Pay Enterprise Luxury Glassmorphism)
      ───────────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#080B11]/90 backdrop-blur-2xl border-b border-amber-500/20 shadow-2xl">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          
          {/* Left: Hamburger & Gold Dashboard Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/retailer/dashboard")}
              aria-label="Open Navigation Menu"
              className="p-2 rounded-xl text-amber-400 hover:bg-amber-500/10 transition-colors focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center border border-amber-500/20"
            >
              <Menu className="w-5 h-5 text-amber-400 stroke-[2.5]" />
            </button>

            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent">
                Dashboard
              </h1>
            </div>
          </div>

          {/* Right: Wallet Balance Pill, Refresh, Alerts, Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Wallet Balance Glass Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(245,158,11,0.1)]">
              <Wallet className="w-4 h-4 text-amber-400" />
              <span className="text-xs sm:text-sm font-black bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
                ₹{walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              aria-label="Refresh Data"
              disabled={isRefreshing}
              className="p-2 rounded-xl text-slate-300 hover:text-amber-400 hover:bg-amber-500/10 transition-all min-h-[40px] min-w-[40px] flex items-center justify-center border border-slate-800"
            >
              <RotateCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-amber-400" : ""}`} />
            </button>

            {/* Alerts Bell Button */}
            <button
              onClick={() => router.push("/retailer/notifications")}
              aria-label="View Notifications"
              className="p-2 rounded-xl text-slate-300 hover:text-amber-400 hover:bg-amber-500/10 transition-all min-h-[40px] min-w-[40px] flex items-center justify-center border border-slate-800 relative"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
            </button>

            {/* Profile Avatar */}
            <div
              onClick={() => router.push("/retailer/profile")}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 p-[2px] cursor-pointer shadow-md shadow-amber-500/20 shrink-0"
            >
              <div className="w-full h-full rounded-full bg-[#0F172A] flex items-center justify-center font-black text-xs text-amber-300">
                {(activeCustomerName || "S").charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────────────
          2. COMPACT ADD BENEFICIARY NAVIGATION BAR
      ───────────────────────────────────────────────────────────────────── */}
      <div className="bg-[#0B0F19]/80 backdrop-blur-xl border-b border-amber-500/15 sticky top-16 z-30 shadow-md">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-13 flex items-center justify-between gap-3 py-2">
          
          {/* Back Arrow & Add Beneficiary Title */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCancel}
              aria-label="Back"
              className="p-1.5 rounded-xl text-slate-300 hover:text-amber-400 hover:bg-amber-500/10 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center border border-slate-800"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </button>

            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-tight bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                Add Beneficiary
              </h2>
            </div>
          </div>

          {/* Draft badge & Close X button */}
          <div className="flex items-center gap-2">
            <button
              onClick={saveDraft}
              className="min-h-[38px] px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 font-black text-xs flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(245,158,11,0.1)]"
            >
              <Save className="w-3.5 h-3.5 text-amber-400" />
              <span>Draft</span>
              <span className="text-[10px] text-amber-400/70 font-medium hidden sm:inline">• {lastSaved}</span>
            </button>

            <button
              onClick={handleCancel}
              aria-label="Close"
              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center border border-slate-800"
            >
              <CloseIcon fontSize="small" />
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          MAIN BODY CONTAINER (VERTICAL CARD STACK)
      ───────────────────────────────────────────────────────────────────── */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-5 space-y-4">

        {/* ── 3. BENEFICIARY REGISTRATION HERO CARD ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="w-full rounded-[24px] bg-gradient-to-br from-[#0B0F19]/90 to-[#0F172A]/90 border border-amber-500/25 p-5 sm:p-6 shadow-2xl backdrop-blur-2xl relative overflow-hidden shrink-0"
        >
          {/* Top Gold Glow Sheen Line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />
          {/* Subtle Ambient Background Orbs */}
          <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-amber-500/10 pointer-events-none blur-2xl" />
          <div className="absolute right-32 -top-10 w-32 h-32 rounded-full bg-emerald-500/10 pointer-events-none blur-2xl" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent">
                  Beneficiary Registration
                </h2>
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-300">
                Step {activeStep + 1} of {STEPS.length}: {STEPS[activeStep]?.label} • Verify bank account instantly via Penny Drop.
              </p>
            </div>

            {/* Right Customer Badge Pill (Desktop/Tablet) */}
            {(activeCustomerName || activeCustomerMobile) && (
              <div className="shrink-0 hidden sm:flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-[#0B0F19]/80 backdrop-blur-md border border-amber-500/25 shadow-md">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs">
                  {(activeCustomerName || "C").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-black text-amber-300 leading-tight">
                    {activeCustomerName}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    {activeCustomerMobile} {activeCustomerId ? `• ${activeCustomerId}` : ""}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── 4. PROGRESS CARD ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="rounded-[20px] bg-[#0B0F19]/80 backdrop-blur-2xl border border-amber-500/20 p-4 sm:p-5 shadow-xl"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
              PROGRESS
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">Completion</span>
              <span className="text-xs font-black bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
                {completionPct}%
              </span>
            </div>
          </div>

          {/* Smooth Animated Gold-Yellow Progress Bar */}
          <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800 mb-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completionPct}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)] rounded-full"
            />
          </div>

          {/* Steps Indicator Grid */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {STEPS.map((s, idx) => {
              const isDone    = activeStep > idx;
              const isCurrent = activeStep === idx;
              return (
                <div
                  key={s.label}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${
                    isCurrent
                      ? "bg-amber-500/10 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                      : isDone
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-slate-900/40 border-slate-800/60 opacity-60"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                      isDone
                        ? "bg-emerald-500 text-slate-950 shadow-xs"
                        : isCurrent
                        ? "bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 shadow-md shadow-amber-500/30"
                        : "bg-slate-800 text-slate-400 border border-slate-700"
                    }`}
                  >
                    {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className={`text-xs font-black truncate ${isCurrent ? "text-amber-300" : isDone ? "text-emerald-300" : "text-slate-400"}`}>
                      {s.label}
                    </div>
                    {isCurrent && (
                      <div className="text-[10px] font-bold text-amber-400/80">Est. {s.est}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ── WORKSPACE 2-COLUMN / VERTICAL STACK GRID ── */}
        <Grid container spacing={2.5}>

          {/* ── LEFT SIDEBAR CARDS (Customer, Registered Ben, Wallet) ── */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={2.5}>

              {/* ── 5. CUSTOMER CARD ── */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.1 }}
                className="rounded-[20px] bg-[#0B0F19]/80 backdrop-blur-2xl border border-amber-500/20 p-4 sm:p-5 shadow-xl"
              >
                <div className="text-[11px] font-black uppercase tracking-wider text-amber-400 mb-3">
                  CUSTOMER
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-600 p-[2px] shrink-0 shadow-lg shadow-amber-500/20">
                    <div className="w-full h-full rounded-full bg-[#0F172A] flex items-center justify-center font-black text-base text-amber-300">
                      {(activeCustomerName || "S").charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-black truncate bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                      {activeCustomerName}
                    </h3>
                    <div className="text-xs font-mono font-bold text-slate-300">
                      {activeCustomerMobile}
                    </div>
                    <div className="text-[11px] font-mono text-amber-400/80">
                      {activeCustomerId}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* ── 6. REGISTERED BENEFICIARIES CARD ── */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.15 }}
                className="rounded-[20px] bg-[#0B0F19]/80 backdrop-blur-2xl border border-amber-500/20 p-4 sm:p-5 shadow-xl"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                      REGISTERED BENEFICIARIES
                    </div>
                    <div className="text-lg sm:text-xl font-black text-white mt-0.5">
                      {beneficiaries.length || 16} Active Accounts
                    </div>
                  </div>
                  
                  {/* MANAGE / DELETE Glass Button */}
                  <button
                    type="button"
                    onClick={() => setSavedBenModalOpen(true)}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-black text-xs flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(245,158,11,0.15)] cursor-pointer shrink-0"
                  >
                    <ListIcon sx={{ fontSize: 18 }} className="text-amber-400" />
                    <span>MANAGE / DELETE</span>
                  </button>
                </div>
              </motion.div>

              {/* ── 7. RETAILER WALLET CARD ── */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.2 }}
                className="rounded-[20px] bg-[#0B0F19]/80 backdrop-blur-2xl border border-amber-500/20 p-4 sm:p-5 shadow-xl"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-amber-400" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                      RETAILER WALLET
                    </span>
                  </div>
                  <div className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-black text-[10px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent my-1">
                  ₹{walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs font-bold text-slate-400">
                  Available Balance
                </div>
              </motion.div>

              {/* ── HOW IT WORKS CARD ── */}
              <div className="rounded-[20px] bg-[#0B0F19]/60 backdrop-blur-xl border border-slate-800 p-4 shadow-lg hidden md:block">
                <div className="text-[11px] font-black uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>How It Works</span>
                </div>
                <div className="space-y-1.5">
                  {[
                    "Enter beneficiary bank details",
                    "System verifies account via Penny Drop",
                    "₹1 sent & instantly verified",
                    "Official bank name auto-updated",
                    "Beneficiary saved for all future transfers",
                  ].map((txt, i) => (
                    <div key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                      <span className="font-black text-amber-400 shrink-0">{i + 1}.</span>
                      <span>{txt}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Stack>
          </Grid>

          {/* ── RIGHT COLUMN: BENEFICIARY FORM / VERIFICATION RESULTS ── */}
          <Grid size={{ xs: 12, md: 8 }}>
            <AnimatePresence mode="wait">

              {/* ═══════════════════════════════════════════════════════════
                  STEP 0 — BENEFICIARY REGISTRATION FORM
              ═══════════════════════════════════════════════════════════ */}
              {activeStep === 0 && (
                <motion.div
                  key="step0"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.25 }}
                >
                  <form onSubmit={handleStep1Submit} className="space-y-4">

                    {/* ── BENEFICIARY DETAILS CARD ── */}
                    <div className="rounded-[20px] bg-[#0B0F19]/80 backdrop-blur-2xl border border-amber-500/20 p-5 sm:p-6 shadow-xl space-y-4">
                      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                          <PersonIcon sx={{ fontSize: 18 }} />
                        </div>
                        <div>
                          <h3 className="text-sm sm:text-base font-black text-white">
                            Beneficiary Details
                          </h3>
                          <p className="text-xs text-slate-400 font-medium">
                            Name will be replaced with official bank registered name after verification
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <M3TextField
                            label="Beneficiary Name *"
                            value={benName}
                            onChange={e => setBenName(e.target.value)}
                            required
                            helperText="As per sender's knowledge"
                            sx={{
                              "& .MuiInputBase-root": { bgcolor: "#0F172A", color: "#FFFFFF", borderRadius: 2.5, border: "1px solid #1E293B" },
                              "& .MuiInputLabel-root": { color: "#94A3B8" },
                              "& .MuiFormHelperText-root": { color: "#64748B" },
                            }}
                          />
                        </div>

                        <div>
                          <M3TextField
                            label="Nick Name (Optional)"
                            value={nickName}
                            onChange={e => setNickName(e.target.value)}
                            helperText="e.g. Mom's SBI Account"
                            sx={{
                              "& .MuiInputBase-root": { bgcolor: "#0F172A", color: "#FFFFFF", borderRadius: 2.5, border: "1px solid #1E293B" },
                              "& .MuiInputLabel-root": { color: "#94A3B8" },
                              "& .MuiFormHelperText-root": { color: "#64748B" },
                            }}
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <FormControl fullWidth size="small" sx={{
                            "& .MuiInputBase-root": { bgcolor: "#0F172A", color: "#FFFFFF", borderRadius: 2.5, border: "1px solid #1E293B" },
                            "& .MuiInputLabel-root": { color: "#94A3B8" },
                            "& .MuiSvgIcon-root": { color: "#FBBF24" },
                          }}>
                            <InputLabel id="rel-label">Relationship *</InputLabel>
                            <Select
                              labelId="rel-label"
                              value={relationship}
                              label="Relationship *"
                              onChange={e => setRelationship(e.target.value)}
                              required
                              MenuProps={{
                                slotProps: {
                                  paper: {
                                    style: { backgroundColor: "#0F172A", color: "#FFFFFF", border: "1px solid #334155" }
                                  }
                                }
                              }}
                            >
                              {RELATIONSHIP_OPTIONS.map(r => (
                                <MenuItem key={r} value={r} sx={{ "&:hover": { bgcolor: "#1E293B" } }}>
                                  {r}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </div>
                      </div>
                    </div>

                    {/* ── ACCOUNT DETAILS CARD ── */}
                    <div className="rounded-[20px] bg-[#0B0F19]/80 backdrop-blur-2xl border border-amber-500/20 p-5 sm:p-6 shadow-xl space-y-4">
                      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                          <AccountBalanceIcon sx={{ fontSize: 18 }} />
                        </div>
                        <div>
                          <h3 className="text-sm sm:text-base font-black text-white">
                            Account Details
                          </h3>
                          <p className="text-xs text-slate-400 font-medium">
                            Enter and confirm bank account number precisely
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* Account Number with live counter badge */}
                        <div className="relative">
                          <M3TextField
                            label="Account Number *"
                            value={accNum}
                            onChange={e => {
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
                                ? `${accNum.length} / 18 digits — min 9 required`
                                : `${accNum.length} / 18 digits ✓ Valid length`
                            }
                            sx={{
                              "& .MuiInputBase-root": { bgcolor: "#0F172A", color: "#FFFFFF", borderRadius: 2.5, border: "1px solid #1E293B" },
                              "& .MuiInputLabel-root": { color: "#94A3B8" },
                              "& .MuiFormHelperText-root": {
                                color: accNum.length >= 9 ? "#FACC15" : "#64748B",
                                fontWeight: accNum.length >= 9 ? 700 : 400
                              },
                            }}
                          />
                          <div className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md text-[11px] font-black border pointer-events-none ${
                            accNum.length === 0
                              ? "bg-slate-900 text-slate-500 border-slate-800"
                              : accNum.length < 9
                              ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                              : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          }`}>
                            {accNum.length}<span className="opacity-60">/18</span>
                          </div>
                        </div>

                        {/* Confirm Account Number with live match badge */}
                        <div className="relative">
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
                                ? "✓ Matches exactly"
                                : `${confirmAccNum.length} / 18 — does not match`
                            }
                            sx={{
                              "& .MuiInputBase-root": { bgcolor: "#0F172A", color: "#FFFFFF", borderRadius: 2.5, border: "1px solid #1E293B" },
                              "& .MuiInputLabel-root": { color: "#94A3B8" },
                              "& .MuiFormHelperText-root": {
                                color: duplicateError
                                  ? "#F87171"
                                  : confirmAccNum === accNum && confirmAccNum.length >= 9
                                  ? "#FACC15"
                                  : "#64748B",
                                fontWeight: confirmAccNum === accNum && confirmAccNum.length >= 9 ? 700 : 400
                              },
                            }}
                          />
                          <div className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md text-[11px] font-black border pointer-events-none ${
                            confirmAccNum.length === 0
                              ? "bg-slate-900 text-slate-500 border-slate-800"
                              : confirmAccNum === accNum && !duplicateError
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                              : "bg-rose-500/20 text-rose-400 border-rose-500/40"
                          }`}>
                            {confirmAccNum.length}<span className="opacity-60">/18</span>
                          </div>
                        </div>

                        {/* Match Status Banner */}
                        {accNum && confirmAccNum && (
                          <div className="sm:col-span-2">
                            <div className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-black ${
                              accNum !== confirmAccNum
                                ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                                : duplicateError
                                ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                                : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                            }`}>
                              {accNum !== confirmAccNum ? (
                                <span>✗ Account numbers do not match</span>
                              ) : duplicateError ? (
                                <span>{duplicateError}</span>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                  <span>✓ Account numbers match & verified unique for customer</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── BANK SELECTION CARD ── */}
                    <div className="rounded-[20px] bg-[#0B0F19]/80 backdrop-blur-2xl border border-amber-500/20 p-5 sm:p-6 shadow-xl space-y-4">
                      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                          <BusinessIcon sx={{ fontSize: 18 }} />
                        </div>
                        <div>
                          <h3 className="text-sm sm:text-base font-black text-white">
                            Bank Selection
                          </h3>
                          <p className="text-xs text-slate-400 font-medium">
                            Search and select beneficiary bank
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div className={selectedBankObj ? "sm:col-span-1" : "sm:col-span-2"}>
                          <FormControl fullWidth size="small" sx={{
                            "& .MuiInputBase-root": { bgcolor: "#0F172A", color: "#FFFFFF", borderRadius: 2.5, border: "1px solid #1E293B" },
                            "& .MuiInputLabel-root": { color: "#94A3B8" },
                            "& .MuiSvgIcon-root": { color: "#FBBF24" },
                          }}>
                            <InputLabel id="bank-select-label">Select Bank *</InputLabel>
                            <Select
                              labelId="bank-select-label"
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
                                      backgroundColor: "#0F172A",
                                      color: "#FFFFFF",
                                      border: "1px solid #334155",
                                    },
                                  },
                                },
                              }}
                            >
                              <ListSubheader sx={{ pt: 1, pb: 1, px: 1.5, bgcolor: "#0F172A", zIndex: 1 }}>
                                <TextField
                                  size="small"
                                  autoFocus
                                  placeholder="Search bank name or IFSC..."
                                  fullWidth
                                  value={bankSelectSearch}
                                  onChange={(e) => setBankSelectSearch(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => e.stopPropagation()}
                                  sx={{
                                    "& .MuiInputBase-root": { bgcolor: "#1E293B", color: "#FFFFFF", borderRadius: 2 },
                                  }}
                                  slotProps={{
                                    input: {
                                      startAdornment: (
                                        <InputAdornment position="start">
                                          <SearchIcon fontSize="small" sx={{ color: "#FBBF24" }} />
                                        </InputAdornment>
                                      ),
                                    },
                                  }}
                                />
                              </ListSubheader>

                              <MenuItem value="" sx={{ color: "#94A3B8" }}>
                                <em>-- Select Bank --</em>
                              </MenuItem>
                              {filteredBankOptions.map((p: any, idx: number) => (
                                <MenuItem
                                  key={p.bank_id || p.bank_code || p.bank_name || idx}
                                  value={p.bank_name}
                                  sx={{
                                    color: "#FFFFFF",
                                    "&:hover": { bgcolor: "#1E293B" },
                                    "&.Mui-selected": { bgcolor: "rgba(245, 158, 11, 0.2)", color: "#FDE68A" },
                                  }}
                                >
                                  {p.bank_name} {p.short_name ? `(${p.short_name})` : ""}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </div>

                        {selectedBankObj && (
                          <div className="sm:col-span-1">
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
                                      <LockIcon fontSize="small" sx={{ color: "#FBBF24" }} />
                                    </InputAdornment>
                                  ),
                                  endAdornment: (
                                    <InputAdornment position="end">
                                      <Chip
                                        label="Auto-bound"
                                        size="small"
                                        sx={{ height: 20, fontSize: "10px", bgcolor: "rgba(245, 158, 11, 0.2)", color: "#FDE68A", fontWeight: 800 }}
                                      />
                                    </InputAdornment>
                                  ),
                                },
                              }}
                              helperText="Auto-assigned from Bank Master"
                              sx={{
                                "& .MuiInputBase-root": { bgcolor: "#0F172A", borderRadius: 2.5, border: "1px solid #1E293B" },
                                "& .MuiInputBase-input": { fontWeight: 800, color: "#FDE68A", cursor: "not-allowed" },
                                "& .MuiInputLabel-root": { color: "#94A3B8" },
                                "& .MuiFormHelperText-root": { color: "#64748B" },
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Mismatch Error */}
                    {accMismatchError && (
                      <Alert severity="error" sx={{ borderRadius: 3, bgcolor: "rgba(239, 68, 68, 0.15)", color: "#FCA5A5" }}>
                        {accMismatchError}
                      </Alert>
                    )}

                    {/* ── VERIFY & ADD BENEFICIARY PRIMARY CTA BUTTON ── */}
                    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
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
                        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-500 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed min-h-[52px]"
                      >
                        <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                        <span>Verify & Add Beneficiary →</span>
                      </button>
                    </motion.div>
                  </form>
                </motion.div>
              )}

              {/* ═══════════════════════════════════════════════════════════
                  STEP 1 — CONFIRMATION (VERIFICATION SUCCESS)
              ═══════════════════════════════════════════════════════════ */}
              {activeStep === 1 && createdBeneficiary && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  {/* Verified Banner */}
                  <div className="rounded-[20px] bg-emerald-500/10 border border-emerald-500/30 p-5 text-center shadow-xl backdrop-blur-xl">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-2 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                      <VerifiedIcon sx={{ fontSize: 32 }} />
                    </div>
                    <h3 className="text-lg sm:text-xl font-black bg-gradient-to-r from-emerald-300 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                      Beneficiary Verified & Saved
                    </h3>
                    <p className="text-xs text-slate-300 font-medium mt-1">
                      Official bank registered name has been verified. Beneficiary is ready for immediate transfers.
                    </p>
                  </div>

                  {/* Summary Grid */}
                  <div className="rounded-[20px] bg-[#0B0F19]/80 backdrop-blur-2xl border border-amber-500/20 p-5 sm:p-6 shadow-xl space-y-4">
                    <div className="text-sm font-black text-white pb-2 border-b border-slate-800">
                      Verification Summary
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {[
                        { label: "Official Name (Bank Records)", value: createdBeneficiary.account_holder_name, highlight: true },
                        { label: "Nick Name", value: createdBeneficiary.nickname },
                        { label: "Bank Name", value: createdBeneficiary.bank_name },
                        { label: "Branch", value: createdBeneficiary.branch_name },
                        { label: "IFSC Code", value: createdBeneficiary.ifsc_code, mono: true },
                        { label: "Account Number", value: createdBeneficiary.account_number_masked },
                        { label: "Relationship", value: createdBeneficiary.relationship },
                        { label: "UTR Number", value: createdBeneficiary.utr, mono: true },
                        { label: "Wallet Debit", value: `₹${createdBeneficiary.total_debited?.toFixed(2) || "3.54"}` },
                        { label: "Wallet Balance After", value: `₹${createdBeneficiary.wallet_balance_after?.toLocaleString("en-IN", { minimumFractionDigits: 2 }) || "—"}` },
                      ].map(({ label, value, highlight, mono }) => (
                        <div key={label} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</div>
                          <div className={`text-xs font-black truncate ${highlight ? "text-amber-300 font-black text-sm" : "text-white"} ${mono ? "font-mono" : ""}`}>
                            {value || "—"}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleAddAnotherBeneficiary}
                        className="py-3.5 px-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-amber-500/30 text-amber-300 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all"
                      >
                        <PersonAddIcon sx={{ fontSize: 18 }} />
                        <span>+ Add Another Beneficiary</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCompleteAndReturn}
                        className="py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/25 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <span>Transfer Funds Now (Go to DMT) →</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </Grid>
        </Grid>

        {/* ── 8. REGISTERED BENEFICIARIES DIRECTORY TABLE ── */}
        <div className="rounded-[24px] bg-[#0B0F19]/80 backdrop-blur-2xl border border-amber-500/20 p-5 sm:p-6 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                <TableChartIcon sx={{ fontSize: 20 }} />
              </div>
              <div>
                <h3 className="text-base font-black text-white">
                  Registered Beneficiaries Directory
                </h3>
                <p className="text-xs text-slate-400">
                  Linked accounts for <span className="text-amber-300 font-bold">{activeCustomerName}</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => setSavedBenModalOpen(true)}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-black text-xs flex items-center gap-1.5 self-start sm:self-auto transition-all"
            >
              <ListIcon sx={{ fontSize: 16 }} />
              <span>Manage / Delete</span>
            </button>
          </div>

          {beneficiaries.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <AccountBalanceIcon sx={{ fontSize: 40, color: "#64748B" }} />
              <div className="text-xs font-bold text-slate-400">
                No Beneficiaries Registered Yet
              </div>
            </div>
          ) : (
            <TableContainer sx={{ borderRadius: 3, border: "1px solid #1E293B", overflowX: "auto" }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: "#0F172A" }}>
                  <TableRow>
                    <TableCell sx={{ color: "#FBBF24", fontWeight: 800, fontSize: "11px", borderBottom: "1px solid #334155" }}>BENEFICIARY</TableCell>
                    <TableCell sx={{ color: "#FBBF24", fontWeight: 800, fontSize: "11px", borderBottom: "1px solid #334155" }}>BANK</TableCell>
                    <TableCell sx={{ color: "#FBBF24", fontWeight: 800, fontSize: "11px", borderBottom: "1px solid #334155" }}>ACCOUNT</TableCell>
                    <TableCell sx={{ color: "#FBBF24", fontWeight: 800, fontSize: "11px", borderBottom: "1px solid #334155" }}>IFSC</TableCell>
                    <TableCell sx={{ color: "#FBBF24", fontWeight: 800, fontSize: "11px", borderBottom: "1px solid #334155" }}>STATUS</TableCell>
                    <TableCell align="right" sx={{ color: "#FBBF24", fontWeight: 800, fontSize: "11px", borderBottom: "1px solid #334155" }}>ACTION</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {beneficiaries.map((b, idx) => (
                    <TableRow key={b.id || idx} hover sx={{ "& td": { borderBottom: "1px solid #1E293B" } }}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 font-black text-xs flex items-center justify-center">
                            {(b.name || "B").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">{b.name}</div>
                            <div className="text-[10px] text-slate-400">{b.relationship || "Beneficiary"}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell sx={{ color: "#CBD5E1", fontSize: "12px", fontWeight: 600 }}>{b.bankName || "Bank"}</TableCell>
                      <TableCell sx={{ color: "#FDE68A", fontSize: "12px", fontFamily: "monospace", fontWeight: 700 }}>
                        {b.accountNumber || b.maskedAccountNumber}
                      </TableCell>
                      <TableCell sx={{ color: "#CBD5E1", fontSize: "12px", fontFamily: "monospace" }}>{b.ifsc || "—"}</TableCell>
                      <TableCell>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-[10px]">
                          VERIFIED
                        </span>
                      </TableCell>
                      <TableCell align="right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedBeneficiary(b);
                              router.push(`/retailer/dmt/transfer?customerId=${encodeURIComponent(rawId)}&beneficiaryId=${encodeURIComponent(b.id)}`);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-black text-[11px] border border-amber-500/40 transition-all"
                          >
                            Transfer
                          </button>
                          <button
                            onClick={() => {
                              setTargetDeleteBen(b);
                              setDeleteDialogOpen(true);
                            }}
                            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </div>

      </main>

      {/* ─────────────────────────────────────────────────────────────────────
          MODALS & OVERLAYS
      ───────────────────────────────────────────────────────────────────── */}

      {/* Confirmation Modal */}
      <Dialog
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 5,
              p: 0,
              bgcolor: "rgba(15, 23, 42, 0.95)",
              backdropFilter: "blur(24px)",
              color: "#FFFFFF",
              border: "1px solid rgba(245, 158, 11, 0.35)",
              boxShadow: "0 25px 70px rgba(0, 0, 0, 0.75)",
            },
          },
        }}
      >
        <div className="h-1.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500" />
        <DialogTitle sx={{ fontWeight: 900, color: "#FFFFFF", pt: 2.5, px: 3 }}>
          Confirm Penny Drop Verification
        </DialogTitle>
        <DialogContent sx={{ px: 3, pb: 2 }}>
          <p className="text-xs text-slate-300 mb-3">
            A ₹1 penny drop will be sent to verify this account. Verification fee of <strong className="text-amber-300">₹{verificationCharge?.total?.toFixed(2) || "3.54"}</strong> will be debited.
          </p>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-amber-500/30 space-y-1 text-xs">
            <div className="font-black text-amber-300">{benName}</div>
            <div className="text-slate-400">{bankName} • ••••{accNum.slice(-4)} • {ifscCode}</div>
          </div>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, px: 3, justifyContent: "space-between" }}>
          <Button onClick={() => setConfirmModalOpen(false)} sx={{ color: "#94A3B8", fontWeight: 700 }}>
            Cancel
          </Button>
          <button
            onClick={handleRunPennyDrop}
            className="py-2 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md shadow-amber-500/25 cursor-pointer"
          >
            Confirm & Debit ₹{verificationCharge?.total?.toFixed(2) || "3.54"} →
          </button>
        </DialogActions>
      </Dialog>

      {/* Penny Drop Loader Overlay */}
      <Dialog
        open={pennyDropLoading}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 4,
              p: 0,
              bgcolor: "#0F172A",
              color: "#FFFFFF",
              border: "1px solid rgba(245, 158, 11, 0.3)",
            },
          },
        }}
      >
        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin mx-auto" />
          <div>
            <div className="text-base font-black text-white">Verifying Bank Account…</div>
            <div className="text-xs text-slate-400 mt-1">Executing ₹1.00 Penny Drop & validating official name…</div>
          </div>
        </div>
      </Dialog>

      {/* Result Modal */}
      <Dialog
        open={resultModalOpen}
        onClose={() => setResultModalOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 4,
              p: 0,
              bgcolor: "#0F172A",
              color: "#FFFFFF",
              border: `1px solid ${resultModalSuccess ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
            },
          },
        }}
      >
        <div className={`h-1.5 ${resultModalSuccess ? "bg-emerald-500" : "bg-rose-500"}`} />
        <div className="p-6 text-center space-y-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
            resultModalSuccess ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
          }`}>
            {resultModalSuccess ? <CheckCircle2 className="w-6 h-6" /> : <CloseIcon />}
          </div>
          <div className="text-base font-black text-white">
            {resultModalSuccess ? "Verification Successful" : "Verification Failed"}
          </div>
          <p className="text-xs text-slate-300">
            {resultModalSuccess
              ? `Account verified for ${benName}. Registered with bank.`
              : resultModalData?.error || "Failed to verify account. Please check details."}
          </p>
          <button
            onClick={() => setResultModalOpen(false)}
            className={`w-full py-2.5 rounded-xl font-black text-xs mt-2 ${
              resultModalSuccess ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-200"
            }`}
          >
            {resultModalSuccess ? "Continue" : "Close"}
          </button>
        </div>
      </Dialog>

      {/* Saved Beneficiaries Modal */}
      <Dialog
        open={savedBenModalOpen}
        onClose={() => setSavedBenModalOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 5,
              p: 0,
              bgcolor: "#0F172A",
              color: "#FFFFFF",
              border: "1px solid #1E293B",
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: "#FFFFFF", pt: 2.5, px: 3, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">
            Active Beneficiaries ({activeCustomerName})
          </span>
          <IconButton onClick={() => setSavedBenModalOpen(false)} sx={{ color: "#94A3B8" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {beneficiaries.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No Active Beneficiaries Registered
            </div>
          ) : (
            <BeneficiaryDataGrid
              beneficiaries={beneficiaries}
              selectedBeneficiary={null}
              onSelect={(b) => {
                setSelectedBeneficiary(b);
                setSavedBenModalOpen(false);
              }}
              onToggleFavorite={async (bId) => {
                try {
                  await retailerApi.toggleBeneficiaryFavorite(bId);
                  setBeneficiaries((prev: any[]) =>
                    prev.map((b) => (b.id === bId ? { ...b, isFavorite: !b.isFavorite } : b))
                  );
                } catch (e) {
                  console.error("Failed to toggle beneficiary favorite in DB:", e);
                }
              }}
              onOpenDrawer={(b) => setSelectedBeneficiary(b)}
              onDeleteRequest={(b) => {
                setTargetDeleteBen(b);
                setDeleteDialogOpen(true);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <DeleteBeneficiaryDialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setTargetDeleteBen(null);
        }}
        beneficiary={targetDeleteBen}
        onConfirmDelete={async (bId, reason) => {
          await deleteBeneficiary(bId, reason);
          setDeleteDialogOpen(false);
          setTargetDeleteBen(null);
          notificationEngine.notify("BENEFICIARY_VERIFIED", `Beneficiary soft-deleted successfully (${reason})`);
        }}
      />

      {/* ─────────────────────────────────────────────────────────────────────
          FIXED MOBILE BOTTOM NAVIGATION (Fixed & Safe-Area Aware)
      ───────────────────────────────────────────────────────────────────── */}
      <MobileBottomNav onFabClick={() => handleAddAnotherBeneficiary()} />

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
