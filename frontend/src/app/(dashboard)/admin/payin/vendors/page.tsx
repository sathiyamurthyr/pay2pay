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

export default function AdminPayinVendorsPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get("/api/v1/admin/payin/vendors");
      if (res.data && res.data.success) {
        setVendors(res.data.vendors || []);
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load vendors.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Button component={Link} href="/admin/payin/dashboard" startIcon={<ArrowBackIcon />}>
            Dashboard
          </Button>
          <Typography variant="h5" fontWeight="700">
            Payment Vendors Master
          </Typography>
        </Stack>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchVendors}>
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
                <TableCell><strong>Ref ID</strong></TableCell>
                <TableCell><strong>Vendor Code</strong></TableCell>
                <TableCell><strong>Vendor Name</strong></TableCell>
                <TableCell><strong>Provider Name</strong></TableCell>
                <TableCell><strong>Type</strong></TableCell>
                <TableCell><strong>API Base URL</strong></TableCell>
                <TableCell><strong>Timeout</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vendors.map((v) => (
                <TableRow key={v.payin_vendor_ref_id} hover>
                  <TableCell><Chip label={`#${v.payin_vendor_ref_id}`} size="small" /></TableCell>
                  <TableCell><strong>{v.vendor_code}</strong></TableCell>
                  <TableCell>{v.vendor_name}</TableCell>
                  <TableCell>{v.provider_name}</TableCell>
                  <TableCell>{v.provider_type}</TableCell>
                  <TableCell><code>{v.api_base_url}</code></TableCell>
                  <TableCell>{v.timeout_sec}s</TableCell>
                  <TableCell>
                    <Chip label={v.vendor_status} color={v.vendor_status === "ACTIVE" ? "success" : "default"} size="small" />
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
