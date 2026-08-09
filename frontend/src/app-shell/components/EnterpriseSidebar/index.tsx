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
      title: "Main Navigation",
      items: [{ label: "Dashboard", path: "/retailer-dashboard", icon: DashboardIcon }],
    },
    {
      title: "Payment Services",
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
      title: "Reports & Analytics",
      items: [
        { label: "Payout Report", path: "/retailer/dmt/reports", icon: AssessmentIcon },
        { label: "Enterprise Report Center", path: "/retailer/reports", icon: AssessmentIcon },
        { label: "POS Settlement Report", path: "/retailer/pos/settlement-report", icon: AccountBalanceIcon },
        { label: "Passbook Ledger Statement", path: "/retailer/dmt/ledger", icon: ReceiptLongIcon },
      ],
    },
  ];

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

                return (
                  <Tooltip key={`fav-${item.path}`} title={isCollapsed ? item.label : ""} placement="right" arrow>
                    <Box
                      sx={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        height: 48,
                        borderRadius: "12px",
                        px: isCollapsed ? 0 : "14px",
                        justifyContent: isCollapsed ? "center" : "space-between",
                        bgcolor: isActive ? "#2563EB" : "rgba(255, 213, 79, 0.10)",
                        color: "#FFFFFF",
                        cursor: "pointer",
                        boxShadow: isActive ? "0 4px 14px rgba(37, 99, 235, 0.40)" : "none",
                        transition: "all 150ms ease",
                        "&:hover": { bgcolor: isActive ? "#1D4ED8" : "rgba(255, 255, 255, 0.14)" },
                      }}
                    >
                      <Stack direction="row" spacing={1.8} sx={{ alignItems: "center" }}>
                        <IconComp sx={{ fontSize: 22, color: isActive ? "#FFFFFF" : "#FFD54F" }} />
                        {!isCollapsed && (
                          <Typography sx={{ fontSize: "17px", fontWeight: isActive ? 700 : 600 }}>
                            {item.label}
                          </Typography>
                        )}
                      </Stack>

                      {!isCollapsed && (
                        <IconButton
                          size="small"
                          onClick={(e) => toggleFavorite(item.path, e)}
                          sx={{ p: 0.5, color: isFav ? "#FFD54F" : "rgba(255,255,255,0.5)" }}
                        >
                          <StarIcon sx={{ fontSize: 18 }} />
                        </IconButton>
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
              <Typography variant="body1" sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "15px", px: "14px", mb: 1, display: "block" }}>
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
                        height: 48,
                        borderRadius: "12px",
                        px: isCollapsed ? 0 : "14px",
                        justifyContent: isCollapsed ? "center" : "space-between",
                        bgcolor: isActive ? "#2563EB" : "transparent",
                        color: "#FFFFFF",
                        cursor: "pointer",
                        boxShadow: isActive ? "0 4px 14px rgba(37, 99, 235, 0.40)" : "none",
                        transition: "all 150ms ease",
                        "&:hover": { bgcolor: isActive ? "#1D4ED8" : "rgba(255, 255, 255, 0.12)" },
                      }}
                    >
                      <Stack direction="row" spacing={1.8} sx={{ alignItems: "center" }}>
                        <IconComp sx={{ fontSize: 22, color: isActive ? "#FFFFFF" : "#CBD5E1" }} />
                        {!isCollapsed && (
                          <Typography sx={{ fontSize: "17px", fontWeight: isActive ? 700 : 600 }}>
                            {item.label}
                          </Typography>
                        )}
                      </Stack>

                      {!isCollapsed && item.badge && (
                        <Chip label={item.badge} size="small" sx={{ bgcolor: "rgba(59, 130, 246, 0.25)", color: "#60A5FA", fontWeight: 800, fontSize: "12px", height: 22 }} />
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
