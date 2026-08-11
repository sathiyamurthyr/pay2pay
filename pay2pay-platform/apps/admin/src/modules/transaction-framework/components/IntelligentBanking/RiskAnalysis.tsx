import React from "react";
import { Box, Typography, Stack, Paper, Chip } from "@mui/material";
import ShieldIcon from "@mui/icons-material/Shield";
import SecurityIcon from "@mui/icons-material/Security";

export const RiskAnalysis: React.FC = () => {
  const risks = [
    { label: "VELOCITY SCORE", value: "Normal (3 Txn / Hour)", level: "Green", color: "#4ADE80", bg: "rgba(34, 197, 94, 0.15)" },
    { label: "FRAUD RISK SCORE", value: "0.02% (Ultra Low)", level: "Green", color: "#4ADE80", bg: "rgba(34, 197, 94, 0.15)" },
    { label: "DEVICE TRUST", value: "Hardware Verified (TPM 2.0)", level: "Green", color: "#4ADE80", bg: "rgba(34, 197, 94, 0.15)" },
    { label: "CUSTOMER RISK PROFILE", value: "Tier 1 Verified Customer", level: "Green", color: "#4ADE80", bg: "rgba(34, 197, 94, 0.15)" },
    { label: "DESTINATION BANK RISK", value: "HDFC Switch Operational", level: "Green", color: "#4ADE80", bg: "rgba(34, 197, 94, 0.15)" },
    { label: "TRANSACTION CONFIDENCE", value: "99.9% Confidence", level: "Green", color: "#4ADE80", bg: "rgba(34, 197, 94, 0.15)" },
  ];

  return (
    <Stack spacing={2} sx={{ p: 1 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(3, 1fr)" }, gap: 1.5 }}>
        {risks.map((r) => (
          <Paper
            key={r.label}
            elevation={0}
            sx={{
              p: 2,
              borderRadius: "12px",
              bgcolor: r.bg,
              border: `1px solid ${r.color}40`,
            }}
          >
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 0.75 }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "11px", fontWeight: 700 }}>
                {r.label}
              </Typography>
              <Chip label={r.level} size="small" sx={{ bgcolor: r.color, color: "#0F172A", fontWeight: 900, height: 18, fontSize: "10px" }} />
            </Stack>
            <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "14px" }}>
              {r.value}
            </Typography>
          </Paper>
        ))}
      </Box>
    </Stack>
  );
};
