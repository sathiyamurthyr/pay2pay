import React from "react";
import { Box, Typography, Stack, Paper, Avatar, Chip, Divider } from "@mui/material";
import ShieldIcon from "@mui/icons-material/Shield";
import StarIcon from "@mui/icons-material/Star";
import { CustomerData } from "../../hooks/useCustomer";
import { BeneficiaryData } from "../../hooks/useBeneficiary";

export interface TransactionContextProps {
  customer: CustomerData | null;
  beneficiary: BeneficiaryData | null;
}

export const TransactionContext: React.FC<TransactionContextProps> = ({ customer, beneficiary }) => {
  const displayCode = customer?.customerCode || customer?.id || "—";
  const maskedAcc = beneficiary?.accountNumber || beneficiary?.maskedAccountNumber || "—";

  return (
    <Stack spacing={2.5} sx={{ width: "100%" }}>
      {/* 1. CUSTOMER CONTEXT CARD */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: "16px",
          bgcolor: "rgba(18, 27, 48, 0.75)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25)",
        }}
      >
        <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", mb: 1.5 }}>
          CUSTOMER CONTEXT TELEMETRY
        </Typography>

        <Stack direction="row" spacing={2} sx={{ alignItems: "center", mb: 2 }}>
          <Avatar sx={{ bgcolor: "#2563EB", color: "#FFFFFF", width: 44, height: 44, fontWeight: 900, fontSize: "16px" }}>
            {customer?.name?.charAt(0) || "C"}
          </Avatar>
          <Box>
            <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "16px", lineHeight: 1.2 }}>
              {customer?.name || "Customer Not Selected"}
            </Typography>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontWeight: 600, fontSize: "12px", mt: 0.25 }}>
              Code: <strong style={{ color: "#60A5FA" }}>{displayCode}</strong>
            </Typography>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.80)", fontWeight: 600, fontSize: "12px" }}>
              Mobile: {customer?.mobile || "—"}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Chip icon={<ShieldIcon sx={{ "&&": { color: "#4ADE80", fontSize: 13 } }} />} label={customer?.kycStatus || "PENDING"} size="small" sx={{ bgcolor: "rgba(34, 197, 94, 0.15)", color: "#4ADE80", fontWeight: 800, height: 22, fontSize: "11px" }} />
          {customer?.riskRating && (
            <Chip label={`Risk: ${customer.riskRating}`} size="small" sx={{ bgcolor: "rgba(56, 189, 248, 0.15)", color: "#38BDF8", fontWeight: 800, height: 22, fontSize: "11px" }} />
          )}
        </Stack>

        <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", my: 1.5 }} />

        <Stack spacing={1}>
          <Stack direction="row" sx={{ justifyContent: "space-between" }}>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px", fontWeight: 600 }}>Wallet Balance</Typography>
            <Typography sx={{ fontWeight: 900, color: "#FBBF24", fontSize: "14px" }}>₹{Number(customer?.walletBalance ?? 0).toLocaleString()}</Typography>
          </Stack>
          <Stack direction="row" sx={{ justifyContent: "space-between" }}>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px", fontWeight: 600 }}>Daily Remaining</Typography>
            <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "13px" }}>₹{Number(customer?.dailyLimitRemaining ?? 0).toLocaleString()}</Typography>
          </Stack>
          <Stack direction="row" sx={{ justifyContent: "space-between" }}>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px", fontWeight: 600 }}>Monthly Remaining</Typography>
            <Typography sx={{ fontWeight: 800, color: "#34D399", fontSize: "13px" }}>₹{Number(customer?.monthlyLimitRemaining ?? 0).toLocaleString()}</Typography>
          </Stack>
          <Stack direction="row" sx={{ justifyContent: "space-between" }}>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px", fontWeight: 600 }}>Preferred Bank</Typography>
            <Typography sx={{ fontWeight: 700, color: "#FFFFFF", fontSize: "13px" }}>{customer?.preferredBank || "—"}</Typography>
          </Stack>
          <Stack direction="row" sx={{ justifyContent: "space-between" }}>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px", fontWeight: 600 }}>Relationship Mgr</Typography>
            <Typography sx={{ fontWeight: 700, color: "#93C5FD", fontSize: "13px" }}>{customer?.relationshipManager || "—"}</Typography>
          </Stack>
        </Stack>
      </Paper>

      {/* 2. BENEFICIARY CONTEXT CARD */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: "16px",
          bgcolor: beneficiary ? "rgba(37, 99, 235, 0.15)" : "rgba(18, 27, 48, 0.75)",
          backdropFilter: "blur(20px)",
          border: beneficiary ? "1px solid rgba(37, 99, 235, 0.35)" : "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25)",
        }}
      >
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
          <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            SELECTED BENEFICIARY CONTEXT
          </Typography>
          {beneficiary?.isFavorite && <StarIcon sx={{ color: "#FFD54F", fontSize: 18 }} />}
        </Stack>

        {beneficiary ? (
          <Stack spacing={1}>
            <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "17px" }}>
              {beneficiary.name}
            </Typography>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.70)", fontSize: "13px", fontWeight: 600 }}>
              {beneficiary.bankName} · <strong style={{ color: "#FFFFFF", fontFamily: "monospace" }}>{maskedAcc}</strong>
            </Typography>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "12px" }}>
              IFSC: {beneficiary.ifsc} · {beneficiary.relationship || "Beneficiary"}
            </Typography>
          </Stack>
        ) : (
          <Typography sx={{ color: "rgba(255, 255, 255, 0.40)", fontSize: "13px", fontStyle: "italic" }}>
            No beneficiary selected yet.
          </Typography>
        )}
      </Paper>
    </Stack>
  );
};
