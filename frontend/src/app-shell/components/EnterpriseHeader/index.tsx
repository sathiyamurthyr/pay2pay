import React from "react";
import { Box, Typography, Stack, Chip, Paper } from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { Breadcrumb } from "../Breadcrumb";
import { GlobalSearch } from "../GlobalSearch";
import { ProfileMenu } from "../ProfileMenu";
import { NotificationCenter } from "../NotificationCenter";
import { QuickActions } from "../QuickActions";
import { tokens } from "@/design-system/tokens/design-tokens";

export interface EnterpriseHeaderProps {
  pageTitle?: string;
  walletBalance?: string;
}

export const EnterpriseHeader: React.FC<EnterpriseHeaderProps> = ({
  pageTitle = "Money Transfer (DMT)",
  walletBalance = "₹48,250.75",
}) => (
  <Paper
    elevation={0}
    sx={{
      height: 72,
      px: 3,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      bgcolor: "rgba(15, 23, 42, 0.85)",
      backdropFilter: "blur(20px)",
      borderBottom: `1px solid ${tokens.colors.neutral.dark.border}`,
      position: "sticky",
      top: 0,
      zIndex: 1100,
    }}
  >
    {/* Left: Brand Logo & Title & Breadcrumb */}
    <Stack direction="row" spacing={2.5} sx={{ alignItems: "center" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: tokens.radii.md,
            background: tokens.colors.gradients.brand,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFFFFF",
            fontWeight: 900,
            fontSize: "16px",
            boxShadow: tokens.shadows.glow,
          }}
        >
          P2P
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900, color: tokens.colors.neutral.dark.textPrimary, lineHeight: 1.1 }}>
            {pageTitle}
          </Typography>
          <Breadcrumb />
        </Box>
      </Box>
    </Stack>

    {/* Center: Global Search Bar */}
    <Box sx={{ width: 360, display: { xs: "none", md: "block" } }}>
      <GlobalSearch />
    </Box>

    {/* Right: Wallet Balance, Environment Badge, Notifications & Profile */}
    <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
      <Paper
        elevation={0}
        sx={{
          px: 1.8,
          py: 0.8,
          borderRadius: tokens.radii.md,
          bgcolor: tokens.colors.brand.primarySubtle,
          border: `1px solid ${tokens.colors.brand.primary}44`,
          display: "flex",
          alignItems: "center",
          gap: 1.2,
        }}
      >
        <AccountBalanceWalletIcon sx={{ color: tokens.colors.brand.primary, fontSize: 20 }} />
        <Box>
          <Typography variant="caption" sx={{ color: tokens.colors.neutral.dark.textSecondary, fontWeight: 700, fontSize: "10px", display: "block" }}>
            MAIN WALLET
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 900, color: tokens.colors.neutral.dark.textPrimary, lineHeight: 1 }}>
            {walletBalance}
          </Typography>
        </Box>
      </Paper>

      <QuickActions />
      <NotificationCenter />
      <ProfileMenu />
    </Stack>
  </Paper>
);
