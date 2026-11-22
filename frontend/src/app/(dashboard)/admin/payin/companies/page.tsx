"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableHead,
  TableRow, Switch, Button, Stack, Alert, CircularProgress, Chip,
  IconButton, Tooltip, Collapse, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, FormControl, InputLabel, Select, MenuItem,
  Snackbar, Divider
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ShieldIcon from "@mui/icons-material/Shield";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import TuneIcon from "@mui/icons-material/Tune";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import { apiClient } from "@/lib/api";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";

interface CompanyVendor {
  payin_company_vendor_ref_id: number;
  company_ref_id: number;
  payin_vendor_ref_id: number;
  vendor_code: string;
  vendor_name: string;
  provider_name?: string;
  gateway_code: string;
  retailer_display_name: string;
  description: string;
  display_order: number;
  status: string;
  is_enabled: boolean;
  is_default: boolean;
  min_amount: number;
  max_amount: number;
  updated_by?: string;
  updated_at?: string;
}

interface CompanyItem {
  payin_company_cfg_ref_id: number;
  company_ref_id: number;
  company_name: string;
  company_code: string;
  payin_enabled: boolean;
  min_amount: number;
  max_amount: number;
  daily_txn_limit: number;
  daily_amt_limit: number;
  customer_payable_policy: string;
  customer_payable_policy_name?: string;
  updated_by?: string;
  updated_at?: string;
  vendors?: CompanyVendor[];
}

interface MasterVendor {
  payin_vendor_ref_id: number;
  vendor_code: string;
  vendor_name: string;
  provider_name: string;
  vendor_status: string;
}

export default function AdminPayinCompaniesPage() {
  const { branding, domainTenant } = useCompanyBranding();
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [vendorCatalog, setVendorCatalog] = useState<MasterVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCompanies, setExpandedCompanies] = useState<Record<number, boolean>>({});

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({
    open: false,
    message: "",
    severity: "success"
  });

  // Add Vendor Dialog State
  const [addVendorOpen, setAddVendorOpen] = useState(false);
  const [selectedCompanyForAdd, setSelectedCompanyForAdd] = useState<CompanyItem | null>(null);
  const [addVendorId, setAddVendorId] = useState<number | "">("");
  const [addGatewayCode, setAddGatewayCode] = useState("G-1");
  const [addRetailerDisplayName, setAddRetailerDisplayName] = useState("Gateway G-1");
  const [addDescription, setAddDescription] = useState("Fast and secure payment processing with instant confirmation.");
  const [addDisplayOrder, setAddDisplayOrder] = useState<number>(1);
  const [addStatus, setAddStatus] = useState("ACTIVE");
  const [addMinAmount, setAddMinAmount] = useState<number>(10);
  const [addMaxAmount, setAddMaxAmount] = useState<number>(500000);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit Vendor Dialog State
  const [editVendorOpen, setEditVendorOpen] = useState(false);
  const [selectedCompanyForEdit, setSelectedCompanyForEdit] = useState<CompanyItem | null>(null);
  const [editingVendor, setEditingVendor] = useState<CompanyVendor | null>(null);
  const [editRetailerDisplayName, setEditRetailerDisplayName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDisplayOrder, setEditDisplayOrder] = useState<number>(1);
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [editMinAmount, setEditMinAmount] = useState<number>(10);
  const [editMaxAmount, setEditMaxAmount] = useState<number>(500000);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Toggle Vendor Status State
  const [toggleVendorOpen, setToggleVendorOpen] = useState(false);
  const [toggleTargetVendor, setToggleTargetVendor] = useState<CompanyVendor | null>(null);
  const [toggleTargetCompany, setToggleTargetCompany] = useState<CompanyItem | null>(null);
  const [toggleSaving, setToggleSaving] = useState(false);

  // Edit Company Limits Dialog State
  const [limitsOpen, setLimitsOpen] = useState(false);
  const [targetCompanyForLimits, setTargetCompanyForLimits] = useState<CompanyItem | null>(null);
  const [limitMinAmount, setLimitMinAmount] = useState<number>(10);
  const [limitMaxAmount, setLimitMaxAmount] = useState<number>(500000);
  const [limitDailyAmt, setLimitDailyAmt] = useState<number>(2000000);
  const [limitDailyTxn, setLimitDailyTxn] = useState<number>(500);
  const [limitsSaving, setLimitsSaving] = useState(false);
  const [limitsError, setLimitsError] = useState<string | null>(null);

  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const targetCompRef = branding?.company_ref_id;
      const headers = targetCompRef ? { "x-company-ref-id": String(targetCompRef) } : undefined;
      const [compRes, vendorRes] = await Promise.all([
        apiClient.get("/api/v1/admin/payin/companies", { headers }),
        apiClient.get("/api/v1/admin/payin/vendors").catch(() => ({ data: { vendors: [] } }))
      ]);

      if (compRes.data && compRes.data.success) {
        let comps: CompanyItem[] = compRes.data.companies || compRes.data.data || [];

        // Authoritative domain-driven company normalization
        comps = comps.map((c) => {
          if (c.company_ref_id === 2 || c.company_code === "SMSPAY") {
            return {
              ...c,
              company_name: "INSPEL TECHNOLOGIES SOLUTIONS PVT",
              company_code: "SMSPAY"
            };
          }
          if (c.company_ref_id === 47 || c.company_code === "PAY2PAY") {
            return {
              ...c,
              company_name: "SUPER REX PRODUCTS PRIVATE LIMITED",
              company_code: "PAY2PAY"
            };
          }
          if (c.company_ref_id === 1 || c.company_code === "NEAR4YOU") {
            return {
              ...c,
              company_name: "SATHUS TECHNOLOGY PRIVATE LIMITED",
              company_code: "NEAR4YOU"
            };
          }
          return c;
        });

        // Filter to active tenant domain to prevent unwanted cross-company leakage
        if (targetCompRef) {
          comps = comps.filter((c) => c.company_ref_id === targetCompRef);
        }

        setCompanies(comps);
        // Default expand all companies so vendors are readily visible
        const exp: Record<number, boolean> = {};
        comps.forEach((c) => {
          exp[c.company_ref_id] = true;
        });
        setExpandedCompanies((prev) => ({ ...exp, ...prev }));
      }

      if (vendorRes?.data?.vendors) {
        setVendorCatalog(vendorRes.data.vendors);
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load company configurations.");
    } finally {
      setLoading(false);
    }
  }, [branding?.company_ref_id]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const toggleExpand = (companyRefId: number) => {
    setExpandedCompanies((prev) => ({
      ...prev,
      [companyRefId]: !prev[companyRefId]
    }));
  };

  const handleToggleCompany = async (companyRefId: number, currentVal: boolean) => {
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
        setSnackbar({
          open: true,
          message: `Company PayIn ${!currentVal ? "enabled" : "disabled"} successfully.`,
          severity: "success"
        });
      }
    } catch (e: any) {
      setSnackbar({
        open: true,
        message: e?.response?.data?.detail || "Failed to toggle status",
        severity: "error"
      });
    }
  };

  // Open Add Vendor Dialog
  const handleOpenAddVendor = (company: CompanyItem) => {
    setSelectedCompanyForAdd(company);
    const existingVendors = company.vendors || [];
    const nextOrder = existingVendors.length + 1;
    const nextGCode = `G-${nextOrder}`;

    setAddVendorId(vendorCatalog.length > 0 ? vendorCatalog[0].payin_vendor_ref_id : "");
    setAddGatewayCode(nextGCode);
    setAddRetailerDisplayName(`Gateway ${nextGCode}`);
    setAddDescription("Fast and secure payment processing with instant confirmation.");
    setAddDisplayOrder(nextOrder);
    setAddStatus("ACTIVE");
    setAddMinAmount(Number(company.min_amount) || 10);
    setAddMaxAmount(Number(company.max_amount) || 500000);
    setAddError(null);
    setAddVendorOpen(true);
  };

  // Save Add Vendor
  const handleSaveAddVendor = async () => {
    if (!selectedCompanyForAdd) return;
    if (!addVendorId) {
      setAddError("Please select a payment vendor.");
      return;
    }
    if (!addGatewayCode.trim()) {
      setAddError("Gateway Code is required (e.g. G-1).");
      return;
    }
    if (!addRetailerDisplayName.trim()) {
      setAddError("Retailer Display Name is required.");
      return;
    }
    if (Number(addMinAmount) <= 0) {
      setAddError("Min Amount must be greater than zero.");
      return;
    }
    if (Number(addMaxAmount) < Number(addMinAmount)) {
      setAddError("Max Amount must be greater than or equal to Min Amount.");
      return;
    }

    try {
      setAddSaving(true);
      setAddError(null);
      const res = await apiClient.post("/api/v1/admin/payin/gateways", {
        company_ref_id: selectedCompanyForAdd.company_ref_id,
        payin_vendor_ref_id: Number(addVendorId),
        gateway_code: addGatewayCode.trim().toUpperCase(),
        retailer_display_name: addRetailerDisplayName.trim(),
        description: addDescription.trim(),
        display_order: Number(addDisplayOrder) || 1,
        status: addStatus,
        is_enabled: addStatus === "ACTIVE",
        min_amount: Number(addMinAmount),
        max_amount: Number(addMaxAmount)
      });

      if (res.data && res.data.success) {
        setSnackbar({
          open: true,
          message: `Vendor '${addRetailerDisplayName}' added successfully to ${selectedCompanyForAdd.company_name}.`,
          severity: "success"
        });
        setAddVendorOpen(false);
        await fetchCompanies();
      }
    } catch (e: any) {
      setAddError(e?.response?.data?.detail || "Failed to add vendor.");
    } finally {
      setAddSaving(false);
    }
  };

  // Open Edit Vendor Dialog
  const handleOpenEditVendor = (company: CompanyItem, vendor: CompanyVendor) => {
    setSelectedCompanyForEdit(company);
    setEditingVendor(vendor);
    setEditRetailerDisplayName(vendor.retailer_display_name);
    setEditDescription(vendor.description || "");
    setEditDisplayOrder(vendor.display_order || 1);
    setEditStatus(vendor.status || "ACTIVE");
    setEditMinAmount(Number(vendor.min_amount) || 10);
    setEditMaxAmount(Number(vendor.max_amount) || 500000);
    setEditError(null);
    setEditVendorOpen(true);
  };

  // Save Edit Vendor
  const handleSaveEditVendor = async () => {
    if (!editingVendor) return;
    if (!editRetailerDisplayName.trim()) {
      setEditError("Retailer Display Name is required.");
      return;
    }
    if (Number(editMinAmount) <= 0) {
      setEditError("Min Amount must be greater than zero.");
      return;
    }
    if (Number(editMaxAmount) < Number(editMinAmount)) {
      setEditError("Max Amount must be greater than or equal to Min Amount.");
      return;
    }

    try {
      setEditSaving(true);
      setEditError(null);
      const res = await apiClient.post(
        `/api/v1/admin/payin/gateways/${editingVendor.payin_company_vendor_ref_id}`,
        {
          retailer_display_name: editRetailerDisplayName.trim(),
          description: editDescription.trim(),
          display_order: Number(editDisplayOrder) || 1,
          status: editStatus,
          is_enabled: editStatus === "ACTIVE",
          min_amount: Number(editMinAmount),
          max_amount: Number(editMaxAmount)
        }
      );

      if (res.data && res.data.success) {
        setSnackbar({
          open: true,
          message: `Vendor '${editRetailerDisplayName}' updated successfully.`,
          severity: "success"
        });
        setEditVendorOpen(false);
        await fetchCompanies();
      }
    } catch (e: any) {
      setEditError(e?.response?.data?.detail || "Failed to update vendor.");
    } finally {
      setEditSaving(false);
    }
  };

  // Open Toggle Vendor Status Dialog
  const handleOpenToggleVendor = (company: CompanyItem, vendor: CompanyVendor) => {
    setToggleTargetCompany(company);
    setToggleTargetVendor(vendor);
    setToggleVendorOpen(true);
  };

  // Confirm Toggle Vendor Status
  const handleConfirmToggleVendor = async () => {
    if (!toggleTargetVendor) return;
    try {
      setToggleSaving(true);
      const res = await apiClient.post(
        `/api/v1/admin/payin/gateways/${toggleTargetVendor.payin_company_vendor_ref_id}/toggle-status`
      );

      if (res.data && res.data.success) {
        setSnackbar({
          open: true,
          message: res.data.message || `Vendor status updated successfully.`,
          severity: "success"
        });
        setToggleVendorOpen(false);
        await fetchCompanies();
      }
    } catch (e: any) {
      setSnackbar({
        open: true,
        message: e?.response?.data?.detail || "Failed to toggle vendor status.",
        severity: "error"
      });
      setToggleVendorOpen(false);
    } finally {
      setToggleSaving(false);
    }
  };

  // Open Company Limits Dialog
  const handleOpenEditLimits = (company: CompanyItem) => {
    setTargetCompanyForLimits(company);
    setLimitMinAmount(Number(company.min_amount) || 10);
    setLimitMaxAmount(Number(company.max_amount) || 500000);
    setLimitDailyAmt(Number(company.daily_amt_limit) || 2000000);
    setLimitDailyTxn(Number(company.daily_txn_limit) || 500);
    setLimitsError(null);
    setLimitsOpen(true);
  };

  // Save Company Limits
  const handleSaveLimits = async () => {
    if (!targetCompanyForLimits) return;
    if (Number(limitMinAmount) <= 0) {
      setLimitsError("Min Amount must be greater than zero.");
      return;
    }
    if (Number(limitMaxAmount) < Number(limitMinAmount)) {
      setLimitsError("Max Amount must be greater than or equal to Min Amount.");
      return;
    }

    try {
      setLimitsSaving(true);
      setLimitsError(null);
      const res = await apiClient.post(
        `/api/v1/admin/payin/companies/${targetCompanyForLimits.company_ref_id}/limits`,
        {
          min_amount: Number(limitMinAmount),
          max_amount: Number(limitMaxAmount),
          daily_amt_limit: Number(limitDailyAmt),
          daily_txn_limit: Number(limitDailyTxn)
        }
      );

      if (res.data && res.data.success) {
        setSnackbar({
          open: true,
          message: `PayIn limits updated for ${targetCompanyForLimits.company_name}.`,
          severity: "success"
        });
        setLimitsOpen(false);
        await fetchCompanies();
      }
    } catch (e: any) {
      setLimitsError(e?.response?.data?.detail || "Failed to update company limits.");
    } finally {
      setLimitsSaving(false);
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
          {branding?.company_name && (
            <Chip
              label={branding.company_name}
              size="small"
              sx={{
                fontWeight: 700,
                bgcolor: branding.primary_colour ? `${branding.primary_colour}15` : "rgba(5, 150, 105, 0.1)",
                color: branding.primary_colour || "#059669",
                border: "1px solid",
                borderColor: branding.primary_colour ? `${branding.primary_colour}40` : "rgba(5, 150, 105, 0.3)",
                fontSize: "0.75rem"
              }}
            />
          )}
        </Stack>
        <Stack direction="row" spacing={1.5}>
          <Button
            component={Link}
            href="/admin/payin/policy"
            variant="contained"
            color="primary"
            startIcon={<ShieldIcon />}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            Manage Pricing Policy
          </Button>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchCompanies}>
            Refresh
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: "center" }}><CircularProgress /></Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: "grey.50" }}>
              <TableRow>
                <TableCell sx={{ width: 48 }} />
                <TableCell><strong>Company Ref ID</strong></TableCell>
                <TableCell><strong>Company Name</strong></TableCell>
                <TableCell><strong>Code</strong></TableCell>
                <TableCell><strong>Min / Max (₹)</strong></TableCell>
                <TableCell><strong>Daily Limit (₹)</strong></TableCell>
                <TableCell><strong>Customer Payable Policy</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell align="center"><strong>PayIn Enabled</strong></TableCell>
                <TableCell align="center"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {companies.map((c) => {
                const isExpanded = !!expandedCompanies[c.company_ref_id];
                const vendorList = c.vendors || [];
                return (
                  <React.Fragment key={c.company_ref_id}>
                    <TableRow hover sx={{ "& > *": { borderBottom: isExpanded ? "unset" : undefined } }}>
                      <TableCell>
                        <IconButton
                          aria-label="expand row"
                          size="small"
                          onClick={() => toggleExpand(c.company_ref_id)}
                        >
                          {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Chip label={`Ref #${c.company_ref_id}`} size="small" />
                      </TableCell>
                      <TableCell>
                        <strong>{c.company_name}</strong>
                      </TableCell>
                      <TableCell>{c.company_code}</TableCell>
                      <TableCell>
                        ₹{Number(c.min_amount).toLocaleString()} - ₹{Number(c.max_amount).toLocaleString()}
                      </TableCell>
                      <TableCell>₹{Number(c.daily_amt_limit).toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip
                          label={c.customer_payable_policy === "WITH_MDR" ? "Customer Pays MDR" : "Retailer Bears MDR"}
                          color={c.customer_payable_policy === "WITH_MDR" ? "primary" : "warning"}
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
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
                          onChange={() => handleToggleCompany(c.company_ref_id, c.payin_enabled)}
                          color="primary"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Tooltip title="Add Vendor to this Company">
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<AddIcon />}
                              onClick={() => handleOpenAddVendor(c)}
                              sx={{ textTransform: "none", fontWeight: 600, py: 0.5 }}
                            >
                              Add Vendor
                            </Button>
                          </Tooltip>
                          <Tooltip title="Edit Company Limits">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleOpenEditLimits(c)}
                            >
                              <TuneIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>

                    {/* Collapsible Vendors Grid for this Company */}
                    <TableRow>
                      <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={10}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ py: 2, px: 3, bgcolor: "grey.50", borderRadius: 1, my: 1 }}>
                            <Stack
                              direction="row"
                              alignItems="center"
                              justifyContent="space-between"
                              sx={{ mb: 1.5 }}
                            >
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <AccountBalanceIcon fontSize="small" color="primary" />
                                <Typography variant="subtitle2" fontWeight={700}>
                                  Payment Gateways & Vendors for {c.company_name} ({vendorList.length})
                                </Typography>
                              </Stack>
                              <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                startIcon={<AddIcon />}
                                onClick={() => handleOpenAddVendor(c)}
                                sx={{ textTransform: "none", fontWeight: 600 }}
                              >
                                Add New Vendor
                              </Button>
                            </Stack>

                            {vendorList.length === 0 ? (
                              <Alert severity="info" sx={{ my: 1 }}>
                                No payment gateways or vendors mapped to this company yet. Click &quot;Add New Vendor&quot; to assign one.
                              </Alert>
                            ) : (
                              <Paper variant="outlined" sx={{ overflow: "hidden" }}>
                                <Table size="small">
                                  <TableHead sx={{ bgcolor: "background.paper" }}>
                                    <TableRow>
                                      <TableCell><strong>Gateway Code</strong></TableCell>
                                      <TableCell><strong>Retailer Display Name</strong></TableCell>
                                      <TableCell><strong>Internal Provider</strong></TableCell>
                                      <TableCell><strong>Min / Max (₹)</strong></TableCell>
                                      <TableCell><strong>Display Order</strong></TableCell>
                                      <TableCell><strong>Status</strong></TableCell>
                                      <TableCell align="center"><strong>Active</strong></TableCell>
                                      <TableCell align="center"><strong>Actions</strong></TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {vendorList.map((v) => (
                                      <TableRow key={v.payin_company_vendor_ref_id} hover>
                                        <TableCell>
                                          <Chip label={v.gateway_code} size="small" color="primary" variant="outlined" />
                                        </TableCell>
                                        <TableCell>
                                          <strong>{v.retailer_display_name}</strong>
                                        </TableCell>
                                        <TableCell>
                                          {v.vendor_name} ({v.vendor_code})
                                        </TableCell>
                                        <TableCell>
                                          ₹{Number(v.min_amount).toLocaleString()} - ₹{Number(v.max_amount).toLocaleString()}
                                        </TableCell>
                                        <TableCell>{v.display_order}</TableCell>
                                        <TableCell>
                                          <Chip
                                            label={v.status}
                                            color={v.status === "ACTIVE" ? "success" : "default"}
                                            size="small"
                                            sx={{ fontWeight: 600 }}
                                          />
                                        </TableCell>
                                        <TableCell align="center">
                                          <Switch
                                            size="small"
                                            checked={v.status === "ACTIVE" && v.is_enabled}
                                            onChange={() => handleOpenToggleVendor(c, v)}
                                            color="success"
                                          />
                                        </TableCell>
                                        <TableCell align="center">
                                          <Stack direction="row" spacing={0.5} justifyContent="center">
                                            <Tooltip title="Edit Vendor Configuration">
                                              <IconButton
                                                size="small"
                                                color="primary"
                                                onClick={() => handleOpenEditVendor(c, v)}
                                              >
                                                <EditIcon fontSize="small" />
                                              </IconButton>
                                            </Tooltip>
                                            <Tooltip title={v.status === "ACTIVE" ? "Deactivate Vendor" : "Activate Vendor"}>
                                              <IconButton
                                                size="small"
                                                color={v.status === "ACTIVE" ? "error" : "success"}
                                                onClick={() => handleOpenToggleVendor(c, v)}
                                              >
                                                <PowerSettingsNewIcon fontSize="small" />
                                              </IconButton>
                                            </Tooltip>
                                          </Stack>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </Paper>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* ── ADD VENDOR DIALOG ── */}
      <Dialog open={addVendorOpen} onClose={() => !addSaving && setAddVendorOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Add Payment Vendor to {selectedCompanyForAdd?.company_name}
        </DialogTitle>
        <DialogContent dividers>
          {addError && <Alert severity="error" sx={{ mb: 2 }}>{addError}</Alert>}
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel id="vendor-select-label">Payment Vendor Provider</InputLabel>
              <Select
                labelId="vendor-select-label"
                label="Payment Vendor Provider"
                value={addVendorId}
                onChange={(e) => setAddVendorId(Number(e.target.value))}
              >
                {vendorCatalog.map((v) => (
                  <MenuItem key={v.payin_vendor_ref_id} value={v.payin_vendor_ref_id}>
                    {v.vendor_name} ({v.vendor_code}) - {v.provider_name} [{v.vendor_status}]
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Stack direction="row" spacing={2}>
              <TextField
                label="Gateway Code"
                value={addGatewayCode}
                onChange={(e) => setAddGatewayCode(e.target.value.toUpperCase())}
                placeholder="e.g. G-1, G-2"
                fullWidth
                required
              />
              <TextField
                label="Display Order"
                type="number"
                value={addDisplayOrder}
                onChange={(e) => setAddDisplayOrder(Number(e.target.value))}
                fullWidth
                required
              />
            </Stack>

            <TextField
              label="Retailer Display Name"
              value={addRetailerDisplayName}
              onChange={(e) => setAddRetailerDisplayName(e.target.value)}
              placeholder="e.g. Gateway G-1, Instant UPI & Cards"
              fullWidth
              required
            />

            <TextField
              label="Description"
              value={addDescription}
              onChange={(e) => setAddDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />

            <Stack direction="row" spacing={2}>
              <TextField
                label="Min Amount (₹)"
                type="number"
                value={addMinAmount}
                onChange={(e) => setAddMinAmount(Number(e.target.value))}
                fullWidth
                required
              />
              <TextField
                label="Max Amount (₹)"
                type="number"
                value={addMaxAmount}
                onChange={(e) => setAddMaxAmount(Number(e.target.value))}
                fullWidth
                required
              />
            </Stack>

            <FormControl fullWidth>
              <InputLabel id="add-status-label">Initial Status</InputLabel>
              <Select
                labelId="add-status-label"
                label="Initial Status"
                value={addStatus}
                onChange={(e) => setAddStatus(e.target.value)}
              >
                <MenuItem value="ACTIVE">ACTIVE</MenuItem>
                <MenuItem value="INACTIVE">INACTIVE</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAddVendorOpen(false)} disabled={addSaving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveAddVendor}
            disabled={addSaving}
            sx={{ fontWeight: 700 }}
          >
            {addSaving ? "Saving..." : "Add Vendor"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── EDIT VENDOR DIALOG ── */}
      <Dialog open={editVendorOpen} onClose={() => !editSaving && setEditVendorOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Edit Gateway: {editingVendor?.retailer_display_name} ({selectedCompanyForEdit?.company_name})
        </DialogTitle>
        <DialogContent dividers>
          {editError && <Alert severity="error" sx={{ mb: 2 }}>{editError}</Alert>}
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Provider (Immutable)"
              value={`${editingVendor?.vendor_name} (${editingVendor?.vendor_code})`}
              fullWidth
              disabled
            />

            <Stack direction="row" spacing={2}>
              <TextField
                label="Gateway Code (Immutable)"
                value={editingVendor?.gateway_code || ""}
                fullWidth
                disabled
              />
              <TextField
                label="Display Order"
                type="number"
                value={editDisplayOrder}
                onChange={(e) => setEditDisplayOrder(Number(e.target.value))}
                fullWidth
                required
              />
            </Stack>

            <TextField
              label="Retailer Display Name"
              value={editRetailerDisplayName}
              onChange={(e) => setEditRetailerDisplayName(e.target.value)}
              fullWidth
              required
            />

            <TextField
              label="Description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />

            <Stack direction="row" spacing={2}>
              <TextField
                label="Min Amount (₹)"
                type="number"
                value={editMinAmount}
                onChange={(e) => setEditMinAmount(Number(e.target.value))}
                fullWidth
                required
              />
              <TextField
                label="Max Amount (₹)"
                type="number"
                value={editMaxAmount}
                onChange={(e) => setEditMaxAmount(Number(e.target.value))}
                fullWidth
                required
              />
            </Stack>

            <FormControl fullWidth>
              <InputLabel id="edit-status-label">Status</InputLabel>
              <Select
                labelId="edit-status-label"
                label="Status"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
              >
                <MenuItem value="ACTIVE">ACTIVE</MenuItem>
                <MenuItem value="INACTIVE">INACTIVE</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditVendorOpen(false)} disabled={editSaving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveEditVendor}
            disabled={editSaving}
            sx={{ fontWeight: 700 }}
          >
            {editSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── TOGGLE VENDOR STATUS CONFIRMATION DIALOG ── */}
      <Dialog open={toggleVendorOpen} onClose={() => !toggleSaving && setToggleVendorOpen(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {toggleTargetVendor?.status === "ACTIVE" ? "Deactivate Vendor Gateway" : "Activate Vendor Gateway"}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body1">
            Are you sure you want to <strong>{toggleTargetVendor?.status === "ACTIVE" ? "deactivate" : "activate"}</strong> gateway{" "}
            <strong>{toggleTargetVendor?.retailer_display_name}</strong> for company{" "}
            <strong>{toggleTargetCompany?.company_name}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            {toggleTargetVendor?.status === "ACTIVE"
              ? "Deactivating this gateway will prevent retailers from initiating new transactions through it. Existing transaction history is preserved."
              : "Activating this gateway will make it available to retailers during checkout."}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setToggleVendorOpen(false)} disabled={toggleSaving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={toggleTargetVendor?.status === "ACTIVE" ? "error" : "success"}
            onClick={handleConfirmToggleVendor}
            disabled={toggleSaving}
            sx={{ fontWeight: 700 }}
          >
            {toggleSaving ? "Updating..." : toggleTargetVendor?.status === "ACTIVE" ? "Deactivate" : "Activate"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── EDIT COMPANY LIMITS DIALOG ── */}
      <Dialog open={limitsOpen} onClose={() => !limitsSaving && setLimitsOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Edit PayIn Limits: {targetCompanyForLimits?.company_name}
        </DialogTitle>
        <DialogContent dividers>
          {limitsError && <Alert severity="error" sx={{ mb: 2 }}>{limitsError}</Alert>}
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Min Transaction Amount (₹)"
              type="number"
              value={limitMinAmount}
              onChange={(e) => setLimitMinAmount(Number(e.target.value))}
              fullWidth
              required
            />
            <TextField
              label="Max Transaction Amount (₹)"
              type="number"
              value={limitMaxAmount}
              onChange={(e) => setLimitMaxAmount(Number(e.target.value))}
              fullWidth
              required
            />
            <Divider />
            <TextField
              label="Daily Amount Limit (₹)"
              type="number"
              value={limitDailyAmt}
              onChange={(e) => setLimitDailyAmt(Number(e.target.value))}
              fullWidth
              required
            />
            <TextField
              label="Daily Transaction Count Limit"
              type="number"
              value={limitDailyTxn}
              onChange={(e) => setLimitDailyTxn(Number(e.target.value))}
              fullWidth
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setLimitsOpen(false)} disabled={limitsSaving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveLimits}
            disabled={limitsSaving}
            sx={{ fontWeight: 700 }}
          >
            {limitsSaving ? "Saving..." : "Update Limits"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
