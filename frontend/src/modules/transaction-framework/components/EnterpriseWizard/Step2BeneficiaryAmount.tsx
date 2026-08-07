import React, { useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Paper,
  Grid,
  TextField,
  InputAdornment,
  Chip,
  Button,
  Avatar,
  Divider,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import StarIcon from "@mui/icons-material/Star";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import TranslateIcon from "@mui/icons-material/Translate";
import { CustomerData } from "../../hooks/useCustomer";
import { BeneficiaryData } from "../../hooks/useBeneficiary";
import { AmountInWords } from "../Amount/AmountInWords";

export interface Step2BeneficiaryAmountProps {
  customer: CustomerData | null;
  beneficiaries: BeneficiaryData[];
  selectedBeneficiary: BeneficiaryData | null;
  onSelectBeneficiary: (b: BeneficiaryData) => void;
  amount: number;
  onAmountChange: (val: number) => void;
  charges: number;
  totalPayable: number;
  onBack: () => void;
  onContinue: () => void;
}

export const Step2BeneficiaryAmount: React.FC<Step2BeneficiaryAmountProps> = ({
  customer,
  beneficiaries,
  selectedBeneficiary,
  onSelectBeneficiary,
  amount,
  onAmountChange,
  charges,
  totalPayable,
  onBack,
  onContinue,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "favorite" | "recent">("all");

  const quickAmounts = [500, 1000, 2000, 5000, 10000, 25000, 50000, 100000];

  const filteredBeneficiaries = beneficiaries.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.accountNumber.includes(searchTerm) ||
      b.bankName.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterType === "favorite") return matchesSearch && b.isFavorite;
    return matchesSearch;
  });

  const gst = Math.round(charges * 0.18);
  const fee = charges - gst;
  const commission = Math.round(amount * 0.0035);
  const walletBalance = customer?.walletBalance ?? 124500;
  const balanceAfter = Math.max(0, walletBalance - totalPayable);

  return (
    <Box sx={{ width: "100%", py: 2 }}>
      {/* 1. STICKY LOCKED CUSTOMER SUMMARY BAR */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          px: 3,
          borderRadius: "16px",
          bgcolor: "rgba(18, 27, 48, 0.85)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          mb: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Avatar sx={{ bgcolor: "#2563EB", color: "#FFFFFF", fontWeight: 900 }}>
            {customer?.name.charAt(0) || "C"}
          </Avatar>
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "16px" }}>
                {customer?.name || "Ramesh Kumar"}
              </Typography>
              <Chip label="LOCKED CUSTOMER" size="small" sx={{ bgcolor: "rgba(37, 99, 235, 0.2)", color: "#60A5FA", fontWeight: 800, height: 20, fontSize: "10px" }} />
            </Stack>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>
              Mobile: {customer?.mobile} · Code: <strong style={{ color: "#60A5FA" }}>{customer?.customerCode || `CUS-${customer?.mobile.slice(-4)}`}</strong>
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={3} sx={{ alignItems: "center" }}>
          <Box sx={{ textAlign: "right" }}>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "10px", fontWeight: 700 }}>DAILY REMAINING</Typography>
            <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "14px" }}>₹{(customer?.dailyLimitRemaining ?? 25000).toLocaleString()}</Typography>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "10px", fontWeight: 700 }}>WALLET BALANCE</Typography>
            <Typography sx={{ fontWeight: 900, color: "#FBBF24", fontSize: "16px" }}>₹{walletBalance.toLocaleString()}</Typography>
          </Box>
        </Stack>
      </Paper>

      {/* 2-COLUMN LAYOUT: MAIN WORKSPACE (LEFT 70%) & LIVE SUMMARY SIDEBAR (RIGHT 30%) */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 340px" }, gap: 3 }}>
        <Stack spacing={3}>
          {/* BENEFICIARY SEARCH & FILTERS */}
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: "16px", bgcolor: "rgba(18, 27, 48, 0.75)", border: "1px solid rgba(255, 255, 255, 0.12)" }}>
            <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", mb: 1.5 }}>
              STEP 2A: SELECT TARGET BENEFICIARY
            </Typography>

            <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
              <TextField
                fullWidth
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search beneficiary by name, account number, bank, or IFSC..."
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: "#60A5FA", fontSize: 18 }} />
                      </InputAdornment>
                    ),
                    sx: { height: 42, color: "#FFFFFF", bgcolor: "rgba(8, 17, 31, 0.9)", borderRadius: "10px" },
                  },
                }}
              />

              <Chip
                label="All Accounts"
                onClick={() => setFilterType("all")}
                sx={{ height: 42, px: 2, fontWeight: 800, bgcolor: filterType === "all" ? "#2563EB" : "rgba(255, 255, 255, 0.08)", color: "#FFFFFF", cursor: "pointer" }}
              />
              <Chip
                icon={<StarIcon sx={{ "&&": { color: "#FFD54F", fontSize: 16 } }} />}
                label="Favourites"
                onClick={() => setFilterType("favorite")}
                sx={{ height: 42, px: 2, fontWeight: 800, bgcolor: filterType === "favorite" ? "#2563EB" : "rgba(255, 255, 255, 0.08)", color: "#FFFFFF", cursor: "pointer" }}
              />
            </Stack>

            {/* BENEFICIARY CARD GRID (320x180 AUTO-FIT CARDS) */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 2,
                maxHeight: 420,
                overflowY: "auto",
                pr: 0.5,
              }}
            >
              {filteredBeneficiaries.map((b) => {
                const isSelected = selectedBeneficiary?.id === b.id;
                const maskedAcc = b.accountNumber.length >= 4 ? `XXXX XXXX ${b.accountNumber.slice(-4)}` : b.accountNumber;

                return (
                  <Paper
                    key={b.id}
                    elevation={0}
                    onClick={() => onSelectBeneficiary(b)}
                    sx={{
                      width: "100%",
                      minHeight: 180, // Exact 320x180 card standard
                      p: 2,
                      borderRadius: "14px",
                      bgcolor: isSelected ? "rgba(37, 99, 235, 0.25)" : "rgba(255, 255, 255, 0.04)",
                      backdropFilter: "blur(12px)",
                      border: isSelected ? "2px solid #2563EB" : "1px solid rgba(255, 255, 255, 0.1)",
                      boxShadow: isSelected ? "0 4px 20px rgba(37, 99, 235, 0.4)" : "none",
                      cursor: "pointer",
                      transition: "all 150ms ease",
                      "&:hover": { bgcolor: isSelected ? "rgba(37, 99, 235, 0.3)" : "rgba(255, 255, 255, 0.08)", transform: "translateY(-2px)" },
                    }}
                  >
                    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "16px" }}>{b.name}</Typography>
                        {b.isFavorite && <StarIcon sx={{ color: "#FFD54F", fontSize: 16 }} />}
                      </Stack>
                      <Chip label={b.relationship || "Family"} size="small" sx={{ bgcolor: "rgba(255, 255, 255, 0.1)", color: "#93C5FD", fontWeight: 700, height: 20, fontSize: "10px" }} />
                    </Stack>

                    <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "14px", mb: 0.5 }}>
                      {b.bankName}
                    </Typography>

                    <Typography sx={{ color: "#FFFFFF", fontFamily: "monospace", fontWeight: 800, fontSize: "15px", mb: 1 }}>
                      {maskedAcc}
                    </Typography>

                    <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px", mb: 1.5 }}>
                      IFSC: {b.ifsc} · Branch: Mumbai Central
                    </Typography>

                    <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", my: 1 }} />

                    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                      <Chip icon={<CheckCircleIcon sx={{ "&&": { color: "#4ADE80", fontSize: 12 } }} />} label="VERIFIED ACCOUNT" size="small" sx={{ bgcolor: "rgba(34, 197, 94, 0.15)", color: "#4ADE80", fontWeight: 800, height: 20, fontSize: "10px" }} />
                      <Typography sx={{ color: "#4ADE80", fontSize: "11px", fontWeight: 800 }}>99.9% Success</Typography>
                    </Stack>
                  </Paper>
                );
              })}
            </Box>
          </Paper>

          {/* AMOUNT ENTRY SECTION (BELOW SELECTED BENEFICIARY CARD) */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: "16px", bgcolor: "rgba(18, 27, 48, 0.75)", border: "1px solid rgba(255, 255, 255, 0.12)" }}>
            <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", mb: 1.5 }}>
              STEP 2B: ENTER TRANSFER AMOUNT
            </Typography>

            {/* Large 64px Input */}
            <TextField
              fullWidth
              type="number"
              value={amount === 0 ? "" : amount}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onAmountChange(isNaN(val) ? 0 : val);
              }}
              placeholder="0.00"
              slotProps={{
                input: {
                  startAdornment: <Typography sx={{ color: "#2563EB", fontWeight: 900, fontSize: "28px", mr: 1 }}>₹</Typography>,
                  sx: {
                    height: 64,
                    fontSize: "32px",
                    fontWeight: 900,
                    color: "#FFFFFF",
                    bgcolor: "rgba(8, 17, 31, 0.9)",
                    borderRadius: "14px",
                    px: 2,
                    "& input": { textAlign: "right" },
                  },
                },
              }}
            />

            {/* Amount In Words Live Converter */}
            <AmountInWords amount={amount} />

            {/* Quick Amount Preset Chips */}
            <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap", gap: 1 }}>
              {quickAmounts.map((preset) => (
                <Chip
                  key={preset}
                  label={`+ ₹${preset.toLocaleString()}`}
                  onClick={() => onAmountChange(preset)}
                  sx={{
                    height: 38,
                    px: 2,
                    borderRadius: "8px",
                    fontWeight: amount === preset ? 900 : 700,
                    bgcolor: amount === preset ? "#2563EB" : "rgba(255, 255, 255, 0.05)",
                    color: "#FFFFFF",
                    cursor: "pointer",
                    "&:hover": { bgcolor: "rgba(255, 255, 255, 0.12)" },
                  }}
                />
              ))}
            </Stack>
          </Paper>
        </Stack>

        {/* RIGHT SIDE LIVE FINANCIAL SUMMARY PANEL */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: "16px",
            bgcolor: "rgba(18, 27, 48, 0.85)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            height: "fit-content",
          }}
        >
          <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", mb: 2 }}>
            LIVE TRANSFER SUMMARY
          </Typography>

          <Stack spacing={1.5}>
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Transfer Amount</Typography>
              <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "15px" }}>₹{amount.toLocaleString()}</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Convenience Fee</Typography>
              <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "14px" }}>+ ₹{fee.toLocaleString()}</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>GST (18%)</Typography>
              <Typography sx={{ fontWeight: 800, color: "#93C5FD", fontSize: "14px" }}>+ ₹{gst.toLocaleString()}</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Retailer Commission</Typography>
              <Typography sx={{ fontWeight: 800, color: "#4ADE80", fontSize: "14px" }}>+ ₹{commission.toLocaleString()}</Typography>
            </Stack>

            <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.1)", my: 1 }} />

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.80)", fontWeight: 700, fontSize: "14px" }}>NET WALLET DEBIT</Typography>
              <Typography sx={{ fontWeight: 900, color: "#3B82F6", fontSize: "18px" }}>₹{totalPayable.toLocaleString()}</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Wallet After Transfer</Typography>
              <Typography sx={{ fontWeight: 800, color: "#FBBF24", fontSize: "15px" }}>₹{balanceAfter.toLocaleString()}</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Settlement ETA</Typography>
              <Typography sx={{ fontWeight: 800, color: "#4ADE80", fontSize: "13px" }}>1.2 sec (IMPS)</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Recommended Route</Typography>
              <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "13px" }}>HDFC DirectSwitch</Typography>
            </Stack>
          </Stack>

          {/* Action CTAs */}
          <Stack spacing={1.5} sx={{ mt: 3 }}>
            <Button
              fullWidth
              variant="contained"
              disabled={amount <= 0 || !selectedBeneficiary}
              onClick={onContinue}
              endIcon={<ArrowForwardIcon />}
              sx={{
                height: 50,
                borderRadius: "12px",
                fontWeight: 900,
                fontSize: "15px",
                bgcolor: "#2563EB",
                color: "#FFFFFF",
                boxShadow: "0 4px 16px rgba(37, 99, 235, 0.4)",
                "&:hover": { bgcolor: "#1D4ED8" },
              }}
            >
              Proceed to Authorization →
            </Button>

            <Button
              fullWidth
              variant="outlined"
              onClick={onBack}
              startIcon={<ArrowBackIcon />}
              sx={{ height: 42, borderRadius: "10px", fontWeight: 700, color: "rgba(255, 255, 255, 0.8)", borderColor: "rgba(255, 255, 255, 0.2)" }}
            >
              Back to Customer
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
};
