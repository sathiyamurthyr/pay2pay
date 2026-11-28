"use client";

export const dynamic = "force-dynamic";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import ReceiptIcon from "@mui/icons-material/Receipt";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";
import { BankLogoBadge, CardNetworkBadge, resolveBankTheme } from "@/components/retailer/BankBrandBadge";
import {
  RetailerCardsDashboardResponse,
  RetailerSavedCard,
  retailerCardsApi,
} from "@/services/retailer-cards-api";
import { isValidIndianMobile, normalizeIndianMobile, ordinalDay, sanitizeDigits } from "@/lib/card-validation";

type SectionTab =
  | "all"
  | "generated_today"
  | "due_today"
  | "upcoming_gen"
  | "upcoming_due"
  | "overdue";

const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);

export default function RetailerCreditCardManagementPage() {
  const branding = useCompanyBranding();
  const primaryGreen = "#16A34A";
  const darkGreen = "#15803D";
  const softGreenBg = "#ECFDF5";
  const softGreenBorder = "#BBF7D0";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters & pagination
  const [sectionTab, setSectionTab] = useState<SectionTab>("all");
  const [rangeFilter, setRangeFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [bankFilter, setBankFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState<number>(0); // 0-indexed for MUI TablePagination
  const [pageSize, setPageSize] = useState<number>(10);

  const [dashboard, setDashboard] = useState<RetailerCardsDashboardResponse | null>(null);

  // Action dialogs
  const [viewTarget, setViewTarget] = useState<RetailerSavedCard | null>(null);
  const [editTarget, setEditTarget] = useState<RetailerSavedCard | null>(null);
  const [editName, setEditName] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [editBankName, setEditBankName] = useState("");
  const [editGenDay, setEditGenDay] = useState<number>(1);
  const [editDueDay, setEditDueDay] = useState<number>(15);
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<RetailerSavedCard | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await retailerCardsApi.getDashboard({
        range_filter: rangeFilter,
        from_date: rangeFilter === "custom" ? fromDate || undefined : undefined,
        to_date: rangeFilter === "custom" ? toDate || undefined : undefined,
        bank_name: bankFilter !== "ALL" ? bankFilter : undefined,
        card_status: statusFilter !== "ALL" ? statusFilter : undefined,
        search: search.trim() || undefined,
        page: page + 1,
        page_size: pageSize,
      });
      setDashboard(data);
    } catch (err: any) {
      setError(String(err?.response?.data?.detail || err?.message || "Unable to load Credit Card Management."));
    } finally {
      setLoading(false);
    }
  }, [rangeFilter, fromDate, toDate, bankFilter, statusFilter, search, page, pageSize]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const openEditModal = (card: RetailerSavedCard) => {
    setEditTarget(card);
    setEditName(card.card_name);
    setEditMobile(card.mobile_no);
    setEditBankName(card.bank_name);
    setEditGenDay(card.bill_gen_day);
    setEditDueDay(card.bill_due_day);
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    if (editName.trim().length < 2) {
      setError("Cardholder Name must be at least 2 characters.");
      return;
    }
    if (!isValidIndianMobile(editMobile)) {
      setError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }
    setSavingEdit(true);
    try {
      await retailerCardsApi.updateCard(editTarget.ref_id, {
        card_name: editName.trim(),
        mobile_no: normalizeIndianMobile(editMobile),
        bank_name: editBankName.trim(),
        bill_gen_day: editGenDay,
        bill_due_day: editDueDay,
      });
      setSuccessMsg(`Updated card ${editTarget.masked_card_no}.`);
      setEditTarget(null);
      await loadDashboard();
    } catch (err: any) {
      setError(String(err?.response?.data?.detail || err?.message || "Failed to update credit card."));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await retailerCardsApi.deleteCard(deleteTarget.ref_id);
      setSuccessMsg(`Deleted card ${deleteTarget.masked_card_no} (${deleteTarget.card_name}).`);
      setDeleteTarget(null);
      await loadDashboard();
    } catch (err: any) {
      setError(String(err?.response?.data?.detail || err?.message || "Failed to delete credit card."));
    } finally {
      setDeleting(false);
    }
  };

  const handleMarkPaid = async (card: RetailerSavedCard) => {
    try {
      await retailerCardsApi.markCyclePaid(card.ref_id);
      setSuccessMsg(`Marked current cycle bill paid for ${card.masked_card_no}.`);
      setViewTarget(null);
      await loadDashboard();
    } catch (err: any) {
      setError(String(err?.response?.data?.detail || err?.message || "Failed to update cycle payment status."));
    }
  };

  const rowsToDisplay: RetailerSavedCard[] = useMemo(() => {
    if (!dashboard) return [];
    switch (sectionTab) {
      case "generated_today":
        return dashboard.bills_generated_today || [];
      case "due_today":
        return dashboard.bills_due_today || [];
      case "upcoming_gen":
        return dashboard.upcoming_bill_generation || [];
      case "upcoming_due":
        return dashboard.upcoming_bill_due || [];
      case "overdue":
        return dashboard.overdue_bills || [];
      default:
        return dashboard.cards || [];
    }
  }, [dashboard, sectionTab]);

  const summary = dashboard?.summary || {
    total_cards: 0,
    bills_generated_today_count: 0,
    bills_due_today_count: 0,
    upcoming_7_days_count: 0,
    upcoming_30_days_count: 0,
    overdue_bills_count: 0,
  };

  const renderStatusChip = (card: RetailerSavedCard) => {
    // Red = Overdue, Orange = Due Today, Blue = Upcoming
    if (card.bill_status === "OVERDUE") {
      return (
        <Chip
          size="small"
          label={card.status_label}
          sx={{ fontWeight: 800, bgcolor: "#FEE2E2", color: "#B91C1C", border: "1px solid #FCA5A5" }}
        />
      );
    }
    if (card.bill_status === "DUE_TODAY") {
      return (
        <Chip
          size="small"
          label="Due Today"
          sx={{ fontWeight: 800, bgcolor: "#FFEDD5", color: "#C2410C", border: "1px solid #FDBA74" }}
        />
      );
    }
    return (
      <Chip
        size="small"
        label={card.status_label}
        sx={{ fontWeight: 700, bgcolor: "#DBEAFE", color: "#1D4ED8", border: "1px solid #93C5FD" }}
      />
    );
  };

  return (
    <Box sx={{ maxWidth: 1460, mx: "auto", pb: 5 }}>
      {/* Header Banner */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3 },
          mb: 3,
          borderRadius: "18px",
          background: "linear-gradient(135deg, #FFFFFF 0%, #ECFDF5 100%)",
          border: `1px solid ${softGreenBorder}`,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: "14px",
              bgcolor: primaryGreen,
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 20px rgba(22, 163, 74, 0.22)",
            }}
          >
            <CreditCardIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="h5" sx={{ fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em" }}>
                Credit Card Management
              </Typography>
              {branding?.company_name && (
                <Chip
                  size="small"
                  label={branding.company_name}
                  sx={{
                    bgcolor: softGreenBg,
                    color: darkGreen,
                    border: `1px solid ${softGreenBorder}`,
                    fontWeight: 700,
                    fontSize: "11px",
                  }}
                />
              )}
            </Stack>
            <Typography variant="body2" sx={{ color: "#475569", mt: 0.4 }}>
              Track Bills Generated Today, Bills Due Today, Upcoming Cycles &amp; Overdue Credit Card Bills.
              {dashboard?.reference_date ? ` Server Date (IST): ${dashboard.reference_date}` : ""}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button
            variant="outlined"
            onClick={loadDashboard}
            startIcon={<RefreshIcon />}
            sx={{
              borderRadius: "12px",
              textTransform: "none",
              fontWeight: 700,
              borderColor: softGreenBorder,
              color: darkGreen,
              bgcolor: "#FFFFFF",
              "&:hover": { bgcolor: softGreenBg, borderColor: primaryGreen },
            }}
          >
            Refresh
          </Button>
          <Button
            component={Link}
            href="/retailer/cards/new"
            variant="contained"
            startIcon={<AddIcon />}
            sx={{
              borderRadius: "12px",
              textTransform: "none",
              fontWeight: 800,
              px: 2.5,
              py: 1.1,
              bgcolor: primaryGreen,
              color: "#FFFFFF",
              boxShadow: "0 8px 18px rgba(22, 163, 74, 0.25)",
              "&:hover": { bgcolor: darkGreen },
            }}
          >
            + New Card
          </Button>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2.5, borderRadius: "12px" }}>
          {error}
        </Alert>
      )}
      {successMsg && (
        <Alert severity="success" onClose={() => setSuccessMsg(null)} sx={{ mb: 2.5, borderRadius: "12px" }}>
          {successMsg}
        </Alert>
      )}

      {/* 6 Required Dashboard Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: "Total Registered Cards",
            value: summary.total_cards,
            color: primaryGreen,
            border: softGreenBorder,
            icon: <CreditCardIcon sx={{ fontSize: 18, color: primaryGreen }} />,
            tab: "all" as SectionTab,
          },
          {
            label: "Bills Generated Today",
            value: summary.bills_generated_today_count,
            color: "#0F172A",
            border: "#CBD5E1",
            icon: <ReceiptIcon sx={{ fontSize: 18, color: "#0284C7" }} />,
            tab: "generated_today" as SectionTab,
          },
          {
            label: "Bills Due Today",
            value: summary.bills_due_today_count,
            color: "#C2410C",
            border: summary.bills_due_today_count > 0 ? "#FDBA74" : "#E2E8F0",
            icon: <CalendarTodayIcon sx={{ fontSize: 18, color: "#EA580C" }} />,
            tab: "due_today" as SectionTab,
          },
          {
            label: "Upcoming Bills (Next 7 Days)",
            value: summary.upcoming_7_days_count,
            color: "#1D4ED8",
            border: "#BFDBFE",
            icon: <AccessTimeIcon sx={{ fontSize: 18, color: "#2563EB" }} />,
            tab: "upcoming_due" as SectionTab,
          },
          {
            label: "Upcoming Bills (Next 30 Days)",
            value: summary.upcoming_30_days_count,
            color: "#1E40AF",
            border: "#BFDBFE",
            icon: <AccessTimeIcon sx={{ fontSize: 18, color: "#1D4ED8" }} />,
            tab: "upcoming_due" as SectionTab,
          },
          {
            label: "Overdue Bills",
            value: summary.overdue_bills_count,
            color: "#B91C1C",
            border: summary.overdue_bills_count > 0 ? "#FCA5A5" : "#E2E8F0",
            icon: <WarningIcon sx={{ fontSize: 18, color: "#DC2626" }} />,
            tab: "overdue" as SectionTab,
          },
        ].map((kpi) => (
          <Grid key={kpi.label} size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <Paper
              elevation={0}
              onClick={() => setSectionTab(kpi.tab)}
              sx={{
                p: 2,
                borderRadius: "14px",
                bgcolor: "#FFFFFF",
                border: `1px solid ${kpi.border}`,
                cursor: "pointer",
                transition: "transform 0.15s ease",
                "&:hover": { transform: "translateY(-2px)" },
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748B", lineHeight: 1.2 }}>
                  {kpi.label}
                </Typography>
                {kpi.icon}
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 800, color: kpi.color, mt: 1 }}>
                {kpi.value}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Main Billing Sections & Filters Panel */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: "18px",
          bgcolor: "#FFFFFF",
          border: "1px solid #E2E8F0",
          overflow: "hidden",
          boxShadow: "0 4px 16px rgba(15, 23, 42, 0.04)",
        }}
      >
        {/* Section Tabs */}
        <Box sx={{ px: { xs: 2, md: 3 }, pt: 1.5, borderBottom: "1px solid #E2E8F0" }}>
          <Tabs
            value={sectionTab}
            onChange={(_e, v: SectionTab) => {
              setSectionTab(v);
              setPage(0);
            }}
            variant="scrollable"
            scrollButtons="auto"
            TabIndicatorProps={{ style: { backgroundColor: primaryGreen, height: 3 } }}
            sx={{
              "& .MuiTab-root": { textTransform: "none", fontWeight: 700, fontSize: "13px", color: "#64748B" },
              "& .Mui-selected": { color: `${darkGreen} !important` },
            }}
          >
            <Tab value="all" label={`All Registered Cards (${summary.total_cards})`} />
            <Tab value="generated_today" label={`Bills Generated Today (${summary.bills_generated_today_count})`} />
            <Tab value="due_today" label={`Bills Due Today (${summary.bills_due_today_count})`} />
            <Tab value="upcoming_gen" label="Upcoming Bill Generation" />
            <Tab value="upcoming_due" label="Upcoming Bill Due" />
            <Tab value="overdue" label={`Overdue Bills (${summary.overdue_bills_count})`} />
          </Tabs>
        </Box>

        {/* Dashboard Filters */}
        <Box sx={{ px: { xs: 2, md: 3 }, py: 2, bgcolor: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
          <Grid container spacing={1.5} alignItems="center">
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search cardholder, mobile, last 4..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                sx={{ bgcolor: "#FFFFFF" }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 18, color: "#64748B" }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Date Range"
                value={rangeFilter}
                onChange={(e) => {
                  setRangeFilter(e.target.value);
                  setPage(0);
                }}
                sx={{ bgcolor: "#FFFFFF" }}
              >
                <MenuItem value="all">All Dates</MenuItem>
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="7d">Next 7 Days</MenuItem>
                <MenuItem value="15d">Next 15 Days</MenuItem>
                <MenuItem value="30d">Next 30 Days</MenuItem>
                <MenuItem value="custom">Custom Date Range</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Bank Name"
                value={bankFilter}
                onChange={(e) => {
                  setBankFilter(e.target.value);
                  setPage(0);
                }}
                sx={{ bgcolor: "#FFFFFF" }}
              >
                <MenuItem value="ALL">All Banks</MenuItem>
                {(dashboard?.banks_in_use || []).map((bn) => (
                  <MenuItem key={bn} value={bn}>
                    {bn}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Card Status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(0);
                }}
                sx={{ bgcolor: "#FFFFFF" }}
              >
                <MenuItem value="ALL">All Statuses</MenuItem>
                <MenuItem value="DUE_TODAY">Due Today</MenuItem>
                <MenuItem value="UPCOMING">Upcoming</MenuItem>
                <MenuItem value="OVERDUE">Overdue</MenuItem>
                <MenuItem value="GENERATED_TODAY">Generated Today</MenuItem>
              </TextField>
            </Grid>

            {rangeFilter === "custom" && (
              <>
                <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="From"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ bgcolor: "#FFFFFF" }}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="To"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ bgcolor: "#FFFFFF" }}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </Box>

        {loading ? (
          <Box sx={{ py: 8, display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
            <CircularProgress sx={{ color: primaryGreen }} size={32} />
            <Typography variant="body2" sx={{ color: "#64748B" }}>
              Loading credit card billing schedule...
            </Typography>
          </Box>
        ) : rowsToDisplay.length === 0 ? (
          <Box sx={{ py: 8, px: 3, textAlign: "center" }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: "16px",
                bgcolor: softGreenBg,
                color: primaryGreen,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 1.5,
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 30 }} />
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0F172A" }}>
              No Credit Cards Match This View
            </Typography>
            <Typography variant="body2" sx={{ color: "#64748B", mt: 0.5, mb: 2.5 }}>
              Register a credit card or adjust your date/bank/status filters.
            </Typography>
            <Button
              component={Link}
              href="/retailer/cards/new"
              variant="contained"
              startIcon={<AddIcon />}
              sx={{
                borderRadius: "10px",
                textTransform: "none",
                fontWeight: 700,
                bgcolor: primaryGreen,
                "&:hover": { bgcolor: darkGreen },
              }}
            >
              + New Card
            </Button>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table size="medium">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#F8FAFC" }}>
                    <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "12px" }}>Cardholder Name</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "12px" }}>Mobile Number</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "12px" }}>Masked Card Number</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "12px" }}>Card Type</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "12px" }}>Bank Name</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "12px" }}>Bill Generation Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "12px" }}>Bill Due Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "12px" }}>Next Bill Gen Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "12px" }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: "#475569", fontSize: "12px" }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rowsToDisplay.map((card) => (
                    <TableRow
                      key={card.ref_id}
                      hover
                      sx={{
                        bgcolor:
                          card.bill_status === "OVERDUE"
                            ? "rgba(254, 226, 226, 0.35)"
                            : card.bill_status === "DUE_TODAY"
                              ? "rgba(255, 237, 213, 0.45)"
                              : "inherit",
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "#0F172A" }}>
                          {card.card_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: "monospace", color: "#334155" }}>
                          {card.mobile_no}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={card.masked_card_no}
                          sx={{
                            fontFamily: "monospace",
                            fontWeight: 700,
                            bgcolor: "#F1F5F9",
                            color: "#0F172A",
                            border: "1px solid #CBD5E1",
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            px: 1.25,
                            py: 0.5,
                            borderRadius: "999px",
                            bgcolor: softGreenBg,
                            color: darkGreen,
                            border: `1px solid ${softGreenBorder}`,
                          }}
                        >
                          <CardNetworkBadge cardType={card.card_type} />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1.2} alignItems="center">
                          <BankLogoBadge bankName={card.bank_name} shortCode={card.bank_short_code} size="sm" />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: "#1E293B", lineHeight: 1.2 }}>
                              {card.bank_name}
                            </Typography>
                            {card.bank_short_code && (
                              <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600 }}>
                                {card.bank_short_code}
                              </Typography>
                            )}
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {ordinalDay(card.bill_gen_day)} monthly
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#64748B" }}>
                          {card.bill_generation_date}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "#0F172A" }}>
                          {ordinalDay(card.bill_due_day)} monthly
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#64748B" }}>
                          Next: {card.next_bill_due_date}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "#0F172A" }}>
                          {card.next_bill_generation_date}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#64748B" }}>
                          {card.is_generated_today ? "Generated Today" : `In ${card.days_until_generation}d`}
                        </Typography>
                      </TableCell>
                      <TableCell>{renderStatusChip(card)}</TableCell>
                      <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                        <Tooltip title="View details">
                          <IconButton size="small" onClick={() => setViewTarget(card)} aria-label="View card">
                            <VisibilityIcon fontSize="small" sx={{ color: "#0284C7" }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit card">
                          <IconButton size="small" onClick={() => openEditModal(card)} aria-label="Edit card">
                            <EditIcon fontSize="small" sx={{ color: darkGreen }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete card">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteTarget(card)}
                            aria-label="Delete card"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {sectionTab === "all" && (
              <TablePagination
                component="div"
                count={dashboard?.total_filtered ?? rowsToDisplay.length}
                page={page}
                onPageChange={(_e, newPage) => setPage(newPage)}
                rowsPerPage={pageSize}
                onRowsPerPageChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(0);
                }}
                rowsPerPageOptions={[10, 20, 50]}
              />
            )}
          </>
        )}
      </Paper>

      {/* View Card Dialog — Realistic Virtual Credit Card + Billing Timeline */}
      <Dialog open={Boolean(viewTarget)} onClose={() => setViewTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Credit Card &amp; Billing Overview</DialogTitle>
        <DialogContent dividers>
          {viewTarget && (
            <Stack spacing={2.5}>
              <Box
                sx={{
                  p: 3,
                  borderRadius: "18px",
                  background: resolveBankTheme(viewTarget.bank_name, viewTarget.bank_short_code).cardGradient,
                  color: "#FFFFFF",
                  boxShadow: "0 14px 30px rgba(15, 23, 42, 0.22)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <BankLogoBadge bankName={viewTarget.bank_name} shortCode={viewTarget.bank_short_code} size="md" />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#FFFFFF" }}>
                        {viewTarget.bank_name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.75)" }}>
                        {viewTarget.card_type}
                      </Typography>
                    </Box>
                  </Stack>
                  {renderStatusChip(viewTarget)}
                </Stack>

                <Box sx={{ mb: 2 }}>
                  <svg width="36" height="26" viewBox="0 0 36 26" aria-hidden="true">
                    <rect x="1" y="1" width="34" height="24" rx="5" fill="#FDE68A" stroke="#F59E0B" strokeWidth="1.5" />
                    <path d="M12 1 V25 M24 1 V25 M1 13 H35" stroke="#B45309" strokeWidth="1" opacity="0.6" />
                  </svg>
                </Box>

                <Typography variant="h6" sx={{ fontFamily: "monospace", fontWeight: 800, letterSpacing: "0.14em", mb: 2.5 }}>
                  {viewTarget.masked_card_no}
                </Typography>

                <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
                  <Box>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)", display: "block" }}>
                      CARDHOLDER
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      {viewTarget.card_name.toUpperCase()}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)", fontFamily: "monospace" }}>
                      +91 {viewTarget.mobile_no}
                    </Typography>
                  </Box>
                  <Box sx={{ bgcolor: "rgba(255,255,255,0.92)", px: 1.2, py: 0.6, borderRadius: "8px", color: "#0F172A" }}>
                    <CardNetworkBadge cardType={viewTarget.card_type} />
                  </Box>
                </Stack>
              </Box>

              <Grid container spacing={1.5}>
                <Grid size={{ xs: 6 }}>
                  <Paper elevation={0} sx={{ p: 1.5, borderRadius: "12px", bgcolor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>Bill Generation Date</Typography>
                    <Typography variant="body2" fontWeight={800} sx={{ mt: 0.3 }}>
                      {ordinalDay(viewTarget.bill_gen_day)} monthly ({viewTarget.bill_generation_date})
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Paper elevation={0} sx={{ p: 1.5, borderRadius: "12px", bgcolor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>Next Bill Generation</Typography>
                    <Typography variant="body2" fontWeight={800} sx={{ mt: 0.3 }}>
                      {viewTarget.next_bill_generation_date}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Paper elevation={0} sx={{ p: 1.5, borderRadius: "12px", bgcolor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>Bill Due Date</Typography>
                    <Typography variant="body2" fontWeight={800} sx={{ mt: 0.3 }}>
                      {ordinalDay(viewTarget.bill_due_day)} monthly ({viewTarget.next_bill_due_date})
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Paper elevation={0} sx={{ p: 1.5, borderRadius: "12px", bgcolor: softGreenBg, border: `1px solid ${softGreenBorder}` }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>Cycle Payment</Typography>
                    <Typography variant="body2" fontWeight={800} color={darkGreen} sx={{ mt: 0.3 }}>
                      {viewTarget.last_paid_cycle === viewTarget.current_cycle_key
                        ? `Paid (${viewTarget.current_cycle_key})`
                        : viewTarget.status_label}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {viewTarget && viewTarget.last_paid_cycle !== viewTarget.current_cycle_key && (
            <Button
              variant="outlined"
              color="success"
              onClick={() => handleMarkPaid(viewTarget)}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              Mark Current Cycle Paid
            </Button>
          )}
          <Button onClick={() => setViewTarget(null)} variant="contained" sx={{ textTransform: "none", bgcolor: primaryGreen }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Card Dialog */}
      <Dialog open={Boolean(editTarget)} onClose={() => !savingEdit && setEditTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Edit Credit Card</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <TextField
              fullWidth
              label="Cardholder Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
            <TextField
              fullWidth
              label="Mobile Number"
              value={editMobile}
              onChange={(e) => setEditMobile(sanitizeDigits(e.target.value).slice(0, 12))}
            />
            <TextField
              fullWidth
              label="Bank Name"
              value={editBankName}
              onChange={(e) => setEditBankName(e.target.value)}
            />
            <TextField
              select
              fullWidth
              label="Bill Generation Date"
              value={editGenDay}
              onChange={(e) => setEditGenDay(Number(e.target.value))}
            >
              {DAYS_OF_MONTH.map((d) => (
                <MenuItem key={d} value={d}>{ordinalDay(d)} of month</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              label="Bill Due Date"
              value={editDueDay}
              onChange={(e) => setEditDueDay(Number(e.target.value))}
            >
              {DAYS_OF_MONTH.map((d) => (
                <MenuItem key={d} value={d}>{ordinalDay(d)} of month</MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditTarget(null)} disabled={savingEdit} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEdit}
            disabled={savingEdit}
            sx={{ textTransform: "none", fontWeight: 700, bgcolor: primaryGreen, "&:hover": { bgcolor: darkGreen } }}
          >
            {savingEdit ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => !deleting && setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Delete Credit Card?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "#475569" }}>
            Are you sure you want to delete{" "}
            <strong>{deleteTarget?.masked_card_no}</strong> ({deleteTarget?.card_name})? This action is recorded in the audit log.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            disabled={deleting}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            {deleting ? "Deleting..." : "Delete Card"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
