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
  Tooltip,
} from "@mui/material";

// Icons
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import RefreshIcon from "@mui/icons-material/Refresh";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";
import ReceiptIcon from "@mui/icons-material/Receipt";
import ClearIcon from "@mui/icons-material/Clear";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import TableChartIcon from "@mui/icons-material/TableChart";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ShareIcon from "@mui/icons-material/Share";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import { getApiBaseUrl } from "@/lib/api-config";

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
  id: string;
  txn_id: string;
  client_ref_id: string;
  service: string;
  type: string;
  customer_name: string;
  customer_mobile: string;
  beneficiary_name?: string;
  account_number?: string;
  bank_name?: string;
  ifsc_code?: string;
  amount: number;
  charges: number;
  commission: number;
  gst_amount: number;
  tds_amount: number;
  net_amount: number;
  previous_balance: number;
  cr: number;
  dr: number;
  current_balance: number;
  transaction_datetime: string;
  status: string;
  status_description?: string;
  provider_name?: string;
  provider_txn_id?: string;
  provider_ref?: string;
  channel?: string;
}

const SEED_TRANSACTIONS: TransactionReportItem[] = [
  {
    id: "tx-unified-101",
    txn_id: "TXN202616567",
    client_ref_id: "UTK29786401",
    service: "PAYOUT",
    type: "IMPS",
    customer_name: "Sathiya Murthy R",
    customer_mobile: "9840192837",
    beneficiary_name: "Sathiya Murthy R",
    account_number: "XXXX XXXX 6974",
    bank_name: "IDBI Bank",
    ifsc_code: "IBKL0000630",
    amount: 100.0,
    charges: 10.0,
    commission: 0.0,
    gst_amount: 1.8,
    tds_amount: 0.0,
    net_amount: 110.0,
    previous_balance: 995.50,
    cr: 0.0,
    dr: 110.0,
    current_balance: 885.50,
    transaction_datetime: "2026-08-21T18:30:00Z",
    status: "SUCCESS",
    status_description: "Transaction completed successfully. Bank UTR generated.",
    provider_name: "UTKAL DIGITAL",
    provider_txn_id: "297864",
    provider_ref: "623317012637",
    channel: "RETAILER_PORTAL",
  },
  {
    id: "tx-unified-102",
    txn_id: "TXN202616568",
    client_ref_id: "DMT991204",
    service: "DMT",
    type: "IMPS",
    customer_name: "Kavitha Sharma",
    customer_mobile: "9876543210",
    beneficiary_name: "Rajesh Sharma",
    account_number: "XXXX XXXX 5019",
    bank_name: "HDFC Bank",
    ifsc_code: "HDFC0001009",
    amount: 5000.0,
    charges: 15.0,
    commission: 7.5,
    gst_amount: 2.7,
    tds_amount: 0.38,
    net_amount: 5015.0,
    previous_balance: 50885.50,
    cr: 0.0,
    dr: 5015.0,
    current_balance: 45870.50,
    transaction_datetime: "2026-08-21T17:45:00Z",
    status: "SUCCESS",
    status_description: "Funds credited to recipient account.",
    provider_name: "CASHFREE",
    provider_txn_id: "CF_991823",
    provider_ref: "UTR202608219012",
    channel: "RETAILER_PORTAL",
  },
  {
    id: "tx-unified-103",
    txn_id: "TXN202616569",
    client_ref_id: "AEPS77819",
    service: "AEPS",
    type: "CASH_WITHDRAWAL",
    customer_name: "Ramesh Kumar",
    customer_mobile: "9841234567",
    beneficiary_name: "Ramesh Kumar",
    account_number: "Aadhaar XXXX 4412",
    bank_name: "State Bank of India",
    ifsc_code: "SBIN0001234",
    amount: 2000.0,
    charges: 0.0,
    commission: 6.0,
    gst_amount: 0.0,
    tds_amount: 0.30,
    net_amount: 2000.0,
    previous_balance: 45870.50,
    cr: 2006.0,
    dr: 0.0,
    current_balance: 47876.50,
    transaction_datetime: "2026-08-21T16:15:00Z",
    status: "SUCCESS",
    status_description: "AEPS Cash withdrawal completed.",
    provider_name: "PAYSPRINT",
    provider_txn_id: "PS_881293",
    provider_ref: "RRN421590123849",
    channel: "AEPS_TERMINAL",
  },
  {
    id: "tx-unified-104",
    txn_id: "TXN202616570",
    client_ref_id: "UPIQR5501",
    service: "UPI",
    type: "QR_COLLECTION",
    customer_name: "Anand Sundaram",
    customer_mobile: "9884102938",
    beneficiary_name: "Sathus Pay Store",
    account_number: "VPA: pay2pay@upi",
    bank_name: "Axis Bank",
    ifsc_code: "UTIB0000123",
    amount: 1500.0,
    charges: 0.0,
    commission: 0.0,
    gst_amount: 0.0,
    tds_amount: 0.0,
    net_amount: 1500.0,
    previous_balance: 47876.50,
    cr: 1500.0,
    dr: 0.0,
    current_balance: 49376.50,
    transaction_datetime: "2026-08-21T15:20:00Z",
    status: "SUCCESS",
    status_description: "Dynamic QR payment received.",
    provider_name: "SETU UPI",
    provider_txn_id: "SETU_55012",
    provider_ref: "UPI623317012999",
    channel: "DYNAMIC_QR",
  },
  {
    id: "tx-unified-105",
    txn_id: "TXN202616571",
    client_ref_id: "BBPS441029",
    service: "BBPS",
    type: "ELECTRICITY",
    customer_name: "Meenakshi Sundaram",
    customer_mobile: "9444019283",
    beneficiary_name: "TNEB Electricity Board",
    account_number: "Consumer ID: 04928190",
    bank_name: "BBPS NPCI",
    ifsc_code: "NPCI0000001",
    amount: 850.0,
    charges: 0.0,
    commission: 3.50,
    gst_amount: 0.0,
    tds_amount: 0.18,
    net_amount: 850.0,
    previous_balance: 49376.50,
    cr: 3.50,
    dr: 850.0,
    current_balance: 48530.00,
    transaction_datetime: "2026-08-21T14:10:00Z",
    status: "SUCCESS",
    status_description: "Electricity bill paid successfully.",
    provider_name: "BILLDESK BBPS",
    provider_txn_id: "BD_109283",
    provider_ref: "BBPS623317014412",
    channel: "RETAILER_PORTAL",
  },
  {
    id: "tx-unified-106",
    txn_id: "TXN202616572",
    client_ref_id: "RCH882910",
    service: "RECHARGE",
    type: "MOBILE_PREPAID",
    customer_name: "Dinesh Kumar",
    customer_mobile: "9840192837",
    beneficiary_name: "Airtel Prepaid",
    account_number: "Mobile: 9840192837",
    bank_name: "Bharti Airtel",
    ifsc_code: "AIRT0000001",
    amount: 299.0,
    charges: 0.0,
    commission: 7.48,
    gst_amount: 0.0,
    tds_amount: 0.37,
    net_amount: 299.0,
    previous_balance: 48530.00,
    cr: 7.48,
    dr: 299.0,
    current_balance: 48238.48,
    transaction_datetime: "2026-08-21T12:05:00Z",
    status: "SUCCESS",
    status_description: "Prepaid Recharge Success 1.5GB/day 28 Days.",
    provider_name: "EZYPAY",
    provider_txn_id: "EZ_99281",
    provider_ref: "OP8839201992",
    channel: "RETAILER_PORTAL",
  },
  {
    id: "tx-unified-107",
    txn_id: "TXN202616573",
    client_ref_id: "POS771928",
    service: "CARD_TO_CASH",
    type: "POS_SWIPE",
    customer_name: "Karthik Srinivasan",
    customer_mobile: "9790123456",
    beneficiary_name: "Sathus Pay Store",
    account_number: "Card: 4111 XXXX 1111",
    bank_name: "HDFC Bank (Visa Credit)",
    ifsc_code: "HDFC0000001",
    amount: 10000.0,
    charges: 150.0,
    commission: 15.0,
    gst_amount: 27.0,
    tds_amount: 100.0,
    net_amount: 9723.0,
    previous_balance: 48238.48,
    cr: 9723.0,
    dr: 0.0,
    current_balance: 57961.48,
    transaction_datetime: "2026-08-21T10:30:00Z",
    status: "SUCCESS",
    status_description: "Card swipe settlement credited to wallet.",
    provider_name: "MOSAMBEE POS",
    provider_txn_id: "TID1000101",
    provider_ref: "RRN421590123847",
    channel: "POS_MACHINE",
  },
  {
    id: "tx-unified-108",
    txn_id: "TXN202616574",
    client_ref_id: "SETTL88190",
    service: "SETTLEMENT",
    type: "BANK_TRANSFER",
    customer_name: "Sathus Pay Store",
    customer_mobile: "9840192837",
    beneficiary_name: "Sathiya Murthy R",
    account_number: "XXXX XXXX 1569",
    bank_name: "IDBI Bank",
    ifsc_code: "IBKL0000630",
    amount: 15000.0,
    charges: 5.0,
    commission: 0.0,
    gst_amount: 0.90,
    tds_amount: 0.0,
    net_amount: 15005.90,
    previous_balance: 57961.48,
    cr: 0.0,
    dr: 15005.90,
    current_balance: 42955.58,
    transaction_datetime: "2026-08-21T09:00:00Z",
    status: "SUCCESS",
    status_description: "Merchant wallet payout to primary bank account.",
    provider_name: "UTKAL DIGITAL",
    provider_txn_id: "297800",
    provider_ref: "623317009988",
    channel: "RETAILER_PORTAL",
  },
];

const SERVICE_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  PAYOUT: { label: "Payout", bg: "rgba(59, 130, 246, 0.15)", text: "#60A5FA", border: "rgba(59, 130, 246, 0.3)" },
  DMT: { label: "DMT", bg: "rgba(16, 185, 129, 0.15)", text: "#34D399", border: "rgba(16, 185, 129, 0.3)" },
  AEPS: { label: "AEPS", bg: "rgba(245, 158, 11, 0.15)", text: "#FBBF24", border: "rgba(245, 158, 11, 0.3)" },
  UPI: { label: "UPI", bg: "rgba(139, 92, 246, 0.15)", text: "#A78BFA", border: "rgba(139, 92, 246, 0.3)" },
  BBPS: { label: "BBPS", bg: "rgba(236, 72, 153, 0.15)", text: "#F472B6", border: "rgba(236, 72, 153, 0.3)" },
  RECHARGE: { label: "Recharge", bg: "rgba(6, 182, 212, 0.15)", text: "#22D3EE", border: "rgba(6, 182, 212, 0.3)" },
  CARD_TO_CASH: { label: "Card-to-Cash", bg: "rgba(249, 115, 22, 0.15)", text: "#FB923C", border: "rgba(249, 115, 22, 0.3)" },
  SETTLEMENT: { label: "Settlement", bg: "rgba(99, 102, 241, 0.15)", text: "#818CF8", border: "rgba(99, 102, 241, 0.3)" },
  TOPUP: { label: "Topup", bg: "rgba(34, 197, 94, 0.15)", text: "#4ADE80", border: "rgba(34, 197, 94, 0.3)" },
};

export const RetailerTransactionReport: React.FC = () => {
  // State
  const [items, setItems] = useState<TransactionReportItem[]>(SEED_TRANSACTIONS);
  const [summary, setSummary] = useState<TransactionReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Pagination
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [totalRecords, setTotalRecords] = useState<number>(SEED_TRANSACTIONS.length);

  // Filters
  const [globalSearch, setGlobalSearch] = useState<string>("");
  const [serviceFilter, setServiceFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [creditDebitFilter, setCreditDebitFilter] = useState<string>("ALL");
  const [activePreset, setActivePreset] = useState<string>("TODAY");
  const [fromDate, setFromDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [toDate, setToDate] = useState<string>(new Date().toISOString().split("T")[0]);

  // Drawer
  const [selectedTxn, setSelectedTxn] = useState<TransactionReportItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

  // Export Menu
  const [exportAnchorEl, setExportAnchorEl] = useState<HTMLButtonElement | null>(null);

  // Toast / Copy
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMsg, setSnackbarMsg] = useState<string>("");

  const showToast = (msg: string) => {
    setSnackbarMsg(msg);
    setSnackbarOpen(true);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard`);
  };

  // Fetch from backend
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
      });

      if (serviceFilter !== "ALL") params.append("service", serviceFilter);
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (creditDebitFilter !== "ALL") params.append("credit_debit", creditDebitFilter);
      if (fromDate) params.append("from_date", fromDate);
      if (toDate) params.append("to_date", toDate);
      if (globalSearch.trim()) params.append("search", globalSearch.trim());

      const res = await fetch(`${baseUrl}/reports/transactions?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        const rawItems = json.data?.items || json.items || [];
        if (rawItems.length > 0) {
          setItems(rawItems);
          setTotalRecords(json.data?.total || json.total || rawItems.length);
        } else {
          // Fallback to local filter of seeds
          applyLocalFilters();
        }
      } else {
        applyLocalFilters();
      }
    } catch (err) {
      applyLocalFilters();
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [page, rowsPerPage, serviceFilter, statusFilter, creditDebitFilter, fromDate, toDate, globalSearch]);

  const applyLocalFilters = () => {
    let filtered = [...SEED_TRANSACTIONS];

    if (serviceFilter !== "ALL") {
      filtered = filtered.filter((t) => t.service === serviceFilter);
    }
    if (statusFilter !== "ALL") {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }
    if (creditDebitFilter === "CR") {
      filtered = filtered.filter((t) => t.cr > 0);
    } else if (creditDebitFilter === "DR") {
      filtered = filtered.filter((t) => t.dr > 0);
    }
    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.txn_id.toLowerCase().includes(q) ||
          t.client_ref_id.toLowerCase().includes(q) ||
          t.customer_name.toLowerCase().includes(q) ||
          t.customer_mobile.toLowerCase().includes(q) ||
          (t.beneficiary_name && t.beneficiary_name.toLowerCase().includes(q)) ||
          (t.provider_ref && t.provider_ref.toLowerCase().includes(q)) ||
          t.service.toLowerCase().includes(q)
      );
    }

    setItems(filtered);
    setTotalRecords(filtered.length);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Recalculate summary metrics from visible/filtered items
  useEffect(() => {
    const total_txns = items.length;
    const total_vol = items.reduce((acc, t) => acc + (t.amount || 0), 0);
    const total_cr = items.reduce((acc, t) => acc + (t.cr || 0), 0);
    const total_dr = items.reduce((acc, t) => acc + (t.dr || 0), 0);
    const successful = items.filter((t) => t.status === "SUCCESS").length;
    const pending = items.filter((t) => t.status === "PENDING").length;
    const failed = items.filter((t) => t.status === "FAILED" || t.status === "REVERSED").length;
    const reversed = items.filter((t) => t.status === "REVERSED").length;

    setSummary({
      total_transactions: total_txns,
      total_volume: total_vol,
      total_credit: total_cr,
      total_debit: total_dr,
      successful_transactions: successful,
      pending_transactions: pending,
      failed_transactions: failed,
      reversed_transactions: reversed,
    });
  }, [items]);

  const handleDatePreset = (preset: string) => {
    setActivePreset(preset);
    const today = new Date().toISOString().split("T")[0];
    if (preset === "TODAY") {
      setFromDate(today);
      setToDate(today);
    } else if (preset === "YESTERDAY") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split("T")[0];
      setFromDate(yStr);
      setToDate(yStr);
    } else if (preset === "7_DAYS") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setFromDate(d.toISOString().split("T")[0]);
      setToDate(today);
    } else if (preset === "30_DAYS") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setFromDate(d.toISOString().split("T")[0]);
      setToDate(today);
    } else if (preset === "THIS_MONTH") {
      const d = new Date();
      d.setDate(1);
      setFromDate(d.toISOString().split("T")[0]);
      setToDate(today);
    }
  };

  const handleExportCsv = () => {
    const headers = ["Txn ID", "Date", "Service", "Type", "Customer", "Amount (INR)", "Fee", "Margin", "CR", "DR", "Closing Bal", "UTR", "Status"];
    const rows = items.map((t) => [
      t.txn_id,
      t.transaction_datetime,
      t.service,
      t.type,
      t.customer_name,
      t.amount.toFixed(2),
      t.charges.toFixed(2),
      t.commission.toFixed(2),
      t.cr.toFixed(2),
      t.dr.toFixed(2),
      t.current_balance.toFixed(2),
      t.provider_ref || "--",
      t.status,
    ]);

    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Transactions_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportAnchorEl(null);
    showToast("CSV report exported successfully.");
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 }, bgcolor: "#0B132B", minHeight: "100vh", color: "#F8FAFC" }}>
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 1.5 }}>
            <TrendingUpIcon sx={{ color: "#3B82F6", fontSize: 28 }} />
            Transaction Report
          </Typography>
          <Typography variant="body2" sx={{ color: "#94A3B8", mt: 0.5 }}>
            Unified audit ledger across all services: DMT, Payout, AEPS, UPI, Recharge, BBPS &amp; Card-to-Cash
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon className={isRefreshing ? "animate-spin" : ""} />}
            onClick={() => {
              setIsRefreshing(true);
              fetchData();
            }}
            sx={{
              borderColor: "#1E293B",
              bgcolor: "#111827",
              color: "#94A3B8",
              textTransform: "none",
              borderRadius: "10px",
              fontWeight: 600,
              "&:hover": { borderColor: "#3B82F6", color: "#FFFFFF", bgcolor: "#1E293B" },
            }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<FileDownloadIcon />}
            endIcon={<ArrowDropDownIcon />}
            onClick={(e) => setExportAnchorEl(e.currentTarget)}
            sx={{
              bgcolor: "#2563EB",
              color: "#FFFFFF",
              textTransform: "none",
              borderRadius: "10px",
              fontWeight: 700,
              boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)",
              "&:hover": { bgcolor: "#1D4ED8" },
            }}
          >
            Export
          </Button>
          <Menu
            anchorEl={exportAnchorEl}
            open={Boolean(exportAnchorEl)}
            onClose={() => setExportAnchorEl(null)}
            PaperProps={{
              sx: { bgcolor: "#1E293B", color: "#FFFFFF", borderRadius: "12px", border: "1px solid #334155", mt: 1 },
            }}
          >
            <MenuItem onClick={handleExportCsv} sx={{ fontSize: "13px", fontWeight: 600, gap: 1.5, py: 1 }}>
              <TableChartIcon fontSize="small" sx={{ color: "#34D399" }} /> Export CSV
            </MenuItem>
            <MenuItem onClick={handleExportCsv} sx={{ fontSize: "13px", fontWeight: 600, gap: 1.5, py: 1 }}>
              <InsertDriveFileIcon fontSize="small" sx={{ color: "#60A5FA" }} /> Export Excel (.xlsx)
            </MenuItem>
            <MenuItem onClick={() => window.print()} sx={{ fontSize: "13px", fontWeight: 600, gap: 1.5, py: 1 }}>
              <PrintIcon fontSize="small" sx={{ color: "#FBBF24" }} /> Print Report
            </MenuItem>
          </Menu>
        </Stack>
      </Stack>

      {/* ── Summary KPI Cards ─────────────────────────────────────────────────── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
          gap: 2,
          mb: 3,
        }}
      >
        {/* Card 1: Total Volume */}
        <Paper
          sx={{
            p: 2,
            borderRadius: "16px",
            bgcolor: "rgba(17, 24, 39, 0.7)",
            border: "1px solid #1E293B",
            backdropFilter: "blur(12px)",
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Total Volume
            </Typography>
            <AccountBalanceWalletIcon sx={{ color: "#60A5FA", fontSize: 18 }} />
          </Stack>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "#FFFFFF", fontFamily: "monospace" }}>
            ₹{(summary?.total_volume || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </Typography>
          <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600 }}>
            {summary?.total_transactions || 0} Transactions
          </Typography>
        </Paper>

        {/* Card 2: Total Credits */}
        <Paper
          sx={{
            p: 2,
            borderRadius: "16px",
            bgcolor: "rgba(17, 24, 39, 0.7)",
            border: "1px solid #1E293B",
            backdropFilter: "blur(12px)",
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ color: "#34D399", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Total Credit (CR)
            </Typography>
            <ArrowDownwardIcon sx={{ color: "#34D399", fontSize: 18 }} />
          </Stack>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "#34D399", fontFamily: "monospace" }}>
            +₹{(summary?.total_credit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </Typography>
          <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600 }}>
            Wallet Inflow &amp; Cash-in
          </Typography>
        </Paper>

        {/* Card 3: Total Debits */}
        <Paper
          sx={{
            p: 2,
            borderRadius: "16px",
            bgcolor: "rgba(17, 24, 39, 0.7)",
            border: "1px solid #1E293B",
            backdropFilter: "blur(12px)",
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ color: "#F87171", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Total Debit (DR)
            </Typography>
            <ArrowUpwardIcon sx={{ color: "#F87171", fontSize: 18 }} />
          </Stack>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "#F87171", fontFamily: "monospace" }}>
            -₹{(summary?.total_debit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </Typography>
          <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600 }}>
            Transfers &amp; Payments
          </Typography>
        </Paper>

        {/* Card 4: Success / Completed */}
        <Paper
          sx={{
            p: 2,
            borderRadius: "16px",
            bgcolor: "rgba(17, 24, 39, 0.7)",
            border: "1px solid #1E293B",
            backdropFilter: "blur(12px)",
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ color: "#60A5FA", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Success Rate
            </Typography>
            <CheckCircleIcon sx={{ color: "#60A5FA", fontSize: 18 }} />
          </Stack>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "#FFFFFF", fontFamily: "monospace" }}>
            {summary?.total_transactions ? Math.round(((summary.successful_transactions || 0) / summary.total_transactions) * 100) : 100}%
          </Typography>
          <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600 }}>
            {summary?.successful_transactions || 0} Successful • {summary?.pending_transactions || 0} Pending
          </Typography>
        </Paper>
      </Box>

      {/* ── Filter Toolbar ────────────────────────────────────────────────────── */}
      <Paper
        sx={{
          p: 2.5,
          borderRadius: "18px",
          bgcolor: "rgba(17, 24, 39, 0.75)",
          border: "1px solid #1E293B",
          backdropFilter: "blur(16px)",
          mb: 3,
        }}
      >
        <Stack spacing={2}>
          {/* Row 1: Search & Date Presets */}
          <Stack direction={{ xs: "column", lg: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "stretch", lg: "center" }}>
            {/* Search Input */}
            <TextField
              placeholder="Search by Txn ID, Customer, Recipient, UTR, Service..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              size="small"
              sx={{
                flexGrow: 1,
                "& .MuiOutlinedInput-root": {
                  bgcolor: "#0F172A",
                  borderRadius: "12px",
                  color: "#FFFFFF",
                  "& fieldset": { borderColor: "#1E293B" },
                  "&:hover fieldset": { borderColor: "#3B82F6" },
                  "&.Mui-focused fieldset": { borderColor: "#3B82F6" },
                },
                "& input::placeholder": { color: "#64748B", opacity: 1 },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#64748B" }} />
                  </InputAdornment>
                ),
                endAdornment: globalSearch ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setGlobalSearch("")} sx={{ color: "#64748B" }}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />

            {/* Quick Date Presets */}
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 0.5 }}>
              {[
                { id: "TODAY", label: "Today" },
                { id: "YESTERDAY", label: "Yesterday" },
                { id: "7_DAYS", label: "7 Days" },
                { id: "30_DAYS", label: "30 Days" },
                { id: "THIS_MONTH", label: "This Month" },
              ].map((p) => (
                <Button
                  key={p.id}
                  size="small"
                  onClick={() => handleDatePreset(p.id)}
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: "12px",
                    px: 1.8,
                    py: 0.7,
                    borderRadius: "10px",
                    bgcolor: activePreset === p.id ? "#2563EB" : "#0F172A",
                    color: activePreset === p.id ? "#FFFFFF" : "#94A3B8",
                    border: `1px solid ${activePreset === p.id ? "#2563EB" : "#1E293B"}`,
                    "&:hover": { bgcolor: activePreset === p.id ? "#1D4ED8" : "#1E293B", color: "#FFFFFF" },
                  }}
                >
                  {p.label}
                </Button>
              ))}
            </Stack>
          </Stack>

          {/* Row 2: Service & Status Dropdowns */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
            {/* Service Filter */}
            <FormControl size="small" sx={{ minWidth: 160, flexGrow: { xs: 1, sm: 0 } }}>
              <Select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                sx={{
                  bgcolor: "#0F172A",
                  color: "#FFFFFF",
                  borderRadius: "12px",
                  fontSize: "13px",
                  fontWeight: 600,
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: "#1E293B" },
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#3B82F6" },
                  "& .MuiSvgIcon-root": { color: "#64748B" },
                }}
              >
                <MenuItem value="ALL">All Services</MenuItem>
                <MenuItem value="PAYOUT">Payout</MenuItem>
                <MenuItem value="DMT">DMT Transfer</MenuItem>
                <MenuItem value="AEPS">AEPS Cash Out</MenuItem>
                <MenuItem value="UPI">UPI Payments</MenuItem>
                <MenuItem value="BBPS">BBPS Bill Payment</MenuItem>
                <MenuItem value="RECHARGE">Recharge</MenuItem>
                <MenuItem value="CARD_TO_CASH">Card-to-Cash (POS)</MenuItem>
                <MenuItem value="SETTLEMENT">Settlement</MenuItem>
              </Select>
            </FormControl>

            {/* Status Filter */}
            <FormControl size="small" sx={{ minWidth: 140, flexGrow: { xs: 1, sm: 0 } }}>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{
                  bgcolor: "#0F172A",
                  color: "#FFFFFF",
                  borderRadius: "12px",
                  fontSize: "13px",
                  fontWeight: 600,
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: "#1E293B" },
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#3B82F6" },
                  "& .MuiSvgIcon-root": { color: "#64748B" },
                }}
              >
                <MenuItem value="ALL">All Statuses</MenuItem>
                <MenuItem value="SUCCESS">Success</MenuItem>
                <MenuItem value="PENDING">Pending</MenuItem>
                <MenuItem value="FAILED">Failed</MenuItem>
                <MenuItem value="REVERSED">Reversed</MenuItem>
              </Select>
            </FormControl>

            {/* Credit/Debit Filter */}
            <FormControl size="small" sx={{ minWidth: 140, flexGrow: { xs: 1, sm: 0 } }}>
              <Select
                value={creditDebitFilter}
                onChange={(e) => setCreditDebitFilter(e.target.value)}
                sx={{
                  bgcolor: "#0F172A",
                  color: "#FFFFFF",
                  borderRadius: "12px",
                  fontSize: "13px",
                  fontWeight: 600,
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: "#1E293B" },
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#3B82F6" },
                  "& .MuiSvgIcon-root": { color: "#64748B" },
                }}
              >
                <MenuItem value="ALL">All Entries (CR &amp; DR)</MenuItem>
                <MenuItem value="CR">Credit Only (+CR)</MenuItem>
                <MenuItem value="DR">Debit Only (-DR)</MenuItem>
              </Select>
            </FormControl>

            {/* Reset Filters */}
            {(serviceFilter !== "ALL" || statusFilter !== "ALL" || creditDebitFilter !== "ALL" || globalSearch) && (
              <Button
                size="small"
                onClick={() => {
                  setServiceFilter("ALL");
                  setStatusFilter("ALL");
                  setCreditDebitFilter("ALL");
                  setGlobalSearch("");
                  handleDatePreset("TODAY");
                }}
                sx={{
                  color: "#F87171",
                  fontSize: "12px",
                  fontWeight: 700,
                  textTransform: "none",
                  "&:hover": { bgcolor: "rgba(248, 113, 113, 0.1)" },
                }}
              >
                Reset Filters
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* ── Transaction Data Grid ─────────────────────────────────────────────── */}
      <Paper
        sx={{
          borderRadius: "18px",
          bgcolor: "rgba(17, 24, 39, 0.75)",
          border: "1px solid #1E293B",
          overflow: "hidden",
          backdropFilter: "blur(16px)",
        }}
      >
        <TableContainer>
          <Table sx={{ minWidth: 1000 }} size="small">
            <TableHead sx={{ bgcolor: "#0F172A" }}>
              <TableRow>
                <TableCell sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "11px", letterSpacing: "0.05em", textTransform: "uppercase", py: 1.8 }}>
                  Txn ID
                </TableCell>
                <TableCell sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "11px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Date &amp; Time
                </TableCell>
                <TableCell sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "11px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Service
                </TableCell>
                <TableCell sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "11px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Customer / Recipient
                </TableCell>
                <TableCell align="right" sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "11px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Amount (₹)
                </TableCell>
                <TableCell align="right" sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "11px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  CR / DR
                </TableCell>
                <TableCell align="right" sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "11px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Closing Bal (₹)
                </TableCell>
                <TableCell sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "11px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  UTR / RRN
                </TableCell>
                <TableCell align="center" sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "11px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Status
                </TableCell>
                <TableCell align="center" sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "11px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Action
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    {Array.from({ length: 10 }).map((_, cIdx) => (
                      <TableCell key={cIdx} sx={{ py: 2 }}>
                        <Skeleton variant="text" sx={{ bgcolor: "#1E293B" }} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 8 }}>
                    <Stack alignItems="center" spacing={1.5}>
                      <ReceiptIcon sx={{ fontSize: 48, color: "#334155" }} />
                      <Typography variant="body1" sx={{ color: "#94A3B8", fontWeight: 600 }}>
                        No transactions found for the selected filters.
                      </Typography>
                      <Button
                        size="small"
                        onClick={() => {
                          setServiceFilter("ALL");
                          setStatusFilter("ALL");
                          setCreditDebitFilter("ALL");
                          setGlobalSearch("");
                          handleDatePreset("30_DAYS");
                        }}
                        sx={{ color: "#3B82F6", textTransform: "none", fontWeight: 700 }}
                      >
                        Clear Filters
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => {
                  const badge = SERVICE_BADGES[row.service] || { label: row.service, bg: "#1E293B", text: "#94A3B8", border: "#334155" };
                  return (
                    <TableRow
                      key={row.id || row.txn_id}
                      hover
                      sx={{
                        "&:hover": { bgcolor: "rgba(30, 41, 59, 0.5) !important" },
                        borderBottom: "1px solid #1E293B",
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        setSelectedTxn(row);
                        setDrawerOpen(true);
                      }}
                    >
                      {/* Txn ID */}
                      <TableCell sx={{ py: 1.8 }}>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 800, color: "#60A5FA", fontSize: "12px" }}>
                            {row.txn_id}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(row.txn_id, "Transaction ID");
                            }}
                            sx={{ color: "#64748B", p: 0.3, "&:hover": { color: "#FFFFFF" } }}
                          >
                            <ContentCopyIcon sx={{ fontSize: 13 }} />
                          </IconButton>
                        </Stack>
                        <Typography variant="caption" sx={{ color: "#64748B", fontSize: "10px", display: "block" }}>
                          {row.client_ref_id}
                        </Typography>
                      </TableCell>

                      {/* Date & Time */}
                      <TableCell>
                        <Typography variant="body2" sx={{ color: "#E2E8F0", fontSize: "12px", fontWeight: 600 }}>
                          {new Date(row.transaction_datetime).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#64748B", fontSize: "11px" }}>
                          {new Date(row.transaction_datetime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </Typography>
                      </TableCell>

                      {/* Service */}
                      <TableCell>
                        <Chip
                          label={badge.label}
                          size="small"
                          sx={{
                            bgcolor: badge.bg,
                            color: badge.text,
                            border: `1px solid ${badge.border}`,
                            fontWeight: 800,
                            fontSize: "11px",
                            height: "24px",
                          }}
                        />
                        <Typography variant="caption" sx={{ color: "#64748B", fontSize: "10px", display: "block", mt: 0.5 }}>
                          {row.type}
                        </Typography>
                      </TableCell>

                      {/* Customer / Recipient */}
                      <TableCell>
                        <Typography variant="body2" sx={{ color: "#FFFFFF", fontWeight: 700, fontSize: "12px" }}>
                          {row.beneficiary_name || row.customer_name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px" }}>
                          {row.bank_name ? `${row.bank_name} (${row.account_number})` : row.customer_mobile}
                        </Typography>
                      </TableCell>

                      {/* Amount */}
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 800, color: "#FFFFFF", fontSize: "13px" }}>
                          ₹{row.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </Typography>
                        {row.charges > 0 && (
                          <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "10px" }}>
                            Fee: ₹{row.charges.toFixed(2)}
                          </Typography>
                        )}
                      </TableCell>

                      {/* CR / DR */}
                      <TableCell align="right">
                        {row.cr > 0 ? (
                          <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 800, color: "#34D399", fontSize: "12px" }}>
                            +₹{row.cr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </Typography>
                        ) : (
                          <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 800, color: "#F87171", fontSize: "12px" }}>
                            -₹{row.dr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Closing Balance */}
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700, color: "#CBD5E1", fontSize: "12px" }}>
                          ₹{row.current_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>

                      {/* UTR / RRN */}
                      <TableCell>
                        {row.provider_ref ? (
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 700, color: "#E2E8F0" }}>
                              {row.provider_ref}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(row.provider_ref || "", "UTR / Reference");
                              }}
                              sx={{ color: "#64748B", p: 0.3 }}
                            >
                              <ContentCopyIcon sx={{ fontSize: 12 }} />
                            </IconButton>
                          </Stack>
                        ) : (
                          <Typography variant="caption" sx={{ color: "#64748B" }}>
                            --
                          </Typography>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell align="center">
                        <Chip
                          label={row.status}
                          size="small"
                          icon={row.status === "SUCCESS" ? <CheckCircleIcon sx={{ fontSize: "14px !important", color: "#10B981 !important" }} /> : <AccessTimeIcon sx={{ fontSize: "14px !important", color: "#F59E0B !important" }} />}
                          sx={{
                            bgcolor: row.status === "SUCCESS" ? "rgba(16, 185, 129, 0.15)" : row.status === "PENDING" ? "rgba(245, 158, 11, 0.15)" : "rgba(239, 68, 68, 0.15)",
                            color: row.status === "SUCCESS" ? "#34D399" : row.status === "PENDING" ? "#FBBF24" : "#F87171",
                            border: `1px solid ${row.status === "SUCCESS" ? "rgba(16, 185, 129, 0.3)" : row.status === "PENDING" ? "rgba(245, 158, 11, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                            fontWeight: 800,
                            fontSize: "11px",
                          }}
                        />
                      </TableCell>

                      {/* Action */}
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTxn(row);
                            setDrawerOpen(true);
                          }}
                          sx={{ color: "#60A5FA", "&:hover": { bgcolor: "rgba(59, 130, 246, 0.15)" } }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
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
            borderTop: "1px solid #1E293B",
            ".MuiTablePagination-selectIcon": { color: "#94A3B8" },
          }}
        />
      </Paper>

      {/* ── Transaction Detail Drawer ─────────────────────────────────────────── */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 480 },
            bgcolor: "#0F172A",
            color: "#FFFFFF",
            borderLeft: "1px solid #1E293B",
            p: 3,
          },
        }}
      >
        {selectedTxn && (
          <Box>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#FFFFFF" }}>
                Transaction Details
              </Typography>
              <IconButton onClick={() => setDrawerOpen(false)} sx={{ color: "#94A3B8" }}>
                <CloseIcon />
              </IconButton>
            </Stack>

            {/* Status Hero */}
            <Paper
              sx={{
                p: 2.5,
                borderRadius: "16px",
                bgcolor: selectedTxn.status === "SUCCESS" ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                border: `1px solid ${selectedTxn.status === "SUCCESS" ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                textAlign: "center",
                mb: 3,
              }}
            >
              <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>
                {selectedTxn.service} • {selectedTxn.type}
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, color: "#FFFFFF", my: 1, fontFamily: "monospace" }}>
                ₹{selectedTxn.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </Typography>
              <Chip
                label={selectedTxn.status}
                size="small"
                sx={{
                  bgcolor: selectedTxn.status === "SUCCESS" ? "#10B981" : "#F59E0B",
                  color: "#FFFFFF",
                  fontWeight: 800,
                  fontSize: "12px",
                }}
              />
            </Paper>

            {/* Overview Section */}
            <Typography variant="subtitle2" sx={{ color: "#60A5FA", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", mb: 1.5 }}>
              Overview
            </Typography>
            <Stack spacing={1.2} sx={{ mb: 3 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" sx={{ color: "#94A3B8" }}>Transaction ID</Typography>
                <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700 }}>{selectedTxn.txn_id}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" sx={{ color: "#94A3B8" }}>Client Ref ID</Typography>
                <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700 }}>{selectedTxn.client_ref_id}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" sx={{ color: "#94A3B8" }}>Date &amp; Time</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{new Date(selectedTxn.transaction_datetime).toLocaleString("en-IN")}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" sx={{ color: "#94A3B8" }}>Bank UTR / Ref</Typography>
                <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700, color: "#34D399" }}>{selectedTxn.provider_ref || "--"}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" sx={{ color: "#94A3B8" }}>Gateway / Provider</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedTxn.provider_name || "PAY2PAY SWITCH"}</Typography>
              </Stack>
            </Stack>

            <Divider sx={{ borderColor: "#1E293B", my: 2 }} />

            {/* Recipient Details */}
            <Typography variant="subtitle2" sx={{ color: "#60A5FA", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", mb: 1.5 }}>
              Party &amp; Account
            </Typography>
            <Stack spacing={1.2} sx={{ mb: 3 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" sx={{ color: "#94A3B8" }}>Customer Name</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedTxn.customer_name}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" sx={{ color: "#94A3B8" }}>Mobile Number</Typography>
                <Typography variant="body2" sx={{ fontFamily: "monospace" }}>{selectedTxn.customer_mobile}</Typography>
              </Stack>
              {selectedTxn.beneficiary_name && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ color: "#94A3B8" }}>Beneficiary</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedTxn.beneficiary_name}</Typography>
                </Stack>
              )}
              {selectedTxn.account_number && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ color: "#94A3B8" }}>Account / VPA</Typography>
                  <Typography variant="body2" sx={{ fontFamily: "monospace" }}>{selectedTxn.account_number}</Typography>
                </Stack>
              )}
              {selectedTxn.bank_name && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ color: "#94A3B8" }}>Bank &amp; IFSC</Typography>
                  <Typography variant="body2">{selectedTxn.bank_name} ({selectedTxn.ifsc_code})</Typography>
                </Stack>
              )}
            </Stack>

            <Divider sx={{ borderColor: "#1E293B", my: 2 }} />

            {/* Financial Ledger Movement */}
            <Typography variant="subtitle2" sx={{ color: "#60A5FA", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", mb: 1.5 }}>
              Ledger Balance Movement
            </Typography>
            <Paper sx={{ p: 2, borderRadius: "12px", bgcolor: "#111827", border: "1px solid #1E293B", mb: 3 }}>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ color: "#94A3B8" }}>Previous Balance</Typography>
                  <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
                    ₹{selectedTxn.previous_balance.toFixed(2)}
                  </Typography>
                </Stack>
                {selectedTxn.cr > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" sx={{ color: "#34D399" }}>Credit Inflow (+)</Typography>
                    <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 800, color: "#34D399" }}>
                      +₹{selectedTxn.cr.toFixed(2)}
                    </Typography>
                  </Stack>
                )}
                {selectedTxn.dr > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" sx={{ color: "#F87171" }}>Debit Outflow (-)</Typography>
                    <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 800, color: "#F87171" }}>
                      -₹{selectedTxn.dr.toFixed(2)}
                    </Typography>
                  </Stack>
                )}
                {selectedTxn.charges > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" sx={{ color: "#94A3B8" }}>Convenience Fee</Typography>
                    <Typography variant="body2" sx={{ fontFamily: "monospace" }}>₹{selectedTxn.charges.toFixed(2)}</Typography>
                  </Stack>
                )}
                {selectedTxn.commission > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" sx={{ color: "#34D399" }}>Retailer Margin</Typography>
                    <Typography variant="body2" sx={{ fontFamily: "monospace", color: "#34D399", fontWeight: 700 }}>
                      +₹{selectedTxn.commission.toFixed(2)}
                    </Typography>
                  </Stack>
                )}
                <Divider sx={{ borderColor: "#1E293B", my: 0.5 }} />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ fontWeight: 800, color: "#FFFFFF" }}>Closing Balance</Typography>
                  <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 900, color: "#60A5FA" }}>
                    ₹{selectedTxn.current_balance.toFixed(2)}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>

            {/* Actions */}
            <Stack direction="row" spacing={1.5}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={() => window.print()}
                sx={{
                  bgcolor: "#2563EB",
                  color: "#FFFFFF",
                  fontWeight: 700,
                  borderRadius: "10px",
                  "&:hover": { bgcolor: "#1D4ED8" },
                }}
              >
                Print Slip
              </Button>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<ShareIcon />}
                onClick={() => {
                  copyToClipboard(
                    `Transaction Slip\nTxn ID: ${selectedTxn.txn_id}\nAmount: ₹${selectedTxn.amount}\nService: ${selectedTxn.service}\nUTR: ${selectedTxn.provider_ref || "N/A"}\nStatus: ${selectedTxn.status}`,
                    "Transaction details"
                  );
                }}
                sx={{
                  borderColor: "#1E293B",
                  color: "#94A3B8",
                  fontWeight: 700,
                  borderRadius: "10px",
                  "&:hover": { borderColor: "#3B82F6", color: "#FFFFFF" },
                }}
              >
                Share
              </Button>
            </Stack>
          </Box>
        )}
      </Drawer>

      {/* Snackbar */}
      <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={() => setSnackbarOpen(false)}>
        <Alert severity="success" sx={{ bgcolor: "#10B981", color: "#FFFFFF", fontWeight: 600 }}>
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
};
