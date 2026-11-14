"use client";

import React, { useState, useEffect } from "react";
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableHead,
  TableRow, Switch, Button, Stack, Alert, CircularProgress, Chip
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Link from "next/link";
import { apiClient } from "@/lib/api";

export default function AdminPayinCompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get("/api/v1/admin/payin/companies");
      if (res.data && res.data.success) {
        setCompanies(res.data.companies || []);
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load company configurations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleToggle = async (companyRefId: number, currentVal: boolean) => {
    try {
      const res = await apiClient.post(`/api/v1/admin/payin/companies/${companyRefId}/toggle`, {
        is_enabled: !currentVal
      });
      if (res.data && res.data.success) {
        setCompanies((prev) =>
          prev.map((c) =>
            c.company_ref_id === companyRefId ? { ...c, payin_enabled: !currentVal } : c
          )
        );
      }
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Failed to toggle status");
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
            Company PayIn Configurations
          </Typography>
        </Stack>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchCompanies}>
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
                <TableCell><strong>Company Ref ID</strong></TableCell>
                <TableCell><strong>Company Name</strong></TableCell>
                <TableCell><strong>Code</strong></TableCell>
                <TableCell><strong>Min / Max (₹)</strong></TableCell>
                <TableCell><strong>Daily Limit (₹)</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell align="center"><strong>PayIn Enabled</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {companies.map((c) => (
                <TableRow key={c.payin_company_cfg_ref_id} hover>
                  <TableCell>
                    <Chip label={`Ref #${c.company_ref_id}`} size="small" />
                  </TableCell>
                  <TableCell><strong>{c.company_name}</strong></TableCell>
                  <TableCell>{c.company_code}</TableCell>
                  <TableCell>₹{Number(c.min_amount).toLocaleString()} - ₹{Number(c.max_amount).toLocaleString()}</TableCell>
                  <TableCell>₹{Number(c.daily_amt_limit).toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip
                      label={c.payin_enabled ? "ACTIVE" : "DISABLED"}
                      color={c.payin_enabled ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Switch
                      checked={c.payin_enabled}
                      onChange={() => handleToggle(c.company_ref_id, c.payin_enabled)}
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
