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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AssessmentIcon from "@mui/icons-material/Assessment";

import { useCompanyBranding } from "@/hooks/useCompanyBranding";
import { useRetailerStore } from "@/stores/use-retailer-store";

export const formatToIstYmd = (dateObj: Date = new Date()): string => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(dateObj);
};

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
  entry?: string;
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
  PAYOUT: { label: "Payout", bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
  Payout: { label: "Payout", bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
  "Payout Reversal": { label: "Payout Reversal", bg: "#F5F3FF", text: "#6D28D9", border: "#DDD6FE" },
  PAYOUT_REVERSAL: { label: "Payout Reversal", bg: "#F5F3FF", text: "#6D28D9", border: "#DDD6FE" },
  DMT: { label: "DMT", bg: "#ECFDF5", text: "#047857", border: "#A7F3D0" },
  AEPS: { label: "AEPS", bg: "#FFFBEB", text: "#B45309", border: "#FDE68A" },
  UPI: { label: "UPI", bg: "#F5F3FF", text: "#6D28D9", border: "#DDD6FE" },
  BBPS: { label: "BBPS", bg: "#FDF2F8", text: "#BE185D", border: "#FBCFE8" },
  RECHARGE: { label: "Recharge", bg: "#ECFEFF", text: "#0E7490", border: "#A5F3FC" },
  CARD_TO_CASH: { label: "Card-to-Cash", bg: "#FFF7ED", text: "#C2410C", border: "#FED7AA" },
  SETTLEMENT: { label: "Settlement", bg: "#EEF2FF", text: "#4338CA", border: "#C7D2FE" },
  TOPUP: { label: "Topup", bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0" },
  Topup: { label: "Topup", bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0" },
  MANUAL_ADJUSTMENT: { label: "Adjustment", bg: "#FAF5FF", text: "#7E22CE", border: "#E9D5FF" },
  MANUAL_TOPUP: { label: "Topup", bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0" },
  MANUAL_DEBIT: { label: "Debit", bg: "#FEF2F2", text: "#B91C1C", border: "#FECACA" },
  BENE_VERIFY: { label: "Bene Verify", bg: "#F0F9FF", text: "#0369A1", border: "#BAE6FD" },
  BENEFICIARY_VERIFICATION: { label: "Bene Verify", bg: "#F0F9FF", text: "#0369A1", border: "#BAE6FD" },
  BENE_VERIFICATION: { label: "Bene Verify", bg: "#F0F9FF", text: "#0369A1", border: "#BAE6FD" },
};

export const getStatusChipProps = (statusStr?: string) => {
  const s = (statusStr || "SUCCESS").toUpperCase();
  if (s === "SUCCESS") {
    return {
      label: "SUCCESS",
      bg: "#ECFDF5",
      text: "#047857",
      border: "#A7F3D0",
    };
  }
  if (s === "PENDING" || s === "PROCESSING") {
    return {
      label: s,
      bg: "#FFFBEB",
      text: "#B45309",
      border: "#FDE68A",
    };
  }
  if (s === "REVERSED") {
    return {
      label: "REVERSED",
      bg: "#F5F3FF",
      text: "#6D28D9",
      border: "#DDD6FE",
    };
  }
  return {
    label: s || "FAILED",
    bg: "#FEF2F2",
    text: "#B91C1C",
    border: "#FECACA",
  };
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
  const branding = useCompanyBranding();
  const brandPrimary = branding?.primary_color || "#059669";
  const brandSecondary = branding?.secondary_color || "#10B981";
  const { outlet } = useRetailerStore();

  // State: Authoritative Data
  const [items, setItems] = useState<TransactionReportItem[]>([]);
  const [summary, setSummary] = useState<TransactionReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>("");

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
  const [fromDate, setFromDate] = useState<string>(() => formatToIstYmd());
  const [toDate, setToDate] = useState<string>(() => formatToIstYmd());
  const [customDateOpen, setCustomDateOpen] = useState<boolean>(false);
  const [customFrom, setCustomFrom] = useState<string>(() => formatToIstYmd());
  const [customTo, setCustomTo] = useState<string>(() => formatToIstYmd());

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
        document.cookie.split("; ").find(r => 
          r.startsWith("p2p_access_token=") || 
          r.startsWith("pay2pay_access_token=") ||
          r.startsWith("pay2pay_auth_token=") ||
          r.startsWith("access_token=")
        )?.split("=")[1] || ""
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
            const opBal = Number(r.opening_bal ?? r.pre_bal ?? r.previous_balance ?? 0);
            const clBal = Number(r.closing_bal ?? r.cls_bal ?? r.current_balance ?? 0);
            const entry = (r.entry || r.entry_type || r.cr_dr || r.type || "").toUpperCase();
            const isCredit = entry === "CR" || entry === "CREDIT" || (r.cr_amt || r.cr || 0) > 0 || (clBal > opBal && amt > 0);
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
        const errJson = await res.json().catch(() => null);
        const errMsg = errJson?.detail?.message || errJson?.message || "Failed to load transactions for selected date range";
        showToast(errMsg);
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

  // Prevent background page scrolling and double scrollbars when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      const mainEl = document.querySelector("main");
      if (mainEl) {
        const prevOverflow = mainEl.style.overflowY;
        mainEl.style.overflowY = "hidden";
        return () => {
          mainEl.style.overflowY = prevOverflow;
        };
      }
    }
  }, [drawerOpen]);

  const openDetailsDrawer = (item: TransactionReportItem) => {
    setSelectedTxn(item);
    setDrawerOpen(true);
  };

  const handleDatePreset = (preset: string) => {
    setActivePreset(preset);
    const today = formatToIstYmd();
    setPage(0);
    if (preset === "ALL") {
      setFromDate("");
      setToDate("");
      setCustomFrom("");
      setCustomTo("");
    } else if (preset === "TODAY") {
      setFromDate(today);
      setToDate(today);
      setCustomFrom(today);
      setCustomTo(today);
    } else if (preset === "YESTERDAY") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = formatToIstYmd(y);
      setFromDate(yStr);
      setToDate(yStr);
      setCustomFrom(yStr);
      setCustomTo(yStr);
    } else if (preset === "7_DAYS") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      const fromStr = formatToIstYmd(d);
      setFromDate(fromStr);
      setToDate(today);
      setCustomFrom(fromStr);
      setCustomTo(today);
    } else if (preset === "30_DAYS") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      const fromStr = formatToIstYmd(d);
      setFromDate(fromStr);
      setToDate(today);
      setCustomFrom(fromStr);
      setCustomTo(today);
    } else if (preset === "THIS_MONTH") {
      const fromStr = `${today.slice(0, 7)}-01`;
      setFromDate(fromStr);
      setToDate(today);
      setCustomFrom(fromStr);
      setCustomTo(today);
    }
  };

  const handleApplyCustomDates = () => {
    let f = customFrom?.trim() || "";
    let t = customTo?.trim() || "";
    const today = formatToIstYmd();

    if (!f && !t) {
      handleDatePreset("ALL");
      setCustomDateOpen(false);
      return;
    }

    if (!f && t) {
      f = t;
      setCustomFrom(t);
    } else if (f && !t) {
      t = today;
      setCustomTo(today);
    }

    if (f > t) {
      showToast("From Date cannot be later than To Date");
      return;
    }

    setFromDate(f);
    setToDate(t);
    setActivePreset("CUSTOM");
    setPage(0);
    setCustomDateOpen(false);
    showToast("Custom date range applied");
  };

  const formatDisplayDateRange = (from: string, to: string, preset: string) => {
    const today = formatToIstYmd();
    if (preset === "TODAY" || (from === today && to === today)) {
      const d = new Date();
      return `${d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" })} (Today)`;
    }
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yesterday = formatToIstYmd(y);
    if (preset === "YESTERDAY" || (from === yesterday && to === yesterday)) {
      return `${y.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" })} (Yesterday)`;
    }
    if (preset === "ALL" || (!from && !to)) {
      return "All Time";
    }
    const formatStr = (s: string) => {
      if (!s) return "";
      try {
        const parts = s.split("-");
        if (parts.length === 3) {
          const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        }
        return s;
      } catch {
        return s;
      }
    };
    if (from === to && from) {
      return formatStr(from);
    }
    return `${formatStr(from) || "Start"} – ${formatStr(to) || "Today"}`;
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
      const amt = Number(r.amount ?? r.txn_amt ?? 0);
      const opBal = Number(r.opening_bal ?? r.pre_bal ?? r.previous_balance ?? 0);
      const clBal = Number(r.closing_bal ?? r.cls_bal ?? r.current_balance ?? 0);
      const entry = (r.entry || r.entry_type || r.cr_dr || r.type || "").toUpperCase();
      const isCr = entry === "CR" || entry === "CREDIT" || (r.cr_amt || r.cr || 0) > 0 || (clBal > opBal && amt > 0);
      return [
        r.txn_id,
        r.ref_id || r.client_ref_id || "",
        r.service,
        r.wallet || "MAIN",
        opBal.toFixed(2),
        amt.toFixed(2),
        clBal.toFixed(2),
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
    const prefix = (branding?.app_name || branding?.company_name || "Transactions").replace(/\s+/g, "_");
    link.setAttribute("download", `${prefix}_Report_${new Date().toISOString().split("T")[0]}.csv`);
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

  const handlePrintReceipt = (txn?: TransactionReportItem | null) => {
    const t = txn || selectedTxn;
    if (!t) return;

    const txnId = t.txn_id || "N/A";
    const refId = t.ref_id || t.client_ref_id || "N/A";
    const amt = Number(t.amount ?? t.txn_amt ?? 0);
    const openingBal = Number(t.opening_bal ?? t.pre_bal ?? t.previous_balance ?? 0);
    const closingBal = Number(t.closing_bal ?? t.cls_bal ?? t.current_balance ?? 0);
    const entry = (t.entry || t.entry_type || t.cr_dr || t.type || "").toUpperCase();
    const isCr = entry === "CR" || entry === "CREDIT" || (t.cr_amt || t.cr || 0) > 0 || (closingBal > openingBal && amt > 0);
    const dt = formatDateTime(t.date_time || t.transaction_datetime || t.created_at);
    const status = (t.status || "SUCCESS").toUpperCase();
    const service = t.service || "General";
    const narration = getTransactionComments(t);

    const compLogo = branding?.logo_url || "/branding/logo.svg";
    const compName = branding?.company_name || branding?.legal_name || "Enterprise Operations";
    const compLegal = branding?.legal_name || compName;
    const retailerShop = outlet?.name || "Authorized Retail Center";
    const retailerOwner = outlet?.ownerName || t.retailer || "";
    const retailerCode = outlet?.code || "";
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
          <title>Transaction_Receipt_${txnId}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background: #F8FAFC;
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
              background: ${brandPrimary};
              color: #FFFFFF;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            }
            .btn-download {
              background: #FFFFFF;
              color: #334155;
              border: 1px solid #CBD5E1;
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
              color: #047857;
              background: #ECFDF5;
              border: 1px solid #A7F3D0;
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
              color: ${isCr ? "#15803D" : "#B91C1C"};
              margin: 4px 0;
            }
            .amount-mode {
              font-size: 12px;
              font-weight: 700;
              color: #2563EB;
            }
            .balance-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-top: 14px;
              padding-top: 14px;
              border-top: 1px dashed #CBD5E1;
            }
            .bal-box {
              background: #FFFFFF;
              border: 1px solid #E2E8F0;
              border-radius: 8px;
              padding: 8px 12px;
              text-align: center;
            }
            .bal-label {
              font-size: 10.5px;
              color: #64748B;
              font-weight: 600;
            }
            .bal-value {
              font-size: 14px;
              font-weight: 800;
              color: #0F172A;
              margin-top: 2px;
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
              background: #F8FAFC;
              border: 1px solid #E2E8F0;
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
              color: #0F172A;
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
                <span class="receipt-type-tag">Settlement Voucher</span>
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
                <div class="retailer-meta">Agent: ${retailerOwner} ${retailerMobile ? `(${retailerMobile})` : ""}</div>
              </div>
              <div style="text-align: right;">
                <div class="retailer-title">Agent Code</div>
                <div class="retailer-name item-val-mono" style="color: ${brandPrimary};">${retailerCode || "N/A"}</div>
                ${retailerCity ? `<div class="retailer-meta">${retailerCity}</div>` : ""}
              </div>
            </div>

            <!-- Status Banner -->
            <div class="status-banner ${statusBadgeClass}">
              <span>${statusText}</span>
              <span>UTR / REF: ${refId !== "N/A" ? refId : txnId}</span>
            </div>

            <!-- Amount Hero -->
            <div class="amount-hero">
              <div class="amount-label">${isCr ? "Wallet Inflow / Credit" : "Service Debit / Payout"}</div>
              <div class="amount-value">${isCr ? "+" : "-"}₹${amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
              <div class="amount-mode">${service} · Settlement Ledger</div>

              <div class="balance-grid">
                <div class="bal-box">
                  <div class="bal-label">Opening Balance</div>
                  <div class="bal-value">₹${openingBal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                </div>
                <div class="bal-box">
                  <div class="bal-label">Closing Balance</div>
                  <div class="bal-value" style="color: #047857;">₹${closingBal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                </div>
              </div>
            </div>

            <!-- Transaction Audit Info -->
            <div class="section-title">Audit Information</div>
            <div class="grid-2">
              <div class="item-cell">
                <div class="item-label">Transaction ID</div>
                <div class="item-val item-val-mono">${txnId}</div>
              </div>
              <div class="item-cell">
                <div class="item-label">Client Reference ID</div>
                <div class="item-val item-val-mono">${refId}</div>
              </div>
            </div>
            <div class="grid-2">
              <div class="item-cell">
                <div class="item-label">Service Category</div>
                <div class="item-val">${service}</div>
              </div>
              <div class="item-cell">
                <div class="item-label">Transaction Timestamp</div>
                <div class="item-val">${dt.date} ${dt.time}</div>
              </div>
            </div>

            <!-- Narration / Description -->
            <div class="item-cell" style="margin-bottom: 12px;">
              <div class="item-label">Narration / Description</div>
              <div class="item-val" style="font-weight: 600; color: #0F172A;">${narration}</div>
            </div>

            <!-- Footer Compliance Notice -->
            <div class="footer-info">
              This is a computer-generated transaction settlement voucher issued by ${compName}.<br />
              Authorized retail banking agent network · 256-bit SSL encrypted & audit-compliant.<br />
              Generated on ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
            </div>
          </div>

          <script>
            function downloadReceiptHtml() {
              const htmlContent = document.documentElement.outerHTML;
              const blob = new Blob([htmlContent], { type: 'text/html' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'Receipt_${txnId}.html';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
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
        bgcolor: "#FFFFFF",
        color: "#0F172A",
        pt: { xs: 1, md: 1.5 },
        pb: { xs: 6, md: 6 },
        overflowX: "hidden",
      }}
    >
      {/* ── 1. ENTERPRISE PAGE HEADER ── */}
      <Box sx={{ mb: 2.5 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          spacing={2}
        >
          {/* Title & Subtitle */}
          <Box>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: "10px",
                  bgcolor: `${brandPrimary}15`,
                  border: `1px solid ${brandPrimary}30`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: brandPrimary,
                }}
              >
                <AssessmentIcon sx={{ fontSize: 20 }} />
              </Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: "20px", sm: "24px", md: "26px" },
                  letterSpacing: "-0.5px",
                  lineHeight: 1.2,
                  color: "#0F172A",
                }}
              >
                Transaction Report
              </Typography>
            </Stack>

            <Typography
              sx={{
                color: "#64748B",
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
              icon={<CalendarMonthIcon sx={{ fontSize: "14px !important", color: `${brandPrimary} !important` }} />}
              label={formatDisplayDateRange(fromDate, toDate, activePreset)}
              size="small"
              sx={{
                height: "28px",
                fontSize: "12px",
                fontWeight: 700,
                bgcolor: `${brandPrimary}10`,
                color: brandPrimary,
                border: `1px solid ${brandPrimary}30`,
              }}
            />
            <Chip
              label={`${totalRecords} Transactions`}
              size="small"
              sx={{
                height: "28px",
                fontSize: "12px",
                fontWeight: 700,
                bgcolor: "#F1F5F9",
                color: "#334155",
                border: "1px solid #CBD5E1",
              }}
            />
            {lastUpdatedTime && (
              <Chip
                label={`Updated: ${lastUpdatedTime}`}
                size="small"
                sx={{
                  height: "28px",
                  fontSize: "11px",
                  fontWeight: 600,
                  bgcolor: "#F8FAFC",
                  color: "#64748B",
                  border: "1px solid #E2E8F0",
                  display: { xs: "none", sm: "inline-flex" },
                }}
              />
            )}
          </Stack>
        </Stack>
      </Box>

      {/* ── 2. SUMMARY KPI CARDS (PRECISE RESPONSIVE GRID) ── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(2, 1fr)",
            lg: "repeat(4, 1fr)",
          },
          gap: { xs: 1.5, md: 2 },
          mb: 2.5,
        }}
      >
        {/* KPI 1: TOTAL VOLUME */}
        <Paper
          elevation={0}
          sx={{
            p: 2.2,
            borderRadius: "14px",
            bgcolor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: "0 6px 16px rgba(0, 0, 0, 0.06)",
              borderColor: "#CBD5E1",
            },
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.2 }}>
            <Typography sx={{ color: "#475569", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.6px" }}>
              TOTAL VOLUME
            </Typography>
            <Box sx={{ width: 32, height: 32, borderRadius: "8px", bgcolor: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center", color: "#D97706" }}>
              <TrendingUpIcon sx={{ fontSize: 18 }} />
            </Box>
          </Stack>

          {isLoading ? (
            <Skeleton variant="text" width="65%" height={36} sx={{ bgcolor: "#F1F5F9" }} />
          ) : (
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: { xs: "20px", sm: "22px", md: "24px" },
                lineHeight: 1.2,
                color: "#0F172A",
                mb: 0.5,
              }}
            >
              ₹{(summary?.total_volume ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          )}
          <Typography sx={{ color: "#64748B", fontSize: "12px", fontWeight: 500 }}>
            {summary?.total_transactions ?? totalRecords ?? 0} Transactions
          </Typography>
        </Paper>

        {/* KPI 2: TOTAL CREDIT (CR) */}
        <Paper
          elevation={0}
          sx={{
            p: 2.2,
            borderRadius: "14px",
            bgcolor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: "0 6px 16px rgba(0, 0, 0, 0.06)",
              borderColor: "#A7F3D0",
            },
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.2 }}>
            <Typography sx={{ color: "#475569", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.6px" }}>
              TOTAL CREDIT (CR)
            </Typography>
            <Box sx={{ width: 32, height: 32, borderRadius: "8px", bgcolor: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", color: "#16A34A" }}>
              <ArrowDownwardIcon sx={{ fontSize: 18 }} />
            </Box>
          </Stack>

          {isLoading ? (
            <Skeleton variant="text" width="65%" height={36} sx={{ bgcolor: "#F1F5F9" }} />
          ) : (
            <Typography sx={{ fontWeight: 800, fontSize: { xs: "20px", sm: "22px", md: "24px" }, lineHeight: 1.2, color: "#16A34A", mb: 0.5 }}>
              +₹{(summary?.total_credit ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          )}
          <Typography sx={{ color: "#64748B", fontSize: "12px", fontWeight: 500 }}>
            Wallet Inflow &amp; Reversals
          </Typography>
        </Paper>

        {/* KPI 3: TOTAL DEBIT (DR) */}
        <Paper
          elevation={0}
          sx={{
            p: 2.2,
            borderRadius: "14px",
            bgcolor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: "0 6px 16px rgba(0, 0, 0, 0.06)",
              borderColor: "#FECACA",
            },
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.2 }}>
            <Typography sx={{ color: "#475569", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.6px" }}>
              TOTAL DEBIT (DR)
            </Typography>
            <Box sx={{ width: 32, height: 32, borderRadius: "8px", bgcolor: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", color: "#DC2626" }}>
              <ArrowUpwardIcon sx={{ fontSize: 18 }} />
            </Box>
          </Stack>

          {isLoading ? (
            <Skeleton variant="text" width="65%" height={36} sx={{ bgcolor: "#F1F5F9" }} />
          ) : (
            <Typography sx={{ fontWeight: 800, fontSize: { xs: "20px", sm: "22px", md: "24px" }, lineHeight: 1.2, color: "#DC2626", mb: 0.5 }}>
              -₹{(summary?.total_debit ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          )}
          <Typography sx={{ color: "#64748B", fontSize: "12px", fontWeight: 500 }}>
            Payouts &amp; Charges
          </Typography>
        </Paper>

        {/* KPI 4: SUCCESS RATE */}
        <Paper
          elevation={0}
          sx={{
            p: 2.2,
            borderRadius: "14px",
            bgcolor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: "0 6px 16px rgba(0, 0, 0, 0.06)",
              borderColor: "#BFDBFE",
            },
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.2 }}>
            <Typography sx={{ color: "#475569", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.6px" }}>
              SUCCESS RATE
            </Typography>
            <Box sx={{ width: 32, height: 32, borderRadius: "8px", bgcolor: "#DBEAFE", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563EB" }}>
              <CheckCircleIcon sx={{ fontSize: 18 }} />
            </Box>
          </Stack>

          {isLoading ? (
            <Skeleton variant="text" width="65%" height={36} sx={{ bgcolor: "#F1F5F9" }} />
          ) : (
            <Typography sx={{ fontWeight: 800, fontSize: { xs: "20px", sm: "22px", md: "24px" }, lineHeight: 1.2, color: "#2563EB", mb: 0.5 }}>
              {successPercent}%
            </Typography>
          )}
          <Typography sx={{ color: "#64748B", fontSize: "12px", fontWeight: 500 }}>
            {summary?.successful_transactions ?? 0} Completed Successfully
          </Typography>
        </Paper>
      </Box>

      {/* ── 3. REAL-TIME DATE RANGE & PRESET CONTROLS ── */}
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          borderRadius: "14px",
          bgcolor: "#FFFFFF",
          border: "1px solid #E2E8F0",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
          mb: 2,
        }}
      >
        <Stack
          direction={{ xs: "column", lg: "row" }}
          alignItems={{ xs: "stretch", lg: "center" }}
          justifyContent="space-between"
          spacing={1.5}
        >
          {/* Presets List */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.8,
              overflowX: "auto",
              scrollbarWidth: "thin",
              scrollbarColor: "#CBD5E1 transparent",
              "&::-webkit-scrollbar": { height: "4px" },
              "&::-webkit-scrollbar-thumb": { bgcolor: "#CBD5E1", borderRadius: "4px" },
              pb: { xs: 0.5, lg: 0 },
            }}
          >
            <Stack direction="row" alignItems="center" spacing={0.6} sx={{ color: brandPrimary, mr: 0.8, flexShrink: 0 }}>
              <CalendarMonthIcon sx={{ fontSize: 18 }} />
              <Typography sx={{ fontSize: "11.5px", fontWeight: 800, color: "#0F172A", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                Date Range:
              </Typography>
            </Stack>

            {[
              { key: "ALL", label: "All" },
              { key: "TODAY", label: "Today" },
              { key: "YESTERDAY", label: "Yesterday" },
              { key: "7_DAYS", label: "7 Days" },
              { key: "30_DAYS", label: "30 Days" },
              { key: "THIS_MONTH", label: "This Month" },
              { key: "CUSTOM", label: "Custom Range" },
            ].map((preset) => {
              const isSelected = activePreset === preset.key;
              return (
                <Box
                  key={preset.key}
                  onClick={() => {
                    if (preset.key === "CUSTOM") {
                      setCustomDateOpen(true);
                    } else {
                      handleDatePreset(preset.key);
                    }
                  }}
                  sx={{
                    px: 1.8,
                    py: 0.6,
                    borderRadius: "999px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    fontSize: "12px",
                    fontWeight: isSelected ? 700 : 600,
                    color: isSelected ? "#FFFFFF" : "#475569",
                    bgcolor: isSelected ? brandPrimary : "#F8FAFC",
                    border: isSelected ? `1px solid ${brandPrimary}` : "1px solid #E2E8F0",
                    boxShadow: isSelected ? `0 2px 8px ${brandPrimary}40` : "none",
                    transition: "all 0.15s ease-in-out",
                    flexShrink: 0,
                    "&:hover": {
                      bgcolor: isSelected ? brandPrimary : "#F1F5F9",
                      color: isSelected ? "#FFFFFF" : "#0F172A",
                      borderColor: isSelected ? brandPrimary : "#CBD5E1",
                    },
                  }}
                >
                  {preset.label}
                </Box>
              );
            })}
          </Box>

          {/* Inline Custom Date Pickers (From / To / Apply) */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{
              flexShrink: 0,
              flexWrap: "nowrap",
              justifyContent: { xs: "space-between", sm: "flex-end" },
              pt: { xs: 1, lg: 0 },
              borderTop: { xs: "1px solid #E2E8F0", lg: "none" },
            }}
          >
            <TextField
              type="date"
              size="small"
              label="From Date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleApplyCustomDates(); }}
              InputLabelProps={{ shrink: true, sx: { color: "#475569", fontSize: "11px", fontWeight: 700 } }}
              inputProps={{ sx: { color: "#0F172A", fontSize: "12px", py: 0.5, px: 1, height: "18px" } }}
              sx={{
                width: { xs: "40%", sm: 145 },
                bgcolor: "#F8FAFC",
                borderRadius: "8px",
                border: "1px solid #CBD5E1",
                "& fieldset": { border: "none" },
                "&:hover": { borderColor: "#94A3B8" },
              }}
            />
            <TextField
              type="date"
              size="small"
              label="To Date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleApplyCustomDates(); }}
              InputLabelProps={{ shrink: true, sx: { color: "#475569", fontSize: "11px", fontWeight: 700 } }}
              inputProps={{ sx: { color: "#0F172A", fontSize: "12px", py: 0.5, px: 1, height: "18px" } }}
              sx={{
                width: { xs: "40%", sm: 145 },
                bgcolor: "#F8FAFC",
                borderRadius: "8px",
                border: "1px solid #CBD5E1",
                "& fieldset": { border: "none" },
                "&:hover": { borderColor: "#94A3B8" },
              }}
            />
            <Button
              size="small"
              variant="contained"
              onClick={handleApplyCustomDates}
              sx={{
                minWidth: "auto",
                px: 1.8,
                py: 0.6,
                fontSize: "12px",
                fontWeight: 700,
                textTransform: "none",
                borderRadius: "8px",
                bgcolor: brandPrimary,
                color: "#FFFFFF",
                boxShadow: `0 2px 6px ${brandPrimary}40`,
                "&:hover": {
                  bgcolor: brandSecondary,
                },
              }}
            >
              Apply
            </Button>
          </Stack>
        </Stack>

        {/* Active Range Context Feedback */}
        <Divider sx={{ my: 1, borderColor: "#E2E8F0" }} />
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ flexWrap: "wrap", gap: 1 }}>
          <Typography sx={{ fontSize: "12px", color: "#64748B", fontWeight: 500 }}>
            Showing records for <strong style={{ color: "#0F172A" }}>{formatDisplayDateRange(fromDate, toDate, activePreset)}</strong>
          </Typography>
          <Typography sx={{ fontSize: "11.5px", color: brandPrimary, fontWeight: 700 }}>
            {totalRecords} {totalRecords === 1 ? "transaction" : "transactions"} found
          </Typography>
        </Stack>
      </Paper>

      {/* ── 4. SEARCH + FILTER TOOLBAR ── */}
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          borderRadius: "14px",
          bgcolor: "#FFFFFF",
          border: "1px solid #E2E8F0",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
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
                bgcolor: "#F8FAFC",
                borderRadius: "10px",
                fontSize: "13px",
                color: "#0F172A",
                height: "40px",
                border: "1px solid #CBD5E1",
                "& fieldset": { border: "none" },
                "&:hover": { borderColor: "#94A3B8" },
                "&.Mui-focused": {
                  borderColor: brandPrimary,
                  boxShadow: `0 0 0 3px ${brandPrimary}25`,
                },
              },
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: brandPrimary, fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: globalSearch ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setGlobalSearch("")} sx={{ color: "#64748B" }}>
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
                  bgcolor: "#F8FAFC",
                  color: "#0F172A",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  "& fieldset": { border: "none" },
                  "& .MuiSvgIcon-root": { color: "#64748B" },
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
                  bgcolor: "#F8FAFC",
                  color: "#0F172A",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  "& fieldset": { border: "none" },
                  "& .MuiSvgIcon-root": { color: "#64748B" },
                }}
              >
                <MenuItem value="ALL" sx={{ fontSize: "12.5px" }}>All Statuses</MenuItem>
                <MenuItem value="SUCCESS" sx={{ fontSize: "12.5px", color: "#16A34A" }}>Success</MenuItem>
                <MenuItem value="PENDING" sx={{ fontSize: "12.5px", color: "#D97706" }}>Pending</MenuItem>
                <MenuItem value="FAILED" sx={{ fontSize: "12.5px", color: "#DC2626" }}>Failed</MenuItem>
                <MenuItem value="REVERSED" sx={{ fontSize: "12.5px", color: "#7C3AED" }}>Reversed</MenuItem>
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
                  bgcolor: "#F8FAFC",
                  color: "#0F172A",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  "& fieldset": { border: "none" },
                  "& .MuiSvgIcon-root": { color: "#64748B" },
                }}
              >
                <MenuItem value="ALL" sx={{ fontSize: "12.5px" }}>All Entries (CR &amp; DR)</MenuItem>
                <MenuItem value="CR" sx={{ fontSize: "12.5px", color: "#16A34A" }}>Credit (CR)</MenuItem>
                <MenuItem value="DR" sx={{ fontSize: "12.5px", color: "#DC2626" }}>Debit (DR)</MenuItem>
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
                color: "#DC2626",
                borderColor: "#FCA5A5",
                bgcolor: "#FEF2F2",
                "&:hover": {
                  borderColor: "#EF4444",
                  bgcolor: "#FEE2E2",
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
                  bgcolor: "#F8FAFC",
                  border: "1px solid #CBD5E1",
                  color: brandPrimary,
                  "&:hover": { bgcolor: "#F1F5F9", borderColor: "#94A3B8" },
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

            {/* Export Button */}
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
                fontWeight: 700,
                textTransform: "none",
                borderRadius: "8px",
                color: "#FFFFFF",
                bgcolor: brandPrimary,
                boxShadow: `0 2px 8px ${brandPrimary}40`,
                "&:hover": {
                  bgcolor: brandSecondary,
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
                    bgcolor: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "10px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                  },
                },
              }}
            >
              <MenuItem onClick={handleExportCsv} sx={{ fontSize: "12.5px", color: "#0F172A", gap: 1.5, py: 1, px: 2 }}>
                <TableChartIcon sx={{ fontSize: 17, color: "#16A34A" }} />
                Export to CSV / Excel
              </MenuItem>
              <MenuItem onClick={handleExportPdf} sx={{ fontSize: "12.5px", color: "#0F172A", gap: 1.5, py: 1, px: 2 }}>
                <PrintIcon sx={{ fontSize: 17, color: "#2563EB" }} />
                Print / Save as PDF
              </MenuItem>
            </Menu>
          </Stack>
        </Stack>
      </Paper>

      {/* ── 5. PROFESSIONAL UNIVERSAL ENTERPRISE DATA TABLE (ALL BREAKPOINTS) ── */}
      <Box sx={{ width: "100%", mb: 2.5 }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: "14px",
            bgcolor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
            overflow: "hidden",
            width: "100%",
          }}
        >
          <TableContainer sx={{ overflowX: "auto", width: "100%", WebkitOverflowScrolling: "touch" }}>
            <Table stickyHeader sx={{ minWidth: 980, tableLayout: "auto" }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "#F8FAFC" }}>
                  <TableCell sx={{ color: "#475569", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap", py: 1.4, px: 2, minWidth: 190, bgcolor: "#F8FAFC", borderColor: "#E2E8F0" }}>
                    TXN ID / REF
                  </TableCell>
                  <TableCell sx={{ color: "#475569", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap", py: 1.4, px: 1.5, minWidth: 100, bgcolor: "#F8FAFC", borderColor: "#E2E8F0" }}>
                    SERVICE
                  </TableCell>
                  <TableCell sx={{ color: "#475569", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap", py: 1.4, px: 1.5, minWidth: 115, bgcolor: "#F8FAFC", borderColor: "#E2E8F0" }}>
                    OPENING BAL
                  </TableCell>
                  <TableCell sx={{ color: "#475569", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap", py: 1.4, px: 1.5, minWidth: 110, bgcolor: "#F8FAFC", borderColor: "#E2E8F0" }}>
                    AMOUNT
                  </TableCell>
                  <TableCell sx={{ color: "#475569", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap", py: 1.4, px: 1.5, minWidth: 115, bgcolor: "#F8FAFC", borderColor: "#E2E8F0" }}>
                    CLOSING BAL
                  </TableCell>
                  <TableCell sx={{ color: "#475569", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap", py: 1.4, px: 1.5, minWidth: 100, bgcolor: "#F8FAFC", borderColor: "#E2E8F0" }}>
                    STATUS
                  </TableCell>
                  <TableCell sx={{ color: "#475569", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap", py: 1.4, px: 1.5, minWidth: 125, bgcolor: "#F8FAFC", borderColor: "#E2E8F0" }}>
                    DATE &amp; TIME
                  </TableCell>
                  <TableCell sx={{ color: "#475569", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap", py: 1.4, px: 2, bgcolor: "#F8FAFC", borderColor: "#E2E8F0" }}>
                    DESCRIPTION
                  </TableCell>
                  <TableCell align="center" sx={{ color: "#475569", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap", py: 1.4, px: 1.5, minWidth: 80, bgcolor: "#F8FAFC", borderColor: "#E2E8F0" }}>
                    ACTIONS
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  [1, 2, 3, 4, 5].map((n) => (
                    <TableRow key={n}>
                      <TableCell colSpan={9} sx={{ py: 2, borderColor: "#E2E8F0" }}>
                        <Skeleton variant="text" height={28} sx={{ bgcolor: "#F1F5F9", borderRadius: "4px" }} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6, borderColor: "#E2E8F0" }}>
                      <AssessmentIcon sx={{ fontSize: 44, color: "#94A3B8", mb: 1 }} />
                      <Typography sx={{ fontWeight: 800, fontSize: "15px", color: "#0F172A" }}>
                        No Transactions Found
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#64748B", display: "block", mt: 0.5 }}>
                        No records match your selected filter criteria.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((row, idx) => {
                    const rowKey = `${row.txn_id}-${row.entry || ''}-${row.amount ?? ''}-${row.description || ''}-${idx}`;
                    const amt = Number(row.amount ?? row.txn_amt ?? 0);
                    const openingBal = Number(row.opening_bal ?? row.pre_bal ?? row.previous_balance ?? 0);
                    const closingBal = Number(row.closing_bal ?? row.cls_bal ?? row.current_balance ?? 0);
                    const entry = (row.entry || row.entry_type || row.cr_dr || row.type || "").toUpperCase();
                    const isCr = entry === "CR" || entry === "CREDIT" || (row.cr_amt || row.cr || 0) > 0 || (closingBal > openingBal && amt > 0);
                    const dt = formatDateTime(row.date_time || row.transaction_datetime || row.created_at);
                    const svc = row.service || "General";
                    const isReversal = (row.status || "").toUpperCase() === "REVERSED" ||
                      (row.description || "").toLowerCase().includes("reversal") ||
                      (row.narration || "").toLowerCase().includes("reversal") ||
                      (svc.toUpperCase() === "PAYOUT" && isCr);
                    const svcBadge = isReversal
                      ? { label: "Payout Reversal", bg: "#F5F3FF", text: "#6D28D9", border: "#DDD6FE" }
                      : (SERVICE_BADGES[svc] || { label: svc, bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" });
                    const statusChip = getStatusChipProps(row.status);

                    return (
                      <TableRow
                        key={rowKey}
                        hover
                        onClick={() => openDetailsDrawer(row)}
                        sx={{
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          "&:hover": {
                            bgcolor: "#F8FAFC !important",
                          },
                          "& td": { borderColor: "#E2E8F0", py: 1.2 },
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
                                color: brandPrimary,
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
                                sx={{ p: 0.2, color: "#64748B", "&:hover": { color: brandPrimary } }}
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
                                color: "#64748B",
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
                              fontWeight: 700,
                              bgcolor: svcBadge.bg,
                              color: svcBadge.text,
                              border: `1px solid ${svcBadge.border}`,
                            }}
                          />
                        </TableCell>

                        {/* 3. Opening Balance */}
                        <TableCell sx={{ px: 1.5, fontSize: "12.5px", fontWeight: 600, color: "#334155", whiteSpace: "nowrap" }}>
                          ₹{openingBal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </TableCell>

                        {/* 4. Amount with CR / DR Color */}
                        <TableCell sx={{ px: 1.5, whiteSpace: "nowrap" }}>
                          <Typography
                            sx={{
                              fontSize: "13px",
                              fontWeight: 800,
                              color: isCr ? "#16A34A" : "#DC2626",
                            }}
                          >
                            {isCr ? "+" : "-"}₹{amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 700, color: isCr ? "#16A34A" : "#DC2626", opacity: 0.9 }}>
                            {isCr ? "CREDIT (CR)" : "DEBIT (DR)"}
                          </Typography>
                        </TableCell>

                        {/* 5. Closing Balance */}
                        <TableCell sx={{ px: 1.5, fontSize: "12.5px", fontWeight: 700, color: "#0F172A", whiteSpace: "nowrap" }}>
                          ₹{closingBal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </TableCell>

                        {/* 6. Status */}
                        <TableCell sx={{ px: 1.5, whiteSpace: "nowrap" }}>
                          <Chip
                            label={statusChip.label}
                            size="small"
                            sx={{
                              height: "22px",
                              fontSize: "10.5px",
                              fontWeight: 700,
                              bgcolor: statusChip.bg,
                              color: statusChip.text,
                              border: `1px solid ${statusChip.border}`,
                            }}
                          />
                        </TableCell>

                        {/* 7. Date & Time */}
                        <TableCell sx={{ px: 1.5, whiteSpace: "nowrap" }}>
                          <Box
                            sx={{
                              display: "inline-flex",
                              flexDirection: "column",
                              bgcolor: "#F8FAFC",
                              border: "1px solid #E2E8F0",
                              borderRadius: "6px",
                              px: 1,
                              py: 0.4,
                            }}
                          >
                            <Typography sx={{ fontSize: "12px", fontWeight: 700, color: "#0F172A", lineHeight: 1.2 }}>
                              {dt.date}
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: "10.5px", color: "#64748B", display: "block" }}>
                              {dt.time}
                            </Typography>
                          </Box>
                        </TableCell>

                        {/* 8. Description */}
                        <TableCell sx={{ px: 2, maxWidth: 260, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          <Typography sx={{ fontSize: "12px", color: "#334155" }}>
                            {getTransactionComments(row)}
                          </Typography>
                        </TableCell>

                        {/* 9. Actions */}
                        <TableCell align="center" sx={{ px: 1.5, whiteSpace: "nowrap" }}>
                          <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
                            <Tooltip title="View Details">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDetailsDrawer(row);
                                }}
                                sx={{ color: brandPrimary, p: 0.5, "&:hover": { bgcolor: `${brandPrimary}15` } }}
                              >
                                <VisibilityIcon sx={{ fontSize: 17 }} />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Print Receipt">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrintReceipt(row);
                                }}
                                sx={{ color: "#2563EB", p: 0.5, "&:hover": { bgcolor: "#EFF6FF" } }}
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

          {/* Table Pagination Container */}
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
              color: "#334155",
              borderTop: "1px solid #E2E8F0",
              bgcolor: "#FFFFFF",
              "& .MuiSvgIcon-root": { color: "#475569" },
              "& .MuiTablePagination-select": {
                bgcolor: "#F8FAFC",
                color: "#0F172A",
                borderRadius: "6px",
                border: "1px solid #CBD5E1",
                py: 0.3,
              },
            }}
          />
        </Paper>
      </Box>

      {/* ── 6. TRANSACTION DETAILS SIDE DRAWER ── */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          zIndex: (theme) => theme.zIndex.modal + 100,
        }}
        slotProps={{
          backdrop: {
            sx: {
              bgcolor: "rgba(15, 23, 42, 0.45)",
              backdropFilter: "blur(4px)",
              zIndex: (theme) => theme.zIndex.modal + 99,
            },
          },
        }}
        PaperProps={{
          sx: {
            width: { xs: "100vw", sm: 480, md: 520 },
            maxWidth: "100vw",
            bgcolor: "#FFFFFF",
            color: "#0F172A",
            borderLeft: "1px solid #E2E8F0",
            boxShadow: "-8px 0 30px rgba(0, 0, 0, 0.1)",
            p: 0,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            maxHeight: "100vh",
            overflow: "hidden",
            zIndex: (theme) => theme.zIndex.modal + 100,
          },
        }}
      >
        {selectedTxn && (() => {
          const amt = Number(selectedTxn.amount ?? selectedTxn.txn_amt ?? 0);
          const openingBal = Number(selectedTxn.opening_bal ?? selectedTxn.pre_bal ?? selectedTxn.previous_balance ?? 0);
          const closingBal = Number(selectedTxn.closing_bal ?? selectedTxn.cls_bal ?? selectedTxn.current_balance ?? 0);
          const entry = (selectedTxn.entry || selectedTxn.entry_type || selectedTxn.cr_dr || selectedTxn.type || "").toUpperCase();
          const isCr = entry === "CR" || entry === "CREDIT" || (selectedTxn.cr_amt || selectedTxn.cr || 0) > 0 || (closingBal > openingBal && amt > 0);
          const dt = formatDateTime(selectedTxn.date_time || selectedTxn.transaction_datetime || selectedTxn.created_at);
          const svc = selectedTxn.service || "General";
          const svcBadge = SERVICE_BADGES[svc] || { label: svc, bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" };
          const statusChip = getStatusChipProps(selectedTxn.status);

          return (
            <Box sx={{ display: "flex", flexDirection: "column", height: "100%", maxHeight: "100vh", overflow: "hidden" }}>
              {/* Drawer Header */}
              <Box
                sx={{
                  flexShrink: 0,
                  p: 2.2,
                  bgcolor: "#FFFFFF",
                  borderBottom: "1px solid #E2E8F0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "8px",
                      bgcolor: `${brandPrimary}15`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: brandPrimary,
                    }}
                  >
                    <ReceiptIcon sx={{ fontSize: 18 }} />
                  </Box>
                  <Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 800,
                        fontSize: "17px",
                        color: "#0F172A",
                      }}
                    >
                      Transaction Details
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#64748B", fontSize: "11px" }}>
                      Settlement Ledger Audit Summary
                    </Typography>
                  </Box>
                </Stack>

                <IconButton onClick={() => setDrawerOpen(false)} sx={{ color: "#64748B", "&:hover": { color: "#0F172A" } }}>
                  <CloseIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>

              {/* Content Body */}
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                  p: 2.5,
                  pb: 4,
                  scrollbarWidth: "thin",
                  scrollbarColor: "#CBD5E1 transparent",
                  "&::-webkit-scrollbar": { width: "6px" },
                  "&::-webkit-scrollbar-track": { background: "transparent" },
                  "&::-webkit-scrollbar-thumb": {
                    background: "#CBD5E1",
                    borderRadius: "10px",
                  },
                }}
              >
                {/* Hero Box */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.2,
                    borderRadius: "14px",
                    bgcolor: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                    textAlign: "center",
                    mb: 2.5,
                  }}
                >
                  <Chip
                    label={statusChip.label}
                    size="small"
                    sx={{
                      height: "22px",
                      fontSize: "10.5px",
                      fontWeight: 700,
                      bgcolor: statusChip.bg,
                      color: statusChip.text,
                      border: `1px solid ${statusChip.border}`,
                      mb: 1.2,
                    }}
                  />

                  <Typography
                    sx={{
                      fontWeight: 900,
                      fontSize: "28px",
                      lineHeight: 1.1,
                      color: isCr ? "#16A34A" : "#DC2626",
                      mb: 0.5,
                    }}
                  >
                    {isCr ? "+" : "-"}₹{amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Typography>

                  <Typography variant="caption" sx={{ color: "#64748B", fontSize: "11.5px", fontWeight: 600 }}>
                    {isCr ? "Wallet Inflow / Refund Credit" : "Service Debit / Payout Transfer"}
                  </Typography>

                  <Divider sx={{ my: 1.5, borderColor: "#E2E8F0" }} />

                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1.5 }}>
                    <Box sx={{ textAlign: "center", bgcolor: "#FFFFFF", p: 1, borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                      <Typography variant="caption" sx={{ color: "#64748B", fontSize: "10.5px", fontWeight: 600 }}>
                        Opening Balance
                      </Typography>
                      <Typography sx={{ fontWeight: 800, color: "#0F172A", fontSize: "13px", mt: 0.2 }}>
                        ₹{openingBal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>

                    <Box sx={{ textAlign: "center", bgcolor: "#FFFFFF", p: 1, borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                      <Typography variant="caption" sx={{ color: "#64748B", fontSize: "10.5px", fontWeight: 600 }}>
                        Closing Balance
                      </Typography>
                      <Typography sx={{ fontWeight: 800, color: brandPrimary, fontSize: "13px", mt: 0.2 }}>
                        ₹{closingBal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>

                {/* Structured Metadata Fields */}
                <Typography sx={{ fontSize: "11.5px", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.8px", mb: 1.2 }}>
                  Audit Information
                </Typography>

                <Stack spacing={1.2} sx={{ mb: 2.5 }}>
                  {/* Txn ID */}
                  <Box sx={{ p: 1.2, borderRadius: "8px", bgcolor: "#F8FAFC", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: "#64748B", fontSize: "10.5px" }}>Transaction ID</Typography>
                      <Typography sx={{ fontWeight: 700, fontSize: "12px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", color: brandPrimary }}>
                        {selectedTxn.txn_id}
                      </Typography>
                    </Box>
                    <IconButton size="small" onClick={() => copyToClipboard(selectedTxn.txn_id, "Transaction ID")} sx={{ color: "#64748B", p: 0.3, "&:hover": { color: brandPrimary } }}>
                      <ContentCopyIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Box>

                  {/* Ref ID */}
                  {selectedTxn.ref_id && (
                    <Box sx={{ p: 1.2, borderRadius: "8px", bgcolor: "#F8FAFC", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: "#64748B", fontSize: "10.5px" }}>Client Reference ID</Typography>
                        <Typography sx={{ fontWeight: 600, fontSize: "12px", color: "#334155" }}>
                          {selectedTxn.ref_id}
                        </Typography>
                      </Box>
                      <IconButton size="small" onClick={() => copyToClipboard(selectedTxn.ref_id || "", "Reference ID")} sx={{ color: "#64748B", p: 0.3, "&:hover": { color: brandPrimary } }}>
                        <ContentCopyIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Box>
                  )}

                  {/* Service & Type */}
                  <Box sx={{ p: 1.2, borderRadius: "8px", bgcolor: "#F8FAFC", border: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="caption" sx={{ color: "#64748B", fontSize: "10.5px" }}>Service Category</Typography>
                    <Chip
                      label={svcBadge.label}
                      size="small"
                      sx={{ height: "22px", fontSize: "10.5px", fontWeight: 700, bgcolor: svcBadge.bg, color: svcBadge.text, border: `1px solid ${svcBadge.border}` }}
                    />
                  </Box>

                  {/* Narration */}
                  <Box sx={{ p: 1.2, borderRadius: "8px", bgcolor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                    <Typography variant="caption" sx={{ color: "#64748B", fontSize: "10.5px" }}>Narration / Description</Typography>
                    <Typography sx={{ fontWeight: 600, fontSize: "12px", color: "#0F172A", mt: 0.2 }}>
                      {getTransactionComments(selectedTxn)}
                    </Typography>
                  </Box>

                  {/* Timestamp */}
                  <Box sx={{ p: 1.2, borderRadius: "8px", bgcolor: "#F8FAFC", border: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="caption" sx={{ color: "#64748B", fontSize: "10.5px" }}>Timestamp</Typography>
                    <Typography sx={{ fontWeight: 700, fontSize: "11.5px", color: "#0F172A" }}>
                      {dt.date} · {dt.time}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              {/* Drawer Footer Actions */}
              <Box
                sx={{
                  flexShrink: 0,
                  p: 2,
                  bgcolor: "#FFFFFF",
                  borderTop: "1px solid #E2E8F0",
                }}
              >
                <Stack spacing={1}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => handlePrintReceipt(selectedTxn)}
                    startIcon={<PrintIcon sx={{ fontSize: 17 }} />}
                    sx={{
                      height: "40px",
                      fontSize: "12.5px",
                      fontWeight: 700,
                      textTransform: "none",
                      borderRadius: "8px",
                      color: "#FFFFFF",
                      bgcolor: brandPrimary,
                      boxShadow: `0 2px 8px ${brandPrimary}40`,
                      "&:hover": {
                        bgcolor: brandSecondary,
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
                      fontWeight: 600,
                      textTransform: "none",
                      borderRadius: "8px",
                      color: "#475569",
                      borderColor: "#CBD5E1",
                      bgcolor: "#FFFFFF",
                      "&:hover": {
                        borderColor: "#94A3B8",
                        bgcolor: "#F8FAFC",
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

      {/* ── 7. TOAST NOTIFICATIONS ── */}
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
            color: "#FFFFFF",
            border: "1px solid #334155",
            fontWeight: 600,
            fontSize: "12.5px",
            "& .MuiAlert-icon": { color: brandPrimary },
          }}
        >
          {snackbarMsg}
        </Alert>
      </Snackbar>

      {/* ── 8. CUSTOM DATE RANGE MODAL DIALOG ── */}
      <Dialog
        open={customDateOpen}
        onClose={() => setCustomDateOpen(false)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: "14px",
              p: 1,
              width: { xs: "92vw", sm: 380 },
              maxWidth: "100%",
              bgcolor: "#FFFFFF",
              border: "1px solid #E2E8F0",
              color: "#0F172A",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.12)",
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: "16px", color: "#0F172A" }}>Select Custom Date Range</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: "8px !important" }}>
          <TextField
            label="From Date"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true, sx: { color: "#475569", fontWeight: 600 } }}
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleApplyCustomDates(); }}
            InputProps={{
              sx: {
                bgcolor: "#F8FAFC",
                color: "#0F172A",
                border: "1px solid #CBD5E1",
                "& fieldset": { border: "none" },
              },
            }}
          />
          <TextField
            label="To Date"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true, sx: { color: "#475569", fontWeight: 600 } }}
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleApplyCustomDates(); }}
            InputProps={{
              sx: {
                bgcolor: "#F8FAFC",
                color: "#0F172A",
                border: "1px solid #CBD5E1",
                "& fieldset": { border: "none" },
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setCustomDateOpen(false)} sx={{ textTransform: "none", color: "#64748B", fontWeight: 600 }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleApplyCustomDates}
            sx={{
              bgcolor: brandPrimary,
              color: "#FFFFFF",
              textTransform: "none",
              fontWeight: 700,
              boxShadow: `0 2px 6px ${brandPrimary}40`,
              "&:hover": {
                bgcolor: brandSecondary,
              },
            }}
          >
            Apply Range
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RetailerTransactionReport;
