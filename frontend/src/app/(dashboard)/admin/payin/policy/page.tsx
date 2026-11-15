"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Box, Paper, Typography, Button, Stack, Alert, CircularProgress,
  Chip, Radio, FormControl, Divider, Grid, TextField
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";
import SaveIcon from "@mui/icons-material/Save";
import ShieldCheckIcon from "@mui/icons-material/Shield";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import BuildingIcon from "@mui/icons-material/AccountBalance";
import PersonIcon from "@mui/icons-material/Person";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CalculateIcon from "@mui/icons-material/Calculate";
import { apiClient } from "@/lib/api";

interface PolicyData {
  company_ref_id: number;
  company_name: string;
  company_code: string;
  policy: string;
  display_name: string;
  option: string;
  description: string;
  mdr_treatment: string;
  updated_by?: string | null;
  updated_at?: string | null;
  available_policies: {
    policy: string;
    display_name: string;
    option: string;
    description: string;
    mdr_treatment: string;
  }[];
}

interface MdrPreviewData {
  success: boolean;
  txn_amount: number;
  mdr_pct: number;
  mdr_fixed: number;
  mdr_amount: number;
  tax_pct: number;
  tax_amount: number;
  total_charges: number;
  customer_payable: number;
  retailer_credit: number;
  company_mdr_liability: number;
  mdr_treatment: string;
  rule_ref_id?: number | null;
  vendor_name?: string | null;
  customer_payable_policy?: string | null;
  policy_display_name?: string | null;
}

export default function AdminPayinPolicyPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [policyData, setPolicyData] = useState<PolicyData | null>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<string>("WITH_MDR");

  // Simulator State (Default 56,320)
  const [simAmount, setSimAmount] = useState<string>("56320");
  const [simPreview, setSimPreview] = useState<MdrPreviewData | null>(null);
  const [simLoading, setSimLoading] = useState<boolean>(false);

  const fetchPolicy = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get("/api/v1/admin/payin/policy");
      if (res.data && res.data.success) {
        setPolicyData(res.data);
        setSelectedPolicy(res.data.policy);
      }
    } catch (e: any) {
      console.error("Failed to load policy:", e);
      setError(e?.response?.data?.detail || "Failed to load Customer Payable Amount Policy.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicy();
  }, [fetchPolicy]);

  const runSimulation = useCallback(async () => {
    const amt = parseFloat(simAmount);
    if (!amt || isNaN(amt) || amt <= 0) return;
    try {
      setSimLoading(true);
      const res = await apiClient.post("/api/v1/payin/mdr/preview", {
        amount: amt,
        service_type_code: "UTILITY",
        payment_mode_code: "CARD"
      });
      if (res.data) {
        setSimPreview(res.data);
      }
    } catch (e) {
      console.error("Simulation preview failed:", e);
    } finally {
      setSimLoading(false);
    }
  }, [simAmount]);

  useEffect(() => {
    if (!loading && policyData) {
      runSimulation();
    }
  }, [loading, policyData, runSimulation]);

  const handleSave = async () => {
    if (!policyData) return;
    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);
      const res = await apiClient.post("/api/v1/admin/payin/policy", {
        company_ref_id: policyData.company_ref_id,
        policy: selectedPolicy
      });
      if (res.data && res.data.success) {
        setPolicyData(res.data);
        setSelectedPolicy(res.data.policy);
        setSuccessMsg(
          `Pricing policy updated successfully to "${res.data.display_name}". New transactions will immediately follow this policy.`
        );
        runSimulation();
      }
    } catch (e: any) {
      console.error("Failed to save policy:", e);
      setError(e?.response?.data?.detail || "Failed to update policy.");
    } finally {
      setSaving(false);
    }
  };

  const formatTimestamp = (ts?: string | null) => {
    if (!ts) return "Default / Initialized";
    try {
      const d = new Date(ts);
      return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    } catch {
      return ts;
    }
  };

  const hasUnsavedChanges = Boolean(policyData && selectedPolicy !== policyData.policy);

  // Dynamic preview numbers
  const topupAmt = simPreview ? simPreview.txn_amount : parseFloat(simAmount) || 0;
  const totalCharges = simPreview ? simPreview.total_charges : 0;

  // Active view numbers according to current selected option
  const activeCustPayable = selectedPolicy === "WITH_MDR" ? topupAmt + totalCharges : topupAmt;
  const activeRetailerCredit = selectedPolicy === "WITH_MDR" ? topupAmt : Math.max(0, topupAmt - totalCharges);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: "auto" }}>
      {/* ── Top Header Toolbar ── */}
      <Box sx={{ mb: 4 }}>
        {/* Back navigation */}
        <Box sx={{ mb: 1 }}>
          <Button
            component={Link}
            href="/admin/payin/dashboard"
            startIcon={<ArrowBackIcon />}
            variant="text"
            sx={{ fontWeight: 600, color: "text.secondary", p: 0, minWidth: 0, "&:hover": { bgcolor: "transparent" } }}
          >
            Dashboard
          </Button>
        </Box>

        {/* Title row and right-aligned actions */}
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
          gap={2}
        >
          {/* Dedicated Title and Subtitle Area */}
          <Box sx={{ maxWidth: { xs: "100%", md: "700px" } }}>
            <Typography variant="h5" fontWeight="800" sx={{ color: "#0F172A", display: "flex", alignItems: "center", gap: 1 }}>
              <ShieldCheckIcon sx={{ color: "#2563EB", fontSize: 28 }} />
              Customer Payable Amount Policy
              {hasUnsavedChanges && (
                <Chip
                  label="Unsaved Changes"
                  size="small"
                  color="warning"
                  sx={{ fontWeight: 700, fontSize: "11px", height: 22, ml: 1 }}
                />
              )}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Centralized Admin pricing policy controlling MDR charge allocation and retailer wallet credits
            </Typography>
          </Box>

          {/* Right-aligned Consolidated Action Area */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchPolicy}
              disabled={loading || saving}
              sx={{ textTransform: "none", fontWeight: 600, width: { xs: "100%", sm: "auto" } }}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
              onClick={handleSave}
              disabled={loading || saving || !hasUnsavedChanges}
              sx={{ textTransform: "none", fontWeight: 700, px: 3, boxShadow: 2, width: { xs: "100%", sm: "auto" } }}
            >
              {saving ? "Saving Policy..." : "Save Policy"}
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* ── Feedback Alerts ── */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      {successMsg && (
        <Alert severity="success" icon={<CheckCircleIcon />} onClose={() => setSuccessMsg(null)} sx={{ mb: 3 }}>
          {successMsg}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ p: 8, textAlign: "center" }}>
          <CircularProgress size={48} />
          <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
            Loading company financial policy configuration...
          </Typography>
        </Box>
      ) : policyData ? (
        <Grid container spacing={3}>
          {/* ── Left Column: Policy Configuration Card ── */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, bgcolor: "#FFFFFF", mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="800" sx={{ color: "#0F172A", mb: 0.5 }}>
                Select Active Pricing Policy
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Choose whether MDR charges are borne by the customer or absorbed by the retailer.
              </Typography>

              <FormControl component="fieldset" fullWidth>
                <Stack spacing={2}>
                  {/* OPTION A: WITH MDR (Restored Existing Color Codes) */}
                  <Paper
                    variant="outlined"
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedPolicy("WITH_MDR")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedPolicy("WITH_MDR");
                      }
                    }}
                    sx={{
                      p: 2.5,
                      borderRadius: 2.5,
                      cursor: "pointer",
                      transition: "all 0.2s ease-in-out",
                      borderColor: selectedPolicy === "WITH_MDR" ? "#2563EB" : "#E2E8F0",
                      bgcolor: selectedPolicy === "WITH_MDR" ? "#EFF6FF" : "#F8FAFC",
                      borderWidth: selectedPolicy === "WITH_MDR" ? 2 : 1,
                      outline: "none",
                      "&:hover": { borderColor: "#2563EB" },
                      "&:focus-visible": { boxShadow: "0 0 0 2px #2563EB" }
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                      <Radio
                        value="WITH_MDR"
                        checked={selectedPolicy === "WITH_MDR"}
                        onChange={() => setSelectedPolicy("WITH_MDR")}
                        sx={{ p: 0.5, mt: 0.2 }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                          <Typography variant="subtitle1" fontWeight="800" sx={{ color: "#1E3A8A" }}>
                            Customer Pays MDR Charges
                          </Typography>
                          <Chip label="OPTION A: WITH MDR" size="small" color="primary" sx={{ fontWeight: 700 }} />
                        </Box>
                        <Typography variant="body2" sx={{ color: "#334155", mb: 1.5 }}>
                          Customer pays top-up amount plus applicable MDR and GST. Full eligible top-up amount is credited to the retailer wallet.
                        </Typography>
                        <Box sx={{ bgcolor: "#DBEAFE", p: 1.5, borderRadius: 1.5, display: "flex", flexDirection: "column", gap: 0.5 }}>
                          <Typography variant="caption" sx={{ color: "#1E40AF", fontWeight: 700 }}>
                            • Customer Payable: Top-Up Amount + Applicable Charges (MDR + GST)
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#166534", fontWeight: 700 }}>
                            • Retailer Wallet Credit: 100% Full Top-Up Amount (Zero Deductions)
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Paper>

                  {/* OPTION B: WITHOUT MDR (Restored Existing Color Codes) */}
                  <Paper
                    variant="outlined"
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedPolicy("WITHOUT_MDR")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedPolicy("WITHOUT_MDR");
                      }
                    }}
                    sx={{
                      p: 2.5,
                      borderRadius: 2.5,
                      cursor: "pointer",
                      transition: "all 0.2s ease-in-out",
                      borderColor: selectedPolicy === "WITHOUT_MDR" ? "#D97706" : "#E2E8F0",
                      bgcolor: selectedPolicy === "WITHOUT_MDR" ? "#FFFBEB" : "#F8FAFC",
                      borderWidth: selectedPolicy === "WITHOUT_MDR" ? 2 : 1,
                      outline: "none",
                      "&:hover": { borderColor: "#D97706" },
                      "&:focus-visible": { boxShadow: "0 0 0 2px #D97706" }
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                      <Radio
                        value="WITHOUT_MDR"
                        checked={selectedPolicy === "WITHOUT_MDR"}
                        onChange={() => setSelectedPolicy("WITHOUT_MDR")}
                        sx={{
                          p: 0.5,
                          mt: 0.2,
                          color: "#D97706",
                          "&.Mui-checked": { color: "#D97706" }
                        }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                          <Typography variant="subtitle1" fontWeight="800" sx={{ color: "#92400E" }}>
                            Retailer Bears MDR Charges
                          </Typography>
                          <Chip label="OPTION B: WITHOUT MDR" size="small" sx={{ bgcolor: "#FEF3C7", color: "#92400E", fontWeight: 700 }} />
                        </Box>
                        <Typography variant="body2" sx={{ color: "#334155", mb: 1.5 }}>
                          Customer pays only the top-up amount. Applicable MDR and GST are handled according to the existing retailer-borne charge calculation.
                        </Typography>
                        <Box sx={{ bgcolor: "#FEF3C7", p: 1.5, borderRadius: 1.5, display: "flex", flexDirection: "column", gap: 0.5 }}>
                          <Typography variant="caption" sx={{ color: "#92400E", fontWeight: 700 }}>
                            • Customer Payable: Only Top-Up Amount (Exact face value)
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#B45309", fontWeight: 700 }}>
                            • Retailer Wallet Credit: Top-Up Amount − Applicable Charges (MDR + GST)
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Paper>
                </Stack>
              </FormControl>
            </Paper>
          </Grid>

          {/* ── Right Column: Scope & Live Simulator (Restored Existing Color Codes) ── */}
          <Grid size={{ xs: 12, md: 5 }}>
            {/* Scope & Audit Card */}
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, bgcolor: "#FFFFFF", mb: 3 }}>
              <Typography variant="subtitle2" fontWeight="700" sx={{ color: "text.secondary", textTransform: "uppercase", tracking: "wider", mb: 2 }}>
                Policy Scope & Governance
              </Typography>

              <Stack spacing={2}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <BuildingIcon sx={{ color: "#64748B", fontSize: 20 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Application Scope</Typography>
                    <Typography variant="body2" fontWeight="700" sx={{ color: "#0F172A" }}>
                      {policyData.company_name} ({policyData.company_code}) — Ref #{policyData.company_ref_id}
                    </Typography>
                  </Box>
                </Box>

                <Divider />

                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <ShieldCheckIcon sx={{ color: "#64748B", fontSize: 20 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Currently Active Policy</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip
                        label={policyData.display_name}
                        color={policyData.policy === "WITH_MDR" ? "primary" : "warning"}
                        size="small"
                        sx={{ fontWeight: 700 }}
                      />
                    </Box>
                  </Box>
                </Box>

                <Divider />

                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <PersonIcon sx={{ color: "#64748B", fontSize: 20 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Authorized Administrator</Typography>
                    <Typography variant="body2" fontWeight="600" sx={{ color: "#0F172A" }}>
                      {policyData.updated_by || "System Administrator"}
                    </Typography>
                  </Box>
                </Box>

                <Divider />

                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <AccessTimeIcon sx={{ color: "#64748B", fontSize: 20 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Last Updated Timestamp</Typography>
                    <Typography variant="body2" fontWeight="600" sx={{ color: "#0F172A" }}>
                      {formatTimestamp(policyData.updated_at)}
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </Paper>

            {/* Live Calculation Preview Card (Restored Existing Color Codes) */}
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, bgcolor: "#F8FAFC" }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="800" sx={{ color: "#0F172A", display: "flex", alignItems: "center", gap: 1 }}>
                  <CalculateIcon sx={{ color: "#2563EB", fontSize: 20 }} />
                  Live Policy Calculator Preview
                </Typography>
                <Chip label="Backend Authoritative" size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: "10px" }} />
              </Box>

              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                <TextField
                  size="small"
                  type="number"
                  label="Test Top-Up (₹)"
                  value={simAmount}
                  onChange={(e) => setSimAmount(e.target.value)}
                  sx={{ width: 150 }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => runSimulation()}
                  disabled={simLoading}
                  sx={{ textTransform: "none", fontWeight: 600 }}
                >
                  Recalculate
                </Button>
              </Stack>

              {/* Quick Preset Buttons */}
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
                {["5000", "10000", "56320", "100000"].map((preset) => (
                  <Chip
                    key={preset}
                    label={`₹${Number(preset).toLocaleString("en-IN")}`}
                    size="small"
                    clickable
                    onClick={() => setSimAmount(preset)}
                    color={simAmount === preset ? "primary" : "default"}
                    variant={simAmount === preset ? "filled" : "outlined"}
                    sx={{ fontSize: "11px", fontWeight: 600 }}
                  />
                ))}
              </Box>

              {simLoading ? (
                <Box sx={{ p: 3, textAlign: "center" }}>
                  <CircularProgress size={24} />
                </Box>
              ) : simPreview ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="body2" color="text.secondary">Top-up Amount</Typography>
                    <Typography variant="body2" fontWeight="700">₹{simPreview.txn_amount?.toFixed(2)}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="body2" color="text.secondary">MDR Fee ({(simPreview.mdr_pct * 100).toFixed(2)}%)</Typography>
                    <Typography variant="body2" fontWeight="600">₹{simPreview.mdr_amount?.toFixed(2)}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="body2" color="text.secondary">GST (18% on MDR)</Typography>
                    <Typography variant="body2" fontWeight="600">₹{simPreview.tax_amount?.toFixed(2)}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="body2" color="text.secondary">Total Charges</Typography>
                    <Typography variant="body2" fontWeight="600">₹{simPreview.total_charges?.toFixed(2)}</Typography>
                  </Box>

                  <Divider sx={{ my: 0.5 }} />

                  {/* Restored Existing Customer Payable & Expected Wallet Credit Cards */}
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "#EFF6FF", p: 1.5, borderRadius: 2 }}>
                    <Box>
                      <Typography variant="body2" fontWeight="700" sx={{ color: "#1E3A8A" }}>
                        Customer Payable
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#1E40AF" }}>
                        {selectedPolicy === "WITH_MDR" ? "Top-Up + Charges" : "Top-Up Only"}
                      </Typography>
                    </Box>
                    <Typography variant="subtitle1" fontWeight="800" sx={{ color: "#2563EB" }}>
                      ₹{activeCustPayable.toFixed(2)}
                    </Typography>
                  </Box>

                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "#F0FDF4", p: 1.5, borderRadius: 2 }}>
                    <Box>
                      <Typography variant="body2" fontWeight="700" sx={{ color: "#166534" }}>
                        Expected Wallet Credit
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#15803D" }}>
                        {selectedPolicy === "WITH_MDR" ? "100% Full Top-Up" : "Top-Up Deducted"}
                      </Typography>
                    </Box>
                    <Typography variant="subtitle1" fontWeight="800" sx={{ color: "#16A34A" }}>
                      ₹{activeRetailerCredit.toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              ) : null}
            </Paper>
          </Grid>
        </Grid>
      ) : null}
    </Box>
  );
}
