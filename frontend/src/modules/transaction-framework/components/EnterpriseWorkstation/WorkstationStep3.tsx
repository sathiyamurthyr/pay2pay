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
          bgcolor: "var(--surface, #FFFFFF)",
          border: "1px solid var(--brand-border, #E2E8F0)",
          boxShadow: "0 14px 36px rgba(15, 23, 42, 0.06)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: "var(--brand-gradient, linear-gradient(135deg, #0F3B7D 0%, #D4AF37 100%))",
          }}
        />
        <Stack direction="row" spacing={2} sx={{ alignItems: "center", mb: 3 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: "14px",
              bgcolor: "var(--brand-surface, #EFF6FF)",
              border: "1px solid var(--brand-border, rgba(15, 59, 125, 0.25))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--brand-primary, #0F3B7D)",
            }}
          >
            <AccountBalanceWalletIcon sx={{ fontSize: 26 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, color: "var(--text-primary, #0F172A)", fontSize: "18px" }}>
              Confirm Payment Authorization
            </Typography>
            <Typography sx={{ color: "var(--text-muted, #64748B)", fontSize: "13px" }}>
              Verify beneficiary and financial details before debit
            </Typography>
          </Box>
        </Stack>

        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: "14px",
            bgcolor: "var(--background-secondary, #F8FAFC)",
            border: "1px solid var(--brand-border, #E2E8F0)",
            mb: 3,
          }}
        >
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: "11.5px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--brand-primary, #0F3B7D)",
              mb: 2,
            }}
          >
            FINANCIAL SUMMARY
          </Typography>

          <Stack spacing={1.5}>
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "var(--text-secondary, #334155)", fontSize: "13px" }}>Payout Amount</Typography>
              <Typography sx={{ fontWeight: 900, color: "var(--text-primary, #0F172A)", fontSize: "18px" }}>
                ₹{Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "var(--text-secondary, #334155)", fontSize: "13px" }}>Payout Service Charge</Typography>
              <Typography sx={{ fontWeight: 800, color: "var(--brand-primary, #0F3B7D)", fontSize: "14px" }}>
                + ₹{Number(effectiveCharges).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "var(--text-secondary, #334155)", fontSize: "13px" }}>GST</Typography>
              <Typography sx={{ fontWeight: 800, color: "var(--text-secondary, #334155)", fontSize: "14px" }}>
                + ₹{Number(effectiveGst).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </Stack>

            <Divider sx={{ borderColor: "var(--border, #E2E8F0)", my: 0.5 }} />

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "var(--text-primary, #0F172A)", fontWeight: 700, fontSize: "14px" }}>TOTAL WALLET DEBIT</Typography>
              <Typography
                sx={{
                  fontWeight: 900,
                  fontSize: "20px",
                  color: "var(--brand-primary, #0F3B7D)",
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
              color: "var(--brand-primary, #0F3B7D)",
              borderColor: "var(--brand-border, #CBD5E1)",
              bgcolor: "var(--brand-surface, #EFF6FF)",
              fontWeight: 800,
              textTransform: "none",
              "&:hover": {
                borderColor: "var(--brand-primary, #0F3B7D)",
                bgcolor: "var(--surface, #FFFFFF)",
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
              background: "var(--brand-gradient, linear-gradient(135deg, #0F3B7D 0%, #D4AF37 100%))",
              color: "#FFFFFF",
              boxShadow: "0 6px 20px rgba(15, 23, 42, 0.16)",
              textTransform: "none",
              "&:hover": {
                filter: "brightness(1.06)",
                boxShadow: "0 8px 24px rgba(15, 23, 42, 0.22)",
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
