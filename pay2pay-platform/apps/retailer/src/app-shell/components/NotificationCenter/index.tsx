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
        const items: NotificationItem[] = json.data || [];
        setNotifications(items);

        const computedUnread =
          json.unread_count ?? items.filter((i) => !i.is_read).length;

        // Play chime if new unread notification arrived
        if (computedUnread > prevUnreadRef.current && prevUnreadRef.current > 0) {
          soundSystem.playNotificationSound();
        }
        prevUnreadRef.current = computedUnread;
        setUnreadCount(computedUnread);
      } catch (err: any) {
        console.warn("[NotificationCenter] Error fetching notifications:", err);
        setError("Unable to load live notifications");
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [getResolvedUserId, getAuthHeaders, tenantId, notifications.length]
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

  const getStatusChipColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "SUCCESS":
        return {
          bg: "rgba(34, 197, 94, 0.18)",
          text: "#4ADE80",
          border: "1px solid rgba(34, 197, 94, 0.35)",
        };
      case "REVERSED":
      case "FAILED":
        return {
          bg: "rgba(239, 68, 68, 0.18)",
          text: "#F87171",
          border: "1px solid rgba(239, 68, 68, 0.35)",
        };
      case "PENDING":
        return {
          bg: "rgba(234, 179, 8, 0.18)",
          text: "#FACC15",
          border: "1px solid rgba(234, 179, 8, 0.35)",
        };
      default:
        return {
          bg: "rgba(59, 130, 246, 0.18)",
          text: "#60A5FA",
          border: "1px solid rgba(59, 130, 246, 0.35)",
        };
    }
  };

  return (
    <>
      <IconButton
        onClick={handleOpen}
        sx={{
          color: unreadCount > 0 ? "#FBBF24" : "#94A3B8",
          transition: "all 0.2s ease-in-out",
          "&:hover": { color: "#F8FAFC", backgroundColor: "rgba(255, 255, 255, 0.08)" },
        }}
      >
        <Badge
          badgeContent={unreadCount}
          sx={{
            "& .MuiBadge-badge": {
              backgroundColor: "#EF4444",
              color: "#FFFFFF",
              fontWeight: 800,
              fontSize: "11px",
              boxShadow: "0 0 8px rgba(239, 68, 68, 0.6)",
            },
          }}
          max={99}
        >
          <NotificationsIcon sx={{ fontSize: 22 }} />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        slotProps={{
          paper: {
            elevation: 12,
            sx: {
              width: 400,
              maxWidth: "calc(100vw - 32px)",
              maxHeight: 520,
              borderRadius: "16px",
              mt: 1.5,
              backgroundColor: "rgba(10, 15, 29, 0.95)",
              backdropFilter: "blur(20px)",
              color: "#F8FAFC",
              border: "1px solid rgba(251, 191, 36, 0.25)",
              boxShadow:
                "0 24px 48px -12px rgba(0, 0, 0, 0.9), 0 0 20px rgba(251, 191, 36, 0.08)",
              overflowX: "hidden",
            },
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        {/* Header with Gold Title and Refresh */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            bgcolor: "rgba(30, 41, 59, 0.7)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 800,
                fontSize: "14.5px",
                background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #F59E0B 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Recent Alerts
            </Typography>
            {unreadCount > 0 && (
              <Chip
                label={`${unreadCount} New`}
                size="small"
                sx={{
                  height: 18,
                  fontSize: "9.5px",
                  fontWeight: 900,
                  bgcolor: "rgba(239, 68, 68, 0.2)",
                  color: "#F87171",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                }}
              />
            )}
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {unreadCount > 0 && (
              <Button
                size="small"
                onClick={handleMarkAllRead}
                sx={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#38BDF8",
                  textTransform: "none",
                  padding: "2px 8px",
                  borderRadius: "6px",
                  minWidth: 0,
                  "&:hover": { backgroundColor: "rgba(56, 189, 248, 0.15)" },
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
                color: isRefreshing ? "#FBBF24" : "#94A3B8",
                padding: "4px",
                "&:hover": { color: "#F8FAFC" },
              }}
            >
              <RefreshIcon
                sx={{
                  fontSize: 17,
                  animation: isRefreshing ? "spin 1s linear infinite" : "none",
                  "@keyframes spin": {
                    "0%": { transform: "rotate(0deg)" },
                    "100%": { transform: "rotate(360deg)" },
                  },
                }}
              />
            </IconButton>
          </Box>
        </Box>

        {/* List Content */}
        <Box sx={{ overflowY: "auto", overflowX: "hidden", maxHeight: 440 }}>
          {loading && notifications.length === 0 ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress size={24} sx={{ color: "#FBBF24" }} />
            </Box>
          ) : error ? (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <ErrorIcon sx={{ color: "#EF4444", fontSize: 28 }} />
              <Typography variant="body2" sx={{ color: "#94A3B8", mt: 0.5 }}>
                {error}
              </Typography>
              <Button
                size="small"
                onClick={() => fetchNotifications(true)}
                sx={{ mt: 1, fontSize: "12px", color: "#38BDF8" }}
              >
                Try again
              </Button>
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <InfoIcon sx={{ color: "#64748B", fontSize: 32, mb: 0.5 }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#E2E8F0" }}>
                No recent notifications
              </Typography>
              <Typography variant="caption" sx={{ color: "#94A3B8", display: "block", mt: 0.5 }}>
                Live transaction & wallet updates will appear here automatically.
              </Typography>
            </Box>
          ) : (
            notifications.map((item) => {
              const chipStyle = getStatusChipColor(item.status);
              return (
                <MenuItem
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  sx={{
                    py: 1.5,
                    px: 2,
                    borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                    bgcolor: item.is_read ? "transparent" : "rgba(30, 58, 138, 0.25)",
                    borderLeft: item.is_read
                      ? "3px solid transparent"
                      : "3px solid #FBBF24",
                    transition: "all 0.15s ease-in-out",
                    "&:hover": { bgcolor: "rgba(255, 255, 255, 0.06)" },
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1.5,
                    whiteSpace: "normal",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  {/* Status / Read Icon Dot */}
                  <Box
                    sx={{
                      mt: 0.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {!item.is_read ? (
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: "#FBBF24",
                          boxShadow: "0 0 8px #FBBF24",
                        }}
                      />
                    ) : item.status === "SUCCESS" ? (
                      <CheckCircleIcon sx={{ fontSize: 16, color: "#22C55E" }} />
                    ) : (
                      <InfoIcon sx={{ fontSize: 16, color: "#64748B" }} />
                    )}
                  </Box>

                  {/* Main Content */}
                  <Box sx={{ flexGrow: 1, minWidth: 0, width: "100%" }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 0.35,
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: item.is_read ? 600 : 800,
                          fontSize: "13.5px",
                          color: "#FFFFFF",
                          lineHeight: 1.25,
                        }}
                      >
                        {item.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: "#94A3B8", fontSize: "11px", ml: 1, flexShrink: 0 }}
                      >
                        {formatTimestamp(item.created_at)}
                      </Typography>
                    </Box>

                    <Typography
                      variant="body2"
                      sx={{
                        color: "#CBD5E1",
                        fontSize: "12px",
                        display: "block",
                        lineHeight: 1.45,
                        mb: 0.75,
                        wordBreak: "break-word",
                      }}
                    >
                      {item.message}
                    </Typography>

                    {/* Footer Details: Amount + Status Chip + Reference/UTR */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                      {item.amount != null && (
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 800,
                            color:
                              item.status === "REVERSED" || item.status === "FAILED"
                                ? "#F87171"
                                : "#4ADE80",
                            fontSize: "12.5px",
                          }}
                        >
                          ₹{item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </Typography>
                      )}

                      <Chip
                        label={item.status}
                        size="small"
                        sx={{
                          bgcolor: chipStyle.bg,
                          color: chipStyle.text,
                          border: chipStyle.border,
                          fontWeight: 800,
                          fontSize: "10px",
                          height: 18,
                          px: 0.5,
                          borderRadius: "4px",
                        }}
                      />

                      {item.reference && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: "#CBD5E1",
                            fontSize: "11px",
                            bgcolor: "rgba(255, 255, 255, 0.08)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            px: 0.75,
                            py: 0.2,
                            borderRadius: "4px",
                            fontFamily: "monospace",
                            letterSpacing: "0.2px",
                          }}
                        >
                          {item.reference.startsWith("UTR")
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

        {/* Footer: View All Notifications */}
        <Box
          sx={{
            p: 1.2,
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            bgcolor: "rgba(15, 23, 42, 0.95)",
            textAlign: "center",
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
              fontWeight: 800,
              fontSize: "12px",
              textTransform: "none",
              borderRadius: "8px",
              py: 0.8,
              bgcolor: "rgba(251, 191, 36, 0.08)",
              border: "1px solid rgba(251, 191, 36, 0.25)",
              "&:hover": {
                bgcolor: "rgba(251, 191, 36, 0.18)",
                borderColor: "#FACC15",
                color: "#FEF08A",
              },
            }}
          >
            View All Notifications & Soundbox Settings →
          </Button>
        </Box>
      </Menu>
    </>
  );
};

export default NotificationCenter;
