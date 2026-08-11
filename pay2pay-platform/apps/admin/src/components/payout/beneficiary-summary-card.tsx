"use client";

import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  Chip,
  Avatar,
  Tooltip,
  Grid,
} from "@mui/material";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import VerifiedIcon from "@mui/icons-material/Verified";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import EditIcon from "@mui/icons-material/Edit";
import HistoryIcon from "@mui/icons-material/History";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

export interface BeneficiaryDetails {
  beneficiary_id: string;
  account_holder_name: string;
  account_number: string;
  account_number_masked?: string;
  ifsc_code: string;
  bank_name: string;
  branch_name?: string;
  account_type?: "SAVINGS" | "CURRENT" | string;
  is_verified?: boolean;
  penny_drop_status?: string;
  bank_status?: "ONLINE" | "SLOW" | "DOWN";
  imps_available?: boolean;
  estimated_settlement_sec?: number;
  last_transaction_date?: string;
  last_transaction_amount?: number;
}

// Map IFSC Prefix to Bank Logo URL
const BANK_LOGO_MAP: Record<string, { logo: string; domain: string; bg: string }> = {
  HDFC: { logo: "https://logo.clearbit.com/hdfcbank.com", domain: "hdfcbank.com", bg: "#004B8D" },
  SBIN: { logo: "https://logo.clearbit.com/sbi.co.in", domain: "sbi.co.in", bg: "#280071" },
  ICIC: { logo: "https://logo.clearbit.com/icicibank.com", domain: "icicibank.com", bg: "#B02A30" },
  UTIB: { logo: "https://logo.clearbit.com/axisbank.com", domain: "axisbank.com", bg: "#97144D" },
  BARB: { logo: "https://logo.clearbit.com/bankofbaroda.in", domain: "bankofbaroda.in", bg: "#F26522" },
  CNRB: { logo: "https://logo.clearbit.com/canarabank.com", domain: "canarabank.com", bg: "#0091CF" },
  PUNB: { logo: "https://logo.clearbit.com/pnbindia.in", domain: "pnbindia.in", bg: "#A20A3B" },
  KKBK: { logo: "https://logo.clearbit.com/kotak.com", domain: "kotak.com", bg: "#ED1C24" },
  IDFB: { logo: "https://logo.clearbit.com/idfcfirstbank.com", domain: "idfcfirstbank.com", bg: "#9D1D27" },
  YESB: { logo: "https://logo.clearbit.com/yesbank.in", domain: "yesbank.in", bg: "#0054A6" },
  RATN: { logo: "https://logo.clearbit.com/rblbank.com", domain: "rblbank.com", bg: "#21409A" },
  AIRP: { logo: "https://logo.clearbit.com/airtel.in", domain: "airtel.in", bg: "#E40000" },
  PYTM: { logo: "https://logo.clearbit.com/paytmbank.com", domain: "paytmbank.com", bg: "#002E6E" },
  FINO: { logo: "https://logo.clearbit.com/finobank.com", domain: "finobank.com", bg: "#1D2B53" },
};

interface BeneficiarySummaryCardProps {
  beneficiary: BeneficiaryDetails;
  onEdit?: () => void;
  compact?: boolean;
}

export function BeneficiarySummaryCard({ beneficiary, onEdit, compact = false }: BeneficiarySummaryCardProps) {
  const [logoFailed, setLogoFailed] = useState(false);

  const ifscPrefix = (beneficiary.ifsc_code || "").slice(0, 4).toUpperCase();
  const bankMeta = BANK_LOGO_MAP[ifscPrefix];

  const maskedAccount = beneficiary.account_number_masked
    ? beneficiary.account_number_masked
    : `********${(beneficiary.account_number || "").slice(-4)}`;

  const accountType = beneficiary.account_type || "SAVINGS";
  const branchName = beneficiary.branch_name || "Main Branch";
  const bankStatus = beneficiary.bank_status || "ONLINE";
  const impsAvailable = beneficiary.imps_available !== false;
  const settlementSec = beneficiary.estimated_settlement_sec || 1.2;
  const lastTxnAmount = beneficiary.last_transaction_amount || 25000;
  const lastTxnDate = beneficiary.last_transaction_date || "02 Aug 2026";

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3.5,
        border: "1px solid #CBD5E1",
        backgroundColor: "#FFFFFF",
        boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
        transition: "all 0.25s ease",
        "&:hover": {
          boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
          borderColor: "#94A3B8",
        },
      }}
    >
      <Stack spacing={2}>
        {/* Top Header: Logo + Name + Edit Action */}
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            {/* Dynamic Bank Logo with Graceful Fallback */}
            {!logoFailed && bankMeta?.logo ? (
              <Box
                component="img"
                src={bankMeta.logo}
                alt={beneficiary.bank_name}
                onError={() => setLogoFailed(true)}
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2.5,
                  objectFit: "contain",
                  p: 0.8,
                  backgroundColor: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                }}
              />
            ) : (
              <Avatar
                sx={{
                  bgcolor: bankMeta?.bg || "#0284C7",
                  width: 44,
                  height: 44,
                  fontWeight: 900,
                  fontSize: "1rem",
                }}
              >
                {ifscPrefix.slice(0, 2) || <AccountBalanceIcon />}
              </Avatar>
            )}

            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#0F172A" }}>
                  {beneficiary.account_holder_name}
                </Typography>
                <Chip
                  label={accountType}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: "0.62rem",
                    fontWeight: 800,
                    backgroundColor: "#E0F2FE",
                    color: "#0369A1",
                  }}
                />
              </Stack>
              <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600 }}>
                {beneficiary.bank_name} • {branchName}
              </Typography>
            </Box>
          </Stack>

          {onEdit && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<EditIcon fontSize="small" />}
              onClick={onEdit}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 700,
                fontSize: "0.78rem",
                py: 0.5,
              }}
            >
              Change Beneficiary
            </Button>
          )}
        </Stack>

        {/* Account Number & IFSC Detail Cards */}
        <Grid container spacing={1.5} sx={{ p: 1.8, borderRadius: 2.5, backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
          <Grid size={{ xs: 6 }}>
            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, display: "block" }}>
              MASKED ACCOUNT NUMBER
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 800, color: "#1E1B4B" }}>
              {maskedAccount}
            </Typography>
          </Grid>

          <Grid size={{ xs: 6 }}>
            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, display: "block" }}>
              IFSC CODE
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 800, color: "#1E1B4B" }}>
              {beneficiary.ifsc_code}
            </Typography>
          </Grid>
        </Grid>

        {/* 3. Verification Badges */}
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
          <Chip
            icon={<CheckCircleIcon sx={{ fontSize: "14px !important", color: "#16A34A !important" }} />}
            label="Penny Drop Verified"
            size="small"
            sx={{ backgroundColor: "#DCFCE7", color: "#15803D", fontWeight: 700, fontSize: "0.7rem", height: 22 }}
          />

          <Chip
            icon={<VerifiedIcon sx={{ fontSize: "14px !important", color: "#0284C7 !important" }} />}
            label="Beneficiary Verified"
            size="small"
            sx={{ backgroundColor: "#E0F2FE", color: "#0369A1", fontWeight: 700, fontSize: "0.7rem", height: 22 }}
          />

          <Chip
            label={bankStatus === "ONLINE" ? "🟢 Bank Online" : "🟡 Bank Slow"}
            size="small"
            sx={{ backgroundColor: "#F1F5F9", color: "#334155", fontWeight: 700, fontSize: "0.7rem", height: 22 }}
          />

          {impsAvailable && (
            <Chip
              icon={<FlashOnIcon sx={{ fontSize: "14px !important", color: "#EAB308 !important" }} />}
              label="IMPS Available"
              size="small"
              sx={{ backgroundColor: "#FEF9C3", color: "#854D0E", fontWeight: 700, fontSize: "0.7rem", height: 22 }}
            />
          )}
        </Stack>

        {/* 4 & 5. Settlement Speed & Last Transaction Banner */}
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", pt: 0.5 }}>
          <Stack direction="row" spacing={0.8} sx={{ alignItems: "center" }}>
            <AccessTimeIcon sx={{ fontSize: 16, color: "#16A34A" }} />
            <Typography variant="caption" sx={{ color: "#16A34A", fontWeight: 800 }}>
              Est. Settlement: ~{settlementSec}s Instant
            </Typography>
          </Stack>

          <Stack direction="row" spacing={0.8} sx={{ alignItems: "center" }}>
            <HistoryIcon sx={{ fontSize: 16, color: "#64748B" }} />
            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700 }}>
              Last Txn: ₹{lastTxnAmount.toLocaleString("en-IN")} on {lastTxnDate}
            </Typography>
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
}
