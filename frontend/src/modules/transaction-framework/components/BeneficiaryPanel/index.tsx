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
      sx={{
        color: "#60A5FA",
        fontWeight: 800,
        fontSize: "24px", // Section Title 24px
        letterSpacing: "-0.2px",
        mb: 2, // 16px spacing
        display: "block",
      }}
    >
      SELECT BENEFICIARY ACCOUNT
    </Typography>
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, 1fr)",
          lg: "repeat(4, 1fr)", // Desktop & 2K: 4 cards
          xl: "repeat(5, 1fr)", // 4K: 5 cards
        },
        gap: 3, // 24px gap
      }}
    >
      {beneficiaries.map((b) => {
        const isSelected = selectedBeneficiary?.id === b.id;
        return (
          <Paper
            key={b.id}
            elevation={0}
            onClick={() => onSelect(b)}
            sx={{
              p: "20px", // Card Padding 20px
              height: 160, // Exact Card Height 160px
              borderRadius: "16px", // Card Radius 16px
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              bgcolor: isSelected ? "rgba(37, 99, 235, 0.25)" : "rgba(18, 27, 48, 0.75)",
              backdropFilter: "blur(20px)",
              border: isSelected ? "2px solid #2563EB" : "1px solid rgba(255, 255, 255, 0.12)",
              cursor: "pointer",
              boxShadow: isSelected ? "0 8px 24px rgba(37, 99, 235, 0.4)" : "0 8px 32px rgba(0, 0, 0, 0.25)",
              transition: "all 150ms ease", // Hover 150ms
              "&:hover": {
                transform: "translateY(-2px)", // Card Lift 2px
                borderColor: "#3B82F6",
                boxShadow: "0 12px 32px rgba(37, 99, 235, 0.3)",
              },
              "&:active": { transform: "scale(0.98)" }, // Button Press Scale 0.98
            }}
          >
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <AccountBalanceIcon sx={{ color: isSelected ? "#60A5FA" : "rgba(255, 255, 255, 0.88)", fontSize: 22 }} />
              {b.isFavorite && <StarIcon sx={{ color: "#FFD54F", fontSize: 20 }} />}
            </Stack>

            <Box>
              <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "18px", lineHeight: 1.2 }}>
                {b.name}
              </Typography>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.90)", fontWeight: 500, fontSize: "13px", mt: 0.25 }}>
                {b.bankName} · {b.accountNumber}
              </Typography>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontWeight: 600, fontSize: "12px" }}>
                IFSC: {b.ifsc}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <StatusChip status="success" label="VERIFIED" />
            </Box>
          </Paper>
        );
      })}
    </Box>
  </Box>
);
