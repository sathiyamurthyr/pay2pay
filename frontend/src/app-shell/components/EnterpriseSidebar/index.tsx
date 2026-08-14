"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Stack,
  Tooltip,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import StarIcon from "@mui/icons-material/Star";
import LockIcon from "@mui/icons-material/Lock";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import DashboardIcon from "@mui/icons-material/Dashboard";
import SendIcon from "@mui/icons-material/Send";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import ReceiptIcon from "@mui/icons-material/Receipt";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import PersonIcon from "@mui/icons-material/Person";
import HelpIcon from "@mui/icons-material/Help";
import SettingsIcon from "@mui/icons-material/Settings";
import GavelIcon from "@mui/icons-material/Gavel";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import DescriptionIcon from "@mui/icons-material/Description";
import { tokens } from "@/design-system/tokens/design-tokens";
import { useOnboardingGuard } from "@/hooks/useOnboardingGuard";
import { normalizeUserRole } from "@/lib/portal-resolver";

const FINANCIAL_PATHS = new Set([
  "/retailer/dmt",
  "/retailer/card-to-cash",
  "/retailer/aeps",
  "/retailer/upi",
  "/retailer/bbps",
  "/retailer/recharge",
  "/retailer/wallet",
  "/retailer/settlements",
  "/retailer/reports/transaction-ledger",
]);

export interface EnterpriseSidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  activePath?: string;
}

export const EnterpriseSidebar: React.FC<EnterpriseSidebarProps> = ({
  isCollapsed = false,
  onToggle,
  activePath = "/retailer/dashboard",
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);

  const { verificationStatus, retailerStatus, loading: guardLoading } = useOnboardingGuard();
  const isApproved = !guardLoading && verificationStatus === "APPROVED" && retailerStatus === "ACTIVE";

  const isLocked = (item: { financial?: boolean; path: string }) =>
    !isApproved && (item.financial || FINANCIAL_PATHS.has(item.path));

  const lockTooltip = "Available after account verification & approval";

  const rawRoleStr =
    typeof window !== "undefined"
      ? localStorage.getItem("p2p_user_role") || localStorage.getItem("pay2pay_user_role") || "RETAILER"
      : "RETAILER";

  const userRole = normalizeUserRole(rawRoleStr);

  const toggleFavorite = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setFavorites((prev) => {
      const updated = prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path];
      try {
        localStorage.setItem("p2p_sidebar_favorites", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem("p2p_sidebar_favorites");
      if (saved) {
        const parsed = JSON.parse(saved);
        const prefix = userRole === "SD" ? "/sd" : userRole === "DIST" ? "/dist" : "/retailer";
        const clean = parsed.filter((p: string) => p.startsWith(prefix));
        setFavorites(clean.length > 0 ? clean : [userRole === "SD" ? "/sd/dashboard" : userRole === "DIST" ? "/dist/dashboard" : "/retailer/dashboard"]);
      } else {
        setFavorites([userRole === "SD" ? "/sd/dashboard" : userRole === "DIST" ? "/dist/dashboard" : "/retailer/dashboard"]);
      }
    } catch {
      setFavorites([userRole === "SD" ? "/sd/dashboard" : userRole === "DIST" ? "/dist/dashboard" : "/retailer/dashboard"]);
    }
  }, [userRole]);

  // PORTAL SPECIFIC NAVIGATION CONFIGURATIONS
  const retailerNavigation = [
    {
      title: "Retailer Console",
      items: [
        { label: "Dashboard", path: "/retailer/dashboard", icon: DashboardIcon },
        { label: "Money Transfer (DMT)", path: "/retailer/dmt", icon: SendIcon, financial: true },
        { label: "POS Settlement", path: "/retailer/settlements", icon: ReceiptIcon, financial: true },
      ],
    },
    {
      title: "Financial Reports",
      items: [
        { label: "Payout Transactions", path: "/retailer/reports/payout-transactions", icon: ReceiptIcon },
        { label: "Transaction Ledger", path: "/retailer/reports/transaction-ledger", icon: MenuBookIcon, financial: true },
        { label: "Tax Report", path: "/retailer/reports/tax", icon: GavelIcon },
        { label: "Daily Open & Close", path: "/retailer/reports/daily-open-close", icon: DescriptionIcon, badge: "Recon" },
      ],
    },
    {
      title: "Account & Support",
      items: [
        { label: "Profile", path: "/retailer/profile", icon: PersonIcon },
        { label: "Settings", path: "/retailer/settings", icon: SettingsIcon },
        { label: "Support", path: "/retailer/support", icon: HelpIcon },
      ],
    },
  ];

  const distNavigation = [
    {
      title: "Distributor Portal",
      items: [
        { label: "Dashboard", path: "/dist/dashboard", icon: DashboardIcon },
        { label: "Retail Partners", path: "/dist/retailers", icon: SendIcon },
        { label: "Territory Topology", path: "/dist/organization", icon: AccountBalanceIcon },
      ],
    },
    {
      title: "Liquidity & Settlements",
      items: [
        { label: "Partner Top-up", path: "/dist/transfers", icon: CreditCardIcon, badge: "Instant" },
        { label: "Settlement Batches", path: "/dist/settlements", icon: ReceiptIcon },
      ],
    },
    {
      title: "Reports & Settings",
      items: [
        { label: "Payout Transactions", path: "/dist/reports/payout-transactions", icon: ReceiptIcon },
        { label: "Transaction Ledger", path: "/dist/reports/transaction-ledger", icon: MenuBookIcon },
        { label: "Tax Report", path: "/dist/reports/tax", icon: GavelIcon },
        { label: "Daily Open & Close", path: "/dist/reports/daily-open-close", icon: DescriptionIcon, badge: "Recon" },
        { label: "Account Settings", path: "/dist/settings", icon: VerifiedUserIcon },
      ],
    },
  ];

  const sdNavigation = [
    {
      title: "SD Master Console",
      items: [
        { label: "Dashboard", path: "/sd/dashboard", icon: DashboardIcon },
        { label: "Network Distributors", path: "/sd/distributors", icon: SendIcon },
        { label: "Organization Topology", path: "/sd/organization", icon: AccountBalanceIcon },
      ],
    },
    {
      title: "Master Liquidity",
      items: [
        { label: "Bulk Wallet Transfer", path: "/sd/transfers", icon: CreditCardIcon, badge: "Master" },
        { label: "Settlement Operations", path: "/sd/settlements", icon: ReceiptIcon },
      ],
    },
    {
      title: "Reports & Settings",
      items: [
        { label: "Payout Transactions", path: "/sd/reports/payout-transactions", icon: ReceiptIcon },
        { label: "Transaction Ledger", path: "/sd/reports/transaction-ledger", icon: MenuBookIcon },
        { label: "Tax Report", path: "/sd/reports/tax", icon: GavelIcon },
        { label: "Daily Open & Close", path: "/sd/reports/daily-open-close", icon: DescriptionIcon, badge: "Recon" },
        { label: "Security & Settings", path: "/sd/settings", icon: VerifiedUserIcon },
      ],
    },
  ];

  const categories = userRole === "SD" ? sdNavigation : userRole === "DIST" ? distNavigation : retailerNavigation;

  const allItems = categories.flatMap((cat) => cat.items);
  const favoriteItems = allItems.filter((item) => favorites.includes(item.path));

  const filteredCategories = categories
    .map((cat) => ({
      ...cat,
      items: cat.items.filter((item) => item.label.toLowerCase().includes(searchQuery.toLowerCase())),
    }))
    .filter((cat) => cat.items.length > 0);

  return (
    <Box
      sx={{
        width: isCollapsed ? 76 : 280,
        height: "100vh",
        bgcolor: "#0B132B",
        borderRight: "1px solid rgba(255, 255, 255, 0.14)",
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        zIndex: 1200,
        transition: tokens.transitions.fast,
      }}
    >
      {/* Sidebar Top Header & Collapse Toggle */}
      <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {!isCollapsed && (
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "16px" }}>
            Workspace Menu
          </Typography>
        )}
        <IconButton onClick={onToggle} size="medium" sx={{ color: "#FFFFFF", bgcolor: "rgba(255,255,255,0.08)" }}>
          {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </Box>

      {/* ── Verification Pending Banner (shown when not approved) ── */}
      {!isApproved && !guardLoading && !isCollapsed && userRole === "RETAILER" && (
        <Box
          sx={{
            mx: 2,
            mb: 1.5,
            p: 1.5,
            borderRadius: "10px",
            background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(234, 88, 12, 0.10) 100%)",
            border: "1px solid rgba(245, 158, 11, 0.35)",
            display: "flex",
            alignItems: "flex-start",
            gap: 1,
          }}
        >
          <VerifiedUserIcon sx={{ fontSize: 16, color: "#F59E0B", mt: 0.2, flexShrink: 0 }} />
          <Box>
            <Typography sx={{ fontSize: "11px", fontWeight: 800, color: "#F59E0B", lineHeight: 1.3 }}>
              Verification Pending
            </Typography>
            <Typography sx={{ fontSize: "10px", color: "rgba(255,255,255,0.55)", mt: 0.3, lineHeight: 1.4 }}>
              Financial services unlock after admin approval.
            </Typography>
          </Box>
        </Box>
      )}

      {/* SEARCH MENU INPUT BAR */}
      {!isCollapsed && (
        <Box sx={{ px: 2, pb: 1.5 }}>
          <TextField
            fullWidth
            size="medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search menu..."
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#60A5FA", fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery("")} sx={{ p: 0.5, color: "rgba(255, 255, 255, 0.7)" }}>
                      <ClearIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
                sx: {
                  height: 44,
                  fontSize: "16px",
                  color: "#FFFFFF",
                  borderRadius: "10px",
                  bgcolor: "rgba(255, 255, 255, 0.08)",
                  "& fieldset": { borderColor: "rgba(255, 255, 255, 0.16)" },
                  "&:hover fieldset": { borderColor: "#3B82F6" },
                  "&.Mui-focused fieldset": { borderColor: "#2563EB" },
                },
              },
            }}
          />
        </Box>
      )}

      {/* Navigation Menu List */}
      <Box
        sx={{
          flex: 1,
          px: isCollapsed ? 1 : 2,
          py: 1,
          overflowY: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {/* FAVORITES CATEGORY */}
        {!searchQuery && favoriteItems.length > 0 && (
          <Box sx={{ mb: 2 }}>
            {!isCollapsed && (
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", px: "14px", mb: 1 }}>
                <StarIcon sx={{ color: "#FFD54F", fontSize: 16 }} />
                <Typography variant="body1" sx={{ color: "#FFD54F", fontWeight: 800, fontSize: "15px" }}>
                  Favorites
                </Typography>
              </Stack>
            )}
            <Stack spacing={0.6}>
              {favoriteItems.map((item) => {
                const IconComp = item.icon;
                const isActive = activePath === item.path;
                const isFav = favorites.includes(item.path);
                const locked = isLocked(item);

                return (
                  <Tooltip
                    key={`fav-${item.path}`}
                    title={locked ? lockTooltip : isCollapsed ? item.label : ""}
                    placement="right"
                    arrow
                  >
                    <Box
                      onClick={() => {
                        if (!locked) window.location.href = item.path;
                      }}
                      sx={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        height: 48,
                        borderRadius: "12px",
                        px: isCollapsed ? 0 : "14px",
                        justifyContent: isCollapsed ? "center" : "space-between",
                        bgcolor: locked
                          ? "rgba(255, 255, 255, 0.04)"
                          : isActive
                          ? "#2563EB"
                          : "rgba(255, 213, 79, 0.10)",
                        color: locked ? "rgba(255,255,255,0.35)" : "#FFFFFF",
                        cursor: locked ? "not-allowed" : "pointer",
                        boxShadow: isActive && !locked ? "0 4px 14px rgba(37, 99, 235, 0.40)" : "none",
                        transition: "all 150ms ease",
                        "&:hover": {
                          bgcolor: locked
                            ? "rgba(255, 255, 255, 0.04)"
                            : isActive
                            ? "#1D4ED8"
                            : "rgba(255, 255, 255, 0.14)",
                        },
                        ...(locked && { borderLeft: "2px solid rgba(245, 158, 11, 0.35)" }),
                      }}
                    >
                      <Stack direction="row" spacing={1.8} sx={{ alignItems: "center" }}>
                        <IconComp
                          sx={{
                            fontSize: 22,
                            color: locked
                              ? "rgba(255,255,255,0.25)"
                              : isActive
                              ? "#FFFFFF"
                              : "#FFD54F",
                          }}
                        />
                        {!isCollapsed && (
                          <Typography sx={{ fontSize: "17px", fontWeight: isActive ? 700 : 600 }}>
                            {item.label}
                          </Typography>
                        )}
                      </Stack>

                      {!isCollapsed && (
                        locked ? (
                          <LockIcon sx={{ fontSize: 14, color: "rgba(245, 158, 11, 0.7)", flexShrink: 0 }} />
                        ) : (
                          <IconButton
                            size="small"
                            onClick={(e) => toggleFavorite(item.path, e)}
                            sx={{ p: 0.5, color: isFav ? "#FFD54F" : "rgba(255,255,255,0.5)" }}
                          >
                            <StarIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        )
                      )}
                    </Box>
                  </Tooltip>
                );
              })}
            </Stack>
          </Box>
        )}

        {/* CATEGORIZED MENU ITEMS */}
        {filteredCategories.map((cat) => (
          <Box key={cat.title} sx={{ mb: 2.5 }}>
            {!isCollapsed && (
              <Typography
                variant="body1"
                sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "15px", px: "14px", mb: 1, display: "block" }}
              >
                {cat.title}
              </Typography>
            )}
            <Stack spacing={0.6}>
              {cat.items.map((item) => {
                const IconComp = item.icon;
                const isActive = activePath === item.path;
                const locked = isLocked(item);

                return (
                  <Tooltip
                    key={item.path}
                    title={locked ? lockTooltip : isCollapsed ? item.label : ""}
                    placement="right"
                    arrow
                  >
                    <Box
                      onClick={() => {
                        if (!locked) window.location.href = item.path;
                      }}
                      sx={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        height: 48,
                        borderRadius: "12px",
                        px: isCollapsed ? 0 : "14px",
                        justifyContent: isCollapsed ? "center" : "space-between",
                        bgcolor: locked
                          ? "rgba(255, 255, 255, 0.03)"
                          : isActive
                          ? "#2563EB"
                          : "transparent",
                        color: locked ? "rgba(255,255,255,0.3)" : "#FFFFFF",
                        cursor: locked ? "not-allowed" : "pointer",
                        boxShadow: isActive && !locked ? "0 4px 14px rgba(37, 99, 235, 0.40)" : "none",
                        transition: "all 150ms ease",
                        "&:hover": {
                          bgcolor: locked
                            ? "rgba(255, 255, 255, 0.03)"
                            : isActive
                            ? "#1D4ED8"
                            : "rgba(255, 255, 255, 0.12)",
                        },
                        ...(locked && { borderLeft: "2px solid rgba(245, 158, 11, 0.35)" }),
                      }}
                    >
                      <Stack direction="row" spacing={1.8} sx={{ alignItems: "center", minWidth: 0 }}>
                        <IconComp
                          sx={{
                            fontSize: 22,
                            color: locked
                              ? "rgba(255,255,255,0.25)"
                              : isActive
                              ? "#FFFFFF"
                              : "#CBD5E1",
                            flexShrink: 0,
                          }}
                        />
                        {!isCollapsed && (
                          <Typography
                            sx={{
                              fontSize: "17px",
                              fontWeight: isActive ? 700 : 600,
                              color: locked ? "rgba(255,255,255,0.35)" : "inherit",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {item.label}
                          </Typography>
                        )}
                      </Stack>

                      {!isCollapsed && (
                        locked ? (
                          <LockIcon sx={{ fontSize: 14, color: "rgba(245, 158, 11, 0.6)", flexShrink: 0 }} />
                        ) : item.badge ? (
                          <Chip
                            label={item.badge}
                            size="small"
                            sx={{
                              bgcolor: "rgba(59, 130, 246, 0.25)",
                              color: "#60A5FA",
                              fontWeight: 800,
                              fontSize: "12px",
                              height: 22,
                              flexShrink: 0,
                            }}
                          />
                        ) : null
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
