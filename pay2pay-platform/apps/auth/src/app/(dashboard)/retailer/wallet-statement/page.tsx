"use client";

import React, { useState } from "react";
import {
  Box, Paper, Typography, Button, TextField, Chip, Table, TableBody,
  TableCell, TableHead, TableRow, Stack, MenuItem, InputAdornment
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import SearchIcon from "@mui/icons-material/Search";
import { M3StatusChip } from "@/components/ui/m3-components";

interface StatementEntry {
  id: string;
  date: string;
  particulars: string;
  txnType: "DMT" | "AEPS" | "POS" | "BBPS" | "RECHARGE" | "TOPUP" | "SETTLEMENT";
  type: "CREDIT" | "DEBIT";
  openingBalance: number;
  amount: number;
  commission: number;
  closingBalance: number;
  utr: string;
  status: "SUCCESS" | "PENDING" | "FAILED";
}

const MOCK_STATEMENT_ENTRIES: StatementEntry[] = [
  { id: "STMT-90124", date: "2026-08-03 18:24:12", particulars: "DMT IMPS Outflow (Kavitha Sharma)", txnType: "DMT", type: "DEBIT", openingBalance: 53250.75, amount: 5000, commission: 6.50, closingBalance: 48250.75, utr: "UTR202608039012", status: "SUCCESS" },
  { id: "STMT-90123", date: "2026-08-03 18:10:05", particulars: "AEPS Cash Out Inflow (Aadhaar **4412)", txnType: "AEPS", type: "CREDIT", openingBalance: 51250.75, amount: 2000, commission: 5.00, closingBalance: 53250.75, utr: "RRN202608037719", status: "SUCCESS" },
  { id: "STMT-90122", date: "2026-08-03 17:45:00", particulars: "Dynamic UPI QR Wallet Top-up", txnType: "TOPUP", type: "CREDIT", openingBalance: 41250.75, amount: 10000, commission: 0.00, closingBalance: 51250.75, utr: "UPI202608036601", status: "SUCCESS" },
  { id: "STMT-90121", date: "2026-08-03 17:15:33", particulars: "BBPS Bill Pay (TNEB Electricity)", txnType: "BBPS", type: "DEBIT", openingBalance: 42700.75, amount: 1450, commission: 3.50, closingBalance: 41250.75, utr: "BBPS202608034412", status: "SUCCESS" },
  { id: "STMT-90120", date: "2026-08-03 16:50:20", particulars: "Mobile Recharge (Airtel Prepaid)", txnType: "RECHARGE", type: "DEBIT", openingBalance: 42999.75, amount: 299, commission: 7.45, closingBalance: 42700.75, utr: "OP8839201", status: "SUCCESS" },
  { id: "STMT-90119", date: "2026-08-03 15:30:10", particulars: "Move To Bank Instant Settlement", txnType: "SETTLEMENT", type: "DEBIT", openingBalance: 67999.75, amount: 25000, commission: 0.00, closingBalance: 42999.75, utr: "SETTL2026080301", status: "SUCCESS" },
];

export default function WalletStatementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [startDate, setStartDate] = useState("2026-08-01");
  const [endDate, setEndDate] = useState("2026-08-03");

  const filteredEntries = MOCK_STATEMENT_ENTRIES.filter((entry) => {
    const matchesSearch =
      entry.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.particulars.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.utr.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "ALL" || entry.type === filterType;
    return matchesSearch && matchesType;
  });

  const totalInflow = filteredEntries.filter((e) => e.type === "CREDIT").reduce((acc, e) => acc + e.amount, 0);
  const totalOutflow = filteredEntries.filter((e) => e.type === "DEBIT").reduce((acc, e) => acc + e.amount, 0);
  const totalCommission = filteredEntries.reduce((acc, e) => acc + e.commission, 0);

  const handleExportCSV = () => {
    alert("Exporting official wallet passbook statement to CSV format...");
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "20px", pb: 4 }}>
      {/* Summary KPI Cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2 }}>
        <Paper elevation={0} sx={{ p: "20px", borderRadius: "16px", border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
          <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 700, textTransform: "uppercase" }}>
            Total Credit Inflow
          </Typography>
          <Typography variant="h4" sx={{ color: "#16A34A", fontWeight: 800, fontFamily: "monospace", mt: 0.5, fontSize: "26px" }}>
            +₹{totalInflow.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </Typography>
        </Paper>
        <Paper elevation={0} sx={{ p: "20px", borderRadius: "16px", border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
          <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 700, textTransform: "uppercase" }}>
            Total Debit Outflow
          </Typography>
          <Typography variant="h4" sx={{ color: "#DC2626", fontWeight: 800, fontFamily: "monospace", mt: 0.5, fontSize: "26px" }}>
            -₹{totalOutflow.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </Typography>
        </Paper>
        <Paper elevation={0} sx={{ p: "20px", borderRadius: "16px", border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
          <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 700, textTransform: "uppercase" }}>
            Net Commission Earned
          </Typography>
          <Typography variant="h4" sx={{ color: "#2563EB", fontWeight: 800, fontFamily: "monospace", mt: 0.5, fontSize: "26px" }}>
            +₹{totalCommission.toFixed(2)}
          </Typography>
        </Paper>
      </Box>

      {/* Filter Bar */}
      <Paper elevation={0} sx={{ p: "16px 20px", borderRadius: "16px", border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: "center" }}>
          <TextField
            placeholder="Search Txn ID, Particulars, UTR…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#9CA3AF", fontSize: 20 }} />
                  </InputAdornment>
                ),
              },
            }}
          />

          <TextField
            select
            label="Type"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            size="small"
            sx={{ width: 150 }}
          >
            <MenuItem value="ALL">All Types</MenuItem>
            <MenuItem value="CREDIT">Credits Only</MenuItem>
            <MenuItem value="DEBIT">Debits Only</MenuItem>
          </TextField>

          <TextField
            type="date"
            label="From Date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 160 }}
          />

          <TextField
            type="date"
            label="To Date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 160 }}
          />

          <Button
            variant="contained"
            size="small"
            startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
            onClick={handleExportCSV}
            sx={{ borderRadius: "10px", fontWeight: 700, height: 40, px: 2, backgroundColor: "#2563EB", whiteSpace: "nowrap" }}
          >
            Export Statement
          </Button>
        </Stack>
      </Paper>

      {/* Passbook Statement Table */}
      <Paper elevation={0} sx={{ borderRadius: "20px", border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF", overflow: "hidden" }}>
        <Table>
          <TableHead sx={{ backgroundColor: "#F8FAFC" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>Date & Time</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Txn ID / UTR</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Particulars</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">Opening Bal</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">Amount</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">Commission</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">Closing Bal</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="center">Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEntries.map((entry) => (
              <TableRow key={entry.id} hover>
                <TableCell sx={{ fontSize: "12px", color: "#4B5563" }}>{entry.date}</TableCell>
                <TableCell>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: "#2563EB", fontFamily: "monospace", display: "block" }}>
                    {entry.id}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#6B7280", fontFamily: "monospace", fontSize: "11px" }}>
                    {entry.utr}
                  </Typography>
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: "#111827" }}>{entry.particulars}</TableCell>
                <TableCell align="right" sx={{ fontFamily: "monospace", color: "#6B7280" }}>
                  ₹{entry.openingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, fontFamily: "monospace", color: entry.type === "CREDIT" ? "#16A34A" : "#DC2626" }}>
                  {entry.type === "CREDIT" ? "+" : "-"}₹{entry.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: "#16A34A" }}>
                  +₹{entry.commission.toFixed(2)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, fontFamily: "monospace", color: "#111827" }}>
                  ₹{entry.closingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell align="center">
                  <M3StatusChip status={entry.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
