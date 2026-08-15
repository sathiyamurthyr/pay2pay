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

const getActiveRetailerId = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("p2p_active_retailer_id") || localStorage.getItem("pay2pay_reg_id") || "";
  }
  return "";
};

export default function RetailerSettlementReportPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettlements = async () => {
    setLoading(true);
    setError(null);
    try {
      const activeId = getActiveRetailerId();
      const q = activeId ? `?retailer_id=${activeId}` : "";
      const res = await fetch(`${getApiBaseUrl()}/reports/swipe-settlement/list${q}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRows(data.items || []);
    } catch (e: any) {
      console.warn("Settlement report fetch error:", e);
      setError("Unable to load settlement records from server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
  }, []);

  return (
    <Box sx={{ p: 3, color: "#F8FAFC" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          Settlement Report
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchSettlements}
          disabled={loading}
          sx={{ borderColor: "rgba(255, 255, 255, 0.2)", color: "#94A3B8" }}
        >
          Refresh
        </Button>
      </Box>

      {error ? (
        <Paper sx={{ p: 4, textAlign: "center", bgcolor: "rgba(239, 68, 68, 0.1)", border: "1px solid #EF4444" }}>
          <Typography sx={{ color: "#EF4444", fontWeight: 700, mb: 1.5 }}>{error}</Typography>
          <Button variant="contained" color="error" onClick={fetchSettlements}>
            Retry
          </Button>
        </Paper>
      ) : (
        <Paper sx={{ p: 2, borderRadius: "12px", bgcolor: "rgba(18, 27, 48, 0.85)", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: "rgba(255, 255, 255, 0.05)" }}>
                <TableRow>
                  <TableCell sx={{ color: "#94A3B8", fontWeight: 700 }}>Settlement ID</TableCell>
                  <TableCell sx={{ color: "#94A3B8", fontWeight: 700 }}>Machine ID</TableCell>
                  <TableCell sx={{ color: "#94A3B8", fontWeight: 700 }}>Gross Amount</TableCell>
                  <TableCell sx={{ color: "#94A3B8", fontWeight: 700 }}>MDR Fee</TableCell>
                  <TableCell sx={{ color: "#94A3B8", fontWeight: 700 }}>Net Amount</TableCell>
                  <TableCell sx={{ color: "#94A3B8", fontWeight: 700 }}>Bank Reference / UTR</TableCell>
                  <TableCell sx={{ color: "#94A3B8", fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ color: "#94A3B8", fontWeight: 700 }}>Settlement Date</TableCell>
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
                      No settlement records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row: any) => (
                    <TableRow key={row.settlement_id || row.id}>
                      <TableCell sx={{ color: "#60A5FA" }}>{row.settlement_number || row.settlement_id}</TableCell>
                      <TableCell sx={{ color: "#F8FAFC" }}>{row.machine_serial_number || "--"}</TableCell>
                      <TableCell sx={{ color: "#F8FAFC" }}>₹{Number(row.gross_amount || 0).toLocaleString("en-IN")}</TableCell>
                      <TableCell sx={{ color: "#94A3B8" }}>₹{Number(row.mdr_charge || 0).toFixed(2)}</TableCell>
                      <TableCell sx={{ color: "#4ADE80", fontWeight: 700 }}>₹{Number(row.net_settlement_amount || 0).toLocaleString("en-IN")}</TableCell>
                      <TableCell sx={{ color: "#94A3B8" }}>{row.bank_reference || "--"}</TableCell>
                      <TableCell>
                        <Chip
                          label={row.status || "SETTLED"}
                          color={row.status === "SETTLED" ? "success" : "warning"}
                          size="small"
                          sx={{ fontWeight: 800, fontSize: "11px" }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: "#94A3B8" }}>{row.settlement_date || "--"}</TableCell>
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
