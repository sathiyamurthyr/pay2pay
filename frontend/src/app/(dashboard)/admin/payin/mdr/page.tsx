"use client";

import React, { useState, useEffect } from "react";
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableHead,
  TableRow, Button, Stack, Alert, CircularProgress, Chip, TextField,
  MenuItem, Grid, Divider
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Link from "next/link";
import { apiClient } from "@/lib/api";

export default function AdminPayinMdrPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Simulator State
  const [simAmount, setSimAmount] = useState<string>("10000");
  const [simResult, setSimResult] = useState<any | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  const fetchRules = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get("/api/v1/admin/payin/mdr");
      if (res.data && res.data.success) {
        setRules(res.data.rules || []);
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load MDR rules.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const runSimulation = async () => {
    try {
      setSimLoading(true);
      const res = await apiClient.post("/api/v1/payin/mdr/preview", {
        amount: parseFloat(simAmount) || 10000,
        service_type_code: "UTILITY",
        payment_mode_code: "UPI"
      });
      if (res.data && res.data.success) {
        setSimResult(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSimLoading(false);
    }
  };

  const getTreatmentColor = (treatment: string) => {
    switch (treatment) {
      case "DEDUCT_FROM_TOPUP": return "primary";
      case "COLLECT_ADDITIONALLY": return "warning";
      case "COMPANY_PAYS_MDR": return "success";
      default: return "default";
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
            Dynamic MDR Configuration Matrix
          </Typography>
        </Stack>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchRules}>
          Refresh Rules
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Simulator Box */}
      <Paper variant="outlined" sx={{ p: 3, mb: 4, borderRadius: 2, bgcolor: "grey.50" }}>
        <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 1.5 }}>
          MDR Calculation Simulator
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
          <TextField
            size="small"
            type="number"
            label="Simulate Amount (₹)"
            value={simAmount}
            onChange={(e) => setSimAmount(e.target.value)}
            sx={{ width: 220 }}
          />
          <Button variant="contained" onClick={runSimulation} disabled={simLoading}>
            Run Calculation Preview
          </Button>
        </Stack>

        {simResult && (
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Typography variant="caption" color="text.secondary">MDR Rate</Typography>
              <Typography variant="body1" fontWeight="600">{(simResult.mdr_pct * 100).toFixed(2)}% + ₹{simResult.mdr_fixed}</Typography>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Typography variant="caption" color="text.secondary">Total Charges (MDR + GST)</Typography>
              <Typography variant="body1" fontWeight="600">₹{simResult.total_charges.toFixed(2)}</Typography>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Typography variant="caption" color="text.secondary">Customer Payable</Typography>
              <Typography variant="body1" fontWeight="700" color="primary.main">₹{simResult.customer_payable.toFixed(2)}</Typography>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Typography variant="caption" color="text.secondary">Retailer Credit</Typography>
              <Typography variant="body1" fontWeight="700" color="success.main">₹{simResult.retailer_credit.toFixed(2)}</Typography>
            </Grid>
          </Grid>
        )}
      </Paper>

      {/* MDR Rules Matrix Table */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: "center" }}><CircularProgress /></Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: "grey.50" }}>
              <TableRow>
                <TableCell><strong>Priority</strong></TableCell>
                <TableCell><strong>Company</strong></TableCell>
                <TableCell><strong>Vendor</strong></TableCell>
                <TableCell><strong>Service</strong></TableCell>
                <TableCell><strong>Mode / Card</strong></TableCell>
                <TableCell><strong>MDR %</strong></TableCell>
                <TableCell><strong>Fixed</strong></TableCell>
                <TableCell><strong>GST %</strong></TableCell>
                <TableCell><strong>Treatment</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rules.map((r) => (
                <TableRow key={r.payin_mdr_cfg_ref_id} hover>
                  <TableCell>
                    <Chip label={`P${r.priority}`} size="small" color={r.priority > 100 ? "primary" : "default"} />
                  </TableCell>
                  <TableCell><strong>{r.company_name}</strong> (Ref #{r.company_ref_id})</TableCell>
                  <TableCell>{r.vendor_name}</TableCell>
                  <TableCell>{r.svc_name || "ALL SERVICES"}</TableCell>
                  <TableCell>{r.pay_mode_name || r.card_type_name || "ALL MODES"}</TableCell>
                  <TableCell>{(Number(r.mdr_pct) * 100).toFixed(2)}%</TableCell>
                  <TableCell>₹{Number(r.mdr_fixed).toFixed(2)}</TableCell>
                  <TableCell>{(Number(r.tax_pct) * 100).toFixed(0)}%</TableCell>
                  <TableCell>
                    <Chip label={r.mdr_treatment} color={getTreatmentColor(r.mdr_treatment) as any} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip label={r.is_enabled ? "ACTIVE" : "DISABLED"} color={r.is_enabled ? "success" : "default"} size="small" />
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
