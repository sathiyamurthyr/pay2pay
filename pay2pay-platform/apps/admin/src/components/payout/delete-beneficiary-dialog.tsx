"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Paper,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  IconButton,
  Chip,
  Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import ShieldIcon from "@mui/icons-material/Shield";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import { motion } from "framer-motion";

export interface DeleteBeneficiaryDialogProps {
  open: boolean;
  onClose: () => void;
  beneficiary: {
    id: string;
    name: string;
    bankName: string;
    accountNumber: string;
    maskedAccountNumber?: string;
    ifsc: string;
    beneficiaryCode?: string;
  } | null;
  onConfirmDelete: (beneficiaryId: string, reason: string) => Promise<void>;
}

const REASON_OPTIONS = [
  "Customer Requested Removal",
  "Incorrect Bank Account or IFSC",
  "Account Closed / Transferred",
  "Duplicate Beneficiary Record",
  "Suspected Fraudulent / Unverified Account",
  "Other Reason",
];

export const DeleteBeneficiaryDialog: React.FC<DeleteBeneficiaryDialogProps> = ({
  open,
  onClose,
  beneficiary,
  onConfirmDelete,
}) => {
  const [reason, setReason] = useState<string>(REASON_OPTIONS[0]);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  if (!beneficiary) return null;

  const maskedAcc =
    beneficiary.maskedAccountNumber ||
    (beneficiary.accountNumber.length >= 4
      ? `•••• •••• ${beneficiary.accountNumber.slice(-4)}`
      : beneficiary.accountNumber);

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMessage("");
    try {
      await onConfirmDelete(beneficiary.id, reason);
      setIsDeleting(false);
      onClose();
    } catch (err: any) {
      setIsDeleting(false);
      setErrorMessage(err?.message || "Failed to soft-delete beneficiary. Please try again.");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={isDeleting ? undefined : onClose}
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
            border: "1px solid rgba(239, 68, 68, 0.35)",
            boxShadow: "0 25px 70px rgba(0, 0, 0, 0.8), 0 0 40px rgba(239, 68, 68, 0.15)",
          },
        },
      }}
    >
      {/* Top Red Danger Accent Bar */}
      <Box
        sx={{
          height: 6,
          background: "linear-gradient(90deg, #EF4444, #F87171, #DC2626)",
          backgroundSize: "200% 100%",
          animation: "shimmerRed 2s infinite linear",
          "@keyframes shimmerRed": {
            "0%": { backgroundPosition: "-200% 0" },
            "100%": { backgroundPosition: "200% 0" },
          },
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
          justify: "space-between",
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <WarningAmberIcon sx={{ color: "#F87171", fontSize: 24 }} />
          <Typography variant="h6" sx={{ fontWeight: 900, fontSize: "17px", color: "#FFFFFF" }}>
            Soft-Delete Beneficiary
          </Typography>
        </Stack>
        <IconButton onClick={onClose} disabled={isDeleting} sx={{ color: "#94A3B8" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 2 }}>
        <Typography variant="body2" sx={{ color: "#CBD5E1", mb: 2, fontSize: "13px", lineHeight: 1.5 }}>
          Are you sure you want to deactivate and soft-delete this beneficiary? This will mark the record as{" "}
          <strong style={{ color: "#F87171" }}>INACTIVE</strong> and remove it from active transfer workflows.
        </Typography>

        {/* Beneficiary Target Card */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: "rgba(30, 41, 59, 0.75)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            mb: 2.5,
          }}
        >
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "16px" }}>
                {beneficiary.name}
              </Typography>
              <Typography variant="caption" sx={{ color: "#60A5FA", fontWeight: 700, fontFamily: "monospace" }}>
                {beneficiary.beneficiaryCode || beneficiary.id}
              </Typography>
            </Box>
            <Chip
              label="ACTIVE"
              size="small"
              sx={{ bgcolor: "rgba(16, 185, 129, 0.2)", color: "#34D399", fontWeight: 800, fontSize: "10px", height: 20 }}
            />
          </Stack>

          <Stack direction="row" spacing={1} sx={{ alignItems: "center", color: "#94A3B8", fontSize: "12px", mb: 0.5 }}>
            <AccountBalanceIcon sx={{ fontSize: 16, color: "#60A5FA" }} />
            <Typography variant="caption" sx={{ fontWeight: 700, color: "#FFFFFF" }}>
              {beneficiary.bankName}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={2} sx={{ color: "#CBD5E1", fontSize: "12px" }}>
            <Typography variant="caption" sx={{ fontFamily: "monospace", letterSpacing: "0.5px" }}>
              Acc: {maskedAcc}
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: "monospace", color: "#94A3B8" }}>
              IFSC: {beneficiary.ifsc}
            </Typography>
          </Stack>
        </Paper>

        {/* Reason Dropdown */}
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel id="delete-reason-label" sx={{ color: "#94A3B8", fontWeight: 700 }}>
            Deactivation Reason
          </InputLabel>
          <Select
            labelId="delete-reason-label"
            value={reason}
            label="Deactivation Reason"
            onChange={(e) => setReason(e.target.value)}
            disabled={isDeleting}
            sx={{
              bgcolor: "#0F172A",
              color: "#FFFFFF",
              borderRadius: 2.5,
              fontWeight: 700,
              fontSize: "13px",
              "& .MuiOutlinedInput-notchedOutline": { borderColor: "#334155" },
              "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#F87171" },
              "& .MuiSvgIcon-root": { color: "#94A3B8" },
            }}
          >
            {REASON_OPTIONS.map((opt) => (
              <MenuItem key={opt} value={opt} sx={{ fontSize: "13px", fontWeight: 600 }}>
                {opt}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Security / Audit Note */}
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            borderRadius: 2.5,
            bgcolor: "rgba(15, 23, 42, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            gap: 1.25,
          }}
        >
          <ShieldIcon sx={{ fontSize: 18, color: "#38BDF8" }} />
          <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px", fontWeight: 600 }}>
            Audit log entry will record retailer ID, timestamp, and specified deactivation reason.
          </Typography>
        </Paper>

        {errorMessage && (
          <Typography variant="caption" sx={{ color: "#EF4444", fontWeight: 700, display: "block", mt: 1.5 }}>
            {errorMessage}
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2.5, pt: 0, px: 3, justifyContent: "space-between" }}>
        <Button
          onClick={onClose}
          disabled={isDeleting}
          sx={{ color: "#94A3B8", fontWeight: 700, borderRadius: 2.5 }}
        >
          Cancel
        </Button>
        <motion.div whileHover={{ scale: isDeleting ? 1 : 1.02 }} whileTap={{ scale: isDeleting ? 1 : 0.97 }}>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : <DeleteForeverIcon />}
            sx={{
              bgcolor: "#DC2626",
              "&:hover": { bgcolor: "#B91C1C" },
              fontWeight: 900,
              fontSize: "13px",
              borderRadius: 2.5,
              px: 2.5,
              py: 1,
              boxShadow: "0 4px 14px rgba(220, 38, 38, 0.35)",
            }}
          >
            {isDeleting ? "Deactivating…" : "Confirm Soft-Delete"}
          </Button>
        </motion.div>
      </DialogActions>
    </Dialog>
  );
};
