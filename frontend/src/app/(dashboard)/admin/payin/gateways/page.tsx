"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Box, Paper, Typography, Button, Stack, Alert, CircularProgress,
  Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Switch, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, Tooltip, Divider,
  Card, CardContent, Grid
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import ShieldCheckIcon from "@mui/icons-material/Shield";
import InfoIcon from "@mui/icons-material/Info";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import LockIcon from "@mui/icons-material/Lock";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { apiClient } from "@/lib/api";

interface GatewayItem {
  payin_company_vendor_ref_id: number;
  company_ref_id: number;
  company_name: string;
  payin_vendor_ref_id: number;
  internal_provider_name: string;
  vendor_code: string;
  gateway_code: string;
  retailer_display_name: string;
  description: string;
  display_order: number;
  status: string;
  is_enabled: boolean;
  supported_methods: string[];
  updated_by?: string | null;
  updated_at?: string | null;
}

export default function AdminPayinGatewaysPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [gateways, setGateways] = useState<GatewayItem[]>([]);
  const [companyRefId, setCompanyRefId] = useState<number>(2);
  const [companyName, setCompanyName] = useState<string>("Company");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit Dialog State
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<GatewayItem | null>(null);
  const [editDisplayName, setEditDisplayName] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editOrder, setEditOrder] = useState<number>(1);
  const [editStatus, setEditStatus] = useState<string>("ACTIVE");
  const [editEnabled, setEditEnabled] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  // Toggle Loading tracker
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const fetchGateways = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get("/api/v1/admin/payin/gateways");
      if (res.data && res.data.success) {
        setGateways(res.data.gateways || []);
        setCompanyRefId(res.data.company_ref_id);
        setCompanyName(res.data.company_name);
      }
    } catch (e: any) {
      console.error("Failed to load gateways:", e);
      setError(e?.response?.data?.detail || "Failed to load Payment Gateways configuration.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGateways();
  }, [fetchGateways]);

  const handleOpenEdit = (gw: GatewayItem) => {
    setEditingItem(gw);
    setEditDisplayName(gw.retailer_display_name || "");
    setEditDescription(gw.description || "");
    setEditOrder(gw.display_order || 1);
    setEditStatus(gw.status || "ACTIVE");
    setEditEnabled(gw.is_enabled);
    setDialogError(null);
    setEditOpen(true);
  };

  const handleCloseEdit = () => {
    setEditOpen(false);
    setEditingItem(null);
    setDialogError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    if (!editDisplayName.trim()) {
      setDialogError("Retailer Display Name cannot be empty.");
      return;
    }

    try {
      setSaving(true);
      setDialogError(null);
      const res = await apiClient.post(
        `/api/v1/admin/payin/gateways/${editingItem.payin_company_vendor_ref_id}`,
        {
          retailer_display_name: editDisplayName.trim(),
          description: editDescription.trim(),
          display_order: Number(editOrder),
          status: editStatus,
          is_enabled: editEnabled,
        }
      );

      if (res.data && res.data.success) {
        setSuccessMsg(`Gateway '${editDisplayName.trim()}' updated successfully.`);
        handleCloseEdit();
        fetchGateways();
      }
    } catch (e: any) {
      console.error("Failed to update gateway:", e);
      setDialogError(e?.response?.data?.detail || "Failed to save gateway changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (gw: GatewayItem) => {
    try {
      setTogglingId(gw.payin_company_vendor_ref_id);
      setError(null);
      const res = await apiClient.post(
        `/api/v1/admin/payin/gateways/${gw.payin_company_vendor_ref_id}/toggle-status`
      );
      if (res.data && res.data.success) {
        setSuccessMsg(res.data.message || `Gateway status updated to ${res.data.status}.`);
        fetchGateways();
      }
    } catch (e: any) {
      console.error("Failed to toggle gateway status:", e);
      setError(e?.response?.data?.detail || "Failed to toggle gateway status.");
    } finally {
      setTogglingId(null);
    }
  };

  const activeCount = gateways.filter((g) => g.status === "ACTIVE" && g.is_enabled).length;

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1400, mx: "auto" }}>
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
            Back to Dashboard
          </Button>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h5" sx={{ fontWeight: 800, color: "text.primary" }}>
                Payment Gateway Management
              </Typography>
              <Chip
                icon={<AccountBalanceIcon sx={{ fontSize: "14px !important" }} />}
                label={companyName}
                color="primary"
                size="small"
                variant="filled"
                sx={{ fontWeight: 700 }}
              />
            </Stack>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
              Dynamic Gateway Providers, Retailer-Facing Identifiers, and Checkout Availability
            </Typography>
          </Box>
        </Stack>

        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={fetchGateways}
          disabled={loading}
          sx={{ textTransform: "none", borderRadius: 2 }}
        >
          Refresh Gateways
        </Button>
      </Stack>

      {/* Notifications */}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3, borderRadius: 2 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {successMsg && (
        <Alert
          severity="success"
          sx={{ mb: 3, borderRadius: 2 }}
          onClose={() => setSuccessMsg(null)}
        >
          {successMsg}
        </Alert>
      )}

      {/* Overview Stat Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                CONFIGURED GATEWAYS
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>
                {gateways.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                ACTIVE ON CHECKOUT
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: "success.main" }}>
                {activeCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                ISOLATION BOUNDARY
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 0.5 }}>
                Company Ref #{companyRefId} ({companyName})
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Gateways Table */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden", mb: 3 }}>
        <Box sx={{ p: 2.5, bgcolor: "grey.50", borderBottom: "1px solid", borderColor: "divider" }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Configured Payment Gateways
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Internal providers are strictly visible only to Admins. Retailers will only see the configured Retailer Display Name.
              </Typography>
            </Box>
            <Chip
              label={`${activeCount} of ${gateways.length} Active`}
              color={activeCount > 0 ? "success" : "warning"}
              size="small"
              variant="outlined"
            />
          </Stack>
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
            <CircularProgress size={36} />
          </Box>
        ) : gateways.length === 0 ? (
          <Box sx={{ p: 6, textAlign: "center" }}>
            <Typography variant="body1" sx={{ color: "text.secondary" }}>
              No payment gateways registered for this company.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "background.paper" }}>
                  <TableCell sx={{ fontWeight: 700, width: 110 }}>Reference ID</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 220 }}>Internal Provider Name</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 200 }}>Retailer Display Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 110, textAlign: "center" }}>Display Order</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 120, textAlign: "center" }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 100, textAlign: "center" }}>Enabled</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 100, textAlign: "center" }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {gateways.map((gw) => {
                  const isActive = gw.status === "ACTIVE" && gw.is_enabled;
                  const isToggling = togglingId === gw.payin_company_vendor_ref_id;

                  return (
                    <TableRow
                      key={gw.payin_company_vendor_ref_id}
                      hover
                      sx={{
                        bgcolor: !isActive ? "action.hover" : "inherit",
                        opacity: !isActive ? 0.85 : 1,
                      }}
                    >
                      {/* 1. Reference ID */}
                      <TableCell sx={{ fontFamily: "monospace", fontWeight: 700, color: "text.secondary" }}>
                        #{gw.payin_company_vendor_ref_id}
                      </TableCell>

                      {/* 2. Internal Provider Name (Admin Only) */}
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <LockIcon sx={{ fontSize: 16, color: "warning.main" }} />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {gw.internal_provider_name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary", fontFamily: "monospace" }}>
                              Code: {gw.vendor_code}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>

                      {/* 3. Retailer Display Name */}
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            label={gw.gateway_code}
                            size="small"
                            variant="outlined"
                            color="primary"
                            sx={{ fontWeight: 700, fontSize: "11px", height: "20px" }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 800, color: "text.primary" }}>
                            {gw.retailer_display_name}
                          </Typography>
                        </Stack>
                      </TableCell>

                      {/* 4. Description */}
                      <TableCell>
                        <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "13px" }}>
                          {gw.description || "—"}
                        </Typography>
                      </TableCell>

                      {/* 5. Display Order */}
                      <TableCell sx={{ textAlign: "center" }}>
                        <Chip
                          label={`#${gw.display_order}`}
                          size="small"
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>

                      {/* 6. Status Chip */}
                      <TableCell sx={{ textAlign: "center" }}>
                        <Chip
                          icon={isActive ? <CheckCircleIcon sx={{ fontSize: "14px !important" }} /> : <CancelIcon sx={{ fontSize: "14px !important" }} />}
                          label={gw.status}
                          size="small"
                          color={isActive ? "success" : "default"}
                          sx={{
                            fontWeight: 700,
                            borderRadius: 1.5,
                          }}
                        />
                      </TableCell>

                      {/* 7. Enabled Toggle Switch */}
                      <TableCell sx={{ textAlign: "center" }}>
                        {isToggling ? (
                          <CircularProgress size={20} />
                        ) : (
                          <Tooltip title={isActive ? "Click to Deactivate Gateway" : "Click to Activate Gateway"}>
                            <Switch
                              checked={isActive}
                              onChange={() => handleToggleStatus(gw)}
                              color="success"
                              size="small"
                            />
                          </Tooltip>
                        )}
                      </TableCell>

                      {/* 8. Actions (Edit Button) */}
                      <TableCell sx={{ textAlign: "center" }}>
                        <Tooltip title="Edit Gateway Details">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenEdit(gw)}
                            sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Security & Audit Guidelines Callout */}
      <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: "background.paper" }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <ShieldCheckIcon color="primary" sx={{ mt: 0.5 }} />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Dynamic Payment Gateway Management Invariants
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5, fontSize: "13px" }}>
                • <strong>Provider Privacy:</strong> Retailer users and customers will strictly see only the configured Retailer Display Name and Gateway Code. Real provider names (e.g. BankMe) are scrubbed before checkout.<br />
                • <strong>Integration Integrity:</strong> Internal provider IDs, vendor codes, credentials, and webhook endpoints remain immutable. Changing display names never alters backend routing.<br />
                • <strong>Transaction Protection:</strong> Deactivating a gateway prevents new checkouts, but does NOT terminate or reject webhooks, callbacks, or status polling for existing transactions.<br />
                • <strong>High-Availability Guard:</strong> The system automatically blocks deactivating the sole active gateway for a company to prevent complete checkout outages.
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Edit Gateway Dialog */}
      <Dialog
        open={editOpen}
        onClose={handleCloseEdit}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2.5, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          Edit Payment Gateway #{editingItem?.payin_company_vendor_ref_id}
        </DialogTitle>
        <DialogContent dividers>
          {dialogError && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
              {dialogError}
            </Alert>
          )}

          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {/* Read-Only Internal Provider Info */}
            <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                INTERNAL PAYMENT PROVIDER (IMMUTABLE)
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <LockIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                <Typography variant="body1" sx={{ fontWeight: 700 }}>
                  {editingItem?.internal_provider_name}
                </Typography>
                <Chip
                  label={editingItem?.vendor_code}
                  size="small"
                  variant="outlined"
                  sx={{ fontFamily: "monospace", fontWeight: 700 }}
                />
              </Stack>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
                Internal integration adapter, API credentials, and webhook processing remain permanently linked.
              </Typography>
            </Box>

            {/* Retailer Display Name */}
            <TextField
              label="Retailer Display Name"
              value={editDisplayName}
              onChange={(e) => setEditDisplayName(e.target.value)}
              fullWidth
              required
              helperText="Visible to retailers and customers on the PayIn checkout screen (e.g. Gateway G-1)."
            />

            {/* Description */}
            <TextField
              label="Customer-Facing Description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
              helperText="Brief subtitle displayed under the gateway selection card."
            />

            {/* Display Order */}
            <TextField
              label="Display Order"
              type="number"
              value={editOrder}
              onChange={(e) => setEditOrder(Math.max(1, parseInt(e.target.value) || 1))}
              fullWidth
              inputProps={{ min: 1 }}
              helperText="Order in which this gateway appears on the Retailer PayIn screen (lower numbers appear first)."
            />

            {/* Status Select */}
            <FormControl fullWidth>
              <InputLabel id="edit-status-label">Availability Status</InputLabel>
              <Select
                labelId="edit-status-label"
                value={editStatus}
                label="Availability Status"
                onChange={(e) => {
                  const val = e.target.value;
                  setEditStatus(val);
                  if (val === "INACTIVE") setEditEnabled(false);
                  if (val === "ACTIVE") setEditEnabled(true);
                }}
              >
                <MenuItem value="ACTIVE">ACTIVE (Selectable for PayIn Checkouts)</MenuItem>
                <MenuItem value="INACTIVE">INACTIVE (Hidden from Retailer Checkouts)</MenuItem>
              </Select>
            </FormControl>

            {/* Enabled Switch */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1 }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Enable Gateway
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Enables or disables gateway availability immediately.
                </Typography>
              </Box>
              <Switch
                checked={editEnabled}
                onChange={(e) => {
                  setEditEnabled(e.target.checked);
                  setEditStatus(e.target.checked ? "ACTIVE" : "INACTIVE");
                }}
                color="success"
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCloseEdit} disabled={saving} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEdit}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ textTransform: "none", borderRadius: 2 }}
          >
            {saving ? "Saving Changes..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
