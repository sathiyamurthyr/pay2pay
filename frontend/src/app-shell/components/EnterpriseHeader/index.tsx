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
import { useCompanyBranding } from "@/hooks/useCompanyBranding";

export interface EnterpriseHeaderProps {
  pageTitle?: string;
}

export const EnterpriseHeader: React.FC<EnterpriseHeaderProps> = ({
  pageTitle = "Money Transfer (DMT)",
}) => {
  const { walletData, isLoading } = useWalletSync();
  const branding = useCompanyBranding();

  const formattedBalance = walletData
    ? `₹${walletData.wallet_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
    : "₹0.00";

  const shortName = walletData?.short_name || (walletData?.owner_name ? walletData.owner_name.split(" ")[0] : "");
  const retailerCode = walletData?.retailer_code || "";

  const brandPrimary = branding.primary_colour || "#A20A3A";
  const brandSecondary = branding.secondary_colour || "#EDC11E";
  const brandMonogram = branding.short_name || (branding.company_code === "PAY2PAY" ? "P2P" : "N4U");

  return (
    <Paper
      elevation={0}
      sx={{
        height: 80,
        px: 3.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        bgcolor: "#FFFFFF",
        borderBottom: "1px solid #E8E2E5",
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
              background: `linear-gradient(135deg, ${brandPrimary} 0%, ${brandSecondary} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              fontWeight: 900,
              fontSize: "18px",
              boxShadow: `0 2px 8px ${brandPrimary}40`,
            }}
          >
            {branding.logo_url && !branding.logo_url.endsWith(".svg") ? (
              <img src={branding.logo_url} alt={branding.display_name} style={{ width: 32, height: 32, objectFit: "contain" }} />
            ) : (
              brandMonogram
            )}
          </Box>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 800, color: "#292329", fontSize: "22px", lineHeight: 1.2 }}>
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
            bgcolor: "#FFFFFF",
            border: "1px solid #E8E2E5",
            display: "flex",
            alignItems: "center",
            gap: 1.6,
            cursor: "pointer",
            boxShadow: "0 1px 3px rgba(41, 35, 41, 0.05)",
            transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            "&:hover": {
              bgcolor: "#FAF8F9",
              borderColor: "#EDC11E",
            },
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: "10px",
              bgcolor: "#FFF8DC",
              border: "1px solid #FFF3C4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <AccountBalanceWalletIcon sx={{ color: "#EDC11E", fontSize: 22 }} />
          </Box>
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: "#625B60",
                fontWeight: 900,
                fontSize: "11px",
                letterSpacing: "0.8px",
                lineHeight: 1.1,
                display: "block",
                textTransform: "uppercase",
                fontFamily: "'Inter', sans-serif",
                opacity: 0.95,
              }}
            >
              MAIN WALLET
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 900,
                color: "#A20A3A",
                fontSize: "18px",
                lineHeight: 1.15,
                letterSpacing: "0.2px",
                fontFamily: "var(--font-geist-mono), 'Inter', monospace, sans-serif",
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
