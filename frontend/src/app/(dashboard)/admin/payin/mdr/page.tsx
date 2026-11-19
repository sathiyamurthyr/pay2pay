"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Paper, Table, TableBody, TableCell, TableHead,
  TableRow, Button, Alert, CircularProgress, Chip, TextField,
  MenuItem, Divider, Switch, InputAdornment,
  Select, FormControl, InputLabel
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import TuneIcon from "@mui/icons-material/Tune";
import Link from "next/link";
import { apiClient } from "@/lib/api";

interface CompanyItem {
  company_ref_id: number;
  company_name: string;
  company_code: string;
}

interface GatewayItem {
  payin_company_vendor_ref_id: number;
  company_ref_id: number;
  payin_vendor_ref_id: number;
  gateway_code: string;
  retailer_display_name: string;
  internal_provider_name?: string;
  vendor_code?: string;
  status: string;
  is_enabled: boolean;
}

interface CardMdrSchemeItem {
  id: string;
  name: string;
  category: string;
  card_network: string;
  mdr_percent: number | null;
  mdr_display: string;
  is_enabled: boolean;
  is_configured: boolean;
  mdr_treatment: string;
  brand_color: string;
  icon_text: string;
  rule_ref_id: number | null;
  updated_by?: string | null;
  updated_at?: string | null;
}

export default function AdminPayinMdrPage() {
  // Global & Rules Matrix state
  const [rules, setRules] = useState<any[]>([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Company & Gateway Selection
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(2);
  const [gateways, setGateways] = useState<GatewayItem[]>([]);
  const [selectedGatewayCode, setSelectedGatewayCode] = useState<string>("G-1");

  // Card Scheme MDR Matrix State
  const [cardSchemes, setCardSchemes] = useState<CardMdrSchemeItem[]>([]);
  const [loadingSchemes, setLoadingSchemes] = useState(false);
  const [editMdrValues, setEditMdrValues] = useState<{ [network: string]: string }>({});
  const [editActiveStates, setEditActiveStates] = useState<{ [network: string]: boolean }>({});
  const [validationErrors, setValidationErrors] = useState<{ [network: string]: string }>({});
  const [savingNetwork, setSavingNetwork] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Simulator State
  const [simAmount, setSimAmount] = useState<string>("10000");
  const [simResult, setSimResult] = useState<any | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  // 1. Fetch Companies list
  const fetchCompanies = useCallback(async () => {
    try {
      const res = await apiClient.get("/api/v1/admin/payin/companies");
      if (res.data && res.data.success) {
        const comps: CompanyItem[] = res.data.companies || [];
        setCompanies(comps);
        if (comps.length > 0 && !comps.some(c => c.company_ref_id === selectedCompanyId)) {
          setSelectedCompanyId(comps[0].company_ref_id);
        }
      }
    } catch (e: any) {
      console.warn("Could not fetch companies list:", e);
    }
  }, [selectedCompanyId]);

  // 2. Fetch Gateways for selected company
  const fetchGatewaysForCompany = useCallback(async (compId: number) => {
    try {
      const res = await apiClient.get(`/api/v1/admin/payin/gateways?company_ref_id=${compId}`);
      if (res.data && res.data.success) {
        const gws: GatewayItem[] = res.data.gateways || [];
        setGateways(gws);
        if (gws.length > 0) {
          if (!gws.some(g => g.gateway_code === selectedGatewayCode)) {
            setSelectedGatewayCode(gws[0].gateway_code);
          }
        }
      }
    } catch (e: any) {
      console.warn("Could not fetch gateways for company:", e);
    }
  }, [selectedGatewayCode]);

  // 3. Fetch Card Schemes & Applicable MDR for Company + Gateway
  const fetchCardMdrSchemes = useCallback(async (compId: number, gCode: string) => {
    try {
      setLoadingSchemes(true);
      setActionFeedback(null);
      const res = await apiClient.get(`/api/v1/admin/payin/company-card-mdr?company_ref_id=${compId}&gateway_code=${gCode}`);
      if (res.data && res.data.success) {
        const schemes: CardMdrSchemeItem[] = res.data.card_schemes || [];
        setCardSchemes(schemes);

        const initialInputs: { [network: string]: string } = {};
        const initialActives: { [network: string]: boolean } = {};
        schemes.forEach((s) => {
          initialInputs[s.card_network] = s.mdr_percent !== null && s.mdr_percent !== undefined ? s.mdr_percent.toString() : "";
          initialActives[s.card_network] = s.is_enabled;
        });
        setEditMdrValues(initialInputs);
        setEditActiveStates(initialActives);
        setValidationErrors({});
      }
    } catch (e: any) {
      console.error("Failed to load card MDR schemes:", e);
      setActionFeedback({
        type: "error",
        text: e?.response?.data?.detail || "Failed to load Card Scheme MDR configuration."
      });
    } finally {
      setLoadingSchemes(false);
    }
  }, []);

  // 4. Fetch Full Dynamic MDR rules matrix
  const fetchRules = async () => {
    try {
      setLoadingRules(true);
      setError(null);
      const res = await apiClient.get(`/api/v1/admin/payin/mdr?company_ref_id=${selectedCompanyId}`);
      if (res.data && res.data.success) {
        setRules(res.data.rules || []);
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load MDR rules.");
    } finally {
      setLoadingRules(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchGatewaysForCompany(selectedCompanyId);
      fetchRules();
    }
  }, [selectedCompanyId, fetchGatewaysForCompany]);

  useEffect(() => {
    if (selectedCompanyId && selectedGatewayCode) {
      fetchCardMdrSchemes(selectedCompanyId, selectedGatewayCode);
    }
  }, [selectedCompanyId, selectedGatewayCode, fetchCardMdrSchemes]);

  // Validation logic for MDR text input
  const validateMdrInput = (net: string, val: string): boolean => {
    const trimmed = val.trim();
    if (!trimmed) {
      setValidationErrors(prev => ({ ...prev, [net]: "MDR percentage is required." }));
      return false;
    }
    const num = parseFloat(trimmed);
    if (isNaN(num)) {
      setValidationErrors(prev => ({ ...prev, [net]: "Enter a valid decimal percentage (e.g. 2.62)." }));
      return false;
    }
    if (num < 0) {
      setValidationErrors(prev => ({ ...prev, [net]: "MDR cannot be negative." }));
      return false;
    }
    if (num > 50) {
      setValidationErrors(prev => ({ ...prev, [net]: "MDR exceeds maximum allowed 50.00%." }));
      return false;
    }
    setValidationErrors(prev => {
      const copy = { ...prev };
      delete copy[net];
      return copy;
    });
    return true;
  };

  const handleMdrInputChange = (network: string, val: string) => {
    setEditMdrValues(prev => ({ ...prev, [network]: val }));
    validateMdrInput(network, val);
  };

  const handleActiveToggle = (network: string) => {
    setEditActiveStates(prev => ({ ...prev, [network]: !prev[network] }));
  };

  // Save single card scheme MDR
  const handleSaveSingleScheme = async (scheme: CardMdrSchemeItem) => {
    const net = scheme.card_network;
    const inputVal = editMdrValues[net] ?? "";
    if (!validateMdrInput(net, inputVal)) return;

    try {
      setSavingNetwork(net);
      setActionFeedback(null);
      const res = await apiClient.post("/api/v1/admin/payin/company-card-mdr", {
        company_ref_id: selectedCompanyId,
        gateway_code: selectedGatewayCode,
        card_network: net,
        mdr_percent: parseFloat(inputVal),
        is_enabled: editActiveStates[net] ?? true
      });

      if (res.data && res.data.success) {
        setActionFeedback({
          type: "success",
          text: `MDR for ${scheme.name} successfully updated to ${parseFloat(inputVal).toFixed(2)}% (${editActiveStates[net] ? "Active" : "Disabled"}).`
        });
        await fetchCardMdrSchemes(selectedCompanyId, selectedGatewayCode);
        fetchRules();
      }
    } catch (e: any) {
      console.error(`Failed to save MDR for ${net}:`, e);
      setActionFeedback({
        type: "error",
        text: e?.response?.data?.detail || `Failed to update MDR for ${scheme.name}.`
      });
    } finally {
      setSavingNetwork(null);
    }
  };

  // Save all card schemes at once
  const handleSaveAllSchemes = async () => {
    let hasErr = false;
    const batchItems: any[] = [];

    for (const scheme of cardSchemes) {
      const net = scheme.card_network;
      const inputVal = editMdrValues[net] ?? "";
      if (!validateMdrInput(net, inputVal)) {
        hasErr = true;
      } else {
        batchItems.push({
          card_network: net,
          mdr_percent: parseFloat(inputVal),
          is_enabled: editActiveStates[net] ?? true
        });
      }
    }

    if (hasErr) {
      setActionFeedback({
        type: "error",
        text: "Please fix validation errors in MDR percentage fields before saving."
      });
      return;
    }

    try {
      setSavingAll(true);
      setActionFeedback(null);
      const res = await apiClient.post("/api/v1/admin/payin/company-card-mdr/batch", {
        company_ref_id: selectedCompanyId,
        gateway_code: selectedGatewayCode,
        items: batchItems
      });

      if (res.data && res.data.success) {
        setActionFeedback({
          type: "success",
          text: `All 5 card schemes updated successfully for ${selectedGatewayCode}.`
        });
        await fetchCardMdrSchemes(selectedCompanyId, selectedGatewayCode);
        fetchRules();
      }
    } catch (e: any) {
      console.error("Failed to batch update card MDR:", e);
      setActionFeedback({
        type: "error",
        text: e?.response?.data?.detail || "Failed to save card scheme configurations."
      });
    } finally {
      setSavingAll(false);
    }
  };

  const runSimulation = async () => {
    try {
      setSimLoading(true);
      const res = await apiClient.post("/api/v1/payin/mdr/preview", {
        amount: parseFloat(simAmount) || 10000,
        service_type_code: "UTILITY",
        payment_mode_code: "CREDIT_CARD",
        card_network: "VISA"
      });
      if (res.data && res.data.success) {
        setSimResult(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSimLoading(false);
    }
  };

  const getTreatmentColor = (treatment: string) => {
    switch (treatment) {
      case "DEDUCT_FROM_TOPUP": return "primary";
      case "COLLECT_ADDITIONALLY": return "warning";
      case "COMPANY_PAYS_MDR": return "success";
      default: return "default";
    }
  };

  const currentCompName = companies.find(c => c.company_ref_id === selectedCompanyId)?.company_name || `Company #${selectedCompanyId}`;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div className="flex items-center space-x-3">
          <Button component={Link} href="/admin/payin/dashboard" startIcon={<ArrowBackIcon />} size="small" variant="outlined">
            Dashboard
          </Button>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">
            Card Scheme & MDR Configuration
          </h1>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            component={Link}
            href="/admin/payin/gateways"
            variant="outlined"
            size="small"
            startIcon={<TuneIcon />}
          >
            Payment Gateways
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={() => {
              fetchCardMdrSchemes(selectedCompanyId, selectedGatewayCode);
              fetchRules();
            }}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error && <Alert severity="error">{error}</Alert>}
      {actionFeedback && (
        <Alert severity={actionFeedback.type} onClose={() => setActionFeedback(null)}>
          {actionFeedback.text}
        </Alert>
      )}

      {/* ── SECTION 1: COMPANY & GATEWAY SELECTOR + CARD MDR EDIT MATRIX ── */}
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, bgcolor: "#FFFFFF" }}>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center mb-6">
          {/* Company Selector */}
          <div className="md:col-span-5">
            <FormControl fullWidth size="small">
              <InputLabel id="company-select-label">Select Company Scope</InputLabel>
              <Select
                labelId="company-select-label"
                id="company-select"
                value={selectedCompanyId}
                label="Select Company Scope"
                onChange={(e) => setSelectedCompanyId(Number(e.target.value))}
              >
                {companies.map((c) => (
                  <MenuItem key={c.company_ref_id} value={c.company_ref_id}>
                    <strong>{c.company_name}</strong> &nbsp;({c.company_code}) — Ref #{c.company_ref_id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>

          {/* Payment Gateway Selector */}
          <div className="md:col-span-4">
            <FormControl fullWidth size="small">
              <InputLabel id="gateway-select-label">Payment Gateway / Vendor</InputLabel>
              <Select
                labelId="gateway-select-label"
                id="gateway-select"
                value={selectedGatewayCode}
                label="Payment Gateway / Vendor"
                onChange={(e) => setSelectedGatewayCode(e.target.value)}
              >
                {gateways.map((gw) => (
                  <MenuItem key={gw.payin_company_vendor_ref_id} value={gw.gateway_code}>
                    <strong>{gw.retailer_display_name}</strong> &nbsp;({gw.gateway_code})
                    {gw.internal_provider_name ? ` • ${gw.internal_provider_name}` : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>

          {/* Bulk Action */}
          <div className="md:col-span-3 flex justify-start md:justify-end">
            <Button
              variant="contained"
              color="primary"
              startIcon={savingAll ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
              onClick={handleSaveAllSchemes}
              disabled={savingAll || loadingSchemes || cardSchemes.length === 0}
              sx={{ minWidth: 160 }}
            >
              {savingAll ? "Saving..." : "Save All Schemes"}
            </Button>
          </div>
        </div>

        <Divider sx={{ mb: 2 }} />

        {/* Informational Subheader */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Supported Card Schemes & Applicable MDR Matrix
            </h2>
            <p className="text-xs text-slate-500">
              Managing configurations for <strong>{currentCompName}</strong> via <strong>{selectedGatewayCode}</strong>.
            </p>
          </div>
          <Chip
            label="Company → Gateway → Card Scheme"
            size="small"
            variant="outlined"
            color="primary"
            sx={{ fontWeight: 600 }}
          />
        </div>

        {/* Card Schemes Table */}
        {loadingSchemes ? (
          <div className="p-8 text-center">
            <CircularProgress size={32} />
            <p className="text-xs text-slate-500 mt-2">Loading card scheme configurations...</p>
          </div>
        ) : (
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ bgcolor: "grey.50" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Card Scheme / Network</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 140 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 220 }}>Configured MDR (%)</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Configuration State</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: "right" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cardSchemes.map((scheme) => {
                const net = scheme.card_network;
                const isEnabled = editActiveStates[net] ?? scheme.is_enabled;
                const inputVal = editMdrValues[net] ?? "";
                const hasErr = !!validationErrors[net];
                const isSaving = savingNetwork === net;

                return (
                  <TableRow key={scheme.id} hover sx={{ bgcolor: !isEnabled ? "rgba(241, 245, 249, 0.4)" : "inherit" }}>
                    {/* Card Scheme & Brand */}
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div
                          style={{ backgroundColor: scheme.brand_color }}
                          className="w-11 h-7 rounded text-white flex items-center justify-center font-black text-xs tracking-wider shadow-sm"
                        >
                          {scheme.icon_text}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-800">{scheme.name}</div>
                          <div className="text-xs text-slate-400">Code: {scheme.card_network}</div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Category */}
                    <TableCell>
                      <span className="text-xs text-slate-600">{scheme.category}</span>
                    </TableCell>

                    {/* Enable / Disable Switch */}
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={isEnabled}
                          onChange={() => handleActiveToggle(net)}
                          color="success"
                          size="small"
                        />
                        <Chip
                          label={isEnabled ? "Active" : "Disabled"}
                          size="small"
                          color={isEnabled ? "success" : "default"}
                          sx={{ fontWeight: 600, fontSize: "0.7rem", height: 22 }}
                        />
                      </div>
                    </TableCell>

                    {/* Editable MDR Textbox */}
                    <TableCell>
                      <TextField
                        size="small"
                        value={inputVal}
                        onChange={(e) => handleMdrInputChange(net, e.target.value)}
                        placeholder="e.g. 2.62"
                        error={hasErr}
                        helperText={validationErrors[net] || ""}
                        disabled={!isEnabled}
                        slotProps={{
                          input: {
                            endAdornment: <InputAdornment position="end">%</InputAdornment>
                          }
                        }}
                        sx={{
                          width: 160,
                          "& .MuiInputBase-input": {
                            fontWeight: 700,
                            color: isEnabled ? "primary.main" : "text.disabled"
                          }
                        }}
                      />
                    </TableCell>

                    {/* State / Meta */}
                    <TableCell>
                      <div className="space-y-1">
                        <Chip
                          label={scheme.is_configured ? `Saved: ${scheme.mdr_display}` : "Not Configured"}
                          size="small"
                          variant={scheme.is_configured ? "filled" : "outlined"}
                          color={scheme.is_configured ? "primary" : "warning"}
                          sx={{ height: 22, fontSize: "0.7rem", fontWeight: 600 }}
                        />
                        {scheme.updated_at && (
                          <div className="text-[10px] text-slate-400">
                            Updated: {new Date(scheme.updated_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Action Button */}
                    <TableCell sx={{ textAlign: "right" }}>
                      <Button
                        variant="outlined"
                        size="small"
                        color="primary"
                        startIcon={isSaving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
                        onClick={() => handleSaveSingleScheme(scheme)}
                        disabled={isSaving || hasErr}
                      >
                        {isSaving ? "Saving" : "Save"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* ── SECTION 2: MDR CALCULATION SIMULATOR ── */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, bgcolor: "grey.50" }}>
        <h3 className="text-sm font-bold text-slate-800 mb-2">
          Live Financial MDR Calculation Simulator
        </h3>
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-4">
          <TextField
            size="small"
            type="number"
            label="Simulate Amount (₹)"
            value={simAmount}
            onChange={(e) => setSimAmount(e.target.value)}
            sx={{ width: 220 }}
          />
          <Button variant="contained" onClick={runSimulation} disabled={simLoading}>
            Run Calculation Preview
          </Button>
        </div>

        {simResult && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-white border border-slate-200">
            <div>
              <div className="text-xs text-slate-400">MDR Rate</div>
              <div className="text-sm font-semibold text-slate-800">{(simResult.mdr_pct * 100).toFixed(2)}% + ₹{simResult.mdr_fixed}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Total Charges (MDR + GST)</div>
              <div className="text-sm font-semibold text-slate-800">₹{simResult.total_charges.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Customer Payable</div>
              <div className="text-base font-bold text-blue-600">₹{simResult.customer_payable.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Retailer Credit</div>
              <div className="text-base font-bold text-emerald-600">₹{simResult.retailer_credit.toFixed(2)}</div>
            </div>
          </div>
        )}
      </Paper>

      {/* ── SECTION 3: ALL DYNAMIC MDR RULES TABLE ── */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        <div className="p-3 bg-slate-50 border-b border-slate-200">
          <div className="text-sm font-bold text-slate-800">
            Authoritative Database MDR Rules Matrix
          </div>
          <div className="text-xs text-slate-500">
            Showing all resolved rule records across services, payment modes, and networks.
          </div>
        </div>
        {loadingRules ? (
          <div className="p-8 text-center"><CircularProgress /></div>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: "grey.50" }}>
              <TableRow>
                <TableCell><strong>Priority</strong></TableCell>
                <TableCell><strong>Company</strong></TableCell>
                <TableCell><strong>Vendor</strong></TableCell>
                <TableCell><strong>Service</strong></TableCell>
                <TableCell><strong>Mode / Card</strong></TableCell>
                <TableCell><strong>MDR %</strong></TableCell>
                <TableCell><strong>Fixed</strong></TableCell>
                <TableCell><strong>GST %</strong></TableCell>
                <TableCell><strong>Treatment</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rules.map((r) => (
                <TableRow key={r.payin_mdr_cfg_ref_id} hover>
                  <TableCell>
                    <Chip label={`P${r.priority}`} size="small" color={r.priority > 100 ? "primary" : "default"} />
                  </TableCell>
                  <TableCell><strong>{r.company_name}</strong> (Ref #{r.company_ref_id})</TableCell>
                  <TableCell>{r.vendor_name}</TableCell>
                  <TableCell>{r.svc_name || "ALL SERVICES"}</TableCell>
                  <TableCell>{r.pay_mode_name || r.card_type_name || r.card_network || "ALL MODES"}</TableCell>
                  <TableCell>{(Number(r.mdr_pct) * 100).toFixed(2)}%</TableCell>
                  <TableCell>₹{Number(r.mdr_fixed).toFixed(2)}</TableCell>
                  <TableCell>{(Number(r.tax_pct) * 100).toFixed(0)}%</TableCell>
                  <TableCell>
                    <Chip label={r.mdr_treatment} color={getTreatmentColor(r.mdr_treatment) as any} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip label={r.is_enabled ? "ACTIVE" : "DISABLED"} color={r.is_enabled ? "success" : "default"} size="small" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </div>
  );
}
