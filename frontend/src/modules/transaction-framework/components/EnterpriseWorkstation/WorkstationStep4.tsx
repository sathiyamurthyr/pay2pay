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
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SyncIcon from "@mui/icons-material/Sync";
import LockIcon from "@mui/icons-material/Lock";
import { CustomerData } from "../../hooks/useCustomer";
import { BeneficiaryData } from "../../hooks/useBeneficiary";
import { bankingSounds } from "../../utils/bankingSounds";
import { AuthEngine, AuthorizeResponsePayload } from "../../services/AuthEngineAdapter";

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
  const config = AuthEngine.getConfig();
  const pinLength = config.pinLength || 4;

  const [pinDigits, setPinDigits] = useState<string[]>(Array(pinLength).fill(""));
  const [revealedIndex, setRevealedIndex] = useState<number | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number>(AuthEngine.getAttemptsLeft());
  const [isLocked, setIsLocked] = useState<boolean>(AuthEngine.isLocked());
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loaderStep, setLoaderStep] = useState<number>(0);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [supervisorModalOpen, setSupervisorModalOpen] = useState<boolean>(false);
  const [supervisorPin, setSupervisorPin] = useState<string>("");
  const [supervisorError, setSupervisorError] = useState<string | null>(null);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Auto focus first digit input box on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const currentPin = pinDigits.join("");

  const handleAddDigit = (digit: string) => {
    if (isLocked || isExecuting) return;

    const firstEmptyIndex = pinDigits.findIndex((d) => d === "");
    if (firstEmptyIndex !== -1) {
      bankingSounds.playWarning();
      const nextDigits = [...pinDigits];
      nextDigits[firstEmptyIndex] = digit;
      setPinDigits(nextDigits);
      setRevealedIndex(firstEmptyIndex);

      // Reveal digit for 300ms, then mask to dot
      setTimeout(() => {
        setRevealedIndex((prev) => (prev === firstEmptyIndex ? null : prev));
      }, 300);

      if (firstEmptyIndex < pinLength - 1) {
        inputRefs.current[firstEmptyIndex + 1]?.focus();
      }

      // Auto Submit Engine after 4th digit
      if (firstEmptyIndex === pinLength - 1 && config.autoSubmit) {
        executeAuthorizationPipeline(nextDigits.join(""));
      }
    }
  };

  const handleDeleteDigit = () => {
    if (isLocked || isExecuting) return;

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
    if (isLocked || isExecuting) return;
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
    if (isLocked || isExecuting) return;

    const response: AuthorizeResponsePayload = await AuthEngine.authorizeTransaction({
      customerId: customer?.id,
      beneficiaryId: beneficiary?.id,
      pin: pinValue,
      deviceId: "DESKTOP-CBS-01",
      terminalId: "TERM-DELHI-01",
      ip: "10.0.4.15",
    });

    if (!response.success) {
      bankingSounds.playError();
      setIsShaking(true);
      setAttemptsLeft(response.attemptsLeft ?? 0);
      setErrorMessage(response.errorMessage || "Authorization Failed");

      if (response.transactionStatus === "LOCKED") {
        setIsLocked(true);
      }

      setTimeout(() => {
        setIsShaking(false);
        setPinDigits(Array(pinLength).fill(""));
        setRevealedIndex(null);
        if (response.transactionStatus !== "LOCKED") {
          inputRefs.current[0]?.focus();
        }
      }, 600);
    } else {
      bankingSounds.playSuccess();
      setIsExecuting(true);
      setErrorMessage(null);
      setLoaderStep(1);

      setTimeout(() => setLoaderStep(2), 300);
      setTimeout(() => setLoaderStep(3), 600);
      setTimeout(() => setLoaderStep(4), 900);
      setTimeout(() => setLoaderStep(5), 1200);
      setTimeout(() => {
        setLoaderStep(6);
        onAuthorize();
      }, 1500);
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
      inputRefs.current[0]?.focus();
    } else {
      setSupervisorError("Invalid Supervisor PIN. Enter '9999' to override.");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLocked || isExecuting || supervisorModalOpen) return;

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
  }, [currentPin, isLocked, isExecuting, supervisorModalOpen]);

  const gst = Math.round(charges * 0.18);

  const loaderSteps = [
    "Step 1: PIN Verified & Auth Token Issued",
    "Step 2: Retailer Ledger Wallet Debited",
    "Step 3: Settlement Transaction Created",
    "Step 4: NPCI IMPS Network Switching",
    "Step 5: Beneficiary CBS Account Credited",
    "Step 6: Settlement Execution Complete",
  ];

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
          p: 3.5,
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
            gap: 3.5,
            alignItems: "stretch",
          }}
        >
          {/* ── LEFT PANEL (55%): TRANSACTION SUMMARY & AUDIT PREVIEW ── */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
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

              <Stack spacing={1.5}>
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
                  <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "17px" }}>₹{amount.toLocaleString()}</Typography>
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
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.80)", fontWeight: 700, fontSize: "14px" }}>WALLET DEBIT</Typography>
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
              </Stack>
            </Box>

            {/* Bottom Green Banner */}
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                mt: 3,
                borderRadius: "8px",
                bgcolor: "rgba(74, 222, 128, 0.15)",
                border: "1px solid rgba(74, 222, 128, 0.3)",
                color: "#4ADE80",
                fontWeight: 900,
                fontSize: "14px",
                textAlign: "center",
              }}
            >
              🟢 Ready To Execute
            </Paper>
          </Paper>

          {/* ── RIGHT PANEL (45%): DESKTOP PIN AUTHORIZATION CONSOLE ── */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: "14px",
              bgcolor: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxSizing: "border-box",
            }}
          >
            <Box sx={{ width: "100%" }}>
              <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "22px", mb: 0.5 }}>
                Enter Transaction PIN
              </Typography>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13.5px", mb: 3 }}>
                Enter your secure 4-digit operator PIN.
              </Typography>

              {/* Error Callout */}
              {errorMessage && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.25,
                    mb: 2.5,
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

              {/* REAL-TIME LOADER PIPELINE */}
              {isExecuting && (
                <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: "10px", bgcolor: "rgba(37, 99, 235, 0.15)", border: "1px solid #2563EB" }}>
                  <Typography sx={{ color: "#60A5FA", fontWeight: 900, fontSize: "12px", textTransform: "uppercase", mb: 1.5 }}>
                    AUTHORIZING TRANSACTION...
                  </Typography>
                  <Stack spacing={0.75}>
                    {loaderSteps.map((stepText, idx) => {
                      const stepNum = idx + 1;
                      const isDone = stepNum < loaderStep;
                      const isCurrent = stepNum === loaderStep;
                      return (
                        <Stack key={stepText} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                          {isDone ? (
                            <CheckCircleIcon sx={{ color: "#4ADE80", fontSize: 15 }} />
                          ) : isCurrent ? (
                            <SyncIcon sx={{ color: "#60A5FA", fontSize: 15, animation: "spin 1s linear infinite" }} />
                          ) : (
                            <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "rgba(255, 255, 255, 0.3)", ml: 0.5 }} />
                          )}
                          <Typography sx={{ fontSize: "11.5px", fontWeight: isCurrent ? 800 : 600, color: isCurrent ? "#60A5FA" : isDone ? "#4ADE80" : "rgba(255, 255, 255, 0.4)" }}>
                            {stepText}
                          </Typography>
                        </Stack>
                      );
                    })}
                  </Stack>
                </Paper>
              )}

              {/* 4 OTP STYLE PIN BOXES (64x64, 12px Radius, 34px Font, 14px Spacing) */}
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

              {/* Forgot PIN Muted Subtitle */}
              <Typography sx={{ color: "rgba(255, 255, 255, 0.40)", fontSize: "11.5px", textAlign: "center", mb: 3 }}>
                Forgot PIN? (Contact Supervisor)
              </Typography>
            </Box>

            {/* ACTION BUTTONS (PRIMARY & BACK) */}
            <Stack spacing={1.5} sx={{ width: "100%" }}>
              <Button
                fullWidth
                variant="contained"
                disabled={currentPin.length < pinLength || isLocked || isExecuting}
                onClick={() => executeAuthorizationPipeline(currentPin)}
                sx={{
                  height: 56,
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
                {isExecuting ? "Authorizing Transaction..." : "AUTHORIZE & EXECUTE"}
              </Button>

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
                    fontSize: "13px",
                    color: "rgba(255, 255, 255, 0.70)",
                    borderColor: "rgba(255, 255, 255, 0.15)",
                  }}
                >
                  Back
                </Button>
              )}
            </Stack>
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
    </Box>
  );
};
