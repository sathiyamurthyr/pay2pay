"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  IconButton,
  Chip,
  Slider,
  Tooltip,
  CircularProgress,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Badge,
} from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WifiIcon from "@mui/icons-material/Wifi";
import BatteryChargingFullIcon from "@mui/icons-material/BatteryChargingFull";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import SecurityIcon from "@mui/icons-material/Security";
import SparklesIcon from "@mui/icons-material/AutoAwesome";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DoneIcon from "@mui/icons-material/Done";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import InfoIcon from "@mui/icons-material/Info";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import PaidIcon from "@mui/icons-material/Paid";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import DnsIcon from "@mui/icons-material/Dns";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";

import { useRetailerStore } from "@/stores/use-retailer-store";
import { soundSystem } from "@/lib/audio-engine";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  amount?: number | null;
  reference?: string | null;
  status: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { soundboxEnabled, toggleSoundbox } = useRetailerStore();

  // Tab State: 0 = Notifications Feed, 1 = Soundbox Settings
  const [activeTab, setActiveTab] = useState<number>(0);

  // Live Notifications State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorNotifs, setErrorNotifs] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Soundbox State
  const [selectedLang, setSelectedLang] = useState<"hi" | "en" | "ta" | "te">("hi");
  const [volume, setVolume] = useState<number>(85);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [isPlayingTest, setIsPlayingTest] = useState<string | null>(null);

  // Notification Event Triggers
  const [alertDmt, setAlertDmt] = useState<boolean>(true);
  const [alertUpi, setAlertUpi] = useState<boolean>(true);
  const [alertWallet, setAlertWallet] = useState<boolean>(true);
  const [alertLowBal, setAlertLowBal] = useState<boolean>(false);

  const getResolvedUserId = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        const uStr =
          localStorage.getItem("user_info") ||
          localStorage.getItem("user") ||
          localStorage.getItem("pay2pay_user_data");
        if (uStr) {
          const u = JSON.parse(uStr);
          if (u.id || u.public_id || u.retailer_id) return u.id || u.public_id || u.retailer_id;
        }
      } catch {}
      return (
        localStorage.getItem("p2p_active_retailer_id") ||
        localStorage.getItem("p2p_retailer_code") ||
        localStorage.getItem("p2p_user_id") ||
        "e238fb8b-beb3-4cd4-862b-319b5d05d24e"
      );
    }
    return "e238fb8b-beb3-4cd4-862b-319b5d05d24e";
  }, []);

  const getAuthHeaders = useCallback(() => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (typeof window !== "undefined") {
      const token =
        localStorage.getItem("p2p_access_token") ||
        localStorage.getItem("pay2pay_access_token") ||
        localStorage.getItem("pay2pay_auth_token") ||
        localStorage.getItem("access_token") ||
        "";
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return headers;
  }, []);

  const fetchLiveNotifications = useCallback(
    async (isManual = false) => {
      if (isManual) setIsRefreshing(true);
      else setLoadingNotifs(true);
      setErrorNotifs(null);

      try {
        const userId = getResolvedUserId();
        const queryParams = new URLSearchParams();
        if (userId) queryParams.append("user_id", userId);
        queryParams.append("limit", "50");

        const res = await fetch(`/api/v1/notifications/recent?${queryParams.toString()}`, {
          method: "GET",
          headers: getAuthHeaders(),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();
        const items: NotificationItem[] = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json)
          ? json
          : Array.isArray(json?.items)
          ? json.items
          : Array.isArray(json?.notifications)
          ? json.notifications
          : [];
        setNotifications(items);

        const unread = json.unread_count ?? items.filter((i) => !i.is_read).length;
        setUnreadCount(unread);
      } catch (err: any) {
        console.warn("[NotificationsPage] Failed to fetch notifications:", err);
        setErrorNotifs("Unable to fetch notifications. Please try again.");
      } finally {
        setLoadingNotifs(false);
        setIsRefreshing(false);
      }
    },
    [getResolvedUserId, getAuthHeaders]
  );

  useEffect(() => {
    fetchLiveNotifications();
    const interval = setInterval(() => {
      fetchLiveNotifications(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchLiveNotifications]);

  const handleMarkAllRead = async () => {
    try {
      const userId = getResolvedUserId();
      const queryParams = new URLSearchParams();
      if (userId) queryParams.append("user_id", userId);
      await fetch(`/api/v1/notifications/mark-all-read?${queryParams.toString()}`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  const handleMarkSingleRead = async (id: string) => {
    try {
      await fetch(`/api/v1/notifications/${id}/read`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark read:", err);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(text);
    setTimeout(() => setCopiedRef(null), 2500);
  };

  const handleClose = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/retailer/dashboard");
    }
  };

  const playTestVoice = (lang: "hi" | "en" | "ta" | "te", amount: number = 500) => {
    setIsPlayingTest(lang);
    soundSystem.playSuccessSound(volume);

    let phrase = "";
    switch (lang) {
      case "hi":
        phrase = `Pay2Pay par ${amount} rupaye praapt hue. Transaction safal raha.`;
        break;
      case "ta":
        phrase = `Pay2Pay-il ${amount} roobai pera-pattathu. Vetrikaramaaga mudinthathu.`;
        break;
      case "te":
        phrase = `Pay2Pay lo ${amount} roopayalu andindhi. Transaction vijayavanthamaindhi.`;
        break;
      case "en":
      default:
        phrase = `Received ${amount} Rupees on Pay2Pay. Transaction Successful.`;
        break;
    }

    soundSystem.speakVoice(phrase, lang, speechRate);

    setTimeout(() => {
      setIsPlayingTest(null);
    }, 2800);
  };

  const formatTimestamp = (isoStr: string) => {
    try {
      const dt = new Date(isoStr);
      return dt.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) + ", " + dt.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return isoStr;
    }
  };

  const getRelativeTime = (isoStr: string) => {
    try {
      const diffMs = Date.now() - new Date(isoStr).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return "";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type?.toUpperCase()) {
      case "TRANSACTION":
        return <PaidIcon sx={{ color: "#4ADE80", fontSize: 20 }} />;
      case "CREDIT":
        return <AccountBalanceWalletIcon sx={{ color: "#FBBF24", fontSize: 20 }} />;
      case "APPROVAL":
        return <VerifiedUserIcon sx={{ color: "#38BDF8", fontSize: 20 }} />;
      case "SYSTEM":
      default:
        return <DnsIcon sx={{ color: "#A78BFA", fontSize: 20 }} />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "SUCCESS":
        return {
          label: "SUCCESS",
          bg: "rgba(34, 197, 94, 0.15)",
          color: "#4ADE80",
          border: "1px solid rgba(34, 197, 94, 0.3)",
        };
      case "FAILED":
      case "REVERSED":
        return {
          label: status.toUpperCase(),
          bg: "rgba(239, 68, 68, 0.15)",
          color: "#F87171",
          border: "1px solid rgba(239, 68, 68, 0.3)",
        };
      case "PENDING":
        return {
          label: "PENDING",
          bg: "rgba(234, 179, 8, 0.15)",
          color: "#FACC15",
          border: "1px solid rgba(234, 179, 8, 0.3)",
        };
      default:
        return {
          label: status || "INFO",
          bg: "rgba(56, 189, 248, 0.15)",
          color: "#38BDF8",
          border: "1px solid rgba(56, 189, 248, 0.3)",
        };
    }
  };

  // Filtered Notifications
  const filteredNotifications = (Array.isArray(notifications) ? notifications : []).filter((item) => {
    if (!item) return false;
    if (selectedFilter === "UNREAD" && item.is_read) return false;
    if (selectedFilter !== "ALL" && selectedFilter !== "UNREAD") {
      if (item.type?.toUpperCase() !== selectedFilter) return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = Boolean(item.title && item.title.toLowerCase().includes(q));
    const msgMatch = Boolean(item.message && item.message.toLowerCase().includes(q));
    const refMatch = Boolean(item.reference && item.reference.toLowerCase().includes(q));
    const statusMatch = Boolean(item.status && item.status.toLowerCase().includes(q));
    return titleMatch || msgMatch || refMatch || statusMatch;
  });

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1040,
        mx: "auto",
        p: { xs: 2, sm: 3, md: 4 },
        color: "#FFFFFF",
      }}
    >
      {/* ── TOP HEADER ── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
          pb: 2,
          borderBottom: "1px solid rgba(251, 191, 36, 0.2)",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
            onClick={handleClose}
            sx={{
              borderColor: "rgba(251, 191, 36, 0.35)",
              color: "#FDE047",
              bgcolor: "rgba(251, 191, 36, 0.08)",
              fontWeight: 800,
              fontSize: "12px",
              textTransform: "none",
              borderRadius: "10px",
              px: 1.5,
              py: 0.6,
              "&:hover": {
                borderColor: "#FACC15",
                bgcolor: "rgba(251, 191, 36, 0.18)",
                color: "#FEF08A",
              },
            }}
          >
            Back
          </Button>

          <Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 900,
                fontSize: { xs: "18px", sm: "22px" },
                letterSpacing: "-0.3px",
                background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #F59E0B 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Notifications & Alerts
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "12.5px" }}
            >
              Live CBS settlements, wallet transactions, and voice soundbox settings
            </Typography>
          </Box>
        </Box>

        {/* Header Right Actions */}
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          {unreadCount > 0 && activeTab === 0 && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<MarkEmailReadIcon sx={{ fontSize: 15 }} />}
              onClick={handleMarkAllRead}
              sx={{
                borderColor: "rgba(56, 189, 248, 0.4)",
                color: "#38BDF8",
                bgcolor: "rgba(56, 189, 248, 0.08)",
                fontWeight: 700,
                fontSize: "11.5px",
                textTransform: "none",
                borderRadius: "10px",
                px: 1.5,
                "&:hover": {
                  bgcolor: "rgba(56, 189, 248, 0.18)",
                  borderColor: "#7DD3FC",
                },
              }}
            >
              Mark all read
            </Button>
          )}

          <Button
            variant="contained"
            size="small"
            startIcon={
              <RefreshIcon
                sx={{
                  fontSize: 16,
                  animation: isRefreshing ? "spin 1s linear infinite" : "none",
                  "@keyframes spin": {
                    "0%": { transform: "rotate(0deg)" },
                    "100%": { transform: "rotate(360deg)" },
                  },
                }}
              />
            }
            onClick={() => fetchLiveNotifications(true)}
            disabled={isRefreshing}
            sx={{
              background: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)",
              color: "#050B14",
              fontWeight: 800,
              fontSize: "12px",
              textTransform: "none",
              borderRadius: "10px",
              px: 1.8,
              boxShadow: "0 4px 14px rgba(245, 158, 11, 0.3)",
              "&:hover": {
                background: "linear-gradient(135deg, #FDE047 0%, #D97706 100%)",
              },
            }}
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </Stack>
      </Box>

      {/* ── TABS SELECTOR ── */}
      <Box
        sx={{
          mb: 3,
          borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{
            minHeight: 44,
            "& .MuiTab-root": {
              color: "rgba(255, 255, 255, 0.6)",
              fontWeight: 800,
              fontSize: "13px",
              textTransform: "none",
              minHeight: 44,
              px: 2.5,
              "&.Mui-selected": {
                color: "#FDE047",
              },
            },
            "& .MuiTabs-indicator": {
              backgroundColor: "#FBBF24",
              height: 3,
              borderRadius: "3px 3px 0 0",
            },
          }}
        >
          <Tab
            icon={
              <Badge
                badgeContent={unreadCount}
                color="error"
                sx={{
                  mr: 1,
                  "& .MuiBadge-badge": {
                    fontSize: "10px",
                    height: 16,
                    minWidth: 16,
                    fontWeight: 900,
                  },
                }}
              >
                <NotificationsActiveIcon sx={{ fontSize: 18 }} />
              </Badge>
            }
            iconPosition="start"
            label={`Recent Alerts (${notifications.length})`}
          />
          <Tab
            icon={<GraphicEqIcon sx={{ fontSize: 18, mr: 0.5 }} />}
            iconPosition="start"
            label="Voice Soundbox Settings"
          />
        </Tabs>
      </Box>

      {/* ════════════════════════════════════════════════════════════════
          TAB 0: LIVE ALERTS & NOTIFICATIONS FEED
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === 0 && (
        <Box>
          {/* Filter Bar & Search */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 2.5,
              borderRadius: "16px",
              background: "linear-gradient(145deg, #0A0F1D 0%, #111827 100%)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
              alignItems: { xs: "stretch", sm: "center" },
              justifyContent: "space-between",
            }}
          >
            {/* Search Input */}
            <TextField
              size="small"
              placeholder="Search notifications, UTR, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "rgba(255, 255, 255, 0.4)", fontSize: 18 }} />
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: "10px",
                  bgcolor: "rgba(255, 255, 255, 0.04)",
                  fontSize: "12.5px",
                  color: "#FFFFFF",
                  "& fieldset": { borderColor: "rgba(255, 255, 255, 0.12)" },
                  "&:hover fieldset": { borderColor: "rgba(251, 191, 36, 0.4)" },
                },
              }}
              sx={{ minWidth: { xs: "100%", sm: 280 } }}
            />

            {/* Filter Chips */}
            <Stack direction="row" spacing={1} sx={{ overflowX: "auto", pb: { xs: 0.5, sm: 0 } }}>
              {[
                { key: "ALL", label: `All (${notifications.length})` },
                { key: "TRANSACTION", label: "Transactions" },
                { key: "CREDIT", label: "Wallet" },
                { key: "APPROVAL", label: "Approvals" },
                { key: "SYSTEM", label: "System" },
                ...(unreadCount > 0 ? [{ key: "UNREAD", label: `Unread (${unreadCount})` }] : []),
              ].map((f) => (
                <Chip
                  key={f.key}
                  label={f.label}
                  clickable
                  onClick={() => setSelectedFilter(f.key)}
                  sx={{
                    fontWeight: 700,
                    fontSize: "11px",
                    borderRadius: "8px",
                    bgcolor:
                      selectedFilter === f.key
                        ? "rgba(251, 191, 36, 0.2)"
                        : "rgba(255, 255, 255, 0.05)",
                    color: selectedFilter === f.key ? "#FDE047" : "#94A3B8",
                    border:
                      selectedFilter === f.key
                        ? "1px solid rgba(251, 191, 36, 0.5)"
                        : "1px solid rgba(255, 255, 255, 0.08)",
                    "&:hover": {
                      bgcolor: "rgba(251, 191, 36, 0.15)",
                      color: "#FFFFFF",
                    },
                  }}
                />
              ))}
            </Stack>
          </Paper>

          {/* Notifications Feed List */}
          {loadingNotifs && notifications.length === 0 ? (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 8 }}>
              <CircularProgress size={36} sx={{ color: "#FBBF24", mb: 2 }} />
              <Typography variant="body2" sx={{ color: "#94A3B8", fontWeight: 600 }}>
                Loading live notifications...
              </Typography>
            </Box>
          ) : errorNotifs ? (
            <Paper
              sx={{
                p: 4,
                textAlign: "center",
                borderRadius: "16px",
                bgcolor: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
              }}
            >
              <InfoIcon sx={{ color: "#EF4444", fontSize: 36, mb: 1 }} />
              <Typography variant="body1" sx={{ fontWeight: 700, color: "#FCA5A5" }}>
                {errorNotifs}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => fetchLiveNotifications(true)}
                sx={{ mt: 2, color: "#38BDF8", borderColor: "#38BDF8" }}
              >
                Try Again
              </Button>
            </Paper>
          ) : filteredNotifications.length === 0 ? (
            <Paper
              sx={{
                p: 6,
                textAlign: "center",
                borderRadius: "16px",
                bgcolor: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <NotificationsActiveIcon sx={{ color: "rgba(255, 255, 255, 0.2)", fontSize: 48, mb: 1.5 }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#E2E8F0" }}>
                No Notifications Found
              </Typography>
              <Typography variant="body2" sx={{ color: "#94A3B8", mt: 0.5 }}>
                {searchQuery
                  ? "No alerts match your search query."
                  : "All live payouts, wallet credits, and banking updates will appear here."}
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={1.5}>
              {filteredNotifications.map((item) => {
                const badge = getStatusBadge(item.status);
                return (
                  <Paper
                    key={item.id}
                    elevation={0}
                    sx={{
                      p: 2.2,
                      borderRadius: "14px",
                      background: item.is_read
                        ? "linear-gradient(145deg, rgba(15, 23, 42, 0.7) 0%, rgba(30, 41, 59, 0.4) 100%)"
                        : "linear-gradient(145deg, rgba(30, 58, 138, 0.25) 0%, rgba(15, 23, 42, 0.8) 100%)",
                      border: item.is_read
                        ? "1px solid rgba(255, 255, 255, 0.08)"
                        : "1px solid rgba(251, 191, 36, 0.35)",
                      borderLeft: item.is_read
                        ? "3px solid transparent"
                        : "4px solid #FBBF24",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        bgcolor: "rgba(255, 255, 255, 0.04)",
                        borderColor: "rgba(251, 191, 36, 0.4)",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 1.5,
                        flexWrap: "wrap",
                      }}
                    >
                      {/* Left: Icon & Main Body */}
                      <Box sx={{ display: "flex", gap: 1.5, flex: 1, minWidth: 260 }}>
                        <Box
                          sx={{
                            width: 38,
                            height: 38,
                            borderRadius: "10px",
                            bgcolor: "rgba(255, 255, 255, 0.05)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            shrink: 0,
                          }}
                        >
                          {getTypeIcon(item.type)}
                        </Box>

                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                            <Typography
                              variant="subtitle2"
                              sx={{
                                fontWeight: 800,
                                fontSize: "14px",
                                color: item.is_read ? "#F8FAFC" : "#FEF08A",
                              }}
                            >
                              {item.title}
                            </Typography>
                            {!item.is_read && (
                              <Chip
                                label="NEW"
                                size="small"
                                sx={{
                                  height: 16,
                                  fontSize: "9px",
                                  fontWeight: 900,
                                  bgcolor: "#EF4444",
                                  color: "#FFFFFF",
                                }}
                              />
                            )}
                          </Box>

                          <Typography
                            variant="body2"
                            sx={{
                              color: "rgba(255, 255, 255, 0.8)",
                              fontSize: "12.5px",
                              mt: 0.5,
                              lineHeight: 1.5,
                            }}
                          >
                            {item.message}
                          </Typography>

                          {/* Chips Bar: Amount, Reference/UTR, Timestamp */}
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{ mt: 1.2, alignItems: "center", flexWrap: "wrap", gap: 1 }}
                          >
                            {item.amount != null && item.amount > 0 && (
                              <Chip
                                label={`₹${Number(item.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
                                size="small"
                                sx={{
                                  height: 22,
                                  bgcolor: "rgba(34, 197, 94, 0.15)",
                                  color: "#4ADE80",
                                  fontWeight: 800,
                                  fontSize: "11px",
                                  border: "1px solid rgba(34, 197, 94, 0.3)",
                                }}
                              />
                            )}

                            {item.reference && (
                              <Tooltip title={copiedRef === item.reference ? "Copied!" : "Click to copy"}>
                                <Chip
                                  label={`Ref: ${item.reference}`}
                                  size="small"
                                  onClick={() => handleCopy(item.reference!)}
                                  icon={
                                    copiedRef === item.reference ? (
                                      <DoneIcon sx={{ fontSize: 13, color: "#4ADE80" }} />
                                    ) : (
                                      <ContentCopyIcon sx={{ fontSize: 12 }} />
                                    )
                                  }
                                  sx={{
                                    height: 22,
                                    bgcolor: "rgba(255, 255, 255, 0.05)",
                                    color: "#CBD5E1",
                                    fontFamily: "monospace",
                                    fontSize: "11px",
                                    cursor: "pointer",
                                    border: "1px solid rgba(255, 255, 255, 0.12)",
                                    "&:hover": { bgcolor: "rgba(255, 255, 255, 0.1)" },
                                  }}
                                />
                              </Tooltip>
                            )}

                            <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px" }}>
                              {formatTimestamp(item.created_at)} ({getRelativeTime(item.created_at)})
                            </Typography>
                          </Stack>
                        </Box>
                      </Box>

                      {/* Right: Status Pill & Mark Read Button */}
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Chip
                          label={badge.label}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: "10px",
                            fontWeight: 800,
                            bgcolor: badge.bg,
                            color: badge.color,
                            border: badge.border,
                          }}
                        />

                        {!item.is_read && (
                          <IconButton
                            size="small"
                            onClick={() => handleMarkSingleRead(item.id)}
                            title="Mark as read"
                            sx={{ color: "rgba(255, 255, 255, 0.4)", "&:hover": { color: "#38BDF8" } }}
                          >
                            <DoneAllIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        )}
                      </Box>
                    </Box>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Box>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB 1: VOICE SOUNDBOX SETTINGS
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === 1 && (
        <Stack spacing={3}>
          {/* ── CARD 1: SOUNDBOX MAIN TOGGLE HERO ── */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: "20px",
              background: soundboxEnabled
                ? "linear-gradient(145deg, #0A2218 0%, #05160E 100%)"
                : "linear-gradient(145deg, #181C26 0%, #0D111A 100%)",
              border: soundboxEnabled
                ? "1px solid rgba(74, 222, 128, 0.35)"
                : "1px solid rgba(255, 255, 255, 0.1)",
              boxShadow: soundboxEnabled
                ? "0 10px 30px -10px rgba(74, 222, 128, 0.25)"
                : "none",
              transition: "all 0.3s ease",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: "16px",
                    bgcolor: soundboxEnabled ? "rgba(74, 222, 128, 0.2)" : "rgba(255, 255, 255, 0.05)",
                    border: soundboxEnabled
                      ? "1px solid rgba(74, 222, 128, 0.4)"
                      : "1px solid rgba(255, 255, 255, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: soundboxEnabled ? "#4ADE80" : "#94A3B8",
                  }}
                >
                  {soundboxEnabled ? (
                    <VolumeUpIcon sx={{ fontSize: 28 }} />
                  ) : (
                    <VolumeOffIcon sx={{ fontSize: 28 }} />
                  )}
                </Box>

                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, fontSize: "16px" }}>
                      Soundbox Voice Alerts
                    </Typography>
                    <Chip
                      label={soundboxEnabled ? "ACTIVE · BROADCASTING" : "MUTED"}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: "10px",
                        fontWeight: 900,
                        bgcolor: soundboxEnabled
                          ? "rgba(74, 222, 128, 0.18)"
                          : "rgba(255, 255, 255, 0.1)",
                        color: soundboxEnabled ? "#4ADE80" : "#94A3B8",
                        border: soundboxEnabled
                          ? "1px solid rgba(74, 222, 128, 0.3)"
                          : "1px solid transparent",
                      }}
                    />
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "rgba(255, 255, 255, 0.65)", fontSize: "12px", mt: 0.3 }}
                  >
                    Speaks aloud transaction amounts instantly via Web Speech & Soundbox engine
                  </Typography>
                </Box>
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={soundboxEnabled}
                    onChange={toggleSoundbox}
                    color="warning"
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": {
                        color: "#F59E0B",
                      },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                        backgroundColor: "#F59E0B",
                      },
                    }}
                  />
                }
                label={
                  <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#FDE047" }}>
                    {soundboxEnabled ? "Enabled" : "Disabled"}
                  </Typography>
                }
              />
            </Box>
          </Paper>

          {/* ── CARD 2: LANGUAGE SELECTION & VOICE TEST ── */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: "20px",
              bgcolor: "rgba(17, 24, 39, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: "15px", mb: 2 }}>
              Select Notification Language
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
                gap: 2,
              }}
            >
              {[
                { code: "hi", label: "Hindi (हिंदी)", script: "रुपये प्राप्त हुए" },
                { code: "en", label: "English", script: "Rupees Received" },
                { code: "ta", label: "Tamil (தமிழ்)", script: "ரூபாய் பெறப்பட்டது" },
                { code: "te", label: "Telugu (తెలుగు)", script: "రూపాయలు అందినవి" },
              ].map((lang) => {
                const isSel = selectedLang === lang.code;
                return (
                  <Paper
                    key={lang.code}
                    elevation={0}
                    onClick={() => setSelectedLang(lang.code as any)}
                    sx={{
                      p: 2,
                      borderRadius: "14px",
                      cursor: "pointer",
                      bgcolor: isSel ? "rgba(251, 191, 36, 0.12)" : "rgba(255, 255, 255, 0.03)",
                      border: isSel
                        ? "1.5px solid #FBBF24"
                        : "1px solid rgba(255, 255, 255, 0.08)",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        borderColor: "#FBBF24",
                        bgcolor: "rgba(251, 191, 36, 0.08)",
                      },
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: "13px", color: isSel ? "#FEF08A" : "#FFFFFF" }}>
                        {lang.label}
                      </Typography>
                      {isSel && <CheckCircleIcon sx={{ fontSize: 16, color: "#FBBF24" }} />}
                    </Box>
                    <Typography sx={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.5)" }}>
                      {lang.script}
                    </Typography>

                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<PlayArrowIcon sx={{ fontSize: 14 }} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        playTestVoice(lang.code as any, 500);
                      }}
                      disabled={isPlayingTest === lang.code}
                      sx={{
                        mt: 1.5,
                        width: "100%",
                        fontSize: "10.5px",
                        fontWeight: 700,
                        py: 0.3,
                        borderColor: isSel ? "rgba(251, 191, 36, 0.4)" : "rgba(255, 255, 255, 0.2)",
                        color: isSel ? "#FDE047" : "rgba(255, 255, 255, 0.8)",
                        textTransform: "none",
                        "&:hover": {
                          borderColor: "#FACC15",
                          bgcolor: "rgba(251, 191, 36, 0.1)",
                        },
                      }}
                    >
                      {isPlayingTest === lang.code ? "Playing..." : "Test ₹500"}
                    </Button>
                  </Paper>
                );
              })}
            </Box>
          </Paper>

          {/* ── CARD 3: VOLUME & SPEED CONTROLS ── */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: "20px",
              bgcolor: "rgba(17, 24, 39, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: "15px", mb: 2 }}>
              Audio Engine Settings
            </Typography>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 4 }}>
              {/* Volume Slider */}
              <Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#E2E8F0" }}>
                    Soundbox Volume
                  </Typography>
                  <Typography sx={{ fontSize: "13px", fontWeight: 800, color: "#FDE047" }}>
                    {volume}%
                  </Typography>
                </Box>
                <Slider
                  value={volume}
                  onChange={(_, val) => setVolume(val as number)}
                  min={10}
                  max={100}
                  sx={{
                    color: "#F59E0B",
                    "& .MuiSlider-thumb": {
                      boxShadow: "0 0 10px rgba(245, 158, 11, 0.5)",
                    },
                  }}
                />
              </Box>

              {/* Speed Slider */}
              <Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#E2E8F0" }}>
                    Voice Speech Speed
                  </Typography>
                  <Typography sx={{ fontSize: "13px", fontWeight: 800, color: "#FDE047" }}>
                    {speechRate}x
                  </Typography>
                </Box>
                <Slider
                  value={speechRate}
                  onChange={(_, val) => setSpeechRate(val as number)}
                  min={0.7}
                  max={1.5}
                  step={0.1}
                  sx={{
                    color: "#F59E0B",
                    "& .MuiSlider-thumb": {
                      boxShadow: "0 0 10px rgba(245, 158, 11, 0.5)",
                    },
                  }}
                />
              </Box>
            </Box>
          </Paper>

          {/* ── CARD 4: EVENT TRIGGERS ── */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: "20px",
              bgcolor: "rgba(17, 24, 39, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: "15px", mb: 2 }}>
              Notification Event Triggers
            </Typography>

            <Stack spacing={1.5}>
              {[
                { title: "DMT Money Transfer Success", desc: "Trigger sound and voice for instant IMPS settlements", state: alertDmt, setter: setAlertDmt },
                { title: "UPI Dynamic QR Received", desc: "Speak aloud customer payments via Dynamic QR & Soundbox", state: alertUpi, setter: setAlertUpi },
                { title: "Wallet Top-up & Approvals", desc: "Play confirmation chime when distributor credits balance", state: alertWallet, setter: setAlertWallet },
                { title: "Low Balance Warning (< ₹1,000)", desc: "Warn before attempting high-value DMT payout transactions", state: alertLowBal, setter: setAlertLowBal },
              ].map((ev, i) => (
                <Box
                  key={i}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    py: 1.2,
                    px: 2,
                    borderRadius: "12px",
                    bgcolor: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                  }}
                >
                  <Box>
                    <Typography sx={{ fontSize: "13.5px", fontWeight: 700 }}>
                      {ev.title}
                    </Typography>
                    <Typography sx={{ fontSize: "11.5px", color: "rgba(255, 255, 255, 0.5)" }}>
                      {ev.desc}
                    </Typography>
                  </Box>
                  <Switch
                    checked={ev.state}
                    onChange={(e) => ev.setter(e.target.checked)}
                    color="warning"
                  />
                </Box>
              ))}
            </Stack>
          </Paper>
        </Stack>
      )}
    </Box>
  );
}
