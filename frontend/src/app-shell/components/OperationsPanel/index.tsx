import React from "react";
import { Box, Typography, Stack, Paper, Chip } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ShieldIcon from "@mui/icons-material/Shield";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { StatusChip, GlassCard } from "@/design-system/components";
import { tokens } from "@/design-system/tokens/design-tokens";

export const OperationsPanel: React.FC<{ width?: number | string }> = ({ width = 360 }) => (
  <Box
    sx={{
      width,
      height: "100%",
      overflowY: "auto",
      p: 2.5,
      display: "flex",
      flexDirection: "column",
      gap: 2.5,
    }}
  >
    {/* 1. SYSTEM STATUS SWITCH (100%) */}
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: tokens.radii.lg,
        bgcolor: tokens.colors.neutral.dark.surface,
        border: `1px solid ${tokens.colors.neutral.dark.border}`,
        borderTop: `4px solid ${tokens.colors.status.success}`,
      }}
    >
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          <Typography variant="caption" sx={{ color: tokens.colors.neutral.dark.textSecondary, fontWeight: 800, textTransform: "uppercase" }}>
            SYSTEM STATUS SWITCH
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, color: tokens.colors.status.successText, mt: 0.2 }}>
            100% ONLINE (OPERATIONAL)
          </Typography>
        </Box>
        <CheckCircleIcon sx={{ color: tokens.colors.status.success, fontSize: 28 }} />
      </Stack>
    </Paper>

    {/* 2. REAL-TIME BANK HEALTH MATRIX */}
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: tokens.radii.lg,
        bgcolor: tokens.colors.neutral.dark.surface,
        border: `1px solid ${tokens.colors.neutral.dark.border}`,
      }}
    >
      <Typography variant="caption" sx={{ color: tokens.colors.brand.secondary, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", mb: 1.5, display: "block" }}>
        REAL-TIME BANK HEALTH
      </Typography>

      <Stack spacing={1.5}>
        {[
          { name: "HDFC Bank", success: "99.9%", status: "success" },
          { name: "ICICI Bank", success: "99.7%", status: "success" },
          { name: "State Bank of India", success: "98.4%", status: "warning" },
          { name: "Axis Bank", success: "99.5%", status: "success" },
        ].map((b) => (
          <Stack key={b.name} direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="body2" sx={{ color: tokens.colors.neutral.dark.textPrimary, fontWeight: 600 }}>
              {b.name}
            </Typography>
            <StatusChip status={b.status as "success" | "warning"} label={b.success} />
          </Stack>
        ))}
      </Stack>
    </Paper>

    {/* 3. WALLET TELEMETRY */}
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: tokens.radii.lg,
        bgcolor: tokens.colors.neutral.dark.surface,
        border: `1px solid ${tokens.colors.neutral.dark.border}`,
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
        <AccountBalanceWalletIcon sx={{ color: tokens.colors.brand.primary, fontSize: 20 }} />
        <Typography variant="caption" sx={{ color: tokens.colors.brand.secondary, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px" }}>
          TODAY'S OPERATOR TELEMETRY
        </Typography>
      </Stack>

      <Stack spacing={1.2}>
        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography variant="caption" sx={{ color: tokens.colors.neutral.dark.textSecondary }}>Today's Volume</Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: tokens.colors.neutral.dark.textPrimary }}>₹1,24,500.00</Typography>
        </Stack>
        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography variant="caption" sx={{ color: tokens.colors.neutral.dark.textSecondary }}>Gross Commission</Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: tokens.colors.status.successText }}>+ ₹450.00</Typography>
        </Stack>
        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography variant="caption" sx={{ color: tokens.colors.neutral.dark.textSecondary }}>Failed Transactions</Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: tokens.colors.status.successText }}>0 Failures</Typography>
        </Stack>
      </Stack>
    </Paper>

    {/* 4. AI SMART ROUTE ENGINE */}
    <GlassCard sx={{ borderLeft: `4px solid ${tokens.colors.brand.primary}` }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
        <AutoAwesomeIcon sx={{ color: tokens.colors.brand.secondary, fontSize: 20 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: tokens.colors.brand.secondary }}>
          AI Route Optimization
        </Typography>
      </Stack>
      <Typography variant="body2" sx={{ color: tokens.colors.neutral.dark.textSecondary }}>
        HDFC DirectSwitch route selected automatically. Estimated settlement: 1.2s.
      </Typography>
    </GlassCard>
  </Box>
);
