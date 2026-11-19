"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Stack,
  Paper,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Drawer,
  Divider,
  TablePagination,
  Skeleton,
  Menu,
  InputAdornment,
  Snackbar,
  Alert,
  Tooltip,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Popover,
} from "@mui/material";

// Icons
import FilterListIcon from "@mui/icons-material/FilterList";
import TableRowsIcon from "@mui/icons-material/TableRows";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import RefreshIcon from "@mui/icons-material/Refresh";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";
import ReceiptIcon from "@mui/icons-material/Receipt";
import ClearIcon from "@mui/icons-material/Clear";
import TableChartIcon from "@mui/icons-material/TableChart";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import StorefrontIcon from "@mui/icons-material/Storefront";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import AssessmentIcon from "@mui/icons-material/Assessment";

import { useCompanyBranding } from "@/hooks/useCompanyBranding";
import { useRetailerStore } from "@/stores/use-retailer-store";
import { getApiBaseUrl } from "@/lib/api-config";

export interface PayinReportSummary {
  total_transactions: number;
  total_volume: number;
  total_customer_payable: number;
  total_retailer_credit: number;
  total_charges: number;
  total_mdr: number;
  total_gst: number;
  successful_transactions: number;
  successful_amount: number;
  successful_credit: number;
  pending_transactions: number;
  pending_amount: number;
  failed_transactions: number;
  failed_amount: number;
  reversed_transactions: number;
  reversed_amount: number;
  success_rate: number;
}

export interface PayinReportItem {
  s_no: number;
  id: string;
  tid: string;
  transaction_id: string;
  reference_id: string;
  merchant_ref_id?: string;
  provider_ref_id?: string;
  retailer_id: string;
  retailer_name: string;
  company_id?: string;
  company_name: string;
  company_code: string;
  gateway: string;
  vendor_name: string;
  payment_mode: string;
  payment_mode_name: string;
  card_network?: string;
  customer_name?: string;
  customer_mobile?: string;
  amount: number;
  txn_amount: number;
  mdr_amount: number;
  gst: number;
  tax_amount: number;
  total_charges: number;
  total_amount: number;
  customer_payable: number;
  retailer_credit: number;
  status: string;
  provider_status?: string;
  ledger_txn_id?: string;
  failure_reason?: string;
  date: string;
  time: string;
  date_time: string;
  created_at?: string;
  initiated_at?: string;
  updated_at?: string;
  completed_at?: string;
  [key: string]: any;
}

export interface PayinReportProps {
  portalType?: "retailer" | "admin" | "sd" | "dist";
  title?: string;
  subtitle?: string;
}

export const RetailerPayinReport: React.FC<PayinReportProps> = ({
  portalType = "retailer",
  title = "PayIn Transaction Report",
  subtitle = "Live collections, wallet credits & gateway routing master journal",
}) => {
  const branding = useCompanyBranding();
  const { outlet } = useRetailerStore();

  // State: Authoritative Data
  const [items, setItems] = useState<PayinReportItem[]>([]);
  const [summary, setSummary] = useState<PayinReportSummary | null>(null);
  const [footerTotals, setFooterTotals] = useState<{
    total_transactions: number;
    total_amount: number;
    total_charges: number;
    total_gst: number;
    total_customer_payable: number;
    total_retailer_credit: number;
  } | null>(null);

  // Requirement 7: Explicit Loading Behaviour (No auto-fetch on initial page load)
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>("--");

  // Filter States (Editing filters does NOT trigger fetch until Apply is clicked)
  const [globalSearch, setGlobalSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [gatewayFilter, setGatewayFilter] = useState<string>("ALL");
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>("ALL");
  const [activePreset, setActivePreset] = useState<string>("TODAY");
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [toDate, setToDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  // Custom Date Dialog
  const [customDateOpen, setCustomDateOpen] = useState<boolean>(false);
  const [customFrom, setCustomFrom] = useState<string>(fromDate);
  const [customTo, setCustomTo] = useState<string>(toDate);

  // Pagination & Layout Controls
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [density, setDensity] = useState<"compact" | "medium" | "comfortable">("medium");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Anchor Els for Menus & Popovers
  const [densityAnchorEl, setDensityAnchorEl] = useState<null | HTMLElement>(null);
  const [columnsAnchorEl, setColumnsAnchorEl] = useState<null | HTMLElement>(null);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);

  // Column Visibility
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());

  // Drawer & Modal States
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [selectedTxn, setSelectedTxn] = useState<PayinReportItem | null>(null);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState<boolean>(false);

  // Toast Feedback
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");

  const showToast = (msg: string) => {
    setSnackbarMessage(msg);
    setSnackbarOpen(true);
  };

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast(`${label} copied to clipboard`);
    }
  };

  const toggleExpandCard = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Requirement 7: Explicit Report Data Fetch (Triggered ONLY on Apply or Refresh)
  const executeReportFetch = useCallback(async () => {
    setIsLoading(true);
    setHasLoaded(true);

    try {
      const q = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
      });

      if (fromDate) q.append("from_date", fromDate);
      if (toDate) q.append("to_date", toDate);
      if (globalSearch.trim()) q.append("search", globalSearch.trim());
      if (statusFilter !== "ALL") q.append("status", statusFilter);
      if (gatewayFilter !== "ALL") q.append("gateway", gatewayFilter);
      if (paymentModeFilter !== "ALL") q.append("payment_mode", paymentModeFilter);

      const token = typeof window !== "undefined" ? (
        localStorage.getItem("p2p_access_token") ||
        localStorage.getItem("pay2pay_access_token") ||
        localStorage.getItem("p2p_admin_token") ||
        localStorage.getItem("p2p_retailer_token") ||
        localStorage.getItem("access_token") ||
        document.cookie.split("; ").find(r => r.startsWith("p2p_access_token=") || r.startsWith("pay2pay_access_token="))?.split("=")[1] ||
        ""
      ) : "";

      const headers: Record<string, string> = {};
      if (token && token.trim().length > 10) {
        headers["Authorization"] = `Bearer ${token.trim()}`;
      }

      // Fetch Grid
      const gridUrl = `/api/v1/payin/reports/grid?${q.toString()}`;
      const res = await fetch(gridUrl, {
        headers,
        credentials: "include",
        cache: "no-store",
      });

      // Fetch Summary
      const summaryQ = new URLSearchParams();
      if (fromDate) summaryQ.append("from_date", fromDate);
      if (toDate) summaryQ.append("to_date", toDate);
      if (globalSearch.trim()) summaryQ.append("search", globalSearch.trim());
      if (statusFilter !== "ALL") summaryQ.append("status", statusFilter);
      if (gatewayFilter !== "ALL") summaryQ.append("gateway", gatewayFilter);
      if (paymentModeFilter !== "ALL") summaryQ.append("payment_mode", paymentModeFilter);

      const summaryUrl = `/api/v1/payin/reports/summary?${summaryQ.toString()}`;
      const summaryRes = await fetch(summaryUrl, {
        headers,
        credentials: "include",
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        const rawItems: PayinReportItem[] = Array.isArray(data.items)
          ? data.items
          : Array.isArray(data.data?.items)
          ? data.data.items
          : [];
        const total = data.pagination?.total_records ?? data.data?.pagination?.total_records ?? rawItems.length;

        setItems(rawItems);
        setTotalRecords(total);
        if (data.footer_totals) {
          setFooterTotals(data.footer_totals);
        }

        if (summaryRes.ok) {
          const summaryJson = await summaryRes.json();
          const d = summaryJson.data || summaryJson;
          setSummary({
            total_transactions: Number(d.total_transactions ?? total),
            total_volume: Number(d.total_volume ?? 0),
            total_customer_payable: Number(d.total_customer_payable ?? 0),
            total_retailer_credit: Number(d.total_retailer_credit ?? 0),
            total_charges: Number(d.total_charges ?? 0),
            total_mdr: Number(d.total_mdr ?? 0),
            total_gst: Number(d.total_gst ?? 0),
            successful_transactions: Number(d.successful_transactions ?? 0),
            successful_amount: Number(d.successful_amount ?? 0),
            successful_credit: Number(d.successful_credit ?? 0),
            pending_transactions: Number(d.pending_transactions ?? 0),
            pending_amount: Number(d.pending_amount ?? 0),
            failed_transactions: Number(d.failed_transactions ?? 0),
            failed_amount: Number(d.failed_amount ?? 0),
            reversed_transactions: Number(d.reversed_transactions ?? 0),
            reversed_amount: Number(d.reversed_amount ?? 0),
            success_rate: Number(d.success_rate ?? 0),
          });
        }
        setLastUpdatedTime(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
      } else {
        setItems([]);
        setTotalRecords(0);
      }
    } catch (err) {
      console.error("Failed to fetch PayIn report:", err);
      setItems([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [page, rowsPerPage, fromDate, toDate, globalSearch, statusFilter, gatewayFilter, paymentModeFilter]);

  const handleApplyFilters = () => {
    setPage(0);
    executeReportFetch();
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    executeReportFetch();
  };

  const handleResetFilters = () => {
    setGlobalSearch("");
    setStatusFilter("ALL");
    setGatewayFilter("ALL");
    setPaymentModeFilter("ALL");
    handleDatePreset("TODAY");
    showToast("Filters reset to default. Click 'Apply' to load.");
  };

  const handleDatePreset = (preset: string) => {
    setActivePreset(preset);
    const dNow = new Date();
    const today = `${dNow.getFullYear()}-${String(dNow.getMonth() + 1).padStart(2, "0")}-${String(dNow.getDate()).padStart(2, "0")}`;
    setPage(0);
    if (preset === "ALL" || preset === "all") {
      setFromDate("");
      setToDate("");
    } else if (preset === "TODAY" || preset === "today") {
      setFromDate(today);
      setToDate(today);
    } else if (preset === "YESTERDAY" || preset === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
      setFromDate(yStr);
      setToDate(yStr);
    } else if (preset === "7D" || preset === "7_DAYS") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setFromDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
      setToDate(today);
    } else if (preset === "30D" || preset === "30_DAYS") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setFromDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
      setToDate(today);
    } else if (preset === "60D") {
      const d = new Date();
      d.setDate(d.getDate() - 60);
      setFromDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
      setToDate(today);
    } else if (preset === "90D") {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      setFromDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
      setToDate(today);
    }
  };

  const handleExportCsv = async () => {
    try {
      showToast("Preparing PayIn CSV export...");
      const q = new URLSearchParams();
      if (fromDate) q.append("from_date", fromDate);
      if (toDate) q.append("to_date", toDate);
      if (globalSearch.trim()) q.append("search", globalSearch.trim());
      if (statusFilter !== "ALL") q.append("status", statusFilter);
      if (gatewayFilter !== "ALL") q.append("gateway", gatewayFilter);
      if (paymentModeFilter !== "ALL") q.append("payment_mode", paymentModeFilter);

      const token = typeof window !== "undefined" ? (
        localStorage.getItem("p2p_access_token") ||
        localStorage.getItem("pay2pay_access_token") ||
        localStorage.getItem("access_token") || ""
      ) : "";

      const res = await fetch(`/api/v1/payin/reports/export?${q.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error("Export request failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PayIn_Report_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setExportAnchorEl(null);
      showToast("PayIn CSV exported successfully.");
    } catch (err) {
      console.error("Export failed:", err);
      showToast("Export failed. Please try again.");
    }
  };

  const handleExportPdf = () => {
    window.print();
    setExportAnchorEl(null);
  };

  const toggleColumn = (colKey: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(colKey)) {
        next.delete(colKey);
      } else {
        next.add(colKey);
      }
      return next;
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatDisplayDateRange = (from: string, to: string, preset: string) => {
    if (preset === "TODAY") {
      const d = new Date();
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    }
    if (preset === "YESTERDAY") {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    }
    if (!from && !to) return "All Time";
    return `${from || "Start"} to ${to || "Today"}`;
  };

  const openDetailsDrawer = async (item: PayinReportItem) => {
    setSelectedTxn(item);
    setDrawerOpen(true);
    try {
      const token = typeof window !== "undefined" ? (
        localStorage.getItem("p2p_access_token") ||
        localStorage.getItem("pay2pay_access_token") ||
        localStorage.getItem("p2p_admin_token") ||
        localStorage.getItem("p2p_retailer_token") ||
        localStorage.getItem("access_token") || ""
      ) : "";
      const res = await fetch(`/api/v1/payin/reports/${encodeURIComponent(item.tid)}/details`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        const detail = json.data || json;
        if (detail && detail.tid) {
          setSelectedTxn((prev) => prev ? { ...prev, ...detail } : detail);
        }
      }
    } catch {
      // Non-fatal: fallback to table row data
    }
  };

  const openReceiptModal = (item: PayinReportItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedTxn(item);
    setReceiptDialogOpen(true);
  };

  const formatDateTime = (dtStr?: string) => {
    if (!dtStr) return { date: "--", time: "--" };
    try {
      const d = new Date(dtStr);
      if (isNaN(d.getTime())) return { date: dtStr.split("T")[0] || dtStr, time: dtStr.split("T")[1]?.slice(0, 5) || "" };
      const date = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
      return { date, time };
    } catch {
      return { date: dtStr, time: "" };
    }
  };

  // Status Styling
  const getStatusBadge = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s === "SUCCESS" || s === "SETTLED" || s === "COMPLETED") {
      return {
        label: "SUCCESS",
        color: "#059669",
        bg: "rgba(16, 185, 129, 0.12)",
        border: "1px solid rgba(16, 185, 129, 0.3)",
      };
    }
    if (s === "PENDING" || s === "INITIATED" || s === "PROCESSING") {
      return {
        label: "PENDING",
        color: "#D97706",
        bg: "rgba(245, 158, 11, 0.12)",
        border: "1px solid rgba(245, 158, 11, 0.3)",
      };
    }
    if (s === "REVERSED" || s === "REFUNDED") {
      return {
        label: "REVERSED",
        color: "#7C3AED",
        bg: "rgba(124, 58, 237, 0.12)",
        border: "1px solid rgba(124, 58, 237, 0.3)",
      };
    }
    return {
      label: s || "FAILED",
      color: "#DC2626",
      bg: "rgba(239, 68, 68, 0.12)",
      border: "1px solid rgba(239, 68, 68, 0.3)",
    };
  };

  return (
    <Box sx={{ width: "100%", maxWidth: "100%", overflowX: "hidden", p: { xs: 1.5, sm: 2.5, md: 3 } }}>
      {/* ── 1. PAGE HEADER ── */}
      <Box sx={{ mb: 2.5 }}>
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" spacing={2}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, rgba(5, 150, 105, 0.15) 0%, rgba(4, 120, 87, 0.25) 100%)",
                  border: "1px solid rgba(5, 150, 105, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#059669",
                }}
              >
                <AssessmentIcon sx={{ fontSize: 22 }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900, color: "#111827", letterSpacing: "-0.5px" }}>
                  {title}
                </Typography>
                <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 600 }}>
                  {subtitle}
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Stack direction="row" alignItems="center" spacing={1.5}>
            {outlet?.outlet_name && (
              <Chip
                icon={<StorefrontIcon sx={{ fontSize: 16 }} />}
                label={outlet.outlet_name}
                size="small"
                sx={{
                  fontWeight: 700,
                  bgcolor: "rgba(5, 150, 105, 0.08)",
                  color: "#059669",
                  border: "1px solid rgba(5, 150, 105, 0.2)",
                  display: { xs: "none", sm: "inline-flex" },
                }}
              />
            )}
            <Chip
              label={`Last Updated: ${lastUpdatedTime}`}
              size="small"
              sx={{
                fontWeight: 600,
                fontSize: "11px",
                bgcolor: "#F3F4F6",
                color: "#4B5563",
                border: "1px solid #E5E7EB",
              }}
            />
          </Stack>
        </Stack>
      </Box>

      {/* ── 2. SUMMARY KPI CARDS (4-CARD GRID) ── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(1, 1fr)", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
          gap: { xs: 1.5, md: 2 },
          mb: 2.5,
        }}
      >
        {/* KPI 1: COLLECTION VOLUME */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: "14px",
            bgcolor: "#FFFFFF",
            border: "1px solid #E5E7EB",
            boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
            transition: "all 0.2s ease-in-out",
            "&:hover": { transform: "translateY(-2px)", borderColor: "#059669" },
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography sx={{ color: "#059669", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.8px" }}>
              COLLECTION VOLUME
            </Typography>
            <Box sx={{ width: 28, height: 28, borderRadius: "8px", bgcolor: "rgba(5, 150, 105, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#059669" }}>
              <TrendingUpIcon sx={{ fontSize: 16 }} />
            </Box>
          </Stack>

          {isLoading ? (
            <Skeleton variant="text" width="65%" height={36} />
          ) : (
            <Typography sx={{ fontWeight: 900, fontSize: { xs: "20px", md: "24px" }, lineHeight: 1.1, color: "#111827", mb: 0.3 }}>
              ₹{(summary?.total_volume ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          )}
          <Typography sx={{ color: "#6B7280", fontSize: "11.5px", fontWeight: 600 }}>
            {summary?.total_transactions ?? 0} PayIn Transactions
          </Typography>
        </Paper>

        {/* KPI 2: NET WALLET CREDIT */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: "14px",
            bgcolor: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderLeft: "4px solid #10B981",
            boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
            transition: "all 0.2s ease-in-out",
            "&:hover": { transform: "translateY(-2px)" },
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography sx={{ color: "#10B981", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.8px" }}>
              WALLET CREDIT
            </Typography>
            <Box sx={{ width: 28, height: 28, borderRadius: "8px", bgcolor: "rgba(16, 185, 129, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10B981" }}>
              <AccountBalanceWalletIcon sx={{ fontSize: 16 }} />
            </Box>
          </Stack>

          {isLoading ? (
            <Skeleton variant="text" width="65%" height={36} />
          ) : (
            <Typography sx={{ fontWeight: 900, fontSize: { xs: "20px", md: "24px" }, lineHeight: 1.1, color: "#10B981", mb: 0.3 }}>
              +₹{(summary?.total_retailer_credit ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          )}
          <Typography sx={{ color: "#6B7280", fontSize: "11.5px", fontWeight: 600 }}>
            Net Credited to Retailer Wallet
          </Typography>
        </Paper>

        {/* KPI 3: TOTAL CHARGES & GST */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: "14px",
            bgcolor: "#FFFFFF",
            border: "1px solid #E5E7EB",
            boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
            transition: "all 0.2s ease-in-out",
            "&:hover": { transform: "translateY(-2px)" },
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography sx={{ color: "#2563EB", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.8px" }}>
              CHARGES &amp; GST
            </Typography>
            <Box sx={{ width: 28, height: 28, borderRadius: "8px", bgcolor: "rgba(37, 99, 235, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563EB" }}>
              <ReceiptIcon sx={{ fontSize: 16 }} />
            </Box>
          </Stack>

          {isLoading ? (
            <Skeleton variant="text" width="65%" height={36} />
          ) : (
            <Typography sx={{ fontWeight: 900, fontSize: { xs: "20px", md: "24px" }, lineHeight: 1.1, color: "#2563EB", mb: 0.3 }}>
              ₹{(summary?.total_charges ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          )}
          <Typography sx={{ color: "#6B7280", fontSize: "11.5px", fontWeight: 600 }}>
            GST: ₹{(summary?.total_gst ?? 0).toFixed(2)} · MDR: ₹{(summary?.total_mdr ?? 0).toFixed(2)}
          </Typography>
        </Paper>

        {/* KPI 4: SUCCESS RATE */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: "14px",
            bgcolor: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderLeft: "4px solid #059669",
            boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
            transition: "all 0.2s ease-in-out",
            "&:hover": { transform: "translateY(-2px)" },
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography sx={{ color: "#059669", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.8px" }}>
              COLLECTION RATE
            </Typography>
            <Box sx={{ width: 28, height: 28, borderRadius: "8px", bgcolor: "rgba(5, 150, 105, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#059669" }}>
              <CheckCircleIcon sx={{ fontSize: 16 }} />
            </Box>
          </Stack>

          {isLoading ? (
            <Skeleton variant="text" width="65%" height={36} />
          ) : (
            <Typography sx={{ fontWeight: 900, fontSize: { xs: "20px", md: "24px" }, lineHeight: 1.1, color: "#059669", mb: 0.3 }}>
              {summary?.success_rate ?? 0}%
            </Typography>
          )}
          <Typography sx={{ color: "#6B7280", fontSize: "11.5px", fontWeight: 600 }}>
            {summary?.successful_transactions ?? 0} Settled · {summary?.pending_transactions ?? 0} Pending · {summary?.failed_transactions ?? 0} Failed
          </Typography>
        </Paper>
      </Box>

      {/* ── 3. ENTERPRISE DATE RANGE BAR ── */}
      <Paper
        elevation={0}
        sx={{
          p: 1.2,
          px: { xs: 1.5, sm: 2 },
          borderRadius: "12px",
          bgcolor: "#FFFFFF",
          border: "1px solid #E5E7EB",
          boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
          mb: 2,
          display: "flex",
          flexDirection: { xs: "column", lg: "row" },
          alignItems: { xs: "flex-start", lg: "center" },
          justifyContent: "space-between",
          gap: 1.5,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ overflowX: "auto", maxWidth: "100%", width: "100%", pb: { xs: 0.5, lg: 0 } }}>
          <Stack direction="row" alignItems="center" spacing={0.8} sx={{ color: "#059669", mr: 1, flexShrink: 0 }}>
            <CalendarMonthIcon sx={{ fontSize: 18 }} />
            <Typography sx={{ fontSize: "12.5px", fontWeight: 800, color: "#059669", whiteSpace: "nowrap" }}>
              Date Range:
            </Typography>
          </Stack>

          {[
            { key: "TODAY", label: "Today" },
            { key: "YESTERDAY", label: "Yesterday" },
            { key: "7D", label: "7D" },
            { key: "30D", label: "30D" },
            { key: "60D", label: "60D" },
            { key: "90D", label: "90D" },
            { key: "ALL", label: "All Time" },
            { key: "CUSTOM", label: "Custom Range" },
          ].map((preset) => {
            const isSelected = activePreset === preset.key;
            return (
              <Button
                key={preset.key}
                size="small"
                onClick={() => {
                  if (preset.key === "CUSTOM") {
                    setCustomDateOpen(true);
                  } else {
                    handleDatePreset(preset.key);
                  }
                }}
                sx={{
                  px: 1.6,
                  py: 0.5,
                  minWidth: "auto",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: isSelected ? 800 : 600,
                  textTransform: "none",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  bgcolor: isSelected ? "#059669" : "#F3F4F6",
                  color: isSelected ? "#FFFFFF" : "#4B5563",
                  border: isSelected ? "1px solid #059669" : "1px solid #E5E7EB",
                  "&:hover": {
                    bgcolor: isSelected ? "#047857" : "#E5E7EB",
                  },
                }}
              >
                {preset.label}
              </Button>
            );
          })}
        </Stack>

        <Typography sx={{ fontSize: "11.5px", color: "#6B7280", fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap" }}>
          Selected Period: <strong style={{ color: "#059669" }}>{formatDisplayDateRange(fromDate, toDate, activePreset)}</strong>
        </Typography>
      </Paper>

      {/* ── 4. MASTER CONTROLS TOOLBAR ── */}
      <Paper
        elevation={0}
        sx={{
          p: 1.2,
          px: { xs: 1.5, sm: 2 },
          borderRadius: "12px",
          bgcolor: "#FFFFFF",
          border: "1px solid #E5E7EB",
          boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
          mb: 2,
          display: "flex",
          flexDirection: { xs: "column", lg: "row" },
          alignItems: { xs: "stretch", lg: "center" },
          justifyContent: "space-between",
          gap: 1.5,
        }}
      >
        {/* Search Input */}
        <Box sx={{ flex: 1, minWidth: { xs: "100%", lg: "320px" }, maxWidth: { lg: "440px" } }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search TID, Order ID, Mobile, Customer..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleApplyFilters();
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#059669", fontSize: 18 }} />
                </InputAdornment>
              ),
              endAdornment: globalSearch ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setGlobalSearch("")}>
                    <ClearIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
              sx: {
                bgcolor: "#F9FAFB",
                borderRadius: "8px",
                fontSize: "12.5px",
                height: "38px",
              },
            }}
          />
        </Box>

        {/* Action Controls & Explicit Apply Button */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ flexWrap: "wrap", justifyContent: { xs: "flex-start", lg: "flex-end" } }}>
          {/* Requirement 7: Explicit Apply Button */}
          <Button
            size="small"
            variant="contained"
            onClick={handleApplyFilters}
            disabled={isLoading}
            startIcon={<PlayArrowIcon sx={{ fontSize: 16 }} />}
            sx={{
              height: "38px",
              fontSize: "12.5px",
              fontWeight: 800,
              textTransform: "none",
              borderRadius: "8px",
              bgcolor: "#059669",
              color: "#FFFFFF",
              boxShadow: "0 2px 6px rgba(5, 150, 105, 0.25)",
              "&:hover": { bgcolor: "#047857" },
            }}
          >
            Apply Filters
          </Button>

          {/* Filter Popover Button */}
          <Button
            size="small"
            variant="outlined"
            onClick={(e) => setFilterAnchorEl(e.currentTarget)}
            startIcon={<FilterListIcon sx={{ fontSize: 16, color: statusFilter !== "ALL" || gatewayFilter !== "ALL" || paymentModeFilter !== "ALL" ? "#059669" : "#6B7280" }} />}
            sx={{
              height: "38px",
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "none",
              borderRadius: "8px",
              color: statusFilter !== "ALL" || gatewayFilter !== "ALL" || paymentModeFilter !== "ALL" ? "#059669" : "#374151",
              borderColor: statusFilter !== "ALL" || gatewayFilter !== "ALL" || paymentModeFilter !== "ALL" ? "#059669" : "#D1D5DB",
              bgcolor: statusFilter !== "ALL" || gatewayFilter !== "ALL" || paymentModeFilter !== "ALL" ? "rgba(5, 150, 105, 0.08)" : "#FFFFFF",
            }}
          >
            Filter {statusFilter !== "ALL" || gatewayFilter !== "ALL" || paymentModeFilter !== "ALL" ? "•" : ""}
          </Button>

          {/* Density */}
          <Button
            size="small"
            variant="outlined"
            onClick={(e) => setDensityAnchorEl(e.currentTarget)}
            startIcon={<TableRowsIcon sx={{ fontSize: 16, color: "#059669" }} />}
            sx={{
              height: "38px",
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "none",
              borderRadius: "8px",
              color: "#374151",
              borderColor: "#D1D5DB",
            }}
          >
            {density === "compact" ? "Compact" : density === "comfortable" ? "Comfortable" : "Medium"}
          </Button>

          {/* Columns */}
          <Button
            size="small"
            variant="outlined"
            onClick={(e) => setColumnsAnchorEl(e.currentTarget)}
            startIcon={<ViewColumnIcon sx={{ fontSize: 16, color: "#059669" }} />}
            sx={{
              height: "38px",
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "none",
              borderRadius: "8px",
              color: "#374151",
              borderColor: "#D1D5DB",
            }}
          >
            Columns
          </Button>

          {/* Export */}
          <Button
            size="small"
            variant="outlined"
            onClick={(e) => setExportAnchorEl(e.currentTarget)}
            startIcon={<FileDownloadIcon sx={{ fontSize: 16, color: "#059669" }} />}
            endIcon={<ArrowDropDownIcon sx={{ fontSize: 16 }} />}
            sx={{
              height: "38px",
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "none",
              borderRadius: "8px",
              color: "#374151",
              borderColor: "#D1D5DB",
            }}
          >
            Export
          </Button>

          {/* Refresh */}
          <Tooltip title="Refresh Data (Single Request)">
            <IconButton
              size="small"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              sx={{
                width: 38,
                height: 38,
                borderRadius: "8px",
                border: "1px solid #D1D5DB",
                color: "#059669",
              }}
            >
              <RefreshIcon sx={{ fontSize: 18, animation: isRefreshing || isLoading ? "spin 0.8s linear infinite" : "none" }} />
            </IconButton>
          </Tooltip>

          {/* Fullscreen */}
          <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            <IconButton
              size="small"
              onClick={toggleFullscreen}
              sx={{
                width: 38,
                height: 38,
                borderRadius: "8px",
                border: "1px solid #D1D5DB",
                color: "#6B7280",
              }}
            >
              {isFullscreen ? <FullscreenExitIcon sx={{ fontSize: 18 }} /> : <FullscreenIcon sx={{ fontSize: 18 }} />}
            </IconButton>
          </Tooltip>

          {/* Record Count */}
          <Typography sx={{ fontSize: "12px", color: "#6B7280", fontWeight: 700, pl: 1, whiteSpace: "nowrap" }}>
            Showing <strong style={{ color: "#111827" }}>{hasLoaded ? totalRecords : 0}</strong> records
          </Typography>
        </Stack>
      </Paper>

      {/* Density Menu */}
      <Menu
        anchorEl={densityAnchorEl}
        open={Boolean(densityAnchorEl)}
        onClose={() => setDensityAnchorEl(null)}
        slotProps={{ paper: { sx: { borderRadius: "10px", width: 150, p: 0.5 } } }}
      >
        <MenuItem onClick={() => { setDensity("compact"); setDensityAnchorEl(null); }} sx={{ fontSize: "12px", fontWeight: density === "compact" ? 800 : 500 }}>
          Compact
        </MenuItem>
        <MenuItem onClick={() => { setDensity("medium"); setDensityAnchorEl(null); }} sx={{ fontSize: "12px", fontWeight: density === "medium" ? 800 : 500 }}>
          Medium
        </MenuItem>
        <MenuItem onClick={() => { setDensity("comfortable"); setDensityAnchorEl(null); }} sx={{ fontSize: "12px", fontWeight: density === "comfortable" ? 800 : 500 }}>
          Comfortable
        </MenuItem>
      </Menu>

      {/* Columns Chooser Menu */}
      <Menu
        anchorEl={columnsAnchorEl}
        open={Boolean(columnsAnchorEl)}
        onClose={() => setColumnsAnchorEl(null)}
        slotProps={{ paper: { sx: { borderRadius: "10px", width: 220, p: 1, maxHeight: 380 } } }}
      >
        <Typography sx={{ fontSize: "11px", fontWeight: 800, color: "#059669", textTransform: "uppercase", px: 1, mb: 0.5 }}>
          Toggle Columns
        </Typography>
        <Divider sx={{ my: 0.5 }} />
        {[
          { id: "s_no", label: "S.No" },
          { id: "tid", label: "Transaction ID" },
          { id: "reference_id", label: "Reference / Order ID" },
          { id: "retailer", label: "Retailer / Outlet" },
          { id: "company", label: "Company" },
          { id: "gateway", label: "Gateway (G-1/G-2)" },
          { id: "payment_mode", label: "Payment Method" },
          { id: "amount", label: "Base Amount (₹)" },
          { id: "charges", label: "Charges & MDR (₹)" },
          { id: "gst", label: "GST (₹)" },
          { id: "total_amount", label: "Total Amount (₹)" },
          { id: "wallet_credit", label: "Wallet Credit (₹)" },
          { id: "status", label: "Status" },
          { id: "date_time", label: "Date & Time" },
        ].map((col) => (
          <MenuItem
            key={col.id}
            onClick={() => toggleColumn(col.id)}
            sx={{ fontSize: "12px", py: 0.5, px: 1, display: "flex", alignItems: "center", gap: 1 }}
          >
            <Checkbox size="small" checked={!hiddenColumns.has(col.id)} sx={{ p: 0.2, "&.Mui-checked": { color: "#059669" } }} />
            <Typography sx={{ fontSize: "12px", fontWeight: !hiddenColumns.has(col.id) ? 700 : 400 }}>
              {col.label}
            </Typography>
          </MenuItem>
        ))}
      </Menu>

      {/* Filter Popover */}
      <Popover
        anchorEl={filterAnchorEl}
        open={Boolean(filterAnchorEl)}
        onClose={() => setFilterAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{ paper: { sx: { borderRadius: "12px", width: 300, p: 2, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" } } }}
      >
        <Typography sx={{ fontSize: "13px", fontWeight: 800, color: "#111827", mb: 1.5 }}>
          Filter PayIn Records
        </Typography>
        <Stack spacing={1.5}>
          {/* Status */}
          <Box>
            <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#059669", mb: 0.5 }}>STATUS</Typography>
            <FormControl fullWidth size="small">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ height: 36, fontSize: "12px" }}
              >
                <MenuItem value="ALL">All Statuses</MenuItem>
                <MenuItem value="SUCCESS">Success</MenuItem>
                <MenuItem value="PENDING">Pending / Processing</MenuItem>
                <MenuItem value="FAILED">Failed</MenuItem>
                <MenuItem value="REVERSED">Reversed</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Gateway (Customer-facing labels G-1 / G-2 only) */}
          <Box>
            <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#059669", mb: 0.5 }}>GATEWAY</Typography>
            <FormControl fullWidth size="small">
              <Select
                value={gatewayFilter}
                onChange={(e) => setGatewayFilter(e.target.value)}
                sx={{ height: 36, fontSize: "12px" }}
              >
                <MenuItem value="ALL">All Gateways</MenuItem>
                <MenuItem value="G-1">Gateway G-1</MenuItem>
                <MenuItem value="G-2">Gateway G-2</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Payment Method */}
          <Box>
            <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#059669", mb: 0.5 }}>PAYMENT METHOD</Typography>
            <FormControl fullWidth size="small">
              <Select
                value={paymentModeFilter}
                onChange={(e) => setPaymentModeFilter(e.target.value)}
                sx={{ height: 36, fontSize: "12px" }}
              >
                <MenuItem value="ALL">All Methods</MenuItem>
                <MenuItem value="UPI">UPI</MenuItem>
                <MenuItem value="QR">QR Code</MenuItem>
                <MenuItem value="NETBANKING">Net Banking</MenuItem>
                <MenuItem value="CARD">Debit / Credit Card</MenuItem>
                <MenuItem value="POS">POS Terminal</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Button
              fullWidth
              size="small"
              variant="contained"
              onClick={() => {
                handleApplyFilters();
                setFilterAnchorEl(null);
              }}
              sx={{ bgcolor: "#059669", color: "#FFFFFF", fontWeight: 700, textTransform: "none" }}
            >
              Apply
            </Button>
            <Button
              fullWidth
              size="small"
              variant="outlined"
              onClick={() => {
                handleResetFilters();
                setFilterAnchorEl(null);
              }}
              sx={{ color: "#DC2626", borderColor: "#FCA5A5", textTransform: "none" }}
            >
              Reset
            </Button>
          </Stack>
        </Stack>
      </Popover>

      {/* Custom Date Range Dialog */}
      <Dialog
        open={customDateOpen}
        onClose={() => setCustomDateOpen(false)}
        slotProps={{ paper: { sx: { borderRadius: "14px", p: 1, width: 340 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: "15px" }}>Select Custom Date Range</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: "8px !important" }}>
          <TextField
            label="From Date"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
          />
          <TextField
            label="To Date"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setCustomDateOpen(false)} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (customFrom) setFromDate(customFrom);
              if (customTo) setToDate(customTo);
              setActivePreset("CUSTOM");
              setCustomDateOpen(false);
              setPage(0);
            }}
            sx={{
              bgcolor: "#059669",
              color: "#FFFFFF",
              textTransform: "none",
              fontWeight: 800,
            }}
          >
            Apply Range
          </Button>
        </DialogActions>
      </Dialog>

      {/* Export Dropdown Menu */}
      <Menu
        anchorEl={exportAnchorEl}
        open={Boolean(exportAnchorEl)}
        onClose={() => setExportAnchorEl(null)}
        slotProps={{ paper: { sx: { borderRadius: "10px", width: 200 } } }}
      >
        <MenuItem onClick={handleExportCsv} sx={{ fontSize: "12.5px", gap: 1.5, py: 1 }}>
          <TableChartIcon sx={{ fontSize: 17, color: "#059669" }} />
          Export to CSV / Excel
        </MenuItem>
        <MenuItem onClick={handleExportPdf} sx={{ fontSize: "12.5px", gap: 1.5, py: 1 }}>
          <PrintIcon sx={{ fontSize: 17, color: "#2563EB" }} />
          Print / Save as PDF
        </MenuItem>
      </Menu>

      {/* ── 5. ENTERPRISE DATA TABLE (DESKTOP) ── */}
      <Box sx={{ display: { xs: "none", md: "block" } }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: "14px",
            bgcolor: "#FFFFFF",
            border: "1px solid #E5E7EB",
            boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
            overflow: "hidden",
            width: "100%",
          }}
        >
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table sx={{ minWidth: 1100, tableLayout: "auto" }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                  <TableCell padding="checkbox" sx={{ py: 1.2, pl: 2 }}>
                    <Checkbox
                      size="small"
                      checked={items.length > 0 && selectedIds.size === items.length}
                      indeterminate={selectedIds.size > 0 && selectedIds.size < items.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(new Set(items.map((_, i) => String(i))));
                        } else {
                          setSelectedIds(new Set());
                        }
                      }}
                      sx={{ "&.Mui-checked": { color: "#059669" } }}
                    />
                  </TableCell>
                  {!hiddenColumns.has("s_no") && (
                    <TableCell sx={{ color: "#059669", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", py: 1.4, whiteSpace: "nowrap" }}>
                      S.NO
                    </TableCell>
                  )}
                  {!hiddenColumns.has("tid") && (
                    <TableCell sx={{ color: "#059669", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", py: 1.4, whiteSpace: "nowrap" }}>
                      TRANSACTION ID
                    </TableCell>
                  )}
                  {!hiddenColumns.has("reference_id") && (
                    <TableCell sx={{ color: "#059669", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", py: 1.4, whiteSpace: "nowrap" }}>
                      REF / ORDER ID
                    </TableCell>
                  )}
                  {!hiddenColumns.has("retailer") && (
                    <TableCell sx={{ color: "#059669", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", py: 1.4, whiteSpace: "nowrap" }}>
                      RETAILER / OUTLET
                    </TableCell>
                  )}
                  {!hiddenColumns.has("company") && (
                    <TableCell sx={{ color: "#059669", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", py: 1.4, whiteSpace: "nowrap" }}>
                      COMPANY
                    </TableCell>
                  )}
                  {!hiddenColumns.has("gateway") && (
                    <TableCell sx={{ color: "#059669", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", py: 1.4, whiteSpace: "nowrap" }}>
                      GATEWAY
                    </TableCell>
                  )}
                  {!hiddenColumns.has("payment_mode") && (
                    <TableCell sx={{ color: "#059669", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", py: 1.4, whiteSpace: "nowrap" }}>
                      METHOD
                    </TableCell>
                  )}
                  {!hiddenColumns.has("amount") && (
                    <TableCell sx={{ color: "#059669", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", py: 1.4, textAlign: "right", whiteSpace: "nowrap" }}>
                      AMOUNT (₹)
                    </TableCell>
                  )}
                  {!hiddenColumns.has("charges") && (
                    <TableCell sx={{ color: "#059669", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", py: 1.4, textAlign: "right", whiteSpace: "nowrap" }}>
                      CHARGES (₹)
                    </TableCell>
                  )}
                  {!hiddenColumns.has("gst") && (
                    <TableCell sx={{ color: "#059669", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", py: 1.4, textAlign: "right", whiteSpace: "nowrap" }}>
                      GST (₹)
                    </TableCell>
                  )}
                  {!hiddenColumns.has("total_amount") && (
                    <TableCell sx={{ color: "#059669", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", py: 1.4, textAlign: "right", whiteSpace: "nowrap" }}>
                      TOTAL AMOUNT (₹)
                    </TableCell>
                  )}
                  {!hiddenColumns.has("wallet_credit") && (
                    <TableCell sx={{ color: "#059669", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", py: 1.4, textAlign: "right", whiteSpace: "nowrap" }}>
                      WALLET CREDIT (₹)
                    </TableCell>
                  )}
                  {!hiddenColumns.has("status") && (
                    <TableCell sx={{ color: "#059669", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", py: 1.4, whiteSpace: "nowrap" }}>
                      STATUS
                    </TableCell>
                  )}
                  {!hiddenColumns.has("date_time") && (
                    <TableCell sx={{ color: "#059669", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", py: 1.4, whiteSpace: "nowrap" }}>
                      DATE &amp; TIME
                    </TableCell>
                  )}
                  <TableCell sx={{ color: "#059669", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", py: 1.4, pr: 2, textAlign: "center", whiteSpace: "nowrap" }}>
                    ACTION
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  [1, 2, 3, 4, 5].map((n) => (
                    <TableRow key={n}>
                      <TableCell colSpan={16} sx={{ py: 2.5 }}>
                        <Skeleton variant="text" height={26} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : !hasLoaded ? (
                  /* Initial State before user clicks Apply */
                  <TableRow>
                    <TableCell colSpan={16} align="center" sx={{ py: 8 }}>
                      <AssessmentIcon sx={{ fontSize: 48, color: "#9CA3AF", mb: 1.5 }} />
                      <Typography sx={{ fontWeight: 800, fontSize: "16px", color: "#111827" }}>
                        Ready to Generate PayIn Report
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#6B7280", mt: 0.5, mb: 2 }}>
                        Select your desired date range and filters above, then click <strong>Apply Filters</strong> to load transactions.
                      </Typography>
                      <Button
                        variant="contained"
                        onClick={handleApplyFilters}
                        startIcon={<PlayArrowIcon />}
                        sx={{ bgcolor: "#059669", color: "#FFFFFF", fontWeight: 800, textTransform: "none", borderRadius: "8px" }}
                      >
                        Generate Report Now
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={16} align="center" sx={{ py: 8 }}>
                      <ReceiptIcon sx={{ fontSize: 44, color: "#9CA3AF", mb: 1 }} />
                      <Typography sx={{ fontWeight: 800, fontSize: "15px", color: "#111827" }}>
                        No PayIn Records Found
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#6B7280", display: "block", mt: 0.5 }}>
                        No transactions match your selected filter criteria.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((row, idx) => {
                    const sNo = page * rowsPerPage + idx + 1;
                    const stBadge = getStatusBadge(row.status);
                    const dt = formatDateTime(row.date_time || row.created_at);

                    return (
                      <TableRow
                        key={row.id || row.tid || idx}
                        hover
                        onClick={() => openDetailsDrawer(row)}
                        sx={{
                          cursor: "pointer",
                          height: density === "compact" ? 40 : density === "comfortable" ? 58 : 48,
                          bgcolor: selectedIds.has(String(idx)) ? "rgba(5, 150, 105, 0.04)" : "inherit",
                          "&:hover": { bgcolor: "rgba(5, 150, 105, 0.04)" },
                        }}
                      >
                        <TableCell padding="checkbox" sx={{ pl: 2 }} onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            size="small"
                            checked={selectedIds.has(String(idx))}
                            onChange={(e) => {
                              setSelectedIds((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(String(idx));
                                else next.delete(String(idx));
                                return next;
                              });
                            }}
                            sx={{ "&.Mui-checked": { color: "#059669" } }}
                          />
                        </TableCell>

                        {!hiddenColumns.has("s_no") && (
                          <TableCell sx={{ fontSize: "12px", color: "#6B7280", fontWeight: 600 }}>
                            {sNo}
                          </TableCell>
                        )}

                        {!hiddenColumns.has("tid") && (
                          <TableCell sx={{ fontSize: "12px", fontWeight: 700, fontFamily: "monospace", color: "#111827" }}>
                            {row.tid}
                          </TableCell>
                        )}

                        {!hiddenColumns.has("reference_id") && (
                          <TableCell sx={{ fontSize: "12px", fontFamily: "monospace", color: "#4B5563" }}>
                            {row.reference_id || row.merchant_ref_id || "--"}
                          </TableCell>
                        )}

                        {!hiddenColumns.has("retailer") && (
                          <TableCell sx={{ fontSize: "12px", fontWeight: 600, color: "#111827" }}>
                            {row.retailer_name}
                          </TableCell>
                        )}

                        {!hiddenColumns.has("company") && (
                          <TableCell sx={{ fontSize: "12px", color: "#4B5563" }}>
                            {row.company_name}
                          </TableCell>
                        )}

                        {!hiddenColumns.has("gateway") && (
                          <TableCell sx={{ fontSize: "12px", fontWeight: 700, color: "#059669" }}>
                            {/* Requirement 3: Gateway customer-facing labels G-1 / G-2 only */}
                            <Chip
                              label={row.gateway || "G-1"}
                              size="small"
                              sx={{
                                fontWeight: 800,
                                fontSize: "10.5px",
                                height: 22,
                                bgcolor: "rgba(5, 150, 105, 0.08)",
                                color: "#059669",
                                border: "1px solid rgba(5, 150, 105, 0.25)",
                              }}
                            />
                          </TableCell>
                        )}

                        {!hiddenColumns.has("payment_mode") && (
                          <TableCell sx={{ fontSize: "12px", color: "#374151", fontWeight: 600 }}>
                            {row.payment_mode || "UPI"}
                          </TableCell>
                        )}

                        {!hiddenColumns.has("amount") && (
                          <TableCell sx={{ fontSize: "12px", fontWeight: 700, textAlign: "right", color: "#111827", fontFamily: "monospace" }}>
                            ₹{Number(row.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </TableCell>
                        )}

                        {!hiddenColumns.has("charges") && (
                          <TableCell sx={{ fontSize: "12px", textAlign: "right", color: "#4B5563", fontFamily: "monospace" }}>
                            ₹{Number(row.total_charges || 0).toFixed(2)}
                          </TableCell>
                        )}

                        {!hiddenColumns.has("gst") && (
                          <TableCell sx={{ fontSize: "12px", textAlign: "right", color: "#4B5563", fontFamily: "monospace" }}>
                            ₹{Number(row.gst || row.tax_amount || 0).toFixed(2)}
                          </TableCell>
                        )}

                        {!hiddenColumns.has("total_amount") && (
                          <TableCell sx={{ fontSize: "12px", fontWeight: 700, textAlign: "right", color: "#2563EB", fontFamily: "monospace" }}>
                            ₹{Number(row.total_amount || row.customer_payable || row.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </TableCell>
                        )}

                        {!hiddenColumns.has("wallet_credit") && (
                          <TableCell sx={{ fontSize: "12px", fontWeight: 800, textAlign: "right", color: "#10B981", fontFamily: "monospace" }}>
                            +₹{Number(row.retailer_credit || row.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </TableCell>
                        )}

                        {!hiddenColumns.has("status") && (
                          <TableCell>
                            <Chip
                              label={stBadge.label}
                              size="small"
                              sx={{
                                fontWeight: 800,
                                fontSize: "10.5px",
                                height: 22,
                                color: stBadge.color,
                                bgcolor: stBadge.bg,
                                border: stBadge.border,
                              }}
                            />
                          </TableCell>
                        )}

                        {!hiddenColumns.has("date_time") && (
                          <TableCell sx={{ fontSize: "11.5px", whiteSpace: "nowrap" }}>
                            <Typography sx={{ fontSize: "12px", color: "#111827", fontWeight: 600 }}>{dt.date}</Typography>
                            <Typography sx={{ fontSize: "10.5px", color: "#6B7280" }}>{dt.time}</Typography>
                          </TableCell>
                        )}

                        <TableCell sx={{ textAlign: "center", pr: 2 }} onClick={(e) => e.stopPropagation()}>
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            <Tooltip title="View Transaction Breakdown">
                              <IconButton size="small" onClick={() => openDetailsDrawer(row)}>
                                <VisibilityIcon sx={{ fontSize: 16, color: "#059669" }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="View Verified Receipt">
                              <IconButton size="small" onClick={(e) => openReceiptModal(row, e)}>
                                <PrintIcon sx={{ fontSize: 16, color: "#2563EB" }} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Footer Totals Banner */}
          {hasLoaded && items.length > 0 && footerTotals && (
            <Box sx={{ p: 1.5, px: 2, bgcolor: "#F9FAFB", borderTop: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
              <Typography sx={{ fontSize: "12px", fontWeight: 700, color: "#374151" }}>
                Filtered Total: <strong style={{ color: "#059669" }}>{footerTotals.total_transactions} Orders</strong>
              </Typography>
              <Stack direction="row" spacing={2.5}>
                <Typography sx={{ fontSize: "12px", color: "#4B5563" }}>
                  Volume: <strong style={{ color: "#111827" }}>₹{footerTotals.total_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
                </Typography>
                <Typography sx={{ fontSize: "12px", color: "#4B5563" }}>
                  Total Charges: <strong style={{ color: "#2563EB" }}>₹{footerTotals.total_charges.toFixed(2)}</strong>
                </Typography>
                <Typography sx={{ fontSize: "12px", color: "#4B5563" }}>
                  Total GST: <strong style={{ color: "#2563EB" }}>₹{footerTotals.total_gst.toFixed(2)}</strong>
                </Typography>
                <Typography sx={{ fontSize: "12px", color: "#4B5563" }}>
                  Wallet Credit: <strong style={{ color: "#10B981" }}>+₹{footerTotals.total_retailer_credit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
                </Typography>
              </Stack>
            </Box>
          )}

          {/* Pagination Controls */}
          <TablePagination
            component="div"
            count={hasLoaded ? totalRecords : 0}
            page={page}
            onPageChange={(_, newPage) => {
              setPage(newPage);
              // Trigger fetch on page navigation
              setTimeout(executeReportFetch, 10);
            }}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
              setTimeout(executeReportFetch, 10);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
            sx={{ borderTop: "1px solid #E5E7EB" }}
          />
        </Paper>
      </Box>

      {/* ── 6. MOBILE RESPONSIVE CARDS VIEW (xs: block, md: none) ── */}
      <Box sx={{ display: { xs: "block", md: "none" } }}>
        {!hasLoaded ? (
          <Paper elevation={0} sx={{ p: 4, textAlign: "center", borderRadius: "12px", bgcolor: "#FFFFFF", border: "1px solid #E5E7EB" }}>
            <AssessmentIcon sx={{ fontSize: 40, color: "#9CA3AF", mb: 1 }} />
            <Typography sx={{ fontWeight: 800, fontSize: "15px", color: "#111827" }}>
              Ready to Generate Report
            </Typography>
            <Typography variant="caption" sx={{ color: "#6B7280", display: "block", mt: 0.5, mb: 2 }}>
              Tap Apply Filters to load transactions
            </Typography>
            <Button variant="contained" onClick={handleApplyFilters} sx={{ bgcolor: "#059669", color: "#FFFFFF", fontWeight: 700 }}>
              Apply Filters
            </Button>
          </Paper>
        ) : items.length === 0 ? (
          <Paper elevation={0} sx={{ p: 4, textAlign: "center", borderRadius: "12px", bgcolor: "#FFFFFF", border: "1px solid #E5E7EB" }}>
            <Typography sx={{ fontWeight: 700, color: "#6B7280" }}>No transactions found</Typography>
          </Paper>
        ) : (
          <Stack spacing={1.5}>
            {items.map((row, idx) => {
              const stBadge = getStatusBadge(row.status);
              const isExpanded = expandedCards[row.tid || String(idx)];
              const dt = formatDateTime(row.date_time || row.created_at);

              return (
                <Paper
                  key={row.id || row.tid || idx}
                  elevation={0}
                  onClick={() => openDetailsDrawer(row)}
                  sx={{
                    p: 2,
                    borderRadius: "12px",
                    bgcolor: "#FFFFFF",
                    border: "1px solid #E5E7EB",
                    cursor: "pointer",
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Box>
                      <Typography sx={{ fontSize: "12px", fontWeight: 800, color: "#111827", fontFamily: "monospace" }}>
                        {row.tid}
                      </Typography>
                      <Typography sx={{ fontSize: "11px", color: "#6B7280" }}>{dt.date} · {dt.time}</Typography>
                    </Box>
                    <Chip label={stBadge.label} size="small" sx={{ fontSize: "10px", height: 20, color: stBadge.color, bgcolor: stBadge.bg, border: stBadge.border, fontWeight: 800 }} />
                  </Stack>

                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1.5 }}>
                    <Box>
                      <Typography sx={{ fontSize: "10.5px", color: "#6B7280", textTransform: "uppercase", fontWeight: 700 }}>COLLECTION</Typography>
                      <Typography sx={{ fontSize: "16px", fontWeight: 900, color: "#111827", fontFamily: "monospace" }}>
                        ₹{Number(row.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "right" }}>
                      <Typography sx={{ fontSize: "10.5px", color: "#059669", textTransform: "uppercase", fontWeight: 700 }}>WALLET CREDIT</Typography>
                      <Typography sx={{ fontSize: "16px", fontWeight: 900, color: "#10B981", fontFamily: "monospace" }}>
                        +₹{Number(row.retailer_credit || row.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                  </Stack>

                  <Divider sx={{ my: 1.5 }} />

                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography sx={{ fontSize: "11px", color: "#4B5563" }}>
                      Gateway: <strong>{row.gateway || "G-1"}</strong> · {row.payment_mode || "UPI"}
                    </Typography>
                    <Button size="small" onClick={(e) => { e.stopPropagation(); openDetailsDrawer(row); }} sx={{ fontSize: "11px", textTransform: "none", color: "#059669", fontWeight: 700 }}>
                      View Details →
                    </Button>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Box>

      {/* ── 7. TRANSACTION DETAIL SLIDE-OUT DRAWER ── */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 460 },
            p: 3,
            bgcolor: "#FFFFFF",
          },
        }}
      >
        {selectedTxn && (
          <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            {/* Drawer Header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ pb: 2, borderBottom: "1px solid #E5E7EB" }}>
              <Box>
                <Typography sx={{ fontSize: "11px", color: "#059669", fontWeight: 800, textTransform: "uppercase" }}>
                  TRANSACTION BREAKDOWN
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 900, color: "#111827", fontFamily: "monospace" }}>
                  {selectedTxn.tid}
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setDrawerOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Stack>

            {/* Scrollable Content */}
            <Box sx={{ flex: 1, overflowY: "auto", py: 2.5 }}>
              <Stack spacing={2.5}>
                {/* Status Card */}
                <Paper elevation={0} sx={{ p: 2, borderRadius: "10px", bgcolor: "#F9FAFB", border: "1px solid #E5E7EB" }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography sx={{ fontSize: "12px", color: "#6B7280", fontWeight: 600 }}>Payment Status</Typography>
                    <Chip
                      label={selectedTxn.status}
                      size="small"
                      sx={{
                        fontWeight: 800,
                        color: getStatusBadge(selectedTxn.status).color,
                        bgcolor: getStatusBadge(selectedTxn.status).bg,
                        border: getStatusBadge(selectedTxn.status).border,
                      }}
                    />
                  </Stack>
                  <Typography sx={{ fontSize: "22px", fontWeight: 900, color: "#111827", mt: 1, fontFamily: "monospace" }}>
                    ₹{Number(selectedTxn.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Typography>
                  <Typography sx={{ fontSize: "11px", color: "#6B7280", mt: 0.5 }}>
                    Reference ID: {selectedTxn.reference_id || selectedTxn.merchant_ref_id || "--"}
                  </Typography>
                </Paper>

                {/* Financial Ledger Breakdown */}
                <Box>
                  <Typography sx={{ fontSize: "12px", fontWeight: 800, color: "#059669", textTransform: "uppercase", mb: 1 }}>
                    Financial Breakdown
                  </Typography>
                  <Paper elevation={0} sx={{ p: 1.5, borderRadius: "10px", bgcolor: "#FFFFFF", border: "1px solid #E5E7EB" }}>
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ fontSize: "12px", color: "#6B7280" }}>Base Collection Amount</Typography>
                        <Typography sx={{ fontSize: "12px", fontWeight: 700, fontFamily: "monospace" }}>
                          ₹{Number(selectedTxn.amount || 0).toFixed(2)}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ fontSize: "12px", color: "#6B7280" }}>MDR Charges</Typography>
                        <Typography sx={{ fontSize: "12px", fontWeight: 600, fontFamily: "monospace" }}>
                          ₹{Number(selectedTxn.mdr_amount || 0).toFixed(2)}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ fontSize: "12px", color: "#6B7280" }}>GST on Charges (18%)</Typography>
                        <Typography sx={{ fontSize: "12px", fontWeight: 600, fontFamily: "monospace" }}>
                          ₹{Number(selectedTxn.gst || selectedTxn.tax_amount || 0).toFixed(2)}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ fontSize: "12px", color: "#6B7280" }}>Total Surcharges</Typography>
                        <Typography sx={{ fontSize: "12px", fontWeight: 700, color: "#2563EB", fontFamily: "monospace" }}>
                          ₹{Number(selectedTxn.total_charges || 0).toFixed(2)}
                        </Typography>
                      </Stack>
                      <Divider sx={{ my: 0.5 }} />
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ fontSize: "12.5px", fontWeight: 800, color: "#111827" }}>Total Customer Payable</Typography>
                        <Typography sx={{ fontSize: "12.5px", fontWeight: 900, color: "#2563EB", fontFamily: "monospace" }}>
                          ₹{Number(selectedTxn.total_amount || selectedTxn.customer_payable || selectedTxn.amount || 0).toFixed(2)}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ fontSize: "12.5px", fontWeight: 800, color: "#059669" }}>Net Wallet Credited</Typography>
                        <Typography sx={{ fontSize: "13px", fontWeight: 900, color: "#10B981", fontFamily: "monospace" }}>
                          +₹{Number(selectedTxn.retailer_credit || selectedTxn.amount || 0).toFixed(2)}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Paper>
                </Box>

                {/* Gateway & Routing Info */}
                <Box>
                  <Typography sx={{ fontSize: "12px", fontWeight: 800, color: "#059669", textTransform: "uppercase", mb: 1 }}>
                    Gateway &amp; Routing
                  </Typography>
                  <Paper elevation={0} sx={{ p: 1.5, borderRadius: "10px", bgcolor: "#FFFFFF", border: "1px solid #E5E7EB" }}>
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ fontSize: "12px", color: "#6B7280" }}>Gateway Label</Typography>
                        {/* Requirement 3: Gateway customer-facing labels G-1 / G-2 only */}
                        <Chip label={selectedTxn.gateway || "G-1"} size="small" sx={{ fontWeight: 800, fontSize: "11px", height: 20, bgcolor: "rgba(5, 150, 105, 0.1)", color: "#059669" }} />
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ fontSize: "12px", color: "#6B7280" }}>Payment Mode</Typography>
                        <Typography sx={{ fontSize: "12px", fontWeight: 700 }}>{selectedTxn.payment_mode || "UPI"}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ fontSize: "12px", color: "#6B7280" }}>Ledger Txn ID</Typography>
                        <Typography sx={{ fontSize: "11px", fontFamily: "monospace" }}>{selectedTxn.ledger_txn_id || "--"}</Typography>
                      </Stack>
                    </Stack>
                  </Paper>
                </Box>

                {/* Customer Details */}
                <Box>
                  <Typography sx={{ fontSize: "12px", fontWeight: 800, color: "#059669", textTransform: "uppercase", mb: 1 }}>
                    Customer Details
                  </Typography>
                  <Paper elevation={0} sx={{ p: 1.5, borderRadius: "10px", bgcolor: "#FFFFFF", border: "1px solid #E5E7EB" }}>
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ fontSize: "12px", color: "#6B7280" }}>Name</Typography>
                        <Typography sx={{ fontSize: "12px", fontWeight: 700 }}>{selectedTxn.customer_name || "Customer"}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ fontSize: "12px", color: "#6B7280" }}>Mobile</Typography>
                        <Typography sx={{ fontSize: "12px", fontFamily: "monospace" }}>{selectedTxn.customer_mobile || "--"}</Typography>
                      </Stack>
                    </Stack>
                  </Paper>
                </Box>

                {/* Timestamps */}
                <Box>
                  <Typography sx={{ fontSize: "12px", fontWeight: 800, color: "#059669", textTransform: "uppercase", mb: 1 }}>
                    Audit Timestamps
                  </Typography>
                  <Paper elevation={0} sx={{ p: 1.5, borderRadius: "10px", bgcolor: "#F9FAFB", border: "1px solid #E5E7EB" }}>
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ fontSize: "11px", color: "#6B7280" }}>Initiated At</Typography>
                        <Typography sx={{ fontSize: "11px", fontFamily: "monospace" }}>{selectedTxn.initiated_at || selectedTxn.created_at || "--"}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ fontSize: "11px", color: "#6B7280" }}>Completed At</Typography>
                        <Typography sx={{ fontSize: "11px", fontFamily: "monospace" }}>{selectedTxn.completed_at || selectedTxn.updated_at || "--"}</Typography>
                      </Stack>
                    </Stack>
                  </Paper>
                </Box>
              </Stack>
            </Box>

            {/* Drawer Actions */}
            <Box sx={{ pt: 2, borderTop: "1px solid #E5E7EB" }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={() => setReceiptDialogOpen(true)}
                sx={{ bgcolor: "#059669", color: "#FFFFFF", fontWeight: 800, textTransform: "none", py: 1 }}
              >
                Print Verified Receipt
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* ── 8. PRINTABLE RECEIPT MODAL ── */}
      <Dialog
        open={receiptDialogOpen}
        onClose={() => setReceiptDialogOpen(false)}
        slotProps={{ paper: { sx: { width: 440, borderRadius: "14px", p: 1 } } }}
      >
        {selectedTxn && (
          <>
            <DialogTitle sx={{ fontWeight: 800, fontSize: "16px", textAlign: "center", pb: 1 }}>
              Official Payment Receipt
            </DialogTitle>
            <DialogContent>
              <Paper elevation={0} sx={{ p: 2, borderRadius: "10px", bgcolor: "#F9FAFB", border: "1px dashed #D1D5DB" }}>
                <Typography sx={{ fontWeight: 900, textAlign: "center", fontSize: "16px", color: "#111827" }}>
                  {selectedTxn.company_name || "SMSPAY"}
                </Typography>
                <Typography sx={{ fontSize: "11px", textAlign: "center", color: "#6B7280", mb: 2 }}>
                  PayIn Merchant Collection Receipt
                </Typography>

                <Divider sx={{ my: 1.5 }} />

                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography sx={{ fontSize: "11px", color: "#6B7280" }}>Txn ID:</Typography>
                    <Typography sx={{ fontSize: "11px", fontWeight: 700, fontFamily: "monospace" }}>{selectedTxn.tid}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography sx={{ fontSize: "11px", color: "#6B7280" }}>Status:</Typography>
                    <Typography sx={{ fontSize: "11px", fontWeight: 800, color: "#059669" }}>{selectedTxn.status}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography sx={{ fontSize: "11px", color: "#6B7280" }}>Retailer / Outlet:</Typography>
                    <Typography sx={{ fontSize: "11px", fontWeight: 700 }}>{selectedTxn.retailer_name}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography sx={{ fontSize: "11px", color: "#6B7280" }}>Customer:</Typography>
                    <Typography sx={{ fontSize: "11px", fontWeight: 600 }}>{selectedTxn.customer_name} ({selectedTxn.customer_mobile})</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography sx={{ fontSize: "11px", color: "#6B7280" }}>Date &amp; Time:</Typography>
                    <Typography sx={{ fontSize: "11px" }}>{selectedTxn.date_time}</Typography>
                  </Stack>

                  <Divider sx={{ my: 1 }} />

                  <Stack direction="row" justifyContent="space-between">
                    <Typography sx={{ fontSize: "11px", color: "#6B7280" }}>Base Amount:</Typography>
                    <Typography sx={{ fontSize: "11px", fontWeight: 700 }}>₹{Number(selectedTxn.amount || 0).toFixed(2)}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography sx={{ fontSize: "11px", color: "#6B7280" }}>Charges &amp; GST:</Typography>
                    <Typography sx={{ fontSize: "11px" }}>₹{Number(selectedTxn.total_charges || 0).toFixed(2)}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography sx={{ fontSize: "13px", fontWeight: 900 }}>Total Collected:</Typography>
                    <Typography sx={{ fontSize: "14px", fontWeight: 900, color: "#059669" }}>
                      ₹{Number(selectedTxn.total_amount || selectedTxn.amount || 0).toFixed(2)}
                    </Typography>
                  </Stack>
                </Stack>
              </Paper>
            </DialogContent>
            <DialogActions sx={{ p: 2, pt: 0 }}>
              <Button onClick={() => setReceiptDialogOpen(false)}>Close</Button>
              <Button variant="contained" onClick={() => window.print()} sx={{ bgcolor: "#059669", color: "#FFFFFF", fontWeight: 800 }}>
                Print
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Snackbar Notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity="success" sx={{ width: "100%", borderRadius: "10px" }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};
