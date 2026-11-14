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

export default function AdminPayinServiceTypesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get("/api/v1/admin/payin/services");
      if (res.data && res.data.success) {
        setServices(res.data.services || []);
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load services.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleToggle = async (svcRefId: number, currentVal: boolean) => {
    try {
      const res = await apiClient.post(`/api/v1/admin/payin/services/${svcRefId}/toggle`, {
        is_enabled: !currentVal
      });
      if (res.data && res.data.success) {
        setServices((prev) =>
          prev.map((s) => (s.payin_service_type_ref_id === svcRefId ? { ...s, is_enabled: !currentVal } : s))
        );
      }
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Failed to toggle service status");
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
            PayIn Service Types Catalog
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchServices}>
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
                <TableCell><strong>Service Code</strong></TableCell>
                <TableCell><strong>Service Name</strong></TableCell>
                <TableCell><strong>Description</strong></TableCell>
                <TableCell><strong>Order</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell align="center"><strong>Enabled</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {services.map((s) => (
                <TableRow key={s.payin_service_type_ref_id} hover>
                  <TableCell><Chip label={`#${s.payin_service_type_ref_id}`} size="small" /></TableCell>
                  <TableCell><strong>{s.svc_code}</strong></TableCell>
                  <TableCell>{s.svc_name}</TableCell>
                  <TableCell>{s.svc_desc}</TableCell>
                  <TableCell>{s.display_order}</TableCell>
                  <TableCell>
                    <Chip label={s.is_enabled ? "ACTIVE" : "DISABLED"} color={s.is_enabled ? "success" : "default"} size="small" />
                  </TableCell>
                  <TableCell align="center">
                    <Switch
                      checked={s.is_enabled}
                      onChange={() => handleToggle(s.payin_service_type_ref_id, s.is_enabled)}
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
