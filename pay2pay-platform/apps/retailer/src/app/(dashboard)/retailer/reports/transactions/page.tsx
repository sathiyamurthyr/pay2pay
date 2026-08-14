"use client";

import React, { useState, useEffect } from "react";
import { getApiBaseUrl } from "@/lib/api-config";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  CircularProgress
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";

const DEFAULT_RETAILER_ID = "f89239b5-4dbb-41a9-9ba7-0f97580c9368";
const DEFAULT_TENANT_ID = "93538c98-0b19-493c-a247-4cdb02a46c68";

export default function RetailerTransactionsReportPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/reports/list?retailer_id=${DEFAULT_RETAILER_ID}&tenant_id=${DEFAULT_TENANT_ID}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRows(data.items || []);
    } catch (e: any) {
      console.warn("Transactions report fetch error:", e);
      setError("Unable to load transaction records from server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  return (
    <Box sx={{ p: 3, color: "#F8FAFC" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          Transactions Report
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchTransactions}
          disabled={loading}
          sx={{ borderColor: "rgba(255, 255, 255, 0.2)", color: "#94A3B8" }}
        >
          Refresh
        </Button>
      </Box>

      {error ? (
        <Paper sx={{ p: 4, textAlign: "center", bgcolor: "rgba(239, 68, 68, 0.1)", border: "1px solid #EF4444" }}>
          <Typography sx={{ color: "#EF4444", fontWeight: 700, mb: 1.5 }}>{error}</Typography>
          <Button variant="contained" color="error" onClick={fetchTransactions}>
            Retry
          </Button>
        </Paper>
      ) : (
        <Paper sx={{ p: 2, borderRadius: "12px", bgcolor: "rgba(18, 27, 48, 0.85)", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: "rgba(255, 255, 255, 0.05)" }}>
                <TableRow>
                  <TableCell sx={{ color: "#94A3B8", fontWeight: 700 }}>Transaction ID</TableCell>
                  <TableCell sx={{ color: "#94A3B8", fontWeight: 700 }}>Date & Time</TableCell>
                  <TableCell sx={{ color: "#94A3B8", fontWeight: 700 }}>Service / Mode</TableCell>
                  <TableCell sx={{ color: "#94A3B8", fontWeight: 700 }}>Customer</TableCell>
                  <TableCell sx={{ color: "#94A3B8", fontWeight: 700 }}>Amount</TableCell>
                  <TableCell sx={{ color: "#94A3B8", fontWeight: 700 }}>Commission</TableCell>
                  <TableCell sx={{ color: "#94A3B8", fontWeight: 700 }}>GST</TableCell>
                  <TableCell sx={{ color: "#94A3B8", fontWeight: 700 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={28} />
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4, color: "#64748B" }}>
                      No transaction records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row: any) => (
                    <TableRow key={row.transaction_id || row.id}>
                      <TableCell sx={{ color: "#F8FAFC" }}>{row.transaction_number || row.transaction_id}</TableCell>
                      <TableCell sx={{ color: "#94A3B8" }}>{row.initiated_at || "--"}</TableCell>
                      <TableCell sx={{ color: "#60A5FA" }}>{row.payment_mode || "DMT"}</TableCell>
                      <TableCell sx={{ color: "#F8FAFC" }}>{row.customer_name || "--"}</TableCell>
                      <TableCell sx={{ color: "#F8FAFC", fontWeight: 700 }}>₹{Number(row.transfer_amount || 0).toLocaleString("en-IN")}</TableCell>
                      <TableCell sx={{ color: "#4ADE80" }}>₹{Number(row.retailer_commission || 0).toFixed(2)}</TableCell>
                      <TableCell sx={{ color: "#94A3B8" }}>₹{Number(row.gst_amount || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Chip
                          label={row.status || "SUCCESS"}
                          color={row.status === "SUCCESS" ? "success" : row.status === "FAILED" ? "error" : "warning"}
                          size="small"
                          sx={{ fontWeight: 800, fontSize: "11px" }}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
}
