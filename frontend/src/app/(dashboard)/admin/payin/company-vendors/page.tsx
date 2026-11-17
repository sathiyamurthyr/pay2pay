"use client";

import React, { useState, useEffect } from "react";
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableHead,
  TableRow, Button, Stack, Alert, CircularProgress, Chip
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Link from "next/link";
import { apiClient } from "@/lib/api";

export default function AdminPayinCompanyVendorsPage() {
  const [mappings, setMappings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMappings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get("/api/v1/admin/payin/company-vendors");
      if (res.data && res.data.success) {
        setMappings(res.data.mappings || []);
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load company-vendor mappings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMappings();
  }, []);

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Button component={Link} href="/admin/payin/dashboard" startIcon={<ArrowBackIcon />}>
            Dashboard
          </Button>
          <Typography variant="h5" fontWeight="700">
            Company-Vendor Routing Assignments
          </Typography>
        </Stack>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchMappings}>
          Refresh
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: "center" }}><CircularProgress /></Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: "grey.50" }}>
              <TableRow>
                <TableCell><strong>Mapping Ref ID</strong></TableCell>
                <TableCell><strong>Company</strong></TableCell>
                <TableCell><strong>Assigned Vendor</strong></TableCell>
                <TableCell><strong>Merchant ID</strong></TableCell>
                <TableCell><strong>Priority</strong></TableCell>
                <TableCell><strong>Default</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mappings.map((m) => (
                <TableRow key={m.payin_company_vendor_ref_id} hover>
                  <TableCell><Chip label={`#${m.payin_company_vendor_ref_id}`} size="small" /></TableCell>
                  <TableCell><strong>{m.company_name}</strong> (Ref #{m.company_ref_id})</TableCell>
                  <TableCell><strong>{m.vendor_name}</strong> ({m.vendor_code})</TableCell>
                  <TableCell>{m.merchant_id || "—"}</TableCell>
                  <TableCell><Chip label={`Priority ${m.vendor_priority}`} size="small" color="primary" /></TableCell>
                  <TableCell>{m.is_default ? <Chip label="DEFAULT" color="success" size="small" /> : "No"}</TableCell>
                  <TableCell><Chip label={m.is_enabled ? "ENABLED" : "DISABLED"} color={m.is_enabled ? "success" : "default"} size="small" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
}
