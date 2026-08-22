"use client";

import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Paper,
  Button,
  IconButton,
  Chip,
  Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { motion } from "framer-motion";

export interface DuplicateBeneficiaryModalProps {
  open: boolean;
  onClose: () => void;
  existingBeneficiary: {
    beneficiary_id?: string;
    id?: string;
    account_holder_name?: string;
    name?: string;
    bank_name?: string;
    bankName?: string;
    account_number_masked?: string;
    maskedAccountNumber?: string;
    account_number?: string;
    accountNumber?: string;
    ifsc_code?: string;
    ifsc?: string;
    verification_status?: string;
    status?: string;
  } | null;
  onUseExisting: (beneficiary: any) => void;
}

export const DuplicateBeneficiaryModal: React.FC<DuplicateBeneficiaryModalProps> = ({
  open,
  onClose,
  existingBeneficiary,
  onUseExisting,
}) => {
  if (!existingBeneficiary) return null;

  const name =
    existingBeneficiary.account_holder_name ||
    existingBeneficiary.name ||
    "Existing Beneficiary";
  const bank =
    existingBeneficiary.bank_name ||
    existingBeneficiary.bankName ||
    "Partner Bank";
  const rawAcc =
    existingBeneficiary.account_number_masked ||
    existingBeneficiary.maskedAccountNumber ||
    existingBeneficiary.account_number ||
    existingBeneficiary.accountNumber ||
    "";
  const maskedAcc = rawAcc || "0630104000156974";
  const ifsc = existingBeneficiary.ifsc_code || existingBeneficiary.ifsc || "";
  const statusLabel = (
    existingBeneficiary.verification_status ||
    existingBeneficiary.status ||
    "VERIFIED"
  ).toUpperCase();

  const handleUseExisting = () => {
    onUseExisting({
      id: existingBeneficiary.beneficiary_id || existingBeneficiary.id || `BEN-${Date.now()}`,
      name,
      bankName: bank,
      accountNumber: rawAcc,
      maskedAccountNumber: maskedAcc,
      ifsc,
      isVerified: true,
      status: "ACTIVE",
    });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 5,
            overflow: "hidden",
            p: 0,
            bgcolor: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(24px)",
            color: "#FFFFFF",
            border: "1px solid rgba(245, 158, 11, 0.4)",
            boxShadow: "0 25px 70px rgba(0, 0, 0, 0.8), 0 0 40px rgba(245, 158, 11, 0.15)",
          },
        },
      }}
    >
      {/* Top Gold Amber Accent Bar */}
      <Box
        sx={{
          height: 6,
          background: "linear-gradient(90deg, #F59E0B, #FBBF24, #D97706)",
          backgroundSize: "200% 100%",
        }}
      />

      <DialogTitle
        sx={{
          fontWeight: 900,
          color: "#FFFFFF",
          pt: 2.5,
          pb: 1,
          px: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <WarningAmberIcon sx={{ color: "#FBBF24", fontSize: 24 }} />
          <Typography variant="h6" sx={{ fontWeight: 900, fontSize: "17px", color: "#FFFFFF" }}>
            Beneficiary Already Exists
          </Typography>
        </Stack>
        <IconButton onClick={onClose} sx={{ color: "#94A3B8" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 2 }}>
        <Typography variant="body2" sx={{ color: "#CBD5E1", mb: 2, fontSize: "13px", lineHeight: 1.5 }}>
          An active beneficiary with this account number and IFSC code is already registered for this customer.
        </Typography>

        {/* Existing Beneficiary Target Card */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: "rgba(30, 41, 59, 0.85)",
            border: "1px solid rgba(245, 158, 11, 0.35)",
            mb: 2,
          }}
        >
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
            <Box>
              <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "10px", display: "block" }}>
                BENEFICIARY NAME
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "16px" }}>
                {name}
              </Typography>
            </Box>
            <Chip
              icon={<CheckCircleIcon style={{ color: "#34D399", fontSize: 14 }} />}
              label={statusLabel}
              size="small"
              sx={{ bgcolor: "rgba(16, 185, 129, 0.2)", color: "#34D399", fontWeight: 800, fontSize: "10px", height: 22 }}
            />
          </Stack>

          <Stack direction="row" spacing={1} sx={{ alignItems: "center", color: "#CBD5E1", fontSize: "13px", mb: 1 }}>
            <AccountBalanceIcon sx={{ fontSize: 16, color: "#60A5FA" }} />
            <Typography variant="caption" sx={{ fontWeight: 700, color: "#FFFFFF", fontSize: "13px" }}>
              {bank}
            </Typography>
          </Stack>

          <Box sx={{ p: 1.25, bgcolor: "rgba(15, 23, 42, 0.6)", borderRadius: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "10px", fontWeight: 700, display: "block" }}>
                ACCOUNT NUMBER (MASKED)
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 800, color: "#FBBF24", fontSize: "13px" }}>
                {maskedAcc}
              </Typography>
            </Box>
            {ifsc && (
              <Box sx={{ textAlign: "right" }}>
                <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "10px", fontWeight: 700, display: "block" }}>
                  IFSC CODE
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700, color: "#94A3B8", fontSize: "12px" }}>
                  {ifsc}
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, pt: 0, px: 3, justifyContent: "space-between" }}>
        <Button onClick={onClose} sx={{ color: "#94A3B8", fontWeight: 700, borderRadius: 2.5 }}>
          Cancel
        </Button>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <Button
            variant="contained"
            onClick={handleUseExisting}
            endIcon={<ArrowForwardIcon />}
            sx={{
              bgcolor: "#2563EB",
              "&:hover": { bgcolor: "#1D4ED8" },
              fontWeight: 900,
              fontSize: "13px",
              borderRadius: 2.5,
              px: 2.5,
              py: 1,
              boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
            }}
          >
            Use Existing Beneficiary
          </Button>
        </motion.div>
      </DialogActions>
    </Dialog>
  );
};
