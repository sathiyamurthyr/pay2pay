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
  CircularProgress,
  TablePagination,
  Grid,
  Skeleton,
  Menu,
  InputAdornment,
  Popover,
  Badge,
} from "@mui/material";

// Icons
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import RefreshIcon from "@mui/icons-material/Refresh";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import ErrorOutlinedIcon from "@mui/icons-material/ErrorOutlined";
import PrintIcon from "@mui/icons-material/Print";
import ReceiptIcon from "@mui/icons-material/Receipt";
import ClearIcon from "@mui/icons-material/Clear";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import TableChartIcon from "@mui/icons-material/TableChart";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SyncIcon from "@mui/icons-material/Sync";
import VisibilityIcon from "@mui/icons-material/Visibility";

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
  transaction_id: string;
  transaction_number: string;
  reference_id: string;
  initiated_at: string | null;
  completed_at: string | null;
  customer_name: string;
  customer_mobile: string;
  beneficiary_name: string;
  beneficiary_mobile: string;
  bank_name: string;
  masked_account_number: string;
  ifsc_code: string;
  payment_mode: string;
  transfer_amount: number;
  convenience_fee: number;
  gst_amount: number;
  wallet_debit: number;
  retailer_commission: number;
  tds_amount: number;
  utr_number: string;
  status: string;
  refund_status: string;
  remarks: string;
  receipt_enabled: boolean;
  retailer_name?: string;
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

const getTodayIso = () => new Date().toISOString().split("T")[0];

const getDateOffsetIso = (daysOffset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split("T")[0];
};

const getFirstDayOfMonthIso = (monthOffset: number = 0) => {
  const d = new Date();
  d.setMonth(d.getMonth() + monthOffset, 1);
  return d.toISOString().split("T")[0];
};

const getLastDayOfMonthIso = (monthOffset: number = -1) => {
  const d = new Date();
  d.setMonth(d.getMonth() + monthOffset + 1, 0);
  return d.toISOString().split("T")[0];
};

export const RetailerPayoutReport: React.FC = () => {
  // State for Summary & Report Grid
  const [summary, setSummary] = useState<PayoutReportSummary | null>(null);
  const [items, setItems] = useState<PayoutReportItem[]>([]);
  const [footerTotals, setFooterTotals] = useState<FooterTotals | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Selected Transaction for Drawer
  const [selectedTxn, setSelectedTxn] = useState<PayoutReportItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

  // Pagination & Sorting
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Quick Search & Date Filters
  const [globalSearch, setGlobalSearch] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>(getTodayIso());
  const [toDate, setToDate] = useState<string>(getTodayIso());
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
    try {
      const q = new URLSearchParams({
        retailer_id: DEFAULT_RETAILER_ID,
        tenant_id: DEFAULT_TENANT_ID,
      });
      if (fDate) q.append("from_date", fDate);
      if (tDate) q.append("to_date", tDate);

      const res = await fetch(`/api/v1/payout/reports/summary?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (e) {
      console.error("Failed to fetch payout summary KPIs", e);
    }
  }, []);

  // Fetch Grid Records from Database
  const fetchReportData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({
        retailer_id: DEFAULT_RETAILER_ID,
        tenant_id: DEFAULT_TENANT_ID,
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
      });

      if (fromDate) q.append("from_date", fromDate);
      if (toDate) q.append("to_date", toDate);

      // Global search fills transaction_id or customer_name or beneficiary_name
      if (globalSearch.trim()) {
        const queryVal = globalSearch.trim();
        q.append("transaction_id", queryVal);
        q.append("customer_name", queryVal);
        q.append("beneficiary_name", queryVal);
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

      const res = await fetch(`/api/v1/payout/reports/grid?${q.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(data.items || []);
      setTotalRecords(data.pagination?.total_records || 0);
      setFooterTotals(data.footer_totals || null);
    } catch (e: any) {
      console.error("Failed to fetch payout report grid", e);
      setError("Unable to load payout transactions. Please check server connection.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [
    page,
    rowsPerPage,
    fromDate,
    toDate,
    globalSearch,
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

  // Initial Auto Load
  useEffect(() => {
    fetchSummary(fromDate, toDate);
    fetchReportData();
  }, []);

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

    fetchSummary(f, t);
    setTimeout(() => {
      fetchReportData();
    }, 50);
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

    fetchSummary(today, today);
    setTimeout(() => {
      fetchReportData();
    }, 50);
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
    let csvStr = "S.No,Date & Time,Transaction ID,Reference ID,Customer,Beneficiary,Bank,Account,IFSC,Mode,Amount,Fee,GST,Wallet Debit,Commission,UTR,Status\n";
    items.forEach((r) => {
      csvStr += `${r.s_no},"${r.initiated_at || ""}","${r.transaction_number}","${r.reference_id}","${r.customer_name}","${r.beneficiary_name}","${r.bank_name}","${r.masked_account_number}","${r.ifsc_code}","${r.payment_mode}",${r.transfer_amount},${r.convenience_fee},${r.gst_amount},${r.wallet_debit},${r.retailer_commission},"${r.utr_number}","${r.status}"\n`;
    });

    const blob = new Blob([csvStr], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Payout_Report_${fromDate}_to_${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    setExportAnchorEl(null);
    logAudit("REPORT_EXPORTED_EXCEL", { totalRecords });
    handleExportCSV();
  };

  const handleExportPDF = () => {
    setExportAnchorEl(null);
    logAudit("REPORT_EXPORTED_PDF", { totalRecords });
    window.print();
  };

  const handlePrintReport = () => {
    setExportAnchorEl(null);
    logAudit("REPORT_PRINTED", { totalRecords });
    window.print();
  };

  const handleViewDetails = (row: PayoutReportItem) => {
    setSelectedTxn(row);
    setDrawerOpen(true);
    logAudit("TRANSACTION_DETAILS_VIEWED", { transaction_id: row.transaction_id });
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
      {/* 1. COMPACT HEADER */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, fontSize: "24px", color: "#FFFFFF", letterSpacing: "-0.5px" }}>
          Payouts
        </Typography>
        <Typography variant="body2" sx={{ color: "#94A3B8", fontSize: "13px", mt: 0.2 }}>
          View and manage retailer payout transactions
        </Typography>
      </Box>

      {/* 2. PRIMARY SEARCH & QUICK DATE PRESETS ROW */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        sx={{
          mb: 2,
          alignItems: { xs: "stretch", md: "center" },
          justifyContent: "space-between",
        }}
      >
        {/* Prominent Search Input */}
        <TextField
          placeholder="Search payouts..."
          value={globalSearch}
          onChange={(e) => {
            setGlobalSearch(e.target.value);
            setPage(0);
          }}
          size="small"
          sx={{
            flexGrow: 1,
            maxWidth: { xs: "100%", md: "520px" },
            "& .MuiOutlinedInput-root": {
              bgcolor: "#121B28",
              borderRadius: "10px",
              fontSize: "13px",
              color: "#F8FAFC",
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

        {/* Compact Segmented Control for Quick Date Filters */}
        <Stack direction="row" spacing={0.5} sx={{ bgcolor: "#121B28", p: 0.5, borderRadius: "10px", border: "1px solid #1E293B" }}>
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
                borderRadius: "7px",
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
      </Stack>

      {/* 3. SUMMARY KPI SECTION - 4 COMPACT HORIZONTAL CARDS */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {/* KPI 1: Total Payouts */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              bgcolor: "#121B28",
              border: "1px solid #1E293B",
              borderRadius: "10px",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "17px", lineHeight: 1.2 }}>
              ₹{(summary?.todays_transfer_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </Typography>
            <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mt: 0.5 }}>
              <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 600, fontSize: "11px", textTransform: "uppercase" }}>
                Total Payouts
              </Typography>
              <Typography variant="caption" sx={{ color: "#64748B", fontSize: "11px" }}>
                • {summary?.todays_transactions || 0} total
              </Typography>
            </Stack>
          </Paper>
        </Grid>

        {/* KPI 2: Successful */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              bgcolor: "#121B28",
              border: "1px solid #1E293B",
              borderRadius: "10px",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#4ADE80", fontSize: "17px", lineHeight: 1.2 }}>
              ₹{(summary?.successful_amount || summary?.todays_transfer_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </Typography>
            <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mt: 0.5 }}>
              <Typography variant="caption" sx={{ color: "#4ADE80", fontWeight: 600, fontSize: "11px", textTransform: "uppercase" }}>
                Successful
              </Typography>
              <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px" }}>
                • {summary?.successful_transactions || 0} count
              </Typography>
            </Stack>
          </Paper>
        </Grid>

        {/* KPI 3: Pending */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              bgcolor: "#121B28",
              border: "1px solid #1E293B",
              borderRadius: "10px",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#FBBF24", fontSize: "17px", lineHeight: 1.2 }}>
              ₹{(summary?.pending_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </Typography>
            <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mt: 0.5 }}>
              <Typography variant="caption" sx={{ color: "#FBBF24", fontWeight: 600, fontSize: "11px", textTransform: "uppercase" }}>
                Pending
              </Typography>
              <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px" }}>
                • {summary?.pending_transactions || 0} processing
              </Typography>
            </Stack>
          </Paper>
        </Grid>

        {/* KPI 4: Failed / Reversed */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              bgcolor: "#121B28",
              border: "1px solid #1E293B",
              borderRadius: "10px",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#F87171", fontSize: "17px", lineHeight: 1.2 }}>
              ₹{(summary?.failed_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </Typography>
            <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mt: 0.5 }}>
              <Typography variant="caption" sx={{ color: "#F87171", fontWeight: 600, fontSize: "11px", textTransform: "uppercase" }}>
                Failed / Reversed
              </Typography>
              <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px" }}>
                • {summary?.failed_transactions || 0} count
              </Typography>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* 4. FILTER DESIGN & EXPORT TOOLBAR */}
      <Paper
        elevation={0}
        sx={{
          p: 1.2,
          px: 2,
          bgcolor: "#121B28",
          border: "1px solid #1E293B",
          borderRadius: "10px",
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
          {/* Status Dropdown */}
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
                borderRadius: "8px",
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

          {/* Payment Mode Dropdown */}
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
                borderRadius: "8px",
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
                borderRadius: "8px",
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
        <Stack direction="row" spacing={1} alignItems="center">
          {/* Export Dropdown Button */}
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
              borderRadius: "8px",
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
                  borderRadius: "10px",
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

          {/* Refresh Button */}
          <IconButton
            size="small"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            sx={{
              color: "#94A3B8",
              border: "1px solid #1E293B",
              borderRadius: "8px",
              p: 0.8,
              "&:hover": { color: "#FFFFFF", bgcolor: "rgba(255, 255, 255, 0.05)" },
            }}
          >
            <RefreshIcon sx={{ fontSize: 18, animation: isRefreshing ? "spin 1s linear infinite" : "none" }} />
          </IconButton>
        </Stack>
      </Paper>

      {/* ADVANCED FILTERS POPOVER */}
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
              borderRadius: "12px",
              boxShadow: "0 16px 36px rgba(0,0,0,0.6)",
              mt: 1,
            },
          },
        }}
      >
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "14px", color: "#FFFFFF" }}>
              Filter Payout Transactions
            </Typography>
            <IconButton size="small" onClick={() => setFilterAnchorEl(null)} sx={{ color: "#64748B" }}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Stack>
          <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.1)" }} />

          {/* Date Pickers */}
          <Grid container spacing={1.5}>
            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: "#94A3B8", mb: 0.5, display: "block" }}>
                From Date
              </Typography>
              <TextField
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                size="small"
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "#121B28",
                    color: "#F8FAFC",
                    fontSize: "12px",
                    borderRadius: "8px",
                    "& fieldset": { borderColor: "#1E293B" },
                  },
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: "#94A3B8", mb: 0.5, display: "block" }}>
                To Date
              </Typography>
              <TextField
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                size="small"
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "#121B28",
                    color: "#F8FAFC",
                    fontSize: "12px",
                    borderRadius: "8px",
                    "& fieldset": { borderColor: "#1E293B" },
                  },
                }}
              />
            </Grid>
          </Grid>

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

          <Grid container spacing={1.5}>
            <Grid item xs={6}>
              <TextField
                label="Customer Name"
                value={searchCustomer}
                onChange={(e) => setSearchCustomer(e.target.value)}
                size="small"
                fullWidth
                sx={inputStyle}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Beneficiary Name"
                value={searchBeneficiary}
                onChange={(e) => setSearchBeneficiary(e.target.value)}
                size="small"
                fullWidth
                sx={inputStyle}
              />
            </Grid>
          </Grid>

          <Grid container spacing={1.5}>
            <Grid item xs={6}>
              <TextField
                label="Min Amount (₹)"
                type="number"
                value={minimumAmount}
                onChange={(e) => setMinimumAmount(e.target.value)}
                size="small"
                fullWidth
                sx={inputStyle}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Max Amount (₹)"
                type="number"
                value={maximumAmount}
                onChange={(e) => setMaximumAmount(e.target.value)}
                size="small"
                fullWidth
                sx={inputStyle}
              />
            </Grid>
          </Grid>

          <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ pt: 1 }}>
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

      {/* 5. DOMINANT TRANSACTION TABLE */}
      {error ? (
        <Paper sx={{ p: 4, textAlign: "center", bgcolor: "rgba(239, 68, 68, 0.08)", border: "1px solid #EF4444", borderRadius: "10px" }}>
          <Typography sx={{ color: "#EF4444", fontWeight: 700, mb: 1.5, fontSize: "14px" }}>{error}</Typography>
          <Button variant="contained" color="error" size="small" onClick={handleRefresh}>
            Retry Loading
          </Button>
        </Paper>
      ) : (
        <Paper
          elevation={0}
          sx={{
            width: "100%",
            bgcolor: "#121B28",
            border: "1px solid #1E293B",
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          <TableContainer sx={{ maxHeight: "calc(100vh - 360px)", minHeight: "380px" }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow sx={{ "& th": { bgcolor: "#0F172A", color: "#94A3B8", fontWeight: 700, fontSize: "12px", borderBottom: "1px solid #1E293B", py: 1.2 } }}>
                  <TableCell>Date & Time</TableCell>
                  <TableCell>Transaction ID</TableCell>
                  <TableCell>Retailer</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Beneficiary</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell align="center">Mode</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell>UTR</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell colSpan={10} sx={{ py: 1.5 }}>
                        <Skeleton variant="rectangular" height={28} sx={{ bgcolor: "rgba(255,255,255,0.05)", borderRadius: "6px" }} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                      <Box sx={{ maxWidth: 360, mx: "auto", textAlign: "center" }}>
                        <ReceiptLongIcon sx={{ fontSize: 44, color: "#334155", mb: 1 }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#F8FAFC", fontSize: "15px" }}>
                          No payout transactions found
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#64748B", fontSize: "13px", mt: 0.5 }}>
                          When payouts are processed, transactions will appear here.
                        </Typography>
                        {activeFilterCount > 0 && (
                          <Button size="small" onClick={handleResetFilters} sx={{ mt: 1.5, color: "#3B82F6", fontSize: "12px" }}>
                            Clear active filters
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((row) => (
                    <TableRow
                      key={row.transaction_id || row.s_no}
                      hover
                      sx={{
                        "&:hover": { bgcolor: "rgba(255, 255, 255, 0.03)" },
                        "& td": { borderBottom: "1px solid #1E293B", py: 1.2, fontSize: "13px", color: "#F8FAFC" },
                      }}
                    >
                      {/* Date & Time */}
                      <TableCell sx={{ color: "#CBD5E1", whiteSpace: "nowrap" }}>
                        {row.initiated_at ? row.initiated_at.replace("T", " ").substring(0, 16) : "--"}
                      </TableCell>

                      {/* Transaction ID */}
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "13px", color: "#F8FAFC" }}>
                          {row.transaction_number || row.reference_id}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#64748B", fontFamily: "monospace", fontSize: "11px" }}>
                          Ref: {row.reference_id}
                        </Typography>
                      </TableCell>

                      {/* Retailer */}
                      <TableCell sx={{ color: "#CBD5E1" }}>
                        {row.retailer_name || "Self Merchant"}
                      </TableCell>

                      {/* Customer */}
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "13px", color: "#F8FAFC" }}>
                          {row.customer_name || "--"}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#64748B", fontSize: "11px" }}>
                          {row.customer_mobile || ""}
                        </Typography>
                      </TableCell>

                      {/* Beneficiary */}
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "13px", color: "#F8FAFC" }}>
                          {row.beneficiary_name || "--"}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px" }}>
                          {row.bank_name ? `${row.bank_name} (${row.masked_account_number || ""})` : "--"}
                        </Typography>
                      </TableCell>

                      {/* Amount */}
                      <TableCell align="right" sx={{ fontWeight: 700, color: "#FFFFFF", fontSize: "14px" }}>
                        ₹{Number(row.transfer_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </TableCell>

                      {/* Payment Mode */}
                      <TableCell align="center">
                        <Chip
                          label={row.payment_mode || "IMPS"}
                          size="small"
                          sx={{
                            bgcolor: "rgba(255,255,255,0.06)",
                            color: "#CBD5E1",
                            fontSize: "10px",
                            fontWeight: 700,
                            height: "20px",
                            borderRadius: "4px",
                          }}
                        />
                      </TableCell>

                      {/* Status */}
                      <TableCell align="center">
                        {renderStatusBadge(row.status)}
                      </TableCell>

                      {/* UTR */}
                      <TableCell sx={{ fontFamily: "monospace", fontSize: "12px", color: row.utr_number ? "#4ADE80" : "#64748B" }}>
                        {row.utr_number || "--"}
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
                          <Button
                            size="small"
                            onClick={() => handleViewDetails(row)}
                            endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                            sx={{
                              fontSize: "12px",
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
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* RUNNING FOOTER TOTALS & PAGINATION */}
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
              <Stack direction="row" spacing={3} alignItems="center">
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

      {/* ROW ACTION DROPDOWN MENU */}
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
              minWidth: 140,
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
            if (actionRowItem) {
              logAudit("RECEIPT_PRINTED", { transaction_id: actionRowItem.transaction_id });
              window.print();
            }
            setActionMenuAnchorEl(null);
          }}
          sx={{ fontSize: "13px", py: 1 }}
        >
          <ReceiptIcon sx={{ fontSize: 16, mr: 1, color: "#4ADE80" }} /> Print Receipt
        </MenuItem>
      </Menu>

      {/* 6. TRANSACTION DETAILS SLIDE-OVER DRAWER */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 460 },
            bgcolor: "#0F172A",
            color: "#F8FAFC",
            borderLeft: "1px solid #1E293B",
            p: 0,
          },
        }}
      >
        {selectedTxn && (
          <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            {/* Drawer Header */}
            <Box sx={{ p: 2.5, bgcolor: "#121B28", borderBottom: "1px solid #1E293B", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "16px" }}>
                  Transaction Details
                </Typography>
                <Typography variant="caption" sx={{ color: "#64748B", fontFamily: "monospace", fontSize: "11px" }}>
                  ID: {selectedTxn.transaction_number || selectedTxn.reference_id}
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setDrawerOpen(false)} sx={{ color: "#64748B" }}>
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>

            {/* Scrollable Content */}
            <Box sx={{ p: 3, flexGrow: 1, overflowY: "auto" }}>
              {/* Hero Amount & Status Card */}
              <Paper sx={{ p: 2.5, bgcolor: "#121B28", border: "1px solid #1E293B", borderRadius: "10px", textAlign: "center", mb: 3 }}>
                <Typography variant="caption" sx={{ color: "#94A3B8", textTransform: "uppercase", fontSize: "11px", fontWeight: 700 }}>
                  Transfer Amount
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: "#FFFFFF", my: 0.5, fontSize: "28px" }}>
                  ₹{Number(selectedTxn.transfer_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </Typography>
                <Box sx={{ mt: 1 }}>{renderStatusBadge(selectedTxn.status)}</Box>
              </Paper>

              {/* Section 1: Core Transaction Metadata */}
              <Typography variant="caption" sx={{ color: "#3B82F6", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "11px", mb: 1, display: "block" }}>
                Transaction Info
              </Typography>
              <Paper sx={{ p: 2, bgcolor: "#121B28", border: "1px solid #1E293B", borderRadius: "8px", mb: 2.5 }}>
                <Stack spacing={1.2}>
                  <DetailRow label="Transaction #" value={selectedTxn.transaction_number || selectedTxn.reference_id} isMono />
                  <DetailRow label="Reference ID" value={selectedTxn.reference_id} isMono />
                  <DetailRow label="UTR Number" value={selectedTxn.utr_number || "Awaiting Bank UTR"} isMono highlight={Boolean(selectedTxn.utr_number)} />
                  <DetailRow label="Initiated At" value={selectedTxn.initiated_at ? selectedTxn.initiated_at.replace("T", " ") : "--"} />
                  <DetailRow label="Completed At" value={selectedTxn.completed_at ? selectedTxn.completed_at.replace("T", " ") : "--"} />
                </Stack>
              </Paper>

              {/* Section 2: Customer */}
              <Typography variant="caption" sx={{ color: "#3B82F6", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "11px", mb: 1, display: "block" }}>
                Customer Information
              </Typography>
              <Paper sx={{ p: 2, bgcolor: "#121B28", border: "1px solid #1E293B", borderRadius: "8px", mb: 2.5 }}>
                <Stack spacing={1.2}>
                  <DetailRow label="Customer Name" value={selectedTxn.customer_name || "--"} />
                  <DetailRow label="Mobile Number" value={selectedTxn.customer_mobile || "--"} />
                </Stack>
              </Paper>

              {/* Section 3: Beneficiary */}
              <Typography variant="caption" sx={{ color: "#3B82F6", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "11px", mb: 1, display: "block" }}>
                Beneficiary Information
              </Typography>
              <Paper sx={{ p: 2, bgcolor: "#121B28", border: "1px solid #1E293B", borderRadius: "8px", mb: 2.5 }}>
                <Stack spacing={1.2}>
                  <DetailRow label="Beneficiary Name" value={selectedTxn.beneficiary_name || "--"} />
                  <DetailRow label="Bank Name" value={selectedTxn.bank_name || "--"} />
                  <DetailRow label="Account Number" value={selectedTxn.masked_account_number || "--"} isMono />
                  <DetailRow label="IFSC Code" value={selectedTxn.ifsc_code || "--"} isMono />
                  <DetailRow label="Beneficiary Mobile" value={selectedTxn.beneficiary_mobile || "--"} />
                </Stack>
              </Paper>

              {/* Section 4: Payment Metadata */}
              <Typography variant="caption" sx={{ color: "#3B82F6", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "11px", mb: 1, display: "block" }}>
                Payment & Channel
              </Typography>
              <Paper sx={{ p: 2, bgcolor: "#121B28", border: "1px solid #1E293B", borderRadius: "8px", mb: 2.5 }}>
                <Stack spacing={1.2}>
                  <DetailRow label="Payment Mode" value={selectedTxn.payment_mode || "IMPS"} />
                  <DetailRow label="Retailer Account" value={selectedTxn.retailer_name || "Self Retailer"} />
                  <DetailRow label="Remarks / Note" value={selectedTxn.remarks || "Standard payout transaction"} />
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

            {/* Drawer Footer Actions */}
            <Box sx={{ p: 2, borderTop: "1px solid #1E293B", bgcolor: "#121B28", display: "flex", gap: 1.5 }}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<PrintIcon />}
                onClick={() => {
                  logAudit("RECEIPT_PRINTED", { transaction_id: selectedTxn.transaction_id });
                  window.print();
                }}
                sx={{ borderColor: "#1E293B", color: "#CBD5E1", textTransform: "none", fontSize: "13px" }}
              >
                Print Receipt
              </Button>
              <Button
                variant="contained"
                fullWidth
                startIcon={<ReceiptIcon />}
                onClick={() => {
                  logAudit("RECEIPT_DOWNLOADED", { transaction_id: selectedTxn.transaction_id });
                  window.print();
                }}
                sx={{ bgcolor: "#2563EB", textTransform: "none", fontSize: "13px", fontWeight: 700 }}
              >
                Download PDF
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>
    </Box>
  );
};

// Helper row component for drawer details
const DetailRow: React.FC<{ label: string; value: string; isMono?: boolean; highlight?: boolean }> = ({
  label,
  value,
  isMono = false,
  highlight = false,
}) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center">
    <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "12px" }}>
      {label}
    </Typography>
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
  </Stack>
);

const inputStyle = {
  "& .MuiOutlinedInput-root": {
    bgcolor: "#121B28",
    color: "#F8FAFC",
    fontSize: "13px",
    borderRadius: "8px",
    "& fieldset": { borderColor: "#1E293B" },
  },
  "& .MuiInputLabel-root": {
    color: "#94A3B8",
    fontSize: "13px",
  },
};
