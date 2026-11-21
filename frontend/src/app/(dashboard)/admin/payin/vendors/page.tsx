"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableHead,
  TableRow, Button, Stack, Alert, CircularProgress, Chip, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, IconButton, Tooltip, Divider, Grid,
  Card, CardContent, Snackbar
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import LockIcon from "@mui/icons-material/Lock";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import SecurityIcon from "@mui/icons-material/Security";
import SpeedIcon from "@mui/icons-material/Speed";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import { apiClient } from "@/lib/api";

interface VendorItem {
  payin_vendor_ref_id: number;
  vendor_code: string;
  vendor_name: string;
  provider_name: string;
  provider_type: string;
  api_base_url: string;
  auth_type: string;
  cred_ref: string;
  callback_url?: string | null;
  timeout_sec: number;
  retry_policy: string;
  vendor_status: string;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  txn_count?: number;
}

export default function AdminPayinVendorsPage() {
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" }>({
    open: false,
    message: "",
    severity: "success"
  });

  // Add Dialog State
  const [addOpen, setAddOpen] = useState<boolean>(false);
  const [addCode, setAddCode] = useState<string>("");
  const [addName, setAddName] = useState<string>("");
  const [addProviderName, setAddProviderName] = useState<string>("");
  const [addProviderType, setAddProviderType] = useState<string>("PAYMENT_GATEWAY");
  const [addApiUrl, setAddApiUrl] = useState<string>("");
  const [addAuthType, setAddAuthType] = useState<string>("API_KEY");
  const [addCredRef, setAddCredRef] = useState<string>("");
  const [addCallbackUrl, setAddCallbackUrl] = useState<string>("");
  const [addTimeout, setAddTimeout] = useState<number>(30);
  const [addRetryPolicy, setAddRetryPolicy] = useState<string>("EXPONENTIAL_BACKOFF");
  const [addStatus, setAddStatus] = useState<string>("ACTIVE");
  const [addSaving, setAddSaving] = useState<boolean>(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit Dialog State
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [editingVendor, setEditingVendor] = useState<VendorItem | null>(null);
  const [editCode, setEditCode] = useState<string>("");
  const [editName, setEditName] = useState<string>("");
  const [editProviderName, setEditProviderName] = useState<string>("");
  const [editProviderType, setEditProviderType] = useState<string>("PAYMENT_GATEWAY");
  const [editApiUrl, setEditApiUrl] = useState<string>("");
  const [editAuthType, setEditAuthType] = useState<string>("API_KEY");
  const [editCredRef, setEditCredRef] = useState<string>("");
  const [editCallbackUrl, setEditCallbackUrl] = useState<string>("");
  const [editTimeout, setEditTimeout] = useState<number>(30);
  const [editRetryPolicy, setEditRetryPolicy] = useState<string>("EXPONENTIAL_BACKOFF");
  const [editStatus, setEditStatus] = useState<string>("ACTIVE");
  const [editSaving, setEditSaving] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Status Toggle Confirmation Dialog State
  const [toggleOpen, setToggleOpen] = useState<boolean>(false);
  const [targetVendor, setTargetVendor] = useState<VendorItem | null>(null);
  const [toggleSaving, setToggleSaving] = useState<boolean>(false);

  const fetchVendors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get("/api/v1/admin/payin/vendors");
      if (res.data && res.data.success) {
        setVendors(res.data.vendors || res.data.data || []);
      }
    } catch (e: any) {
      console.error("Failed to load vendors:", e);
      setError(e?.response?.data?.detail || "Failed to load payment vendors master.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  // Open Add Dialog
  const handleOpenAdd = () => {
    setAddCode("");
    setAddName("");
    setAddProviderName("");
    setAddProviderType("PAYMENT_GATEWAY");
    setAddApiUrl("");
    setAddAuthType("API_KEY");
    setAddCredRef("");
    setAddCallbackUrl("");
    setAddTimeout(30);
    setAddRetryPolicy("EXPONENTIAL_BACKOFF");
    setAddStatus("ACTIVE");
    setAddError(null);
    setAddOpen(true);
  };

  // Submit Add Vendor
  const handleSaveAdd = async () => {
    if (!addCode.trim()) {
      setAddError("Vendor Code is required (e.g. RAZORPAY).");
      return;
    }
    if (!addName.trim()) {
      setAddError("Vendor Name is required.");
      return;
    }
    if (!addProviderName.trim()) {
      setAddError("Provider Name is required.");
      return;
    }
    if (!addApiUrl.trim()) {
      setAddError("API Base URL is required.");
      return;
    }
    if (!addCredRef.trim()) {
      setAddError("Credential Reference is required.");
      return;
    }

    try {
      setAddSaving(true);
      setAddError(null);
      const payload = {
        vendor_code: addCode.trim().toUpperCase(),
        vendor_name: addName.trim(),
        provider_name: addProviderName.trim(),
        provider_type: addProviderType,
        api_base_url: addApiUrl.trim(),
        auth_type: addAuthType,
        cred_ref: addCredRef.trim(),
        callback_url: addCallbackUrl.trim() || null,
        timeout_sec: Number(addTimeout) || 30,
        retry_policy: addRetryPolicy,
        vendor_status: addStatus,
      };

      const res = await apiClient.post("/api/v1/admin/payin/vendors", payload);
      if (res.data && res.data.success) {
        setSnackbar({
          open: true,
          message: res.data.message || `Vendor '${payload.vendor_name}' added successfully.`,
          severity: "success"
        });
        setAddOpen(false);
        fetchVendors();
      }
    } catch (e: any) {
      console.error("Failed to add vendor:", e);
      setAddError(e?.response?.data?.detail || "Failed to create payment vendor.");
    } finally {
      setAddSaving(false);
    }
  };

  // Open Edit Dialog
  const handleOpenEdit = (v: VendorItem) => {
    setEditingVendor(v);
    setEditCode(v.vendor_code || "");
    setEditName(v.vendor_name || "");
    setEditProviderName(v.provider_name || "");
    setEditProviderType(v.provider_type || "PAYMENT_GATEWAY");
    setEditApiUrl(v.api_base_url || "");
    setEditAuthType(v.auth_type || "API_KEY");
    setEditCredRef(v.cred_ref || "");
    setEditCallbackUrl(v.callback_url || "");
    setEditTimeout(v.timeout_sec || 30);
    setEditRetryPolicy(v.retry_policy || "EXPONENTIAL_BACKOFF");
    setEditStatus(v.vendor_status || "ACTIVE");
    setEditError(null);
    setEditOpen(true);
  };

  // Submit Edit Vendor
  const handleSaveEdit = async () => {
    if (!editingVendor) return;
    if (!editName.trim()) {
      setEditError("Vendor Name cannot be empty.");
      return;
    }
    if (!editProviderName.trim()) {
      setEditError("Provider Name cannot be empty.");
      return;
    }
    if (!editApiUrl.trim()) {
      setEditError("API Base URL cannot be empty.");
      return;
    }
    if (!editCredRef.trim()) {
      setEditError("Credential Reference cannot be empty.");
      return;
    }

    try {
      setEditSaving(true);
      setEditError(null);
      const payload: Record<string, any> = {
        vendor_name: editName.trim(),
        provider_name: editProviderName.trim(),
        provider_type: editProviderType,
        api_base_url: editApiUrl.trim(),
        auth_type: editAuthType,
        cred_ref: editCredRef.trim(),
        callback_url: editCallbackUrl.trim() || null,
        timeout_sec: Number(editTimeout) || 30,
        retry_policy: editRetryPolicy,
        vendor_status: editStatus,
      };

      // Only pass vendor_code if it was allowed to edit and changed
      if (editCode.trim().toUpperCase() !== editingVendor.vendor_code) {
        payload.vendor_code = editCode.trim().toUpperCase();
      }

      const res = await apiClient.put(
        `/api/v1/admin/payin/vendors/${editingVendor.payin_vendor_ref_id}`,
        payload
      );

      if (res.data && res.data.success) {
        setSnackbar({
          open: true,
          message: res.data.message || `Vendor '${editName.trim()}' updated successfully.`,
          severity: "success"
        });
        setEditOpen(false);
        setEditingVendor(null);
        fetchVendors();
      }
    } catch (e: any) {
      console.error("Failed to update vendor:", e);
      setEditError(e?.response?.data?.detail || "Failed to update vendor settings.");
    } finally {
      setEditSaving(false);
    }
  };

  // Open Toggle Confirmation Dialog
  const handlePromptToggle = (v: VendorItem) => {
    setTargetVendor(v);
    setToggleOpen(true);
  };

  // Submit Toggle Status
  const handleConfirmToggle = async () => {
    if (!targetVendor) return;
    try {
      setToggleSaving(true);
      const nextStatus = targetVendor.vendor_status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      const res = await apiClient.post(
        `/api/v1/admin/payin/vendors/${targetVendor.payin_vendor_ref_id}/toggle-status`,
        { vendor_status: nextStatus }
      );

      if (res.data && res.data.success) {
        setSnackbar({
          open: true,
          message: res.data.message || `Vendor status changed to ${res.data.vendor_status}.`,
          severity: res.data.vendor_status === "ACTIVE" ? "success" : "info"
        });
        setToggleOpen(false);
        setTargetVendor(null);
        fetchVendors();
      }
    } catch (e: any) {
      console.error("Failed to toggle vendor status:", e);
      setSnackbar({
        open: true,
        message: e?.response?.data?.detail || "Failed to toggle vendor status.",
        severity: "error"
      });
    } finally {
      setToggleSaving(false);
    }
  };

  // Summary Metrics
  const totalVendors = vendors.length;
  const activeVendors = vendors.filter((v) => v.vendor_status === "ACTIVE").length;
  const inactiveVendors = vendors.filter((v) => v.vendor_status !== "ACTIVE").length;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: "auto" }}>
      {/* Top Header & Navigation Bar */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button
            component={Link}
            href="/admin/payin/dashboard"
            variant="outlined"
            size="small"
            startIcon={<ArrowBackIcon />}
            sx={{ textTransform: "none", borderRadius: 2 }}
          >
            Dashboard
          </Button>
          <Box>
            <Typography variant="h5" fontWeight="700">
              Payment Vendors Master
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Configure upstream payment gateways, API credentials, timeouts, and system activation status.
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={fetchVendors}
            disabled={loading}
            sx={{ textTransform: "none", borderRadius: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleOpenAdd}
            sx={{
              textTransform: "none",
              borderRadius: 2,
              fontWeight: 600,
              boxShadow: "0 2px 8px rgba(16, 185, 129, 0.25)"
            }}
          >
            Add Vendor
          </Button>
        </Stack>
      </Stack>

      {/* Global Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* KPI Overview Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: "background.paper" }}>
            <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight="600">
                    TOTAL VENDORS
                  </Typography>
                  <Typography variant="h4" fontWeight="800" sx={{ mt: 0.5 }}>
                    {totalVendors}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    bgcolor: "primary.50",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "primary.main"
                  }}
                >
                  <AccountBalanceIcon />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: "background.paper" }}>
            <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight="600">
                    ACTIVE GATEWAYS
                  </Typography>
                  <Typography variant="h4" fontWeight="800" color="success.main" sx={{ mt: 0.5 }}>
                    {activeVendors}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    bgcolor: "success.50",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "success.main"
                  }}
                >
                  <CheckCircleIcon />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: "background.paper" }}>
            <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight="600">
                    INACTIVE / DISABLED
                  </Typography>
                  <Typography
                    variant="h4"
                    fontWeight="800"
                    color={inactiveVendors > 0 ? "warning.main" : "text.secondary"}
                    sx={{ mt: 0.5 }}
                  >
                    {inactiveVendors}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    bgcolor: inactiveVendors > 0 ? "warning.50" : "grey.100",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: inactiveVendors > 0 ? "warning.main" : "text.disabled"
                  }}
                >
                  <PowerSettingsNewIcon />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Vendor Data Table */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        {loading ? (
          <Box sx={{ p: 6, textAlign: "center" }}>
            <CircularProgress size={36} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Loading payment vendors configuration...
            </Typography>
          </Box>
        ) : vendors.length === 0 ? (
          <Box sx={{ p: 6, textAlign: "center" }}>
            <AccountBalanceIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1.5 }} />
            <Typography variant="h6" fontWeight="600" color="text.secondary">
              No Payment Vendors Found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Add a payment vendor to configure gateway routing for retailers.
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd}>
              Add Vendor
            </Button>
          </Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: "grey.50" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: 80 }}>Ref ID</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 140 }}>Vendor Code</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Vendor & Provider</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type & Auth</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>API Base Endpoint</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 110 }}>Timeout</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 110 }}>Txns</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 120 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, width: 150 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vendors.map((v) => {
                const isActive = v.vendor_status === "ACTIVE";
                return (
                  <TableRow key={v.payin_vendor_ref_id} hover sx={{ transition: "background-color 0.15s" }}>
                    <TableCell>
                      <Chip label={`#${v.payin_vendor_ref_id}`} size="small" variant="outlined" sx={{ fontFamily: "monospace" }} />
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight="700"
                        sx={{
                          fontFamily: "monospace",
                          color: isActive ? "primary.dark" : "text.secondary"
                        }}
                      >
                        {v.vendor_code}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="600">
                        {v.vendor_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Provider: {v.provider_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="column" spacing={0.5} alignItems="flex-start">
                        <Chip
                          label={v.provider_type || "PAYMENT_GATEWAY"}
                          size="small"
                          sx={{ fontSize: "0.7rem", height: 20 }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                          Auth: {v.auth_type || "API_KEY"}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={v.api_base_url} arrow placement="top">
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily: "monospace",
                            display: "block",
                            maxWidth: 220,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            bgcolor: "grey.100",
                            px: 1,
                            py: 0.5,
                            borderRadius: 1
                          }}
                        >
                          {v.api_base_url}
                        </Typography>
                      </Tooltip>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                        Key: <code>{v.cred_ref}</code>
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <SpeedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                        <Typography variant="body2">{v.timeout_sec}s</Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.68rem" }}>
                        {v.retry_policy === "EXPONENTIAL_BACKOFF" ? "Backoff" : v.retry_policy}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${v.txn_count || 0} Txns`}
                        size="small"
                        color={Number(v.txn_count || 0) > 0 ? "default" : "default"}
                        variant={Number(v.txn_count || 0) > 0 ? "filled" : "outlined"}
                        sx={{ fontSize: "0.72rem" }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={isActive ? <CheckCircleIcon sx={{ "&&": { fontSize: 16 } }} /> : <CancelIcon sx={{ "&&": { fontSize: 16 } }} />}
                        label={v.vendor_status}
                        color={isActive ? "success" : "default"}
                        size="small"
                        sx={{ fontWeight: 600, fontSize: "0.75rem" }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                        <Tooltip title="Edit Vendor Configuration">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEdit(v)}
                            sx={{ color: "primary.main", border: "1px solid", borderColor: "divider" }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={isActive ? "Deactivate Vendor" : "Activate Vendor"}>
                          <Button
                            size="small"
                            variant={isActive ? "outlined" : "contained"}
                            color={isActive ? "warning" : "success"}
                            onClick={() => handlePromptToggle(v)}
                            sx={{
                              textTransform: "none",
                              fontSize: "0.75rem",
                              py: 0.25,
                              px: 1,
                              minWidth: 80,
                              borderRadius: 1.5
                            }}
                          >
                            {isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* ── ADD VENDOR DIALOG ── */}
      <Dialog open={addOpen} onClose={() => !addSaving && setAddOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 1, fontWeight: 700 }}>
          Add New Payment Vendor
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          {addError && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 1.5 }}>
              {addError}
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Vendor Code"
                placeholder="e.g. RAZORPAY"
                value={addCode}
                onChange={(e) => setAddCode(e.target.value.toUpperCase())}
                fullWidth
                required
                size="small"
                helperText="Unique uppercase identifier for this vendor."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Vendor Display Name"
                placeholder="e.g. Razorpay Payment Gateway"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                fullWidth
                required
                size="small"
                helperText="Internal display name in admin portal."
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Provider Name"
                placeholder="e.g. Razorpay"
                value={addProviderName}
                onChange={(e) => setAddProviderName(e.target.value)}
                fullWidth
                required
                size="small"
                helperText="Actual financial provider or bank entity."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Provider Type</InputLabel>
                <Select
                  value={addProviderType}
                  label="Provider Type"
                  onChange={(e) => setAddProviderType(e.target.value)}
                >
                  <MenuItem value="PAYMENT_GATEWAY">PAYMENT_GATEWAY</MenuItem>
                  <MenuItem value="BANK">BANK</MenuItem>
                  <MenuItem value="AGGREGATOR">AGGREGATOR</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="API Base URL"
                placeholder="https://api.provider.com/v1"
                value={addApiUrl}
                onChange={(e) => setAddApiUrl(e.target.value)}
                fullWidth
                required
                size="small"
                helperText="Base endpoint URL for outward API requests."
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Authentication Type</InputLabel>
                <Select
                  value={addAuthType}
                  label="Authentication Type"
                  onChange={(e) => setAddAuthType(e.target.value)}
                >
                  <MenuItem value="API_KEY">API_KEY</MenuItem>
                  <MenuItem value="BEARER">BEARER</MenuItem>
                  <MenuItem value="BASIC">BASIC</MenuItem>
                  <MenuItem value="HMAC">HMAC</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Credential Reference / Key"
                placeholder="e.g. SEC_RAZORPAY_PROD"
                value={addCredRef}
                onChange={(e) => setAddCredRef(e.target.value)}
                fullWidth
                required
                size="small"
                helperText="Vault or environment variable reference key."
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Callback / Webhook URL (Optional)"
                placeholder="https://api.pay2pay.in/api/v1/payin/callback/..."
                value={addCallbackUrl}
                onChange={(e) => setAddCallbackUrl(e.target.value)}
                fullWidth
                size="small"
                helperText="Inbound destination for gateway transaction callbacks."
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                label="Timeout (Seconds)"
                type="number"
                value={addTimeout}
                onChange={(e) => setAddTimeout(Math.max(1, parseInt(e.target.value) || 30))}
                fullWidth
                size="small"
                inputProps={{ min: 1, max: 300 }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Retry Policy</InputLabel>
                <Select
                  value={addRetryPolicy}
                  label="Retry Policy"
                  onChange={(e) => setAddRetryPolicy(e.target.value)}
                >
                  <MenuItem value="EXPONENTIAL_BACKOFF">EXPONENTIAL_BACKOFF</MenuItem>
                  <MenuItem value="LINEAR_RETRY">LINEAR_RETRY</MenuItem>
                  <MenuItem value="NONE">NONE</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Initial Status</InputLabel>
                <Select
                  value={addStatus}
                  label="Initial Status"
                  onChange={(e) => setAddStatus(e.target.value)}
                >
                  <MenuItem value="ACTIVE">ACTIVE</MenuItem>
                  <MenuItem value="INACTIVE">INACTIVE</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setAddOpen(false)} disabled={addSaving} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveAdd}
            disabled={addSaving}
            startIcon={addSaving && <CircularProgress size={16} />}
            sx={{ fontWeight: 600, minWidth: 120 }}
          >
            {addSaving ? "Creating..." : "Create Vendor"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── EDIT VENDOR DIALOG ── */}
      <Dialog open={editOpen} onClose={() => !editSaving && setEditOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 1, fontWeight: 700 }}>
          Edit Vendor: {editingVendor?.vendor_code} (#{editingVendor?.payin_vendor_ref_id})
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          {editError && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 1.5 }}>
              {editError}
            </Alert>
          )}

          {Number(editingVendor?.txn_count || 0) > 0 && (
            <Alert
              severity="info"
              icon={<LockIcon fontSize="inherit" />}
              sx={{ mb: 2.5, borderRadius: 1.5 }}
            >
              This vendor is linked to {editingVendor?.txn_count} transaction(s). Vendor Code cannot be altered
              to preserve audit and ledger integrity.
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Vendor Code"
                value={editCode}
                onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                fullWidth
                disabled={Number(editingVendor?.txn_count || 0) > 0}
                size="small"
                helperText={
                  Number(editingVendor?.txn_count || 0) > 0
                    ? "Locked: Associated transactions exist."
                    : "Primary uppercase identifier code."
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Vendor Display Name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                fullWidth
                required
                size="small"
                helperText="Internal display name in admin portal."
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Provider Name"
                value={editProviderName}
                onChange={(e) => setEditProviderName(e.target.value)}
                fullWidth
                required
                size="small"
                helperText="Actual financial provider or bank entity."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Provider Type</InputLabel>
                <Select
                  value={editProviderType}
                  label="Provider Type"
                  onChange={(e) => setEditProviderType(e.target.value)}
                >
                  <MenuItem value="PAYMENT_GATEWAY">PAYMENT_GATEWAY</MenuItem>
                  <MenuItem value="BANK">BANK</MenuItem>
                  <MenuItem value="AGGREGATOR">AGGREGATOR</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="API Base URL"
                value={editApiUrl}
                onChange={(e) => setEditApiUrl(e.target.value)}
                fullWidth
                required
                size="small"
                helperText="Base endpoint URL for outward API requests."
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Authentication Type</InputLabel>
                <Select
                  value={editAuthType}
                  label="Authentication Type"
                  onChange={(e) => setEditAuthType(e.target.value)}
                >
                  <MenuItem value="API_KEY">API_KEY</MenuItem>
                  <MenuItem value="BEARER">BEARER</MenuItem>
                  <MenuItem value="BASIC">BASIC</MenuItem>
                  <MenuItem value="HMAC">HMAC</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Credential Reference / Key"
                value={editCredRef}
                onChange={(e) => setEditCredRef(e.target.value)}
                fullWidth
                required
                size="small"
                helperText="Vault or environment variable reference key."
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Callback / Webhook URL (Optional)"
                value={editCallbackUrl}
                onChange={(e) => setEditCallbackUrl(e.target.value)}
                fullWidth
                size="small"
                helperText="Inbound destination for gateway transaction callbacks."
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                label="Timeout (Seconds)"
                type="number"
                value={editTimeout}
                onChange={(e) => setEditTimeout(Math.max(1, parseInt(e.target.value) || 30))}
                fullWidth
                size="small"
                inputProps={{ min: 1, max: 300 }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Retry Policy</InputLabel>
                <Select
                  value={editRetryPolicy}
                  label="Retry Policy"
                  onChange={(e) => setEditRetryPolicy(e.target.value)}
                >
                  <MenuItem value="EXPONENTIAL_BACKOFF">EXPONENTIAL_BACKOFF</MenuItem>
                  <MenuItem value="LINEAR_RETRY">LINEAR_RETRY</MenuItem>
                  <MenuItem value="NONE">NONE</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={editStatus}
                  label="Status"
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  <MenuItem value="ACTIVE">ACTIVE</MenuItem>
                  <MenuItem value="INACTIVE">INACTIVE</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setEditOpen(false)} disabled={editSaving} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEdit}
            disabled={editSaving}
            startIcon={editSaving && <CircularProgress size={16} />}
            sx={{ fontWeight: 600, minWidth: 120 }}
          >
            {editSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── STATUS TOGGLE CONFIRMATION DIALOG ── */}
      <Dialog open={toggleOpen} onClose={() => !toggleSaving && setToggleOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1, fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon color={targetVendor?.vendor_status === "ACTIVE" ? "warning" : "success"} />
          {targetVendor?.vendor_status === "ACTIVE" ? "Deactivate Vendor?" : "Activate Vendor?"}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          {targetVendor?.vendor_status === "ACTIVE" ? (
            <Stack spacing={1.5}>
              <Typography variant="body2">
                Are you sure you want to deactivate <strong>{targetVendor.vendor_name}</strong> (<code>{targetVendor.vendor_code}</code>)?
              </Typography>
              <Alert severity="warning" sx={{ fontSize: "0.8rem", borderRadius: 1.5 }}>
                Deactivating this vendor will immediately stop it from being offered to retailers for checkout and fail closed on any attempted transaction initiation. Historical records and logs will remain completely intact.
              </Alert>
            </Stack>
          ) : (
            <Stack spacing={1.5}>
              <Typography variant="body2">
                Are you sure you want to activate <strong>{targetVendor?.vendor_name}</strong> (<code>{targetVendor?.vendor_code}</code>)?
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Activating will make this vendor immediately eligible for retailer payment routing and transaction processing based on company configuration.
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 2.5, py: 1.5 }}>
          <Button onClick={() => setToggleOpen(false)} disabled={toggleSaving} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            color={targetVendor?.vendor_status === "ACTIVE" ? "warning" : "success"}
            onClick={handleConfirmToggle}
            disabled={toggleSaving}
            startIcon={toggleSaving && <CircularProgress size={16} />}
            sx={{ fontWeight: 600 }}
          >
            {toggleSaving
              ? "Updating..."
              : targetVendor?.vendor_status === "ACTIVE"
              ? "Deactivate Vendor"
              : "Activate Vendor"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── TOAST NOTIFICATION ── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%", borderRadius: 1.5, fontWeight: 500 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
