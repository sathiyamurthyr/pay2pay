"use client";

import React, { useState, useEffect } from "react";
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableHead,
  TableRow, Button, Alert, CircularProgress, Chip
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Link from "next/link";
import apiClient from "@/lib/api";

export default function AdminPayinAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Button component={Link} href="/admin/payin/dashboard" startIcon={<ArrowBackIcon />}>
            Dashboard
          </Button>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            PayIn Configuration Audit Trail
          </Typography>
        </Box>
      </Box>

      <Paper variant="outlined" sx={{ p: 4, borderRadius: 2, textAlign: "center", color: "text.secondary" }}>
        <Typography variant="body1">
          Immutable audit logging is active for all PayIn configurations and administrative actions.
        </Typography>
        <Typography variant="caption" sx={{ display: "block", mt: 1 }}>
          Logged to database table: <code>public.payin_audit_logs</code>
        </Typography>
      </Paper>
    </Box>
  );
}
