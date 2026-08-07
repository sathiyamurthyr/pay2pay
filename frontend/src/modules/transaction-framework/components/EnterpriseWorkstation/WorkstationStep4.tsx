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

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (viewState === "PIN_ENTRY") {
      inputRefs.current[0]?.focus();
    }
  }, [viewState]);

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
  const timestamp = new Date().toLocaleString();

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1200,
        mx: "auto",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        boxSizing: "border-box",
        px: 1,
      }}
    >
      {/* ── PROFESSIONAL PAGE HEADER ── */}
      <Box sx={{ mb: 2, textAlign: "left", width: "100%" }}>
        <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "22px", letterSpacing: "-0.2px" }}>
          Transaction Authorization & Customer Receipt
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
          bgcolor: "rgba(18, 27, 48, 0.85)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          p: 3,
          boxSizing: "border-box",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "55% 45%",
            },
            gap: 3,
            alignItems: "stretch",
          }}
        >
          {/* ── LEFT PANEL (55%): TRANSACTION SUMMARY ── */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: "14px",
              bgcolor: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", mb: 2 }}>
                TRANSACTION SUMMARY & AUDIT PREVIEW
              </Typography>

              <Stack spacing={1.25}>
                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Customer</Typography>
                  <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "14px" }}>{customer?.name || "Ramesh Kumar"}</Typography>
                </Stack>

                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Beneficiary</Typography>
                  <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "14px" }}>{beneficiary?.name || "Aman Ramesh"}</Typography>
                </Stack>

                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Transaction Mode</Typography>
                  <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "13px" }}>{modeDisplay}</Typography>
                </Stack>

                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Bank</Typography>
                  <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "13px" }}>{beneficiary?.bankName || "Axis Bank"}</Typography>
                </Stack>

                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Account</Typography>
                  <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontFamily: "monospace", fontSize: "13px" }}>{beneficiary?.maskedAccountNumber || "XXXX3210"}</Typography>
                </Stack>

                <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", my: 0.25 }} />

                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Transfer Amount</Typography>
                  <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "16px" }}>₹{amount.toLocaleString()}</Typography>
                </Stack>

                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Convenience Fee</Typography>
                  <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "13px" }}>+ ₹{charges}</Typography>
                </Stack>

                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>GST (18%)</Typography>
                  <Typography sx={{ fontWeight: 800, color: "#93C5FD", fontSize: "13px" }}>+ ₹{gst}</Typography>
                </Stack>

                <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", my: 0.25 }} />

                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.80)", fontWeight: 700, fontSize: "13px" }}>TOTAL AMOUNT PAID</Typography>
                  <Typography sx={{ fontWeight: 900, color: "#3B82F6", fontSize: "17px" }}>₹{totalAmountPaid.toLocaleString()}</Typography>
                </Stack>
              </Stack>
            </Box>

            {/* Compact Ready Banner */}
            <Paper
              elevation={0}
              sx={{
                p: 1.25,
                mt: 2,
                borderRadius: "8px",
                bgcolor: viewState === "SUCCESS_RECEIPT" ? "rgba(74, 222, 128, 0.2)" : "rgba(74, 222, 128, 0.15)",
                border: "1px solid rgba(74, 222, 128, 0.3)",
                color: "#4ADE80",
                fontWeight: 800,
                fontSize: "12.5px",
                textAlign: "center",
              }}
            >
              {viewState === "SUCCESS_RECEIPT"
                ? `🟢 SETTLED SUCCESSFULLY · UTR: ${utr}`
                : `🟢 Ready to Execute · Mode : ${transactionMode} · ETA : 1.2 sec · Route : HDFC DirectSwitch`}
            </Paper>
          </Paper>

          {/* ── RIGHT PANEL (45%): OPERATOR PIN / LIVE TIMELINE / CUSTOMER RECEIPT ENGINE ── */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: "14px",
              bgcolor: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxSizing: "border-box",
            }}
          >
            {/* VIEW 1: PIN ENTRY */}
            {viewState === "PIN_ENTRY" && (
              <Box sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <Box sx={{ width: "100%" }}>
                  <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "20px", mb: 0.5 }}>
                    Operator PIN Authorization
                  </Typography>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px", mb: 2.5 }}>
                    Enter your secure 4-digit Operator PIN to authorize this transaction.
                  </Typography>

                  {/* Error Callout */}
                  {errorMessage && (
                    <Paper
                      elevation={0}
                      sx={{
                        p: 1.25,
                        mb: 2,
                        borderRadius: "8px",
                        bgcolor: "rgba(239, 68, 68, 0.15)",
                        border: "1px solid #EF4444",
                        color: "#EF4444",
                        fontWeight: 800,
                        fontSize: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Typography sx={{ fontSize: "12px", fontWeight: 800 }}>{errorMessage}</Typography>
                      {isLocked && (
                        <Button
                          size="small"
                          variant="contained"
                          color="error"
                          onClick={() => setSupervisorModalOpen(true)}
                          sx={{ height: 26, fontSize: "10px", fontWeight: 900 }}
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
                      "@keyframes shake": {
                        "0%, 100%": { transform: "translateX(0)" },
                        "20%, 60%": { transform: "translateX(-8px)" },
                        "40%, 80%": { transform: "translateX(8px)" },
                      },
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
                            width: 64,
                            height: 64,
                            borderRadius: "12px",
                            bgcolor: digit ? "rgba(37, 99, 235, 0.25)" : "rgba(8, 17, 31, 0.9)",
                            border: errorMessage ? "2px solid #EF4444" : digit ? "2px solid #2563EB" : "1px solid rgba(255, 255, 255, 0.15)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#FFFFFF",
                            fontSize: "34px",
                            fontWeight: 700,
                            boxShadow: digit ? "0 4px 16px rgba(37, 99, 235, 0.3)" : "none",
                            transition: "all 150ms ease",
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

                  <Typography sx={{ color: "rgba(255, 255, 255, 0.40)", fontSize: "11.5px", textAlign: "center", mb: 2.5 }}>
                    Forgot PIN? (Contact Supervisor)
                  </Typography>
                </Box>

                <Stack spacing={1.25} sx={{ width: "100%" }}>
                  <Button
                    fullWidth
                    variant="contained"
                    disabled={currentPin.length < pinLength || isLocked}
                    onClick={() => executeAuthorizationPipeline(currentPin)}
                    sx={{
                      height: 54,
                      borderRadius: "12px",
                      fontWeight: 900,
                      fontSize: "15px",
                      bgcolor: "#2563EB",
                      color: "#FFFFFF",
                      boxShadow: "0 4px 20px rgba(37, 99, 235, 0.4)",
                      "&.Mui-disabled": {
                        bgcolor: "rgba(255, 255, 255, 0.12)",
                        color: "rgba(255, 255, 255, 0.4)",
                      },
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
                        height: 40,
                        borderRadius: "10px",
                        fontWeight: 700,
                        fontSize: "12.5px",
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
                  <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "18px", mb: 0.5 }}>
                    Processing Transaction...
                  </Typography>
                  <Typography sx={{ color: "#60A5FA", fontWeight: 700, fontSize: "12px", mb: 2 }}>
                    LIVE BACKEND STATUS PIPELINE
                  </Typography>

                  <Box sx={{ maxHeight: 360, overflowY: "auto", pr: 0.5 }}>
                    <Stack spacing={1}>
                      {LIVE_PROCESSING_STEPS.map((step, idx) => {
                        const stepNum = idx + 1;
                        const isDone = stepNum < activeTimelineStep;
                        const isCurrent = stepNum === activeTimelineStep;
                        return (
                          <Paper
                            key={step.id}
                            elevation={0}
                            sx={{
                              p: 1.25,
                              borderRadius: "8px",
                              bgcolor: isCurrent ? "rgba(37, 99, 235, 0.2)" : isDone ? "rgba(34, 197, 94, 0.1)" : "rgba(255, 255, 255, 0.02)",
                              border: isCurrent ? "1px solid #3B82F6" : isDone ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(255, 255, 255, 0.05)",
                            }}
                          >
                            <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                              {isDone ? (
                                <CheckCircleIcon sx={{ color: "#4ADE80", fontSize: 16 }} />
                              ) : isCurrent ? (
                                <SyncIcon sx={{ color: "#60A5FA", fontSize: 16, animation: "spin 0.8s linear infinite" }} />
                              ) : (
                                <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "rgba(255, 255, 255, 0.3)", ml: 0.5 }} />
                              )}
                              <Typography sx={{ fontSize: "12px", fontWeight: isCurrent ? 800 : 600, color: isCurrent ? "#60A5FA" : isDone ? "#4ADE80" : "rgba(255, 255, 255, 0.4)" }}>
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

            {/* VIEW 3: REDESIGNED CUSTOMER COPY RECEIPT */}
            {viewState === "SUCCESS_RECEIPT" && (
              <Box sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <Box sx={{ maxHeight: 420, overflowY: "auto", pr: 0.5 }}>
                  {/* Customer Receipt Header */}
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      mb: 2,
                      borderRadius: "12px",
                      bgcolor: "rgba(34, 197, 94, 0.15)",
                      border: "1px solid rgba(34, 197, 94, 0.4)",
                      textAlign: "center",
                    }}
                  >
                    <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "16px" }}>
                      Pay2Pay Enterprise
                    </Typography>
                    <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "12px", mb: 1 }}>
                      Domestic Money Transfer (DMT)
                    </Typography>
                    <CheckCircleIcon sx={{ color: "#4ADE80", fontSize: 32, mb: 0.5 }} />
                    <Typography sx={{ fontWeight: 900, color: "#4ADE80", fontSize: "15px" }}>
                      Transaction Successful
                    </Typography>
                  </Paper>

                  {/* Customer Receipt Body Details */}
                  <Paper elevation={0} sx={{ p: 2, borderRadius: "10px", bgcolor: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <Stack spacing={1}>
                      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                        <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "11px" }}>Transaction ID</Typography>
                        <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontFamily: "monospace", fontSize: "12px" }}>{txnId}</Typography>
                      </Stack>
                      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                        <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "11px" }}>Reference Number</Typography>
                        <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontFamily: "monospace", fontSize: "12px" }}>{refNo}</Typography>
                      </Stack>
                      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                        <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "11px" }}>UTR Number</Typography>
                        <Typography sx={{ fontWeight: 800, color: "#4ADE80", fontFamily: "monospace", fontSize: "12px" }}>{utr}</Typography>
                      </Stack>
                      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                        <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "11px" }}>Date & Time</Typography>
                        <Typography sx={{ fontWeight: 700, color: "#FFFFFF", fontSize: "11px" }}>{timestamp}</Typography>
                      </Stack>
                      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                        <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "11px" }}>Transaction Mode</Typography>
                        <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "11px" }}>{modeDisplay}</Typography>
                      </Stack>

                      <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", my: 0.5 }} />

                      {/* Retailer Details */}
                      <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "10.5px", textTransform: "uppercase" }}>RETAILER DETAILS</Typography>
                      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                        <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "11px" }}>Retailer Name</Typography>
                        <Typography sx={{ fontWeight: 700, color: "#FFFFFF", fontSize: "11px" }}>Rajesh Sharma</Typography>
                      </Stack>
                      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                        <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "11px" }}>Retailer Mobile</Typography>
                        <Typography sx={{ fontWeight: 700, color: "#FFFFFF", fontSize: "11px" }}>+91 98765 43210</Typography>
                      </Stack>

                      <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", my: 0.5 }} />

                      {/* Beneficiary Details */}
                      <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "10.5px", textTransform: "uppercase" }}>BENEFICIARY DETAILS</Typography>
                      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                        <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "11px" }}>Beneficiary Name</Typography>
                        <Typography sx={{ fontWeight: 700, color: "#FFFFFF", fontSize: "11px" }}>{beneficiary?.name || "Aman Ramesh"}</Typography>
                      </Stack>
                      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                        <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "11px" }}>Bank Name</Typography>
                        <Typography sx={{ fontWeight: 700, color: "#60A5FA", fontSize: "11px" }}>{beneficiary?.bankName || "Axis Bank"}</Typography>
                      </Stack>
                      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                        <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "11px" }}>Account Number</Typography>
                        <Typography sx={{ fontWeight: 700, color: "#FFFFFF", fontFamily: "monospace", fontSize: "11px" }}>XXXX XXXX 3210</Typography>
                      </Stack>
                      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                        <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "11px" }}>IFSC Code</Typography>
                        <Typography sx={{ fontWeight: 700, color: "#60A5FA", fontSize: "11px" }}>{beneficiary?.ifsc || "UTIB0000123"}</Typography>
                      </Stack>

                      <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", my: 0.5 }} />

                      {/* Transfer Financial Details */}
                      <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "10.5px", textTransform: "uppercase" }}>TRANSFER DETAILS</Typography>
                      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                        <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "11px" }}>Transfer Amount</Typography>
                        <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "12px" }}>₹{amount.toLocaleString()}.00</Typography>
                      </Stack>
                      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                        <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "11px" }}>Convenience Fee</Typography>
                        <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "12px" }}>+ ₹{charges}.00</Typography>
                      </Stack>
                      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                        <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "11px" }}>GST (18%)</Typography>
                        <Typography sx={{ fontWeight: 800, color: "#93C5FD", fontSize: "12px" }}>+ ₹{gst}.00</Typography>
                      </Stack>
                      <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", my: 0.5 }} />
                      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                        <Typography sx={{ color: "#FFFFFF", fontWeight: 800, fontSize: "12px" }}>TOTAL AMOUNT PAID</Typography>
                        <Typography sx={{ fontWeight: 900, color: "#3B82F6", fontSize: "14px" }}>₹{totalAmountPaid.toLocaleString()}.00</Typography>
                      </Stack>
                    </Stack>
                  </Paper>

                  <Typography sx={{ color: "rgba(255, 255, 255, 0.4)", fontSize: "10px", textAlign: "center", mt: 1.5 }}>
                    Thank you for using Pay2Pay Enterprise · Customer Care: 1800-123-4567 · www.pay2pay.com
                  </Typography>
                </Box>

                {/* RECEIPT ACTIONS (DOWNLOAD, PRINT, SHARE, NEW TXN) */}
                <Stack spacing={1} sx={{ mt: 1.5 }}>
                  <Stack direction="row" spacing={1}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<DownloadIcon />}
                      onClick={() => {
                        bankingSounds.playSuccess();
                        alert(`Customer Receipt PNG/PDF Downloaded successfully for UTR: ${utr}`);
                      }}
                      sx={{ height: 38, borderRadius: "8px", fontWeight: 800, fontSize: "12px", bgcolor: "#2563EB" }}
                    >
                      Download
                    </Button>

                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<PrintIcon />}
                      onClick={() => window.print()}
                      sx={{ height: 38, borderRadius: "8px", fontWeight: 800, fontSize: "12px", color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.2)" }}
                    >
                      Print
                    </Button>

                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<ShareIcon />}
                      onClick={() => setShareModalOpen(true)}
                      sx={{ height: 38, borderRadius: "8px", fontWeight: 800, fontSize: "12px", color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.2)" }}
                    >
                      Share
                    </Button>
                  </Stack>

                  <Button
                    fullWidth
                    variant="contained"
                    color="success"
                    startIcon={<AddIcon />}
                    onClick={onAuthorize}
                    sx={{ height: 42, borderRadius: "10px", fontWeight: 900, fontSize: "14px" }}
                  >
                    + New Transaction
                  </Button>
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
          {/* Simulated High-Res Customer Receipt Image Card */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: "12px",
              bgcolor: "#FFFFFF",
              color: "#0F172A",
              textAlign: "left",
              mb: 2,
            }}
          >
            <Typography sx={{ fontWeight: 900, fontSize: "16px", color: "#2563EB" }}>Pay2Pay Enterprise</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: "11px", color: "#64748B" }}>Domestic Money Transfer (DMT)</Typography>
            <Typography sx={{ fontWeight: 900, fontSize: "14px", color: "#16A34A", mt: 0.5 }}>TRANSACTION SUCCESSFUL</Typography>
            <Divider sx={{ my: 1 }} />
            <Typography sx={{ fontSize: "11px", color: "#64748B" }}>Txn ID: {txnId}</Typography>
            <Typography sx={{ fontSize: "11px", color: "#64748B" }}>UTR: {utr}</Typography>
            <Typography sx={{ fontSize: "11px", color: "#64748B" }}>Ref: {refNo}</Typography>
            <Typography sx={{ fontSize: "11px", color: "#64748B" }}>Mode: {transactionMode}</Typography>
            <Divider sx={{ my: 1 }} />
            <Typography sx={{ fontSize: "11px", color: "#64748B" }}>Retailer: Rajesh Sharma (+91 98765 43210)</Typography>
            <Typography sx={{ fontSize: "11px", color: "#64748B" }}>Beneficiary: {beneficiary?.name || "Aman Ramesh"}</Typography>
            <Typography sx={{ fontSize: "11px", color: "#64748B" }}>Bank: {beneficiary?.bankName || "Axis Bank"}</Typography>
            <Typography sx={{ fontSize: "11px", color: "#64748B" }}>Account: XXXX XXXX 3210</Typography>
            <Divider sx={{ my: 1 }} />
            <Typography sx={{ fontSize: "11px", color: "#64748B" }}>Transfer Amount: ₹{amount.toLocaleString()}.00</Typography>
            <Typography sx={{ fontSize: "11px", color: "#64748B" }}>Convenience Fee: ₹{charges}.00</Typography>
            <Typography sx={{ fontSize: "11px", color: "#64748B" }}>GST (18%): ₹{gst}.00</Typography>
            <Typography sx={{ fontSize: "12px", fontWeight: 900, color: "#2563EB", mt: 0.5 }}>TOTAL PAID: ₹{totalAmountPaid.toLocaleString()}.00</Typography>
            <Box sx={{ display: "flex", justifyContent: "center", mt: 1.5 }}>
              <QrCode2Icon sx={{ fontSize: 64, color: "#0F172A" }} />
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
