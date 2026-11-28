"use client";

export const dynamic = "force-dynamic";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Paper,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from "@mui/icons-material/Delete";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";
import {
  RetailerCardsDashboardResponse,
  RetailerSavedCard,
  retailerCardsApi,
} from "@/services/retailer-cards-api";
import { ordinalDay } from "@/lib/card-validation";

type TabKey = "current" | "upcoming" | "all";

export default function RetailerCardManagementPage() {
  const router = useRouter();
  const branding = useCompanyBranding();
  const primaryGreen = "#16A34A";
  const darkGreen = "#15803D";
  const softGreenBg = "#ECFDF5";
  const softGreenBorder = "#BBF7D0";
  const brandAccent = branding?.primary_colour || primaryGreen;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("current");
  const [dashboard, setDashboard] = useState<RetailerCardsDashboardResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RetailerSavedCard | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadCards = useCallback(async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await retailerCardsApi.getDashboard(q);
      setDashboard(data);
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        err?.message ||
        "Unable to load credit cards right now.";
      setError(String(detail));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadCards(search);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await retailerCardsApi.deleteCard(deleteTarget.card_ref_id);
      setSuccessMsg(`Removed card ${deleteTarget.masked_card_number} (${deleteTarget.cardholder_name}).`);
      setDeleteTarget(null);
      await loadCards(search);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to remove credit card.");
    } finally {
      setDeleting(false);
    }
  };

  const rowsToDisplay: RetailerSavedCard[] = useMemo(() => {
    if (!dashboard) return [];
    if (activeTab === "current") return dashboard.current_date_bills || [];
    if (activeTab === "upcoming") return dashboard.upcoming_bills || [];
    return dashboard.all_cards || [];
  }, [dashboard, activeTab]);

  const summary = dashboard?.summary || {
    total_cards: 0,
    current_date_bills_count: 0,
    upcoming_bills_count: 0,
    due_next_7_days_count: 0,
    banks_count: 0,
  };

  return (
    <Box sx={{ maxWidth: 1400, mx: "auto", pb: 5 }}>
      {/* Header Banner — Green & White Fintech Theme with Domain Branding */}
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
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h5" sx={{ fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em" }}>
                Card Management
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
              Track Current Date &amp; Upcoming Credit Card Bills and manage registered customer cards securely.
              {dashboard?.reference_date ? ` (As of ${dashboard.reference_date})` : ""}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Tooltip title="Refresh bill lists">
            <Button
              variant="outlined"
              onClick={() => loadCards(search)}
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
          </Tooltip>
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

      {/* KPI Summary Strip */}
      <Grid container spacing={2.2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: "16px",
              bgcolor: "#FFFFFF",
              border: `1px solid ${summary.current_date_bills_count > 0 ? "#FCA5A5" : "#E2E8F0"}`,
              boxShadow: "0 2px 10px rgba(15, 23, 42, 0.03)",
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                Current Date Bills
              </Typography>
              <CalendarTodayIcon sx={{ fontSize: 18, color: summary.current_date_bills_count > 0 ? "#DC2626" : primaryGreen }} />
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 800, color: "#0F172A", mt: 1 }}>
              {summary.current_date_bills_count}
            </Typography>
            <Typography variant="caption" sx={{ color: summary.current_date_bills_count > 0 ? "#DC2626" : "#16A34A", fontWeight: 600 }}>
              {summary.current_date_bills_count > 0 ? "Due today — action required" : "No bills due today"}
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: "16px",
              bgcolor: "#FFFFFF",
              border: "1px solid #E2E8F0",
              boxShadow: "0 2px 10px rgba(15, 23, 42, 0.03)",
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                Upcoming Days Bills
              </Typography>
              <AccessTimeIcon sx={{ fontSize: 18, color: "#D97706" }} />
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 800, color: "#0F172A", mt: 1 }}>
              {summary.upcoming_bills_count}
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600 }}>
              {summary.due_next_7_days_count} due within next 7 days
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: "16px",
              bgcolor: "#FFFFFF",
              border: `1px solid ${softGreenBorder}`,
              boxShadow: "0 2px 10px rgba(15, 23, 42, 0.03)",
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                Total Saved Cards
              </Typography>
              <EventAvailableIcon sx={{ fontSize: 18, color: primaryGreen }} />
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 800, color: primaryGreen, mt: 1 }}>
              {summary.total_cards}
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600 }}>
              Scoped to your retailer account
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: "16px",
              bgcolor: "#FFFFFF",
              border: "1px solid #E2E8F0",
              boxShadow: "0 2px 10px rgba(15, 23, 42, 0.03)",
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                Issuing Banks
              </Typography>
              <AccountBalanceIcon sx={{ fontSize: 18, color: brandAccent }} />
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 800, color: "#0F172A", mt: 1 }}>
              {summary.banks_count}
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600 }}>
              Active credit card issuers
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Main Bills & Saved Cards Panel */}
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
        <Box
          sx={{
            px: { xs: 2, md: 3 },
            pt: 2,
            pb: 1.5,
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { xs: "stretch", md: "center" },
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_e, v: TabKey) => setActiveTab(v)}
            TabIndicatorProps={{ style: { backgroundColor: primaryGreen, height: 3 } }}
            sx={{
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 700,
                fontSize: "14px",
                color: "#64748B",
                minHeight: 44,
              },
              "& .Mui-selected": { color: `${darkGreen} !important` },
            }}
          >
            <Tab
              value="current"
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>Current Date Bills</span>
                  <Chip
                    size="small"
                    label={summary.current_date_bills_count}
                    sx={{
                      height: 20,
                      fontSize: "11px",
                      fontWeight: 800,
                      bgcolor: summary.current_date_bills_count > 0 ? "#FEE2E2" : softGreenBg,
                      color: summary.current_date_bills_count > 0 ? "#B91C1C" : darkGreen,
                    }}
                  />
                </Stack>
              }
            />
            <Tab
              value="upcoming"
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>Upcoming Days Bills</span>
                  <Chip
                    size="small"
                    label={summary.upcoming_bills_count}
                    sx={{ height: 20, fontSize: "11px", fontWeight: 800, bgcolor: "#FEF3C7", color: "#B45309" }}
                  />
                </Stack>
              }
            />
            <Tab
              value="all"
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>All Saved Cards</span>
                  <Chip
                    size="small"
                    label={summary.total_cards}
                    sx={{ height: 20, fontSize: "11px", fontWeight: 800, bgcolor: "#F1F5F9", color: "#334155" }}
                  />
                </Stack>
              }
            />
          </Tabs>

          <Box component="form" onSubmit={handleSearchSubmit} sx={{ display: "flex", gap: 1 }}>
            <TextField
              size="small"
              placeholder="Search name, mobile, bank, last 4..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{
                minWidth: { xs: "100%", sm: 260 },
                "& .MuiOutlinedInput-root": {
                  borderRadius: "10px",
                  bgcolor: "#F8FAFC",
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: "#64748B" }} />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              variant="outlined"
              sx={{
                borderRadius: "10px",
                textTransform: "none",
                fontWeight: 700,
                borderColor: softGreenBorder,
                color: darkGreen,
              }}
            >
              Filter
            </Button>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ py: 8, display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
            <CircularProgress sx={{ color: primaryGreen }} size={32} />
            <Typography variant="body2" sx={{ color: "#64748B" }}>
              Loading credit card bills...
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
              {activeTab === "current"
                ? "No Credit Card Bills Due Today"
                : activeTab === "upcoming"
                ? "No Upcoming Credit Card Bills"
                : "No Saved Credit Cards Found"}
            </Typography>
            <Typography variant="body2" sx={{ color: "#64748B", mt: 0.5, mb: 2.5 }}>
              {summary.total_cards === 0
                ? "Register a customer credit card to track bill generation and due dates."
                : "Switch tabs or clear your search filter to view other registered cards."}
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
          <TableContainer>
            <Table size="medium">
              <TableHead>
                <TableRow sx={{ bgcolor: "#F8FAFC" }}>
                  <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "12px" }}>Cardholder Name</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "12px" }}>Mobile Number</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "12px" }}>Masked Card Number</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "12px" }}>Card Type</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "12px" }}>Bank</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "12px" }}>Bill Generate Date</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "12px" }}>Bill Due Date</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "12px" }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: "#475569", fontSize: "12px" }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rowsToDisplay.map((card) => (
                  <TableRow key={card.card_ref_id} hover sx={{ "&:last-child td": { borderBottom: 0 } }}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: "#0F172A" }}>
                        {card.cardholder_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: "monospace", color: "#334155" }}>
                        {card.mobile_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={card.masked_card_number}
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
                      <Chip
                        size="small"
                        label={card.card_type_name}
                        sx={{
                          fontWeight: 700,
                          bgcolor: softGreenBg,
                          color: darkGreen,
                          border: `1px solid ${softGreenBorder}`,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "#1E293B" }}>
                        {card.bank_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: "#334155", fontWeight: 600 }}>
                        {ordinalDay(card.bill_generate_day)} of month
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#64748B" }}>
                        {card.cycle_generate_date}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: "#0F172A", fontWeight: 700 }}>
                        {ordinalDay(card.bill_due_day)} of month
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#64748B" }}>
                        Next: {card.next_due_date}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {card.is_due_today ? (
                        <Chip
                          size="small"
                          label="Due Today"
                          sx={{
                            fontWeight: 800,
                            bgcolor: "#FEE2E2",
                            color: "#B91C1C",
                            border: "1px solid #FCA5A5",
                          }}
                        />
                      ) : (
                        <Chip
                          size="small"
                          label={card.status_label}
                          sx={{
                            fontWeight: 700,
                            bgcolor: card.days_remaining <= 5 ? "#FEF3C7" : softGreenBg,
                            color: card.days_remaining <= 5 ? "#B45309" : darkGreen,
                            border: `1px solid ${card.days_remaining <= 5 ? "#FDE68A" : softGreenBorder}`,
                          }}
                        />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<ReceiptLongIcon sx={{ fontSize: 15 }} />}
                          onClick={() => router.push("/retailer/bbps")}
                          sx={{
                            borderRadius: "8px",
                            textTransform: "none",
                            fontWeight: 700,
                            fontSize: "12px",
                            borderColor: softGreenBorder,
                            color: darkGreen,
                            "&:hover": { bgcolor: softGreenBg, borderColor: primaryGreen },
                          }}
                        >
                          Pay Bill
                        </Button>
                        <Tooltip title="Remove card">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteTarget(card)}
                            aria-label={`Remove ${card.masked_card_number}`}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => !deleting && setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Remove Saved Credit Card?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "#475569" }}>
            Are you sure you want to remove{" "}
            <strong>{deleteTarget?.masked_card_number}</strong> ({deleteTarget?.cardholder_name}) from your Card Management list?
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
            {deleting ? "Removing..." : "Remove Card"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
