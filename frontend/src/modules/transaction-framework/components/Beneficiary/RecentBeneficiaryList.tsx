import React from "react";
import { Box, Typography, Stack, Paper, Avatar, Chip } from "@mui/material";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { BeneficiaryData } from "../../hooks/useBeneficiary";

export interface RecentBeneficiaryListProps {
  beneficiaries: BeneficiaryData[];
  selectedBeneficiary: BeneficiaryData | null;
  onSelect: (ben: BeneficiaryData) => void;
}

export const RecentBeneficiaryList: React.FC<RecentBeneficiaryListProps> = ({
  beneficiaries,
  selectedBeneficiary,
  onSelect,
}) => {
  // Top 5 most recently used
  const recent = beneficiaries.slice(0, 5);
  if (recent.length === 0) return null;

  return (
    <Box sx={{ width: "100%" }}>
      <Typography sx={{ color: "rgba(255, 255, 255, 0.70)", fontWeight: 700, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", mb: 1 }}>
        RECENTLY USED BENEFICIARIES (TOP 5)
      </Typography>

      <Stack direction="row" spacing={1.5} sx={{ overflowX: "auto", pb: 1, "&::-webkit-scrollbar": { display: "none" } }}>
        {recent.map((b) => {
          const isSelected = selectedBeneficiary?.id === b.id;
          const maskedAcc = b.accountNumber || b.maskedAccountNumber || "0630104000156974";

          return (
            <Paper
              key={b.id}
              elevation={0}
              onClick={() => onSelect(b)}
              sx={{
                width: 180, // Exact 180px width
                height: 90, // Exact 90px height
                p: 1.25,
                borderRadius: "12px",
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                bgcolor: isSelected ? "rgba(37, 99, 235, 0.3)" : "rgba(18, 27, 48, 0.75)",
                backdropFilter: "blur(20px)",
                border: isSelected ? "2px solid #2563EB" : "1px solid rgba(255, 255, 255, 0.12)",
                boxShadow: isSelected ? "0 4px 16px rgba(37, 99, 235, 0.4)" : "0 4px 16px rgba(0, 0, 0, 0.2)",
                transform: isSelected ? "scale(1.02)" : "none",
                cursor: "pointer",
                transition: "all 150ms ease",
                "&:hover": {
                  transform: "translateY(-2px) scale(1.02)",
                  borderColor: "#3B82F6",
                },
              }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Avatar sx={{ width: 28, height: 28, bgcolor: "#2563EB", fontSize: "12px", fontWeight: 800 }}>
                  {b.name.charAt(0)}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography noWrap sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "13px" }}>
                    {b.name}
                  </Typography>
                  <Typography noWrap sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "11px" }}>
                    {maskedAcc}
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mt: 0.5 }}>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                  <AccountBalanceIcon sx={{ color: "#60A5FA", fontSize: 13 }} />
                  <Typography noWrap sx={{ color: "rgba(255, 255, 255, 0.80)", fontSize: "11px", fontWeight: 600 }}>
                    {b.bankName}
                  </Typography>
                </Stack>
                {b.isVerified && <CheckCircleIcon sx={{ color: "#4ADE80", fontSize: 14 }} />}
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
};
