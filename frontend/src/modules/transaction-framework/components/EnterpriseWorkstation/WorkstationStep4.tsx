import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Stack,
  Paper,
  Button,
  Divider,
  CircularProgress,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ShieldIcon from "@mui/icons-material/Shield";
import { CustomerData } from "../../hooks/useCustomer";
import { BeneficiaryData } from "../../hooks/useBeneficiary";
import { bankingSounds } from "../../utils/bankingSounds";

export interface WorkstationStep4Props {
  customer: CustomerData | null;
  beneficiary: BeneficiaryData | null;
  amount: number;
  charges: number;
  totalPayable: number;
  onBack?: () => void;
  onAuthorize: () => void;
}

export const WorkstationStep4: React.FC<WorkstationStep4Props> = ({
  customer,
  beneficiary,
  amount,
  charges,
  totalPayable,
  onBack,
  onAuthorize,
}) => {
  const [pinDigits, setPinDigits] = useState<string[]>(["", "", "", ""]);
  const [revealedIndex, setRevealedIndex] = useState<number | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number>(3);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Auto focus first digit input on mount
  useEffect(() => {
    inputRefs[0].current?.focus();
  }, []);

  const currentPin = pinDigits.join("");

  // Keypad / Typing press handler
  const handleAddDigit = (digit: string) => {
    if (isLocked || isExecuting) return;

    const firstEmptyIndex = pinDigits.findIndex((d) => d === "");
    if (firstEmptyIndex !== -1) {
      const nextDigits = [...pinDigits];
      nextDigits[firstEmptyIndex] = digit;
      setPinDigits(nextDigits);
      setRevealedIndex(firstEmptyIndex);

      // Reveal last typed digit for 300ms
      setTimeout(() => {
        setRevealedIndex((prev) => (prev === firstEmptyIndex ? null : prev));
      }, 300);

      // Move focus to next box
      if (firstEmptyIndex < 3) {
        inputRefs[firstEmptyIndex + 1].current?.focus();
      }

      // Auto Submit Engine if 4th digit entered
      if (firstEmptyIndex === 3) {
        triggerValidation(nextDigits.join(""));
      }
    }
  };

  const handleDeleteDigit = () => {
    if (isLocked || isExecuting) return;

    const lastFilledIndex = pinDigits.map((d) => d !== "").lastIndexOf(true);
    if (lastFilledIndex !== -1) {
      const nextDigits = [...pinDigits];
      nextDigits[lastFilledIndex] = "";
      setPinDigits(nextDigits);
      setRevealedIndex(null);
      inputRefs[lastFilledIndex].current?.focus();
    }
  };

  const handleClearPin = () => {
    if (isLocked || isExecuting) return;
    setPinDigits(["", "", "", ""]);
    setRevealedIndex(null);
    inputRefs[0].current?.focus();
  };

  // Auto-Submit and PIN Validation Logic
  const triggerValidation = (enteredPin: string) => {
    if (isLocked || isExecuting) return;

    // Simulate PIN Verification (Correct PIN is 1234 or any 4 digits except 0000 for testing)
    if (enteredPin === "0000") {
      // Failed Attempt
      bankingSounds.playError();
      setIsShaking(true);
      const remaining = attemptsLeft - 1;
      setAttemptsLeft(remaining);

      if (remaining <= 0) {
        setIsLocked(true);
        setErrorMessage("🔒 Maximum attempts exceeded. Supervisor Unlock Required.");
      } else {
        setErrorMessage(`Incorrect PIN. Try Again. Remaining Attempts: ${remaining}`);
      }

      setTimeout(() => {
        setIsShaking(false);
        setPinDigits(["", "", "", ""]);
        setRevealedIndex(null);
        if (remaining > 0) {
          inputRefs[0].current?.focus();
        }
      }, 600);
    } else {
      // Success Sequence
      bankingSounds.playSuccess();
      setIsExecuting(true);
      setErrorMessage(null);
      setStatusMessage("Validating PIN...");

      setTimeout(() => setStatusMessage("Authorizing..."), 400);
      setTimeout(() => setStatusMessage("Creating Transaction..."), 800);
      setTimeout(() => {
        setStatusMessage("Redirecting to Processing...");
        onAuthorize();
      }, 1200);
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLocked || isExecuting) return;

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
        if (currentPin.length === 4) {
          triggerValidation(currentPin);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPin, isLocked, isExecuting, attemptsLeft]);

  const keypad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "Clear", "0", "Delete"];
  const gst = Math.round(charges * 0.18);

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1200,
        mx: "auto",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        px: 1,
      }}
    >
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
              md: "45% 55%",
            },
            gap: 3,
            alignItems: "stretch",
          }}
        >
          {/* ── LEFT PANEL (45%): TRANSACTION SUMMARY ── */}
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
                TRANSACTION SUMMARY
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
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Bank</Typography>
                  <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "14px" }}>{beneficiary?.bankName || "Axis Bank"}</Typography>
                </Stack>

                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Account</Typography>
                  <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontFamily: "monospace", fontSize: "13px" }}>{beneficiary?.maskedAccountNumber || "XXXX3210"}</Typography>
                </Stack>

                <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", my: 0.5 }} />

                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Transfer Amount</Typography>
                  <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "16px" }}>₹{amount.toLocaleString()}</Typography>
                </Stack>

                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Charges</Typography>
                  <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "13px" }}>+ ₹{charges}</Typography>
                </Stack>

                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>GST (18%)</Typography>
                  <Typography sx={{ fontWeight: 800, color: "#93C5FD", fontSize: "13px" }}>+ ₹{gst}</Typography>
                </Stack>

                <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", my: 0.5 }} />

                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.80)", fontWeight: 700, fontSize: "13px" }}>WALLET DEBIT</Typography>
                  <Typography sx={{ fontWeight: 900, color: "#3B82F6", fontSize: "18px" }}>₹{totalPayable.toLocaleString()}</Typography>
                </Stack>

                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Wallet After</Typography>
                  <Typography sx={{ fontWeight: 800, color: "#FBBF24", fontSize: "14px" }}>
                    ₹{((customer?.walletBalance ?? 124500) - totalPayable).toLocaleString()}
                  </Typography>
                </Stack>

                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Settlement ETA</Typography>
                  <Typography sx={{ fontWeight: 800, color: "#4ADE80", fontSize: "13px" }}>1.2 Seconds</Typography>
                </Stack>

                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Route</Typography>
                  <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "13px" }}>HDFC DirectSwitch</Typography>
                </Stack>

                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Reference</Typography>
                  <Typography sx={{ fontWeight: 800, color: "#93C5FD", fontSize: "12px", fontFamily: "monospace" }}>Auto Generated</Typography>
                </Stack>
              </Stack>
            </Box>

            {/* Bottom Green Banner */}
            <Paper
              elevation={0}
              sx={{
                p: 1.25,
                mt: 2,
                borderRadius: "8px",
                bgcolor: "rgba(74, 222, 128, 0.15)",
                border: "1px solid rgba(74, 222, 128, 0.3)",
                color: "#4ADE80",
                fontWeight: 900,
                fontSize: "13px",
                textAlign: "center",
              }}
            >
              🟢 Ready To Execute
            </Paper>
          </Paper>

          {/* ── RIGHT PANEL (55%): PIN AUTHORIZATION ── */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: "14px",
              bgcolor: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ width: "100%", textAlign: "center" }}>
              <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "20px", mb: 0.5 }}>
                Enter Transaction PIN
              </Typography>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px", mb: 2 }}>
                Authenticate to execute transaction.
              </Typography>

              {/* Status / Error Callout */}
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
                    fontSize: "12px",
                  }}
                >
                  {errorMessage}
                </Paper>
              )}

              {statusMessage && (
                <Stack direction="row" spacing={1} sx={{ justifyContent: "center", alignItems: "center", mb: 2, color: "#60A5FA" }}>
                  <CircularProgress size={16} sx={{ color: "#60A5FA" }} />
                  <Typography sx={{ fontWeight: 800, fontSize: "13px" }}>{statusMessage}</Typography>
                </Stack>
              )}

              {/* 4 OTP STYLE DIGIT BOXES (64x64, 12px Radius, 36px Font) */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "16px",
                  mb: 3,
                  animation: isShaking ? "shake 0.4s ease-in-out" : "none",
                  "@keyframes shake": {
                    "0%, 100%": { transform: "translateX(0)" },
                    "20%, 60%": { transform: "translateX(-8px)" },
                    "40%, 80%": { transform: "translateX(8px)" },
                  },
                }}
              >
                {[0, 1, 2, 3].map((idx) => {
                  const digit = pinDigits[idx];
                  const isRevealed = revealedIndex === idx;
                  const displayChar = digit ? (isRevealed ? digit : "•") : "";

                  return (
                    <Box
                      key={idx}
                      onClick={() => inputRefs[idx].current?.focus()}
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
                        fontSize: "36px",
                        fontWeight: 700,
                        boxShadow: digit ? "0 4px 16px rgba(37, 99, 235, 0.3)" : "none",
                        transition: "all 150ms ease",
                        cursor: "pointer",
                      }}
                    >
                      {displayChar}
                      <input
                        ref={inputRefs[idx]}
                        type="text"
                        style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
                        readOnly
                      />
                    </Box>
                  );
                })}
              </Box>

              {/* PIN KEYPAD (68x68 Buttons, 10px Gap) */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 68px)",
                  gap: "10px",
                  justifyContent: "center",
                  mb: 2.5,
                }}
              >
                {keypad.map((k) => (
                  <Button
                    key={k}
                    disabled={isLocked || isExecuting}
                    onClick={() => {
                      if (k === "Clear") handleClearPin();
                      else if (k === "Delete") handleDeleteDigit();
                      else handleAddDigit(k);
                    }}
                    sx={{
                      width: 68,
                      height: 68,
                      borderRadius: "12px",
                      fontWeight: 800,
                      fontSize: k === "Clear" || k === "Delete" ? "12px" : "20px",
                      color: "#FFFFFF",
                      bgcolor: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      "&:hover": {
                        bgcolor: "rgba(37, 99, 235, 0.3)",
                        borderColor: "#2563EB",
                      },
                    }}
                  >
                    {k}
                  </Button>
                ))}
              </Box>

              {/* PRIMARY ACTION BUTTON (Height 56px) */}
              <Button
                fullWidth
                variant="contained"
                disabled={currentPin.length < 4 || isLocked || isExecuting}
                onClick={() => triggerValidation(currentPin)}
                sx={{
                  height: 56,
                  borderRadius: "12px",
                  fontWeight: 900,
                  fontSize: "16px",
                  bgcolor: "#2563EB",
                  color: "#FFFFFF",
                  boxShadow: "0 4px 20px rgba(37, 99, 235, 0.4)",
                  "&.Mui-disabled": {
                    bgcolor: "rgba(255, 255, 255, 0.12)",
                    color: "rgba(255, 255, 255, 0.4)",
                  },
                }}
              >
                {isExecuting ? "Authorizing..." : "Authorize & Execute"}
              </Button>
            </Box>
          </Paper>
        </Box>
      </Paper>
    </Box>
  );
};
