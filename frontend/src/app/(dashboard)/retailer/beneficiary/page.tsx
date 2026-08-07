"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  IconButton,
  Stack,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Paper,
  Avatar,
  LinearProgress,
  Grid,
  Autocomplete,
  TextField,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import VerifiedIcon from "@mui/icons-material/Verified";
import SaveIcon from "@mui/icons-material/Save";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import SpeedIcon from "@mui/icons-material/Speed";
import { motion, AnimatePresence } from "framer-motion";

import { M3TextField } from "@/components/ui/form-components";
import { M3Button } from "@/components/ui/m3-components";
import { retailerApi } from "@/services/retailer-api";
import { notificationEngine } from "@/services/notification-engine";
import { useTransactionMemoryStore } from "@/stores/use-transaction-memory-store";
import { CustomerSummaryHeader } from "@/components/customers/customer-summary-header";

const STEPS = [
  { label: "Account Info", est: "20s" },
  { label: "Bank & IFSC", est: "30s" },
  { label: "Penny Drop Verification", est: "20s" },
  { label: "Complete", est: "0s" },
];

export default function BeneficiaryWorkspacePage() {
  const router = useRouter();
  const { selectedCustomer, setSelectedBeneficiary, referrerUrl } = useTransactionMemoryStore();

  const [activeStep, setActiveStep] = useState(0);

  // Form State
  const [accHolder, setAccHolder] = useState("");
  const [accNum, setAccNum] = useState("");
  const [confirmAccNum, setConfirmAccNum] = useState("");
  const [bankName, setBankName] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [selectedBankObj, setSelectedBankObj] = useState<any | null>(null);

  // Bank Search
  const [bankMasterList, setBankMasterList] = useState<any[]>([]);
  const [bankSearchLoading, setBankSearchLoading] = useState(false);

  // Verification & Loading State
  const [pennyDropLoading, setPennyDropLoading] = useState(false);
  const [createdBeneficiary, setCreatedBeneficiary] = useState<any | null>(null);
  const [accMismatchError, setAccMismatchError] = useState("");

  // Draft Timestamp
  const [lastSaved, setLastSaved] = useState<string>("Just now");

  useEffect(() => {
    fetchBankMasterList("");
  }, []);

  const fetchBankMasterList = async (query: string = "") => {
    setBankSearchLoading(true);
    try {
      const res = await retailerApi.getBankMasterList(query);
      if (res && res.data) {
        setBankMasterList(Array.isArray(res.data) ? res.data : []);
      }
    } catch {
      // Fallback
    } finally {
      setBankSearchLoading(false);
    }
  };

  const saveDraft = () => {
    try {
      localStorage.setItem(
        "pay2pay_beneficiary_workspace_draft",
        JSON.stringify({ accHolder, accNum, confirmAccNum, bankName, ifscCode, activeStep })
      );
      setLastSaved(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      notificationEngine.notify("BENEFICIARY_VERIFIED", "Beneficiary Draft Saved");
    } catch {
      // Ignore
    }
  };

  const handleBankSelect = (bankObj: any) => {
    if (bankObj && typeof bankObj !== "string") {
      setSelectedBankObj(bankObj);
      const bName = bankObj.bank_name || bankObj.bank || "";
      const ifsc = bankObj.ifsc_code || bankObj.ifsc || (bankObj.ifsc_prefix ? `${bankObj.ifsc_prefix}0000001` : "");
      setBankName(bName);
      setIfscCode(ifsc);
    }
  };

  const handleStep1Submit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (accNum !== confirmAccNum) {
      setAccMismatchError("Account numbers do not match! Please check carefully.");
      return;
    }
    setAccMismatchError("");
    setActiveStep(1);
  };

  const handleStep2Submit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!bankName || !ifscCode) return;
    setActiveStep(2);
  };

  const handleRunPennyDrop = async () => {
    setPennyDropLoading(true);
    const res = await retailerApi.addPayoutBeneficiary({
      customer_id: selectedCustomer?.public_id || "cust-101",
      account_holder: accHolder,
      account_number: accNum,
      confirm_account_number: confirmAccNum,
      ifsc: ifscCode,
      bank_name: bankName,
    });
    setPennyDropLoading(false);

    if (res.status === "SUCCESS") {
      const newBen = {
        beneficiary_id: res.data.beneficiary_id || `ben-${Date.now()}`,
        account_holder_name: accHolder,
        account_number: accNum,
        ifsc_code: ifscCode,
        bank_name: bankName,
        is_verified: true,
        penny_drop_status: "SUCCESS",
      };
      setCreatedBeneficiary(newBen);
      notificationEngine.notify("BENEFICIARY_VERIFIED", "Penny Drop Verification Succeeded!");
      setActiveStep(3);
    }
  };

  const handleCompleteAndReturn = (benToSelect: any) => {
    setSelectedBeneficiary(benToSelect);
    localStorage.removeItem("pay2pay_beneficiary_workspace_draft");
    router.push(referrerUrl || "/retailer/dmt");
  };

  const handleCancel = () => {
    router.push(referrerUrl || "/retailer/dmt");
  };

  const completionPercentage = Math.round(((activeStep + 1) / STEPS.length) * 100);

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#F8FAFC", display: "flex", flexDirection: "column" }}>
      {/* ── STICKY ENTERPRISE HEADER ── */}
      <Paper
        square
        elevation={0}
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 1100,
          px: 3,
          py: 2,
          background: "linear-gradient(90deg, #0F172A 0%, #1E293B 100%)",
          color: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <IconButton onClick={handleCancel} sx={{ color: "#FFF", bgcolor: "rgba(255,255,255,0.1)" }}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: "-0.3px" }}>
                Enterprise Beneficiary Onboarding Workspace
              </Typography>
              <Chip
                label="Penny Drop Verified"
                size="small"
                sx={{ bgcolor: "#38BDF8", color: "#0C4A6E", fontWeight: 800, fontSize: "0.65rem" }}
              />
            </Stack>
            <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 600 }}>
              Bank Master Lookup • Auto IFSC Binding • Returns to transaction
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Box sx={{ textAlign: "right", display: { xs: "none", md: "block" } }}>
            <Typography variant="caption" sx={{ color: "#38BDF8", display: "block", fontWeight: 700 }}>
              Draft Saved: {lastSaved}
            </Typography>
          </Box>

          <M3Button variant="outlined" size="small" onClick={saveDraft} startIcon={<SaveIcon />} sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.3)" }}>
            Save Draft
          </M3Button>

          <IconButton onClick={handleCancel} sx={{ color: "#FFF" }}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </Paper>

      {/* ── WORKSPACE BODY ── */}
      <Box sx={{ flex: 1, maxWidth: 1400, width: "100%", mx: "auto", p: { xs: 2, md: 4 }, pb: 12 }}>
        <Grid container spacing={4}>
          {/* LEFT SIDEBAR */}
          <Grid size={{ xs: 12, md: 4, lg: 3 }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: "1px solid #E2E8F0", backgroundColor: "#FFF", position: { md: "sticky" }, top: { md: 100 } }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "#0F172A", mb: 0.5 }}>
                Beneficiary Progress
              </Typography>
              <Typography variant="caption" sx={{ color: "#64748B", display: "block", mb: 2 }}>
                Step {activeStep + 1} of {STEPS.length}
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Stack direction="row" sx={{ justifyContent: "space-between", mb: 0.75 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: "#0F172A" }}>
                    Completion
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 900, color: "#0284C7" }}>
                    {completionPercentage}%
                  </Typography>
                </Stack>
                <LinearProgress variant="determinate" value={completionPercentage} sx={{ height: 8, borderRadius: 4, bgcolor: "#E2E8F0", "& .MuiLinearProgress-bar": { bgcolor: "#0284C7" } }} />
              </Box>

              <Stack spacing={2} sx={{ mb: 3 }}>
                {STEPS.map((s, idx) => {
                  const isDone = activeStep > idx;
                  const isCurrent = activeStep === idx;
                  return (
                    <Paper
                      key={s.label}
                      elevation={0}
                      sx={{
                        p: 1.5,
                        borderRadius: 3,
                        border: isCurrent ? "2px solid #0284C7" : "1px solid #F1F5F9",
                        backgroundColor: isCurrent ? "#F0F9FF" : isDone ? "#F0FDF4" : "#FAF5FF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                        <Avatar sx={{ width: 28, height: 28, fontSize: "0.75rem", fontWeight: 900, bgcolor: isDone ? "#16A34A" : isCurrent ? "#0F172A" : "#94A3B8" }}>
                          {isDone ? <CheckCircleIcon sx={{ fontSize: 18 }} /> : idx + 1}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: isCurrent ? 900 : 700, color: isCurrent ? "#0F172A" : "#334155" }}>
                            {s.label}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#64748B", fontSize: "0.68rem" }}>
                            Est. {s.est}
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Stack direction="row" spacing={1} sx={{ alignItems: "center", color: "#64748B" }}>
                <AccessTimeIcon sx={{ fontSize: 18 }} />
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  Est. Remaining: ~1 minute
                </Typography>
              </Stack>
            </Paper>
          </Grid>

          {/* MAIN CONTENT */}
          <Grid size={{ xs: 12, md: 8, lg: 9 }}>
            {/* PROMINENT CUSTOMER SUMMARY HEADER */}
            <CustomerSummaryHeader
              customer={selectedCustomer}
              darkTheme={false}
              onChangeCustomer={() => router.push("/retailer/dmt")}
              onEditCustomer={() => router.push("/retailer/customers")}
              onViewCustomerProfile={() => router.push("/retailer/customers")}
            />

            <AnimatePresence mode="wait">
              {/* STEP 0: ACCOUNT INFO */}
              {activeStep === 0 && (
                <motion.div key="ben-step0" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
                  <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: "1px solid #E2E8F0", backgroundColor: "#FFF" }}>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: "#0F172A", mb: 0.5 }}>
                      Step 1 — Customer Context & Bank Account Details
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#64748B", mb: 4 }}>
                      Adding beneficiary for customer: <strong>{selectedCustomer?.full_name || "Active Customer"}</strong> (+91 {selectedCustomer?.mobile_number || "9876543210"})
                    </Typography>

                    <form onSubmit={handleStep1Submit}>
                      <Stack spacing={3}>
                        <M3TextField label="Account Holder Name *" value={accHolder} onChange={(e) => setAccHolder(e.target.value)} required />

                        <Grid container spacing={2}>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <M3TextField label="Account Number *" value={accNum} onChange={(e) => setAccNum(e.target.value)} required />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <M3TextField label="Confirm Account Number *" value={confirmAccNum} onChange={(e) => setConfirmAccNum(e.target.value)} required />
                          </Grid>
                        </Grid>

                        {accMismatchError && <Alert severity="error" sx={{ borderRadius: 2.5, fontWeight: 700 }}>{accMismatchError}</Alert>}

                        <M3Button type="submit" variant="contained" disabled={!accHolder || !accNum || !confirmAccNum} sx={{ py: 1.75, bgcolor: "#0F172A" }}>
                          Continue to Bank & IFSC Selection →
                        </M3Button>
                      </Stack>
                    </form>
                  </Paper>
                </motion.div>
              )}

              {/* STEP 1: BANK MASTER & IFSC */}
              {activeStep === 1 && (
                <motion.div key="ben-step1" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
                  <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: "1px solid #E2E8F0", backgroundColor: "#FFF" }}>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: "#0F172A", mb: 0.5 }}>
                      Step 2 — Search Bank Master & Auto-Bind IFSC Code
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#64748B", mb: 4 }}>
                      Search by Bank Name. Default IFSC code is automatically bound to prevent manual input errors.
                    </Typography>

                    <form onSubmit={handleStep2Submit}>
                      <Stack spacing={3}>
                        <Autocomplete
                          options={bankMasterList}
                          getOptionLabel={(option) => {
                            if (typeof option === "string") return option;
                            return option.bank_name ? `${option.bank_name} (${option.ifsc_code || option.ifsc || option.ifsc_prefix || ""})` : "";
                          }}
                          loading={bankSearchLoading}
                          value={selectedBankObj}
                          onChange={(_, val) => handleBankSelect(val)}
                          onInputChange={(_, newInputValue) => {
                            if (newInputValue && newInputValue.length >= 1) {
                              fetchBankMasterList(newInputValue);
                            }
                          }}
                          renderOption={(props, option) => (
                            <Box component="li" {...props} key={option.bank_id || option.ifsc_code || option.bank_name}>
                              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                                <Avatar
                                  src={option.logo || `https://logo.clearbit.com/${(option.bank_name || "").toLowerCase().replace(/\s+/g, "")}.com`}
                                  sx={{ width: 24, height: 24, fontSize: "0.75rem", bgcolor: "#312E81" }}
                                >
                                  {option.bank_name ? option.bank_name.charAt(0) : "B"}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    {option.bank_name}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: "#64748B" }}>
                                    IFSC: {option.ifsc_code || option.ifsc || option.ifsc_prefix} • IMPS Operational
                                  </Typography>
                                </Box>
                              </Stack>
                            </Box>
                          )}
                          renderInput={(params) => <TextField {...params} label="Select Bank Name *" placeholder="Search Bank (e.g. HDFC, SBI, ICICI)..." />}
                        />

                        <M3TextField
                          label="IFSC Code *"
                          value={ifscCode}
                          onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                          placeholder="e.g. HDFC0000001"
                          required
                          helperText={ifscCode ? `✓ Auto-bound to ${bankName}` : "Auto-populated upon selecting bank"}
                        />

                        <M3Button type="submit" variant="contained" disabled={!bankName || !ifscCode} sx={{ py: 1.75, bgcolor: "#0F172A" }}>
                          Continue to Penny Drop Verification →
                        </M3Button>
                      </Stack>
                    </form>
                  </Paper>
                </motion.div>
              )}

              {/* STEP 2: PENNY DROP VERIFICATION */}
              {activeStep === 2 && (
                <motion.div key="ben-step2" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
                  <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: "1px solid #E2E8F0", backgroundColor: "#FFF" }}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1 }}>
                      <SpeedIcon sx={{ color: "#0284C7", fontSize: 32 }} />
                      <Typography variant="h6" sx={{ fontWeight: 900, color: "#0F172A" }}>
                        Step 3 — Cashfree ₹1 Penny Drop Account Verification
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ color: "#64748B", mb: 4 }}>
                      Runs real-time ₹1 Penny Drop via Cashfree API to verify account active status & match name.
                    </Typography>

                    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: "#F8FAFC", border: "1px solid #E2E8F0", mb: 4 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "#0F172A", mb: 1 }}>
                        Account Summary to Verify:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: "#334155" }}>
                        Account Holder: {accHolder}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#64748B" }}>
                        Bank: {bankName} • Account Number: {accNum} • IFSC: {ifscCode}
                      </Typography>
                    </Paper>

                    <M3Button variant="contained" loading={pennyDropLoading} onClick={handleRunPennyDrop} sx={{ py: 1.75, bgcolor: "#0284C7", "&:hover": { bgcolor: "#0369A1" } }}>
                      Run ₹1 Penny Drop & Verify Account →
                    </M3Button>
                  </Paper>
                </motion.div>
              )}

              {/* STEP 3: COMPLETE */}
              {activeStep === 3 && (
                <motion.div key="ben-step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <Paper elevation={0} sx={{ p: 5, borderRadius: 4, border: "1px solid #BAE6FD", backgroundColor: "#F0F9FF", textAlign: "center" }}>
                    <VerifiedIcon sx={{ fontSize: 72, color: "#0284C7", mb: 2 }} />
                    <Typography variant="h5" sx={{ fontWeight: 900, color: "#0C4A6E", mb: 1 }}>
                      Beneficiary Account Verified & Added!
                    </Typography>
                    <Typography variant="body1" sx={{ color: "#0369A1", mb: 4, maxWidth: 500, mx: "auto" }}>
                      Bank account <strong>{accNum}</strong> ({bankName}) has passed Cashfree Penny Drop verification.
                    </Typography>

                    <M3Button
                      variant="contained"
                      size="large"
                      onClick={() => handleCompleteAndReturn(createdBeneficiary)}
                      sx={{ py: 1.75, px: 5, fontWeight: 900, bgcolor: "#0284C7", "&:hover": { bgcolor: "#0369A1" } }}
                    >
                      Return to Transaction & Auto-Select Beneficiary →
                    </M3Button>
                  </Paper>
                </motion.div>
              )}
            </AnimatePresence>
          </Grid>
        </Grid>
      </Box>

      {/* STICKY FOOTER */}
      <Paper
        square
        elevation={0}
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          px: 4,
          py: 2,
          backgroundColor: "#FFF",
          borderTop: "1px solid #E2E8F0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Stack direction="row" spacing={2}>
          <M3Button variant="text" onClick={handleCancel} sx={{ color: "#64748B" }}>
            Cancel
          </M3Button>
          <M3Button variant="outlined" onClick={saveDraft} startIcon={<SaveIcon />}>
            Save Draft
          </M3Button>
        </Stack>

        <Stack direction="row" spacing={2}>
          {activeStep > 0 && (
            <M3Button variant="outlined" onClick={() => setActiveStep((prev) => prev - 1)}>
              ← Previous Step
            </M3Button>
          )}

          {activeStep < 3 && (
            <M3Button
              variant="contained"
              onClick={() => {
                if (activeStep === 0) handleStep1Submit();
                else if (activeStep === 1) handleStep2Submit();
                else if (activeStep === 2) handleRunPennyDrop();
              }}
              sx={{ bgcolor: "#0F172A", px: 4 }}
            >
              Continue →
            </M3Button>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
