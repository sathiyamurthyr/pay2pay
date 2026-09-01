"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  Popover,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Tooltip,
} from "@mui/material";

// Icons
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import RefreshIcon from "@mui/icons-material/Refresh";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";
import ReceiptIcon from "@mui/icons-material/Receipt";
import ClearIcon from "@mui/icons-material/Clear";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import TableChartIcon from "@mui/icons-material/TableChart";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ErrorOutlinedIcon from "@mui/icons-material/ErrorOutlined";
import ShareIcon from "@mui/icons-material/Share";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import EmailIcon from "@mui/icons-material/Email";
import ImageIcon from "@mui/icons-material/Image";
import SendIcon from "@mui/icons-material/Send";
import { CopyButton } from "@/components/common/CopyButton";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";
import { DynamicTransactionDetailsModal } from "@/components/transactions/DynamicTransactionDetailsModal";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import RotateLeftIcon from "@mui/icons-material/RotateLeft";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

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
  retailer?: string;
  customer?: string;
  beneficiary?: string;
  // API-returned field names (primary)
  account?: string;       // API returns 'account'
  amount?: number;        // API returns 'amount'
  charge?: number;        // API returns 'charge'
  gst?: number;           // API returns 'gst'
  // Legacy / alternate field names (fallbacks)
  ac_no?: string;
  amt?: number;
  fee?: number;
  tax?: number;
  debit?: number;
  mode?: string;
  utr?: string;
  wallet?: string;
  date_time?: string;
  status: string;
  actions?: string[];
  // Legacy and detailed view fields
  transaction_id?: string;
  transaction_number?: string;
  reference_id?: string;
  initiated_at?: string | null;
  completed_at?: string | null;
  customer_name?: string;
  customer_mobile?: string;
  beneficiary_name?: string;
  beneficiary_mobile?: string;
  bank?: string;
  bank_name?: string;
  ifsc?: string;
  masked_account_number?: string;
  account_number?: string;
  ifsc_code?: string;
  payment_mode?: string;
  transfer_amount?: number;
  convenience_fee?: number;
  gst_amount?: number;
  wallet_debit?: number;
  retailer_commission?: number;
  tds_amount?: number;
  utr_number?: string;
  refund_status?: string;
  remarks?: string;
  comments?: string;
  receipt_enabled?: boolean;
  retailer_name?: string;
  customer_kyc_status?: string;
  payment_method?: string;
}

export interface FooterTotals {
  total_transactions: number;
  total_transfer_amount: number;
  total_convenience_fee: number;
  total_gst: number;
  total_wallet_debit: number;
  total_commission: number;
  total_tds: number;
  total_successful: number;
  total_pending: number;
  total_failed: number;
  total_reversed: number;
}

const DEFAULT_RETAILER_ID = "f89239b5-4dbb-41a9-9ba7-0f97580c9368";
const DEFAULT_TENANT_ID = "93538c98-0b19-493c-a247-4cdb02a46c68";

const getActiveRetailerId = () => {
  if (typeof window !== "undefined") {
    try {
      const userStr =
        localStorage.getItem("user_info") ||
        localStorage.getItem("user") ||
        localStorage.getItem("auth_user") ||
        localStorage.getItem("pay2pay_user_data");
      if (userStr) {
        const u = JSON.parse(userStr);
        if (u.retailer_id) return u.retailer_id;
        if (u.retailer_code) return u.retailer_code;
        if (u.id || u.public_id) return u.id || u.public_id;
        if (u.user_id) return u.user_id;
      }
    } catch {}
    return (
      localStorage.getItem("p2p_retailer_id") ||
      localStorage.getItem("p2p_active_retailer_id") ||
      localStorage.getItem("retailer_code") ||
      ""
    );
  }
  return "";
};

const getActiveTenantId = () => {
  if (typeof window !== "undefined") {
    try {
      const userStr =
        localStorage.getItem("user_info") ||
        localStorage.getItem("user") ||
        localStorage.getItem("auth_user") ||
        localStorage.getItem("pay2pay_user_data");
      if (userStr) {
        const u = JSON.parse(userStr);
        if (u.tenant_id) return u.tenant_id;
      }
    } catch {}
    return localStorage.getItem("p2p_tenant_id") || "";
  }
  return "";
};

const getLocalDateIso = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTodayIso = () => getLocalDateIso();

const getDateOffsetIso = (daysOffset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getFirstDayOfMonthIso = (monthOffset: number = 0) => {
  const d = new Date();
  d.setMonth(d.getMonth() + monthOffset, 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
};

export const RetailerPayoutReport: React.FC = () => {
  const branding = useCompanyBranding();
  const [reportCompany, setReportCompany] = useState<any>(null);

  // State for Summary & Report Grid
  const [summary, setSummary] = useState<PayoutReportSummary | null>(null);
  const [summaryError, setSummaryError] = useState<boolean>(false);
  const [items, setItems] = useState<PayoutReportItem[]>([]);
  const [footerTotals, setFooterTotals] = useState<FooterTotals | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSummaryLoading, setIsSummaryLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Selected Transaction for Drawer
  const [selectedTxn, setSelectedTxn] = useState<PayoutReportItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

  // Share Modal & Toast State
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [shareTxn, setShareTxn] = useState<PayoutReportItem | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState<boolean>(false);
  const [selectedTxnNumber, setSelectedTxnNumber] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMsg, setSnackbarMsg] = useState<string>("");
  const [isDownloadingSinglePdf, setIsDownloadingSinglePdf] = useState<boolean>(false);

  // Pagination & Sorting
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Quick Search & Date Filters (Default to Today)
  const [globalSearch, setGlobalSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>(getLocalDateIso());
  const [toDate, setToDate] = useState<string>(getLocalDateIso());
  const [activePreset, setActivePreset] = useState<string>("TODAY");

  // Filter Bar Controls
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>("ALL");

  // Advanced Filter Popover State
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [searchTxnId, setSearchTxnId] = useState<string>("");
  const [searchRefId, setSearchRefId] = useState<string>("");
  const [searchCustomer, setSearchCustomer] = useState<string>("");
  const [searchCustomerMobile, setSearchCustomerMobile] = useState<string>("");
  const [searchBeneficiary, setSearchBeneficiary] = useState<string>("");
  const [searchBeneficiaryMobile, setSearchBeneficiaryMobile] = useState<string>("");
  const [minimumAmount, setMinimumAmount] = useState<string>("");
  const [maximumAmount, setMaximumAmount] = useState<string>("");

  // Export Menu State
  const [exportAnchorEl, setExportAnchorEl] = useState<HTMLButtonElement | null>(null);

  // Action Menu State per row
  const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [actionRowItem, setActionRowItem] = useState<PayoutReportItem | null>(null);

  // Debounce search query changes
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(globalSearch);
      setPage(0);
    }, 300);
    return () => clearTimeout(handler);
  }, [globalSearch]);

  // Calculate active filter count
  const activeFilterCount = [
    searchTxnId,
    searchRefId,
    searchCustomer,
    searchCustomerMobile,
    searchBeneficiary,
    searchBeneficiaryMobile,
    statusFilter !== "ALL" ? statusFilter : "",
    paymentModeFilter !== "ALL" ? paymentModeFilter : "",
    minimumAmount,
    maximumAmount,
    fromDate !== getTodayIso() ? fromDate : "",
    toDate !== getTodayIso() ? toDate : "",
  ].filter(Boolean).length;

  // Fetch Summary KPIs
  const fetchSummary = useCallback(async (fDate: string, tDate: string) => {
    setIsSummaryLoading(true);
    setSummaryError(false);
    try {
      const activeRetailer = getActiveRetailerId();
      const activeTenant = getActiveTenantId();
      const q = new URLSearchParams();
      if (activeRetailer) q.append("retailer_id", activeRetailer);
      if (activeTenant) q.append("tenant_id", activeTenant);
      if (fDate) q.append("from_date", fDate);
      if (tDate) q.append("to_date", tDate);

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

      const res = await fetch(`/api/v1/payout/reports/summary?${q.toString()}`, {
        headers,
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        const d = json.data || json;
        const normalizedSummary: PayoutReportSummary = {
          todays_transactions: Number(d.todays_transactions ?? d.total_transactions ?? 0),
          todays_transfer_amount: Number(d.todays_transfer_amount ?? d.total_volume ?? 0),
          todays_wallet_debit: Number(d.todays_wallet_debit ?? d.total_wallet_debit ?? 0),
          todays_commission: Number(d.todays_commission ?? d.total_charges ?? 0),
          todays_gst: Number(d.todays_gst ?? d.total_gst ?? 0),
          todays_tds: Number(d.todays_tds ?? 0),
          pending_transactions: Number(d.pending_transactions ?? 0),
          successful_transactions: Number(d.successful_transactions ?? d.success_transactions ?? 0),
          failed_transactions: Number(d.failed_transactions ?? 0),
          reversed_transactions: Number(d.reversed_transactions ?? 0),
          successful_amount: Number(d.successful_amount ?? d.success_amount ?? d.todays_transfer_amount ?? d.total_volume ?? 0),
          pending_amount: Number(d.pending_amount ?? 0),
          failed_amount: Number(d.failed_amount ?? 0),
        };
        setSummary(normalizedSummary);
      } else {
        setSummaryError(true);
      }
    } catch (e) {
      console.error("Failed to fetch payout summary KPIs", e);
      setSummaryError(true);
    } finally {
      setIsSummaryLoading(false);
    }
  }, []);

  // Fetch Grid Records from Backend API
  const fetchReportData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const activeRetailer = getActiveRetailerId();
      const activeTenant = getActiveTenantId();
      const q = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
      });
      if (activeRetailer) q.append("retailer_id", activeRetailer);
      if (activeTenant) q.append("tenant_id", activeTenant);

      if (fromDate) q.append("from_date", fromDate);
      if (toDate) q.append("to_date", toDate);

      if (debouncedSearch.trim()) {
        q.append("search", debouncedSearch.trim());
      }

      if (searchTxnId) q.append("transaction_id", searchTxnId);
      if (searchRefId) q.append("reference_id", searchRefId);
      if (searchCustomer) q.append("customer_name", searchCustomer);
      if (searchCustomerMobile) q.append("customer_mobile", searchCustomerMobile);
      if (searchBeneficiary) q.append("beneficiary_name", searchBeneficiary);
      if (searchBeneficiaryMobile) q.append("beneficiary_mobile", searchBeneficiaryMobile);
      if (statusFilter !== "ALL") q.append("status", statusFilter);
      if (paymentModeFilter !== "ALL") q.append("payment_mode", paymentModeFilter);
      if (minimumAmount) q.append("amount_from", minimumAmount);
      if (maximumAmount) q.append("amount_to", maximumAmount);

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("auth_token") ||
            localStorage.getItem("token") ||
            localStorage.getItem("access_token")
          : "";
      const headers: Record<string, string> = {};
      if (token && token.trim().length > 10) {
        headers["Authorization"] = `Bearer ${token.trim()}`;
      }

      const res = await fetch(`/api/v1/payout/reports/grid?${q.toString()}`, {
        headers,
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setItems(data.items || []);
      if (data.company) {
        setReportCompany(data.company);
      }
      setTotalRecords(data.pagination?.total_records || 0);
      setFooterTotals(data.footer_totals || null);
    } catch (e: any) {
      console.error("Failed to fetch payout report grid:", e);
      setError("Unable to load payout data.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [
    page,
    rowsPerPage,
    fromDate,
    toDate,
    debouncedSearch,
    searchTxnId,
    searchRefId,
    searchCustomer,
    searchCustomerMobile,
    searchBeneficiary,
    searchBeneficiaryMobile,
    statusFilter,
    paymentModeFilter,
    minimumAmount,
    maximumAmount,
  ]);

  // Initial Auto Load & Refresh on Dependencies
  useEffect(() => {
    fetchSummary(fromDate, toDate);
    fetchReportData();
  }, [fetchSummary, fetchReportData]);

  // Auto-refresh every 60 seconds when viewing TODAY to keep data live
  useEffect(() => {
    if (activePreset !== "TODAY") return;
    const interval = setInterval(() => {
      fetchSummary(fromDate, toDate);
      fetchReportData();
    }, 60000);
    return () => clearInterval(interval);
  }, [activePreset, fromDate, toDate, fetchSummary, fetchReportData]);

  // Handle Preset Date Buttons
  const applyDatePreset = (presetKey: string) => {
    const today = getTodayIso();
    let f = today;
    let t = today;

    if (presetKey === "YESTERDAY") {
      f = getDateOffsetIso(-1);
      t = getDateOffsetIso(-1);
    } else if (presetKey === "LAST_7_DAYS") {
      f = getDateOffsetIso(-6);
      t = today;
    } else if (presetKey === "LAST_30_DAYS") {
      f = getDateOffsetIso(-29);
      t = today;
    } else if (presetKey === "THIS_MONTH") {
      f = getFirstDayOfMonthIso(0);
      t = today;
    }

    setFromDate(f);
    setToDate(t);
    setActivePreset(presetKey);
    setPage(0);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchSummary(fromDate, toDate);
    fetchReportData();
  };

  const handleResetFilters = () => {
    const today = getTodayIso();
    setFromDate(today);
    setToDate(today);
    setActivePreset("TODAY");
    setGlobalSearch("");
    setDebouncedSearch("");
    setSearchTxnId("");
    setSearchRefId("");
    setSearchCustomer("");
    setSearchCustomerMobile("");
    setSearchBeneficiary("");
    setSearchBeneficiaryMobile("");
    setStatusFilter("ALL");
    setPaymentModeFilter("ALL");
    setMinimumAmount("");
    setMaximumAmount("");
    setPage(0);
    setFilterAnchorEl(null);
  };

  const logAudit = async (action: string, details?: any) => {
    try {
      await fetch("/api/v1/payout/reports/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          retailer_id: DEFAULT_RETAILER_ID,
          tenant_id: DEFAULT_TENANT_ID,
          details,
        }),
      });
    } catch (e) {
      console.error("Audit log error:", e);
    }
  };

  // Export handlers
  const handleExportCSV = () => {
    setExportAnchorEl(null);
    logAudit("REPORT_EXPORTED_CSV", { totalRecords, fromDate, toDate });
    let csvStr = "S.No,Txn ID,Customer,Beneficiary,A/C No,Amt,Fee,Tax,Debit,Mode,UTR,Wallet,Date/Time,Status,Actions\n";
    items.forEach((r, idx) => {
      const sNo = r.s_no || (page * rowsPerPage + idx + 1);
      const txnId = r.txn_id || r.transaction_number || r.transaction_id || "--";
      const cust = (r.customer || r.customer_name || "Verified Customer").replace(/"/g, '""');
      const bene = (r.beneficiary || r.beneficiary_name || "Beneficiary").replace(/"/g, '""');
      const acc = (r.ac_no || (r as any).account_number || r.masked_account_number || "--").replace(/"/g, '""');
      const amt = Number(r.amt ?? r.transfer_amount ?? 0).toFixed(2);
      const fee = Number(r.fee ?? r.convenience_fee ?? 0).toFixed(2);
      const tax = Number(r.tax ?? (r as any).tax_amount ?? ((r.gst_amount || 0) + (r.tds_amount || 0))).toFixed(2);
      const debit = Number(r.debit ?? r.wallet_debit ?? (Number(amt) + Number(fee) + Number(tax))).toFixed(2);
      const mode = r.mode || r.payment_mode || "IMPS";
      const utr = (r.utr || r.utr_number || "--").replace(/"/g, '""');
      const wallet = r.wallet || (r as any).wallet_type || "Main Wallet";
      const dateTime = (r.date_time || r.initiated_at || "--").replace(/"/g, '""');
      const status = (r.status || "SUCCESS").toUpperCase();
      const actions = "VIEW";

      csvStr += `${sNo},"${txnId}","${cust}","${bene}","${acc}",${amt},${fee},${tax},${debit},"${mode}","${utr}","${wallet}","${dateTime}","${status}","${actions}"\n`;
    });

    const blob = new Blob([csvStr], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Pay2Pay_Payout_Report_${fromDate || "Today"}_to_${toDate || "Today"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const generatePrintHtml = (reportItems: PayoutReportItem[], summaryData: PayoutReportSummary | null, fDate: string, tDate: string) => {
    const compName = reportCompany?.company_name || branding.company_name || "SUPER REX PRODUCTS PRIVATE LIMITED";
    const compLegal = reportCompany?.legal_name || branding.legal_name || "SUPER REX PRODUCTS PRIVATE LIMITED";
    const compLogo = reportCompany?.logo_url || branding.logo_url || "/branding/logo.png";
    const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const totAmount = summaryData ? summaryData.todays_transfer_amount : reportItems.reduce((s, r) => s + (r.amt ?? r.transfer_amount ?? 0), 0);
    const totTxns = summaryData ? summaryData.todays_transactions : reportItems.length;
    const succAmount = summaryData ? (summaryData.successful_amount ?? summaryData.todays_transfer_amount) : reportItems.filter(r => r.status === "SUCCESS").reduce((s, r) => s + (r.amt ?? r.transfer_amount ?? 0), 0);
    const succTxns = summaryData ? summaryData.successful_transactions : reportItems.filter(r => r.status === "SUCCESS").length;
    const pendAmount = summaryData ? (summaryData.pending_amount ?? 0) : reportItems.filter(r => ["PENDING", "PROCESSING"].includes(r.status)).reduce((s, r) => s + (r.amt ?? r.transfer_amount ?? 0), 0);
    const pendTxns = summaryData ? summaryData.pending_transactions : reportItems.filter(r => ["PENDING", "PROCESSING"].includes(r.status)).length;
    const failAmount = summaryData ? (summaryData.failed_amount ?? 0) : reportItems.filter(r => ["FAILED", "REJECTED", "REVERSED"].includes(r.status)).reduce((s, r) => s + (r.amt ?? r.transfer_amount ?? 0), 0);
    const failTxns = summaryData ? (summaryData.failed_transactions + summaryData.reversed_transactions) : reportItems.filter(r => ["FAILED", "REJECTED", "REVERSED"].includes(r.status)).length;

    let rowsHtml = "";
    if (reportItems.length > 0) {
      reportItems.forEach((r, idx) => {
        const sNo = r.s_no || (idx + 1);
        const txnDisplay = r.txn_id || r.transaction_number || r.transaction_id || "-";
        const customerDisplay = r.customer || r.customer_name || "Verified Customer";
        const beneficiaryDisplay = r.beneficiary || r.beneficiary_name || "Beneficiary";
        const accDisplay = r.ac_no || (r as any).account_number || r.masked_account_number || "--";
        const amtVal = Number(r.amt ?? r.transfer_amount ?? 0);
        const feeVal = Number(r.fee ?? r.convenience_fee ?? 0);
        const taxVal = Number(r.tax ?? (r as any).tax_amount ?? ((r.gst_amount || 0) + (r.tds_amount || 0)));
        const debitVal = Number(r.debit ?? r.wallet_debit ?? (amtVal + feeVal + taxVal));
        const modeDisplay = r.mode || r.payment_mode || "IMPS";
        const utrDisplay = r.utr || r.utr_number || "-";
        const walletDisplay = r.wallet || (r as any).wallet_type || "Main Wallet";
        const dateTimeDisplay = r.date_time || r.initiated_at || "-";
        const statusDisplay = (r.status || "SUCCESS").toUpperCase();

        rowsHtml += `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 10px;">
            <td style="padding: 6px; text-align: center; font-weight: 600;">${sNo}</td>
            <td style="padding: 6px; font-weight: bold; font-family: monospace;">${txnDisplay}</td>
            <td style="padding: 6px;">${customerDisplay}</td>
            <td style="padding: 6px;">${beneficiaryDisplay}</td>
            <td style="padding: 6px; font-family: monospace;">${accDisplay}</td>
            <td style="padding: 6px; text-align: right; font-weight: bold; color: #16a34a;">₹${amtVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
            <td style="padding: 6px; text-align: right;">₹${feeVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
            <td style="padding: 6px; text-align: right;">₹${taxVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
            <td style="padding: 6px; text-align: right; font-weight: bold;">₹${debitVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
            <td style="padding: 6px; text-align: center; font-weight: bold;">${modeDisplay}</td>
            <td style="padding: 6px; font-family: monospace;">${utrDisplay}</td>
            <td style="padding: 6px; text-align: center;">${walletDisplay}</td>
            <td style="padding: 6px;">${dateTimeDisplay}</td>
            <td style="padding: 6px; text-align: center; font-weight: bold;">${statusDisplay}</td>
            <td style="padding: 6px; text-align: center;">VIEW</td>
          </tr>
        `;
      });
    } else {
      rowsHtml = `
        <tr>
          <td colSpan="14" style="text-align:center; padding: 24px; color:#64748b; font-weight: 600;">
            No payout transactions found.
          </td>
        </tr>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${compName.replace(/\s+/g, '_')}_Payout_Report_${new Date().toISOString().split('T')[0]}</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; background: #ffffff; margin: 0; padding: 16px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 12px; }
          .brand { font-size: 18px; font-weight: 900; color: #1e3a8a; letter-spacing: -0.5px; }
          .subbrand { font-size: 11px; color: #2563eb; font-weight: 700; text-transform: uppercase; margin-bottom: 2px; }
          .meta { text-align: right; font-size: 10px; color: #475569; }
          .meta-grid { display: flex; gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 10px; }
          .meta-item { flex: 1; }
          .meta-item .label { font-weight: 700; color: #64748b; font-size: 9px; text-transform: uppercase; }
          .meta-item .val { font-weight: 800; color: #0f172a; margin-top: 2px; }
          .summary-grid { display: flex; gap: 10px; margin-bottom: 16px; }
          .summary-box { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; background: #f8fafc; }
          .summary-box .label { font-size: 9px; font-weight: 800; text-transform: uppercase; color: #64748b; }
          .summary-box .val { font-size: 14px; font-weight: 900; color: #0f172a; margin: 2px 0 1px 0; }
          .summary-box .sub { font-size: 10px; color: #475569; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { background: #f1f5f9; color: #1e293b; font-size: 9px; font-weight: 800; text-transform: uppercase; padding: 6px; border-bottom: 2px solid #cbd5e1; text-align: left; }
          .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #64748b; display: flex; justify-content: space-between; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${compLogo}" style="height: 38px; max-width: 120px; object-fit: contain;" />
            <div>
              <div class="subbrand">${compName}</div>
              <div class="brand">PAYOUT TRANSACTION REPORT</div>
            </div>
          </div>
          <div class="meta">
            <div><strong>Generated At:</strong> ${today}</div>
            <div><strong>Report Format:</strong> Printable Statement</div>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-item">
            <div class="label">Retailer Name</div>
            <div class="val">Pay2Pay Verified Merchant</div>
          </div>
          <div class="meta-item">
            <div class="label">Retailer ID</div>
            <div class="val">RET-0CFE2B</div>
          </div>
          <div class="meta-item">
            <div class="label">Report Period</div>
            <div class="val">${fDate || "All Time"} to ${tDate || "Today"}</div>
          </div>
          <div class="meta-item">
            <div class="label">Applied Filters</div>
            <div class="val">Status: ${statusFilter || "ALL"} | Mode: ${paymentModeFilter || "ALL"}</div>
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-box" style="border-top: 3px solid #2563eb;">
            <div class="label" style="color: #2563eb;">TOTAL PAYOUTS</div>
            <div class="val">₹${totAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
            <div class="sub">${totTxns} transactions</div>
          </div>
          <div class="summary-box" style="border-top: 3px solid #16a34a;">
            <div class="label" style="color: #16a34a;">SUCCESSFUL</div>
            <div class="val" style="color: #16a34a;">₹${succAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
            <div class="sub">${succTxns} successful</div>
          </div>
          <div class="summary-box" style="border-top: 3px solid #d97706;">
            <div class="label" style="color: #d97706;">PENDING</div>
            <div class="val" style="color: #d97706;">₹${pendAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
            <div class="sub">${pendTxns} processing</div>
          </div>
          <div class="summary-box" style="border-top: 3px solid #dc2626;">
            <div class="label" style="color: #dc2626;">FAILED / REVERSED</div>
            <div class="val" style="color: #dc2626;">₹${failAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
            <div class="sub">${failTxns} transactions</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="text-align: center;">S.No</th>
              <th>Txn ID</th>
              <th>Customer</th>
              <th>Beneficiary</th>
              <th>Account</th>
              <th style="text-align: right;">Amount</th>
              <th style="text-align: center;">Mode</th>
              <th>UTR</th>
              <th style="text-align: right;">Tax</th>
              <th>Date & Time</th>
              <th style="text-align: right;">Fee</th>
              <th>Wallet Type</th>
              <th style="text-align: right;">Debit</th>
              <th style="text-align: right;">Commission</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <div>Pay2Pay FinTech Retailer Platform · Official Statement</div>
          <div>Confidential — For Authorized Use Only</div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;
  };

  const handleExportExcel = () => {
    setExportAnchorEl(null);
    logAudit("REPORT_EXPORTED_EXCEL", { totalRecords, fromDate, toDate });
    handleExportCSV();
  };

  const handleExportPDF = async () => {
    setExportAnchorEl(null);
    setIsExportingPdf(true);
    logAudit("REPORT_EXPORTED_PDF", { totalRecords, fromDate, toDate });

    try {
      const params = new URLSearchParams({
        retailer_id: "f89239b5-4dbb-41a9-9ba7-0f97580c9368",
        tenant_id: "93538c98-0b19-493c-a247-4cdb02a46c68",
        export_format: "pdf",
      });

      if (fromDate) params.append("from_date", fromDate);
      if (toDate) params.append("to_date", toDate);
      if (statusFilter && statusFilter !== "ALL") params.append("status", statusFilter);
      if (paymentModeFilter && paymentModeFilter !== "ALL") params.append("payment_mode", paymentModeFilter);
      if (globalSearch) params.append("search", globalSearch);

      const downloadUrl = `/api/v1/payout/reports/export/pdf?${params.toString()}`;
      
      const res = await fetch(downloadUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Pay2Pay_Payout_Report_RET-0CFE2B_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF Export error:", err);
      alert("Unable to generate the payout report PDF. Please check server connection and try again.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrintReport = () => {
    setExportAnchorEl(null);
    logAudit("REPORT_PRINTED", { totalRecords, fromDate, toDate });
    const printWin = window.open("", "_blank", "width=1100,height=800");
    if (printWin) {
      printWin.document.write(generatePrintHtml(items, summary, fromDate, toDate));
      printWin.document.close();
    }
  };

  const generateSingleReceiptPrintHtml = (txn: PayoutReportItem) => {
    const compName = reportCompany?.company_name || branding.company_name || "SUPER REX PRODUCTS PRIVATE LIMITED";
    const compLegal = reportCompany?.legal_name || branding.legal_name || "SUPER REX PRODUCTS PRIVATE LIMITED";
    const compLogo = reportCompany?.logo_url || branding.logo_url || "/branding/logo.png";
    const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const stStr = (txn.status || "SUCCESS").toUpperCase();
    let stColor = "#16a34a";
    let stBadgeText = "✓ TRANSACTION SUCCESSFUL";
    let stBg = "#f0fdf4";
    if (["PENDING", "PROCESSING"].includes(stStr)) {
      stColor = "#d97706";
      stBadgeText = "◷ TRANSACTION PENDING";
      stBg = "#fffbeb";
    } else if (["FAILED", "REJECTED"].includes(stStr)) {
      stColor = "#dc2626";
      stBadgeText = "✕ TRANSACTION FAILED";
      stBg = "#fef2f2";
    } else if (["REVERSED", "PARTIALLY_REVERSED"].includes(stStr)) {
      stColor = "#7c3aed";
      stBadgeText = "↩ TRANSACTION REVERSED";
      stBg = "#f3e8ff";
    }

    const amtStr = `₹${Number(txn.transfer_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
    const feeStr = `₹${Number(txn.convenience_fee || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
    const gstStr = `₹${Number(txn.gst_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
    const debitStr = `₹${Number(txn.wallet_debit || ((txn.transfer_amount || 0) + (txn.convenience_fee || 0) + (txn.gst_amount || 0))).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${compName.replace(/\s+/g, '_')}_Receipt_${txn.transaction_number || txn.reference_id}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; background: #ffffff; margin: 0; padding: 20px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px; }
          .brand { font-size: 20px; font-weight: 900; color: #1e3a8a; letter-spacing: -0.5px; }
          .subbrand { font-size: 11px; color: #2563eb; font-weight: 700; text-transform: uppercase; margin-bottom: 2px; }
          .meta { text-align: right; font-size: 11px; color: #475569; }
          .hero { text-align: center; background: ${stBg}; border: 1px solid ${stColor}; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
          .hero-status { font-weight: 800; font-size: 14px; color: ${stColor}; text-transform: uppercase; margin-bottom: 4px; }
          .hero-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
          .hero-amount { font-size: 28px; font-weight: 900; color: #0f172a; }
          .section-title { font-size: 11px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; margin: 16px 0 6px 0; letter-spacing: 0.5px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 12px; }
          td { padding: 8px 10px; border: 1px solid #e2e8f0; }
          td.lbl { font-weight: 700; color: #64748b; width: 35%; background: #f8fafc; text-transform: uppercase; font-size: 10px; }
          td.val { font-weight: 700; color: #0f172a; }
          td.mono { font-family: monospace; font-weight: 800; }
          .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #64748b; display: flex; justify-content: space-between; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; align-items: center; gap: 14px;">
            <img src="${compLogo}" style="height: 44px; max-width: 140px; object-fit: contain;" />
            <div>
              <div class="subbrand">${compName}</div>
              <div class="brand">OFFICIAL TRANSACTION RECEIPT</div>
            </div>
          </div>
          <div class="meta">
            <div><strong>Retailer:</strong> Pay2Pay Verified Merchant (RET-0CFE2B)</div>
            <div><strong>Generated At:</strong> ${today}</div>
          </div>
        </div>

        <div class="hero">
          <div class="hero-status">${stBadgeText}</div>
          <div class="hero-label">Transfer Amount</div>
          <div class="hero-amount">${amtStr}</div>
        </div>

        <div class="section-title">Transaction Information</div>
        <table>
          <tr><td class="lbl">Transaction ID</td><td class="val mono">${txn.transaction_number || txn.reference_id}</td></tr>
          <tr><td class="lbl">Reference ID</td><td class="val mono">${txn.reference_id || "-"}</td></tr>
          <tr><td class="lbl">UTR Number</td><td class="val mono" style="color: ${txn.utr_number ? "#16a34a" : "#64748b"};">${txn.utr_number || "--"}</td></tr>
          <tr><td class="lbl">Payment Mode</td><td class="val">${txn.payment_mode || "IMPS"}</td></tr>
          <tr><td class="lbl">Initiated At</td><td class="val">${txn.initiated_at ? txn.initiated_at.replace("T", " ") : "-"}</td></tr>
          <tr><td class="lbl">Completed At</td><td class="val">${txn.completed_at ? txn.completed_at.replace("T", " ") : "--"}</td></tr>
        </table>

        <div class="section-title">Customer Information</div>
        <table>
          <tr><td class="lbl">Customer Name</td><td class="val">${txn.customer_name || "N/A"}</td></tr>
          <tr><td class="lbl">Mobile Number</td><td class="val mono">${txn.customer_mobile || "N/A"}</td></tr>
        </table>

        <div class="section-title">Beneficiary Information</div>
        <table>
          <tr><td class="lbl">Beneficiary Name</td><td class="val">${txn.beneficiary_name || "N/A"}</td></tr>
          <tr><td class="lbl">Bank Name</td><td class="val">${txn.bank_name || "N/A"}</td></tr>
          <tr><td class="lbl">Account Number</td><td class="val mono">${txn.account_number || txn.masked_account_number || txn.ac_no || "N/A"}</td></tr>
          <tr><td class="lbl">IFSC Code</td><td class="val mono">${txn.ifsc_code || "N/A"}</td></tr>
        </table>

        <div class="section-title">Financial Breakdown</div>
        <table>
          <tr><td class="lbl">Transfer Amount</td><td class="val">${amtStr}</td></tr>
          <tr><td class="lbl">Convenience Fee</td><td class="val">${feeStr}</td></tr>
          <tr><td class="lbl">GST Amount</td><td class="val">${gstStr}</td></tr>
          <tr><td class="lbl">Total Wallet Debit</td><td class="val" style="color:#16a34a; font-weight:900;">${debitStr}</td></tr>
        </table>

        ${txn.remarks || ["REVERSED", "FAILED"].includes(stStr) ? `
          <div class="section-title">Status Remark / Reason</div>
          <table>
            <tr><td class="lbl">Remark / Reason</td><td class="val">${txn.remarks || `Transaction marked as ${stStr} by banking partner.`}</td></tr>
          </table>
        ` : ""}

        <div class="footer">
          <div>${compLegal} · System Generated Official Receipt</div>
          <div>Confidential — For Authorized Customer Use</div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 300);
          };
        </script>
      </body>
      </html>
    `;
  };

  const generateReceiptImage = (txn: PayoutReportItem) => {
    const compName = (reportCompany?.company_name || branding.company_name || "SUPER REX PRODUCTS PRIVATE LIMITED").toUpperCase();
    const compLegal = reportCompany?.legal_name || branding.legal_name || "SUPER REX PRODUCTS PRIVATE LIMITED";
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1600;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 1200, 1600);

    ctx.fillStyle = "#1E3A8A";
    ctx.fillRect(0, 0, 1200, 24);

    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(60, 60, 1080, 120);
    ctx.strokeStyle = "#CBD5E1";
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 60, 1080, 120);

    ctx.fillStyle = "#2563EB";
    ctx.font = "bold 20px 'Segoe UI', sans-serif";
    ctx.fillText(`${compName} RETAILER PLATFORM`, 90, 105);

    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 32px 'Segoe UI', sans-serif";
    ctx.fillText("OFFICIAL TRANSACTION RECEIPT", 90, 150);

    const stStr = (txn.status || "SUCCESS").toUpperCase();
    let stColor = "#16A34A";
    let stBg = "#F0FDF4";
    if (["PENDING", "PROCESSING"].includes(stStr)) { stColor = "#D97706"; stBg = "#FFFBEB"; }
    else if (["FAILED", "REJECTED"].includes(stStr)) { stColor = "#DC2626"; stBg = "#FEF2F2"; }
    else if (["REVERSED", "PARTIALLY_REVERSED"].includes(stStr)) { stColor = "#7C3AED"; stBg = "#F3E8FF"; }

    ctx.fillStyle = stBg;
    ctx.fillRect(60, 210, 1080, 160);
    ctx.strokeStyle = stColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(60, 210, 1080, 160);

    ctx.fillStyle = stColor;
    ctx.font = "bold 24px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`STATUS: ${stStr}`, 600, 260);

    ctx.fillStyle = "#64748B";
    ctx.font = "bold 18px 'Segoe UI', sans-serif";
    ctx.fillText("TRANSFER AMOUNT", 600, 295);

    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 46px 'Segoe UI', sans-serif";
    ctx.fillText(`₹${Number(txn.transfer_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 600, 350);

    ctx.textAlign = "left";

    const dataRows = [
      ["Transaction ID", txn.transaction_number || txn.reference_id],
      ["Reference ID", txn.reference_id || "-"],
      ["UTR Number", txn.utr_number || "--"],
      ["Payment Mode", txn.payment_mode || "IMPS"],
      ["Initiated At", txn.initiated_at ? txn.initiated_at.replace("T", " ") : "-"],
      ["Customer Name", txn.customer_name || "N/A"],
      ["Customer Mobile", txn.customer_mobile || "N/A"],
      ["Beneficiary Name", txn.beneficiary_name || "N/A"],
      ["Bank Name", txn.bank_name || "N/A"],
      ["Account Number", txn.account_number || txn.masked_account_number || txn.ac_no || "N/A"],
      ["IFSC Code", txn.ifsc_code || "N/A"],
      ["Wallet Debit", `₹${Number(txn.wallet_debit || txn.transfer_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`],
      ["Retailer Name", "Pay2Pay Verified Merchant"],
      ["Retailer ID", "RET-0CFE2B"],
    ];

    let startY = 410;
    dataRows.forEach(([lbl, val], i) => {
      const y = startY + i * 70;
      ctx.fillStyle = i % 2 === 0 ? "#F8FAFC" : "#FFFFFF";
      ctx.fillRect(60, y, 1080, 60);
      ctx.strokeStyle = "#E2E8F0";
      ctx.lineWidth = 1;
      ctx.strokeRect(60, y, 1080, 60);

      ctx.fillStyle = "#64748B";
      ctx.font = "bold 18px 'Segoe UI', sans-serif";
      ctx.fillText(String(lbl || "").toUpperCase(), 90, y + 36);

      ctx.fillStyle = "#0F172A";
      ctx.font = "bold 20px 'Courier New', monospace";
      ctx.fillText(String(val || ""), 420, y + 36);
    });

    ctx.fillStyle = "#94A3B8";
    ctx.fillRect(60, 1500, 1080, 2);

    ctx.fillStyle = "#64748B";
    ctx.font = "16px 'Segoe UI', sans-serif";
    ctx.fillText(`${compLegal} · System Generated Official Receipt Image`, 60, 1540);
    ctx.fillText("Confidential — For Authorized Customer Use", 760, 1540);

    const imgUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = imgUrl;
    a.download = `${compName.replace(/\s+/g, '_')}_Receipt_${txn.transaction_number || txn.reference_id}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    logAudit("RECEIPT_IMAGE_DOWNLOADED", { transaction_id: txn.transaction_number || txn.reference_id });
  };

  const handlePrintSingleReceipt = (txn: PayoutReportItem) => {
    logAudit("RECEIPT_PRINTED", { transaction_id: txn.transaction_number || txn.reference_id });
    const printWin = window.open("", "_blank", "width=900,height=800");
    if (printWin) {
      printWin.document.write(generateSingleReceiptPrintHtml(txn));
      printWin.document.close();
    }
  };

  const handleDownloadSinglePdf = async (txn: PayoutReportItem) => {
    const compName = reportCompany?.company_name || branding.company_name || "Pay2Pay";
    setIsDownloadingSinglePdf(true);
    const txId = txn.transaction_number || txn.reference_id || "";
    logAudit("RECEIPT_DOWNLOADED", { transaction_id: txId });

    try {
      const res = await fetch(`/api/v1/payout/reports/transactions/${encodeURIComponent(txId)}/receipt/pdf`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${compName.replace(/\s+/g, '_')}_Receipt_${txId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download receipt PDF error:", err);
      setSnackbarMsg("Unable to generate PDF receipt. Please check server connection and try again.");
      setSnackbarOpen(true);
    } finally {
      setIsDownloadingSinglePdf(false);
    }
  };

  const handleShareWhatsApp = (txn: PayoutReportItem) => {
    const compName = reportCompany?.company_name || branding.company_name || "Pay2Pay Fintech";
    const txId = txn.transaction_number || txn.reference_id;
    const stStr = (txn.status || "SUCCESS").toUpperCase();
    const amtStr = `₹${Number(txn.transfer_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
    const dateStr = txn.initiated_at ? txn.initiated_at.replace("T", " ") : "N/A";
    
    const msg = `*${compName} Retailer Platform*\n\nOfficial Transaction Receipt\n\nTransaction ID:\n${txId}\n\nStatus:\n${stStr}\n\nAmount:\n${amtStr}\n\nReference ID:\n${txn.reference_id || "-"}\n\nUTR:\n${txn.utr_number || "--"}\n\nDate:\n${dateStr}\n\nRetailer:\nVerified Merchant\n\nCustomer:\n${txn.customer_name || "N/A"}\n\nBeneficiary:\n${txn.beneficiary_name || "N/A"} (${txn.account_number || txn.masked_account_number || txn.ac_no || "N/A"})\n\nFor more details, please refer to your official receipt statement.`;

    logAudit("RECEIPT_SHARED_WHATSAPP", { transaction_id: txId });

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
  };

  const handleShareEmail = (txn: PayoutReportItem) => {
    const compName = reportCompany?.company_name || branding.company_name || "Pay2Pay Fintech";
    const txId = txn.transaction_number || txn.reference_id;
    const stStr = (txn.status || "SUCCESS").toUpperCase();
    const amtStr = `₹${Number(txn.transfer_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

    const subject = `${compName} Transaction Receipt - ${txId}`;
    const body = `Dear Customer,\n\nPlease find the transaction details below.\n\nTransaction ID:\n${txId}\n\nAmount:\n${amtStr}\n\nStatus:\n${stStr}\n\nReference ID:\n${txn.reference_id || "-"}\n\nUTR:\n${txn.utr_number || "--"}\n\nBeneficiary:\n${txn.beneficiary_name || "N/A"} (${txn.account_number || txn.masked_account_number || txn.ac_no || "N/A"})\n\nRegards,\n${compName} Retailer Platform`;

    logAudit("RECEIPT_SHARED_EMAIL", { transaction_id: txId });

    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_self");
  };

  const handleCopyDetails = (txn: PayoutReportItem) => {
    const txId = txn.transaction_number || txn.reference_id;
    const stStr = (txn.status || "SUCCESS").toUpperCase();
    const amtStr = `₹${Number(txn.transfer_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
    const dateStr = txn.initiated_at ? txn.initiated_at.replace("T", " ") : "N/A";

    const text = `Pay2Pay Transaction Receipt\nID: ${txId}\nStatus: ${stStr}\nAmount: ${amtStr}\nRef ID: ${txn.reference_id || "-"}\nUTR: ${txn.utr_number || "--"}\nDate: ${dateStr}\nCustomer: ${txn.customer_name || "N/A"}\nBeneficiary: ${txn.beneficiary_name || "N/A"} (${txn.account_number || txn.masked_account_number || txn.ac_no || "N/A"})`;

    navigator.clipboard.writeText(text);
    setSnackbarMsg("Transaction receipt details copied to clipboard!");
    setSnackbarOpen(true);
    logAudit("RECEIPT_COPIED", { transaction_id: txId });
  };

  const handleViewDetails = (row: PayoutReportItem) => {
    setSelectedTxn(row);
    const txnNum = row.transaction_number || row.txn_id || row.reference_id || row.transaction_id;
    setSelectedTxnNumber(txnNum || null);
    setDetailsModalOpen(true);
    logAudit("TRANSACTION_DETAILS_VIEWED", { transaction_id: txnNum || "" });
  };

  const renderStatusBadge = (stStr: string) => {
    let bgcolor = "rgba(59, 130, 246, 0.12)";
    let color = "#60A5FA";
    let border = "1px solid rgba(96, 165, 250, 0.3)";
    let label = stStr || "SUCCESS";

    switch (stStr?.toUpperCase()) {
      case "SUCCESS":
        bgcolor = "rgba(34, 197, 94, 0.12)";
        color = "#4ADE80";
        border = "1px solid rgba(74, 222, 128, 0.3)";
        break;
      case "PENDING":
      case "PROCESSING":
      case "INITIATED":
        bgcolor = "rgba(245, 158, 11, 0.12)";
        color = "#FBBF24";
        border = "1px solid rgba(251, 191, 36, 0.3)";
        break;
      case "FAILED":
      case "REJECTED":
      case "TIMEOUT":
        bgcolor = "rgba(239, 68, 68, 0.12)";
        color = "#F87171";
        border = "1px solid rgba(248, 113, 113, 0.3)";
        break;
      case "REVERSED":
        bgcolor = "rgba(168, 85, 247, 0.12)";
        color = "#C084FC";
        border = "1px solid rgba(192, 132, 252, 0.3)";
        break;
    }

    return (
      <Chip
        label={label}
        size="small"
        sx={{
          bgcolor,
          color,
          border,
          fontWeight: 700,
          fontSize: "11px",
          height: "22px",
          borderRadius: "6px",
        }}
      />
    );
  };

  return (
    <Box sx={{ width: "100%", color: "#F8FAFC" }}>
      {/* 1. SINGLE INTEGRATED COMPACT HEADER + FINANCIAL TOOLBAR CONTAINER (HEIGHT ~75-90px) */}
      <Paper
        elevation={0}
        sx={{
          mb: 2,
          p: 1.5,
          px: 2.5,
          bgcolor: "#121B28",
          border: "1px solid #1E293B",
          borderRadius: "8px",
          minHeight: "78px",
          display: "flex",
          alignItems: "center"
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 25%)" },
            gap: { xs: 2, lg: 0 },
            width: "100%",
            alignItems: "center"
          }}
        >

          {/* SECTION 2 — TOTAL PAYOUTS */}
          <Box
            sx={{
              borderLeft: { lg: "1px solid #1E293B" },
              pl: { lg: 2.5 },
              pr: { lg: 2 }
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: "#94A3B8",
                fontWeight: 700,
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.6px"
              }}
            >
              TOTAL PAYOUTS
            </Typography>
            {isSummaryLoading ? (
              <Skeleton variant="text" width={90} height={26} sx={{ bgcolor: "rgba(255,255,255,0.08)", my: 0.2 }} />
            ) : summaryError ? (
              <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", my: 0.2 }}>
                <Typography variant="caption" sx={{ color: "#F87171", fontSize: "10px" }}>
                  Unable to load summary.
                </Typography>
                <Button size="small" onClick={() => fetchSummary(fromDate, toDate)} sx={{ fontSize: "10px", p: 0, minWidth: "auto", color: "#3B82F6", textTransform: "none" }}>
                  Retry
                </Button>
              </Stack>
            ) : (
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  color: "#FFFFFF",
                  fontSize: "19px",
                  my: 0.1,
                  lineHeight: 1.1
                }}
              >
                ₹{Number(summary?.todays_transfer_amount ?? summary?.successful_amount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </Typography>
            )}
            <Typography variant="caption" sx={{ color: "#64748B", fontSize: "11px", fontWeight: 500 }}>
              {Number(summary?.todays_transactions ?? 0)} txns
            </Typography>
          </Box>

          {/* SECTION 3 — SUCCESSFUL */}
          <Box
            sx={{
              borderLeft: { lg: "1px solid #1E293B" },
              pl: { lg: 2.5 },
              pr: { lg: 2 }
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: "#4ADE80",
                fontWeight: 700,
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.6px"
              }}
            >
              SUCCESSFUL
            </Typography>
            {isSummaryLoading ? (
              <Skeleton variant="text" width={90} height={26} sx={{ bgcolor: "rgba(255,255,255,0.08)", my: 0.2 }} />
            ) : (
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  color: "#4ADE80",
                  fontSize: "19px",
                  my: 0.1,
                  lineHeight: 1.1
                }}
              >
                ₹{Number(summary?.successful_amount ?? summary?.todays_transfer_amount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </Typography>
            )}
            <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px", fontWeight: 500 }}>
              {Number(summary?.successful_transactions ?? 0)} success
            </Typography>
          </Box>

          {/* SECTION 4 — PENDING */}
          <Box
            sx={{
              borderLeft: { lg: "1px solid #1E293B" },
              pl: { lg: 2.5 },
              pr: { lg: 2 }
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: "#FBBF24",
                fontWeight: 700,
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.6px"
              }}
            >
              PENDING
            </Typography>
            {isSummaryLoading ? (
              <Skeleton variant="text" width={90} height={26} sx={{ bgcolor: "rgba(255,255,255,0.08)", my: 0.2 }} />
            ) : (
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  color: "#FBBF24",
                  fontSize: "19px",
                  my: 0.1,
                  lineHeight: 1.1
                }}
              >
                ₹{Number(summary?.pending_amount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </Typography>
            )}
            <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px", fontWeight: 500 }}>
              {Number(summary?.pending_transactions ?? 0)} proc.
            </Typography>
          </Box>

          {/* SECTION 5 — FAILED / REVERSED */}
          <Box
            sx={{
              borderLeft: { lg: "1px solid #1E293B" },
              pl: { lg: 2.5 }
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: "#F87171",
                fontWeight: 700,
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.6px"
              }}
            >
              FAILED / REVERSED
            </Typography>
            {isSummaryLoading ? (
              <Skeleton variant="text" width={90} height={26} sx={{ bgcolor: "rgba(255,255,255,0.08)", my: 0.2 }} />
            ) : (
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  color: "#F87171",
                  fontSize: "19px",
                  my: 0.1,
                  lineHeight: 1.1
                }}
              >
                ₹{Number(summary?.failed_amount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </Typography>
            )}
            <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px", fontWeight: 500 }}>
              {Number(summary?.failed_transactions ?? 0) + Number(summary?.reversed_transactions ?? 0)} txns
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* 3. SEARCH + DATE RANGE TOOLBAR */}
      <Paper
        elevation={0}
        sx={{
          mb: 2,
          p: 1,
          px: 1.5,
          bgcolor: "#121B28",
          border: "1px solid #1E293B",
          borderRadius: "8px",
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
        }}
      >
        {/* Search Input */}
        <TextField
          placeholder="Search by Transaction ID, UTR, Customer, Beneficiary, Mobile"
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          size="small"
          sx={{
            flexGrow: 1,
            width: { xs: "100%", md: "auto" },
            "& .MuiOutlinedInput-root": {
              bgcolor: "#090D16",
              borderRadius: "6px",
              fontSize: "13px",
              color: "#F8FAFC",
              height: "40px",
              "& fieldset": { borderColor: "#1E293B" },
              "&:hover fieldset": { borderColor: "#3B82F6" },
              "&.Mui-focused fieldset": { borderColor: "#3B82F6", borderWidth: "1.5px" },
            },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#64748B", fontSize: 18 }} />
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

        {/* Date Presets Segmented Control */}
        <Stack direction="row" spacing={0.5} sx={{ bgcolor: "#090D16", p: 0.5, borderRadius: "6px", border: "1px solid #1E293B", width: { xs: "100%", md: "auto" }, justifyContent: "center" }}>
          {[
            { key: "TODAY", label: "Today" },
            { key: "YESTERDAY", label: "Yesterday" },
            { key: "LAST_7_DAYS", label: "7 Days" },
            { key: "LAST_30_DAYS", label: "30 Days" },
            { key: "THIS_MONTH", label: "This Month" },
          ].map((preset) => (
            <Button
              key={preset.key}
              size="small"
              onClick={() => applyDatePreset(preset.key)}
              sx={{
                px: 1.5,
                py: 0.4,
                fontSize: "12px",
                fontWeight: activePreset === preset.key ? 700 : 500,
                color: activePreset === preset.key ? "#FFFFFF" : "#94A3B8",
                bgcolor: activePreset === preset.key ? "#2563EB" : "transparent",
                borderRadius: "5px",
                textTransform: "none",
                minWidth: "auto",
                "&:hover": {
                  bgcolor: activePreset === preset.key ? "#1D4ED8" : "rgba(255, 255, 255, 0.06)",
                  color: "#FFFFFF",
                },
              }}
            >
              {preset.label}
            </Button>
          ))}
        </Stack>
      </Paper>

      {/* 4. FILTER TOOLBAR */}
      <Paper
        elevation={0}
        sx={{
          p: 1,
          px: 1.5,
          bgcolor: "#121B28",
          border: "1px solid #1E293B",
          borderRadius: "8px",
          mb: 2,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
        }}
      >
        {/* Left Controls: Status & Mode Selectors + Advanced Filters Button */}
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          {/* Status Selector */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              displayEmpty
              sx={{
                height: "34px",
                fontSize: "12px",
                bgcolor: "#0F172A",
                color: "#F8FAFC",
                borderRadius: "6px",
                "& fieldset": { borderColor: "#1E293B" },
              }}
            >
              <MenuItem value="ALL" sx={{ fontSize: "13px" }}>All Statuses</MenuItem>
              <MenuItem value="SUCCESS" sx={{ fontSize: "13px" }}>Success</MenuItem>
              <MenuItem value="PENDING" sx={{ fontSize: "13px" }}>Pending</MenuItem>
              <MenuItem value="FAILED" sx={{ fontSize: "13px" }}>Failed</MenuItem>
              <MenuItem value="REVERSED" sx={{ fontSize: "13px" }}>Reversed</MenuItem>
            </Select>
          </FormControl>

          {/* Payment Mode Selector */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={paymentModeFilter}
              onChange={(e) => {
                setPaymentModeFilter(e.target.value);
                setPage(0);
              }}
              displayEmpty
              sx={{
                height: "34px",
                fontSize: "12px",
                bgcolor: "#0F172A",
                color: "#F8FAFC",
                borderRadius: "6px",
                "& fieldset": { borderColor: "#1E293B" },
              }}
            >
              <MenuItem value="ALL" sx={{ fontSize: "13px" }}>All Modes</MenuItem>
              <MenuItem value="IMPS" sx={{ fontSize: "13px" }}>IMPS</MenuItem>
              <MenuItem value="NEFT" sx={{ fontSize: "13px" }}>NEFT</MenuItem>
              <MenuItem value="RTGS" sx={{ fontSize: "13px" }}>RTGS</MenuItem>
              <MenuItem value="UPI" sx={{ fontSize: "13px" }}>UPI</MenuItem>
            </Select>
          </FormControl>

          {/* Advanced Filters Button */}
          <Badge badgeContent={activeFilterCount} color="primary">
            <Button
              variant="outlined"
              size="small"
              startIcon={<FilterListIcon sx={{ fontSize: 16 }} />}
              onClick={(e) => setFilterAnchorEl(e.currentTarget)}
              sx={{
                height: "34px",
                fontSize: "12px",
                fontWeight: 600,
                color: "#CBD5E1",
                borderColor: "#1E293B",
                borderRadius: "6px",
                textTransform: "none",
                "&:hover": { borderColor: "#3B82F6", bgcolor: "rgba(59, 130, 246, 0.08)" },
              }}
            >
              Filters
            </Button>
          </Badge>

          {activeFilterCount > 0 && (
            <Button
              size="small"
              onClick={handleResetFilters}
              sx={{ color: "#EF4444", fontSize: "12px", textTransform: "none" }}
            >
              Reset Filters
            </Button>
          )}
        </Stack>

        {/* Right Controls: Export Dropdown & Refresh */}
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Button
            variant="contained"
            size="small"
            endIcon={<ArrowDropDownIcon />}
            startIcon={<FileDownloadIcon sx={{ fontSize: 16 }} />}
            onClick={(e) => setExportAnchorEl(e.currentTarget)}
            sx={{
              height: "34px",
              fontSize: "12px",
              fontWeight: 700,
              bgcolor: "#2563EB",
              color: "#FFFFFF",
              borderRadius: "6px",
              textTransform: "none",
              boxShadow: "none",
              "&:hover": { bgcolor: "#1D4ED8", boxShadow: "none" },
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
                  color: "#F8FAFC",
                  border: "1px solid #1E293B",
                  borderRadius: "8px",
                  mt: 0.5,
                  minWidth: 140,
                },
              },
            }}
          >
            <MenuItem onClick={handleExportCSV} sx={{ fontSize: "13px", py: 1 }}>
              <TableChartIcon sx={{ fontSize: 16, mr: 1, color: "#60A5FA" }} /> CSV File
            </MenuItem>
            <MenuItem onClick={handleExportExcel} sx={{ fontSize: "13px", py: 1 }}>
              <InsertDriveFileIcon sx={{ fontSize: 16, mr: 1, color: "#4ADE80" }} /> Excel Spreadsheet
            </MenuItem>
            <MenuItem onClick={handleExportPDF} sx={{ fontSize: "13px", py: 1 }}>
              <PictureAsPdfIcon sx={{ fontSize: 16, mr: 1, color: "#F87171" }} /> PDF Document
            </MenuItem>
            <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.1)", my: 0.5 }} />
            <MenuItem onClick={handlePrintReport} sx={{ fontSize: "13px", py: 1 }}>
              <PrintIcon sx={{ fontSize: 16, mr: 1, color: "#94A3B8" }} /> Print Report
            </MenuItem>
          </Menu>

          <IconButton
            size="small"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            sx={{
              color: "#94A3B8",
              border: "1px solid #1E293B",
              borderRadius: "6px",
              p: 0.8,
              "&:hover": { color: "#FFFFFF", bgcolor: "rgba(255, 255, 255, 0.05)" },
            }}
          >
            <RefreshIcon sx={{ fontSize: 18, animation: isRefreshing ? "spin 1s linear infinite" : "none" }} />
          </IconButton>
        </Stack>
      </Paper>

      {/* 5. ADVANCED FILTERS MODAL / POPOVER */}
      <Popover
        open={Boolean(filterAnchorEl)}
        anchorEl={filterAnchorEl}
        onClose={() => setFilterAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              p: 2.5,
              width: 380,
              bgcolor: "#0F172A",
              color: "#F8FAFC",
              border: "1px solid #1E293B",
              borderRadius: "10px",
              boxShadow: "0 16px 36px rgba(0,0,0,0.6)",
              mt: 1,
            },
          },
        }}
      >
        <Stack spacing={2}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "14px", color: "#FFFFFF" }}>
              Filter Payout Transactions
            </Typography>
            <IconButton size="small" onClick={() => setFilterAnchorEl(null)} sx={{ color: "#64748B" }}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
          <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.1)" }} />

          {/* Date Range Inputs */}
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
            <Box>
              <Typography variant="caption" sx={{ color: "#94A3B8", mb: 0.5, display: "block" }}>
                From Date
              </Typography>
              <TextField
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                size="small"
                fullWidth
                sx={inputStyle}
              />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: "#94A3B8", mb: 0.5, display: "block" }}>
                To Date
              </Typography>
              <TextField
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                size="small"
                fullWidth
                sx={inputStyle}
              />
            </Box>
          </Box>

          <TextField
            label="Transaction ID"
            value={searchTxnId}
            onChange={(e) => setSearchTxnId(e.target.value)}
            size="small"
            fullWidth
            sx={inputStyle}
          />
          <TextField
            label="UTR / Reference ID"
            value={searchRefId}
            onChange={(e) => setSearchRefId(e.target.value)}
            size="small"
            fullWidth
            sx={inputStyle}
          />

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
            <TextField
              label="Customer Name"
              value={searchCustomer}
              onChange={(e) => setSearchCustomer(e.target.value)}
              size="small"
              fullWidth
              sx={inputStyle}
            />
            <TextField
              label="Beneficiary Name"
              value={searchBeneficiary}
              onChange={(e) => setSearchBeneficiary(e.target.value)}
              size="small"
              fullWidth
              sx={inputStyle}
            />
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
            <TextField
              label="Min Amount (₹)"
              type="number"
              value={minimumAmount}
              onChange={(e) => setMinimumAmount(e.target.value)}
              size="small"
              fullWidth
              sx={inputStyle}
            />
            <TextField
              label="Max Amount (₹)"
              type="number"
              value={maximumAmount}
              onChange={(e) => setMaximumAmount(e.target.value)}
              size="small"
              fullWidth
              sx={inputStyle}
            />
          </Box>

          <Stack direction="row" spacing={1.5} sx={{ justifyContent: "flex-end", pt: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleResetFilters}
              sx={{ color: "#94A3B8", borderColor: "#1E293B", textTransform: "none", fontSize: "12px" }}
            >
              Clear
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={() => {
                setPage(0);
                setFilterAnchorEl(null);
                fetchSummary(fromDate, toDate);
                fetchReportData();
              }}
              sx={{ bgcolor: "#2563EB", textTransform: "none", fontSize: "12px", fontWeight: 700 }}
            >
              Apply Filters
            </Button>
          </Stack>
        </Stack>
      </Popover>

      {/* 6. TRANSACTION TABLE & ERROR/LOADING/EMPTY STATES */}
      {error ? (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: "center",
            bgcolor: "rgba(239, 68, 68, 0.06)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "10px",
            my: 2,
          }}
        >
          <ErrorOutlinedIcon sx={{ fontSize: 44, color: "#F87171", mb: 1 }} />
          <Typography variant="h6" sx={{ color: "#F87171", fontWeight: 700, mb: 0.5, fontSize: "16px" }}>
            Unable to load payout data.
          </Typography>
          <Typography variant="body2" sx={{ color: "#94A3B8", mb: 2, fontSize: "13px" }}>
            Please check your connection and try again.
          </Typography>
          <Button
            variant="contained"
            size="small"
            onClick={handleRefresh}
            startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
            sx={{
              bgcolor: "#DC2626",
              color: "#FFFFFF",
              fontWeight: 700,
              textTransform: "none",
              fontSize: "13px",
              "&:hover": { bgcolor: "#B91C1C" },
            }}
          >
            Retry
          </Button>
        </Paper>
      ) : (
        <Paper
          elevation={0}
          sx={{
            width: "100%",
            bgcolor: "#121B28",
            border: "1px solid #1E293B",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          <TableContainer sx={{ maxHeight: "calc(100vh - 360px)", minHeight: "380px" }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow sx={{ "& th": { bgcolor: "#0F172A", color: "#94A3B8", fontWeight: 700, fontSize: "11px", borderBottom: "1px solid #1E293B", py: 1.2, textTransform: "uppercase", whiteSpace: "nowrap" } }}>
                  <TableCell align="center">S.No</TableCell>
                  <TableCell>Txn ID</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Beneficiary</TableCell>
                  <TableCell>A/C No</TableCell>
                  <TableCell align="right">Amt</TableCell>
                  <TableCell align="right">Fee</TableCell>
                  <TableCell align="right">Tax</TableCell>
                  <TableCell align="right">Debit</TableCell>
                  <TableCell align="center">Mode</TableCell>
                  <TableCell>UTR</TableCell>
                  <TableCell align="center">Wallet</TableCell>
                  <TableCell>Date/Time</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell colSpan={15} sx={{ py: 1.5 }}>
                        <Skeleton variant="rectangular" height={28} sx={{ bgcolor: "rgba(255,255,255,0.05)", borderRadius: "6px" }} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={15} align="center" sx={{ py: 6 }}>
                      <Box sx={{ maxWidth: 380, mx: "auto", textAlign: "center" }}>
                        <ErrorOutlinedIcon sx={{ fontSize: 48, color: "#EF4444", mb: 1 }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#F8FAFC", fontSize: "15px" }}>
                          Unable to load payout data. Please try again.
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#94A3B8", fontSize: "13px", mt: 0.5, mb: 2 }}>
                          Check your connection or credentials and retry loading.
                        </Typography>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={handleRefresh}
                          startIcon={<RefreshIcon />}
                          sx={{ bgcolor: "#2563EB", textTransform: "none", fontWeight: 700, px: 2.5, "&:hover": { bgcolor: "#1D4ED8" } }}
                        >
                          Retry
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={15} align="center" sx={{ py: 6 }}>
                      <Box sx={{ maxWidth: 360, mx: "auto", textAlign: "center" }}>
                        <ReceiptLongIcon sx={{ fontSize: 44, color: "#334155", mb: 1 }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#F8FAFC", fontSize: "15px" }}>
                          No payout transactions found for today.
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#64748B", fontSize: "13px", mt: 0.5 }}>
                          Transactions will appear here when payouts are processed.
                        </Typography>
                        {activeFilterCount > 0 && (
                          <Button size="small" onClick={handleResetFilters} sx={{ mt: 1.5, color: "#3B82F6", fontSize: "12px", textTransform: "none" }}>
                            Clear active filters
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((row, idx) => {
                    const sNo = row.s_no || (page * rowsPerPage + idx + 1);
                    const txnDisplay = row.txn_id || row.transaction_number || row.transaction_id || "--";
                    const customerDisplay = row.customer || row.customer_name || "Verified Customer";
                    const beneficiaryDisplay = row.beneficiary || row.beneficiary_name || "Beneficiary";
                    const accDisplay = row.account || row.ac_no || (row as any).account_number || row.masked_account_number || "--";
                    const amtVal = Number(row.amount ?? row.amt ?? row.transfer_amount ?? 0);
                    const feeVal = Number(row.charge ?? row.fee ?? row.convenience_fee ?? 0);
                    const taxVal = Number(row.gst ?? row.tax ?? (row as any).tax_amount ?? ((row.gst_amount || 0) + (row.tds_amount || 0)));
                    const debitVal = Number(row.debit ?? row.wallet_debit ?? (amtVal + feeVal + taxVal));
                    const modeDisplay = row.mode || row.payment_mode || "IMPS";
                    const utrDisplay = row.utr || row.utr_number || "--";
                    const walletDisplay = row.wallet || (row as any).wallet_type || "Main Wallet";
                    const dateTimeDisplay = row.date_time || row.initiated_at || "--";
                    const statusDisplay = (row.status || "SUCCESS").toUpperCase();

                    return (
                      <TableRow
                        key={`${row.transaction_id || row.txn_id || "payout"}-${sNo}`}
                        hover
                        sx={{
                          "&:hover": { bgcolor: "rgba(255, 255, 255, 0.03)" },
                          "& td": { borderBottom: "1px solid #1E293B", py: 1.2, fontSize: "12.5px", color: "#F8FAFC", whiteSpace: "nowrap" },
                        }}
                      >
                        {/* 1. S.No */}
                        <TableCell align="center" sx={{ color: "#64748B", fontWeight: 600 }}>
                          {sNo}
                        </TableCell>

                        {/* 2. Txn ID */}
                        <TableCell>
                          <Stack direction="row" spacing={0.5} sx={{ display: "inline-flex", alignItems: "center" }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "12.5px", color: "#F8FAFC", fontFamily: "monospace" }}>
                              {txnDisplay}
                            </Typography>
                            {txnDisplay !== "--" && (
                              <CopyButton value={txnDisplay} tooltipTitle="Copy Txn ID" iconFontSize={13} />
                            )}
                          </Stack>
                        </TableCell>

                        {/* 3. Customer */}
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "12.5px", color: "#F8FAFC" }}>
                            {customerDisplay}
                          </Typography>
                        </TableCell>

                        {/* 4. Beneficiary */}
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "12.5px", color: "#F8FAFC" }}>
                            {beneficiaryDisplay}
                          </Typography>
                        </TableCell>

                        {/* 5. A/C No */}
                        <TableCell>
                          <Stack direction="row" spacing={0.5} sx={{ display: "inline-flex", alignItems: "center" }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "12px", color: "#CBD5E1", fontFamily: "monospace" }}>
                              {accDisplay}
                            </Typography>
                            {accDisplay !== "--" && (
                              <CopyButton value={accDisplay} tooltipTitle="Copy A/C No" iconFontSize={13} />
                            )}
                          </Stack>
                        </TableCell>

                        {/* 6. Amt */}
                        <TableCell align="right" sx={{ fontWeight: 700, color: "#10B981", fontSize: "13px" }}>
                          ₹{amtVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </TableCell>

                        {/* 7. Fee */}
                        <TableCell align="right" sx={{ color: "#CBD5E1", fontSize: "12px" }}>
                          ₹{feeVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </TableCell>

                        {/* 8. Tax */}
                        <TableCell align="right" sx={{ color: "#CBD5E1", fontSize: "12px" }}>
                          ₹{taxVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </TableCell>

                        {/* 9. Debit */}
                        <TableCell align="right" sx={{ fontWeight: 700, color: "#F8FAFC", fontSize: "12.5px" }}>
                          ₹{debitVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </TableCell>

                        {/* 10. Mode */}
                        <TableCell align="center">
                          <Chip
                            label={modeDisplay}
                            size="small"
                            sx={{
                              bgcolor: "rgba(37, 99, 235, 0.15)",
                              color: "#60A5FA",
                              fontSize: "10px",
                              fontWeight: 800,
                              height: "20px",
                              borderRadius: "4px",
                            }}
                          />
                        </TableCell>

                        {/* 11. UTR */}
                        <TableCell>
                          <Stack direction="row" spacing={0.5} sx={{ display: "inline-flex", alignItems: "center" }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontFamily: "monospace",
                                fontSize: "12px",
                                color: utrDisplay && utrDisplay !== "--" ? "#4ADE80" : "#64748B",
                              }}
                            >
                              {utrDisplay}
                            </Typography>
                            {utrDisplay && utrDisplay !== "--" && (
                              <CopyButton value={utrDisplay} tooltipTitle="Copy UTR" iconFontSize={13} />
                            )}
                          </Stack>
                        </TableCell>

                        {/* 12. Wallet */}
                        <TableCell align="center">
                          <Chip
                            label={walletDisplay}
                            size="small"
                            sx={{
                              bgcolor: "rgba(255, 255, 255, 0.06)",
                              color: "#94A3B8",
                              fontSize: "9px",
                              fontWeight: 700,
                              height: "18px",
                            }}
                          />
                        </TableCell>

                        {/* 13. Date/Time */}
                        <TableCell sx={{ color: "#94A3B8", fontSize: "12px" }}>
                          {dateTimeDisplay}
                        </TableCell>

                        {/* 14. Status */}
                        <TableCell align="center">
                          {renderStatusBadge(statusDisplay)}
                        </TableCell>

                        {/* 15. Actions */}
                        <TableCell align="center">
                          <Stack direction="row" spacing={0.5} sx={{ justifyContent: "center", alignItems: "center" }}>
                            <Button
                              size="small"
                              onClick={() => handleViewDetails(row)}
                              endIcon={<ArrowForwardIcon sx={{ fontSize: 13 }} />}
                              sx={{
                                fontSize: "11px",
                                fontWeight: 700,
                                color: "#3B82F6",
                                textTransform: "none",
                                px: 1,
                                py: 0.2,
                                minWidth: "auto",
                                "&:hover": { bgcolor: "rgba(59, 130, 246, 0.1)" },
                              }}
                            >
                              Details
                            </Button>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                setActionMenuAnchorEl(e.currentTarget);
                                setActionRowItem(row);
                              }}
                              sx={{ color: "#64748B", p: 0.5 }}
                            >
                              <MoreVertIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* FOOTER TOTALS & PAGINATION */}
          {footerTotals && items.length > 0 && (
            <Box
              sx={{
                p: 1.5,
                px: 2.5,
                bgcolor: "#0F172A",
                borderTop: "1px solid #1E293B",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Stack direction="row" spacing={3} sx={{ alignItems: "center" }}>
                <Box>
                  <Typography variant="caption" sx={{ color: "#64748B", display: "block", fontSize: "11px" }}>
                    Total Transfer Amount
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "14px" }}>
                    ₹{Number(footerTotals.total_transfer_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: "#64748B", display: "block", fontSize: "11px" }}>
                    Total Wallet Debit
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#CBD5E1", fontSize: "14px" }}>
                    ₹{Number(footerTotals.total_wallet_debit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: "#64748B", display: "block", fontSize: "11px" }}>
                    Net Commission Earned
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#4ADE80", fontSize: "14px" }}>
                    ₹{Number(footerTotals.total_commission || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
              </Stack>

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
                rowsPerPageOptions={[10, 25, 50, 100]}
                sx={{
                  color: "#94A3B8",
                  fontSize: "12px",
                  ".MuiTablePagination-select": { color: "#F8FAFC" },
                  ".MuiTablePagination-selectIcon": { color: "#94A3B8" },
                }}
              />
            </Box>
          )}
        </Paper>
      )}

      {/* ROW ACTION MENU */}
      <Menu
        anchorEl={actionMenuAnchorEl}
        open={Boolean(actionMenuAnchorEl)}
        onClose={() => setActionMenuAnchorEl(null)}
        slotProps={{
          paper: {
            sx: {
              bgcolor: "#0F172A",
              color: "#F8FAFC",
              border: "1px solid #1E293B",
              borderRadius: "8px",
              minWidth: 160,
            },
          },
        }}
      >
        <MenuItem
          onClick={() => {
            if (actionRowItem) handleViewDetails(actionRowItem);
            setActionMenuAnchorEl(null);
          }}
          sx={{ fontSize: "13px", py: 1 }}
        >
          <VisibilityIcon sx={{ fontSize: 16, mr: 1, color: "#3B82F6" }} /> View Full Details
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (actionRowItem) handlePrintSingleReceipt(actionRowItem);
            setActionMenuAnchorEl(null);
          }}
          sx={{ fontSize: "13px", py: 1 }}
        >
          <PrintIcon sx={{ fontSize: 16, mr: 1, color: "#4ADE80" }} /> Print Receipt
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (actionRowItem) handleDownloadSinglePdf(actionRowItem);
            setActionMenuAnchorEl(null);
          }}
          sx={{ fontSize: "13px", py: 1 }}
        >
          <PictureAsPdfIcon sx={{ fontSize: 16, mr: 1, color: "#F59E0B" }} /> Download PDF
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (actionRowItem) {
              setShareTxn(actionRowItem);
              setShareModalOpen(true);
            }
            setActionMenuAnchorEl(null);
          }}
          sx={{ fontSize: "13px", py: 1 }}
        >
          <ShareIcon sx={{ fontSize: 16, mr: 1, color: "#A855F7" }} /> Share Receipt
        </MenuItem>
      </Menu>

      {/* TRANSACTION DETAILS SLIDE-OVER DRAWER (600 - 700px) */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{ zIndex: 1500 }}
        slotProps={{
          paper: {
            sx: {
              width: { xs: "100%", sm: 600, md: 680 },
              bgcolor: "#0F172A",
              color: "#F8FAFC",
              borderLeft: "1px solid #1E293B",
              boxShadow: "-8px 0 32px rgba(0,0,0,0.6)",
              p: 0,
              zIndex: 1500,
            },
          },
        }}
      >
        {selectedTxn && (
          <Box sx={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
            {/* Drawer Header */}
            <Box
              sx={{
                p: 2.5,
                bgcolor: "#121B28",
                borderBottom: "1px solid #1E293B",
                display: "flex",
                justify: "space-between",
                alignItems: "center",
                position: "sticky",
                top: 0,
                zIndex: 10,
              }}
            >
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "17px" }}>
                  Transaction Details
                </Typography>
                <Typography variant="caption" sx={{ color: "#64748B", fontFamily: "monospace", fontSize: "11px" }}>
                  ID: {selectedTxn.transaction_number || selectedTxn.reference_id}
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setDrawerOpen(false)} sx={{ color: "#94A3B8", "&:hover": { color: "#FFF", bgcolor: "rgba(255,255,255,0.1)" } }}>
                <CloseIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Box>

            {/* Scrollable Content */}
            <Box sx={{ p: 3, flexGrow: 1, overflowY: "auto", pb: 10 }}>
              {/* Hero Amount & Status */}
              <Paper sx={{ p: 3, bgcolor: "#121B28", border: "1px solid #1E293B", borderRadius: "12px", textAlign: "center", mb: 3 }}>
                <Typography variant="caption" sx={{ color: "#94A3B8", textTransform: "uppercase", fontSize: "11px", fontWeight: 700, letterSpacing: "0.5px" }}>
                  Transfer Amount
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 900, color: "#FFFFFF", my: 0.5, fontSize: "32px" }}>
                  ₹{Number(selectedTxn.transfer_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </Typography>
                <Box sx={{ mt: 1.5, display: "flex", justifyContent: "center" }}>
                  {renderStatusBadge(selectedTxn.status)}
                </Box>
              </Paper>

              {/* Section 1: Core Transaction Metadata */}
              <Typography variant="caption" sx={{ color: "#3B82F6", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "11px", mb: 1, display: "block" }}>
                Transaction Information
              </Typography>
              <Paper sx={{ p: 2, bgcolor: "#121B28", border: "1px solid #1E293B", borderRadius: "8px", mb: 2.5 }}>
                <Stack spacing={1.2}>
                  <DetailRow label="Transaction #" value={selectedTxn.transaction_number || selectedTxn.reference_id || ""} isMono copyValue={selectedTxn.transaction_number || selectedTxn.reference_id || ""} />
                  <DetailRow label="Reference ID" value={selectedTxn.reference_id || "-"} isMono copyValue={selectedTxn.reference_id} />
                  <DetailRow label="UTR Number" value={selectedTxn.utr_number || "--"} isMono highlight={Boolean(selectedTxn.utr_number)} copyValue={selectedTxn.utr_number} />
                  <DetailRow label="Payment Mode" value={selectedTxn.payment_mode || "IMPS"} />
                  <DetailRow label="Initiated At" value={selectedTxn.initiated_at ? selectedTxn.initiated_at.replace("T", " ") : "-"} />
                  <DetailRow label="Completed At" value={selectedTxn.completed_at ? selectedTxn.completed_at.replace("T", " ") : "--"} />
                </Stack>
              </Paper>

              {/* Section 2: Customer */}
              <Typography variant="caption" sx={{ color: "#3B82F6", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "11px", mb: 1, display: "block" }}>
                Customer Information
              </Typography>
              <Paper sx={{ p: 2, bgcolor: "#121B28", border: "1px solid #1E293B", borderRadius: "8px", mb: 2.5 }}>
                <Stack spacing={1.2}>
                  <DetailRow label="Customer Name" value={selectedTxn.customer_name || "N/A"} />
                  <DetailRow label="Mobile Number" value={selectedTxn.customer_mobile || "N/A"} isMono />
                </Stack>
              </Paper>

              {/* Section 3: Beneficiary */}
              <Typography variant="caption" sx={{ color: "#3B82F6", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "11px", mb: 1, display: "block" }}>
                Beneficiary Information
              </Typography>
              <Paper sx={{ p: 2, bgcolor: "#121B28", border: "1px solid #1E293B", borderRadius: "8px", mb: 2.5 }}>
                <Stack spacing={1.2}>
                  <DetailRow label="Beneficiary Name" value={selectedTxn.beneficiary_name || "N/A"} />
                  <DetailRow label="Bank Name" value={selectedTxn.bank_name || "N/A"} />
                  <DetailRow label="Account Number" value={selectedTxn.account_number || selectedTxn.masked_account_number || selectedTxn.ac_no || "--"} isMono copyValue={selectedTxn.account_number || selectedTxn.masked_account_number || selectedTxn.ac_no} />
                  <DetailRow label="IFSC Code" value={selectedTxn.ifsc_code || "N/A"} isMono />
                  <DetailRow label="Beneficiary Mobile" value={selectedTxn.beneficiary_mobile || "N/A"} />
                </Stack>
              </Paper>

              {/* Section 4: Transaction Status Timeline */}
              <Typography variant="caption" sx={{ color: "#3B82F6", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "11px", mb: 1, display: "block" }}>
                Transaction Status Timeline
              </Typography>
              <Paper sx={{ p: 2.5, bgcolor: "#121B28", border: "1px solid #1E293B", borderRadius: "8px", mb: 2.5 }}>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                    <CheckCircleIcon sx={{ color: "#4ADE80", fontSize: 20 }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: "#F8FAFC", fontSize: "13px" }}>
                        Transaction Initiated
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#64748B", fontSize: "11px" }}>
                        {selectedTxn.initiated_at ? selectedTxn.initiated_at.replace("T", " ") : "Initiated"}
                      </Typography>
                    </Box>
                  </Stack>

                  <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)" }} />

                  <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                    <AccessTimeIcon sx={{ color: "#60A5FA", fontSize: 20 }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: "#F8FAFC", fontSize: "13px" }}>
                        Partner Bank Switch Processing
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#64748B", fontSize: "11px" }}>
                        NPCI / Payment Highway Router
                      </Typography>
                    </Box>
                  </Stack>

                  <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)" }} />

                  <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                    {selectedTxn.status === "SUCCESS" ? (
                      <CheckCircleIcon sx={{ color: "#4ADE80", fontSize: 20 }} />
                    ) : ["PENDING", "PROCESSING"].includes(selectedTxn.status) ? (
                      <AccessTimeIcon sx={{ color: "#F59E0B", fontSize: 20 }} />
                    ) : ["REVERSED", "PARTIALLY_REVERSED"].includes(selectedTxn.status) ? (
                      <RotateLeftIcon sx={{ color: "#A855F7", fontSize: 20 }} />
                    ) : (
                      <CancelIcon sx={{ color: "#F87171", fontSize: 20 }} />
                    )}
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: "#F8FAFC", fontSize: "13px" }}>
                        Final Status: {selectedTxn.status}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px" }}>
                        {selectedTxn.remarks || selectedTxn.utr_number || "Transaction state recorded by bank gateway."}
                      </Typography>
                    </Box>
                  </Stack>
                </Stack>
              </Paper>

              {/* Section 5: Financial Breakdown */}
              <Typography variant="caption" sx={{ color: "#3B82F6", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "11px", mb: 1, display: "block" }}>
                Financial Breakdown
              </Typography>
              <Paper sx={{ p: 2, bgcolor: "#121B28", border: "1px solid #1E293B", borderRadius: "8px", mb: 2.5 }}>
                <Stack spacing={1.2}>
                  <DetailRow label="Transfer Amount" value={`₹${Number(selectedTxn.transfer_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`} />
                  <DetailRow label="Convenience Fee" value={`₹${Number(selectedTxn.convenience_fee || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`} />
                  <DetailRow label="GST Amount" value={`₹${Number(selectedTxn.gst_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`} />
                  <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.1)", my: 0.5 }} />
                  <DetailRow label="Total Wallet Debit" value={`₹${Number(selectedTxn.wallet_debit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`} highlight />
                  <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.1)", my: 0.5 }} />
                  <DetailRow label="Retailer Commission" value={`₹${Number(selectedTxn.retailer_commission || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`} />
                  <DetailRow label="TDS Deducted" value={`₹${Number(selectedTxn.tds_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`} />
                </Stack>
              </Paper>
            </Box>

            {/* STICKY BOTTOM ACTION BAR */}
            <Box
              sx={{
                p: 2,
                px: 3,
                borderTop: "1px solid #1E293B",
                bgcolor: "#121B28",
                position: "sticky",
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 10,
                display: "flex",
                gap: 1.5,
              }}
            >
              <Button
                variant="outlined"
                fullWidth
                startIcon={<PrintIcon />}
                onClick={() => handlePrintSingleReceipt(selectedTxn)}
                sx={{ borderColor: "#1E293B", color: "#CBD5E1", textTransform: "none", fontSize: "13px", height: "42px", fontWeight: 700 }}
              >
                Print
              </Button>
              <Button
                variant="contained"
                fullWidth
                disabled={isDownloadingSinglePdf}
                startIcon={isDownloadingSinglePdf ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdfIcon />}
                onClick={() => handleDownloadSinglePdf(selectedTxn)}
                sx={{ bgcolor: "#2563EB", textTransform: "none", fontSize: "13px", height: "42px", fontWeight: 800, "&:hover": { bgcolor: "#1D4ED8" } }}
              >
                {isDownloadingSinglePdf ? "Downloading..." : "Download PDF"}
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<ShareIcon />}
                onClick={() => {
                  setShareTxn(selectedTxn);
                  setShareModalOpen(true);
                }}
                sx={{ borderColor: "#3B82F6", color: "#60A5FA", textTransform: "none", fontSize: "13px", height: "42px", fontWeight: 700 }}
              >
                Share
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* ── DYNAMIC UNIVERSAL TRANSACTION DETAILS MODAL ─────────────────── */}
      <DynamicTransactionDetailsModal
        open={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedTxnNumber(null);
        }}
        txnId={selectedTxnNumber}
        initialData={selectedTxn}
        onToast={(msg) => {
          setSnackbarMsg(msg);
          setSnackbarOpen(true);
        }}
      />

      {/* SHARE TRANSACTION MODAL */}
      <Dialog
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        slotProps={{
          paper: {
            sx: {
              bgcolor: "#0F172A",
              color: "#F8FAFC",
              border: "1px solid #1E293B",
              borderRadius: "12px",
              maxWidth: 480,
              width: "100%",
            },
          },
        }}
      >
        <DialogTitle sx={{ p: 2.5, borderBottom: "1px solid #1E293B", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: "16px", color: "#FFF" }}>
              Share Transaction Receipt
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748B", fontFamily: "monospace", fontSize: "11px" }}>
              ID: {shareTxn?.transaction_number || shareTxn?.reference_id}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setShareModalOpen(false)} sx={{ color: "#64748B" }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Typography variant="body2" sx={{ color: "#94A3B8", fontSize: "13px", mb: 2 }}>
            Choose how you would like to share or export this official financial transaction receipt:
          </Typography>

          <Stack spacing={1.5}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<SendIcon sx={{ color: "#25D366" }} />}
              onClick={() => {
                if (shareTxn) handleShareWhatsApp(shareTxn);
                setShareModalOpen(false);
              }}
              sx={{ justifyContent: "flex-start", p: 1.5, borderColor: "rgba(37, 211, 102, 0.3)", color: "#F8FAFC", textTransform: "none", fontSize: "13px", fontWeight: 700, "&:hover": { bgcolor: "rgba(37, 211, 102, 0.1)" } }}
            >
              Share via WhatsApp
            </Button>

            <Button
              variant="outlined"
              fullWidth
              startIcon={<EmailIcon sx={{ color: "#60A5FA" }} />}
              onClick={() => {
                if (shareTxn) handleShareEmail(shareTxn);
                setShareModalOpen(false);
              }}
              sx={{ justifyContent: "flex-start", p: 1.5, borderColor: "rgba(96, 165, 250, 0.3)", color: "#F8FAFC", textTransform: "none", fontSize: "13px", fontWeight: 700, "&:hover": { bgcolor: "rgba(96, 165, 250, 0.1)" } }}
            >
              Share via Email
            </Button>

            <Button
              variant="outlined"
              fullWidth
              startIcon={<ImageIcon sx={{ color: "#A855F7" }} />}
              onClick={() => {
                if (shareTxn) generateReceiptImage(shareTxn);
                setShareModalOpen(false);
              }}
              sx={{ justifyContent: "flex-start", p: 1.5, borderColor: "rgba(168, 85, 247, 0.3)", color: "#F8FAFC", textTransform: "none", fontSize: "13px", fontWeight: 700, "&:hover": { bgcolor: "rgba(168, 85, 247, 0.1)" } }}
            >
              Download Receipt Image (PNG)
            </Button>

            <Button
              variant="outlined"
              fullWidth
              startIcon={<PictureAsPdfIcon sx={{ color: "#F59E0B" }} />}
              onClick={() => {
                if (shareTxn) handleDownloadSinglePdf(shareTxn);
                setShareModalOpen(false);
              }}
              sx={{ justifyContent: "flex-start", p: 1.5, borderColor: "rgba(245, 158, 11, 0.3)", color: "#F8FAFC", textTransform: "none", fontSize: "13px", fontWeight: 700, "&:hover": { bgcolor: "rgba(245, 158, 11, 0.1)" } }}
            >
              Download Receipt PDF
            </Button>

            <Button
              variant="outlined"
              fullWidth
              startIcon={<ContentCopyIcon sx={{ color: "#CBD5E1" }} />}
              onClick={() => {
                if (shareTxn) handleCopyDetails(shareTxn);
                setShareModalOpen(false);
              }}
              sx={{ justifyContent: "flex-start", p: 1.5, borderColor: "#1E293B", color: "#CBD5E1", textTransform: "none", fontSize: "13px", fontWeight: 700, "&:hover": { bgcolor: "rgba(255, 255, 255, 0.05)" } }}
            >
              Copy Receipt Details
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* TOAST SNACKBAR */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity="info" sx={{ bgcolor: "#1E293B", color: "#FFF", border: "1px solid #3B82F6" }}>
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

const DetailRow: React.FC<{ label: string; value: string; isMono?: boolean; highlight?: boolean; copyValue?: string }> = ({
  label,
  value,
  isMono = false,
  highlight = false,
  copyValue,
}) => (
  <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "center" }}>
    <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "12px" }}>
      {label}
    </Typography>
    <Stack direction="row" spacing={0.3} sx={{ display: "inline-flex", alignItems: "center" }}>
      <Typography
        variant="body2"
        sx={{
          fontSize: "12px",
          fontWeight: highlight ? 800 : 600,
          color: highlight ? "#4ADE80" : "#F8FAFC",
          fontFamily: isMono ? "monospace" : "inherit",
        }}
      >
        {value}
      </Typography>
      {copyValue && copyValue !== "--" && (
        <CopyButton value={copyValue} tooltipTitle={`Copy ${label}`} iconFontSize={13} />
      )}
    </Stack>
  </Stack>
);

const inputStyle = {
  "& .MuiOutlinedInput-root": {
    bgcolor: "#121B28",
    color: "#F8FAFC",
    fontSize: "13px",
    borderRadius: "6px",
    "& fieldset": { borderColor: "#1E293B" },
  },
  "& .MuiInputLabel-root": {
    color: "#94A3B8",
    fontSize: "13px",
  },
};
