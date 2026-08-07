import React, { useState, useEffect, useRef } from "react";
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
import { CustomerData } from "../../hooks/useCustomer";
import { BeneficiaryData } from "../../hooks/useBeneficiary";
import { bankingSounds } from "../../utils/bankingSounds";
import { AuthEngine, AuthorizeResponsePayload } from "../../services/AuthEngineAdapter";
import { FinancialAccounting } from "../../services/FinancialAccountingAdapter";
import { ReceiptShare, ReceiptShareRecord, VerificationResult } from "../../services/ReceiptShareAdapter";

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

export interface TimelineStepItem {
  id: string;
  label: string;
  backendStatus: string;
}

const LIVE_PROCESSING_STEPS: TimelineStepItem[] = [
  { id: "1", label: "✓ PIN Verified", backendStatus: "PIN_VERIFIED" },
  { id: "2", label: "✓ Operator Authentication Successful", backendStatus: "AUTH_SUCCESS" },
  { id: "3", label: "✓ Wallet Balance Verified", backendStatus: "WALLET_VERIFIED" },
  { id: "4", label: "✓ Retailer Wallet Debited", backendStatus: "WALLET_DEBITED" },
  { id: "5", label: "✓ Transaction Ledger Created", backendStatus: "TXN_CREATED" },
  { id: "6", label: "✓ Pricing & GST Locked", backendStatus: "PRICING_LOCKED" },
  { id: "7", label: "✓ Route Selected (HDFC DirectSwitch)", backendStatus: "ROUTE_SELECTED" },
  { id: "8", label: "✓ NPCI Switch Accepted", backendStatus: "NPCI_ACCEPTED" },
  { id: "9", label: "✓ Beneficiary Bank Processing", backendStatus: "BANK_PROCESSING" },
  { id: "10", label: "✓ CBS Response Received", backendStatus: "CBS_RESPONSE" },
  { id: "11", label: "✓ Beneficiary Account Credited", backendStatus: "ACCOUNT_CREDITED" },
  { id: "12", label: "✓ Ledger Updated", backendStatus: "LEDGER_UPDATED" },
  { id: "13", label: "✓ Transaction Completed", backendStatus: "SUCCESS" },
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
  const config = AuthEngine.getConfig();
  const pinLength = config.pinLength || 4;

  const [pinDigits, setPinDigits] = useState<string[]>(Array(pinLength).fill(""));
  const [revealedIndex, setRevealedIndex] = useState<number | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number>(AuthEngine.getAttemptsLeft());
  const [isLocked, setIsLocked] = useState<boolean>(AuthEngine.isLocked());
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [viewState, setViewState] = useState<"PIN_ENTRY" | "PROCESSING" | "SUCCESS_RECEIPT" | "FAILURE_RECEIPT">("PIN_ENTRY");
  const [activeTimelineStep, setActiveTimelineStep] = useState<number>(0);
  const [supervisorModalOpen, setSupervisorModalOpen] = useState<boolean>(false);
  const [supervisorPin, setSupervisorPin] = useState<string>("");
  const [supervisorError, setSupervisorError] = useState<string | null>(null);

  // EPIC-036 & EPIC-037 States
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState<boolean>(false);
  const [shareRecord, setShareRecord] = useState<ReceiptShareRecord | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Animated Counter States for Wallet & Beneficiary Limit
  const [animatedWallet, setAnimatedWallet] = useState<number>(customer?.walletBalance ?? 0);
  const [animatedLimit, setAnimatedLimit] = useState<number>(beneficiary?.monthlyRemaining ?? 0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (viewState === "PIN_ENTRY") {
      inputRefs.current[0]?.focus();
    }
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

      if (firstEmptyIndex === pinLength - 1 && config.autoSubmit) {
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

    const finResult = await FinancialAccounting.executeACIDTransaction({
      customerId: customer?.id,
      beneficiaryId: beneficiary?.id,
      beneficiaryName: beneficiary?.name,
      bankName: beneficiary?.bankName,
      maskedAccount: beneficiary?.maskedAccountNumber,
      amount,
      mode: transactionMode,
      pin: pinValue,
      walletBalance: customer?.walletBalance,
      beneficiaryMonthlyRemaining: beneficiary?.monthlyRemaining,
    });

    if (!finResult.success) {
      bankingSounds.playError();
      setIsShaking(true);
      const remaining = attemptsLeft - 1;
      setAttemptsLeft(remaining);
      setErrorMessage(finResult.errorMessage || "Authorization Failed");

      if (remaining <= 0) {
        setIsLocked(true);
      }

      setTimeout(() => {
        setIsShaking(false);
        setPinDigits(Array(pinLength).fill(""));
        setRevealedIndex(null);
        if (remaining > 0) {
          inputRefs.current[0]?.focus();
        }
      }, 600);
    } else {
      setViewState("PROCESSING");
      setErrorMessage(null);
      setActiveTimelineStep(1);
      bankingSounds.playWarning();

      let currentStepIdx = 1;
      const interval = setInterval(() => {
        currentStepIdx += 1;
        setActiveTimelineStep(currentStepIdx);
        bankingSounds.playWarning();

        if (currentStepIdx >= LIVE_PROCESSING_STEPS.length) {
          clearInterval(interval);
          bankingSounds.playSuccess();

          // Generate EPIC-036 Secure Token & EPIC-037 Cryptographic Signature
          const share = ReceiptShare.createShareToken(finResult.transactionId, finResult.referenceNo, amount);
          setShareRecord(share);
          const verify = ReceiptShare.verifyReceipt(share.receiptToken);
          setVerificationResult(verify);

          setTimeout(() => {
            setViewState("SUCCESS_RECEIPT");
          }, 300);
        }
      }, 120);
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

  const utr = "421809124012";
  const refNo = "REF-89120412";
  const txnId = "TXN-98124012";
  const timestamp = "07-Aug-2026 06:08 PM";
  const publicShareUrl = shareRecord ? ReceiptShare.getPublicReceiptUrl(shareRecord.receiptToken) : `https://receipt.pay2pay.in/r/P2P-4F8A9B2C`;

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
                  <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "13px" }}>{customer?.name || "Customer"}</Typography>
                </Stack>

                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Beneficiary</Typography>
                  <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "13px" }}>{beneficiary?.name || "Beneficiary"}</Typography>
                </Stack>

                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Transaction Mode</Typography>
                  <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "12px" }}>{modeDisplay}</Typography>
                </Stack>

                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Bank</Typography>
                  <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "12px" }}>{beneficiary?.bankName || "Axis Bank"}</Typography>
                </Stack>

                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Account</Typography>
                  <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontFamily: "monospace", fontSize: "12px" }}>{beneficiary?.maskedAccountNumber || "XXXX3210"}</Typography>
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

                  {/* 4 OTP STYLE PIN BOXES */}
                  <Box
                    onPaste={handlePaste}
                    sx={{
                      display: "flex",
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

                      return (
                        <Box
                          key={idx}
                          onClick={() => inputRefs.current[idx]?.focus()}
                          sx={{
                            width: 60,
                            height: 60,
                            borderRadius: "12px",
                            bgcolor: digit ? "rgba(37, 99, 235, 0.25)" : "rgba(8, 17, 31, 0.9)",
                            border: errorMessage ? "2px solid #EF4444" : digit ? "2px solid #2563EB" : "1px solid rgba(255, 255, 255, 0.15)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#FFFFFF",
                            fontSize: "30px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {displayChar}
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

                  <Typography sx={{ color: "rgba(255, 255, 255, 0.40)", fontSize: "11px", textAlign: "center", mb: 2 }}>
                    Forgot PIN? (Contact Supervisor)
                  </Typography>
                </Box>

                <Stack spacing={1} sx={{ width: "100%" }}>
                  <Button
                    fullWidth
                    variant="contained"
                    disabled={currentPin.length < pinLength || isLocked}
                    onClick={() => executeAuthorizationPipeline(currentPin)}
                    sx={{
                      height: 50,
                      borderRadius: "12px",
                      fontWeight: 900,
                      fontSize: "14.5px",
                      bgcolor: "#2563EB",
                      color: "#FFFFFF",
                      boxShadow: "0 4px 20px rgba(37, 99, 235, 0.4)",
                    }}
                  >
                    Authorize ₹{totalPayable.toLocaleString()} (Ctrl+Enter)
                  </Button>

                  {onBack && (
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={onBack}
                      startIcon={<ArrowBackIcon />}
                      sx={{
                        height: 38,
                        borderRadius: "10px",
                        fontWeight: 700,
                        fontSize: "12px",
                        color: "rgba(255, 255, 255, 0.70)",
                        borderColor: "rgba(255, 255, 255, 0.15)",
                      }}
                    >
                      Back
                    </Button>
                  )}
                </Stack>
              </Box>
            )}

            {/* VIEW 2: LIVE TRANSACTION PROCESSING TIMELINE */}
            {viewState === "PROCESSING" && (
              <Box sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <Box>
                  <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "17px", mb: 0.5 }}>
                    Processing Transaction...
                  </Typography>
                  <Typography sx={{ color: "#60A5FA", fontWeight: 700, fontSize: "11.5px", mb: 1.5 }}>
                    LIVE BACKEND STATUS PIPELINE
                  </Typography>

                  <Box sx={{ overflow: "hidden" }}>
                    <Stack spacing={0.75}>
                      {LIVE_PROCESSING_STEPS.slice(0, 10).map((step, idx) => {
                        const stepNum = idx + 1;
                        const isDone = stepNum < activeTimelineStep;
                        const isCurrent = stepNum === activeTimelineStep;
                        return (
                          <Paper
                            key={step.id}
                            elevation={0}
                            sx={{
                              p: 1,
                              borderRadius: "6px",
                              bgcolor: isCurrent ? "rgba(37, 99, 235, 0.2)" : isDone ? "rgba(34, 197, 94, 0.1)" : "rgba(255, 255, 255, 0.02)",
                              border: isCurrent ? "1px solid #3B82F6" : isDone ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(255, 255, 255, 0.05)",
                            }}
                          >
                            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                              {isDone ? (
                                <CheckCircleIcon sx={{ color: "#4ADE80", fontSize: 14 }} />
                              ) : isCurrent ? (
                                <SyncIcon sx={{ color: "#60A5FA", fontSize: 14, animation: "spin 0.8s linear infinite" }} />
                              ) : (
                                <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "rgba(255, 255, 255, 0.3)", ml: 0.5 }} />
                              )}
                              <Typography sx={{ fontSize: "11px", fontWeight: isCurrent ? 800 : 600, color: isCurrent ? "#60A5FA" : isDone ? "#4ADE80" : "rgba(255, 255, 255, 0.4)" }}>
                                {step.label}
                              </Typography>
                            </Stack>
                          </Paper>
                        );
                      })}
                    </Stack>
                  </Box>
                </Box>
              </Box>
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
                      <Typography sx={{ fontSize: "9px", color: "#4B5563" }}>Name: <span style={{ color: "#111827", fontWeight: 700 }}>Rajesh Sharma</span></Typography>
                      <Typography sx={{ fontSize: "9px", color: "#4B5563" }}>Mobile: <span style={{ color: "#111827", fontWeight: 700 }}>+91 98765 43210</span></Typography>
                      <Typography sx={{ fontSize: "9px", color: "#4B5563" }}>ID: <span style={{ color: "#2563EB", fontWeight: 700 }}>RET-DELHI-001</span></Typography>
                    </Paper>
                  </Box>

                  {/* BENEFICIARY DETAILS */}
                  <Paper elevation={0} sx={{ p: 0.75, mb: 0.75, borderRadius: "6px", bgcolor: "#F9FAFB", border: "1px solid #E5E7EB" }}>
                    <Typography sx={{ color: "#2563EB", fontWeight: 800, fontSize: "8.5px", textTransform: "uppercase", mb: 0.25 }}>BENEFICIARY DETAILS</Typography>
                    <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                      <Typography sx={{ fontSize: "9px", color: "#111827", fontWeight: 700 }}>{beneficiary?.name || "Beneficiary"}</Typography>
                      <Typography sx={{ fontSize: "9px", color: "#2563EB", fontWeight: 700 }}>{beneficiary?.bankName || "Axis Bank"}</Typography>
                    </Stack>
                    <Stack direction="row" sx={{ justifyContent: "space-between", mt: 0.25 }}>
                      <Typography sx={{ fontSize: "9px", color: "#4B5563", fontFamily: "monospace" }}>XXXX XXXX 3210</Typography>
                      <Typography sx={{ fontSize: "9px", color: "#4B5563" }}>IFSC: {beneficiary?.ifsc || "UTIB0000123"}</Typography>
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

      {/* SUPERVISOR OVERRIDE MODAL */}
      <Dialog open={supervisorModalOpen} onClose={() => setSupervisorModalOpen(false)}>
        <DialogTitle sx={{ bgcolor: "#0F172A", color: "#FFFFFF", fontWeight: 900 }}>
          🔒 Supervisor Lockout Override
        </DialogTitle>
        <DialogContent sx={{ bgcolor: "#0F172A", pt: 2 }}>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.70)", fontSize: "13px", mb: 2 }}>
            Enter Supervisor Master PIN ('9999') to immediately reset attempts and unlock the terminal.
          </Typography>
          {supervisorError && (
            <Typography sx={{ color: "#EF4444", fontSize: "12px", fontWeight: 800, mb: 1 }}>
              {supervisorError}
            </Typography>
          )}
          <TextField
            fullWidth
            type="password"
            placeholder="Supervisor PIN (9999)"
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

      {/* SECURE PUBLIC RECEIPT SHARE PORTAL MODAL (EPIC-036) */}
      <Dialog open={shareModalOpen} onClose={() => setShareModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ bgcolor: "#0F172A", color: "#FFFFFF", fontWeight: 900 }}>
          🌐 Enterprise Receipt Share Portal
        </DialogTitle>
        <DialogContent sx={{ bgcolor: "#0F172A", pt: 2, textAlign: "center" }}>
          {/* Public Receipt Share Link Card */}
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              mb: 2,
              borderRadius: "8px",
              bgcolor: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography sx={{ color: "#60A5FA", fontFamily: "monospace", fontSize: "11px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {publicShareUrl}
            </Typography>
            <Tooltip title={copiedLink ? "Copied!" : "Copy Public Link"}>
              <Button
                size="small"
                variant="contained"
                onClick={copyShareUrlToClipboard}
                startIcon={<ContentCopyIcon sx={{ fontSize: 12 }} />}
                sx={{ height: 28, fontSize: "10px", fontWeight: 800, bgcolor: "#2563EB", ml: 1 }}
              >
                {copiedLink ? "Copied!" : "Copy"}
              </Button>
            </Tooltip>
          </Paper>

          {/* High-Res 1080x1920 PNG Receipt Card Preview */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: "12px",
              bgcolor: "#FFFFFF",
              color: "#111827",
              textAlign: "left",
              mb: 2,
            }}
          >
            <Typography sx={{ fontWeight: 900, fontSize: "15px", color: "#2563EB" }}>Pay2Pay Enterprise</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: "10.5px", color: "#4B5563" }}>Domestic Money Transfer (DMT)</Typography>
            <Typography sx={{ fontWeight: 900, fontSize: "13px", color: "#16A34A", mt: 0.5 }}>SUCCESS · Money Transferred</Typography>
            <Divider sx={{ my: 1 }} />
            <Typography sx={{ fontSize: "10.5px", color: "#4B5563" }}>Token: {shareRecord?.receiptToken || "P2P-4F8A9B2C"}</Typography>
            <Typography sx={{ fontSize: "10.5px", color: "#4B5563" }}>Ref: {refNo}</Typography>
            <Typography sx={{ fontSize: "10.5px", color: "#4B5563" }}>UTR: {utr}</Typography>
            <Typography sx={{ fontSize: "10.5px", color: "#4B5563" }}>Mode: {transactionMode}</Typography>
            <Divider sx={{ my: 1 }} />
            <Typography sx={{ fontSize: "10.5px", color: "#4B5563" }}>Retailer: Rajesh Sharma (+91 98765 43210)</Typography>
            <Typography sx={{ fontSize: "10.5px", color: "#4B5563" }}>Beneficiary: {beneficiary?.name || "Beneficiary"}</Typography>
            <Typography sx={{ fontSize: "10.5px", color: "#4B5563" }}>Bank: {beneficiary?.bankName || "Axis Bank"}</Typography>
            <Typography sx={{ fontSize: "10.5px", color: "#4B5563" }}>Account: XXXX XXXX 3210</Typography>
            <Divider sx={{ my: 1 }} />
            <Typography sx={{ fontSize: "10.5px", color: "#4B5563" }}>Transfer Amount: ₹{amount.toLocaleString()}.00</Typography>
            <Typography sx={{ fontSize: "10.5px", color: "#4B5563" }}>Convenience Fee: ₹{charges}.00</Typography>
            <Typography sx={{ fontSize: "10.5px", color: "#4B5563" }}>GST (18%): ₹{gst}.00</Typography>
            <Typography sx={{ fontSize: "12px", fontWeight: 900, color: "#2563EB", mt: 0.5 }}>TOTAL PAID: ₹{totalAmountPaid.toLocaleString()}.00</Typography>
            <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
              <QrCode2Icon sx={{ fontSize: 56, color: "#111827" }} />
            </Box>
          </Paper>

          {/* Direct Share Options */}
          <Stack direction="row" spacing={1} sx={{ justifyContent: "center" }}>
            <IconButton onClick={() => alert(`Shared Link (${publicShareUrl}) via WhatsApp`)} sx={{ color: "#25D366" }}>
              <WhatsAppIcon />
            </IconButton>
            <IconButton onClick={() => alert(`Shared Link (${publicShareUrl}) via Telegram`)} sx={{ color: "#0088cc" }}>
              <TelegramIcon />
            </IconButton>
            <IconButton onClick={() => alert(`Shared Link (${publicShareUrl}) via Email`)} sx={{ color: "#EA4335" }}>
              <EmailIcon />
            </IconButton>
            <IconButton onClick={() => alert(`Shared Link (${publicShareUrl}) via SMS`)} sx={{ color: "#34A853" }}>
              <SmsIcon />
            </IconButton>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ bgcolor: "#0F172A", p: 2 }}>
          <Button onClick={() => setShareModalOpen(false)} sx={{ color: "rgba(255, 255, 255, 0.6)" }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
