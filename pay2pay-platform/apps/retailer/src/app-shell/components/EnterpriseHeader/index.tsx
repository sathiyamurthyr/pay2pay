import React from "react";
import { Box, Typography, Stack, Paper } from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { Breadcrumb } from "../Breadcrumb";
import { GlobalSearch } from "../GlobalSearch";
import { ProfileMenu } from "../ProfileMenu";
import { NotificationCenter } from "../NotificationCenter";
import { QuickActions } from "../QuickActions";
import { tokens } from "@/design-system/tokens/design-tokens";
import { useWalletSync } from "@/context/WalletSyncProvider";

export interface EnterpriseHeaderProps {
  pageTitle?: string;
}

export const EnterpriseHeader: React.FC<EnterpriseHeaderProps> = ({
  pageTitle = "Money Transfer (DMT)",
}) => {
  const { walletData, isLoading } = useWalletSync();

  const formattedBalance = walletData
    ? `₹${walletData.wallet_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
    : "₹0.00";

  const shortName = walletData?.short_name || (walletData?.owner_name ? walletData.owner_name.split(" ")[0] : "Venkatesh");
  const retailerCode = walletData?.retailer_code || "RET-982415";

  return (
    <Paper
      elevation={0}
      sx={{
        height: 80,
        px: 3.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        bgcolor: "rgba(15, 23, 42, 0.90)",
        backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${tokens.colors.neutral.dark.border}`,
        position: "sticky",
        top: 0,
        zIndex: 1100,
      }}
    >
      {/* Left: Brand Logo & Title & Breadcrumb */}
      <Stack direction="row" spacing={2.5} sx={{ alignItems: "center" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: "12px",
              background: tokens.colors.gradients.brand,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              fontWeight: 900,
              fontSize: "18px",
              boxShadow: tokens.shadows.glow,
            }}
          >
            P2P
          </Box>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "22px", lineHeight: 1.2 }}>
              {pageTitle}
            </Typography>
            <Breadcrumb />
          </Box>
        </Box>
      </Stack>

      {/* Center: Global Search Bar */}
      <Box sx={{ width: 380, display: { xs: "none", md: "block" } }}>
        <GlobalSearch />
      </Box>

      {/* Right: Wallet Balance, Environment Badge, Notifications & Profile */}
      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <Paper
          elevation={0}
          sx={{
            px: 2,
            py: 1,
            borderRadius: "12px",
            bgcolor: tokens.colors.brand.primarySubtle,
            border: `1px solid ${tokens.colors.brand.primary}66`,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <AccountBalanceWalletIcon sx={{ color: tokens.colors.brand.primary, fontSize: 24 }} />
          <Box>
            <Typography variant="body1" sx={{ color: "#E2E8F0", fontWeight: 700, fontSize: "14px", display: "block" }}>
              Main Wallet
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "18px", lineHeight: 1.1 }}>
              {isLoading && !walletData ? "Loading..." : formattedBalance}
            </Typography>
          </Box>
        </Paper>

        <QuickActions />
        <NotificationCenter />
        <ProfileMenu ownerName={shortName} code={retailerCode} />
      </Stack>
    </Paper>
  );
};
