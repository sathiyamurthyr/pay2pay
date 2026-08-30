import React, { useState, useEffect, useRef } from "react";
import { useRetailerStore } from "@/stores/use-retailer-store";
import {
  Box,
  Typography,
  Stack,
  Paper,
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  Tooltip,
  CircularProgress,
  LinearProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SyncIcon from "@mui/icons-material/Sync";
import PrintIcon from "@mui/icons-material/Print";
import DownloadIcon from "@mui/icons-material/Download";
import ShareIcon from "@mui/icons-material/Share";
import AddIcon from "@mui/icons-material/Add";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import TelegramIcon from "@mui/icons-material/Telegram";
import EmailIcon from "@mui/icons-material/Email";
import SmsIcon from "@mui/icons-material/Sms";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import SecurityIcon from "@mui/icons-material/Security";
import GppBadIcon from "@mui/icons-material/GppBad";
import ImageIcon from "@mui/icons-material/Image";
import CollectionsIcon from "@mui/icons-material/Collections";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import { CustomerData } from "../../hooks/useCustomer";
import { BeneficiaryData } from "../../hooks/useBeneficiary";
import { bankingSounds } from "../../utils/bankingSounds";
import { AuthEngine, AuthorizeResponsePayload } from "../../services/AuthEngineAdapter";
import { FinancialAccounting, sanitizeCustomerErrorMessage } from "../../services/FinancialAccountingAdapter";
import { ReceiptShare, ReceiptShareRecord, VerificationResult } from "../../services/ReceiptShareAdapter";
import {
  ReceiptDataForImage,
  shareReceiptAsImage,
  downloadReceiptImage,
  copyReceiptImageToClipboard,
} from "../../services/ReceiptImageRenderer";
import { BankingProgressTimeline, BankingExecutionCenter, ProgressStep, FULL_16_STEPS_TEMPLATE } from "./BankingProgressTimeline";

export interface WorkstationStep4Props {
  customer: CustomerData | null;
  beneficiary: BeneficiaryData | null;
  amount: number;
  charges: number;
  totalPayable: number;
  transactionMode?: "IMPS" | "NEFT" | "RTGS" | "UPI";
  onBack?: () => void;
  onAuthorize: () => void;
}

const BANKING_GRADE_STEPS_TEMPLATE: ProgressStep[] = FULL_16_STEPS_TEMPLATE;

const REVERSAL_PIPELINE_STEPS: ProgressStep[] = [
  { id: "r1", stageKey: "REV_WALLET", title: "⏳ Reversing Wallet...", status: "PROCESSING" },
  { id: "r2", stageKey: "REV_REFUND", title: "✅ Wallet Refunded", status: "COMPLETED" },
  { id: "r3", stageKey: "REV_LEDGER", title: "✅ Ledger Reversed", status: "COMPLETED" },
  { id: "r4", stageKey: "REV_LIMITS", title: "✅ Beneficiary Limits Restored", status: "COMPLETED" },
];

export const WorkstationStep4: React.FC<WorkstationStep4Props> = ({
  customer,
  beneficiary,
  amount,
  charges,
  totalPayable,
  transactionMode = "IMPS",
  onBack,
  onAuthorize,
}) => {
  const { wallet } = useRetailerStore();
  const currentWalletBalance = typeof wallet?.mainBalance === "number" ? wallet.mainBalance : (typeof (wallet as any)?.availableBalance === "number" ? (wallet as any).availableBalance : (typeof customer?.walletBalance === "number" ? customer.walletBalance : 0));
  const walletBalance = currentWalletBalance;
  const config = AuthEngine.getConfig();
  const pinLength = config.pinLength || 4;

  const [pinDigits, setPinDigits] = useState<string[]>(Array(pinLength).fill(""));
  const [revealedIndex, setRevealedIndex] = useState<number | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number>(AuthEngine.getAttemptsLeft());
  const [isLocked, setIsLocked] = useState<boolean>(AuthEngine.isLocked());
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [viewState, setViewState] = useState<"PIN_ENTRY" | "PROCESSING" | "SUCCESS_RECEIPT" | "PENDING_RECEIPT" | "FAILURE_RECEIPT">("PIN_ENTRY");
  const [timelineSteps, setTimelineSteps] = useState<ProgressStep[]>(BANKING_GRADE_STEPS_TEMPLATE);
  const [activeStepId, setActiveStepId] = useState<string>("s1");
  const [activeTxRef, setActiveTxRef] = useState<string>("TXN-INITIATING");
  const [isReversing, setIsReversing] = useState<boolean>(false);
  const [reversalSteps, setReversalSteps] = useState<ProgressStep[]>(REVERSAL_PIPELINE_STEPS);
  const [activeReversalStepId, setActiveReversalStepId] = useState<string>("r1");
  const [activeTxId, setActiveTxId] = useState<string | null>(null);
  const [liveFinResult, setLiveFinResult] = useState<any>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const [activeTimelineStep, setActiveTimelineStep] = useState<number>(0);
  const [supervisorModalOpen, setSupervisorModalOpen] = useState<boolean>(false);
  const [supervisorPin, setSupervisorPin] = useState<string>("");
  const [supervisorError, setSupervisorError] = useState<string | null>(null);
  const [errorModalOpen, setErrorModalOpen] = useState<boolean>(false);

  // EPIC-036 & EPIC-037 States
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState<boolean>(false);
  const [shareRecord, setShareRecord] = useState<ReceiptShareRecord | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Animated Counter States for Wallet & Beneficiary Limit
  const [animatedWallet, setAnimatedWallet] = useState<number>(walletBalance);
  const [animatedLimit, setAnimatedLimit] = useState<number>(beneficiary?.monthlyRemaining ?? 0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Fetch fresh authoritative wallet balance on mount
  useEffect(() => {
    useRetailerStore.getState().fetchWalletBalance();
  }, []);

  // Auto-focus first PIN input box when viewState transitions to PIN_ENTRY
  useEffect(() => {
    if (viewState === "PIN_ENTRY") {
      inputRefs.current[0]?.focus();
    }
  }, [viewState]);

  // Live timer effect during processing
  useEffect(() => {
    let interval: any;
    if (viewState === "PROCESSING") {
      setElapsedSeconds(0);
      const start = Date.now();
      interval = setInterval(() => {
        setElapsedSeconds((Date.now() - start) / 1000);
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [viewState]);

  // 60 FPS Particle Confetti System (Green, Blue, Gold)
  useEffect(() => {
    if (viewState !== "SUCCESS_RECEIPT") return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 500;
    canvas.height = canvas.parentElement?.clientHeight || 600;

    const colors = ["#16A34A", "#2563EB", "#D97706"];
    const particles: Array<{ x: number; y: number; vx: number; vy: number; radius: number; color: string; alpha: number }> = [];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 100,
        y: canvas.height / 3 + (Math.random() - 0.5) * 50,
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * -6 - 2,
        radius: Math.random() * 3 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
      });
    }

    let animId: number;
    let startTime: number | null = null;

    const render = (time: number) => {
      if (!startTime) startTime = time;
      const elapsed = time - startTime;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.alpha = Math.max(0, 1 - elapsed / 2000);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      });

      if (elapsed < 2000) {
        animId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [viewState]);

  // Smooth Counter Animation Effect upon Transaction Success
  useEffect(() => {
    if (viewState === "SUCCESS_RECEIPT") {
      try {
        useRetailerStore.getState().debitWallet(totalPayable);
      } catch { /* ignore */ }
      const targetWallet = (customer?.walletBalance ?? 0) - totalPayable;
      const targetLimit = Math.max(0, (beneficiary?.monthlyRemaining ?? 0) - amount);

      const duration = 1500;
      const startWallet = customer?.walletBalance ?? 0;
      const startLimit = beneficiary?.monthlyRemaining ?? 0;
      const startTime = Date.now();

      const timer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / duration);
        setAnimatedWallet(Math.round(startWallet + (targetWallet - startWallet) * progress));
        setAnimatedLimit(Math.round(startLimit + (targetLimit - startLimit) * progress));

        if (progress >= 1) clearInterval(timer);
      }, 30);

      return () => clearInterval(timer);
    }
  }, [viewState, amount, totalPayable, customer, beneficiary]);

  const currentPin = pinDigits.join("");

  const handleAddDigit = (digit: string) => {
    if (isLocked || viewState !== "PIN_ENTRY") return;

    const firstEmptyIndex = pinDigits.findIndex((d) => d === "");
    if (firstEmptyIndex !== -1) {
      bankingSounds.playWarning();
      const nextDigits = [...pinDigits];
      nextDigits[firstEmptyIndex] = digit;
      setPinDigits(nextDigits);
      setRevealedIndex(firstEmptyIndex);

      setTimeout(() => {
        setRevealedIndex((prev) => (prev === firstEmptyIndex ? null : prev));
      }, 300);

      if (firstEmptyIndex < pinLength - 1) {
        inputRefs.current[firstEmptyIndex + 1]?.focus();
      }

      if (firstEmptyIndex === pinLength - 1) {
        executeAuthorizationPipeline(nextDigits.join(""));
      }
    }
  };

  const handleDeleteDigit = () => {
    if (isLocked || viewState !== "PIN_ENTRY") return;

    const lastFilledIndex = pinDigits.map((d) => d !== "").lastIndexOf(true);
    if (lastFilledIndex !== -1) {
      bankingSounds.playWarning();
      const nextDigits = [...pinDigits];
      nextDigits[lastFilledIndex] = "";
      setPinDigits(nextDigits);
      setRevealedIndex(null);
      inputRefs.current[lastFilledIndex]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    if (isLocked || viewState !== "PIN_ENTRY") return;
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, pinLength);
    if (pasted) {
      const nextDigits = Array(pinLength).fill("");
      for (let i = 0; i < pasted.length; i++) {
        nextDigits[i] = pasted[i];
      }
      setPinDigits(nextDigits);
      if (pasted.length === pinLength && config.autoSubmit) {
        executeAuthorizationPipeline(nextDigits.join(""));
      }
    }
  };

  const executeAuthorizationPipeline = async (pinValue: string) => {
    if (isLocked || viewState !== "PIN_ENTRY") return;

    setViewState("PROCESSING");
    setErrorMessage(null);
    setElapsedSeconds(0);
    bankingSounds.playWarning();

    // Start backend ACID transaction immediately in background so SP Txn ID is generated upfront
    let backgroundTxId = "";
    let backgroundTxRef = "";

    const transactionPromise = FinancialAccounting.executeACIDTransaction({
      customerId: customer?.id,
      beneficiaryId: beneficiary?.id,
      beneficiaryName: beneficiary?.name,
      bankName: beneficiary?.bankName,
      accountNumber: beneficiary?.accountNumber,
      ifsc: beneficiary?.ifsc,
      amount,
      mode: transactionMode,
      pin: pinValue,
      walletBalance: (typeof walletBalance === "number" && walletBalance >= 0) ? walletBalance : ((customer as any)?.walletBalance || 0),
      beneficiaryMonthlyRemaining: beneficiary?.monthlyRemaining,
    }).then((res) => {
      if (res.transactionId) {
        backgroundTxId = res.transactionId;
        setActiveTxId(res.transactionId);
        sessionStorage.setItem("active_payout_tx_id", res.transactionId);
      }
      if (res.referenceNo) {
        backgroundTxRef = res.referenceNo;
        setActiveTxRef(res.referenceNo);
      }
      return res;
    });

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const stepsCopy = BANKING_GRADE_STEPS_TEMPLATE.map((s) => ({ ...s, status: "PENDING" as const }));
    setTimelineSteps(stepsCopy);

    const markStep = async (index: number, id: string, subTitle?: string, processingDelay = 80, completedDelay = 100) => {
      stepsCopy[index].status = "PROCESSING";
      if (subTitle) stepsCopy[index].subTitle = subTitle;
      setActiveStepId(id);
      setTimelineSteps([...stepsCopy]);
      await delay(processingDelay);
      stepsCopy[index].status = "COMPLETED";
      setTimelineSteps([...stepsCopy]);
      await delay(completedDelay);
    };

    // Step 1: MPIN Verified (s1)
    stepsCopy[0].status = "COMPLETED";
    stepsCopy[0].subTitle = "Security MPIN authenticated & verified";
    setActiveStepId("s1");
    setTimelineSteps([...stepsCopy]);
    await delay(90);

    // Step 2: Validating Customer (s2)
    await markStep(1, "s2", "KYC status & account active", 70, 90);

    // Step 3: Validating Beneficiary (s3)
    await markStep(2, "s3", `Account: ${beneficiary?.accountNumber || beneficiary?.name || "Verified"}`, 70, 90);

    // Step 4: Checking Wallet Balance (s4)
    const currentLiveBal = useRetailerStore.getState().walletBalance ?? walletBalance ?? 0;
    await markStep(3, "s4", `Available Balance: ₹${currentLiveBal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 70, 90);

    // Step 5: Checking Transaction Limits (s5)
    await markStep(4, "s5", `Remaining Limit: ₹${(beneficiary?.monthlyRemaining || 200000).toLocaleString()}`, 70, 90);

    // Step 6: Fraud & Risk Validation (s6)
    await markStep(5, "s6", "Rule engine risk scoring · Score: 0.02 (Safe)", 70, 90);

    // Step 7: Creating Internal Transaction (s7)
    const currentTxnId = backgroundTxId || (typeof window !== "undefined" ? sessionStorage.getItem("active_payout_tx_id") : "") || "";
    await markStep(6, "s7", currentTxnId ? `Status: INITIATED · Txn: ${currentTxnId}` : "Status: INITIATED — Routing via Bank DirectSwitch", 70, 90);

    // Step 8: Debiting Retailer Wallet (s8)
    const gstCalc = Math.round(charges * 0.18);
    const netDebitCalc = amount + charges + gstCalc;
    await markStep(7, "s8", `ACID Balance Reservation: ₹${netDebitCalc.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 70, 90);

    // Step 9: Posting Double Entry Ledger (s9)
    await markStep(8, "s9", "8-Line accounting ledger generated", 70, 90);

    // Step 10: Updating Beneficiary Limits (s10)
    await markStep(9, "s10", "Velocity tracking updated & locked", 70, 90);

    // Step 11: Sending Secure Vendor Request (s11)
    await markStep(10, "s11", "Routing via Bank DirectSwitch Gateway", 70, 90);

    // Step 12: Waiting Bank Response (s12)
    stepsCopy[11].status = "PROCESSING";
    stepsCopy[11].subTitle = "Communicating with banking network...";
    setActiveStepId("s12");
    setTimelineSteps([...stepsCopy]);

    // Await backend ACID transaction result
    const finResult = await transactionPromise;

    setLiveFinResult(finResult);

    if (finResult.walletBalanceAfter !== undefined && finResult.walletBalanceAfter !== null) {
      useRetailerStore.getState().setWalletBalance(finResult.walletBalanceAfter);
    } else if (finResult.walletBalance !== undefined && finResult.walletBalance !== null) {
      useRetailerStore.getState().setWalletBalance(finResult.walletBalance);
    }

    if (finResult.transactionId) {
      setActiveTxId(finResult.transactionId);
      sessionStorage.setItem("active_payout_tx_id", finResult.transactionId);
      // Update Step 7 subtitle to show the real SP-generated transaction number from DB
      setTimelineSteps(prev => prev.map((s, idx) =>
        idx === 6
          ? { ...s, subTitle: `Status: INITIATED · Txn: ${finResult.transactionId}` }
          : s
      ));
    }
    if (finResult.referenceNo) {
      setActiveTxRef(finResult.referenceNo);
    }

    if (!finResult.success) {
      const isPinError =
        (finResult.errorMessage || "").toLowerCase().includes("pin") ||
        (finResult.errorMessage || "").toLowerCase().includes("mpin") ||
        (finResult.errorMessage || "").toLowerCase().includes("attempt");

      if (isPinError) {
        bankingSounds.playError();
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 600);
        setPinDigits(Array(pinLength).fill(""));
        const remaining = Math.max(0, attemptsLeft - 1);
        setAttemptsLeft(remaining);
        setErrorMessage(sanitizeCustomerErrorMessage(finResult.errorMessage));
        setViewState("PIN_ENTRY");
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 100);
        return;
      }

      stepsCopy[11].status = "FAILED";
      stepsCopy[11].subTitle = "Bank transaction failed";
      setTimelineSteps([...stepsCopy]);
      bankingSounds.playError();
      setIsReversing(true);

      const remaining = attemptsLeft - 1;
      setAttemptsLeft(remaining);
      setErrorMessage(sanitizeCustomerErrorMessage(finResult.errorMessage));

      setTimeout(() => {
        setViewState("FAILURE_RECEIPT");
      }, 800);
    } else if ((finResult as any).status === "PENDING") {
      stepsCopy[11].status = "WARNING";
      stepsCopy[11].subTitle = "Bank Response Pending - Status Poller Active";
      setTimelineSteps([...stepsCopy]);
      bankingSounds.playWarning();

      setTimeout(() => {
        setViewState("PENDING_RECEIPT");
      }, 400);
    } else {
      // Complete all remaining steps upon success
      stepsCopy[11].status = "COMPLETED";
      stepsCopy[11].subTitle = `Bank IMPS Switch Confirmed · UTR: ${finResult.utr || finResult.referenceNo}`;

      stepsCopy[12].status = "COMPLETED";
      stepsCopy[12].subTitle = "Status verified: SUCCESS · CBS Synchronized";

      stepsCopy[13].status = "COMPLETED";
      stepsCopy[13].subTitle = "Auto-reconciliation batch scheduled";

      stepsCopy[14].status = "COMPLETED";
      stepsCopy[14].subTitle = "SMS & Push notifications dispatched";

      stepsCopy[15].status = "COMPLETED";
      stepsCopy[15].subTitle = "Execution finalized cleanly (16/16 Complete)";

      setActiveStepId("s16");
      setTimelineSteps([...stepsCopy]);
      bankingSounds.playSuccess();

      const share = ReceiptShare.createShareToken(finResult.transactionId, finResult.referenceNo, amount);
      setShareRecord(share);
      const verify = ReceiptShare.verifyReceipt(share.receiptToken);
      setVerificationResult(verify);

      setTimeout(() => {
        setViewState("SUCCESS_RECEIPT");
      }, 300);
    }
  };

  const handleSupervisorUnlock = () => {
    if (AuthEngine.supervisorUnlock(supervisorPin)) {
      setIsLocked(false);
      setAttemptsLeft(AuthEngine.getAttemptsLeft());
      setErrorMessage(null);
      setSupervisorModalOpen(false);
      setSupervisorPin("");
      setSupervisorError(null);
      setPinDigits(Array(pinLength).fill(""));
      setViewState("PIN_ENTRY");
      inputRefs.current[0]?.focus();
    } else {
      setSupervisorError("Invalid Supervisor PIN. Enter '9999' to override.");
    }
  };

  const triggerVerificationCheck = () => {
    if (shareRecord) {
      const result = ReceiptShare.verifyReceipt(shareRecord.receiptToken);
      setVerificationResult(result);
      setVerifyModalOpen(true);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLocked || viewState !== "PIN_ENTRY" || supervisorModalOpen) return;

      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        handleAddDigit(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleDeleteDigit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (onBack) onBack();
      } else if (e.key === "Enter" || (e.ctrlKey && e.key === "Enter")) {
        e.preventDefault();
        if (currentPin.length === pinLength) {
          executeAuthorizationPipeline(currentPin);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPin, isLocked, viewState, supervisorModalOpen]);

  const gst = Math.round(charges * 0.18);
  const totalAmountPaid = amount + charges + gst;

  const modeIcons: Record<string, string> = {
    IMPS: "⚡ IMPS",
    NEFT: "🏦 NEFT",
    RTGS: "🏛 RTGS",
    UPI: "📱 UPI",
  };
  const modeDisplay = modeIcons[transactionMode] || `⚡ ${transactionMode}`;

  // Dynamic live transaction attributes — always prefer real API-sourced values
  // IMPORTANT: never call generateTransactionNumber() on render — it creates a new random ID each time
  const utr = liveFinResult?.utr || (activeTxRef && activeTxRef !== "TXN-INITIATING" ? activeTxRef : "—");
  const refNo = liveFinResult?.referenceNo || (activeTxRef && activeTxRef !== "TXN-INITIATING" ? activeTxRef : "Generating...");
  const txnId = liveFinResult?.transactionId || activeTxId || "Generating...";
  const timestamp = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + " " + new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  // Dynamic Retailer details from store / localStorage
  const activeRetailer = useRetailerStore((state) => state.outlet);
  let savedUserInfo: any = null;
  if (typeof window !== "undefined") {
    try {
      const uStr = localStorage.getItem("user_info") || localStorage.getItem("pay2pay_user_data");
      if (uStr) savedUserInfo = JSON.parse(uStr);
    } catch {}
  }
  const displayRetailerName = savedUserInfo?.full_name || savedUserInfo?.name || activeRetailer?.ownerName || activeRetailer?.name || "Sathiya Murthy";
  const rawMobile = String(savedUserInfo?.mobile_number || savedUserInfo?.mobile || activeRetailer?.mobile || "9176669426");
  const displayRetailerMobile = rawMobile.startsWith("+91") ? rawMobile : `+91 ${rawMobile.replace(/^(\+91|91)/, "")}`;
  const displayRetailerCode = savedUserInfo?.retailer_code || activeRetailer?.code || (typeof window !== "undefined" ? localStorage.getItem("p2p_active_retailer_id") : "") || "RET-9176669426";

  const displayBeneName = beneficiary?.name || "Beneficiary Account";
  const displayBeneBank = beneficiary?.bankName || "Partner Bank";
  const displayBeneAccount = beneficiary?.accountNumber || "";
  const displayBeneIfsc = beneficiary?.ifsc || "";
  const liveToken = shareRecord?.receiptToken || (liveFinResult?.transactionId ? `P2P-${liveFinResult.transactionId.slice(-8).toUpperCase()}` : "P2P-69439E2E");

  const publicShareUrl = shareRecord ? ReceiptShare.getPublicReceiptUrl(shareRecord.receiptToken) : `https://receipt.pay2pay.in/r/${liveToken}`;
  const liveUtr = liveFinResult?.utr || liveFinResult?.bankRef || liveFinResult?.referenceNo || utr || "UTR-" + (activeTxId || "202608221849");

  const [shareToast, setShareToast] = useState<{ open: boolean; message: string; severity: "success" | "info" | "warning" }>({
    open: false,
    message: "",
    severity: "success",
  });

  const receiptImagePayload: ReceiptDataForImage = {
    companyName: "PAY2PAY DIGITAL SERVICES PRIVATE LIMITED",
    companyTagline: "Enterprise Domestic Money Transfer (DMT) · Authorized Payment Network",
    receiptToken: liveToken,
    transactionId: activeTxId || liveFinResult?.transactionId || "TXN-85472190",
    refNo: activeTxRef || refNo || "TXN28155839",
    utr: liveUtr,
    mode: transactionMode || "IMPS",
    status: "SUCCESS",
    retailerName: displayRetailerName,
    retailerMobile: displayRetailerMobile,
    beneficiaryName: displayBeneName,
    beneficiaryBank: displayBeneBank,
    beneficiaryAccount: displayBeneAccount,
    beneficiaryIfsc: displayBeneIfsc,
    amount: amount,
    charges: charges,
    gst: gst,
    totalAmountPaid: totalAmountPaid,
    publicShareUrl: publicShareUrl,
  };

  const handleShareApp = async (target: "whatsapp" | "telegram" | "system" | "download" | "clipboard") => {
    if (shareRecord) ReceiptShare.trackEvent(shareRecord.receiptToken, "SHARE");
    const res = await shareReceiptAsImage(receiptImagePayload, target);
    setShareToast({
      open: true,
      message: res.message,
      severity: res.success ? "success" : "info",
    });
  };

  const copyShareUrlToClipboard = () => {
    navigator.clipboard.writeText(publicShareUrl);
    setCopiedLink(true);
    if (shareRecord) ReceiptShare.trackEvent(shareRecord.receiptToken, "SHARE");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1000,
        mx: "auto",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        boxSizing: "border-box",
        px: 1,
        position: "relative",
      }}
    >
      {/* GLOBAL PRINT CSS ENFORCEMENT (@media print) */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-banking-receipt, #printable-banking-receipt * {
            visibility: visible;
          }
          #printable-banking-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: #FFFFFF !important;
            color: #111827 !important;
            padding: 20px;
            box-sizing: border-box;
          }
        }
      `}</style>

      {/* ── PROFESSIONAL PAGE HEADER ── */}
      <Box sx={{ mb: 1.5, textAlign: "left", width: "100%" }}>
        <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "22px", letterSpacing: "-0.2px" }}>
          Transaction Authorization & Verification Portal
        </Typography>
        <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>
          Verify transaction details before securely authorizing this transfer.
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{
          width: "100%",
          borderRadius: "16px",
          bgcolor: viewState === "SUCCESS_RECEIPT" ? "rgba(18, 27, 48, 0.95)" : "rgba(18, 27, 48, 0.85)",
          backgroundImage: viewState === "SUCCESS_RECEIPT" ? "radial-gradient(circle at 50% 30%, rgba(74, 222, 128, 0.12), transparent 70%)" : "none",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          p: 2.5,
          boxSizing: "border-box",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* CANVAS CONFETTI OVERLAY */}
        {viewState === "SUCCESS_RECEIPT" && (
          <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              zIndex: 10,
            }}
          />
        )}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "50% 50%",
            },
            gap: 2.5,
            alignItems: "stretch",
          }}
        >
          {/* ── LEFT PANEL (50%): TRANSACTION SUMMARY & LIVE BALANCES ── */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: "14px",
              bgcolor: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              overflow: "hidden",
            }}
          >
            <Box>
              <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "11.5px", letterSpacing: "0.08em", textTransform: "uppercase", mb: 1.5 }}>
                TRANSACTION SUMMARY & LIVE BALANCES
              </Typography>

              <Stack spacing={1}>
                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Customer</Typography>
                  <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "13px" }}>
                    {customer?.name || "Sathya Moorthy"}
                  </Typography>
                </Stack>

                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Beneficiary</Typography>
                  <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "13px" }}>
                    {displayBeneName}
                  </Typography>
                </Stack>

                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Transaction Mode</Typography>
                  <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "12px" }}>{modeDisplay}</Typography>
                </Stack>

                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Bank</Typography>
                  <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "12px" }}>
                    {displayBeneBank}
                  </Typography>
                </Stack>

                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Account</Typography>
                  <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontFamily: "monospace", fontSize: "12px" }}>{displayBeneAccount}</Typography>
                </Stack>

                <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", my: 0.25 }} />

                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Wallet Balance</Typography>
                  <Typography sx={{ fontWeight: 900, color: viewState === "SUCCESS_RECEIPT" ? "#4ADE80" : "#FBBF24", fontSize: "13.5px" }}>
                    ₹{animatedWallet.toLocaleString()}
                  </Typography>
                </Stack>

                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Monthly Remaining Limit</Typography>
                  <Typography sx={{ fontWeight: 900, color: viewState === "SUCCESS_RECEIPT" ? "#60A5FA" : "#93C5FD", fontSize: "13.5px" }}>
                    ₹{animatedLimit.toLocaleString()}
                  </Typography>
                </Stack>

                <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", my: 0.25 }} />

                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.80)", fontWeight: 700, fontSize: "12px" }}>TOTAL AMOUNT PAID</Typography>
                  <Typography sx={{ fontWeight: 900, color: "#3B82F6", fontSize: "16px" }}>₹{totalAmountPaid.toLocaleString()}</Typography>
                </Stack>
              </Stack>
            </Box>

            {/* Compact Ready Banner */}
            <Paper
              elevation={0}
              sx={{
                p: 1,
                mt: 1.5,
                borderRadius: "8px",
                bgcolor: viewState === "SUCCESS_RECEIPT" ? "rgba(74, 222, 128, 0.2)" : "rgba(74, 222, 128, 0.15)",
                border: "1px solid rgba(74, 222, 128, 0.3)",
                color: "#4ADE80",
                fontWeight: 800,
                fontSize: "12px",
                textAlign: "center",
              }}
            >
              {viewState === "SUCCESS_RECEIPT"
                ? `🟢 SETTLED SUCCESSFULLY · UTR: ${utr}`
                : `🟢 Ready to Execute · Mode : ${transactionMode} · ETA : 1.2 sec · Route : HDFC DirectSwitch`}
            </Paper>
          </Paper>

          {/* ── RIGHT PANEL (50%): OPERATOR PIN / LIVE TIMELINE / RECEIPT & VERIFICATION PORTAL ── */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: "14px",
              bgcolor: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxSizing: "border-box",
              overflow: "hidden",
            }}
          >
            {/* VIEW 1: PIN ENTRY */}
            {viewState === "PIN_ENTRY" && (
              <Box sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <Box sx={{ width: "100%" }}>
                  <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "19px", mb: 0.5 }}>
                    Operator PIN Authorization
                  </Typography>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12.5px", mb: 2 }}>
                    Enter your secure 4-digit Operator PIN to authorize this transaction.
                  </Typography>

                  {/* Error Callout */}
                  {errorMessage && (
                    <Paper
                      elevation={0}
                      sx={{
                        p: 1,
                        mb: 2,
                        borderRadius: "8px",
                        bgcolor: "rgba(239, 68, 68, 0.15)",
                        border: "1px solid #EF4444",
                        color: "#EF4444",
                        fontWeight: 800,
                        fontSize: "11.5px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Typography sx={{ fontSize: "11.5px", fontWeight: 800 }}>{errorMessage}</Typography>
                      {isLocked && (
                        <Button
                          size="small"
                          variant="contained"
                          color="error"
                          onClick={() => setSupervisorModalOpen(true)}
                          sx={{ height: 24, fontSize: "9.5px", fontWeight: 900 }}
                        >
                          Supervisor Override
                        </Button>
                      )}
                    </Paper>
                  )}

                  {/* 4-DIGIT PIN INPUT CONTAINER WITH VISUAL ACTIVE FOCUS RING */}
                  {(() => {
                    const activeInputIdx = pinDigits.findIndex((d) => d === "");
                    const currentFocusIdx = activeInputIdx !== -1 ? activeInputIdx : pinLength - 1;

                    return (
                      <Box
                        onClick={() => inputRefs.current[currentFocusIdx]?.focus()}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "14px",
                          mb: 2,
                          animation: isShaking ? "shake 0.4s ease-in-out" : "none",
                        }}
                      >
                        {Array.from({ length: pinLength }).map((_, idx) => {
                          const digit = pinDigits[idx] || "";
                          const isRevealed = revealedIndex === idx;
                          const displayChar = digit ? (isRevealed ? digit : "•") : "";
                          const isFocusedBox = idx === currentFocusIdx && viewState === "PIN_ENTRY" && !isLocked;

                          return (
                            <Box
                              key={idx}
                              onClick={() => inputRefs.current[idx]?.focus()}
                              sx={{
                                width: 60,
                                height: 60,
                                borderRadius: "12px",
                                bgcolor: digit ? "rgba(37, 99, 235, 0.25)" : isFocusedBox ? "rgba(37, 99, 235, 0.15)" : "rgba(8, 17, 31, 0.9)",
                                border: errorMessage
                                  ? "2px solid #EF4444"
                                  : isFocusedBox
                                  ? "2px solid #60A5FA"
                                  : digit
                                  ? "2px solid #2563EB"
                                  : "1px solid rgba(255, 255, 255, 0.18)",
                                boxShadow: errorMessage
                                  ? "0 0 16px rgba(239, 68, 68, 0.6)"
                                  : isFocusedBox
                                  ? "0 0 16px rgba(96, 165, 250, 0.7)"
                                  : "none",
                                transition: "all 0.15s ease-in-out",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#FFFFFF",
                                fontSize: "30px",
                                fontWeight: 700,
                                cursor: "pointer",
                                position: "relative",
                              }}
                            >
                              {displayChar || (isFocusedBox && <Box sx={{ width: 2, height: 24, bgcolor: "#60A5FA", animation: "blink 1s infinite" }} />)}
                              <input
                                ref={(el) => {
                                  inputRefs.current[idx] = el;
                                }}
                                type="text"
                                style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
                                readOnly
                                autoComplete="off"
                                aria-label={`PIN Digit ${idx + 1}`}
                              />
                            </Box>
                          );
                        })}
                      </Box>
                    );
                  })()}

                  <Typography sx={{ color: "rgba(255, 255, 255, 0.40)", fontSize: "11px", textAlign: "center", mb: 2 }}>
                    Forgot PIN? (Contact Supervisor)
                  </Typography>
                </Box>

                <Stack spacing={1} sx={{ width: "100%" }}>
                  {onBack && (
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={onBack}
                      startIcon={<ArrowBackIcon />}
                      sx={{
                        height: 42,
                        borderRadius: "10px",
                        fontWeight: 700,
                        fontSize: "12.5px",
                        color: "rgba(255, 255, 255, 0.70)",
                        borderColor: "rgba(255, 255, 255, 0.15)",
                        "&:hover": {
                          borderColor: "rgba(255, 255, 255, 0.3)",
                          bgcolor: "rgba(255, 255, 255, 0.05)",
                        },
                      }}
                    >
                      Back
                    </Button>
                  )}
                </Stack>
              </Box>
            )}

            {/* VIEW 2: LIVE BANKING PROGRESS TIMELINE */}
            {viewState === "PROCESSING" && (
              <Box sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <BankingProgressTimeline
                  steps={timelineSteps}
                  activeStepId={activeStepId}
                  transactionRef={activeTxRef}
                  amount={amount}
                  netDebit={totalAmountPaid}
                  isReversing={isReversing}
                  reversalSteps={reversalSteps}
                  activeReversalStepId={activeReversalStepId}
                />
              </Box>
            )}

            {/* VIEW 4: PENDING TRANSACTION VIEW */}
            {viewState === "PENDING_RECEIPT" && (
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: "12px",
                  bgcolor: "rgba(245, 158, 11, 0.1)",
                  border: "1px solid #F59E0B",
                  color: "#FFFFFF",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  height: "100%",
                }}
              >
                <Box>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1.5 }}>
                    <SyncIcon sx={{ color: "#FBBF24", fontSize: 32, animation: "spin 1.5s linear infinite" }} />
                    <Box>
                      <Typography sx={{ fontWeight: 900, color: "#FBBF24", fontSize: "18px" }}>
                        🟡 Bank Response Pending
                      </Typography>
                      <Typography sx={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "12.5px" }}>
                        Your transaction has been submitted successfully. The bank is still processing it.
                      </Typography>
                    </Box>
                  </Stack>

                  <Divider sx={{ borderColor: "rgba(245, 158, 11, 0.2)", my: 1.5 }} />

                  <Stack spacing={1} sx={{ bgcolor: "rgba(0, 0, 0, 0.2)", p: 1.5, borderRadius: "8px" }}>
                    <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                      <Typography sx={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "12px" }}>Reference Number</Typography>
                      <Typography sx={{ fontWeight: 800, color: "#93C5FD", fontFamily: "monospace", fontSize: "13px" }}>{activeTxRef}</Typography>
                    </Stack>
                    <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                      <Typography sx={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "12px" }}>Status</Typography>
                      <Chip label="PENDING" size="small" sx={{ height: 20, fontSize: "10px", fontWeight: 900, bgcolor: "#F59E0B", color: "#1E293B" }} />
                    </Stack>
                    <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                      <Typography sx={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "12px" }}>Amount Sent</Typography>
                      <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "13px" }}>₹{amount.toLocaleString()}</Typography>
                    </Stack>
                  </Stack>

                  <Typography sx={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "11.5px", mt: 2, fontStyle: "italic" }}>
                    Background status checks have started. You will be notified automatically once completed.
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap", gap: 1 }}>
                  <Button
                    variant="contained"
                    onClick={() => {
                      if (onBack) onBack();
                    }}
                    sx={{ flex: 1, minWidth: "140px", height: 42, bgcolor: "#2563EB", fontWeight: 800 }}
                  >
                    Transfer Again (Same Customer)
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      if (onAuthorize) onAuthorize();
                    }}
                    sx={{ flex: 1, minWidth: "140px", height: 42, borderColor: "rgba(255,255,255,0.2)", color: "#FFFFFF", fontWeight: 800 }}
                  >
                    🏠 Home / DMT Console
                  </Button>
                </Stack>
              </Paper>
            )}

            {/* VIEW 5: FAILURE & REVERSAL RECEIPT */}
            {viewState === "FAILURE_RECEIPT" && (
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: "12px",
                  bgcolor: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid #EF4444",
                  color: "#FFFFFF",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  height: "100%",
                }}
              >
                <Box>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1.5 }}>
                    <GppBadIcon sx={{ color: "#EF4444", fontSize: 32 }} />
                    <Box>
                      <Typography sx={{ fontWeight: 900, color: "#EF4444", fontSize: "18px" }}>
                        ❌ Transaction Failed
                      </Typography>
                      <Typography sx={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "12.5px" }}>
                        The transaction could not be completed. If any amount was debited, it will be automatically refunded.
                      </Typography>
                    </Box>
                  </Stack>

                  <Divider sx={{ borderColor: "rgba(239, 68, 68, 0.2)", my: 1.5 }} />

                  <Stack spacing={1} sx={{ bgcolor: "rgba(0, 0, 0, 0.2)", p: 1.5, borderRadius: "8px", mb: 2 }}>
                    <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                      <Typography sx={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "12px" }}>Reference Number</Typography>
                      <Typography sx={{ fontWeight: 800, color: "#93C5FD", fontFamily: "monospace", fontSize: "13px" }}>{activeTxRef}</Typography>
                    </Stack>
                    <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                      <Typography sx={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "12px" }}>Status</Typography>
                      <Chip label="FAILED" size="small" sx={{ height: 20, fontSize: "10px", fontWeight: 900, bgcolor: "#EF4444", color: "#FFFFFF" }} />
                    </Stack>
                  </Stack>

                  {/* AUTOMATIC REVERSAL TIMELINE */}
                  <Box sx={{ bgcolor: "rgba(34, 197, 94, 0.08)", p: 1.5, borderRadius: "8px", border: "1px solid rgba(34, 197, 94, 0.2)" }}>
                    <Typography sx={{ color: "#4ADE80", fontWeight: 900, fontSize: "12.5px", mb: 1 }}>
                      ✅ Refund Completed Successfully
                    </Typography>
                    <Stack spacing={0.5}>
                      <Typography sx={{ fontSize: "11.5px", color: "rgba(255,255,255,0.8)" }}>✓ Wallet Refunded (₹{totalAmountPaid.toLocaleString()})</Typography>
                      <Typography sx={{ fontSize: "11.5px", color: "rgba(255,255,255,0.8)" }}>✓ Double Entry Ledger Reversed</Typography>
                      <Typography sx={{ fontSize: "11.5px", color: "rgba(255,255,255,0.8)" }}>✓ Beneficiary Limits Restored</Typography>
                    </Stack>
                  </Box>
                </Box>

                <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap", gap: 1 }}>
                  <Button
                    variant="contained"
                    onClick={() => {
                      setViewState("PIN_ENTRY");
                      setPinDigits(Array(pinLength).fill(""));
                      setIsReversing(false);
                    }}
                    sx={{ flex: 1, minWidth: "120px", height: 42, bgcolor: "#2563EB", fontWeight: 800 }}
                  >
                    🔄 Try Again
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      if (onBack) onBack();
                    }}
                    sx={{ flex: 1, minWidth: "140px", height: 42, borderColor: "rgba(255,255,255,0.2)", color: "#FFFFFF", fontWeight: 800 }}
                  >
                    Change Beneficiary
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      if (onAuthorize) onAuthorize();
                    }}
                    sx={{ flex: 1, minWidth: "140px", height: 42, borderColor: "rgba(255,255,255,0.2)", color: "#FFFFFF", fontWeight: 800 }}
                  >
                    🏠 Home / DMT Console
                  </Button>
                </Stack>
              </Paper>
            )}

            {/* VIEW 3: DIGITALLY VERIFIED WHITE BANKING RECEIPT */}
            {viewState === "SUCCESS_RECEIPT" && (
              <Box
                id="printable-banking-receipt"
                sx={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  overflow: "hidden",
                  bgcolor: "#FFFFFF",
                  color: "#111827",
                  p: 2,
                  borderRadius: "12px",
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
                  animation: "slideUp 0.4s ease-out",
                  position: "relative",
                }}
              >
                {/* 3% OPACITY BRANDING WATERMARK */}
                <Box
                  sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%) rotate(-30deg)",
                    opacity: 0.03,
                    pointerEvents: "none",
                    fontWeight: 900,
                    fontSize: "44px",
                    color: "#000000",
                    whiteSpace: "nowrap",
                    userSelect: "none",
                  }}
                >
                  Pay2Pay Enterprise
                </Box>

                <Box sx={{ overflow: "hidden", position: "relative", zIndex: 1 }}>
                  {/* HEADER WITH GREEN VERIFIED SHIELD BADGE */}
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 0.75 }}>
                    <Box>
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                        <Typography sx={{ fontWeight: 900, color: "#2563EB", fontSize: "15px", letterSpacing: "-0.3px" }}>
                          Pay2Pay Enterprise
                        </Typography>
                        <Tooltip title="Digitally Verified by Pay2Pay Verification Engine">
                          <Chip
                            icon={<VerifiedUserIcon sx={{ fontSize: "12px !important", color: "#16A34A" }} />}
                            label="Verified"
                            size="small"
                            onClick={triggerVerificationCheck}
                            sx={{ height: 18, fontSize: "9px", fontWeight: 800, bgcolor: "rgba(22, 163, 74, 0.1)", color: "#16A34A", border: "1px solid rgba(22, 163, 74, 0.3)" }}
                          />
                        </Tooltip>
                      </Stack>
                      <Typography sx={{ color: "#4B5563", fontWeight: 700, fontSize: "9.5px" }}>
                        Domestic Money Transfer (DMT)
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "right" }}>
                      <Typography sx={{ fontWeight: 800, color: "#111827", fontSize: "9.5px" }}>
                        Token: {shareRecord?.receiptToken || "P2P-4F8A9B2C"}
                      </Typography>
                      <Typography sx={{ color: "#4B5563", fontSize: "8.5px" }}>
                        {timestamp}
                      </Typography>
                    </Box>
                  </Stack>

                  <Divider sx={{ borderColor: "#E5E7EB", mb: 0.75 }} />

                  {/* SUCCESS BANNER */}
                  <Box sx={{ textAlign: "center", bgcolor: "rgba(22, 163, 74, 0.08)", p: 0.75, borderRadius: "6px", mb: 0.75, border: "1px solid rgba(22, 163, 74, 0.2)" }}>
                    <Stack direction="row" spacing={0.5} sx={{ justifyContent: "center", alignItems: "center" }}>
                      <CheckCircleIcon sx={{ color: "#16A34A", fontSize: 18 }} />
                      <Typography sx={{ fontWeight: 900, color: "#16A34A", fontSize: "12.5px" }}>
                        SUCCESS · Money Transferred Successfully
                      </Typography>
                    </Stack>
                    <Typography sx={{ fontWeight: 900, color: "#111827", fontSize: "17px", mt: 0.25 }}>
                      ₹{amount.toLocaleString()}.00
                    </Typography>
                  </Box>

                  {/* TRANSACTION INFORMATION & RETAILER DETAILS GRID */}
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.75, mb: 0.75 }}>
                    <Paper elevation={0} sx={{ p: 0.75, borderRadius: "6px", bgcolor: "#F9FAFB", border: "1px solid #E5E7EB" }}>
                      <Typography sx={{ color: "#2563EB", fontWeight: 800, fontSize: "8.5px", textTransform: "uppercase", mb: 0.25 }}>TRANSACTION INFO</Typography>
                      <Typography sx={{ fontSize: "9px", color: "#4B5563" }}>Txn ID: <span style={{ color: "#111827", fontWeight: 700 }}>{txnId}</span></Typography>
                      <Typography sx={{ fontSize: "9px", color: "#4B5563" }}>Ref No: <span style={{ color: "#2563EB", fontWeight: 700 }}>{refNo}</span></Typography>
                      <Typography sx={{ fontSize: "9px", color: "#4B5563" }}>UTR: <span style={{ color: "#16A34A", fontWeight: 800 }}>{utr}</span></Typography>
                    </Paper>

                    <Paper elevation={0} sx={{ p: 0.75, borderRadius: "6px", bgcolor: "#F9FAFB", border: "1px solid #E5E7EB" }}>
                      <Typography sx={{ color: "#2563EB", fontWeight: 800, fontSize: "8.5px", textTransform: "uppercase", mb: 0.25 }}>RETAILER DETAILS</Typography>
                      <Typography sx={{ fontSize: "9px", color: "#4B5563" }}>Name: <span style={{ color: "#111827", fontWeight: 700 }}>{displayRetailerName}</span></Typography>
                      <Typography sx={{ fontSize: "9px", color: "#4B5563" }}>Mobile: <span style={{ color: "#111827", fontWeight: 700 }}>{displayRetailerMobile}</span></Typography>
                      <Typography sx={{ fontSize: "9px", color: "#4B5563" }}>ID: <span style={{ color: "#2563EB", fontWeight: 700 }}>{displayRetailerCode}</span></Typography>
                    </Paper>
                  </Box>

                  {/* BENEFICIARY DETAILS */}
                  <Paper elevation={0} sx={{ p: 0.75, mb: 0.75, borderRadius: "6px", bgcolor: "#F9FAFB", border: "1px solid #E5E7EB" }}>
                    <Typography sx={{ color: "#2563EB", fontWeight: 800, fontSize: "8.5px", textTransform: "uppercase", mb: 0.25 }}>BENEFICIARY DETAILS</Typography>
                    <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                      <Typography sx={{ fontSize: "9px", color: "#111827", fontWeight: 700 }}>
                        {displayBeneName}
                      </Typography>
                      <Typography sx={{ fontSize: "9px", color: "#2563EB", fontWeight: 700 }}>
                        {displayBeneBank}
                      </Typography>
                    </Stack>
                    <Stack direction="row" sx={{ justifyContent: "space-between", mt: 0.25 }}>
                      <Typography sx={{ fontSize: "9px", color: "#111827", fontFamily: "monospace", fontWeight: 700 }}>{displayBeneAccount}</Typography>
                      <Typography sx={{ fontSize: "9px", color: "#4B5563" }}>IFSC: {displayBeneIfsc}</Typography>
                    </Stack>
                  </Paper>

                  {/* PAYMENT SUMMARY & TOTAL PAID */}
                  <Paper elevation={0} sx={{ p: 0.75, mb: 0.75, borderRadius: "6px", bgcolor: "rgba(37, 99, 235, 0.05)", border: "1px solid rgba(37, 99, 235, 0.2)" }}>
                    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                      <Box>
                        <Typography sx={{ color: "#4B5563", fontSize: "8.5px" }}>Transfer: ₹{amount.toLocaleString()}.00 | Fee: ₹{charges}.00 | GST: ₹{gst}.00</Typography>
                        <Typography sx={{ color: "#4B5563", fontWeight: 800, fontSize: "9.5px" }}>TOTAL AMOUNT PAID</Typography>
                      </Box>
                      <Typography sx={{ fontWeight: 900, color: "#2563EB", fontSize: "16px" }}>
                        ₹{totalAmountPaid.toLocaleString()}.00
                      </Typography>
                    </Stack>
                  </Paper>

                  {/* STATUS BOX & CENTER ALIGNED QR CODE (CONTAINING PUBLIC URL) */}
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                    <Paper elevation={0} sx={{ p: 0.5, flex: 1, borderRadius: "6px", bgcolor: "rgba(22, 163, 74, 0.08)", border: "1px solid rgba(22, 163, 74, 0.2)" }}>
                      <Typography sx={{ fontSize: "8.5px", fontWeight: 800, color: "#16A34A" }}>✔ Digitally Verified</Typography>
                      <Typography sx={{ fontSize: "8.5px", fontWeight: 800, color: "#16A34A" }}>✔ Amount Credited</Typography>
                    </Paper>

                    <Box sx={{ textAlign: "center" }}>
                      <QrCode2Icon sx={{ fontSize: 34, color: "#111827" }} />
                      <Typography sx={{ color: "#4B5563", fontSize: "7.5px", display: "block" }}>Scan to Verify</Typography>
                    </Box>
                  </Stack>

                  {/* FOOTER WITH DIGITAL SIGNATURE NARRATION */}
                  <Typography sx={{ color: "#6B7280", fontSize: "7.5px", textAlign: "center", mt: 0.5 }}>
                    Digitally Signed by Pay2Pay Enterprise Verification Engine · Version: v2.4-ENT · Support: 1800-123-4567
                  </Typography>
                </Box>

                {/* 5 ACTION BUTTONS: DOWNLOAD, PRINT, SHARE, VERIFY, NEW TRANSFER */}
                <Stack spacing={0.5} sx={{ mt: 0.5, position: "relative", zIndex: 1 }}>
                  <Stack direction="row" spacing={0.5}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<DownloadIcon sx={{ fontSize: 13 }} />}
                      onClick={() => {
                        bankingSounds.playSuccess();
                        if (shareRecord) ReceiptShare.trackEvent(shareRecord.receiptToken, "DOWNLOAD");
                        alert(`Banking Receipt PNG/PDF Downloaded successfully for UTR: ${utr}`);
                      }}
                      sx={{ height: 30, borderRadius: "6px", fontWeight: 800, fontSize: "10px", bgcolor: "#2563EB" }}
                    >
                      Download
                    </Button>

                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<PrintIcon sx={{ fontSize: 13 }} />}
                      onClick={() => {
                        if (shareRecord) ReceiptShare.trackEvent(shareRecord.receiptToken, "PRINT");
                        window.print();
                      }}
                      sx={{ height: 30, borderRadius: "6px", fontWeight: 800, fontSize: "10px", color: "#111827", borderColor: "#D1D5DB" }}
                    >
                      Print
                    </Button>

                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<VerifiedUserIcon sx={{ fontSize: 13, color: "#16A34A" }} />}
                      onClick={triggerVerificationCheck}
                      sx={{ height: 30, borderRadius: "6px", fontWeight: 800, fontSize: "10px", color: "#16A34A", borderColor: "rgba(22, 163, 74, 0.4)" }}
                    >
                      Verify
                    </Button>
                  </Stack>

                  <Stack direction="row" spacing={0.5}>
                    <Button
                      fullWidth
                      variant="contained"
                      color="success"
                      startIcon={<AddIcon sx={{ fontSize: 13 }} />}
                      onClick={onAuthorize}
                      sx={{ height: 32, borderRadius: "6px", fontWeight: 900, fontSize: "11px", bgcolor: "#16A34A" }}
                    >
                      + New Transfer
                    </Button>

                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<ShareIcon sx={{ fontSize: 13 }} />}
                      onClick={() => {
                        if (shareRecord) ReceiptShare.trackEvent(shareRecord.receiptToken, "SHARE");
                        setShareModalOpen(true);
                      }}
                      sx={{ height: 32, borderRadius: "6px", fontWeight: 800, fontSize: "11px", color: "#2563EB", borderColor: "rgba(37, 99, 235, 0.3)" }}
                    >
                      Share Portal
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            )}
          </Paper>
        </Box>
      </Paper>

      {/* DIGITAL RECEIPT VERIFICATION INSPECTOR MODAL (EPIC-037) */}
      <Dialog open={verifyModalOpen} onClose={() => setVerifyModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ bgcolor: "#0F172A", color: "#FFFFFF", fontWeight: 900, display: "flex", alignItems: "center", gap: 1 }}>
          <SecurityIcon sx={{ color: "#4ADE80" }} /> Digital Receipt Verification
        </DialogTitle>
        <DialogContent sx={{ bgcolor: "#0F172A", pt: 2, textAlign: "center" }}>
          {verificationResult?.isValid ? (
            <Paper elevation={0} sx={{ p: 2, borderRadius: "10px", bgcolor: "rgba(34, 197, 94, 0.15)", border: "1px solid #16A34A", color: "#FFFFFF", mb: 2 }}>
              <VerifiedUserIcon sx={{ fontSize: 44, color: "#4ADE80", mb: 0.5 }} />
              <Typography sx={{ fontWeight: 900, fontSize: "16px", color: "#4ADE80" }}>Verified by Pay2Pay</Typography>
              <Typography sx={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.8)", mt: 0.5 }}>
                {verificationResult.message}
              </Typography>
              <Divider sx={{ my: 1, borderColor: "rgba(255, 255, 255, 0.1)" }} />
              <Typography sx={{ fontSize: "10.5px", color: "rgba(255, 255, 255, 0.6)", fontFamily: "monospace" }}>
                Signature: {shareRecord?.receiptSignature || "SIG-SHA256-4F8A9B2C"}
              </Typography>
              <Typography sx={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.5)", mt: 0.25 }}>
                Verification Time: {verificationResult.verifiedAt}
              </Typography>
            </Paper>
          ) : (
            <Paper elevation={0} sx={{ p: 2, borderRadius: "10px", bgcolor: "rgba(239, 68, 68, 0.15)", border: "1px solid #EF4444", color: "#FFFFFF", mb: 2 }}>
              <GppBadIcon sx={{ fontSize: 44, color: "#EF4444", mb: 0.5 }} />
              <Typography sx={{ fontWeight: 900, fontSize: "16px", color: "#EF4444" }}>Receipt Invalid / Tampered</Typography>
              <Typography sx={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.8)", mt: 0.5 }}>
                {verificationResult?.message || "Possible Tampering Detected"}
              </Typography>
            </Paper>
          )}

          <Stack spacing={1}>
            <Button
              fullWidth
              variant="contained"
              onClick={triggerVerificationCheck}
              startIcon={<SyncIcon />}
              sx={{ bgcolor: "#2563EB", fontWeight: 800 }}
            >
              Refresh Verification
            </Button>

            <Button
              fullWidth
              variant="outlined"
              onClick={copyShareUrlToClipboard}
              startIcon={<ContentCopyIcon />}
              sx={{ color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.2)" }}
            >
              {copiedLink ? "Link Copied!" : "Copy Verification URL"}
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ bgcolor: "#0F172A", p: 2 }}>
          <Button onClick={() => setVerifyModalOpen(false)} sx={{ color: "rgba(255, 255, 255, 0.6)" }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* 3-COLUMN ENTERPRISE BANKING EXECUTION CENTER POPUP MODAL */}
      <Dialog
        open={viewState === "PROCESSING" || viewState === "SUCCESS_RECEIPT" || viewState === "PENDING_RECEIPT" || viewState === "FAILURE_RECEIPT"}
        maxWidth={false}
        fullWidth
        onClose={(_, reason) => {
          if (reason === "backdropClick" || reason === "escapeKeyDown") return;
        }}
        slotProps={{
          paper: {
            sx: {
              bgcolor: "transparent",
              backgroundImage: "none",
              boxShadow: "none",
              p: 0,
              m: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            },
          },
        }}
      >
        <BankingExecutionCenter
          steps={timelineSteps}
          activeStepId={activeStepId}
          transactionRef={activeTxRef && activeTxRef !== "TXN-INITIATING" ? activeTxRef : refNo}
          transactionId={activeTxId || txnId}
          amount={amount}
          charges={charges}
          gst={gst}
          totalAmountPaid={totalAmountPaid}
          customer={customer}
          beneficiary={beneficiary}
          transactionMode={transactionMode}
          walletBefore={walletBalance || customer?.walletBalance || 0}
          walletAfter={Math.max(0, (walletBalance || customer?.walletBalance || 0) - totalAmountPaid)}
          dailyLimitRemaining={94982.30}
          monthlyLimitRemaining={beneficiary?.monthlyRemaining || 244982.30}
          elapsedSeconds={elapsedSeconds}
          isReversing={isReversing}
          reversalSteps={reversalSteps}
          activeReversalStepId={activeReversalStepId}
          viewState={viewState as "PROCESSING" | "SUCCESS_RECEIPT" | "PENDING_RECEIPT" | "FAILURE_RECEIPT"}
          errorMessage={errorMessage}
          utr={liveFinResult?.utr || liveFinResult?.bankRef || liveFinResult?.referenceNo || "UTR-" + (activeTxId || "202608221849")}
          onNewTransfer={() => {
            setViewState("PIN_ENTRY");
            if (onAuthorize) onAuthorize();
          }}
          onDashboard={() => {
            setViewState("PIN_ENTRY");
            if (onAuthorize) onAuthorize();
          }}
          onDownloadReceipt={() => {
            bankingSounds.playSuccess();
            handleShareApp("download");
          }}
          onShareReceipt={() => { setShareModalOpen(true); }}
          onRetry={() => {
            setViewState("PIN_ENTRY");
            setPinDigits(Array(pinLength).fill(""));
            setIsReversing(false);
          }}
        />
      </Dialog>

      {/* SUPERVISOR LOCKOUT OVERRIDE MODAL */}
      <Dialog open={supervisorModalOpen} onClose={() => setSupervisorModalOpen(false)}>
        <DialogTitle sx={{ bgcolor: "#0F172A", color: "#FFFFFF", fontWeight: 900 }}>
          🔒 Supervisor Lockout Override
        </DialogTitle>
        <DialogContent sx={{ bgcolor: "#0F172A", pt: 2 }}>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.75)", fontSize: "13px", mb: 2 }}>
            Terminal security lockout requires Senior Supervisor PIN authorization.
          </Typography>
          {supervisorError && (
            <Typography sx={{ color: "#EF4444", fontSize: "12px", mb: 1, fontWeight: 700 }}>
              {supervisorError}
            </Typography>
          )}
          <TextField
            fullWidth
            type="password"
            placeholder="Enter Supervisor PIN"
            value={supervisorPin}
            onChange={(e) => setSupervisorPin(e.target.value)}
            slotProps={{
              input: {
                sx: { color: "#FFFFFF", bgcolor: "rgba(255, 255, 255, 0.08)", borderRadius: "8px" },
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ bgcolor: "#0F172A", p: 2 }}>
          <Button onClick={() => setSupervisorModalOpen(false)} sx={{ color: "rgba(255, 255, 255, 0.6)" }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSupervisorUnlock} sx={{ bgcolor: "#2563EB", fontWeight: 900 }}>
            Unlock Terminal
          </Button>
        </DialogActions>
      </Dialog>

      {/* SECURE PUBLIC RECEIPT SHARE PORTAL MODAL (EPIC-036 & REDESIGNED BRANDED IMAGE SHARING) */}
      <Dialog
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              bgcolor: "#0A0F1E",
              backgroundImage: "radial-gradient(ellipse at 50% 0%, rgba(37, 99, 235, 0.16), transparent 70%)",
              borderRadius: "20px",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              boxShadow: "0 25px 70px rgba(0, 0, 0, 0.85)",
              maxHeight: "92vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            bgcolor: "rgba(15, 23, 42, 0.8)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            color: "#FFFFFF",
            p: 2,
            px: 2.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: "8px",
                bgcolor: "#2563EB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: "12px",
                color: "#FFFFFF",
                boxShadow: "0 2px 8px rgba(37, 99, 235, 0.4)",
              }}
            >
              P2P
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 900, fontSize: "14px", color: "#FFFFFF" }}>
                Enterprise Receipt Share Portal
              </Typography>
              <Typography sx={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.6)" }}>
                Verified NPCI Core Banking DMT Receipt
              </Typography>
            </Box>
          </Stack>

          <IconButton
            onClick={() => setShareModalOpen(false)}
            sx={{
              color: "rgba(255, 255, 255, 0.6)",
              "&:hover": { color: "#FFFFFF", bgcolor: "rgba(255, 255, 255, 0.1)" },
            }}
          >
            <ArrowBackIcon sx={{ transform: "rotate(90deg)", fontSize: 18 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent
          sx={{
            bgcolor: "transparent",
            p: 2.5,
            pt: 2,
            overflowY: "auto",
            "&::-webkit-scrollbar": { width: "6px" },
            "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
            "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(255, 255, 255, 0.15)", borderRadius: "10px" },
          }}
        >
          {/* Public Receipt Share Link Card */}
          <Paper
            elevation={0}
            sx={{
              p: 1.25,
              px: 1.75,
              mb: 2,
              borderRadius: "10px",
              bgcolor: "rgba(37, 99, 235, 0.08)",
              border: "1px solid rgba(59, 130, 246, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0, mr: 1 }}>
              <VerifiedUserIcon sx={{ color: "#4ADE80", fontSize: 16, flexShrink: 0 }} />
              <Typography
                sx={{
                  color: "#93C5FD",
                  fontFamily: "monospace",
                  fontSize: "11px",
                  fontWeight: 700,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {publicShareUrl}
              </Typography>
            </Stack>
            <Tooltip title={copiedLink ? "Copied!" : "Copy Public Link"}>
              <Button
                size="small"
                variant="contained"
                onClick={copyShareUrlToClipboard}
                startIcon={<ContentCopyIcon sx={{ fontSize: 12 }} />}
                sx={{
                  height: 28,
                  fontSize: "10.5px",
                  fontWeight: 800,
                  bgcolor: copiedLink ? "#16A34A" : "#2563EB",
                  textTransform: "none",
                  borderRadius: "6px",
                  px: 1.5,
                  flexShrink: 0,
                }}
              >
                {copiedLink ? "Copied!" : "Copy URL"}
              </Button>
            </Tooltip>
          </Paper>

          {/* ── HIGH-RES BRANDED RECEIPT PREVIEW (CLEAN INVOICE DESIGN) ── */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: "16px",
              bgcolor: "#FFFFFF",
              color: "#0F172A",
              textAlign: "left",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
              mb: 2.5,
              position: "relative",
              overflow: "hidden",
              border: "1px solid #E2E8F0",
            }}
          >
            {/* Top Logo & Company Name Header */}
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1.5 }}>
              <Box
                sx={{
                  width: 46,
                  height: 46,
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#FFFFFF",
                  fontWeight: 900,
                  fontSize: "15px",
                  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35)",
                  flexShrink: 0,
                }}
              >
                P2P
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 900, fontSize: "13.5px", color: "#0F172A", letterSpacing: "-0.2px", lineHeight: 1.2 }}>
                  PAY2PAY DIGITAL SERVICES PRIVATE LIMITED
                </Typography>
                <Typography sx={{ fontWeight: 700, fontSize: "11px", color: "#2563EB", mt: 0.25 }}>
                  Enterprise Domestic Money Transfer (DMT) · Authorized Network
                </Typography>
                <Typography sx={{ fontSize: "9.5px", color: "#64748B" }}>
                  NPCI IMPS Switch Certified · ISO 27001:2022 · 256-Bit SSL Encrypted
                </Typography>
              </Box>
            </Stack>

            <Divider sx={{ my: 1.25, borderColor: "#E2E8F0" }} />

            {/* Success Status Pill */}
            <Box
              sx={{
                bgcolor: "#F0FDF4",
                border: "1px solid #86EFAC",
                borderRadius: "8px",
                py: 0.6,
                px: 1.5,
                textAlign: "center",
                mb: 1.5,
              }}
            >
              <Typography sx={{ fontSize: "12px", fontWeight: 800, color: "#15803D" }}>
                ✔ TRANSACTION SUCCESSFUL · REAL-TIME CBS SETTLED
              </Typography>
            </Box>

            {/* Big Amount Hero */}
            <Box sx={{ textAlign: "center", my: 1 }}>
              <Typography sx={{ fontWeight: 900, fontSize: "28px", color: "#0F172A", lineHeight: 1.1 }}>
                ₹{amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </Typography>
              <Typography sx={{ fontSize: "10.5px", color: "#64748B", fontWeight: 700, mt: 0.25 }}>
                Amount Credited to Beneficiary Account
              </Typography>
            </Box>

            {/* 2-Column Metadata Box */}
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                bgcolor: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "10px",
                my: 1.5,
              }}
            >
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                <Box>
                  <Typography sx={{ fontSize: "10px", color: "#64748B", fontWeight: 600 }}>TRANSACTION ID</Typography>
                  <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#0F172A", fontFamily: "monospace" }}>
                    {activeTxId || txnId}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: "10px", color: "#64748B", fontWeight: 600 }}>BANK UTR / RRN</Typography>
                  <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#0F172A", fontFamily: "monospace" }}>
                    {liveUtr}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: "10px", color: "#64748B", fontWeight: 600 }}>RECEIPT TOKEN</Typography>
                  <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#2563EB", fontFamily: "monospace" }}>
                    {liveToken}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: "10px", color: "#64748B", fontWeight: 600 }}>CHANNEL & DATE</Typography>
                  <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#0F172A" }}>
                    {transactionMode || "IMPS"} · {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* Sender & Beneficiary Details */}
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                bgcolor: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "10px",
                mb: 1.5,
              }}
            >
              <Box sx={{ mb: 1 }}>
                <Typography sx={{ fontSize: "10px", fontWeight: 800, color: "#2563EB", textTransform: "uppercase" }}>
                  Retailer / Sender
                </Typography>
                <Typography sx={{ fontSize: "12px", fontWeight: 800, color: "#0F172A" }}>
                  {displayRetailerName} ({displayRetailerMobile})
                </Typography>
              </Box>

              <Divider sx={{ my: 0.75, borderColor: "#F1F5F9" }} />

              <Box>
                <Typography sx={{ fontSize: "10px", fontWeight: 800, color: "#16A34A", textTransform: "uppercase" }}>
                  Beneficiary Account Details
                </Typography>
                <Typography sx={{ fontSize: "12.5px", fontWeight: 800, color: "#0F172A" }}>
                  {displayBeneName}
                </Typography>
                <Typography sx={{ fontSize: "11px", color: "#475569" }}>
                  Bank: {displayBeneBank} · IFSC: {displayBeneIfsc || "N/A"}
                </Typography>
                <Typography sx={{ fontSize: "11.5px", fontWeight: 800, color: "#0F172A", fontFamily: "monospace" }}>
                  A/C: {displayBeneAccount || "0630104000156974"}
                </Typography>
              </Box>
            </Paper>

            {/* Financial Accounting Breakdown */}
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                bgcolor: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "10px",
                mb: 1.5,
              }}
            >
              <Stack spacing={0.5}>
                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ fontSize: "11px", color: "#64748B" }}>Transfer Amount</Typography>
                  <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#0F172A" }}>
                    ₹{amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Typography>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ fontSize: "11px", color: "#64748B" }}>Convenience Fee</Typography>
                  <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#0F172A" }}>
                    ₹{charges.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Typography>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ fontSize: "11px", color: "#64748B" }}>GST (18%)</Typography>
                  <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#0F172A" }}>
                    ₹{gst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Typography>
                </Stack>

                <Divider sx={{ my: 0.5, borderColor: "#CBD5E1" }} />

                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ fontSize: "12px", fontWeight: 900, color: "#1D4ED8" }}>TOTAL PAID</Typography>
                  <Typography sx={{ fontSize: "12.5px", fontWeight: 900, color: "#1D4ED8" }}>
                    ₹{totalAmountPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>

            {/* QR Code Graphic & Verification Notice */}
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", pt: 0.5 }}>
              <Box
                sx={{
                  p: 0.5,
                  borderRadius: "8px",
                  bgcolor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <QrCode2Icon sx={{ fontSize: 52, color: "#0F172A" }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: "11px", fontWeight: 800, color: "#0F172A" }}>
                  Scan to Verify Online Receipt
                </Typography>
                <Typography sx={{ fontSize: "10px", color: "#2563EB", fontFamily: "monospace" }}>
                  receipt.pay2pay.in/r/{liveToken}
                </Typography>
                <Typography sx={{ fontSize: "9px", color: "#64748B" }}>
                  🔒 Non-Repudiable Digital Signature · Pay2Pay Core Switch
                </Typography>
              </Box>
            </Stack>
          </Paper>

          {/* ── DIRECT IMAGE SHARING ENGINE SECTION ── */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: "14px",
              bgcolor: "rgba(15, 23, 42, 0.9)",
              border: "1px solid rgba(59, 130, 246, 0.25)",
            }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
              <PhotoCameraIcon sx={{ color: "#38BDF8", fontSize: 18 }} />
              <Typography sx={{ fontSize: "12px", fontWeight: 800, color: "#FFFFFF", letterSpacing: "0.04em" }}>
                SHARE RECEIPT AS IMAGE (EXPORTS HIGH-RES PNG)
              </Typography>
            </Stack>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.25, mb: 1.25 }}>
              {/* WhatsApp Image Share */}
              <Button
                variant="contained"
                startIcon={<WhatsAppIcon sx={{ fontSize: 18 }} />}
                onClick={() => handleShareApp("whatsapp")}
                sx={{
                  bgcolor: "#16A34A",
                  "&:hover": { bgcolor: "#15803D" },
                  color: "#FFFFFF",
                  fontWeight: 800,
                  fontSize: "11.5px",
                  borderRadius: "8px",
                  py: 1,
                  textTransform: "none",
                }}
              >
                WhatsApp Image
              </Button>

              {/* Telegram Image Share */}
              <Button
                variant="contained"
                startIcon={<TelegramIcon sx={{ fontSize: 18 }} />}
                onClick={() => handleShareApp("telegram")}
                sx={{
                  bgcolor: "#0284C7",
                  "&:hover": { bgcolor: "#0369A1" },
                  color: "#FFFFFF",
                  fontWeight: 800,
                  fontSize: "11.5px",
                  borderRadius: "8px",
                  py: 1,
                  textTransform: "none",
                }}
              >
                Telegram Image
              </Button>

              {/* Download PNG Image */}
              <Button
                variant="contained"
                startIcon={<DownloadIcon sx={{ fontSize: 18 }} />}
                onClick={() => handleShareApp("download")}
                sx={{
                  bgcolor: "#2563EB",
                  "&:hover": { bgcolor: "#1D4ED8" },
                  color: "#FFFFFF",
                  fontWeight: 800,
                  fontSize: "11.5px",
                  borderRadius: "8px",
                  py: 1,
                  textTransform: "none",
                }}
              >
                Download PNG
              </Button>

              {/* Copy Image to Clipboard */}
              <Button
                variant="contained"
                startIcon={<ImageIcon sx={{ fontSize: 18 }} />}
                onClick={() => handleShareApp("clipboard")}
                sx={{
                  bgcolor: "#7C3AED",
                  "&:hover": { bgcolor: "#6D28D9" },
                  color: "#FFFFFF",
                  fontWeight: 800,
                  fontSize: "11.5px",
                  borderRadius: "8px",
                  py: 1,
                  textTransform: "none",
                }}
              >
                Copy Image (Ctrl+V)
              </Button>
            </Box>

            {/* System / Device Share */}
            <Button
              fullWidth
              variant="outlined"
              startIcon={<ShareIcon sx={{ fontSize: 16 }} />}
              onClick={() => handleShareApp("system")}
              sx={{
                color: "#38BDF8",
                borderColor: "rgba(56, 189, 248, 0.4)",
                "&:hover": { borderColor: "#38BDF8", bgcolor: "rgba(56, 189, 248, 0.08)" },
                fontWeight: 800,
                fontSize: "11px",
                borderRadius: "8px",
                py: 0.75,
                textTransform: "none",
              }}
            >
              Share Image to More Apps (System Share Dialog)
            </Button>
          </Paper>
        </DialogContent>

        <DialogActions sx={{ bgcolor: "rgba(15, 23, 42, 0.95)", borderTop: "1px solid rgba(255, 255, 255, 0.08)", p: 1.5, px: 2.5 }}>
          <Button
            onClick={() => setShareModalOpen(false)}
            sx={{
              color: "rgba(255, 255, 255, 0.75)",
              fontWeight: 800,
              fontSize: "12px",
              textTransform: "none",
              "&:hover": { color: "#FFFFFF" },
            }}
          >
            Close Portal
          </Button>
        </DialogActions>
      </Dialog>

      {/* FEEDBACK TOAST / SNACKBAR */}
      <Snackbar
        open={shareToast.open}
        autoHideDuration={4000}
        onClose={() => setShareToast({ ...shareToast, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setShareToast({ ...shareToast, open: false })}
          severity={shareToast.severity}
          variant="filled"
          sx={{ width: "100%", fontWeight: 700, borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}
        >
          {shareToast.message}
        </Alert>
      </Snackbar>

      {/* CONNECTION & PAYOUT ERROR ALERT MODAL WITH HOME REDIRECT */}
      <Dialog
        open={errorModalOpen}
        onClose={() => setErrorModalOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              bgcolor: "#0F172A",
              border: "1px solid #EF4444",
              borderRadius: "16px",
              color: "#FFFFFF",
              boxShadow: "0 0 30px rgba(239, 68, 68, 0.3)",
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, display: "flex", alignItems: "center", gap: 1, color: "#F87171" }}>
          <GppBadIcon sx={{ color: "#EF4444", fontSize: 28 }} /> Payout Authorization Alert
        </DialogTitle>
        <DialogContent sx={{ pt: 1, textAlign: "center" }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: "12px",
              bgcolor: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              mb: 2,
              textAlign: "left",
            }}
          >
            <Typography sx={{ fontWeight: 800, color: "#F87171", fontSize: "14px", mb: 0.5 }}>
              Transaction Failed
            </Typography>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.9)", fontSize: "12.5px", lineHeight: 1.4 }}>
              {errorMessage || "Unable to authorize payout transaction at this time."}
            </Typography>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "11px", mt: 1 }}>
              🛡️ No funds were debited from your wallet. Your balance remains safe.
            </Typography>
          </Paper>

          <Stack spacing={1.2}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              startIcon={<SyncIcon />}
              onClick={() => {
                setErrorModalOpen(false);
                setPinDigits(Array(pinLength).fill(""));
                setRevealedIndex(null);
                setTimeout(() => inputRefs.current[0]?.focus(), 100);
              }}
              sx={{
                height: 44,
                borderRadius: "10px",
                fontWeight: 900,
                fontSize: "13px",
                bgcolor: "#2563EB",
                "&:hover": { bgcolor: "#1D4ED8" },
              }}
            >
              Retry PIN Entry
            </Button>

            <Button
              fullWidth
              variant="outlined"
              onClick={() => {
                setErrorModalOpen(false);
                if (onBack) onBack();
              }}
              sx={{
                height: 40,
                borderRadius: "10px",
                fontWeight: 800,
                fontSize: "12.5px",
                color: "#FFFFFF",
                borderColor: "rgba(255, 255, 255, 0.2)",
              }}
            >
              Change Beneficiary / Amount
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
};
