"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  Divider,
  TablePagination,
  TableSortLabel,
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
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import StorefrontIcon from "@mui/icons-material/Storefront";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import AssessmentIcon from "@mui/icons-material/Assessment";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import BarChartIcon from "@mui/icons-material/BarChart";
import HubIcon from "@mui/icons-material/Hub";
import PersonIcon from "@mui/icons-material/Person";
import ShareIcon from "@mui/icons-material/Share";
import ErrorIcon from "@mui/icons-material/Error";
import PendingIcon from "@mui/icons-material/Pending";

import { useCompanyBranding } from "@/hooks/useCompanyBranding";
import { useRetailerStore } from "@/stores/use-retailer-store";
import { getPublicReceiptUrl } from "@/lib/receipt-security";

export const formatToIstYmd = (dateObj: Date = new Date()): string => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(dateObj);
};

export interface FilterOptionItem {
  value: string;
  label: string;
}

const DEFAULT_GATEWAY_OPTIONS: FilterOptionItem[] = [
  { value: "G-1", label: "Gateway G-1" },
  { value: "G-2", label: "Gateway G-2" },
];

const DEFAULT_METHOD_OPTIONS: FilterOptionItem[] = [
  { value: "UPI", label: "UPI" },
  { value: "QR", label: "QR" },
  { value: "VISA", label: "Visa" },
  { value: "MASTERCARD", label: "Mastercard" },
  { value: "RUPAY", label: "RuPay" },
  { value: "NETBANKING", label: "Net Banking" },
  { value: "CARD", label: "Debit / Credit Card" },
  { value: "WALLET", label: "Wallet" },
  { value: "POS", label: "POS" },
];

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
  s_no?: number;
  id: string;
  tid: string;
  transaction_id?: string;
  reference_id?: string;
  merchant_ref_id?: string;
  provider_ref_id?: string;
  retailer_id?: string;
  retailer_name?: string;
  company_id?: string;
  company_name?: string;
  company_code?: string;
  gateway: string;
  vendor_name?: string;
  payment_mode: string;
  payment_mode_name?: string;
  method?: string;
  card_network?: string;
  customer_name?: string;
  customer_mobile?: string;
  mobile_no?: string;
  amount: number;
  txn_amount?: number;
  charges?: number;
  mdr_amount?: number;
  gst: number;
  tax_amount?: number;
  total_charges?: number;
  total_amount: number;
  customer_payable?: number;
  wallet_credit?: number;
  retailer_credit: number;
  status: string;
  provider_status?: string;
  ledger_txn_id?: string;
  failure_reason?: string;
  date?: string;
  time?: string;
  date_time: string;
  receipt_token?: string;
  receipt_url?: string;
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

/**
 * Isolated Iframe Print Helper:
 * Completely prevents empty pages, modal portal clipping, and parent CSS interference.
 */
function printReceiptSlip(slipHtml: string) {
  if (typeof window === "undefined") return;
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(slipHtml);
  doc.close();

  iframe.onload = () => {
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error("Print error:", err);
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 1200);
      }
    }, 250);
  };
}

export const RetailerPayinReport: React.FC<PayinReportProps> = ({
  portalType = "retailer",
  title = "PayIn Transaction Report",
  subtitle = "Live collections, wallet credits & gateway routing master journal",
}) => {
  const isAdmin = portalType === "admin";
  const branding = useCompanyBranding();
  const brandPrimary =
    branding?.primary_colour ||
    (branding?.company_code === "NEAR4YOU"
      ? "#A20A3A"
      : branding?.company_code === "PAY2PAY"
      ? "#2563EB"
      : "#0F3B7D");
  const brandSecondary =
    branding?.secondary_colour ||
    (branding?.company_code === "NEAR4YOU"
      ? "#EDC11E"
      : branding?.company_code === "PAY2PAY"
      ? "#1E40AF"
      : "#D4AF37");
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
  const [gatewayOptions, setGatewayOptions] = useState<FilterOptionItem[]>(DEFAULT_GATEWAY_OPTIONS);
  const [methodOptions, setMethodOptions] = useState<FilterOptionItem[]>(DEFAULT_METHOD_OPTIONS);

  // Requirement 7: Explicit Loading Behaviour (No auto-fetch on initial page load)
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>("--");

  // Filter States
  const [globalSearch, setGlobalSearch] = useState<string>("");
  const [tidFilter, setTidFilter] = useState<string>("");
  const [mobileFilter, setMobileFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [gatewayFilter, setGatewayFilter] = useState<string>("ALL");
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>("ALL");
  const [activePreset, setActivePreset] = useState<string>("TODAY");
  const [fromDate, setFromDate] = useState<string>(() => formatToIstYmd());
  const [toDate, setToDate] = useState<string>(() => formatToIstYmd());

  // Custom Date Dialog & Inline Pickers
  const [customDateOpen, setCustomDateOpen] = useState<boolean>(false);
  const [customFrom, setCustomFrom] = useState<string>(() => formatToIstYmd());
  const [customTo, setCustomTo] = useState<string>(() => formatToIstYmd());
  const didMountSearchRef = useRef<boolean>(false);

  // Pagination & Layout Controls
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [density, setDensity] = useState<"compact" | "medium" | "comfortable">("medium");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Anchor Els for Top & Bottom Popovers
  const [densityAnchorEl, setDensityAnchorEl] = useState<null | HTMLElement>(null);
  const [columnsAnchorEl, setColumnsAnchorEl] = useState<null | HTMLElement>(null);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);

  // Bottom Toolbar Filter Anchors
  const [tidAnchorEl, setTidAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileAnchorEl, setMobileAnchorEl] = useState<null | HTMLElement>(null);
  const [gatewayAnchorEl, setGatewayAnchorEl] = useState<null | HTMLElement>(null);
  const [methodAnchorEl, setMethodAnchorEl] = useState<null | HTMLElement>(null);
  const [statusAnchorEl, setStatusAnchorEl] = useState<null | HTMLElement>(null);

  // Column Visibility
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());

  // Modal States
  const [breakdownModalOpen, setBreakdownModalOpen] = useState<boolean>(false);
  const [selectedTxn, setSelectedTxn] = useState<PayinReportItem | null>(null);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState<boolean>(false);

  // Toast Feedback (Matching the screenshot pill toast)
  const [toastOpen, setToastOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>("Receipt link copied successfully!");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setToastOpen(true);
    setTimeout(() => {
      setToastOpen(false);
    }, 4000);
  };

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast(`${label} copied successfully!`);
    }
  };

  const getAuthHeaders = (): Record<string, string> => {
    if (typeof window === "undefined") return {};
    const cookieToken =
      document.cookie
        .split("; ")
        .find(
          (r) =>
            r.startsWith("p2p_access_token=") ||
            r.startsWith("pay2pay_access_token=") ||
            r.startsWith("pay2pay_auth_token=") ||
            r.startsWith("access_token=")
        )
        ?.split("=")[1] || "";
    const token =
      localStorage.getItem("p2p_access_token") ||
      localStorage.getItem("pay2pay_access_token") ||
      localStorage.getItem("p2p_admin_token") ||
      localStorage.getItem("p2p_retailer_token") ||
      localStorage.getItem("access_token") ||
      cookieToken;
    return token && token.trim().length > 10
      ? { Authorization: `Bearer ${token.trim()}` }
      : {};
  };

  const executeReportFetch = useCallback(async (
    targetPage: number = page,
    targetLimit: number = rowsPerPage,
    filterOverrides?: {
      fromDate?: string;
      toDate?: string;
      tid?: string;
      mobile?: string;
      search?: string;
      status?: string;
      gateway?: string;
      paymentMode?: string;
    },
    targetSortBy: string = sortBy,
    targetSortDir: string = sortDir
  ) => {
    setIsLoading(true);
    setHasLoaded(true);

    try {
      const activeFrom = filterOverrides?.fromDate !== undefined ? filterOverrides.fromDate : fromDate;
      const activeTo = filterOverrides?.toDate !== undefined ? filterOverrides.toDate : toDate;
      const activeTid = filterOverrides?.tid !== undefined ? filterOverrides.tid : tidFilter;
      const activeMobile = filterOverrides?.mobile !== undefined ? filterOverrides.mobile : mobileFilter;
      const activeSearch = filterOverrides?.search !== undefined ? filterOverrides.search : globalSearch;
      const activeStatus = filterOverrides?.status !== undefined ? filterOverrides.status : statusFilter;
      const activeGateway = filterOverrides?.gateway !== undefined ? filterOverrides.gateway : gatewayFilter;
      const activeMode = filterOverrides?.paymentMode !== undefined ? filterOverrides.paymentMode : paymentModeFilter;

      const q = new URLSearchParams({
        page: (targetPage + 1).toString(),
        limit: targetLimit.toString(),
      });

      if (activeFrom) q.append("from_date", activeFrom);
      if (activeTo) q.append("to_date", activeTo);
      if (activeTid.trim()) q.append("tid", activeTid.trim());
      if (activeMobile.trim()) q.append("mobile", activeMobile.trim());
      if (activeSearch.trim()) q.append("search", activeSearch.trim());
      if (activeStatus !== "ALL") q.append("status", activeStatus);
      if (activeGateway !== "ALL") q.append("gateway", activeGateway);
      if (activeMode !== "ALL") q.append("payment_mode", activeMode);
      if (targetSortBy) q.append("sort_by", targetSortBy);
      if (targetSortDir) q.append("sort_dir", targetSortDir);

      // Fetch Grid: single request returning both grid rows and calculated summary metrics
      const gridUrl = `/api/v1/payin/reports/grid?${q.toString()}`;
      const res = await fetch(gridUrl, {
        headers: getAuthHeaders(),
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

        const dynOptions = data.filter_options || data.data?.filter_options;
        if (dynOptions?.gateways && Array.isArray(dynOptions.gateways) && dynOptions.gateways.length > 0) {
          setGatewayOptions(dynOptions.gateways);
        }
        if (dynOptions?.methods && Array.isArray(dynOptions.methods) && dynOptions.methods.length > 0) {
          setMethodOptions(dynOptions.methods);
        }

        const d = data.summary || data.data?.summary;
        if (d) {
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
  }, [page, rowsPerPage, fromDate, toDate, tidFilter, mobileFilter, globalSearch, statusFilter, gatewayFilter, paymentModeFilter, sortBy, sortDir]);

  // Initial load
  useEffect(() => {
    executeReportFetch(0, rowsPerPage);
  }, []);

  // Debounced live search once mounted
  useEffect(() => {
    if (!didMountSearchRef.current) {
      didMountSearchRef.current = true;
      return;
    }
    const timer = setTimeout(() => {
      setPage(0);
      executeReportFetch(0, rowsPerPage, { search: globalSearch });
    }, 350);
    return () => clearTimeout(timer);
  }, [globalSearch]);

  const handleSort = (field: string) => {
    const isAsc = sortBy === field && sortDir === "asc";
    const newDir: "asc" | "desc" = isAsc ? "desc" : "asc";
    setSortBy(field);
    setSortDir(newDir);
    executeReportFetch(page, rowsPerPage, undefined, field, newDir);
  };

  const handleApplyFilters = () => {
    setPage(0);
    executeReportFetch(0, rowsPerPage);
    showToast("Filters applied.");
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    executeReportFetch(page, rowsPerPage);
  };

  const handleResetFilters = () => {
    const today = formatToIstYmd();
    setGlobalSearch("");
    setTidFilter("");
    setMobileFilter("");
    setStatusFilter("ALL");
    setGatewayFilter("ALL");
    setPaymentModeFilter("ALL");
    setActivePreset("TODAY");
    setFromDate(today);
    setToDate(today);
    setCustomFrom(today);
    setCustomTo(today);
    setPage(0);
    executeReportFetch(0, rowsPerPage, {
      fromDate: today,
      toDate: today,
      tid: "",
      mobile: "",
      search: "",
      status: "ALL",
      gateway: "ALL",
      paymentMode: "ALL",
    });
    showToast("Filters reset to default.");
  };

  const handleDatePreset = (preset: string) => {
    setActivePreset(preset);
    const today = formatToIstYmd();
    let nextFrom = "";
    let nextTo = "";

    if (preset === "ALL" || preset === "all") {
      nextFrom = "";
      nextTo = "";
    } else if (preset === "TODAY" || preset === "today") {
      nextFrom = today;
      nextTo = today;
    } else if (preset === "YESTERDAY" || preset === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = formatToIstYmd(y);
      nextFrom = yStr;
      nextTo = yStr;
    } else if (preset === "THIS_MONTH" || preset === "this_month") {
      nextFrom = `${today.slice(0, 7)}-01`;
      nextTo = today;
    } else if (preset === "SEPTEMBER" || preset === "september" || preset === "SEP_2026") {
      nextFrom = "2026-09-01";
      nextTo = "2026-09-30";
    } else if (preset === "7D" || preset === "7_DAYS") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      nextFrom = formatToIstYmd(d);
      nextTo = today;
    } else if (preset === "30D" || preset === "30_DAYS") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      nextFrom = formatToIstYmd(d);
      nextTo = today;
    } else if (preset === "60D") {
      const d = new Date();
      d.setDate(d.getDate() - 60);
      nextFrom = formatToIstYmd(d);
      nextTo = today;
    } else if (preset === "90D") {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      nextFrom = formatToIstYmd(d);
      nextTo = today;
    }

    setFromDate(nextFrom);
    setToDate(nextTo);
    setCustomFrom(nextFrom);
    setCustomTo(nextTo);
    setPage(0);
    executeReportFetch(0, rowsPerPage, { fromDate: nextFrom, toDate: nextTo });
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
    executeReportFetch(0, rowsPerPage, { fromDate: f, toDate: t });
    showToast("Custom date range applied");
  };

  const exportItemsToCsv = (itemsToExport: PayinReportItem[]) => {
    if (!itemsToExport || itemsToExport.length === 0) {
      showToast("No records available to export.");
      return;
    }
    const headers = [
      "TID",
      ...(isAdmin ? ["ReferenceID", "Retailer"] : []),
      "Amount (₹)",
      "Charges (₹)",
      "GST (₹)",
      "Total Amount (₹)",
      "Wallet Credit (₹)",
      "MobileNo",
      "Gateway",
      ...(isAdmin ? ["Vendor"] : []),
      "Method",
      "Status",
      "Date & Time",
    ];

    const rows = itemsToExport.map((item) => {
      const rowArr: (string | number)[] = [item.tid || "--"];
      if (isAdmin) {
        rowArr.push(item.reference_id || item.merchant_ref_id || item.provider_ref_id || "--");
        const retName = item.retailer_name || "";
        const retId = item.retailer_id || "";
        const retDisplay = retName && retId && !retName.includes(retId) ? `${retName} (${retId})` : (retName || retId || "--");
        rowArr.push(retDisplay);
      }
      rowArr.push(
        Number(item.amount || 0).toFixed(2),
        Number(item.charges || 0).toFixed(2),
        Number(item.gst || 0).toFixed(2),
        Number(item.total_amount || 0).toFixed(2),
        Number(item.wallet_credit || 0).toFixed(2),
        item.customer_mobile || "--",
        item.gateway || "G-1",
      );
      if (isAdmin) {
        rowArr.push(item.vendor_name || item.gateway || "G-1");
      }
      rowArr.push(
        item.method || item.payment_mode || "--",
        (item.status || "SUCCESS").toUpperCase(),
        item.date_time || "--",
      );
      return rowArr;
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `PayIn_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast("PayIn CSV exported successfully.");
  };

  const handleExportCsv = async () => {
    try {
      showToast("Preparing PayIn CSV export...");
      const q = new URLSearchParams();
      if (portalType) q.append("portal", portalType);
      if (fromDate) q.append("from_date", fromDate);
      if (toDate) q.append("to_date", toDate);
      if (tidFilter.trim()) q.append("tid", tidFilter.trim());
      if (mobileFilter.trim()) q.append("mobile", mobileFilter.trim());
      if (globalSearch.trim()) q.append("search", globalSearch.trim());
      if (statusFilter !== "ALL") q.append("status", statusFilter);
      if (gatewayFilter !== "ALL") q.append("gateway", gatewayFilter);
      if (paymentModeFilter !== "ALL") q.append("payment_mode", paymentModeFilter);

      const res = await fetch(`/api/v1/payin/reports/export?${q.toString()}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (!res.ok) {
        exportItemsToCsv(items);
        setExportAnchorEl(null);
        return;
      }

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
      console.warn("Backend export failed, falling back to filtered items:", err);
      exportItemsToCsv(items);
      setExportAnchorEl(null);
    }
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
      document.documentElement.requestFullscreen().catch(() => { });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => { });
      setIsFullscreen(false);
    }
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

  const openDetailsBreakdown = async (item: PayinReportItem) => {
    setSelectedTxn(item);
    setBreakdownModalOpen(true);
    try {
      const res = await fetch(`/api/v1/payin/reports/${encodeURIComponent(item.tid)}/details`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        const detail = json.data || json;
        if (detail && detail.tid) {
          setSelectedTxn((prev) => prev ? { ...prev, ...detail } : detail);
        }
      }
    } catch {
      // Non-fatal fallback
    }
  };

  const openReceiptModal = (item: PayinReportItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedTxn(item);
    setReceiptDialogOpen(true);
  };

  const handleShareReceipt = async (item: PayinReportItem) => {
    const shareUrl =
      item.receipt_url ||
      item.receiptUrl ||
      getPublicReceiptUrl(item.receipt_token || item.tid, undefined, item.company_code);

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Payment Receipt - ${item.tid}`,
          text: `Payment Receipt for TID ${item.tid} - Amount: ₹${item.amount || item.txn_amount || 0}`,
          url: shareUrl,
        });
        showToast("Receipt link shared successfully!");
        return;
      } catch (err: any) {
        if (err.name !== "AbortError") {
          // Fall through to clipboard copy
        } else {
          return;
        }
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      showToast("Receipt link copied successfully!");
    }
  };

  const handlePrintVerifiedReceipt = (item: PayinReportItem) => {
    const slipHtml = generateReceiptPrintHtml(item, branding);
    printReceiptSlip(slipHtml);
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
    <Box sx={{ width: "100%", maxWidth: "100%", overflowX: "hidden", p: { xs: 1.5, sm: 2.5, md: 3 }, position: "relative" }}>
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
            {summary?.successful_transactions ?? 0} Completed Successfully ({summary?.total_transactions ?? 0} Total)
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
            {summary?.successful_transactions ?? 0} Completed Successfully · {summary?.failed_transactions ?? 0} Failed · {summary?.pending_transactions ?? 0} Pending
          </Typography>
        </Paper>
      </Box>

      {/* ── 3. DATE RANGE FILTER BAR (MATCHING TRANSACTION REPORT) ── */}
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          px: { xs: 1.5, sm: 2 },
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
          {/* Presets */}
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
              const isSelected = activePreset === preset.key || (preset.key === "7_DAYS" && activePreset === "7D") || (preset.key === "30_DAYS" && activePreset === "30D");
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
            {hasLoaded ? totalRecords : 0} {(hasLoaded ? totalRecords : 0) === 1 ? "transaction" : "transactions"} found
          </Typography>
        </Stack>
      </Paper>

      {/* ── 3B. FILTER PILL TOOLBAR (TID, MOBILE, GATEWAY, METHOD, STATUS, APPLY, RESET) ── */}
      <Box
        sx={{
          mb: 2,
          p: 1.5,
          borderRadius: "14px",
          bgcolor: "#FFFFFF",
          border: "1px solid #E5E7EB",
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1.5,
        }}
      >
        {/* Left Filter Buttons Group */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ flexWrap: "wrap", gap: 0.8 }}>
          {/* 1. Transaction ID ⌄ */}
          <Button
            size="small"
            variant="outlined"
            onClick={(e) => setTidAnchorEl(e.currentTarget)}
            endIcon={<ArrowDropDownIcon sx={{ fontSize: 16 }} />}
            sx={{
              borderRadius: "20px",
              height: 36,
              px: 1.8,
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "none",
              color: tidFilter ? brandPrimary : "#374151",
              borderColor: tidFilter ? brandPrimary : "#D1D5DB",
              bgcolor: tidFilter ? `${brandPrimary}10` : "#FFFFFF",
            }}
          >
            {tidFilter ? `TID: ${tidFilter.slice(0, 12)}${tidFilter.length > 12 ? "..." : ""}` : "Transaction ID"}
          </Button>

          {/* 2. Mobile Number ⌄ */}
          <Button
            size="small"
            variant="outlined"
            onClick={(e) => setMobileAnchorEl(e.currentTarget)}
            endIcon={<ArrowDropDownIcon sx={{ fontSize: 16 }} />}
            sx={{
              borderRadius: "20px",
              height: 36,
              px: 1.8,
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "none",
              color: mobileFilter ? brandPrimary : "#374151",
              borderColor: mobileFilter ? brandPrimary : "#D1D5DB",
              bgcolor: mobileFilter ? `${brandPrimary}10` : "#FFFFFF",
            }}
          >
            {mobileFilter ? `Mobile: ${mobileFilter}` : "Mobile Number"}
          </Button>

          {/* 3. Gateway ⌄ */}
          <Button
            size="small"
            variant="outlined"
            onClick={(e) => setGatewayAnchorEl(e.currentTarget)}
            endIcon={<ArrowDropDownIcon sx={{ fontSize: 16 }} />}
            sx={{
              borderRadius: "20px",
              height: 36,
              px: 1.8,
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "none",
              color: gatewayFilter !== "ALL" ? brandPrimary : "#374151",
              borderColor: gatewayFilter !== "ALL" ? brandPrimary : "#D1D5DB",
              bgcolor: gatewayFilter !== "ALL" ? `${brandPrimary}10` : "#FFFFFF",
            }}
          >
            {gatewayFilter !== "ALL" ? `Gateway: ${gatewayFilter}` : "Gateway"}
          </Button>

          {/* 4. Method ⌄ */}
          <Button
            size="small"
            variant="outlined"
            onClick={(e) => setMethodAnchorEl(e.currentTarget)}
            endIcon={<ArrowDropDownIcon sx={{ fontSize: 16 }} />}
            sx={{
              borderRadius: "20px",
              height: 36,
              px: 1.8,
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "none",
              color: paymentModeFilter !== "ALL" ? brandPrimary : "#374151",
              borderColor: paymentModeFilter !== "ALL" ? brandPrimary : "#D1D5DB",
              bgcolor: paymentModeFilter !== "ALL" ? `${brandPrimary}10` : "#FFFFFF",
            }}
          >
            {paymentModeFilter !== "ALL" ? `Method: ${methodOptions.find((m) => m.value === paymentModeFilter)?.label || paymentModeFilter}` : "Method"}
          </Button>

          {/* 5. Status ⌄ */}
          <Button
            size="small"
            variant="outlined"
            onClick={(e) => setStatusAnchorEl(e.currentTarget)}
            endIcon={<ArrowDropDownIcon sx={{ fontSize: 16 }} />}
            sx={{
              borderRadius: "20px",
              height: 36,
              px: 1.8,
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "none",
              color: statusFilter !== "ALL" ? brandPrimary : "#374151",
              borderColor: statusFilter !== "ALL" ? brandPrimary : "#D1D5DB",
              bgcolor: statusFilter !== "ALL" ? `${brandPrimary}10` : "#FFFFFF",
            }}
          >
            {statusFilter !== "ALL" ? `Status: ${statusFilter}` : "Status"}
          </Button>

          {/* 6. Reset */}
          <Button
            size="small"
            variant="outlined"
            onClick={handleResetFilters}
            sx={{
              borderRadius: "20px",
              height: 36,
              px: 2,
              fontSize: "12.5px",
              fontWeight: 700,
              textTransform: "none",
              color: "#4B5563",
              borderColor: "#D1D5DB",
            }}
          >
            Reset
          </Button>
        </Stack>

        {/* Right Toast Pill Notification (Matching screenshot) */}
        {toastOpen && (
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 1,
              bgcolor: "#ECFDF5",
              border: "1px solid #10B981",
              color: "#065F46",
              borderRadius: "20px",
              px: 2,
              py: 0.7,
              boxShadow: "0 2px 8px rgba(16, 185, 129, 0.15)",
              animation: "fadeIn 0.2s ease-in-out",
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 18, color: "#10B981" }} />
            <Typography sx={{ fontSize: "12.5px", fontWeight: 700 }}>
              {toastMessage}
            </Typography>
            <IconButton size="small" onClick={() => setToastOpen(false)} sx={{ p: 0.2, ml: 0.5, color: "#065F46" }}>
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        )}
      </Box>

      {/* ── 4. MASTER ACTIONS TOOLBAR (SEARCH, DENSITY, EXPORT, REFRESH) ── */}
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
            onChange={(e) => {
              setGlobalSearch(e.target.value);
              setPage(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleApplyFilters();
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: brandPrimary, fontSize: 18 }} />
                </InputAdornment>
              ),
              endAdornment: globalSearch ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setGlobalSearch("");
                      setPage(0);
                      executeReportFetch(0, rowsPerPage, { search: "" });
                    }}
                  >
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

        {/* Action Controls */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ flexWrap: "wrap", justifyContent: { xs: "flex-start", lg: "flex-end" } }}>
          {/* Apply Button */}
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
          <Tooltip title="Refresh Data">
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
          { id: "tid", label: "TID" },
          ...(isAdmin ? [
            { id: "reference_id", label: "ReferenceID" },
            { id: "retailer", label: "Retailer" },
          ] : []),
          { id: "amount", label: "Amount (₹)" },
          { id: "charges", label: "Charges (₹)" },
          { id: "gst", label: "GST (₹)" },
          { id: "total_amount", label: "Total Amount (₹)" },
          { id: "wallet_credit", label: "Wallet Credit (₹)" },
          { id: "customer_mobile", label: "MobileNo" },
          { id: "gateway", label: "Gateway" },
          ...(isAdmin ? [
            { id: "vendor", label: "Vendor" },
          ] : []),
          { id: "method", label: "Method" },
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
        <MenuItem onClick={() => { if (items.length > 0) handlePrintVerifiedReceipt(items[0]); setExportAnchorEl(null); }} sx={{ fontSize: "12.5px", gap: 1.5, py: 1 }}>
          <PrintIcon sx={{ fontSize: 17, color: "#2563EB" }} />
          Print / Save as PDF
        </MenuItem>
      </Menu>

      {/* ── 4. ENTERPRISE DATA TABLE (EXACT 12 COLUMNS) ── */}
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
                  {/* 1. TID */}
                  {!hiddenColumns.has("tid") && (
                    <TableCell
                      onClick={() => handleSort("tid")}
                      sx={{ color: "#059669", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", py: 1.4, pl: 2, whiteSpace: "nowrap", cursor: "pointer" }}
                    >
                      <TableSortLabel
                        active={sortBy === "tid"}
                        direction={sortBy === "tid" ? sortDir : "desc"}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort("tid");
                        }}
                        sx={{
                          "&.MuiTableSortLabel-root": { color: "#059669", fontWeight: 800 },
                          "&.MuiTableSortLabel-root:hover": { color: "#047857" },
                          "&.Mui-active": { color: "#059669" },
                          "& .MuiTableSortLabel-icon": { color: "#059669 !important" },
                        }}
                      >
                        TID
                      </TableSortLabel>
                    </TableCell>
                  )}
                  {/* ReferenceID (Admin Only) */}
                  {isAdmin && !hiddenColumns.has("reference_id") && (
                    <TableCell
                      sx={{ color: "#059669", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", py: 1.4, whiteSpace: "nowrap" }}
                    >
                      REFERENCEID
                    </TableCell>
                  )}
                  {/* Retailer (Admin Only) */}
                  {isAdmin && !hiddenColumns.has("retailer") && (
                    <TableCell
                      sx={{ color: "#059669", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", py: 1.4, whiteSpace: "nowrap" }}
                    >
                      RETAILER
                    </TableCell>
                  )}
                  {/* 2. Amount (₹) */}
                  {!hiddenColumns.has("amount") && (
                    <TableCell
                      onClick={() => handleSort("txn_amount")}
                      sx={{ color: "#059669", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", py: 1.4, textAlign: "right", whiteSpace: "nowrap", cursor: "pointer" }}
                    >
                      <TableSortLabel
                        active={sortBy === "txn_amount"}
                        direction={sortBy === "txn_amount" ? sortDir : "desc"}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort("txn_amount");
                        }}
                        sx={{
                          "&.MuiTableSortLabel-root": { color: "#059669", fontWeight: 800 },
                          "&.MuiTableSortLabel-root:hover": { color: "#047857" },
                          "&.Mui-active": { color: "#059669" },
                          "& .MuiTableSortLabel-icon": { color: "#059669 !important" },
                        }}
                      >
                        AMOUNT (₹)
                      </TableSortLabel>
                    </TableCell>
                  )}
                  {/* 3. Charges (₹) */}
                  {!hiddenColumns.has("charges") && (
                    <TableCell sx={{ color: "#059669", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", py: 1.4, textAlign: "right", whiteSpace: "nowrap" }}>
                      CHARGES (₹)
                    </TableCell>
                  )}
                  {/* 4. GST (₹) */}
                  {!hiddenColumns.has("gst") && (
                    <TableCell sx={{ color: "#059669", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", py: 1.4, textAlign: "right", whiteSpace: "nowrap" }}>
                      GST (₹)
                    </TableCell>
                  )}
                  {/* 5. Total Amount (₹) */}
                  {!hiddenColumns.has("total_amount") && (
                    <TableCell
                      onClick={() => handleSort("customer_payable")}
                      sx={{ color: "#059669", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", py: 1.4, textAlign: "right", whiteSpace: "nowrap", cursor: "pointer" }}
                    >
                      <TableSortLabel
                        active={sortBy === "customer_payable"}
                        direction={sortBy === "customer_payable" ? sortDir : "desc"}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort("customer_payable");
                        }}
                        sx={{
                          "&.MuiTableSortLabel-root": { color: "#059669", fontWeight: 800 },
                          "&.MuiTableSortLabel-root:hover": { color: "#047857" },
                          "&.Mui-active": { color: "#059669" },
                          "& .MuiTableSortLabel-icon": { color: "#059669 !important" },
                        }}
                      >
                        TOTAL AMOUNT (₹)
                      </TableSortLabel>
                    </TableCell>
                  )}
                  {/* 6. Wallet Credit (₹) */}
                  {!hiddenColumns.has("wallet_credit") && (
                    <TableCell
                      onClick={() => handleSort("retailer_credit")}
                      sx={{ color: "#059669", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", py: 1.4, textAlign: "right", whiteSpace: "nowrap", cursor: "pointer" }}
                    >
                      <TableSortLabel
                        active={sortBy === "retailer_credit"}
                        direction={sortBy === "retailer_credit" ? sortDir : "desc"}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort("retailer_credit");
                        }}
                        sx={{
                          "&.MuiTableSortLabel-root": { color: "#059669", fontWeight: 800 },
                          "&.MuiTableSortLabel-root:hover": { color: "#047857" },
                          "&.Mui-active": { color: "#059669" },
                          "& .MuiTableSortLabel-icon": { color: "#059669 !important" },
                        }}
                      >
                        WALLET CREDIT (₹)
                      </TableSortLabel>
                    </TableCell>
                  )}
                  {/* 7. MobileNo */}
                  {!hiddenColumns.has("customer_mobile") && (
                    <TableCell sx={{ color: "#059669", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", py: 1.4, whiteSpace: "nowrap" }}>
                      MOBILENO
                    </TableCell>
                  )}
                  {/* 8. Gateway */}
                  {!hiddenColumns.has("gateway") && (
                    <TableCell sx={{ color: "#059669", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", py: 1.4, whiteSpace: "nowrap" }}>
                      GATEWAY
                    </TableCell>
                  )}
                  {/* Vendor (Admin Only) */}
                  {isAdmin && !hiddenColumns.has("vendor") && (
                    <TableCell sx={{ color: "#059669", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", py: 1.4, whiteSpace: "nowrap" }}>
                      VENDOR
                    </TableCell>
                  )}
                  {/* 9. Method */}
                  {!hiddenColumns.has("method") && (
                    <TableCell sx={{ color: "#059669", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", py: 1.4, whiteSpace: "nowrap" }}>
                      METHOD
                    </TableCell>
                  )}
                  {/* 10. Status */}
                  {!hiddenColumns.has("status") && (
                    <TableCell
                      onClick={() => handleSort("txn_status")}
                      sx={{ color: "#059669", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", py: 1.4, whiteSpace: "nowrap", cursor: "pointer" }}
                    >
                      <TableSortLabel
                        active={sortBy === "txn_status"}
                        direction={sortBy === "txn_status" ? sortDir : "desc"}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort("txn_status");
                        }}
                        sx={{
                          "&.MuiTableSortLabel-root": { color: "#059669", fontWeight: 800 },
                          "&.MuiTableSortLabel-root:hover": { color: "#047857" },
                          "&.Mui-active": { color: "#059669" },
                          "& .MuiTableSortLabel-icon": { color: "#059669 !important" },
                        }}
                      >
                        STATUS
                      </TableSortLabel>
                    </TableCell>
                  )}
                  {/* 11. Date & Time */}
                  {!hiddenColumns.has("date_time") && (
                    <TableCell
                      onClick={() => handleSort("created_at")}
                      sx={{ color: "#059669", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", py: 1.4, whiteSpace: "nowrap", cursor: "pointer" }}
                    >
                      <TableSortLabel
                        active={sortBy === "created_at"}
                        direction={sortBy === "created_at" ? sortDir : "desc"}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort("created_at");
                        }}
                        sx={{
                          "&.MuiTableSortLabel-root": { color: "#059669", fontWeight: 800 },
                          "&.MuiTableSortLabel-root:hover": { color: "#047857" },
                          "&.Mui-active": { color: "#059669" },
                          "& .MuiTableSortLabel-icon": { color: "#059669 !important" },
                        }}
                      >
                        DATE &amp; TIME
                      </TableSortLabel>
                    </TableCell>
                  )}
                  {/* 12. Action */}
                  <TableCell sx={{ color: "#059669", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", py: 1.4, pr: 2, textAlign: "center", whiteSpace: "nowrap" }}>
                    ACTION
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  [1, 2, 3, 4, 5].map((n) => (
                    <TableRow key={n}>
                      <TableCell colSpan={isAdmin ? 15 : 12} sx={{ py: 2.5 }}>
                        <Skeleton variant="text" height={26} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : !hasLoaded ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 15 : 12} align="center" sx={{ py: 8 }}>
                      <AssessmentIcon sx={{ fontSize: 48, color: "#9CA3AF", mb: 1.5 }} />
                      <Typography sx={{ fontWeight: 800, fontSize: "16px", color: "#111827" }}>
                        Ready to Generate PayIn Report
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#6B7280", mt: 0.5, mb: 2 }}>
                        Select your desired date range and filters, then click <strong>Apply</strong> to load transactions.
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
                    <TableCell colSpan={isAdmin ? 15 : 12} align="center" sx={{ py: 8 }}>
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
                    const stBadge = getStatusBadge(row.status);
                    const dt = formatDateTime(row.date_time || row.created_at);

                    return (
                      <TableRow
                        key={row.id || row.tid || idx}
                        hover
                        onClick={() => openDetailsBreakdown(row)}
                        sx={{
                          cursor: "pointer",
                          height: density === "compact" ? 40 : density === "comfortable" ? 58 : 48,
                          "&:hover": { bgcolor: "rgba(5, 150, 105, 0.04)" },
                        }}
                      >
                        {/* 1. TID */}
                        {!hiddenColumns.has("tid") && (
                          <TableCell sx={{ fontSize: "12px", fontWeight: 700, fontFamily: "monospace", color: "#111827", pl: 2, whiteSpace: "nowrap" }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                              <span>{row.tid}</span>
                              <Tooltip title="Copy TID">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(row.tid, "TID");
                                  }}
                                  sx={{ p: 0.3, opacity: 0.6, "&:hover": { opacity: 1 } }}
                                >
                                  <ContentCopyIcon sx={{ fontSize: 13 }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        )}

                        {/* ReferenceID (Admin Only) */}
                        {isAdmin && !hiddenColumns.has("reference_id") && (
                          <TableCell sx={{ fontSize: "12px", fontFamily: "monospace", color: "#111827", whiteSpace: "nowrap" }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                              <span>{row.reference_id || row.merchant_ref_id || row.provider_ref_id || "--"}</span>
                              {Boolean(row.reference_id || row.merchant_ref_id) && (
                                <Tooltip title="Copy ReferenceID">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyToClipboard(row.reference_id || row.merchant_ref_id || "", "ReferenceID");
                                    }}
                                    sx={{ p: 0.3, opacity: 0.6, "&:hover": { opacity: 1 } }}
                                  >
                                    <ContentCopyIcon sx={{ fontSize: 13 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                        )}

                        {/* Retailer (Admin Only) */}
                        {isAdmin && !hiddenColumns.has("retailer") && (
                          <TableCell sx={{ fontSize: "12px", whiteSpace: "nowrap" }}>
                            <Typography sx={{ fontSize: "12px", color: "#111827", fontWeight: 600 }}>
                              {row.retailer_name || "--"}
                            </Typography>
                            {row.retailer_id && (
                              <Typography sx={{ fontSize: "10.5px", color: "#6B7280", fontFamily: "monospace" }}>
                                {row.retailer_id}
                              </Typography>
                            )}
                          </TableCell>
                        )}

                        {/* 2. Amount (₹) */}
                        {!hiddenColumns.has("amount") && (
                          <TableCell sx={{ fontSize: "12px", fontWeight: 700, textAlign: "right", color: "#111827", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                            ₹{Number(row.amount || row.txn_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </TableCell>
                        )}

                        {/* 3. Charges (₹) */}
                        {!hiddenColumns.has("charges") && (
                          <TableCell sx={{ fontSize: "12px", textAlign: "right", color: "#4B5563", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                            ₹{Number(row.charges ?? row.total_charges ?? 0).toFixed(2)}
                          </TableCell>
                        )}

                        {/* 4. GST (₹) */}
                        {!hiddenColumns.has("gst") && (
                          <TableCell sx={{ fontSize: "12px", textAlign: "right", color: "#4B5563", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                            ₹{Number(row.gst ?? row.tax_amount ?? 0).toFixed(2)}
                          </TableCell>
                        )}

                        {/* 5. Total Amount (₹) */}
                        {!hiddenColumns.has("total_amount") && (
                          <TableCell sx={{ fontSize: "12px", fontWeight: 700, textAlign: "right", color: "#2563EB", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                            ₹{Number(row.total_amount || row.customer_payable || row.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </TableCell>
                        )}

                        {/* 6. Wallet Credit (₹) */}
                        {!hiddenColumns.has("wallet_credit") && (
                          <TableCell sx={{ fontSize: "12px", fontWeight: 800, textAlign: "right", color: "#10B981", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                            +₹{Number(row.wallet_credit ?? row.retailer_credit ?? row.amount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </TableCell>
                        )}

                        {/* 7. MobileNo */}
                        {!hiddenColumns.has("customer_mobile") && (
                          <TableCell sx={{ fontSize: "12px", fontFamily: "monospace", color: "#374151", fontWeight: 600, whiteSpace: "nowrap" }}>
                            {row.customer_mobile || row.mobile_no || "--"}
                          </TableCell>
                        )}

                        {/* 8. Gateway */}
                        {!hiddenColumns.has("gateway") && (
                          <TableCell sx={{ fontSize: "12px", fontWeight: 700, color: "#059669", whiteSpace: "nowrap" }}>
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

                        {/* Vendor (Admin Only) */}
                        {isAdmin && !hiddenColumns.has("vendor") && (
                          <TableCell sx={{ fontSize: "12px", fontWeight: 700, whiteSpace: "nowrap" }}>
                            <Chip
                              label={row.vendor_name || row.gateway || "G-1"}
                              size="small"
                              sx={{
                                fontWeight: 800,
                                fontSize: "10.5px",
                                height: 22,
                                bgcolor: "rgba(37, 99, 235, 0.08)",
                                color: "#2563EB",
                                border: "1px solid rgba(37, 99, 235, 0.25)",
                              }}
                            />
                          </TableCell>
                        )}

                        {/* 9. Method */}
                        {!hiddenColumns.has("method") && (
                          <TableCell sx={{ fontSize: "12px", color: "#374151", fontWeight: 600, whiteSpace: "nowrap" }}>
                            {row.method || row.payment_mode || "Pending Classification"}
                          </TableCell>
                        )}

                        {/* 10. Status */}
                        {!hiddenColumns.has("status") && (
                          <TableCell sx={{ whiteSpace: "nowrap" }}>
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

                        {/* 11. Date & Time */}
                        {!hiddenColumns.has("date_time") && (
                          <TableCell sx={{ fontSize: "11.5px", whiteSpace: "nowrap" }}>
                            <Typography sx={{ fontSize: "12px", color: "#111827", fontWeight: 600 }}>{dt.date}</Typography>
                            <Typography sx={{ fontSize: "10.5px", color: "#6B7280" }}>{dt.time}</Typography>
                          </TableCell>
                        )}

                        {/* 12. Action */}
                        <TableCell sx={{ textAlign: "center", pr: 2, whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
                            <Tooltip title="View Transaction Breakdown">
                              <IconButton size="small" onClick={() => openDetailsBreakdown(row)}>
                                <VisibilityIcon sx={{ fontSize: 16, color: "#059669" }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="View Verified Receipt">
                              <IconButton size="small" onClick={(e) => openReceiptModal(row, e)}>
                                <PrintIcon sx={{ fontSize: 16, color: "#2563EB" }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
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
                Filtered Total: <strong style={{ color: "#059669" }}>{footerTotals.total_transactions ?? items.length} Orders</strong>
              </Typography>
              <Stack direction="row" spacing={2.5}>
                <Typography sx={{ fontSize: "12px", color: "#4B5563" }}>
                  Volume: <strong style={{ color: "#111827" }}>₹{Number(footerTotals.total_amount ?? footerTotals.total_txn_amount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
                </Typography>
                <Typography sx={{ fontSize: "12px", color: "#4B5563" }}>
                  Total Charges: <strong style={{ color: "#2563EB" }}>₹{Number(footerTotals.total_charges ?? 0).toFixed(2)}</strong>
                </Typography>
                <Typography sx={{ fontSize: "12px", color: "#4B5563" }}>
                  Total GST: <strong style={{ color: "#2563EB" }}>₹{Number(footerTotals.total_gst ?? footerTotals.total_tax_amount ?? 0).toFixed(2)}</strong>
                </Typography>
                <Typography sx={{ fontSize: "12px", color: "#4B5563" }}>
                  Wallet Credit: <strong style={{ color: "#10B981" }}>+₹{Number(footerTotals.total_retailer_credit ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
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
              executeReportFetch(newPage, rowsPerPage);
            }}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              const newLimit = parseInt(e.target.value, 10);
              setRowsPerPage(newLimit);
              setPage(0);
              executeReportFetch(0, newLimit);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
            sx={{ borderTop: "1px solid #E5E7EB" }}
          />
        </Paper>
      </Box>

      {/* ── 5. MOBILE RESPONSIVE CARDS VIEW ── */}
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
              const dt = formatDateTime(row.date_time || row.created_at);

              return (
                <Paper
                  key={row.id || row.tid || idx}
                  elevation={0}
                  onClick={() => openDetailsBreakdown(row)}
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
                      Customer: <strong>{row.customer_mobile || row.mobile_no || "--"}</strong>
                    </Typography>
                    <Typography sx={{ fontSize: "11px", color: "#4B5563" }}>
                      Gateway: <strong>{row.gateway || "G-1"}</strong> · {row.method || row.payment_mode || "--"}
                    </Typography>
                  </Stack>
                  {isAdmin && (
                    <Box sx={{ mt: 1, pt: 1, borderTop: "1px dashed #E5E7EB" }}>
                      <Typography sx={{ fontSize: "11px", color: "#4B5563" }}>
                        Retailer: <strong>{row.retailer_name || "--"}</strong> {row.retailer_id ? `(${row.retailer_id})` : ""}
                      </Typography>
                      <Typography sx={{ fontSize: "11px", color: "#4B5563" }}>
                        Ref ID: <strong>{row.reference_id || row.merchant_ref_id || "--"}</strong> · Vendor: <strong>{row.vendor_name || row.gateway || "G-1"}</strong>
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ mt: 1, textAlign: "right" }}>
                    <Button size="small" onClick={(e) => { e.stopPropagation(); openDetailsBreakdown(row); }} sx={{ fontSize: "11px", textTransform: "none", color: "#059669", fontWeight: 700 }}>
                      View Details →
                    </Button>
                  </Box>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Box>

      {/* ── 6. POPUP MENUS FOR FILTER BUTTONS ── */}

      {/* Transaction ID Popover */}
      <Popover
        anchorEl={tidAnchorEl}
        open={Boolean(tidAnchorEl)}
        onClose={() => setTidAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{ paper: { sx: { borderRadius: "12px", width: 280, p: 2, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" } } }}
      >
        <Typography sx={{ fontSize: "12px", fontWeight: 800, color: brandPrimary, mb: 1, textTransform: "uppercase" }}>
          Filter by Transaction ID
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="e.g. BPAY2011261..."
          value={tidFilter}
          onChange={(e) => setTidFilter(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setTidAnchorEl(null);
              setPage(0);
              executeReportFetch(0, rowsPerPage, { tid: tidFilter });
            }
          }}
          sx={{ mb: 1.5, "& input": { fontSize: "12px", fontFamily: "monospace" } }}
        />
        <Stack direction="row" spacing={1}>
          <Button
            fullWidth
            size="small"
            variant="contained"
            onClick={() => {
              setTidAnchorEl(null);
              setPage(0);
              executeReportFetch(0, rowsPerPage, { tid: tidFilter });
            }}
            sx={{ bgcolor: brandPrimary, color: "#FFFFFF", fontWeight: 700, textTransform: "none", "&:hover": { bgcolor: brandSecondary } }}
          >
            Apply Filter
          </Button>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            onClick={() => {
              setTidFilter("");
              setTidAnchorEl(null);
              setPage(0);
              executeReportFetch(0, rowsPerPage, { tid: "" });
            }}
            sx={{ color: "#6B7280", borderColor: "#D1D5DB", textTransform: "none" }}
          >
            Clear
          </Button>
        </Stack>
      </Popover>

      {/* Mobile Number Popover */}
      <Popover
        anchorEl={mobileAnchorEl}
        open={Boolean(mobileAnchorEl)}
        onClose={() => setMobileAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{ paper: { sx: { borderRadius: "12px", width: 280, p: 2, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" } } }}
      >
        <Typography sx={{ fontSize: "12px", fontWeight: 800, color: brandPrimary, mb: 1, textTransform: "uppercase" }}>
          Filter by Customer Mobile
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="e.g. 9845678901"
          value={mobileFilter}
          onChange={(e) => setMobileFilter(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setMobileAnchorEl(null);
              setPage(0);
              executeReportFetch(0, rowsPerPage, { mobile: mobileFilter });
            }
          }}
          sx={{ mb: 1.5, "& input": { fontSize: "12px", fontFamily: "monospace" } }}
        />
        <Stack direction="row" spacing={1}>
          <Button
            fullWidth
            size="small"
            variant="contained"
            onClick={() => {
              setMobileAnchorEl(null);
              setPage(0);
              executeReportFetch(0, rowsPerPage, { mobile: mobileFilter });
            }}
            sx={{ bgcolor: brandPrimary, color: "#FFFFFF", fontWeight: 700, textTransform: "none", "&:hover": { bgcolor: brandSecondary } }}
          >
            Apply Filter
          </Button>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            onClick={() => {
              setMobileFilter("");
              setMobileAnchorEl(null);
              setPage(0);
              executeReportFetch(0, rowsPerPage, { mobile: "" });
            }}
            sx={{ color: "#6B7280", borderColor: "#D1D5DB", textTransform: "none" }}
          >
            Clear
          </Button>
        </Stack>
      </Popover>

      {/* Gateway Menu */}
      <Menu
        anchorEl={gatewayAnchorEl}
        open={Boolean(gatewayAnchorEl)}
        onClose={() => setGatewayAnchorEl(null)}
        slotProps={{ paper: { sx: { borderRadius: "12px", width: 185, p: 0.5 } } }}
      >
        <MenuItem
          onClick={() => {
            setGatewayFilter("ALL");
            setGatewayAnchorEl(null);
            setPage(0);
            executeReportFetch(0, rowsPerPage, { gateway: "ALL" });
          }}
          sx={{ fontSize: "12px", fontWeight: gatewayFilter === "ALL" ? 800 : 500 }}
        >
          All Gateways
        </MenuItem>
        {gatewayOptions.map((gw) => (
          <MenuItem
            key={gw.value}
            onClick={() => {
              setGatewayFilter(gw.value);
              setGatewayAnchorEl(null);
              setPage(0);
              executeReportFetch(0, rowsPerPage, { gateway: gw.value });
            }}
            sx={{ fontSize: "12px", fontWeight: gatewayFilter === gw.value ? 800 : 500 }}
          >
            {gw.label}
          </MenuItem>
        ))}
      </Menu>

      {/* Method Menu */}
      <Menu
        anchorEl={methodAnchorEl}
        open={Boolean(methodAnchorEl)}
        onClose={() => setMethodAnchorEl(null)}
        slotProps={{ paper: { sx: { borderRadius: "12px", width: 200, p: 0.5, maxHeight: 320 } } }}
      >
        <MenuItem
          onClick={() => {
            setPaymentModeFilter("ALL");
            setMethodAnchorEl(null);
            setPage(0);
            executeReportFetch(0, rowsPerPage, { paymentMode: "ALL" });
          }}
          sx={{ fontSize: "12px", fontWeight: paymentModeFilter === "ALL" ? 800 : 500 }}
        >
          All Methods
        </MenuItem>
        {methodOptions.map((m) => (
          <MenuItem
            key={m.value}
            onClick={() => {
              setPaymentModeFilter(m.value);
              setMethodAnchorEl(null);
              setPage(0);
              executeReportFetch(0, rowsPerPage, { paymentMode: m.value });
            }}
            sx={{ fontSize: "12px", fontWeight: paymentModeFilter === m.value ? 800 : 500 }}
          >
            {m.label}
          </MenuItem>
        ))}
      </Menu>

      {/* Status Menu */}
      <Menu
        anchorEl={statusAnchorEl}
        open={Boolean(statusAnchorEl)}
        onClose={() => setStatusAnchorEl(null)}
        slotProps={{ paper: { sx: { borderRadius: "12px", width: 180, p: 0.5 } } }}
      >
        {[
          { key: "ALL", label: "All Statuses" },
          { key: "SUCCESS", label: "Success" },
          { key: "PENDING", label: "Pending" },
          { key: "FAILED", label: "Failed" },
          { key: "REVERSED", label: "Reversed" },
        ].map((s) => (
          <MenuItem
            key={s.key}
            onClick={() => {
              setStatusFilter(s.key);
              setStatusAnchorEl(null);
              setPage(0);
              executeReportFetch(0, rowsPerPage, { status: s.key });
            }}
            sx={{ fontSize: "12px", fontWeight: statusFilter === s.key ? 800 : 500 }}
          >
            {s.label}
          </MenuItem>
        ))}
      </Menu>

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
            onKeyDown={(e) => { if (e.key === "Enter") handleApplyCustomDates(); }}
          />
          <TextField
            label="To Date"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleApplyCustomDates(); }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setCustomDateOpen(false)} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleApplyCustomDates}
            sx={{
              bgcolor: brandPrimary,
              color: "#FFFFFF",
              textTransform: "none",
              fontWeight: 800,
              "&:hover": { bgcolor: brandSecondary },
            }}
          >
            Apply Range
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── 8. TRANSACTION BREAKDOWN MODAL (MATCHING LEFT PANEL OF SCREENSHOT) ── */}
      <Dialog
        open={breakdownModalOpen}
        onClose={() => setBreakdownModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: "16px",
              p: 0,
              bgcolor: "#FFFFFF",
              overflow: "hidden",
              boxShadow: "0 20px 48px rgba(0,0,0,0.18)",
            },
          },
        }}
      >
        {selectedTxn && (
          <Box>
            {/* Modal Header */}
            <Box
              sx={{
                p: 2.2,
                px: 3,
                borderBottom: "1px solid #E5E7EB",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                bgcolor: "#FFFFFF",
              }}
            >
              {/* Domain Logo */}
              <Box sx={{ display: "flex", alignItems: "center" }}>
                {branding?.logo_url ? (
                  <img
                    src={branding.logo_url}
                    alt={branding.display_name || "Logo"}
                    style={{ height: 28, maxWidth: 140, objectFit: "contain" }}
                  />
                ) : (
                  <Typography sx={{ fontWeight: 900, fontSize: "20px", color: "#059669", letterSpacing: "-0.5px" }}>
                    SMSPAY
                  </Typography>
                )}
              </Box>

              {/* Title */}
              <Typography sx={{ fontWeight: 800, fontSize: "16px", color: "#111827" }}>
                Transaction Breakdown
              </Typography>

              {/* Close Button */}
              <IconButton size="small" onClick={() => setBreakdownModalOpen(false)} sx={{ color: "#6B7280" }}>
                <CloseIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Box>

            {/* Modal Content */}
            <Box sx={{ p: 3, maxHeight: "75vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
              {/* Card 1: Transaction Summary */}
              <Paper elevation={0} sx={{ p: 2, borderRadius: "12px", bgcolor: "#FFFFFF", border: "1px solid #E5E7EB" }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                  <CreditCardIcon sx={{ color: "#059669", fontSize: 18 }} />
                  <Typography sx={{ fontSize: "13px", fontWeight: 800, color: "#111827" }}>
                    Transaction Summary
                  </Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography sx={{ fontSize: "11px", color: "#6B7280", fontWeight: 600 }}>TID</Typography>
                    <Typography sx={{ fontSize: "12.5px", fontWeight: 800, fontFamily: "monospace", color: "#111827" }}>
                      {selectedTxn.tid}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography sx={{ fontSize: "11px", color: "#6B7280", fontWeight: 600, mb: 0.3 }}>Payment Status</Typography>
                    <Chip
                      label={selectedTxn.status}
                      size="small"
                      sx={{
                        fontWeight: 800,
                        fontSize: "10.5px",
                        height: 22,
                        color: getStatusBadge(selectedTxn.status).color,
                        bgcolor: getStatusBadge(selectedTxn.status).bg,
                        border: getStatusBadge(selectedTxn.status).border,
                      }}
                    />
                  </Box>
                </Stack>

                <Typography sx={{ fontSize: "24px", fontWeight: 900, color: "#111827", mt: 1.5, lineHeight: 1.1 }}>
                  ₹{Number(selectedTxn.amount || selectedTxn.txn_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </Typography>
                <Typography sx={{ fontSize: "11.5px", color: "#6B7280", mt: 0.5 }}>
                  Reference ID: {selectedTxn.reference_id || selectedTxn.merchant_ref_id || "--"}
                </Typography>
              </Paper>

              {/* Card 2: Financial Breakdown */}
              <Paper elevation={0} sx={{ p: 2, borderRadius: "12px", bgcolor: "#FFFFFF", border: "1px solid #E5E7EB" }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                  <BarChartIcon sx={{ color: "#059669", fontSize: 18 }} />
                  <Typography sx={{ fontSize: "13px", fontWeight: 800, color: "#111827" }}>
                    Financial Breakdown
                  </Typography>
                </Stack>

                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, mb: 1.5 }}>
                  <Box>
                    <Typography sx={{ fontSize: "11px", color: "#6B7280" }}>Base Amount</Typography>
                    <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>
                      ₹{Number(selectedTxn.amount || selectedTxn.txn_amount || 0).toFixed(2)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: "11px", color: "#6B7280" }}>GST (18%)</Typography>
                    <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>
                      ₹{Number(selectedTxn.gst ?? selectedTxn.tax_amount ?? 0).toFixed(2)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: "11px", color: "#6B7280" }}>Charges</Typography>
                    <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>
                      ₹{Number(selectedTxn.charges ?? selectedTxn.total_charges ?? 0).toFixed(2)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: "11px", color: "#6B7280" }}>Total Amount</Typography>
                    <Typography sx={{ fontSize: "13px", fontWeight: 800, color: "#111827" }}>
                      ₹{Number(selectedTxn.total_amount || selectedTxn.customer_payable || selectedTxn.amount || 0).toFixed(2)}
                    </Typography>
                  </Box>
                </Box>

                {/* Highlighted Wallet Credit Green Band */}
                <Box
                  sx={{
                    bgcolor: "rgba(16, 185, 129, 0.12)",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                    borderRadius: "8px",
                    px: 1.5,
                    py: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <AccountBalanceWalletIcon sx={{ fontSize: 16, color: "#059669" }} />
                    <Typography sx={{ fontSize: "12px", fontWeight: 800, color: "#059669" }}>
                      Wallet Credit
                    </Typography>
                  </Stack>
                  <Typography sx={{ fontSize: "13.5px", fontWeight: 900, color: "#059669" }}>
                    +₹{Number(selectedTxn.wallet_credit ?? selectedTxn.retailer_credit ?? selectedTxn.amount ?? 0).toFixed(2)}
                  </Typography>
                </Box>
              </Paper>

              {/* Card 3: Gateway & Routing */}
              <Paper elevation={0} sx={{ p: 2, borderRadius: "12px", bgcolor: "#FFFFFF", border: "1px solid #E5E7EB" }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                  <HubIcon sx={{ color: "#059669", fontSize: 18 }} />
                  <Typography sx={{ fontSize: "13px", fontWeight: 800, color: "#111827" }}>
                    Gateway &amp; Routing
                  </Typography>
                </Stack>

                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
                  <Box>
                    <Typography sx={{ fontSize: "11px", color: "#6B7280", mb: 0.3 }}>Gateway Label</Typography>
                    <Chip
                      label={selectedTxn.gateway || "G-1"}
                      size="small"
                      sx={{
                        fontWeight: 800,
                        fontSize: "11px",
                        height: 20,
                        bgcolor: "rgba(5, 150, 105, 0.1)",
                        color: "#059669",
                        border: "1px solid rgba(5, 150, 105, 0.25)",
                      }}
                    />
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: "11px", color: "#6B7280" }}>Payment Mode</Typography>
                    <Typography sx={{ fontSize: "12.5px", fontWeight: 800, color: "#111827" }}>
                      {selectedTxn.method || selectedTxn.payment_mode || "UPI"}
                    </Typography>
                  </Box>
                  <Box sx={{ gridColumn: "span 2" }}>
                    <Typography sx={{ fontSize: "11px", color: "#6B7280" }}>Ledger Txn ID</Typography>
                    <Typography sx={{ fontSize: "12px", fontFamily: "monospace", color: "#111827", fontWeight: 600 }}>
                      {selectedTxn.ledger_txn_id || selectedTxn.tid || "--"}
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              {/* Card 4: Customer Details */}
              <Paper elevation={0} sx={{ p: 2, borderRadius: "12px", bgcolor: "#FFFFFF", border: "1px solid #E5E7EB" }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                  <PersonIcon sx={{ color: "#059669", fontSize: 18 }} />
                  <Typography sx={{ fontSize: "13px", fontWeight: 800, color: "#111827" }}>
                    Customer Details
                  </Typography>
                </Stack>

                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
                  <Box>
                    <Typography sx={{ fontSize: "11px", color: "#6B7280" }}>Name</Typography>
                    <Typography sx={{ fontSize: "12.5px", fontWeight: 700, color: "#111827" }}>
                      {selectedTxn.customer_name || selectedTxn.retailer_name || "Customer"}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: "11px", color: "#6B7280" }}>Mobile No</Typography>
                    <Typography sx={{ fontSize: "12.5px", fontWeight: 700, fontFamily: "monospace", color: "#111827" }}>
                      {selectedTxn.customer_mobile || selectedTxn.mobile_no || "--"}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Box>

            {/* Modal Bottom Actions (Print Receipt, Share Receipt, Print Verified Receipt) */}
            <Box
              sx={{
                p: 2,
                px: 3,
                bgcolor: "#F9FAFB",
                borderTop: "1px solid #E5E7EB",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 1.2,
              }}
            >
              <Button
                variant="outlined"
                startIcon={<PrintIcon sx={{ fontSize: 16 }} />}
                onClick={() => {
                  setReceiptDialogOpen(true);
                }}
                sx={{
                  color: "#059669",
                  borderColor: "#059669",
                  fontWeight: 700,
                  fontSize: "12px",
                  textTransform: "none",
                  borderRadius: "8px",
                  bgcolor: "#FFFFFF",
                  "&:hover": { bgcolor: "rgba(5, 150, 105, 0.05)", borderColor: "#047857" },
                }}
              >
                Print Receipt
              </Button>

              <Button
                variant="outlined"
                startIcon={<ShareIcon sx={{ fontSize: 16 }} />}
                onClick={() => handleShareReceipt(selectedTxn)}
                sx={{
                  color: "#059669",
                  borderColor: "#059669",
                  fontWeight: 700,
                  fontSize: "12px",
                  textTransform: "none",
                  borderRadius: "8px",
                  bgcolor: "#FFFFFF",
                  "&:hover": { bgcolor: "rgba(5, 150, 105, 0.05)", borderColor: "#047857" },
                }}
              >
                Share Receipt
              </Button>

              <Button
                variant="contained"
                startIcon={<PrintIcon sx={{ fontSize: 16 }} />}
                onClick={() => handlePrintVerifiedReceipt(selectedTxn)}
                sx={{
                  bgcolor: "#059669",
                  color: "#FFFFFF",
                  fontWeight: 800,
                  fontSize: "12px",
                  textTransform: "none",
                  borderRadius: "8px",
                  boxShadow: "0 2px 6px rgba(5, 150, 105, 0.25)",
                  "&:hover": { bgcolor: "#047857" },
                }}
              >
                Print Verified Receipt
              </Button>
            </Box>
          </Box>
        )}
      </Dialog>

      {/* ── 9. PAYMENT RECEIPT MODAL (MATCHING RIGHT PANEL OF SCREENSHOT) ── */}
      <Dialog
        open={receiptDialogOpen}
        onClose={() => setReceiptDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: "16px",
              p: 0,
              bgcolor: "#FFFFFF",
              overflow: "hidden",
              boxShadow: "0 20px 48px rgba(0,0,0,0.18)",
            },
          },
        }}
      >
        {selectedTxn && (
          <Box sx={{ position: "relative" }}>
            {/* Header with Centered Logo */}
            <Box sx={{ pt: 3, px: 3, textAlign: "center" }}>
              <Box sx={{ display: "flex", justifyContent: "center", mb: 1.5 }}>
                {branding?.logo_url ? (
                  <img
                    src={branding.logo_url}
                    alt={branding.display_name || "Logo"}
                    style={{ height: 36, maxWidth: 170, objectFit: "contain" }}
                  />
                ) : (
                  <Typography sx={{ fontWeight: 900, fontSize: "22px", color: "#059669" }}>
                    SMSPAY
                  </Typography>
                )}
              </Box>

              {/* Green Thin Divider Line */}
              <Box sx={{ height: "2px", bgcolor: "#10B981", width: "100%", mb: 1.5 }} />

              <Typography sx={{ fontWeight: 800, fontSize: "18px", color: "#111827", mb: 0.8 }}>
                Payment Receipt
              </Typography>

              {/* Payment Successful Status */}
              <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.8} sx={{ mb: 2 }}>
                <CheckCircleIcon sx={{ color: "#059669", fontSize: 18 }} />
                <Typography sx={{ fontSize: "13.5px", fontWeight: 700, color: "#059669" }}>
                  Payment Successful
                </Typography>
              </Stack>
            </Box>

            {/* Receipt Body */}
            <Box sx={{ px: 3, pb: 2 }}>
              {/* Summary Gray Card */}
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  borderRadius: "10px",
                  bgcolor: "#F9FAFB",
                  border: "1px solid #E5E7EB",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 1.5,
                  mb: 2,
                }}
              >
                <Box>
                  <Typography sx={{ fontSize: "10.5px", color: "#6B7280" }}>TID</Typography>
                  <Typography sx={{ fontSize: "11.5px", fontWeight: 800, fontFamily: "monospace", color: "#111827" }}>
                    {selectedTxn.tid}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: "10.5px", color: "#6B7280" }}>Date &amp; Time</Typography>
                  <Typography sx={{ fontSize: "11.5px", fontWeight: 700, color: "#111827" }}>
                    {selectedTxn.date_time || formatDateTime(selectedTxn.created_at).date}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: "10.5px", color: "#6B7280" }}>Retailer</Typography>
                  <Typography sx={{ fontSize: "11.5px", fontWeight: 700, color: "#111827" }}>
                    {selectedTxn.retailer_name || outlet?.outlet_name || "Retailer Partner"}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: "10.5px", color: "#6B7280" }}>Mobile No</Typography>
                  <Typography sx={{ fontSize: "11.5px", fontWeight: 700, fontFamily: "monospace", color: "#111827" }}>
                    {selectedTxn.customer_mobile || selectedTxn.mobile_no || "--"}
                  </Typography>
                </Box>
              </Paper>

              {/* Payment Details Section */}
              <Typography sx={{ fontSize: "12.5px", fontWeight: 800, color: "#059669", mb: 1 }}>
                Payment Details
              </Typography>
              <Stack spacing={0.8} sx={{ mb: 2 }}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ fontSize: "12px", color: "#4B5563" }}>Base Amount</Typography>
                  <Typography sx={{ fontSize: "12px", fontWeight: 700, color: "#111827" }}>
                    ₹{Number(selectedTxn.amount || selectedTxn.txn_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ fontSize: "12px", color: "#4B5563" }}>Charges</Typography>
                  <Typography sx={{ fontSize: "12px", fontWeight: 700, color: "#111827" }}>
                    ₹{Number(selectedTxn.charges ?? selectedTxn.total_charges ?? 0).toFixed(2)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ fontSize: "12px", color: "#4B5563" }}>GST (18%)</Typography>
                  <Typography sx={{ fontSize: "12px", fontWeight: 700, color: "#111827" }}>
                    ₹{Number(selectedTxn.gst ?? selectedTxn.tax_amount ?? 0).toFixed(2)}
                  </Typography>
                </Stack>
                <Box sx={{ bgcolor: "rgba(16, 185, 129, 0.08)", p: 0.8, px: 1.2, borderRadius: "6px", display: "flex", justifyContent: "space-between" }}>
                  <Typography sx={{ fontSize: "12px", fontWeight: 800, color: "#059669" }}>Total Amount</Typography>
                  <Typography sx={{ fontSize: "12.5px", fontWeight: 900, color: "#059669" }}>
                    ₹{Number(selectedTxn.total_amount || selectedTxn.customer_payable || selectedTxn.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
                <Box sx={{ bgcolor: "rgba(16, 185, 129, 0.12)", p: 0.8, px: 1.2, borderRadius: "6px", display: "flex", justifyContent: "space-between" }}>
                  <Typography sx={{ fontSize: "12px", fontWeight: 800, color: "#10B981" }}>Wallet Credit</Typography>
                  <Typography sx={{ fontSize: "12.5px", fontWeight: 900, color: "#10B981" }}>
                    +₹{Number(selectedTxn.wallet_credit ?? selectedTxn.retailer_credit ?? selectedTxn.amount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
              </Stack>

              {/* Gateway & Method Section */}
              <Typography sx={{ fontSize: "12.5px", fontWeight: 800, color: "#059669", mb: 1 }}>
                Gateway &amp; Method
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, mb: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: "10.5px", color: "#6B7280" }}>Gateway</Typography>
                  <Typography sx={{ fontSize: "12px", fontWeight: 800, color: "#111827" }}>
                    {selectedTxn.gateway || "G-1"}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: "10.5px", color: "#6B7280" }}>Method</Typography>
                  <Typography sx={{ fontSize: "12px", fontWeight: 800, color: "#111827" }}>
                    {selectedTxn.method || selectedTxn.payment_mode || "--"}
                  </Typography>
                </Box>
              </Box>

              {/* Thank you note */}
              <Typography sx={{ textAlign: "center", fontSize: "11.5px", fontStyle: "italic", color: "#6B7280", my: 2 }}>
                Thank you for using {branding?.display_name || "SMSPAY"}!
              </Typography>
            </Box>

            {/* Bottom Wave Graphic */}
            <Box
              sx={{
                width: "100%",
                height: 38,
                background: "linear-gradient(135deg, #059669 0%, #10B981 50%, #34D399 100%)",
                borderRadius: "40% 40% 0 0 / 16px 16px 0 0",
              }}
            />

            {/* Dialog Actions */}
            <Box sx={{ p: 2, px: 3, display: "flex", justifyContent: "space-between", bgcolor: "#FFFFFF" }}>
              <Button onClick={() => setReceiptDialogOpen(false)} sx={{ color: "#6B7280", textTransform: "none", fontWeight: 700 }}>
                Close
              </Button>
              <Button
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={() => handlePrintVerifiedReceipt(selectedTxn)}
                sx={{
                  bgcolor: "#059669",
                  color: "#FFFFFF",
                  fontWeight: 800,
                  textTransform: "none",
                  borderRadius: "8px",
                  "&:hover": { bgcolor: "#047857" },
                }}
              >
                Print Slip
              </Button>
            </Box>
          </Box>
        )}
      </Dialog>
    </Box>
  );
};

/**
 * Generates verified receipt HTML string for standard isolated browser printing
 */
function generateReceiptPrintHtml(item: PayinReportItem, brand: any) {
  const logo = brand?.logo_url || "/branding/pay2pay-logo.png";
  const compName = brand?.display_name || brand?.company_name || "SMSPAY";
  const st = (item.status || "SUCCESS").toUpperCase();
  const isSuccess = st === "SUCCESS" || st === "COMPLETED" || st === "SETTLED";
  const isPending = st === "PENDING" || st === "INITIATED" || st === "PROCESSING";
  const stColor = isSuccess ? "#059669" : isPending ? "#D97706" : "#DC2626";
  const stText = isSuccess ? "Payment Successful" : isPending ? "Payment Pending" : "Payment Failed";
  const dt = item.date_time || item.created_at || "--";
  const baseAmt = Number(item.amount || item.txn_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  const chargesAmt = Number(item.charges ?? item.total_charges ?? 0).toFixed(2);
  const gstAmt = Number(item.gst ?? item.tax_amount ?? 0).toFixed(2);
  const totalAmt = Number(item.total_amount || item.customer_payable || item.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  const creditAmt = Number(item.wallet_credit ?? item.retailer_credit ?? item.amount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  const retName = item.retailer_name || "Retailer Partner";
  const custMob = item.customer_mobile || item.mobile_no || "--";
  const gw = item.gateway || "G-1";
  const method = item.method || item.payment_mode || "--";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Receipt - ${item.tid}</title>
  <style>
    @page { size: auto; margin: 12mm 10mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background: #FFFFFF;
      color: #111827;
      display: flex;
      justify-content: center;
    }
    .receipt-card {
      width: 100%;
      max-width: 420px;
      border: 1px solid #E5E7EB;
      border-radius: 16px;
      overflow: hidden;
      background: #FFFFFF;
      box-shadow: 0 4px 18px rgba(0,0,0,0.06);
    }
    .header {
      text-align: center;
      padding: 24px 20px 14px;
    }
    .logo {
      max-height: 38px;
      max-width: 160px;
      object-fit: contain;
      margin-bottom: 12px;
    }
    .green-line {
      height: 2px;
      background: #10B981;
      width: 100%;
      margin-bottom: 16px;
    }
    .title {
      font-size: 19px;
      font-weight: 800;
      color: #111827;
      margin: 0 0 8px;
      letter-spacing: -0.3px;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: ${stColor};
      font-weight: 700;
      font-size: 13.5px;
    }
    .status-icon {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: ${stColor};
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: bold;
    }
    .content {
      padding: 0 20px 20px;
    }
    .summary-box {
      background: #F9FAFB;
      border: 1px solid #F3F4F6;
      border-radius: 12px;
      padding: 14px 16px;
      margin-bottom: 20px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 16px;
    }
    .summary-item .label {
      font-size: 11px;
      color: #6B7280;
      margin-bottom: 3px;
    }
    .summary-item .val {
      font-size: 12px;
      font-weight: 700;
      color: #111827;
      word-break: break-all;
    }
    .section-title {
      font-size: 13px;
      font-weight: 800;
      color: #059669;
      margin: 16px 0 10px;
      letter-spacing: 0.2px;
    }
    .data-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      font-size: 12.5px;
      border-bottom: 1px dashed #F3F4F6;
    }
    .data-row .row-label {
      color: #4B5563;
    }
    .data-row .row-val {
      font-weight: 700;
      color: #111827;
    }
    .total-row {
      background: #F0FDF4;
      padding: 8px 12px;
      border-radius: 8px;
      margin-top: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: none;
    }
    .total-row .row-label {
      font-weight: 800;
      color: #059669;
      font-size: 13px;
    }
    .total-row .row-val {
      font-weight: 900;
      color: #059669;
      font-size: 14px;
    }
    .gw-box {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 16px;
      padding: 8px 0;
    }
    .footer-note {
      text-align: center;
      font-size: 12px;
      color: #6B7280;
      font-style: italic;
      margin: 24px 0 16px;
    }
    .wave-bg {
      width: 100%;
      height: 48px;
      background: linear-gradient(135deg, #059669 0%, #10B981 50%, #34D399 100%);
      border-radius: 40% 40% 0 0 / 20px 20px 0 0;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="receipt-card">
    <div class="header">
      <img src="${logo}" class="logo" alt="${compName}" />
      <div class="green-line"></div>
      <h2 class="title">Payment Receipt</h2>
      <div class="status-badge">
        <span class="status-icon">✓</span>
        <span>${stText}</span>
      </div>
    </div>

    <div class="content">
      <div class="summary-box">
        <div class="summary-item">
          <div class="label">TID</div>
          <div class="val" style="font-family: monospace;">${item.tid}</div>
        </div>
        <div class="summary-item">
          <div class="label">Date & Time</div>
          <div class="val">${dt}</div>
        </div>
        <div class="summary-item">
          <div class="label">Retailer</div>
          <div class="val">${retName}</div>
        </div>
        <div class="summary-item">
          <div class="label">Mobile No</div>
          <div class="val" style="font-family: monospace;">${custMob}</div>
        </div>
      </div>

      <div class="section-title">Payment Details</div>
      <div class="data-row">
        <span class="row-label">Base Amount</span>
        <span class="row-val">₹${baseAmt}</span>
      </div>
      <div class="data-row">
        <span class="row-label">Charges</span>
        <span class="row-val">₹${chargesAmt}</span>
      </div>
      <div class="data-row">
        <span class="row-label">GST (18%)</span>
        <span class="row-val">₹${gstAmt}</span>
      </div>
      <div class="total-row">
        <span class="row-label">Total Amount</span>
        <span class="row-val">₹${totalAmt}</span>
      </div>
      <div class="total-row" style="background: #ECFDF5; margin-top: 4px;">
        <span class="row-label" style="color: #10B981;">Wallet Credit</span>
        <span class="row-val" style="color: #10B981;">+₹${creditAmt}</span>
      </div>

      <div class="section-title" style="margin-top: 20px;">Gateway & Method</div>
      <div class="gw-box">
        <div class="summary-item">
          <div class="label">Gateway</div>
          <div class="val">${gw}</div>
        </div>
        <div class="summary-item">
          <div class="label">Method</div>
          <div class="val">${method}</div>
        </div>
      </div>

      <div class="footer-note">Thank you for using ${compName}!</div>
    </div>

    <div class="wave-bg"></div>
  </div>
</body>
</html>`;
}

export default RetailerPayinReport;
