import React from "react";
import { Box, Typography, Stack, Paper, Chip, Avatar, IconButton } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import NotificationsIcon from "@mui/icons-material/Notifications";
import PersonIcon from "@mui/icons-material/Person";

export interface WorkstationHeaderProps {
  walletBalance?: number;
}

export const WorkstationHeader: React.FC<WorkstationHeaderProps> = ({ walletBalance = 0 }) => {
  return (
    <Paper
      elevation={0}
      sx={{
        height: 64, // Exact 64px Fixed Height
        px: { xs: 2, sm: 3 },
        bgcolor: "rgba(8, 11, 17, 0.95)",
        backdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(245, 158, 11, 0.2)",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        borderRadius: 0,
        boxSizing: "border-box",
      }}
    >
      {/* Left: Hamburger & Page Title */}
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <IconButton size="small" sx={{ color: "rgba(255, 255, 255, 0.8)", "&:hover": { color: "#FDE68A", bgcolor: "rgba(245, 158, 11, 0.1)" } }}>
          <MenuIcon />
        </IconButton>

        <Typography
          sx={{
            fontWeight: 900,
            fontSize: { xs: "18px", sm: "22px" },
            letterSpacing: "-0.3px",
            background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #F59E0B 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Money Transfer (DMT)
        </Typography>

        <Chip
          label="DirectSwitch"
          size="small"
          sx={{
            display: { xs: "none", sm: "inline-flex" },
            height: 22,
            px: 0.5,
            fontSize: "10px",
            fontWeight: 800,
            bgcolor: "rgba(37, 99, 235, 0.15)",
            color: "#60A5FA",
            border: "1px solid rgba(96, 165, 250, 0.35)",
          }}
        />
      </Stack>

      {/* Right: Wallet Balance, Notifications & Profile */}
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <Chip
          icon={<AccountBalanceWalletIcon sx={{ "&&": { color: "#FBBF24", fontSize: 16 } }} />}
          label={`₹${walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          size="small"
          sx={{
            bgcolor: "rgba(245, 158, 11, 0.12)",
            border: "1px solid rgba(245, 158, 11, 0.35)",
            color: "#FDE68A",
            fontWeight: 900,
            fontSize: { xs: "12px", sm: "13.5px" },
            height: 32,
            px: 1,
            borderRadius: "8px",
            boxShadow: "0 0 14px rgba(245, 158, 11, 0.2)",
          }}
        />

        <IconButton size="small" sx={{ color: "rgba(255, 255, 255, 0.8)", "&:hover": { color: "#FDE68A", bgcolor: "rgba(245, 158, 11, 0.1)" } }}>
          <NotificationsIcon />
        </IconButton>

        <Avatar
          sx={{
            background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
            border: "2px solid #F59E0B",
            color: "#FDE68A",
            width: 34,
            height: 34,
            fontWeight: 900,
            fontSize: "14px",
            boxShadow: "0 0 10px rgba(245, 158, 11, 0.35)",
          }}
        >
          S
        </Avatar>
      </Stack>
    </Paper>
  );
};
