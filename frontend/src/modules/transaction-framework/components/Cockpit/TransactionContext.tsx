import React from "react";
import { Box, Typography, Stack, Paper, Avatar, Chip, Button, Divider } from "@mui/material";
import ShieldIcon from "@mui/icons-material/Shield";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import StarIcon from "@mui/icons-material/Star";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import HistoryIcon from "@mui/icons-material/History";
import EditIcon from "@mui/icons-material/Edit";
import SecurityIcon from "@mui/icons-material/Security";
import NoteAltIcon from "@mui/icons-material/NoteAlt";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { CustomerData } from "../../hooks/useCustomer";
import { BeneficiaryData } from "../../hooks/useBeneficiary";

export interface TransactionContextProps {
  customer: CustomerData | null;
  beneficiary: BeneficiaryData | null;
}

export const TransactionContext: React.FC<TransactionContextProps> = ({ customer, beneficiary }) => {
  const displayCode = customer?.customerCode || (customer?.id.includes("-") && customer?.id.length > 20 ? `CUS-${customer?.mobile.slice(-4)}` : customer?.id) || "CUS-9812";
  const maskedAcc = beneficiary?.maskedAccountNumber || (beneficiary?.accountNumber && beneficiary.accountNumber.length >= 4 ? `•••• ${beneficiary.accountNumber.slice(-4)}` : "•••• 9426");

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
            {customer?.name.charAt(0) || "C"}
          </Avatar>
          <Box>
            <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "16px", lineHeight: 1.2 }}>
              {customer?.name || "Ramesh Kumar"}
            </Typography>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontWeight: 600, fontSize: "12px", mt: 0.25 }}>
              Code: <strong style={{ color: "#60A5FA" }}>{displayCode}</strong>
            </Typography>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.80)", fontWeight: 600, fontSize: "12px" }}>
              Mobile: {customer?.mobile || "9876543210"}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Chip icon={<ShieldIcon sx={{ "&&": { color: "#4ADE80", fontSize: 13 } }} />} label={customer?.kycStatus || "VERIFIED"} size="small" sx={{ bgcolor: "rgba(34, 197, 94, 0.15)", color: "#4ADE80", fontWeight: 800, height: 22, fontSize: "11px" }} />
          <Chip label={`Risk: ${customer?.riskRating || "LOW"}`} size="small" sx={{ bgcolor: "rgba(56, 189, 248, 0.15)", color: "#38BDF8", fontWeight: 800, height: 22, fontSize: "11px" }} />
        </Stack>

        <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", my: 1.5 }} />

        <Stack spacing={1}>
          <Stack direction="row" sx={{ justifyContent: "space-between" }}>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px", fontWeight: 600 }}>Wallet Balance</Typography>
            <Typography sx={{ fontWeight: 900, color: "#FBBF24", fontSize: "14px" }}>₹{(customer?.walletBalance ?? 124500).toLocaleString()}</Typography>
          </Stack>
          <Stack direction="row" sx={{ justifyContent: "space-between" }}>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px", fontWeight: 600 }}>Daily Remaining</Typography>
            <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "13px" }}>₹{(customer?.dailyLimitRemaining ?? 25000).toLocaleString()}</Typography>
          </Stack>
          <Stack direction="row" sx={{ justifyContent: "space-between" }}>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px", fontWeight: 600 }}>Monthly Remaining</Typography>
            <Typography sx={{ fontWeight: 800, color: "#34D399", fontSize: "13px" }}>₹{(customer?.monthlyLimitRemaining ?? 200000).toLocaleString()}</Typography>
          </Stack>
          <Stack direction="row" sx={{ justifyContent: "space-between" }}>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px", fontWeight: 600 }}>Preferred Bank & Mode</Typography>
            <Typography sx={{ fontWeight: 700, color: "#FFFFFF", fontSize: "13px" }}>{customer?.preferredBank || "HDFC"} (IMPS)</Typography>
          </Stack>
          <Stack direction="row" sx={{ justifyContent: "space-between" }}>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px", fontWeight: 600 }}>Relationship Mgr</Typography>
            <Typography sx={{ fontWeight: 700, color: "#93C5FD", fontSize: "13px" }}>Vikram Singh (P2P)</Typography>
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
              IFSC: {beneficiary.ifsc} · {beneficiary.relationship || "Family"}
            </Typography>

            <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", my: 1 }} />

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Transfer Count</Typography>
              <Typography sx={{ fontWeight: 800, color: "#4ADE80", fontSize: "13px" }}>{beneficiary.transferCount || 18} Transfers</Typography>
            </Stack>
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Average Amount</Typography>
              <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "13px" }}>₹18,500.00</Typography>
            </Stack>
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Success Rate</Typography>
              <Typography sx={{ fontWeight: 900, color: "#4ADE80", fontSize: "13px" }}>99.9% Success</Typography>
            </Stack>
          </Stack>
        ) : (
          <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "13px" }}>
            No beneficiary selected. Select an account from the workspace.
          </Typography>
        )}
      </Paper>

      {/* 3. OPERATOR QUICK ACTIONS MENU */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: "16px",
          bgcolor: "rgba(18, 27, 48, 0.75)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
        }}
      >
        <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontWeight: 800, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", mb: 1.5 }}>
          OPERATOR QUICK ACTIONS
        </Typography>

        <Stack spacing={1}>
          <Button fullWidth variant="outlined" startIcon={<PersonAddIcon sx={{ fontSize: 16 }} />} sx={{ height: 36, borderRadius: "8px", fontSize: "12px", fontWeight: 700, color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.2)" }}>
            + Add Beneficiary
          </Button>
          <Button fullWidth variant="outlined" startIcon={<HistoryIcon sx={{ fontSize: 16 }} />} sx={{ height: 36, borderRadius: "8px", fontSize: "12px", fontWeight: 700, color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.2)" }}>
            Customer Txn History
          </Button>
          <Button fullWidth variant="outlined" startIcon={<SecurityIcon sx={{ fontSize: 16 }} />} sx={{ height: 36, borderRadius: "8px", fontSize: "12px", fontWeight: 700, color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.2)" }}>
            Blacklist & Fraud Check
          </Button>
          <Button fullWidth variant="outlined" startIcon={<EditIcon sx={{ fontSize: 16 }} />} sx={{ height: 36, borderRadius: "8px", fontSize: "12px", fontWeight: 700, color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.2)" }}>
            Edit Customer Details
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
};
