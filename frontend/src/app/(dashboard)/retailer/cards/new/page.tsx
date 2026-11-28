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
import SaveIcon from "@mui/icons-material/Save";
import ShieldIcon from "@mui/icons-material/Shield";
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
  const primaryGreen = "#16A34A";
  const darkGreen = "#15803D";
  const softGreenBg = "#ECFDF5";
  const softGreenBorder = "#BBF7D0";

  const [cardTypes, setCardTypes] = useState<RetailerCardTypeOption[]>([]);
  const [banks, setBanks] = useState<RetailerCardBankOption[]>([]);
  const [metaLoading, setMetaLoading] = useState(true);

  const [cardholderName, setCardholderName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [selectedCardType, setSelectedCardType] = useState<RetailerCardTypeOption | null>(null);
  const [selectedBank, setSelectedBank] = useState<RetailerCardBankOption | null>(null);
  const [billGenerateDay, setBillGenerateDay] = useState<number>(1);
  const [billDueDay, setBillDueDay] = useState<number>(15);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setMetaLoading(true);
    retailerCardsApi
      .getMetadata()
      .then((res) => {
        setCardTypes(res.card_types || []);
        setBanks(res.banks || []);
        if (res.card_types?.length) {
          setSelectedCardType(res.card_types[0]);
        }
      })
      .catch(() => {
        setCardTypes([
          { card_type_code: "VISA", card_type_name: "Visa" },
          { card_type_code: "MASTERCARD", card_type_name: "Mastercard" },
          { card_type_code: "RUPAY", card_type_name: "RuPay" },
          { card_type_code: "AMEX", card_type_name: "American Express" },
        ]);
      })
      .finally(() => setMetaLoading(false));
  }, []);

  const maskedPreview = useMemo(() => maskCardPreview(cardNumber), [cardNumber]);

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (cardholderName.trim().length < 2) {
      errs.cardholder_name = "Enter a valid cardholder name (minimum 2 characters).";
    }
    if (!isValidIndianMobile(mobileNumber)) {
      errs.mobile_number = "Enter a valid 10-digit Indian mobile number (starting with 6-9).";
    }
    const digits = sanitizeDigits(cardNumber);
    if (digits.length < 13 || digits.length > 19) {
      errs.card_number = "Card number must be 13 to 19 digits.";
    } else if (!luhnCheck(digits)) {
      errs.card_number = "Invalid card number (Luhn checksum failed).";
    }
    if (!selectedCardType) {
      errs.card_type = "Select a card type.";
    }
    if (!selectedBank?.bank_name) {
      errs.bank_name = "Select an issuing bank.";
    }
    if (billGenerateDay < 1 || billGenerateDay > 31) {
      errs.bill_generate_date = "Select a valid Bill Generate Date (1-31).";
    }
    if (billDueDay < 1 || billDueDay > 31) {
      errs.bill_due_date = "Select a valid Bill Due Date (1-31).";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validateForm() || !selectedCardType || !selectedBank) {
      return;
    }

    setSubmitting(true);
    try {
      await retailerCardsApi.createCard({
        cardholder_name: cardholderName.trim(),
        mobile_number: normalizeIndianMobile(mobileNumber),
        card_number: sanitizeDigits(cardNumber),
        card_type: selectedCardType.card_type_code,
        card_type_ref_id: selectedCardType.card_type_ref_id ?? null,
        bank_name: selectedBank.bank_name,
        bank_ifsc_ref_id: selectedBank.bank_ifsc_ref_id ?? null,
        bill_generate_date: billGenerateDay,
        bill_due_date: billDueDay,
      });
      router.push("/retailer/cards");
      router.refresh();
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
    <Box sx={{ maxWidth: 1100, mx: "auto", pb: 6 }}>
      <Box sx={{ mb: 2.5 }}>
        <Button
          component={Link}
          href="/retailer/cards"
          startIcon={<ArrowBackIcon />}
          sx={{
            textTransform: "none",
            fontWeight: 700,
            color: darkGreen,
            "&:hover": { bgcolor: softGreenBg },
          }}
        >
          Back to Card Management
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, md: 3.5 },
              borderRadius: "18px",
              bgcolor: "#FFFFFF",
              border: `1px solid ${softGreenBorder}`,
              boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
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
                  Register a credit card for automated Current Date &amp; Upcoming Bill tracking.
                </Typography>
              </Box>
            </Stack>

            {error && (
              <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2.5, borderRadius: "12px" }}>
                {error}
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
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    error={Boolean(fieldErrors.cardholder_name)}
                    helperText={fieldErrors.cardholder_name}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    required
                    label="Mobile Number"
                    placeholder="10-digit Indian mobile"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(sanitizeDigits(e.target.value).slice(0, 12))}
                    error={Boolean(fieldErrors.mobile_number)}
                    helperText={fieldErrors.mobile_number || "10-digit mobile starting with 6-9"}
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
                      "Validated with Luhn checksum and stored securely as masked + one-way hash."
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
                    value={selectedCardType?.card_type_code || ""}
                    onChange={(e) => {
                      const found = cardTypes.find((c) => c.card_type_code === e.target.value) || null;
                      setSelectedCardType(found);
                    }}
                    error={Boolean(fieldErrors.card_type)}
                    helperText={fieldErrors.card_type}
                    disabled={metaLoading && cardTypes.length === 0}
                  >
                    {cardTypes.map((ct) => (
                      <MenuItem key={ct.card_type_code} value={ct.card_type_code}>
                        {ct.card_type_name}
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
                      opt.bank_name === val.bank_name && opt.bank_ifsc_ref_id === val.bank_ifsc_ref_id
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        required
                        label="Issuing Bank"
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
                    label="Bill Generate Date (Day of Month)"
                    value={billGenerateDay}
                    onChange={(e) => setBillGenerateDay(Number(e.target.value))}
                    error={Boolean(fieldErrors.bill_generate_date)}
                    helperText={fieldErrors.bill_generate_date || `Statement generates on ${ordinalDay(billGenerateDay)} monthly`}
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
                    error={Boolean(fieldErrors.bill_due_date)}
                    helperText={fieldErrors.bill_due_date || `Payment due on ${ordinalDay(billDueDay)} monthly`}
                  >
                    {DAYS_OF_MONTH.map((d) => (
                      <MenuItem key={d} value={d}>
                        {ordinalDay(d)} of every month
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid size={{ xs: 12 }} sx={{ pt: 1 }}>
                  <Stack direction="row" spacing={1.5} justifyContent="flex-end">
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
                      {submitting ? "Saving Card..." : "Save Credit Card"}
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grid>

        {/* Live Masked Card Preview & Security Summary */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Stack spacing={2.5}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: "20px",
                background: "linear-gradient(135deg, #0F172A 0%, #14532D 100%)",
                color: "#FFFFFF",
                boxShadow: "0 14px 32px rgba(20, 83, 45, 0.24)",
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#BBF7D0" }}>
                  {selectedBank?.bank_name || "ISSUING BANK"}
                </Typography>
                <Chip
                  size="small"
                  label={selectedCardType?.card_type_name || "CARD"}
                  sx={{ bgcolor: "rgba(255,255,255,0.16)", color: "#FFFFFF", fontWeight: 800 }}
                />
              </Stack>

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
                    {cardholderName.trim() ? cardholderName.trim().toUpperCase() : "CARDHOLDER NAME"}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: "right" }}>
                  <Typography variant="caption" sx={{ color: "#94A3B8", display: "block" }}>
                    BILL CYCLE
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "#86EFAC" }}>
                    Gen {ordinalDay(billGenerateDay)} • Due {ordinalDay(billDueDay)}
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
                    Duplicate cards are automatically blocked for your retailer account. Full card numbers are never
                    exposed in dashboard tables, logs, or URLs.
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5, color: darkGreen }}>
                <LockIcon sx={{ fontSize: 15 }} />
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  Scoped strictly to your authenticated Retailer &amp; Company session
                </Typography>
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
