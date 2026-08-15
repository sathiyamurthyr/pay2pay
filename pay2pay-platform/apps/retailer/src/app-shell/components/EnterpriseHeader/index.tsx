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

  const shortName = walletData?.short_name || (walletData?.owner_name ? walletData.owner_name.split(" ")[0] : "Partner");
  const retailerCode = walletData?.retailer_code || "RET-PARTNER";

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
          onClick={() => window.location.href = "/retailer/wallet"}
          sx={{
            px: { xs: 1.6, sm: 2.2 },
            py: 0.8,
            borderRadius: "14px",
            bgcolor: "rgba(15, 23, 42, 0.85)",
            border: "1px solid rgba(59, 130, 246, 0.4)",
            display: "flex",
            alignItems: "center",
            gap: 1.6,
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(37, 99, 235, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
            transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            "&:hover": {
              bgcolor: "rgba(30, 58, 138, 0.35)",
              borderColor: "rgba(96, 165, 250, 0.7)",
              boxShadow: "0 6px 20px rgba(37, 99, 235, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
              transform: "translateY(-1px)",
            },
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: "10px",
              bgcolor: "rgba(37, 99, 235, 0.25)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <AccountBalanceWalletIcon sx={{ color: "#60A5FA", fontSize: 22 }} />
          </Box>
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: "#94A3B8",
                fontWeight: 800,
                fontSize: "11px",
                letterSpacing: "0.5px",
                lineHeight: 1,
                display: "block",
                textTransform: "uppercase",
              }}
            >
              MAIN WALLET
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 900,
                color: "#4ADE80",
                fontSize: "18px",
                lineHeight: 1.15,
                letterSpacing: "-0.2px",
                textShadow: "0 0 12px rgba(74, 222, 128, 0.25)",
              }}
            >
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
