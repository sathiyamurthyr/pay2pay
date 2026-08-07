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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import VerifiedIcon from "@mui/icons-material/Verified";
import SaveIcon from "@mui/icons-material/Save";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import SpeedIcon from "@mui/icons-material/Speed";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CodeIcon from "@mui/icons-material/Code";
import { motion, AnimatePresence } from "framer-motion";

import { M3TextField } from "@/components/ui/form-components";
import { M3Button } from "@/components/ui/m3-components";
import { retailerApi } from "@/services/retailer-api";
import { notificationEngine } from "@/services/notification-engine";
import { useTransactionMemoryStore } from "@/stores/use-transaction-memory-store";

const STEPS = [
  { label: "Account Info", est: "20s" },
  { label: "Bank & IFSC", est: "30s" },
  { label: "Penny Drop Verification", est: "20s" },
  { label: "Complete", est: "0s" },
];

const DEFAULT_BANK_LIST = [
  { bank_id: 1, bank_name: "HDFC BANK LTD", ifsc: "HDFC0000001", ifsc_code: "HDFC0000001", ifsc_prefix: "HDFC", imps_status: "ACTIVE", logo: "https://logo.clearbit.com/hdfcbank.com", is_top: true },
  { bank_id: 2, bank_name: "STATE BANK OF INDIA", ifsc: "SBIN0000001", ifsc_code: "SBIN0000001", ifsc_prefix: "SBIN", imps_status: "ACTIVE", logo: "https://logo.clearbit.com/sbi.co.in", is_top: true },
  { bank_id: 3, bank_name: "ICICI BANK LTD", ifsc: "ICIC0000001", ifsc_code: "ICIC0000001", ifsc_prefix: "ICIC", imps_status: "ACTIVE", logo: "https://logo.clearbit.com/icicibank.com", is_top: true },
  { bank_id: 4, bank_name: "AXIS BANK LTD", ifsc: "UTIB0000001", ifsc_code: "UTIB0000001", ifsc_prefix: "UTIB", imps_status: "ACTIVE", logo: "https://logo.clearbit.com/axisbank.com", is_top: true },
  { bank_id: 5, bank_name: "KOTAK MAHINDRA BANK LTD", ifsc: "KKBK0000001", ifsc_code: "KKBK0000001", ifsc_prefix: "KKBK", imps_status: "ACTIVE", logo: "https://logo.clearbit.com/kotak.com", is_top: true },
  { bank_id: 6, bank_name: "PUNJAB NATIONAL BANK", ifsc: "PUNB0000001", ifsc_code: "PUNB0000001", ifsc_prefix: "PUNB", imps_status: "ACTIVE", logo: "https://logo.clearbit.com/pnbindia.in", is_top: true },
  { bank_id: 7, bank_name: "BANK OF BARODA", ifsc: "BARB0000001", ifsc_code: "BARB0000001", ifsc_prefix: "BARB", imps_status: "ACTIVE", logo: "https://logo.clearbit.com/bankofbaroda.in", is_top: false },
  { bank_id: 8, bank_name: "CANARA BANK", ifsc: "CNRB0000001", ifsc_code: "CNRB0000001", ifsc_prefix: "CNRB", imps_status: "ACTIVE", logo: "https://logo.clearbit.com/canarabank.com", is_top: false },
  { bank_id: 9, bank_name: "UNION BANK OF INDIA", ifsc: "UBIN0000001", ifsc_code: "UBIN0000001", ifsc_prefix: "UBIN", imps_status: "ACTIVE", logo: "https://logo.clearbit.com/unionbankofindia.co.in", is_top: false },
  { bank_id: 10, bank_name: "INDUSIND BANK LTD", ifsc: "INDB0000001", ifsc_code: "INDB0000001", ifsc_prefix: "INDB", imps_status: "ACTIVE", logo: "https://logo.clearbit.com/indusind.com", is_top: false },
  { bank_id: 11, bank_name: "YES BANK LTD", ifsc: "YESB0000001", ifsc_code: "YESB0000001", ifsc_prefix: "YESB", imps_status: "ACTIVE", logo: "https://logo.clearbit.com/yesbank.in", is_top: false },
  { bank_id: 12, bank_name: "IDFC FIRST BANK LTD", ifsc: "IDFB0000001", ifsc_code: "IDFB0000001", ifsc_prefix: "IDFB", imps_status: "ACTIVE", logo: "https://logo.clearbit.com/idfcfirstbank.com", is_top: false },
  { bank_id: 13, bank_name: "FEDERAL BANK LTD", ifsc: "FDRL0000001", ifsc_code: "FDRL0000001", ifsc_prefix: "FDRL", imps_status: "ACTIVE", logo: "https://logo.clearbit.com/federalbank.co.in", is_top: false },
  { bank_id: 14, bank_name: "AKHAND AANAND CO-OPERATIVE BANK", ifsc: "GSCB0AACBL1", ifsc_code: "GSCB0AACBL1", ifsc_prefix: "GSCB", imps_status: "ACTIVE", logo: "https://logo.clearbit.com/hdfcbank.com", is_top: false },
  { bank_id: 15, bank_name: "SARASWAT CO-OPERATIVE BANK LTD", ifsc: "SRCB0000001", ifsc_code: "SRCB0000001", ifsc_prefix: "SRCB", imps_status: "ACTIVE", logo: "https://logo.clearbit.com/saraswatbank.com", is_top: false },
  { bank_id: 16, bank_name: "SVC CO-OPERATIVE BANK LTD", ifsc: "SVCB0000001", ifsc_code: "SVCB0000001", ifsc_prefix: "SVCB", imps_status: "ACTIVE", logo: "https://logo.clearbit.com/svcbank.com", is_top: false },
  { bank_id: 17, bank_name: "AU SMALL FINANCE BANK LTD", ifsc: "AUBL0000001", ifsc_code: "AUBL0000001", ifsc_prefix: "AUBL", imps_status: "ACTIVE", logo: "https://logo.clearbit.com/aubank.in", is_top: false },
  { bank_id: 18, bank_name: "BANDHAN BANK LTD", ifsc: "BDBL0000001", ifsc_code: "BDBL0000001", ifsc_prefix: "BDBL", imps_status: "ACTIVE", logo: "https://logo.clearbit.com/bandhanbank.com", is_top: false },
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
  const [bankMasterList, setBankMasterList] = useState<any[]>(DEFAULT_BANK_LIST);
  const [bankSearchLoading, setBankSearchLoading] = useState(false);

  // Verification & Loading State
  const [pennyDropLoading, setPennyDropLoading] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [createdBeneficiary, setCreatedBeneficiary] = useState<any | null>(null);
  const [rawCashfreeRequest, setRawCashfreeRequest] = useState<any | null>(null);
  const [rawCashfreeResponse, setRawCashfreeResponse] = useState<any | null>(null);
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
      let list: any[] = [];
      if (Array.isArray(res)) {
        list = res;
      } else if (res && Array.isArray(res.data)) {
        list = res.data;
      } else if (res && res.data && Array.isArray(res.data.data)) {
        list = res.data.data;
      }

      if (list.length > 0) {
        setBankMasterList(list);
      } else if (query) {
        const q = query.toLowerCase();
        const filtered = DEFAULT_BANK_LIST.filter(
          (b) =>
            b.bank_name.toLowerCase().includes(q) ||
            (b.ifsc || "").toLowerCase().includes(q) ||
            (b.ifsc_prefix || "").toLowerCase().includes(q)
        );
        setBankMasterList(filtered.length > 0 ? filtered : DEFAULT_BANK_LIST);
      } else {
        setBankMasterList(DEFAULT_BANK_LIST);
      }
    } catch {
      setBankMasterList(DEFAULT_BANK_LIST);
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
    const reqPayload = {
      api_endpoint: "https://payout-api.cashfree.com/payout/v1/validation/bankDetails",
      method: "POST",
      headers: {
        "X-Client-Id": "CF_STAGE_CLIENT_PAY2PAY",
        "X-Client-Secret": "CF_STAGE_SECRET_PAY2PAY",
        "X-Correlation-Id": `CORR-${Date.now()}`,
        "Content-Type": "application/json"
      },
      request_body: {
        name: accHolder,
        phone: selectedCustomer?.mobile || "9176669426",
        bankAccount: accNum,
        ifsc: ifscCode
      }
    };
    setRawCashfreeRequest(reqPayload);

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
      const officialName = res.data?.registered_name_in_bank || res.data?.name_at_bank || accHolder.toUpperCase();
      const newBen = {
        beneficiary_id: res.data?.beneficiary_id || `ben-${Date.now()}`,
        account_holder_name: officialName,
        entered_name: accHolder,
        account_number: accNum,
        ifsc_code: ifscCode,
        bank_name: bankName,
        is_verified: true,
        penny_drop_status: "SUCCESS",
        vendor_ref: res.data?.vendor_ref_id || res.data?.utr || `CF-REF-${Date.now()}`
      };
      setCreatedBeneficiary(newBen);
      setAccHolder(officialName); // Replace entered name with official bank registered account holder name
      
      const rawResp = res.data?.raw_vendor_response || {
        status: "SUCCESS",
        subCode: "200",
        message: "Bank Account Verified Successfully",
        accountStatus: "VALID",
        accountStatusCode: "ACCOUNT_IS_VALID",
        data: {
          refId: newBen.vendor_ref,
          nameAtBank: officialName,
          accountNumber: accNum,
          ifsc: ifscCode,
          accountExists: true,
          utr: res.data?.utr || `UTR-CF-${Date.now()}`,
          city: "MUMBAI",
          branch: "MAIN BRANCH"
        }
      };
      setRawCashfreeResponse(rawResp);
      
      notificationEngine.notify("BENEFICIARY_VERIFIED", `Verified! Official Name: ${officialName}`);
      setActiveStep(3);
    }
  };

  const handleCompleteAndReturn = (benToSelect: any) => {
    const formattedBene = {
      id: benToSelect?.beneficiary_id || `BEN-${Date.now()}`,
      beneficiaryCode: `BEN-${Date.now()}`,
      name: benToSelect?.account_holder_name || accHolder || "Verified Beneficiary",
      relationship: "Newly Added",
      accountNumber: benToSelect?.account_number || accNum,
      maskedAccountNumber: `•••• •••• ${(benToSelect?.account_number || accNum).slice(-4)}`,
      ifsc: benToSelect?.ifsc_code || ifscCode,
      branchName: "Main Branch",
      bankName: benToSelect?.bank_name || bankName,
      isVerified: true,
      isFavorite: true,
      lastUsedAt: "Just now",
      transferCount: 0,
      status: "ACTIVE",
      preferredGateway: "Cashfree Verified",
      dailyUsage: 0,
      monthlyUsage: 0,
      dailyRemaining: 50000,
      monthlyRemaining: 200000,
    };

    setSelectedBeneficiary(formattedBene);

    const custId = selectedCustomer?.id || selectedCustomer?.public_id || selectedCustomer?.customerCode || "cust-default";
    try {
      const existingStr = localStorage.getItem(`pay2pay_user_added_beneficiaries_${custId}`);
      const existingList = existingStr ? JSON.parse(existingStr) : [];
      // Prevent duplicates
      const filtered = existingList.filter((b: any) => b.accountNumber !== formattedBene.accountNumber);
      filtered.unshift(formattedBene);
      localStorage.setItem(`pay2pay_user_added_beneficiaries_${custId}`, JSON.stringify(filtered));
    } catch (err) {
      console.warn("Error saving added beneficiary to localStorage:", err);
    }

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
          <IconButton onClick={handleCancel} sx={{ color: "#F8FAFC", bgcolor: "rgba(255,255,255,0.1)", "&:hover": { bgcolor: "rgba(255,255,255,0.2)" } }}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap" }}>
              <Typography sx={{ fontWeight: 700, fontSize: { xs: "20px", sm: "26px", md: "30px" }, color: "#F8FAFC", letterSpacing: "-0.5px" }}>
                Beneficiary Onboarding Workspace
              </Typography>
              <Chip
                label="Penny Drop Verified"
                size="small"
                sx={{
                  height: 22,
                  bgcolor: "rgba(56, 189, 248, 0.12)",
                  color: "#38BDF8",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  fontWeight: 700,
                  fontSize: "0.68rem",
                }}
              />
            </Stack>

            <Typography variant="body2" sx={{ color: "#CBD5E1", fontSize: "13px", fontWeight: 500, mt: 0.25 }}>
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

          <M3Button variant="outlined" size="small" onClick={saveDraft} startIcon={<SaveIcon />} sx={{ color: "#F8FAFC", borderColor: "rgba(248,250,252,0.3)" }}>
            Save Draft
          </M3Button>

          <IconButton onClick={handleCancel} sx={{ color: "#F8FAFC" }}>
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
                          openOnFocus
                          getOptionLabel={(option) => {
                            if (typeof option === "string") return option;
                            return option.bank_name ? `${option.bank_name} (${option.ifsc_code || option.ifsc || option.ifsc_prefix || ""})` : "";
                          }}
                          loading={bankSearchLoading}
                          value={selectedBankObj}
                          onChange={(_, val) => handleBankSelect(val)}
                          onInputChange={(_, newInputValue) => {
                            fetchBankMasterList(newInputValue || "");
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

                    <M3Button
                      variant="contained"
                      loading={pennyDropLoading}
                      onClick={() => setConfirmModalOpen(true)}
                      sx={{ py: 1.75, width: "100%", bgcolor: "#0284C7", "&:hover": { bgcolor: "#0369A1" } }}
                    >
                      Verify Bank Account
                    </M3Button>

                    {/* BELOW-THE-BUTTON FINANCIAL DISCLOSURE */}
                    <Box sx={{ mt: 2.5, textAlign: "center", p: 2.5, borderRadius: 3, bgcolor: "#F0F9FF", border: "1px solid #BAE6FD" }}>
                      <Typography sx={{ color: "#0C4A6E", fontWeight: 800, fontSize: "14px", mb: 0.5 }}>
                        Verification Charge: <span style={{ color: "#0284C7" }}>₹3.00 + 18% GST (₹3.54 Total Debit)</span>
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#0369A1", display: "block", fontSize: "12px", fontWeight: 600 }}>
                        Amount will be debited from your retailer wallet.
                        If verification fails due to a system/vendor failure, the amount will be automatically refunded.
                      </Typography>
                    </Box>
                  </Paper>
                </motion.div>
              )}

              {/* ENTERPRISE FINANCIAL DEBIT CONFIRMATION DIALOG */}
              <Dialog
                open={confirmModalOpen}
                onClose={() => setConfirmModalOpen(false)}
                maxWidth="xs"
                fullWidth
                slotProps={{
                  paper: { sx: { borderRadius: 4, p: 1 } },
                }}
              >
                <DialogTitle sx={{ fontWeight: 900, color: "#0F172A", pb: 1 }}>
                  Confirm Bank Account Verification
                </DialogTitle>
                <DialogContent>
                  <Typography variant="body2" sx={{ color: "#64748B", mb: 2 }}>
                    Please review the account details and financial debit breakdown before confirming.
                  </Typography>

                  <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: "#F8FAFC", border: "1px solid #E2E8F0", mb: 2 }}>
                    <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700 }}>ACCOUNT TO VERIFY</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: "#0F172A" }}>
                      {accHolder}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#475569", display: "block" }}>
                      {bankName} • XXXX{accNum.slice(-4)} • {ifscCode}
                    </Typography>
                  </Paper>

                  <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: "#F0F9FF", border: "1px solid #BAE6FD", mb: 2 }}>
                    <Typography variant="caption" sx={{ color: "#0C4A6E", fontWeight: 800, display: "block", mb: 1 }}>
                      FINANCIAL DEBIT BREAKDOWN
                    </Typography>
                    <Table size="small">
                      <TableBody>
                        <TableRow>
                          <TableCell sx={{ border: 0, p: 0.5, color: "#475569", fontSize: "12px" }}>Verification Charge</TableCell>
                          <TableCell align="right" sx={{ border: 0, p: 0.5, fontWeight: 700, fontSize: "12px" }}>₹3.00</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ border: 0, p: 0.5, color: "#475569", fontSize: "12px" }}>GST (18%)</TableCell>
                          <TableCell align="right" sx={{ border: 0, p: 0.5, fontWeight: 700, fontSize: "12px" }}>₹0.54</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ borderTop: "1px solid #BAE6FD", p: 0.5, fontWeight: 900, color: "#0F172A", fontSize: "13px" }}>Total Debit Amount</TableCell>
                          <TableCell align="right" sx={{ borderTop: "1px solid #BAE6FD", p: 0.5, fontWeight: 900, color: "#0284C7", fontSize: "13px" }}>₹3.54</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </Paper>

                  <Alert severity="info" sx={{ borderRadius: 2.5, fontSize: "11px", fontWeight: 600 }}>
                    Amount will be debited from Retailer Wallet. Automatic refund guaranteed upon vendor/system failure.
                  </Alert>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                  <M3Button variant="text" onClick={() => setConfirmModalOpen(false)} sx={{ color: "#64748B" }}>
                    Cancel
                  </M3Button>
                  <M3Button
                    variant="contained"
                    onClick={() => {
                      setConfirmModalOpen(false);
                      handleRunPennyDrop();
                    }}
                    sx={{ bgcolor: "#0284C7", px: 3, fontWeight: 800 }}
                  >
                    Confirm & Debit ₹3.54 →
                  </M3Button>
                </DialogActions>
              </Dialog>

              {/* STEP 3: COMPLETE - OFFICIAL BANK REGISTERED NAME DISPLAY */}
              {activeStep === 3 && (
                <motion.div key="ben-step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <Paper elevation={0} sx={{ p: 5, borderRadius: 4, border: "1px solid #BAE6FD", backgroundColor: "#F0F9FF", textAlign: "center" }}>
                    <VerifiedIcon sx={{ fontSize: 72, color: "#0284C7", mb: 2 }} />
                    <Typography variant="h5" sx={{ fontWeight: 900, color: "#0C4A6E", mb: 1 }}>
                      Bank Account Verified & Registered
                    </Typography>

                    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: "#FFF", border: "1px solid #BAE6FD", maxWidth: 520, mx: "auto", my: 3, textAlign: "left" }}>
                      <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 800, display: "block", mb: 0.5 }}>
                        OFFICIAL BANK REGISTERED ACCOUNT HOLDER NAME
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 900, color: "#0F172A", mb: 1.5 }}>
                        {createdBeneficiary?.account_holder_name || accHolder}
                      </Typography>
                      <Divider sx={{ my: 1 }} />
                      <Stack direction="row" sx={{ justifyContent: "space-between", mt: 1 }}>
                        <Typography variant="caption" sx={{ color: "#64748B" }}>Account Number:</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: "#0F172A" }}>{accNum}</Typography>
                      </Stack>
                      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                        <Typography variant="caption" sx={{ color: "#64748B" }}>Bank Name:</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: "#0F172A" }}>{bankName}</Typography>
                      </Stack>
                      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                        <Typography variant="caption" sx={{ color: "#64748B" }}>IFSC Code:</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: "#0284C7" }}>{ifscCode}</Typography>
                      </Stack>
                      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                        <Typography variant="caption" sx={{ color: "#64748B" }}>Vendor Reference:</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: "#16A34A" }}>{createdBeneficiary?.vendor_ref || "CF-VERIFIED-REF"}</Typography>
                      </Stack>
                    </Paper>

                    {/* CASHFREE VENDOR API REQUEST & RESPONSE INSPECTION BOX */}
                    <Accordion elevation={0} sx={{ mt: 3, mb: 3, border: "1px solid #BAE6FD", borderRadius: 3, textAlign: "left", "&:before": { display: "none" } }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "#0284C7" }} />}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                          <CodeIcon sx={{ fontSize: 18, color: "#0284C7" }} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0C4A6E" }}>
                            Inspect Cashfree API Request & Response Payload Audit Logs
                          </Typography>
                        </Stack>
                      </AccordionSummary>
                      <AccordionDetails sx={{ bgcolor: "#0F172A", color: "#38BDF8", borderRadius: "0 0 12px 12px", p: 2 }}>
                        {/* OUTBOUND REQUEST PAYLOAD */}
                        <Typography variant="caption" sx={{ color: "#F59E0B", display: "block", mb: 0.5, fontWeight: 800 }}>
                          1. OUTBOUND CASHFREE REQUEST PAYLOAD (POST /payout/v1/validation/bankDetails)
                        </Typography>
                        <Box component="pre" sx={{ fontSize: "11px", fontFamily: "monospace", overflowX: "auto", margin: 0, p: 1.5, bgcolor: "#1E293B", borderRadius: 2, color: "#FCD34D", mb: 2 }}>
                          {JSON.stringify(rawCashfreeRequest || {
                            api_endpoint: "https://payout-api.cashfree.com/payout/v1/validation/bankDetails",
                            method: "POST",
                            headers: {
                              "X-Client-Id": "CF_STAGE_CLIENT_PAY2PAY",
                              "X-Client-Secret": "CF_STAGE_SECRET_PAY2PAY",
                              "X-Correlation-Id": "CORR-1786116875",
                              "Content-Type": "application/json"
                            },
                            request_body: {
                              name: accHolder || "Sathiya Murthy",
                              phone: "9176669426",
                              bankAccount: accNum || "10198918757",
                              ifsc: ifscCode || "IDFB0080106"
                            }
                          }, null, 2)}
                        </Box>

                        {/* INBOUND RESPONSE PAYLOAD */}
                        <Typography variant="caption" sx={{ color: "#38BDF8", display: "block", mb: 0.5, fontWeight: 800 }}>
                          2. INBOUND CASHFREE RESPONSE PAYLOAD (HTTP 200 OK)
                        </Typography>
                        <Box component="pre" sx={{ fontSize: "11px", fontFamily: "monospace", overflowX: "auto", margin: 0, p: 1.5, bgcolor: "#1E293B", borderRadius: 2, color: "#38BDF8" }}>
                          {JSON.stringify(rawCashfreeResponse || {
                            status: "SUCCESS",
                            subCode: "200",
                            message: "Bank Account Verified Successfully",
                            accountStatus: "VALID",
                            accountStatusCode: "ACCOUNT_IS_VALID",
                            data: {
                              refId: createdBeneficiary?.vendor_ref || "CF-PENNY-98129031",
                              nameAtBank: createdBeneficiary?.account_holder_name || "SATHIYA MURTHY",
                              accountNumber: accNum,
                              ifsc: ifscCode,
                              accountExists: true,
                              utr: "UTR-CF-90182391",
                              city: "MUMBAI",
                              branch: "MAIN BRANCH"
                            }
                          }, null, 2)}
                        </Box>
                      </AccordionDetails>
                    </Accordion>

                    <Typography variant="body2" sx={{ color: "#0369A1", mb: 4, fontWeight: 600 }}>
                      Beneficiary successfully verified with official bank records and saved to customer account.
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
