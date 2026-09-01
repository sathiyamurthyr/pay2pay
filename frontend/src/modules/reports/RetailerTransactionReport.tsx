"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
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
  Collapse,
} from "@mui/material";

// Icons
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
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AssessmentIcon from "@mui/icons-material/Assessment";

export interface TransactionReportSummary {
  total_transactions: number;
  total_volume: number;
  total_credit: number;
  total_debit: number;
  successful_transactions: number;
  pending_transactions: number;
  failed_transactions: number;
  reversed_transactions: number;
}

export interface TransactionReportItem {
  id?: string;
  s_no?: number;
  txn_id: string;
  ref_id?: string;
  client_ref_id?: string;
  service: string;
  raw_service?: string;
  type?: string;
  wallet?: string;
  entry_type?: string;
  cr_dr?: string;
  amount?: number;
  txn_amt?: number;
  charges?: number;
  commission?: number;
  gst_amount?: number;
  tds_amount?: number;
  net_amount?: number;
  opening_bal?: number;
  pre_bal?: number;
  previous_balance?: number;
  closing_bal?: number;
  cls_bal?: number;
  current_balance?: number;
  cr_amt?: number;
  cr?: number;
  dr_amt?: number;
  dr?: number;
  description?: string;
  comments?: string;
  narration?: string;
  status_description?: string;
  date_time?: string;
  datetime?: string;
  transaction_datetime?: string;
  created_at?: string;
  date?: string;
  time?: string;
  status: string;
  raw_status?: string;
  company?: string;
  retailer?: string;
  customer_name?: string;
  customer_mobile?: string;
  beneficiary_name?: string;
  account_number?: string;
  bank_name?: string;
  ifsc_code?: string;
}

const SERVICE_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  PAYOUT: { label: "Payout", bg: "rgba(59, 130, 246, 0.15)", text: "#60A5FA", border: "rgba(59, 130, 246, 0.35)" },
  Payout: { label: "Payout", bg: "rgba(59, 130, 246, 0.15)", text: "#60A5FA", border: "rgba(59, 130, 246, 0.35)" },
  "Payout Reversal": { label: "Payout", bg: "rgba(59, 130, 246, 0.15)", text: "#60A5FA", border: "rgba(59, 130, 246, 0.35)" },
  PAYOUT_REVERSAL: { label: "Payout", bg: "rgba(59, 130, 246, 0.15)", text: "#60A5FA", border: "rgba(59, 130, 246, 0.35)" },
  DMT: { label: "DMT", bg: "rgba(16, 185, 129, 0.15)", text: "#34D399", border: "rgba(16, 185, 129, 0.35)" },
  AEPS: { label: "AEPS", bg: "rgba(245, 158, 11, 0.15)", text: "#FBBF24", border: "rgba(245, 158, 11, 0.35)" },
  UPI: { label: "UPI", bg: "rgba(139, 92, 246, 0.15)", text: "#A78BFA", border: "rgba(139, 92, 246, 0.35)" },
  BBPS: { label: "BBPS", bg: "rgba(236, 72, 153, 0.15)", text: "#F472B6", border: "rgba(236, 72, 153, 0.35)" },
  RECHARGE: { label: "Recharge", bg: "rgba(6, 182, 212, 0.15)", text: "#22D3EE", border: "rgba(6, 182, 212, 0.35)" },
  CARD_TO_CASH: { label: "Card-to-Cash", bg: "rgba(249, 115, 22, 0.15)", text: "#FB923C", border: "rgba(249, 115, 22, 0.35)" },
  SETTLEMENT: { label: "Settlement", bg: "rgba(99, 102, 241, 0.15)", text: "#818CF8", border: "rgba(99, 102, 241, 0.35)" },
  TOPUP: { label: "Topup", bg: "rgba(34, 197, 94, 0.15)", text: "#4ADE80", border: "rgba(34, 197, 94, 0.35)" },
  Topup: { label: "Topup", bg: "rgba(34, 197, 94, 0.15)", text: "#4ADE80", border: "rgba(34, 197, 94, 0.35)" },
  MANUAL_ADJUSTMENT: { label: "Adjustment", bg: "rgba(168, 85, 247, 0.15)", text: "#C084FC", border: "rgba(168, 85, 247, 0.35)" },
  MANUAL_TOPUP: { label: "Topup", bg: "rgba(34, 197, 94, 0.15)", text: "#4ADE80", border: "rgba(34, 197, 94, 0.35)" },
  MANUAL_DEBIT: { label: "Debit", bg: "rgba(239, 68, 68, 0.15)", text: "#F87171", border: "rgba(239, 68, 68, 0.35)" },
  BENE_VERIFY: { label: "Bene Verify", bg: "rgba(14, 165, 233, 0.15)", text: "#38BDF8", border: "rgba(14, 165, 233, 0.35)" },
  BENEFICIARY_VERIFICATION: { label: "Bene Verify", bg: "rgba(14, 165, 233, 0.15)", text: "#38BDF8", border: "rgba(14, 165, 233, 0.35)" },
  BENE_VERIFICATION: { label: "Bene Verify", bg: "rgba(14, 165, 233, 0.15)", text: "#38BDF8", border: "rgba(14, 165, 233, 0.35)" },
};

export const getTransactionComments = (row: TransactionReportItem): string => {
  if (row.description && row.description.trim()) return row.description;
  if (row.narration && row.narration.trim()) return row.narration;
  if (row.comments && row.comments.trim()) return row.comments;
  if (row.status_description && row.status_description.trim() && !["SUCCESS", "LEDGER_POSTED", "COMPLETED"].includes(row.status_description.toUpperCase())) {
    return row.status_description;
  }
  return `${row.service || "Financial"} Transaction`;
};

export const RetailerTransactionReport: React.FC = () => {
  // State: Authoritative Data
  const [items, setItems] = useState<TransactionReportItem[]>([]);
  const [summary, setSummary] = useState<TransactionReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>("");

  // Mobile Expanded Cards tracking
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Pagination
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(20);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Filters (Default: TODAY)
  const [globalSearch, setGlobalSearch] = useState<string>("");
  const [serviceFilter, setServiceFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [creditDebitFilter, setCreditDebitFilter] = useState<string>("ALL");
  const [activePreset, setActivePreset] = useState<string>("TODAY");
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [toDate, setToDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  // Drawer / Side Panel
  const [selectedTxn, setSelectedTxn] = useState<TransactionReportItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [exportAnchorEl, setExportAnchorEl] = useState<HTMLButtonElement | null>(null);

  // Toast
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMsg, setSnackbarMsg] = useState<string>("");

  const showToast = (msg: string) => {
    setSnackbarMsg(msg);
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

  // Fetch Report Data directly from live Backend API
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const q = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
      });

      if (fromDate) q.append("from_date", fromDate);
      if (toDate) q.append("to_date", toDate);
      if (globalSearch.trim()) q.append("search", globalSearch.trim());
      if (serviceFilter !== "ALL") q.append("service", serviceFilter);
      if (statusFilter !== "ALL") q.append("status", statusFilter);
      if (creditDebitFilter !== "ALL") q.append("entry_type", creditDebitFilter);

      const token = typeof window !== "undefined" ? (
        localStorage.getItem("p2p_access_token") ||
        localStorage.getItem("pay2pay_access_token") ||
        localStorage.getItem("pay2pay_auth_token") ||
        localStorage.getItem("access_token") ||
        document.cookie.split("; ").find(r => r.startsWith("p2p_access_token=") || r.startsWith("pay2pay_access_token="))?.split("=")[1] ||
        ""
      ) : "";

      const headers: Record<string, string> = {};
      if (token && token.trim().length > 10) {
        headers["Authorization"] = `Bearer ${token.trim()}`;
      }

      const res = await fetch(`/api/v1/transactions/report?${q.toString()}`, {
        headers,
        credentials: "include",
        cache: "no-store",
      });

      if (res.ok) {
        const json = await res.json();
        const rawItems: TransactionReportItem[] = Array.isArray(json.data)
          ? json.data
          : Array.isArray(json.items)
          ? json.items
          : Array.isArray(json)
          ? json
          : Array.isArray(json.data?.items)
          ? json.data.items
          : [];

        const total = json.pagination?.total_records ?? json.total_records ?? rawItems.length;

        setItems(rawItems);
        setTotalRecords(total);

        if (json.summary) {
          setSummary(json.summary);
        } else {
          let totVol = 0, totCr = 0, totDr = 0, succCount = 0;
          rawItems.forEach((r: any) => {
            const amt = Number(r.amount ?? r.txn_amt ?? 0);
            const entry = (r.entry_type || r.cr_dr || r.type || "").toUpperCase();
            const isCredit = entry === "CR" || entry === "CREDIT" || (r.cr_amt || r.cr || 0) > 0;
            if (isCredit) {
              totCr += (r.cr_amt || r.cr || amt);
            } else {
              totDr += (r.dr_amt || r.dr || amt);
            }
            totVol += amt;
            if ((r.status || "").toUpperCase() === "SUCCESS") succCount++;
          });
          setSummary({
            total_transactions: total,
            total_volume: totVol,
            total_credit: totCr,
            total_debit: totDr,
            successful_transactions: succCount,
            pending_transactions: 0,
            failed_transactions: total - succCount,
            reversed_transactions: 0,
          });
        }
        setLastUpdatedTime(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
      } else {
        setItems([]);
        setTotalRecords(0);
      }
    } catch (err) {
      console.error("Failed to fetch transaction report:", err);
      setItems([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [page, rowsPerPage, serviceFilter, statusFilter, creditDebitFilter, fromDate, toDate, globalSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openDetailsDrawer = (item: TransactionReportItem) => {
    setSelectedTxn(item);
    setDrawerOpen(true);
  };

  const handleDatePreset = (preset: string) => {
    setActivePreset(preset);
    const dNow = new Date();
    const today = `${dNow.getFullYear()}-${String(dNow.getMonth() + 1).padStart(2, "0")}-${String(dNow.getDate()).padStart(2, "0")}`;
    setPage(0);
    if (preset === "ALL") {
      setFromDate("");
      setToDate("");
    } else if (preset === "TODAY") {
      setFromDate(today);
      setToDate(today);
    } else if (preset === "YESTERDAY") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
      setFromDate(yStr);
      setToDate(yStr);
    } else if (preset === "7_DAYS") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setFromDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
      setToDate(today);
    } else if (preset === "30_DAYS") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setFromDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
      setToDate(today);
    } else if (preset === "THIS_MONTH") {
      const d = new Date();
      d.setDate(1);
      setFromDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
      setToDate(today);
    }
  };

  const handleResetFilters = () => {
    setGlobalSearch("");
    setServiceFilter("ALL");
    setStatusFilter("ALL");
    setCreditDebitFilter("ALL");
    handleDatePreset("TODAY");
    showToast("Filters reset to default");
  };

  const handleExportCsv = () => {
    const headers = [
      "Txn ID",
      "Ref ID",
      "Service",
      "Wallet",
      "Opening Bal",
      "Amount",
      "Closing Bal",
      "CR/DR",
      "Status",
      "Date/Time",
      "Description",
    ];
    const rows = items.map((r) => {
      const entry = (r.entry_type || r.cr_dr || r.type || "").toUpperCase();
      const isCr = entry === "CR" || entry === "CREDIT" || (r.cr_amt || r.cr || 0) > 0;
      return [
        r.txn_id,
        r.ref_id || r.client_ref_id || "",
        r.service,
        r.wallet || "MAIN",
        (r.opening_bal ?? r.pre_bal ?? r.previous_balance ?? 0).toFixed(2),
        (r.amount ?? r.txn_amt ?? 0).toFixed(2),
        (r.closing_bal ?? r.cls_bal ?? r.current_balance ?? 0).toFixed(2),
        isCr ? "CR" : "DR",
        r.status,
        r.date_time || r.transaction_datetime || r.created_at || "",
        getTransactionComments(r),
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((e) => e.map((cell) => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Pay2Pay_Transactions_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportAnchorEl(null);
    showToast("CSV exported successfully.");
  };

  const handleExportPdf = () => {
    window.print();
    setExportAnchorEl(null);
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

  const successPercent = useMemo(() => {
    if (!summary?.total_transactions) return 100;
    return Math.round(((summary.successful_transactions || 0) / summary.total_transactions) * 100);
  }, [summary]);

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "100%",
        bgcolor: "#080B11",
        color: "#F8FAFC",
        pt: { xs: 1, md: 1.5 },
        pb: { xs: 16, md: 6 },
        overflowX: "hidden",
      }}
    >
      {/* ── 1. ENTERPRISE PAGE HEADER ── */}
      <Box sx={{ mb: 2.5 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
          spacing={2}
        >
          {/* Title & Subtitle */}
          <Box>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "10px",
                  bgcolor: "rgba(245, 158, 11, 0.15)",
                  border: "1px solid rgba(254, 240, 138, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#FBBF24",
                  boxShadow: "0 0 15px rgba(245, 158, 11, 0.15)",
                }}
              >
                <AssessmentIcon sx={{ fontSize: 18 }} />
              </Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 900,
                  fontSize: { xs: "20px", sm: "24px", md: "26px" },
                  letterSpacing: "-0.5px",
                  lineHeight: 1.2,
                  background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #F59E0B 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Transaction Report
              </Typography>
            </Stack>

            <Typography
              sx={{
                color: "rgba(255, 255, 255, 0.65)",
                fontSize: { xs: "12px", md: "13.5px" },
                fontWeight: 500,
                mt: 0.5,
              }}
            >
              Real-time settlement ledger &amp; audit history
            </Typography>
          </Box>

          {/* Header Metadata Pills */}
          <Stack direction="row" spacing={1.2} sx={{ flexWrap: "wrap", alignItems: "center" }}>
            <Chip
              label={activePreset === "TODAY" ? "Today's View" : activePreset.replace("_", " ")}
              size="small"
              sx={{
                height: "26px",
                fontSize: "11.5px",
                fontWeight: 800,
                bgcolor: "rgba(245, 158, 11, 0.15)",
                color: "#FDE68A",
                border: "1px solid rgba(254, 240, 138, 0.3)",
              }}
            />
            <Chip
              label={`${totalRecords} Transactions`}
              size="small"
              sx={{
                height: "26px",
                fontSize: "11.5px",
                fontWeight: 700,
                bgcolor: "rgba(255, 255, 255, 0.05)",
                color: "#F8FAFC",
                border: "1px solid rgba(255, 255, 255, 0.12)",
              }}
            />
            {lastUpdatedTime && (
              <Chip
                label={`Updated: ${lastUpdatedTime}`}
                size="small"
                sx={{
                  height: "26px",
                  fontSize: "11px",
                  fontWeight: 600,
                  bgcolor: "rgba(255, 255, 255, 0.03)",
                  color: "#94A3B8",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  display: { xs: "none", sm: "inline-flex" },
                }}
              />
            )}
          </Stack>
        </Stack>
      </Box>

      {/* ── 2. SUMMARY KPI CARDS (RESPONSIVE 4-CARD DESKTOP GRID) ── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(1, 1fr)", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
          gap: { xs: 1.5, md: 2 },
          mb: 2.5,
        }}
      >
        {/* KPI 1: TOTAL VOLUME */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: "14px",
            bgcolor: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(254, 240, 138, 0.25)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35), 0 0 20px rgba(245, 158, 11, 0.08)",
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              transform: "translateY(-2px)",
              borderColor: "rgba(254, 240, 138, 0.5)",
            },
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography sx={{ color: "#FBBF24", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.8px" }}>
              TOTAL VOLUME
            </Typography>
            <Box sx={{ width: 28, height: 28, borderRadius: "8px", bgcolor: "rgba(245, 158, 11, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FBBF24" }}>
              <TrendingUpIcon sx={{ fontSize: 16 }} />
            </Box>
          </Stack>

          {isLoading ? (
            <Skeleton variant="text" width="65%" height={36} sx={{ bgcolor: "rgba(255,255,255,0.08)" }} />
          ) : (
            <Typography
              sx={{
                fontWeight: 900,
                fontSize: { xs: "20px", md: "24px" },
                lineHeight: 1.1,
                background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #F59E0B 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                mb: 0.3,
              }}
            >
              ₹{(summary?.total_volume ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          )}
          <Typography sx={{ color: "rgba(255, 255, 255, 0.65)", fontSize: "11.5px", fontWeight: 600 }}>
            {summary?.total_transactions ?? totalRecords ?? 0} Transactions
          </Typography>
        </Paper>

        {/* KPI 2: TOTAL CREDIT (CR) */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: "14px",
            bgcolor: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35), 0 0 20px rgba(16, 185, 129, 0.08)",
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              transform: "translateY(-2px)",
              borderColor: "rgba(16, 185, 129, 0.6)",
            },
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography sx={{ color: "#34D399", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.8px" }}>
              TOTAL CREDIT (CR)
            </Typography>
            <Box sx={{ width: 28, height: 28, borderRadius: "8px", bgcolor: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#34D399" }}>
              <ArrowDownwardIcon sx={{ fontSize: 16 }} />
            </Box>
          </Stack>

          {isLoading ? (
            <Skeleton variant="text" width="65%" height={36} sx={{ bgcolor: "rgba(255,255,255,0.08)" }} />
          ) : (
            <Typography sx={{ fontWeight: 900, fontSize: { xs: "20px", md: "24px" }, lineHeight: 1.1, color: "#34D399", mb: 0.3 }}>
              +₹{(summary?.total_credit ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          )}
          <Typography sx={{ color: "rgba(255, 255, 255, 0.65)", fontSize: "11.5px", fontWeight: 600 }}>
            Wallet Inflow &amp; Reversals
          </Typography>
        </Paper>

        {/* KPI 3: TOTAL DEBIT (DR) */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: "14px",
            bgcolor: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35), 0 0 20px rgba(239, 68, 68, 0.08)",
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              transform: "translateY(-2px)",
              borderColor: "rgba(239, 68, 68, 0.6)",
            },
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography sx={{ color: "#F87171", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.8px" }}>
              TOTAL DEBIT (DR)
            </Typography>
            <Box sx={{ width: 28, height: 28, borderRadius: "8px", bgcolor: "rgba(239, 68, 68, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#F87171" }}>
              <ArrowUpwardIcon sx={{ fontSize: 16 }} />
            </Box>
          </Stack>

          {isLoading ? (
            <Skeleton variant="text" width="65%" height={36} sx={{ bgcolor: "rgba(255,255,255,0.08)" }} />
          ) : (
            <Typography sx={{ fontWeight: 900, fontSize: { xs: "20px", md: "24px" }, lineHeight: 1.1, color: "#F87171", mb: 0.3 }}>
              -₹{(summary?.total_debit ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          )}
          <Typography sx={{ color: "rgba(255, 255, 255, 0.65)", fontSize: "11.5px", fontWeight: 600 }}>
            Payouts &amp; Charges
          </Typography>
        </Paper>

        {/* KPI 4: SUCCESS RATE */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: "14px",
            bgcolor: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(96, 165, 250, 0.3)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35), 0 0 20px rgba(96, 165, 250, 0.08)",
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              transform: "translateY(-2px)",
              borderColor: "rgba(96, 165, 250, 0.6)",
            },
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.8px" }}>
              SUCCESS RATE
            </Typography>
            <Box sx={{ width: 28, height: 28, borderRadius: "8px", bgcolor: "rgba(59, 130, 246, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#60A5FA" }}>
              <CheckCircleIcon sx={{ fontSize: 16 }} />
            </Box>
          </Stack>

          {isLoading ? (
            <Skeleton variant="text" width="65%" height={36} sx={{ bgcolor: "rgba(255,255,255,0.08)" }} />
          ) : (
            <Typography sx={{ fontWeight: 900, fontSize: { xs: "20px", md: "24px" }, lineHeight: 1.1, color: "#60A5FA", mb: 0.3 }}>
              {successPercent}%
            </Typography>
          )}
          <Typography sx={{ color: "rgba(255, 255, 255, 0.65)", fontSize: "11.5px", fontWeight: 600 }}>
            {summary?.successful_transactions ?? 0} Completed Successfully
          </Typography>
        </Paper>
      </Box>

      {/* ── 3. DEDICATED GLASS DATE FILTERS BAR ── */}
      <Paper
        elevation={0}
        sx={{
          p: 1,
          px: 2,
          borderRadius: "12px",
          bgcolor: "rgba(15, 23, 42, 0.75)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(254, 240, 138, 0.2)",
          mb: 2,
          display: "flex",
          alignItems: "center",
          gap: 1,
          overflowX: "auto",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        <Typography sx={{ fontSize: "11.5px", fontWeight: 800, color: "#FBBF24", textTransform: "uppercase", letterSpacing: "0.8px", mr: 1, display: { xs: "none", sm: "block" } }}>
          Date Range:
        </Typography>

        {[
          { key: "ALL", label: "All" },
          { key: "TODAY", label: "Today" },
          { key: "YESTERDAY", label: "Yesterday" },
          { key: "7_DAYS", label: "7 Days" },
          { key: "30_DAYS", label: "30 Days" },
          { key: "THIS_MONTH", label: "This Month" },
        ].map((preset) => {
          const isSelected = activePreset === preset.key;
          return (
            <Box
              key={preset.key}
              onClick={() => handleDatePreset(preset.key)}
              sx={{
                px: 2,
                py: 0.6,
                borderRadius: "999px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontSize: "12.5px",
                fontWeight: isSelected ? 800 : 600,
                color: isSelected ? "#080B11" : "rgba(255, 255, 255, 0.8)",
                background: isSelected ? "linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #F59E0B 100%)" : "rgba(255, 255, 255, 0.05)",
                border: isSelected ? "1px solid #FEF08A" : "1px solid rgba(255, 255, 255, 0.1)",
                boxShadow: isSelected ? "0 0 15px rgba(245, 158, 11, 0.35)" : "none",
                transition: "all 0.15s ease-in-out",
                "&:hover": {
                  bgcolor: isSelected ? undefined : "rgba(255, 255, 255, 0.12)",
                  color: isSelected ? "#080B11" : "#FFFFFF",
                  borderColor: isSelected ? undefined : "rgba(254, 240, 138, 0.3)",
                },
              }}
            >
              {preset.label}
            </Box>
          );
        })}
      </Paper>

      {/* ── 4. SEARCH + FILTER TOOLBAR (FULL DESKTOP WORKSPACE) ── */}
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          borderRadius: "14px",
          bgcolor: "rgba(15, 23, 42, 0.75)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(254, 240, 138, 0.2)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35)",
          mb: 2.5,
        }}
      >
        <Stack
          direction={{ xs: "column", lg: "row" }}
          alignItems={{ xs: "stretch", lg: "center" }}
          justifyContent="space-between"
          spacing={1.5}
        >
          {/* Universal Large Search Bar */}
          <TextField
            placeholder="Search by Transaction ID, Client Ref, Recipient, Bank…"
            value={globalSearch}
            onChange={(e) => {
              setGlobalSearch(e.target.value);
              setPage(0);
            }}
            size="small"
            sx={{
              flex: 1,
              minWidth: { xs: "100%", lg: "300px" },
              "& .MuiOutlinedInput-root": {
                bgcolor: "rgba(8, 11, 17, 0.85)",
                borderRadius: "10px",
                fontSize: "13px",
                color: "#F8FAFC",
                height: "40px",
                border: "1px solid rgba(255, 255, 255, 0.14)",
                "& fieldset": { border: "none" },
                "&:hover": { borderColor: "rgba(254, 240, 138, 0.4)" },
                "&.Mui-focused": {
                  borderColor: "#FBBF24",
                  boxShadow: "0 0 14px rgba(245, 158, 11, 0.25)",
                },
              },
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#FBBF24", fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: globalSearch ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setGlobalSearch("")} sx={{ color: "rgba(255,255,255,0.6)" }}>
                      <ClearIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
          />

          {/* Filters & Action Buttons */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ flexWrap: "wrap", alignItems: "center", gap: 1 }}
          >
            {/* Service Filter */}
            <FormControl size="small" sx={{ minWidth: 135, flexGrow: { xs: 1, sm: 0 } }}>
              <Select
                value={serviceFilter}
                onChange={(e) => {
                  setServiceFilter(e.target.value);
                  setPage(0);
                }}
                displayEmpty
                sx={{
                  height: "40px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  bgcolor: "rgba(8, 11, 17, 0.85)",
                  color: "#F8FAFC",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.14)",
                  "& fieldset": { border: "none" },
                  "& .MuiSvgIcon-root": { color: "#FBBF24" },
                }}
              >
                <MenuItem value="ALL" sx={{ fontSize: "12.5px" }}>All Services</MenuItem>
                <MenuItem value="PAYOUT" sx={{ fontSize: "12.5px" }}>Payout</MenuItem>
                <MenuItem value="BENE_VERIFY" sx={{ fontSize: "12.5px" }}>Bene Verify</MenuItem>
                <MenuItem value="DMT" sx={{ fontSize: "12.5px" }}>DMT Transfer</MenuItem>
                <MenuItem value="AEPS" sx={{ fontSize: "12.5px" }}>AEPS</MenuItem>
                <MenuItem value="UPI" sx={{ fontSize: "12.5px" }}>UPI</MenuItem>
                <MenuItem value="BBPS" sx={{ fontSize: "12.5px" }}>BBPS Bills</MenuItem>
                <MenuItem value="RECHARGE" sx={{ fontSize: "12.5px" }}>Recharge</MenuItem>
                <MenuItem value="TOPUP" sx={{ fontSize: "12.5px" }}>Topup</MenuItem>
                <MenuItem value="MANUAL_ADJUSTMENT" sx={{ fontSize: "12.5px" }}>Adjustment</MenuItem>
              </Select>
            </FormControl>

            {/* Status Filter */}
            <FormControl size="small" sx={{ minWidth: 130, flexGrow: { xs: 1, sm: 0 } }}>
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(0);
                }}
                displayEmpty
                sx={{
                  height: "40px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  bgcolor: "rgba(8, 11, 17, 0.85)",
                  color: "#F8FAFC",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.14)",
                  "& fieldset": { border: "none" },
                  "& .MuiSvgIcon-root": { color: "#FBBF24" },
                }}
              >
                <MenuItem value="ALL" sx={{ fontSize: "12.5px" }}>All Statuses</MenuItem>
                <MenuItem value="SUCCESS" sx={{ fontSize: "12.5px", color: "#34D399" }}>Success</MenuItem>
                <MenuItem value="PENDING" sx={{ fontSize: "12.5px", color: "#FBBF24" }}>Pending</MenuItem>
                <MenuItem value="FAILED" sx={{ fontSize: "12.5px", color: "#F87171" }}>Failed</MenuItem>
                <MenuItem value="REVERSED" sx={{ fontSize: "12.5px", color: "#A78BFA" }}>Reversed</MenuItem>
              </Select>
            </FormControl>

            {/* Entry Type Filter */}
            <FormControl size="small" sx={{ minWidth: 140, flexGrow: { xs: 1, sm: 0 } }}>
              <Select
                value={creditDebitFilter}
                onChange={(e) => {
                  setCreditDebitFilter(e.target.value);
                  setPage(0);
                }}
                displayEmpty
                sx={{
                  height: "40px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  bgcolor: "rgba(8, 11, 17, 0.85)",
                  color: "#F8FAFC",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.14)",
                  "& fieldset": { border: "none" },
                  "& .MuiSvgIcon-root": { color: "#FBBF24" },
                }}
              >
                <MenuItem value="ALL" sx={{ fontSize: "12.5px" }}>All Entries (CR &amp; DR)</MenuItem>
                <MenuItem value="CR" sx={{ fontSize: "12.5px", color: "#34D399" }}>Credit (CR)</MenuItem>
                <MenuItem value="DR" sx={{ fontSize: "12.5px", color: "#F87171" }}>Debit (DR)</MenuItem>
              </Select>
            </FormControl>

            {/* Reset Filters */}
            <Button
              variant="outlined"
              size="small"
              onClick={handleResetFilters}
              startIcon={<RestartAltIcon sx={{ fontSize: 16 }} />}
              sx={{
                height: "40px",
                px: 1.8,
                fontSize: "12px",
                fontWeight: 700,
                textTransform: "none",
                borderRadius: "8px",
                color: "#F87171",
                borderColor: "rgba(239, 68, 68, 0.35)",
                bgcolor: "rgba(239, 68, 68, 0.08)",
                "&:hover": {
                  borderColor: "#EF4444",
                  bgcolor: "rgba(239, 68, 68, 0.18)",
                },
              }}
            >
              Reset
            </Button>

            {/* Refresh */}
            <Tooltip title="Refresh Ledger">
              <IconButton
                onClick={() => {
                  setIsRefreshing(true);
                  fetchData();
                }}
                disabled={isLoading || isRefreshing}
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "8px",
                  bgcolor: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#FBBF24",
                  "&:hover": { bgcolor: "rgba(245, 158, 11, 0.15)", borderColor: "rgba(254, 240, 138, 0.35)" },
                }}
              >
                <RefreshIcon
                  sx={{
                    fontSize: 18,
                    animation: isRefreshing || isLoading ? "spin 0.8s linear infinite" : "none",
                    "@keyframes spin": { "0%": { transform: "rotate(0deg)" }, "100%": { transform: "rotate(360deg)" } },
                  }}
                />
              </IconButton>
            </Tooltip>

            {/* Primary Gold Export Button */}
            <Button
              variant="contained"
              size="small"
              onClick={(e) => setExportAnchorEl(e.currentTarget)}
              startIcon={<FileDownloadIcon sx={{ fontSize: 18 }} />}
              endIcon={<ArrowDropDownIcon sx={{ fontSize: 18 }} />}
              sx={{
                height: "40px",
                px: 2.2,
                fontSize: "13px",
                fontWeight: 800,
                textTransform: "none",
                borderRadius: "8px",
                color: "#080B11",
                background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #F59E0B 100%)",
                boxShadow: "0 0 16px rgba(245, 158, 11, 0.3)",
                "&:hover": {
                  background: "linear-gradient(135deg, #FFFBEB 0%, #FDE047 50%, #F59E0B 100%)",
                  boxShadow: "0 0 24px rgba(245, 158, 11, 0.5)",
                },
              }}
            >
              Export
            </Button>

            <Menu
              anchorEl={exportAnchorEl}
              open={Boolean(exportAnchorEl)}
              onClose={() => setExportAnchorEl(null)}
              slotProps={{
                paper: {
                  sx: {
                    bgcolor: "#0F172A",
                    border: "1px solid rgba(254, 240, 138, 0.25)",
                    borderRadius: "10px",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
                  },
                },
              }}
            >
              <MenuItem onClick={handleExportCsv} sx={{ fontSize: "12.5px", color: "#F8FAFC", gap: 1.5, py: 1, px: 2 }}>
                <TableChartIcon sx={{ fontSize: 17, color: "#34D399" }} />
                Export to CSV / Excel
              </MenuItem>
              <MenuItem onClick={handleExportPdf} sx={{ fontSize: "12.5px", color: "#F8FAFC", gap: 1.5, py: 1, px: 2 }}>
                <PrintIcon sx={{ fontSize: 17, color: "#60A5FA" }} />
                Print / Save as PDF
              </MenuItem>
            </Menu>
          </Stack>
        </Stack>
      </Paper>

      {/* ── 5. PROFESSIONAL ENTERPRISE DATA TABLE (DESKTOP >= 900PX) ── */}
      <Box sx={{ display: { xs: "none", md: "block" } }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: "14px",
            bgcolor: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(254, 240, 138, 0.2)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35)",
            overflow: "hidden",
            width: "100%",
          }}
        >
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table sx={{ minWidth: 1000, tableLayout: "auto" }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "#0A0E17" }}>
                  <TableCell sx={{ color: "#FBBF24", fontWeight: 800, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap", py: 1.4, px: 2, minWidth: 190 }}>
                    TXN ID / REF
                  </TableCell>
                  <TableCell sx={{ color: "#FBBF24", fontWeight: 800, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap", py: 1.4, px: 1.5, minWidth: 100 }}>
                    SERVICE
                  </TableCell>
                  <TableCell sx={{ color: "#FBBF24", fontWeight: 800, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap", py: 1.4, px: 1.5, minWidth: 115 }}>
                    OPENING BAL
                  </TableCell>
                  <TableCell sx={{ color: "#FBBF24", fontWeight: 800, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap", py: 1.4, px: 1.5, minWidth: 110 }}>
                    AMOUNT
                  </TableCell>
                  <TableCell sx={{ color: "#FBBF24", fontWeight: 800, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap", py: 1.4, px: 1.5, minWidth: 115 }}>
                    CLOSING BAL
                  </TableCell>
                  <TableCell sx={{ color: "#FBBF24", fontWeight: 800, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap", py: 1.4, px: 1.5, minWidth: 100 }}>
                    STATUS
                  </TableCell>
                  <TableCell sx={{ color: "#FBBF24", fontWeight: 800, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap", py: 1.4, px: 1.5, minWidth: 125 }}>
                    DATE &amp; TIME
                  </TableCell>
                  <TableCell sx={{ color: "#FBBF24", fontWeight: 800, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap", py: 1.4, px: 2 }}>
                    DESCRIPTION
                  </TableCell>
                  <TableCell align="center" sx={{ color: "#FBBF24", fontWeight: 800, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap", py: 1.4, px: 1.5, minWidth: 80 }}>
                    ACTIONS
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  [1, 2, 3, 4, 5].map((n) => (
                    <TableRow key={n}>
                      <TableCell colSpan={9} sx={{ py: 2, borderColor: "rgba(255,255,255,0.06)" }}>
                        <Skeleton variant="text" height={24} sx={{ bgcolor: "rgba(255,255,255,0.06)", borderRadius: "4px" }} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6, borderColor: "rgba(255,255,255,0.06)" }}>
                      <AssessmentIcon sx={{ fontSize: 44, color: "rgba(254, 240, 138, 0.3)", mb: 1 }} />
                      <Typography sx={{ fontWeight: 800, fontSize: "15px", color: "#F8FAFC" }}>
                        No Transactions Found
                      </Typography>
                      <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.55)", display: "block", mt: 0.5 }}>
                        No records match your selected filter criteria.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((row, idx) => {
                    const rowKey = row.id || row.txn_id || `txn-${idx}`;
                    const entry = (row.entry_type || row.cr_dr || row.type || "").toUpperCase();
                    const isCr = entry === "CR" || entry === "CREDIT" || (row.cr_amt || row.cr || 0) > 0;
                    const dt = formatDateTime(row.date_time || row.transaction_datetime || row.created_at);
                    const svc = row.service || "General";
                    const svcBadge = SERVICE_BADGES[svc] || { label: svc, bg: "rgba(59, 130, 246, 0.15)", text: "#60A5FA", border: "rgba(59, 130, 246, 0.35)" };
                    const amt = Number(row.amount ?? row.txn_amt ?? 0);
                    const openingBal = Number(row.opening_bal ?? row.pre_bal ?? row.previous_balance ?? 0);
                    const closingBal = Number(row.closing_bal ?? row.cls_bal ?? row.current_balance ?? 0);

                    return (
                      <TableRow
                        key={rowKey}
                        hover
                        onClick={() => openDetailsDrawer(row)}
                        sx={{
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          "&:hover": {
                            bgcolor: "rgba(254, 240, 138, 0.04) !important",
                          },
                          "& td": { borderColor: "rgba(255,255,255,0.06)", py: 1.2 },
                        }}
                      >
                        {/* 1. Txn ID / Ref */}
                        <TableCell sx={{ px: 2 }}>
                          <Stack direction="row" alignItems="center" spacing={0.6}>
                            <Typography
                              sx={{
                                fontSize: "12px",
                                fontWeight: 700,
                                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                color: "#FBBF24",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {row.txn_id}
                            </Typography>
                            <Tooltip title="Copy TXN ID">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(row.txn_id, "TXN ID");
                                }}
                                sx={{ p: 0.2, color: "rgba(254, 240, 138, 0.6)" }}
                              >
                                <ContentCopyIcon sx={{ fontSize: 13 }} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                          {row.ref_id && row.ref_id !== "--" && (
                            <Typography
                              variant="caption"
                              sx={{
                                fontSize: "10.5px",
                                color: "#94A3B8",
                                display: "block",
                                maxWidth: 180,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              REF: {row.ref_id}
                            </Typography>
                          )}
                        </TableCell>

                        {/* 2. Service */}
                        <TableCell sx={{ px: 1.5, whiteSpace: "nowrap" }}>
                          <Chip
                            label={svcBadge.label}
                            size="small"
                            sx={{
                              height: "22px",
                              fontSize: "11px",
                              fontWeight: 800,
                              bgcolor: svcBadge.bg,
                              color: svcBadge.text,
                              border: `1px solid ${svcBadge.border}`,
                            }}
                          />
                        </TableCell>

                        {/* 3. Opening Balance */}
                        <TableCell sx={{ px: 1.5, fontSize: "12.5px", color: "rgba(255,255,255,0.8)", whiteSpace: "nowrap" }}>
                          ₹{openingBal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </TableCell>

                        {/* 4. Amount with CR / DR Color */}
                        <TableCell sx={{ px: 1.5, whiteSpace: "nowrap" }}>
                          <Typography
                            sx={{
                              fontSize: "13px",
                              fontWeight: 900,
                              color: isCr ? "#34D399" : "#F87171",
                            }}
                          >
                            {isCr ? "+" : "-"}₹{amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 700, color: isCr ? "#34D399" : "#F87171", opacity: 0.8 }}>
                            {isCr ? "CREDIT (CR)" : "DEBIT (DR)"}
                          </Typography>
                        </TableCell>

                        {/* 5. Closing Balance */}
                        <TableCell sx={{ px: 1.5, fontSize: "12.5px", fontWeight: 700, color: "#F8FAFC", whiteSpace: "nowrap" }}>
                          ₹{closingBal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </TableCell>

                        {/* 6. Status */}
                        <TableCell sx={{ px: 1.5, whiteSpace: "nowrap" }}>
                          <Chip
                            label={(row.status || "SUCCESS").toUpperCase()}
                            size="small"
                            sx={{
                              height: "22px",
                              fontSize: "10.5px",
                              fontWeight: 800,
                              bgcolor:
                                (row.status || "").toUpperCase() === "SUCCESS"
                                  ? "rgba(16, 185, 129, 0.15)"
                                  : (row.status || "").toUpperCase() === "PENDING"
                                  ? "rgba(245, 158, 11, 0.15)"
                                  : (row.status || "").toUpperCase() === "REVERSED"
                                  ? "rgba(168, 85, 247, 0.15)"
                                  : "rgba(239, 68, 68, 0.15)",
                              color:
                                (row.status || "").toUpperCase() === "SUCCESS"
                                  ? "#34D399"
                                  : (row.status || "").toUpperCase() === "PENDING"
                                  ? "#FBBF24"
                                  : (row.status || "").toUpperCase() === "REVERSED"
                                  ? "#C084FC"
                                  : "#F87171",
                              border: `1px solid ${
                                (row.status || "").toUpperCase() === "SUCCESS"
                                  ? "rgba(16, 185, 129, 0.35)"
                                  : (row.status || "").toUpperCase() === "PENDING"
                                  ? "rgba(245, 158, 11, 0.35)"
                                  : (row.status || "").toUpperCase() === "REVERSED"
                                  ? "rgba(168, 85, 247, 0.35)"
                                  : "rgba(239, 68, 68, 0.35)"
                              }`,
                            }}
                          />
                        </TableCell>

                        {/* 7. Date & Time */}
                        <TableCell sx={{ px: 1.5, whiteSpace: "nowrap" }}>
                          <Typography sx={{ fontSize: "12px", fontWeight: 700, color: "#F8FAFC", lineHeight: 1.2 }}>
                            {dt.date}
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: "10.5px", color: "#94A3B8", display: "block" }}>
                            {dt.time}
                          </Typography>
                        </TableCell>

                        {/* 8. Description */}
                        <TableCell sx={{ px: 2, maxWidth: 260, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          <Typography sx={{ fontSize: "12px", color: "rgba(255,255,255,0.85)" }}>
                            {getTransactionComments(row)}
                          </Typography>
                        </TableCell>

                        {/* 9. Actions */}
                        <TableCell align="center" sx={{ px: 1.5, whiteSpace: "nowrap" }}>
                          <Stack direction="row" spacing={0.3} justifyContent="center" alignItems="center">
                            <Tooltip title="View Details">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDetailsDrawer(row);
                                }}
                                sx={{ color: "#FBBF24", p: 0.5, "&:hover": { bgcolor: "rgba(254, 240, 138, 0.15)" } }}
                              >
                                <VisibilityIcon sx={{ fontSize: 17 }} />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Print Receipt">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDetailsDrawer(row);
                                }}
                                sx={{ color: "#60A5FA", p: 0.5, "&:hover": { bgcolor: "rgba(59, 130, 246, 0.15)" } }}
                              >
                                <ReceiptIcon sx={{ fontSize: 17 }} />
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

          {/* Desktop Table Pagination Container */}
          <TablePagination
            component="div"
            count={totalRecords}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 20, 50, 100]}
            sx={{
              color: "rgba(255,255,255,0.85)",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              bgcolor: "rgba(10, 14, 23, 0.6)",
              "& .MuiSvgIcon-root": { color: "#FBBF24" },
              "& .MuiTablePagination-select": {
                bgcolor: "rgba(255,255,255,0.05)",
                borderRadius: "6px",
                py: 0.3,
              },
            }}
          />
        </Paper>
      </Box>

      {/* ── 6. MOBILE CARD LIST (< 900PX) ── */}
      <Box sx={{ display: { xs: "block", md: "none" } }}>
        {isLoading ? (
          <Stack spacing={2}>
            {[1, 2, 3, 4].map((n) => (
              <Paper
                key={n}
                sx={{
                  p: 2,
                  borderRadius: "14px",
                  bgcolor: "rgba(15, 23, 42, 0.75)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <Skeleton variant="rectangular" height={100} sx={{ bgcolor: "rgba(255,255,255,0.06)", borderRadius: "8px" }} />
              </Paper>
            ))}
          </Stack>
        ) : items.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 4,
              textAlign: "center",
              borderRadius: "14px",
              bgcolor: "rgba(15, 23, 42, 0.75)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(254, 240, 138, 0.2)",
            }}
          >
            <AssessmentIcon sx={{ fontSize: 40, color: "rgba(254, 240, 138, 0.35)", mb: 1 }} />
            <Typography sx={{ fontWeight: 800, fontSize: "15px", color: "#F8FAFC" }}>
              No Transactions Found
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.55)", display: "block", mt: 0.5 }}>
              Try adjusting your date range or filters
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={1.5}>
            {items.map((row, idx) => {
              const rowKey = row.id || row.txn_id || `card-${idx}`;
              const entry = (row.entry_type || row.cr_dr || row.type || "").toUpperCase();
              const isCr = entry === "CR" || entry === "CREDIT" || (row.cr_amt || row.cr || 0) > 0;
              const dt = formatDateTime(row.date_time || row.transaction_datetime || row.created_at);
              const isExpanded = !!expandedCards[rowKey];
              const svc = row.service || "General";
              const svcBadge = SERVICE_BADGES[svc] || { label: svc, bg: "rgba(59, 130, 246, 0.15)", text: "#60A5FA", border: "rgba(59, 130, 246, 0.35)" };
              const amt = Number(row.amount ?? row.txn_amt ?? 0);
              const openingBal = Number(row.opening_bal ?? row.pre_bal ?? row.previous_balance ?? 0);
              const closingBal = Number(row.closing_bal ?? row.cls_bal ?? row.current_balance ?? 0);

              return (
                <Paper
                  key={rowKey}
                  elevation={0}
                  onClick={() => openDetailsDrawer(row)}
                  sx={{
                    p: 2,
                    borderRadius: "14px",
                    bgcolor: "rgba(15, 23, 42, 0.75)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(254, 240, 138, 0.2)",
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.35)",
                    transition: "all 0.2s",
                    cursor: "pointer",
                    "&:hover": {
                      borderColor: "rgba(254, 240, 138, 0.45)",
                      transform: "translateY(-1px)",
                    },
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.2 }}>
                    <Stack direction="row" spacing={0.8} alignItems="center">
                      <Chip
                        label={svcBadge.label}
                        size="small"
                        sx={{
                          height: "22px",
                          fontSize: "10.5px",
                          fontWeight: 800,
                          bgcolor: svcBadge.bg,
                          color: svcBadge.text,
                          border: `1px solid ${svcBadge.border}`,
                        }}
                      />
                      <Chip
                        label={(row.status || "SUCCESS").toUpperCase()}
                        size="small"
                        sx={{
                          height: "22px",
                          fontSize: "10.5px",
                          fontWeight: 800,
                          bgcolor:
                            (row.status || "").toUpperCase() === "SUCCESS"
                              ? "rgba(16, 185, 129, 0.15)"
                              : (row.status || "").toUpperCase() === "PENDING"
                              ? "rgba(245, 158, 11, 0.15)"
                              : (row.status || "").toUpperCase() === "REVERSED"
                              ? "rgba(168, 85, 247, 0.15)"
                              : "rgba(239, 68, 68, 0.15)",
                          color:
                            (row.status || "").toUpperCase() === "SUCCESS"
                              ? "#34D399"
                              : (row.status || "").toUpperCase() === "PENDING"
                              ? "#FBBF24"
                              : (row.status || "").toUpperCase() === "REVERSED"
                              ? "#C084FC"
                              : "#F87171",
                          border: `1px solid ${
                            (row.status || "").toUpperCase() === "SUCCESS"
                              ? "rgba(16, 185, 129, 0.35)"
                              : (row.status || "").toUpperCase() === "PENDING"
                              ? "rgba(245, 158, 11, 0.35)"
                              : (row.status || "").toUpperCase() === "REVERSED"
                              ? "rgba(168, 85, 247, 0.35)"
                              : "rgba(239, 68, 68, 0.35)"
                          }`,
                        }}
                      />
                    </Stack>

                    <Typography
                      sx={{
                        fontSize: "16px",
                        fontWeight: 900,
                        color: isCr ? "#34D399" : "#F87171",
                      }}
                    >
                      {isCr ? "+" : "-"}₹{amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </Typography>
                  </Stack>

                  <Box sx={{ bgcolor: "rgba(8, 11, 17, 0.65)", p: 1.2, borderRadius: "8px", mb: 1.2, border: "1px solid rgba(255,255,255,0.06)" }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.4 }}>
                      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: "10.5px", fontWeight: 700 }}>
                        TXN ID
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Typography
                          sx={{
                            fontSize: "12px",
                            fontWeight: 700,
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                            color: "#FBBF24",
                          }}
                        >
                          {row.txn_id}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(row.txn_id, "TXN ID");
                          }}
                          sx={{ p: 0.2, color: "rgba(254, 240, 138, 0.6)" }}
                        >
                          <ContentCopyIcon sx={{ fontSize: 13 }} />
                        </IconButton>
                      </Stack>
                    </Stack>

                    {row.ref_id && row.ref_id !== "--" && (
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: "10.5px", fontWeight: 700 }}>
                          REF ID
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Typography
                            sx={{
                              fontSize: "11px",
                              fontWeight: 600,
                              color: "#94A3B8",
                              maxWidth: "200px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row.ref_id}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(row.ref_id || "", "REF ID");
                            }}
                            sx={{ p: 0.2, color: "rgba(255,255,255,0.4)" }}
                          >
                            <ContentCopyIcon sx={{ fontSize: 13 }} />
                          </IconButton>
                        </Stack>
                      </Stack>
                    )}
                  </Box>

                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography sx={{ fontSize: "12px", fontWeight: 700, color: "#F8FAFC" }}>
                        {row.customer_name || row.retailer || row.service}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", fontSize: "11px" }}>
                        {dt.date} · {dt.time}
                      </Typography>
                    </Box>

                    <Button
                      size="small"
                      onClick={(e) => toggleExpandCard(rowKey, e)}
                      endIcon={isExpanded ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
                      sx={{
                        fontSize: "11px",
                        fontWeight: 700,
                        textTransform: "none",
                        color: "#60A5FA",
                        p: 0,
                        minWidth: "auto",
                      }}
                    >
                      {isExpanded ? "Less" : "Details"}
                    </Button>
                  </Stack>

                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <Divider sx={{ my: 1.2, borderColor: "rgba(255, 255, 255, 0.08)" }} />
                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1, fontSize: "11px" }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: "10px" }}>Opening Balance</Typography>
                        <Typography sx={{ fontWeight: 600, color: "rgba(255,255,255,0.85)", fontSize: "11.5px" }}>
                          ₹{openingBal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: "10px" }}>Closing Balance</Typography>
                        <Typography sx={{ fontWeight: 700, color: "#F8FAFC", fontSize: "11.5px" }}>
                          ₹{closingBal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: "10px" }}>Wallet</Typography>
                        <Typography sx={{ fontWeight: 600, color: "rgba(255,255,255,0.85)", fontSize: "11.5px" }}>
                          {row.wallet || "MAIN"}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: "10px" }}>Entry Type</Typography>
                        <Typography sx={{ fontWeight: 700, color: isCr ? "#34D399" : "#F87171", fontSize: "11.5px" }}>
                          {isCr ? "Credit (CR)" : "Debit (DR)"}
                        </Typography>
                      </Box>
                    </Box>
                  </Collapse>
                </Paper>
              );
            })}
          </Stack>
        )}

        {/* Mobile Pagination */}
        {totalRecords > 0 && (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 2.5, px: 1 }}>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", fontSize: "12px", fontWeight: 600 }}>
              Showing {items.length} of {totalRecords}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                disabled={page === 0 || isLoading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                sx={{
                  textTransform: "none",
                  fontSize: "12px",
                  fontWeight: 700,
                  bgcolor: "rgba(255,255,255,0.05)",
                  color: "#F8FAFC",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                Previous
              </Button>
              <Button
                size="small"
                disabled={(page + 1) * rowsPerPage >= totalRecords || isLoading}
                onClick={() => setPage((p) => p + 1)}
                sx={{
                  textTransform: "none",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #F59E0B 100%)",
                  color: "#080B11",
                  borderRadius: "8px",
                }}
              >
                Next
              </Button>
            </Stack>
          </Box>
        )}
      </Box>

      {/* ── 7. LUXURY GLASSMORPHISM DETAILS SIDE DRAWER ── */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{
          backdrop: {
            sx: {
              bgcolor: "rgba(8, 11, 17, 0.75)",
              backdropFilter: "blur(8px)",
            },
          },
        }}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 480, md: 500 },
            bgcolor: "#0B0F17",
            color: "#F8FAFC",
            borderLeft: "1px solid rgba(254, 240, 138, 0.25)",
            boxShadow: "-8px 0 40px rgba(0, 0, 0, 0.6)",
            p: 0,
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        {selectedTxn && (() => {
          const entry = (selectedTxn.entry_type || selectedTxn.cr_dr || selectedTxn.type || "").toUpperCase();
          const isCr = entry === "CR" || entry === "CREDIT" || (selectedTxn.cr_amt || selectedTxn.cr || 0) > 0;
          const dt = formatDateTime(selectedTxn.date_time || selectedTxn.transaction_datetime || selectedTxn.created_at);
          const svc = selectedTxn.service || "General";
          const svcBadge = SERVICE_BADGES[svc] || { label: svc, bg: "rgba(59, 130, 246, 0.15)", text: "#60A5FA", border: "rgba(59, 130, 246, 0.35)" };
          const amt = Number(selectedTxn.amount ?? selectedTxn.txn_amt ?? 0);
          const openingBal = Number(selectedTxn.opening_bal ?? selectedTxn.pre_bal ?? selectedTxn.previous_balance ?? 0);
          const closingBal = Number(selectedTxn.closing_bal ?? selectedTxn.cls_bal ?? selectedTxn.current_balance ?? 0);

          return (
            <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
              {/* Drawer Header */}
              <Box
                sx={{
                  p: 2.2,
                  bgcolor: "rgba(15, 23, 42, 0.85)",
                  backdropFilter: "blur(20px)",
                  borderBottom: "1px solid rgba(254, 240, 138, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: "8px",
                      bgcolor: "rgba(245, 158, 11, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#FBBF24",
                    }}
                  >
                    <ReceiptIcon sx={{ fontSize: 18 }} />
                  </Box>
                  <Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 900,
                        fontSize: "17px",
                        background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #F59E0B 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      Transaction Details
                    </Typography>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", fontSize: "11px" }}>
                      Settlement Ledger Audit Summary
                    </Typography>
                  </Box>
                </Stack>

                <IconButton onClick={() => setDrawerOpen(false)} sx={{ color: "rgba(255,255,255,0.7)", "&:hover": { color: "#FFF" } }}>
                  <CloseIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>

              {/* Content Body */}
              <Box sx={{ flex: 1, overflowY: "auto", p: 2.5, scrollbarWidth: "thin" }}>
                {/* Hero Box */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.2,
                    borderRadius: "14px",
                    bgcolor: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(254, 240, 138, 0.25)",
                    boxShadow: "0 8px 30px rgba(0, 0, 0, 0.3)",
                    textAlign: "center",
                    mb: 2.5,
                  }}
                >
                  <Chip
                    label={(selectedTxn.status || "SUCCESS").toUpperCase()}
                    size="small"
                    sx={{
                      height: "20px",
                      fontSize: "10.5px",
                      fontWeight: 800,
                      bgcolor:
                        (selectedTxn.status || "").toUpperCase() === "SUCCESS"
                          ? "rgba(16, 185, 129, 0.15)"
                          : (selectedTxn.status || "").toUpperCase() === "PENDING"
                          ? "rgba(245, 158, 11, 0.15)"
                          : (selectedTxn.status || "").toUpperCase() === "REVERSED"
                          ? "rgba(168, 85, 247, 0.15)"
                          : "rgba(239, 68, 68, 0.15)",
                      color:
                        (selectedTxn.status || "").toUpperCase() === "SUCCESS"
                          ? "#34D399"
                          : (selectedTxn.status || "").toUpperCase() === "PENDING"
                          ? "#FBBF24"
                          : (selectedTxn.status || "").toUpperCase() === "REVERSED"
                          ? "#C084FC"
                          : "#F87171",
                      border: `1px solid ${
                        (selectedTxn.status || "").toUpperCase() === "SUCCESS"
                          ? "rgba(16, 185, 129, 0.35)"
                          : (selectedTxn.status || "").toUpperCase() === "PENDING"
                          ? "rgba(245, 158, 11, 0.35)"
                          : (selectedTxn.status || "").toUpperCase() === "REVERSED"
                          ? "rgba(168, 85, 247, 0.35)"
                          : "rgba(239, 68, 68, 0.35)"
                      }`,
                      mb: 1,
                    }}
                  />

                  <Typography
                    sx={{
                      fontWeight: 900,
                      fontSize: "28px",
                      lineHeight: 1.1,
                      color: isCr ? "#34D399" : "#F87171",
                      mb: 0.5,
                    }}
                  >
                    {isCr ? "+" : "-"}₹{amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Typography>

                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.65)", fontSize: "11.5px", fontWeight: 600 }}>
                    {isCr ? "Wallet Inflow / Refund Credit" : "Service Debit / Payout Transfer"}
                  </Typography>

                  <Divider sx={{ my: 1.5, borderColor: "rgba(255,255,255,0.08)" }} />

                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1.5 }}>
                    <Box sx={{ textAlign: "center", bgcolor: "rgba(8,11,17,0.5)", p: 1, borderRadius: "8px" }}>
                      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: "10.5px", fontWeight: 600 }}>
                        Opening Balance
                      </Typography>
                      <Typography sx={{ fontWeight: 800, color: "rgba(255,255,255,0.9)", fontSize: "13px", mt: 0.2 }}>
                        ₹{openingBal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>

                    <Box sx={{ textAlign: "center", bgcolor: "rgba(8,11,17,0.5)", p: 1, borderRadius: "8px" }}>
                      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: "10.5px", fontWeight: 600 }}>
                        Closing Balance
                      </Typography>
                      <Typography sx={{ fontWeight: 800, color: "#FEF08A", fontSize: "13px", mt: 0.2 }}>
                        ₹{closingBal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>

                {/* Structured Metadata Fields */}
                <Typography sx={{ fontSize: "11.5px", fontWeight: 800, color: "#FBBF24", textTransform: "uppercase", letterSpacing: "0.8px", mb: 1.2 }}>
                  Audit Information
                </Typography>

                <Stack spacing={1.2} sx={{ mb: 2.5 }}>
                  {/* Txn ID */}
                  <Box sx={{ p: 1.2, borderRadius: "8px", bgcolor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: "10.5px" }}>Transaction ID</Typography>
                      <Typography sx={{ fontWeight: 700, fontSize: "12px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", color: "#FBBF24" }}>
                        {selectedTxn.txn_id}
                      </Typography>
                    </Box>
                    <IconButton size="small" onClick={() => copyToClipboard(selectedTxn.txn_id, "Transaction ID")} sx={{ color: "#FBBF24", p: 0.3 }}>
                      <ContentCopyIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Box>

                  {/* Ref ID */}
                  {selectedTxn.ref_id && (
                    <Box sx={{ p: 1.2, borderRadius: "8px", bgcolor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: "10.5px" }}>Client Reference ID</Typography>
                        <Typography sx={{ fontWeight: 600, fontSize: "12px", color: "#94A3B8" }}>
                          {selectedTxn.ref_id}
                        </Typography>
                      </Box>
                      <IconButton size="small" onClick={() => copyToClipboard(selectedTxn.ref_id || "", "Reference ID")} sx={{ color: "rgba(255,255,255,0.5)", p: 0.3 }}>
                        <ContentCopyIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Box>
                  )}

                  {/* Service & Type */}
                  <Box sx={{ p: 1.2, borderRadius: "8px", bgcolor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: "10.5px" }}>Service Category</Typography>
                    <Chip
                      label={svcBadge.label}
                      size="small"
                      sx={{ height: "20px", fontSize: "10.5px", fontWeight: 800, bgcolor: svcBadge.bg, color: svcBadge.text }}
                    />
                  </Box>

                  {/* Narration */}
                  <Box sx={{ p: 1.2, borderRadius: "8px", bgcolor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: "10.5px" }}>Narration / Description</Typography>
                    <Typography sx={{ fontWeight: 600, fontSize: "12px", color: "#F8FAFC", mt: 0.2 }}>
                      {getTransactionComments(selectedTxn)}
                    </Typography>
                  </Box>

                  {/* Timestamp */}
                  <Box sx={{ p: 1.2, borderRadius: "8px", bgcolor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: "10.5px" }}>Timestamp</Typography>
                    <Typography sx={{ fontWeight: 700, fontSize: "11.5px", color: "#F8FAFC" }}>
                      {dt.date} · {dt.time}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              {/* Drawer Footer Actions */}
              <Box sx={{ p: 2, bgcolor: "rgba(15, 23, 42, 0.85)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(254, 240, 138, 0.15)" }}>
                <Stack spacing={1}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => {
                      window.print();
                    }}
                    startIcon={<PrintIcon sx={{ fontSize: 17 }} />}
                    sx={{
                      height: "40px",
                      fontSize: "12.5px",
                      fontWeight: 800,
                      textTransform: "none",
                      borderRadius: "8px",
                      color: "#080B11",
                      background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #F59E0B 100%)",
                      boxShadow: "0 0 15px rgba(245, 158, 11, 0.3)",
                      "&:hover": {
                        background: "linear-gradient(135deg, #FFFBEB 0%, #FDE047 50%, #F59E0B 100%)",
                      },
                    }}
                  >
                    Print / Download Receipt
                  </Button>

                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => setDrawerOpen(false)}
                    sx={{
                      height: "36px",
                      fontSize: "12px",
                      fontWeight: 700,
                      textTransform: "none",
                      borderRadius: "8px",
                      color: "#F8FAFC",
                      borderColor: "rgba(255, 255, 255, 0.15)",
                      bgcolor: "rgba(255, 255, 255, 0.03)",
                      "&:hover": {
                        borderColor: "rgba(255, 255, 255, 0.3)",
                        bgcolor: "rgba(255, 255, 255, 0.08)",
                      },
                    }}
                  >
                    Close
                  </Button>
                </Stack>
              </Box>
            </Box>
          );
        })()}
      </Drawer>

      {/* ── 8. TOAST NOTIFICATIONS ── */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          sx={{
            bgcolor: "#0F172A",
            color: "#FEF08A",
            border: "1px solid rgba(254, 240, 138, 0.3)",
            fontWeight: 700,
            fontSize: "12.5px",
            "& .MuiAlert-icon": { color: "#FBBF24" },
          }}
        >
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RetailerTransactionReport;
