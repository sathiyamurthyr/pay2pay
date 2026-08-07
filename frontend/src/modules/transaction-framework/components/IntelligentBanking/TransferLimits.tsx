import React from "react";
import { Box, Typography, Stack, Paper, LinearProgress } from "@mui/material";

export interface TransferLimitsProps {
  dailyRemaining?: number;
  monthlyRemaining?: number;
  walletBalance?: number;
}

export const TransferLimits: React.FC<TransferLimitsProps> = ({
  dailyRemaining = 25000,
  monthlyRemaining = 200000,
  walletBalance = 124500,
}) => {
  const dailyCap = 75000;
  const dailyUsed = dailyCap - dailyRemaining;
  const dailyPercent = Math.round((dailyUsed / dailyCap) * 100);

  const monthlyCap = 200000;
  const monthlyUsed = monthlyCap - monthlyRemaining;
  const monthlyPercent = Math.round((monthlyUsed / monthlyCap) * 100);

  return (
    <Stack spacing={2} sx={{ p: 1 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 2 }}>
        {/* Daily Limit Card */}
        <Paper elevation={0} sx={{ p: 2, borderRadius: "12px", bgcolor: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px", fontWeight: 700, mb: 0.5 }}>
            CUSTOMER DAILY LIMIT TELEMETRY
          </Typography>
          <Stack direction="row" sx={{ justifyContent: "space-between", mb: 1 }}>
            <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "16px" }}>
              ₹{dailyRemaining.toLocaleString()} Rem
            </Typography>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>
              Used: ₹{dailyUsed.toLocaleString()} / ₹{dailyCap.toLocaleString()}
            </Typography>
          </Stack>
          <LinearProgress variant="determinate" value={dailyPercent} sx={{ height: 6, borderRadius: 3, bgcolor: "rgba(255, 255, 255, 0.1)" }} />
        </Paper>

        {/* Monthly Limit Card */}
        <Paper elevation={0} sx={{ p: 2, borderRadius: "12px", bgcolor: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px", fontWeight: 700, mb: 0.5 }}>
            CUSTOMER MONTHLY LIMIT TELEMETRY
          </Typography>
          <Stack direction="row" sx={{ justifyContent: "space-between", mb: 1 }}>
            <Typography sx={{ fontWeight: 800, color: "#34D399", fontSize: "16px" }}>
              ₹{monthlyRemaining.toLocaleString()} Rem
            </Typography>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>
              Used: ₹{monthlyUsed.toLocaleString()} / ₹{monthlyCap.toLocaleString()}
            </Typography>
          </Stack>
          <LinearProgress variant="determinate" value={monthlyPercent} color="success" sx={{ height: 6, borderRadius: 3, bgcolor: "rgba(255, 255, 255, 0.1)" }} />
        </Paper>

        {/* Wallet Balance Card */}
        <Paper elevation={0} sx={{ p: 2, borderRadius: "12px", bgcolor: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px", fontWeight: 700, mb: 0.5 }}>
            RETAILER OPERATOR WALLET
          </Typography>
          <Typography sx={{ fontWeight: 900, color: "#FBBF24", fontSize: "20px" }}>
            ₹{walletBalance.toLocaleString()}
          </Typography>
          <Typography sx={{ color: "#4ADE80", fontSize: "12px", fontWeight: 700, mt: 0.5 }}>
            Available for Instant Transfers
          </Typography>
        </Paper>
      </Box>
    </Stack>
  );
};
