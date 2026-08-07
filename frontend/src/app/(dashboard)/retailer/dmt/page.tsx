"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  Chip,
  Alert,
  Divider,
  IconButton,
  Drawer,
  Avatar,
  Grid,
  CircularProgress,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Checkbox,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Zoom,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";

// Icons
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EditIcon from "@mui/icons-material/Edit";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import SpeedIcon from "@mui/icons-material/Speed";
import CloseIcon from "@mui/icons-material/Close";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckIcon from "@mui/icons-material/Check";
import AddIcon from "@mui/icons-material/Add";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import NotificationsIcon from "@mui/icons-material/Notifications";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import DownloadIcon from "@mui/icons-material/Download";
import PrintIcon from "@mui/icons-material/Print";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import CancelIcon from "@mui/icons-material/Cancel";
import ReplayIcon from "@mui/icons-material/Replay";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import { M3TextField, M3CurrencyInput } from "@/components/ui/form-components";
import { retailerApi } from "@/services/retailer-api";
import { useRetailerStore } from "@/stores/use-retailer-store";
import { CustomerMasterSlideOver } from "@/components/master/customer-master-slide-over";
import { BeneficiaryMasterSlideOver } from "@/components/master/beneficiary-master-slide-over";

// ─────────────────────────────────────────────────────────────────────────────
// ENTERPRISE BANKING DESIGN SYSTEM TOKENS & BUTTON STYLES
// ─────────────────────────────────────────────────────────────────────────────
const BANK_BLUE = "#0F2C59";
const BANK_BLUE_HOVER = "#0A2042";
const BANK_BLUE_LIGHT = "#F4F7FC";

const BANK_GOLD = "#D4AF37";
const BANK_GOLD_LIGHT = "#FFF8E8";
const BANK_GOLD_BORDER = "#F7E7B6";

const BANK_MAROON = "#7B1E3A";
const BANK_BURGUNDY = "#8D1B3D";
const BANK_MAROON_DARK = "#5C132B";
const BANK_MAROON_LIGHT = "#F8EEF2";

const PRIMARY_GRADIENT = "linear-gradient(135deg, #7B1E3A 0%, #8D1B3D 45%, #D4AF37 100%)";
const SEARCH_BLUE_GRADIENT = "linear-gradient(135deg, #0F2C59 0%, #1A407B 100%)";

const SUCCESS_GREEN = "#16A34A";
const SUCCESS_LIGHT = "#ECFDF5";

const ERROR_RED = "#DC2626";
const ERROR_LIGHT = "#FEF2F2";

const CARD_STYLE = {
  borderRadius: "24px",
  border: "1px solid #E8EBF3",
  boxShadow: "0 8px 32px rgba(15, 44, 89, 0.06)",
  backgroundColor: "#FFFFFF",
};

const PRIMARY_BTN_SX = {
  background: PRIMARY_GRADIENT,
  color: "#FFFFFF",
  fontWeight: 800,
  fontSize: "18px",
  borderRadius: "18px",
  height: "60px",
  px: 4,
  textTransform: "none",
  boxShadow: "0 6px 24px rgba(123, 30, 58, 0.28), 0 2px 8px rgba(212, 175, 55, 0.25)",
  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    background: PRIMARY_GRADIENT,
    boxShadow: "0 10px 30px rgba(212, 175, 55, 0.45), 0 6px 16px rgba(123, 30, 58, 0.35)",
    transform: "translateY(-2px)",
  },
  "&:disabled": {
    background: "#E5E7EB !important",
    border: "1px solid #CBD5E1 !important",
    color: "#9CA3AF !important",
    boxShadow: "none !important",
    transform: "none !important",
  },
};

const SEARCH_BTN_SX = {
  background: SEARCH_BLUE_GRADIENT,
  color: "#FFFFFF",
  fontWeight: 800,
  fontSize: "18px",
  borderRadius: "18px",
  height: "60px",
  px: 4,
  textTransform: "none",
  boxShadow: "0 6px 20px rgba(15, 44, 89, 0.25)",
  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    background: SEARCH_BLUE_GRADIENT,
    boxShadow: "0 10px 28px rgba(15, 44, 89, 0.38)",
    transform: "translateY(-2px)",
  },
  "&:disabled": {
    background: "#E5E7EB !important",
    border: "1px solid #CBD5E1 !important",
    color: "#9CA3AF !important",
    boxShadow: "none !important",
    transform: "none !important",
  },
};

const SEARCH_INPUT_SX = {
  "& .MuiOutlinedInput-root": {
    height: "64px",
    borderRadius: "18px",
    backgroundColor: "#FFFFFF",
    boxShadow: "0 4px 14px rgba(15, 44, 89, 0.05)",
    transition: "all 0.25s ease",
    fontSize: "18px",
    fontWeight: 600,
    "& fieldset": { borderColor: "#E8EBF3", borderWidth: "1.5px" },
    "&:hover fieldset": { borderColor: "#D4AF37" },
    "&.Mui-focused fieldset": { borderColor: "#D4AF37", borderWidth: "2px" },
    "&.Mui-focused": {
      boxShadow: "0 0 0 4px rgba(212, 175, 55, 0.18), 0 6px 16px rgba(15, 44, 89, 0.08)",
    },
  },
  "& .MuiInputLabel-root": { color: "#475569", fontWeight: 600, fontSize: "16px" },
  "& .MuiInputLabel-root.Mui-focused": { color: "#7B1E3A", fontWeight: 700 },
  "& .MuiInputBase-input::placeholder": { color: "#64748B", opacity: 1, fontSize: "16px" },
};

// ─────────────────────────────────────────────────────────────────────────────
// WEB AUDIO API SOUND SYNTHESIZER
// ─────────────────────────────────────────────────────────────────────────────
function playSuccessSound(enabled: boolean) {
  if (!enabled || typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain1.gain.setValueAtTime(0.08, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.2);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
    gain2.gain.setValueAtTime(0.12, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.45);
  } catch {}
}

function playErrorSound(enabled: boolean) {
  if (!enabled || typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.setValueAtTime(180, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// CANVAS CONFETTI COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function CanvasConfetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = [BANK_GOLD, BANK_GOLD_BORDER, "#FFF8E6", SUCCESS_GREEN, BANK_BLUE];
    const particles = Array.from({ length: 50 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * (canvas.height * 0.4) - 20,
      size: Math.random() * 6 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: Math.random() * 2.5 + 1.5,
      speedX: (Math.random() - 0.5) * 1.5,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 6,
    }));

    let animId: number;
    const startTime = Date.now();

    const render = () => {
      if (Date.now() - startTime > 2000) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 1400,
      }}
    />
  );
}

function AnimatedCountUp({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1200;
    const startTime = performance.now();

    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      start = value * easeProgress;
      setDisplayValue(start);

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };

    requestAnimationFrame(update);
  }, [value]);

  return <>₹{displayValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>;
}

function SlideToSend({
  onConfirm,
  disabled,
  label = "Slide to Transfer →",
}: {
  onConfirm: () => void;
  disabled?: boolean;
  label?: string;
}) {
  const [unlocked, setUnlocked] = useState(false);

  const handleClick = () => {
    if (disabled || unlocked) return;
    setUnlocked(true);
    onConfirm();
    setTimeout(() => setUnlocked(false), 3000);
  };

  return (
    <Box
      onClick={handleClick}
      sx={{
        position: "relative",
        height: 56,
        borderRadius: "16px",
        background: disabled ? "#E5E7EB" : unlocked ? SUCCESS_GREEN : PRIMARY_GRADIENT,
        border: disabled ? "1px solid #CBD5E1" : "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 3,
        overflow: "hidden",
        userSelect: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: disabled ? "none" : "0 4px 16px rgba(123, 30, 58, 0.25)",
        "&:hover": !disabled ? {
          boxShadow: "0 8px 24px rgba(201, 152, 25, 0.4), 0 4px 12px rgba(123, 30, 58, 0.3)",
          transform: "translateY(-2px)",
        } : {},
      }}
    >
      <Typography
        sx={{
          fontWeight: 700,
          color: disabled ? "#9CA3AF" : "#FFFFFF",
          letterSpacing: "0.5px",
          pointerEvents: "none",
          fontSize: "18px",
        }}
      >
        {unlocked ? "✓ DISPATCHING PAYOUT..." : label}
      </Typography>

      {!disabled && (
        <Box
          sx={{
            position: "absolute",
            right: 10,
            width: 38,
            height: 38,
            borderRadius: "10px",
            backgroundColor: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
          }}
        >
          {unlocked ? (
            <CheckIcon sx={{ color: SUCCESS_GREEN, fontSize: 22 }} />
          ) : (
            <ArrowForwardIcon sx={{ color: BANK_GOLD, fontSize: 22 }} />
          )}
        </Box>
      )}
    </Box>
  );
}

interface Customer {
  public_id: string;
  customer_number: string;
  full_name: string;
  mobile_number: string;
  kyc_status: string;
  monthly_limit: number;
  monthly_used: number;
  monthly_remaining: number;
  risk_score: number;
}

interface Beneficiary {
  beneficiary_id: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  bank_name: string;
  is_verified: boolean;
  penny_drop_status: string;
  registered_name_in_bank?: string;
  utr?: string;
  branch?: string;
  city?: string;
  status?: string;
  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: string;
  delete_reason?: string;
  last_used?: string;
  transaction_count?: number;
}

interface ReceiptData {
  utr_number?: string;
  reference_id?: string;
  transaction_id?: string;
  wallet_after?: number;
  wallet_before?: number;
  commission?: number;
  amount?: number;
  charges?: number;
  gst?: number;
  net_debit?: number;
  settlement_mode?: string;
  completed_at?: string;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
}

function numberToWords(num: number): string {
  if (!num || num <= 0) return "Zero Rupees";
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function inWords(n: number): string {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " " + inWords(n % 100) : "");
    if (n < 100000) return inWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + inWords(n % 1000) : "");
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + inWords(n % 100000) : "");
    return inWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 !== 0 ? " " + inWords(n % 10000000) : "");
  }
  return inWords(Math.floor(num)) + " Rupees Only";
}

function round2(val: number) {
  return Math.round(val * 100) / 100;
}

function TransactionSuccessReceipt({
  receipt,
  customer,
  beneficiary,
  amount,
  charges,
  gst,
  commission,
  netDebit,
  walletBefore,
  soundEnabled,
  onNewTransfer,
}: {
  receipt: ReceiptData;
  customer: Customer | null;
  beneficiary: Beneficiary | null;
  amount: number;
  charges: number;
  gst: number;
  commission: number;
  netDebit: number;
  walletBefore: number;
  mode: string;
  soundEnabled: boolean;
  onNewTransfer: () => void;
}) {
  const [snackMessage, setSnackMessage] = useState("");
  const walletAfter = receipt.wallet_after ?? walletBefore - netDebit + commission;
  const utr = receipt.utr_number || "621819407998";
  const refId = receipt.reference_id || "1450540671";

  useEffect(() => {
    playSuccessSound(soundEnabled);
  }, [soundEnabled]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setSnackMessage(`${label} copied to clipboard`);
    });
  };

  const beneficiaryName = beneficiary?.registered_name_in_bank || beneficiary?.account_holder_name || "—";
  const maskedAccount = beneficiary?.account_number ? "XXXX" + beneficiary.account_number.slice(-4) : "—";

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: SUCCESS_LIGHT, display: "flex", alignItems: "flex-start", justifyContent: "center", py: 5, px: { xs: 2, sm: 3 } }}>
      <CanvasConfetti />

      <Box sx={{ width: "100%", maxWidth: 680, zIndex: 1 }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }}>
          <Paper
            elevation={0}
            sx={{
              p: 4,
              mb: 3,
              borderRadius: "28px",
              border: "1px solid rgba(212, 175, 55, 0.35)",
              background: "radial-gradient(circle at 50% 0%, rgba(212, 175, 55, 0.12) 0%, #FFFFFF 75%)",
              textAlign: "center",
              boxShadow: "0 20px 60px rgba(15, 44, 89, 0.12)",
            }}
          >
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  bgcolor: "#DCFCE7",
                  border: "2px solid #16A34A",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 2.5,
                  boxShadow: "0 10px 25px rgba(22, 163, 74, 0.25)",
                }}
              >
                <CheckCircleIcon sx={{ color: SUCCESS_GREEN, fontSize: 56 }} />
              </Box>
            </motion.div>

            <Typography sx={{ fontWeight: 900, color: BANK_BLUE, fontSize: "26px", mb: 0.5, letterSpacing: "-0.5px" }}>
              Transfer Successful
            </Typography>

            <Typography sx={{ fontWeight: 900, color: BANK_GOLD, fontSize: "42px", letterSpacing: "-1px", mb: 0.5 }}>
              <AnimatedCountUp value={amount} />
            </Typography>

            <Typography sx={{ fontSize: "14px", color: "#64748B", fontWeight: 700, fontStyle: "italic", mb: 2.5 }}>
              "{numberToWords(amount)}"
            </Typography>

            <Stack direction="row" spacing={1} sx={{ justifyContent: "center", flexWrap: "wrap", gap: 1 }}>
              <Chip label={`UTR: ${utr}`} size="small" icon={<ContentCopyIcon sx={{ fontSize: 13 }} />} onClick={() => copyToClipboard(utr, "UTR")} sx={{ height: 28, fontSize: "12px", fontWeight: 800, bgcolor: "rgba(212, 175, 55, 0.15)", color: BANK_BLUE, border: `1px solid ${BANK_GOLD_BORDER}`, cursor: "pointer" }} />
              <Chip label={`Ref: ${refId}`} size="small" icon={<ContentCopyIcon sx={{ fontSize: 13 }} />} onClick={() => copyToClipboard(refId, "Reference Number")} sx={{ height: 28, fontSize: "12px", fontWeight: 800, bgcolor: "#F1F5F9", color: "#0F172A", cursor: "pointer" }} />
              <Chip label="IMPS Instant (< 2s)" size="small" sx={{ height: 28, fontSize: "12px", fontWeight: 800, bgcolor: SUCCESS_LIGHT, color: SUCCESS_GREEN }} />
            </Stack>
          </Paper>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.2 }}>
          <Paper elevation={0} sx={{ borderRadius: "24px", border: "1px solid #E8EBF3", bgcolor: "#FFFFFF", overflow: "hidden", mb: 3, boxShadow: "0 8px 32px rgba(15, 44, 89, 0.06)" }}>
            <Box sx={{ p: 3, borderBottom: "1px solid #F1F5F9", bgcolor: "#F8FAFC" }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Typography sx={{ fontSize: "11px", fontWeight: 800, color: BANK_BLUE, textTransform: "uppercase", letterSpacing: "1px" }}>SENDER (CUSTOMER)</Typography>
                  <Typography sx={{ fontSize: "15px", fontWeight: 800, color: "#0F172A", mt: 0.5 }}>{customer?.full_name || "—"}</Typography>
                  <Typography sx={{ fontSize: "13px", color: "#64748B", fontWeight: 600 }}>+91 {customer?.mobile_number}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography sx={{ fontSize: "11px", fontWeight: 800, color: BANK_GOLD, textTransform: "uppercase", letterSpacing: "1px" }}>BENEFICIARY (RECEIVER)</Typography>
                  <Typography sx={{ fontSize: "15px", fontWeight: 800, color: "#0F172A", mt: 0.5 }}>{beneficiaryName}</Typography>
                  <Typography sx={{ fontSize: "13px", color: "#64748B", fontWeight: 600 }}>{beneficiary?.bank_name} • {maskedAccount}</Typography>
                </Grid>
              </Grid>
            </Box>

            <Box sx={{ p: 3 }}>
              <Typography sx={{ fontSize: "11px", fontWeight: 800, color: BANK_MAROON, textTransform: "uppercase", letterSpacing: "1px", mb: 1.5 }}>FINANCIAL SUMMARY</Typography>
              <Stack spacing={1.2}>
                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                  <Typography sx={{ fontSize: "14px", color: "#64748B", fontWeight: 600 }}>Transfer Amount</Typography>
                  <Typography sx={{ fontSize: "18px", fontWeight: 900, color: BANK_GOLD }}>₹{amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Typography>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ fontSize: "14px", color: "#64748B", fontWeight: 600 }}>Service Charge &amp; GST</Typography>
                  <Typography sx={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>₹{(charges + gst).toFixed(2)}</Typography>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ fontSize: "14px", color: SUCCESS_GREEN, fontWeight: 700 }}>Retailer Commission</Typography>
                  <Typography sx={{ fontSize: "14px", fontWeight: 800, color: SUCCESS_GREEN }}>+ ₹{commission.toFixed(2)}</Typography>
                </Stack>
                <Divider sx={{ my: 0.8 }} />
                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                  <Typography sx={{ fontSize: "15px", fontWeight: 800, color: "#0F172A" }}>Net Wallet Debit</Typography>
                  <Typography sx={{ fontSize: "22px", fontWeight: 900, color: BANK_MAROON }}>₹{netDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Typography>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ fontSize: "13px", color: SUCCESS_GREEN, fontWeight: 700 }}>Wallet Balance After</Typography>
                  <Typography sx={{ fontSize: "16px", fontWeight: 800, color: SUCCESS_GREEN }}>₹{walletAfter.toLocaleString()}</Typography>
                </Stack>
              </Stack>
            </Box>
          </Paper>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.2 }}>
          <Button
            variant="contained"
            fullWidth
            onClick={onNewTransfer}
            sx={{ ...PRIMARY_BTN_SX, mb: 2.5 }}
          >
            + Start New Transfer
          </Button>

          <Paper elevation={0} sx={{ borderRadius: "20px", border: "1px solid #E8EBF3", bgcolor: "#FFFFFF", overflow: "hidden" }}>
            {[
              { icon: <WhatsAppIcon sx={{ color: SUCCESS_GREEN, fontSize: 22 }} />, label: "Share via WhatsApp", onClick: () => window.open(`https://wa.me/?text=✅ Transfer Successful!%0AAmount: ₹${amount.toLocaleString("en-IN")}%0AUTR: ${utr}`) },
              { icon: <DownloadIcon sx={{ color: BANK_BLUE, fontSize: 22 }} />, label: "Download PDF Receipt", onClick: () => window.print() },
              { icon: <PrintIcon sx={{ color: "#64748B", fontSize: 22 }} />, label: "Print Receipt", onClick: () => window.print() },
            ].map((action, i, arr) => (
              <Box key={action.label} onClick={action.onClick} sx={{ px: 3, py: 1.8, display: "flex", alignItems: "center", gap: 2, cursor: "pointer", borderBottom: i < arr.length - 1 ? "1px solid #F1F5F9" : "none", "&:hover": { bgcolor: "#F8FAFC" } }}>
                {action.icon}
                <Typography sx={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", flex: 1 }}>{action.label}</Typography>
                <OpenInNewIcon sx={{ color: "#CBD5E1", fontSize: 16 }} />
              </Box>
            ))}
          </Paper>
        </motion.div>
      </Box>

      <Snackbar open={!!snackMessage} autoHideDuration={2000} onClose={() => setSnackMessage("")} message={snackMessage} anchorOrigin={{ vertical: "bottom", horizontal: "center" }} />
    </Box>
  );
}

function TransactionFailureReceipt({
  errorMessage,
  errorCode,
  amount,
  walletBefore,
  netDebit,
  customer,
  beneficiary,
  soundEnabled,
  onRetry,
  onNewTransfer,
}: {
  errorMessage: string;
  errorCode?: string;
  amount: number;
  walletBefore: number;
  netDebit: number;
  customer: Customer | null;
  beneficiary: Beneficiary | null;
  soundEnabled: boolean;
  onRetry: () => void;
  onNewTransfer: () => void;
}) {
  const [snackMessage, setSnackMessage] = useState("");
  const failRefId = `FAIL-${Date.now().toString().slice(-8)}`;

  useEffect(() => {
    playErrorSound(soundEnabled);
  }, [soundEnabled]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setSnackMessage(`${label} copied`);
    });
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: ERROR_LIGHT, display: "flex", alignItems: "flex-start", justifyContent: "center", py: 5, px: { xs: 2, sm: 3 } }}>
      <Box sx={{ width: "100%", maxWidth: 680 }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1, x: [-6, 6, -4, 4, -2, 2, 0] }} transition={{ duration: 0.35 }}>
          <Paper elevation={0} sx={{ p: 4, mb: 3, borderRadius: "18px", border: "1px solid #FECACA", bgcolor: "#FFFFFF", textAlign: "center" }}>
            <Box sx={{ width: 72, height: 72, borderRadius: "50%", bgcolor: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
              <CancelIcon sx={{ color: ERROR_RED, fontSize: 48 }} />
            </Box>

            <Typography sx={{ fontWeight: 800, color: ERROR_RED, fontSize: "24px", mb: 0.5 }}>
              Transfer Failed
            </Typography>

            <Typography sx={{ fontWeight: 800, color: "#0F172A", fontSize: "30px", mb: 1 }}>
              ₹{amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </Typography>

            <Typography sx={{ fontSize: "14px", color: ERROR_RED, fontWeight: 700, mb: 2 }}>
              {errorMessage || "Transaction could not be processed"}
            </Typography>

            {errorCode && (
              <Chip label={`Error Code: ${errorCode}`} size="small" sx={{ height: 26, fontSize: "12px", fontWeight: 700, bgcolor: "#FEF2F2", color: ERROR_RED, border: "1px solid #FECACA" }} />
            )}
          </Paper>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.2 }}>
          <Paper elevation={0} sx={{ borderRadius: "18px", border: "1px solid #E2E8F0", bgcolor: "#FFFFFF", overflow: "hidden", mb: 3 }}>
            <Box sx={{ p: 2.5, bgcolor: SUCCESS_LIGHT, borderBottom: "1px solid #E2E8F0" }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <CheckCircleIcon sx={{ color: SUCCESS_GREEN, fontSize: 22 }} />
                <Box>
                  <Typography sx={{ fontSize: "14px", fontWeight: 800, color: SUCCESS_GREEN }}>
                    Wallet Refunded Automatically
                  </Typography>
                  <Typography sx={{ fontSize: "12px", color: "#15803D", fontWeight: 600 }}>
                    ₹{netDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })} has been reversed to your wallet balance instantly.
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Paper>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.2 }}>
          <Stack spacing={1.5} sx={{ mb: 2 }}>
            <Button
              variant="contained"
              fullWidth
              startIcon={<ReplayIcon />}
              onClick={onRetry}
              sx={{ ...PRIMARY_BTN_SX }}
            >
              Retry Transaction
            </Button>
            <Button
              variant="outlined"
              fullWidth
              onClick={onNewTransfer}
              sx={{ borderColor: BANK_BLUE, color: BANK_BLUE, fontWeight: 700, height: 48, fontSize: "15px", borderRadius: "12px", textTransform: "none" }}
            >
              Start New Transfer
            </Button>
          </Stack>
        </motion.div>
      </Box>

      <Snackbar open={!!snackMessage} autoHideDuration={2000} onClose={() => setSnackMessage("")} message={snackMessage} anchorOrigin={{ vertical: "bottom", horizontal: "center" }} />
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DMT PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function DmtPage() {
  const { wallet, updateWallet } = useRetailerStore();
  const customerSearchRef = useRef<HTMLInputElement>(null);

  const [activeStep, setActiveStep] = useState<number>(1);
  const [systemDrawerOpen, setSystemDrawerOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [favouriteBens, setFavouriteBens] = useState<Set<string>>(new Set());

  // Auto-Rotating Intelligence State
  const [intelligenceIndex, setIntelligenceIndex] = useState(0);
  const intelligenceItems = [
    { title: "Fraud Risk Engine", detail: "Risk Score 0.02 (Cleared) • Zero AML Flags", icon: <ShieldOutlinedIcon sx={{ color: "#4ADE80", fontSize: 18 }} /> },
    { title: "NPCI IMPS Switch", detail: "100% Operational • 0.8s Avg Latency", icon: <FlashOnIcon sx={{ color: BANK_GOLD, fontSize: 18 }} /> },
    { title: "Cashfree V2 Gateway", detail: "99.8% Success Rate • Instant Verification", icon: <AccountBalanceIcon sx={{ color: "#60A5FA", fontSize: 18 }} /> },
    { title: "Wallet Health", detail: "Optimal Balance • Commission +₹12.50/txn", icon: <AccountBalanceWalletIcon sx={{ color: "#F472B6", fontSize: 18 }} /> },
    { title: "Processing Speed", detail: "Expected Settlement < 2 Seconds", icon: <SpeedIcon sx={{ color: "#34D399", fontSize: 18 }} /> },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setIntelligenceIndex((prev) => (prev + 1) % intelligenceItems.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [intelligenceItems.length]);

  // Dynamic Bottom Productivity Dashboard Tab State
  const [centerTab, setCenterTab] = useState<"RECENT" | "FAVOURITES" | "PENDING" | "SUMMARY" | "BENEFICIARIES">("RECENT");

  // Customer & Beneficiary Data
  const [searchQuery, setSearchQuery] = useState("");
  const [beneficiarySearchQuery, setBeneficiarySearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);
  const [beneficiaryFilter, setBeneficiaryFilter] = useState<"ALL" | "RECENT" | "FAVOURITE" | "VERIFIED">("ALL");

  // Soft Delete, Reason & Checkbox State
  const [softDeletedBeneficiary, setSoftDeletedBeneficiary] = useState<Beneficiary | null>(null);
  const [deleteConfirmBeneficiary, setDeleteConfirmBeneficiary] = useState<Beneficiary | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>("");
  const [confirmCheckboxChecked, setConfirmCheckboxChecked] = useState(false);
  const [beneficiaryAuditLog, setBeneficiaryAuditLog] = useState<any[]>([]);

  const [viewDetailsBeneficiary, setViewDetailsBeneficiary] = useState<Beneficiary | null>(null);

  // Toast / Undo Snackbar State
  const [undoToastOpen, setUndoToastOpen] = useState(false);
  const [undoToastMessage, setUndoToastMessage] = useState("");
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [customerMasterSlideOverOpen, setCustomerMasterSlideOverOpen] = useState(false);
  const [beneficiaryMasterSlideOverOpen, setBeneficiaryMasterSlideOverOpen] = useState(false);

  // Amount & Transfer Mode
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"IMPS" | "NEFT">("IMPS");
  const [customerPin, setCustomerPin] = useState("");
  const [remarks, setRemarks] = useState("");

  // Pending Status Updates (Step 6)
  const [pendingStatusIndex, setPendingStatusIndex] = useState(0);
  const pendingStatuses = [
    "Verifying customer identity & security MPIN...",
    "Pre-debiting wallet balance & logging double-entry ledger...",
    "Dispatching request to Cashfree V2 / NPCI IMPS Switch...",
    "Awaiting bank response & finalizing real-time settlement...",
  ];

  // Receipt & Error States
  const [payoutReceipt, setPayoutReceipt] = useState<ReceiptData | null>(null);
  const [payoutError, setPayoutError] = useState<{ message: string; code?: string } | null>(null);

  useEffect(() => {
    if (activeStep === 1) {
      setTimeout(() => {
        customerSearchRef.current?.focus();
      }, 120);
    }
  }, [activeStep]);

  useEffect(() => {
    if (searchQuery.trim().length === 10 && !selectedCustomer && activeStep === 1) {
      handleCustomerSearch();
    }
  }, [searchQuery]);

  const toggleFavourite = (accNumber: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavouriteBens((prev) => {
      const next = new Set(prev);
      if (next.has(accNumber)) next.delete(accNumber);
      else next.add(accNumber);
      return next;
    });
  };

  const handleCustomerSearch = async () => {
    if (!searchQuery || !searchQuery.trim()) return;
    setSearchLoading(true);
    setSelectedBeneficiary(null);
    setBeneficiaries([]);
    const res = await retailerApi.searchPayoutCustomer(searchQuery.trim());
    setSearchLoading(false);
    if (res.status === "SUCCESS" && res.data.length > 0) {
      const cust = res.data[0];
      setSelectedCustomer(cust);
      fetchBeneficiaries(cust.public_id || cust.customer_number || searchQuery.trim());
    }
  };

  const fetchBeneficiaries = async (custPublicId: string) => {
    const res = await retailerApi.getBeneficiaries(custPublicId);
    if (res.status === "SUCCESS" && Array.isArray(res.data) && res.data.length > 0) {
      setBeneficiaries(res.data);
      setSelectedBeneficiary((prev) => prev || res.data[0]);
    }
  };

  // SOFT DELETE BENEFICIARY LOGIC WITH AUDIT LOG & CHECKBOX CONFIRMATION
  const handleConfirmSoftDelete = () => {
    if (!deleteConfirmBeneficiary || !confirmCheckboxChecked) return;

    const target = deleteConfirmBeneficiary;

    // Create Audit Log Record
    const auditEntry = {
      audit_id: `AUDIT-${Date.now()}`,
      beneficiary_id: target.beneficiary_id,
      account_number: target.account_number,
      account_holder_name: target.account_holder_name,
      status: "INACTIVE",
      is_deleted: true,
      deleted_by: "RETAILER_RAMESH_KUMAR",
      deleted_on: new Date().toISOString(),
      delete_reason: deleteReason || "Customer Requested",
    };

    setBeneficiaryAuditLog((prev) => [auditEntry, ...prev]);

    const softDeletedRecord: Beneficiary = {
      ...target,
      status: "INACTIVE",
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: "RETAILER_RAMESH_KUMAR",
      delete_reason: deleteReason || "Customer Requested",
    };

    setSoftDeletedBeneficiary(softDeletedRecord);

    // Update active beneficiary list immediately without page reload
    setBeneficiaries((prev) => prev.filter((b) => b.account_number !== target.account_number));

    if (selectedBeneficiary?.account_number === target.account_number) {
      const remaining = beneficiaries.filter((b) => b.account_number !== target.account_number);
      setSelectedBeneficiary(remaining.length > 0 ? remaining[0] : null);
    }

    setDeleteConfirmBeneficiary(null);
    setDeleteReason("");
    setConfirmCheckboxChecked(false);

    setUndoToastMessage(`Beneficiary ${target.account_holder_name} removed successfully.`);
    setUndoToastOpen(true);

    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    undoTimeoutRef.current = setTimeout(() => {
      setUndoToastOpen(false);
      setSoftDeletedBeneficiary(null);
    }, 10000);
  };

  const handleUndoSoftDelete = () => {
    if (!softDeletedBeneficiary) return;

    const restored = {
      ...softDeletedBeneficiary,
      status: "ACTIVE",
      is_deleted: false,
    };

    setBeneficiaries((prev) => [restored, ...prev]);
    setSelectedBeneficiary(restored);
    setSoftDeletedBeneficiary(null);
    setUndoToastOpen(false);
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
  };

  // Financial Calculations
  const numAmount = parseFloat(amount) || 0;
  const charges = mode === "IMPS" ? (numAmount <= 25000 ? 10.0 : 15.0) : 3.0;
  const gst = round2(charges * 0.18);
  const commission = round2(numAmount * 0.0015);
  const netDebit = numAmount + charges + gst;
  const walletBefore = wallet.mainBalance;
  const walletAfter = walletBefore - netDebit + commission;

  // Validation Flags
  const isCustomerValid = !!selectedCustomer;
  const isBeneficiaryValid = !!selectedBeneficiary;
  const isWalletValid = walletBefore >= netDebit;
  const isPinValid = customerPin.length >= 4;
  const isAllValid = isCustomerValid && isBeneficiaryValid && isWalletValid && isPinValid;

  const canAdvanceCurrentStep = () => {
    if (activeStep === 1) return isCustomerValid;
    if (activeStep === 2) return isBeneficiaryValid;
    if (activeStep === 3) return numAmount > 0 && isWalletValid;
    if (activeStep === 4) return true;
    if (activeStep === 5) return isPinValid;
    return true;
  };

  const getStepButtonLabel = () => {
    switch (activeStep) {
      case 1: return "Continue to Beneficiary →";
      case 2: return "Continue to Amount →";
      case 3: return "Continue to Review →";
      case 4: return "Continue to Authenticate →";
      case 5: return "Slide to Transfer →";
      default: return "Continue →";
    }
  };

  const handleNextStep = () => {
    if (!canAdvanceCurrentStep()) return;
    setActiveStep((prev) => Math.min(prev + 1, 5));
  };

  const handlePrevStep = () => {
    if (activeStep <= 1 || activeStep === 6) return;
    setActiveStep((prev) => Math.max(prev - 1, 1));
  };

  const handleExecutePayout = async () => {
    if (!selectedCustomer || !selectedBeneficiary || numAmount <= 0) return;

    const pinRes = await retailerApi.verifyCustomerPin(selectedCustomer.public_id, customerPin);
    if (pinRes.status !== "SUCCESS") {
      alert("Invalid Customer PIN!");
      return;
    }

    setActiveStep(6);
    setPendingStatusIndex(0);

    const interval = setInterval(() => {
      setPendingStatusIndex((prev) => (prev < pendingStatuses.length - 1 ? prev + 1 : prev));
    }, 450);

    const res = await retailerApi.executePayout({
      customer_id: selectedCustomer.public_id,
      beneficiary_id: selectedBeneficiary.beneficiary_id,
      amount: numAmount,
      transfer_mode: mode,
      customer_pin: customerPin,
      wallet_balance: walletBefore,
    });

    clearInterval(interval);

    if (res.status === "SUCCESS") {
      setPayoutReceipt(res.data);
      setPayoutError(null);
      updateWallet({
        mainBalance: res.data.wallet_after,
        todayMargin: wallet.todayMargin + res.data.commission,
      });
      setTimeout(() => setActiveStep(7), 400);
    } else {
      setPayoutError({ message: res.detail || "Payout failed. Please retry.", code: res.error_code });
      setPayoutReceipt(null);
      setTimeout(() => setActiveStep(8), 400);
    }
  };

  const handleResetAll = () => {
    setSelectedCustomer(null);
    setSearchQuery("");
    setBeneficiaries([]);
    setSelectedBeneficiary(null);
    setAmount("");
    setCustomerPin("");
    setRemarks("");
    setMode("IMPS");
    setPayoutReceipt(null);
    setPayoutError(null);
    setActiveStep(1);
    if (typeof window !== "undefined") {
      localStorage.removeItem("pay2pay_dmt_active_step");
    }
    setTimeout(() => {
      customerSearchRef.current?.focus();
    }, 150);
  };

  const handleRetry = () => {
    setPayoutError(null);
    setPayoutReceipt(null);
    setActiveStep(5);
  };

  const activeBeneficiaries = beneficiaries.filter((b) => !b.is_deleted);
  const filteredBeneficiaries = activeBeneficiaries.filter((b) => {
    if (beneficiaryFilter === "FAVOURITE" && !favouriteBens.has(b.account_number)) return false;
    if (beneficiaryFilter === "VERIFIED" && !b.is_verified) return false;
    if (!beneficiarySearchQuery.trim()) return true;
    const q = beneficiarySearchQuery.toLowerCase();
    return (
      (b.account_holder_name && b.account_holder_name.toLowerCase().includes(q)) ||
      (b.bank_name && b.bank_name.toLowerCase().includes(q)) ||
      (b.account_number && b.account_number.includes(q)) ||
      (b.ifsc_code && b.ifsc_code.toLowerCase().includes(q))
    );
  });

  // STEP 7: SUCCESS RECEIPT VIEW
  if (activeStep === 7 && payoutReceipt) {
    return (
      <TransactionSuccessReceipt
        receipt={payoutReceipt}
        customer={selectedCustomer}
        beneficiary={selectedBeneficiary}
        amount={numAmount}
        charges={charges}
        gst={gst}
        commission={commission}
        netDebit={netDebit}
        walletBefore={walletBefore}
        mode={mode}
        soundEnabled={soundEnabled}
        onNewTransfer={handleResetAll}
      />
    );
  }

  // STEP 8: FAILURE RECEIPT VIEW
  if (activeStep === 8 && payoutError) {
    return (
      <TransactionFailureReceipt
        errorMessage={payoutError.message}
        errorCode={payoutError.code}
        amount={numAmount}
        walletBefore={walletBefore}
        netDebit={netDebit}
        customer={selectedCustomer}
        beneficiary={selectedBeneficiary}
        soundEnabled={soundEnabled}
        onRetry={handleRetry}
        onNewTransfer={handleResetAll}
      />
    );
  }

  return (
    <Box sx={{ pb: 14, minHeight: "100vh", bgcolor: "#F6F8FC", color: "#0F172A" }}>
      {/* ── ZONE 1: SIGNATURE PAY2PAY GLASS HEADER (COMPACT 35% REDUCED HEIGHT) ── */}
      <Paper
        elevation={0}
        sx={{
          px: 3.5,
          py: 1.4,
          borderBottom: "1px solid #E8EBF3",
          background: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(16px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 1100,
          boxShadow: "0 4px 20px rgba(15, 44, 89, 0.04)",
        }}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <IconButton size="small" sx={{ color: BANK_BLUE, bgcolor: "#F4F7FC", p: 1, "&:hover": { bgcolor: BANK_GOLD_LIGHT } }}>
            <MenuIcon />
          </IconButton>

          {/* BRAND LOGO BADGE */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Paper
              elevation={0}
              sx={{
                px: 1.8,
                py: 0.5,
                borderRadius: "10px",
                background: "linear-gradient(135deg, #0F2C59 0%, #7B1E3A 100%)",
                border: "1px solid #D4AF37",
                color: "#FFFFFF",
                fontWeight: 900,
                fontSize: "14px",
                letterSpacing: "1px",
                boxShadow: "0 2px 8px rgba(15, 44, 89, 0.2)",
              }}
            >
              PAY2PAY
            </Paper>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900, color: BANK_BLUE, fontSize: "17px", letterSpacing: "-0.4px", lineHeight: 1.1 }}>
                Domestic Money Transfer (DMT)
              </Typography>
              <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, fontSize: "11px" }}>
                PAY2PAY Enterprise Retail Banking Platform
              </Typography>
            </Box>
          </Box>

          {/* GLOBAL SEARCH & KEYBOARD HINT */}
          <Paper
            elevation={0}
            onClick={() => customerSearchRef.current?.focus()}
            sx={{
              display: { xs: "none", xl: "flex" },
              alignItems: "center",
              gap: 1.5,
              px: 2,
              py: 0.6,
              bgcolor: "#F1F5F9",
              borderRadius: "10px",
              border: "1px solid #E2E8F0",
              cursor: "pointer",
            }}
          >
            <SearchIcon sx={{ color: "#64748B", fontSize: 18 }} />
            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600, fontSize: "12px" }}>
              Universal Search...
            </Typography>
            <Chip label="Ctrl + K" size="small" sx={{ height: 18, fontSize: "10px", fontWeight: 800, bgcolor: "#FFFFFF", color: "#475569" }} />
          </Paper>

          <Chip
            label="⚡ Live Intelligence"
            size="small"
            onClick={() => setSystemDrawerOpen(true)}
            sx={{
              height: 28,
              fontSize: "12px",
              fontWeight: 800,
              bgcolor: "rgba(212, 175, 55, 0.15)",
              color: BANK_BLUE,
              border: `1px solid ${BANK_GOLD_BORDER}`,
              cursor: "pointer",
              px: 0.5,
              transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
              "&:hover": {
                bgcolor: BANK_GOLD,
                color: "#FFFFFF",
                transform: "translateY(-1px)",
                boxShadow: "0 4px 12px rgba(212, 175, 55, 0.3)",
              },
            }}
          />
        </Stack>

        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          {/* BUSINESS DATE & CONNECTION STATUS */}
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", display: { xs: "none", lg: "flex" } }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: SUCCESS_GREEN, boxShadow: `0 0 8px ${SUCCESS_GREEN}` }} />
            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, fontSize: "11px" }}>
              Live 100% • 07 Aug 2026
            </Typography>
          </Stack>

          <IconButton size="small" onClick={() => setSoundEnabled(!soundEnabled)} sx={{ color: soundEnabled ? BANK_GOLD : "#94A3B8", bgcolor: soundEnabled ? BANK_GOLD_LIGHT : "transparent" }}>
            {soundEnabled ? <VolumeUpIcon sx={{ fontSize: 20 }} /> : <VolumeOffIcon sx={{ fontSize: 20 }} />}
          </IconButton>

          {/* SIGNATURE PAY2PAY WALLET CARD */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              px: 2,
              py: 0.7,
              background: "linear-gradient(135deg, #FFF8E8 0%, #FFFFFF 100%)",
              borderRadius: "12px",
              border: `1.5px solid ${BANK_GOLD_BORDER}`,
              boxShadow: "0 4px 16px rgba(212, 175, 55, 0.12)",
            }}
          >
            <AccountBalanceWalletIcon sx={{ color: BANK_GOLD, fontSize: 22, filter: "drop-shadow(0 2px 4px rgba(212, 175, 55, 0.3))" }} />
            <Box>
              <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", display: "block" }}>
                WALLET BALANCE
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 900, color: BANK_BLUE, fontSize: "16px", lineHeight: 1.1 }}>
                ₹{wallet.mainBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </Typography>
            </Box>
            <Chip label={`+₹${wallet.todayMargin.toFixed(2)}`} size="small" sx={{ bgcolor: SUCCESS_LIGHT, color: SUCCESS_GREEN, fontWeight: 800, height: 20, fontSize: "10px" }} />
          </Box>

          <IconButton size="small" sx={{ color: "#64748B" }}>
            <NotificationsIcon sx={{ fontSize: 20 }} />
          </IconButton>

          <Stack direction="row" spacing={1.2} sx={{ alignItems: "center", pl: 1.5, borderLeft: "1px solid #E2E8F0" }}>
            <Avatar sx={{ width: 34, height: 34, background: PRIMARY_GRADIENT, color: "#FFFFFF", fontSize: "13px", fontWeight: 800, boxShadow: "0 2px 8px rgba(123, 30, 58, 0.25)" }}>RK</Avatar>
            <Box sx={{ display: { xs: "none", md: "block" } }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0F172A", fontSize: "13px", lineHeight: 1.1 }}>Ramesh Kumar</Typography>
              <Typography variant="caption" sx={{ color: BANK_GOLD, fontWeight: 700, fontSize: "11px" }}>Retailer Console</Typography>
            </Box>
          </Stack>
        </Stack>
      </Paper>

      {/* ── 3-COLUMN RESPONSIVE ENTERPRISE OPERATING PLATFORM (20% LEFT | 58% CENTER | 22% RIGHT) ── */}
      <Box sx={{ maxWidth: 1780, mx: "auto", px: 3, pt: 2 }}>
        <Grid container spacing={2.5}>
          {/* ── LEFT PANEL (20% WIDTH): ENTERPRISE WORKFLOW NAVIGATOR ── */}
          <Grid size={{ xs: 12, lg: 2.4 }}>
            <Stack spacing={2.5}>
              {/* WORKFLOW PROGRESS NAVIGATOR */}
              <Paper elevation={0} sx={{ ...CARD_STYLE, p: 2.5, borderTop: `4px solid ${BANK_BLUE}` }}>
                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                  <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.8px" }}>
                    WORKFLOW PROGRESS
                  </Typography>
                  <Chip
                    label={`${Math.round(((activeStep - 1) / 5) * 100)}% Complete`}
                    size="small"
                    sx={{ height: 22, fontSize: "11px", fontWeight: 800, bgcolor: BANK_GOLD_LIGHT, color: BANK_BLUE, border: `1px solid ${BANK_GOLD_BORDER}` }}
                  />
                </Stack>

                <Box sx={{ position: "relative", my: 2 }}>
                  {/* PROGRESS BAR TRACK */}
                  <Box sx={{ height: 6, bgcolor: "#E2E8F0", borderRadius: "3px", overflow: "hidden", mb: 2 }}>
                    <Box sx={{ width: `${Math.round(((activeStep - 1) / 5) * 100)}%`, height: "100%", background: PRIMARY_GRADIENT, transition: "width 0.3s ease" }} />
                  </Box>

                  <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600, fontSize: "12px", display: "block", mb: 2 }}>
                    Est. Remaining: <strong>35 Seconds</strong> • Step {activeStep} of 6
                  </Typography>

                  {/* VERTICAL STEP TIMELINE */}
                  <Stack spacing={1.5}>
                    {[
                      { step: 1, title: "Customer Identification", ok: isCustomerValid, subtitle: "Mobile / Aadhaar / ID" },
                      { step: 2, title: "Beneficiary Selection", ok: isBeneficiaryValid, subtitle: "Account & IFSC Verification" },
                      { step: 3, title: "Transfer Amount", ok: numAmount > 0, subtitle: "IMPS / NEFT Settlement" },
                      { step: 4, title: "Review Summary", ok: numAmount > 0 && isCustomerValid && isBeneficiaryValid, subtitle: "Fee & Net Debit Audit" },
                      { step: 5, title: "Authentication MPIN", ok: isPinValid, subtitle: "256-bit Retailer Auth" },
                      { step: 6, title: "Receipt Dispatch", ok: !!payoutReceipt, subtitle: "PDF & WhatsApp Print" },
                    ].map((st) => {
                      const isCurrent = activeStep === st.step;
                      const isCompleted = st.ok && activeStep > st.step;
                      const canClick = isCompleted || activeStep === st.step;

                      return (
                        <Paper
                          key={st.step}
                          elevation={0}
                          onClick={() => canClick && setActiveStep(st.step)}
                          sx={{
                            p: 1.5,
                            borderRadius: "14px",
                            border: isCurrent ? `2px solid ${BANK_GOLD}` : isCompleted ? `1px solid ${SUCCESS_GREEN}` : "1px solid #E8EBF3",
                            bgcolor: isCurrent ? BANK_GOLD_LIGHT : isCompleted ? "#F0FDF4" : "#F8FAFC",
                            cursor: canClick ? "pointer" : "not-allowed",
                            opacity: canClick || isCurrent ? 1 : 0.6,
                            transition: "all 0.2s ease",
                            "&:hover": canClick ? { transform: "translateX(3px)" } : {},
                          }}
                        >
                          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                            <Box
                              sx={{
                                width: 30,
                                height: 30,
                                borderRadius: "8px",
                                background: isCompleted ? SUCCESS_GREEN : isCurrent ? PRIMARY_GRADIENT : "#CBD5E1",
                                color: "#FFFFFF",
                                fontWeight: 900,
                                fontSize: "12px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: isCurrent ? "0 2px 8px rgba(123, 30, 58, 0.3)" : "none",
                              }}
                            >
                              {isCompleted ? <CheckIcon sx={{ fontSize: 16 }} /> : `0${st.step}`}
                            </Box>

                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="subtitle2" noWrap sx={{ fontWeight: isCurrent ? 900 : 700, color: isCurrent ? BANK_MAROON : isCompleted ? SUCCESS_GREEN : "#0F172A", fontSize: "13px", lineHeight: 1.1 }}>
                                {st.title}
                              </Typography>
                              <Typography variant="caption" noWrap sx={{ color: "#64748B", fontSize: "11px", display: "block" }}>
                                {st.subtitle}
                              </Typography>
                            </Box>
                          </Stack>
                        </Paper>
                      );
                    })}
                  </Stack>
                </Box>
              </Paper>

              {/* OPERATOR SESSION METRICS */}
              <Paper elevation={0} sx={{ ...CARD_STYLE, p: 2.5, bgcolor: "linear-gradient(135deg, #0F2C59 0%, #1A407B 100%)", color: "#FFFFFF" }}>
                <Typography variant="caption" sx={{ color: BANK_GOLD, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.8px", display: "block", mb: 1.5 }}>
                  OPERATOR DAILY TELEMETRY
                </Typography>
                <Stack spacing={1.2}>
                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography variant="caption" sx={{ color: "#94A3B8" }}>Transfers Executed Today</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#FFFFFF" }}>24 Txns</Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography variant="caption" sx={{ color: "#94A3B8" }}>Daily Volume</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900, color: BANK_GOLD }}>₹1,24,500.00</Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography variant="caption" sx={{ color: "#94A3B8" }}>Operator Margin Earned</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#4ADE80" }}>+ ₹450.00</Typography>
                  </Stack>
                </Stack>
              </Paper>
            </Stack>
          </Grid>

          {/* ── CENTER PANEL (58% WIDTH): CUSTOMER OPERATIONS WORKSPACE ── */}
          <Grid size={{ xs: 12, lg: 7.0 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {/* STEP 1: UNIFIED CUSTOMER IDENTIFICATION DASHBOARD */}
                {activeStep === 1 && (
                  <Paper elevation={0} sx={{ ...CARD_STYLE, p: 3.5, borderTop: `4px solid ${BANK_BLUE}` }}>
                    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2.5 }}>
                      <Box>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: BANK_BLUE, fontSize: "22px", letterSpacing: "-0.4px" }}>
                          Customer Identification
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600 }}>
                          Search by Mobile Number, Aadhaar Number, Customer ID or UPI
                        </Typography>
                      </Box>
                      <Button
                        variant="outlined"
                        onClick={() => setCustomerMasterSlideOverOpen(true)}
                        sx={{
                          borderColor: BANK_GOLD,
                          color: BANK_BLUE,
                          fontWeight: 800,
                          borderRadius: "12px",
                          height: "44px",
                          px: 2.5,
                          fontSize: "14px",
                          textTransform: "none",
                          "&:hover": { bgcolor: BANK_GOLD_LIGHT, borderColor: BANK_GOLD },
                        }}
                      >
                        + Register New Customer
                      </Button>
                    </Stack>

                    {/* UNIFIED SEARCH FIELD */}
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <M3TextField
                          inputRef={customerSearchRef}
                          label="Unified Search (Mobile / Aadhaar / Customer ID)"
                          placeholder="Enter 10-digit mobile number, Aadhaar or Customer ID..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleCustomerSearch(); }}
                          startAdornment={<SearchIcon sx={{ color: BANK_GOLD, fontSize: 22 }} />}
                          sx={{ ...SEARCH_INPUT_SX }}
                        />
                      </Box>
                      <Button
                        variant="contained"
                        onClick={handleCustomerSearch}
                        disabled={searchLoading || !searchQuery.trim()}
                        startIcon={!searchLoading ? <SearchIcon sx={{ color: "#FFFFFF", fontSize: 22 }} /> : undefined}
                        sx={{ ...SEARCH_BTN_SX }}
                      >
                        {searchLoading ? <CircularProgress size={22} sx={{ color: "#FFF" }} /> : "Search"}
                      </Button>
                    </Stack>

                    {/* QUICK ACTION CHIPS */}
                    <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: "wrap", gap: 0.8 }}>
                      {[
                        { label: "Ramesh Kumar (9176669426)", num: "9176669426" },
                        { label: "Anita Sharma (9840123456)", num: "9840123456" },
                        { label: "Scan QR", action: () => alert("QR Scanner Active") },
                        { label: "Paste Number", action: () => navigator.clipboard.readText().then((t) => setSearchQuery(t.slice(0, 10))) },
                      ].map((item) => (
                        <Chip
                          key={item.label}
                          label={item.label}
                          onClick={() => {
                            if (item.num) {
                              setSearchQuery(item.num);
                              handleCustomerSearch();
                            } else if (item.action) {
                              item.action();
                            }
                          }}
                          sx={{
                            fontWeight: 700,
                            bgcolor: BANK_GOLD_LIGHT,
                            color: BANK_BLUE,
                            border: `1px solid ${BANK_GOLD_BORDER}`,
                            cursor: "pointer",
                            fontSize: "12px",
                            borderRadius: "8px",
                            "&:hover": { bgcolor: BANK_GOLD, color: "#FFFFFF" },
                          }}
                        />
                      ))}
                    </Stack>

                    {/* QUICK ACTION CARDS (PRE-SEARCH FREQUENT CUSTOMERS) */}
                    {!selectedCustomer && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", mb: 1.5, display: "block" }}>
                          FREQUENT &amp; RECENT CUSTOMERS
                        </Typography>
                        <Grid container spacing={2}>
                          {[
                            { name: "Ramesh Kumar", mobile: "9176669426", kyc: "eKYC Verified", txns: "18 txns/mo", last: "12m ago" },
                            { name: "Anita Sharma", mobile: "9840123456", kyc: "eKYC Verified", txns: "12 txns/mo", last: "2h ago" },
                            { name: "Vijay Patel", mobile: "9940567890", kyc: "Aadhaar Verified", txns: "24 txns/mo", last: "Yesterday" },
                          ].map((c) => (
                            <Grid key={c.mobile} size={{ xs: 12, sm: 4 }}>
                              <Paper
                                elevation={0}
                                onClick={() => {
                                  setSearchQuery(c.mobile);
                                  handleCustomerSearch();
                                }}
                                sx={{
                                  p: 2,
                                  borderRadius: "16px",
                                  border: "1px solid #E8EBF3",
                                  bgcolor: "#F8FAFC",
                                  cursor: "pointer",
                                  transition: "all 0.2s ease",
                                  "&:hover": {
                                    borderColor: BANK_GOLD,
                                    bgcolor: BANK_GOLD_LIGHT,
                                    transform: "translateY(-2px)",
                                    boxShadow: "0 6px 16px rgba(212, 175, 55, 0.15)",
                                  },
                                }}
                              >
                                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1 }}>
                                  <Avatar sx={{ width: 36, height: 36, bgcolor: BANK_BLUE, color: BANK_GOLD, fontWeight: 800, fontSize: "14px" }}>
                                    {c.name[0]}
                                  </Avatar>
                                  <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0F172A", fontSize: "14px", lineHeight: 1.1 }}>
                                      {c.name}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: "#64748B", fontSize: "12px" }}>
                                      +91 {c.mobile}
                                    </Typography>
                                  </Box>
                                </Stack>
                                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                                  <Chip label={c.kyc} size="small" sx={{ height: 20, fontSize: "10px", fontWeight: 700, bgcolor: SUCCESS_LIGHT, color: SUCCESS_GREEN }} />
                                  <Typography variant="caption" sx={{ color: "#64748B", fontSize: "11px" }}>{c.last}</Typography>
                                </Stack>
                              </Paper>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    )}

                    {/* SECTION 3: COMPREHENSIVE CUSTOMER PROFILE TELEMETRY */}
                    {selectedCustomer && (
                      <Paper elevation={0} sx={{ p: 3, borderRadius: "20px", border: `2px solid ${BANK_GOLD}`, bgcolor: "linear-gradient(135deg, #FFF8E8 0%, #FFFFFF 100%)", boxShadow: "0 8px 24px rgba(212, 175, 55, 0.12)", mb: 3 }}>
                        <Stack direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                            <Avatar sx={{ bgcolor: BANK_BLUE, color: BANK_GOLD, width: 56, height: 56, fontWeight: 900, fontSize: "22px", border: `2px solid ${BANK_GOLD}` }}>
                              {selectedCustomer.full_name?.[0] || "C"}
                            </Avatar>
                            <Box>
                              <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.5 }}>
                                <Typography variant="h6" sx={{ fontWeight: 900, color: BANK_BLUE, fontSize: "20px" }}>
                                  {selectedCustomer.full_name}
                                </Typography>
                                <Chip label="Platinum Retail Customer" size="small" sx={{ height: 22, fontSize: "11px", fontWeight: 800, bgcolor: BANK_GOLD_LIGHT, color: BANK_BLUE, border: `1px solid ${BANK_GOLD_BORDER}` }} />
                                <Chip label="Aadhaar eKYC Verified ✓" size="small" sx={{ height: 22, fontSize: "11px", fontWeight: 800, bgcolor: SUCCESS_LIGHT, color: SUCCESS_GREEN }} />
                                <Chip label="Risk Score 0.02 (Low)" size="small" sx={{ height: 22, fontSize: "11px", fontWeight: 800, bgcolor: SUCCESS_LIGHT, color: SUCCESS_GREEN }} />
                              </Stack>
                              <Typography variant="body2" sx={{ color: "#64748B", fontWeight: 600, mt: 0.5 }}>
                                Customer ID: {selectedCustomer.customer_number || selectedCustomer.public_id} • Mobile: +91 {selectedCustomer.mobile_number} • Language: English / Hindi • Since Jan 2024
                              </Typography>
                            </Box>
                          </Stack>
                          <Button size="small" startIcon={<EditIcon sx={{ fontSize: 14 }} />} onClick={() => setSelectedCustomer(null)} sx={{ fontSize: "13px", fontWeight: 800, color: BANK_BLUE, textTransform: "none" }}>
                            Change Customer
                          </Button>
                        </Stack>

                        <Divider sx={{ my: 2 }} />

                        <Grid container spacing={2}>
                          <Grid size={{ xs: 6, sm: 3 }}>
                            <Paper elevation={0} sx={{ p: 1.5, borderRadius: "12px", bgcolor: "#FFFFFF", border: "1px solid #E8EBF3" }}>
                              <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, fontSize: "10px", textTransform: "uppercase", display: "block" }}>Monthly Limit Remaining</Typography>
                              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: BANK_BLUE, fontSize: "17px" }}>
                                ₹{(selectedCustomer.monthly_remaining ?? 75000).toLocaleString("en-IN")}
                              </Typography>
                            </Paper>
                          </Grid>

                          <Grid size={{ xs: 6, sm: 3 }}>
                            <Paper elevation={0} sx={{ p: 1.5, borderRadius: "12px", bgcolor: "#FFFFFF", border: "1px solid #E8EBF3" }}>
                              <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, fontSize: "10px", textTransform: "uppercase", display: "block" }}>Daily Limit</Typography>
                              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#0F172A", fontSize: "17px" }}>₹50,000.00</Typography>
                            </Paper>
                          </Grid>

                          <Grid size={{ xs: 6, sm: 3 }}>
                            <Paper elevation={0} sx={{ p: 1.5, borderRadius: "12px", bgcolor: "#FFFFFF", border: "1px solid #E8EBF3" }}>
                              <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, fontSize: "10px", textTransform: "uppercase", display: "block" }}>Preferred Gateway &amp; Bank</Typography>
                              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: BANK_GOLD, fontSize: "15px" }}>HDFC IMPS Direct</Typography>
                            </Paper>
                          </Grid>

                          <Grid size={{ xs: 6, sm: 3 }}>
                            <Paper elevation={0} sx={{ p: 1.5, borderRadius: "12px", bgcolor: "#FFFFFF", border: "1px solid #E8EBF3" }}>
                              <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, fontSize: "10px", textTransform: "uppercase", display: "block" }}>Transfer Frequency</Typography>
                              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: SUCCESS_GREEN, fontSize: "15px" }}>High • 18 txns/mo</Typography>
                            </Paper>
                          </Grid>
                        </Grid>
                      </Paper>
                    )}

                    {/* SECTION 4: AI RECOMMENDATION CARD */}
                    <Paper elevation={0} sx={{ p: 2.5, borderRadius: "16px", borderLeft: `5px solid ${BANK_MAROON}`, bgcolor: BANK_MAROON_LIGHT, mb: 3 }}>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1 }}>
                        <FlashOnIcon sx={{ color: BANK_MAROON, fontSize: 22 }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 900, color: BANK_MAROON, fontSize: "16px" }}>
                          AI Recommendation Engine
                        </Typography>
                        <Chip label="99.8% Success Match" size="small" sx={{ height: 20, fontSize: "10px", fontWeight: 800, bgcolor: "#FFFFFF", color: BANK_MAROON }} />
                      </Stack>
                      <Typography variant="body2" sx={{ color: "#475569", fontWeight: 600, mb: 1.5 }}>
                        Customer <strong>{selectedCustomer ? selectedCustomer.full_name : "Ramesh Kumar"}</strong> normally transfers <strong>₹5,000.00</strong> via IMPS. Suggested Bank Route: <strong>HDFC Switch</strong> (Expected Speed: 12 seconds | Commission: <strong>+₹18.00</strong> | Network Load: Normal).
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 0.8 }}>
                        <Chip label="Suggested: ₹5,000" size="small" onClick={() => setAmount("5000")} sx={{ fontWeight: 800, bgcolor: "#FFFFFF", color: BANK_MAROON, cursor: "pointer" }} />
                        <Chip label="Suggested: ₹10,000" size="small" onClick={() => setAmount("10000")} sx={{ fontWeight: 800, bgcolor: "#FFFFFF", color: BANK_MAROON, cursor: "pointer" }} />
                        <Chip label="IMPS Instant 24x7" size="small" sx={{ fontWeight: 800, bgcolor: SUCCESS_LIGHT, color: SUCCESS_GREEN }} />
                      </Stack>
                    </Paper>

                    {/* SECTION 5: DYNAMIC BOTTOM PRODUCTIVITY DASHBOARD */}
                    <Box sx={{ mt: 3 }}>
                      <Stack direction="row" spacing={1} sx={{ mb: 2, borderBottom: "1px solid #E2E8F0", pb: 1 }}>
                        {[
                          { key: "RECENT", label: "Recent Transactions" },
                          { key: "FAVOURITES", label: "Favourite Customers" },
                          { key: "PENDING", label: "Pending Transfers" },
                          { key: "SUMMARY", label: "Today's Summary" },
                          { key: "BENEFICIARIES", label: "Recent Beneficiaries" },
                        ].map((t) => (
                          <Chip
                            key={t.key}
                            label={t.label}
                            onClick={() => setCenterTab(t.key as any)}
                            sx={{
                              fontWeight: 800,
                              fontSize: "12px",
                              bgcolor: centerTab === t.key ? BANK_BLUE : "#F1F5F9",
                              color: centerTab === t.key ? "#FFFFFF" : "#64748B",
                              cursor: "pointer",
                              borderRadius: "8px",
                              "&:hover": { bgcolor: BANK_BLUE, color: "#FFFFFF" },
                            }}
                          />
                        ))}
                      </Stack>

                      {/* TAB CONTENT: RECENT TRANSACTIONS */}
                      {centerTab === "RECENT" && (
                        <Stack spacing={1}>
                          {[
                            { ref: "TXN8912401", customer: "Ramesh Kumar", ben: "Sathus Tech Pvt Ltd", amount: "₹5,000.00", status: "SUCCESS", time: "12 mins ago" },
                            { ref: "TXN8912400", customer: "Anita Sharma", ben: "Rajesh Hardware Stores", amount: "₹10,000.00", status: "SUCCESS", time: "2 hours ago" },
                            { ref: "TXN8912399", customer: "Vijay Patel", ben: "Priya Enterprises", amount: "₹2,500.00", status: "SUCCESS", time: "Yesterday" },
                          ].map((row) => (
                            <Paper key={row.ref} elevation={0} sx={{ p: 1.5, borderRadius: "12px", bgcolor: "#F8FAFC", border: "1px solid #E8EBF3" }}>
                              <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                                <Box>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0F172A", fontSize: "13px" }}>
                                    {row.ref} • {row.customer} → {row.ben}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: "#64748B", fontSize: "11px" }}>
                                    {row.time} • IMPS Settlement
                                  </Typography>
                                </Box>
                                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: BANK_BLUE, fontSize: "14px" }}>
                                    {row.amount}
                                  </Typography>
                                  <Chip label={row.status} size="small" sx={{ height: 20, fontSize: "10px", fontWeight: 800, bgcolor: SUCCESS_LIGHT, color: SUCCESS_GREEN }} />
                                </Stack>
                              </Stack>
                            </Paper>
                          ))}
                        </Stack>
                      )}

                      {/* TAB CONTENT: FAVOURITE CUSTOMERS */}
                      {centerTab === "FAVOURITES" && (
                        <Grid container spacing={1.5}>
                          {[
                            { name: "Ramesh Kumar", mobile: "9176669426", limit: "₹75,000" },
                            { name: "Anita Sharma", mobile: "9840123456", limit: "₹75,000" },
                            { name: "Vijay Patel", mobile: "9940567890", limit: "₹50,000" },
                          ].map((fc) => (
                            <Grid key={fc.mobile} size={{ xs: 12, sm: 4 }}>
                              <Paper
                                elevation={0}
                                onClick={() => {
                                  setSearchQuery(fc.mobile);
                                  handleCustomerSearch();
                                }}
                                sx={{ p: 1.5, borderRadius: "12px", border: "1px solid #E8EBF3", cursor: "pointer", "&:hover": { borderColor: BANK_GOLD } }}
                              >
                                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{fc.name}</Typography>
                                <Typography variant="caption" sx={{ color: "#64748B" }}>+91 {fc.mobile} • Limit: {fc.limit}</Typography>
                              </Paper>
                            </Grid>
                          ))}
                        </Grid>
                      )}

                      {/* TAB CONTENT: TODAY'S SUMMARY */}
                      {centerTab === "SUMMARY" && (
                        <Paper elevation={0} sx={{ p: 2, borderRadius: "12px", bgcolor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 3 }}>
                              <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700 }}>Total Executed Volume</Typography>
                              <Typography variant="h6" sx={{ fontWeight: 900, color: BANK_BLUE }}>₹1,24,500.00</Typography>
                            </Grid>
                            <Grid size={{ xs: 3 }}>
                              <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700 }}>Total Transactions</Typography>
                              <Typography variant="h6" sx={{ fontWeight: 900, color: "#0F172A" }}>24 Successful</Typography>
                            </Grid>
                            <Grid size={{ xs: 3 }}>
                              <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700 }}>Operator Commission</Typography>
                              <Typography variant="h6" sx={{ fontWeight: 900, color: SUCCESS_GREEN }}>+ ₹450.00</Typography>
                            </Grid>
                            <Grid size={{ xs: 3 }}>
                              <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700 }}>Success Rate</Typography>
                              <Typography variant="h6" sx={{ fontWeight: 900, color: SUCCESS_GREEN }}>100% Clean</Typography>
                            </Grid>
                          </Grid>
                        </Paper>
                      )}

                      {/* TAB CONTENT: PENDING / BENEFICIARIES FALLBACK */}
                      {(centerTab === "PENDING" || centerTab === "BENEFICIARIES") && (
                        <Paper elevation={0} sx={{ p: 2.5, textAlign: "center", bgcolor: "#F8FAFC", borderRadius: "12px" }}>
                          <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700 }}>
                            {centerTab === "PENDING" ? "Zero Pending Transfers. All payouts dispatches cleared." : "3 Active Beneficiaries Available."}
                          </Typography>
                        </Paper>
                      )}
                    </Box>
                  </Paper>
                )}

            {/* STEP 2: BENEFICIARY SELECTION */}
            {activeStep === 2 && (
              <Paper elevation={0} sx={{ ...CARD_STYLE, p: 4, bgcolor: "#FFFFFF", borderTop: `4px solid ${BANK_GOLD}` }}>
                <Paper elevation={0} sx={{ p: 1.5, px: 2, mb: 3, borderRadius: "12px", bgcolor: BANK_BLUE_LIGHT, border: `1px solid #BFDBFE`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: BANK_BLUE, fontSize: "14px" }}>
                    Customer: <strong>{selectedCustomer?.full_name}</strong> (+91 {selectedCustomer?.mobile_number})
                  </Typography>
                  <Button size="small" onClick={() => setActiveStep(1)} sx={{ fontSize: "12px", fontWeight: 700, color: BANK_BLUE, textTransform: "none" }}>
                    Change
                  </Button>
                </Paper>

                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: "#0F172A", fontSize: "22px" }}>
                    Select Beneficiary ({activeBeneficiaries.length})
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<AddIcon sx={{ color: "#FFFFFF" }} />}
                    onClick={() => setBeneficiaryMasterSlideOverOpen(true)}
                    sx={{ ...PRIMARY_BTN_SX, height: "44px", fontSize: "14px", px: 2.5, borderRadius: "12px" }}
                  >
                    + Add Beneficiary
                  </Button>
                </Stack>

                <M3TextField
                  label="Search Beneficiary"
                  placeholder="Search by Name, Account, Last 4 Digits or IFSC..."
                  value={beneficiarySearchQuery}
                  onChange={(e) => setBeneficiarySearchQuery(e.target.value)}
                  startAdornment={<SearchIcon sx={{ color: "#C99819", fontSize: 22 }} />}
                  sx={{ ...SEARCH_INPUT_SX, mb: 2 }}
                />

                <Stack direction="row" spacing={1} sx={{ mb: 2.5 }}>
                  {(["ALL", "RECENT", "FAVOURITE", "VERIFIED"] as const).map((tab) => (
                    <Chip
                      key={tab}
                      label={tab}
                      onClick={() => setBeneficiaryFilter(tab)}
                      sx={{
                        fontWeight: 700,
                        fontSize: "12px",
                        bgcolor: beneficiaryFilter === tab ? BANK_GOLD : "#FFFFFF",
                        color: beneficiaryFilter === tab ? "#FFF" : "#64748B",
                        border: `1px solid ${BANK_GOLD_BORDER}`,
                        cursor: "pointer",
                      }}
                    />
                  ))}
                </Stack>

                {filteredBeneficiaries.length === 0 ? (
                  <Paper elevation={0} sx={{ p: 5, textAlign: "center", bgcolor: "#F8FAFC", border: "1px dashed #CBD5E1", borderRadius: "14px" }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#64748B", mb: 2 }}>
                      No active beneficiaries available.
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={() => setBeneficiaryMasterSlideOverOpen(true)}
                      sx={{ ...PRIMARY_BTN_SX, height: "48px", fontSize: "15px", px: 3.5 }}
                    >
                      + Add Beneficiary
                    </Button>
                  </Paper>
                ) : (
                  <Stack spacing={2}>
                    {filteredBeneficiaries.map((b) => {
                      const isSelected = selectedBeneficiary?.account_number === b.account_number;
                      const isFav = favouriteBens.has(b.account_number);

                      return (
                        <Paper
                          key={b.account_number}
                          elevation={0}
                          onClick={() => setSelectedBeneficiary(b)}
                          sx={{
                            p: 2.5,
                            borderRadius: "14px",
                            backgroundColor: isSelected ? "#FFF8E6" : "#FFFFFF",
                            border: isSelected ? `2px solid ${BANK_GOLD}` : `1px solid #E2E8F0`,
                            borderLeft: isSelected ? `5px solid ${BANK_MAROON}` : `1px solid #E2E8F0`,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            "&:hover": { borderColor: BANK_GOLD_BORDER },
                          }}
                        >
                          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                              <Avatar sx={{ bgcolor: isSelected ? BANK_GOLD : BANK_GOLD_LIGHT, color: isSelected ? "#FFF" : BANK_GOLD, width: 44, height: 44 }}>
                                <AccountBalanceIcon sx={{ fontSize: 22 }} />
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0F172A", fontSize: "16px" }}>
                                  {b.registered_name_in_bank || b.account_holder_name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600, fontSize: "13px" }}>
                                  {b.bank_name} • Account: <strong>{b.account_number}</strong> • IFSC: {b.ifsc_code}
                                </Typography>
                              </Box>
                            </Stack>

                            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                              <Chip label="Penny Drop ✓" size="small" sx={{ height: 22, fontSize: "11px", fontWeight: 700, bgcolor: SUCCESS_LIGHT, color: SUCCESS_GREEN }} />

                              <Tooltip title="View Details">
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); setViewDetailsBeneficiary(b); }}>
                                  <InfoOutlinedIcon sx={{ fontSize: 18, color: BANK_BLUE }} />
                                </IconButton>
                              </Tooltip>

                              <Tooltip title="Edit Beneficiary">
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); setBeneficiaryMasterSlideOverOpen(true); }}>
                                  <EditIcon sx={{ fontSize: 18, color: "#64748B" }} />
                                </IconButton>
                              </Tooltip>

                              <Tooltip title="Toggle Favourite">
                                <IconButton size="small" onClick={(e) => toggleFavourite(b.account_number, e)}>
                                  {isFav ? <StarIcon sx={{ color: BANK_GOLD, fontSize: 18 }} /> : <StarBorderIcon sx={{ color: "#94A3B8", fontSize: 18 }} />}
                                </IconButton>
                              </Tooltip>

                              <Tooltip title="Remove Beneficiary">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirmBeneficiary(b);
                                    setDeleteReason("");
                                    setConfirmCheckboxChecked(false);
                                  }}
                                  sx={{
                                    minWidth: 32,
                                    width: 32,
                                    height: 32,
                                    p: 0,
                                    borderRadius: "8px",
                                    bgcolor: "#FFFFFF",
                                    color: ERROR_RED,
                                    borderColor: ERROR_RED,
                                    "&:hover": {
                                      bgcolor: ERROR_RED,
                                      color: "#FFFFFF",
                                      borderColor: ERROR_RED,
                                    },
                                  }}
                                >
                                  <DeleteIcon sx={{ fontSize: 18 }} />
                                </Button>
                              </Tooltip>
                            </Stack>
                          </Stack>
                        </Paper>
                      );
                    })}
                  </Stack>
                )}
              </Paper>
            )}

            {/* STEP 3: TRANSFER AMOUNT ONLY */}
            {activeStep === 3 && (
              <Paper elevation={0} sx={{ ...CARD_STYLE, p: 4, borderTop: `4px solid ${BANK_GOLD}` }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: "#0F172A", fontSize: "22px", mb: 2.5 }}>
                  Transfer Amount &amp; Settlement Mode
                </Typography>

                <Grid container spacing={2} sx={{ mb: 2.5 }}>
                  {[
                    { id: "IMPS", label: "IMPS (Instant 24x7)", icon: <FlashOnIcon sx={{ fontSize: 20 }} /> },
                    { id: "NEFT", label: "NEFT (Batch Settlement)", icon: <SpeedIcon sx={{ fontSize: 20 }} /> },
                  ].map((m) => (
                    <Grid key={m.id} size={{ xs: 6 }}>
                      <Paper elevation={0} onClick={() => setMode(m.id as "IMPS" | "NEFT")} sx={{ p: 2, borderRadius: "12px", textAlign: "center", cursor: "pointer", border: mode === m.id ? `2px solid ${BANK_GOLD}` : "1px solid #E2E8F0", bgcolor: mode === m.id ? BANK_GOLD_LIGHT : "#F8FAFC" }}>
                        <Box sx={{ color: mode === m.id ? BANK_GOLD : "#64748B", mb: 0.5 }}>{m.icon}</Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: mode === m.id ? BANK_GOLD : "#0F172A", fontSize: "14px" }}>{m.label}</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>

                <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap" }}>
                  {["500", "1000", "2000", "5000", "10000"].map((val) => (
                    <Chip
                      key={val}
                      label={`+ ₹${val}`}
                      onClick={() => {
                        const addVal = parseInt(val, 10);
                        setAmount((prev) => ((parseFloat(prev) || 0) + addVal).toString());
                      }}
                      sx={{ fontWeight: 700, bgcolor: BANK_GOLD_LIGHT, color: BANK_GOLD, border: `1px solid ${BANK_GOLD_BORDER}`, cursor: "pointer", fontSize: "13px" }}
                    />
                  ))}
                </Stack>

                <M3CurrencyInput label="Transfer Amount (₹)" value={amount} onChange={(e) => setAmount(e.target.value)} />
                {numAmount > 0 && (
                  <Typography variant="h4" sx={{ fontWeight: 800, color: BANK_GOLD, mt: 1, mb: 1, fontSize: "34px" }}>
                    ₹{numAmount.toLocaleString("en-IN")}
                  </Typography>
                )}
                <Typography variant="caption" sx={{ color: BANK_BLUE, fontWeight: 700, display: "block", mb: 3 }}>
                  {numberToWords(numAmount)}
                </Typography>

                <Paper elevation={0} sx={{ p: 2.5, borderRadius: "14px", bgcolor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                  <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, display: "block", mb: 1.5, textTransform: "uppercase" }}>FEE &amp; WALLET IMPACT</Typography>
                  <Stack spacing={1}>
                    <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                      <Typography variant="body2" sx={{ color: "#64748B" }}>Transfer Amount</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: BANK_GOLD }}>₹{numAmount.toLocaleString("en-IN")}</Typography>
                    </Stack>
                    <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                      <Typography variant="body2" sx={{ color: "#64748B" }}>Service Charge &amp; GST (18%)</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: "#64748B" }}>₹{(charges + gst).toFixed(2)}</Typography>
                    </Stack>
                    <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                      <Typography variant="body2" sx={{ color: SUCCESS_GREEN, fontWeight: 700 }}>Retailer Commission</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: SUCCESS_GREEN }}>+ ₹{commission.toFixed(2)}</Typography>
                    </Stack>
                    <Divider sx={{ my: 0.5 }} />
                    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Net Wallet Debit</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: BANK_MAROON, fontSize: "32px" }}>₹{netDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Typography>
                    </Stack>
                    <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                      <Typography variant="caption" sx={{ color: SUCCESS_GREEN, fontWeight: 600 }}>Wallet After</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: SUCCESS_GREEN, fontSize: "14px" }}>₹{walletAfter.toLocaleString()}</Typography>
                    </Stack>
                  </Stack>
                </Paper>
              </Paper>
            )}

            {/* STEP 4: REVIEW ONLY */}
            {activeStep === 4 && (
              <Paper elevation={0} sx={{ ...CARD_STYLE, p: 4 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: "#0F172A", fontSize: "22px", mb: 2.5 }}>
                  Transaction Review
                </Typography>

                <Stack spacing={2.5}>
                  <Paper elevation={0} sx={{ p: 2.5, borderRadius: "14px", borderLeft: `5px solid ${BANK_BLUE}`, bgcolor: BANK_BLUE_LIGHT, border: "1px solid #E2E8F0" }}>
                    <Typography variant="caption" sx={{ color: BANK_BLUE, fontWeight: 800, display: "block", mb: 0.5, textTransform: "uppercase" }}>SENDER (CUSTOMER)</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0F172A" }}>{selectedCustomer?.full_name}</Typography>
                    <Typography variant="caption" sx={{ color: "#64748B" }}>+91 {selectedCustomer?.mobile_number} • ID: {selectedCustomer?.customer_number}</Typography>
                  </Paper>

                  <Paper elevation={0} sx={{ p: 2.5, borderRadius: "14px", borderLeft: `5px solid ${BANK_GOLD}`, bgcolor: BANK_GOLD_LIGHT, border: `1px solid ${BANK_GOLD_BORDER}` }}>
                    <Typography variant="caption" sx={{ color: BANK_GOLD, fontWeight: 800, display: "block", mb: 0.5, textTransform: "uppercase" }}>BENEFICIARY</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0F172A" }}>{selectedBeneficiary?.registered_name_in_bank || selectedBeneficiary?.account_holder_name}</Typography>
                    <Typography variant="caption" sx={{ color: "#64748B" }}>{selectedBeneficiary?.bank_name} • Account: {selectedBeneficiary?.account_number} • IFSC: {selectedBeneficiary?.ifsc_code}</Typography>
                  </Paper>

                  <Paper elevation={0} sx={{ p: 2.5, borderRadius: "14px", borderLeft: `5px solid ${BANK_MAROON}`, bgcolor: BANK_MAROON_LIGHT, border: "1px solid #E2E8F0" }}>
                    <Typography variant="caption" sx={{ color: BANK_MAROON, fontWeight: 800, display: "block", mb: 1.5, textTransform: "uppercase" }}>FINANCIAL SUMMARY</Typography>
                    <Stack spacing={1}>
                      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                        <Typography variant="body2" sx={{ color: "#64748B" }}>Transfer Amount</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: BANK_GOLD, fontSize: "20px" }}>₹{numAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Typography>
                      </Stack>
                      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                        <Typography variant="body2" sx={{ color: "#64748B" }}>Settlement Mode</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: BANK_BLUE }}>IMPS Instant (&lt; 2 Seconds)</Typography>
                      </Stack>
                      <Divider sx={{ my: 0.5 }} />
                      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: BANK_MAROON }}>Net Wallet Debit</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: BANK_MAROON, fontSize: "26px" }}>₹{netDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Typography>
                      </Stack>
                    </Stack>
                  </Paper>

                  <M3TextField label="Remarks / References (Optional)" placeholder="Add transaction note..." value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                </Stack>
              </Paper>
            )}

            {/* STEP 5: AUTHENTICATION ONLY */}
            {activeStep === 5 && (
              <Paper elevation={0} sx={{ ...CARD_STYLE, p: 4, borderTop: `4px solid ${BANK_MAROON}` }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: BANK_MAROON, fontSize: "22px", mb: 2.5 }}>
                  Retailer Security MPIN
                </Typography>

                <M3TextField label="Retailer 4-Digit Security MPIN" type="password" value={customerPin} onChange={(e) => setCustomerPin(e.target.value)} sx={{ mb: 3 }} />

                <Alert severity="success" icon={<LockOutlinedIcon sx={{ color: SUCCESS_GREEN }} />} sx={{ mb: 3, borderRadius: "12px", fontWeight: 600 }}>
                  ✓ Risk &amp; Anti-Fraud Checks Passed. Real-time IMPS Dispatch Ready.
                </Alert>

                <SlideToSend disabled={!isAllValid} onConfirm={handleExecutePayout} label="Slide to Transfer →" />
              </Paper>
            )}

            {/* STEP 6: PENDING / PROCESSING HERO */}
            {activeStep === 6 && (
              <Paper elevation={0} sx={{ ...CARD_STYLE, p: 5, textAlign: "center", borderTop: `4px solid ${BANK_BLUE}` }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: BANK_BLUE, fontSize: "22px", mb: 1 }}>
                  Processing Payout Dispatch
                </Typography>

                <Typography variant="body2" sx={{ color: "#64748B", fontWeight: 600, mb: 4 }}>
                  Please do not refresh or close the page
                </Typography>

                <CircularProgress size={56} thickness={4} sx={{ color: BANK_BLUE, mb: 4 }} />

                <Paper elevation={0} sx={{ p: 2.5, borderRadius: "14px", bgcolor: BANK_BLUE_LIGHT, border: "1px solid #BFDBFE", maxWidth: 440, mx: "auto" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: BANK_BLUE, fontSize: "14px" }}>
                    {pendingStatuses[pendingStatusIndex]}
                  </Typography>
                </Paper>
              </Paper>
            )}
          </motion.div>
        </AnimatePresence>
      </Grid>

      {/* ZONE 4: CONTEXTUAL INTELLIGENCE PANEL (30% WIDTH) */}
      <Grid size={{ xs: 12, md: 3.5 }}>
        <Stack spacing={2.5}>
          {/* ROTATING LIVE INTELLIGENCE TICKER */}
          <Paper elevation={0} sx={{ ...CARD_STYLE, p: 2.5, background: "linear-gradient(135deg, #0F2C59 0%, #1A407B 100%)", color: "#FFFFFF" }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1.5 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#4ADE80", boxShadow: "0 0 12px #4ADE80" }} />
                  <Typography variant="caption" sx={{ fontWeight: 800, color: BANK_GOLD, textTransform: "uppercase", letterSpacing: "1px", fontSize: "11px" }}>
                    LIVE INTELLIGENCE TICKER
                  </Typography>
                </Stack>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={intelligenceIndex}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                  >
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                      {intelligenceItems[intelligenceIndex].icon}
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "14px", color: "#FFFFFF" }}>
                          {intelligenceItems[intelligenceIndex].title}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "12px" }}>
                          {intelligenceItems[intelligenceIndex].detail}
                        </Typography>
                      </Box>
                    </Stack>
                  </motion.div>
                </AnimatePresence>
              </Paper>

              {/* BANK HEALTH MATRIX */}
              <Paper elevation={0} sx={{ ...CARD_STYLE, p: 2.5 }}>
                <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.8px", display: "block", mb: 2 }}>
                  REAL-TIME BANK HEALTH MATRIX
                </Typography>
                <Stack spacing={1.5}>
                  {[
                    { bank: "HDFC Bank", uptime: "99.9%", latency: "0.4s", status: "Operational", color: SUCCESS_GREEN },
                    { bank: "ICICI Bank", uptime: "99.7%", latency: "0.6s", status: "Operational", color: SUCCESS_GREEN },
                    { bank: "State Bank of India", uptime: "99.5%", latency: "0.9s", status: "Operational", color: SUCCESS_GREEN },
                    { bank: "Axis Bank", uptime: "99.8%", latency: "0.5s", status: "Operational", color: SUCCESS_GREEN },
                  ].map((b) => (
                    <Paper key={b.bank} elevation={0} sx={{ p: 1.5, borderRadius: "12px", bgcolor: "#F8FAFC", border: "1px solid #E8EBF3" }}>
                      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0F172A", fontSize: "13px" }}>
                            {b.bank}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#64748B", fontSize: "11px" }}>
                            Uptime {b.uptime} • Latency {b.latency}
                          </Typography>
                        </Box>
                        <Chip label={b.status} size="small" sx={{ height: 20, fontSize: "10px", fontWeight: 700, bgcolor: SUCCESS_LIGHT, color: b.color }} />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Paper>

              {/* WALLET TELEMETRY & EARNINGS */}
              <Paper elevation={0} sx={{ ...CARD_STYLE, p: 2.5, bgcolor: "linear-gradient(135deg, #FFF8E8 0%, #FFFFFF 100%)", border: `1px solid ${BANK_GOLD_BORDER}` }}>
                <Typography variant="caption" sx={{ color: BANK_BLUE, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.8px", display: "block", mb: 1.5 }}>
                  WALLET TELEMETRY &amp; COMMISSION
                </Typography>
                <Stack spacing={1.2}>
                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600 }}>Main Balance</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900, color: BANK_BLUE }}>₹{wallet.mainBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600 }}>Today's Margin</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: SUCCESS_GREEN }}>+ ₹{wallet.todayMargin.toFixed(2)}</Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600 }}>Transactions Today</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0F172A" }}>24 Executed</Typography>
                  </Stack>
                </Stack>
              </Paper>

              {/* CARD 4: OPERATIONAL ALERTS */}
              <Paper elevation={0} sx={{ ...CARD_STYLE, p: 2.5, bgcolor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.8px", display: "block", mb: 1.5 }}>
                  OPERATIONAL ALERTS &amp; HEALTH
                </Typography>
                <Stack spacing={1.2}>
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600 }}>Failed Transactions Today</Typography>
                    <Chip label="0 Failed" size="small" sx={{ height: 20, fontSize: "10px", fontWeight: 800, bgcolor: SUCCESS_LIGHT, color: SUCCESS_GREEN }} />
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600 }}>Pending Approvals</Typography>
                    <Chip label="0 Pending" size="small" sx={{ height: 20, fontSize: "10px", fontWeight: 800, bgcolor: SUCCESS_LIGHT, color: SUCCESS_GREEN }} />
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600 }}>Settlement Delays</Typography>
                    <Chip label="None" size="small" sx={{ height: 20, fontSize: "10px", fontWeight: 800, bgcolor: SUCCESS_LIGHT, color: SUCCESS_GREEN }} />
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600 }}>Bank Maintenance</Typography>
                    <Chip label="None Scheduled" size="small" sx={{ height: 20, fontSize: "10px", fontWeight: 800, bgcolor: "#F1F5F9", color: "#475569" }} />
                  </Stack>
                </Stack>
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      </Box>

      {/* ── STICKY BOTTOM ACTION BAR & KEYBOARD SHORTCUTS STATUS FOOTER ── */}
      <Paper
        elevation={0}
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: 72,
          bgcolor: "#FFFFFF",
          borderTop: "1px solid #E2E8F0",
          zIndex: 1100,
          px: 3,
          display: "flex",
          alignItems: "center",
          boxShadow: "0 -4px 20px rgba(15, 23, 42, 0.08)",
        }}
      >
        <Box sx={{ maxWidth: 1400, width: "100%", mx: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* KEYBOARD SHORTCUTS HINTS */}
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", display: { xs: "none", lg: "flex" } }}>
            <Chip label="F1 Help" size="small" sx={{ height: 22, fontSize: "11px", fontWeight: 700, bgcolor: "#F1F5F9", color: "#475569" }} />
            <Chip label="Ctrl+K Search" size="small" sx={{ height: 22, fontSize: "11px", fontWeight: 700, bgcolor: "#F1F5F9", color: "#475569" }} />
            <Chip label="ESC Cancel" size="small" sx={{ height: 22, fontSize: "11px", fontWeight: 700, bgcolor: "#F1F5F9", color: "#475569" }} />
            <Chip label="F9 Refresh" size="small" sx={{ height: 22, fontSize: "11px", fontWeight: 700, bgcolor: "#F1F5F9", color: "#475569" }} />
          </Stack>

          {/* ACTION BUTTONS */}
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <Button
              variant="outlined"
              disabled={activeStep <= 1 || activeStep >= 6}
              onClick={handlePrevStep}
              sx={{
                color: "#0F3D91",
                borderColor: "#0F3D91",
                fontWeight: 700,
                px: 3,
                borderRadius: "12px",
                textTransform: "none",
                height: 44,
                fontSize: "14px",
                borderWidth: "1.5px",
                "&:hover": { bgcolor: BANK_BLUE_LIGHT, borderWidth: "1.5px", borderColor: "#0F3D91" },
              }}
            >
              ← Previous
            </Button>

            <Typography variant="subtitle2" sx={{ color: "#0F172A", fontWeight: 800, fontSize: "15px" }}>
              Step {Math.min(activeStep, 6)} of 6
            </Typography>

            {activeStep < 5 ? (
              <Button
                variant="contained"
                disabled={!canAdvanceCurrentStep()}
                onClick={handleNextStep}
                endIcon={<ArrowForwardIcon sx={{ color: "#FFFFFF" }} />}
                sx={{
                  ...PRIMARY_BTN_SX,
                  height: "46px",
                  fontSize: "15px",
                  px: 3.5,
                }}
              >
                {getStepButtonLabel()}
              </Button>
            ) : activeStep === 5 ? (
              <Box sx={{ width: 260 }}>
                <SlideToSend disabled={!isAllValid} onConfirm={handleExecutePayout} label="Slide to Transfer →" />
              </Box>
            ) : (
              <Box sx={{ width: 140 }} />
            )}
          </Stack>

          {/* NODE STATUS & LAST SYNC */}
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: SUCCESS_GREEN, boxShadow: `0 0 8px ${SUCCESS_GREEN}` }} />
            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, fontSize: "12px" }}>
              Live Banking Switch 100% • Sync Just now
            </Typography>
          </Stack>
        </Box>
      </Paper>

      {/* ── REDESIGNED COMPACT ENTERPRISE DELETE CONFIRMATION MODAL ── */}
      <Dialog
        open={!!deleteConfirmBeneficiary}
        onClose={() => {
          setDeleteConfirmBeneficiary(null);
          setDeleteReason("");
          setConfirmCheckboxChecked(false);
        }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: "20px",
              p: 0,
              maxWidth: 720,
              maxHeight: 620,
              width: "100%",
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(15, 44, 89, 0.22)",
              border: "1px solid rgba(212, 175, 55, 0.3)",
              bgcolor: "#FFFFFF",
            },
          },
          transition: { timeout: 200 },
        }}
      >
        {/* COMPACT GLASSMORPHISM HEADER */}
        <DialogTitle
          sx={{
            py: 1.5,
            px: 3,
            background: "rgba(255, 255, 255, 0.85)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid #E2E8F0",
          }}
        >
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: BANK_MAROON, fontSize: "20px", letterSpacing: "-0.4px", lineHeight: 1.2 }}>
                Remove Beneficiary
              </Typography>
              <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, fontSize: "12px" }}>
                Soft Delete • Audit Enabled • Transaction history is preserved.
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={() => {
                setDeleteConfirmBeneficiary(null);
                setDeleteReason("");
                setConfirmCheckboxChecked(false);
              }}
              sx={{ color: "#64748B", "&:hover": { color: BANK_MAROON } }}
            >
              <CloseIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Stack>
        </DialogTitle>

        {/* SOLID WHITE CONTENT AREA (ZERO SCROLLBARS) */}
        <DialogContent sx={{ p: 2.5, bgcolor: "#FFFFFF", overflow: "hidden" }}>
          <Stack spacing={2}>
            {/* COMPACT TWO-COLUMN BENEFICIARY SUMMARY */}
            <Paper elevation={0} sx={{ p: 2, borderRadius: "14px", bgcolor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
              <Grid container spacing={2} sx={{ alignItems: "center" }}>
                {/* COLUMN 1 */}
                <Grid size={{ xs: 6 }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1 }}>
                    <Avatar sx={{ bgcolor: BANK_GOLD_LIGHT, color: BANK_GOLD, width: 38, height: 38, fontWeight: 800, fontSize: "15px" }}>
                      {deleteConfirmBeneficiary?.account_holder_name?.[0] || "B"}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0F172A", fontSize: "15px", lineHeight: 1.1 }}>
                        {deleteConfirmBeneficiary?.registered_name_in_bank || deleteConfirmBeneficiary?.account_holder_name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600, fontSize: "12px" }}>
                        {deleteConfirmBeneficiary?.bank_name}
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography variant="caption" sx={{ color: "#64748B", display: "block", fontSize: "12px" }}>
                    Account: <strong>XXXX{deleteConfirmBeneficiary?.account_number.slice(-4)}</strong> • IFSC: <strong>{deleteConfirmBeneficiary?.ifsc_code}</strong>
                  </Typography>
                </Grid>

                {/* COLUMN 2 */}
                <Grid size={{ xs: 6 }} sx={{ borderLeft: "1px solid #E2E8F0", pl: 2 }}>
                  <Stack direction="row" spacing={1} sx={{ mb: 0.8 }}>
                    <Chip label="Penny Drop Verified ✓" size="small" sx={{ height: 20, fontSize: "10px", fontWeight: 700, bgcolor: SUCCESS_LIGHT, color: SUCCESS_GREEN }} />
                    {favouriteBens.has(deleteConfirmBeneficiary?.account_number || "") && (
                      <Chip label="⭐ Favourite" size="small" sx={{ height: 20, fontSize: "10px", fontWeight: 700, bgcolor: BANK_GOLD_LIGHT, color: BANK_GOLD }} />
                    )}
                  </Stack>
                  <Grid container spacing={0.5}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" sx={{ color: "#64748B", fontSize: "11px", display: "block" }}>Added: <strong>14 Jan 2025</strong></Typography>
                      <Typography variant="caption" sx={{ color: "#64748B", fontSize: "11px", display: "block" }}>Last Used: <strong>Yesterday</strong></Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" sx={{ color: "#64748B", fontSize: "11px", display: "block" }}>Transfers: <strong>12 Total</strong></Typography>
                      <Typography variant="caption" sx={{ color: "#64748B", fontSize: "11px", display: "block" }}>Total: <strong style={{ color: BANK_GOLD }}>₹1,45,000</strong></Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Paper>

            {/* COMPACT GOLD INFORMATION CARD */}
            <Paper elevation={0} sx={{ p: 1.5, px: 2, borderRadius: "12px", bgcolor: "#FFF9EE", border: "1px solid #F0C75E" }}>
              <Grid container spacing={1}>
                {[
                  "Removed from active list",
                  "History remains",
                  "Wallet unaffected",
                  "Can be restored later",
                ].map((info) => (
                  <Grid key={info} size={{ xs: 3 }}>
                    <Typography variant="caption" sx={{ color: "#78350F", fontWeight: 700, fontSize: "11px", display: "flex", alignItems: "center", gap: 0.5 }}>
                      ✓ {info}
                    </Typography>
                  </Grid>
                ))}
              </Grid>
            </Paper>

            {/* REASON FOR REMOVAL DROPDOWN */}
            <FormControl fullWidth size="small">
              <InputLabel id="delete-reason-label" sx={{ color: "#475569", fontWeight: 600, fontSize: "13px" }}>Reason for Removal (Optional)</InputLabel>
              <Select
                labelId="delete-reason-label"
                value={deleteReason}
                label="Reason for Removal (Optional)"
                onChange={(e) => setDeleteReason(e.target.value)}
                sx={{ borderRadius: "10px", bgcolor: "#FFFFFF", height: 42, fontSize: "13px" }}
              >
                <MenuItem value="Duplicate Beneficiary">Duplicate Beneficiary</MenuItem>
                <MenuItem value="Wrong Account">Wrong Account</MenuItem>
                <MenuItem value="Customer Requested">Customer Requested</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>

            {/* MANDATORY CONFIRMATION CHECKBOX */}
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={confirmCheckboxChecked}
                  onChange={(e) => setConfirmCheckboxChecked(e.target.checked)}
                  sx={{ color: BANK_MAROON, "&.Mui-checked": { color: BANK_MAROON }, py: 0 }}
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: 700, color: "#0F172A", fontSize: "13px" }}>
                  I understand this beneficiary will be removed from active transfers.
                </Typography>
              }
              sx={{ my: 0 }}
            />
          </Stack>
        </DialogContent>

        {/* STICKY GLASSMORPHISM FOOTER */}
        <DialogActions
          sx={{
            py: 1.5,
            px: 3,
            background: "rgba(255, 255, 255, 0.85)",
            backdropFilter: "blur(12px)",
            borderTop: "1px solid #E2E8F0",
            gap: 1.5,
          }}
        >
          {/* SECONDARY: KEEP BENEFICIARY */}
          <Button
            variant="outlined"
            onClick={() => {
              setDeleteConfirmBeneficiary(null);
              setDeleteReason("");
              setConfirmCheckboxChecked(false);
            }}
            sx={{
              borderColor: "#0F2C59",
              color: "#0F2C59",
              fontWeight: 700,
              borderRadius: "10px",
              height: 44,
              px: 3,
              textTransform: "none",
              bgcolor: "#FFFFFF",
              fontSize: "14px",
              "&:hover": { bgcolor: BANK_BLUE_LIGHT, borderColor: "#0F2C59" },
            }}
          >
            ← Keep Beneficiary
          </Button>

          {/* PRIMARY: REMOVE BENEFICIARY */}
          <Button
            variant="contained"
            disabled={!confirmCheckboxChecked}
            onClick={handleConfirmSoftDelete}
            sx={{
              background: "linear-gradient(135deg, #7B1E3A 0%, #A61E4D 100%)",
              color: "#FFFFFF",
              fontWeight: 800,
              borderRadius: "10px",
              height: 44,
              px: 3.5,
              textTransform: "none",
              fontSize: "14px",
              boxShadow: "0 4px 14px rgba(123, 30, 58, 0.25)",
              "&:hover": {
                background: "linear-gradient(135deg, #5C132B 0%, #801438 100%)",
              },
              "&:disabled": {
                background: "#E5E7EB !important",
                color: "#9CA3AF !important",
                boxShadow: "none !important",
              },
            }}
          >
            🗑 Remove Beneficiary
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── BENEFICIARY DETAILS MODAL ── */}
      <Dialog
        open={!!viewDetailsBeneficiary}
        onClose={() => setViewDetailsBeneficiary(null)}
        slotProps={{ paper: { sx: { borderRadius: "18px", p: 1, maxWidth: 480 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: BANK_BLUE, fontSize: "20px" }}>
          Beneficiary Account Details
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            {[
              { label: "Account Holder Name", value: viewDetailsBeneficiary?.account_holder_name },
              { label: "Registered Bank Name", value: viewDetailsBeneficiary?.registered_name_in_bank || "Same as above" },
              { label: "Bank Name", value: viewDetailsBeneficiary?.bank_name },
              { label: "Account Number", value: viewDetailsBeneficiary?.account_number },
              { label: "IFSC Code", value: viewDetailsBeneficiary?.ifsc_code },
              { label: "Penny Drop Status", value: "Verified ✓ (Match 100%)" },
            ].map((row) => (
              <Stack key={row.label} direction="row" sx={{ justifyContent: "space-between" }}>
                <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700 }}>{row.label}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: "#0F172A" }}>{row.value || "—"}</Typography>
              </Stack>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setViewDetailsBeneficiary(null)} sx={{ color: BANK_BLUE, fontWeight: 700 }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ── UNDO TOAST SNACKBAR (10 SECONDS) ── */}
      <Snackbar
        open={undoToastOpen}
        autoHideDuration={10000}
        onClose={() => setUndoToastOpen(false)}
        message={undoToastMessage}
        action={
          <Button color="warning" size="small" onClick={handleUndoSoftDelete} sx={{ fontWeight: 800, textTransform: "uppercase" }}>
            Undo
          </Button>
        }
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />

      {/* ── 360PX LIVE BANKING INTELLIGENCE DRAWER ── */}
      <Drawer
        anchor="right"
        open={systemDrawerOpen}
        onClose={() => setSystemDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: 360,
              p: 3,
              bgcolor: "#0F2C59",
              color: "#FFFFFF",
              backgroundImage: "radial-gradient(circle at 90% 10%, rgba(212, 175, 55, 0.15) 0%, transparent 60%)",
            },
          },
        }}
      >
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: BANK_GOLD, fontSize: "18px" }}>
              Live Intelligence
            </Typography>
            <Typography variant="caption" sx={{ color: "#94A3B8" }}>
              Real-time Banking Switch &amp; Fraud Telemetry
            </Typography>
          </Box>
          <IconButton onClick={() => setSystemDrawerOpen(false)} sx={{ color: "#94A3B8", "&:hover": { color: "#FFF" } }}>
            <CloseIcon />
          </IconButton>
        </Stack>

        <Stack spacing={2}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: "14px", bgcolor: "rgba(22, 163, 74, 0.15)", border: "1px solid #16A34A", color: "#FFF" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
              <FlashOnIcon sx={{ color: "#4ADE80", fontSize: 18 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#4ADE80" }}>NPCI IMPS Switch</Typography>
            </Stack>
            <Typography variant="caption" sx={{ color: "#E2E8F0" }}>100% Operational • 0.8s Avg Latency</Typography>
          </Paper>

          <Paper elevation={0} sx={{ p: 2, borderRadius: "14px", bgcolor: "rgba(255, 255, 255, 0.08)", border: "1px solid rgba(212, 175, 55, 0.3)", color: "#FFF" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
              <AccountBalanceIcon sx={{ color: BANK_GOLD, fontSize: 18 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: BANK_GOLD }}>Cashfree V2 Gateway</Typography>
            </Stack>
            <Typography variant="caption" sx={{ color: "#E2E8F0" }}>99.8% Success Rate • High Speed</Typography>
          </Paper>

          <Paper elevation={0} sx={{ p: 2, borderRadius: "14px", bgcolor: "rgba(123, 30, 58, 0.3)", border: "1px solid #7B1E3A", color: "#FFF" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
              <ShieldOutlinedIcon sx={{ color: "#F7E7B6", fontSize: 18 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#F7E7B6" }}>Anti-Fraud Engine</Typography>
            </Stack>
            <Typography variant="caption" sx={{ color: "#E2E8F0" }}>Risk Score 0.02 (Cleared) • Zero AML Alerts</Typography>
          </Paper>

          <Paper elevation={0} sx={{ p: 2, borderRadius: "14px", bgcolor: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", color: "#FFF" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
              <SpeedIcon sx={{ color: "#60A5FA", fontSize: 18 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#60A5FA" }}>Core Banking Nodes</Typography>
            </Stack>
            <Typography variant="caption" sx={{ color: "#CBD5E1", display: "block" }}>• HDFC Bank: 99.9% Uptime</Typography>
            <Typography variant="caption" sx={{ color: "#CBD5E1", display: "block" }}>• ICICI Bank: 99.7% Uptime</Typography>
            <Typography variant="caption" sx={{ color: "#CBD5E1", display: "block" }}>• State Bank of India: 99.5% Uptime</Typography>
          </Paper>

          <Box sx={{ mt: 2, p: 2, borderRadius: "14px", bgcolor: "rgba(212, 175, 55, 0.1)", border: "1px solid rgba(212, 175, 55, 0.25)" }}>
            <Typography variant="caption" sx={{ color: BANK_GOLD, fontWeight: 800, textTransform: "uppercase", display: "block" }}>Retailer Session Margin</Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#FFF", mt: 0.5 }}>+₹{wallet.todayMargin.toFixed(2)}</Typography>
          </Box>
        </Stack>
      </Drawer>

      <CustomerMasterSlideOver open={customerMasterSlideOverOpen} onClose={() => setCustomerMasterSlideOverOpen(false)} onSuccess={(customer) => setSelectedCustomer(customer)} />
      <BeneficiaryMasterSlideOver open={beneficiaryMasterSlideOverOpen} onClose={() => setBeneficiaryMasterSlideOverOpen(false)} customerId={selectedCustomer?.customer_number || "9176669426"} onSuccess={(b) => b && setSelectedBeneficiary((prev) => b)} />
    </Box>
  );
}
