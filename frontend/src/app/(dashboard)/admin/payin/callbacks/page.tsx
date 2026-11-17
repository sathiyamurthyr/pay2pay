"use client";

import React, { useState, useEffect } from "react";
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableHead,
  TableRow, Button, Stack, Alert, CircularProgress, Chip, TextField,
  InputAdornment
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import WarningIcon from "@mui/icons-material/Warning";
import Link from "next/link";
import { apiClient } from "@/lib/api";

export default function AdminPayinCallbacksPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tidFilter, setTidFilter] = useState<string>("");

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = { limit: 50 };
      if (tidFilter.trim()) params.tid = tidFilter.trim();

      const res = await apiClient.get("/api/v1/admin/payin/callbacks", { params });
      if (res.data && res.data.success) {
        setLogs(res.data.callback_logs || []);
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load callback logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Button component={Link} href="/admin/payin/dashboard" startIcon={<ArrowBackIcon />}>
            Dashboard
          </Button>
          <Typography variant="h5" fontWeight="700">
            Payment Webhook & Callback Logs
          </Typography>
        </Stack>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchLogs}>
          Refresh
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            size="small"
            placeholder="Search by TID..."
            value={tidFilter}
            onChange={(e) => setTidFilter(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
              }
            }}
            sx={{ width: 280 }}
          />
          <Button variant="contained" size="small" onClick={fetchLogs}>
            Search
          </Button>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: "center" }}><CircularProgress /></Box>
        ) : logs.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
            No webhook callbacks recorded yet.
          </Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: "grey.50" }}>
              <TableRow>
                <TableCell><strong>Callback Ref ID</strong></TableCell>
                <TableCell><strong>TID</strong></TableCell>
                <TableCell><strong>Provider Ref</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Signature</strong></TableCell>
                <TableCell><strong>Process Status</strong></TableCell>
                <TableCell><strong>Received At</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.payin_callback_log_ref_id} hover>
                  <TableCell><Chip label={`#${l.payin_callback_log_ref_id}`} size="small" /></TableCell>
                  <TableCell><strong>{l.tid}</strong></TableCell>
                  <TableCell>{l.provider_ref_id || "—"}</TableCell>
                  <TableCell><Chip label={l.callback_status} size="small" /></TableCell>
                  <TableCell>
                    {l.signature_valid ? (
                      <Chip icon={<VerifiedUserIcon />} label="VALID" color="success" size="small" />
                    ) : (
                      <Chip icon={<WarningIcon />} label="UNVERIFIED" color="warning" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={l.process_status}
                      color={l.process_status === "COMPLETED" ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{l.received_at ? new Date(l.received_at).toLocaleTimeString() : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
}
