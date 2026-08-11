import React from "react";
import { Box, Typography, Stack, Avatar, Chip, Paper, Button } from "@mui/material";
import ShieldIcon from "@mui/icons-material/Shield";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import EditIcon from "@mui/icons-material/Edit";
import HistoryIcon from "@mui/icons-material/History";
import { CustomerData } from "../../hooks/useCustomer";

export const CustomerPanel: React.FC<{ customer: CustomerData | null }> = ({ customer }) => {
  if (!customer) return null;

  // Enforce displaying business customer code (never UUIDs)
  const displayCode = customer.customerCode || (customer.id.includes("-") && customer.id.length > 20 ? `CUS-${customer.mobile.slice(-4)}` : customer.id);

  return (
    <Paper
      elevation={0}
      sx={{
        height: 96, // Exact 96px height constraint
        p: 2, // 16px padding
        borderRadius: "16px",
        bgcolor: "rgba(18, 27, 48, 0.75)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25)",
        width: "100%",
        display: "flex",
        alignItems: "center",
      }}
    >
      <Stack
        direction="row"
        spacing={2.5} // 20px gap
        sx={{ alignItems: "center", justifyContent: "space-between", width: "100%" }}
      >
        {/* Left: Avatar + Customer Name + Business Customer Code + Mobile */}
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Avatar
            sx={{
              bgcolor: "#2563EB",
              color: "#FFFFFF",
              width: 48,
              height: 48,
              fontWeight: 800,
              fontSize: "18px",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35)",
            }}
          >
            {customer.name.charAt(0)}
          </Avatar>
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "18px", lineHeight: 1.2 }}>
                {customer.name}
              </Typography>
              <Chip
                icon={<ShieldIcon sx={{ "&&": { color: "#4ADE80", fontSize: 14 } }} />}
                label={customer.kycStatus}
                size="small"
                sx={{ bgcolor: "rgba(34, 197, 94, 0.15)", color: "#4ADE80", fontWeight: 800, height: 22, fontSize: "11px" }}
              />
              <Chip
                label={`Risk: ${customer.riskRating}`}
                size="small"
                sx={{ bgcolor: "rgba(56, 189, 248, 0.15)", color: "#38BDF8", fontWeight: 800, height: 22, fontSize: "11px" }}
              />
            </Stack>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontWeight: 600, fontSize: "12px", mt: 0.25 }}>
              Code: <strong style={{ color: "#60A5FA" }}>{displayCode}</strong> · Mobile: <strong style={{ color: "#FFFFFF" }}>{customer.mobile}</strong>
            </Typography>
          </Box>
        </Stack>

        {/* Center: Wallet, Limits & Telemetry Summary Pills */}
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Box sx={{ px: 1.75, py: 0.75, borderRadius: "10px", bgcolor: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", display: "block", fontSize: "11px", fontWeight: 700 }}>
              WALLET BAL
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
              <AccountBalanceWalletIcon sx={{ color: "#FBBF24", fontSize: 15 }} />
              <Typography sx={{ fontWeight: 800, color: "#FBBF24", fontSize: "15px" }}>
                ₹{(customer.walletBalance ?? 0).toLocaleString()}
              </Typography>
            </Stack>
          </Box>

          <Box sx={{ px: 1.75, py: 0.75, borderRadius: "10px", bgcolor: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", display: "block", fontSize: "11px", fontWeight: 700 }}>
              DAILY REMAINING
            </Typography>
            <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "15px" }}>
              ₹{customer.dailyLimitRemaining.toLocaleString()}
            </Typography>
          </Box>

          <Box sx={{ px: 1.75, py: 0.75, borderRadius: "10px", bgcolor: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", display: "block", fontSize: "11px", fontWeight: 700 }}>
              MONTHLY REMAINING
            </Typography>
            <Typography sx={{ fontWeight: 800, color: "#34D399", fontSize: "15px" }}>
              ₹{customer.monthlyLimitRemaining.toLocaleString()}
            </Typography>
          </Box>

          <Box sx={{ px: 1.75, py: 0.75, borderRadius: "10px", bgcolor: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", display: "block", fontSize: "11px", fontWeight: 700 }}>
              PREFERRED BANK
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
              <AccountBalanceIcon sx={{ color: "#60A5FA", fontSize: 15 }} />
              <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "15px" }}>
                {customer.preferredBank}
              </Typography>
            </Stack>
          </Box>
        </Stack>

        {/* Right: Quick Actions */}
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<EditIcon sx={{ fontSize: 15 }} />}
            sx={{
              height: 36,
              fontSize: "13px",
              fontWeight: 700,
              borderRadius: "10px",
              color: "#FFFFFF",
              borderColor: "rgba(255, 255, 255, 0.2)",
              bgcolor: "rgba(255, 255, 255, 0.05)",
              "&:hover": { bgcolor: "rgba(255, 255, 255, 0.12)", transform: "translateY(-2px)" },
              "&:active": { transform: "scale(0.98)" },
              transition: "all 150ms ease",
            }}
          >
            Edit
          </Button>

          <Button
            size="small"
            variant="outlined"
            startIcon={<HistoryIcon sx={{ fontSize: 15 }} />}
            sx={{
              height: 36,
              fontSize: "13px",
              fontWeight: 700,
              borderRadius: "10px",
              color: "#FFFFFF",
              borderColor: "rgba(255, 255, 255, 0.2)",
              bgcolor: "rgba(255, 255, 255, 0.05)",
              "&:hover": { bgcolor: "rgba(255, 255, 255, 0.12)", transform: "translateY(-2px)" },
              "&:active": { transform: "scale(0.98)" },
              transition: "all 150ms ease",
            }}
          >
            History
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
};
