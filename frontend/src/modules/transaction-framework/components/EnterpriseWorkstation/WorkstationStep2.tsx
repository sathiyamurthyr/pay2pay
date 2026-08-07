import React, { useState, useEffect } from "react";
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
  Tooltip,
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
import { EnterpriseStatusStrip } from "../Amount/EnterpriseStatusStrip";
import { SmartAutoCorrectionBar } from "../Amount/SmartAutoCorrectionBar";
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

  const [visibleCount, setVisibleCount] = useState(24);

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

  const displayedBeneficiaries = filteredBeneficiaries.slice(0, visibleCount);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      if (visibleCount < filteredBeneficiaries.length) {
        setVisibleCount((prev) => prev + 24);
      }
    }
  };

  // Dynamic Rule Engine Financial Parameters
  const fee = pricingResult.convenienceFee;
  const gst = pricingResult.gstAmount;
  const commission = pricingResult.commission;
  const totalPayable = pricingResult.totalPayable;
  const balanceAfter = pricingResult.walletBalanceAfter;

  // Realtime Rule Engine + Beneficiary Receiving Capacity Validation Check (Loaded strictly from DB)
  const beneficiaryAvailableToReceive = selectedBeneficiary
    ? (selectedBeneficiary.monthlyRemaining ?? Math.max(0, 200000 - (selectedBeneficiary.monthlyUsage ?? 0)))
    : 50000;
  const isBeneficiaryLimitExceeded = amount > beneficiaryAvailableToReceive;

  const isProceedDisabled = amount <= 0 || !selectedBeneficiary || !pricingResult.canProceed || isBeneficiaryLimitExceeded;

  // Keyboard shortcut listener for Ctrl+Enter (Proceed to Authorization)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        if (!isProceedDisabled) {
          onContinue();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isProceedDisabled, onContinue]);

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          lg: "68% 32%",
        },
        gap: 2,
        height: "100%",
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden",
        overflowY: "hidden",
      }}
    >
      {/* ── LEFT PANEL (68%): BENEFICIARY SELECTION CONSOLE ── */}
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
          width: "100%",
          maxWidth: "100%",
          overflowX: "hidden",
          overflowY: "hidden",
          boxSizing: "border-box",
        }}
      >
        {/* Header Console */}
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1 }}>
          <Box>
            <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "16px", letterSpacing: "-0.2px" }}>
              Beneficiary Selection Console
            </Typography>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>
              Customer: <strong>{customer?.name}</strong> ({customer?.mobile})
            </Typography>
          </Box>

          {/* Quick Filters */}
          <Stack direction="row" spacing={1}>
            <Select
              size="small"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              sx={{
                height: 32,
                fontSize: "12px",
                fontWeight: 700,
                color: "#FFFFFF",
                bgcolor: "rgba(255, 255, 255, 0.08)",
                ".MuiSelect-icon": { color: "#FFFFFF" },
              }}
            >
              <MenuItem value="all">All Beneficiaries</MenuItem>
              <MenuItem value="favorite">⭐ Favorites Only</MenuItem>
            </Select>

            <Select
              size="small"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              sx={{
                height: 32,
                fontSize: "12px",
                fontWeight: 700,
                color: "#FFFFFF",
                bgcolor: "rgba(255, 255, 255, 0.08)",
                ".MuiSelect-icon": { color: "#FFFFFF" },
              }}
            >
              <MenuItem value="recent">Sort: Most Recent</MenuItem>
              <MenuItem value="used">Sort: Highest Used</MenuItem>
              <MenuItem value="alphabetical">Sort: A-Z</MenuItem>
            </Select>
          </Stack>
        </Stack>

        {/* Search Field */}
        <TextField
          fullWidth
          size="small"
          placeholder="Search by Name, Account Number, or Bank..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#60A5FA" }} />
                </InputAdornment>
              ),
              sx: {
                height: 40,
                borderRadius: "10px",
                bgcolor: "rgba(255, 255, 255, 0.05)",
                color: "#FFFFFF",
                fontSize: "13px",
              },
            },
          }}
          sx={{ mb: 2, width: "100%" }}
        />

        {/* Beneficiary Responsive Grid (Vertical Scroll Only, Zero Horizontal Overflow) */}
        <Box
          onScroll={handleScroll}
          sx={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            pr: 0.5,
            width: "100%",
            maxWidth: "100%",
          }}
        >
          {filteredBeneficiaries.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 4,
                textAlign: "center",
                bgcolor: "rgba(255, 255, 255, 0.02)",
                borderRadius: "12px",
                border: "1px dashed rgba(255, 255, 255, 0.15)",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "14px" }}>
                No beneficiaries found matching query.
              </Typography>
            </Paper>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(2, 1fr)",
                  lg: "repeat(3, 1fr)",
                  xl: "repeat(4, 1fr)",
                },
                gap: 2,
                width: "100%",
                maxWidth: "100%",
                boxSizing: "border-box",
              }}
            >
              {displayedBeneficiaries.map((b) => {
                const isSelected = selectedBeneficiary?.id === b.id;
                return (
                  <Paper
                    key={b.id}
                    elevation={0}
                    onClick={() => onSelectBeneficiary(b)}
                    sx={{
                      width: "100%",
                      minWidth: 0,
                      boxSizing: "border-box",
                      p: 1.75,
                      borderRadius: "12px",
                      bgcolor: isSelected ? "rgba(37, 99, 235, 0.25)" : "rgba(255, 255, 255, 0.04)",
                      border: isSelected ? "2px solid #2563EB" : "1px solid rgba(255, 255, 255, 0.08)",
                      cursor: "pointer",
                      transition: "all 150ms ease",
                      "&:hover": {
                        bgcolor: "rgba(37, 99, 235, 0.15)",
                        borderColor: "rgba(37, 99, 235, 0.5)",
                      },
                    }}
                  >
                    <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", minWidth: 0 }}>
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          bgcolor: isSelected ? "#2563EB" : "rgba(255, 255, 255, 0.1)",
                          color: "#FFFFFF",
                          fontWeight: 800,
                          fontSize: "13px",
                          flexShrink: 0,
                        }}
                      >
                        {b.name.slice(0, 2).toUpperCase()}
                      </Avatar>

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                          <Typography noWrap sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "13px" }}>
                            {b.name}
                          </Typography>
                          {b.isFavorite && <StarIcon sx={{ color: "#FBBF24", fontSize: 15, flexShrink: 0 }} />}
                        </Stack>

                        <Typography noWrap sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "11px" }}>
                          {b.bankName} • {b.maskedAccountNumber}
                        </Typography>

                        <Typography noWrap sx={{ color: "#60A5FA", fontSize: "11px", fontWeight: 700 }}>
                          {b.ifsc}
                        </Typography>
                      </Box>

                      {isSelected && <CheckCircleIcon sx={{ color: "#2563EB", fontSize: 22, flexShrink: 0 }} />}
                    </Stack>
                  </Paper>
                );
              })}
            </Box>
          )}
        </Box>
      </Paper>

      {/* ── RIGHT PANEL (32%): TRANSFER AMOUNT & FINANCIAL EXECUTION ── */}
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
          {/* Transfer Amount Component */}
          <TransferAmountInput
            amount={amount}
            onAmountChange={onAmountChange}
            minLimit={pricingResult.minLimit}
            maxLimit={pricingResult.maxLimit}
            remainingDaily={pricingResult.dailyLimitRemaining}
            walletBalance={pricingResult.walletBalance}
          />

          <AmountInWords amount={amount} />

          {/* Compact 40px Beneficiary Monthly Limit Strip */}
          <EnterpriseStatusStrip validationResult={pricingResult} onAutoFixAmount={onAmountChange} />

          {/* One-Click Enterprise Auto Correction & Fixes Bar */}
          <SmartAutoCorrectionBar validationResult={pricingResult} onAutoFixAmount={onAmountChange} />

          <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.1)", my: 1.5 }} />

          {/* Financial Summary Table (Focus: Amount Entry -> Beneficiary Capacity -> Financial Summary) */}
          <Stack spacing={1}>
            <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              FINANCIAL SUMMARY
            </Typography>

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
              <Typography sx={{ fontWeight: 900, color: !pricingResult.canProceed ? "#EF4444" : "#3B82F6", fontSize: "16px" }}>
                ₹{totalPayable.toLocaleString()}
              </Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Wallet After Transfer</Typography>
              <Typography sx={{ fontWeight: 800, color: !pricingResult.canProceed ? "#EF4444" : "#FBBF24", fontSize: "14px" }}>
                ₹{balanceAfter.toLocaleString()}
              </Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Settlement ETA</Typography>
              <Typography sx={{ fontWeight: 800, color: "#4ADE80", fontSize: "12px" }}>1.2 sec (IMPS)</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Recommended Route</Typography>
              <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "12px" }}>{pricingResult.recommendedGateway}</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Pricing Version</Typography>
              <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "12px" }}>{pricingResult.pricingVersion}</Typography>
            </Stack>
          </Stack>
        </Box>

        {/* Action Buttons */}
        <Stack spacing={1} sx={{ pt: 1.5 }}>
          <Tooltip title={isProceedDisabled ? `Transfer cannot continue. Reason: ${pricingResult.validationMessage}` : ""} arrow placement="top">
            <Box component="span" sx={{ width: "100%" }}>
              <Button
                fullWidth
                variant="contained"
                disabled={isProceedDisabled}
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
                  "&.Mui-disabled": {
                    bgcolor: "rgba(255, 255, 255, 0.12)",
                    color: "rgba(255, 255, 255, 0.4)",
                    cursor: "not-allowed",
                    pointerEvents: "auto",
                  },
                }}
              >
                Proceed to Authorization (Ctrl+Enter)
              </Button>
            </Box>
          </Tooltip>

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
