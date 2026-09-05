"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Box,
  Typography,
  Button,
  Chip,
  CircularProgress,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import InfoIcon from "@mui/icons-material/Info";
import RefreshIcon from "@mui/icons-material/Refresh";
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

export const NotificationCenter: React.FC<{
  userId?: string;
  tenantId?: string;
  refreshIntervalMs?: number;
}> = ({ userId, tenantId, refreshIntervalMs = 20000 }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const prevUnreadRef = useRef<number>(0);

  const getResolvedUserId = useCallback(() => {
    if (userId) return userId;
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
        ""
      );
    }
    return "";
  }, [userId]);

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

  const fetchNotifications = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setIsRefreshing(true);
      else if (notifications.length === 0) setLoading(true);
      setError(null);

      try {
        const resolvedUserId = getResolvedUserId();
        const queryParams = new URLSearchParams();
        if (resolvedUserId) queryParams.append("user_id", resolvedUserId);
        if (tenantId) queryParams.append("tenant_id", tenantId);
        queryParams.append("limit", "15");

        const res = await fetch(`/api/v1/notifications/recent?${queryParams.toString()}`, {
          method: "GET",
          headers: getAuthHeaders(),
        });

        if (!res.ok) {
          throw new Error(`HTTP error ${res.status}`);
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

        const computedUnread =
          json.unread_count ?? items.filter((i) => !i.is_read).length;

        // Play chime if new unread notification arrived
        if (computedUnread > prevUnreadRef.current && prevUnreadRef.current > 0) {
          soundSystem.playNotificationSound();
        }
        prevUnreadRef.current = computedUnread;
        setUnreadCount(computedUnread);

        // Sync to window event so dashboard components update synchronously
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("pay2pay:notifications_synced", {
              detail: { notifications: items, unreadCount: computedUnread }
            })
          );
        }
      } catch (err: any) {
        console.warn("[NotificationCenter] Error fetching notifications:", err);
        setError("Unable to load live notifications");
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [getResolvedUserId, getAuthHeaders, tenantId]
  );

  // Load initial notification status on mount & set up background live polling
  useEffect(() => {
    fetchNotifications();

    const intervalId = setInterval(() => {
      fetchNotifications();
    }, refreshIntervalMs);

    const handleCustomRefresh = () => {
      fetchNotifications(true);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("pay2pay:notification_refresh", handleCustomRefresh);
      window.addEventListener("p2p:wallet_update", handleCustomRefresh);
    }

    return () => {
      clearInterval(intervalId);
      if (typeof window !== "undefined") {
        window.removeEventListener("pay2pay:notification_refresh", handleCustomRefresh);
        window.removeEventListener("p2p:wallet_update", handleCustomRefresh);
      }
    };
  }, [fetchNotifications, refreshIntervalMs]);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    soundSystem.playNotificationSound();
    fetchNotifications(true); // Immediate fresh sync on open
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAllRead = async () => {
    try {
      const resolvedUserId = getResolvedUserId();
      const queryParams = new URLSearchParams();
      if (resolvedUserId) queryParams.append("user_id", resolvedUserId);

      await fetch(`/api/v1/notifications/mark-all-read?${queryParams.toString()}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      prevUnreadRef.current = 0;
    } catch (err) {
      console.error("[NotificationCenter] Mark all read failed:", err);
    }
  };

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.is_read) {
      try {
        await fetch(`/api/v1/notifications/${item.id}/read`, {
          method: "PATCH",
          headers: getAuthHeaders(),
        });
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        prevUnreadRef.current = Math.max(0, prevUnreadRef.current - 1);
      } catch (err) {
        console.error("[NotificationCenter] Mark item read failed:", err);
      }
    }
    handleClose();
  };

  const formatTimestamp = (isoStr: string) => {
    try {
      const dt = new Date(isoStr);
      return dt.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "";
    }
  };

  const getNotificationIcon = (item: NotificationItem) => {
    if (!item.is_read) {
      return (
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            bgcolor: "#FBBF24",
            boxShadow: "0 0 10px #FBBF24, 0 0 20px rgba(251,191,36,0.4)",
            flexShrink: 0,
            mt: "3px",
            "@keyframes pulseGlow": {
              "0%, 100%": { boxShadow: "0 0 6px #FBBF24, 0 0 14px rgba(251,191,36,0.4)" },
              "50%": { boxShadow: "0 0 12px #FBBF24, 0 0 28px rgba(251,191,36,0.6)" },
            },
            animation: "pulseGlow 2s ease-in-out infinite",
          }}
        />
      );
    }
    const s = String(item.status || "INFO").toUpperCase();
    if (s === "SUCCESS") {
      return (
        <Box sx={{
          width: 30, height: 30, borderRadius: "9px",
          bgcolor: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.22)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <CheckCircleIcon sx={{ fontSize: 16, color: "#22C55E" }} />
        </Box>
      );
    }
    if (s === "FAILED" || s === "REVERSED") {
      return (
        <Box sx={{
          width: 30, height: 30, borderRadius: "9px",
          bgcolor: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.22)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <ErrorIcon sx={{ fontSize: 16, color: "#F87171" }} />
        </Box>
      );
    }
    return (
      <Box sx={{
        width: 30, height: 30, borderRadius: "9px",
        bgcolor: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.22)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <InfoIcon sx={{ fontSize: 16, color: "#60A5FA" }} />
      </Box>
    );
  };

  return (
    <>
      {/* ── Bell Button ── */}
      <IconButton
        onClick={handleOpen}
        sx={{
          color: unreadCount > 0 ? "#FBBF24" : (notifications.length > 0 ? "#FDE047" : "#94A3B8"),
          transition: "all 0.2s ease-in-out",
          "&:hover": { color: "#F8FAFC", backgroundColor: "rgba(255, 255, 255, 0.08)" },
        }}
      >
        <Badge
          badgeContent={unreadCount > 0 ? unreadCount : (notifications.length > 0 ? notifications.length : 0)}
          sx={{
            "& .MuiBadge-badge": {
              backgroundColor: unreadCount > 0 ? "#EF4444" : "rgba(245, 158, 11, 0.95)",
              color: unreadCount > 0 ? "#FFFFFF" : "#0A0F1D",
              fontWeight: 900,
              fontSize: "10.5px",
              boxShadow: unreadCount > 0 ? "0 0 8px rgba(239, 68, 68, 0.6)" : "0 0 8px rgba(245, 158, 11, 0.4)",
            },
          }}
          max={99}
        >
          <NotificationsIcon sx={{ fontSize: 22 }} />
        </Badge>
      </IconButton>

      {/* ── Notification Panel ── */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        slotProps={{
          paper: {
            elevation: 0,
            sx: {
              width: { xs: "calc(100vw - 16px)", sm: 420 },
              maxWidth: "calc(100vw - 16px)",
              maxHeight: "none",
              borderRadius: "18px",
              mt: 1.5,
              background: "linear-gradient(160deg, rgba(9,11,24,0.98) 0%, rgba(12,17,35,0.97) 100%)",
              backdropFilter: "blur(28px) saturate(180%)",
              WebkitBackdropFilter: "blur(28px) saturate(180%)",
              color: "#F8FAFC",
              border: "1px solid rgba(251, 191, 36, 0.16)",
              boxShadow:
                "0 32px 64px -16px rgba(0,0,0,0.95), 0 0 0 1px rgba(255,255,255,0.04), 0 0 40px rgba(251,191,36,0.05)",
              overflowX: "hidden",
              overflowY: "hidden",
              display: "flex",
              flexDirection: "column",
            },
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        {/* ── Header ── */}
        <Box
          sx={{
            px: 2.5,
            py: 1.75,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
            background: "linear-gradient(180deg, rgba(30,41,59,0.55) 0%, rgba(15,23,42,0.35) 100%)",
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            {unreadCount > 0 && (
              <Box sx={{
                width: 8, height: 8, borderRadius: "50%", bgcolor: "#EF4444",
                boxShadow: "0 0 8px #EF4444",
                "@keyframes dot-pulse": {
                  "0%,100%": { transform: "scale(1)", opacity: 1 },
                  "50%": { transform: "scale(1.5)", opacity: 0.6 },
                },
                animation: "dot-pulse 2s ease-in-out infinite",
                flexShrink: 0,
              }} />
            )}
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 800,
                fontSize: "14px",
                letterSpacing: "0.015em",
                background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #F59E0B 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Notification Center
            </Typography>
            {unreadCount > 0 ? (
              <Chip
                label={`${unreadCount} New`}
                size="small"
                sx={{
                  height: 19, fontSize: "9.5px", fontWeight: 900,
                  bgcolor: "rgba(239, 68, 68, 0.15)", color: "#F87171",
                  border: "1px solid rgba(239, 68, 68, 0.30)",
                  letterSpacing: "0.05em",
                  "& .MuiChip-label": { px: 1 },
                }}
              />
            ) : notifications.length > 0 ? (
              <Chip
                label={`${notifications.length} Live`}
                size="small"
                sx={{
                  height: 19, fontSize: "9.5px", fontWeight: 900,
                  bgcolor: "rgba(245, 158, 11, 0.14)", color: "#FDE047",
                  border: "1px solid rgba(245, 158, 11, 0.30)",
                  letterSpacing: "0.05em",
                  "& .MuiChip-label": { px: 1 },
                }}
              />
            ) : null}
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            {unreadCount > 0 && (
              <Button
                size="small"
                onClick={handleMarkAllRead}
                sx={{
                  fontSize: "10.5px", fontWeight: 700, color: "#38BDF8",
                  textTransform: "none", padding: "3px 10px", borderRadius: "8px", minWidth: 0,
                  border: "1px solid rgba(56, 189, 248, 0.2)", bgcolor: "rgba(56, 189, 248, 0.06)",
                  "&:hover": { backgroundColor: "rgba(56, 189, 248, 0.14)", borderColor: "rgba(56,189,248,0.4)" },
                }}
              >
                Mark all read
              </Button>
            )}
            <IconButton
              size="small"
              onClick={() => fetchNotifications(true)}
              disabled={isRefreshing}
              sx={{
                color: isRefreshing ? "#FBBF24" : "#64748B",
                padding: "5px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.07)",
                "&:hover": { color: "#F8FAFC", bgcolor: "rgba(255,255,255,0.08)" },
              }}
            >
              <RefreshIcon
                sx={{
                  fontSize: 16,
                  animation: isRefreshing ? "spin 0.8s linear infinite" : "none",
                  "@keyframes spin": {
                    "0%": { transform: "rotate(0deg)" },
                    "100%": { transform: "rotate(360deg)" },
                  },
                }}
              />
            </IconButton>
          </Box>
        </Box>

        {/* ── List Content ── */}
        <Box
          sx={{
            overflowY: "auto",
            overflowX: "hidden",
            maxHeight: { xs: "60vh", sm: 430 },
            flexGrow: 1,
            /* Premium slim gold scrollbar */
            "&::-webkit-scrollbar": { width: "3px" },
            "&::-webkit-scrollbar-track": { background: "rgba(255,255,255,0.02)", borderRadius: "4px" },
            "&::-webkit-scrollbar-thumb": {
              background: "linear-gradient(180deg, rgba(251,191,36,0.55) 0%, rgba(251,191,36,0.18) 100%)",
              borderRadius: "4px",
            },
            "&::-webkit-scrollbar-thumb:hover": { background: "rgba(251,191,36,0.75)" },
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(251,191,36,0.4) rgba(255,255,255,0.02)",
          }}
        >
          {loading && notifications.length === 0 ? (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 6, gap: 1.5 }}>
              <CircularProgress size={26} thickness={3} sx={{ color: "#FBBF24" }} />
              <Typography variant="caption" sx={{ color: "#64748B", fontSize: "11px" }}>
                Loading notifications…
              </Typography>
            </Box>
          ) : error ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Box sx={{
                width: 48, height: 48, borderRadius: "14px",
                bgcolor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 1.5,
              }}>
                <ErrorIcon sx={{ color: "#EF4444", fontSize: 24 }} />
              </Box>
              <Typography variant="body2" sx={{ color: "#CBD5E1", fontWeight: 600, mb: 0.5 }}>Unable to load alerts</Typography>
              <Typography variant="caption" sx={{ color: "#64748B", display: "block", mb: 2 }}>{error}</Typography>
              <Button
                size="small"
                onClick={() => fetchNotifications(true)}
                sx={{
                  fontSize: "11px", color: "#38BDF8", textTransform: "none",
                  border: "1px solid rgba(56,189,248,0.25)", borderRadius: "8px",
                  px: 2, "&:hover": { bgcolor: "rgba(56,189,248,0.1)" },
                }}
              >
                Try again
              </Button>
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ py: 6, px: 3, textAlign: "center" }}>
              <Box sx={{
                width: 52, height: 52, borderRadius: "16px",
                background: "linear-gradient(135deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.8) 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2,
              }}>
                <NotificationsIcon sx={{ color: "#475569", fontSize: 24 }} />
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "#E2E8F0", mb: 0.75, fontSize: "13px" }}>
                No recent notifications
              </Typography>
              <Typography variant="caption" sx={{ color: "#64748B", display: "block", lineHeight: 1.6, maxWidth: 240, mx: "auto" }}>
                Live transaction &amp; wallet updates will appear here automatically.
              </Typography>
            </Box>
          ) : (
            notifications.map((item, idx) => {
              const chipStyle = getStatusChipColor(item.status);
              return (
                <MenuItem
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  sx={{
                    py: 1.75,
                    px: 2.5,
                    borderBottom: idx < notifications.length - 1 ? "1px solid rgba(255, 255, 255, 0.05)" : "none",
                    bgcolor: item.is_read ? "transparent" : "rgba(30, 58, 138, 0.12)",
                    borderLeft: item.is_read ? "2px solid transparent" : "2px solid #FBBF24",
                    transition: "all 0.15s ease-in-out",
                    "&:hover": {
                      bgcolor: "rgba(255, 255, 255, 0.04)",
                    },
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1.5,
                    whiteSpace: "normal",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  {/* Icon */}
                  <Box sx={{ mt: "3px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {getNotificationIcon(item)}
                  </Box>

                  {/* Main Content */}
                  <Box sx={{ flexGrow: 1, minWidth: 0, width: "100%" }}>
                    {/* Title + Time */}
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.4, gap: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: item.is_read ? 600 : 800,
                          fontSize: "13px",
                          color: item.is_read ? "#E2E8F0" : "#FFFFFF",
                          lineHeight: 1.3,
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        {item.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#475569",
                          fontSize: "10.5px",
                          flexShrink: 0,
                          fontVariantNumeric: "tabular-nums",
                          letterSpacing: "0.02em",
                          mt: "1px",
                        }}
                      >
                        {formatTimestamp(item.created_at)}
                      </Typography>
                    </Box>

                    {/* Message */}
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#94A3B8",
                        fontSize: "11.5px",
                        display: "block",
                        lineHeight: 1.55,
                        mb: 1,
                        wordBreak: "break-word",
                      }}
                    >
                      {item.message}
                    </Typography>

                    {/* Footer: Amount + Status + UTR */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                      {item.amount != null && (
                        <Box sx={{
                          display: "inline-flex", alignItems: "center",
                          bgcolor: item.status === "REVERSED" || item.status === "FAILED"
                            ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)",
                          border: item.status === "REVERSED" || item.status === "FAILED"
                            ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(34,197,94,0.2)",
                          borderRadius: "6px",
                          px: 0.9, py: 0.3,
                        }}>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 800,
                              color: item.status === "REVERSED" || item.status === "FAILED" ? "#F87171" : "#4ADE80",
                              fontSize: "12px",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            ₹{item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </Typography>
                        </Box>
                      )}

                      <Chip
                        label={item.status}
                        size="small"
                        sx={{
                          bgcolor: chipStyle.bg,
                          color: chipStyle.text,
                          border: chipStyle.border,
                          fontWeight: 800,
                          fontSize: "9.5px",
                          height: 19,
                          letterSpacing: "0.06em",
                          borderRadius: "5px",
                          "& .MuiChip-label": { px: 0.85 },
                        }}
                      />

                      {item.reference && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: "#94A3B8",
                            fontSize: "10.5px",
                            bgcolor: "rgba(255, 255, 255, 0.05)",
                            border: "1px solid rgba(255, 255, 255, 0.09)",
                            px: 0.9,
                            py: 0.25,
                            borderRadius: "5px",
                            fontFamily: "'Roboto Mono', 'Fira Code', monospace",
                            letterSpacing: "0.4px",
                          }}
                        >
                          {String(item.reference).startsWith("UTR")
                            ? item.reference
                            : `UTR: ${item.reference}`}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </MenuItem>
              );
            })
          )}
        </Box>

        {/* ── Footer ── */}
        <Box
          sx={{
            px: 2,
            py: 1.25,
            borderTop: "1px solid rgba(255, 255, 255, 0.07)",
            background: "linear-gradient(0deg, rgba(9,11,24,0.98) 0%, rgba(15,23,42,0.5) 100%)",
            flexShrink: 0,
          }}
        >
          <Button
            fullWidth
            size="small"
            onClick={() => {
              handleClose();
              window.location.href = "/retailer/notifications";
            }}
            sx={{
              color: "#FBBF24",
              fontWeight: 700,
              fontSize: "12px",
              textTransform: "none",
              borderRadius: "10px",
              py: 1,
              letterSpacing: "0.03em",
              background: "linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(245,158,11,0.04) 100%)",
              border: "1px solid rgba(251, 191, 36, 0.2)",
              transition: "all 0.2s ease",
              "&:hover": {
                background: "linear-gradient(135deg, rgba(251,191,36,0.18) 0%, rgba(245,158,11,0.10) 100%)",
                borderColor: "rgba(251, 191, 36, 0.45)",
                color: "#FEF08A",
                boxShadow: "0 4px 16px rgba(251, 191, 36, 0.14)",
                transform: "translateY(-1px)",
              },
              "&:active": {
                transform: "translateY(0)",
                boxShadow: "none",
              },
            }}
          >
            View All Notifications &amp; Soundbox Settings →
          </Button>
        </Box>
      </Menu>
    </>
  );
};

export default NotificationCenter;



