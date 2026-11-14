"use client";

import React, { useState, useEffect } from "react";
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableHead,
  TableRow, Button, Stack, Alert, CircularProgress, Chip, TextField,
  MenuItem, InputAdornment, IconButton
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import Link from "next/link";
import { apiClient } from "@/lib/api";

export default function AdminPayinTransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [tidSearch, setTidSearch] = useState<string>("");

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = { limit: 50 };
      if (statusFilter !== "ALL") params.txn_status = statusFilter;
      if (tidSearch.trim()) params.tid = tidSearch.trim();

      const res = await apiClient.get("/api/v1/admin/payin/transactions", { params });
      if (res.data && res.data.success) {
        setTransactions(res.data.transactions || []);
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [statusFilter]);

  const getStatusChip = (st: string) => {
    switch (st) {
      case "SUCCESS": return <Chip label="SUCCESS" color="success" size="small" />;
      case "PENDING": return <Chip label="PENDING" color="warning" size="small" />;
      case "FAILED": return <Chip label="FAILED" color="error" size="small" />;
      default: return <Chip label={st} size="small" />;
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Button component={Link} href="/admin/payin/dashboard" startIcon={<ArrowBackIcon />}>
            Dashboard
          </Button>
          <Typography variant="h5" fontWeight="700">
            PayIn Master Transactions Journal
          </Typography>
        </Stack>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchTransactions}>
          Refresh Journal
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Filter Bar */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
          <TextField
            size="small"
            placeholder="Search by TID..."
            value={tidSearch}
            onChange={(e) => setTidSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchTransactions()}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
              }
            }}
            sx={{ width: 280 }}
          />

          <TextField
            select
            size="small"
            label="Filter Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ width: 160 }}
          >
            <MenuItem value="ALL">All Statuses</MenuItem>
            <MenuItem value="SUCCESS">SUCCESS</MenuItem>
            <MenuItem value="PENDING">PENDING</MenuItem>
            <MenuItem value="FAILED">FAILED</MenuItem>
          </TextField>

          <Button variant="contained" size="small" onClick={fetchTransactions}>
            Filter
          </Button>
        </Stack>
      </Paper>

      {/* Transactions Table */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: "center" }}><CircularProgress /></Box>
        ) : transactions.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
            No transactions found matching the filter criteria.
          </Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: "grey.50" }}>
              <TableRow>
                <TableCell><strong>TID</strong></TableCell>
                <TableCell><strong>Company</strong></TableCell>
                <TableCell><strong>Customer</strong></TableCell>
                <TableCell><strong>Gross (₹)</strong></TableCell>
                <TableCell><strong>Total Charges</strong></TableCell>
                <TableCell><strong>Wallet Credit</strong></TableCell>
                <TableCell><strong>Method</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Ledger Ref</strong></TableCell>
                <TableCell><strong>Timestamp</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.payin_transactions_ref_id} hover>
                  <TableCell><strong>{t.tid}</strong></TableCell>
                  <TableCell>{t.company_name} (Ref #{t.company_ref_id})</TableCell>
                  <TableCell>{t.cust_name}<br /><Typography variant="caption" color="text.secondary">{t.cust_mobile}</Typography></TableCell>
                  <TableCell>₹{Number(t.txn_amount).toFixed(2)}</TableCell>
                  <TableCell>₹{Number(t.total_charges).toFixed(2)}</TableCell>
                  <TableCell><Typography color="success.main" fontWeight="600">₹{Number(t.retailer_credit).toFixed(2)}</Typography></TableCell>
                  <TableCell>{t.pay_mode_name || "UPI"}</TableCell>
                  <TableCell>{getStatusChip(t.txn_status)}</TableCell>
                  <TableCell>{t.ledger_txn_id || "—"}</TableCell>
                  <TableCell>{t.created_at ? new Date(t.created_at).toLocaleDateString() : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
}
