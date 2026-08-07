import React from "react";
import { Box, Typography, Stack, Avatar, Chip, Paper } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import ShieldIcon from "@mui/icons-material/Shield";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import { CustomerData } from "../../hooks/useCustomer";

export const CustomerPanel: React.FC<{ customer: CustomerData | null }> = ({ customer }) => {
  if (!customer) return null;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: "16px",
        bgcolor: "rgba(18, 27, 48, 0.75)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25)",
        width: "100%",
      }}
    >
      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={2}
        sx={{ alignItems: "center", justifyContent: "space-between" }}
      >
        {/* Left: Avatar + Customer Identity */}
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Avatar
            sx={{
              bgcolor: "#2563EB",
              color: "#FFFFFF",
              width: 44,
              height: 44,
              fontWeight: 800,
              fontSize: "18px",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35)",
            }}
          >
            {customer.name.charAt(0)}
          </Avatar>
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "18px" }}>
                {customer.name}
              </Typography>
              <Chip
                icon={<ShieldIcon sx={{ "&&": { color: "#4ADE80", fontSize: 13 } }} />}
                label={customer.kycStatus}
                size="small"
                sx={{ bgcolor: "rgba(34, 197, 94, 0.15)", color: "#4ADE80", fontWeight: 800, height: 20, fontSize: "10px" }}
              />
            </Stack>
            <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.88)", fontWeight: 600, fontSize: "14px" }}>
              Mobile: {customer.mobile} · ID: {customer.id}
            </Typography>
          </Box>
        </Stack>

        {/* Center: Limits & Wallet Telemetry Pills */}
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <Box sx={{ px: 1.5, py: 0.75, borderRadius: "10px", bgcolor: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.65)", display: "block", fontSize: "11px", fontWeight: 600 }}>
              DAILY REMAINING
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "14px" }}>
              ₹{customer.dailyLimitRemaining.toLocaleString()}
            </Typography>
          </Box>

          <Box sx={{ px: 1.5, py: 0.75, borderRadius: "10px", bgcolor: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.65)", display: "block", fontSize: "11px", fontWeight: 600 }}>
              MONTHLY REMAINING
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#34D399", fontSize: "14px" }}>
              ₹{customer.monthlyLimitRemaining.toLocaleString()}
            </Typography>
          </Box>

          <Box sx={{ px: 1.5, py: 0.75, borderRadius: "10px", bgcolor: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.65)", display: "block", fontSize: "11px", fontWeight: 600 }}>
              PREFERRED BANK
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
              <AccountBalanceIcon sx={{ color: "#60A5FA", fontSize: 14 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "14px" }}>
                {customer.preferredBank}
              </Typography>
            </Stack>
          </Box>
        </Stack>
      </Stack>
    </Paper>
  );
};
