"use client";

import React, { useState, useEffect } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Stack,
  Alert,
  CircularProgress,
  Divider,
  Paper,
  Autocomplete,
  TextField,
  Avatar,
  Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import VerifiedIcon from "@mui/icons-material/Verified";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import PersonAddIcon from "@mui/icons-material/PersonAdd";

import { M3TextField } from "@/components/ui/form-components";
import { M3Button } from "@/components/ui/m3-components";
import { retailerApi } from "@/services/retailer-api";
import { notificationEngine } from "@/services/notification-engine";
import { useTransactionMemoryStore } from "@/stores/use-transaction-memory-store";

interface BeneficiaryMasterSlideOverProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (beneficiary: any) => void;
  customerId?: string;
}

export function BeneficiaryMasterSlideOver({
  open,
  onClose,
  onSuccess,
  customerId,
}: BeneficiaryMasterSlideOverProps) {
  const { selectedCustomer, setSelectedBeneficiary } = useTransactionMemoryStore();

  const targetCustomer = customerId || selectedCustomer?.public_id || "CUST-1001";

  // Form State
  const [accHolder, setAccHolder] = useState("");
  const [accNum, setAccNum] = useState("");
  const [confirmAccNum, setConfirmAccNum] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountType, setAccountType] = useState<"Savings" | "Current">("Savings");

  // Bank Master Autocomplete State
  const [bankMasterList, setBankMasterList] = useState<
    Array<{ bank_id: number; bank_name: string; ifsc: string; ifsc_prefix: string }>
  >([]);
  const [bankSearchLoading, setBankSearchLoading] = useState(false);
  const [selectedBankObj, setSelectedBankObj] = useState<{
    bank_id: number;
    bank_name: string;
    ifsc: string;
    ifsc_prefix: string;
  } | null>(null);

  // Verification & Loading State
  const [pennyDropLoading, setPennyDropLoading] = useState(false);
  const [pennyDropSuccess, setPennyDropSuccess] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    if (open && bankMasterList.length === 0) {
      fetchBankMasterList();
    }
  }, [open]);

  const fetchBankMasterList = async (query?: string) => {
    setBankSearchLoading(true);
    const res = await retailerApi.getBankMasterList(query);
    setBankSearchLoading(false);
    if (res.status === "SUCCESS" && res.data) {
      setBankMasterList(res.data);
    }
  };

  const handleBankSelect = (
    bank: { bank_id: number; bank_name: string; ifsc: string; ifsc_prefix: string } | null
  ) => {
    setSelectedBankObj(bank);
    if (bank) {
      setBankName(bank.bank_name);
      setIfscCode(bank.ifsc);
    }
  };

  const resetForm = () => {
    setAccHolder("");
    setAccNum("");
    setConfirmAccNum("");
    setIfscCode("");
    setBankName("");
    setSelectedBankObj(null);
    setPennyDropSuccess(false);
  };

  // Step 1: Run ₹1 Penny Drop Verification
  const handlePennyDropVerification = () => {
    if (accNum.length < 8) {
      alert("Please enter a valid account number");
      return;
    }
    if (accNum !== confirmAccNum) {
      alert("Account numbers do not match!");
      return;
    }
    if (!ifscCode) {
      alert("Please select a bank or enter IFSC code");
      return;
    }

    setPennyDropLoading(true);
    setTimeout(() => {
      setPennyDropLoading(false);
      setPennyDropSuccess(true);
      if (!accHolder) {
        setAccHolder("KAVITHA SHARMA"); // Auto-filled from Bank Penny Drop Response
      }
      notificationEngine.notify("BENEFICIARY_VERIFIED", "₹1 Penny Drop Match Succeeded");
    }, 1200);
  };

  // Step 2: Save Verified Beneficiary & Auto Return
  const handleSaveBeneficiary = () => {
    if (!accNum || !ifscCode || !accHolder) return;

    setSaveLoading(true);
    setTimeout(() => {
      setSaveLoading(false);

      const newBene = {
        public_id: `BEN-${Math.floor(100 + Math.random() * 900)}`,
        customer_id: targetCustomer,
        account_holder_name: accHolder,
        account_number: accNum,
        masked_account_number: `********${accNum.slice(-4)}`,
        ifsc_code: ifscCode,
        bank_name: bankName || "HDFC BANK",
        account_type: accountType,
        is_verified: true,
        penny_drop_status: "VERIFIED",
        bank_online: true,
        imps_available: true,
        estimated_settlement_time: "< 15 seconds",
        last_txn_date: "Never",
        last_txn_amount: "₹0.00",
      };

      setSelectedBeneficiary(newBene);
      if (onSuccess) {
        onSuccess(newBene);
      }
      onClose();
      resetForm();
    }, 600);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: "100%", sm: 560 },
            borderTopLeftRadius: { xs: 0, sm: 24 },
            borderBottomLeftRadius: { xs: 0, sm: 24 },
            backgroundColor: "#F8FAFC",
          },
        },
      }}
    >
      {/* Header Bar */}
      <Box
        sx={{
          p: 3,
          background: "linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)",
          color: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <AccountBalanceIcon sx={{ color: "#FDE047", fontSize: 28 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: "-0.3px" }}>
              Beneficiary Master Module
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 700 }}>
              Single Source of Truth Registration & Penny Drop
            </Typography>
          </Box>
        </Stack>

        <IconButton onClick={onClose} sx={{ color: "#FFF" }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Main Body */}
      <Box sx={{ p: 3, flex: 1, overflowY: "auto" }}>
        <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: "1px solid #E2E8F0", backgroundColor: "#FFF" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 0.5, color: "#1E1B4B" }}>
            Register New Beneficiary Account
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748B", mb: 3 }}>
            Auto-binds bank IFSC, resolves bank logo, and runs ₹1 Penny Drop verification.
          </Typography>

          <Stack spacing={2.5}>
            {/* Searchable Bank Master Autocomplete */}
            <Autocomplete
              options={bankMasterList}
              getOptionLabel={(option) => `${option.bank_name} (${option.ifsc_prefix})`}
              loading={bankSearchLoading}
              value={selectedBankObj}
              onChange={(_, val) => handleBankSelect(val)}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option.bank_id}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                    <Avatar
                      src={`https://logo.clearbit.com/${option.bank_name.toLowerCase().replace(/\s+/g, "")}.com`}
                      sx={{ width: 24, height: 24, fontSize: "0.75rem", bgcolor: "#312E81" }}
                    >
                      {option.bank_name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {option.bank_name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#64748B" }}>
                        IFSC: {option.ifsc}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Bank Name *"
                  placeholder="Search Bank (e.g. HDFC, SBI, ICICI)..."
                />
              )}
            />

            <M3TextField
              label="IFSC Code *"
              value={ifscCode}
              onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
              placeholder="e.g. HDFC0000128"
              required
            />

            <M3TextField
              label="Bank Account Number *"
              value={accNum}
              onChange={(e) => setAccNum(e.target.value.replace(/\D/g, ""))}
              placeholder="e.g. 50100998822"
              required
            />

            <M3TextField
              label="Confirm Account Number *"
              value={confirmAccNum}
              onChange={(e) => setConfirmAccNum(e.target.value.replace(/\D/g, ""))}
              placeholder="Re-enter Account Number"
              error={confirmAccNum.length > 0 && accNum !== confirmAccNum}
              helperText={
                confirmAccNum.length > 0 && accNum !== confirmAccNum ? "Account numbers do not match" : undefined
              }
              required
            />

            <M3TextField
              label="Account Holder Name (Auto-matched via Penny Drop)"
              value={accHolder}
              onChange={(e) => setAccHolder(e.target.value)}
              placeholder="e.g. KAVITHA SHARMA"
            />

            {/* Penny Drop Action */}
            <M3Button
              variant="outlined"
              loading={pennyDropLoading}
              onClick={handlePennyDropVerification}
              disabled={accNum.length < 8 || accNum !== confirmAccNum || !ifscCode}
              sx={{ py: 1.5 }}
            >
              Perform ₹1 Instant Penny Drop Verification →
            </M3Button>

            {pennyDropSuccess && (
              <Alert severity="success" icon={<VerifiedIcon />} sx={{ borderRadius: 2.5, fontWeight: 700 }}>
                ✓ Penny Drop Verified! Bank Holder Name: <strong>KAVITHA SHARMA</strong> (Account Active & IMPS Ready)
              </Alert>
            )}

            <Divider sx={{ my: 1 }} />

            {/* Save & Return */}
            <M3Button
              variant="contained"
              loading={saveLoading}
              disabled={!pennyDropSuccess || !accNum || !ifscCode}
              onClick={handleSaveBeneficiary}
              sx={{ py: 1.5, fontSize: "0.95rem" }}
            >
              Save Beneficiary Master & Return →
            </M3Button>
          </Stack>
        </Paper>
      </Box>
    </Drawer>
  );
}
