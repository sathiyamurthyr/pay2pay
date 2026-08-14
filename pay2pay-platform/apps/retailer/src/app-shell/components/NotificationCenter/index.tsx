"use client";

import React, { useEffect, useState, useCallback } from "react";
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
  Divider,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import InfoIcon from "@mui/icons-material/Info";
import RefreshIcon from "@mui/icons-material/Refresh";

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

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (userId) queryParams.append("user_id", userId);
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
      setUnreadCount(json.unread_count ?? items.filter((i) => !i.is_read).length);
    } catch (err: any) {
      console.warn("[NotificationCenter] Error fetching notifications:", err);
      setError("Failed to load alerts.");
    } finally {
      setLoading(false);
    }
  }, [userId, tenantId]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [fetchNotifications, refreshIntervalMs]);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    fetchNotifications();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/v1/notifications/mark-all-read", {
        method: "PUT",
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
          method: "PUT",
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
        return { bg: "#DCFCE7", text: "#166534" };
      case "REVERSED":
        return { bg: "#FEF3C7", text: "#92400E" };
      case "FAILED":
        return { bg: "#FEE2E2", text: "#991B1B" };
      case "PENDING":
        return { bg: "#DBEAFE", text: "#1E40AF" };
      default:
        return { bg: "#F1F5F9", text: "#475569" };
    }
  };

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleOpen}
        size="small"
        sx={{
          p: 0.75,
          color: "#94A3B8",
          transition: "all 0.2s",
          "&:hover": { color: "#FFFFFF", bgcolor: "rgba(255, 255, 255, 0.1)" },
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
            sx: {
              borderRadius: 3,
              width: 360,
              mt: 1.5,
              p: 0,
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
              border: "1px solid #E2E8F0",
              overflow: "hidden",
            },
          },
        }}
      >
        {/* Header Bar */}
        <Box
          sx={{
            p: 1.75,
            bgcolor: "#0F172A",
            color: "#FFFFFF",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <NotificationsIcon sx={{ fontSize: 18, color: "#60A5FA" }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "14px", letterSpacing: "0.2px" }}>
              Recent Alerts
            </Typography>
            {unreadCount > 0 && (
              <Chip
                label={`${unreadCount} new`}
                size="small"
                sx={{
                  bgcolor: "#EF4444",
                  color: "#FFFFFF",
                  fontWeight: 800,
                  height: 18,
                  fontSize: "10px",
                }}
              />
            )}
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <IconButton size="small" onClick={fetchNotifications} sx={{ color: "#94A3B8", p: 0.5 }}>
              <RefreshIcon sx={{ fontSize: 16 }} />
            </IconButton>
            {unreadCount > 0 && (
              <Button
                size="small"
                onClick={handleMarkAllRead}
                sx={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#60A5FA",
                  textTransform: "none",
                  p: "2px 8px",
                  minWidth: 0,
                }}
              >
                Mark all read
              </Button>
            )}
          </Box>
        </Box>

        <Divider />

        {/* Content Body */}
        <Box sx={{ maxHeight: 380, overflowY: "auto", py: 0.5 }}>
          {loading && notifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <CircularProgress size={24} sx={{ color: "#2563EB" }} />
              <Typography variant="caption" sx={{ display: "block", mt: 1, color: "#64748B" }}>
                Fetching live notifications...
              </Typography>
            </Box>
          ) : error ? (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <ErrorIcon sx={{ color: "#EF4444", fontSize: 28 }} />
              <Typography variant="body2" sx={{ color: "#64748B", mt: 0.5 }}>
                {error}
              </Typography>
              <Button size="small" onClick={fetchNotifications} sx={{ mt: 1, fontSize: "12px" }}>
                Retry
              </Button>
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <InfoIcon sx={{ color: "#94A3B8", fontSize: 32, mb: 0.5 }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569" }}>
                No recent alerts or notifications
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
                    py: 1.25,
                    px: 2,
                    borderBottom: "1px solid #F1F5F9",
                    bgcolor: item.is_read ? "#FFFFFF" : "rgba(239, 246, 255, 0.6)",
                    transition: "background-color 0.15s",
                    "&:hover": { bgcolor: "rgba(241, 245, 249, 0.9)" },
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1.5,
                  }}
                >
                  {/* Status / Read Icon Dot */}
                  <Box sx={{ mt: 0.5, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {!item.is_read ? (
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: "#2563EB",
                          boxShadow: "0 0 6px rgba(37, 99, 235, 0.5)",
                        }}
                      />
                    ) : item.status === "SUCCESS" ? (
                      <CheckCircleIcon sx={{ fontSize: 16, color: "#16A34A" }} />
                    ) : (
                      <InfoIcon sx={{ fontSize: 16, color: "#64748B" }} />
                    )}
                  </Box>

                  {/* Main Content */}
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.25 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: item.is_read ? 600 : 800,
                          fontSize: "13px",
                          color: "#0F172A",
                          truncate: true,
                        }}
                      >
                        {item.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px", ml: 1, flexShrink: 0 }}>
                        {formatTimestamp(item.created_at)}
                      </Typography>
                    </Box>

                    <Typography
                      variant="caption"
                      sx={{
                        color: "#475569",
                        fontSize: "11.5px",
                        display: "block",
                        lineHeight: 1.35,
                        mb: 0.5,
                      }}
                    >
                      {item.message}
                    </Typography>

                    {/* Footer Details: Amount + Status Chip + Reference/UTR */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
                      {item.amount != null && (
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 800,
                            color: item.status === "REVERSED" ? "#DC2626" : "#16A34A",
                            fontSize: "11.5px",
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
                          fontWeight: 800,
                          fontSize: "9.5px",
                          height: 16,
                          px: 0.5,
                          borderRadius: "4px",
                        }}
                      />

                      {item.reference && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: "#64748B",
                            fontSize: "10.5px",
                            bgcolor: "#F8FAFC",
                            px: 0.6,
                            py: 0.2,
                            borderRadius: "4px",
                            fontFamily: "monospace",
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
