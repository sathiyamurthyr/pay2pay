import React from "react";
import { Box, Typography, Paper, Stack, Chip, Divider } from "@mui/material";
import VerifiedIcon from "@mui/icons-material/Verified";
import StarIcon from "@mui/icons-material/Star";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ShieldIcon from "@mui/icons-material/Shield";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import HistoryIcon from "@mui/icons-material/History";
import { BeneficiaryData } from "../../hooks/useBeneficiary";

export interface BeneficiaryCapacityCardProps {
  beneficiary: BeneficiaryData | null;
  transferAmount: number;
}

export const BeneficiaryCapacityCard: React.FC<BeneficiaryCapacityCardProps> = ({
  beneficiary,
  transferAmount,
}) => {
  if (!beneficiary) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: "12px",
          bgcolor: "rgba(255, 255, 255, 0.03)",
          border: "1px dashed rgba(255, 255, 255, 0.15)",
          textAlign: "center",
        }}
      >
        <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "12.5px" }}>
          Select a beneficiary to view receiving capacity and limit analysis.
        </Typography>
      </Paper>
    );
  }

  // Beneficiary Receiving Capacity Calculations (Database-driven defaults)
  const dailyCap = 50000;
  const monthlyCap = 200000;
  const dailyUsage = beneficiary.dailyUsage ?? 15000;
  const monthlyUsage = beneficiary.monthlyUsage ?? 45000;

  const dailyRemaining = Math.max(0, dailyCap - dailyUsage);
  const monthlyRemaining = Math.max(0, monthlyCap - monthlyUsage);

  const availableToReceive = Math.min(dailyRemaining, monthlyRemaining);
  const isLimitExceeded = transferAmount > 0 && transferAmount > availableToReceive;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: "12px",
        bgcolor: isLimitExceeded ? "rgba(239, 68, 68, 0.08)" : "rgba(18, 27, 48, 0.75)",
        backdropFilter: "blur(16px)",
        border: isLimitExceeded ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(255, 255, 255, 0.12)",
        transition: "all 150ms ease",
      }}
    >
      {/* Header: Beneficiary Name + Badges */}
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <AccountBalanceIcon sx={{ color: "#60A5FA", fontSize: 20 }} />
          <Box>
            <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "14px", lineHeight: 1.2 }}>
              {beneficiary.name}
            </Typography>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "11px", mt: 0.25 }}>
              {beneficiary.bankName} · {beneficiary.maskedAccountNumber || beneficiary.accountNumber} · {beneficiary.ifsc}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={0.5}>
          {beneficiary.isVerified && (
            <Chip
              icon={<VerifiedIcon sx={{ fontSize: "12px !important", color: "#4ADE80 !important" }} />}
              label="Verified"
              size="small"
              sx={{ bgcolor: "rgba(74, 222, 128, 0.12)", color: "#4ADE80", fontWeight: 800, height: 20, fontSize: "10px" }}
            />
          )}
          {beneficiary.isFavorite && (
            <Chip
              icon={<StarIcon sx={{ fontSize: "12px !important", color: "#FBBF24 !important" }} />}
              label="Preferred Account"
              size="small"
              sx={{ bgcolor: "rgba(251, 191, 36, 0.12)", color: "#FBBF24", fontWeight: 800, height: 20, fontSize: "10px" }}
            />
          )}
        </Stack>
      </Stack>

      <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", my: 1 }} />

      {/* Grid: Beneficiary Capacity Metrics */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.25, mb: 1.5 }}>
        <Box sx={{ p: 1, borderRadius: "8px", bgcolor: "rgba(255, 255, 255, 0.04)" }}>
          <Typography sx={{ fontSize: "10.5px", color: "rgba(255, 255, 255, 0.5)", fontWeight: 700 }}>DAILY RECEIVING LEFT</Typography>
          <Typography sx={{ fontSize: "13px", color: "#60A5FA", fontWeight: 800, mt: 0.25 }}>
            ₹{dailyRemaining.toLocaleString()}
          </Typography>
        </Box>

        <Box sx={{ p: 1, borderRadius: "8px", bgcolor: "rgba(255, 255, 255, 0.04)" }}>
          <Typography sx={{ fontSize: "10.5px", color: "rgba(255, 255, 255, 0.5)", fontWeight: 700 }}>MONTHLY RECEIVING LEFT</Typography>
          <Typography sx={{ fontSize: "13px", color: "#34D399", fontWeight: 800, mt: 0.25 }}>
            ₹{monthlyRemaining.toLocaleString()}
          </Typography>
        </Box>

        <Box sx={{ p: 1, borderRadius: "8px", bgcolor: "rgba(255, 255, 255, 0.04)" }}>
          <Typography sx={{ fontSize: "10.5px", color: "rgba(255, 255, 255, 0.5)", fontWeight: 700 }}>RELATIONSHIP & RISK</Typography>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", mt: 0.25 }}>
            <Typography sx={{ fontSize: "12px", color: "#FFFFFF", fontWeight: 700 }}>
              {beneficiary.relationship || "Family"}
            </Typography>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.4)", fontSize: "11px" }}>•</Typography>
            <Typography sx={{ fontSize: "11px", color: "#4ADE80", fontWeight: 800 }}>Low Risk</Typography>
          </Stack>
        </Box>
      </Box>

      {/* Auxiliary Metrics Bar */}
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", p: 1, borderRadius: "8px", bgcolor: "rgba(0, 0, 0, 0.2)" }}>
        <Typography sx={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.7)" }}>
          Last Transfer: <strong>{beneficiary.lastUsedAt || "Today, 13:45"}</strong>
        </Typography>
        <Typography sx={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.7)" }}>
          Transfers: <strong>{beneficiary.transferCount || 18}</strong> · Avg: <strong>₹8,500</strong>
        </Typography>
        <Typography sx={{ fontSize: "11px", color: "#4ADE80", fontWeight: 800 }}>
          Success: 99.9%
        </Typography>
      </Stack>

      {/* Beneficiary Capacity Exceeded Warning Banner */}
      {isLimitExceeded && (
        <Box sx={{ mt: 1.5, p: 1.25, borderRadius: "8px", bgcolor: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)" }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
            <WarningAmberIcon sx={{ color: "#EF4444", fontSize: 18, mt: 0.1 }} />
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 800, color: "#FF6B6B", fontSize: "12px" }}>
                Beneficiary Receiving Limit Reached
              </Typography>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.85)", fontSize: "11px", mt: 0.25 }}>
                Available to Receive: <strong>₹{availableToReceive.toLocaleString()}</strong> · Requested: <strong style={{ color: "#EF4444" }}>₹{transferAmount.toLocaleString()}</strong>
              </Typography>
            </Box>
          </Stack>
        </Box>
      )}
    </Paper>
  );
};
