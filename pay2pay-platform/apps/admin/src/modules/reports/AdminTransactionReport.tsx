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
  TablePagination,
  Skeleton,
  InputAdornment,
  Snackbar,
  Alert,
  Tooltip,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Autocomplete,
  Collapse,
  Badge,
} from "@mui/material";

// Icons
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import RefreshIcon from "@mui/icons-material/Refresh";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";
import ReceiptIcon from "@mui/icons-material/Receipt";
import ClearIcon from "@mui/icons-material/Clear";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import FilterListIcon from "@mui/icons-material/FilterList";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import BusinessIcon from "@mui/icons-material/Business";
import PersonIcon from "@mui/icons-material/Person";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import LayersIcon from "@mui/icons-material/Layers";
import HistoryIcon from "@mui/icons-material/History";
import CheckIcon from "@mui/icons-material/Check";
import ErrorOutlinedIcon from "@mui/icons-material/ErrorOutlined";
import ReplayIcon from "@mui/icons-material/Replay";

import {
  AdminTransactionReportAPI,
  AdminTransactionItem,
  AdminTransactionSummary,
  AdminTransactionFiltersResponse,
  AdminTransactionDetail,
  AdminTransactionQueryParams,
} from "@/services/admin-transaction-report-api";

// Format currency
const formatINR = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
};

export default function AdminTransactionReport() {
  // Data States
  const [items, setItems] = useState<AdminTransactionItem[]>([]);
  const [summary, setSummary] = useState<AdminTransactionSummary | null>(null);
  const [filterOptions, setFilterOptions] = useState<AdminTransactionFiltersResponse>({
    companies: [],
    user_types: [],
    services: [],
    vendors: [],
    sources: [],
    statuses: [],
  });

  // Filter States
  const [companyId, setCompanyId] = useState<string>("ALL");
  const [userType, setUserType] = useState<string>("ALL");
  const [userId, setUserId] = useState<string>("ALL");
  const [vendorName, setVendorName] = useState<string>("ALL");
  const [serviceName, setServiceName] = useState<string>("ALL");
  const [transactionSource, setTransactionSource] = useState<string>("ALL");
  const [transactionType, setTransactionType] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  // Pagination & Sorting
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // UI States
  const [loading, setLoading] = useState<boolean>(true);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" }>({
    open: false,
    message: "",
    severity: "info",
  });

  // Drawer Detail State
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [selectedTxn, setSelectedTxn] = useState<AdminTransactionDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState<boolean>(false);

  // User search typeahead
  const [userSearchOptions, setUserSearchOptions] = useState<any[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState<boolean>(false);
  const [selectedUserObj, setSelectedUserObj] = useState<any | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Load initial filter metadata
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const res = await AdminTransactionReportAPI.getFilterOptions();
        if (res.success && res.data) {
          setFilterOptions(res.data);
        }
      } catch (err) {
        console.error("Failed to load filter options", err);
      }
    };
    loadFilters();
  }, []);

  // Build Query Object
  const queryParams = useMemo<AdminTransactionQueryParams>(() => {
    return {
      company_id: companyId,
      user_type: userType,
      user_id: selectedUserObj ? selectedUserObj.id : (userId !== "ALL" ? userId : undefined),
      vendor_name: vendorName,
      service_name: serviceName,
      transaction_source: transactionSource,
      transaction_type: transactionType,
      status: statusFilter,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      min_amount: minAmount ? parseFloat(minAmount) : undefined,
      max_amount: maxAmount ? parseFloat(maxAmount) : undefined,
      search: debouncedSearch || undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
      page: page + 1,
      limit: rowsPerPage,
    };
  }, [
    companyId,
    userType,
    userId,
    selectedUserObj,
    vendorName,
    serviceName,
    transactionSource,
    transactionType,
    statusFilter,
    fromDate,
    toDate,
    minAmount,
    maxAmount,
    debouncedSearch,
    sortBy,
    sortOrder,
    page,
    rowsPerPage,
  ]);

  // Fetch Report Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await AdminTransactionReportAPI.getTransactions(queryParams);
      if (res.success && res.data) {
        setItems(res.data.items || []);
        setTotalRecords(res.data.pagination?.total || 0);
      }
    } catch (err: any) {
      console.error("Error fetching transactions", err);
      setToastMsg({
        open: true,
        message: err?.response?.data?.detail?.message || "Failed to load transaction report",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  // Fetch Summary KPIs
  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await AdminTransactionReportAPI.getSummary(queryParams);
      if (res.success && res.data) {
        setSummary(res.data);
      }
    } catch (err) {
      console.error("Error fetching summary KPIs", err);
    } finally {
      setSummaryLoading(false);
    }
  }, [queryParams]);

  // Trigger data & summary fetch on query change
  useEffect(() => {
    fetchData();
    fetchSummary();
  }, [fetchData, fetchSummary]);

  // Handle Export CSV
  const handleExportCSV = () => {
    try {
      setExporting(true);
      const url = AdminTransactionReportAPI.getExportUrl(queryParams);
      window.open(url, "_blank");
      setToastMsg({
        open: true,
        message: "CSV Export initiated successfully.",
        severity: "success",
      });
    } catch (err) {
      setToastMsg({
        open: true,
        message: "Export failed. Please try again.",
        severity: "error",
      });
    } finally {
      setTimeout(() => setExporting(false), 2000);
    }
  };

  // Handle User Autocomplete search
  const handleUserSearchChange = async (val: string) => {
    if (!val || val.length < 2) {
      setUserSearchOptions([]);
      return;
    }
    setUserSearchLoading(true);
    try {
      const res = await AdminTransactionReportAPI.searchUsers(val);
      if (res.success && res.data) {
        setUserSearchOptions(res.data);
      }
    } catch (err) {
      console.error("User search failed", err);
    } finally {
      setUserSearchLoading(false);
    }
  };

  // Open Drawer Detail
  const handleOpenDetail = async (txnId: string) => {
    setDrawerLoading(true);
    setDrawerOpen(true);
    setSelectedTxn(null);
    try {
      const res = await AdminTransactionReportAPI.getTransactionDetail(txnId);
      if (res.success && res.data) {
        setSelectedTxn(res.data);
      }
    } catch (err: any) {
      setToastMsg({
        open: true,
        message: err?.response?.data?.detail?.message || "Failed to load transaction detail",
        severity: "error",
      });
    } finally {
      setDrawerLoading(false);
    }
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string, key: string) => {
    if (!text || text === "—") return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setCompanyId("ALL");
    setUserType("ALL");
    setUserId("ALL");
    setSelectedUserObj(null);
    setVendorName("ALL");
    setServiceName("ALL");
    setTransactionSource("ALL");
    setTransactionType("ALL");
    setStatusFilter("ALL");
    setFromDate("");
    setToDate("");
    setMinAmount("");
    setMaxAmount("");
    setSearch("");
    setPage(0);
  };

  // Date Presets
  const applyDatePreset = (preset: "today" | "yesterday" | "week" | "month") => {
    const now = new Date();
    let from = new Date();
    let to = new Date();

    if (preset === "today") {
      from = now;
      to = now;
    } else if (preset === "yesterday") {
      from.setDate(now.getDate() - 1);
      to.setDate(now.getDate() - 1);
    } else if (preset === "week") {
      from.setDate(now.getDate() - 7);
      to = now;
    } else if (preset === "month") {
      from.setDate(now.getDate() - 30);
      to = now;
    }

    const formatDateStr = (d: Date) => d.toISOString().split("T")[0];
    setFromDate(formatDateStr(from));
    setToDate(formatDateStr(to));
    setPage(0);
  };

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (companyId !== "ALL") count++;
    if (userType !== "ALL") count++;
    if (selectedUserObj || userId !== "ALL") count++;
    if (vendorName !== "ALL") count++;
    if (serviceName !== "ALL") count++;
    if (transactionSource !== "ALL") count++;
    if (transactionType !== "ALL") count++;
    if (statusFilter !== "ALL") count++;
    if (fromDate) count++;
    if (toDate) count++;
    if (minAmount) count++;
    if (maxAmount) count++;
    if (debouncedSearch) count++;
    return count;
  }, [
    companyId,
    userType,
    selectedUserObj,
    userId,
    vendorName,
    serviceName,
    transactionSource,
    transactionType,
    statusFilter,
    fromDate,
    toDate,
    minAmount,
    maxAmount,
    debouncedSearch,
  ]);

  // Helper for Status Pill Badge
  const renderStatusBadge = (status: string) => {
    const st = (status || "SUCCESS").toUpperCase();
    if (st === "SUCCESS" || st === "SETTLED") {
      return (
        <Chip
          icon={<CheckCircleIcon sx={{ fontSize: "14px !important", color: "#10B981 !important" }} />}
          label="SUCCESS"
          size="small"
          sx={{
            bgcolor: "rgba(16, 185, 129, 0.12)",
            color: "#10B981",
            fontWeight: 800,
            fontSize: "11px",
            border: "1px solid rgba(16, 185, 129, 0.25)",
          }}
        />
      );
    }
    if (st === "PENDING" || st === "PROCESSING" || st === "INITIATED") {
      return (
        <Chip
          icon={<AccessTimeIcon sx={{ fontSize: "14px !important", color: "#F59E0B !important" }} />}
          label={st}
          size="small"
          sx={{
            bgcolor: "rgba(245, 158, 11, 0.12)",
            color: "#F59E0B",
            fontWeight: 800,
            fontSize: "11px",
            border: "1px solid rgba(245, 158, 11, 0.25)",
          }}
        />
      );
    }
    if (st === "REVERSED") {
      return (
        <Chip
          icon={<ReplayIcon sx={{ fontSize: "14px !important", color: "#A855F7 !important" }} />}
          label="REVERSED"
          size="small"
          sx={{
            bgcolor: "rgba(168, 85, 247, 0.12)",
            color: "#C084FC",
            fontWeight: 800,
            fontSize: "11px",
            border: "1px solid rgba(168, 85, 247, 0.25)",
          }}
        />
      );
    }
    return (
      <Chip
        icon={<CancelIcon sx={{ fontSize: "14px !important", color: "#EF4444 !important" }} />}
        label={st}
        size="small"
        sx={{
          bgcolor: "rgba(239, 68, 68, 0.12)",
          color: "#EF4444",
          fontWeight: 800,
          fontSize: "11px",
          border: "1px solid rgba(239, 68, 68, 0.25)",
        }}
      />
    );
  };

  return (
    <Box sx={{ width: "100%", p: { xs: 1.5, md: 2.5 }, bgcolor: "#070E20", minHeight: "100vh", color: "#F1F5F9" }}>
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER SECTION
      ───────────────────────────────────────────────────────────── */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 2.5 }}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "10px",
                bgcolor: "rgba(56, 189, 248, 0.12)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#38BDF8",
              }}
            >
              <ReceiptIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.5px" }}>
                Enterprise Transaction Report
              </Typography>
              <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "12px" }}>
                Centralized Single-Source-of-Truth Financial Ledger across Companies, User Types, Vendors & Services
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon className={loading ? "animate-spin" : ""} />}
            onClick={() => {
              fetchData();
              fetchSummary();
            }}
            sx={{
              color: "#38BDF8",
              borderColor: "rgba(56, 189, 248, 0.3)",
              fontWeight: 600,
              textTransform: "none",
              borderRadius: "8px",
              "&:hover": { borderColor: "#38BDF8", bgcolor: "rgba(56, 189, 248, 0.08)" },
            }}
          >
            Refresh
          </Button>

          <Button
            variant="contained"
            size="small"
            startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : <FileDownloadIcon />}
            onClick={handleExportCSV}
            disabled={exporting || loading}
            sx={{
              bgcolor: "#0284C7",
              color: "#FFFFFF",
              fontWeight: 700,
              textTransform: "none",
              borderRadius: "8px",
              boxShadow: "0 4px 14px rgba(2, 132, 199, 0.35)",
              "&:hover": { bgcolor: "#0369A1" },
            }}
          >
            Export CSV
          </Button>
        </Stack>
      </Stack>

      {/* ─────────────────────────────────────────────────────────────
          2. DYNAMIC SUMMARY KPI CARDS
      ───────────────────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {/* Card 1: Total Volume & Count */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              bgcolor: "#0B1533",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              p: 1.5,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", fontSize: "11px" }}>
                  Total Transactions
                </Typography>
                {summaryLoading ? (
                  <Skeleton width={120} height={36} sx={{ bgcolor: "rgba(255,255,255,0.06)" }} />
                ) : (
                  <Typography variant="h5" sx={{ fontWeight: 900, color: "#FFFFFF", mt: 0.5 }}>
                    {(summary?.total_count || 0).toLocaleString()}
                  </Typography>
                )}
                <Typography variant="caption" sx={{ color: "#38BDF8", fontWeight: 600, fontSize: "11.5px" }}>
                  Vol: {formatINR(summary?.total_amount)}
                </Typography>
              </Box>
              <Box
                sx={{
                  p: 1,
                  borderRadius: "8px",
                  bgcolor: "rgba(56, 189, 248, 0.1)",
                  color: "#38BDF8",
                }}
              >
                <LayersIcon fontSize="small" />
              </Box>
            </Stack>
          </Card>
        </Grid>

        {/* Card 2: Total Credit (CR) */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              bgcolor: "#0B1533",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              borderRadius: "12px",
              p: 1.5,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="caption" sx={{ color: "#10B981", fontWeight: 700, textTransform: "uppercase", fontSize: "11px" }}>
                  Total Credit (CR)
                </Typography>
                {summaryLoading ? (
                  <Skeleton width={140} height={36} sx={{ bgcolor: "rgba(255,255,255,0.06)" }} />
                ) : (
                  <Typography variant="h5" sx={{ fontWeight: 900, color: "#10B981", mt: 0.5 }}>
                    {formatINR(summary?.total_credit)}
                  </Typography>
                )}
                <Typography variant="caption" sx={{ color: "#6EE7B7", fontSize: "11px", fontWeight: 600 }}>
                  Inflow across all wallets
                </Typography>
              </Box>
              <Box
                sx={{
                  p: 1,
                  borderRadius: "8px",
                  bgcolor: "rgba(16, 185, 129, 0.12)",
                  color: "#10B981",
                }}
              >
                <ArrowDownwardIcon fontSize="small" />
              </Box>
            </Stack>
          </Card>
        </Grid>

        {/* Card 3: Total Debit (DR) */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              bgcolor: "#0B1533",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: "12px",
              p: 1.5,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="caption" sx={{ color: "#EF4444", fontWeight: 700, textTransform: "uppercase", fontSize: "11px" }}>
                  Total Debit (DR)
                </Typography>
                {summaryLoading ? (
                  <Skeleton width={140} height={36} sx={{ bgcolor: "rgba(255,255,255,0.06)" }} />
                ) : (
                  <Typography variant="h5" sx={{ fontWeight: 900, color: "#EF4444", mt: 0.5 }}>
                    {formatINR(summary?.total_debit)}
                  </Typography>
                )}
                <Typography variant="caption" sx={{ color: "#FCA5A5", fontSize: "11px", fontWeight: 600 }}>
                  Outflow & Service Consumption
                </Typography>
              </Box>
              <Box
                sx={{
                  p: 1,
                  borderRadius: "8px",
                  bgcolor: "rgba(239, 68, 68, 0.12)",
                  color: "#EF4444",
                }}
              >
                <ArrowUpwardIcon fontSize="small" />
              </Box>
            </Stack>
          </Card>
        </Grid>

        {/* Card 4: Net Movement */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              bgcolor: "#0B1533",
              border: "1px solid rgba(245, 158, 11, 0.2)",
              borderRadius: "12px",
              p: 1.5,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="caption" sx={{ color: "#F59E0B", fontWeight: 700, textTransform: "uppercase", fontSize: "11px" }}>
                  Net Movement (CR - DR)
                </Typography>
                {summaryLoading ? (
                  <Skeleton width={140} height={36} sx={{ bgcolor: "rgba(255,255,255,0.06)" }} />
                ) : (
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 900,
                      color: (summary?.net_movement || 0) >= 0 ? "#10B981" : "#EF4444",
                      mt: 0.5,
                    }}
                  >
                    {formatINR(summary?.net_movement)}
                  </Typography>
                )}
                <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px" }}>
                  Success: <b style={{ color: "#10B981" }}>{summary?.successful_count || 0}</b> | Failed: <b style={{ color: "#EF4444" }}>{summary?.failed_count || 0}</b> | Rev: <b style={{ color: "#C084FC" }}>{summary?.reversed_count || 0}</b>
                </Typography>
              </Box>
              <Box
                sx={{
                  p: 1,
                  borderRadius: "8px",
                  bgcolor: "rgba(245, 158, 11, 0.12)",
                  color: "#F59E0B",
                }}
              >
                <SwapHorizIcon fontSize="small" />
              </Box>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* ─────────────────────────────────────────────────────────────
          3. DYNAMIC FILTER TOOLBAR & CONTROLS
      ───────────────────────────────────────────────────────────── */}
      <Paper
        sx={{
          bgcolor: "#0E1838",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "12px",
          p: 2,
          mb: 2.5,
        }}
      >
        {/* Row 1: Primary Dropdown Filters */}
        <Grid container spacing={1.5} alignItems="center">
          {/* Company Filter */}
          <Grid item xs={12} sm={6} md={2.4}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: "#94A3B8", fontSize: "13px" }}>Company</InputLabel>
              <Select
                value={companyId}
                label="Company"
                onChange={(e) => {
                  setCompanyId(e.target.value);
                  setPage(0);
                }}
                sx={{
                  bgcolor: "#070E20",
                  color: "#FFFFFF",
                  fontSize: "13px",
                  borderRadius: "8px",
                  ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.15)" },
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#38BDF8" },
                }}
              >
                <MenuItem value="ALL">All Companies</MenuItem>
                {filterOptions.companies.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* User Type Filter */}
          <Grid item xs={12} sm={6} md={2.4}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: "#94A3B8", fontSize: "13px" }}>User Type</InputLabel>
              <Select
                value={userType}
                label="User Type"
                onChange={(e) => {
                  setUserType(e.target.value);
                  setPage(0);
                }}
                sx={{
                  bgcolor: "#070E20",
                  color: "#FFFFFF",
                  fontSize: "13px",
                  borderRadius: "8px",
                  ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.15)" },
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#38BDF8" },
                }}
              >
                <MenuItem value="ALL">All User Types</MenuItem>
                {filterOptions.user_types.map((u) => (
                  <MenuItem key={u.code} value={u.code}>
                    {u.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Service Filter */}
          <Grid item xs={12} sm={6} md={2.4}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: "#94A3B8", fontSize: "13px" }}>Service</InputLabel>
              <Select
                value={serviceName}
                label="Service"
                onChange={(e) => {
                  setServiceName(e.target.value);
                  setPage(0);
                }}
                sx={{
                  bgcolor: "#070E20",
                  color: "#FFFFFF",
                  fontSize: "13px",
                  borderRadius: "8px",
                  ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.15)" },
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#38BDF8" },
                }}
              >
                <MenuItem value="ALL">All Services</MenuItem>
                {filterOptions.services.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Transaction Source Filter */}
          <Grid item xs={12} sm={6} md={2.4}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: "#94A3B8", fontSize: "13px" }}>Txn Source</InputLabel>
              <Select
                value={transactionSource}
                label="Txn Source"
                onChange={(e) => {
                  setTransactionSource(e.target.value);
                  setPage(0);
                }}
                sx={{
                  bgcolor: "#070E20",
                  color: "#FFFFFF",
                  fontSize: "13px",
                  borderRadius: "8px",
                  ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.15)" },
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#38BDF8" },
                }}
              >
                <MenuItem value="ALL">All Sources</MenuItem>
                {filterOptions.sources.map((src) => (
                  <MenuItem key={src.code} value={src.code}>
                    {src.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Status Filter */}
          <Grid item xs={12} sm={6} md={2.4}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: "#94A3B8", fontSize: "13px" }}>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(0);
                }}
                sx={{
                  bgcolor: "#070E20",
                  color: "#FFFFFF",
                  fontSize: "13px",
                  borderRadius: "8px",
                  ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.15)" },
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#38BDF8" },
                }}
              >
                <MenuItem value="ALL">All Statuses</MenuItem>
                {filterOptions.statuses.map((st) => (
                  <MenuItem key={st} value={st}>
                    {st}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Row 2: Search Box & Date Shortcuts */}
        <Grid container spacing={1.5} alignItems="center" sx={{ mt: 0.5 }}>
          {/* Universal Search */}
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by Txn ID, Ref ID, Narration, User Name or Company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#94A3B8", fontSize: 18 }} />
                  </InputAdornment>
                ),
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearch("")} sx={{ color: "#94A3B8" }}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
              sx={{
                bgcolor: "#070E20",
                borderRadius: "8px",
                input: { color: "#FFFFFF", fontSize: "13px" },
                ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.15)" },
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#38BDF8" },
              }}
            />
          </Grid>

          {/* Quick Date Presets */}
          <Grid item xs={12} md={5}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 600 }}>
                Dates:
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() => applyDatePreset("today")}
                sx={{
                  color: "#94A3B8",
                  borderColor: "rgba(255,255,255,0.15)",
                  fontSize: "11px",
                  py: 0.3,
                  px: 1,
                  minWidth: "auto",
                  textTransform: "none",
                }}
              >
                Today
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => applyDatePreset("yesterday")}
                sx={{
                  color: "#94A3B8",
                  borderColor: "rgba(255,255,255,0.15)",
                  fontSize: "11px",
                  py: 0.3,
                  px: 1,
                  minWidth: "auto",
                  textTransform: "none",
                }}
              >
                Yesterday
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => applyDatePreset("week")}
                sx={{
                  color: "#94A3B8",
                  borderColor: "rgba(255,255,255,0.15)",
                  fontSize: "11px",
                  py: 0.3,
                  px: 1,
                  minWidth: "auto",
                  textTransform: "none",
                }}
              >
                Last 7 Days
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => applyDatePreset("month")}
                sx={{
                  color: "#94A3B8",
                  borderColor: "rgba(255,255,255,0.15)",
                  fontSize: "11px",
                  py: 0.3,
                  px: 1,
                  minWidth: "auto",
                  textTransform: "none",
                }}
              >
                Last 30 Days
              </Button>
            </Stack>
          </Grid>

          {/* Toggle Advanced Filters & Reset */}
          <Grid item xs={12} md={2}>
            <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
              <Button
                size="small"
                startIcon={<FilterListIcon />}
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                sx={{
                  color: showAdvancedFilters ? "#38BDF8" : "#94A3B8",
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "12px",
                }}
              >
                {showAdvancedFilters ? "Hide" : "More"} ({activeFiltersCount})
              </Button>

              {activeFiltersCount > 0 && (
                <Button
                  size="small"
                  onClick={handleResetFilters}
                  sx={{
                    color: "#EF4444",
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: "12px",
                  }}
                >
                  Reset
                </Button>
              )}
            </Stack>
          </Grid>
        </Grid>

        {/* Row 3: Collapsible Advanced Filters */}
        <Collapse in={showAdvancedFilters}>
          <Divider sx={{ my: 1.5, borderColor: "rgba(255,255,255,0.08)" }} />
          <Grid container spacing={1.5} alignItems="center">
            {/* User Typeahead Autocomplete */}
            <Grid item xs={12} sm={6} md={3}>
              <Autocomplete
                size="small"
                options={userSearchOptions}
                getOptionLabel={(opt) => opt.display_label || opt.name || ""}
                loading={userSearchLoading}
                value={selectedUserObj}
                onChange={(_, val) => {
                  setSelectedUserObj(val);
                  setPage(0);
                }}
                onInputChange={(_, val) => handleUserSearchChange(val)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search User / Store..."
                    label="User Typeahead"
                    InputLabelProps={{ sx: { color: "#94A3B8", fontSize: "13px" } }}
                    sx={{
                      bgcolor: "#070E20",
                      borderRadius: "8px",
                      input: { color: "#FFFFFF", fontSize: "13px" },
                      ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.15)" },
                    }}
                  />
                )}
              />
            </Grid>

            {/* Vendor Filter */}
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: "#94A3B8", fontSize: "13px" }}>Vendor</InputLabel>
                <Select
                  value={vendorName}
                  label="Vendor"
                  onChange={(e) => {
                    setVendorName(e.target.value);
                    setPage(0);
                  }}
                  sx={{
                    bgcolor: "#070E20",
                    color: "#FFFFFF",
                    fontSize: "13px",
                    borderRadius: "8px",
                    ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.15)" },
                  }}
                >
                  <MenuItem value="ALL">All Vendors</MenuItem>
                  {filterOptions.vendors.map((v) => (
                    <MenuItem key={v} value={v}>
                      {v}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Txn Type Filter (CR/DR) */}
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: "#94A3B8", fontSize: "13px" }}>CR / DR</InputLabel>
                <Select
                  value={transactionType}
                  label="CR / DR"
                  onChange={(e) => {
                    setTransactionType(e.target.value);
                    setPage(0);
                  }}
                  sx={{
                    bgcolor: "#070E20",
                    color: "#FFFFFF",
                    fontSize: "13px",
                    borderRadius: "8px",
                    ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.15)" },
                  }}
                >
                  <MenuItem value="ALL">All Entries</MenuItem>
                  <MenuItem value="CREDIT">Credit (CR) Only</MenuItem>
                  <MenuItem value="DEBIT">Debit (DR) Only</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* From Date */}
            <Grid item xs={12} sm={6} md={2.5}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="From Date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(0);
                }}
                InputLabelProps={{ shrink: true, sx: { color: "#94A3B8", fontSize: "13px" } }}
                sx={{
                  bgcolor: "#070E20",
                  borderRadius: "8px",
                  input: { color: "#FFFFFF", fontSize: "13px" },
                  ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.15)" },
                }}
              />
            </Grid>

            {/* To Date */}
            <Grid item xs={12} sm={6} md={2.5}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="To Date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(0);
                }}
                InputLabelProps={{ shrink: true, sx: { color: "#94A3B8", fontSize: "13px" } }}
                sx={{
                  bgcolor: "#070E20",
                  borderRadius: "8px",
                  input: { color: "#FFFFFF", fontSize: "13px" },
                  ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.15)" },
                }}
              />
            </Grid>
          </Grid>
        </Collapse>
      </Paper>

      {/* ─────────────────────────────────────────────────────────────
          4. AUTHORITATIVE MASTER TRANSACTION TABLE
      ───────────────────────────────────────────────────────────── */}
      <Paper
        sx={{
          bgcolor: "#0B1533",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        }}
      >
        <TableContainer sx={{ maxHeight: "calc(100vh - 380px)", minHeight: 380 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ bgcolor: "#0E1C44", color: "#94A3B8", fontWeight: 800, fontSize: "12px", py: 1.5, minWidth: 150 }}>
                  Date / Time
                </TableCell>
                <TableCell sx={{ bgcolor: "#0E1C44", color: "#94A3B8", fontWeight: 800, fontSize: "12px", py: 1.5, minWidth: 140 }}>
                  Txn ID
                </TableCell>
                <TableCell sx={{ bgcolor: "#0E1C44", color: "#94A3B8", fontWeight: 800, fontSize: "12px", py: 1.5, minWidth: 120 }}>
                  Company
                </TableCell>
                <TableCell sx={{ bgcolor: "#0E1C44", color: "#94A3B8", fontWeight: 800, fontSize: "12px", py: 1.5, minWidth: 150 }}>
                  User / Store
                </TableCell>
                <TableCell sx={{ bgcolor: "#0E1C44", color: "#94A3B8", fontWeight: 800, fontSize: "12px", py: 1.5, minWidth: 110 }}>
                  User Type
                </TableCell>
                <TableCell sx={{ bgcolor: "#0E1C44", color: "#94A3B8", fontWeight: 800, fontSize: "12px", py: 1.5, minWidth: 130 }}>
                  Vendor
                </TableCell>
                <TableCell sx={{ bgcolor: "#0E1C44", color: "#94A3B8", fontWeight: 800, fontSize: "12px", py: 1.5, minWidth: 130 }}>
                  Txn Source
                </TableCell>
                <TableCell sx={{ bgcolor: "#0E1C44", color: "#94A3B8", fontWeight: 800, fontSize: "12px", py: 1.5, minWidth: 130 }}>
                  Service
                </TableCell>
                <TableCell sx={{ bgcolor: "#0E1C44", color: "#94A3B8", fontWeight: 800, fontSize: "12px", py: 1.5, minWidth: 80 }}>
                  Type
                </TableCell>
                <TableCell align="right" sx={{ bgcolor: "#0E1C44", color: "#10B981", fontWeight: 800, fontSize: "12.5px", py: 1.5, minWidth: 110 }}>
                  CR (₹)
                </TableCell>
                <TableCell align="right" sx={{ bgcolor: "#0E1C44", color: "#EF4444", fontWeight: 800, fontSize: "12.5px", py: 1.5, minWidth: 110 }}>
                  DR (₹)
                </TableCell>
                <TableCell align="right" sx={{ bgcolor: "#0E1C44", color: "#CBD5E1", fontWeight: 800, fontSize: "12px", py: 1.5, minWidth: 110 }}>
                  Opening Bal (₹)
                </TableCell>
                <TableCell align="right" sx={{ bgcolor: "#0E1C44", color: "#FFFFFF", fontWeight: 800, fontSize: "12px", py: 1.5, minWidth: 110 }}>
                  Closing Bal (₹)
                </TableCell>
                <TableCell sx={{ bgcolor: "#0E1C44", color: "#94A3B8", fontWeight: 800, fontSize: "12px", py: 1.5, minWidth: 110 }}>
                  Status
                </TableCell>
                <TableCell sx={{ bgcolor: "#0E1C44", color: "#94A3B8", fontWeight: 800, fontSize: "12px", py: 1.5, minWidth: 140 }}>
                  Service Ref
                </TableCell>
                <TableCell align="center" sx={{ bgcolor: "#0E1C44", color: "#94A3B8", fontWeight: 800, fontSize: "12px", py: 1.5, minWidth: 90 }}>
                  Action
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, idx) => (
                  <TableRow key={idx}>
                    {Array.from({ length: 16 }).map((_, cIdx) => (
                      <TableCell key={cIdx} sx={{ py: 1.5, borderColor: "rgba(255,255,255,0.05)" }}>
                        <Skeleton height={24} sx={{ bgcolor: "rgba(255,255,255,0.04)" }} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={16} align="center" sx={{ py: 8, borderColor: "transparent" }}>
                    <Box sx={{ textAlign: "center", color: "#64748B" }}>
                      <ReceiptIcon sx={{ fontSize: 48, mb: 1, opacity: 0.4 }} />
                      <Typography variant="body1" sx={{ fontWeight: 600, color: "#94A3B8" }}>
                        No transactions found
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#64748B" }}>
                        Try adjusting your filters or search terms.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row, index) => {
                  const isCredit = row.entry_type === "CREDIT";
                  const isDebit = row.entry_type === "DEBIT";

                  return (
                    <TableRow
                      key={row.id || index}
                      hover
                      sx={{
                        "&:hover": { bgcolor: "rgba(56, 189, 248, 0.04) !important" },
                        "&:nth-of-type(even)": { bgcolor: "rgba(255, 255, 255, 0.015)" },
                        borderColor: "rgba(255, 255, 255, 0.05)",
                      }}
                    >
                      {/* Date / Time */}
                      <TableCell sx={{ color: "#E2E8F0", fontSize: "12.5px", py: 1.2, borderColor: "rgba(255,255,255,0.05)" }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "12.5px", color: "#FFFFFF" }}>
                          {row.date}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px" }}>
                          {row.time}
                        </Typography>
                      </TableCell>

                      {/* Txn ID */}
                      <TableCell sx={{ borderColor: "rgba(255,255,255,0.05)" }}>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Typography
                            variant="body2"
                            onClick={() => handleOpenDetail(row.txn_id)}
                            sx={{
                              fontFamily: "monospace",
                              fontWeight: 800,
                              fontSize: "12.5px",
                              color: "#38BDF8",
                              cursor: "pointer",
                              "&:hover": { textDecoration: "underline" },
                            }}
                          >
                            {row.txn_id}
                          </Typography>
                          <Tooltip title={copiedKey === `txn-${row.txn_id}` ? "Copied!" : "Copy Txn ID"}>
                            <IconButton
                              size="small"
                              onClick={() => copyToClipboard(row.txn_id, `txn-${row.txn_id}`)}
                              sx={{ p: 0.2, color: copiedKey === `txn-${row.txn_id}` ? "#10B981" : "#64748B" }}
                            >
                              {copiedKey === `txn-${row.txn_id}` ? <CheckIcon sx={{ fontSize: 13 }} /> : <ContentCopyIcon sx={{ fontSize: 13 }} />}
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>

                      {/* Company */}
                      <TableCell sx={{ color: "#F8FAFC", fontWeight: 600, fontSize: "12px", borderColor: "rgba(255,255,255,0.05)" }}>
                        <Chip
                          label={row.company_name || "Pay2Pay"}
                          size="small"
                          sx={{
                            bgcolor: "rgba(56, 189, 248, 0.08)",
                            color: "#38BDF8",
                            fontWeight: 700,
                            fontSize: "11px",
                            height: 22,
                          }}
                        />
                      </TableCell>

                      {/* User / Store */}
                      <TableCell sx={{ borderColor: "rgba(255,255,255,0.05)" }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "12.5px", color: "#F1F5F9" }}>
                          {row.user_name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px" }}>
                          {row.user_code !== "—" ? row.user_code : row.user_mobile}
                        </Typography>
                      </TableCell>

                      {/* User Type */}
                      <TableCell sx={{ borderColor: "rgba(255,255,255,0.05)" }}>
                        <Chip
                          label={row.user_type}
                          size="small"
                          sx={{
                            bgcolor: "rgba(255, 255, 255, 0.06)",
                            color: "#CBD5E1",
                            fontWeight: 700,
                            fontSize: "10.5px",
                            height: 20,
                          }}
                        />
                      </TableCell>

                      {/* Vendor */}
                      <TableCell sx={{ color: "#CBD5E1", fontSize: "12px", fontWeight: 600, borderColor: "rgba(255,255,255,0.05)" }}>
                        {row.vendor_name}
                      </TableCell>

                      {/* Txn Source */}
                      <TableCell sx={{ borderColor: "rgba(255,255,255,0.05)" }}>
                        <Chip
                          label={row.transaction_source}
                          size="small"
                          sx={{
                            bgcolor: "rgba(148, 163, 184, 0.1)",
                            color: "#E2E8F0",
                            fontWeight: 600,
                            fontSize: "10.5px",
                            height: 20,
                          }}
                        />
                      </TableCell>

                      {/* Service */}
                      <TableCell sx={{ color: "#F1F5F9", fontWeight: 700, fontSize: "12px", borderColor: "rgba(255,255,255,0.05)" }}>
                        {row.service_name}
                      </TableCell>

                      {/* Type (CR/DR Badge) */}
                      <TableCell sx={{ borderColor: "rgba(255,255,255,0.05)" }}>
                        <Chip
                          label={isCredit ? "CR" : "DR"}
                          size="small"
                          sx={{
                            bgcolor: isCredit ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                            color: isCredit ? "#10B981" : "#EF4444",
                            fontWeight: 900,
                            fontSize: "11px",
                            height: 22,
                            width: 38,
                          }}
                        />
                      </TableCell>

                      {/* CR Amount (Strict Financial Column) */}
                      <TableCell align="right" sx={{ borderColor: "rgba(255,255,255,0.05)" }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 800,
                            fontSize: "13.5px",
                            color: row.cr > 0 ? "#10B981" : "#475569",
                          }}
                        >
                          {row.cr > 0 ? formatINR(row.cr) : "—"}
                        </Typography>
                      </TableCell>

                      {/* DR Amount (Strict Financial Column) */}
                      <TableCell align="right" sx={{ borderColor: "rgba(255,255,255,0.05)" }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 800,
                            fontSize: "13.5px",
                            color: row.dr > 0 ? "#EF4444" : "#475569",
                          }}
                        >
                          {row.dr > 0 ? formatINR(row.dr) : "—"}
                        </Typography>
                      </TableCell>

                      {/* Opening Balance */}
                      <TableCell align="right" sx={{ borderColor: "rgba(255,255,255,0.05)" }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "13px", color: "#CBD5E1" }}>
                          {formatINR(row.opening_balance)}
                        </Typography>
                      </TableCell>

                      {/* Closing Balance */}
                      <TableCell align="right" sx={{ borderColor: "rgba(255,255,255,0.05)" }}>
                        <Typography variant="body2" sx={{ fontWeight: 800, fontSize: "13px", color: "#F8FAFC" }}>
                          {formatINR(row.closing_balance)}
                        </Typography>
                      </TableCell>

                      {/* Status */}
                      <TableCell sx={{ borderColor: "rgba(255,255,255,0.05)" }}>
                        {renderStatusBadge(row.status)}
                      </TableCell>

                      {/* Service Ref */}
                      <TableCell sx={{ borderColor: "rgba(255,255,255,0.05)" }}>
                        <Typography variant="caption" sx={{ fontFamily: "monospace", color: "#94A3B8", fontSize: "11px" }}>
                          {row.service_reference}
                        </Typography>
                      </TableCell>

                      {/* Action */}
                      <TableCell align="center" sx={{ borderColor: "rgba(255,255,255,0.05)" }}>
                        <Tooltip title="View Transaction Audit Trail">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDetail(row.txn_id)}
                            sx={{
                              color: "#38BDF8",
                              bgcolor: "rgba(56, 189, 248, 0.08)",
                              "&:hover": { bgcolor: "rgba(56, 189, 248, 0.2)" },
                            }}
                          >
                            <VisibilityIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Server-Side Pagination */}
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
            bgcolor: "#0E1C44",
            color: "#94A3B8",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            ".MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows": {
              fontSize: "12px",
              color: "#94A3B8",
            },
            ".MuiTablePagination-select": {
              color: "#FFFFFF",
              fontSize: "12px",
            },
            ".MuiSvgIcon-root": {
              color: "#38BDF8",
            },
          }}
        />
      </Paper>

      {/* ─────────────────────────────────────────────────────────────
          5. INTERACTIVE DETAILS DRAWER & AUDIT TRAIL
      ───────────────────────────────────────────────────────────── */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 520, md: 580 },
            bgcolor: "#070E20",
            color: "#FFFFFF",
            borderLeft: "1px solid rgba(255,255,255,0.1)",
            p: 3,
          },
        }}
      >
        {drawerLoading ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <CircularProgress size={36} sx={{ color: "#38BDF8", mb: 2 }} />
            <Typography variant="body2" sx={{ color: "#94A3B8" }}>
              Loading authoritative transaction lifecycle...
            </Typography>
          </Box>
        ) : !selectedTxn ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <ErrorOutlinedIcon sx={{ fontSize: 48, color: "#EF4444", mb: 1 }} />
            <Typography variant="body1" sx={{ color: "#FFFFFF", fontWeight: 700 }}>
              Transaction Not Found
            </Typography>
          </Box>
        ) : (
          <Box>
            {/* Drawer Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2.5 }}>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="h6" sx={{ fontWeight: 800, color: "#FFFFFF" }}>
                    Transaction Details
                  </Typography>
                  {renderStatusBadge(selectedTxn.status)}
                </Stack>
                <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                  {selectedTxn.date_time}
                </Typography>
              </Box>
              <IconButton onClick={() => setDrawerOpen(false)} sx={{ color: "#94A3B8" }}>
                <CloseIcon />
              </IconButton>
            </Stack>

            {/* Financial Impact Card */}
            <Card
              sx={{
                bgcolor: "#0B1533",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                p: 2,
                mb: 2.5,
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" sx={{ color: "#94A3B8", textTransform: "uppercase", fontWeight: 700 }}>
                    Transaction Amount
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 900,
                      color: selectedTxn.entry_type === "CREDIT" ? "#10B981" : "#EF4444",
                      mt: 0.5,
                    }}
                  >
                    {selectedTxn.entry_type === "CREDIT" ? "+" : "-"} {formatINR(selectedTxn.amount)}
                  </Typography>
                </Box>
                <Chip
                  label={selectedTxn.entry_type}
                  sx={{
                    bgcolor: selectedTxn.entry_type === "CREDIT" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                    color: selectedTxn.entry_type === "CREDIT" ? "#10B981" : "#EF4444",
                    fontWeight: 900,
                    fontSize: "13px",
                  }}
                />
              </Stack>

              <Divider sx={{ my: 1.5, borderColor: "rgba(255,255,255,0.08)" }} />

              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                    Opening Balance
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "#CBD5E1" }}>
                    {formatINR(selectedTxn.opening_balance)}
                  </Typography>
                </Grid>
                <Grid item xs={6} sx={{ textAlign: "right" }}>
                  <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                    Closing Balance
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: "#FFFFFF" }}>
                    {formatINR(selectedTxn.closing_balance)}
                  </Typography>
                </Grid>
              </Grid>
            </Card>

            {/* Entity & Transaction Meta Grid */}
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#38BDF8", mb: 1, textTransform: "uppercase", fontSize: "11px" }}>
              Core Metadata
            </Typography>
            <Paper sx={{ bgcolor: "#0B1533", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", p: 1.5, mb: 2.5 }}>
              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: "#94A3B8" }}>Txn ID</Typography>
                  <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700, color: "#FFFFFF" }}>
                    {selectedTxn.txn_id}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: "#94A3B8" }}>Company</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "#FFFFFF" }}>
                    {selectedTxn.company_name} ({selectedTxn.company_code})
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: "#94A3B8" }}>User / Store</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "#FFFFFF" }}>
                    {selectedTxn.user_name}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: "#94A3B8" }}>User Type / Code</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "#FFFFFF" }}>
                    {selectedTxn.user_type} • {selectedTxn.user_code}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: "#94A3B8" }}>Service / Vendor</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "#FFFFFF" }}>
                    {selectedTxn.service_name} • {selectedTxn.vendor_name}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: "#94A3B8" }}>Wallet Type</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "#FFFFFF" }}>
                    {selectedTxn.wallet_type}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ color: "#94A3B8" }}>Service Ref / Narration</Typography>
                  <Typography variant="body2" sx={{ color: "#E2E8F0", fontSize: "12px", mt: 0.2 }}>
                    {selectedTxn.narration} ({selectedTxn.service_reference})
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Lifecycle Audit Trail */}
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#38BDF8", mb: 1.5, textTransform: "uppercase", fontSize: "11px" }}>
              Authoritative Lifecycle Audit Trail
            </Typography>
            <Box sx={{ pl: 1, borderLeft: "2px solid rgba(56, 189, 248, 0.3)", ml: 1, mb: 3 }}>
              {selectedTxn.audit_trail && selectedTxn.audit_trail.length > 0 ? (
                selectedTxn.audit_trail.map((step, sIdx) => (
                  <Box key={sIdx} sx={{ position: "relative", mb: 2, pl: 2 }}>
                    <Box
                      sx={{
                        position: "absolute",
                        left: -11,
                        top: 2,
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        bgcolor: step.status === "SUCCESS" ? "#10B981" : (step.status === "REVERSED" ? "#A855F7" : "#38BDF8"),
                        border: "2px solid #070E20",
                      }}
                    />
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" sx={{ fontWeight: 800, color: "#FFFFFF" }}>
                        {step.action}
                      </Typography>
                      <Chip
                        label={step.status}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: "10px",
                          fontWeight: 800,
                          bgcolor: "rgba(255,255,255,0.08)",
                          color: "#E2E8F0",
                        }}
                      />
                    </Stack>
                    <Typography variant="caption" sx={{ color: "#94A3B8", display: "block", mt: 0.3 }}>
                      {step.description}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#64748B", fontSize: "10.5px" }}>
                      Actor: {step.actor} • {step.timestamp}
                    </Typography>
                  </Box>
                ))
              ) : (
                <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                  No extra audit events recorded.
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </Drawer>

      {/* Toast Notification */}
      <Snackbar
        open={toastMsg.open}
        autoHideDuration={4000}
        onClose={() => setToastMsg({ ...toastMsg, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setToastMsg({ ...toastMsg, open: false })}
          severity={toastMsg.severity}
          sx={{ width: "100%", bgcolor: "#0B1533", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          {toastMsg.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
