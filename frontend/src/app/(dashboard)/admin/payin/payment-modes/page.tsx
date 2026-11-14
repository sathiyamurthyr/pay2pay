"use client";

import React, { useState, useEffect } from "react";
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableHead,
  TableRow, Switch, Button, Stack, Alert, CircularProgress, Chip
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Link from "next/link";
import apiClient from "@/lib/api";

export default function AdminPayinPaymentModesPage() {
  const [modes, setModes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModes = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get("/api/v1/admin/payin/payment-modes");
      if (res.data && res.data.success) {
        setModes(res.data.payment_modes || []);
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load payment modes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModes();
  }, []);

  const handleToggle = async (modeRefId: number, currentVal: boolean) => {
    try {
      const res = await apiClient.post(`/api/v1/admin/payin/payment-modes/${modeRefId}/toggle`, {
        is_enabled: !currentVal
      });
      if (res.data && res.data.success) {
        setModes((prev) =>
          prev.map((m) => (m.payin_payment_mode_ref_id === modeRefId ? { ...m, is_enabled: !currentVal } : m))
        );
      }
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Failed to toggle mode status");
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Button component={Link} href="/admin/payin/dashboard" startIcon={<ArrowBackIcon />}>
            Dashboard
          </Button>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Payment Modes Catalog
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchModes}>
          Refresh
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
                <TableCell><strong>Ref ID</strong></TableCell>
                <TableCell><strong>Mode Code</strong></TableCell>
                <TableCell><strong>Mode Name</strong></TableCell>
                <TableCell><strong>Description</strong></TableCell>
                <TableCell><strong>Order</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell align="center"><strong>Enabled</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {modes.map((m) => (
                <TableRow key={m.payin_payment_mode_ref_id} hover>
                  <TableCell><Chip label={`#${m.payin_payment_mode_ref_id}`} size="small" /></TableCell>
                  <TableCell><strong>{m.pay_mode_code}</strong></TableCell>
                  <TableCell>{m.pay_mode_name}</TableCell>
                  <TableCell>{m.pay_mode_desc}</TableCell>
                  <TableCell>{m.display_order}</TableCell>
                  <TableCell>
                    <Chip label={m.is_enabled ? "ACTIVE" : "DISABLED"} color={m.is_enabled ? "success" : "default"} size="small" />
                  </TableCell>
                  <TableCell align="center">
                    <Switch
                      checked={m.is_enabled}
                      onChange={() => handleToggle(m.payin_payment_mode_ref_id, m.is_enabled)}
                      color="primary"
                    />
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

