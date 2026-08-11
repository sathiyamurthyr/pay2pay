import React from "react";
import { Box, Typography, Stack, Paper, Chip } from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { BeneficiaryData } from "../../hooks/useBeneficiary";

export interface FavouriteBeneficiaryListProps {
  beneficiaries: BeneficiaryData[];
  selectedBeneficiary: BeneficiaryData | null;
  onSelect: (ben: BeneficiaryData) => void;
}

export const FavouriteBeneficiaryList: React.FC<FavouriteBeneficiaryListProps> = ({
  beneficiaries,
  selectedBeneficiary,
  onSelect,
}) => {
  const favourites = beneficiaries.filter((b) => b.isFavorite).slice(0, 10);
  if (favourites.length === 0) return null;

  return (
    <Box sx={{ width: "100%" }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
        <StarIcon sx={{ color: "#FFD54F", fontSize: 16 }} />
        <Typography sx={{ color: "#FFD54F", fontWeight: 700, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          PINNED FAVOURITES (MAX 10)
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ overflowX: "auto", pb: 0.5, "&::-webkit-scrollbar": { display: "none" } }}>
        {favourites.map((b) => {
          const isSelected = selectedBeneficiary?.id === b.id;
          const maskedAcc = b.maskedAccountNumber || (b.accountNumber.length >= 4 ? `•••• ${b.accountNumber.slice(-4)}` : b.accountNumber);

          return (
            <Chip
              key={b.id}
              onClick={() => onSelect(b)}
              icon={<StarIcon sx={{ "&&": { color: "#FFD54F", fontSize: 14 } }} />}
              label={`${b.name} (${b.bankName} · ${maskedAcc})`}
              sx={{
                height: 32,
                px: 1.5,
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: isSelected ? 800 : 600,
                bgcolor: isSelected ? "rgba(37, 99, 235, 0.35)" : "rgba(255, 255, 255, 0.05)",
                color: "#FFFFFF",
                border: isSelected ? "1.5px solid #2563EB" : "1px solid rgba(255, 255, 255, 0.12)",
                boxShadow: isSelected ? "0 4px 12px rgba(37, 99, 235, 0.35)" : "none",
                cursor: "pointer",
                "&:hover": { bgcolor: isSelected ? "rgba(37, 99, 235, 0.5)" : "rgba(255, 255, 255, 0.12)" },
                transition: "all 150ms ease",
              }}
            />
          );
        })}
      </Stack>
    </Box>
  );
};
