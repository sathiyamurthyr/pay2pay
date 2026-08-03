"use client";

import React, { useState } from "react";
import { Box, Paper, Typography, Stack, Tabs, Tab, Alert, CircularProgress, Button } from "@mui/material";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ShieldIcon from "@mui/icons-material/Shield";
import { M3TextField, M3CurrencyInput, M3Select } from "@/components/ui/form-components";
import { M3Button } from "@/components/ui/m3-components";
import { retailerApi } from "@/services/retailer-api";
import { useRetailerStore } from "@/stores/use-retailer-store";

export default function AepsPage() {
  const { wallet, updateWallet } = useRetailerStore();
  const [tab, setTab] = useState<"CASH_WITHDRAWAL" | "BALANCE_ENQUIRY" | "MINI_STATEMENT" | "AADHAAR_PAY">("CASH_WITHDRAWAL");
  const [aadhaar, setAadhaar] = useState("998877664412");
  const [bank, setBank] = useState("SBI");
  const [customerMobile, setCustomerMobile] = useState("9876543210");
  const [amount, setAmount] = useState("2000");

  const [deviceConnected, setDeviceConnected] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [fingerprintCaptured, setFingerprintCaptured] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [txnResult, setTxnResult] = useState<any | null>(null);

  const bankOptions = [
    { value: "SBI", label: "State Bank of India (SBI)" },
    { value: "HDFC", label: "HDFC Bank" },
    { value: "ICICI", label: "ICICI Bank" },
    { value: "PNB", label: "Punjab National Bank" },
    { value: "BOB", label: "Bank of Baroda" },
  ];

  const handleScanFingerprint = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setDeviceConnected(true);
      setFingerprintCaptured(true);
    }, 1500);
  };

  const handleExecuteAeps = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const numericAmt = parseFloat(amount) || 0;
    const res = await retailerApi.executeAeps({
      transactionType: tab,
      aadhaarNumber: aadhaar,
      bankIin: bank,
      amount: numericAmt,
      customerMobile,
    });

    setSubmitting(false);
    setTxnResult(res);

    if (res.status === "SUCCESS") {
      updateWallet({
        mainBalance: wallet.mainBalance + numericAmt + 5.0,
        todayMargin: wallet.todayMargin + 5.0,
      });
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "20px", pb: 4 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
        <Paper elevation={0} sx={{ p: 3.5, borderRadius: 3.5, border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
          <Tabs
            value={tab}
            onChange={(_, val) => { setTab(val); setTxnResult(null); }}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mb: 3, borderBottom: "1px solid #E5E7EB" }}
          >
            <Tab label="Cash Out" value="CASH_WITHDRAWAL" />
            <Tab label="Balance Enquiry" value="BALANCE_ENQUIRY" />
            <Tab label="Mini Statement" value="MINI_STATEMENT" />
            <Tab label="Aadhaar Pay" value="AADHAAR_PAY" />
          </Tabs>

          <form onSubmit={handleExecuteAeps}>
            <Stack spacing={2.5}>
              <M3Select label="Customer Bank" value={bank} onChange={(e) => setBank(e.target.value)} options={bankOptions} />
              <M3TextField label="12-Digit Aadhaar Number" value={aadhaar} onChange={(e) => setAadhaar(e.target.value)} />
              <M3TextField label="Customer Mobile Number" value={customerMobile} onChange={(e) => setCustomerMobile(e.target.value)} />

              {(tab === "CASH_WITHDRAWAL" || tab === "AADHAAR_PAY") && (
                <M3CurrencyInput label="Withdrawal Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
              )}

              <Box sx={{ p: 2.5, borderRadius: 3, backgroundColor: "#F8FAFC", border: "1px solid #E5E7EB", textCenter: "center" }}>
                <Stack direction="row" spacing={1.5} sx={{ justifyContent: "center", alignItems: "center", mb: 1.5 }}>
                  <FingerprintIcon sx={{ color: fingerprintCaptured ? "#16A34A" : "#D97706", fontSize: 28 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {fingerprintCaptured ? "Biometric Captured OK (Quality: 82%)" : "Mantra / Morpho RD Service Scanner"}
                  </Typography>
                </Stack>

                <Button variant="outlined" color={fingerprintCaptured ? "success" : "warning"} onClick={handleScanFingerprint} disabled={scanning} fullWidth>
                  {scanning ? <CircularProgress size={20} /> : fingerprintCaptured ? "Re-scan Fingerprint" : "Capture Customer Fingerprint"}
                </Button>
              </Box>

              <M3Button type="submit" variant="contained" loading={submitting} disabled={!fingerprintCaptured} fullWidth sx={{ py: 1.5 }}>
                Submit AEPS Transaction
              </M3Button>
            </Stack>
          </form>
        </Paper>

        {/* Transaction Result & Receipt Card */}
        <Paper elevation={0} sx={{ p: 3.5, borderRadius: 3.5, border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "#111827", mb: 2 }}>
            Live AEPS Terminal & Receipt
          </Typography>

          {txnResult ? (
            <Alert severity="success" icon={<CheckCircleIcon sx={{ fontSize: 28 }} />} sx={{ borderRadius: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>AEPS Cash Out Successful!</Typography>
              <Typography variant="body2">RRN: {txnResult.rrn}</Typography>
              <Typography variant="body2">Amount: ₹{txnResult.amount}</Typography>
              <Typography variant="body2">Bank Balance Remaining: ₹{txnResult.bankBalance}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, mt: 1 }}>Retailer Commission Earned: +₹5.00</Typography>
            </Alert>
          ) : (
            <Box sx={{ p: 4, textAlign: "center", color: "#6B7280" }}>
              <ShieldIcon sx={{ fontSize: 48, color: "#9CA3AF", mb: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Awaiting Biometric Authentication</Typography>
              <Typography variant="body2">Scan customer fingerprint to initiate instant cash withdrawal.</Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
