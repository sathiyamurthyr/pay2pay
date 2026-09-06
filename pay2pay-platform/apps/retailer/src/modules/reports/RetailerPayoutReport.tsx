"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Popover,
} from "@mui/material";

// Icons
import FilterListIcon from "@mui/icons-material/FilterList";
import TableRowsIcon from "@mui/icons-material/TableRows";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
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
import SendIcon from "@mui/icons-material/Send";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import PersonIcon from "@mui/icons-material/Person";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import StorefrontIcon from "@mui/icons-material/Storefront";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

import { useCompanyBranding } from "@/hooks/useCompanyBranding";
import { useRetailerStore } from "@/stores/use-retailer-store";

export interface PayoutReportSummary {
  todays_transactions: number;
  todays_transfer_amount: number;
  todays_wallet_debit: number;
  todays_commission: number;
  todays_gst: number;
  todays_tds: number;
  pending_transactions: number;
  successful_transactions: number;
  failed_transactions: number;
  reversed_transactions: number;
  successful_amount?: number;
  pending_amount?: number;
  failed_amount?: number;
}

export interface PayoutReportItem {
  s_no: number;
  txn_id?: string;
  transaction_id?: string;
  transaction_number?: string;
  reference_id?: string;
  retailer?: string;
  customer?: string;
  customer_name?: string;
  customer_mobile?: string;
  beneficiary?: string;
  beneficiary_name?: string;
  beneficiary_mobile?: string;
  account?: string;
  ac_no?: string;
  account_number?: string;
  masked_account_number?: string;
  bank?: string;
  bank_name?: string;
  ifsc?: string;
  ifsc_code?: string;
  amount?: number;
  amt?: number;
  transfer_amount?: number;
  charge?: number;
  fee?: number;
  convenience_fee?: number;
  gst?: number;
  tax?: number;
  gst_amount?: number;
  tds_amount?: number;
  debit?: number;
  wallet_debit?: number;
  mode?: string;
  payment_mode?: string;
  utr?: string;
  utr_number?: string;
  wallet?: string;
  date_time?: string;
  initiated_at?: string;
  status: string;
  narration?: string;
  remarks?: string;
  comments?: string;
}

export const RetailerPayoutReport: React.FC = () => {
  const branding = useCompanyBranding();
  const { outlet } = useRetailerStore();

  // State: Authoritative Data
  const [items, setItems] = useState<PayoutReportItem[]>([]);
  const [summary, setSummary] = useState<PayoutReportSummary | null>(null);
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
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
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

  // Drawer / Side Panel
  const [selectedTxn, setSelectedTxn] = useState<PayoutReportItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [exportAnchorEl, setExportAnchorEl] = useState<HTMLButtonElement | null>(null);

  // New Enterprise Grid Controls
  const [density, setDensity] = useState<"compact" | "medium" | "comfortable">("medium");
  const [densityAnchorEl, setDensityAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [columnsAnchorEl, setColumnsAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [customDateOpen, setCustomDateOpen] = useState<boolean>(false);
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");

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
      if (statusFilter !== "ALL") q.append("status", statusFilter);
      if (paymentModeFilter !== "ALL") {
        q.append("mode", paymentModeFilter);
        q.append("payment_mode", paymentModeFilter);
      }

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

      // Fetch Grid
      const res = await fetch(`/api/v1/payout/reports/grid?${q.toString()}`, {
        headers,
        credentials: "include",
        cache: "no-store",
      });

      // Fetch Summary
      const summaryQ = new URLSearchParams();
      if (fromDate) summaryQ.append("from_date", fromDate);
      if (toDate) summaryQ.append("to_date", toDate);

      const summaryRes = await fetch(`/api/v1/payout/reports/summary?${summaryQ.toString()}`, {
        headers,
        credentials: "include",
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        const rawItems = Array.isArray(data.items)
          ? data.items
          : Array.isArray(data.data)
          ? data.data
          : Array.isArray(data.data?.items)
          ? data.data.items
          : [];
        const total = data.pagination?.total_records ?? rawItems.length;

        setItems(rawItems);
        setTotalRecords(total);

        if (summaryRes.ok) {
          const summaryJson = await summaryRes.json();
          const d = summaryJson.data || summaryJson;
          setSummary({
            todays_transactions: Number(d.todays_transactions ?? d.total_transactions ?? total),
            todays_transfer_amount: Number(d.todays_transfer_amount ?? d.total_volume ?? 0),
            todays_wallet_debit: Number(d.todays_wallet_debit ?? 0),
            todays_commission: Number(d.todays_commission ?? d.total_charges ?? 0),
            todays_gst: Number(d.todays_gst ?? d.total_gst ?? 0),
            todays_tds: Number(d.todays_tds ?? 0),
            pending_transactions: Number(d.pending_transactions ?? 0),
            successful_transactions: Number(d.successful_transactions ?? d.success_transactions ?? 0),
            failed_transactions: Number(d.failed_transactions ?? 0),
            reversed_transactions: Number(d.reversed_transactions ?? 0),
            successful_amount: Number(d.successful_amount ?? d.success_amount ?? 0),
            pending_amount: Number(d.pending_amount ?? 0),
            failed_amount: Number(d.failed_amount ?? 0),
          });
        }
        setLastUpdatedTime(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
      } else {
        setItems([]);
        setTotalRecords(0);
      }
    } catch (err) {
      console.error("Failed to fetch payout report:", err);
      setItems([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [page, rowsPerPage, statusFilter, paymentModeFilter, fromDate, toDate, globalSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh effect (30s)
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      fetchData();
    }, 30000);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchData]);

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


  const openDetailsDrawer = (item: PayoutReportItem) => {
    setSelectedTxn(item);
    setDrawerOpen(true);
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
    } else if (preset === "THIS_MONTH") {
      const d = new Date();
      d.setDate(1);
      setFromDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
      setToDate(today);
    }
  };

  const handleResetFilters = () => {
    setGlobalSearch("");
    setStatusFilter("ALL");
    setPaymentModeFilter("ALL");
    handleDatePreset("TODAY");
    showToast("Filters reset to default");
  };

  const handleExportCsv = () => {
    const headers = [
      "Txn ID",
      "UTR",
      "Customer",
      "Beneficiary",
      "Account",
      "Transfer Amount",
      "Charges",
      "GST",
      "Wallet Debit",
      "Mode",
      "Status",
      "Date/Time",
    ];
    const rows = items.map((r) => [
      r.txn_id || r.transaction_number || r.transaction_id || "--",
      r.utr || r.utr_number || "--",
      r.customer || r.customer_name || "Customer",
      r.beneficiary || r.beneficiary_name || "Beneficiary",
      r.account || r.ac_no || r.account_number || "--",
      (r.amount ?? r.amt ?? r.transfer_amount ?? 0).toFixed(2),
      (r.charge ?? r.fee ?? r.convenience_fee ?? 0).toFixed(2),
      (r.gst ?? r.tax ?? r.gst_amount ?? 0).toFixed(2),
      (r.debit ?? r.wallet_debit ?? (Number(r.amount || 0) + Number(r.charge || 0) + Number(r.gst || 0))).toFixed(2),
      r.mode || r.payment_mode || "IMPS",
      (r.status || "SUCCESS").toUpperCase(),
      r.date_time || r.initiated_at || "--",
    ]);

    const csvContent = [headers.join(","), ...rows.map((e) => e.map((cell) => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Pay2Pay_Payout_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportAnchorEl(null);
    showToast("Payout CSV exported successfully.");
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

  const handlePrintReceipt = (txn?: PayoutReportItem | null) => {
    const t = txn || selectedTxn;
    if (!t) return;

    const txnId = t.txn_id || t.transaction_number || t.transaction_id || "N/A";
    const utr = t.utr || t.utr_number || "N/A";
    const amt = Number(t.amount ?? t.amt ?? t.transfer_amount ?? 0);
    const fee = Number(t.charge ?? t.fee ?? t.convenience_fee ?? 0);
    const gst = Number(t.gst ?? t.tax ?? t.gst_amount ?? 0);
    const totalDebit = Number(t.debit ?? t.wallet_debit ?? (amt + fee + gst));
    const dt = formatDateTime(t.date_time || t.initiated_at);
    const status = (t.status || "SUCCESS").toUpperCase();
    const beneName = t.beneficiary || t.beneficiary_name || "Beneficiary";
    const accNo = t.account || t.ac_no || t.account_number || "N/A";
    const ifsc = t.ifsc || t.ifsc_code || "N/A";
    const bankName = t.bank || t.bank_name || "N/A";
    const mode = t.mode || t.payment_mode || "IMPS";

    const compLogo = branding.logo_url || "/branding/logo.png";
    const compName = branding.company_name || branding.legal_name || "SUPER REX PRODUCTS PRIVATE LIMITED";
    const compLegal = branding.legal_name || compName;
    const retailerShop = outlet?.name || "Pay2Pay Retail Point";
    const retailerOwner = outlet?.ownerName || t.retailer || "Authorized Agent";
    const retailerCode = outlet?.code || "RET-P2P";
    const retailerMobile = outlet?.mobile || "";
    const retailerCity = outlet?.location || "";

    const statusBadgeClass =
      status === "SUCCESS"
        ? "badge-success"
        : status === "PENDING"
        ? "badge-pending"
        : status === "REVERSED"
        ? "badge-reversed"
        : "badge-failed";

    const statusText =
      status === "SUCCESS"
        ? "● TRANSACTION SUCCESSFUL"
        : status === "PENDING"
        ? "● TRANSACTION PENDING"
        : status === "REVERSED"
        ? "● TRANSACTION REVERSED"
        : "● TRANSACTION FAILED";

    const printWindow = window.open("", "_blank", "width=850,height=950");
    if (!printWindow) {
      showToast("Please allow popups in your browser to view and print the transaction receipt.");
      return;
    }

    const receiptHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Payout_Receipt_${txnId}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background: #F1F5F9;
              color: #0F172A;
              margin: 0;
              padding: 24px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .actions-bar {
              max-width: 680px;
              margin: 0 auto 16px auto;
              display: flex;
              gap: 12px;
              justify-content: flex-end;
            }
            .btn {
              padding: 10px 18px;
              border-radius: 8px;
              font-size: 13px;
              font-weight: 700;
              cursor: pointer;
              border: none;
              transition: all 0.2s;
            }
            .btn-print {
              background: linear-gradient(135deg, #FBBF24 0%, #D97706 100%);
              color: #000;
              box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
            }
            .btn-download {
              background: #0F172A;
              color: #FFF;
              border: 1px solid #334155;
            }
            .btn-close {
              background: #E2E8F0;
              color: #334155;
            }
            .receipt-wrapper {
              max-width: 680px;
              margin: 0 auto;
              background: #FFFFFF;
              border: 1px solid #CBD5E1;
              border-radius: 16px;
              padding: 32px;
              box-shadow: 0 10px 25px rgba(0, 0, 0, 0.06);
            }
            .brand-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #E2E8F0;
              padding-bottom: 20px;
              margin-bottom: 20px;
            }
            .brand-left {
              display: flex;
              align-items: center;
              gap: 14px;
            }
            .brand-logo {
              width: 52px;
              height: 52px;
              object-fit: contain;
              border-radius: 8px;
            }
            .brand-name {
              font-size: 18px;
              font-weight: 900;
              color: #0F172A;
              line-height: 1.2;
            }
            .brand-legal {
              font-size: 11px;
              color: #64748B;
              font-weight: 600;
              margin-top: 2px;
            }
            .receipt-badge-title {
              text-align: right;
            }
            .receipt-type-tag {
              display: inline-block;
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.8px;
              color: #B45309;
              background: #FEF3C7;
              border: 1px solid #FDE68A;
              padding: 4px 10px;
              border-radius: 6px;
            }
            .retailer-box {
              background: #F8FAFC;
              border: 1px solid #E2E8F0;
              border-radius: 12px;
              padding: 14px 18px;
              margin-bottom: 20px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .retailer-title {
              font-size: 10.5px;
              font-weight: 800;
              color: #64748B;
              text-transform: uppercase;
              letter-spacing: 0.6px;
              margin-bottom: 4px;
            }
            .retailer-name {
              font-size: 14px;
              font-weight: 800;
              color: #0F172A;
            }
            .retailer-meta {
              font-size: 12px;
              color: #475569;
              font-weight: 600;
              margin-top: 2px;
            }
            .status-banner {
              padding: 12px 18px;
              border-radius: 10px;
              font-size: 13px;
              font-weight: 800;
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 24px;
            }
            .badge-success { background: #DCFCE7; color: #15803D; border: 1px solid #86EFAC; }
            .badge-pending { background: #FEF3C7; color: #B45309; border: 1px solid #FDE68A; }
            .badge-failed { background: #FEE2E2; color: #B91C1C; border: 1px solid #FCA5A5; }
            .badge-reversed { background: #F3E8FF; color: #7E22CE; border: 1px solid #D8B4FE; }
            .amount-hero {
              text-align: center;
              background: linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%);
              border: 1px solid #E2E8F0;
              border-radius: 14px;
              padding: 20px;
              margin-bottom: 24px;
            }
            .amount-label {
              font-size: 11px;
              font-weight: 800;
              color: #64748B;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .amount-value {
              font-size: 36px;
              font-weight: 900;
              color: #0F172A;
              margin: 4px 0;
            }
            .amount-mode {
              font-size: 12px;
              font-weight: 700;
              color: #2563EB;
            }
            .section-title {
              font-size: 11.5px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.8px;
              color: #475569;
              border-bottom: 1px solid #E2E8F0;
              padding-bottom: 6px;
              margin: 20px 0 12px 0;
            }
            .grid-2 {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-bottom: 12px;
            }
            .item-cell {
              background: #FFFFFF;
              border: 1px solid #F1F5F9;
              padding: 10px 14px;
              border-radius: 8px;
            }
            .item-label {
              font-size: 11px;
              color: #64748B;
              font-weight: 600;
              margin-bottom: 3px;
            }
            .item-val {
              font-size: 13px;
              font-weight: 700;
              color: #0F172A;
              word-break: break-all;
            }
            .item-val-mono {
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              color: #1E293B;
            }
            .breakdown-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              border: 1px solid #E2E8F0;
              border-radius: 8px;
              overflow: hidden;
            }
            .breakdown-table th {
              background: #F8FAFC;
              text-align: left;
              padding: 10px 14px;
              font-size: 11px;
              font-weight: 800;
              color: #64748B;
              text-transform: uppercase;
              border-bottom: 1px solid #E2E8F0;
            }
            .breakdown-table td {
              padding: 10px 14px;
              font-size: 12.5px;
              font-weight: 600;
              color: #1E293B;
              border-bottom: 1px solid #F1F5F9;
            }
            .breakdown-table .total-row td {
              background: #FEF3C7;
              font-weight: 900;
              color: #92400E;
              font-size: 14px;
              border-top: 2px solid #FDE68A;
            }
            .footer-info {
              margin-top: 28px;
              padding-top: 16px;
              border-top: 1px dashed #CBD5E1;
              text-align: center;
              font-size: 11px;
              color: #64748B;
              line-height: 1.5;
            }
            @media print {
              body { background: #FFF; padding: 0; }
              .actions-bar { display: none !important; }
              .receipt-wrapper { border: none; box-shadow: none; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="actions-bar no-print">
            <button class="btn btn-print" onclick="window.print()">🖨 Print Voucher / Save PDF</button>
            <button class="btn btn-download" onclick="downloadReceiptHtml()">📥 Download Receipt (.html)</button>
            <button class="btn btn-close" onclick="window.close()">✕ Close</button>
          </div>

          <div class="receipt-wrapper" id="receiptContent">
            <!-- Header with Company Branding -->
            <div class="brand-header">
              <div class="brand-left">
                <img src="${compLogo}" alt="${compName}" class="brand-logo" onerror="this.style.display='none'" />
                <div>
                  <div class="brand-name">${compName}</div>
                  <div class="brand-legal">${compLegal}</div>
                </div>
              </div>
              <div class="receipt-badge-title">
                <span class="receipt-type-tag">Payout Voucher</span>
                <div style="font-size: 11px; color: #64748B; margin-top: 4px; font-weight: 600;">
                  ${dt.date} · ${dt.time}
                </div>
              </div>
            </div>

            <!-- Retailer Store Identification -->
            <div class="retailer-box">
              <div>
                <div class="retailer-title">Issued Through Authorized Retail Point</div>
                <div class="retailer-name">${retailerShop}</div>
                <div class="retailer-meta">Agent: ${retailerOwner} ${retailerMobile ? "· " + retailerMobile : ""}</div>
              </div>
              <div style="text-align: right;">
                <div class="retailer-title">Outlet ID</div>
                <div style="font-size: 13px; font-weight: 800; font-family: monospace; color: #0F172A;">${retailerCode}</div>
                <div style="font-size: 11px; color: #64748B;">${retailerCity}</div>
              </div>
            </div>

            <!-- Transaction Status Banner -->
            <div class="status-banner ${statusBadgeClass}">
              <span>${statusText}</span>
              <span style="font-size: 12px; font-family: monospace;">UTR: ${utr}</span>
            </div>

            <!-- Payout Amount Hero -->
            <div class="amount-hero">
              <div class="amount-label">PAYOUT TRANSFER AMOUNT</div>
              <div class="amount-value">₹${amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
              <div class="amount-mode">Payment Mode: ${mode} (Instant Bank Transfer)</div>
            </div>

            <!-- Transaction & Beneficiary Grid -->
            <div class="grid-2">
              <div class="item-cell">
                <div class="item-label">Transaction ID</div>
                <div class="item-val item-val-mono">${txnId}</div>
              </div>
              <div class="item-cell">
                <div class="item-label">Bank UTR / Ref Number</div>
                <div class="item-val item-val-mono">${utr}</div>
              </div>
              <div class="item-cell">
                <div class="item-label">Beneficiary Name</div>
                <div class="item-val">${beneName}</div>
              </div>
              <div class="item-cell">
                <div class="item-label">Beneficiary Bank</div>
                <div class="item-val">${bankName}</div>
              </div>
              <div class="item-cell">
                <div class="item-label">Beneficiary Account Number</div>
                <div class="item-val item-val-mono">${accNo}</div>
              </div>
              <div class="item-cell">
                <div class="item-label">IFSC Code</div>
                <div class="item-val item-val-mono">${ifsc}</div>
              </div>
            </div>

            <!-- Financial Breakdown Table -->
            <div class="section-title">Wallet Financial Settlement Breakdown</div>
            <table class="breakdown-table">
              <thead>
                <tr>
                  <th>Particulars</th>
                  <th style="text-align: right;">Calculation Rate</th>
                  <th style="text-align: right;">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Payout Transfer Amount</td>
                  <td style="text-align: right;">Principal</td>
                  <td style="text-align: right; font-weight: 700;">₹${amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td>Service / Convenience Fee</td>
                  <td style="text-align: right;">Fixed / Slab Charge</td>
                  <td style="text-align: right;">₹${fee.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td>GST</td>
                  <td style="text-align: right;">18% on Convenience Fee</td>
                  <td style="text-align: right;">₹${gst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr class="total-row">
                  <td>TOTAL WALLET DEBIT</td>
                  <td style="text-align: right;">Gross Settlement</td>
                  <td style="text-align: right; font-size: 15px;">₹${totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>

            <!-- Audit & Security Footer -->
            <div class="footer-info">
              <strong>Official Electronic Transaction Voucher</strong><br />
              This is a computer-generated transaction advice issued via the Pay2Pay Platform.<br />
              Authorized and processed through banking partner switch. No physical signature required.<br />
              Generated on: ${new Date().toLocaleString("en-IN")}
            </div>
          </div>

          <script>
            function downloadReceiptHtml() {
              var clone = document.documentElement.cloneNode(true);
              var bars = clone.querySelectorAll('.no-print');
              bars.forEach(function(el) { el.remove(); });
              var blob = new Blob([clone.outerHTML], { type: 'text/html;charset=utf-8' });
              var a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = 'Payout_Receipt_${txnId}.html';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }

            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  const successPercent = useMemo(() => {
    if (!summary?.todays_transactions) return 100;
    return Math.round(((summary.successful_transactions || 0) / summary.todays_transactions) * 100);
  }, [summary]);

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "100%",
        bgcolor: "transparent",
        color: "#0F172A",
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
                  bgcolor: "rgba(59, 130, 246, 0.15)",
                  border: "1px solid rgba(96, 165, 250, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#60A5FA",
                  boxShadow: "0 0 15px rgba(59, 130, 246, 0.15)",
                }}
              >
                <SendIcon sx={{ fontSize: 18 }} />
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
                Payout Report
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
              Monitor, track and verify all beneficiary payout dispatches
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
              label={`${totalRecords} Payouts`}
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
        {/* KPI 1: TOTAL TRANSFER VOLUME */}
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
              TRANSFER VOLUME
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
              ₹{(summary?.todays_transfer_amount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          )}
          <Typography sx={{ color: "rgba(255, 255, 255, 0.65)", fontSize: "11.5px", fontWeight: 600 }}>
            {summary?.todays_transactions ?? totalRecords ?? 0} Payout Orders
          </Typography>
        </Paper>

        {/* KPI 2: TOTAL WALLET DEBIT */}
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
              WALLET DEBIT
            </Typography>
            <Box sx={{ width: 28, height: 28, borderRadius: "8px", bgcolor: "rgba(239, 68, 68, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#F87171" }}>
              <ArrowUpwardIcon sx={{ fontSize: 16 }} />
            </Box>
          </Stack>

          {isLoading ? (
            <Skeleton variant="text" width="65%" height={36} sx={{ bgcolor: "rgba(255,255,255,0.08)" }} />
          ) : (
            <Typography sx={{ fontWeight: 900, fontSize: { xs: "20px", md: "24px" }, lineHeight: 1.1, color: "#F87171", mb: 0.3 }}>
              -₹{(summary?.todays_wallet_debit ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          )}
          <Typography sx={{ color: "rgba(255, 255, 255, 0.65)", fontSize: "11.5px", fontWeight: 600 }}>
            Amount + Fees + Taxes
          </Typography>
        </Paper>

        {/* KPI 3: SUCCESSFUL PAYOUTS */}
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
              SUCCESSFUL
            </Typography>
            <Box sx={{ width: 28, height: 28, borderRadius: "8px", bgcolor: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#34D399" }}>
              <CheckCircleIcon sx={{ fontSize: 16 }} />
            </Box>
          </Stack>

          {isLoading ? (
            <Skeleton variant="text" width="65%" height={36} sx={{ bgcolor: "rgba(255,255,255,0.08)" }} />
          ) : (
            <Typography sx={{ fontWeight: 900, fontSize: { xs: "20px", md: "24px" }, lineHeight: 1.1, color: "#34D399", mb: 0.3 }}>
              {summary?.successful_transactions ?? 0}
            </Typography>
          )}
          <Typography sx={{ color: "rgba(255, 255, 255, 0.65)", fontSize: "11.5px", fontWeight: 600 }}>
            ₹{(summary?.successful_amount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })} Settled
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
              DISPATCH RATE
            </Typography>
            <Box sx={{ width: 28, height: 28, borderRadius: "8px", bgcolor: "rgba(59, 130, 246, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#60A5FA" }}>
              <TrendingUpIcon sx={{ fontSize: 16 }} />
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
            {summary?.pending_transactions ?? 0} Pending · {summary?.failed_transactions ?? 0} Failed
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
          bgcolor: "rgba(15, 23, 42, 0.75)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(254, 240, 138, 0.2)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35)",
          mb: 2,
          display: "flex",
          flexDirection: { xs: "column", lg: "row" },
          alignItems: { xs: "flex-start", lg: "center" },
          justifyContent: "space-between",
          gap: 1.5,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ overflowX: "auto", maxWidth: "100%", width: "100%", pb: { xs: 0.5, lg: 0 } }}>
          <Stack direction="row" alignItems="center" spacing={0.8} sx={{ color: "#FBBF24", mr: 1, flexShrink: 0 }}>
            <CalendarMonthIcon sx={{ fontSize: 18 }} />
            <Typography sx={{ fontSize: "12.5px", fontWeight: 800, color: "#FBBF24", whiteSpace: "nowrap" }}>
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
                  bgcolor: isSelected ? undefined : "rgba(255, 255, 255, 0.05)",
                  background: isSelected ? "linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #F59E0B 100%)" : "none",
                  color: isSelected ? "#080B11" : "rgba(255, 255, 255, 0.8)",
                  border: isSelected ? "1px solid #FEF08A" : "1px solid rgba(255, 255, 255, 0.12)",
                  boxShadow: isSelected ? "0 0 12px rgba(245, 158, 11, 0.35)" : "none",
                  "&:hover": {
                    bgcolor: isSelected ? undefined : "rgba(255, 255, 255, 0.1)",
                    borderColor: isSelected ? "#FEF08A" : "rgba(254, 240, 138, 0.35)",
                    color: isSelected ? "#080B11" : "#F8FAFC",
                  },
                }}
              >
                {preset.label}
              </Button>
            );
          })}
        </Stack>

        <Typography sx={{ fontSize: "11.5px", color: "rgba(255, 255, 255, 0.65)", fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap" }}>
          Showing records for <strong style={{ color: "#FDE68A" }}>{formatDisplayDateRange(fromDate, toDate, activePreset)}</strong> ⚡
        </Typography>
      </Paper>

      {/* ── 4. MASTER CONTROLS TOOLBAR ── */}
      <Paper
        elevation={0}
        sx={{
          p: 1.2,
          px: { xs: 1.5, sm: 2 },
          borderRadius: "12px",
          bgcolor: "rgba(15, 23, 42, 0.75)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(254, 240, 138, 0.2)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35)",
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
            placeholder="Search Serial Number, Mobile, Txn ID, UTR..."
            value={globalSearch}
            onChange={(e) => {
              setGlobalSearch(e.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#FBBF24", fontSize: 18 }} />
                </InputAdornment>
              ),
              endAdornment: globalSearch ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setGlobalSearch("")} sx={{ color: "rgba(255,255,255,0.6)" }}>
                    <ClearIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
              sx: {
                bgcolor: "rgba(8, 11, 17, 0.85)",
                color: "#F8FAFC",
                borderRadius: "8px",
                fontSize: "12.5px",
                height: "38px",
                border: "1px solid rgba(255, 255, 255, 0.14)",
                "& fieldset": { border: "none" },
                "&:hover": { borderColor: "rgba(254, 240, 138, 0.4)" },
                "&.Mui-focused": {
                  borderColor: "#FBBF24",
                  boxShadow: "0 0 14px rgba(245, 158, 11, 0.25)",
                },
              },
            }}
          />
        </Box>

        {/* Action Controls & Record Count */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ flexWrap: "wrap", justifyContent: { xs: "flex-start", lg: "flex-end" } }}>
          {/* Filter */}
          <Button
            size="small"
            variant="outlined"
            onClick={(e) => setFilterAnchorEl(e.currentTarget)}
            startIcon={<FilterListIcon sx={{ fontSize: 16, color: statusFilter !== "ALL" || paymentModeFilter !== "ALL" ? "#FBBF24" : "rgba(255,255,255,0.7)" }} />}
            sx={{
              height: "38px",
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "none",
              borderRadius: "8px",
              color: statusFilter !== "ALL" || paymentModeFilter !== "ALL" ? "#FBBF24" : "#F8FAFC",
              borderColor: statusFilter !== "ALL" || paymentModeFilter !== "ALL" ? "#FBBF24" : "rgba(255, 255, 255, 0.14)",
              bgcolor: statusFilter !== "ALL" || paymentModeFilter !== "ALL" ? "rgba(245, 158, 11, 0.18)" : "rgba(8, 11, 17, 0.85)",
              "&:hover": { bgcolor: "rgba(255, 255, 255, 0.08)", borderColor: "rgba(254, 240, 138, 0.35)" },
            }}
          >
            Filter {statusFilter !== "ALL" || paymentModeFilter !== "ALL" ? "•" : ""}
          </Button>

          {/* Density */}
          <Button
            size="small"
            variant="outlined"
            onClick={(e) => setDensityAnchorEl(e.currentTarget)}
            startIcon={<TableRowsIcon sx={{ fontSize: 16, color: "#FBBF24" }} />}
            sx={{
              height: "38px",
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "none",
              borderRadius: "8px",
              color: "#F8FAFC",
              borderColor: "rgba(255, 255, 255, 0.14)",
              bgcolor: "rgba(8, 11, 17, 0.85)",
              "&:hover": { bgcolor: "rgba(255, 255, 255, 0.08)", borderColor: "rgba(254, 240, 138, 0.35)" },
            }}
          >
            {density === "compact" ? "Compact" : density === "comfortable" ? "Comfortable" : "Medium"}
          </Button>

          {/* Columns */}
          <Button
            size="small"
            variant="outlined"
            onClick={(e) => setColumnsAnchorEl(e.currentTarget)}
            startIcon={<ViewColumnIcon sx={{ fontSize: 16, color: "#FBBF24" }} />}
            sx={{
              height: "38px",
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "none",
              borderRadius: "8px",
              color: "#F8FAFC",
              borderColor: "rgba(255, 255, 255, 0.14)",
              bgcolor: "rgba(8, 11, 17, 0.85)",
              "&:hover": { bgcolor: "rgba(255, 255, 255, 0.08)", borderColor: "rgba(254, 240, 138, 0.35)" },
            }}
          >
            Columns
          </Button>

          {/* Export */}
          <Button
            size="small"
            variant="outlined"
            onClick={(e) => setExportAnchorEl(e.currentTarget)}
            startIcon={<FileDownloadIcon sx={{ fontSize: 16, color: "#FBBF24" }} />}
            endIcon={<ArrowDropDownIcon sx={{ fontSize: 16, color: "rgba(255,255,255,0.7)" }} />}
            sx={{
              height: "38px",
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "none",
              borderRadius: "8px",
              color: "#F8FAFC",
              borderColor: "rgba(255, 255, 255, 0.14)",
              bgcolor: "rgba(8, 11, 17, 0.85)",
              "&:hover": { bgcolor: "rgba(255, 255, 255, 0.08)", borderColor: "rgba(254, 240, 138, 0.35)" },
            }}
          >
            Export
          </Button>

          {/* Refresh */}
          <Tooltip title="Refresh Data">
            <IconButton
              size="small"
              onClick={() => {
                setIsRefreshing(true);
                fetchData();
              }}
              disabled={isLoading || isRefreshing}
              sx={{
                width: 38,
                height: 38,
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.14)",
                bgcolor: "rgba(8, 11, 17, 0.85)",
                color: "#FBBF24",
                "&:hover": { bgcolor: "rgba(245, 158, 11, 0.15)", borderColor: "rgba(254, 240, 138, 0.35)" },
              }}
            >
              <RefreshIcon sx={{ fontSize: 18, animation: isRefreshing || isLoading ? "spin 0.8s linear infinite" : "none" }} />
            </IconButton>
          </Tooltip>

          {/* Auto Refresh */}
          <Tooltip title={autoRefresh ? "Auto-refresh active (every 30s)" : "Enable auto-refresh (30s)"}>
            <IconButton
              size="small"
              onClick={() => setAutoRefresh(!autoRefresh)}
              sx={{
                width: 38,
                height: 38,
                borderRadius: "8px",
                border: autoRefresh ? "1px solid #FBBF24" : "1px solid rgba(255, 255, 255, 0.14)",
                bgcolor: autoRefresh ? "rgba(245, 158, 11, 0.2)" : "rgba(8, 11, 17, 0.85)",
                color: autoRefresh ? "#FBBF24" : "rgba(255, 255, 255, 0.6)",
                "&:hover": { bgcolor: "rgba(245, 158, 11, 0.15)", borderColor: "rgba(254, 240, 138, 0.35)" },
              }}
            >
              <AccessTimeIcon sx={{ fontSize: 18 }} />
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
                border: "1px solid rgba(255, 255, 255, 0.14)",
                bgcolor: "rgba(8, 11, 17, 0.85)",
                color: "rgba(255, 255, 255, 0.6)",
                "&:hover": { bgcolor: "rgba(255, 255, 255, 0.08)", borderColor: "rgba(254, 240, 138, 0.35)", color: "#F8FAFC" },
              }}
            >
              {isFullscreen ? <FullscreenExitIcon sx={{ fontSize: 18 }} /> : <FullscreenIcon sx={{ fontSize: 18 }} />}
            </IconButton>
          </Tooltip>

          {/* Record Count */}
          <Typography sx={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.65)", fontWeight: 700, pl: 1, whiteSpace: "nowrap" }}>
            Showing <strong style={{ color: "#F8FAFC" }}>{totalRecords}</strong> records
          </Typography>
        </Stack>
      </Paper>

      {/* Density Menu */}
      <Menu
        anchorEl={densityAnchorEl}
        open={Boolean(densityAnchorEl)}
        onClose={() => setDensityAnchorEl(null)}
        slotProps={{ paper: { sx: { borderRadius: "10px", width: 150, p: 0.5, bgcolor: "#0F172A", border: "1px solid rgba(254, 240, 138, 0.25)", color: "#F8FAFC" } } }}
      >
        <MenuItem onClick={() => { setDensity("compact"); setDensityAnchorEl(null); }} sx={{ fontSize: "12px", fontWeight: density === "compact" ? 800 : 500, color: density === "compact" ? "#FBBF24" : "#F8FAFC" }}>
          Compact
        </MenuItem>
        <MenuItem onClick={() => { setDensity("medium"); setDensityAnchorEl(null); }} sx={{ fontSize: "12px", fontWeight: density === "medium" ? 800 : 500, color: density === "medium" ? "#FBBF24" : "#F8FAFC" }}>
          Medium
        </MenuItem>
        <MenuItem onClick={() => { setDensity("comfortable"); setDensityAnchorEl(null); }} sx={{ fontSize: "12px", fontWeight: density === "comfortable" ? 800 : 500, color: density === "comfortable" ? "#FBBF24" : "#F8FAFC" }}>
          Comfortable
        </MenuItem>
      </Menu>

      {/* Columns Chooser Menu */}
      <Menu
        anchorEl={columnsAnchorEl}
        open={Boolean(columnsAnchorEl)}
        onClose={() => setColumnsAnchorEl(null)}
        slotProps={{ paper: { sx: { borderRadius: "10px", width: 220, p: 1, bgcolor: "#0F172A", border: "1px solid rgba(254, 240, 138, 0.25)", maxHeight: 360, color: "#F8FAFC" } } }}
      >
        <Typography sx={{ fontSize: "11px", fontWeight: 800, color: "#FBBF24", textTransform: "uppercase", px: 1, mb: 0.5 }}>
          Toggle Columns
        </Typography>
        <Divider sx={{ my: 0.5, borderColor: "rgba(255, 255, 255, 0.08)" }} />
        {[
          { id: "s_no", label: "S.No" },
          { id: "txn_id", label: "Txn ID & Ref ID" },
          { id: "amount", label: "Amount" },
          { id: "tax", label: "Tax & Charges" },
          { id: "net_amount", label: "Net Amount" },
          { id: "bene_name", label: "Bene Name" },
          { id: "account", label: "Account & Bank" },
          { id: "utr", label: "UTR" },
          { id: "status", label: "Status" },
          { id: "retailer", label: "Retailer Name" },
          { id: "date_time", label: "Date & Time" },
        ].map((col) => (
          <MenuItem
            key={col.id}
            onClick={() => toggleColumn(col.id)}
            sx={{ fontSize: "12px", py: 0.5, px: 1, display: "flex", alignItems: "center", gap: 1, color: "#F8FAFC" }}
          >
            <Checkbox size="small" checked={!hiddenColumns.has(col.id)} sx={{ p: 0.2, color: "rgba(255,255,255,0.4)", "&.Mui-checked": { color: "#FBBF24" } }} />
            <Typography sx={{ fontSize: "12px", fontWeight: !hiddenColumns.has(col.id) ? 700 : 400, color: "#F8FAFC" }}>
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
        slotProps={{ paper: { sx: { borderRadius: "12px", width: 280, p: 2, bgcolor: "#0F172A", border: "1px solid rgba(254, 240, 138, 0.25)", boxShadow: "0 8px 32px rgba(0,0,0,0.6)", color: "#F8FAFC" } } }}
      >
        <Typography sx={{ fontSize: "13px", fontWeight: 800, color: "#F8FAFC", mb: 1.5 }}>
          Filter Payout Records
        </Typography>
        <Stack spacing={1.5}>
          <Box>
            <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#FBBF24", mb: 0.5 }}>STATUS</Typography>
            <FormControl fullWidth size="small">
              <Select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                sx={{
                  height: 36,
                  fontSize: "12px",
                  bgcolor: "rgba(8, 11, 17, 0.85)",
                  color: "#F8FAFC",
                  border: "1px solid rgba(255, 255, 255, 0.14)",
                  "& fieldset": { border: "none" },
                  "& .MuiSvgIcon-root": { color: "#FBBF24" },
                }}
              >
                <MenuItem value="ALL" sx={{ bgcolor: "#0F172A", color: "#F8FAFC" }}>All Statuses</MenuItem>
                <MenuItem value="SUCCESS" sx={{ bgcolor: "#0F172A", color: "#34D399" }}>Success</MenuItem>
                <MenuItem value="PENDING" sx={{ bgcolor: "#0F172A", color: "#FBBF24" }}>Pending</MenuItem>
                <MenuItem value="FAILED" sx={{ bgcolor: "#0F172A", color: "#F87171" }}>Failed</MenuItem>
                <MenuItem value="REVERSED" sx={{ bgcolor: "#0F172A", color: "#C084FC" }}>Reversed</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Box>
            <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#FBBF24", mb: 0.5 }}>PAYMENT MODE</Typography>
            <FormControl fullWidth size="small">
              <Select
                value={paymentModeFilter}
                onChange={(e) => { setPaymentModeFilter(e.target.value); setPage(0); }}
                sx={{
                  height: 36,
                  fontSize: "12px",
                  bgcolor: "rgba(8, 11, 17, 0.85)",
                  color: "#F8FAFC",
                  border: "1px solid rgba(255, 255, 255, 0.14)",
                  "& fieldset": { border: "none" },
                  "& .MuiSvgIcon-root": { color: "#FBBF24" },
                }}
              >
                <MenuItem value="ALL" sx={{ bgcolor: "#0F172A", color: "#F8FAFC" }}>All Modes</MenuItem>
                <MenuItem value="IMPS" sx={{ bgcolor: "#0F172A", color: "#F8FAFC" }}>IMPS</MenuItem>
                <MenuItem value="NEFT" sx={{ bgcolor: "#0F172A", color: "#F8FAFC" }}>NEFT</MenuItem>
                <MenuItem value="RTGS" sx={{ bgcolor: "#0F172A", color: "#F8FAFC" }}>RTGS</MenuItem>
                <MenuItem value="UPI" sx={{ bgcolor: "#0F172A", color: "#F8FAFC" }}>UPI</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Button
            size="small"
            variant="outlined"
            onClick={() => { handleResetFilters(); setFilterAnchorEl(null); }}
            sx={{
              textTransform: "none",
              fontSize: "11.5px",
              fontWeight: 700,
              mt: 0.5,
              color: "#F87171",
              borderColor: "rgba(239, 68, 68, 0.35)",
              bgcolor: "rgba(239, 68, 68, 0.08)",
              "&:hover": { borderColor: "#EF4444", bgcolor: "rgba(239, 68, 68, 0.18)" },
            }}
          >
            Reset Filters
          </Button>
        </Stack>
      </Popover>

      {/* Custom Date Range Dialog */}
      <Dialog
        open={customDateOpen}
        onClose={() => setCustomDateOpen(false)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: "14px",
              p: 1,
              width: 340,
              bgcolor: "#0F172A",
              border: "1px solid rgba(254, 240, 138, 0.25)",
              color: "#F8FAFC",
              boxShadow: "0 10px 30px rgba(0,0,0,0.7)",
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: "15px", color: "#F8FAFC" }}>Select Custom Date Range</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: "8px !important" }}>
          <TextField
            label="From Date"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true, sx: { color: "rgba(255,255,255,0.7)" } }}
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            InputProps={{
              sx: {
                bgcolor: "rgba(8, 11, 17, 0.85)",
                color: "#F8FAFC",
                border: "1px solid rgba(255, 255, 255, 0.14)",
                "& fieldset": { border: "none" },
              },
            }}
          />
          <TextField
            label="To Date"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true, sx: { color: "rgba(255,255,255,0.7)" } }}
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            InputProps={{
              sx: {
                bgcolor: "rgba(8, 11, 17, 0.85)",
                color: "#F8FAFC",
                border: "1px solid rgba(255, 255, 255, 0.14)",
                "& fieldset": { border: "none" },
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setCustomDateOpen(false)} sx={{ textTransform: "none", color: "rgba(255,255,255,0.7)" }}>Cancel</Button>
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
              background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #F59E0B 100%)",
              color: "#080B11",
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
        <MenuItem onClick={() => { handleExportCsv(); setExportAnchorEl(null); }} sx={{ fontSize: "12.5px", color: "#F8FAFC", gap: 1.5, py: 1, px: 2 }}>
          <TableChartIcon sx={{ fontSize: 17, color: "#34D399" }} />
          Export to CSV / Excel
        </MenuItem>
        <MenuItem onClick={() => { handleExportPdf(); setExportAnchorEl(null); }} sx={{ fontSize: "12.5px", color: "#F8FAFC", gap: 1.5, py: 1, px: 2 }}>
          <PrintIcon sx={{ fontSize: 17, color: "#60A5FA" }} />
          Print / Save as PDF
        </MenuItem>
      </Menu>

      {/* ── 5. PROFESSIONAL ENTERPRISE DATA TABLE ── */}
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
            <Table sx={{ minWidth: 1050, tableLayout: "auto" }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "#0A0E17", borderBottom: "1px solid rgba(254, 240, 138, 0.2)" }}>
                  <TableCell padding="checkbox" sx={{ py: 1.2, pl: 2, borderBottom: "1px solid rgba(254, 240, 138, 0.2)" }}>
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
                      sx={{
                        color: "rgba(255, 255, 255, 0.4)",
                        "&.Mui-checked": { color: "#FBBF24" },
                        "&.MuiCheckbox-indeterminate": { color: "#FBBF24" },
                      }}
                    />
                  </TableCell>
                  {!hiddenColumns.has("s_no") && (
                    <TableCell sx={{ color: "#FBBF24", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", py: 1.4, borderBottom: "1px solid rgba(254, 240, 138, 0.2)", whiteSpace: "nowrap" }}>
                      S.NO
                    </TableCell>
                  )}
                  {!hiddenColumns.has("txn_id") && (
                    <TableCell sx={{ color: "#FBBF24", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", py: 1.4, borderBottom: "1px solid rgba(254, 240, 138, 0.2)", whiteSpace: "nowrap" }}>
                      TXN ID &amp; REF ID ⇅
                    </TableCell>
                  )}
                  {!hiddenColumns.has("amount") && (
                    <TableCell sx={{ color: "#FBBF24", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", py: 1.4, borderBottom: "1px solid rgba(254, 240, 138, 0.2)", whiteSpace: "nowrap" }}>
                      AMOUNT (₹) ⇅
                    </TableCell>
                  )}
                  {!hiddenColumns.has("tax") && (
                    <TableCell sx={{ color: "#FBBF24", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", py: 1.4, borderBottom: "1px solid rgba(254, 240, 138, 0.2)", whiteSpace: "nowrap" }}>
                      TAX &amp; CHARGES
                    </TableCell>
                  )}
                  {!hiddenColumns.has("net_amount") && (
                    <TableCell sx={{ color: "#FBBF24", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", py: 1.4, borderBottom: "1px solid rgba(254, 240, 138, 0.2)", whiteSpace: "nowrap" }}>
                      NET AMOUNT (₹) ⇅
                    </TableCell>
                  )}
                  {!hiddenColumns.has("bene_name") && (
                    <TableCell sx={{ color: "#FBBF24", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", py: 1.4, borderBottom: "1px solid rgba(254, 240, 138, 0.2)", whiteSpace: "nowrap" }}>
                      BENE NAME
                    </TableCell>
                  )}
                  {!hiddenColumns.has("account") && (
                    <TableCell sx={{ color: "#FBBF24", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", py: 1.4, borderBottom: "1px solid rgba(254, 240, 138, 0.2)", whiteSpace: "nowrap" }}>
                      ACCOUNT &amp; BANK
                    </TableCell>
                  )}
                  {!hiddenColumns.has("utr") && (
                    <TableCell sx={{ color: "#FBBF24", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", py: 1.4, borderBottom: "1px solid rgba(254, 240, 138, 0.2)", whiteSpace: "nowrap" }}>
                      UTR ⇅
                    </TableCell>
                  )}
                  {!hiddenColumns.has("status") && (
                    <TableCell sx={{ color: "#FBBF24", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", py: 1.4, borderBottom: "1px solid rgba(254, 240, 138, 0.2)", whiteSpace: "nowrap" }}>
                      STATUS ⇅
                    </TableCell>
                  )}
                  {!hiddenColumns.has("retailer") && (
                    <TableCell sx={{ color: "#FBBF24", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", py: 1.4, borderBottom: "1px solid rgba(254, 240, 138, 0.2)", whiteSpace: "nowrap" }}>
                      RETAILER NAME
                    </TableCell>
                  )}
                  {!hiddenColumns.has("date_time") && (
                    <TableCell sx={{ color: "#FBBF24", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", py: 1.4, borderBottom: "1px solid rgba(254, 240, 138, 0.2)", whiteSpace: "nowrap" }}>
                      DATE &amp; TIME ⇅
                    </TableCell>
                  )}
                  <TableCell sx={{ color: "#FBBF24", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", py: 1.4, pr: 2, textAlign: "right", borderBottom: "1px solid rgba(254, 240, 138, 0.2)", whiteSpace: "nowrap" }}>
                    ACTION
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  [1, 2, 3, 4, 5].map((n) => (
                    <TableRow key={n}>
                      <TableCell colSpan={13} sx={{ py: 2.5, borderColor: "rgba(255,255,255,0.06)" }}>
                        <Skeleton variant="text" height={26} sx={{ bgcolor: "rgba(255,255,255,0.06)", borderRadius: "4px" }} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} align="center" sx={{ py: 8, borderColor: "rgba(255,255,255,0.06)" }}>
                      <SendIcon sx={{ fontSize: 44, color: "rgba(254, 240, 138, 0.3)", mb: 1 }} />
                      <Typography sx={{ fontWeight: 800, fontSize: "15px", color: "#F8FAFC" }}>
                        No Payout Records Found
                      </Typography>
                      <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.55)", display: "block", mt: 0.5 }}>
                        No transactions match your selected filter criteria.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((row, idx) => {
                    const isRowSelected = selectedIds.has(String(idx));
                    const sNo = page * rowsPerPage + idx + 1;
                    const txnId = row.txn_id || row.transaction_number || row.transaction_id || `PO-${idx + 1}`;
                    const refId = row.reference_id || "--";
                    const amt = Number(row.amount ?? row.amt ?? row.transfer_amount ?? 0);
                    const fee = Number(row.charge ?? row.fee ?? row.convenience_fee ?? 0);
                    const gst = Number(row.gst ?? row.tax ?? row.gst_amount ?? 0);
                    const totalDebit = Number(row.debit ?? row.wallet_debit ?? (amt + fee + gst));
                    const dt = formatDateTime(row.date_time || row.initiated_at);
                    const status = (row.status || "SUCCESS").toUpperCase();
                    const beneName = row.beneficiary || row.beneficiary_name || "Beneficiary";
                    const accNo = row.account || row.ac_no || row.account_number || "--";
                    const bankName = row.bank || row.bank_name || "--";
                    const utr = row.utr || row.utr_number || "--";
                    const retailerName = row.retailer || outlet?.name || "Retailer Store";

                    const pyVal = density === "compact" ? 0.8 : density === "comfortable" ? 2.0 : 1.4;

                    return (
                      <TableRow
                        key={idx}
                        hover
                        selected={isRowSelected}
                        sx={{
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          "&:hover": { bgcolor: "rgba(254, 240, 138, 0.04) !important" },
                          "&.Mui-selected": { bgcolor: "rgba(245, 158, 11, 0.12) !important" },
                          "& td": { borderColor: "rgba(255, 255, 255, 0.06)", py: pyVal },
                        }}
                        onClick={() => openDetailsDrawer(row)}
                      >
                        <TableCell padding="checkbox" sx={{ py: pyVal, pl: 2, borderBottom: "1px solid rgba(255,255,255,0.06)" }} onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            size="small"
                            checked={isRowSelected}
                            onChange={(e) => {
                              const next = new Set(selectedIds);
                              if (e.target.checked) next.add(String(idx));
                              else next.delete(String(idx));
                              setSelectedIds(next);
                            }}
                            sx={{
                              color: "rgba(255, 255, 255, 0.4)",
                              "&.Mui-checked": { color: "#FBBF24" },
                            }}
                          />
                        </TableCell>

                        {/* S.NO */}
                        {!hiddenColumns.has("s_no") && (
                          <TableCell sx={{ py: pyVal, color: "rgba(255, 255, 255, 0.65)", fontWeight: 700, fontSize: "12px", fontFamily: "monospace", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            {sNo}
                          </TableCell>
                        )}

                        {/* TXN ID & REF ID */}
                        {!hiddenColumns.has("txn_id") && (
                          <TableCell sx={{ py: pyVal, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            <Stack direction="row" alignItems="center" spacing={0.6}>
                              <Typography sx={{ fontWeight: 800, fontSize: "12.5px", color: "#FBBF24", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                                {txnId}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(txnId, "Transaction ID");
                                }}
                                sx={{ p: 0.2, color: "rgba(254, 240, 138, 0.6)", "&:hover": { color: "#FEF08A" } }}
                              >
                                <ContentCopyIcon sx={{ fontSize: 13 }} />
                              </IconButton>
                            </Stack>
                            {refId !== "--" && (
                              <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.55)", fontSize: "11px", display: "block" }}>
                                Ref: {refId}
                              </Typography>
                            )}
                          </TableCell>
                        )}

                        {/* AMOUNT (₹) */}
                        {!hiddenColumns.has("amount") && (
                          <TableCell sx={{ py: pyVal, borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" }}>
                            <Typography sx={{ fontWeight: 900, fontSize: "13px", color: "#F8FAFC" }}>
                              ₹{amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </Typography>
                          </TableCell>
                        )}

                        {/* TAX & CHARGES */}
                        {!hiddenColumns.has("tax") && (
                          <TableCell sx={{ py: pyVal, borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" }}>
                            <Typography sx={{ fontWeight: 600, fontSize: "12px", color: "rgba(255, 255, 255, 0.85)" }}>
                              ₹{(fee + gst).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "10.5px", display: "block" }}>
                              Fee: ₹{fee.toFixed(2)} · GST: ₹{gst.toFixed(2)}
                            </Typography>
                          </TableCell>
                        )}

                        {/* NET AMOUNT (₹) / WALLET DEBIT */}
                        {!hiddenColumns.has("net_amount") && (
                          <TableCell sx={{ py: pyVal, borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" }}>
                            <Typography sx={{ fontWeight: 800, fontSize: "13px", color: "#FBBF24" }}>
                              ₹{totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </Typography>
                          </TableCell>
                        )}

                        {/* BENE NAME */}
                        {!hiddenColumns.has("bene_name") && (
                          <TableCell sx={{ py: pyVal, borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" }}>
                            <Typography sx={{ fontWeight: 700, fontSize: "12.5px", color: "#F8FAFC" }}>
                              {beneName}
                            </Typography>
                          </TableCell>
                        )}

                        {/* ACCOUNT & BANK */}
                        {!hiddenColumns.has("account") && (
                          <TableCell sx={{ py: pyVal, borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" }}>
                            <Typography sx={{ fontWeight: 700, fontSize: "12px", color: "#F8FAFC", fontFamily: "monospace" }}>
                              {accNo}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "11px", display: "block" }}>
                              {bankName}
                            </Typography>
                          </TableCell>
                        )}

                        {/* UTR */}
                        {!hiddenColumns.has("utr") && (
                          <TableCell sx={{ py: pyVal, borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" }}>
                            <Typography sx={{ fontWeight: 700, fontSize: "12px", color: utr !== "--" ? "#60A5FA" : "rgba(255, 255, 255, 0.4)", fontFamily: "monospace" }}>
                              {utr}
                            </Typography>
                          </TableCell>
                        )}

                        {/* STATUS */}
                        {!hiddenColumns.has("status") && (
                          <TableCell sx={{ py: pyVal, borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" }}>
                            <Chip
                              label={status}
                              size="small"
                              sx={{
                                height: "24px",
                                fontSize: "11px",
                                fontWeight: 800,
                                borderRadius: "6px",
                                bgcolor:
                                  status === "SUCCESS"
                                    ? "rgba(16, 185, 129, 0.15)"
                                    : status === "PENDING"
                                    ? "rgba(245, 158, 11, 0.15)"
                                    : status === "REVERSED"
                                    ? "rgba(168, 85, 247, 0.15)"
                                    : "rgba(239, 68, 68, 0.15)",
                                color:
                                  status === "SUCCESS"
                                    ? "#34D399"
                                    : status === "PENDING"
                                    ? "#FBBF24"
                                    : status === "REVERSED"
                                    ? "#C084FC"
                                    : "#F87171",
                                border: `1px solid ${
                                  status === "SUCCESS"
                                    ? "rgba(16, 185, 129, 0.35)"
                                    : status === "PENDING"
                                    ? "rgba(245, 158, 11, 0.35)"
                                    : status === "REVERSED"
                                    ? "rgba(168, 85, 247, 0.35)"
                                    : "rgba(239, 68, 68, 0.35)"
                                }`,
                              }}
                            />
                          </TableCell>
                        )}

                        {/* RETAILER NAME */}
                        {!hiddenColumns.has("retailer") && (
                          <TableCell sx={{ py: pyVal, borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" }}>
                            <Typography sx={{ fontWeight: 700, fontSize: "12px", color: "rgba(255, 255, 255, 0.85)" }}>
                              {retailerName}
                            </Typography>
                          </TableCell>
                        )}

                        {/* DATE & TIME */}
                        {!hiddenColumns.has("date_time") && (
                          <TableCell sx={{ py: pyVal, borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" }}>
                            <Typography sx={{ fontSize: "12px", color: "#F8FAFC", fontWeight: 600 }}>
                              {dt.date}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.55)", fontSize: "11px", display: "block" }}>
                              {dt.time}
                            </Typography>
                          </TableCell>
                        )}

                        {/* ACTION */}
                        <TableCell align="right" sx={{ py: pyVal, pr: 2, borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Tooltip title="View Receipt &amp; Audit Timeline">
                              <IconButton
                                size="small"
                                onClick={() => openDetailsDrawer(row)}
                                sx={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: "6px",
                                  bgcolor: "rgba(59, 130, 246, 0.15)",
                                  color: "#60A5FA",
                                  border: "1px solid rgba(59, 130, 246, 0.35)",
                                  "&:hover": { bgcolor: "rgba(59, 130, 246, 0.25)" },
                                }}
                              >
                                <ReceiptIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Print Voucher">
                              <IconButton
                                size="small"
                                onClick={() => printVoucher(row)}
                                sx={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: "6px",
                                  bgcolor: "rgba(255, 255, 255, 0.05)",
                                  color: "#F8FAFC",
                                  border: "1px solid rgba(255, 255, 255, 0.12)",
                                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.1)", color: "#FBBF24" },
                                }}
                              >
                                <PrintIcon sx={{ fontSize: 16 }} />
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
              color: "rgba(255, 255, 255, 0.7)",
              borderTop: "1px solid rgba(254, 240, 138, 0.2)",
              bgcolor: "#0A0E17",
              "& .MuiSvgIcon-root": { color: "#FBBF24" },
              "& .MuiTablePagination-select": {
                bgcolor: "rgba(15, 23, 42, 0.75)",
                color: "#F8FAFC",
                border: "1px solid rgba(255, 255, 255, 0.15)",
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
            <SendIcon sx={{ fontSize: 40, color: "rgba(254, 240, 138, 0.35)", mb: 1 }} />
            <Typography sx={{ fontWeight: 800, fontSize: "15px", color: "#F8FAFC" }}>
              No Payout Records Found
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.55)", display: "block", mt: 0.5 }}>
              Try adjusting your date range or filters
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={1.5}>
            {items.map((row, idx) => {
              const txnId = row.txn_id || row.transaction_number || row.transaction_id || `PO-${idx + 1}`;
              const utr = row.utr || row.utr_number || "--";
              const beneName = row.beneficiary || row.beneficiary_name || "Beneficiary";
              const bankName = row.bank || row.bank_name || "";
              const accNo = row.account || row.ac_no || row.account_number || "--";
              const mode = row.mode || row.payment_mode || "IMPS";
              const amt = Number(row.amount ?? row.amt ?? row.transfer_amount ?? 0);
              const fee = Number(row.charge ?? row.fee ?? row.convenience_fee ?? 0);
              const gst = Number(row.gst ?? row.tax ?? row.gst_amount ?? 0);
              const totalDebit = Number(row.debit ?? row.wallet_debit ?? (amt + fee + gst));
              const isExpanded = !!expandedCards[txnId];
              const dt = formatDateTime(row.date_time || row.initiated_at);
              const status = (row.status || "SUCCESS").toUpperCase();

              return (
                <Paper
                  key={txnId}
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
                        label={mode}
                        size="small"
                        sx={{
                          height: "22px",
                          fontSize: "10.5px",
                          fontWeight: 800,
                          bgcolor: "rgba(59, 130, 246, 0.15)",
                          color: "#60A5FA",
                          border: "1px solid rgba(59, 130, 246, 0.35)",
                        }}
                      />
                      <Chip
                        label={status}
                        size="small"
                        sx={{
                          height: "22px",
                          fontSize: "10.5px",
                          fontWeight: 800,
                          bgcolor:
                            status === "SUCCESS"
                              ? "rgba(16, 185, 129, 0.15)"
                              : status === "PENDING"
                              ? "rgba(245, 158, 11, 0.15)"
                              : status === "REVERSED"
                              ? "rgba(168, 85, 247, 0.15)"
                              : "rgba(239, 68, 68, 0.15)",
                          color:
                            status === "SUCCESS"
                              ? "#34D399"
                              : status === "PENDING"
                              ? "#FBBF24"
                              : status === "REVERSED"
                              ? "#C084FC"
                              : "#F87171",
                          border: `1px solid ${
                            status === "SUCCESS"
                              ? "rgba(16, 185, 129, 0.35)"
                              : status === "PENDING"
                              ? "rgba(245, 158, 11, 0.35)"
                              : status === "REVERSED"
                              ? "rgba(168, 85, 247, 0.35)"
                              : "rgba(239, 68, 68, 0.35)"
                          }`,
                        }}
                      />
                    </Stack>

                    <Typography sx={{ fontSize: "16px", fontWeight: 900, color: "#F8FAFC" }}>
                      ₹{amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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
                          {txnId}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(txnId, "TXN ID");
                          }}
                          sx={{ p: 0.2, color: "rgba(254, 240, 138, 0.6)" }}
                        >
                          <ContentCopyIcon sx={{ fontSize: 13 }} />
                        </IconButton>
                      </Stack>
                    </Stack>

                    {utr !== "--" && (
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: "10.5px", fontWeight: 700 }}>
                          UTR / REF
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
                            {utr}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(utr, "UTR");
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
                        {beneName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", fontSize: "11px" }}>
                        {dt.date} · {dt.time}
                      </Typography>
                    </Box>

                    <Button
                      size="small"
                      onClick={(e) => toggleExpandCard(txnId, e)}
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
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: "10px" }}>Account Number</Typography>
                        <Typography sx={{ fontWeight: 700, color: "#F8FAFC", fontSize: "12px" }}>
                          {accNo}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: "10px" }}>Total Wallet Debit</Typography>
                        <Typography sx={{ fontWeight: 800, color: "#FBBF24", fontSize: "12px" }}>
                          ₹{totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: "10px" }}>Bank Name</Typography>
                        <Typography sx={{ fontWeight: 600, color: "rgba(255,255,255,0.85)", fontSize: "11.5px" }}>
                          {bankName || "--"}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: "10px" }}>Charges &amp; GST</Typography>
                        <Typography sx={{ fontWeight: 600, color: "rgba(255,255,255,0.85)", fontSize: "11.5px" }}>
                          ₹{(fee + gst).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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

      {/* ── 7. CLEAN BANKING & ENTERPRISE FINTECH TRANSACTION DETAIL DRAWER ── */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          zIndex: 1400,
          "& .MuiBackdrop-root": {
            zIndex: 1400,
          },
          "& .MuiDrawer-paper": {
            zIndex: 1401,
            width: { xs: "100%", sm: 540, md: 580 },
            maxWidth: "100vw",
            bgcolor: "#0B0F17",
            color: "#F8FAFC",
            borderLeft: { sm: "1px solid rgba(254, 240, 138, 0.25)" },
            boxShadow: "-8px 0 36px rgba(0, 0, 0, 0.5)",
            p: 0,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "hidden",
          },
        }}
        slotProps={{
          backdrop: {
            sx: {
              zIndex: 1400,
              bgcolor: "rgba(15, 23, 42, 0.65)",
              backdropFilter: "blur(6px)",
            },
          },
        }}
      >
        {selectedTxn && (() => {
          const txnId = selectedTxn.txn_id || selectedTxn.transaction_number || selectedTxn.transaction_id || "--";
          const utr = selectedTxn.utr || selectedTxn.utr_number || "--";
          const amt = Number(selectedTxn.amount ?? selectedTxn.amt ?? selectedTxn.transfer_amount ?? 0);
          const fee = Number(selectedTxn.charge ?? selectedTxn.fee ?? selectedTxn.convenience_fee ?? 0);
          const gst = Number(selectedTxn.gst ?? selectedTxn.tax ?? selectedTxn.gst_amount ?? 0);
          const totalDebit = Number(selectedTxn.debit ?? selectedTxn.wallet_debit ?? (amt + fee + gst));
          const dt = formatDateTime(selectedTxn.date_time || selectedTxn.initiated_at);
          const status = (selectedTxn.status || "SUCCESS").toUpperCase();

          const beneName = selectedTxn.beneficiary || selectedTxn.beneficiary_name || "Beneficiary";
          const accNo = selectedTxn.account || selectedTxn.ac_no || selectedTxn.account_number || "--";
          const ifsc = selectedTxn.ifsc || selectedTxn.ifsc_code || "--";
          const bankName = selectedTxn.bank || selectedTxn.bank_name || "--";
          const mode = selectedTxn.mode || selectedTxn.payment_mode || "IMPS";
          const refNumber = selectedTxn.reference_id || (selectedTxn as any).client_ref || (selectedTxn as any).order_id || "--";
          const beneMobile = selectedTxn.beneficiary_mobile || (selectedTxn as any).mobile || "--";
          const beneId = (selectedTxn as any).beneficiary_id || (selectedTxn as any).bene_id || "--";
          const failureMsg = selectedTxn.remarks || selectedTxn.narration || selectedTxn.comments || (selectedTxn as any).failure_reason || (selectedTxn as any).message || "";

          // Status colors for dark theme
          const statusColor =
            status === "SUCCESS"
              ? "#34D399"
              : status === "PENDING"
              ? "#FBBF24"
              : status === "REVERSED"
              ? "#C084FC"
              : "#F87171";

          const statusBg =
            status === "SUCCESS"
              ? "rgba(16, 185, 129, 0.15)"
              : status === "PENDING"
              ? "rgba(245, 158, 11, 0.15)"
              : status === "REVERSED"
              ? "rgba(168, 85, 247, 0.15)"
              : "rgba(239, 68, 68, 0.15)";

          const statusBorder =
            status === "SUCCESS"
              ? "rgba(16, 185, 129, 0.35)"
              : status === "PENDING"
              ? "rgba(245, 158, 11, 0.35)"
              : status === "REVERSED"
              ? "rgba(168, 85, 247, 0.35)"
              : "rgba(239, 68, 68, 0.35)";

          return (
            <Box sx={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", position: "relative", bgcolor: "#0B0F17" }}>
              {/* ── 1. FIXED DEEP NAVY HEADER ── */}
              <Box
                sx={{
                  position: "sticky",
                  top: 0,
                  zIndex: 20,
                  p: { xs: 2, sm: 2.5 },
                  bgcolor: "#080B11",
                  color: "#FFFFFF",
                  borderBottom: "1px solid rgba(254, 240, 138, 0.2)",
                  boxShadow: "0 2px 10px rgba(0, 0, 0, 0.4)",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box
                      component="img"
                      src={branding.logo_url || "/branding/logo.png"}
                      alt="Pay2Pay Logo"
                      onError={(e: any) => {
                        e.currentTarget.style.display = "none";
                      }}
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: "8px",
                        objectFit: "contain",
                        bgcolor: "#FFFFFF",
                        p: 0.5,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                      }}
                    />
                    <Box>
                      <Typography sx={{ fontWeight: 800, fontSize: "16.5px", color: "#FFFFFF", lineHeight: 1.2 }}>
                        Payout Transaction Details
                      </Typography>
                      <Typography sx={{ fontSize: "12.5px", color: "rgba(255, 255, 255, 0.65)", mt: 0.4 }}>
                        Retailer: <strong style={{ color: "#FDE68A" }}>{outlet?.name || outlet?.ownerName || selectedTxn.retailer || "Pay2Pay Merchant"}</strong>
                        {outlet?.code ? ` · ID: ${outlet.code}` : ""}
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack direction="row" alignItems="center" spacing={1}>
                    {/* Status Badge */}
                    <Box
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.7,
                        px: 1.2,
                        py: 0.4,
                        borderRadius: "9999px",
                        bgcolor: statusBg,
                        border: `1px solid ${statusBorder}`,
                        color: statusColor,
                        fontSize: "12px",
                        fontWeight: 800,
                        letterSpacing: "0.4px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: statusColor }} />
                      {status}
                    </Box>

                    {/* Close X */}
                    <IconButton
                      onClick={() => setDrawerOpen(false)}
                      sx={{
                        width: 34,
                        height: 34,
                        borderRadius: "8px",
                        bgcolor: "rgba(255, 255, 255, 0.08)",
                        color: "#FFFFFF",
                        "&:hover": {
                          bgcolor: "rgba(239, 68, 68, 0.25)",
                          color: "#FCA5A5",
                        },
                      }}
                    >
                      <CloseIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Stack>
                </Box>
              </Box>

              {/* ── 2. SCROLLABLE DRAWER CONTENT BODY ── */}
              <Box
                sx={{
                  flex: 1,
                  overflowY: "auto",
                  p: { xs: 2, sm: 3 },
                  pb: "160px",
                  bgcolor: "#0B0F17",
                  "&::-webkit-scrollbar": { width: "6px" },
                  "&::-webkit-scrollbar-track": { background: "#080B11" },
                  "&::-webkit-scrollbar-thumb": { background: "#334155", borderRadius: "4px" },
                  "&::-webkit-scrollbar-thumb:hover": { background: "#475569" },
                }}
              >
                {/* 2A. TRANSACTION HERO AREA */}
                <Box
                  sx={{
                    bgcolor: "rgba(15, 23, 42, 0.75)",
                    borderRadius: "14px",
                    border: "1px solid rgba(254, 240, 138, 0.2)",
                    p: { xs: 2.2, sm: 2.8 },
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.35)",
                    mb: 3,
                    textAlign: "center",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "12px",
                      fontWeight: 800,
                      color: "rgba(255, 255, 255, 0.6)",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      mb: 0.6,
                    }}
                  >
                    PAYOUT AMOUNT
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: { xs: "34px", sm: "40px" },
                      fontWeight: 900,
                      color: "#F8FAFC",
                      lineHeight: 1.1,
                      mb: 0.8,
                    }}
                  >
                    ₹{amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Typography>

                  <Chip
                    label={`${mode} · Instant Transfer`}
                    size="small"
                    sx={{
                      bgcolor: "rgba(59, 130, 246, 0.15)",
                      color: "#60A5FA",
                      border: "1px solid rgba(59, 130, 246, 0.35)",
                      fontWeight: 800,
                      fontSize: "12px",
                      height: "26px",
                      mb: 2.2,
                    }}
                  />

                  <Divider sx={{ mb: 2, borderColor: "rgba(255, 255, 255, 0.08)" }} />

                  {/* Horizontal Accounting Summary */}
                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5, textAlign: "center" }}>
                    <Box sx={{ p: 1.2, borderRadius: "10px", bgcolor: "rgba(8, 11, 17, 0.65)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                      <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase" }}>
                        SERVICE CHARGE
                      </Typography>
                      <Typography sx={{ fontSize: "14.5px", fontWeight: 800, color: "#F8FAFC", mt: 0.4 }}>
                        ₹{fee.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>

                    <Box sx={{ p: 1.2, borderRadius: "10px", bgcolor: "rgba(8, 11, 17, 0.65)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                      <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase" }}>
                        GST
                      </Typography>
                      <Typography sx={{ fontSize: "14.5px", fontWeight: 800, color: "#F8FAFC", mt: 0.4 }}>
                        ₹{gst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>

                    <Box sx={{ p: 1.2, borderRadius: "10px", bgcolor: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(254, 240, 138, 0.3)" }}>
                      <Typography sx={{ fontSize: "11px", fontWeight: 800, color: "#FDE68A", textTransform: "uppercase" }}>
                        TOTAL WALLET DEBIT
                      </Typography>
                      <Typography sx={{ fontSize: "15px", fontWeight: 900, color: "#FBBF24", mt: 0.4 }}>
                        ₹{totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* 2B. TRANSACTION INFORMATION TABLE */}
                <Box sx={{ mb: 3 }}>
                  <Typography sx={{ fontSize: "14px", fontWeight: 800, color: "#FBBF24", mb: 1.2, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    TRANSACTION INFORMATION
                  </Typography>

                  <Box sx={{ bgcolor: "rgba(15, 23, 42, 0.75)", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.08)", overflow: "hidden" }}>
                    {/* Transaction ID */}
                    <Box sx={{ px: 2.2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                      <Typography sx={{ fontSize: "13.5px", fontWeight: 600, color: "rgba(255, 255, 255, 0.6)" }}>Transaction ID</Typography>
                      <Stack direction="row" alignItems="center" spacing={0.8}>
                        <Typography sx={{ fontSize: "13.5px", fontWeight: 700, color: "#FBBF24", fontFamily: "ui-monospace, monospace" }}>
                          {txnId}
                        </Typography>
                        <IconButton size="small" onClick={() => copyToClipboard(txnId, "Transaction ID")} sx={{ color: "rgba(254, 240, 138, 0.6)", p: 0.3 }}>
                          <ContentCopyIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Stack>
                    </Box>

                    {/* Bank UTR Number */}
                    <Box sx={{ px: 2.2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                      <Typography sx={{ fontSize: "13.5px", fontWeight: 600, color: "rgba(255, 255, 255, 0.6)" }}>Bank UTR Number</Typography>
                      <Stack direction="row" alignItems="center" spacing={0.8}>
                        <Typography sx={{ fontSize: "13.5px", fontWeight: 700, color: utr !== "--" ? "#60A5FA" : "rgba(255, 255, 255, 0.4)", fontFamily: "ui-monospace, monospace" }}>
                          {utr}
                        </Typography>
                        {utr !== "--" && (
                          <IconButton size="small" onClick={() => copyToClipboard(utr, "Bank UTR")} sx={{ color: "#60A5FA", p: 0.3 }}>
                            <ContentCopyIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        )}
                      </Stack>
                    </Box>

                    {/* Date & Time */}
                    <Box sx={{ px: 2.2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                      <Typography sx={{ fontSize: "13.5px", fontWeight: 600, color: "rgba(255, 255, 255, 0.6)" }}>Transaction Date &amp; Time</Typography>
                      <Typography sx={{ fontSize: "13.5px", fontWeight: 700, color: "#F8FAFC" }}>
                        {dt.date} · {dt.time}
                      </Typography>
                    </Box>

                    {/* Payout Amount */}
                    <Box sx={{ px: 2.2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                      <Typography sx={{ fontSize: "13.5px", fontWeight: 600, color: "rgba(255, 255, 255, 0.6)" }}>Payout Amount</Typography>
                      <Typography sx={{ fontSize: "14.5px", fontWeight: 800, color: "#F8FAFC" }}>
                        ₹{amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>

                    {/* Payment Mode */}
                    <Box sx={{ px: 2.2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                      <Typography sx={{ fontSize: "13.5px", fontWeight: 600, color: "rgba(255, 255, 255, 0.6)" }}>Payment Mode</Typography>
                      <Typography sx={{ fontSize: "13.5px", fontWeight: 700, color: "#60A5FA" }}>
                        {mode} (Instant Bank Transfer)
                      </Typography>
                    </Box>

                    {/* Transaction Status */}
                    <Box sx={{ px: 2.2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", ...(refNumber !== "--" ? { borderBottom: "1px solid rgba(255, 255, 255, 0.06)" } : {}) }}>
                      <Typography sx={{ fontSize: "13.5px", fontWeight: 600, color: "rgba(255, 255, 255, 0.6)" }}>Transaction Status</Typography>
                      <Box
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 0.6,
                          px: 1,
                          py: 0.3,
                          borderRadius: "6px",
                          bgcolor: statusBg,
                          border: `1px solid ${statusBorder}`,
                          color: statusColor,
                          fontSize: "12px",
                          fontWeight: 800,
                        }}
                      >
                        <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: statusColor }} />
                        {status}
                      </Box>
                    </Box>

                    {/* Reference Number if present */}
                    {refNumber !== "--" && (
                      <Box sx={{ px: 2.2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <Typography sx={{ fontSize: "13.5px", fontWeight: 600, color: "rgba(255, 255, 255, 0.6)" }}>Reference Number</Typography>
                        <Typography sx={{ fontSize: "13.5px", fontWeight: 700, color: "#F8FAFC", fontFamily: "ui-monospace, monospace" }}>
                          {refNumber}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* 2C. BENEFICIARY DETAILS */}
                <Box sx={{ mb: 3 }}>
                  <Typography sx={{ fontSize: "14px", fontWeight: 800, color: "#FBBF24", mb: 1.2, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    BENEFICIARY DETAILS
                  </Typography>

                  <Box sx={{ bgcolor: "rgba(15, 23, 42, 0.75)", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.08)", overflow: "hidden" }}>
                    {/* Beneficiary Name */}
                    <Box sx={{ px: 2.2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                      <Typography sx={{ fontSize: "13.5px", fontWeight: 600, color: "rgba(255, 255, 255, 0.6)" }}>Beneficiary Name</Typography>
                      <Typography sx={{ fontSize: "14px", fontWeight: 800, color: "#F8FAFC" }}>
                        {beneName}
                      </Typography>
                    </Box>

                    {/* Account Number */}
                    <Box sx={{ px: 2.2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                      <Typography sx={{ fontSize: "13.5px", fontWeight: 600, color: "rgba(255, 255, 255, 0.6)" }}>Account Number</Typography>
                      <Stack direction="row" alignItems="center" spacing={0.8}>
                        <Typography sx={{ fontSize: "13.5px", fontWeight: 700, color: "#F8FAFC", fontFamily: "ui-monospace, monospace" }}>
                          {accNo}
                        </Typography>
                        {accNo !== "--" && (
                          <IconButton size="small" onClick={() => copyToClipboard(accNo, "Account Number")} sx={{ color: "rgba(254, 240, 138, 0.6)", p: 0.3 }}>
                            <ContentCopyIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        )}
                      </Stack>
                    </Box>

                    {/* IFSC Code */}
                    <Box sx={{ px: 2.2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                      <Typography sx={{ fontSize: "13.5px", fontWeight: 600, color: "rgba(255, 255, 255, 0.6)" }}>IFSC Code</Typography>
                      <Stack direction="row" alignItems="center" spacing={0.8}>
                        <Typography sx={{ fontSize: "13.5px", fontWeight: 700, color: "#60A5FA", fontFamily: "ui-monospace, monospace" }}>
                          {ifsc}
                        </Typography>
                        {ifsc !== "--" && (
                          <IconButton size="small" onClick={() => copyToClipboard(ifsc, "IFSC")} sx={{ color: "#60A5FA", p: 0.3 }}>
                            <ContentCopyIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        )}
                      </Stack>
                    </Box>

                    {/* Bank Name */}
                    <Box sx={{ px: 2.2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", ...(beneMobile !== "--" || beneId !== "--" ? { borderBottom: "1px solid rgba(255, 255, 255, 0.06)" } : {}) }}>
                      <Typography sx={{ fontSize: "13.5px", fontWeight: 600, color: "rgba(255, 255, 255, 0.6)" }}>Bank Name</Typography>
                      <Typography sx={{ fontSize: "13.5px", fontWeight: 700, color: "#F8FAFC" }}>
                        {bankName}
                      </Typography>
                    </Box>

                    {/* Beneficiary Mobile if present */}
                    {beneMobile !== "--" && (
                      <Box sx={{ px: 2.2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", ...(beneId !== "--" ? { borderBottom: "1px solid rgba(255, 255, 255, 0.06)" } : {}) }}>
                        <Typography sx={{ fontSize: "13.5px", fontWeight: 600, color: "rgba(255, 255, 255, 0.6)" }}>Beneficiary Mobile</Typography>
                        <Typography sx={{ fontSize: "13.5px", fontWeight: 700, color: "#F8FAFC" }}>
                          {beneMobile}
                        </Typography>
                      </Box>
                    )}

                    {/* Beneficiary ID if present */}
                    {beneId !== "--" && (
                      <Box sx={{ px: 2.2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <Typography sx={{ fontSize: "13.5px", fontWeight: 600, color: "rgba(255, 255, 255, 0.6)" }}>Beneficiary ID</Typography>
                        <Typography sx={{ fontSize: "13.5px", fontWeight: 700, color: "#F8FAFC", fontFamily: "ui-monospace, monospace" }}>
                          {beneId}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* 2D. WALLET ACCOUNTING */}
                <Box sx={{ mb: 3 }}>
                  <Typography sx={{ fontSize: "14px", fontWeight: 800, color: "#FBBF24", mb: 1.2, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    WALLET ACCOUNTING
                  </Typography>

                  <Box sx={{ bgcolor: "rgba(15, 23, 42, 0.75)", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.08)", overflow: "hidden" }}>
                    <Box sx={{ px: 2.2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                      <Typography sx={{ fontSize: "13.5px", fontWeight: 600, color: "rgba(255, 255, 255, 0.6)" }}>Payout Amount</Typography>
                      <Typography sx={{ fontSize: "14px", fontWeight: 700, color: "#F8FAFC" }}>
                        ₹{amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>

                    <Box sx={{ px: 2.2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                      <Typography sx={{ fontSize: "13.5px", fontWeight: 600, color: "rgba(255, 255, 255, 0.6)" }}>Service Charge</Typography>
                      <Typography sx={{ fontSize: "14px", fontWeight: 700, color: "#F8FAFC" }}>
                        ₹{fee.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>

                    <Box sx={{ px: 2.2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                      <Typography sx={{ fontSize: "13.5px", fontWeight: 600, color: "rgba(255, 255, 255, 0.6)" }}>GST (18%)</Typography>
                      <Typography sx={{ fontSize: "14px", fontWeight: 700, color: "#F8FAFC" }}>
                        ₹{gst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>

                    {/* Total Debit Row */}
                    <Box sx={{ px: 2.2, py: 1.6, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(254, 240, 138, 0.25)", bgcolor: "rgba(245, 158, 11, 0.12)" }}>
                      <Typography sx={{ fontSize: "13.5px", fontWeight: 800, color: "#FDE68A" }}>Total Wallet Debit</Typography>
                      <Typography sx={{ fontSize: "15px", fontWeight: 900, color: "#FBBF24" }}>
                        ₹{totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>

                    {/* CR / DR Accounting Rows */}
                    <Box sx={{ px: 2.2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                      <Typography sx={{ fontSize: "13.5px", fontWeight: 700, color: "#34D399" }}>CR (Credit)</Typography>
                      <Typography sx={{ fontSize: "14px", fontWeight: 800, color: "#34D399" }}>₹0.00</Typography>
                    </Box>

                    <Box sx={{ px: 2.2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Typography sx={{ fontSize: "13.5px", fontWeight: 700, color: "#F87171" }}>DR (Debit)</Typography>
                      <Typography sx={{ fontSize: "14px", fontWeight: 800, color: "#F87171" }}>
                        ₹{totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* 2E. TRANSACTION AUDIT TIMELINE */}
                <Box sx={{ mb: 3 }}>
                  <Typography sx={{ fontSize: "14px", fontWeight: 800, color: "#FBBF24", mb: 1.2, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    TRANSACTION AUDIT TIMELINE
                  </Typography>

                  <Box sx={{ bgcolor: "rgba(15, 23, 42, 0.75)", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.08)", p: 2.5 }}>
                    <Box sx={{ position: "relative", pl: 3.5 }}>
                      {/* Vertical line connecting nodes */}
                      <Box sx={{ position: "absolute", left: 11, top: 8, bottom: 8, width: 2, bgcolor: "rgba(255, 255, 255, 0.15)" }} />

                      {/* Node 1: Request Created */}
                      <Box sx={{ position: "relative", mb: 2.5 }}>
                        <Box sx={{ position: "absolute", left: -28, top: 4, width: 10, height: 10, borderRadius: "50%", bgcolor: "#34D399", border: "2px solid #0F172A", boxShadow: "0 0 0 2px rgba(16, 185, 129, 0.4)" }} />
                        <Typography sx={{ fontSize: "13.5px", fontWeight: 700, color: "#F8FAFC" }}>Request Created</Typography>
                        <Typography sx={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.55)", mt: 0.2 }}>{dt.date} · {dt.time}</Typography>
                      </Box>

                      {/* Node 2: Processing */}
                      <Box sx={{ position: "relative", mb: 2.5 }}>
                        <Box sx={{ position: "absolute", left: -28, top: 4, width: 10, height: 10, borderRadius: "50%", bgcolor: status === "PENDING" ? "#FBBF24" : "#34D399", border: "2px solid #0F172A", boxShadow: `0 0 0 2px ${status === "PENDING" ? "rgba(245, 158, 11, 0.4)" : "rgba(16, 185, 129, 0.4)"}` }} />
                        <Typography sx={{ fontSize: "13.5px", fontWeight: 700, color: "#F8FAFC" }}>Switch Processing &amp; Validation</Typography>
                        <Typography sx={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.55)", mt: 0.2 }}>Mode: {mode} · Route: Direct Bank IMPS Switch</Typography>
                      </Box>

                      {/* Node 3: Bank Response / UTR */}
                      <Box sx={{ position: "relative", mb: 2.5 }}>
                        <Box sx={{ position: "absolute", left: -28, top: 4, width: 10, height: 10, borderRadius: "50%", bgcolor: utr !== "--" ? "#34D399" : status === "PENDING" ? "#FBBF24" : "#F87171", border: "2px solid #0F172A", boxShadow: `0 0 0 2px ${utr !== "--" ? "rgba(16, 185, 129, 0.4)" : status === "PENDING" ? "rgba(245, 158, 11, 0.4)" : "rgba(239, 68, 68, 0.4)"}` }} />
                        <Typography sx={{ fontSize: "13.5px", fontWeight: 700, color: "#F8FAFC" }}>Bank Response &amp; Settlement</Typography>
                        <Typography sx={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.55)", mt: 0.2 }}>
                          {utr !== "--" ? `Bank UTR: ${utr}` : "Awaiting Bank Settlement Acknowledgement"}
                        </Typography>
                      </Box>

                      {/* Node 4: Final Status */}
                      <Box sx={{ position: "relative" }}>
                        <Box sx={{ position: "absolute", left: -28, top: 4, width: 10, height: 10, borderRadius: "50%", bgcolor: statusColor, border: "2px solid #0F172A", boxShadow: `0 0 0 2px ${statusBorder}` }} />
                        <Typography sx={{ fontSize: "13.5px", fontWeight: 800, color: statusColor }}>
                          {status === "SUCCESS" ? "Transaction Completed Successfully" : status === "PENDING" ? "Transaction Processing / Pending" : `Transaction ${status}`}
                        </Typography>
                        <Typography sx={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.55)", mt: 0.2 }}>
                          Reference: {refNumber !== "--" ? refNumber : txnId}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Failure / remarks notice if present */}
                    {failureMsg && (
                      <Box sx={{ mt: 2.5, p: 1.5, borderRadius: "8px", bgcolor: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.35)" }}>
                        <Typography sx={{ color: "#F87171", fontSize: "12px", fontWeight: 700, mb: 0.3 }}>
                          Response / Failure Remarks
                        </Typography>
                        <Typography sx={{ color: "#FCA5A5", fontSize: "13px", fontWeight: 500, wordBreak: "break-word" }}>
                          {failureMsg}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* 2F. REFERENCE DETAILS */}
                <Box sx={{ mb: 2 }}>
                  <Typography sx={{ fontSize: "14px", fontWeight: 800, color: "#FBBF24", mb: 1.2, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    REFERENCE DETAILS
                  </Typography>

                  <Box sx={{ bgcolor: "rgba(15, 23, 42, 0.75)", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.08)", overflow: "hidden" }}>
                    <Box sx={{ px: 2.2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                      <Typography sx={{ fontSize: "13.5px", fontWeight: 600, color: "rgba(255, 255, 255, 0.6)" }}>Vendor Reference</Typography>
                      <Typography sx={{ fontSize: "13px", fontWeight: 600, color: "rgba(255, 255, 255, 0.8)", fontFamily: "ui-monospace, monospace" }}>
                        {refNumber !== "--" ? refNumber : "—"}
                      </Typography>
                    </Box>

                    <Box sx={{ px: 2.2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                      <Typography sx={{ fontSize: "13.5px", fontWeight: 600, color: "rgba(255, 255, 255, 0.6)" }}>Bank Reference / UTR</Typography>
                      <Typography sx={{ fontSize: "13px", fontWeight: 700, color: utr !== "--" ? "#60A5FA" : "rgba(255, 255, 255, 0.5)", fontFamily: "ui-monospace, monospace" }}>
                        {utr !== "--" ? utr : "—"}
                      </Typography>
                    </Box>

                    <Box sx={{ px: 2.2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Typography sx={{ fontSize: "13.5px", fontWeight: 600, color: "rgba(255, 255, 255, 0.6)" }}>Response Message</Typography>
                      <Typography sx={{ fontSize: "13px", fontWeight: 600, color: "rgba(255, 255, 255, 0.85)" }}>
                        {failureMsg ? failureMsg : status === "SUCCESS" ? "Transaction Processed Successfully" : status === "PENDING" ? "Request under banking switch process" : "—"}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>

              {/* ── 3. FIXED DRAWER FOOTER ── */}
              <Box
                sx={{
                  position: "sticky",
                  bottom: 0,
                  zIndex: 20,
                  p: { xs: 2, sm: 2.5 },
                  bgcolor: "#080B11",
                  borderTop: "1px solid rgba(254, 240, 138, 0.2)",
                  boxShadow: "0 -4px 16px rgba(0, 0, 0, 0.5)",
                }}
              >
                <Stack spacing={1.2}>
                  {/* Primary Action: Print / Download Receipt */}
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => handlePrintReceipt(selectedTxn)}
                    startIcon={<PrintIcon sx={{ fontSize: 18 }} />}
                    sx={{
                      height: "46px",
                      fontSize: "14px",
                      fontWeight: 900,
                      textTransform: "none",
                      borderRadius: "10px",
                      color: "#080B11",
                      background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #F59E0B 100%)",
                      boxShadow: "0 4px 14px rgba(245, 158, 11, 0.35)",
                      "&:hover": {
                        background: "linear-gradient(135deg, #FFFBEB 0%, #FDE047 50%, #F59E0B 100%)",
                        boxShadow: "0 6px 18px rgba(245, 158, 11, 0.5)",
                      },
                    }}
                  >
                    Print / Download Receipt
                  </Button>

                  {/* Secondary Action: Close */}
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => setDrawerOpen(false)}
                    sx={{
                      height: "40px",
                      fontSize: "13.5px",
                      fontWeight: 700,
                      textTransform: "none",
                      borderRadius: "10px",
                      color: "#F8FAFC",
                      borderColor: "rgba(255, 255, 255, 0.15)",
                      bgcolor: "rgba(255, 255, 255, 0.05)",
                      "&:hover": {
                        borderColor: "rgba(254, 240, 138, 0.4)",
                        bgcolor: "rgba(255, 255, 255, 0.1)",
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

export default RetailerPayoutReport;
