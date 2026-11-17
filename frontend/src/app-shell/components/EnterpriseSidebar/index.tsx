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
import { retailerApi } from "@/services/retailer-api";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";

const FINANCIAL_PATHS = new Set([
  "/retailer/wallet-topup",
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
  const branding = useCompanyBranding();
  const brandPrimary = branding.primary_colour || "#A20A3A";
  const brandSecondary = branding.secondary_colour || "#EDC11E";
  const brandLight = branding.company_code === "PAY2PAY" ? "#EFF6FF" : branding.company_code === "SMSPAY" ? "#ECFDF5" : "#FFF0F4";

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

  const toggleFavorite = (path: string, e: React.MouseEvent, label?: string, category?: string) => {
    e.stopPropagation();
    e.preventDefault();
    setFavorites((prev) => {
      const updated = prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path];
      try {
        localStorage.setItem("p2p_sidebar_favorites", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Authoritative persistence to PostgreSQL DB via Stored Procedure sp_toggle_user_favorite_menu
    // Backend resolves user identity from JWT Bearer token — no userRefId needed
    retailerApi
      .toggleFavoriteMenu({
        menu_href: path,
        menu_label: label || path,
        menu_category: category || "General",
        user_role: userRole || "RETAILER",
      })
      .then((res: any) => {
        if (res && res.favorites && Array.isArray(res.favorites) && res.favorites.length > 0) {
          const dbHrefs = res.favorites.map((f: any) => f.menu_href || f.path).filter(Boolean);
          if (dbHrefs.length > 0) {
            setFavorites(dbHrefs);
            try {
              localStorage.setItem("p2p_sidebar_favorites", JSON.stringify(dbHrefs));
            } catch {}
          }
        }
      })
      .catch((err) => {
        console.warn("DB favorite toggle notice:", err);
      });
  };

  useEffect(() => {
    // Authoritative PostgreSQL fetch via Stored Procedure sp_get_user_favorite_menus
    // Backend resolves user identity from JWT Bearer token — no userRefId needed
    retailerApi
      .getFavoriteMenus()
      .then((res: any) => {
        if (res && res.favorites && Array.isArray(res.favorites)) {
          const dbHrefs = res.favorites.map((f: any) => f.menu_href || f.path).filter(Boolean);
          setFavorites(dbHrefs); // Set even if empty — clears stale state
          try {
            localStorage.setItem("p2p_sidebar_favorites", JSON.stringify(dbHrefs));
          } catch {}
        }
      })
      .catch(() => {});
  }, [userRole]);

  // PORTAL SPECIFIC NAVIGATION CONFIGURATIONS
  const retailerNavigation = [
    {
      title: "Retailer Console",
      items: [
        { label: "Dashboard", path: "/retailer/dashboard", icon: DashboardIcon },
        { label: "PayIn & Wallet Top-Up", path: "/retailer/wallet-topup", icon: CreditCardIcon, financial: true, badge: "Instant" },
        { label: "Money Transfer (DMT)", path: "/retailer/dmt", icon: SendIcon, financial: true },
        { label: "POS Settlement", path: "/retailer/settlements", icon: ReceiptIcon, financial: true },
        { label: "Wallet Overview", path: "/retailer/wallet", icon: AccountBalanceIcon, financial: true },
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
        bgcolor: "#FFFFFF",
        borderRight: "1px solid #E8E2E5",
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
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: brandPrimary, fontSize: "16px" }}>
            Workspace Menu
          </Typography>
        )}
        <IconButton onClick={onToggle} size="medium" sx={{ color: "#292329", bgcolor: "#FAF8F9", "&:hover": { bgcolor: brandLight, color: brandPrimary } }}>
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
            background: "#FFF8DC",
            border: "1px solid #FFF3C4",
            display: "flex",
            alignItems: "flex-start",
            gap: 1,
          }}
        >
          <VerifiedUserIcon sx={{ fontSize: 16, color: "#EDC11E", mt: 0.2, flexShrink: 0 }} />
          <Box>
            <Typography sx={{ fontSize: "11px", fontWeight: 800, color: "#D4A915", lineHeight: 1.3 }}>
              Verification Pending
            </Typography>
            <Typography sx={{ fontSize: "10px", color: "#625B60", mt: 0.3, lineHeight: 1.4 }}>
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
                    <SearchIcon sx={{ color: "#A20A3A", fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery("")} sx={{ p: 0.5, color: "#8A8288" }}>
                      <ClearIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
                sx: {
                  height: 44,
                  fontSize: "16px",
                  color: "#292329",
                  borderRadius: "10px",
                  bgcolor: "#FFFFFF",
                  "& fieldset": { borderColor: "#E8E2E5" },
                  "&:hover fieldset": { borderColor: "#A20A3A" },
                  "&.Mui-focused fieldset": { borderColor: "#A20A3A" },
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
                <StarIcon sx={{ color: "#EDC11E", fontSize: 16 }} />
                <Typography variant="body1" sx={{ color: "#EDC11E", fontWeight: 800, fontSize: "15px" }}>
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
                          ? "#FAF8F9"
                          : isActive
                          ? brandLight
                          : "transparent",
                        color: locked ? "#B8B0B6" : isActive ? brandPrimary : "#292329",
                        cursor: locked ? "not-allowed" : "pointer",
                        borderLeft: isActive ? `3px solid ${brandPrimary}` : "3px solid transparent",
                        transition: "all 150ms ease",
                        "&:hover": {
                          bgcolor: locked
                            ? "#FAF8F9"
                            : brandLight,
                          color: locked ? "#B8B0B6" : brandPrimary,
                        },
                        ...(locked && { borderLeft: `3px solid ${brandSecondary}` }),
                      }}
                    >
                      <Stack direction="row" spacing={1.8} sx={{ alignItems: "center" }}>
                        <IconComp
                          sx={{
                            fontSize: 22,
                            color: locked
                              ? "#B8B0B6"
                              : isActive
                              ? brandPrimary
                              : brandSecondary,
                          }}
                        />
                        {!isCollapsed && (
                          <Typography sx={{ fontSize: "15px", fontWeight: isActive ? 800 : 600 }}>
                            {item.label}
                          </Typography>
                        )}
                      </Stack>

                      {!isCollapsed && (
                        locked ? (
                          <LockIcon sx={{ fontSize: 14, color: "#EDC11E", flexShrink: 0 }} />
                        ) : (
                          <IconButton
                            size="small"
                            onClick={(e) => toggleFavorite(item.path, e, item.label, "Favorites")}
                            sx={{ p: 0.5, color: isFav ? "#EDC11E" : "#B8B0B6" }}
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
                sx={{ color: brandPrimary, fontWeight: 800, fontSize: "13px", px: "14px", mb: 1, display: "block", textTransform: "uppercase", letterSpacing: "0.5px" }}
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
                          ? "#FAF8F9"
                          : isActive
                          ? brandLight
                          : "transparent",
                        color: locked ? "#B8B0B6" : isActive ? brandPrimary : "#292329",
                        cursor: locked ? "not-allowed" : "pointer",
                        borderLeft: isActive ? `3px solid ${brandPrimary}` : "3px solid transparent",
                        transition: "all 150ms ease",
                        "&:hover": {
                          bgcolor: locked
                            ? "#FAF8F9"
                            : brandLight,
                          color: locked ? "#B8B0B6" : brandPrimary,
                        },
                        ...(locked && { borderLeft: `3px solid ${brandSecondary}` }),
                      }}
                    >
                      <Stack direction="row" spacing={1.8} sx={{ alignItems: "center", minWidth: 0 }}>
                        <IconComp
                          sx={{
                            fontSize: 22,
                            color: locked
                              ? "#B8B0B6"
                              : isActive
                              ? brandPrimary
                              : "#625B60",
                            flexShrink: 0,
                          }}
                        />
                        {!isCollapsed && (
                          <Typography
                            sx={{
                              fontSize: "15px",
                              fontWeight: isActive ? 800 : 500,
                              color: locked ? "#B8B0B6" : isActive ? "#A20A3A" : "#292329",
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
                          <LockIcon sx={{ fontSize: 14, color: "#EDC11E", flexShrink: 0 }} />
                        ) : (
                          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                            {item.badge && (
                              <Chip
                                label={item.badge}
                                size="small"
                                sx={{
                                  bgcolor: "#FFF0F4",
                                  color: "#A20A3A",
                                  fontWeight: 800,
                                  fontSize: "11px",
                                  height: 20,
                                  flexShrink: 0,
                                }}
                              />
                            )}
                            <IconButton
                              size="small"
                              onClick={(e) => toggleFavorite(item.path, e, item.label, cat.title)}
                              sx={{
                                p: 0.5,
                                color: favorites.includes(item.path) ? "#EDC11E" : "#B8B0B6",
                                "&:hover": { color: "#EDC11E" },
                              }}
                              title={favorites.includes(item.path) ? "Remove from Favorites" : "Add to Favorites"}
                            >
                              <StarIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Stack>
                        )
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
