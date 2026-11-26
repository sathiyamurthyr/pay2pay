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
        bgcolor: "var(--surface, #FFFFFF)",
        borderBottom: "1px solid var(--brand-border, #E2E8F0)",
        boxShadow: "0 4px 16px rgba(15, 23, 42, 0.05)",
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
        <IconButton size="small" sx={{ color: "var(--text-secondary, #334155)", "&:hover": { color: "var(--brand-primary, #0F3B7D)", bgcolor: "var(--brand-surface, #EFF6FF)" } }}>
          <MenuIcon />
        </IconButton>

        <Typography
          sx={{
            fontWeight: 900,
            fontSize: { xs: "18px", sm: "22px" },
            letterSpacing: "-0.3px",
            color: "var(--brand-primary, #0F3B7D)",
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
            bgcolor: "var(--brand-surface, #EFF6FF)",
            color: "var(--brand-primary, #0F3B7D)",
            border: "1px solid var(--brand-border, rgba(15, 59, 125, 0.25))",
          }}
        />
      </Stack>

      {/* Right: Wallet Balance, Notifications & Profile */}
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <Chip
          icon={<AccountBalanceWalletIcon sx={{ "&&": { color: "var(--brand-primary, #0F3B7D)", fontSize: 16 } }} />}
          label={`₹${walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          size="small"
          sx={{
            bgcolor: "var(--brand-surface, #EFF6FF)",
            border: "1px solid var(--brand-border, rgba(15, 59, 125, 0.25))",
            color: "var(--brand-primary, #0F3B7D)",
            fontWeight: 900,
            fontSize: { xs: "12px", sm: "13.5px" },
            height: 32,
            px: 1,
            borderRadius: "8px",
          }}
        />

        <IconButton size="small" sx={{ color: "var(--text-secondary, #334155)", "&:hover": { color: "var(--brand-primary, #0F3B7D)", bgcolor: "var(--brand-surface, #EFF6FF)" } }}>
          <NotificationsIcon />
        </IconButton>

        <Avatar
          sx={{
            background: "var(--brand-gradient, linear-gradient(135deg, #0F3B7D 0%, #D4AF37 100%))",
            border: "2px solid #FFFFFF",
            color: "#FFFFFF",
            width: 34,
            height: 34,
            fontWeight: 900,
            fontSize: "14px",
            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.14)",
          }}
        >
          S
        </Avatar>
      </Stack>
    </Paper>
  );
};
