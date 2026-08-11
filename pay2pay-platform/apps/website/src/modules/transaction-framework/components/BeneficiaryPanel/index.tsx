import React from "react";
import { Box, Typography, Stack, Paper, Button, Skeleton } from "@mui/material";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import StarIcon from "@mui/icons-material/Star";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import { StatusChip } from "@/design-system/components";
import { BeneficiaryData } from "../../hooks/useBeneficiary";

export interface BeneficiaryPanelProps {
  beneficiaries: BeneficiaryData[];
  selectedBeneficiary: BeneficiaryData | null;
  onSelect: (ben: BeneficiaryData) => void;
  isLoading?: boolean;
  onAddBeneficiary?: () => void;
}

export const BeneficiaryPanel: React.FC<BeneficiaryPanelProps> = ({
  beneficiaries,
  selectedBeneficiary,
  onSelect,
  isLoading = false,
  onAddBeneficiary,
}) => {
  return (
    <Box sx={{ width: "100%" }}>
      {/* Section Heading */}
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
        <Typography
          sx={{
            color: "#60A5FA",
            fontWeight: 600,
            fontSize: "20px", // Section Heading 20px
            letterSpacing: "-0.2px",
          }}
        >
          Select Beneficiary Account
        </Typography>

        {beneficiaries.length > 0 && (
          <Button
            size="small"
            variant="outlined"
            onClick={onAddBeneficiary}
            startIcon={<PersonAddIcon sx={{ fontSize: 16 }} />}
            sx={{
              height: 36,
              borderRadius: "10px",
              px: 2,
              fontSize: "13px",
              fontWeight: 700,
              color: "#FFFFFF",
              borderColor: "rgba(255, 255, 255, 0.2)",
              bgcolor: "rgba(255, 255, 255, 0.05)",
              "&:hover": { bgcolor: "rgba(255, 255, 255, 0.12)", borderColor: "#60A5FA" },
              transition: "all 150ms ease",
            }}
          >
            + Add Beneficiary
          </Button>
        )}
      </Stack>

      {/* 1. LOADING SKELETON STATE */}
      {isLoading ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              lg: "repeat(4, 1fr)",
              xl: "repeat(5, 1fr)",
            },
            gap: 3,
          }}
        >
          {[1, 2, 3, 4].map((idx) => (
            <Skeleton
              key={idx}
              variant="rounded"
              height={160}
              sx={{ borderRadius: "16px", bgcolor: "rgba(18, 27, 48, 0.5)" }}
            />
          ))}
        </Box>
      ) : beneficiaries.length === 0 ? (
        /* 2. EXPLICIT EMPTY STATE (Customer has 0 beneficiaries) */
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: "center",
            borderRadius: "16px",
            bgcolor: "rgba(18, 27, 48, 0.75)",
            backdropFilter: "blur(20px)",
            border: "1px dashed rgba(255, 255, 255, 0.2)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AccountBalanceIcon sx={{ color: "rgba(255, 255, 255, 0.3)", fontSize: 48, mb: 1.5 }} />
          <Typography sx={{ color: "#FFFFFF", fontWeight: 700, fontSize: "18px", mb: 0.5 }}>
            No Beneficiaries Found
          </Typography>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.70)", fontSize: "14px", mb: 2.5 }}>
            This customer has not added any beneficiary.
          </Typography>
          <Button
            variant="contained"
            onClick={onAddBeneficiary}
            startIcon={<PersonAddIcon sx={{ fontSize: 18 }} />}
            sx={{
              height: 44,
              borderRadius: "12px",
              px: 3,
              fontSize: "15px",
              fontWeight: 700,
              color: "#FFFFFF",
              bgcolor: "#2563EB",
              boxShadow: "0 4px 16px rgba(37, 99, 235, 0.4)",
              "&:hover": { bgcolor: "#1D4ED8" },
              "&:active": { transform: "scale(0.98)" },
              transition: "all 150ms ease",
            }}
          >
            + Add Beneficiary
          </Button>
        </Paper>
      ) : (
        /* 3. ACTIVE BENEFICIARY GRID */
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
                  "&:active": { transform: "scale(0.98)" },
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
                    IFSC: {b.ifsc} {b.relationship ? `· ${b.relationship}` : ""}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <StatusChip status="success" label="VERIFIED" />
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}
    </Box>
  );
};
