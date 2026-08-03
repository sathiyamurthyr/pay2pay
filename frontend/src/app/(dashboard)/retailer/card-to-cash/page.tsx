"use client";

import React, { useState } from "react";
import {
  Box, Paper, Typography, Button, TextField, Chip, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Stack, Alert, LinearProgress
} from "@mui/material";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SendIcon from "@mui/icons-material/Send";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { M3StatusChip } from "@/components/ui/m3-components";

interface PayoutTxn {
  id: string;
  recipient: string;
  bankAccount: string;
  amount: number;
  charge: number;
  status: "SUCCESS" | "FAILED" | "PENDING";
  utr: string;
  time: string;
}

const MOCK_PAYOUT_TXNS: PayoutTxn[] = [
  { id: "PAYOUT-9001", recipient: "Kavitha Sharma", bankAccount: "HDFC Bank (****5010)", amount: 5000, charge: 10, status: "SUCCESS", utr: "UTR202608039001", time: "18:24 PM" },
  { id: "PAYOUT-9002", recipient: "Ramesh Kumar", bankAccount: "SBI Bank (****4412)", amount: 2000, charge: 5, status: "SUCCESS", utr: "UTR202608039002", time: "18:10 PM" },
  { id: "PAYOUT-9003", recipient: "Suresh Patel", bankAccount: "ICICI Bank (****2049)", amount: 15000, charge: 20, status: "FAILED", utr: "ERR_BANK_DOWN", time: "17:30 PM" },
];

export default function CardToCashPage() {
  const [tabIndex, setTabIndex] = useState(0);
  const [amount, setAmount] = useState("2000");
  const [accountNo, setAccountNo] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [processing, setProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const handleInitiatePayout = (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setSuccessMsg(`Payout of ₹${amount} initiated successfully via IMPS.`);
    }, 1500);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "20px", pb: 4 }}>
      {/* Daily Limits Bar */}
      <Paper elevation={0} sx={{ p: "18px 24px", borderRadius: "16px", border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#111827" }}>
            Daily Payout Transfer Limit
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 800, color: "#2563EB" }}>
            ₹45,000 / ₹2,00,000 Used (22.5%)
          </Typography>
        </Box>
        <LinearProgress variant="determinate" value={22.5} sx={{ height: 8, borderRadius: 4, backgroundColor: "#EFF6FF", "& .MuiLinearProgress-bar": { backgroundColor: "#2563EB" } }} />
      </Paper>

      {/* Tabs */}
      <Paper elevation={0} sx={{ borderRadius: "16px", border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
        <Tabs
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          sx={{ px: 2, "& .MuiTab-root": { fontWeight: 700, fontSize: "14px", py: 2 } }}
        >
          <Tab label="New Payout / EDC Swipe" icon={<CreditCardIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="Payout History" icon={<SendIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="Failed Transactions & Retries" icon={<WarningAmberIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab 0: New Payout */}
      {tabIndex === 0 && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" }, gap: 3 }}>
          <Paper elevation={0} sx={{ p: "24px", borderRadius: "20px", border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
            <Typography variant="h6" sx={{ fontSize: "18px", fontWeight: 800, color: "#111827", mb: 2 }}>
              Card Swipe & Instant Bank Payout
            </Typography>
            <form onSubmit={handleInitiatePayout}>
              <Stack spacing={2.5}>
                <TextField
                  fullWidth
                  label="Withdrawal / Payout Amount (₹)"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  size="small"
                  sx={{ "& .MuiInputBase-input": { fontSize: "18px", fontWeight: 800, fontFamily: "monospace" } }}
                />

                <TextField
                  fullWidth
                  label="Beneficiary Account Number"
                  value={accountNo}
                  onChange={(e) => setAccountNo(e.target.value)}
                  placeholder="e.g. 501009281746"
                  size="small"
                />

                <TextField
                  fullWidth
                  label="Bank IFSC Code"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  placeholder="e.g. HDFC0000128"
                  size="small"
                />

                {successMsg && (
                  <Alert severity="success" icon={<CheckCircleIcon />} sx={{ borderRadius: 2.5 }}>
                    {successMsg}
                  </Alert>
                )}

                <Button
                  type="submit"
                  variant="contained"
                  disabled={processing}
                  sx={{ height: 48, borderRadius: "14px", fontWeight: 800, backgroundColor: "#2563EB", fontSize: "15px" }}
                >
                  {processing ? "Processing Payout…" : "Initiate Instant Payout Transfer"}
                </Button>
              </Stack>
            </form>
          </Paper>
        </Box>
      )}

      {/* Tab 1: Payout History */}
      {tabIndex === 1 && (
        <Paper elevation={0} sx={{ p: "24px", borderRadius: "20px", border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
          <Typography variant="h6" sx={{ fontSize: "18px", fontWeight: 800, color: "#111827", mb: 2 }}>
            Recent Payout Transfers
          </Typography>
          <Table>
            <TableHead sx={{ backgroundColor: "#F8FAFC" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Payout ID</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Recipient</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Bank Account</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="right">Amount</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="right">Fee</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="center">Status</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Bank UTR</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {MOCK_PAYOUT_TXNS.map((p) => (
                <TableRow key={p.id}>
                  <TableCell sx={{ fontWeight: 800, color: "#2563EB", fontFamily: "monospace" }}>{p.id}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{p.recipient}</TableCell>
                  <TableCell>{p.bankAccount}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, fontFamily: "monospace" }}>₹{p.amount.toLocaleString("en-IN")}</TableCell>
                  <TableCell align="right">₹{p.charge}</TableCell>
                  <TableCell align="center"><M3StatusChip status={p.status} /></TableCell>
                  <TableCell sx={{ fontFamily: "monospace", fontSize: "12px" }}>{p.utr}</TableCell>
                  <TableCell>{p.time}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Tab 2: Failed Transactions */}
      {tabIndex === 2 && (
        <Paper elevation={0} sx={{ p: "24px", borderRadius: "20px", border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
          <Typography variant="h6" sx={{ fontSize: "18px", fontWeight: 800, color: "#111827", mb: 2 }}>
            Failed Payouts & Auto-Refund Logs
          </Typography>
          <Table>
            <TableHead sx={{ backgroundColor: "#F8FAFC" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Payout ID</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Recipient</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="right">Amount</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Failure Reason</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {MOCK_PAYOUT_TXNS.filter((p) => p.status === "FAILED").map((p) => (
                <TableRow key={p.id}>
                  <TableCell sx={{ fontWeight: 800, color: "#2563EB", fontFamily: "monospace" }}>{p.id}</TableCell>
                  <TableCell>{p.recipient}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, fontFamily: "monospace" }}>₹{p.amount.toLocaleString("en-IN")}</TableCell>
                  <TableCell sx={{ color: "#DC2626", fontWeight: 600 }}>Destination Bank Node Down</TableCell>
                  <TableCell align="center">
                    <Button size="small" variant="contained" color="primary" onClick={() => alert(`Retrying payout ${p.id}`)}>
                      Retry Payout
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}
