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
  Badge,
  Grid,
} from "@mui/material";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import SpeedIcon from "@mui/icons-material/Speed";
import VerifiedIcon from "@mui/icons-material/Verified";
import NotificationsIcon from "@mui/icons-material/Notifications";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CloseIcon from "@mui/icons-material/Close";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { useRetailerStore } from "@/stores/use-retailer-store";

export const RightContextPanel: React.FC<{
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}> = ({ collapsed = false, onToggleCollapse }) => {
  const { wallet, syncBalance, isSyncing } = useRetailerStore();
  const [bankList, setBankList] = useState([
    { name: "HDFC Bank", status: "ONLINE", mode: "IMPS/NEFT", successRate: "99.4%" },
    { name: "State Bank of India", status: "ONLINE", mode: "IMPS/NEFT", successRate: "98.9%" },
    { name: "ICICI Bank", status: "ONLINE", mode: "IMPS/NEFT", successRate: "99.1%" },
    { name: "Axis Bank", status: "SLOW", mode: "NEFT Only", successRate: "94.2%" },
  ]);

  if (collapsed) {
    return (
      <Box
        sx={{
          width: 48,
          borderLeft: "1px solid #E2E8F0",
          bgcolor: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          py: 2,
        }}
      >
        <IconButton onClick={onToggleCollapse} size="small">
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
        width: 320,
        height: "100%",
        borderLeft: "1px solid #E2E8F0",
        backgroundColor: "#F8FAFC",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      }}
    >
      {/* Panel Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: "1px solid #E2E8F0",
          backgroundColor: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <SpeedIcon sx={{ color: "#0284C7", fontSize: 20 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "#0F172A" }}>
            Live Intelligence
          </Typography>
        </Stack>
        {onToggleCollapse && (
          <IconButton size="small" onClick={onToggleCollapse}>
            <ChevronRightIcon />
          </IconButton>
        )}
      </Box>

      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        {/* ── 1. BANK HEALTH & GATEWAY STATUS ── */}
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "#FFF" }}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Bank Health Monitor
            </Typography>
            <Chip label="All Systems Normal" size="small" sx={{ bgcolor: "#DCFCE7", color: "#166534", fontWeight: 800, height: 20, fontSize: "0.65rem" }} />
          </Stack>

          <Stack spacing={1}>
            {bankList.map((b) => (
              <Box key={b.name} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#1E293B" }}>
                  {b.name}
                </Typography>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                  <Chip
                    label={b.status}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: "0.6rem",
                      fontWeight: 800,
                      bgcolor: b.status === "ONLINE" ? "#DCFCE7" : "#FEF3C7",
                      color: b.status === "ONLINE" ? "#15803D" : "#B45309",
                    }}
                  />
                  <Typography variant="caption" sx={{ color: "#64748B", fontSize: "0.65rem" }}>
                    {b.successRate}
                  </Typography>
                </Stack>
              </Box>
            ))}
          </Stack>

          <Divider sx={{ my: 1.5 }} />

          <Grid container spacing={1}>
            <Grid size={{ xs: 6 }}>
              <Box sx={{ p: 1, bgcolor: "#F0FDF4", borderRadius: 2, border: "1px solid #BBF7D0", textAlign: "center" }}>
                <Typography variant="caption" sx={{ color: "#166534", fontWeight: 800, display: "block" }}>
                  NPCI Gateway
                </Typography>
                <Typography variant="caption" sx={{ color: "#15803D", fontWeight: 900 }}>
                  🟢 99.8% Up
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Box sx={{ p: 1, bgcolor: "#F0F9FF", borderRadius: 2, border: "1px solid #BAE6FD", textAlign: "center" }}>
                <Typography variant="caption" sx={{ color: "#075985", fontWeight: 800, display: "block" }}>
                  Cashfree API
                </Typography>
                <Typography variant="caption" sx={{ color: "#0369A1", fontWeight: 900 }}>
                  🟢 Operational
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* ── 2. LIVE WALLET SUMMARY & LIMIT USAGE ── */}
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "#FFF" }}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Main Wallet Balance
            </Typography>
            <IconButton size="small" onClick={syncBalance} disabled={isSyncing}>
              <RefreshIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Stack>

          <Typography variant="h6" sx={{ fontWeight: 900, color: "#0F172A", mb: 1.5 }}>
            ₹{wallet.mainBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </Typography>

          <Stack spacing={1}>
            <Box>
              <Stack direction="row" sx={{ justifyContent: "space-between", mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700 }}>
                  Daily Transfer Limit
                </Typography>
                <Typography variant="caption" sx={{ color: "#0F172A", fontWeight: 800 }}>
                  ₹25,000 / ₹75,000
                </Typography>
              </Stack>
              <LinearProgress variant="determinate" value={33} sx={{ height: 6, borderRadius: 3, bgcolor: "#E2E8F0", "& .MuiLinearProgress-bar": { bgcolor: "#0284C7" } }} />
            </Box>

            <Box>
              <Stack direction="row" sx={{ justifyContent: "space-between", mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700 }}>
                  Monthly DMT Limit
                </Typography>
                <Typography variant="caption" sx={{ color: "#0F172A", fontWeight: 800 }}>
                  ₹85,000 / ₹2,000,000
                </Typography>
              </Stack>
              <LinearProgress variant="determinate" value={42.5} sx={{ height: 6, borderRadius: 3, bgcolor: "#E2E8F0", "& .MuiLinearProgress-bar": { bgcolor: "#16A34A" } }} />
            </Box>
          </Stack>
        </Paper>

        {/* ── 3. RECENT ALERTS & NOTIFICATIONS ── */}
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "#FFF" }}>
          <Typography variant="caption" sx={{ fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: 0.5, mb: 1.5, display: "block" }}>
            Live Notifications
          </Typography>

          <Stack spacing={1}>
            {[
              { title: "Cashfree Penny Drop Verified", time: "2m ago", type: "success" },
              { title: "Wallet Auto-Topup Received", time: "15m ago", type: "info" },
              { title: "HDFC NEFT Maintenance Scheduled", time: "1h ago", type: "warning" },
            ].map((n, idx) => (
              <Box key={idx} sx={{ p: 1.25, borderRadius: 2, bgcolor: "#F8FAFC", border: "1px solid #F1F5F9" }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <CheckCircleIcon sx={{ fontSize: 16, color: n.type === "success" ? "#16A34A" : n.type === "info" ? "#0284C7" : "#D97706" }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: "#0F172A", display: "block" }}>
                      {n.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "0.65rem" }}>
                      {n.time}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            ))}
          </Stack>
        </Paper>
      </Box>
    </Paper>
  );
};
