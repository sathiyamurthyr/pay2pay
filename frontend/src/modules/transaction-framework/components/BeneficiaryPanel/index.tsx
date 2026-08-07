import React from "react";
import { Box, Typography, Stack, Paper } from "@mui/material";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import StarIcon from "@mui/icons-material/Star";
import { GlassCard, StatusChip } from "@/design-system/components";
import { BeneficiaryData } from "../../hooks/useBeneficiary";
import { tokens } from "@/design-system/tokens/design-tokens";

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
    <Typography variant="caption" sx={{ color: tokens.colors.brand.secondary, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", mb: 1.5, display: "block" }}>
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
              borderRadius: tokens.radii.lg,
              bgcolor: isSelected ? tokens.colors.brand.primarySubtle : tokens.colors.neutral.dark.surface,
              border: isSelected ? `2px solid ${tokens.colors.brand.primary}` : `1px solid ${tokens.colors.neutral.dark.border}`,
              cursor: "pointer",
              transition: tokens.transitions.fast,
              "&:hover": { borderColor: tokens.colors.brand.primary },
            }}
          >
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
              <AccountBalanceIcon sx={{ color: isSelected ? tokens.colors.brand.primary : tokens.colors.neutral.dark.textSecondary }} />
              {b.isFavorite && <StarIcon sx={{ color: "#FFD54F", fontSize: 18 }} />}
            </Stack>

            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: tokens.colors.neutral.dark.textPrimary }}>
              {b.name}
            </Typography>
            <Typography variant="caption" sx={{ color: tokens.colors.neutral.dark.textSecondary, display: "block" }}>
              {b.bankName} • {b.accountNumber}
            </Typography>
            <Typography variant="caption" sx={{ color: tokens.colors.neutral.dark.textMuted, fontSize: "10px" }}>
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
