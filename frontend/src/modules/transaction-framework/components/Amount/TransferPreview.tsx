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
        bgcolor: "var(--surface, #FFFFFF)",
        border: "1px solid var(--brand-border, #E2E8F0)",
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
        width: "100%",
      }}
    >
      <Typography sx={{ color: "var(--brand-primary, #0F3B7D)", fontWeight: 800, fontSize: "14px", letterSpacing: "0.05em", textTransform: "uppercase", mb: 1.5 }}>
        TRANSFER PREVIEW & AUDIT SUMMARY
      </Typography>

      <Stack spacing={1.5}>
        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography sx={{ color: "var(--text-muted, #64748B)", fontSize: "13px", fontWeight: 600 }}>Source Customer</Typography>
          <Typography sx={{ fontWeight: 700, color: "var(--text-primary, #0F172A)", fontSize: "14px" }}>
            {customerName} ({customerMobile})
          </Typography>
        </Stack>

        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography sx={{ color: "var(--text-muted, #64748B)", fontSize: "13px", fontWeight: 600 }}>Target Beneficiary</Typography>
          <Typography sx={{ fontWeight: 700, color: "var(--text-primary, #0F172A)", fontSize: "14px" }}>
            {beneficiaryName} ({bankName} · {maskedAcc})
          </Typography>
        </Stack>

        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography sx={{ color: "var(--text-muted, #64748B)", fontSize: "13px", fontWeight: 600 }}>Transfer Channel</Typography>
          <Typography sx={{ fontWeight: 800, color: "var(--brand-primary, #0F3B7D)", fontSize: "14px" }}>IMPS DirectSwitch</Typography>
        </Stack>

        <Divider sx={{ borderColor: "var(--border, #E2E8F0)", my: 0.5 }} />

        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography sx={{ color: "var(--text-muted, #64748B)", fontSize: "13px", fontWeight: 600 }}>Transfer Amount</Typography>
          <Typography sx={{ fontWeight: 800, color: "var(--text-primary, #0F172A)", fontSize: "15px" }}>₹{amount.toLocaleString()}</Typography>
        </Stack>

        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography sx={{ color: "var(--text-muted, #64748B)", fontSize: "13px", fontWeight: 600 }}>Net Wallet Debit</Typography>
          <Typography sx={{ fontWeight: 900, color: "var(--brand-primary, #0F3B7D)", fontSize: "16px" }}>₹{totalPayable.toLocaleString()}</Typography>
        </Stack>

        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography sx={{ color: "var(--text-muted, #64748B)", fontSize: "13px", fontWeight: 600 }}>Wallet Balance After Transfer</Typography>
          <Typography sx={{ fontWeight: 800, color: "var(--brand-primary, #0F3B7D)", fontSize: "15px" }}>₹{balanceAfter.toLocaleString()}</Typography>
        </Stack>
      </Stack>
    </Paper>
  );
};
