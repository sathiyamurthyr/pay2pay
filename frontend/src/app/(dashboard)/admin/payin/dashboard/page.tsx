"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Box, Paper, Typography, Button, Chip, Card, CardContent,
  CircularProgress, Alert, IconButton
} from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import LayersIcon from "@mui/icons-material/Layers";
import SettingsIcon from "@mui/icons-material/Settings";

import apiClient from "@/lib/api";

export default function AdminPayinDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>({
    total_transactions: 0,
    total_volume: 0,
    total_mdr_collected: 0,
    company_mdr_liability: 0,
    successful_transactions: 0,
    pending_transactions: 0,
    failed_transactions: 0
  });

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get("/api/v1/admin/payin/dashboard");
      if (res.data && res.data.success) {
        setMetrics(res.data.metrics);
      }
    } catch (e: any) {
      console.error("Failed to load dashboard metrics", e);
      setError(e?.response?.data?.detail || "Failed to load dashboard metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Top Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            PayIn Management Dashboard
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Multi-Vendor Payment Processing, Dynamic MDR & Realtime Transactions
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchMetrics}
          disabled={loading}
        >
          Refresh Data
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* KPI Cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr 1fr" }, gap: 3, mb: 4 }}>
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                TOTAL VOLUME (SUCCESS)
              </Typography>
              <TrendingUpIcon color="primary" />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "primary.main" }}>
              ₹{metrics.total_volume.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {metrics.successful_transactions} Successful Transactions
            </Typography>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                TOTAL MDR COLLECTED
              </Typography>
              <AccountBalanceWalletIcon color="success" />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "success.main" }}>
              ₹{metrics.total_mdr_collected.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Net Service Fee + 18% GST
            </Typography>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                COMPANY MDR LIABILITY
              </Typography>
              <WarningIcon color="warning" />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "warning.main" }}>
              ₹{metrics.company_mdr_liability.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Borne under COMPANY_PAYS_MDR
            </Typography>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                TRANSACTION COUNTS
              </Typography>
              <CheckCircleIcon color="info" />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {metrics.total_transactions} Total
            </Typography>
            <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
              <Chip label={`${metrics.successful_transactions} OK`} size="small" color="success" />
              <Chip label={`${metrics.pending_transactions} Pend`} size="small" color="warning" />
              <Chip label={`${metrics.failed_transactions} Fail`} size="small" color="error" />
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Quick Navigation Cards */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Management Subsystems
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" }, gap: 3 }}>
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2 }}>
            <SettingsIcon color="primary" />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Company Configuration
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Enable/disable PayIn, set min/max amounts and daily limits
              </Typography>
            </Box>
          </Box>
          <Button
            component={Link}
            href="/admin/payin/companies"
            variant="outlined"
            size="small"
            endIcon={<ArrowForwardIcon />}
            fullWidth
          >
            Configure Companies
          </Button>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2 }}>
            <LayersIcon color="success" />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Dynamic MDR Matrix
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Configure multi-tier rates, treatments, and overrides
              </Typography>
            </Box>
          </Box>
          <Button
            component={Link}
            href="/admin/payin/mdr"
            variant="outlined"
            size="small"
            endIcon={<ArrowForwardIcon />}
            fullWidth
          >
            Manage MDR Rules
          </Button>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2 }}>
            <TrendingUpIcon color="info" />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                PayIn Transactions
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Inspect transactions, provider responses, and wallet ledger IDs
              </Typography>
            </Box>
          </Box>
          <Button
            component={Link}
            href="/admin/payin/transactions"
            variant="outlined"
            size="small"
            endIcon={<ArrowForwardIcon />}
            fullWidth
          >
            View Transactions
          </Button>
        </Paper>
      </Box>
    </Box>
  );
}
