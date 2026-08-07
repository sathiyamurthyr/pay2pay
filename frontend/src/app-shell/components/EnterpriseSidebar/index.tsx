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
import StarBorderIcon from "@mui/icons-material/StarBorder";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load saved favorites on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("p2p_sidebar_favorites");
      if (saved) {
        setFavorites(JSON.parse(saved));
      } else {
        setFavorites(["/retailer-dashboard", "/retailer/dmt", "/retailer/wallet"]);
      }
    } catch {
      setFavorites(["/retailer-dashboard", "/retailer/dmt", "/retailer/wallet"]);
    }
  }, []);

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

  // Flattened item list for easy lookup in favorites
  const allItems = categories.flatMap((cat) => cat.items);
  const favoriteItems = allItems.filter((item) => favorites.includes(item.path));

  // Filter categories & items by search query
  const filteredCategories = categories
    .map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) =>
          item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cat.title.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((cat) => cat.items.length > 0);

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
      {/* Sidebar Top Header & Collapse Toggle */}
      <Box sx={{ p: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {!isCollapsed && (
          <Typography variant="caption" sx={{ fontWeight: 800, color: "#60A5FA", letterSpacing: "1px", textTransform: "uppercase", fontSize: "11px" }}>
            NAVIGATION
          </Typography>
        )}
        <IconButton onClick={onToggle} size="small" sx={{ color: tokens.colors.neutral.dark.textSecondary }}>
          {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </Box>

      {/* ── SEARCH MENU INPUT BAR ── */}
      {!isCollapsed && (
        <Box sx={{ px: 1.5, pb: 1 }}>
          <TextField
            fullWidth
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search menu items..."
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#60A5FA", fontSize: 16 }} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery("")} sx={{ p: 0.2, color: "rgba(255, 255, 255, 0.5)" }}>
                      <ClearIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
                sx: {
                  height: 34,
                  fontSize: "12px",
                  color: "#FFFFFF",
                  borderRadius: "8px",
                  bgcolor: "rgba(255, 255, 255, 0.05)",
                  "& fieldset": { borderColor: "rgba(255, 255, 255, 0.12)" },
                  "&:hover fieldset": { borderColor: "#3B82F6" },
                  "&.Mui-focused fieldset": { borderColor: "#2563EB" },
                },
              },
            }}
          />
        </Box>
      )}

      {/* Clean Navigation Groups (No Scrollbars, Compact Fonts) */}
      <Box
        sx={{
          flex: 1,
          px: isCollapsed ? 1 : 1.5,
          py: 1,
          overflowY: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {/* ── 1. FAVORITES CATEGORY (If any favorited & no active search query) ── */}
        {!searchQuery && favoriteItems.length > 0 && (
          <Box sx={{ mb: 1.5 }}>
            {!isCollapsed && (
              <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", px: "14px", mb: 0.5 }}>
                <StarIcon sx={{ color: "#FFD54F", fontSize: 13 }} />
                <Typography
                  variant="caption"
                  sx={{
                    color: "#FFD54F",
                    fontWeight: 800,
                    fontSize: "11px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  FAVORITES
                </Typography>
              </Stack>
            )}
            <Stack spacing={0.4}>
              {favoriteItems.map((item) => {
                const IconComp = item.icon;
                const isActive = activePath === item.path;
                const isFav = favorites.includes(item.path);

                return (
                  <Tooltip key={`fav-${item.path}`} title={isCollapsed ? item.label : ""} placement="right" arrow>
                    <Box
                      sx={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        height: 44,
                        borderRadius: "10px",
                        px: isCollapsed ? 0 : "14px",
                        justifyContent: isCollapsed ? "center" : "space-between",
                        bgcolor: isActive ? "#2563EB" : "rgba(255, 213, 79, 0.08)",
                        color: isActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.90)",
                        cursor: "pointer",
                        boxShadow: isActive ? "0 4px 12px rgba(37, 99, 235, 0.35)" : "none",
                        transition: "all 150ms ease",
                        "&:hover": { bgcolor: isActive ? "#1D4ED8" : "rgba(255, 255, 255, 0.12)", color: "#FFFFFF" },
                        "&:hover .fav-star": { opacity: 1 },
                      }}
                    >
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                        <IconComp sx={{ fontSize: 20, color: isActive ? "#FFFFFF" : "#FFD54F" }} />
                        {!isCollapsed && (
                          <Typography sx={{ fontSize: "13.5px", fontWeight: isActive ? 700 : 600, lineHeight: "20px" }}>
                            {item.label}
                          </Typography>
                        )}
                      </Stack>

                      {!isCollapsed && (
                        <IconButton
                          size="small"
                          className="fav-star"
                          onClick={(e) => toggleFavorite(item.path, e)}
                          sx={{ p: 0.3, color: isFav ? "#FFD54F" : "rgba(255,255,255,0.4)" }}
                        >
                          <StarIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      )}
                    </Box>
                  </Tooltip>
                );
              })}
            </Stack>
          </Box>
        )}

        {/* ── 2. CATEGORIZED MENU ITEMS ── */}
        {filteredCategories.map((cat) => (
          <Box key={cat.title} sx={{ mb: 1.5 }}>
            {!isCollapsed && (
              <Typography
                variant="caption"
                sx={{
                  color: "#60A5FA",
                  fontWeight: 800,
                  fontSize: "11px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  px: "14px",
                  mb: 0.5,
                  display: "block",
                }}
              >
                {cat.title}
              </Typography>
            )}
            <Stack spacing={0.4}>
              {cat.items.map((item) => {
                const IconComp = item.icon;
                const isActive = activePath === item.path;
                const isFav = favorites.includes(item.path);

                return (
                  <Tooltip key={item.path} title={isCollapsed ? item.label : ""} placement="right" arrow>
                    <Box
                      sx={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        height: 44,
                        borderRadius: "10px",
                        px: isCollapsed ? 0 : "14px",
                        justifyContent: isCollapsed ? "center" : "space-between",
                        bgcolor: isActive ? "#2563EB" : "transparent",
                        color: isActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.88)",
                        cursor: "pointer",
                        boxShadow: isActive ? "0 4px 12px rgba(37, 99, 235, 0.35)" : "none",
                        transition: "all 150ms ease",
                        "&:hover": { bgcolor: isActive ? "#1D4ED8" : "rgba(255, 255, 255, 0.08)", color: "#FFFFFF" },
                        "&:hover .fav-star": { opacity: 1 },
                      }}
                    >
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                        <IconComp sx={{ fontSize: 20, color: isActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.88)" }} />
                        {!isCollapsed && (
                          <Typography sx={{ fontSize: "13.5px", fontWeight: isActive ? 700 : 500, lineHeight: "20px" }}>
                            {item.label}
                          </Typography>
                        )}
                      </Stack>

                      {!isCollapsed && (
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                          {item.badge && (
                            <Chip
                              label={item.badge}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: "9px",
                                fontWeight: 800,
                                bgcolor: isActive ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.12)",
                                color: "#FFFFFF",
                              }}
                            />
                          )}

                          <IconButton
                            size="small"
                            className="fav-star"
                            onClick={(e) => toggleFavorite(item.path, e)}
                            sx={{
                              p: 0.3,
                              color: isFav ? "#FFD54F" : "rgba(255, 255, 255, 0.4)",
                              opacity: isFav ? 1 : 0.4,
                              "&:hover": { opacity: 1, color: "#FFD54F" },
                            }}
                          >
                            {isFav ? <StarIcon sx={{ fontSize: 16 }} /> : <StarBorderIcon sx={{ fontSize: 16 }} />}
                          </IconButton>
                        </Stack>
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
