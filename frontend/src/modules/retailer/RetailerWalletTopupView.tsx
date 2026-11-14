"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Box, Paper, Typography, Button, TextField, Chip, Alert,
  CircularProgress, Card, CardContent, CardActionArea,
  IconButton, Tooltip, InputAdornment
} from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import ElectricalServicesIcon from "@mui/icons-material/ElectricalServices";
import FlightIcon from "@mui/icons-material/Flight";
import SecurityIcon from "@mui/icons-material/Security";
import SchoolIcon from "@mui/icons-material/School";
import LayersIcon from "@mui/icons-material/Layers";
import LocalAtmIcon from "@mui/icons-material/LocalAtm";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

import apiClient from "@/lib/api";
import { useRetailerStore } from "@/stores/use-retailer-store";

interface ServiceOption {
  service_type_ref_id: number;
  svc_code: string;
  svc_name: string;
  svc_desc?: string;
  svc_icon?: string;
  is_enabled: boolean;
}

interface PaymentModeOption {
  payment_mode_ref_id: number;
  pay_mode_code: string;
  pay_mode_name: string;
  pay_mode_desc?: string;
  pay_icon?: string;
  is_enabled: boolean;
}

interface CardTypeOption {
  card_type_ref_id: number;
  card_type_code: string;
  card_type_name: string;
  card_network: string;
  is_enabled: boolean;
}

interface VendorOption {
  payin_vendor_ref_id: number;
  vendor_code: string;
  vendor_name: string;
  provider_name: string;
  is_default: boolean;
}

interface MdrPreview {
  txn_amount: number;
  mdr_pct: number;
  mdr_fixed: number;
  mdr_amount: number;
  tax_pct: number;
  tax_amount: number;
  total_charges: number;
  customer_payable: number;
  retailer_credit: number;
  company_mdr_liability: number;
  mdr_treatment: string;
  vendor_name: string;
}

export default function RetailerWalletTopupView() {
  const router = useRouter();
  const { wallet, syncBalance, isSyncing } = useRetailerStore();

  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>("Enterprise Portal");
  const [minAmount, setMinAmount] = useState<number>(10);
  const [maxAmount, setMaxAmount] = useState<number>(500000);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentModeOption[]>([]);
  const [cardTypes, setCardTypes] = useState<CardTypeOption[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);

  const [step, setStep] = useState<number>(1);
  const [amount, setAmount] = useState<string>("5000");
  const [selectedService, setSelectedService] = useState<string>("UTILITY");
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [selectedMode, setSelectedMode] = useState<string>("UPI");
  const [selectedCard, setSelectedCard] = useState<string>("");

  const [preview, setPreview] = useState<MdrPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [initiating, setInitiating] = useState(false);
  const [txnResult, setTxnResult] = useState<any | null>(null);
  const [txnError, setTxnError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const PRESETS = [1000, 2000, 5000, 10000, 25000, 50000];

  const fetchOptions = useCallback(async () => {
    try {
      setLoadingConfig(true);
      setConfigError(null);
      const res = await apiClient.get("/api/v1/payin/options");
      if (res.data && res.data.success) {
        setCompanyName(res.data.company_name || "Enterprise Portal");
        setMinAmount(res.data.min_amount || 10);
        setMaxAmount(res.data.max_amount || 500000);
        setServices(res.data.services || []);
        setPaymentModes(res.data.payment_modes || []);
        setCardTypes(res.data.card_types || []);
        setVendors(res.data.vendors || []);

        if (res.data.vendors?.length > 0) {
          const def = res.data.vendors.find((v: VendorOption) => v.is_default) || res.data.vendors[0];
          setSelectedVendor(def.vendor_code);
        }
      }
    } catch (e: any) {
      console.error("Failed to load PayIn options", e);
      setConfigError(e?.response?.data?.detail || "Failed to load payment options for your organization.");
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  const fetchPreview = useCallback(async () => {
    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt < minAmount) {
      setPreview(null);
      return;
    }

    try {
      setLoadingPreview(true);
      const res = await apiClient.post("/api/v1/payin/mdr/preview", {
        amount: numAmt,
        service_type_code: selectedService,
        payment_mode_code: selectedMode,
        card_type_code: selectedCard || undefined,
        vendor_code: selectedVendor || undefined
      });
      if (res.data && res.data.success) {
        setPreview(res.data);
      }
    } catch (e) {
      console.error("Failed to fetch MDR preview", e);
    } finally {
      setLoadingPreview(false);
    }
  }, [amount, minAmount, selectedService, selectedMode, selectedCard, selectedVendor]);

  useEffect(() => {
    if (step >= 2) {
      fetchPreview();
    }
  }, [step, fetchPreview]);

  const handleInitiatePayment = async () => {
    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt < minAmount || numAmt > maxAmount) {
      setTxnError(`Please enter a valid amount between ₹${minAmount} and ₹${maxAmount}`);
      return;
    }

    try {
      setInitiating(true);
      setTxnError(null);

      const refId = `TOPUP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const res = await apiClient.post("/api/v1/payin/collect", {
        amount: numAmt,
        customer_name: "Retailer Wallet Top-Up",
        customer_mobile: "9876543210",
        reference_id: refId,
        service_type_code: selectedService,
        payment_mode_code: selectedMode,
        card_type_code: selectedCard || undefined,
        vendor_code: selectedVendor || undefined,
        note: `Wallet Top-Up via ${selectedMode}`
      });

      if (res.data && res.data.success) {
        setTxnResult(res.data);
        setStep(5);
      } else {
        setTxnError(res.data?.message || "Failed to initiate transaction.");
      }
    } catch (e: any) {
      setTxnError(e?.response?.data?.detail || e?.response?.data?.message || "Payment initiation error. Please retry.");
    } finally {
      setInitiating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getServiceIcon = (code: string) => {
    switch (code) {
      case "UTILITY": return <ElectricalServicesIcon sx={{ fontSize: 36, color: "primary.main" }} />;
      case "TRAVEL": return <FlightIcon sx={{ fontSize: 36, color: "primary.main" }} />;
      case "INSURANCE": return <SecurityIcon sx={{ fontSize: 36, color: "primary.main" }} />;
      case "EDUCATION": return <SchoolIcon sx={{ fontSize: 36, color: "primary.main" }} />;
      default: return <LayersIcon sx={{ fontSize: 36, color: "primary.main" }} />;
    }
  };

  const getModeIcon = (code: string) => {
    switch (code) {
      case "UPI": return <QrCode2Icon sx={{ fontSize: 28, color: "success.main" }} />;
      case "CREDIT_CARD": return <CreditCardIcon sx={{ fontSize: 28, color: "primary.main" }} />;
      case "DEBIT_CARD": return <CreditCardIcon sx={{ fontSize: 28, color: "info.main" }} />;
      case "NET_BANKING": return <AccountBalanceIcon sx={{ fontSize: 28, color: "warning.main" }} />;
      default: return <LocalAtmIcon sx={{ fontSize: 28, color: "text.secondary" }} />;
    }
  };

  if (loadingConfig) {
    return (
      <Box sx={{ p: 4, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
        <CircularProgress size={48} thickness={4} />
        <Typography variant="body1" sx={{ mt: 2, color: "text.secondary" }}>
          Loading payment configuration...
        </Typography>
      </Box>
    );
  }

  if (configError) {
    return (
      <Box sx={{ p: 4, maxWidth: 600, mx: "auto" }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {configError}
        </Alert>
        <Button variant="contained" onClick={fetchOptions}>
          Retry Connection
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1000, mx: "auto" }}>
      {/* Top Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <IconButton component={Link} href="/retailer/wallet" size="small">
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Wallet Top-Up
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Company: {companyName} • Instant Gateway Processing
            </Typography>
          </Box>
        </Box>

        <Paper elevation={0} sx={{ p: 1.5, px: 2.5, bgcolor: "primary.50", border: "1px solid", borderColor: "primary.100", borderRadius: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <AccountBalanceWalletIcon color="primary" />
            <Box>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1 }}>
                Live Balance
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "primary.main" }}>
                ₹{wallet?.balance?.toLocaleString("en-IN", { minimumFractionDigits: 2 }) || "0.00"}
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => syncBalance()} disabled={isSyncing}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Box>
        </Paper>
      </Box>

      {/* Main Container */}
      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
        {txnError && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setTxnError(null)}>
            {txnError}
          </Alert>
        )}

        {/* Step 1: Amount & Service */}
        {step === 1 && (
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
              1. Enter Top-Up Amount
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              size="medium"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 5000"
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  sx: { fontSize: "1.25rem", fontWeight: 700 }
                }
              }}
              helperText={`Minimum ₹${minAmount.toLocaleString("en-IN")} • Maximum ₹${maxAmount.toLocaleString("en-IN")}`}
              sx={{ mb: 2 }}
            />

            {/* Quick Chips */}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 4 }}>
              {PRESETS.map((p) => (
                <Chip
                  key={p}
                  label={`+₹${p.toLocaleString("en-IN")}`}
                  clickable
                  variant={amount === String(p) ? "filled" : "outlined"}
                  color={amount === String(p) ? "primary" : "default"}
                  onClick={() => setAmount(String(p))}
                  sx={{ fontWeight: 600 }}
                />
              ))}
            </Box>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
              2. Select Purpose / Service Type
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" }, gap: 2, mb: 4 }}>
              {services.map((svc) => {
                const isSelected = selectedService === svc.svc_code;
                return (
                  <Card
                    key={svc.service_type_ref_id}
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      borderColor: isSelected ? "primary.main" : "divider",
                      bgcolor: isSelected ? "primary.50" : "background.paper",
                      borderWidth: isSelected ? 2 : 1
                    }}
                  >
                    <CardActionArea onClick={() => setSelectedService(svc.svc_code)} sx={{ p: 2 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        {getServiceIcon(svc.svc_code)}
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {svc.svc_name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                            {svc.svc_desc}
                          </Typography>
                        </Box>
                      </Box>
                    </CardActionArea>
                  </Card>
                );
              })}
            </Box>

            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                size="large"
                disabled={!amount || parseFloat(amount) < minAmount || parseFloat(amount) > maxAmount}
                onClick={() => setStep(2)}
                sx={{ px: 4, py: 1.2, fontWeight: 700 }}
              >
                Continue to Payment Method
              </Button>
            </Box>
          </Box>
        )}

        {/* Step 2: Payment Mode & Vendor */}
        {step === 2 && (
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                3. Choose Payment Method
              </Typography>
              <Button size="small" onClick={() => setStep(1)}>
                Change Amount (₹{parseFloat(amount).toLocaleString("en-IN")})
              </Button>
            </Box>

            {vendors.length > 0 && (
              <Box sx={{ p: 1.5, mb: 3, bgcolor: "grey.50", borderRadius: 2, border: "1px dashed", borderColor: "grey.300" }}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Processed via verified provider: <strong>{vendors[0]?.vendor_name}</strong>
                </Typography>
              </Box>
            )}

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, mb: 4 }}>
              {paymentModes.map((mode) => {
                const isSelected = selectedMode === mode.pay_mode_code;
                return (
                  <Card
                    key={mode.payment_mode_ref_id}
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      borderColor: isSelected ? "primary.main" : "divider",
                      bgcolor: isSelected ? "primary.50" : "background.paper",
                      borderWidth: isSelected ? 2 : 1
                    }}
                  >
                    <CardActionArea onClick={() => setSelectedMode(mode.pay_mode_code)} sx={{ p: 2.5 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        {getModeIcon(mode.pay_mode_code)}
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {mode.pay_mode_name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            {mode.pay_mode_desc}
                          </Typography>
                        </Box>
                      </Box>
                    </CardActionArea>
                  </Card>
                );
              })}
            </Box>

            {/* Card Selection */}
            {(selectedMode === "CREDIT_CARD" || selectedMode === "DEBIT_CARD") && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                  Select Card Classification
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                  {cardTypes
                    .filter((c) => (selectedMode === "CREDIT_CARD" ? c.card_type_code.startsWith("CREDIT") : c.card_type_code.startsWith("DEBIT")))
                    .map((card) => {
                      const isSelected = selectedCard === card.card_type_code;
                      return (
                        <Chip
                          key={card.card_type_ref_id}
                          label={`${card.card_type_name} (${card.card_network})`}
                          clickable
                          color={isSelected ? "primary" : "default"}
                          variant={isSelected ? "filled" : "outlined"}
                          onClick={() => setSelectedCard(card.card_type_code)}
                          sx={{ py: 2, fontWeight: 600 }}
                        />
                      );
                    })}
                </Box>
              </Box>
            )}

            {/* Live MDR Review Box */}
            {preview && (
              <Paper variant="outlined" sx={{ p: 3, mb: 4, bgcolor: "grey.50", borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "primary.main", mb: 2 }}>
                  Charges & Credit Breakdown (MDR Engine Verified)
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr 1fr 1fr" }, gap: 2 }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>Top-Up Amount</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>₹{preview.txn_amount.toFixed(2)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>MDR + GST (18%)</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: "text.secondary" }}>
                      ₹{preview.total_charges.toFixed(2)} ({(preview.mdr_pct * 100).toFixed(2)}%)
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>You Pay (Customer)</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: "primary.dark" }}>
                      ₹{preview.customer_payable.toFixed(2)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>Credited to Wallet</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: "success.main" }}>
                      ₹{preview.retailer_credit.toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            )}

            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Button variant="outlined" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                variant="contained"
                size="large"
                disabled={initiating || loadingPreview}
                onClick={handleInitiatePayment}
                startIcon={initiating ? <CircularProgress size={20} color="inherit" /> : null}
                sx={{ px: 4, py: 1.2, fontWeight: 700 }}
              >
                {initiating ? "Connecting Gateway..." : "Confirm & Pay"}
              </Button>
            </Box>
          </Box>
        )}

        {/* Step 5: Success & Redirection */}
        {step === 5 && txnResult && (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <CheckCircleIcon sx={{ fontSize: 72, color: "success.main", mb: 2 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
              PayIn Order Generated
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
              Transaction ID: <strong>{txnResult.tid}</strong>
            </Typography>

            <Paper variant="outlined" sx={{ p: 3, maxWidth: 500, mx: "auto", mb: 4, textAlign: "left" }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>Amount Payable</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>₹{txnResult.customer_payable?.toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>Expected Wallet Credit</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "success.main" }}>₹{txnResult.retailer_credit?.toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>Payment Provider</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{txnResult.provider}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>Status</Typography>
                  <Chip label={txnResult.status} size="small" color="warning" />
                </Box>
              </Box>
            </Paper>

            {txnResult.payment_url && (
              <Box sx={{ mb: 4 }}>
                <Button
                  variant="contained"
                  color="success"
                  size="large"
                  href={txnResult.payment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  endIcon={<OpenInNewIcon />}
                  sx={{ px: 5, py: 1.5, fontWeight: 700, fontSize: "1rem" }}
                >
                  Proceed to BankMe Checkout
                </Button>
              </Box>
            )}

            {txnResult.qr_string && (
              <Box sx={{ mb: 4, p: 2, bgcolor: "grey.50", display: "inline-block", borderRadius: 2 }}>
                <Typography variant="caption" sx={{ display: "block", mb: 1 }}>
                  Scan UPI QR using PhonePe / GPay / Paytm
                </Typography>
                <Typography variant="body2" sx={{ wordBreak: "break-all", maxWidth: 400 }}>
                  {txnResult.qr_string}
                </Typography>
              </Box>
            )}

            <Box>
              <Button variant="outlined" component={Link} href="/retailer/wallet">
                Back to Wallet
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
