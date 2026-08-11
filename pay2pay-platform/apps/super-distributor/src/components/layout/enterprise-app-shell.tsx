"use client";

import React from "react";
import { Box, Paper, Stack, Typography, Button, Avatar, Chip, Badge, Tooltip } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import NotificationsIcon from "@mui/icons-material/Notifications";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ShieldIcon from "@mui/icons-material/Shield";

interface EnterpriseAppShellProps {
  headerTitle?: string;
  headerSubtitle?: string;
  walletBalance?: number;
  leftSidebar: React.ReactNode;
  children: React.ReactNode;
  rightSidebar: React.ReactNode;
  footerLeft?: React.ReactNode;
  footerCenter?: React.ReactNode;
  footerRight?: React.ReactNode;
}

export const EnterpriseAppShell: React.FC<EnterpriseAppShellProps> = ({
  headerTitle = "Money Transfer (DMT)",
  headerSubtitle = "Enterprise Retailer Operations Platform",
  walletBalance = 48250.75,
  leftSidebar,
  children,
  rightSidebar,
  footerLeft,
  footerCenter,
  footerRight,
}) => {
  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        bgcolor: "#08111F",
        color: "#F8FAFC",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      {/* ── 1. HEADER (72px STICKY VIEWPORT TOP BAR) ── */}
      <Box
        component="header"
        sx={{
          height: 72,
          minHeight: 72,
          bgcolor: "rgba(18, 27, 48, 0.72)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          px: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 1300,
          flexShrink: 0,
        }}
      >
        {/* Brand & Page Identity */}
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: "10px",
              background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              color: "#FFF",
              fontSize: "18px",
              boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
            }}
          >
            P2P
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900, fontSize: "18px", color: "#F8FAFC", lineHeight: 1.2 }}>
              PAY2PAY <Typography component="span" sx={{ color: "#3B82F6", fontWeight: 700, fontSize: "16px", ml: 0.5 }}>{headerTitle}</Typography>
            </Typography>
            <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px", fontWeight: 600 }}>
              {headerSubtitle}
            </Typography>
          </Box>
        </Stack>

        {/* Global Utilities */}
        <Stack direction="row" spacing={2.5} sx={{ alignItems: "center" }}>
          {/* Universal Search Hint */}
          <Paper
            elevation={0}
            sx={{
              px: 2,
              py: 0.8,
              borderRadius: "10px",
              bgcolor: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              cursor: "pointer",
            }}
          >
            <SearchIcon sx={{ color: "#94A3B8", fontSize: 18 }} />
            <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 600, fontSize: "12px" }}>
              Search commands...
            </Typography>
            <Chip label="Ctrl+K" size="small" sx={{ height: 18, fontSize: "10px", fontWeight: 800, bgcolor: "rgba(255, 255, 255, 0.08)", color: "#94A3B8" }} />
          </Paper>

          {/* Live Wallet Balance Chip */}
          <Paper
            elevation={0}
            sx={{
              px: 2,
              py: 0.8,
              borderRadius: "10px",
              bgcolor: "rgba(37, 99, 235, 0.15)",
              border: "1px solid #2563EB",
              display: "flex",
              alignItems: "center",
              gap: 1.2,
            }}
          >
            <AccountBalanceWalletIcon sx={{ color: "#3B82F6", fontSize: 20 }} />
            <Box>
              <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "10px", fontWeight: 700, display: "block", lineHeight: 1 }}>
                MAIN WALLET
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "#F8FAFC", fontSize: "14px", lineHeight: 1.1 }}>
                ₹{walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </Typography>
            </Box>
          </Paper>

          {/* Notifications */}
          <Badge badgeContent={2} color="error">
            <Paper elevation={0} sx={{ p: 1, borderRadius: "10px", bgcolor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", cursor: "pointer" }}>
              <NotificationsIcon sx={{ color: "#F8FAFC", fontSize: 20 }} />
            </Paper>
          </Badge>

          {/* Profile */}
          <Tooltip title="Ramesh Kumar (Retailer)">
            <Avatar sx={{ bgcolor: "#2563EB", width: 38, height: 38, fontWeight: 900, fontSize: "14px", border: "2px solid #3B82F6" }}>
              RK
            </Avatar>
          </Tooltip>
        </Stack>
      </Box>

      {/* ── 2. VIEWPORT MAIN BODY (CSS GRID ENGINE: 260px LEFT | FLEX CENTER | 360px RIGHT) ── */}
      <Box
        sx={{
          flex: 1,
          height: "calc(100vh - 136px)",
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "220px minmax(650px, 1fr) 300px",
            lg: "240px minmax(800px, 1fr) 340px",
            xl: "260px minmax(900px, 1fr) 360px",
          },
          gap: 0,
          width: "100vw",
          overflow: "hidden",
        }}
      >
        {/* LEFT SIDEBAR PANEL (INDEPENDENT SCROLLING) */}
        <Box
          component="aside"
          sx={{
            height: "100%",
            overflowY: "auto",
            borderRight: "1px solid rgba(255, 255, 255, 0.08)",
            p: 2.5,
            bgcolor: "rgba(15, 23, 42, 0.4)",
            "&::-webkit-scrollbar": { width: "6px" },
            "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(255, 255, 255, 0.12)", borderRadius: "3px" },
          }}
        >
          {leftSidebar}
        </Box>

        {/* MAIN WORKSPACE CANVAS (INDEPENDENT SCROLLING, UNCONSTRAINED WIDTH) */}
        <Box
          component="main"
          sx={{
            height: "100%",
            overflowY: "auto",
            p: 3,
            width: "100%",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            "&::-webkit-scrollbar": { width: "8px" },
            "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(37, 99, 235, 0.3)", borderRadius: "4px" },
          }}
        >
          {children}
        </Box>

        {/* RIGHT SIDEBAR OPERATIONS CENTER (INDEPENDENT SCROLLING) */}
        <Box
          component="aside"
          sx={{
            height: "100%",
            overflowY: "auto",
            borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
            p: 2.5,
            bgcolor: "rgba(15, 23, 42, 0.4)",
            "&::-webkit-scrollbar": { width: "6px" },
            "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(255, 255, 255, 0.12)", borderRadius: "3px" },
          }}
        >
          {rightSidebar}
        </Box>
      </Box>

      {/* ── 3. FOOTER (64px STICKY VIEWPORT BOTTOM BAR) ── */}
      <Box
        component="footer"
        sx={{
          height: 64,
          minHeight: 64,
          bgcolor: "rgba(18, 27, 48, 0.85)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          px: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 1300,
          flexShrink: 0,
        }}
      >
        <Box>{footerLeft}</Box>
        <Box>{footerCenter}</Box>
        <Box>{footerRight}</Box>
      </Box>
    </Box>
  );
};
