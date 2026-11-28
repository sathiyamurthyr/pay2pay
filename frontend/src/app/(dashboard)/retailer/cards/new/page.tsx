"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import LockIcon from "@mui/icons-material/Lock";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SaveIcon from "@mui/icons-material/Save";
import ShieldIcon from "@mui/icons-material/Shield";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";
import { BankLogoBadge, CardNetworkBadge, getBrandThemeTokens, resolveBankTheme } from "@/components/retailer/BankBrandBadge";
import {
  RetailerCardBankOption,
  RetailerCardTypeOption,
  retailerCardsApi,
} from "@/services/retailer-cards-api";
import {
  formatCardInputDisplay,
  isValidIndianMobile,
  luhnCheck,
  maskCardPreview,
  normalizeIndianMobile,
  ordinalDay,
  sanitizeDigits,
} from "@/lib/card-validation";

const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);

export default function AddNewRetailerCardPage() {
  const router = useRouter();
  const branding = useCompanyBranding();
  const brand = getBrandThemeTokens(branding);
  const primaryGreen = brand.primary;
  const darkGreen = brand.dark;
  const softGreenBg = brand.softBg;
  const softGreenBorder = brand.softBorder;

  const [cardTypes, setCardTypes] = useState<RetailerCardTypeOption[]>([
    { card_type_ref_id: 1, card_type_code: "VISA", card_type_name: "Visa" },
    { card_type_ref_id: 2, card_type_code: "MASTERCARD", card_type_name: "MasterCard" },
    { card_type_ref_id: 3, card_type_code: "RUPAY", card_type_name: "RuPay" },
    { card_type_ref_id: 4, card_type_code: "AMEX", card_type_name: "AMEX / Diners" },
    { card_type_ref_id: 5, card_type_code: "CORP", card_type_name: "Business / Corporate" },
  ]);
  const [banks, setBanks] = useState<RetailerCardBankOption[]>([]);
  const [metaLoading, setMetaLoading] = useState(true);

  const [cardName, setCardName] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardType, setCardType] = useState("Visa");
  const [selectedBank, setSelectedBank] = useState<RetailerCardBankOption | null>(null);
  const [billGenDay, setBillGenDay] = useState<number>(1);
  const [billDueDay, setBillDueDay] = useState<number>(15);
  const [billAmount, setBillAmount] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setMetaLoading(true);
    retailerCardsApi
      .getMetadata()
      .then((res) => {
        if (res.card_types?.length) {
          setCardTypes(res.card_types);
          setCardType(res.card_types[0].card_type_name);
        }
        setBanks(res.banks || []);
      })
      .catch(() => {})
      .finally(() => setMetaLoading(false));
  }, []);

  const maskedPreview = useMemo(() => maskCardPreview(cardNumber), [cardNumber]);

  const handleReset = () => {
    setCardName("");
    setMobileNo("");
    setCardNumber("");
    setCardType(cardTypes[0]?.card_type_name || "Visa");
    setSelectedBank(null);
    setBillGenDay(1);
    setBillDueDay(15);
    setBillAmount("");
    setError(null);
    setSuccessMsg(null);
    setFieldErrors({});
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (cardName.trim().length < 2) {
      errs.card_name = "Enter a valid cardholder name (minimum 2 characters).";
    }
    if (!isValidIndianMobile(mobileNo)) {
      errs.mobile_no = "Enter a valid 10-digit Indian mobile number (starting with 6-9).";
    }
    const digits = sanitizeDigits(cardNumber);
    if (digits.length < 13 || digits.length > 19) {
      errs.card_number = "Card number must be 13 to 19 digits.";
    } else if (!luhnCheck(digits)) {
      errs.card_number = "Invalid card number (Luhn checksum failed).";
    }
    if (!cardType.trim()) {
      errs.card_type = "Select a Card Type.";
    }
    if (!selectedBank?.bank_name) {
      errs.bank_name = "Select a Bank Name.";
    }
    if (billGenDay < 1 || billGenDay > 31) {
      errs.bill_gen_day = "Select a valid Bill Generation Date (1-31).";
    }
    if (billDueDay < 1 || billDueDay > 31) {
      errs.bill_due_day = "Select a valid Bill Due Date (1-31).";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    if (!validateForm() || !selectedBank) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await retailerCardsApi.createCard({
        card_name: cardName.trim(),
        mobile_no: normalizeIndianMobile(mobileNo),
        card_number: sanitizeDigits(cardNumber),
        card_type: cardType,
        bank_name: selectedBank.bank_name,
        bank_id: selectedBank.bank_id ?? null,
        bill_gen_day: billGenDay,
        bill_due_day: billDueDay,
        bill_amount: billAmount.trim() ? Number(billAmount) : 0,
      });
      setSuccessMsg(res.message || "Credit card registered successfully. Redirecting...");
      setTimeout(() => {
        router.push("/retailer/cards");
        router.refresh();
      }, 600);
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        err?.message ||
        "Unable to save credit card. Please verify your inputs.";
      setError(String(detail));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1120, mx: "auto", pb: 1, overflow: "hidden" }}>
      <Box sx={{ mb: 1.25 }}>
        <Button
          component={Link}
          href="/retailer/cards"
          size="small"
          startIcon={<ArrowBackIcon />}
          sx={{
            textTransform: "none",
            fontWeight: 700,
            color: darkGreen,
            "&:hover": { bgcolor: softGreenBg },
          }}
        >
          Back to Credit Card Management
        </Button>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, md: 2.5 },
              borderRadius: "16px",
              bgcolor: "#FFFFFF",
              border: `1px solid ${softGreenBorder}`,
              boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: "12px",
                  bgcolor: primaryGreen,
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CreditCardIcon />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: "#0F172A" }}>
                  Add New Credit Card
                </Typography>
                <Typography variant="caption" sx={{ color: "#64748B" }}>
                  Register a credit card to track bill generation and due dates.
                </Typography>
              </Box>
            </Stack>

            {error && (
              <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2.5, borderRadius: "12px" }}>
                {error}
              </Alert>
            )}
            {successMsg && (
              <Alert severity="success" sx={{ mb: 2.5, borderRadius: "12px" }}>
                {successMsg}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Grid container spacing={2.2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    required
                    label="Cardholder Name"
                    placeholder="e.g. Rajesh Kumar"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    error={Boolean(fieldErrors.card_name)}
                    helperText={fieldErrors.card_name}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    required
                    label="Mobile Number"
                    placeholder="10-digit Indian mobile"
                    value={mobileNo}
                    onChange={(e) => setMobileNo(sanitizeDigits(e.target.value).slice(0, 12))}
                    error={Boolean(fieldErrors.mobile_no)}
                    helperText={
                      fieldErrors.mobile_no ||
                      `Count: ${normalizeIndianMobile(mobileNo).length} / 10 digits${
                        isValidIndianMobile(mobileNo) ? " • Valid" : ""
                      }`
                    }
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    required
                    label="Card Number"
                    placeholder="XXXX XXXX XXXX XXXX"
                    value={formatCardInputDisplay(cardNumber)}
                    onChange={(e) => setCardNumber(sanitizeDigits(e.target.value).slice(0, 19))}
                    error={Boolean(fieldErrors.card_number)}
                    helperText={
                      fieldErrors.card_number ||
                      `Count: ${sanitizeDigits(cardNumber).length} / 16 digits (13-19 supported)${
                        sanitizeDigits(cardNumber).length >= 13
                          ? luhnCheck(cardNumber)
                            ? " • Valid Luhn"
                            : " • Invalid checksum"
                          : ""
                      }`
                    }
                    inputProps={{ inputMode: "numeric", autoComplete: "off" }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    select
                    fullWidth
                    required
                    label="Card Type"
                    value={cardType}
                    onChange={(e) => setCardType(e.target.value)}
                    error={Boolean(fieldErrors.card_type)}
                    helperText={fieldErrors.card_type}
                  >
                    {cardTypes.map((ct) => (
                      <MenuItem key={ct.card_type_code} value={ct.card_type_name}>
                        <CardNetworkBadge cardType={ct.card_type_name} />
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Autocomplete
                    options={banks}
                    loading={metaLoading}
                    value={selectedBank}
                    onChange={(_e, val) => setSelectedBank(val)}
                    getOptionLabel={(opt) => opt.bank_name || ""}
                    isOptionEqualToValue={(opt, val) =>
                      opt.bank_name === val.bank_name && opt.bank_id === val.bank_id
                    }
                    renderOption={(props, opt) => {
                      const { key, ...rest } = props;
                      return (
                        <Box component="li" key={key} {...rest} sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                          <BankLogoBadge bankName={opt.bank_name} shortCode={opt.short_code} size="sm" />
                          <Box>
                            <Typography variant="body2" fontWeight={700}>{opt.bank_name}</Typography>
                            {opt.short_code && (
                              <Typography variant="caption" color="text.secondary">{opt.short_code}</Typography>
                            )}
                          </Box>
                        </Box>
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        required
                        label="Bank Name"
                        placeholder="Search bank name..."
                        error={Boolean(fieldErrors.bank_name)}
                        helperText={fieldErrors.bank_name}
                      />
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    select
                    fullWidth
                    required
                    label="Bill Generation Date (Day of Month)"
                    value={billGenDay}
                    onChange={(e) => setBillGenDay(Number(e.target.value))}
                    error={Boolean(fieldErrors.bill_gen_day)}
                    helperText={fieldErrors.bill_gen_day || `Generates on ${ordinalDay(billGenDay)} monthly`}
                  >
                    {DAYS_OF_MONTH.map((d) => (
                      <MenuItem key={d} value={d}>
                        {ordinalDay(d)} of every month
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    select
                    fullWidth
                    required
                    label="Bill Due Date (Day of Month)"
                    value={billDueDay}
                    onChange={(e) => setBillDueDay(Number(e.target.value))}
                    error={Boolean(fieldErrors.bill_due_day)}
                    helperText={fieldErrors.bill_due_day || `Due on ${ordinalDay(billDueDay)} monthly`}
                  >
                    {DAYS_OF_MONTH.map((d) => (
                      <MenuItem key={d} value={d}>
                        {ordinalDay(d)} of every month
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Current Bill Amount (₹)"
                    placeholder="e.g. 25000"
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    helperText="Optional — can also be entered or updated during payment"
                    inputProps={{ min: 0, step: "0.01" }}
                  />
                </Grid>

                <Grid size={{ xs: 12 }} sx={{ pt: 1 }}>
                  <Stack direction="row" spacing={1.5} justifyContent="flex-end" flexWrap="wrap">
                    <Button
                      type="button"
                      variant="outlined"
                      onClick={handleReset}
                      disabled={submitting}
                      startIcon={<RestartAltIcon />}
                      sx={{
                        borderRadius: "10px",
                        textTransform: "none",
                        fontWeight: 700,
                        borderColor: "#CBD5E1",
                        color: "#334155",
                      }}
                    >
                      Reset
                    </Button>
                    <Button
                      component={Link}
                      href="/retailer/cards"
                      variant="outlined"
                      disabled={submitting}
                      sx={{
                        borderRadius: "10px",
                        textTransform: "none",
                        fontWeight: 700,
                        borderColor: "#CBD5E1",
                        color: "#334155",
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={submitting}
                      startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                      sx={{
                        borderRadius: "10px",
                        textTransform: "none",
                        fontWeight: 800,
                        px: 3,
                        bgcolor: primaryGreen,
                        "&:hover": { bgcolor: darkGreen },
                      }}
                    >
                      {submitting ? "Saving Card..." : "Save Card"}
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grid>

        {/* Live Masked Card Preview */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Stack spacing={2.5}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: "20px",
                background: resolveBankTheme(selectedBank?.bank_name, selectedBank?.short_code).cardGradient,
                color: "#FFFFFF",
                boxShadow: "0 14px 32px rgba(15, 23, 42, 0.24)",
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <BankLogoBadge bankName={selectedBank?.bank_name} shortCode={selectedBank?.short_code} size="md" />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#FFFFFF" }}>
                    {selectedBank?.bank_name || "ISSUING BANK"}
                  </Typography>
                </Stack>
                <Box sx={{ bgcolor: "rgba(255,255,255,0.92)", px: 1.1, py: 0.45, borderRadius: "8px", color: "#0F172A" }}>
                  <CardNetworkBadge cardType={cardType} />
                </Box>
              </Stack>

              <Box sx={{ mb: 2 }}>
                <svg width="36" height="26" viewBox="0 0 36 26" aria-hidden="true">
                  <rect x="1" y="1" width="34" height="24" rx="5" fill="#FDE68A" stroke="#F59E0B" strokeWidth="1.5" />
                  <path d="M12 1 V25 M24 1 V25 M1 13 H35" stroke="#B45309" strokeWidth="1" opacity="0.6" />
                </svg>
              </Box>

              <Typography
                variant="h6"
                sx={{ fontFamily: "monospace", fontWeight: 800, letterSpacing: "0.12em", mb: 3 }}
              >
                {maskedPreview}
              </Typography>

              <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
                <Box>
                  <Typography variant="caption" sx={{ color: "#94A3B8", display: "block" }}>
                    CARDHOLDER
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {cardName.trim() ? cardName.trim().toUpperCase() : "CARDHOLDER NAME"}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: "right" }}>
                  <Typography variant="caption" sx={{ color: "#94A3B8", display: "block" }}>
                    BILL CYCLE
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "#86EFAC" }}>
                    Gen {ordinalDay(billGenDay)} • Due {ordinalDay(billDueDay)}
                  </Typography>
                </Box>
              </Stack>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: "16px",
                bgcolor: softGreenBg,
                border: `1px solid ${softGreenBorder}`,
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <ShieldIcon sx={{ color: darkGreen, mt: 0.2 }} />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: darkGreen }}>
                    Duplicate &amp; Security Protection
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#166534", mt: 0.5, fontSize: "13px" }}>
                    Duplicate cards are blocked using a secure fingerprint scoped to your retailer account.
                    Raw card numbers and CVV are never stored or logged.
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5, color: darkGreen }}>
                <LockIcon sx={{ fontSize: 15 }} />
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  All card create, update &amp; delete actions are audit logged
                </Typography>
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
