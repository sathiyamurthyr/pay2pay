"use client";

import React from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  Chip,
  Avatar,
  Grid,
  CircularProgress,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CheckIcon from "@mui/icons-material/Check";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import SpeedIcon from "@mui/icons-material/Speed";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";

// ─────────────────────────────────────────────────────────────────────────────
// PAY2PAY ENTERPRISE DESIGN SYSTEM SEMANTIC TOKENS (8PX GRID ALIGNED)
// ─────────────────────────────────────────────────────────────────────────────
export const PAY2PAY_TOKENS = {
  colors: {
    primary: "#1D4ED8",
    primaryHover: "#1E40AF",
    success: "#16A34A",
    successLight: "#ECFDF5",
    warning: "#F59E0B",
    warningLight: "#FFFBEB",
    danger: "#DC2626",
    dangerLight: "#FEF2F2",
    info: "#0EA5E9",
    infoLight: "#F0F9FF",
    background: "#F5F7FB",
    surface: "#FFFFFF",
    border: "#E5E7EB",
    textPrimary: "#111827",
    textSecondary: "#6B7280",
    brandBurgundy: "#7B1E3A",
    brandGold: "#D4AF37",
    brandGoldLight: "#FFF8E8",
    brandNavy: "#0F2C59",
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    xxl: "48px",
  },
  radius: {
    sm: "8px",
    md: "12px",
    card: "16px",
    pill: "9999px",
  },
  shadows: {
    card: "0 4px 20px rgba(15, 23, 42, 0.05)",
    hover: "0 8px 28px rgba(15, 23, 42, 0.12)",
    button: "0 4px 14px rgba(29, 78, 216, 0.25)",
  },
  typography: {
    display: { fontSize: "32px", fontWeight: 900, lineHeight: 1.2 },
    heading: { fontSize: "24px", fontWeight: 800, lineHeight: 1.25 },
    section: { fontSize: "20px", fontWeight: 800, lineHeight: 1.3 },
    body: { fontSize: "15px", fontWeight: 600, lineHeight: 1.4 },
    label: { fontSize: "14px", fontWeight: 700, lineHeight: 1.4 },
    caption: { fontSize: "12px", fontWeight: 600, lineHeight: 1.4 },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE ENTERPRISE COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

export interface EnterpriseCardProps {
  children: React.ReactNode;
  borderTopColor?: string;
  sx?: object;
  onClick?: () => void;
}

export function EnterpriseCard({ children, borderTopColor, sx, onClick }: EnterpriseCardProps) {
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        borderRadius: PAY2PAY_TOKENS.radius.card,
        border: `1px solid ${PAY2PAY_TOKENS.colors.border}`,
        boxShadow: PAY2PAY_TOKENS.shadows.card,
        backgroundColor: PAY2PAY_TOKENS.colors.surface,
        p: 3,
        borderTop: borderTopColor ? `4px solid ${borderTopColor}` : undefined,
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        cursor: onClick ? "pointer" : "default",
        "&:hover": onClick
          ? {
              boxShadow: PAY2PAY_TOKENS.shadows.hover,
              transform: "translateY(-2px)",
            }
          : undefined,
        ...sx,
      }}
    >
      {children}
    </Paper>
  );
}

export interface MetricCardProps {
  label: string;
  value: string;
  subtext?: string;
  icon?: React.ReactNode;
  trend?: string;
  trendPositive?: boolean;
}

export function MetricCard({ label, value, subtext, icon, trend, trendPositive }: MetricCardProps) {
  return (
    <EnterpriseCard>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
        <Box>
          <Typography variant="caption" sx={{ color: PAY2PAY_TOKENS.colors.textSecondary, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {label}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, color: PAY2PAY_TOKENS.colors.textPrimary, mt: 0.5 }}>
            {value}
          </Typography>
        </Box>
        {icon && (
          <Box sx={{ p: 1, borderRadius: "10px", bgcolor: PAY2PAY_TOKENS.colors.background, color: PAY2PAY_TOKENS.colors.primary }}>
            {icon}
          </Box>
        )}
      </Stack>

      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        {trend && (
          <Chip
            label={trend}
            size="small"
            sx={{
              height: 20,
              fontSize: "11px",
              fontWeight: 800,
              bgcolor: trendPositive ? PAY2PAY_TOKENS.colors.successLight : PAY2PAY_TOKENS.colors.dangerLight,
              color: trendPositive ? PAY2PAY_TOKENS.colors.success : PAY2PAY_TOKENS.colors.danger,
            }}
          />
        )}
        {subtext && (
          <Typography variant="caption" sx={{ color: PAY2PAY_TOKENS.colors.textSecondary }}>
            {subtext}
          </Typography>
        )}
      </Stack>
    </EnterpriseCard>
  );
}

export interface StatusChipProps {
  label: string;
  status: "success" | "warning" | "danger" | "info" | "brand";
}

export function StatusChip({ label, status }: StatusChipProps) {
  const getStyle = () => {
    switch (status) {
      case "success":
        return { bgcolor: PAY2PAY_TOKENS.colors.successLight, color: PAY2PAY_TOKENS.colors.success };
      case "warning":
        return { bgcolor: PAY2PAY_TOKENS.colors.warningLight, color: PAY2PAY_TOKENS.colors.warning };
      case "danger":
        return { bgcolor: PAY2PAY_TOKENS.colors.dangerLight, color: PAY2PAY_TOKENS.colors.danger };
      case "info":
        return { bgcolor: PAY2PAY_TOKENS.colors.infoLight, color: PAY2PAY_TOKENS.colors.info };
      case "brand":
        return { bgcolor: PAY2PAY_TOKENS.colors.brandGoldLight, color: PAY2PAY_TOKENS.colors.brandBurgundy, border: `1px solid ${PAY2PAY_TOKENS.colors.brandGold}` };
    }
  };

  return <Chip label={label} size="small" sx={{ height: 22, fontSize: "11px", fontWeight: 800, ...getStyle() }} />;
}

export interface AIRecommendationCardProps {
  title: string;
  recommendation: string;
  suggestedRoute: string;
  expectedSuccess: string;
  estimatedTime: string;
  commission: string;
  onApplyRoute?: () => void;
}

export function AIRecommendationCard({
  title,
  recommendation,
  suggestedRoute,
  expectedSuccess,
  estimatedTime,
  commission,
  onApplyRoute,
}: AIRecommendationCardProps) {
  return (
    <EnterpriseCard borderTopColor={PAY2PAY_TOKENS.colors.brandBurgundy} sx={{ bgcolor: "#FDF2F4" }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1 }}>
        <FlashOnIcon sx={{ color: PAY2PAY_TOKENS.colors.brandBurgundy, fontSize: 22 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 900, color: PAY2PAY_TOKENS.colors.brandBurgundy }}>
          {title}
        </Typography>
        <StatusChip label={`${expectedSuccess} Match`} status="success" />
      </Stack>

      <Typography variant="body2" sx={{ color: PAY2PAY_TOKENS.colors.textPrimary, fontWeight: 600, mb: 2 }}>
        {recommendation}
      </Typography>

      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
        <Chip label={`Route: ${suggestedRoute}`} size="small" sx={{ fontWeight: 800, bgcolor: "#FFFFFF", color: PAY2PAY_TOKENS.colors.textPrimary }} />
        <Chip label={`Est. Time: ${estimatedTime}`} size="small" sx={{ fontWeight: 800, bgcolor: "#FFFFFF", color: PAY2PAY_TOKENS.colors.textPrimary }} />
        <Chip label={`Margin: ${commission}`} size="small" sx={{ fontWeight: 800, bgcolor: PAY2PAY_TOKENS.colors.successLight, color: PAY2PAY_TOKENS.colors.success }} />
        {onApplyRoute && (
          <Button size="small" onClick={onApplyRoute} sx={{ fontWeight: 800, color: PAY2PAY_TOKENS.colors.brandBurgundy, textTransform: "none", fontSize: "12px" }}>
            Apply AI Recommendation →
          </Button>
        )}
      </Stack>
    </EnterpriseCard>
  );
}

export interface WorkflowStepItem {
  step: number;
  title: string;
  subtitle: string;
  isCompleted: boolean;
  isCurrent: boolean;
}

export interface WorkflowNavigatorProps {
  steps: WorkflowStepItem[];
  activeStep: number;
  onStepClick: (step: number) => void;
}

export function WorkflowNavigator({ steps, activeStep, onStepClick }: WorkflowNavigatorProps) {
  const percent = Math.round(((activeStep - 1) / (steps.length - 1)) * 100);

  return (
    <EnterpriseCard borderTopColor={PAY2PAY_TOKENS.colors.primary}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
        <Typography variant="caption" sx={{ color: PAY2PAY_TOKENS.colors.textSecondary, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.8px" }}>
          WORKFLOW PROGRESS
        </Typography>
        <StatusChip label={`${percent}% Complete`} status="brand" />
      </Stack>

      <Box sx={{ height: 6, bgcolor: PAY2PAY_TOKENS.colors.border, borderRadius: "3px", overflow: "hidden", mb: 2 }}>
        <Box sx={{ width: `${percent}%`, height: "100%", bgcolor: PAY2PAY_TOKENS.colors.primary, transition: "width 0.3s ease" }} />
      </Box>

      <Typography variant="caption" sx={{ color: PAY2PAY_TOKENS.colors.textSecondary, fontWeight: 600, display: "block", mb: 2 }}>
        Est. Remaining: <strong>35 Seconds</strong> • Step {activeStep} of {steps.length}
      </Typography>

      <Stack spacing={1.5}>
        {steps.map((st) => {
          const canClick = st.isCompleted || st.isCurrent;
          return (
            <Paper
              key={st.step}
              elevation={0}
              onClick={() => canClick && onStepClick(st.step)}
              sx={{
                p: 1.5,
                borderRadius: PAY2PAY_TOKENS.radius.md,
                border: st.isCurrent
                  ? `2px solid ${PAY2PAY_TOKENS.colors.brandGold}`
                  : st.isCompleted
                  ? `1px solid ${PAY2PAY_TOKENS.colors.success}`
                  : `1px solid ${PAY2PAY_TOKENS.colors.border}`,
                bgcolor: st.isCurrent
                  ? PAY2PAY_TOKENS.colors.brandGoldLight
                  : st.isCompleted
                  ? PAY2PAY_TOKENS.colors.successLight
                  : PAY2PAY_TOKENS.colors.background,
                cursor: canClick ? "pointer" : "not-allowed",
                opacity: canClick ? 1 : 0.6,
                transition: "all 0.2s ease",
              }}
            >
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <Box
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: PAY2PAY_TOKENS.radius.sm,
                    bgcolor: st.isCompleted ? PAY2PAY_TOKENS.colors.success : st.isCurrent ? PAY2PAY_TOKENS.colors.primary : "#CBD5E1",
                    color: "#FFFFFF",
                    fontWeight: 900,
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {st.isCompleted ? <CheckIcon sx={{ fontSize: 16 }} /> : `0${st.step}`}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" noWrap sx={{ fontWeight: st.isCurrent ? 900 : 700, color: PAY2PAY_TOKENS.colors.textPrimary, fontSize: "13px" }}>
                    {st.title}
                  </Typography>
                  <Typography variant="caption" noWrap sx={{ color: PAY2PAY_TOKENS.colors.textSecondary, fontSize: "11px", display: "block" }}>
                    {st.subtitle}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    </EnterpriseCard>
  );
}

export interface BankHealthItem {
  bank: string;
  uptime: string;
  latency: string;
  status: string;
  isOperational: boolean;
}

export function BankHealthCard({ banks }: { banks: BankHealthItem[] }) {
  return (
    <EnterpriseCard>
      <Typography variant="caption" sx={{ color: PAY2PAY_TOKENS.colors.textSecondary, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.8px", display: "block", mb: 2 }}>
        REAL-TIME BANK HEALTH MATRIX
      </Typography>
      <Stack spacing={1.5}>
        {banks.map((b) => (
          <Paper key={b.bank} elevation={0} sx={{ p: 1.5, borderRadius: PAY2PAY_TOKENS.radius.md, bgcolor: PAY2PAY_TOKENS.colors.background, border: `1px solid ${PAY2PAY_TOKENS.colors.border}` }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: PAY2PAY_TOKENS.colors.textPrimary, fontSize: "13px" }}>
                  {b.bank}
                </Typography>
                <Typography variant="caption" sx={{ color: PAY2PAY_TOKENS.colors.textSecondary, fontSize: "11px" }}>
                  Uptime {b.uptime} • Latency {b.latency}
                </Typography>
              </Box>
              <StatusChip label={b.status} status={b.isOperational ? "success" : "danger"} />
            </Stack>
          </Paper>
        ))}
      </Stack>
    </EnterpriseCard>
  );
}

export function StickyFooterBar({
  onPrev,
  onNext,
  canPrev,
  canNext,
  nextLabel,
  stepText,
}: {
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  nextLabel: string;
  stepText: string;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 72,
        bgcolor: PAY2PAY_TOKENS.colors.surface,
        borderTop: `1px solid ${PAY2PAY_TOKENS.colors.border}`,
        zIndex: 1100,
        px: 3,
        display: "flex",
        alignItems: "center",
        boxShadow: "0 -4px 20px rgba(15, 23, 42, 0.08)",
      }}
    >
      <Box sx={{ maxWidth: 1780, width: "100%", mx: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", display: { xs: "none", lg: "flex" } }}>
          <Chip label="F1 Help" size="small" sx={{ height: 22, fontSize: "11px", fontWeight: 700, bgcolor: "#F1F5F9", color: "#475569" }} />
          <Chip label="Ctrl+K Search" size="small" sx={{ height: 22, fontSize: "11px", fontWeight: 700, bgcolor: "#F1F5F9", color: "#475569" }} />
          <Chip label="ESC Cancel" size="small" sx={{ height: 22, fontSize: "11px", fontWeight: 700, bgcolor: "#F1F5F9", color: "#475569" }} />
          <Chip label="F9 Refresh" size="small" sx={{ height: 22, fontSize: "11px", fontWeight: 700, bgcolor: "#F1F5F9", color: "#475569" }} />
        </Stack>

        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Button
            variant="outlined"
            disabled={!canPrev}
            onClick={onPrev}
            sx={{
              color: PAY2PAY_TOKENS.colors.primary,
              borderColor: PAY2PAY_TOKENS.colors.primary,
              fontWeight: 800,
              px: 3,
              borderRadius: PAY2PAY_TOKENS.radius.md,
              textTransform: "none",
              height: 44,
              fontSize: "14px",
            }}
          >
            ← Previous
          </Button>

          <Typography variant="subtitle2" sx={{ color: PAY2PAY_TOKENS.colors.textPrimary, fontWeight: 800, fontSize: "15px" }}>
            {stepText}
          </Typography>

          <Button
            variant="contained"
            disabled={!canNext}
            onClick={onNext}
            sx={{
              bgcolor: PAY2PAY_TOKENS.colors.primary,
              color: "#FFFFFF",
              fontWeight: 800,
              px: 3.5,
              borderRadius: PAY2PAY_TOKENS.radius.md,
              textTransform: "none",
              height: 44,
              fontSize: "14px",
              boxShadow: PAY2PAY_TOKENS.shadows.button,
              "&:hover": { bgcolor: PAY2PAY_TOKENS.colors.primaryHover },
            }}
          >
            {nextLabel}
          </Button>
        </Stack>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: PAY2PAY_TOKENS.colors.success, boxShadow: `0 0 8px ${PAY2PAY_TOKENS.colors.success}` }} />
          <Typography variant="caption" sx={{ color: PAY2PAY_TOKENS.colors.textSecondary, fontWeight: 700, fontSize: "12px" }}>
            Live Banking Switch 100% • Sync Just now
          </Typography>
        </Stack>
      </Box>
    </Paper>
  );
}
