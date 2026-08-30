"use client";

import React, { useState, useCallback, useEffect } from "react";
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
}> = ({ userId, tenantId, refreshIntervalMs = 30000 }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getResolvedUserId = useCallback(() => {
    if (userId) return userId;
    if (typeof window !== "undefined") {
      try {
        const uStr = localStorage.getItem("user_info") || localStorage.getItem("user") || localStorage.getItem("pay2pay_user_data");
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

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resolvedUserId = getResolvedUserId();
      const queryParams = new URLSearchParams();
      if (resolvedUserId) queryParams.append("user_id", resolvedUserId);
      if (tenantId) queryParams.append("tenant_id", tenantId);
      queryParams.append("limit", "15");

      const res = await fetch(`/api/v1/notifications/recent?${queryParams.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const json = await res.json();
      const items: NotificationItem[] = json.data || [];
      setNotifications(items);
      const computedUnread = json.unread_count ?? items.filter((i) => !i.is_read).length;
      setUnreadCount(computedUnread);
    } catch (err: any) {
      console.warn("[NotificationCenter] Error fetching notifications:", err);
      setError("Unable to load notifications");
    } finally {
      setLoading(false);
    }
  }, [getResolvedUserId, tenantId]);

  // Load initial notification status on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    soundSystem.playNotificationSound();
    fetchNotifications(); // Refresh on open
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
        headers: { "Content-Type": "application/json" },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("[NotificationCenter] Mark all read failed:", err);
    }
  };

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.is_read) {
      try {
        await fetch(`/api/v1/notifications/${item.id}/read`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
        });
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
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
        return { bg: "rgba(34, 197, 94, 0.18)", text: "#4ADE80", border: "1px solid rgba(34, 197, 94, 0.35)" };
      case "REVERSED":
      case "FAILED":
        return { bg: "rgba(239, 68, 68, 0.18)", text: "#F87171", border: "1px solid rgba(239, 68, 68, 0.35)" };
      case "PENDING":
        return { bg: "rgba(234, 179, 8, 0.18)", text: "#FACC15", border: "1px solid rgba(234, 179, 8, 0.35)" };
      default:
        return { bg: "rgba(59, 130, 246, 0.18)", text: "#60A5FA", border: "1px solid rgba(59, 130, 246, 0.35)" };
    }
  };

  return (
    <>
      <IconButton
        onClick={handleOpen}
        sx={{
          color: "#94A3B8",
          transition: "all 0.2s ease-in-out",
          "&:hover": { color: "#F8FAFC", backgroundColor: "rgba(255, 255, 255, 0.08)" },
        }}
      >
        <Badge badgeContent={unreadCount} color="error" max={99}>
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
              width: 390,
              maxWidth: "calc(100vw - 32px)",
              maxHeight: 500,
              borderRadius: "14px",
              mt: 1,
              backgroundColor: "#0F172A",
              color: "#F8FAFC",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08)",
              overflowX: "hidden",
            },
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            bgcolor: "#1E293B",
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "14px", color: "#F8FAFC" }}>
            Recent Alerts
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {unreadCount > 0 && (
              <Button
                size="small"
                onClick={handleMarkAllRead}
                sx={{
                  fontSize: "11px",
                  fontWeight: 600,
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
              onClick={fetchNotifications}
              sx={{ color: "#94A3B8", padding: "4px", "&:hover": { color: "#F8FAFC" } }}
            >
              <RefreshIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </Box>

        {/* List Content */}
        <Box sx={{ overflowY: "auto", overflowX: "hidden", maxHeight: 420 }}>
          {loading && notifications.length === 0 ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress size={24} sx={{ color: "#38BDF8" }} />
            </Box>
          ) : error ? (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <ErrorIcon sx={{ color: "#EF4444", fontSize: 28 }} />
              <Typography variant="body2" sx={{ color: "#94A3B8", mt: 0.5 }}>
                {error}
              </Typography>
              <Button size="small" onClick={fetchNotifications} sx={{ mt: 1, fontSize: "12px", color: "#38BDF8" }}>
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
                Transaction updates will appear here dynamically.
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
                    bgcolor: item.is_read ? "transparent" : "rgba(30, 58, 138, 0.35)",
                    borderLeft: item.is_read ? "3px solid transparent" : "3px solid #3B82F6",
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
                  <Box sx={{ mt: 0.5, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {!item.is_read ? (
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: "#38BDF8",
                          boxShadow: "0 0 8px #38BDF8",
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
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.35 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: item.is_read ? 600 : 700,
                          fontSize: "13px",
                          color: "#FFFFFF",
                          lineHeight: 1.25,
                        }}
                      >
                        {item.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px", ml: 1, flexShrink: 0 }}>
                        {formatTimestamp(item.created_at)}
                      </Typography>
                    </Box>

                    <Typography
                      variant="body2"
                      sx={{
                        color: "#E2E8F0",
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
                            fontWeight: 700,
                            color: item.status === "REVERSED" || item.status === "FAILED" ? "#F87171" : "#4ADE80",
                            fontSize: "12px",
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
                          fontWeight: 700,
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
                          {item.reference.startsWith("UTR") ? item.reference : `UTR: ${item.reference}`}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </MenuItem>
              );
            })
          )}
        </Box>
      </Menu>
    </>
  );
};

export default NotificationCenter;
