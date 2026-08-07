"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
  IconButton,
  Divider,
  LinearProgress,
  Tooltip,
} from "@mui/material";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import SpeedIcon from "@mui/icons-material/Speed";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { useRetailerStore } from "@/stores/use-retailer-store";

export const RightContextPanel: React.FC<{
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}> = ({ collapsed = false, onToggleCollapse }) => {
  const { wallet, syncBalance, isSyncing } = useRetailerStore();
  const [bankList] = useState([
    { name: "HDFC Bank", status: "ONLINE", successRate: "99.9%" },
    { name: "ICICI Bank", status: "ONLINE", successRate: "99.7%" },
    { name: "State Bank of India", status: "SLOW", successRate: "98.4%" },
    { name: "Axis Bank", status: "ONLINE", successRate: "99.5%" },
  ]);

  if (collapsed) {
    return (
      <Box
        sx={{
          width: 48,
          borderLeft: "1px solid rgba(255, 255, 255, 0.12)",
          bgcolor: "rgba(18, 27, 48, 0.75)",
          backdropFilter: "blur(20px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          py: 2,
        }}
      >
        <IconButton onClick={onToggleCollapse} size="small" sx={{ color: "#FFFFFF" }}>
          <ChevronLeftIcon />
        </IconButton>
        <Tooltip title="Live Bank Health" placement="left">
          <IconButton color="success" size="small" sx={{ mt: 2 }}>
            <SpeedIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Wallet Summary" placement="left">
          <IconButton color="primary" size="small" sx={{ mt: 1 }}>
            <AccountBalanceIcon />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        width: 340,
        height: "100%",
        borderLeft: "1px solid rgba(255, 255, 255, 0.12)",
        backgroundColor: "rgba(18, 27, 48, 0.75)",
        backdropFilter: "blur(20px)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        p: 2,
        gap: 2,
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
            <Typography variant="caption" sx={{ color: "#FFFFFF", fontWeight: 800, fontSize: "12px", letterSpacing: "0.04em" }}>
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
          p: 2,
          borderRadius: "16px",
          bgcolor: "rgba(15, 23, 42, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
          <SpeedIcon sx={{ color: "#60A5FA", fontSize: 18 }} />
          <Typography variant="caption" sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            REAL-TIME BANK HEALTH
          </Typography>
        </Stack>

        <Stack spacing={1.2}>
          {bankList.map((b) => (
            <Stack key={b.name} direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="body2" sx={{ color: "#FFFFFF", fontWeight: 600, fontSize: "13px" }}>
                {b.name}
              </Typography>
              <Chip
                label={b.successRate}
                size="small"
                sx={{
                  height: 20,
                  fontSize: "11px",
                  fontWeight: 800,
                  bgcolor: b.status === "ONLINE" ? "rgba(34, 197, 94, 0.15)" : "rgba(245, 158, 11, 0.15)",
                  color: b.status === "ONLINE" ? "#4ADE80" : "#FBBF24",
                  border: `1px solid ${b.status === "ONLINE" ? "rgba(34, 197, 94, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                }}
              />
            </Stack>
          ))}
        </Stack>
      </Paper>

      {/* 3. MEDIUM CARD: OPERATOR WALLET SUMMARY */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: "16px",
          bgcolor: "rgba(15, 23, 42, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
        }}
      >
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="caption" sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            TODAY'S OPERATOR TELEMETRY
          </Typography>
          <IconButton size="small" onClick={syncBalance} disabled={isSyncing} sx={{ color: "#60A5FA" }}>
            <RefreshIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Stack>

        <Typography variant="h6" sx={{ fontWeight: 900, color: "#FFFFFF", mb: 1.5, fontFamily: "monospace" }}>
          ₹{wallet.mainBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </Typography>

        <Stack spacing={1}>
          <Box>
            <Stack direction="row" sx={{ justifyContent: "space-between", mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.70)", fontWeight: 600 }}>Daily Limit</Typography>
              <Typography variant="caption" sx={{ color: "#FFFFFF", fontWeight: 800 }}>₹25,000 / ₹75,000</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={33} sx={{ height: 6, borderRadius: 3, bgcolor: "rgba(255, 255, 255, 0.1)", "& .MuiLinearProgress-bar": { bgcolor: "#2563EB" } }} />
          </Box>
        </Stack>
      </Paper>

      {/* 4. LARGE PROMINENT CARD: AI SMART ROUTE ENGINE */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: "16px",
          bgcolor: "rgba(37, 99, 235, 0.2)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(37, 99, 235, 0.4)",
          boxShadow: "0 8px 32px rgba(37, 99, 235, 0.25)",
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
          <AutoAwesomeIcon sx={{ color: "#60A5FA", fontSize: 22 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "16px" }}>
            AI Route Optimization
          </Typography>
        </Stack>
        <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.90)", fontSize: "13px", lineHeight: 1.5 }}>
          HDFC DirectSwitch route selected automatically for minimum latency. Estimated settlement speed: <strong>1.2s</strong>.
        </Typography>
      </Paper>

      {/* 5. DYNAMIC NOTIFICATION ALERTS */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: "16px",
          bgcolor: "rgba(15, 23, 42, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
          <NotificationsIcon sx={{ color: "#60A5FA", fontSize: 18 }} />
          <Typography variant="caption" sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            LIVE NOTIFICATIONS
          </Typography>
        </Stack>
        <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.70)", display: "block", fontSize: "12px" }}>
          • Cashfree Penny Drop Verified (2m ago)
        </Typography>
        <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.70)", display: "block", fontSize: "12px", mt: 0.5 }}>
          • IMPS Settlement Completed (12m ago)
        </Typography>
      </Paper>
    </Paper>
  );
};
