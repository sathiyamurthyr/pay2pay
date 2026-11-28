"use client";

export const dynamic = "force-dynamic";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
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
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import LockIcon from "@mui/icons-material/Lock";
import PaymentIcon from "@mui/icons-material/Payment";
import ShieldIcon from "@mui/icons-material/Shield";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";
import { BankLogoBadge, CardNetworkBadge, getBrandThemeTokens } from "@/components/retailer/BankBrandBadge";
import {
  CardPaymentConfirmResponse,
  CardPaymentItemInput,
  CardPaymentQuoteResponse,
  retailerCardsApi,
} from "@/services/retailer-cards-api";

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function CardPaymentConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const branding = useCompanyBranding();
  const brand = getBrandThemeTokens(branding);
  const primaryGreen = brand.primary;
  const darkGreen = brand.dark;
  const softGreenBg = brand.softBg;
  const softGreenBorder = brand.softBorder;

  const cardIds = useMemo(() => {
    const single = searchParams.get("card");
    const bulk = searchParams.get("cards");
    const rawList = bulk ? bulk.split(",") : single ? [single] : [];
    const parsed = rawList
      .map((v) => Number(v.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    return Array.from(new Set(parsed));
  }, [searchParams]);

  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<CardPaymentQuoteResponse | null>(null);
  const [billAmounts, setBillAmounts] = useState<Record<number, string>>({});
  const [activeIds, setActiveIds] = useState<number[]>(cardIds);
  const [confirmedCheck, setConfirmedCheck] = useState(false);
  const [confirmResult, setConfirmResult] = useState<CardPaymentConfirmResponse | null>(null);

  useEffect(() => {
    setActiveIds(cardIds);
  }, [cardIds]);

  const fetchQuote = useCallback(
    async (ids: number[], overrides?: Record<number, string>, isInitial = false) => {
      if (ids.length === 0) {
        setQuote(null);
        setLoading(false);
        return;
      }
      if (isInitial) setLoading(true);
      else setRecalculating(true);
      setError(null);

      try {
        // First fetch dashboard to know saved bill_amount if no override provided
        const items: CardPaymentItemInput[] = ids.map((id) => {
          const ov = overrides?.[id];
          const parsedOv = ov !== undefined && ov !== "" ? Number(ov) : undefined;
          return parsedOv && parsedOv > 0
            ? { card_ref_id: id, bill_amount: parsedOv }
            : { card_ref_id: id };
        });

        const res = await retailerCardsApi.quotePayments(items);
        setQuote(res);
        setBillAmounts((prev) => {
          const next = { ...prev };
          res.items.forEach((it) => {
            if (next[it.card_ref_id] === undefined) {
              next[it.card_ref_id] = String(it.bill_amount);
            }
          });
          return next;
        });
      } catch (err: any) {
        setError(
          String(
            err?.response?.data?.detail ||
              err?.message ||
              "Unable to calculate payment breakdown. Ensure bill amount is greater than ₹0."
          )
        );
      } finally {
        setLoading(false);
        setRecalculating(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchQuote(activeIds, undefined, true);
  }, [activeIds, fetchQuote]);

  const handleRecalculate = () => {
    setConfirmResult(null);
    fetchQuote(activeIds, billAmounts, false);
  };

  const handleRemoveCard = (cardRefId: number) => {
    const nextIds = activeIds.filter((id) => id !== cardRefId);
    setActiveIds(nextIds);
    setConfirmedCheck(false);
    setConfirmResult(null);
    if (nextIds.length === 0) {
      router.push("/retailer/cards");
    }
  };

  const handleConfirmPayment = async () => {
    if (!quote || !confirmedCheck) return;
    setConfirming(true);
    setError(null);
    try {
      const items: CardPaymentItemInput[] = quote.items.map((it) => ({
        card_ref_id: it.card_ref_id,
        bill_amount: Number(billAmounts[it.card_ref_id] || it.bill_amount),
      }));
      const res = await retailerCardsApi.confirmPayments(items, true, quote.mode);
      setConfirmResult(res);
    } catch (err: any) {
      setError(String(err?.response?.data?.detail || err?.message || "Payment confirmation failed."));
    } finally {
      setConfirming(false);
    }
  };

  const isBulk = (quote?.items?.length || activeIds.length) > 1;

  if (loading) {
    return (
      <Box sx={{ py: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        <CircularProgress sx={{ color: primaryGreen }} />
        <Typography variant="body2" color="text.secondary">
          Calculating card bill charges &amp; GST from configured rules...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1180, mx: "auto", pb: 1, overflow: "hidden" }}>
      <Box sx={{ mb: 1.25 }}>
        <Button
          component={Link}
          href="/retailer/cards"
          size="small"
          startIcon={<ArrowBackIcon />}
          sx={{ textTransform: "none", fontWeight: 700, color: darkGreen, "&:hover": { bgcolor: softGreenBg } }}
        >
          Back to Credit Card Management
        </Button>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, md: 2 },
          mb: 1.5,
          borderRadius: "16px",
          background: `linear-gradient(135deg, #FFFFFF 0%, ${softGreenBg} 100%)`,
          border: `1px solid ${softGreenBorder}`,
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: "14px",
              bgcolor: primaryGreen,
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <PaymentIcon />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#0F172A" }}>
              {isBulk ? "Bulk Credit Card Bill Payment Confirmation" : "Credit Card Bill Payment Confirmation"}
            </Typography>
            <Typography variant="body2" sx={{ color: "#475569", mt: 0.3 }}>
              Review card details, service charges, and GST breakdown before confirming payment.
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2.5, borderRadius: "12px" }}>
          {error}
        </Alert>
      )}

      {confirmResult && (
        <Alert
          severity="warning"
          icon={<ShieldIcon />}
          sx={{ mb: 3, borderRadius: "14px", border: "1px solid #FDBA74", fontWeight: 600 }}
        >
          <Typography variant="subtitle2" fontWeight={800}>
            {confirmResult.message}
          </Typography>
          <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
            Your confirmation ({confirmResult.quote.summary.selected_cards_count} card(s), Grand Total{" "}
            {formatINR(confirmResult.quote.summary.grand_total)}) has been logged. Once the payment provider is configured,
            this flow will dispatch directly to the gateway.
          </Typography>
        </Alert>
      )}

      {!quote ? (
        <Paper elevation={0} sx={{ p: 4, borderRadius: "16px", border: "1px solid #E2E8F0", textAlign: "center" }}>
          <Typography variant="subtitle1" fontWeight={700}>
            No payable card bills selected.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
            Please ensure the selected card has a Bill Amount greater than ₹0 or return to the dashboard.
          </Typography>
          <Button component={Link} href="/retailer/cards" variant="contained" sx={{ bgcolor: primaryGreen }}>
            Return to Dashboard
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {/* Left: Single Card Details OR Bulk Card-wise Breakdown */}
          <Grid size={{ xs: 12, lg: 8 }}>
            {!isBulk && quote.items[0] ? (
              <Paper
                elevation={0}
                sx={{ p: 3, borderRadius: "18px", border: "1px solid #E2E8F0", bgcolor: "#FFFFFF" }}
              >
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2, color: "#0F172A" }}>
                  Card Details
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2.5 }}>
                  <BankLogoBadge
                    bankName={quote.items[0].bank_name}
                    shortCode={quote.items[0].bank_short_code}
                    size="lg"
                  />
                  <Box>
                    <Typography variant="subtitle1" fontWeight={800}>
                      {quote.items[0].card_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {quote.items[0].bank_name} •{" "}
                      <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{quote.items[0].masked_card_no}</span>
                    </Typography>
                  </Box>
                  <Box sx={{ ml: "auto" }}>
                    <CardNetworkBadge cardType={quote.items[0].card_type} />
                  </Box>
                </Stack>

                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <Paper elevation={0} sx={{ p: 1.5, bgcolor: "#F8FAFC", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>
                        Bill Generation Date
                      </Typography>
                      <Typography variant="body2" fontWeight={800} sx={{ mt: 0.3 }}>
                        {quote.items[0].bill_generation_date}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <Paper elevation={0} sx={{ p: 1.5, bgcolor: "#F8FAFC", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>
                        Bill Due Date
                      </Typography>
                      <Typography variant="body2" fontWeight={800} sx={{ mt: 0.3 }}>
                        {quote.items[0].bill_due_date}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Bill Amount (₹)"
                      type="number"
                      value={billAmounts[quote.items[0].card_ref_id] ?? String(quote.items[0].bill_amount)}
                      onChange={(e) =>
                        setBillAmounts((prev) => ({ ...prev, [quote.items[0].card_ref_id]: e.target.value }))
                      }
                      InputProps={{
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                      }}
                    />
                  </Grid>
                </Grid>

                <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleRecalculate}
                    disabled={recalculating}
                    sx={{ textTransform: "none", fontWeight: 700, borderColor: softGreenBorder, color: darkGreen }}
                  >
                    {recalculating ? "Recalculating..." : "Recalculate Charges & GST"}
                  </Button>
                </Stack>

                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5, color: "#0F172A" }}>
                  Payment Breakdown
                </Typography>
                <TableContainer sx={{ scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell>Original Credit Card Bill Amount</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {formatINR(quote.items[0].bill_amount)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          Platform / Service Charges ({quote.items[0].charge_pct}%)
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {formatINR(quote.items[0].service_charge)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          GST ({quote.items[0].gst_rate_pct}% on service charge)
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {formatINR(quote.items[0].gst_amount)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Other Applicable Charges</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {formatINR(quote.items[0].other_charges)}
                        </TableCell>
                      </TableRow>
                      <TableRow sx={{ bgcolor: softGreenBg }}>
                        <TableCell sx={{ fontWeight: 800, color: darkGreen, fontSize: "15px" }}>
                          Total Payable Amount
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 900, color: darkGreen, fontSize: "16px" }}>
                          {formatINR(quote.items[0].total_payable)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            ) : (
              <Paper
                elevation={0}
                sx={{ borderRadius: "18px", border: "1px solid #E2E8F0", bgcolor: "#FFFFFF", overflow: "hidden" }}
              >
                <Box
                  sx={{
                    px: 3,
                    py: 2,
                    borderBottom: "1px solid #E2E8F0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 1.5,
                  }}
                >
                  <Box>
                    <Typography variant="subtitle1" fontWeight={800}>
                      Selected Cards Breakdown ({quote.items.length})
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      You can adjust bill amounts or remove a card before confirming.
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleRecalculate}
                    disabled={recalculating}
                    sx={{ textTransform: "none", fontWeight: 700, borderColor: softGreenBorder, color: darkGreen }}
                  >
                    {recalculating ? "Recalculating..." : "Recalculate Totals"}
                  </Button>
                </Box>
                <TableContainer sx={{ scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "#F8FAFC" }}>
                        <TableCell sx={{ fontWeight: 700 }}>Card</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Bank</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Bill Amount</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Charges</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>GST</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Total</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Remove</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {quote.items.map((it) => (
                        <TableRow key={it.card_ref_id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={700}>
                              {it.card_name}
                            </Typography>
                            <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                              {it.masked_card_no}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <BankLogoBadge bankName={it.bank_name} shortCode={it.bank_short_code} size="sm" />
                              <Typography variant="body2" fontWeight={600}>
                                {it.bank_name}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ minWidth: 140 }}>
                            <TextField
                              size="small"
                              type="number"
                              value={billAmounts[it.card_ref_id] ?? String(it.bill_amount)}
                              onChange={(e) =>
                                setBillAmounts((prev) => ({ ...prev, [it.card_ref_id]: e.target.value }))
                              }
                              InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                            />
                          </TableCell>
                          <TableCell align="right">{formatINR(it.service_charge)}</TableCell>
                          <TableCell align="right">{formatINR(it.gst_amount)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800 }}>
                            {formatINR(it.total_payable)}
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Remove Selected Card">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRemoveCard(it.card_ref_id)}
                                aria-label="Remove Selected Card"
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
              </Paper>
            )}
          </Grid>

          {/* Right: Summary & Explicit Confirmation */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: "18px",
                border: `1px solid ${softGreenBorder}`,
                bgcolor: "#FFFFFF",
                boxShadow: "0 6px 20px rgba(22, 163, 74, 0.08)",
              }}
            >
              <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2, color: "#0F172A" }}>
                {isBulk ? "Bulk Payment Summary" : "Payment Summary"}
              </Typography>

              <Stack spacing={1.25}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Selected Cards
                  </Typography>
                  <Chip size="small" label={quote.summary.selected_cards_count} sx={{ fontWeight: 800 }} />
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Total Bill Amount
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {formatINR(quote.summary.total_bill_amount)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Total Service Charges
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {formatINR(quote.summary.total_service_charges)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Total GST
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {formatINR(quote.summary.total_gst)}
                  </Typography>
                </Stack>
                <Divider />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle1" fontWeight={800} color={darkGreen}>
                    {isBulk ? "Grand Total" : "Total Payable"}
                  </Typography>
                  <Typography variant="h5" fontWeight={900} color={darkGreen}>
                    {formatINR(quote.summary.grand_total)}
                  </Typography>
                </Stack>
              </Stack>

              <Box sx={{ mt: 2.5, p: 1.5, borderRadius: "12px", bgcolor: softGreenBg, border: `1px solid ${softGreenBorder}` }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={confirmedCheck}
                      onChange={(e) => setConfirmedCheck(e.target.checked)}
                      sx={{ color: primaryGreen, "&.Mui-checked": { color: primaryGreen } }}
                    />
                  }
                  label={
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "#14532D" }}>
                      I confirm the bill amount, charges, GST, and total payable of{" "}
                      {formatINR(quote.summary.grand_total)}.
                    </Typography>
                  }
                />
              </Box>

              <Stack spacing={1.25} sx={{ mt: 2.5 }}>
                <Button
                  fullWidth
                  variant="contained"
                  disabled={!confirmedCheck || confirming || recalculating}
                  onClick={handleConfirmPayment}
                  startIcon={confirming ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                  sx={{
                    py: 1.25,
                    borderRadius: "12px",
                    textTransform: "none",
                    fontWeight: 800,
                    bgcolor: primaryGreen,
                    "&:hover": { bgcolor: darkGreen },
                  }}
                >
                  {confirming
                    ? "Confirming..."
                    : isBulk
                    ? "Confirm & Pay All"
                    : "Confirm & Proceed to Payment"}
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  component={Link}
                  href="/retailer/cards"
                  sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 700, borderColor: "#CBD5E1", color: "#334155" }}
                >
                  Cancel
                </Button>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2, color: "#64748B" }}>
                <LockIcon sx={{ fontSize: 15 }} />
                <Typography variant="caption">
                  Charges &amp; GST calculated dynamically on the server.
                </Typography>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}

export default function RetailerCardPaymentConfirmationPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ py: 10, display: "flex", justifyContent: "center" }}>
          <CircularProgress sx={{ color: "#16A34A" }} />
        </Box>
      }
    >
      <CardPaymentConfirmationContent />
    </Suspense>
  );
}
