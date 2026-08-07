import React from "react";
import {
  Box,
  Typography,
  Stack,
  Paper,
  Button,
  Divider,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { CustomerData } from "../../hooks/useCustomer";
import { BeneficiaryData } from "../../hooks/useBeneficiary";

export interface WorkstationStep3Props {
  customer: CustomerData | null;
  beneficiary: BeneficiaryData | null;
  amount: number;
  charges: number;
  totalPayable: number;
  onBack: () => void;
  onAuthorize: () => void;
}

export const WorkstationStep3: React.FC<WorkstationStep3Props> = ({
  customer,
  beneficiary,
  amount,
  charges,
  totalPayable,
  onBack,
  onAuthorize,
}) => {
  const gst = Math.round(charges * 0.18);
  const netCommission = Math.round(amount * 0.0035);

  return (
    <Box sx={{ maxWidth: 860, mx: "auto", pt: 2 }}>
      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: "16px",
          bgcolor: "rgba(18, 27, 48, 0.85)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 3 }}>
          <AccountBalanceWalletIcon sx={{ color: "#2563EB", fontSize: 28 }} />
          <Box>
            <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "20px" }}>
              STEP 3: TRANSFER AMOUNT & FINANCIAL SUMMARY
            </Typography>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>
              Verify financial calculations before proceeding to PIN authorization.
            </Typography>
          </Box>
        </Stack>

        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: "14px",
            bgcolor: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            mb: 3,
          }}
        >
          <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", mb: 2 }}>
            FINANCIAL SUMMARY
          </Typography>

          <Stack spacing={1.5}>
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Transfer Amount</Typography>
              <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "18px" }}>₹{amount.toLocaleString()}.00</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Convenience Fee</Typography>
              <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "14px" }}>+ ₹{charges}.00</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>GST (18%)</Typography>
              <Typography sx={{ fontWeight: 800, color: "#93C5FD", fontSize: "14px" }}>+ ₹{gst}.00</Typography>
            </Stack>

            <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", my: 0.5 }} />

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.80)", fontWeight: 700, fontSize: "14px" }}>TOTAL WALLET DEBIT</Typography>
              <Typography sx={{ fontWeight: 900, color: "#3B82F6", fontSize: "20px" }}>₹{totalPayable.toLocaleString()}.00</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Retailer Net Commission</Typography>
              <Typography sx={{ fontWeight: 900, color: "#4ADE80", fontSize: "15px" }}>+ ₹{netCommission}.00</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Operator Wallet After Transfer</Typography>
              <Typography sx={{ fontWeight: 800, color: "#FBBF24", fontSize: "15px" }}>
                ₹{((customer?.walletBalance ?? 124500) - totalPayable).toLocaleString()}.00
              </Typography>
            </Stack>
          </Stack>
        </Paper>

        <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between" }}>
          <Button variant="outlined" onClick={onBack} startIcon={<ArrowBackIcon />} sx={{ height: 48, borderRadius: "10px", color: "rgba(255, 255, 255, 0.7)" }}>
            Back to Beneficiary
          </Button>

          <Button
            variant="contained"
            onClick={onAuthorize}
            endIcon={<ArrowForwardIcon />}
            sx={{
              height: 48,
              borderRadius: "10px",
              fontWeight: 900,
              fontSize: "15px",
              bgcolor: "#2563EB",
              boxShadow: "0 4px 16px rgba(37, 99, 235, 0.4)",
            }}
          >
            PROCEED TO AUTHORIZATION
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};
