"use client";

import React, { useState, useEffect } from "react";
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

const getActiveRetailerId = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("p2p_active_retailer_id") || localStorage.getItem("pay2pay_reg_id") || "";
  }
  return "";
};

export default function PosPage() {
  const [tabIndex, setTabIndex] = useState(0);
  const [amount, setAmount] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [terminals, setTerminals] = useState<PosTerminal[]>([]);
  const [posTxns, setPosTxns] = useState<PosTxn[]>([]);
  const [selectedTerminal, setSelectedTerminal] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [txnSuccess, setTxnSuccess] = useState<PosTxn | null>(null);
  const [refundDialog, setRefundDialog] = useState<PosTxn | null>(null);

  useEffect(() => {
    const fetchPosData = async () => {
      try {
        let userRefId: any = null;
        let userTypeRefId: any = 2;
        if (typeof window !== "undefined") {
          try {
            const userStr =
              localStorage.getItem("user_info") ||
              localStorage.getItem("user") ||
              localStorage.getItem("auth_user") ||
              localStorage.getItem("pay2pay_user_data");
            if (userStr) {
              const u = JSON.parse(userStr);
              userRefId = u.user_ref_id || u.retailer_ref_id || u.ref_id || null;
              userTypeRefId = u.user_type_ref_id || 2;
            }
          } catch {}
        }
        const qParams = new URLSearchParams();
        qParams.set("user_type_ref_id", String(userTypeRefId || 2));
        if (userRefId) qParams.set("user_ref_id", String(userRefId));

        const res = await fetch(`/api/v1/payout/reports/swipe-settlement/list?${qParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          const items = data.items || [];
          const mapped: PosTxn[] = items.map((it: any) => ({
            id: it.settlement_id || `POS-${it.id}`,
            terminalId: it.terminal_id || "POS-TERM-01",
            cardLast4: it.card_last_4 || "0000",
            cardType: it.card_type || "Debit Card",
            amount: Number(it.gross_amount || 0),
            commission: Number(it.mdr_charge || 0),
            status: it.status === "COMPLETED" ? "SUCCESS" : (it.status === "FAILED" ? "FAILED" : "REFUNDED"),
            rrn: it.rrn_number || "—",
            time: it.settlement_date || "—",
          }));
          setPosTxns(mapped);
        }
      } catch {
        setPosTxns([]);
      }
    };
    fetchPosData();
  }, []);

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
          label={`${terminals.length} Terminals Active`}
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
                  {terminals.length === 0 ? (
                    <option value="">No Active Terminals Paired</option>
                  ) : (
                    terminals.map((t) => (
                      <option key={t.id} value={t.serialNumber}>
                        {t.model} ({t.serialNumber}) — Battery: {t.battery}%
                      </option>
                    ))
                  )}
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
                  disabled={isProcessing || terminals.length === 0}
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

            {terminals.length === 0 ? (
              <Box sx={{ p: 4, textAlign: "center", color: "#64748B" }}>
                <PointOfSaleIcon sx={{ fontSize: 40, mb: 1, color: "#94A3B8" }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  No POS hardware assigned to this outlet.
                </Typography>
                <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                  Contact support/distributor to pair your Android POS machine.
                </Typography>
              </Box>
            ) : (
              terminals.map((t) => (
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
              ))
            )}
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
              {terminals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: "#64748B" }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      No registered POS terminals found for this outlet.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                terminals.map((t) => (
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
                ))
              )}
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
              {posTxns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6, color: "#64748B" }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      No POS swipe transactions recorded yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                posTxns.map((txn) => (
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
                ))
              )}
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
