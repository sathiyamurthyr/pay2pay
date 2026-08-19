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
  CircularProgress,
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
        borderRadius: "16px",
        bgcolor: "rgba(11, 22, 40, 0.95)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        p: 2.5,
        boxSizing: "border-box",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          alignItems: "center",
          pb: 2,
          mb: 2,
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <ShieldIcon sx={{ color: "#60A5FA", fontSize: 22 }} />
            <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "16px" }}>
              Real-Time Payout Execution Pipeline
            </Typography>
          </Stack>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "12px", mt: 0.25 }}>
            Ref: <span style={{ color: "#93C5FD", fontFamily: "monospace", fontWeight: 700 }}>{transactionRef || "TXN-INITIATING"}</span>
          </Typography>
        </Box>

        {netDebit && netDebit > 0 && (
          <Box sx={{ textAlign: "right" }}>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "11px", fontWeight: 700 }}>
              NET WALLET DEBIT
            </Typography>
            <Typography sx={{ color: "#3B82F6", fontWeight: 900, fontSize: "17px" }}>
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
              bgcolor: isReversing ? "#EF4444" : "#2563EB",
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
              nodeBg = "rgba(37, 99, 235, 0.25)";
              nodeBorder = "#3B82F6";
              iconColor = "#60A5FA";
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
  { id: "s15", stageKey: "NOTIFICATION_DISPATCH", title: "Notification Dispatch", subTitle: "Retailer SMS/Email alert queued", status: "PENDING" },
  { id: "s16", stageKey: "TXN_COMPLETED", title: "Transaction Completed", subTitle: "Execution finalized cleanly", status: "PENDING" },
];

export const BankingExecutionCenter: React.FC<BankingExecutionCenterProps> = ({
  steps,
  activeStepId,
  transactionRef = "REF-2026-94812",
  transactionId = "TXN-85472190",
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
  utr = "UTR-9948123048",
  onNewTransfer,
  onDashboard,
  onDownloadReceipt,
  onShareReceipt,
  onRetry,
}) => {
  const leftTimelineContainerRef = useRef<HTMLDivElement | null>(null);

  const activeStepIdx = steps.findIndex((s) => s.id === activeStepId);
  const progressPercent = Math.max(5, Math.min(100, Math.round(((activeStepIdx + 1) / steps.length) * 100)));

  // Backend micro-services friendly status list
  const backendServices = [
    { name: "Wallet Service", desc: "Balance reservation & check", status: activeStepIdx >= 7 ? "COMPLETED" : activeStepIdx === 7 ? "PROCESSING" : "PENDING", time: "42ms" },
    { name: "Ledger Service", desc: "8-Line double-entry posting", status: activeStepIdx >= 8 ? "COMPLETED" : activeStepIdx === 8 ? "PROCESSING" : "PENDING", time: "65ms" },
    { name: "Limit Service", desc: "Customer & Bene velocity locks", status: activeStepIdx >= 9 ? "COMPLETED" : activeStepIdx === 9 ? "PROCESSING" : "PENDING", time: "38ms" },
    { name: "Vendor Request", desc: "Processing payout securely", status: activeStepIdx >= 10 ? "COMPLETED" : activeStepIdx === 10 ? "PROCESSING" : "PENDING", time: "180ms" },
    { name: "Vendor Response", desc: "Banking network confirmation", status: activeStepIdx >= 11 ? "COMPLETED" : activeStepIdx === 11 ? "PROCESSING" : "PENDING", time: "Waiting..." },
    { name: "Status Synchronization", desc: "Error mapping & role sanitization", status: activeStepIdx >= 12 ? "COMPLETED" : activeStepIdx === 12 ? "PROCESSING" : "PENDING", time: "Pending..." },
    { name: "Notification Service", desc: "SMS / Email notification queue", status: activeStepIdx >= 14 ? "COMPLETED" : activeStepIdx === 14 ? "PROCESSING" : "PENDING", time: "Queued..." },
    { name: "Receipt Generation", desc: "Digital verification token", status: activeStepIdx >= 15 ? "COMPLETED" : activeStepIdx === 15 ? "PROCESSING" : "PENDING", time: "Waiting..." },
  ];

  return (
    <Box
      sx={{
        width: "90vw",
        maxWidth: "1700px",
        height: "85vh",
        maxHeight: "900px",
        bgcolor: "#080F1D",
        borderRadius: "20px",
        border: "1px solid rgba(59, 130, 246, 0.35)",
        boxShadow: "0 25px 60px -10px rgba(0, 0, 0, 0.95), 0 0 60px rgba(37, 99, 235, 0.25)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        color: "#FFFFFF",
        position: "relative",
      }}
    >
      {/* ── FIXED TOP HEADER ── */}
      <Box
        sx={{
          px: 3,
          py: 2,
          bgcolor: "rgba(15, 23, 42, 0.95)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: "12px",
              bgcolor: "rgba(37, 99, 235, 0.2)",
              border: "1px solid #3B82F6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShieldIcon sx={{ color: "#60A5FA", fontSize: 24 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 900, fontSize: "18px", color: "#FFFFFF", letterSpacing: "-0.2px" }}>
              Secure Transaction Execution Center
            </Typography>
            <Typography sx={{ color: "#93C5FD", fontSize: "12px", fontWeight: 600 }}>
              Processing secure {transactionMode} transfer · Enterprise CBS Core
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={3} sx={{ alignItems: "center" }}>
          <Box sx={{ textAlign: "right" }}>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "10.5px", fontWeight: 700 }}>TRANSACTION METADATA</Typography>
            <Typography sx={{ color: "#FFFFFF", fontSize: "12.5px", fontWeight: 800 }}>
              Txn: <span style={{ color: "#60A5FA", fontFamily: "monospace" }}>{transactionId}</span>
            </Typography>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "11px", fontFamily: "monospace" }}>
              Ref: {transactionRef}
            </Typography>
          </Box>

          <Box sx={{ textAlign: "right", minWidth: 140 }}>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "10.5px", fontWeight: 700 }}>EXECUTION METRICS</Typography>
            <Typography sx={{ color: "#4ADE80", fontSize: "12.5px", fontWeight: 800 }}>
              Elapsed: {elapsedSeconds.toFixed(1)}s | ETA: 8.0s
            </Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 0.5 }}>
              <LinearProgress
                variant="determinate"
                value={progressPercent}
                sx={{
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  bgcolor: "rgba(255, 255, 255, 0.1)",
                  "& .MuiLinearProgress-bar": { bgcolor: isReversing ? "#EF4444" : "#3B82F6" },
                }}
              />
              <Typography sx={{ fontSize: "11px", fontWeight: 900, color: "#60A5FA" }}>
                {progressPercent}%
              </Typography>
            </Stack>
          </Box>
        </Stack>
      </Box>

      {/* ── 3-COLUMN CENTER BODY ── */}
      <Box
        sx={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "320px 1fr 320px", lg: "340px 1fr 340px" },
          gap: 2,
          p: 2.5,
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {/* ── LEFT PANEL: EXECUTION TIMELINE (25%) ── */}
        <Paper
          elevation={0}
          sx={{
            bgcolor: "rgba(15, 23, 42, 0.8)",
            borderRadius: "14px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            p: 2,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
            <Typography sx={{ fontWeight: 900, fontSize: "13px", color: "#60A5FA", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              EXECUTION STEPS
            </Typography>
            <Chip
              label={`${activeStepIdx + 1} / ${steps.length}`}
              size="small"
              sx={{ height: 20, fontSize: "10px", fontWeight: 900, bgcolor: "rgba(37, 99, 235, 0.2)", color: "#93C5FD" }}
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
              {steps.map((step) => {
                const isActive = step.id === activeStepId;
                const isCompleted = step.status === "COMPLETED";
                const isProcessing = step.status === "PROCESSING";
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
                  nodeBg = "rgba(37, 99, 235, 0.25)";
                  nodeBorder = "#3B82F6";
                  iconColor = "#60A5FA";
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
                      p: 1.1,
                      borderRadius: "8px",
                      bgcolor: nodeBg,
                      border: `1px solid ${nodeBorder}`,
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      {isCompleted ? (
                        <CheckCircleIcon sx={{ color: iconColor, fontSize: 16 }} />
                      ) : isProcessing ? (
                        <SyncIcon sx={{ color: iconColor, fontSize: 16, animation: "spin 0.8s linear infinite" }} />
                      ) : isFailed ? (
                        <ErrorIcon sx={{ color: iconColor, fontSize: 16 }} />
                      ) : isWarning ? (
                        <WarningAmberIcon sx={{ color: iconColor, fontSize: 16 }} />
                      ) : (
                        <RadioButtonUncheckedIcon sx={{ color: iconColor, fontSize: 14 }} />
                      )}
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ fontWeight: isActive ? 900 : 700, fontSize: "11.5px", color: titleColor, lineHeight: 1.2 }}>
                          {step.title}
                        </Typography>
                        {step.subTitle && (
                          <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "10px", mt: 0.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {step.subTitle}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  </Paper>
                );
              })}

              {isReversing && reversalSteps.length > 0 && (
                <Box sx={{ mt: 1.5, pt: 1.5, borderTop: "1px dashed rgba(239, 68, 68, 0.4)" }}>
                  <Typography sx={{ color: "#EF4444", fontWeight: 900, fontSize: "11px", mb: 0.75, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    🔴 Wallet Reversal
                  </Typography>
                  <Stack spacing={0.75}>
                    {reversalSteps.map((rStep) => {
                      const isRActive = rStep.id === activeReversalStepId;
                      const isRDone = rStep.status === "COMPLETED";
                      return (
                        <Paper
                          key={rStep.id}
                          elevation={0}
                          sx={{
                            p: 0.85,
                            borderRadius: "6px",
                            bgcolor: isRDone ? "rgba(34, 197, 94, 0.1)" : isRActive ? "rgba(239, 68, 68, 0.2)" : "rgba(255, 255, 255, 0.02)",
                            border: isRDone ? "1px solid rgba(34, 197, 94, 0.3)" : isRActive ? "1px solid #EF4444" : "1px solid rgba(255, 255, 255, 0.05)",
                          }}
                        >
                          <Stack direction="row" spacing={0.85} sx={{ alignItems: "center" }}>
                            {isRDone ? (
                              <CheckCircleIcon sx={{ color: "#4ADE80", fontSize: 14 }} />
                            ) : isRActive ? (
                              <AutorenewIcon sx={{ color: "#EF4444", fontSize: 14, animation: "spin 0.8s linear infinite" }} />
                            ) : (
                              <RadioButtonUncheckedIcon sx={{ color: "rgba(255, 255, 255, 0.2)", fontSize: 12 }} />
                            )}
                            <Typography sx={{ fontSize: "10.5px", fontWeight: isRDone ? 800 : 600, color: isRDone ? "#4ADE80" : isRActive ? "#EF4444" : "rgba(255, 255, 255, 0.5)" }}>
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
        </Paper>

        {/* ── CENTER PANEL: TRANSACTION SUMMARY (50%) ── */}
        <Paper
          elevation={0}
          sx={{
            bgcolor: "rgba(15, 23, 42, 0.85)",
            borderRadius: "14px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            p: 2.5,
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            "&::-webkit-scrollbar": { width: 4 },
            "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(255, 255, 255, 0.15)", borderRadius: 2 },
          }}
        >
          {viewState === "SUCCESS_RECEIPT" ? (
            /* ── TERMINAL SUCCESS SCREEN VIEW ── */
            <Box sx={{ textAlign: "center", my: "auto" }}>
              <Box sx={{ width: 64, height: 64, borderRadius: "50%", bgcolor: "rgba(34, 197, 94, 0.15)", border: "2px solid #4ADE80", display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
                <CheckCircleIcon sx={{ fontSize: 44, color: "#4ADE80" }} />
              </Box>

              <Typography sx={{ fontWeight: 900, fontSize: "22px", color: "#4ADE80", mb: 0.5 }}>
                Transaction Successful
              </Typography>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "13px", mb: 2.5 }}>
                Funds transferred successfully to beneficiary bank account.
              </Typography>

              <Paper elevation={0} sx={{ p: 2, borderRadius: "12px", bgcolor: "rgba(37, 99, 235, 0.1)", border: "1px solid rgba(59, 130, 246, 0.3)", mb: 2.5 }}>
                <Typography sx={{ fontSize: "11px", color: "#60A5FA", fontWeight: 800, textTransform: "uppercase" }}>TRANSFER AMOUNT CREDITED</Typography>
                <Typography sx={{ fontWeight: 900, fontSize: "32px", color: "#FFFFFF", my: 0.5 }}>
                  ₹{amount.toLocaleString()}.00
                </Typography>
                <Typography sx={{ fontSize: "11.5px", color: "#4ADE80", fontWeight: 700 }}>
                  Bank UTR: <span style={{ fontFamily: "monospace" }}>{utr}</span>
                </Typography>
              </Paper>

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, mb: 3 }}>
                <Paper elevation={0} sx={{ p: 1.5, borderRadius: "8px", bgcolor: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", textAlign: "left" }}>
                  <Typography sx={{ fontSize: "10.5px", color: "rgba(255, 255, 255, 0.5)", fontWeight: 700 }}>CUSTOMER</Typography>
                  <Typography sx={{ fontSize: "12.5px", fontWeight: 800, color: "#FFFFFF" }}>{customer?.name || "Rajesh Sharma"}</Typography>
                  <Typography sx={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.6)" }}>{customer?.mobile || "9876543210"}</Typography>
                </Paper>
                <Paper elevation={0} sx={{ p: 1.5, borderRadius: "8px", bgcolor: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", textAlign: "left" }}>
                  <Typography sx={{ fontSize: "10.5px", color: "rgba(255, 255, 255, 0.5)", fontWeight: 700 }}>BENEFICIARY</Typography>
                  <Typography sx={{ fontSize: "12.5px", fontWeight: 800, color: "#FFFFFF" }}>{beneficiary?.name || "Beneficiary"}</Typography>
                  <Typography sx={{ fontSize: "11px", color: "#60A5FA" }}>{beneficiary?.bankName || "Axis Bank"}</Typography>
                </Paper>
              </Box>

              <Stack direction="row" spacing={1.5} sx={{ justifyContent: "center", flexWrap: "wrap", gap: 1 }}>
                {onDownloadReceipt && (
                  <Button variant="contained" startIcon={<DownloadIcon />} onClick={onDownloadReceipt} sx={{ bgcolor: "#2563EB", fontWeight: 800, borderRadius: "8px" }}>
                    Download Receipt
                  </Button>
                )}
                {onShareReceipt && (
                  <Button variant="outlined" startIcon={<ShareIcon />} onClick={onShareReceipt} sx={{ color: "#60A5FA", borderColor: "#2563EB", fontWeight: 800, borderRadius: "8px" }}>
                    Share Receipt
                  </Button>
                )}
                {onNewTransfer && (
                  <Button variant="contained" color="success" startIcon={<AddIcon />} onClick={onNewTransfer} sx={{ bgcolor: "#16A34A", fontWeight: 900, borderRadius: "8px" }}>
                    + New Transfer
                  </Button>
                )}
                {onDashboard && (
                  <Button variant="outlined" startIcon={<DashboardIcon />} onClick={onDashboard} sx={{ color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.3)", borderRadius: "8px", fontWeight: 800 }}>
                    🏠 Home / DMT Console
                  </Button>
                )}
              </Stack>
            </Box>
          ) : viewState === "PENDING_RECEIPT" ? (
            /* ── TERMINAL PENDING SCREEN VIEW ── */
            <Box sx={{ textAlign: "center", my: "auto" }}>
              <Box sx={{ width: 64, height: 64, borderRadius: "50%", bgcolor: "rgba(245, 158, 11, 0.15)", border: "2px solid #F59E0B", display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
                <WarningAmberIcon sx={{ fontSize: 44, color: "#FBBF24" }} />
              </Box>

              <Typography sx={{ fontWeight: 900, fontSize: "22px", color: "#FBBF24", mb: 0.5 }}>
                Transaction Submitted Successfully
              </Typography>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "13px", mb: 2.5 }}>
                The receiving bank is processing your transfer. Auto background monitoring started.
              </Typography>

              <Paper elevation={0} sx={{ p: 2, borderRadius: "12px", bgcolor: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", mb: 2.5 }}>
                <Typography sx={{ fontSize: "11px", color: "#FBBF24", fontWeight: 800, textTransform: "uppercase" }}>CURRENT STATUS: PENDING</Typography>
                <Typography sx={{ fontWeight: 900, fontSize: "28px", color: "#FFFFFF", my: 0.5 }}>
                  ₹{amount.toLocaleString()}.00
                </Typography>
                <Typography sx={{ fontSize: "11.5px", color: "rgba(255, 255, 255, 0.7)" }}>
                  Ref: <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#60A5FA" }}>{transactionRef}</span>
                </Typography>
              </Paper>

              <Stack direction="row" spacing={1.5} sx={{ justifyContent: "center", flexWrap: "wrap", gap: 1 }}>
                {onRetry && (
                  <Button variant="contained" startIcon={<ReplayIcon />} onClick={onRetry} sx={{ bgcolor: "#2563EB", fontWeight: 800, borderRadius: "8px" }}>
                    🔄 Try Again
                  </Button>
                )}
                {onNewTransfer && (
                  <Button variant="contained" startIcon={<AddIcon />} onClick={onNewTransfer} sx={{ fontWeight: 800, borderRadius: "8px", bgcolor: "#16A34A", color: "#FFFFFF" }}>
                    + New Transfer
                  </Button>
                )}
                {onDashboard && (
                  <Button variant="outlined" startIcon={<DashboardIcon />} onClick={onDashboard} sx={{ color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.3)", borderRadius: "8px", fontWeight: 800 }}>
                    🏠 Home / DMT Console
                  </Button>
                )}
              </Stack>
            </Box>
          ) : viewState === "FAILURE_RECEIPT" ? (
            /* ── TERMINAL FAILURE SCREEN VIEW ── */
            <Box sx={{ textAlign: "center", my: "auto" }}>
              <Box sx={{ width: 64, height: 64, borderRadius: "50%", bgcolor: "rgba(239, 68, 68, 0.15)", border: "2px solid #EF4444", display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
                <ErrorIcon sx={{ fontSize: 44, color: "#EF4444" }} />
              </Box>

              <Typography sx={{ fontWeight: 900, fontSize: "22px", color: "#EF4444", mb: 0.5 }}>
                Transaction Could Not Be Completed
              </Typography>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.75)", fontSize: "13px", mb: 2.5 }}>
                {sanitizeCustomerErrorMessage(errorMessage)}
              </Typography>

              <Paper elevation={0} sx={{ p: 2, borderRadius: "12px", bgcolor: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", mb: 2.5 }}>
                <Typography sx={{ fontSize: "11px", color: "#EF4444", fontWeight: 800, textTransform: "uppercase" }}>REVERSAL STATUS: REFUND COMPLETED</Typography>
                <Typography sx={{ fontSize: "12.5px", color: "#4ADE80", fontWeight: 700, mt: 0.5 }}>
                  ✔ Retailer Wallet Restored: ₹{totalAmountPaid.toLocaleString()}
                </Typography>
              </Paper>

              <Stack direction="row" spacing={1.5} sx={{ justifyContent: "center", flexWrap: "wrap", gap: 1 }}>
                {onRetry && (
                  <Button variant="contained" startIcon={<ReplayIcon />} onClick={onRetry} sx={{ bgcolor: "#2563EB", fontWeight: 800, borderRadius: "8px" }}>
                    🔄 Try Again
                  </Button>
                )}
                {onNewTransfer && (
                  <Button variant="outlined" startIcon={<AddIcon />} onClick={onNewTransfer} sx={{ color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.3)", borderRadius: "8px", fontWeight: 800 }}>
                    + New Transfer
                  </Button>
                )}
                {onDashboard && (
                  <Button variant="outlined" startIcon={<DashboardIcon />} onClick={onDashboard} sx={{ color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.3)", borderRadius: "8px", fontWeight: 800 }}>
                    🏠 Home / DMT Console
                  </Button>
                )}
              </Stack>
            </Box>
          ) : (
            /* ── LIVE EXECUTION TRANSACTION SUMMARY VIEW ── */
            <>
              {/* LARGE AMOUNT CARD */}
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: "12px",
                  bgcolor: "rgba(37, 99, 235, 0.12)",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  textAlign: "center",
                  mb: 2,
                }}
              >
                <Typography sx={{ fontSize: "10.5px", color: "#60A5FA", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  TRANSFER AMOUNT (BENEFICIARY PAYOUT)
                </Typography>
                <Typography sx={{ fontWeight: 900, fontSize: "36px", color: "#FFFFFF", my: 0.25 }}>
                  ₹{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Typography>
                <Chip
                  label={`Mode: ${transactionMode}`}
                  size="small"
                  sx={{ height: 22, fontSize: "10.5px", fontWeight: 800, bgcolor: "rgba(37, 99, 235, 0.3)", color: "#93C5FD" }}
                />
              </Paper>

              {/* CUSTOMER & BENEFICIARY GRID */}
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, mb: 2 }}>
                {/* CUSTOMER CARD */}
                <Paper elevation={0} sx={{ p: 1.5, borderRadius: "10px", bgcolor: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
                    <Avatar sx={{ width: 28, height: 28, bgcolor: "rgba(37, 99, 235, 0.2)", color: "#60A5FA" }}>
                      <PersonIcon sx={{ fontSize: 16 }} />
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: "9.5px", color: "#60A5FA", fontWeight: 800, textTransform: "uppercase" }}>CUSTOMER</Typography>
                      <Typography sx={{ fontSize: "12px", fontWeight: 800, color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {customer?.name || "Rajesh Sharma"}
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography sx={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.65)" }}>
                    Mob: {customer?.mobile || "9876543210"}
                  </Typography>
                </Paper>

                {/* BENEFICIARY CARD */}
                <Paper elevation={0} sx={{ p: 1.5, borderRadius: "10px", bgcolor: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
                    <Avatar sx={{ width: 28, height: 28, bgcolor: "rgba(34, 197, 94, 0.2)", color: "#4ADE80" }}>
                      <AccountBalanceIcon sx={{ fontSize: 16 }} />
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: "9.5px", color: "#4ADE80", fontWeight: 800, textTransform: "uppercase" }}>BENEFICIARY</Typography>
                      <Typography sx={{ fontSize: "12px", fontWeight: 800, color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {beneficiary?.name || "Beneficiary"}
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography sx={{ fontSize: "11px", color: "#60A5FA", fontWeight: 700 }}>
                    {beneficiary?.bankName || "Axis Bank"}
                  </Typography>
                  <Typography sx={{ fontSize: "10.5px", color: "rgba(255, 255, 255, 0.6)", fontFamily: "monospace" }}>
                    Account: ••••••••3210
                  </Typography>
                </Paper>
              </Box>

              {/* FINANCIAL BREAKDOWN TABLE CARD */}
              <Paper elevation={0} sx={{ p: 1.75, borderRadius: "10px", bgcolor: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)", flex: 1 }}>
                <Typography sx={{ fontSize: "10.5px", color: "rgba(255, 255, 255, 0.5)", fontWeight: 800, textTransform: "uppercase", mb: 1.25 }}>
                  FINANCIAL & LIMIT ACCOUNTING
                </Typography>

                <Stack spacing={0.85}>
                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: "11.5px", color: "rgba(255, 255, 255, 0.6)" }}>Payout Amount</Typography>
                    <Typography sx={{ fontSize: "11.5px", fontWeight: 700, color: "#FFFFFF" }}>₹{amount.toLocaleString()}.00</Typography>
                  </Stack>

                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: "11.5px", color: "rgba(255, 255, 255, 0.6)" }}>Convenience Fee</Typography>
                    <Typography sx={{ fontSize: "11.5px", fontWeight: 700, color: "#FFFFFF" }}>₹{charges.toFixed(2)}</Typography>
                  </Stack>

                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: "11.5px", color: "rgba(255, 255, 255, 0.6)" }}>GST (18%)</Typography>
                    <Typography sx={{ fontSize: "11.5px", fontWeight: 700, color: "#FFFFFF" }}>₹{gst.toFixed(2)}</Typography>
                  </Stack>

                  <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", my: 0.5 }} />

                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: "12px", color: "#60A5FA", fontWeight: 800 }}>NET WALLET DEBIT</Typography>
                    <Typography sx={{ fontSize: "13px", fontWeight: 900, color: "#3B82F6" }}>₹{totalAmountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Typography>
                  </Stack>

                  <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", my: 0.5 }} />

                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.5)" }}>Wallet Balance (Before ➔ After)</Typography>
                    <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#93C5FD" }}>₹{walletBefore.toLocaleString()} ➔ ₹{walletAfter.toLocaleString()}</Typography>
                  </Stack>

                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.5)" }}>Daily Limit Remaining</Typography>
                    <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#4ADE80" }}>₹{dailyLimitRemaining.toLocaleString()}</Typography>
                  </Stack>

                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.5)" }}>Monthly Limit Remaining</Typography>
                    <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#4ADE80" }}>₹{monthlyLimitRemaining.toLocaleString()}</Typography>
                  </Stack>
                </Stack>
              </Paper>
            </>
          )}
        </Paper>

        {/* ── RIGHT PANEL: LIVE BACKEND PROCESSING STATUS (25%) ── */}
        <Paper
          elevation={0}
          sx={{
            bgcolor: "rgba(15, 23, 42, 0.8)",
            borderRadius: "14px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            p: 2,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Typography sx={{ fontWeight: 900, fontSize: "13px", color: "#60A5FA", letterSpacing: "0.08em", textTransform: "uppercase", mb: 1.5 }}>
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
                      p: 1.1,
                      borderRadius: "8px",
                      bgcolor: isDone ? "rgba(34, 197, 94, 0.08)" : isProc ? "rgba(37, 99, 235, 0.2)" : "rgba(255, 255, 255, 0.02)",
                      border: isDone ? "1px solid rgba(34, 197, 94, 0.25)" : isProc ? "1px solid #3B82F6" : "1px solid rgba(255, 255, 255, 0.05)",
                    }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      {isDone ? (
                        <CheckCircleIcon sx={{ color: "#4ADE80", fontSize: 16 }} />
                      ) : isProc ? (
                        <SyncIcon sx={{ color: "#60A5FA", fontSize: 16, animation: "spin 0.8s linear infinite" }} />
                      ) : (
                        <RadioButtonUncheckedIcon sx={{ color: "rgba(255, 255, 255, 0.2)", fontSize: 14 }} />
                      )}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                          <Typography sx={{ fontWeight: 800, fontSize: "11.5px", color: isDone ? "#4ADE80" : isProc ? "#FFFFFF" : "rgba(255, 255, 255, 0.4)" }}>
                            {svc.name}
                          </Typography>
                          <Typography sx={{ fontSize: "9.5px", color: "rgba(255, 255, 255, 0.5)", fontFamily: "monospace" }}>
                            {svc.time}
                          </Typography>
                        </Stack>
                        <Typography sx={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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
      </Box>

      {/* ── FIXED BOTTOM FOOTER ── */}
      <Box
        sx={{
          px: 3,
          py: 1.5,
          bgcolor: "rgba(15, 23, 42, 0.95)",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <LockIcon sx={{ color: "#FBBF24", fontSize: 16 }} />
          <Typography sx={{ color: "rgba(255, 255, 255, 0.65)", fontSize: "11.5px" }}>
            🔒 Security Lockout Active · Do not press back, refresh, or close browser window.
          </Typography>
        </Stack>

        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Typography sx={{ color: "#60A5FA", fontSize: "11.5px", fontWeight: 800 }}>
            Current Step: {steps[activeStepIdx]?.title || "Processing..."}
          </Typography>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "11px" }}>
            Overall: {progressPercent}%
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
};
