import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Paper,
  Chip,
  LinearProgress,
  Avatar,
  Divider,
  Button,
  IconButton,
  Collapse,
  Tooltip,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SyncIcon from "@mui/icons-material/Sync";
import ErrorIcon from "@mui/icons-material/Error";
import ScheduleIcon from "@mui/icons-material/Schedule";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import ShieldIcon from "@mui/icons-material/Shield";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import LockIcon from "@mui/icons-material/Lock";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import PersonIcon from "@mui/icons-material/Person";
import DownloadIcon from "@mui/icons-material/Download";
import ShareIcon from "@mui/icons-material/Share";
import AddIcon from "@mui/icons-material/Add";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ReplayIcon from "@mui/icons-material/Replay";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DoneIcon from "@mui/icons-material/Done";

import { CustomerData } from "../../hooks/useCustomer";
import { BeneficiaryData } from "../../hooks/useBeneficiary";
import { sanitizeCustomerErrorMessage } from "../../services/FinancialAccountingAdapter";

export interface ProgressStep {
  id: string;
  stageKey: string;
  title: string;
  subTitle?: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "WARNING";
  metaText?: string;
}

export interface BankingProgressTimelineProps {
  steps: ProgressStep[];
  activeStepId: string;
  transactionRef?: string;
  amount?: number;
  netDebit?: number;
  isReversing?: boolean;
  reversalSteps?: ProgressStep[];
  activeReversalStepId?: string;
}

export const BankingProgressTimeline: React.FC<BankingProgressTimelineProps> = ({
  steps,
  activeStepId,
  transactionRef,
  amount,
  netDebit,
  isReversing = false,
  reversalSteps = [],
  activeReversalStepId = "",
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeItemRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeItemRef.current && containerRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeStepId, activeReversalStepId]);

  const activeStepIdx = steps.findIndex((s) => s.id === activeStepId);

  return (
    <Paper
      elevation={0}
      sx={{
        width: "100%",
        borderRadius: { xs: "18px", sm: "22px" },
        bgcolor: "rgba(10, 15, 29, 0.95)",
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(251, 191, 36, 0.3)",
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7), 0 0 24px rgba(251, 191, 36, 0.1)",
        p: { xs: 2, sm: 2.5 },
        boxSizing: "border-box",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Top Gold Sheen Accent Line */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "2px",
          background: "linear-gradient(90deg, transparent 0%, #FBBF24 50%, transparent 100%)",
        }}
      />

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          pb: 1.5,
          mb: 1.5,
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <ShieldIcon sx={{ color: "#FBBF24", fontSize: 20 }} />
            <Typography
              sx={{
                fontWeight: 900,
                fontSize: { xs: "14px", sm: "16.5px" },
                background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #F59E0B 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Real-Time Payout Execution Pipeline
            </Typography>
          </Stack>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.65)", fontSize: "11.5px", mt: 0.25 }}>
            Ref: <span style={{ color: "#FDE047", fontFamily: "monospace", fontWeight: 700 }}>{transactionRef || "TXN-INITIATING"}</span>
          </Typography>
        </Box>

        {netDebit && netDebit > 0 && (
          <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.65)", fontSize: "10.5px", fontWeight: 700 }}>
              NET WALLET DEBIT
            </Typography>
            <Typography
              sx={{
                fontWeight: 900,
                fontSize: "17px",
                fontFamily: "var(--font-geist-mono), monospace",
                background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              ₹{netDebit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          </Box>
        )}
      </Stack>

      <Box sx={{ width: "100%", mb: 2.5 }}>
        <LinearProgress
          variant="determinate"
          value={Math.min(100, Math.round(((activeStepIdx + 1) / steps.length) * 100))}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: "rgba(255, 255, 255, 0.08)",
            "& .MuiLinearProgress-bar": {
              borderRadius: 3,
              background: isReversing
                ? "linear-gradient(90deg, #EF4444, #DC2626)"
                : "linear-gradient(90deg, #10B981, #FBBF24)",
            },
          }}
        />
      </Box>

      <Box
        ref={containerRef}
        sx={{
          maxHeight: 380,
          overflowY: "auto",
          pr: 1,
          "&::-webkit-scrollbar": { width: 4 },
          "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(255, 255, 255, 0.2)", borderRadius: 2 },
        }}
      >
        <Stack spacing={1.5} sx={{ position: "relative" }}>
          {steps.map((step) => {
            const isActive = step.id === activeStepId;
            const isCompleted = step.status === "COMPLETED";
            const isProcessing = step.status === "PROCESSING";
            const isFailed = step.status === "FAILED";
            const isWarning = step.status === "WARNING";

            let nodeBg = "rgba(255, 255, 255, 0.03)";
            let nodeBorder = "rgba(255, 255, 255, 0.08)";
            let iconColor = "rgba(255, 255, 255, 0.3)";
            let titleColor = "rgba(255, 255, 255, 0.4)";

            if (isCompleted) {
              nodeBg = "rgba(34, 197, 94, 0.12)";
              nodeBorder = "rgba(34, 197, 94, 0.35)";
              iconColor = "#4ADE80";
              titleColor = "#4ADE80";
            } else if (isProcessing) {
              nodeBg = "rgba(251, 191, 36, 0.2)";
              nodeBorder = "#FBBF24";
              iconColor = "#FDE047";
              titleColor = "#FFFFFF";
            } else if (isFailed) {
              nodeBg = "rgba(239, 68, 68, 0.2)";
              nodeBorder = "#EF4444";
              iconColor = "#EF4444";
              titleColor = "#EF4444";
            } else if (isWarning) {
              nodeBg = "rgba(245, 158, 11, 0.2)";
              nodeBorder = "#F59E0B";
              iconColor = "#FBBF24";
              titleColor = "#FBBF24";
            }

            return (
              <Paper
                key={step.id}
                ref={isActive ? activeItemRef : null}
                elevation={0}
                sx={{
                  p: 1.5,
                  borderRadius: "10px",
                  bgcolor: nodeBg,
                  border: `1px solid ${nodeBorder}`,
                  transition: "all 200ms ease-in-out",
                  boxShadow: isActive ? `0 0 16px ${nodeBorder}` : "none",
                }}
              >
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      bgcolor: "rgba(0, 0, 0, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {isCompleted ? (
                      <CheckCircleIcon sx={{ color: iconColor, fontSize: 20 }} />
                    ) : isProcessing ? (
                      <SyncIcon sx={{ color: iconColor, fontSize: 20, animation: "spin 0.8s linear infinite" }} />
                    ) : isFailed ? (
                      <ErrorIcon sx={{ color: iconColor, fontSize: 20 }} />
                    ) : isWarning ? (
                      <ScheduleIcon sx={{ color: iconColor, fontSize: 20, animation: "pulse 1.2s infinite" }} />
                    ) : (
                      <RadioButtonUncheckedIcon sx={{ color: iconColor, fontSize: 18 }} />
                    )}
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                      <Typography sx={{ fontWeight: isActive ? 900 : 700, color: titleColor, fontSize: "13.5px" }}>
                        {step.title}
                      </Typography>
                      {step.metaText && (
                        <Chip
                          label={step.metaText}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: "10px",
                            fontWeight: 800,
                            bgcolor: "rgba(255, 255, 255, 0.08)",
                            color: isCompleted ? "#4ADE80" : "#93C5FD",
                          }}
                        />
                      )}
                    </Stack>
                    {step.subTitle && (
                      <Typography sx={{ color: "rgba(255, 255, 255, 0.65)", fontSize: "11.5px", mt: 0.25 }}>
                        {step.subTitle}
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </Paper>
            );
          })}

          {isReversing && reversalSteps.length > 0 && (
            <Box sx={{ mt: 2, pt: 2, borderTop: "1px dashed rgba(239, 68, 68, 0.4)" }}>
              <Typography sx={{ color: "#EF4444", fontWeight: 900, fontSize: "13px", mb: 1, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                🔴 Automatic Wallet & Limit Reversal Pipeline
              </Typography>
              <Stack spacing={1}>
                {reversalSteps.map((rStep) => {
                  const isRActive = rStep.id === activeReversalStepId;
                  const isRDone = rStep.status === "COMPLETED";
                  return (
                    <Paper
                      key={rStep.id}
                      elevation={0}
                      sx={{
                        p: 1.25,
                        borderRadius: "8px",
                        bgcolor: isRDone ? "rgba(34, 197, 94, 0.1)" : isRActive ? "rgba(239, 68, 68, 0.2)" : "rgba(255, 255, 255, 0.02)",
                        border: isRDone ? "1px solid rgba(34, 197, 94, 0.3)" : isRActive ? "1px solid #EF4444" : "1px solid rgba(255, 255, 255, 0.05)",
                      }}
                    >
                      <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                        {isRDone ? (
                          <CheckCircleIcon sx={{ color: "#4ADE80", fontSize: 16 }} />
                        ) : isRActive ? (
                          <AutorenewIcon sx={{ color: "#EF4444", fontSize: 16, animation: "spin 0.8s linear infinite" }} />
                        ) : (
                          <RadioButtonUncheckedIcon sx={{ color: "rgba(255, 255, 255, 0.2)", fontSize: 14 }} />
                        )}
                        <Typography sx={{ fontSize: "12px", fontWeight: isRDone ? 800 : 600, color: isRDone ? "#4ADE80" : isRActive ? "#EF4444" : "rgba(255, 255, 255, 0.5)" }}>
                          {rStep.title}
                        </Typography>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            </Box>
          )}
        </Stack>
      </Box>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
      `}</style>
    </Paper>
  );
};

// ── 3-COLUMN ENTERPRISE BANKING EXECUTION CENTER COMPONENT ──

export interface BankingExecutionCenterProps {
  steps: ProgressStep[];
  activeStepId: string;
  transactionRef?: string;
  transactionId?: string;
  amount: number;
  charges: number;
  gst: number;
  totalAmountPaid: number;
  customer: CustomerData | null;
  beneficiary: BeneficiaryData | null;
  transactionMode?: "IMPS" | "NEFT" | "RTGS" | "UPI";
  walletBefore?: number;
  walletAfter?: number;
  dailyLimitRemaining?: number;
  monthlyLimitRemaining?: number;
  elapsedSeconds?: number;
  isReversing?: boolean;
  reversalSteps?: ProgressStep[];
  activeReversalStepId?: string;
  viewState?: "PROCESSING" | "SUCCESS_RECEIPT" | "PENDING_RECEIPT" | "FAILURE_RECEIPT";
  errorMessage?: string | null;
  utr?: string;
  onNewTransfer?: () => void;
  onDashboard?: () => void;
  onDownloadReceipt?: () => void;
  onShareReceipt?: () => void;
  onRetry?: () => void;
}

export const FULL_16_STEPS_TEMPLATE: ProgressStep[] = [
  { id: "s1", stageKey: "MPIN_VERIFIED", title: "MPIN Verified", subTitle: "Security MPIN authenticated", status: "COMPLETED" },
  { id: "s2", stageKey: "VALIDATING_CUSTOMER", title: "Validating Customer", subTitle: "Checking KYC & active status", status: "COMPLETED" },
  { id: "s3", stageKey: "VALIDATING_BENE", title: "Validating Beneficiary", subTitle: "Account verification check", status: "COMPLETED" },
  { id: "s4", stageKey: "CHECKING_BALANCE", title: "Checking Wallet Balance", subTitle: "Balance sufficiency verified", status: "COMPLETED" },
  { id: "s5", stageKey: "CHECKING_LIMITS", title: "Checking Transaction Limits", subTitle: "Daily & monthly limits verified", status: "COMPLETED" },
  { id: "s6", stageKey: "FRAUD_VALIDATION", title: "Fraud & Risk Validation", subTitle: "Rule engine risk scoring", status: "COMPLETED" },
  { id: "s7", stageKey: "CREATING_TXN", title: "Creating Internal Transaction", subTitle: "Reference generated", status: "PROCESSING" },
  { id: "s8", stageKey: "DEBITING_WALLET", title: "Debiting Retailer Wallet", subTitle: "ACID balance reservation", status: "PENDING" },
  { id: "s9", stageKey: "POSTING_LEDGER", title: "Posting Double Entry Ledger", subTitle: "8-Line accounting entries", status: "PENDING" },
  { id: "s10", stageKey: "UPDATING_BENE_LIMITS", title: "Updating Beneficiary Limits", subTitle: "Velocity tracking updated", status: "PENDING" },
  { id: "s11", stageKey: "SENDING_VENDOR", title: "Sending Secure Vendor Request", subTitle: "Processing payout securely...", status: "PENDING" },
  { id: "s12", stageKey: "WAITING_BANK", title: "Waiting Bank Response", subTitle: "Communicating with banking network", status: "PENDING" },
  { id: "s13", stageKey: "PROCESSING_STATUS", title: "Processing Vendor Status", subTitle: "Verifying response integrity", status: "PENDING" },
  { id: "s14", stageKey: "SETTLEMENT_PREP", title: "Settlement Preparation", subTitle: "Posting settlement records", status: "PENDING" },
  { id: "s15", stageKey: "DISPATCHING_NOTIFICATIONS", title: "Dispatching Notifications", subTitle: "SMS & Realtime socket alerts", status: "PENDING" },
  { id: "s16", stageKey: "EXECUTION_FINALIZED", title: "Execution Finalized", subTitle: "All pipelines cleared & settled", status: "PENDING" },
];

export const BankingExecutionCenter: React.FC<BankingExecutionCenterProps> = ({
  steps,
  activeStepId,
  transactionRef = "—",
  transactionId = "—",
  amount,
  charges,
  gst,
  totalAmountPaid,
  customer,
  beneficiary,
  transactionMode = "IMPS",
  walletBefore = 50000,
  walletAfter = 44982.30,
  dailyLimitRemaining = 94982.30,
  monthlyLimitRemaining = 244982.30,
  elapsedSeconds = 4.2,
  isReversing = false,
  reversalSteps = [],
  activeReversalStepId = "",
  viewState = "PROCESSING",
  errorMessage,
  utr = "TEST-UTR168549591403",
  onNewTransfer,
  onDashboard,
  onDownloadReceipt,
  onShareReceipt,
  onRetry,
}) => {
  const leftTimelineContainerRef = useRef<HTMLDivElement | null>(null);
  const [copiedUtr, setCopiedUtr] = useState(false);
  const [showLiveStatus, setShowLiveStatus] = useState(false);

  const isSuccess = viewState === "SUCCESS_RECEIPT";
  const activeStepIdx = isSuccess ? steps.length - 1 : Math.max(0, steps.findIndex((s) => s.id === activeStepId));
  const progressPercent = isSuccess ? 100 : Math.max(5, Math.min(100, Math.round(((activeStepIdx + 1) / steps.length) * 100)));

  const handleCopyUtr = () => {
    if (navigator?.clipboard && utr) {
      navigator.clipboard.writeText(utr);
      setCopiedUtr(true);
      setTimeout(() => setCopiedUtr(false), 2000);
    }
  };

  // Backend micro-services dynamic status list
  const backendServices = [
    { name: "Wallet Service", desc: "Balance reservation & check", status: isSuccess || activeStepIdx >= 7 ? "COMPLETED" : activeStepIdx === 7 ? "PROCESSING" : "PENDING", time: "42ms" },
    { name: "Ledger Service", desc: "8-Line double-entry posting", status: isSuccess || activeStepIdx >= 8 ? "COMPLETED" : activeStepIdx === 8 ? "PROCESSING" : "PENDING", time: "65ms" },
    { name: "Limit Service", desc: "Customer & Bene velocity locks", status: isSuccess || activeStepIdx >= 9 ? "COMPLETED" : activeStepIdx === 9 ? "PROCESSING" : "PENDING", time: "38ms" },
    { name: "Vendor Request", desc: "Processing payout securely", status: isSuccess || activeStepIdx >= 10 ? "COMPLETED" : activeStepIdx === 10 ? "PROCESSING" : "PENDING", time: "188ms" },
    { name: "Vendor Response", desc: "Banking network confirmation", status: isSuccess || activeStepIdx >= 11 ? "COMPLETED" : activeStepIdx === 11 ? "PROCESSING" : "PENDING", time: isSuccess ? "1.2s" : "Waiting..." },
    { name: "Status Synchronization", desc: "Error mapping & role sanitization", status: isSuccess || activeStepIdx >= 12 ? "COMPLETED" : activeStepIdx === 12 ? "PROCESSING" : "PENDING", time: isSuccess ? "15ms" : "Pending..." },
    { name: "Notification Service", desc: "SMS / Email notification queue", status: isSuccess || activeStepIdx >= 14 ? "COMPLETED" : activeStepIdx === 14 ? "PROCESSING" : "PENDING", time: isSuccess ? "22ms" : "Queued..." },
    { name: "Receipt Generation", desc: "Digital verification token", status: isSuccess || activeStepIdx >= 15 ? "COMPLETED" : activeStepIdx === 15 ? "PROCESSING" : "PENDING", time: isSuccess ? "12ms" : "Waiting..." },
  ];

  return (
    <Box
      sx={{
        width: { xs: "98vw", sm: "92vw", md: "90vw" },
        maxWidth: { xs: "100%", md: "1440px" },
        maxHeight: { xs: "96vh", md: "920px" },
        bgcolor: "#080B11",
        backgroundImage: isSuccess
          ? "radial-gradient(circle at 50% 10%, rgba(34, 197, 94, 0.15), transparent 65%)"
          : "radial-gradient(circle at 50% 0%, rgba(251, 191, 36, 0.08), transparent 60%)",
        borderRadius: { xs: "20px", sm: "24px" },
        border: isSuccess ? "1px solid rgba(251, 191, 36, 0.4)" : "1px solid rgba(251, 191, 36, 0.35)",
        boxShadow: isSuccess
          ? "0 25px 60px -10px rgba(0, 0, 0, 0.95), 0 0 50px rgba(251, 191, 36, 0.15), 0 0 35px rgba(34, 197, 94, 0.2)"
          : "0 25px 60px -10px rgba(0, 0, 0, 0.95), 0 0 45px rgba(251, 191, 36, 0.15)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        color: "#FFFFFF",
        position: "relative",
        pb: { xs: 12, sm: 8, md: 3 }, // Generous bottom padding to completely clear mobile nav & FAB
        boxSizing: "border-box",
        "&::-webkit-scrollbar": { width: 6 },
        "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(251, 191, 36, 0.2)", borderRadius: 3 },
      }}
    >
      {/* Top Gold Sheen Bar */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          left: 0,
          right: 0,
          height: "3px",
          zIndex: 20,
          background: "linear-gradient(90deg, transparent 0%, #FBBF24 50%, transparent 100%)",
        }}
      />

      {/* ── 1. TRANSACTION EXECUTION HEADER ── */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 15,
          px: { xs: 2, sm: 3 },
          py: { xs: 1.5, sm: 2 },
          bgcolor: "rgba(10, 15, 29, 0.95)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(251, 191, 36, 0.2)",
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 1.5,
          flexShrink: 0,
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", width: { xs: "100%", sm: "auto" } }}>
          <Box
            sx={{
              width: { xs: 40, sm: 46 },
              height: { xs: 40, sm: 46 },
              borderRadius: "12px",
              bgcolor: "rgba(251, 191, 36, 0.15)",
              border: "1px solid rgba(251, 191, 36, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 0 15px rgba(251, 191, 36, 0.25)",
            }}
          >
            <ShieldIcon sx={{ color: "#FDE047", fontSize: { xs: 22, sm: 26 } }} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              sx={{
                fontWeight: 900,
                fontSize: { xs: "16px", sm: "19px" },
                letterSpacing: "-0.3px",
                lineHeight: 1.2,
                background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #F59E0B 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Secure Transaction Execution Center
            </Typography>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.75)", fontSize: { xs: "11px", sm: "12.5px" }, fontWeight: 600, mt: 0.25 }}>
              Processing secure {transactionMode} transfer · Enterprise CBS Core
            </Typography>
          </Box>
        </Stack>

        {/* Two-Column Transaction Metadata */}
        <Stack
          direction="row"
          spacing={{ xs: 2, sm: 3 }}
          sx={{
            width: { xs: "100%", sm: "auto" },
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            bgcolor: "rgba(255, 255, 255, 0.03)",
            p: 1,
            borderRadius: "10px",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          {/* Column 1: Txn & Ref */}
          <Box sx={{ textAlign: "left" }}>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "9.5px", fontWeight: 800, letterSpacing: "0.05em" }}>TRANSACTION METADATA</Typography>
            <Typography sx={{ color: "#FFFFFF", fontSize: "11.5px", fontWeight: 800 }}>
              Txn: <span style={{ color: "#FDE047", fontFamily: "monospace" }}>{transactionId && transactionId !== "TXN-INITIATING" ? transactionId : "—"}</span>
            </Typography>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "10.5px", fontFamily: "monospace" }}>
              Ref: {transactionRef && transactionRef !== "TXN-INITIATING" ? transactionRef : "—"}
            </Typography>
          </Box>

          {/* Column 2: Metrics & 100% Progress */}
          <Box sx={{ textAlign: "right", minWidth: { xs: 120, sm: 140 } }}>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "9.5px", fontWeight: 800, letterSpacing: "0.05em" }}>EXECUTION METRICS</Typography>
            <Typography sx={{ color: isSuccess ? "#4ADE80" : "#FBBF24", fontSize: "11.5px", fontWeight: 800 }}>
              Elapsed: {elapsedSeconds > 0 ? elapsedSeconds.toFixed(1) : isSuccess ? "2.4" : "4.2"}s
            </Typography>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mt: 0.25, justifyContent: "flex-end" }}>
              <LinearProgress
                variant="determinate"
                value={progressPercent}
                sx={{
                  width: 60,
                  height: 5,
                  borderRadius: 3,
                  bgcolor: "rgba(255, 255, 255, 0.1)",
                  "& .MuiLinearProgress-bar": {
                    bgcolor: isReversing ? "#EF4444" : isSuccess ? "#10B981" : "#FBBF24",
                    backgroundImage: isSuccess ? "linear-gradient(90deg, #10B981, #4ADE80)" : "none",
                  },
                }}
              />
              <Typography sx={{ fontSize: "10.5px", fontWeight: 900, color: isSuccess ? "#4ADE80" : "#FBBF24" }}>
                {progressPercent}%
              </Typography>
            </Stack>
          </Box>
        </Stack>
      </Box>

      {/* ── 2. CENTER WORKSPACE ── */}
      <Box
        sx={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: { xs: "100%", md: isSuccess ? "1fr" : "320px 1fr 320px" },
          gap: { xs: 2, md: 2.5 },
          p: { xs: 2, sm: 3 },
          boxSizing: "border-box",
          maxWidth: isSuccess ? "880px" : "100%",
          mx: "auto",
          width: "100%",
        }}
      >
        {/* ── PANEL: EXECUTION STEPS (ONLY VISIBLE ON DESKTOP OR PROCESSING) ── */}
        {!isSuccess && (
          <Paper
            elevation={0}
            sx={{
              bgcolor: "rgba(13, 19, 33, 0.85)",
              borderRadius: "16px",
              border: "1px solid rgba(251, 191, 36, 0.25)",
              p: 2,
              display: "flex",
              flexDirection: "column",
              maxHeight: { xs: "280px", md: "none" },
              overflow: "hidden",
            }}
          >
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
              <Typography sx={{ fontWeight: 900, fontSize: "12.5px", color: "#FBBF24", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                EXECUTION STEPS
              </Typography>
              <Chip
                label={`${activeStepIdx + 1} / ${steps.length}`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: "10px",
                  fontWeight: 900,
                  bgcolor: "rgba(251, 191, 36, 0.15)",
                  color: "#FDE047",
                  border: "1px solid rgba(251, 191, 36, 0.3)",
                }}
              />
            </Stack>

            <Box
              ref={leftTimelineContainerRef}
              sx={{
                flex: 1,
                overflowY: "auto",
                pr: 0.5,
                "&::-webkit-scrollbar": { width: 4 },
                "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(255, 255, 255, 0.15)", borderRadius: 2 },
              }}
            >
              <Stack spacing={1}>
                {steps.map((step, idx) => {
                  const isCompleted = step.status === "COMPLETED";
                  const isProcessing = step.status === "PROCESSING" || (idx === activeStepIdx && step.status !== "FAILED");
                  const isFailed = step.status === "FAILED";
                  const isWarning = step.status === "WARNING";

                  let nodeBg = "rgba(255, 255, 255, 0.02)";
                  let nodeBorder = "rgba(255, 255, 255, 0.05)";
                  let iconColor = "rgba(255, 255, 255, 0.25)";
                  let titleColor = "rgba(255, 255, 255, 0.4)";

                  if (isCompleted) {
                    nodeBg = "rgba(34, 197, 94, 0.1)";
                    nodeBorder = "rgba(34, 197, 94, 0.3)";
                    iconColor = "#4ADE80";
                    titleColor = "#4ADE80";
                  } else if (isProcessing) {
                    nodeBg = "rgba(251, 191, 36, 0.2)";
                    nodeBorder = "#FBBF24";
                    iconColor = "#FDE047";
                    titleColor = "#FFFFFF";
                  } else if (isFailed) {
                    nodeBg = "rgba(239, 68, 68, 0.2)";
                    nodeBorder = "#EF4444";
                    iconColor = "#EF4444";
                    titleColor = "#EF4444";
                  } else if (isWarning) {
                    nodeBg = "rgba(245, 158, 11, 0.2)";
                    nodeBorder = "#F59E0B";
                    iconColor = "#FBBF24";
                    titleColor = "#FBBF24";
                  }

                  return (
                    <Paper
                      key={step.id}
                      elevation={0}
                      sx={{
                        p: 1,
                        borderRadius: "8px",
                        bgcolor: nodeBg,
                        border: `1px solid ${nodeBorder}`,
                      }}
                    >
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        {isCompleted ? (
                          <CheckCircleIcon sx={{ color: iconColor, fontSize: 15 }} />
                        ) : isProcessing ? (
                          <SyncIcon sx={{ color: iconColor, fontSize: 15, animation: "spin 0.8s linear infinite" }} />
                        ) : isFailed ? (
                          <ErrorIcon sx={{ color: iconColor, fontSize: 15 }} />
                        ) : isWarning ? (
                          <WarningAmberIcon sx={{ color: iconColor, fontSize: 15 }} />
                        ) : (
                          <RadioButtonUncheckedIcon sx={{ color: iconColor, fontSize: 13 }} />
                        )}
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography sx={{ fontWeight: 800, fontSize: "11px", color: titleColor, lineHeight: 1.2 }}>
                            {step.title}
                          </Typography>
                          {step.subTitle && (
                            <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "9.5px", mt: 0.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {step.subTitle}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            </Box>
          </Paper>
        )}

        {/* ── PANEL: PRIMARY SUCCESS / EXECUTION CARD (STRONGEST VISUAL SECTION) ── */}
        <Paper
          elevation={0}
          sx={{
            bgcolor: "rgba(13, 19, 33, 0.9)",
            borderRadius: "20px",
            border: isSuccess ? "1px solid rgba(251, 191, 36, 0.35)" : "1px solid rgba(255, 255, 255, 0.08)",
            p: { xs: 2.5, sm: 3.5 },
            display: "flex",
            flexDirection: "column",
            boxShadow: isSuccess ? "0 10px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)" : "none",
          }}
        >
          {viewState === "SUCCESS_RECEIPT" ? (
            /* ── TERMINAL SUCCESS SCREEN VIEW (LUXURY PAY2PAY EXPERIENCE) ── */
            <Box sx={{ textAlign: "center", width: "100%" }}>
              {/* 16/16 CORE BANKING PIPELINES COMPLETED (COMPLETE VISUAL PROGRESS) */}
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  mb: 3,
                  borderRadius: "14px",
                  bgcolor: "rgba(34, 197, 94, 0.08)",
                  border: "1px solid rgba(74, 222, 128, 0.35)",
                  boxShadow: "0 0 20px rgba(34, 197, 94, 0.15)",
                }}
              >
                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                    <CheckCircleIcon sx={{ color: "#4ADE80", fontSize: 16 }} />
                    <Typography sx={{ fontSize: "11.5px", fontWeight: 900, color: "#4ADE80", letterSpacing: "0.05em" }}>
                      16/16 CORE BANKING PIPELINES COMPLETED
                    </Typography>
                  </Stack>
                  <Chip
                    label="100% COMPLETE"
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: "10px",
                      fontWeight: 900,
                      bgcolor: "rgba(34, 197, 94, 0.25)",
                      color: "#4ADE80",
                      border: "1px solid rgba(74, 222, 128, 0.4)",
                    }}
                  />
                </Stack>
                <Box
                  sx={{
                    width: "100%",
                    height: 8,
                    borderRadius: 4,
                    bgcolor: "rgba(255, 255, 255, 0.08)",
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      width: "100%",
                      height: "100%",
                      borderRadius: 4,
                      background: "linear-gradient(90deg, #10B981 0%, #FBBF24 50%, #4ADE80 100%)",
                      boxShadow: "0 0 16px rgba(74, 222, 128, 0.8)",
                    }}
                  />
                </Box>
              </Paper>

              {/* LARGE GLOWING SUCCESS ICON */}
              <Box
                sx={{
                  width: { xs: 68, sm: 76 },
                  height: { xs: 68, sm: 76 },
                  borderRadius: "50%",
                  bgcolor: "rgba(34, 197, 94, 0.15)",
                  border: "2px solid #4ADE80",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 2,
                  boxShadow: "0 0 35px rgba(34, 197, 94, 0.45), inset 0 0 15px rgba(34, 197, 94, 0.25)",
                }}
              >
                <CheckCircleIcon sx={{ fontSize: { xs: 46, sm: 52 }, color: "#4ADE80" }} />
              </Box>

              {/* HEADING & DESCRIPTION */}
              <Typography
                sx={{
                  fontWeight: 900,
                  fontSize: { xs: "22px", sm: "26px" },
                  color: "#FFFFFF",
                  letterSpacing: "-0.3px",
                  mb: 0.5,
                }}
              >
                Transaction Successful
              </Typography>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.75)", fontSize: { xs: "12.5px", sm: "14px" }, mb: 3 }}>
                Funds transferred successfully to beneficiary bank account.
              </Typography>

              {/* ── TRANSFER AMOUNT CREDITED (PROMINENT GOLD-YELLOW GRADIENT) ── */}
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2.25, sm: 3 },
                  borderRadius: "16px",
                  bgcolor: "rgba(10, 15, 29, 0.9)",
                  border: "1px solid rgba(251, 191, 36, 0.4)",
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(251, 191, 36, 0.08)",
                  mb: 2.5,
                  position: "relative",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "11px",
                    fontWeight: 900,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#FBBF24",
                    mb: 0.5,
                  }}
                >
                  TRANSFER AMOUNT CREDITED
                </Typography>

                <Typography
                  sx={{
                    fontWeight: 900,
                    fontSize: { xs: "34px", sm: "44px" },
                    my: 0.5,
                    fontFamily: "var(--font-geist-sans), sans-serif",
                    letterSpacing: "-0.5px",
                    background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #F59E0B 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    filter: "drop-shadow(0 2px 10px rgba(251, 191, 36, 0.3))",
                  }}
                >
                  ₹{amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>

                {/* Bank UTR Badge */}
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 1,
                    mt: 1,
                    px: 1.5,
                    py: 0.6,
                    borderRadius: "8px",
                    bgcolor: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                  }}
                >
                  <Typography sx={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.7)", fontWeight: 600 }}>
                    Bank UTR:
                  </Typography>
                  <Typography sx={{ fontSize: "12.5px", color: "#4ADE80", fontWeight: 900, fontFamily: "monospace" }}>
                    {utr}
                  </Typography>
                  <Tooltip title={copiedUtr ? "Copied!" : "Copy UTR"}>
                    <IconButton size="small" onClick={handleCopyUtr} sx={{ color: copiedUtr ? "#4ADE80" : "#94A3B8", p: 0.25 }}>
                      {copiedUtr ? <DoneIcon sx={{ fontSize: 15 }} /> : <ContentCopyIcon sx={{ fontSize: 15 }} />}
                    </IconButton>
                  </Tooltip>
                </Box>
              </Paper>

              {/* ── CUSTOMER & BENEFICIARY (2 CLEAN GLASS CARDS) ── */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  gap: 1.5,
                  mb: 3,
                }}
              >
                {/* Customer Card */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: "14px",
                    bgcolor: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(251, 191, 36, 0.2)",
                    textAlign: "left",
                  }}
                >
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
                    <Avatar sx={{ width: 28, height: 28, bgcolor: "rgba(251, 191, 36, 0.15)", color: "#FDE047" }}>
                      <PersonIcon sx={{ fontSize: 16 }} />
                    </Avatar>
                    <Typography sx={{ fontSize: "10.5px", color: "#FBBF24", fontWeight: 800, textTransform: "uppercase" }}>
                      CUSTOMER
                    </Typography>
                  </Stack>
                  <Typography sx={{ fontSize: "14px", fontWeight: 900, color: "#FFFFFF" }}>
                    {customer?.name || "Sathiya Murthy"}
                  </Typography>
                  <Typography sx={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.7)", mt: 0.25, fontFamily: "monospace" }}>
                    {customer?.mobile || "9176669426"}
                  </Typography>
                </Paper>

                {/* Beneficiary Card */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: "14px",
                    bgcolor: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(251, 191, 36, 0.2)",
                    textAlign: "left",
                  }}
                >
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
                    <Avatar sx={{ width: 28, height: 28, bgcolor: "rgba(34, 197, 94, 0.15)", color: "#4ADE80" }}>
                      <AccountBalanceIcon sx={{ fontSize: 16 }} />
                    </Avatar>
                    <Typography sx={{ fontSize: "10.5px", color: "#4ADE80", fontWeight: 800, textTransform: "uppercase" }}>
                      BENEFICIARY
                    </Typography>
                  </Stack>
                  <Typography sx={{ fontSize: "14px", fontWeight: 900, color: "#FFFFFF" }}>
                    {beneficiary?.name || "Sathiya Murthy R"}
                  </Typography>
                  <Typography sx={{ fontSize: "12px", color: "#93C5FD", fontWeight: 700, mt: 0.25 }}>
                    {beneficiary?.bankName || "IDBI Bank"}
                  </Typography>
                  {beneficiary?.accountNumber && (
                    <Typography sx={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.6)", fontFamily: "monospace" }}>
                      A/C: {beneficiary.accountNumber}
                    </Typography>
                  )}
                </Paper>
              </Box>

              {/* ── ACTION BUTTONS (EQUAL HEIGHT, SPACED, LUXURY FINISH) ── */}
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                sx={{
                  justifyContent: "center",
                  width: "100%",
                  mb: 3,
                }}
              >
                {/* 1. PRIMARY: + New Transfer */}
                {onNewTransfer && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={onNewTransfer}
                    sx={{
                      height: 48,
                      background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                      color: "#0F172A",
                      fontWeight: 900,
                      borderRadius: "12px",
                      textTransform: "none",
                      fontSize: "14px",
                      flex: { xs: "none", sm: 1 },
                      boxShadow: "0 4px 18px rgba(245, 158, 11, 0.4)",
                      transition: "all 0.2s ease-in-out",
                      "&:hover": {
                        background: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)",
                        transform: "translateY(-1px)",
                        boxShadow: "0 6px 22px rgba(245, 158, 11, 0.5)",
                      },
                      "&:active": {
                        transform: "translateY(1px)",
                      },
                    }}
                  >
                    + New Transfer
                  </Button>
                )}

                {/* 2. SECONDARY: Share Receipt */}
                {onShareReceipt && (
                  <Button
                    variant="outlined"
                    startIcon={<ShareIcon />}
                    onClick={onShareReceipt}
                    sx={{
                      height: 48,
                      color: "#93C5FD",
                      borderColor: "rgba(59, 130, 246, 0.5)",
                      bgcolor: "rgba(37, 99, 235, 0.15)",
                      fontWeight: 800,
                      borderRadius: "12px",
                      textTransform: "none",
                      fontSize: "14px",
                      flex: { xs: "none", sm: 1 },
                      backdropFilter: "blur(10px)",
                      "&:hover": {
                        bgcolor: "rgba(37, 99, 235, 0.28)",
                        borderColor: "#60A5FA",
                        color: "#BFDBFE",
                      },
                    }}
                  >
                    Share Receipt
                  </Button>
                )}

                {/* 3. TERTIARY: Home / DMT Console */}
                {onDashboard && (
                  <Button
                    variant="outlined"
                    startIcon={<DashboardIcon />}
                    onClick={onDashboard}
                    sx={{
                      height: 48,
                      color: "#FFFFFF",
                      borderColor: "rgba(251, 191, 36, 0.3)",
                      bgcolor: "rgba(255, 255, 255, 0.04)",
                      borderRadius: "12px",
                      fontWeight: 800,
                      textTransform: "none",
                      fontSize: "14px",
                      flex: { xs: "none", sm: 1 },
                      backdropFilter: "blur(10px)",
                      "&:hover": {
                        bgcolor: "rgba(251, 191, 36, 0.12)",
                        borderColor: "#FBBF24",
                        color: "#FEF08A",
                      },
                    }}
                  >
                    Home / DMT Console
                  </Button>
                )}
              </Stack>

              {/* ── 4. LIVE PROCESSING STATUS (COLLAPSIBLE / VERIFIED COMPLETED) ── */}
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  borderRadius: "14px",
                  bgcolor: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  textAlign: "left",
                  mb: 2,
                }}
              >
                <Box
                  onClick={() => setShowLiveStatus(!showLiveStatus)}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <CheckCircleIcon sx={{ color: "#4ADE80", fontSize: 16 }} />
                    <Typography sx={{ fontWeight: 800, fontSize: "12px", color: "#4ADE80", letterSpacing: "0.04em" }}>
                      LIVE PROCESSING STATUS · 8/8 BACKEND SERVICES SETTLED
                    </Typography>
                  </Stack>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "#94A3B8" }}>
                    <Typography sx={{ fontSize: "11px", fontWeight: 700 }}>
                      {showLiveStatus ? "Hide" : "Details"}
                    </Typography>
                    {showLiveStatus ? <ExpandLessIcon sx={{ fontSize: 18 }} /> : <ExpandMoreIcon sx={{ fontSize: 18 }} />}
                  </Box>
                </Box>

                <Collapse in={showLiveStatus}>
                  <Box sx={{ pt: 1.5 }}>
                    <Stack spacing={0.75}>
                      {backendServices.map((svc, i) => (
                        <Paper
                          key={i}
                          elevation={0}
                          sx={{
                            p: 0.85,
                            borderRadius: "8px",
                            bgcolor: "rgba(34, 197, 94, 0.06)",
                            border: "1px solid rgba(34, 197, 94, 0.2)",
                          }}
                        >
                          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                            <CheckCircleIcon sx={{ color: "#4ADE80", fontSize: 14 }} />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                                <Typography sx={{ fontWeight: 800, fontSize: "11px", color: "#4ADE80" }}>
                                  {svc.name}
                                </Typography>
                                <Typography sx={{ fontSize: "9px", color: "rgba(255, 255, 255, 0.5)", fontFamily: "monospace" }}>
                                  {svc.time}
                                </Typography>
                              </Stack>
                              <Typography sx={{ fontSize: "9.5px", color: "rgba(255, 255, 255, 0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {svc.desc}
                              </Typography>
                            </Box>
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  </Box>
                </Collapse>
              </Paper>

              {/* ── 5. SECURITY MESSAGE & RECEIPT READY STATUS ── */}
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                sx={{
                  justifyContent: "space-between",
                  alignItems: "center",
                  p: 1.25,
                  borderRadius: "10px",
                  bgcolor: "rgba(0, 0, 0, 0.3)",
                  border: "1px solid rgba(251, 191, 36, 0.15)",
                }}
              >
                <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                  <LockIcon sx={{ color: "#FBBF24", fontSize: 14 }} />
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "11px", fontWeight: 600 }}>
                    Security Lockout Active — Do not refresh or close browser window.
                  </Typography>
                </Stack>

                <Chip
                  icon={<CheckCircleIcon sx={{ fontSize: "12px !important", color: "#4ADE80" }} />}
                  label="Receipt Ready ✓"
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: "10px",
                    fontWeight: 900,
                    bgcolor: "rgba(34, 197, 94, 0.2)",
                    color: "#4ADE80",
                    border: "1px solid rgba(74, 222, 128, 0.4)",
                  }}
                />
              </Stack>
            </Box>
          ) : viewState === "PENDING_RECEIPT" ? (
            /* ── TERMINAL PENDING SCREEN VIEW ── */
            <Box sx={{ textAlign: "center", my: "auto", width: "100%" }}>
              <Box sx={{ width: 60, height: 60, borderRadius: "50%", bgcolor: "rgba(245, 158, 11, 0.15)", border: "2px solid #F59E0B", display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
                <WarningAmberIcon sx={{ fontSize: 40, color: "#FBBF24" }} />
              </Box>

              <Typography sx={{ fontWeight: 900, fontSize: { xs: "20px", sm: "24px" }, color: "#FBBF24", mb: 0.5 }}>
                Transaction Submitted Successfully
              </Typography>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "13px", mb: 2.5 }}>
                The receiving bank is processing your transfer. Auto background monitoring started.
              </Typography>

              <Paper elevation={0} sx={{ p: 2, borderRadius: "14px", bgcolor: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", mb: 2.5 }}>
                <Typography sx={{ fontSize: "10.5px", color: "#FBBF24", fontWeight: 800, textTransform: "uppercase" }}>CURRENT STATUS: PENDING</Typography>
                <Typography sx={{ fontWeight: 900, fontSize: "28px", color: "#FFFFFF", my: 0.25 }}>
                  ₹{amount.toLocaleString()}.00
                </Typography>
                <Typography sx={{ fontSize: "11.5px", color: "rgba(255, 255, 255, 0.7)" }}>
                  Ref: <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#60A5FA" }}>{transactionRef}</span>
                </Typography>
              </Paper>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ justifyContent: "center", width: "100%" }}>
                {onRetry && (
                  <Button variant="contained" startIcon={<ReplayIcon />} onClick={onRetry} sx={{ height: 44, bgcolor: "#2563EB", fontWeight: 800, borderRadius: "10px", textTransform: "none" }}>
                    🔄 Try Again
                  </Button>
                )}
                {onNewTransfer && (
                  <Button variant="contained" startIcon={<AddIcon />} onClick={onNewTransfer} sx={{ height: 44, fontWeight: 800, borderRadius: "10px", bgcolor: "#16A34A", color: "#FFFFFF", textTransform: "none" }}>
                    + New Transfer
                  </Button>
                )}
                {onDashboard && (
                  <Button variant="outlined" startIcon={<DashboardIcon />} onClick={onDashboard} sx={{ height: 44, color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.3)", borderRadius: "10px", fontWeight: 800, textTransform: "none" }}>
                    🏠 Home / DMT Console
                  </Button>
                )}
              </Stack>
            </Box>
          ) : viewState === "FAILURE_RECEIPT" ? (
            /* ── TERMINAL FAILURE SCREEN VIEW ── */
            <Box sx={{ textAlign: "center", my: "auto", width: "100%" }}>
              <Box sx={{ width: 60, height: 60, borderRadius: "50%", bgcolor: "rgba(239, 68, 68, 0.15)", border: "2px solid #EF4444", display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
                <ErrorIcon sx={{ fontSize: 40, color: "#EF4444" }} />
              </Box>

              <Typography sx={{ fontWeight: 900, fontSize: { xs: "20px", sm: "24px" }, color: "#EF4444", mb: 0.5 }}>
                Transaction Could Not Be Completed
              </Typography>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.75)", fontSize: "13px", mb: 2.5 }}>
                {sanitizeCustomerErrorMessage(errorMessage)}
              </Typography>

              <Paper elevation={0} sx={{ p: 2, borderRadius: "14px", bgcolor: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", mb: 2.5 }}>
                <Typography sx={{ fontSize: "10.5px", color: "#EF4444", fontWeight: 800, textTransform: "uppercase" }}>REVERSAL STATUS: REFUND COMPLETED</Typography>
                <Typography sx={{ fontSize: "13px", color: "#4ADE80", fontWeight: 700, mt: 0.5 }}>
                  ✔ Retailer Wallet Restored: ₹{totalAmountPaid.toLocaleString()}
                </Typography>
              </Paper>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ justifyContent: "center", width: "100%" }}>
                {onRetry && (
                  <Button variant="contained" startIcon={<ReplayIcon />} onClick={onRetry} sx={{ height: 44, bgcolor: "#2563EB", fontWeight: 800, borderRadius: "10px", textTransform: "none" }}>
                    🔄 Try Again
                  </Button>
                )}
                {onNewTransfer && (
                  <Button variant="outlined" startIcon={<AddIcon />} onClick={onNewTransfer} sx={{ height: 44, color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.3)", borderRadius: "10px", fontWeight: 800, textTransform: "none" }}>
                    + New Transfer
                  </Button>
                )}
                {onDashboard && (
                  <Button variant="outlined" startIcon={<DashboardIcon />} onClick={onDashboard} sx={{ height: 44, color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.3)", borderRadius: "10px", fontWeight: 800, textTransform: "none" }}>
                    🏠 Home / DMT Console
                  </Button>
                )}
              </Stack>
            </Box>
          ) : (
            /* ── LIVE EXECUTION TRANSACTION SUMMARY VIEW ── */
            <>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: "14px",
                  bgcolor: "rgba(251, 191, 36, 0.1)",
                  border: "1px solid rgba(251, 191, 36, 0.3)",
                  textAlign: "center",
                  mb: 2,
                }}
              >
                <Typography sx={{ fontSize: "10.5px", color: "#FBBF24", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  TRANSFER AMOUNT (BENEFICIARY PAYOUT)
                </Typography>
                <Typography sx={{ fontWeight: 900, fontSize: { xs: "28px", sm: "34px" }, color: "#FFFFFF", my: 0.25 }}>
                  ₹{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Typography>
                <Chip
                  label={`Mode: ${transactionMode}`}
                  size="small"
                  sx={{ height: 20, fontSize: "10px", fontWeight: 800, bgcolor: "rgba(251, 191, 36, 0.2)", color: "#FDE047" }}
                />
              </Paper>

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.25, mb: 2 }}>
                <Paper elevation={0} sx={{ p: 1.25, borderRadius: "10px", bgcolor: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.75 }}>
                    <Avatar sx={{ width: 26, height: 26, bgcolor: "rgba(251, 191, 36, 0.2)", color: "#FDE047" }}>
                      <PersonIcon sx={{ fontSize: 15 }} />
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: "9px", color: "#FBBF24", fontWeight: 800, textTransform: "uppercase" }}>CUSTOMER</Typography>
                      <Typography sx={{ fontSize: "11.5px", fontWeight: 800, color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {customer?.name || "Customer"}
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography sx={{ fontSize: "10.5px", color: "rgba(255, 255, 255, 0.65)" }}>
                    Mob: {customer?.mobile || ""}
                  </Typography>
                </Paper>

                <Paper elevation={0} sx={{ p: 1.25, borderRadius: "10px", bgcolor: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.75 }}>
                    <Avatar sx={{ width: 26, height: 26, bgcolor: "rgba(34, 197, 94, 0.2)", color: "#4ADE80" }}>
                      <AccountBalanceIcon sx={{ fontSize: 15 }} />
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: "9px", color: "#4ADE80", fontWeight: 800, textTransform: "uppercase" }}>BENEFICIARY</Typography>
                      <Typography sx={{ fontSize: "11.5px", fontWeight: 800, color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {beneficiary?.name || "Beneficiary"}
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography sx={{ fontSize: "10.5px", color: "#93C5FD", fontWeight: 700 }}>
                    {beneficiary?.bankName || "IDBI Bank"}
                  </Typography>
                  <Typography sx={{ fontSize: "10px", color: "#FFFFFF", fontFamily: "monospace", fontWeight: 700 }}>
                    Account: {beneficiary?.accountNumber || beneficiary?.maskedAccountNumber || "—"}
                  </Typography>
                </Paper>
              </Box>

              <Paper elevation={0} sx={{ p: 1.5, borderRadius: "10px", bgcolor: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)", flex: 1 }}>
                <Typography sx={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.5)", fontWeight: 800, textTransform: "uppercase", mb: 1 }}>
                  FINANCIAL & LIMIT ACCOUNTING
                </Typography>

                <Stack spacing={0.75}>
                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.6)" }}>Payout Amount</Typography>
                    <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#FFFFFF" }}>₹{amount.toLocaleString()}.00</Typography>
                  </Stack>

                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.6)" }}>Convenience Fee</Typography>
                    <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#FFFFFF" }}>₹{charges.toFixed(2)}</Typography>
                  </Stack>

                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.6)" }}>GST (18%)</Typography>
                    <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#FFFFFF" }}>₹{gst.toFixed(2)}</Typography>
                  </Stack>

                  <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", my: 0.5 }} />

                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: "11.5px", color: "#FBBF24", fontWeight: 800 }}>NET WALLET DEBIT</Typography>
                    <Typography sx={{ fontSize: "12.5px", fontWeight: 900, color: "#FDE047" }}>₹{totalAmountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Typography>
                  </Stack>
                </Stack>
              </Paper>
            </>
          )}
        </Paper>

        {/* ── PANEL: LIVE BACKEND PROCESSING STATUS (DESKTOP OR PROCESSING) ── */}
        {!isSuccess && (
          <Paper
            elevation={0}
            sx={{
              bgcolor: "rgba(13, 19, 33, 0.85)",
              borderRadius: "16px",
              border: "1px solid rgba(251, 191, 36, 0.25)",
              p: 2,
              display: "flex",
              flexDirection: "column",
              maxHeight: { xs: "280px", md: "none" },
              overflow: "hidden",
            }}
          >
            <Typography sx={{ fontWeight: 900, fontSize: "12.5px", color: "#FBBF24", letterSpacing: "0.08em", textTransform: "uppercase", mb: 1.25 }}>
              LIVE PROCESSING STATUS
            </Typography>

            <Box
              sx={{
                flex: 1,
                overflowY: "auto",
                pr: 0.5,
                "&::-webkit-scrollbar": { width: 4 },
                "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(255, 255, 255, 0.15)", borderRadius: 2 },
              }}
            >
              <Stack spacing={1}>
                {backendServices.map((svc, i) => {
                  const isDone = svc.status === "COMPLETED";
                  const isProc = svc.status === "PROCESSING";
                  return (
                    <Paper
                      key={i}
                      elevation={0}
                      sx={{
                        p: 1,
                        borderRadius: "8px",
                        bgcolor: isDone ? "rgba(34, 197, 94, 0.08)" : isProc ? "rgba(251, 191, 36, 0.2)" : "rgba(255, 255, 255, 0.02)",
                        border: isDone ? "1px solid rgba(34, 197, 94, 0.25)" : isProc ? "1px solid #FBBF24" : "1px solid rgba(255, 255, 255, 0.05)",
                      }}
                    >
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        {isDone ? (
                          <CheckCircleIcon sx={{ color: "#4ADE80", fontSize: 15 }} />
                        ) : isProc ? (
                          <SyncIcon sx={{ color: "#FDE047", fontSize: 15, animation: "spin 0.8s linear infinite" }} />
                        ) : (
                          <RadioButtonUncheckedIcon sx={{ color: "rgba(255, 255, 255, 0.2)", fontSize: 13 }} />
                        )}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                            <Typography sx={{ fontWeight: 800, fontSize: "11px", color: isDone ? "#4ADE80" : isProc ? "#FFFFFF" : "rgba(255, 255, 255, 0.4)" }}>
                              {svc.name}
                            </Typography>
                            <Typography sx={{ fontSize: "9px", color: "rgba(255, 255, 255, 0.5)", fontFamily: "monospace" }}>
                              {svc.time}
                            </Typography>
                          </Stack>
                          <Typography sx={{ fontSize: "9.5px", color: "rgba(255, 255, 255, 0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {svc.desc}
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            </Box>
          </Paper>
        )}
      </Box>
    </Box>
  );
};
