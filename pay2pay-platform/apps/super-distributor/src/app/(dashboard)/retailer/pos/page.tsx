"use client";

import React, { useState } from "react";
import {
  Box, Paper, Typography, Button, TextField, Chip, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Stack, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Card, CardContent
} from "@mui/material";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import BatteryChargingFullIcon from "@mui/icons-material/BatteryChargingFull";
import SignalCellularAltIcon from "@mui/icons-material/SignalCellularAlt";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import ReplayIcon from "@mui/icons-material/Replay";
import { M3StatusChip } from "@/components/ui/m3-components";

interface PosTerminal {
  id: string;
  serialNumber: string;
  model: string;
  status: "ONLINE" | "OFFLINE";
  battery: number;
  lastSync: string;
  totalTxnsToday: number;
  totalVolumeToday: number;
}

interface PosTxn {
  id: string;
  terminalId: string;
  cardLast4: string;
  cardType: string;
  amount: number;
  commission: number;
  status: "SUCCESS" | "FAILED" | "REFUNDED";
  rrn: string;
  time: string;
}

const MOCK_TERMINALS: PosTerminal[] = [
  { id: "POS-TERM-01", serialNumber: "M920-8839-2026", model: "Android mPOS Pro 5G", status: "ONLINE", battery: 94, lastSync: "Just now", totalTxnsToday: 18, totalVolumeToday: 34500 },
  { id: "POS-TERM-02", serialNumber: "M920-4412-2025", model: "Pax A920 Wireless", status: "ONLINE", battery: 78, lastSync: "5 mins ago", totalTxnsToday: 12, totalVolumeToday: 21000 },
];

const MOCK_POS_TXNS: PosTxn[] = [
  { id: "POS-TXN-9001", terminalId: "M920-8839-2026", cardLast4: "4918", cardType: "HDFC Visa Platinum", amount: 5000, commission: 12.50, status: "SUCCESS", rrn: "RRN20260803001", time: "18:30 PM" },
  { id: "POS-TXN-9002", terminalId: "M920-8839-2026", cardLast4: "1092", cardType: "SBI Mastercard", amount: 2500, commission: 6.25, status: "SUCCESS", rrn: "RRN20260803002", time: "18:15 PM" },
  { id: "POS-TXN-9003", terminalId: "M920-4412-2025", cardLast4: "8821", cardType: "ICICI RuPay Debit", amount: 10000, commission: 25.00, status: "SUCCESS", rrn: "RRN20260803003", time: "17:45 PM" },
  { id: "POS-TXN-9004", terminalId: "M920-8839-2026", cardLast4: "5512", cardType: "Axis Credit Card", amount: 1500, commission: 0.00, status: "FAILED", rrn: "RRN20260803004", time: "17:10 PM" },
];

export default function PosPage() {
  const [tabIndex, setTabIndex] = useState(0);
  const [amount, setAmount] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [selectedTerminal, setSelectedTerminal] = useState(MOCK_TERMINALS[0].serialNumber);
  const [isProcessing, setIsProcessing] = useState(false);
  const [txnSuccess, setTxnSuccess] = useState<PosTxn | null>(null);
  const [refundDialog, setRefundDialog] = useState<PosTxn | null>(null);

  const handleSwipeTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      const newTxn: PosTxn = {
        id: `POS-TXN-${Math.floor(1000 + Math.random() * 9000)}`,
        terminalId: selectedTerminal,
        cardLast4: `${Math.floor(1000 + Math.random() * 9000)}`,
        cardType: "Visa / Mastercard Debit",
        amount: parseFloat(amount),
        commission: parseFloat(amount) * 0.0025,
        status: "SUCCESS",
        rrn: `RRN20260803${Math.floor(100 + Math.random() * 900)}`,
        time: "Just now",
      };
      setTxnSuccess(newTxn);
      setAmount("");
      setCustomerMobile("");
    }, 1800);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "20px", pb: 4 }}>
      {/* Tabs with status chip */}
      <Paper elevation={0} sx={{ p: "8px 16px", borderRadius: "16px", border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Tabs
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          sx={{ "& .MuiTab-root": { fontWeight: 700, fontSize: "14px", py: 1.5 } }}
        >
          <Tab label="Swipe Transaction Simulator" icon={<CreditCardIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="Terminal Management" icon={<PointOfSaleIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="Transaction History & Refunds" icon={<ReceiptLongIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
        </Tabs>
        <Chip
          icon={<CheckCircleIcon sx={{ "&&": { color: "#16A34A", fontSize: 16 } }} />}
          label="2 Terminals Active"
          sx={{ backgroundColor: "#DCFCE7", color: "#16A34A", fontWeight: 800, height: 28, fontSize: "12px" }}
        />
      </Paper>


      {/* TAB 0: Swipe Simulator */}
      {tabIndex === 0 && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "7fr 5fr" }, gap: 3 }}>
          <Paper elevation={0} sx={{ p: "24px", borderRadius: "20px", border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
            <Typography variant="h6" sx={{ fontSize: "18px", fontWeight: 800, color: "#111827", mb: 2 }}>
              Initiate Card Swipe Transaction
            </Typography>
            <form onSubmit={handleSwipeTransaction}>
              <Stack spacing={2.5}>
                <TextField
                  select
                  fullWidth
                  label="Select mPOS Terminal"
                  value={selectedTerminal}
                  onChange={(e) => setSelectedTerminal(e.target.value)}
                  slotProps={{ select: { native: true } }}
                  size="small"
                >
                  {MOCK_TERMINALS.map((t) => (
                    <option key={t.id} value={t.serialNumber}>
                      {t.model} ({t.serialNumber}) — Battery: {t.battery}%
                    </option>
                  ))}
                </TextField>

                <TextField
                  fullWidth
                  label="Transaction Amount (₹)"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount (e.g. 2500)"
                  required
                  size="small"
                  sx={{ "& .MuiInputBase-input": { fontSize: "18px", fontWeight: 800, fontFamily: "monospace" } }}
                />

                <TextField
                  fullWidth
                  label="Customer Mobile Number (Optional for SMS receipt)"
                  type="tel"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  placeholder="+91 98765 43210"
                  size="small"
                />

                <Alert severity="info" sx={{ borderRadius: 3, fontSize: "13px" }}>
                  Commission Rate: <strong>0.25% instant wallet credit</strong>. Funds settle immediately to main wallet.
                </Alert>

                <Button
                  type="submit"
                  variant="contained"
                  disabled={isProcessing}
                  startIcon={isProcessing ? <CircularProgress size={20} color="inherit" /> : <SwapHorizIcon />}
                  sx={{
                    height: 48,
                    borderRadius: "14px",
                    fontWeight: 800,
                    backgroundColor: "#2563EB",
                    fontSize: "15px",
                    "&:hover": { backgroundColor: "#1D4ED8" },
                  }}
                >
                  {isProcessing ? "Waiting for Card Swipe on Terminal…" : "Send Amount To POS Terminal"}
                </Button>
              </Stack>
            </form>
          </Paper>

          {/* Right Column: POS Device Info */}
          <Paper elevation={0} sx={{ p: "24px", borderRadius: "20px", border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
            <Typography variant="h6" sx={{ fontSize: "18px", fontWeight: 800, color: "#111827", mb: 2 }}>
              Connected mPOS Hardware
            </Typography>

            {MOCK_TERMINALS.map((t) => (
              <Card key={t.id} elevation={0} sx={{ mb: 2, borderRadius: "14px", border: "1px solid #E5E7EB", backgroundColor: "#F8FAFC" }}>
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#111827" }}>
                      {t.model}
                    </Typography>
                    <Chip label={t.status} size="small" sx={{ backgroundColor: "#DCFCE7", color: "#16A34A", fontWeight: 800, height: 20 }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: "#6B7280", display: "block", fontFamily: "monospace", mb: 1 }}>
                    S/N: {t.serialNumber}
                  </Typography>

                  <Stack direction="row" spacing={2} sx={{ alignItems: "center", color: "#4B5563" }}>
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                      <BatteryChargingFullIcon sx={{ fontSize: 16, color: "#16A34A" }} />
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>{t.battery}%</Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                      <SignalCellularAltIcon sx={{ fontSize: 16, color: "#2563EB" }} />
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>5G Network</Typography>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Paper>
        </Box>
      )}

      {/* TAB 1: Terminal Management */}
      {tabIndex === 1 && (
        <Paper elevation={0} sx={{ p: "24px", borderRadius: "20px", border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
          <Typography variant="h6" sx={{ fontSize: "18px", fontWeight: 800, color: "#111827", mb: 2 }}>
            Registered mPOS Terminals
          </Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Terminal ID</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Hardware Serial</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Model</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Battery & Network</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="right">Today's Txns</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="right">Today's Volume</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="center">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {MOCK_TERMINALS.map((t) => (
                <TableRow key={t.id}>
                  <TableCell sx={{ fontWeight: 700, color: "#2563EB" }}>{t.id}</TableCell>
                  <TableCell sx={{ fontFamily: "monospace" }}>{t.serialNumber}</TableCell>
                  <TableCell>{t.model}</TableCell>
                  <TableCell>{t.battery}% Battery (5G)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{t.totalTxnsToday}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, fontFamily: "monospace" }}>₹{t.totalVolumeToday.toLocaleString("en-IN")}</TableCell>
                  <TableCell align="center">
                    <Chip label={t.status} size="small" sx={{ backgroundColor: "#DCFCE7", color: "#16A34A", fontWeight: 800 }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* TAB 2: History & Refunds */}
      {tabIndex === 2 && (
        <Paper elevation={0} sx={{ p: "24px", borderRadius: "20px", border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
          <Typography variant="h6" sx={{ fontSize: "18px", fontWeight: 800, color: "#111827", mb: 2 }}>
            mPOS Swipe Transaction Log
          </Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Txn ID</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Terminal</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Card Details</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="right">Amount</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="right">Commission</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="center">Status</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Bank RRN</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Time</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {MOCK_POS_TXNS.map((txn) => (
                <TableRow key={txn.id}>
                  <TableCell sx={{ fontWeight: 800, color: "#2563EB", fontFamily: "monospace" }}>{txn.id}</TableCell>
                  <TableCell sx={{ fontFamily: "monospace", fontSize: "12px" }}>{txn.terminalId}</TableCell>
                  <TableCell>Card ending **{txn.cardLast4} ({txn.cardType})</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, fontFamily: "monospace" }}>₹{txn.amount.toLocaleString("en-IN")}</TableCell>
                  <TableCell align="right" sx={{ color: "#16A34A", fontWeight: 700 }}>+₹{txn.commission.toFixed(2)}</TableCell>
                  <TableCell align="center"><M3StatusChip status={txn.status} /></TableCell>
                  <TableCell sx={{ fontFamily: "monospace", fontSize: "12px" }}>{txn.rrn}</TableCell>
                  <TableCell>{txn.time}</TableCell>
                  <TableCell align="center">
                    {txn.status === "SUCCESS" && (
                      <Button
                        size="small"
                        color="error"
                        startIcon={<ReplayIcon sx={{ fontSize: 14 }} />}
                        onClick={() => setRefundDialog(txn)}
                        sx={{ fontSize: "11px", fontWeight: 700 }}
                      >
                        Refund
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Success Dialog */}
      {txnSuccess && (
        <Dialog open onClose={() => setTxnSuccess(null)} slotProps={{ paper: { sx: { borderRadius: "20px", width: 400 } } }}>
          <DialogTitle sx={{ fontWeight: 800, textAlign: "center" }}>Swipe Transaction Successful! 🎉</DialogTitle>
          <DialogContent sx={{ textAlign: "center" }}>
            <Typography variant="h3" sx={{ fontWeight: 800, color: "#16A34A", fontFamily: "monospace", my: 1 }}>
              ₹{txnSuccess.amount.toLocaleString("en-IN")}
            </Typography>
            <Typography variant="body2" sx={{ color: "#4B5563" }}>
              Amount instantly credited to main wallet balance.
            </Typography>
            <Box sx={{ p: 2, borderRadius: 3, backgroundColor: "#F8FAFC", mt: 2, textAlign: "left" }}>
              <Typography variant="caption" sx={{ display: "block" }}>Txn ID: <strong>{txnSuccess.id}</strong></Typography>
              <Typography variant="caption" sx={{ display: "block" }}>Bank RRN: <strong>{txnSuccess.rrn}</strong></Typography>
              <Typography variant="caption" sx={{ display: "block" }}>Commission Earned: <strong>+₹{txnSuccess.commission.toFixed(2)}</strong></Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button fullWidth variant="contained" onClick={() => setTxnSuccess(null)} sx={{ borderRadius: "12px", fontWeight: 700 }}>
              Done
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Refund Dialog */}
      {refundDialog && (
        <Dialog open onClose={() => setRefundDialog(null)} slotProps={{ paper: { sx: { borderRadius: "20px", width: 400 } } }}>
          <DialogTitle sx={{ fontWeight: 800 }}>Confirm Refund Request</DialogTitle>
          <DialogContent>
            <Typography variant="body2">
              Are you sure you want to initiate a full refund of <strong>₹{refundDialog.amount}</strong> for transaction <strong>{refundDialog.id}</strong>?
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setRefundDialog(null)}>Cancel</Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => {
                alert(`Refund of ₹${refundDialog.amount} processed successfully.`);
                setRefundDialog(null);
              }}
            >
              Confirm Refund
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
