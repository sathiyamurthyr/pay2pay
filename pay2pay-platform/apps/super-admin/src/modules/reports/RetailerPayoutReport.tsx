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
  InputLabel,
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
  Tooltip,
  TablePagination,
  Grid,
  Skeleton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import PrintIcon from "@mui/icons-material/Print";
import VisibilityIcon from "@mui/icons-material/Visibility";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import ReceiptIcon from "@mui/icons-material/Receipt";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SyncIcon from "@mui/icons-material/Sync";
import ErrorIcon from "@mui/icons-material/Error";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import TableChartIcon from "@mui/icons-material/TableChart";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import FilterListIcon from "@mui/icons-material/FilterList";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";

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

const getTodayIso = () => {
  const d = new Date();
  return d.toISOString().split("T")[0];
};

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
  const [selectedTxn, setSelectedTxn] = useState<PayoutReportItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

  // Pagination & Sorting
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Filter Form Controls (Default: Today)
  const [fromDate, setFromDate] = useState<string>(getTodayIso());
  const [toDate, setToDate] = useState<string>(getTodayIso());
  const [activePreset, setActivePreset] = useState<string>("TODAY");
  const [searchTxnId, setSearchTxnId] = useState<string>("");
  const [searchRefId, setSearchRefId] = useState<string>("");
  const [searchCustomer, setSearchCustomer] = useState<string>("");
  const [searchBeneficiary, setSearchBeneficiary] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>("ALL");
  const [minimumAmount, setMinimumAmount] = useState<string>("");
  const [maximumAmount, setMaximumAmount] = useState<string>("");

  // Fetch Summary KPIs for Filtered Context
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
        setSummary(await res.json());
      }
    } catch (e) {
      console.error("Failed to fetch payout summary KPIs", e);
    }
  }, []);

  // Fetch Grid Records from Database
  const fetchReportData = useCallback(async () => {
    setIsLoading(true);
    try {
      const q = new URLSearchParams({
        retailer_id: DEFAULT_RETAILER_ID,
        tenant_id: DEFAULT_TENANT_ID,
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
      });

      if (fromDate) q.append("from_date", fromDate);
      if (toDate) q.append("to_date", toDate);
      if (searchTxnId) q.append("transaction_id", searchTxnId);
      if (searchRefId) q.append("reference_id", searchRefId);
      if (searchCustomer) q.append("customer_name", searchCustomer);
      if (searchBeneficiary) q.append("beneficiary_name", searchBeneficiary);
      if (statusFilter !== "ALL") q.append("status", statusFilter);
      if (paymentModeFilter !== "ALL") q.append("payment_mode", paymentModeFilter);
      if (minimumAmount) q.append("amount_from", minimumAmount);
      if (maximumAmount) q.append("amount_to", maximumAmount);

      const res = await fetch(`/api/v1/payout/reports/grid?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setTotalRecords(data.pagination?.total_records || 0);
        setFooterTotals(data.footer_totals || null);
      }
    } catch (e) {
      console.error("Failed to fetch payout report grid", e);
    } finally {
      setIsLoading(false);
    }
  }, [page, rowsPerPage, fromDate, toDate, searchTxnId, searchRefId, searchCustomer, searchBeneficiary, statusFilter, paymentModeFilter, minimumAmount, maximumAmount]);

  // Initial Auto Load on Component Mount
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
    } else if (presetKey === "LAST_MONTH") {
      f = getFirstDayOfMonthIso(-1);
      t = getLastDayOfMonthIso(-1);
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchSummary(fromDate, toDate);
    fetchReportData();
  };

  const handleResetFilters = () => {
    const today = getTodayIso();
    setFromDate(today);
    setToDate(today);
    setActivePreset("TODAY");
    setSearchTxnId("");
    setSearchRefId("");
    setSearchCustomer("");
    setSearchBeneficiary("");
    setStatusFilter("ALL");
    setPaymentModeFilter("ALL");
    setMinimumAmount("");
    setMaximumAmount("");
    setPage(0);

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
    logAudit("REPORT_EXPORTED_EXCEL", { totalRecords });
    handleExportCSV();
  };

  const handleExportPDF = () => {
    logAudit("REPORT_EXPORTED_PDF", { totalRecords });
    window.print();
  };

  const handlePrintReport = () => {
    logAudit("REPORT_PRINTED", { totalRecords });
    window.print();
  };

  const handleViewDetails = (row: PayoutReportItem) => {
    setSelectedTxn(row);
    setDrawerOpen(true);
    logAudit("TRANSACTION_DETAILS_VIEWED", { transaction_id: row.transaction_id });
  };

  const renderStatusBadge = (stStr: string) => {
    let bgcolor = "rgba(59, 130, 246, 0.18)";
    let color = "#60A5FA";
    let border = "1px solid rgba(96, 165, 250, 0.4)";
    let label = stStr;

    switch (stStr.toUpperCase()) {
      case "SUCCESS":
        bgcolor = "rgba(34, 197, 94, 0.18)";
        color = "#4ADE80";
        border = "1px solid rgba(74, 222, 128, 0.4)";
        break;
      case "PENDING":
        bgcolor = "rgba(245, 158, 11, 0.18)";
        color = "#FBBF24";
        border = "1px solid rgba(251, 191, 36, 0.4)";
        break;
      case "PROCESSING":
      case "INITIATED":
        bgcolor = "rgba(59, 130, 246, 0.18)";
        color = "#60A5FA";
        border = "1px solid rgba(96, 165, 250, 0.4)";
        break;
      case "FAILED":
      case "REJECTED":
      case "TIMEOUT":
        bgcolor = "rgba(239, 68, 68, 0.18)";
        color = "#F87171";
        border = "1px solid rgba(248, 113, 113, 0.4)";
        break;
      case "REVERSED":
        bgcolor = "rgba(168, 85, 247, 0.18)";
        color = "#C084FC";
        border = "1px solid rgba(192, 132, 252, 0.4)";
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
          fontWeight: 800,
          fontSize: "13px",
          height: 26,
        }}
      />
    );
  };

  return (
    <Box sx={{ color: "#F8FAFC", fontFamily: "'Inter', sans-serif" }}>
      {/* 1. PAGE HEADER */}
      <Box sx={{ mb: 3.5, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h2" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "28px", letterSpacing: "-0.02em" }}>
            Retailer Payout Report
          </Typography>
          <Typography variant="body1" sx={{ color: "#94A3B8", fontSize: "16px", mt: 0.5 }}>
            View, search, and export all retailer payout money transfer transactions.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<InsertDriveFileIcon sx={{ fontSize: 20 }} />}
            onClick={handleExportCSV}
            sx={{ py: 1.2, px: 2, fontSize: "15px", fontWeight: 700, borderRadius: 2.5, borderColor: "rgba(255,255,255,0.2)", color: "#FFFFFF" }}
          >
            CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<TableChartIcon sx={{ fontSize: 20 }} />}
            onClick={handleExportExcel}
            sx={{ py: 1.2, px: 2, fontSize: "15px", fontWeight: 700, borderRadius: 2.5, borderColor: "rgba(34, 197, 94, 0.4)", color: "#4ADE80" }}
          >
            Excel
          </Button>
          <Button
            variant="outlined"
            startIcon={<PictureAsPdfIcon sx={{ fontSize: 20 }} />}
            onClick={handleExportPDF}
            sx={{ py: 1.2, px: 2, fontSize: "15px", fontWeight: 700, borderRadius: 2.5, borderColor: "rgba(248, 113, 113, 0.4)", color: "#F87171" }}
          >
            PDF
          </Button>
          <Button
            variant="contained"
            startIcon={<PrintIcon sx={{ fontSize: 20 }} />}
            onClick={handlePrintReport}
            sx={{ py: 1.2, px: 2.5, fontSize: "15px", fontWeight: 700, borderRadius: 2.5, backgroundColor: "#2563EB" }}
          >
            Print
          </Button>
        </Stack>
      </Box>

      {/* 2. DYNAMIC SUMMARY CARDS */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3.5, bgcolor: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(59, 130, 246, 0.3)" }}>
            <Typography variant="body1" sx={{ color: "#94A3B8", fontSize: "15px", fontWeight: 600 }}>Total Transactions</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "28px", mt: 0.8 }}>
              {summary ? summary.todays_transactions.toLocaleString("en-IN") : "0"}
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3.5, bgcolor: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(34, 197, 94, 0.3)" }}>
            <Typography variant="body1" sx={{ color: "#94A3B8", fontSize: "15px", fontWeight: 600 }}>Total Transfer Amount</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: "#4ADE80", fontSize: "28px", mt: 0.8 }}>
              ₹{summary ? summary.todays_transfer_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3.5, bgcolor: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
            <Typography variant="body1" sx={{ color: "#94A3B8", fontSize: "15px", fontWeight: 600 }}>Total Wallet Debit</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: "#F87171", fontSize: "28px", mt: 0.8 }}>
              ₹{summary ? summary.todays_wallet_debit.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3.5, bgcolor: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(168, 85, 247, 0.3)" }}>
            <Typography variant="body1" sx={{ color: "#94A3B8", fontSize: "15px", fontWeight: 600 }}>Total Commission</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: "#C084FC", fontSize: "28px", mt: 0.8 }}>
              ₹{summary ? summary.todays_commission.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* 3. FILTER PANEL (RESPONSIVE 4-COLUMN GRID) */}
      <Paper
        elevation={0}
        component="form"
        onSubmit={handleSearchSubmit}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 4,
          bgcolor: "rgba(15, 23, 42, 0.90)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <FilterListIcon sx={{ color: "#60A5FA", fontSize: 24 }} />
            <Typography variant="h3" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "20px" }}>
              Filter & Search Transactions
            </Typography>
          </Stack>

          {/* QUICK DATE PRESET CHIPS */}
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
            {[
              { key: "TODAY", label: "Today" },
              { key: "YESTERDAY", label: "Yesterday" },
              { key: "LAST_7_DAYS", label: "Last 7 Days" },
              { key: "LAST_30_DAYS", label: "Last 30 Days" },
              { key: "THIS_MONTH", label: "This Month" },
              { key: "LAST_MONTH", label: "Last Month" },
            ].map((preset) => (
              <Chip
                key={preset.key}
                label={preset.label}
                onClick={() => applyDatePreset(preset.key)}
                size="small"
                sx={{
                  bgcolor: activePreset === preset.key ? "#2563EB" : "rgba(255,255,255,0.06)",
                  color: "#FFFFFF",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                  border: activePreset === preset.key ? "1px solid #60A5FA" : "1px solid rgba(255,255,255,0.12)",
                  "&:hover": { bgcolor: activePreset === preset.key ? "#1D4ED8" : "rgba(255,255,255,0.12)" },
                }}
              />
            ))}
          </Stack>
        </Box>

        <Grid container spacing={2.5}>
          {/* Row 1 */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              fullWidth
              label="From Date"
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setActivePreset("CUSTOM");
              }}
              slotProps={{
                inputLabel: { shrink: true, style: { color: "#CBD5E1", fontSize: "16px" } },
                htmlInput: { style: { color: "#FFFFFF", fontSize: "16px" } }
              }}
              sx={{ bgcolor: "rgba(255,255,255,0.04)", borderRadius: 2 }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              fullWidth
              label="To Date"
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setActivePreset("CUSTOM");
              }}
              slotProps={{
                inputLabel: { shrink: true, style: { color: "#CBD5E1", fontSize: "16px" } },
                htmlInput: { style: { color: "#FFFFFF", fontSize: "16px" } }
              }}
              sx={{ bgcolor: "rgba(255,255,255,0.04)", borderRadius: 2 }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              fullWidth
              label="Transaction ID / Number"
              placeholder="e.g. TXN982415"
              value={searchTxnId}
              onChange={(e) => setSearchTxnId(e.target.value)}
              slotProps={{
                inputLabel: { shrink: true, style: { color: "#CBD5E1", fontSize: "16px" } },
                htmlInput: { style: { color: "#FFFFFF", fontSize: "16px" } }
              }}
              sx={{ bgcolor: "rgba(255,255,255,0.04)", borderRadius: 2 }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              fullWidth
              label="Reference ID / Vendor Ref / RRN"
              placeholder="e.g. RRN891240"
              value={searchRefId}
              onChange={(e) => setSearchRefId(e.target.value)}
              slotProps={{
                inputLabel: { shrink: true, style: { color: "#CBD5E1", fontSize: "16px" } },
                htmlInput: { style: { color: "#FFFFFF", fontSize: "16px" } }
              }}
              sx={{ bgcolor: "rgba(255,255,255,0.04)", borderRadius: 2 }}
            />
          </Grid>

          {/* Row 2 */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              fullWidth
              label="Customer Name / Mobile"
              placeholder="e.g. Ramesh"
              value={searchCustomer}
              onChange={(e) => setSearchCustomer(e.target.value)}
              slotProps={{
                inputLabel: { shrink: true, style: { color: "#CBD5E1", fontSize: "16px" } },
                htmlInput: { style: { color: "#FFFFFF", fontSize: "16px" } }
              }}
              sx={{ bgcolor: "rgba(255,255,255,0.04)", borderRadius: 2 }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              fullWidth
              label="Beneficiary Name / Mobile"
              placeholder="e.g. Suresh"
              value={searchBeneficiary}
              onChange={(e) => setSearchBeneficiary(e.target.value)}
              slotProps={{
                inputLabel: { shrink: true, style: { color: "#CBD5E1", fontSize: "16px" } },
                htmlInput: { style: { color: "#FFFFFF", fontSize: "16px" } }
              }}
              sx={{ bgcolor: "rgba(255,255,255,0.04)", borderRadius: 2 }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth sx={{ bgcolor: "rgba(255,255,255,0.04)", borderRadius: 2 }}>
              <InputLabel shrink style={{ color: "#CBD5E1", fontSize: "16px" }}>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                notched
                label="Status"
                sx={{ color: "#FFFFFF", fontSize: "16px" }}
              >
                <MenuItem value="ALL">All Statuses</MenuItem>
                <MenuItem value="SUCCESS">Success</MenuItem>
                <MenuItem value="PENDING">Pending</MenuItem>
                <MenuItem value="PROCESSING">Processing</MenuItem>
                <MenuItem value="FAILED">Failed</MenuItem>
                <MenuItem value="REVERSED">Reversed</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth sx={{ bgcolor: "rgba(255,255,255,0.04)", borderRadius: 2 }}>
              <InputLabel shrink style={{ color: "#CBD5E1", fontSize: "16px" }}>Payment Mode</InputLabel>
              <Select
                value={paymentModeFilter}
                onChange={(e) => setPaymentModeFilter(e.target.value)}
                notched
                label="Payment Mode"
                sx={{ color: "#FFFFFF", fontSize: "16px" }}
              >
                <MenuItem value="ALL">All Modes</MenuItem>
                <MenuItem value="IMPS">IMPS</MenuItem>
                <MenuItem value="NEFT">NEFT</MenuItem>
                <MenuItem value="RTGS">RTGS</MenuItem>
                <MenuItem value="UPI">UPI</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Row 3 */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              fullWidth
              label="Minimum Amount"
              placeholder="e.g. 1000"
              type="number"
              value={minimumAmount}
              onChange={(e) => setMinimumAmount(e.target.value)}
              slotProps={{
                inputLabel: { shrink: true, style: { color: "#CBD5E1", fontSize: "16px" } },
                htmlInput: { style: { color: "#FFFFFF", fontSize: "16px" } }
              }}
              sx={{ bgcolor: "rgba(255,255,255,0.04)", borderRadius: 2 }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              fullWidth
              label="Maximum Amount"
              placeholder="e.g. 50000"
              type="number"
              value={maximumAmount}
              onChange={(e) => setMaximumAmount(e.target.value)}
              slotProps={{
                inputLabel: { shrink: true, style: { color: "#CBD5E1", fontSize: "16px" } },
                htmlInput: { style: { color: "#FFFFFF", fontSize: "16px" } }
              }}
              sx={{ bgcolor: "rgba(255,255,255,0.04)", borderRadius: 2 }}
            />
          </Grid>

          {/* ACTION BUTTONS */}
          <Grid size={{ xs: 12, md: 6 }} sx={{ display: "flex", gap: 2, alignItems: "center", justifyContent: "flex-end" }}>
            <Button
              variant="outlined"
              startIcon={<RestartAltIcon />}
              onClick={handleResetFilters}
              sx={{ py: 1.5, px: 3, fontSize: "16px", fontWeight: 700, borderRadius: 2.5, borderColor: "rgba(255,255,255,0.2)", color: "#FFFFFF" }}
            >
              Reset Filters
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
              sx={{ py: 1.5, px: 4, fontSize: "16px", fontWeight: 700, borderRadius: 2.5, backgroundColor: "#2563EB" }}
            >
              {isLoading ? "Searching..." : "Search Records"}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* 4. TRANSACTIONS GRID TABLE */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          bgcolor: "rgba(15, 23, 42, 0.90)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          overflow: "hidden",
        }}
      >
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow sx={{ "& th": { bgcolor: "#1E293B", color: "#F8FAFC", fontWeight: 800, fontSize: "16px", py: 2 } }}>
                <TableCell style={{ position: "sticky", left: 0, zIndex: 5, backgroundColor: "#1E293B", width: 60 }}>S.No</TableCell>
                <TableCell style={{ position: "sticky", left: 60, zIndex: 5, backgroundColor: "#1E293B", minWidth: 160 }}>Date & Time</TableCell>
                <TableCell style={{ position: "sticky", left: 220, zIndex: 5, backgroundColor: "#1E293B", minWidth: 160 }}>Transaction ID</TableCell>
                <TableCell sx={{ minWidth: 150 }}>Reference ID</TableCell>
                <TableCell sx={{ minWidth: 160 }}>Customer</TableCell>
                <TableCell sx={{ minWidth: 160 }}>Beneficiary</TableCell>
                <TableCell sx={{ minWidth: 140 }}>Bank Account</TableCell>
                <TableCell sx={{ minWidth: 100 }}>Mode</TableCell>
                <TableCell sx={{ minWidth: 140, textAlign: "right" }}>Amount</TableCell>
                <TableCell sx={{ minWidth: 100, textAlign: "right" }}>Fee</TableCell>
                <TableCell sx={{ minWidth: 140, textAlign: "right" }}>Wallet Debit</TableCell>
                <TableCell sx={{ minWidth: 120, textAlign: "right" }}>Commission</TableCell>
                <TableCell sx={{ minWidth: 140 }}>UTR</TableCell>
                <TableCell sx={{ minWidth: 120 }}>Status</TableCell>
                <TableCell sx={{ minWidth: 90, textAlign: "center" }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                // SKELETON ROW LOADERS
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell style={{ position: "sticky", left: 0, backgroundColor: "#0F172A" }}><Skeleton variant="text" width={30} height={25} /></TableCell>
                    <TableCell style={{ position: "sticky", left: 60, backgroundColor: "#0F172A" }}><Skeleton variant="text" width={120} height={25} /></TableCell>
                    <TableCell style={{ position: "sticky", left: 220, backgroundColor: "#0F172A" }}><Skeleton variant="text" width={130} height={25} /></TableCell>
                    {Array.from({ length: 12 }).map((_, j) => (
                      <TableCell key={j}><Skeleton variant="text" height={25} /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                // CLEAN EMPTY STATE BANNER
                <TableRow>
                  <TableCell colSpan={15} sx={{ textAlign: "center", py: 8 }}>
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
                      <SearchIcon sx={{ fontSize: 48, color: "#64748B" }} />
                      <Typography variant="h3" sx={{ fontWeight: 800, color: "#94A3B8", fontSize: "20px" }}>
                        No transactions found. Try adjusting your filters.
                      </Typography>
                      <Button variant="outlined" onClick={handleResetFilters} sx={{ mt: 1, borderColor: "rgba(255,255,255,0.2)", color: "#60A5FA" }}>
                        Reset Filters
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => (
                  <TableRow key={row.transaction_id} hover sx={{ "&:hover": { bgcolor: "rgba(255,255,255,0.04)" } }}>
                    {/* FROZEN COLUMNS */}
                    <TableCell style={{ position: "sticky", left: 0, zIndex: 2, backgroundColor: "#0F172A", color: "#94A3B8", fontWeight: 700, fontSize: "16px" }}>
                      {row.s_no}
                    </TableCell>
                    <TableCell style={{ position: "sticky", left: 60, zIndex: 2, backgroundColor: "#0F172A", color: "#E2E8F0", fontSize: "15px", fontWeight: 600 }}>
                      {row.initiated_at ? new Date(row.initiated_at).toLocaleString("en-IN") : "--"}
                    </TableCell>
                    <TableCell style={{ position: "sticky", left: 220, zIndex: 2, backgroundColor: "#0F172A", color: "#60A5FA", fontWeight: 800, fontSize: "15px" }}>
                      {row.transaction_number}
                    </TableCell>

                    <TableCell sx={{ color: "#CBD5E1", fontSize: "15px" }}>{row.reference_id}</TableCell>
                    <TableCell sx={{ color: "#FFFFFF", fontWeight: 700, fontSize: "16px" }}>
                      {row.customer_name}
                      <Typography variant="caption" sx={{ display: "block", color: "#94A3B8", fontSize: "13px" }}>{row.customer_mobile}</Typography>
                    </TableCell>
                    <TableCell sx={{ color: "#FFFFFF", fontWeight: 700, fontSize: "16px" }}>
                      {row.beneficiary_name}
                      <Typography variant="caption" sx={{ display: "block", color: "#94A3B8", fontSize: "13px" }}>{row.beneficiary_mobile}</Typography>
                    </TableCell>
                    <TableCell sx={{ color: "#CBD5E1", fontSize: "15px" }}>
                      {row.bank_name}
                      <Typography variant="caption" sx={{ display: "block", color: "#60A5FA", fontSize: "13px" }}>{row.masked_account_number}</Typography>
                    </TableCell>
                    <TableCell sx={{ color: "#FFFFFF", fontWeight: 800, fontSize: "15px" }}>{row.payment_mode}</TableCell>
                    <TableCell sx={{ textAlign: "right", color: "#4ADE80", fontWeight: 800, fontSize: "16px" }}>
                      ₹{row.transfer_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell sx={{ textAlign: "right", color: "#CBD5E1", fontSize: "15px" }}>
                      ₹{row.convenience_fee.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell sx={{ textAlign: "right", color: "#F87171", fontWeight: 800, fontSize: "16px" }}>
                      ₹{row.wallet_debit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell sx={{ textAlign: "right", color: "#C084FC", fontWeight: 800, fontSize: "16px" }}>
                      ₹{row.retailer_commission.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell sx={{ color: "#CBD5E1", fontSize: "14px" }}>{row.utr_number}</TableCell>
                    <TableCell>{renderStatusBadge(row.status)}</TableCell>
                    <TableCell sx={{ textAlign: "center" }}>
                      <Tooltip title="View Transaction Details">
                        <IconButton onClick={() => handleViewDetails(row)} sx={{ color: "#60A5FA" }}>
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* SERVER-SIDE PAGINATION */}
        <TablePagination
          component="div"
          count={totalRecords}
          page={page}
          onPageChange={(_, newPage) => {
            setPage(newPage);
            setTimeout(fetchReportData, 50);
          }}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
            setTimeout(fetchReportData, 50);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
          sx={{ color: "#CBD5E1", borderTop: "1px solid rgba(255,255,255,0.1)" }}
        />
      </Paper>

      {/* 5. TRANSACTION DETAILS DRAWER */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)} slotProps={{ paper: { sx: { width: { xs: "100%", sm: 500 }, bgcolor: "#0F172A", color: "#FFFFFF", p: 3.5 } } }}>
        {selectedTxn && (
          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Typography variant="h3" sx={{ fontWeight: 800, fontSize: "22px" }}>
                Transaction Details
              </Typography>
              <IconButton onClick={() => setDrawerOpen(false)} sx={{ color: "#FFFFFF" }}>
                <CloseIcon />
              </IconButton>
            </Box>

            <Divider sx={{ borderColor: "rgba(255,255,255,0.15)", mb: 3 }} />

            <Stack spacing={2.5}>
              <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "14px", fontWeight: 600 }}>Transaction ID</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "20px", mt: 0.3 }}>{selectedTxn.transaction_number}</Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body1" sx={{ color: "#CBD5E1", fontSize: "16px" }}>Status:</Typography>
                {renderStatusBadge(selectedTxn.status)}
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body1" sx={{ color: "#CBD5E1", fontSize: "16px" }}>Transfer Amount:</Typography>
                <Typography variant="body1" sx={{ fontWeight: 800, color: "#4ADE80", fontSize: "18px" }}>₹{selectedTxn.transfer_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body1" sx={{ color: "#CBD5E1", fontSize: "16px" }}>Wallet Debit:</Typography>
                <Typography variant="body1" sx={{ fontWeight: 800, color: "#F87171", fontSize: "18px" }}>₹{selectedTxn.wallet_debit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body1" sx={{ color: "#CBD5E1", fontSize: "16px" }}>Retailer Commission:</Typography>
                <Typography variant="body1" sx={{ fontWeight: 800, color: "#C084FC", fontSize: "18px" }}>₹{selectedTxn.retailer_commission.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body1" sx={{ color: "#CBD5E1", fontSize: "16px" }}>UTR Number:</Typography>
                <Typography variant="body1" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "16px" }}>{selectedTxn.utr_number}</Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body1" sx={{ color: "#CBD5E1", fontSize: "16px" }}>Customer Name:</Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, color: "#FFFFFF", fontSize: "16px" }}>{selectedTxn.customer_name} ({selectedTxn.customer_mobile})</Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body1" sx={{ color: "#CBD5E1", fontSize: "16px" }}>Beneficiary Name:</Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, color: "#FFFFFF", fontSize: "16px" }}>{selectedTxn.beneficiary_name} ({selectedTxn.beneficiary_mobile})</Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body1" sx={{ color: "#CBD5E1", fontSize: "16px" }}>Bank & Account:</Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, color: "#60A5FA", fontSize: "16px" }}>{selectedTxn.bank_name} - {selectedTxn.masked_account_number}</Typography>
              </Box>
            </Stack>

            <Button
              fullWidth
              variant="contained"
              startIcon={<ReceiptIcon />}
              onClick={handlePrintReport}
              sx={{ mt: 4, py: 1.8, fontSize: "16px", fontWeight: 700, borderRadius: 3, backgroundColor: "#2563EB" }}
            >
              Print Receipt
            </Button>
          </Box>
        )}
      </Drawer>
    </Box>
  );
};
