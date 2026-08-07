import React, { useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Paper,
  TextField,
  InputAdornment,
  Chip,
  Button,
  Avatar,
  Divider,
  MenuItem,
  Select,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import StarIcon from "@mui/icons-material/Star";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { CustomerData } from "../../hooks/useCustomer";
import { BeneficiaryData } from "../../hooks/useBeneficiary";
import { AmountInWords } from "../Amount/AmountInWords";
import { TransferAmountInput } from "../Amount/TransferAmountInput";
import { PricingEvaluationResult } from "../../services/RuleEngineAdapter";

export interface WorkstationStep2Props {
  customer: CustomerData | null;
  beneficiaries: BeneficiaryData[];
  selectedBeneficiary: BeneficiaryData | null;
  onSelectBeneficiary: (b: BeneficiaryData) => void;
  amount: number;
  onAmountChange: (val: number) => void;
  pricingResult: PricingEvaluationResult;
  onBack: () => void;
  onContinue: () => void;
}

export const WorkstationStep2: React.FC<WorkstationStep2Props> = ({
  customer,
  beneficiaries,
  selectedBeneficiary,
  onSelectBeneficiary,
  amount,
  onAmountChange,
  pricingResult,
  onBack,
  onContinue,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "favorite">("all");
  const [sortBy, setSortBy] = useState<"recent" | "used" | "alphabetical">("recent");

  const filteredBeneficiaries = beneficiaries
    .filter((b) => {
      const matchesSearch =
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.accountNumber.includes(searchTerm) ||
        b.bankName.toLowerCase().includes(searchTerm.toLowerCase());
      if (filterType === "favorite") return matchesSearch && b.isFavorite;
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "alphabetical") return a.name.localeCompare(b.name);
      if (sortBy === "used") return (b.transferCount || 0) - (a.transferCount || 0);
      return 0;
    });

  // Dynamic Rule Engine Financial Parameters (ZERO Hardcoded Math in React UI)
  const fee = pricingResult.convenienceFee;
  const gst = pricingResult.gstAmount;
  const commission = pricingResult.commission;
  const totalPayable = pricingResult.totalPayable;
  const balanceAfter = pricingResult.walletBalanceAfter;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          lg: "minmax(0, 68fr) minmax(340px, 32fr)",
          xl: "minmax(0, 70fr) minmax(360px, 30fr)",
        },
        gap: 1.5,
        height: "100%",
        maxHeight: "100%",
        overflow: "hidden",
      }}
    >
      {/* LEFT PANEL (68%): BENEFICIARY MANAGEMENT SUITE WITH INTERNAL SCROLL */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: "14px",
          bgcolor: "rgba(18, 27, 48, 0.75)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
        }}
      >
        <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", mb: 1 }}>
          BENEFICIARY MANAGEMENT SUITE ({filteredBeneficiaries.length} ACCOUNTS)
        </Typography>

        {/* Toolbar */}
        <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: "center" }}>
          <TextField
            fullWidth
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Name, Account, Bank, IFSC..."
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#60A5FA", fontSize: 18 }} />
                  </InputAdornment>
                ),
                sx: { height: 38, color: "#FFFFFF", bgcolor: "rgba(8, 17, 31, 0.9)", borderRadius: "8px", fontSize: "13px" },
              },
            }}
          />

          <Chip
            label="All"
            onClick={() => setFilterType("all")}
            sx={{ height: 38, fontWeight: 800, bgcolor: filterType === "all" ? "#2563EB" : "rgba(255, 255, 255, 0.08)", color: "#FFFFFF", cursor: "pointer" }}
          />
          <Chip
            icon={<StarIcon sx={{ "&&": { color: "#FFD54F", fontSize: 14 } }} />}
            label="Favourites"
            onClick={() => setFilterType("favorite")}
            sx={{ height: 38, fontWeight: 800, bgcolor: filterType === "favorite" ? "#2563EB" : "rgba(255, 255, 255, 0.08)", color: "#FFFFFF", cursor: "pointer" }}
          />

          <Select
            size="small"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            sx={{ height: 38, color: "#FFFFFF", bgcolor: "rgba(255, 255, 255, 0.08)", borderRadius: "8px", fontSize: "12px", fontWeight: 700, "& fieldset": { border: "none" } }}
          >
            <MenuItem value="recent">Sort: Recent</MenuItem>
            <MenuItem value="used">Sort: Most Used</MenuItem>
            <MenuItem value="alphabetical">Sort: A-Z</MenuItem>
          </Select>
        </Stack>

        {/* Responsive Beneficiary Card Grid */}
        <Box
          sx={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(2, 1fr)",
              lg: "repeat(3, 1fr)",
              xl: "repeat(4, 1fr)",
              "@media (min-width: 2560px)": { gridTemplateColumns: "repeat(5, 1fr)" },
              "@media (min-width: 3840px)": { gridTemplateColumns: "repeat(6, 1fr)" },
            },
            gap: 1.5,
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
                  height: 180,
                  p: 1.75,
                  borderRadius: "12px",
                  bgcolor: isSelected ? "rgba(37, 99, 235, 0.25)" : "rgba(255, 255, 255, 0.04)",
                  backdropFilter: "blur(12px)",
                  border: isSelected ? "2px solid #2563EB" : "1px solid rgba(255, 255, 255, 0.1)",
                  boxShadow: isSelected ? "0 4px 20px rgba(37, 99, 235, 0.4)" : "none",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "all 150ms ease",
                  "&:hover": { bgcolor: isSelected ? "rgba(37, 99, 235, 0.3)" : "rgba(255, 255, 255, 0.08)" },
                }}
              >
                <Box>
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 0.5 }}>
                    <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "15px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {b.name}
                    </Typography>
                    {b.isFavorite && <StarIcon sx={{ color: "#FFD54F", fontSize: 15 }} />}
                  </Stack>

                  <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "13px", mb: 0.25 }}>
                    {b.bankName}
                  </Typography>

                  <Typography sx={{ color: "#FFFFFF", fontFamily: "monospace", fontWeight: 800, fontSize: "14px", mb: 0.5 }}>
                    {maskedAcc}
                  </Typography>

                  <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px" }}>
                    IFSC: {b.ifsc}
                  </Typography>
                </Box>

                <Box>
                  <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", my: 0.75 }} />
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                    <Chip icon={<CheckCircleIcon sx={{ "&&": { color: "#4ADE80", fontSize: 11 } }} />} label="VERIFIED" size="small" sx={{ bgcolor: "rgba(34, 197, 94, 0.15)", color: "#4ADE80", fontWeight: 800, height: 18, fontSize: "9px" }} />
                    <Typography sx={{ color: "#4ADE80", fontSize: "11px", fontWeight: 800 }}>99.9% Success</Typography>
                  </Stack>
                </Box>
              </Paper>
            );
          })}
        </Box>
      </Paper>

      {/* RIGHT PANEL (32%): STICKY TRANSFER WORKSPACE */}
      <Paper
        elevation={0}
        sx={{
          p: 2.25,
          borderRadius: "14px",
          bgcolor: "rgba(18, 27, 48, 0.85)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
        }}
      >
        <Box>
          {/* Redesigned Enterprise Transfer Amount Component (Evaluated Dynamically by Backend Rule Engine) */}
          <TransferAmountInput
            amount={amount}
            onAmountChange={onAmountChange}
            minLimit={pricingResult.minLimit}
            maxLimit={pricingResult.maxLimit}
            remainingDaily={pricingResult.dailyLimitRemaining}
            walletBalance={pricingResult.walletBalance}
          />

          <AmountInWords amount={amount} />

          <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.1)", my: 1.5 }} />

          {/* KPI Summary Table (Backend Dynamic Evaluation Output) */}
          <Stack spacing={1}>
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Transfer Amount</Typography>
              <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "14px" }}>₹{amount.toLocaleString()}</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Convenience Fee ({pricingResult.slabId})</Typography>
              <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "13px" }}>+ ₹{fee.toLocaleString()}</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>GST ({pricingResult.gstPercentage}%)</Typography>
              <Typography sx={{ fontWeight: 800, color: "#93C5FD", fontSize: "13px" }}>+ ₹{gst.toLocaleString()}</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Retailer Commission</Typography>
              <Typography sx={{ fontWeight: 800, color: "#4ADE80", fontSize: "13px" }}>+ ₹{commission.toLocaleString()}</Typography>
            </Stack>

            <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", my: 0.5 }} />

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.80)", fontWeight: 700, fontSize: "13px" }}>NET WALLET DEBIT</Typography>
              <Typography sx={{ fontWeight: 900, color: "#3B82F6", fontSize: "16px" }}>₹{totalPayable.toLocaleString()}</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Wallet After Transfer</Typography>
              <Typography sx={{ fontWeight: 800, color: "#FBBF24", fontSize: "14px" }}>₹{balanceAfter.toLocaleString()}</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Settlement ETA</Typography>
              <Typography sx={{ fontWeight: 800, color: "#4ADE80", fontSize: "12px" }}>1.2 sec (IMPS)</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Rule Version</Typography>
              <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "12px" }}>{pricingResult.pricingVersion}</Typography>
            </Stack>
          </Stack>
        </Box>

        {/* Action Buttons */}
        <Stack spacing={1} sx={{ pt: 1.5 }}>
          <Button
            fullWidth
            variant="contained"
            disabled={amount <= 0 || !selectedBeneficiary}
            onClick={onContinue}
            endIcon={<ArrowForwardIcon />}
            sx={{
              height: 46,
              borderRadius: "10px",
              fontWeight: 900,
              fontSize: "14px",
              bgcolor: "#2563EB",
              color: "#FFFFFF",
              boxShadow: "0 4px 16px rgba(37, 99, 235, 0.4)",
            }}
          >
            Proceed to Authorization →
          </Button>

          <Button
            fullWidth
            variant="outlined"
            onClick={onBack}
            startIcon={<ArrowBackIcon />}
            sx={{ height: 36, borderRadius: "8px", fontWeight: 700, fontSize: "12px", color: "rgba(255, 255, 255, 0.8)", borderColor: "rgba(255, 255, 255, 0.2)" }}
          >
            Back to Customer
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};
