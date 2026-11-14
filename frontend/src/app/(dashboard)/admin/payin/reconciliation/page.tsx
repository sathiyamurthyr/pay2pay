"use client";

import React, { useState, useEffect } from "react";
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableHead,
  TableRow, Button, Alert, CircularProgress, Chip, Stack
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Link from "next/link";
import apiClient from "@/lib/api";

export default function AdminPayinReconciliationPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecon = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get("/api/v1/admin/payin/transactions", { params: { limit: 50 } });
      if (res.data && res.data.success) {
        setData(res.data.transactions || []);
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load reconciliation transactions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecon();
  }, []);

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Button component={Link} href="/admin/payin/dashboard" startIcon={<ArrowBackIcon />}>
            Dashboard
          </Button>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            PayIn Financial Reconciliation
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchRecon}>
          Refresh Reconciliation
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: "center" }}><CircularProgress /></Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: "grey.50" }}>
              <TableRow>
                <TableCell><strong>TID</strong></TableCell>
                <TableCell><strong>Company</strong></TableCell>
                <TableCell><strong>Vendor</strong></TableCell>
                <TableCell><strong>Provider Ref</strong></TableCell>
                <TableCell><strong>Gross (₹)</strong></TableCell>
                <TableCell><strong>MDR Charges</strong></TableCell>
                <TableCell><strong>Customer Paid</strong></TableCell>
                <TableCell><strong>Wallet Credit</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Reconciled Ledger ID</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.payin_transactions_ref_id} hover>
                  <TableCell><strong>{row.tid}</strong></TableCell>
                  <TableCell>{row.company_name}</TableCell>
                  <TableCell>{row.vendor_name}</TableCell>
                  <TableCell>{row.provider_ref_id || "—"}</TableCell>
                  <TableCell>₹{Number(row.txn_amount).toFixed(2)}</TableCell>
                  <TableCell>₹{Number(row.total_charges).toFixed(2)}</TableCell>
                  <TableCell>₹{Number(row.customer_payable).toFixed(2)}</TableCell>
                  <TableCell><Typography sx={{ color: "success.main", fontWeight: 700 }}>₹{Number(row.retailer_credit).toFixed(2)}</Typography></TableCell>
                  <TableCell>
                    <Chip
                      label={row.txn_status}
                      color={row.txn_status === "SUCCESS" ? "success" : (row.txn_status === "PENDING" ? "warning" : "error")}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {row.ledger_txn_id ? (
                      <Chip label={row.ledger_txn_id} color="success" variant="outlined" size="small" />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
}

