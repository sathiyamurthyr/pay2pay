import React from "react";
import { Box, Typography, Stack, Tooltip, IconButton, Chip, Divider } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DashboardIcon from "@mui/icons-material/Dashboard";
import SendIcon from "@mui/icons-material/Send";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import QrCodeIcon from "@mui/icons-material/QrCode";
import ReceiptIcon from "@mui/icons-material/Receipt";
import PhoneAndroidIcon from "@mui/icons-material/PhoneAndroid";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PersonIcon from "@mui/icons-material/Person";
import AssessmentIcon from "@mui/icons-material/Assessment";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { tokens } from "@/design-system/tokens/design-tokens";

export interface EnterpriseSidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  activePath?: string;
}

export const EnterpriseSidebar: React.FC<EnterpriseSidebarProps> = ({
  isCollapsed = false,
  onToggle,
  activePath = "/retailer/dmt",
}) => {
  const categories = [
    {
      title: "MAIN",
      items: [{ label: "Dashboard", path: "/retailer-dashboard", icon: DashboardIcon }],
    },
    {
      title: "PAYMENTS",
      items: [
        { label: "Money Transfer (DMT)", path: "/retailer/dmt", icon: SendIcon, badge: "IMPS" },
        { label: "Card To Cash", path: "/retailer/card-to-cash", icon: CreditCardIcon },
        { label: "AEPS Cash Out", path: "/retailer/aeps", icon: FingerprintIcon, badge: "Biometric" },
        { label: "UPI Services", path: "/retailer/upi", icon: QrCodeIcon },
        { label: "Bill Payment (BBPS)", path: "/retailer/bbps", icon: ReceiptIcon },
        { label: "Recharge", path: "/retailer/recharge", icon: PhoneAndroidIcon },
      ],
    },
    {
      title: "WALLET",
      items: [
        { label: "Wallet & Top-Up", path: "/retailer/wallet", icon: AccountBalanceWalletIcon },
        { label: "Wallet Statement", path: "/retailer/wallet-statement", icon: ReceiptLongIcon },
        { label: "Move To Bank", path: "/retailer/settlement", icon: AccountBalanceIcon },
      ],
    },
    {
      title: "CUSTOMERS",
      items: [
        { label: "Customer Directory", path: "/retailer/customers", icon: PersonIcon },
        { label: "Beneficiaries", path: "/retailer/beneficiaries", icon: PersonIcon },
      ],
    },
    {
      title: "BUSINESS",
      items: [
        { label: "Reports & Tax Forms", path: "/retailer/reports", icon: AssessmentIcon },
        { label: "Analytics", path: "/retailer/analytics", icon: AssessmentIcon },
        { label: "Commission Slabs", path: "/retailer/commission", icon: AssessmentIcon },
        { label: "Transaction Ledger", path: "/retailer/transactions", icon: ReceiptLongIcon },
      ],
    },
    {
      title: "SUPPORT",
      items: [
        { label: "Notifications", path: "/retailer/notifications", icon: NotificationsIcon },
        { label: "Support Desk", path: "/retailer/support", icon: AssessmentIcon },
        { label: "Settings", path: "/retailer/settings", icon: AssessmentIcon },
        { label: "Retailer Profile", path: "/retailer/profile", icon: PersonIcon },
      ],
    },
  ];

  return (
    <Box
      sx={{
        width: isCollapsed ? 72 : 300,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: tokens.colors.neutral.dark.bg,
        borderRight: `1px solid ${tokens.colors.neutral.dark.border}`,
        transition: tokens.transitions.fast,
      }}
    >
      {/* Sidebar Top Toggle Row */}
      <Box sx={{ p: 2, display: "flex", justifyContent: isCollapsed ? "center" : "flex-end" }}>
        <IconButton onClick={onToggle} size="small" sx={{ color: tokens.colors.neutral.dark.textSecondary }}>
          {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </Box>

      {/* Scrollable Navigation Groups */}
      <Box sx={{ flex: 1, px: isCollapsed ? 1 : 2, py: 1, overflowY: "auto" }}>
        {categories.map((cat) => (
          <Box key={cat.title} sx={{ mb: 2.5 }}>
            {!isCollapsed && (
              <Typography
                variant="caption"
                sx={{
                  color: tokens.colors.brand.secondary,
                  fontWeight: 800,
                  fontSize: "11px",
                  letterSpacing: "1px",
                  px: "20px",
                  mb: 0.8,
                  display: "block",
                }}
              >
                {cat.title}
              </Typography>
            )}
            <Stack spacing={0.6}>
              {cat.items.map((item) => {
                const IconComp = item.icon;
                const isActive = activePath === item.path;

                return (
                  <Tooltip key={item.path} title={isCollapsed ? item.label : ""} placement="right" arrow>
                    <Box
                      sx={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        height: 56,
                        borderRadius: tokens.radii.lg,
                        px: isCollapsed ? 0 : "20px",
                        justifyContent: isCollapsed ? "center" : "space-between",
                        bgcolor: isActive ? tokens.colors.brand.primarySubtle : "transparent",
                        color: isActive ? "#FFFFFF" : tokens.colors.neutral.dark.textSecondary,
                        cursor: "pointer",
                        boxShadow: isActive ? tokens.shadows.glow : "none",
                        transition: tokens.transitions.fast,
                        "&::before": isActive
                          ? {
                              content: '""',
                              position: "absolute",
                              left: 0,
                              top: "8px",
                              bottom: "8px",
                              width: "4px",
                              borderRadius: "2px",
                              bgcolor: tokens.colors.brand.primary,
                            }
                          : {},
                        "&:hover": { bgcolor: "rgba(255,255,255,0.05)", color: "#FFFFFF" },
                      }}
                    >
                      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                        <IconComp sx={{ fontSize: 22, color: isActive ? tokens.colors.brand.secondary : "rgba(255,255,255,0.88)" }} />
                        {!isCollapsed && (
                          <Typography sx={{ fontSize: "16px", fontWeight: isActive ? 700 : 600, lineHeight: "24px" }}>
                            {item.label}
                          </Typography>
                        )}
                      </Stack>

                      {!isCollapsed && item.badge && (
                        <Chip
                          label={item.badge}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: "10px",
                            fontWeight: 800,
                            bgcolor: isActive ? tokens.colors.brand.primary : "rgba(255,255,255,0.08)",
                            color: isActive ? "#FFFFFF" : tokens.colors.neutral.dark.textSecondary,
                          }}
                        />
                      )}
                    </Box>
                  </Tooltip>
                );
              })}
            </Stack>
          </Box>
        ))}
      </Box>
    </Box>
  );
};
