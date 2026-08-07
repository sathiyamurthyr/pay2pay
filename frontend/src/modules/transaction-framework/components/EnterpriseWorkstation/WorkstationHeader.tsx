import React from "react";
import { Box, Typography, Stack, Paper, Chip, Avatar, IconButton } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import NotificationsIcon from "@mui/icons-material/Notifications";
import PersonIcon from "@mui/icons-material/Person";

export interface WorkstationHeaderProps {
  walletBalance?: number;
}

export const WorkstationHeader: React.FC<WorkstationHeaderProps> = ({ walletBalance = 124500 }) => {
  return (
    <Paper
      elevation={0}
      sx={{
        height: 64, // Exact 64px Fixed Height
        px: 3,
        bgcolor: "#0B132B",
        borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        borderRadius: 0,
      }}
    >
      {/* Left: Hamburger & Page Title */}
      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <IconButton size="small" sx={{ color: "rgba(255, 255, 255, 0.8)" }}>
          <MenuIcon />
        </IconButton>

        <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "22px", letterSpacing: "-0.3px" }}>
          Money Transfer (DMT)
        </Typography>
      </Stack>

      {/* Right: Wallet Balance, Notifications & Profile */}
      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <Chip
          icon={<AccountBalanceWalletIcon sx={{ "&&": { color: "#FBBF24", fontSize: 16 } }} />}
          label={`₹${walletBalance.toLocaleString()}`}
          size="small"
          sx={{
            bgcolor: "rgba(251, 191, 36, 0.15)",
            color: "#FBBF24",
            fontWeight: 900,
            fontSize: "14px",
            height: 32,
            px: 1,
            borderRadius: "8px",
          }}
        />

        <IconButton size="small" sx={{ color: "rgba(255, 255, 255, 0.8)" }}>
          <NotificationsIcon />
        </IconButton>

        <Avatar sx={{ bgcolor: "#2563EB", color: "#FFFFFF", width: 34, height: 34, fontWeight: 900, fontSize: "14px" }}>
          S
        </Avatar>
      </Stack>
    </Paper>
  );
};
