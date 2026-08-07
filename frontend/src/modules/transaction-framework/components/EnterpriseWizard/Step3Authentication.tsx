import React from "react";
import {
  Box,
  Typography,
  Stack,
  Paper,
  Button,
  Divider,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import SendIcon from "@mui/icons-material/Send";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { CustomerData } from "../../hooks/useCustomer";
import { BeneficiaryData } from "../../hooks/useBeneficiary";

export interface Step3AuthenticationProps {
  customer: CustomerData | null;
  beneficiary: BeneficiaryData | null;
  amount: number;
  charges: number;
  totalPayable: number;
  onBack: () => void;
  onAuthorize: () => void;
}

export const Step3Authentication: React.FC<Step3AuthenticationProps> = ({
  customer,
  beneficiary,
  amount,
  charges,
  totalPayable,
  onBack,
  onAuthorize,
}) => {
  return (
    <Box sx={{ maxWidth: 960, mx: "auto", py: 2 }}>
      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: "20px",
          bgcolor: "rgba(18, 27, 48, 0.85)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 3 }}>
          <LockIcon sx={{ color: "#2563EB", fontSize: 28 }} />
          <Box>
            <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "20px" }}>
              STEP 3: AUTHORIZE TRANSFER TRANSACTION
            </Typography>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>
              Verify details before proceeding to physical keyboard PIN entry
            </Typography>
          </Box>
        </Stack>

        <Paper elevation={0} sx={{ p: 3, borderRadius: "16px", bgcolor: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)", mb: 3 }}>
          <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", mb: 2 }}>
            FINAL TRANSACTION PREVIEW
          </Typography>

          <Stack spacing={1.5}>
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Source Customer</Typography>
              <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "14px" }}>{customer?.name} ({customer?.mobile})</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Target Beneficiary</Typography>
              <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "14px" }}>{beneficiary?.name}</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Account & Bank</Typography>
              <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "14px" }}>{beneficiary?.bankName} · {beneficiary?.accountNumber}</Typography>
            </Stack>

            <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", my: 1 }} />

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Transfer Amount</Typography>
              <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "18px" }}>₹{amount.toLocaleString()}.00</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Net Wallet Debit</Typography>
              <Typography sx={{ fontWeight: 900, color: "#3B82F6", fontSize: "18px" }}>₹{totalPayable.toLocaleString()}.00</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Settlement ETA</Typography>
              <Typography sx={{ fontWeight: 800, color: "#4ADE80", fontSize: "14px" }}>1.2 sec (HDFC IMPS)</Typography>
            </Stack>
          </Stack>
        </Paper>

        <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between" }}>
          <Button variant="text" onClick={onBack} startIcon={<ArrowBackIcon />} sx={{ color: "rgba(255, 255, 255, 0.7)", fontWeight: 700 }}>
            Back to Beneficiary & Amount
          </Button>

          <Button
            variant="contained"
            onClick={onAuthorize}
            startIcon={<SendIcon />}
            sx={{
              height: 48,
              borderRadius: "12px",
              fontWeight: 900,
              fontSize: "15px",
              bgcolor: "#2563EB",
              color: "#FFFFFF",
              boxShadow: "0 4px 20px rgba(37, 99, 235, 0.4)",
            }}
          >
            PROCEED TO AUTHORIZATION
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};
