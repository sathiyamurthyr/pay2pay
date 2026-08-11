import React from "react";
import { Box, Typography, Stack, Paper, Chip } from "@mui/material";
import SpeedIcon from "@mui/icons-material/Speed";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ShieldIcon from "@mui/icons-material/Shield";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";

export const LiveBankingIntelligence: React.FC = () => {
  const bankHealth = [
    { name: "NPCI IMPS Switch", live: "99.99%", latency: "18ms", status: "OPERATIONAL" },
    { name: "HDFC Bank", live: "99.94%", latency: "42ms", status: "EXCELLENT" },
    { name: "ICICI Bank", live: "99.70%", latency: "65ms", status: "OPTIMAL" },
    { name: "State Bank of India", live: "98.40%", latency: "140ms", status: "DEGRADED" },
    { name: "Axis Bank", live: "99.50%", latency: "80ms", status: "OPTIMAL" },
  ];

  const gatewayHealth = [
    { name: "Cashfree Payouts", latency: "38ms", status: "99.9%" },
    { name: "RazorpayX Engine", latency: "45ms", status: "99.8%" },
    { name: "PayU DirectSwitch", latency: "62ms", status: "99.5%" },
  ];

  return (
    <Stack spacing={2.5} sx={{ width: "100%" }}>
      {/* 1. NPCI & LIVE BANK HEALTH WIDGET */}
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
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
          <SpeedIcon sx={{ color: "#60A5FA", fontSize: 20 }} />
          <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            NPCI & BANK NETWORK HEALTH
          </Typography>
        </Stack>

        <Stack spacing={1.25}>
          {bankHealth.map((b) => (
            <Stack key={b.name} direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
              <Typography sx={{ color: "#FFFFFF", fontWeight: 600, fontSize: "13px" }}>
                {b.name}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px" }}>{b.latency}</Typography>
                <Chip label={b.live} size="small" sx={{ bgcolor: b.live.startsWith("99.9") ? "rgba(34, 197, 94, 0.15)" : "rgba(251, 191, 36, 0.15)", color: b.live.startsWith("99.9") ? "#4ADE80" : "#FBBF24", fontWeight: 800, height: 20, fontSize: "10px" }} />
              </Stack>
            </Stack>
          ))}
        </Stack>
      </Paper>

      {/* 2. GATEWAY HEALTH WIDGET */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: "16px",
          bgcolor: "rgba(18, 27, 48, 0.75)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
        }}
      >
        <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontWeight: 800, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", mb: 1.5 }}>
          GATEWAY LATENCY MONITOR
        </Typography>

        <Stack spacing={1}>
          {gatewayHealth.map((g) => (
            <Stack key={g.name} direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.85)", fontSize: "12px", fontWeight: 600 }}>{g.name}</Typography>
              <Typography sx={{ color: "#38BDF8", fontSize: "12px", fontWeight: 700 }}>{g.latency} ({g.status})</Typography>
            </Stack>
          ))}
        </Stack>
      </Paper>

      {/* 3. AI TELEMETRY INSIGHTS */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: "16px",
          bgcolor: "rgba(37, 99, 235, 0.15)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(37, 99, 235, 0.35)",
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
          <AutoAwesomeIcon sx={{ color: "#60A5FA", fontSize: 20 }} />
          <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "14px" }}>
            AI Smart Telemetry Insights
          </Typography>
        </Stack>
        <Typography sx={{ color: "rgba(255, 255, 255, 0.85)", fontSize: "12px", lineHeight: 1.5 }}>
          • Best Transfer Window: <strong>Active Now</strong> (12ms average response time).
          <br />
          • Customer Pattern: Prefers HDFC DirectSwitch (99.9% completion rate).
        </Typography>
      </Paper>

      {/* 4. OPERATOR KPIS */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: "16px",
          bgcolor: "rgba(18, 27, 48, 0.75)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
          <AccountBalanceWalletIcon sx={{ color: "#60A5FA", fontSize: 20 }} />
          <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            TODAY'S OPERATOR KPIS
          </Typography>
        </Stack>

        <Stack spacing={1}>
          <Stack direction="row" sx={{ justifyContent: "space-between" }}>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Today's Volume</Typography>
            <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "14px" }}>₹1,24,500.00</Typography>
          </Stack>
          <Stack direction="row" sx={{ justifyContent: "space-between" }}>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Today's Commission</Typography>
            <Typography sx={{ fontWeight: 900, color: "#4ADE80", fontSize: "14px" }}>+ ₹450.00</Typography>
          </Stack>
          <Stack direction="row" sx={{ justifyContent: "space-between" }}>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Completed Txns</Typography>
            <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "14px" }}>38 Success / 0 Fail</Typography>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
};
