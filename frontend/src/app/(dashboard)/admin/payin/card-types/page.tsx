"use client";

import React, { useState, useEffect } from "react";
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableHead,
  TableRow, Switch, Button, Alert, CircularProgress, Chip
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Link from "next/link";
import apiClient from "@/lib/api";

export default function AdminPayinCardTypesPage() {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCards = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get("/api/v1/admin/payin/card-types");
      if (res.data && res.data.success) {
        setCards(res.data.card_types || []);
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load card types.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleToggle = async (cardRefId: number, currentVal: boolean) => {
    try {
      const res = await apiClient.post(`/api/v1/admin/payin/card-types/${cardRefId}/toggle`, {
        is_enabled: !currentVal
      });
      if (res.data && res.data.success) {
        setCards((prev) =>
          prev.map((c) => (c.payin_card_type_ref_id === cardRefId ? { ...c, is_enabled: !currentVal } : c))
        );
      }
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Failed to toggle card status");
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
            Card Types & Networks Catalog
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchCards}>
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
                <TableCell><strong>Card Code</strong></TableCell>
                <TableCell><strong>Card Name</strong></TableCell>
                <TableCell><strong>Network</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell align="center"><strong>Enabled</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cards.map((c) => (
                <TableRow key={c.payin_card_type_ref_id} hover>
                  <TableCell><Chip label={`#${c.payin_card_type_ref_id}`} size="small" /></TableCell>
                  <TableCell><strong>{c.card_type_code}</strong></TableCell>
                  <TableCell>{c.card_type_name}</TableCell>
                  <TableCell><Chip label={c.card_network} size="small" color="primary" variant="outlined" /></TableCell>
                  <TableCell>
                    <Chip label={c.is_enabled ? "ACTIVE" : "DISABLED"} color={c.is_enabled ? "success" : "default"} size="small" />
                  </TableCell>
                  <TableCell align="center">
                    <Switch
                      checked={c.is_enabled}
                      onChange={() => handleToggle(c.payin_card_type_ref_id, c.is_enabled)}
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
