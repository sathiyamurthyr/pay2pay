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
        color: "#60A5FA",
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
              p: 2.5,
              borderRadius: "16px",
              bgcolor: isSelected ? "rgba(37, 99, 235, 0.25)" : "rgba(18, 27, 48, 0.75)",
              backdropFilter: "blur(20px)",
              border: isSelected ? "2px solid #2563EB" : "1px solid rgba(255, 255, 255, 0.12)",
              cursor: "pointer",
              boxShadow: isSelected ? "0 8px 24px rgba(37, 99, 235, 0.35)" : "0 8px 32px rgba(0, 0, 0, 0.25)",
              transition: "all 0.15s ease",
              "&:hover": { borderColor: "#3B82F6" },
            }}
          >
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
              <AccountBalanceIcon sx={{ color: isSelected ? "#60A5FA" : "rgba(255, 255, 255, 0.88)" }} />
              {b.isFavorite && <StarIcon sx={{ color: "#FFD54F", fontSize: 18 }} />}
            </Stack>

            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#FFFFFF" }}>
              {b.name}
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.88)", fontWeight: 600, display: "block" }}>
              {b.bankName} • {b.accountNumber}
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.65)", fontWeight: 600, fontSize: "11px" }}>
              IFSC: {b.ifsc}
            </Typography>

            <Box sx={{ mt: 1.5 }}>
              <StatusChip status="success" label="VERIFIED" />
            </Box>
          </Paper>
        );
      })}
    </Box>
  </Box>
);
