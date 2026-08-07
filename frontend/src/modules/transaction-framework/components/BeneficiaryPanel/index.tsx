import React from "react";
import { Box, Typography, Stack, Paper } from "@mui/material";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import StarIcon from "@mui/icons-material/Star";
import { StatusChip } from "@/design-system/components";
import { BeneficiaryData } from "../../hooks/useBeneficiary";

export interface BeneficiaryPanelProps {
  beneficiaries: BeneficiaryData[];
  selectedBeneficiary: BeneficiaryData | null;
  onSelect: (ben: BeneficiaryData) => void;
}

export const BeneficiaryPanel: React.FC<BeneficiaryPanelProps> = ({
  beneficiaries,
  selectedBeneficiary,
  onSelect,
}) => (
  <Box sx={{ width: "100%" }}>
    <Typography
      variant="caption"
      sx={{
        color: "#2563EB",
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "1px",
        mb: 1.5,
        display: "block",
      }}
    >
      SELECT BENEFICIARY ACCOUNT
    </Typography>
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2 }}>
      {beneficiaries.map((b) => {
        const isSelected = selectedBeneficiary?.id === b.id;
        return (
          <Paper
            key={b.id}
            elevation={0}
            onClick={() => onSelect(b)}
            sx={{
              p: 2,
              borderRadius: "16px",
              bgcolor: isSelected ? "#EFF6FF" : "#FFFFFF",
              border: isSelected ? "2px solid #2563EB" : "1px solid #E2E8F0",
              cursor: "pointer",
              boxShadow: isSelected ? "0 4px 14px rgba(37, 99, 235, 0.15)" : "0 2px 8px rgba(0, 0, 0, 0.04)",
              transition: "all 0.15s ease",
              "&:hover": { borderColor: "#2563EB" },
            }}
          >
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
              <AccountBalanceIcon sx={{ color: isSelected ? "#2563EB" : "#64748B" }} />
              {b.isFavorite && <StarIcon sx={{ color: "#EAB308", fontSize: 18 }} />}
            </Stack>

            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0F172A" }}>
              {b.name}
            </Typography>
            <Typography variant="caption" sx={{ color: "#334155", fontWeight: 600, display: "block" }}>
              {b.bankName} • {b.accountNumber}
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600, fontSize: "11px" }}>
              IFSC: {b.ifsc}
            </Typography>

            <Box sx={{ mt: 1 }}>
              <StatusChip status="success" label="VERIFIED" />
            </Box>
          </Paper>
        );
      })}
    </Box>
  </Box>
);
