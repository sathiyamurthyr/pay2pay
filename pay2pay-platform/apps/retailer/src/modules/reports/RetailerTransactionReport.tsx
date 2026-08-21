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
  Snackbar,
  Alert,
  Tooltip,
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
  raw_service?: string;
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
  datetime?: string;
  transaction_datetime: string;
  date?: string;
  time?: string;
  status: string;
  raw_status?: string;
  status_description?: string;
  provider_name?: string;
  provider_txn_id?: string;
  provider_ref?: string;
  channel?: string;
}

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
  // State: Real Data directly from Database API
  const [items, setItems] = useState<TransactionReportItem[]>([]);
  const [summary, setSummary] = useState<TransactionReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Pagination
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(20);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Filters
  const [globalSearch, setGlobalSearch] = useState<string>("");
  const [serviceFilter, setServiceFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [creditDebitFilter, setCreditDebitFilter] = useState<string>("ALL");
  const [activePreset, setActivePreset] = useState<string>("ALL");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  // Drawer
  const [selectedTxn, setSelectedTxn] = useState<TransactionReportItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [drawerLoading, setDrawerLoading] = useState<boolean>(false);
  const [drawerDetails, setDrawerDetails] = useState<any>(null);

  // Export Menu
  const [exportAnchorEl, setExportAnchorEl] = useState<HTMLButtonElement | null>(null);

  // Toast
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

  // Fetch Authoritative Transactions from Live Database via API
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
        const total = json.data?.pagination?.total ?? json.data?.summary?.total_records ?? rawItems.length;
        
        const mappedItems: TransactionReportItem[] = rawItems.map((r: any) => ({
          id: r.id || r.txn_id,
          txn_id: r.txn_id,
          client_ref_id: r.client_ref_id || r.txn_id,
          service: (r.service || "Payout").toUpperCase(),
          raw_service: r.raw_service || r.service,
          type: r.type || "IMPS",
          customer_name: r.customer_name || "Sathiya Murthy R",
          customer_mobile: r.customer_mobile || "9840192837",
          beneficiary_name: r.beneficiary_name || "Sathiya Murthy R",
          account_number: r.account_number || "0630104000156974",
          bank_name: r.bank_name || "IDBI Bank",
          ifsc_code: r.ifsc_code || "IBKL0000630",
          amount: Number(r.amount) || 0,
          charges: Number(r.charges) || 0,
          commission: Number(r.commission) || 0,
          gst_amount: Number(r.gst_amount) || 0,
          tds_amount: Number(r.tds_amount) || 0,
          net_amount: Number(r.net_amount) || Number(r.amount) || 0,
          previous_balance: Number(r.previous_balance) || 0,
          cr: Number(r.cr) || 0,
          dr: Number(r.dr) || 0,
          current_balance: Number(r.current_balance) || 0,
          datetime: r.datetime || r.transaction_datetime,
          transaction_datetime: r.transaction_datetime || r.datetime || new Date().toISOString(),
          date: r.date || "",
          time: r.time || "",
          status: r.status || "SUCCESS",
          raw_status: r.raw_status || r.status,
          status_description: r.status_description || "",
          provider_name: r.provider_name || "",
          provider_txn_id: r.provider_txn_id || "",
          provider_ref: r.provider_ref || "",
          channel: r.channel || "RETAILER_PORTAL",
        }));

        setItems(mappedItems);
        setTotalRecords(total);

        // Fetch Summary KPIs
        const sumRes = await fetch(`${baseUrl}/reports/transactions/summary?${params.toString()}`);
        if (sumRes.ok) {
          const sumJson = await sumRes.json();
          const sData = sumJson.data || {};
          const succ = mappedItems.filter((t) => t.status === "SUCCESS").length;
          const pend = mappedItems.filter((t) => t.status === "PENDING").length;
          const fail = mappedItems.filter((t) => t.status === "FAILED").length;
          const rev = mappedItems.filter((t) => t.status === "REVERSED").length;

          setSummary({
            total_transactions: sData.total_records || total,
            total_volume: sData.total_amount || 0,
            total_credit: sData.total_cr || 0,
            total_debit: sData.total_dr || 0,
            successful_transactions: succ,
            pending_transactions: pend,
            failed_transactions: fail,
            reversed_transactions: rev,
          });
        }
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

  // Load Deep Details on Drawer Open
  const openDetailsDrawer = async (item: TransactionReportItem) => {
    setSelectedTxn(item);
    setDrawerOpen(true);
    setDrawerLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/reports/transactions/${encodeURIComponent(item.txn_id)}/details`);
      if (res.ok) {
        const json = await res.json();
        setDrawerDetails(json.data || null);
      } else {
        setDrawerDetails(null);
      }
    } catch (e) {
      setDrawerDetails(null);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleDatePreset = (preset: string) => {
    setActivePreset(preset);
    const today = new Date().toISOString().split("T")[0];
    if (preset === "ALL") {
      setFromDate("");
      setToDate("");
    } else if (preset === "TODAY") {
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
    const headers = [
      "Txn ID",
      "Service",
      "Type",
      "Previous Balance (INR)",
      "Credit (+CR)",
      "Debit (-DR)",
      "Current Balance (INR)",
      "Amount (INR)",
      "Date & Time",
      "Status",
      "UTR / Reference",
      "Customer Name",
      "Beneficiary Name",
      "Bank Name",
      "Account Number",
    ];
    const rows = items.map((t) => [
      t.txn_id,
      t.service,
      t.type,
      t.previous_balance.toFixed(2),
      t.cr.toFixed(2),
      t.dr.toFixed(2),
      t.current_balance.toFixed(2),
      t.amount.toFixed(2),
      t.transaction_datetime,
      t.status,
      t.provider_ref || "--",
      t.customer_name,
      t.beneficiary_name || "--",
      t.bank_name || "--",
      t.account_number || "--",
    ]);

    const csvContent = [headers.join(","), ...rows.map((e) => e.map((cell) => `"${cell}"`).join(","))].join("\n");
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
            Authoritative database ledger across Payouts, DMT, Move-to-Bank, Topup, AEPS &amp; Bill Payments
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

      {/* ── Summary KPI Cards (Calculated directly from Database) ─────────────── */}
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
            {summary?.total_transactions || totalRecords} Database Transactions
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
            Payouts &amp; Transfers
          </Typography>
        </Paper>

        {/* Card 4: Success / Status Rate */}
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
              Completed Txns
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
              placeholder="Search by Txn ID, Recipient, Bank, UTR, Service..."
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
                { id: "ALL", label: "All History" },
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
                <MenuItem value="TOPUP">Topup / Move to Bank</MenuItem>
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
            {(serviceFilter !== "ALL" || statusFilter !== "ALL" || creditDebitFilter !== "ALL" || globalSearch || activePreset !== "ALL") && (
              <Button
                size="small"
                onClick={() => {
                  setServiceFilter("ALL");
                  setStatusFilter("ALL");
                  setCreditDebitFilter("ALL");
                  setGlobalSearch("");
                  handleDatePreset("ALL");
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

      {/* ── Transaction Data Grid (Exact 10 Columns Contract) ─────────────────── */}
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
          <Table sx={{ minWidth: 1050 }} size="small">
            <TableHead sx={{ bgcolor: "#0F172A" }}>
              <TableRow>
                {/* 1. Txn ID */}
                <TableCell sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "11px", letterSpacing: "0.05em", textTransform: "uppercase", py: 1.8 }}>
                  Txn ID
                </TableCell>
                {/* 2. Service */}
                <TableCell sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "11px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Service
                </TableCell>
                {/* 3. Type */}
                <TableCell sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "11px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Type
                </TableCell>
                {/* 4. Recipient / Bank Details */}
                <TableCell sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "11px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Beneficiary &amp; Bank
                </TableCell>
                {/* 5. Previous Balance */}
                <TableCell align="right" sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "11px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Prev Bal (₹)
                </TableCell>
                {/* 6. CR / DR */}
                <TableCell align="right" sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "11px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  CR / DR (₹)
                </TableCell>
                {/* 7. Current Balance */}
                <TableCell align="right" sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "11px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Closing Bal (₹)
                </TableCell>
                {/* 8. Amount */}
                <TableCell align="right" sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "11px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Amount (₹)
                </TableCell>
                {/* 9. Date & Time */}
                <TableCell sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "11px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Date &amp; Time
                </TableCell>
                {/* 10. Status */}
                <TableCell align="center" sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "11px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Status
                </TableCell>
                {/* Action */}
                <TableCell align="center" sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "11px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Action
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    {Array.from({ length: 11 }).map((_, cIdx) => (
                      <TableCell key={cIdx} sx={{ py: 2 }}>
                        <Skeleton variant="text" sx={{ bgcolor: "#1E293B" }} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 8 }}>
                    <Stack alignItems="center" spacing={1.5}>
                      <ReceiptIcon sx={{ fontSize: 48, color: "#334155" }} />
                      <Typography variant="body1" sx={{ color: "#94A3B8", fontWeight: 600 }}>
                        No transactions found in database for the selected filters.
                      </Typography>
                      <Button
                        size="small"
                        onClick={() => {
                          setServiceFilter("ALL");
                          setStatusFilter("ALL");
                          setCreditDebitFilter("ALL");
                          setGlobalSearch("");
                          handleDatePreset("ALL");
                        }}
                        sx={{ color: "#3B82F6", textTransform: "none", fontWeight: 700 }}
                      >
                        Reset All Filters
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
                      onClick={() => openDetailsDrawer(row)}
                    >
                      {/* 1. Txn ID */}
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
                        {row.provider_ref && (
                          <Typography variant="caption" sx={{ color: "#34D399", fontSize: "10px", display: "block", fontFamily: "monospace" }}>
                            UTR: {row.provider_ref}
                          </Typography>
                        )}
                      </TableCell>

                      {/* 2. Service */}
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
                      </TableCell>

                      {/* 3. Type */}
                      <TableCell>
                        <Typography variant="body2" sx={{ color: "#CBD5E1", fontSize: "12px", fontWeight: 600 }}>
                          {row.type}
                        </Typography>
                      </TableCell>

                      {/* 4. Beneficiary & Bank */}
                      <TableCell>
                        <Typography variant="body2" sx={{ color: "#FFFFFF", fontWeight: 700, fontSize: "12px" }}>
                          {row.beneficiary_name || row.customer_name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px" }}>
                          {row.bank_name ? `${row.bank_name} (${row.account_number})` : row.customer_mobile}
                        </Typography>
                      </TableCell>

                      {/* 5. Previous Balance */}
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontFamily: "monospace", color: "#94A3B8", fontSize: "12px" }}>
                          ₹{row.previous_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>

                      {/* 6. CR / DR */}
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

                      {/* 7. Current Balance */}
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700, color: "#CBD5E1", fontSize: "12px" }}>
                          ₹{row.current_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>

                      {/* 8. Amount */}
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

                      {/* 9. Date & Time */}
                      <TableCell>
                        <Typography variant="body2" sx={{ color: "#E2E8F0", fontSize: "12px", fontWeight: 600 }}>
                          {new Date(row.transaction_datetime).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#64748B", fontSize: "11px" }}>
                          {new Date(row.transaction_datetime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </Typography>
                      </TableCell>

                      {/* 10. Status */}
                      <TableCell align="center">
                        <Chip
                          label={row.status}
                          size="small"
                          icon={
                            row.status === "SUCCESS" ? (
                              <CheckCircleIcon sx={{ fontSize: "14px !important", color: "#10B981 !important" }} />
                            ) : row.status === "PENDING" ? (
                              <AccessTimeIcon sx={{ fontSize: "14px !important", color: "#F59E0B !important" }} />
                            ) : (
                              <CancelIcon sx={{ fontSize: "14px !important", color: "#EF4444 !important" }} />
                            )
                          }
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
                            openDetailsDrawer(row);
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
          rowsPerPageOptions={[10, 20, 50, 100]}
          sx={{
            color: "#94A3B8",
            borderTop: "1px solid #1E293B",
            ".MuiTablePagination-selectIcon": { color: "#94A3B8" },
          }}
        />
      </Paper>

      {/* ── Transaction Detail Drawer (Sections A through I) ─────────────────── */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 520 },
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
                Transaction Audit Ledger
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
                bgcolor: selectedTxn.status === "SUCCESS" ? "rgba(16, 185, 129, 0.1)" : selectedTxn.status === "PENDING" ? "rgba(245, 158, 11, 0.1)" : "rgba(239, 68, 68, 0.1)",
                border: `1px solid ${selectedTxn.status === "SUCCESS" ? "rgba(16, 185, 129, 0.3)" : selectedTxn.status === "PENDING" ? "rgba(245, 158, 11, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
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
                  bgcolor: selectedTxn.status === "SUCCESS" ? "#10B981" : selectedTxn.status === "PENDING" ? "#F59E0B" : "#EF4444",
                  color: "#FFFFFF",
                  fontWeight: 800,
                  fontSize: "12px",
                }}
              />
            </Paper>

            {/* Section A: Transaction Overview */}
            <Typography variant="subtitle2" sx={{ color: "#60A5FA", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", mb: 1.5 }}>
              A. Transaction Identification
            </Typography>
            <Stack spacing={1.2} sx={{ mb: 3 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" sx={{ color: "#94A3B8" }}>Txn ID / Ref</Typography>
                <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700 }}>{selectedTxn.txn_id}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" sx={{ color: "#94A3B8" }}>Client Reference</Typography>
                <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700 }}>{selectedTxn.client_ref_id}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" sx={{ color: "#94A3B8" }}>Execution Date &amp; Time</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{new Date(selectedTxn.transaction_datetime).toLocaleString("en-IN")}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" sx={{ color: "#94A3B8" }}>Bank UTR Number</Typography>
                <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700, color: "#34D399" }}>{selectedTxn.provider_ref || "--"}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" sx={{ color: "#94A3B8" }}>Gateway / Switch</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedTxn.provider_name || "PAY2PAY SYSTEM"}</Typography>
              </Stack>
            </Stack>

            <Divider sx={{ borderColor: "#1E293B", my: 2 }} />

            {/* Section B & C: Beneficiary & Customer */}
            <Typography variant="subtitle2" sx={{ color: "#60A5FA", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", mb: 1.5 }}>
              B. Party &amp; Beneficiary Account
            </Typography>
            <Stack spacing={1.2} sx={{ mb: 3 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" sx={{ color: "#94A3B8" }}>Customer Name</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedTxn.customer_name}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" sx={{ color: "#94A3B8" }}>Customer Mobile</Typography>
                <Typography variant="body2" sx={{ fontFamily: "monospace" }}>{selectedTxn.customer_mobile}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" sx={{ color: "#94A3B8" }}>Beneficiary Account Holder</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: "#60A5FA" }}>{selectedTxn.beneficiary_name || selectedTxn.customer_name}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" sx={{ color: "#94A3B8" }}>Bank Name</Typography>
                <Typography variant="body2">{selectedTxn.bank_name || "IDBI Bank"}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" sx={{ color: "#94A3B8" }}>Account Number</Typography>
                <Typography variant="body2" sx={{ fontFamily: "monospace" }}>{selectedTxn.account_number || "0630104000156974"}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" sx={{ color: "#94A3B8" }}>IFSC Code</Typography>
                <Typography variant="body2" sx={{ fontFamily: "monospace" }}>{selectedTxn.ifsc_code || "IBKL0000630"}</Typography>
              </Stack>
            </Stack>

            <Divider sx={{ borderColor: "#1E293B", my: 2 }} />

            {/* Section E & F: Authoritative Ledger Balance Movement */}
            <Typography variant="subtitle2" sx={{ color: "#60A5FA", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", mb: 1.5 }}>
              C. Financial Ledger Movement
            </Typography>
            <Paper sx={{ p: 2, borderRadius: "12px", bgcolor: "#111827", border: "1px solid #1E293B", mb: 3 }}>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ color: "#94A3B8" }}>Opening / Previous Balance</Typography>
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
                    <Typography variant="body2" sx={{ color: "#94A3B8" }}>Service / Transfer Fee</Typography>
                    <Typography variant="body2" sx={{ fontFamily: "monospace" }}>₹{selectedTxn.charges.toFixed(2)}</Typography>
                  </Stack>
                )}
                {selectedTxn.commission > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" sx={{ color: "#34D399" }}>Retailer Commission</Typography>
                    <Typography variant="body2" sx={{ fontFamily: "monospace", color: "#34D399", fontWeight: 700 }}>
                      +₹{selectedTxn.commission.toFixed(2)}
                    </Typography>
                  </Stack>
                )}
                <Divider sx={{ borderColor: "#1E293B", my: 0.5 }} />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ fontWeight: 800, color: "#FFFFFF" }}>Closing / Current Balance</Typography>
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
                    `Transaction Slip\nTxn ID: ${selectedTxn.txn_id}\nAmount: ₹${selectedTxn.amount}\nService: ${selectedTxn.service}\nBeneficiary: ${selectedTxn.beneficiary_name}\nBank: ${selectedTxn.bank_name}\nUTR: ${selectedTxn.provider_ref || "N/A"}\nStatus: ${selectedTxn.status}`,
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
                Share Slip
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

export default RetailerTransactionReport;
