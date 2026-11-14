"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Box,
  Paper,
  Typography,
  Button,
  Tabs,
  Tab,
  Chip,
  Alert,
  CircularProgress,
  Stack,
  Divider,
  IconButton,
  Tooltip
} from "@mui/material";
import ShieldIcon from "@mui/icons-material/Shield";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LockIcon from "@mui/icons-material/Lock";
import apiClient from "@/lib/api";

function BankMeCheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tid = searchParams.get("tid") || "BPAY-DEMO-001";
  const order = searchParams.get("order") || `BM-${Date.now().toString().slice(-6)}`;
  const amountStr = searchParams.get("amount") || "500.00";
  const amount = parseFloat(amountStr) || 500.0;

  const [activeTab, setActiveTab] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resultState, setResultState] = useState<"IDLE" | "SUCCESS" | "FAILED">("IDLE");
  const [statusMessage, setStatusMessage] = useState("");

  const upiVpa = "smspay.collection@icici";
  const upiString = `upi://pay?pa=${upiVpa}&pn=SMSPay+Enterprises&am=${amount.toFixed(2)}&tr=${tid}&tn=PayIn+${tid}&cu=INR`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(upiString)}`;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiVpa);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulatePayment = async (statusToSimulate: "SUCCESS" | "FAILED") => {
    try {
      setProcessing(true);
      setStatusMessage(
        statusToSimulate === "SUCCESS"
          ? "Authorizing transaction with BankMe payment switch..."
          : "Declining transaction as requested..."
      );

      const utr = `UTR${Math.floor(100000000000 + Math.random() * 900000000000)}`;

      // Dispatch authoritative BankMe webhook
      const webhookPayload = {
        event: statusToSimulate === "SUCCESS" ? "PAYMENT_SUCCESS" : "PAYMENT_FAILED",
        status: statusToSimulate,
        merchant_tid: tid,
        reference_id: tid,
        bankme_ref: order,
        amount: amount,
        utr: utr,
        signature: "simulated_bankme_gateway_sig"
      };

      const res = await apiClient.post("/api/v1/payin/webhook/bankme", webhookPayload, {
        headers: {
          "X-API-KEY": "sk_7d6dccc54ca9b1c0f5f99de1a9724f12f183f9fe4b6748fa",
        },
      });

      if (statusToSimulate === "SUCCESS") {
        setResultState("SUCCESS");
        setStatusMessage(`Payment Verified! Reference UTR: ${utr}. Wallet credited successfully.`);
        setTimeout(() => {
          router.push(`/retailer/wallet-topup?status=success&tid=${tid}`);
        }, 2200);
      } else {
        setResultState("FAILED");
        setStatusMessage("Payment simulation was declined or cancelled.");
      }
    } catch (err: any) {
      console.error("BankMe webhook call error:", err);
      // Fallback: If webhook fails due to network, still notify user
      setStatusMessage(err.response?.data?.detail || "Simulation encountered a connection issue.");
      setResultState("FAILED");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 640, mx: "auto", my: { xs: 2, sm: 4 }, px: 2 }}>
      {/* Header with Security Badge */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 2.5,
          borderRadius: 3,
          background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
          color: "#FFFFFF",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: "#3B82F6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              fontWeight: 900,
              fontSize: 20,
            }}
          >
            BM
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: "1.1rem", lineHeight: 1.2 }}>
              BankMe Payment Gateway
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
              SMSPay Secure Checkout Service
            </Typography>
          </Box>
        </Box>
        <Chip
          icon={<ShieldIcon sx={{ fontSize: 16, color: "#10B981 !important" }} />}
          label="256-Bit SSL Encrypted"
          size="small"
          sx={{
            bgcolor: "rgba(16, 185, 129, 0.15)",
            color: "#10B981",
            fontWeight: 700,
            fontSize: "11px",
            border: "1px solid rgba(16, 185, 129, 0.3)",
          }}
        />
      </Paper>

      {/* Main Checkout Container */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #E2E8F0", overflow: "hidden" }}>
        {/* Order Amount Banner */}
        <Box sx={{ p: 3, bgcolor: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, textTransform: "uppercase" }}>
              Total Payable Amount
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748B" }}>
              TID: <strong>{tid}</strong>
            </Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <Typography variant="h4" sx={{ fontWeight: 900, color: "#0F172A" }}>
              ₹{amount.toFixed(2)}
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748B" }}>
              Order: {order}
            </Typography>
          </Box>
        </Box>

        {/* State Banner */}
        {resultState === "SUCCESS" && (
          <Alert severity="success" icon={<CheckCircleIcon sx={{ fontSize: 24 }} />} sx={{ m: 2.5, borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Payment Successful!
            </Typography>
            <Typography variant="body2">{statusMessage}</Typography>
            <Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary" }}>
              Redirecting back to your wallet in a moment...
            </Typography>
          </Alert>
        )}

        {resultState === "FAILED" && (
          <Alert severity="error" icon={<ErrorIcon sx={{ fontSize: 24 }} />} sx={{ m: 2.5, borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Payment Failed / Cancelled
            </Typography>
            <Typography variant="body2">{statusMessage}</Typography>
          </Alert>
        )}

        {resultState === "IDLE" && (
          <>
            {/* Tabs */}
            <Tabs
              value={activeTab}
              onChange={(_, val) => setActiveTab(val)}
              variant="fullWidth"
              sx={{
                borderBottom: "1px solid #E2E8F0",
                "& .MuiTab-root": { fontWeight: 700, fontSize: "13px", py: 1.5 },
              }}
            >
              <Tab icon={<QrCode2Icon />} iconPosition="start" label="UPI QR Code" />
              <Tab icon={<AccountBalanceIcon />} iconPosition="start" label="NetBanking" />
              <Tab icon={<CreditCardIcon />} iconPosition="start" label="Debit / Credit Card" />
            </Tabs>

            {/* Tab 0: UPI QR */}
            {activeTab === 0 && (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1E293B", mb: 0.5 }}>
                  Scan to Pay with Any UPI App
                </Typography>
                <Typography variant="caption" sx={{ color: "#64748B", display: "block", mb: 3 }}>
                  Google Pay • PhonePe • Paytm • BHIM • Cred
                </Typography>

                <Box
                  sx={{
                    display: "inline-block",
                    p: 2,
                    borderRadius: 3,
                    bgcolor: "#FFFFFF",
                    border: "2px solid #E2E8F0",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                    mb: 2.5,
                  }}
                >
                  <img
                    src={qrCodeUrl}
                    alt="BankMe PayIn QR Code"
                    width={220}
                    height={220}
                    style={{ display: "block", borderRadius: 8 }}
                  />
                </Box>

                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 1,
                    px: 2,
                    py: 1,
                    borderRadius: "9999px",
                    bgcolor: "#F1F5F9",
                    border: "1px solid #CBD5E1",
                    mb: 3,
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "#334155" }}>
                    UPI ID: {upiVpa}
                  </Typography>
                  <Tooltip title={copied ? "Copied!" : "Copy UPI ID"}>
                    <IconButton size="small" onClick={handleCopyUpi}>
                      <ContentCopyIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* Instant Simulation Actions */}
                <Divider sx={{ my: 2.5 }} />
                <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, display: "block", mb: 2 }}>
                  TEST GATEWAY CONTROLS (SANDBOX / SIMULATION MODE)
                </Typography>

                <Stack spacing={1.5} direction="column" sx={{ maxWidth: 360, mx: "auto" }}>
                  <Button
                    variant="contained"
                    color="success"
                    size="large"
                    disabled={processing}
                    onClick={() => handleSimulatePayment("SUCCESS")}
                    startIcon={processing ? <CircularProgress size={18} color="inherit" /> : <CheckCircleIcon />}
                    sx={{ py: 1.3, fontWeight: 700 }}
                  >
                    {processing ? "Authorizing Payment..." : "Simulate UPI Payment Success"}
                  </Button>

                  <Button
                    variant="outlined"
                    color="error"
                    size="medium"
                    disabled={processing}
                    onClick={() => handleSimulatePayment("FAILED")}
                    sx={{ fontWeight: 600 }}
                  >
                    Simulate Payment Decline
                  </Button>
                </Stack>
              </Box>
            )}

            {/* Tab 1: NetBanking */}
            {activeTab === 1 && (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Select Bank for Direct Debit
                </Typography>
                <Typography variant="caption" sx={{ color: "#64748B", display: "block", mb: 3 }}>
                  You will be securely redirected to the bank's portal
                </Typography>

                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, mb: 4 }}>
                  {["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank", "Kotak Mahindra", "Punjab National Bank"].map(
                    (b, i) => (
                      <Paper
                        key={b}
                        variant="outlined"
                        onClick={() => handleSimulatePayment("SUCCESS")}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          cursor: "pointer",
                          fontWeight: 700,
                          fontSize: "13px",
                          textAlign: "center",
                          "&:hover": { borderColor: "#3B82F6", bgcolor: "#EFF6FF" },
                        }}
                      >
                        {b}
                      </Paper>
                    )
                  )}
                </Box>

                <Button
                  variant="contained"
                  color="success"
                  fullWidth
                  disabled={processing}
                  onClick={() => handleSimulatePayment("SUCCESS")}
                  startIcon={processing ? <CircularProgress size={18} color="inherit" /> : <CheckCircleIcon />}
                  sx={{ py: 1.3, fontWeight: 700 }}
                >
                  {processing ? "Processing..." : `Pay ₹${amount.toFixed(2)} via NetBanking`}
                </Button>
              </Box>
            )}

            {/* Tab 2: Debit/Credit Card */}
            {activeTab === 2 && (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Pay with RuPay, Visa, or Mastercard
                </Typography>
                <Typography variant="caption" sx={{ color: "#64748B", display: "block", mb: 3 }}>
                  Transactions are authenticated via 3D Secure OTP
                </Typography>

                <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2, bgcolor: "#F8FAFC", textAlign: "left" }}>
                  <Typography variant="caption" sx={{ color: "#64748B", display: "block" }}>
                    Test Card Number
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700, letterSpacing: 1 }}>
                    4111 •••• •••• 1111 (Visa Sandbox)
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#64748B", display: "block", mt: 1 }}>
                    Valid Thru: 12/28 • CVV: 123
                  </Typography>
                </Paper>

                <Button
                  variant="contained"
                  color="success"
                  fullWidth
                  disabled={processing}
                  onClick={() => handleSimulatePayment("SUCCESS")}
                  startIcon={processing ? <CircularProgress size={18} color="inherit" /> : <CreditCardIcon />}
                  sx={{ py: 1.3, fontWeight: 700 }}
                >
                  {processing ? "Submitting..." : `Authorize ₹${amount.toFixed(2)} with Test Card`}
                </Button>
              </Box>
            )}
          </>
        )}

        {/* Footer */}
        <Box
          sx={{
            p: 2,
            bgcolor: "#F8FAFC",
            borderTop: "1px solid #E2E8F0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Button
            size="small"
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push("/retailer/wallet-topup")}
            sx={{ textTransform: "none", color: "#64748B" }}
          >
            Cancel & Return
          </Button>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <LockIcon sx={{ fontSize: 14, color: "#64748B" }} />
            <Typography variant="caption" sx={{ color: "#64748B", fontSize: "11px" }}>
              PCI-DSS Level 1 Compliant
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}

export default function BankMeCheckoutPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      }
    >
      <BankMeCheckoutContent />
    </Suspense>
  );
}

