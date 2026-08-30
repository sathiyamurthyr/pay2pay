"use client";

import React from "react";
import {
  Box,
  Typography,
  Stack,
  IconButton,
  Chip,
  Avatar,
  InputBase,
  Paper,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import NotificationsIcon from "@mui/icons-material/Notifications";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";

export interface TopBarProps {
  walletBalance?: number;
  retailerName?: string;
  retailerId?: string;
  unreadNotifications?: number;
}

export function TopBar({
  walletBalance = 48250,
  retailerName = "Ramesh Kumar",
  retailerId = "RET-91827",
  unreadNotifications = 3,
}: TopBarProps) {
  return (
    <Paper
      elevation={0}
      component="header"
      sx={{
        height: 64,
        px: 3,
        bgcolor: "#101a3d",
        background: "linear-gradient(135deg, #101a3d 0%, #0b1330 100%)",
        borderBottom: "1px solid rgba(231, 226, 212, 0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 1100,
      }}
    >
      {/* BRAND & TITLE */}
      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <IconButton aria-label="Open menu" size="small" sx={{ color: "#f0d98c", bgcolor: "rgba(255,255,255,0.05)" }}>
          <MenuIcon />
        </IconButton>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              px: 1.5,
              py: 0.4,
              borderRadius: "8px",
              background: "linear-gradient(135deg, #7a1329 0%, #5e0f22 100%)",
              border: "1px solid #d4af37",
              color: "#f0d98c",
              fontWeight: 900,
              fontSize: "13px",
              letterSpacing: "0.5px",
            }}
          >
            VELOCITY
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ color: "#FFFFFF", fontWeight: 800, fontSize: "15px", lineHeight: 1.1 }}>
              Velocity DMT
            </Typography>
            <Typography variant="caption" sx={{ color: "#a8adc4", fontSize: "11px" }}>
              Domestic Money Transfer
            </Typography>
          </Box>
        </Box>
      </Stack>

      {/* UNIVERSAL SEARCH BAR */}
      <Paper
        elevation={0}
        sx={{
          display: { xs: "none", md: "flex" },
          alignItems: "center",
          px: 2,
          py: 0.5,
          width: 320,
          bgcolor: "rgba(255, 255, 255, 0.08)",
          borderRadius: "10px",
          border: "1px solid rgba(255, 255, 255, 0.12)",
        }}
      >
        <SearchIcon sx={{ color: "#a8adc4", fontSize: 18, mr: 1 }} />
        <InputBase
          placeholder="Global Search..."
          inputProps={{ "aria-label": "Global Search input" }}
          sx={{ color: "#FFFFFF", fontSize: "13px", flex: 1 }}
        />
        <Chip label="Ctrl + K" size="small" sx={{ height: 18, fontSize: "10px", fontWeight: 700, bgcolor: "rgba(255,255,255,0.15)", color: "#f0d98c" }} />
      </Paper>

      {/* WALLET & PROFILE */}
      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        {/* WALLET BALANCE CHIP */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 1.8,
            py: 0.6,
            bgcolor: "rgba(212, 175, 55, 0.15)",
            border: "1px solid #d4af37",
            borderRadius: "10px",
          }}
        >
          <AccountBalanceWalletIcon sx={{ color: "#d4af37", fontSize: 18 }} />
          <Box>
            <Typography variant="caption" sx={{ color: "#a8adc4", fontSize: "10px", display: "block", lineHeight: 1 }}>
              WALLET
            </Typography>
            <Typography variant="subtitle2" sx={{ color: "#f0d98c", fontWeight: 800, fontSize: "13px", lineHeight: 1 }}>
              ₹{walletBalance.toLocaleString("en-IN")}
            </Typography>
          </Box>
        </Box>

        {/* NOTIFICATION BELL */}
        <IconButton aria-label={`Notifications, ${unreadNotifications} unread`} size="small" sx={{ color: "#a8adc4", bgcolor: "rgba(255,255,255,0.05)" }}>
          <NotificationsIcon sx={{ fontSize: 20 }} />
        </IconButton>

        {/* RETAILER PROFILE CHIP */}
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", pl: 1, borderLeft: "1px solid rgba(255,255,255,0.1)" }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: "#7a1329", color: "#f0d98c", fontWeight: 800, fontSize: "12px", border: "1px solid #d4af37" }}>
            RK
          </Avatar>
          <Box sx={{ display: { xs: "none", lg: "block" } }}>
            <Typography variant="subtitle2" sx={{ color: "#FFFFFF", fontWeight: 800, fontSize: "13px", lineHeight: 1 }}>
              {retailerName}
            </Typography>
            <Typography variant="caption" sx={{ color: "#a8adc4", fontSize: "10px" }}>
              {retailerId}
            </Typography>
          </Box>
        </Stack>
      </Stack>
    </Paper>
  );
}
