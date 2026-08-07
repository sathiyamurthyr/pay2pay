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
import { CustomerData } from "../../hooks/useCustomer";
import { BeneficiaryData } from "../../hooks/useBeneficiary";
import { bankingSounds } from "../../utils/bankingSounds";
import { AuthEngine, AuthorizeResponsePayload } from "../../services/AuthEngineAdapter";
import { FinancialAccounting } from "../../services/FinancialAccountingAdapter";

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
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);

  // Animated Counter States for Wallet & Beneficiary Limit
  const [animatedWallet, setAnimatedWallet] = useState<number>(customer?.walletBalance ?? 124500);
  const [animatedLimit, setAnimatedLimit] = useState<number>(beneficiary?.monthlyRemaining ?? 80000);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (viewState === "PIN_ENTRY") {
      inputRefs.current[0]?.focus();
    }
  }, [viewState]);

  // 60 FPS Particle Confetti System (Green, Blue, Gold - Max 150 Particles)
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

    const colors = ["#4ADE80", "#3B82F6", "#FBBF24"];
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
        p.vy += 0.2; // Gravity
        p.alpha = Math.max(0, 1 - elapsed / 2000); // Fade out over 2000ms

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
      const targetWallet = (customer?.walletBalance ?? 124500) - totalPayable;
      const targetLimit = Math.max(0, (beneficiary?.monthlyRemaining ?? 80000) - amount);

      const duration = 1500;
      const startWallet = customer?.walletBalance ?? 124500;
      const startLimit = beneficiary?.monthlyRemaining ?? 80000;
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
      {/* ── PROFESSIONAL PAGE HEADER ── */}
      <Box sx={{ mb: 1.5, textAlign: "left", width: "100%" }}>
        <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "22px", letterSpacing: "-0.2px" }}>
          Transaction Authorization & Receipt
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
          {/* ── LEFT PANEL (50%): TRANSACTION SUMMARY & ANIMATED BALANCES ── */}
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
                  <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "13px" }}>{customer?.name || "Ramesh Kumar"}</Typography>
                </Stack>

                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Beneficiary</Typography>
                  <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "13px" }}>{beneficiary?.name || "Aman Ramesh"}</Typography>
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

                {/* ANIMATED COUNTERS FOR WALLET & BENEFICIARY LIMIT */}
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

          {/* ── RIGHT PANEL (50%): OPERATOR PIN / LIVE TIMELINE / PREMIUM SUCCESS EXPERIENCE ── */}
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

            {/* VIEW 3: PREMIUM ENTERPRISE SUCCESS EXPERIENCE & RECEIPT */}
            {viewState === "SUCCESS_RECEIPT" && (
              <Box
                sx={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  overflow: "hidden",
                  animation: "slideUp 0.4s ease-out",
                  "@keyframes slideUp": {
                    "0%": { opacity: 0, transform: "translateY(20px)" },
                    "100%": { opacity: 1, transform: "translateY(0)" },
                  },
                }}
              >
                <Box sx={{ overflow: "hidden" }}>
                  {/* ANIMATED LARGE GREEN SUCCESS CHECKMARK */}
                  <Box sx={{ textAlign: "center", my: 0.5 }}>
                    <CheckCircleIcon
                      sx={{
                        color: "#4ADE80",
                        fontSize: 48,
                        animation: "scaleCheck 0.4s ease-out",
                        "@keyframes scaleCheck": {
                          "0%": { transform: "scale(0.8)" },
                          "50%": { transform: "scale(1.2)" },
                          "100%": { transform: "scale(1.0)" },
                        },
                      }}
                    />
                    <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "16px", mt: 0.25 }}>
                      ₹{amount.toLocaleString()} Transferred Successfully
                    </Typography>
                    <Typography sx={{ color: "#4ADE80", fontWeight: 700, fontSize: "11px" }}>
                      Transaction Settled & Committed
                    </Typography>
                  </Box>

                  <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", mb: 1 }} />

                  {/* SECTION 1 & 2: TRANSACTION & RETAILER DETAILS */}
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mb: 1 }}>
                    <Paper elevation={0} sx={{ p: 1, borderRadius: "6px", bgcolor: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                      <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "9.5px", textTransform: "uppercase", mb: 0.5 }}>TRANSACTION DETAILS</Typography>
                      <Typography sx={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.6)" }}>Txn ID: <span style={{ color: "#FFF", fontWeight: 700 }}>{txnId}</span></Typography>
                      <Typography sx={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.6)" }}>Ref No: <span style={{ color: "#60A5FA", fontWeight: 700 }}>{refNo}</span></Typography>
                      <Typography sx={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.6)" }}>UTR: <span style={{ color: "#4ADE80", fontWeight: 800 }}>{utr}</span></Typography>
                    </Paper>

                    <Paper elevation={0} sx={{ p: 1, borderRadius: "6px", bgcolor: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                      <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "9.5px", textTransform: "uppercase", mb: 0.5 }}>BENEFICIARY & MODE</Typography>
                      <Typography sx={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.6)" }}>Name: <span style={{ color: "#FFF", fontWeight: 700 }}>{beneficiary?.name || "Aman Ramesh"}</span></Typography>
                      <Typography sx={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.6)" }}>Bank: <span style={{ color: "#60A5FA", fontWeight: 700 }}>{beneficiary?.bankName || "Axis Bank"}</span></Typography>
                      <Typography sx={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.6)" }}>Mode: <span style={{ color: "#FFF", fontWeight: 700 }}>{modeDisplay}</span></Typography>
                    </Paper>
                  </Box>

                  {/* SECTION 4: PAYMENT SUMMARY */}
                  <Paper elevation={0} sx={{ p: 1, mb: 1, borderRadius: "6px", bgcolor: "rgba(37, 99, 235, 0.1)", border: "1px solid rgba(37, 99, 235, 0.25)" }}>
                    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                      <Box>
                        <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "9.5px" }}>TOTAL AMOUNT PAID</Typography>
                        <Typography sx={{ fontWeight: 900, color: "#3B82F6", fontSize: "18px" }}>₹{totalAmountPaid.toLocaleString()}.00</Typography>
                      </Box>
                      <Box sx={{ textAlign: "right" }}>
                        <Chip label="SETTLED" size="small" sx={{ bgcolor: "rgba(34, 197, 94, 0.2)", color: "#4ADE80", fontWeight: 900, fontSize: "10px", height: 20 }} />
                        <Typography sx={{ fontSize: "9px", color: "rgba(255, 255, 255, 0.5)", mt: 0.25 }}>{timestamp}</Typography>
                      </Box>
                    </Stack>
                  </Paper>

                  {/* CENTER ALIGNED QR CODE */}
                  <Box sx={{ textAlign: "center", my: 0.25 }}>
                    <QrCode2Icon sx={{ fontSize: 36, color: "#FFFFFF" }} />
                    <Typography sx={{ color: "rgba(255, 255, 255, 0.4)", fontSize: "8.5px" }}>Scan to Verify Transaction</Typography>
                  </Box>
                </Box>

                {/* 5 ACTION BUTTONS: DOWNLOAD, PRINT, SHARE, NEW TRANSFER, DASHBOARD */}
                <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                  <Stack direction="row" spacing={0.5}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<DownloadIcon sx={{ fontSize: 13 }} />}
                      onClick={() => {
                        bankingSounds.playSuccess();
                        alert(`Receipt PNG/PDF Downloaded successfully for UTR: ${utr}`);
                      }}
                      sx={{ height: 32, borderRadius: "6px", fontWeight: 800, fontSize: "10.5px", bgcolor: "#2563EB" }}
                    >
                      Download
                    </Button>

                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<PrintIcon sx={{ fontSize: 13 }} />}
                      onClick={() => window.print()}
                      sx={{ height: 32, borderRadius: "6px", fontWeight: 800, fontSize: "10.5px", color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.2)" }}
                    >
                      Print
                    </Button>

                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<ShareIcon sx={{ fontSize: 13 }} />}
                      onClick={() => setShareModalOpen(true)}
                      sx={{ height: 32, borderRadius: "6px", fontWeight: 800, fontSize: "10.5px", color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.2)" }}
                    >
                      Share
                    </Button>
                  </Stack>

                  <Stack direction="row" spacing={0.5}>
                    <Button
                      fullWidth
                      variant="contained"
                      color="success"
                      startIcon={<AddIcon sx={{ fontSize: 13 }} />}
                      onClick={onAuthorize}
                      sx={{ height: 34, borderRadius: "6px", fontWeight: 900, fontSize: "11.5px" }}
                    >
                      + New Transfer
                    </Button>

                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<DashboardIcon sx={{ fontSize: 13 }} />}
                      onClick={onAuthorize}
                      sx={{ height: 34, borderRadius: "6px", fontWeight: 800, fontSize: "11.5px", color: "#93C5FD", borderColor: "rgba(147, 197, 253, 0.3)" }}
                    >
                      Go Dashboard
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            )}
          </Paper>
        </Box>
      </Paper>

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

      {/* SHARE HIGH-RES CUSTOMER RECEIPT IMAGE MODAL */}
      <Dialog open={shareModalOpen} onClose={() => setShareModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ bgcolor: "#0F172A", color: "#FFFFFF", fontWeight: 900 }}>
          📱 Share High-Res Receipt Image (1080x1920)
        </DialogTitle>
        <DialogContent sx={{ bgcolor: "#0F172A", pt: 2, textAlign: "center" }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: "12px",
              bgcolor: "#FFFFFF",
              color: "#0F172A",
              textAlign: "left",
              mb: 2,
            }}
          >
            <Typography sx={{ fontWeight: 900, fontSize: "15px", color: "#2563EB" }}>Pay2Pay Enterprise</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: "10.5px", color: "#64748B" }}>Domestic Money Transfer (DMT)</Typography>
            <Typography sx={{ fontWeight: 900, fontSize: "13px", color: "#16A34A", mt: 0.5 }}>TRANSACTION SUCCESSFUL</Typography>
            <Divider sx={{ my: 1 }} />
            <Typography sx={{ fontSize: "10.5px", color: "#64748B" }}>Txn ID: {txnId}</Typography>
            <Typography sx={{ fontSize: "10.5px", color: "#64748B" }}>UTR: {utr}</Typography>
            <Typography sx={{ fontSize: "10.5px", color: "#64748B" }}>Ref: {refNo}</Typography>
            <Typography sx={{ fontSize: "10.5px", color: "#64748B" }}>Mode: {transactionMode}</Typography>
            <Divider sx={{ my: 1 }} />
            <Typography sx={{ fontSize: "10.5px", color: "#64748B" }}>Retailer: Rajesh Sharma (+91 98765 43210)</Typography>
            <Typography sx={{ fontSize: "10.5px", color: "#64748B" }}>Beneficiary: {beneficiary?.name || "Aman Ramesh"}</Typography>
            <Typography sx={{ fontSize: "10.5px", color: "#64748B" }}>Bank: {beneficiary?.bankName || "Axis Bank"}</Typography>
            <Typography sx={{ fontSize: "10.5px", color: "#64748B" }}>Account: XXXX XXXX 3210</Typography>
            <Divider sx={{ my: 1 }} />
            <Typography sx={{ fontSize: "10.5px", color: "#64748B" }}>Transfer Amount: ₹{amount.toLocaleString()}.00</Typography>
            <Typography sx={{ fontSize: "10.5px", color: "#64748B" }}>Convenience Fee: ₹{charges}.00</Typography>
            <Typography sx={{ fontSize: "10.5px", color: "#64748B" }}>GST (18%): ₹{gst}.00</Typography>
            <Typography sx={{ fontSize: "12px", fontWeight: 900, color: "#2563EB", mt: 0.5 }}>TOTAL PAID: ₹{totalAmountPaid.toLocaleString()}.00</Typography>
            <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
              <QrCode2Icon sx={{ fontSize: 56, color: "#0F172A" }} />
            </Box>
          </Paper>

          <Stack direction="row" spacing={1} sx={{ justifyContent: "center" }}>
            <IconButton onClick={() => alert("Shared Receipt Image via WhatsApp")} sx={{ color: "#25D366" }}>
              <WhatsAppIcon />
            </IconButton>
            <IconButton onClick={() => alert("Shared Receipt Image via Telegram")} sx={{ color: "#0088cc" }}>
              <TelegramIcon />
            </IconButton>
            <IconButton onClick={() => alert("Shared Receipt Image via Email")} sx={{ color: "#EA4335" }}>
              <EmailIcon />
            </IconButton>
            <IconButton onClick={() => alert("Shared Receipt Image via SMS")} sx={{ color: "#34A853" }}>
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
