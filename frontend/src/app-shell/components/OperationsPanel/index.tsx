import React from "react";
import { Box, Typography, Stack, Paper, Chip } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import SpeedIcon from "@mui/icons-material/Speed";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { StatusChip } from "@/design-system/components";

export const OperationsPanel: React.FC<{ width?: number | string }> = ({ width = 360 }) => (
  <Box
    sx={{
      width,
      height: "100%",
      overflowY: "auto",
      p: 2,
      display: "flex",
      flexDirection: "column",
      gap: 3, // 24px gap
    }}
  >
    {/* 1. SMALL COMPACT PILL: SYSTEM STATUS SWITCH */}
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        borderRadius: "12px",
        bgcolor: "rgba(34, 197, 94, 0.12)",
        border: "1px solid rgba(34, 197, 94, 0.3)",
      }}
    >
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <CheckCircleIcon sx={{ color: "#4ADE80", fontSize: 20 }} />
          <Typography sx={{ color: "#FFFFFF", fontWeight: 800, fontSize: "13px", letterSpacing: "0.04em" }}>
            SYSTEM STATUS: 100% ONLINE
          </Typography>
        </Stack>
        <Chip label="OPERATIONAL" size="small" sx={{ bgcolor: "#4ADE80", color: "#0F172A", fontWeight: 900, height: 20, fontSize: "10px" }} />
      </Stack>
    </Paper>

    {/* 2. MEDIUM CARD: REAL-TIME BANK HEALTH */}
    <Paper
      elevation={0}
      sx={{
        p: 2.5, // 20px padding
        borderRadius: "16px",
        bgcolor: "rgba(18, 27, 48, 0.75)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25)",
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
        <SpeedIcon sx={{ color: "#60A5FA", fontSize: 20 }} />
        <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          REAL-TIME BANK HEALTH
        </Typography>
      </Stack>

      <Stack spacing={1.5}>
        {[
          { name: "HDFC Bank", success: "99.9%", status: "success" },
          { name: "ICICI Bank", success: "99.7%", status: "success" },
          { name: "State Bank of India", success: "98.4%", status: "warning" },
          { name: "Axis Bank", success: "99.5%", status: "success" },
        ].map((b) => (
          <Stack key={b.name} direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
            <Typography sx={{ color: "#FFFFFF", fontWeight: 600, fontSize: "14px" }}>
              {b.name}
            </Typography>
            <StatusChip status={b.status as "success" | "warning"} label={b.success} />
          </Stack>
        ))}
      </Stack>
    </Paper>

    {/* 3. MEDIUM CARD: OPERATOR WALLET TELEMETRY */}
    <Paper
      elevation={0}
      sx={{
        p: 2.5, // 20px padding
        borderRadius: "16px",
        bgcolor: "rgba(18, 27, 48, 0.75)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25)",
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
        <AccountBalanceWalletIcon sx={{ color: "#60A5FA", fontSize: 20 }} />
        <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          TODAY'S OPERATOR TELEMETRY
        </Typography>
      </Stack>

      <Stack spacing={1.5}>
        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.70)", fontWeight: 600, fontSize: "13px" }}>Today's Volume</Typography>
          <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "16px" }}>₹1,24,500.00</Typography>
        </Stack>
        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.70)", fontWeight: 600, fontSize: "13px" }}>Gross Commission</Typography>
          <Typography sx={{ fontWeight: 800, color: "#4ADE80", fontSize: "16px" }}>+ ₹450.00</Typography>
        </Stack>
        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.70)", fontWeight: 600, fontSize: "13px" }}>Failed Transactions</Typography>
          <Typography sx={{ fontWeight: 800, color: "#4ADE80", fontSize: "16px" }}>0 Failures</Typography>
        </Stack>
      </Stack>
    </Paper>

    {/* 4. LARGE PROMINENT CARD: AI SMART ROUTE ENGINE */}
    <Paper
      elevation={0}
      sx={{
        p: 3, // 24px padding
        borderRadius: "16px",
        bgcolor: "rgba(37, 99, 235, 0.2)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(37, 99, 235, 0.4)",
        boxShadow: "0 8px 32px rgba(37, 99, 235, 0.25)",
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1.5 }}>
        <AutoAwesomeIcon sx={{ color: "#60A5FA", fontSize: 24 }} />
        <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "18px" }}>
          AI Route Optimization
        </Typography>
      </Stack>
      <Typography sx={{ color: "rgba(255, 255, 255, 0.90)", fontSize: "14px", lineHeight: 1.5 }}>
        HDFC DirectSwitch route selected automatically for minimum latency. Estimated settlement speed: <strong>1.2s</strong>.
      </Typography>
    </Paper>

    {/* 5. DYNAMIC NOTIFICATION ALERTS */}
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: "16px",
        bgcolor: "rgba(18, 27, 48, 0.75)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
        <NotificationsIcon sx={{ color: "#60A5FA", fontSize: 20 }} />
        <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          LIVE NOTIFICATIONS
        </Typography>
      </Stack>
      <Typography sx={{ color: "rgba(255, 255, 255, 0.70)", display: "block", fontSize: "13px" }}>
        • Cashfree Penny Drop Verified (2m ago)
      </Typography>
      <Typography sx={{ color: "rgba(255, 255, 255, 0.70)", display: "block", fontSize: "13px", mt: 0.75 }}>
        • IMPS Settlement Completed (12m ago)
      </Typography>
    </Paper>
  </Box>
);
