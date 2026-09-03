import React from "react";
import { useRetailerStore } from "@/stores/use-retailer-store";
import {
  Box,
  Typography,
  Stack,
  Paper,
  Button,
  Divider,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { CustomerData } from "../../hooks/useCustomer";
import { BeneficiaryData } from "../../hooks/useBeneficiary";

export interface WorkstationStep3Props {
  customer: CustomerData | null;
  beneficiary: BeneficiaryData | null;
  amount: number;
  charges?: number;
  gst?: number;
  totalPayable?: number;
  onBack: () => void;
  onAuthorize: () => void;
}

export const WorkstationStep3: React.FC<WorkstationStep3Props> = ({
  customer,
  beneficiary,
  amount,
  charges = 22,
  gst = 3,
  totalPayable = amount + 25,
  onBack,
  onAuthorize,
}) => {
  const effectiveCharges = charges ?? 22;
  const effectiveGst = gst ?? 3;
  const effectiveTotal = totalPayable ?? (amount + effectiveCharges + effectiveGst);

  return (
    <Box sx={{ maxWidth: 860, mx: "auto", pt: 2 }}>
      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: "22px",
          bgcolor: "rgba(11, 15, 25, 0.85)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
        }}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: "center", mb: 3 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: "14px",
              bgcolor: "rgba(245, 158, 11, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#F59E0B",
            }}
          >
            <AccountBalanceWalletIcon sx={{ fontSize: 26 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "18px" }}>
              Confirm Payment Authorization
            </Typography>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "13px" }}>
              Verify beneficiary and financial details before debit
            </Typography>
          </Box>
        </Stack>

        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: "14px",
            bgcolor: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(245, 158, 11, 0.2)",
            mb: 3,
          }}
        >
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: "11.5px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              mb: 2,
            }}
          >
            FINANCIAL SUMMARY
          </Typography>

          <Stack spacing={1.5}>
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.65)", fontSize: "13px" }}>Payout Amount</Typography>
              <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "18px" }}>
                ₹{Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.65)", fontSize: "13px" }}>Payout Service Charge</Typography>
              <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "14px" }}>
                + ₹{Number(effectiveCharges).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.65)", fontSize: "13px" }}>GST</Typography>
              <Typography sx={{ fontWeight: 800, color: "#93C5FD", fontSize: "14px" }}>
                + ₹{Number(effectiveGst).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </Stack>

            <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", my: 0.5 }} />

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.85)", fontWeight: 700, fontSize: "14px" }}>TOTAL WALLET DEBIT</Typography>
              <Typography
                sx={{
                  fontWeight: 900,
                  fontSize: "20px",
                  background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #F59E0B 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                ₹{Number(effectiveTotal).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </Stack>
          </Stack>
        </Paper>

        <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between" }}>
          <Button
            variant="outlined"
            onClick={onBack}
            startIcon={<ArrowBackIcon />}
            sx={{
              height: 48,
              borderRadius: "12px",
              color: "rgba(255, 255, 255, 0.8)",
              borderColor: "rgba(245, 158, 11, 0.3)",
              bgcolor: "rgba(255, 255, 255, 0.02)",
              fontWeight: 800,
              textTransform: "none",
              "&:hover": {
                borderColor: "#F59E0B",
                color: "#FDE68A",
                bgcolor: "rgba(245, 158, 11, 0.08)",
              },
            }}
          >
            Back to Beneficiary
          </Button>

          <Button
            variant="contained"
            onClick={onAuthorize}
            endIcon={<ArrowForwardIcon />}
            sx={{
              height: 48,
              borderRadius: "12px",
              fontWeight: 900,
              fontSize: "14.5px",
              background: "linear-gradient(135deg, #FDE68A 0%, #F59E0B 50%, #D97706 100%)",
              color: "#080B11",
              boxShadow: "0 6px 24px rgba(245, 158, 11, 0.45)",
              textTransform: "none",
              "&:hover": {
                background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #B45309 100%)",
                boxShadow: "0 8px 30px rgba(245, 158, 11, 0.6)",
              },
            }}
          >
            PROCEED TO AUTHORIZATION →
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};
