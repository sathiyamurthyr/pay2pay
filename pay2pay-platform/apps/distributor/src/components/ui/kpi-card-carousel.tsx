"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Box, Paper, Typography, Button, IconButton, Menu, MenuItem, Tooltip
} from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import RefreshIcon from "@mui/icons-material/Refresh";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PaletteIcon from "@mui/icons-material/Palette";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useRetailerStore, KpiTheme } from "@/stores/use-retailer-store";

export const KpiCardCarousel: React.FC = () => {
  const { wallet, syncBalance, isSyncing, kpiTheme, setKpiTheme } = useRetailerStore();
  const [themeAnchor, setThemeAnchor] = useState<null | HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Restore saved theme on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("kpi_card_theme") as KpiTheme | null;
      if (savedTheme && savedTheme !== kpiTheme) {
        setKpiTheme(savedTheme);
      }
    }
  }, [kpiTheme, setKpiTheme]);

  // Track active slide index on scroll in mobile mode
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    if (clientWidth > 0) {
      const index = Math.round(scrollLeft / (clientWidth * 0.85));
      setActiveIndex(Math.min(Math.max(index, 0), 3));
    }
  };

  const scrollToIndex = (idx: number) => {
    if (!scrollRef.current) return;
    const cardWidth = scrollRef.current.clientWidth * 0.86;
    scrollRef.current.scrollTo({ left: idx * cardWidth, behavior: "smooth" });
    setActiveIndex(idx);
  };

  const themePresets: { id: KpiTheme; label: string; swatch: string }[] = [
    { id: "classic-blue", label: "Classic Blue", swatch: "#2563EB" },
    { id: "royal-gold", label: "Royal Gold", swatch: "#FFD54F" },
    { id: "emerald-green", label: "Emerald Green", swatch: "#16A34A" },
    { id: "purple", label: "Purple Velvet", swatch: "#7C3AED" },
    { id: "dark", label: "Dark Onyx", swatch: "#0F172A" },
    { id: "corporate-white", label: "Corporate White", swatch: "#FFFFFF" },
  ];

  // Theme styling configurations
  const getCardStyle = (cardType: "wallet" | "txns" | "margin" | "settlement") => {
    switch (kpiTheme) {
      case "royal-gold":
        if (cardType === "wallet") {
          return { bg: "#B45309", color: "#FFFFFF", iconBg: "rgba(255,255,255,0.2)", iconColor: "#FFD54F" };
        }
        return { bg: "#FEF9C3", color: "#854D0E", iconBg: "#FDE047", iconColor: "#78350F", border: "1px solid #FDE047" };

      case "emerald-green":
        if (cardType === "wallet") {
          return { bg: "#064E3B", color: "#FFFFFF", iconBg: "rgba(255,255,255,0.2)", iconColor: "#A7F3D0" };
        }
        return { bg: "#ECFDF5", color: "#065F46", iconBg: "#A7F3D0", iconColor: "#047857", border: "1px solid #6EE7B7" };

      case "purple":
        if (cardType === "wallet") {
          return { bg: "#4C1D95", color: "#FFFFFF", iconBg: "rgba(255,255,255,0.2)", iconColor: "#DDD6FE" };
        }
        return { bg: "#F3E8FF", color: "#581C87", iconBg: "#DDD6FE", iconColor: "#7C3AED", border: "1px solid #C4B5FD" };

      case "dark":
        if (cardType === "wallet") {
          return { bg: "#0F172A", color: "#FFFFFF", iconBg: "rgba(255,255,255,0.15)", iconColor: "#FFD54F" };
        }
        return { bg: "#1E293B", color: "#F8FAFC", iconBg: "#334155", iconColor: "#38BDF8", border: "1px solid #334155" };

      case "corporate-white":
        return { bg: "#FFFFFF", color: "#111827", iconBg: "#F1F5F9", iconColor: "#2563EB", border: "1px solid #E5E7EB" };

      case "classic-blue":
      default:
        if (cardType === "wallet") {
          return { bg: "#1E3A8A", color: "#FFFFFF", iconBg: "rgba(255, 213, 79, 0.20)", iconColor: "#FFD54F" };
        }
        return { bg: "#FFFFFF", color: "#111827", iconBg: cardType === "txns" ? "#EFF6FF" : cardType === "margin" ? "#DCFCE7" : "#F3E8FF", iconColor: cardType === "txns" ? "#2563EB" : cardType === "margin" ? "#16A34A" : "#7C3AED", border: "1px solid #E5E7EB" };
    }
  };

  const renderCard1Wallet = () => {
    return (
      <Paper
        elevation={0}
        sx={{
          p: "20px",
          borderRadius: "20px",
          backgroundColor: "#1E3A8A",
          color: "#FFFFFF",
          boxShadow: "0 4px 20px rgba(30, 58, 138, 0.15)",
          border: "none",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: 170,
          minHeight: 170,
        }}
      >
        <Box sx={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.05)" }} />

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
          <Box>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.75)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "14px" }}>
              Main Wallet Balance
            </Typography>
            <Typography variant="h4" sx={{ color: "#FFFFFF", fontWeight: 800, fontFamily: "monospace", mt: 0.5, fontSize: "32px", lineHeight: 1.1 }}>
              ₹{wallet.mainBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </Typography>
          </Box>
          <Box sx={{ p: 1.25, borderRadius: 2.5, backgroundColor: "rgba(255, 213, 79, 0.20)", border: "1px solid rgba(255, 213, 79, 0.40)" }}>
            <AccountBalanceWalletIcon sx={{ color: "#FFD54F", fontSize: 24 }} />
          </Box>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.75)", fontWeight: 600, fontSize: "12px" }}>
            Commission: ₹{wallet.commissionBalance?.toLocaleString("en-IN", { minimumFractionDigits: 2 }) ?? "0.00"}
          </Typography>
          <IconButton size="small" onClick={syncBalance} disabled={isSyncing} sx={{ color: "#FFFFFF", p: 0.25 }}>
            <RefreshIcon sx={{ fontSize: 16, animation: isSyncing ? "spin 1s linear infinite" : "none" }} />
          </IconButton>
        </Box>

        {/* Add Money Button: Transparent with Gold Border */}
        <Box sx={{ pt: 0.5 }}>
          <Button
            component={Link}
            href="/retailer/wallet"
            fullWidth
            size="small"
            sx={{
              borderRadius: "10px",
              height: 32,
              fontWeight: 700,
              color: "#FFFFFF",
              border: "1.5px solid #FFD54F",
              backgroundColor: "transparent",
              "&:hover": { backgroundColor: "rgba(255, 213, 79, 0.20)", borderColor: "#FFE082" },
              textTransform: "none",
              fontSize: "12px",
            }}
          >
            + Quick Top Up Wallet
          </Button>
        </Box>
      </Paper>
    );
  };

  const renderCard2Txns = () => {
    const style = getCardStyle("txns");
    return (
      <Paper
        elevation={0}
        sx={{
          p: "20px",
          borderRadius: "20px",
          backgroundColor: style.bg,
          color: style.color,
          border: style.border || "1px solid #E5E7EB",
          boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: 170,
          minHeight: 170,
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "14px" }}>
            Today's Volume
          </Typography>
          <Box sx={{ p: 1.25, borderRadius: 2.5, backgroundColor: style.iconBg }}>
            <ReceiptLongIcon sx={{ color: style.iconColor, fontSize: 24 }} />
          </Box>
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: "monospace", fontSize: "32px", lineHeight: 1.1 }}>
          {wallet.todayTxnCount} Txns
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, backgroundColor: "#DCFCE7", px: 1.25, py: 0.25, borderRadius: 1.5 }}>
            <ArrowUpwardIcon sx={{ fontSize: 12, color: "#16A34A" }} />
            <Typography variant="caption" sx={{ color: "#16A34A", fontWeight: 800, fontSize: "11px" }}>+18.4%</Typography>
          </Box>
          <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 500, fontSize: "12px" }}>vs yesterday</Typography>
        </Box>
      </Paper>
    );
  };

  const renderCard3Margin = () => {
    const style = getCardStyle("margin");
    return (
      <Paper
        elevation={0}
        sx={{
          p: "20px",
          borderRadius: "20px",
          backgroundColor: style.bg,
          color: style.color,
          border: style.border || "1px solid #E5E7EB",
          boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: 170,
          minHeight: 170,
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "14px" }}>
            Today's Commission
          </Typography>
          <Box sx={{ p: 1.25, borderRadius: 2.5, backgroundColor: style.iconBg }}>
            <TrendingUpIcon sx={{ color: style.iconColor, fontSize: 24 }} />
          </Box>
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 800, color: "#16A34A", fontFamily: "monospace", fontSize: "32px", lineHeight: 1.1 }}>
          +₹{wallet.todayMargin.toFixed(2)}
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 600, fontSize: "12px" }}>
          Credited directly to wallet
        </Typography>
      </Paper>
    );
  };

  const renderCard4Settlement = () => {
    const style = getCardStyle("settlement");
    return (
      <Paper
        elevation={0}
        sx={{
          p: "20px",
          borderRadius: "20px",
          backgroundColor: style.bg,
          color: style.color,
          border: style.border || "1px solid #E5E7EB",
          boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: 170,
          minHeight: 170,
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "14px" }}>
            Today's Settlement
          </Typography>
          <Box sx={{ p: 1.25, borderRadius: 2.5, backgroundColor: style.iconBg }}>
            <AccountBalanceIcon sx={{ color: style.iconColor, fontSize: 24 }} />
          </Box>
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: "monospace", fontSize: "32px", lineHeight: 1.1 }}>
          ₹{wallet.todaySettlement.toLocaleString("en-IN")}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, backgroundColor: "#DCFCE7", px: 1.25, py: 0.25, borderRadius: 1.5 }}>
            <CheckCircleIcon sx={{ fontSize: 12, color: "#16A34A" }} />
            <Typography variant="caption" sx={{ color: "#16A34A", fontWeight: 800, fontSize: "11px" }}>Auto-Settled</Typography>
          </Box>
          <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 500, fontSize: "12px" }}>via IMPS</Typography>
        </Box>
      </Paper>
    );
  };

  const cardsList = [renderCard1Wallet(), renderCard2Txns(), renderCard3Margin(), renderCard4Settlement()];

  return (
    <Box sx={{ width: "100%" }}>

      {/* KPI Section Subheader & Theme Picker Control */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
        <Typography variant="caption" sx={{ fontSize: "12px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Live Performance Metrics
        </Typography>

        {/* Theme Picker Selector Menu */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Tooltip title="Customize KPI Card Theme">
            <Button
              size="small"
              startIcon={<PaletteIcon sx={{ color: "#2563EB", fontSize: 16 }} />}
              onClick={(e) => setThemeAnchor(e.currentTarget)}
              sx={{
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: 700,
                color: "#374151",
                backgroundColor: "#FFFFFF",
                border: "1px solid #E5E7EB",
                px: 1.5,
                height: 30,
                textTransform: "none",
                boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
              }}
            >
              KPI Theme
            </Button>
          </Tooltip>

          <Menu
            anchorEl={themeAnchor}
            open={Boolean(themeAnchor)}
            onClose={() => setThemeAnchor(null)}
            slotProps={{ paper: { sx: { borderRadius: 3, width: 190, p: 0.5, mt: 0.75 } } }}
          >
            <Box sx={{ px: 1.5, py: 0.75, borderBottom: "1px solid #E5E7EB" }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "#6B7280", fontSize: "11px" }}>SELECT CARD THEME</Typography>
            </Box>
            {themePresets.map((t) => (
              <MenuItem
                key={t.id}
                selected={kpiTheme === t.id}
                onClick={() => {
                  setKpiTheme(t.id);
                  setThemeAnchor(null);
                }}
                sx={{ borderRadius: 2, my: 0.25, py: 0.75 }}
              >
                <Box sx={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: t.swatch, border: t.id === "corporate-white" ? "1px solid #9CA3AF" : "none", mr: 1.25 }} />
                <Typography variant="body2" sx={{ fontWeight: kpiTheme === t.id ? 800 : 500, fontSize: "12px" }}>
                  {t.label}
                </Typography>
              </MenuItem>
            ))}
          </Menu>
        </Box>
      </Box>

      {/* ── DESKTOP & TABLET GRID LAYOUT (16px gap) ───────────────── */}
      <Box
        sx={{
          display: { xs: "none", sm: "grid" },
          gridTemplateColumns: { sm: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" },
          gap: "16px",
        }}
      >
        {cardsList.map((card, i) => (
          <Box key={i} sx={{ height: 170 }}>{card}</Box>
        ))}
      </Box>

      {/* ── MOBILE SWIPEABLE CAROUSEL LAYOUT (< 600px) ─────────────── */}
      <Box sx={{ display: { xs: "block", sm: "none" }, position: "relative" }}>
        
        {/* Horizontal Carousel Track with Peek & Scroll Snap */}
        <Box
          ref={scrollRef}
          onScroll={handleScroll}
          sx={{
            display: "flex",
            gap: "14px",
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            scrollBehavior: "smooth",
            pb: 1,
            pt: 0.5,
            px: 0.5,
            WebkitOverflowScrolling: "touch",
            "&::-webkit-scrollbar": { display: "none" },
            msOverflowStyle: "none",
            scrollbarWidth: "none",
          }}
        >
          {cardsList.map((card, i) => (
            <Box
              key={i}
              sx={{
                width: "86%",
                minWidth: "86%",
                scrollSnapAlign: "center",
                flexShrink: 0,
                height: 170,
              }}
            >
              {card}
            </Box>
          ))}
        </Box>

        {/* Carousel Navigation Arrow Controls & Animated Dots */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1, px: 0.5 }}>
          <IconButton
            size="small"
            disabled={activeIndex === 0}
            onClick={() => scrollToIndex(activeIndex - 1)}
            sx={{ color: "#2563EB", p: 0.25 }}
          >
            <ChevronLeftIcon />
          </IconButton>

          {/* Animated Page Indicator Dots */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            {[0, 1, 2, 3].map((dotIndex) => (
              <Box
                key={dotIndex}
                onClick={() => scrollToIndex(dotIndex)}
                sx={{
                  height: 6,
                  width: activeIndex === dotIndex ? 20 : 6,
                  borderRadius: 3,
                  backgroundColor: activeIndex === dotIndex ? "#2563EB" : "#D1D5DB",
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              />
            ))}
          </Box>

          <IconButton
            size="small"
            disabled={activeIndex === 3}
            onClick={() => scrollToIndex(activeIndex + 1)}
            sx={{ color: "#2563EB", p: 0.25 }}
          >
            <ChevronRightIcon />
          </IconButton>
        </Box>

      </Box>

    </Box>
  );
};

export default KpiCardCarousel;
