import React from "react";
import { Box, Typography, Stack, Paper, Divider } from "@mui/material";

export interface TransferPreviewProps {
  customerName?: string;
  customerMobile?: string;
  beneficiaryName?: string;
  beneficiaryAccount?: string;
  bankName?: string;
  amount: number;
  totalPayable: number;
  walletBalance?: number;
}

export const TransferPreview: React.FC<TransferPreviewProps> = ({
  customerName = "Customer",
  customerMobile = "—",
  beneficiaryName = "Beneficiary",
  beneficiaryAccount = "—",
  bankName = "Bank",
  amount,
  totalPayable,
  walletBalance = 0,
}) => {
  const maskedAcc = beneficiaryAccount && beneficiaryAccount.length >= 4 ? `•••• •••• ${beneficiaryAccount.slice(-4)}` : beneficiaryAccount;
  const balanceAfter = Math.max(0, walletBalance - totalPayable);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: "16px",
        bgcolor: "rgba(18, 27, 48, 0.75)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25)",
        width: "100%",
      }}
    >
      <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "14px", letterSpacing: "0.05em", textTransform: "uppercase", mb: 1.5 }}>
        TRANSFER PREVIEW & AUDIT SUMMARY
      </Typography>

      <Stack spacing={1.5}>
        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px", fontWeight: 600 }}>Source Customer</Typography>
          <Typography sx={{ fontWeight: 700, color: "#FFFFFF", fontSize: "14px" }}>
            {customerName} ({customerMobile})
          </Typography>
        </Stack>

        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px", fontWeight: 600 }}>Target Beneficiary</Typography>
          <Typography sx={{ fontWeight: 700, color: "#FFFFFF", fontSize: "14px" }}>
            {beneficiaryName} ({bankName} · {maskedAcc})
          </Typography>
        </Stack>

        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px", fontWeight: 600 }}>Transfer Channel</Typography>
          <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "14px" }}>IMPS DirectSwitch</Typography>
        </Stack>

        <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.1)", my: 0.5 }} />

        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px", fontWeight: 600 }}>Transfer Amount</Typography>
          <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "15px" }}>₹{amount.toLocaleString()}</Typography>
        </Stack>

        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px", fontWeight: 600 }}>Net Wallet Debit</Typography>
          <Typography sx={{ fontWeight: 900, color: "#3B82F6", fontSize: "16px" }}>₹{totalPayable.toLocaleString()}</Typography>
        </Stack>

        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px", fontWeight: 600 }}>Wallet Balance After Transfer</Typography>
          <Typography sx={{ fontWeight: 800, color: "#FBBF24", fontSize: "15px" }}>₹{balanceAfter.toLocaleString()}</Typography>
        </Stack>
      </Stack>
    </Paper>
  );
};
