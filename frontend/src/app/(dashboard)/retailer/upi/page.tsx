"use client";

import React, { useState } from "react";
import { Box, Paper, Typography, Stack, Alert, Tabs, Tab } from "@mui/material";
import QrCodeIcon from "@mui/icons-material/QrCode";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { M3CurrencyInput, M3TextField } from "@/components/ui/form-components";
import { M3Button } from "@/components/ui/m3-components";
import ScannableQrCode from "@/components/ui/scannable-qr-code";

export default function UpiPage() {
  const [tab, setTab] = useState<"QR" | "COLLECT">("QR");
  const [amount, setAmount] = useState("500");
  const [vpa, setVpa] = useState("customer@upi");
  const [qrGenerated, setQrGenerated] = useState(false);
  const [collectSent, setCollectSent] = useState(false);

  const numAmount = parseFloat(amount || "0");
  const upiUri = `upi://pay?pa=pay2pay.retailer9840@icici&pn=Pay2Pay%20Retailer%20Store&mc=0000&tr=TXN${Date.now()}&tn=Store%20Payment&am=${numAmount}&cu=INR`;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "20px", pb: 4 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
        <Paper elevation={0} sx={{ p: 3.5, borderRadius: "20px", border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
          <Tabs value={tab} onChange={(_, val) => setTab(val)} sx={{ mb: 3, borderBottom: "1px solid #E5E7EB" }}>
            <Tab label="Dynamic UPI QR" value="QR" sx={{ fontWeight: 700 }} />
            <Tab label="UPI Collect (VPA Push)" value="COLLECT" sx={{ fontWeight: 700 }} />
          </Tabs>

          {tab === "QR" ? (
            <Stack spacing={2.5}>
              <M3CurrencyInput label="Payment Amount (₹)" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <M3Button variant="contained" onClick={() => setQrGenerated(true)} fullWidth sx={{ height: 44, borderRadius: "12px", fontWeight: 800 }}>
                Generate Dynamic UPI QR
              </M3Button>
            </Stack>
          ) : (
            <Stack spacing={2.5}>
              <M3TextField label="Customer VPA / UPI ID" value={vpa} onChange={(e) => setVpa(e.target.value)} />
              <M3CurrencyInput label="Request Amount (₹)" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <M3Button variant="contained" onClick={() => setCollectSent(true)} fullWidth sx={{ height: 44, borderRadius: "12px", fontWeight: 800 }}>
                Send UPI Collect Request
              </M3Button>
              {collectSent && (
                <Alert severity="success" sx={{ borderRadius: 2.5 }}>
                  Collect Request Sent to {vpa}! Awaiting customer PIN authorization.
                </Alert>
              )}
            </Stack>
          )}
        </Paper>

        <Paper elevation={0} sx={{ p: 3.5, borderRadius: "20px", border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          {qrGenerated ? (
            <Box sx={{ textAlign: "center" }}>
              <ScannableQrCode
                value={upiUri}
                size={220}
                label={`Scan & Pay ₹${numAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
                subLabel="UPI ID: pay2pay.retailer9840@icici"
              />
            </Box>
          ) : (
            <Typography variant="body2" sx={{ color: "#6B7280", fontWeight: 500 }}>
              Enter amount to display dynamic QR code for customer scanning.
            </Typography>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
