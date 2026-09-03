import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useRetailerStore } from "@/stores/use-retailer-store";
import { useTransactionMemoryStore } from "@/stores/use-transaction-memory-store";
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
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  Skeleton,
  CircularProgress,
  LinearProgress,
} from "@mui/material";
import { retailerApi } from "@/services/retailer-api";

import SearchIcon from "@mui/icons-material/Search";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import DeleteIcon from "@mui/icons-material/Delete";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import CheckIcon from "@mui/icons-material/Check";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

import { CustomerData } from "../../hooks/useCustomer";
import { BeneficiaryData, deduplicateBeneficiaries } from "../../hooks/useBeneficiary";
import { AmountInWords } from "../Amount/AmountInWords";
import { TransferAmountInput } from "../Amount/TransferAmountInput";
import { EnterpriseStatusStrip } from "../Amount/EnterpriseStatusStrip";
import { SmartAutoCorrectionBar } from "../Amount/SmartAutoCorrectionBar";
import {
  PricingEvaluationResult,
  RuleEngineService,
  TransactionModeRecord,
} from "../../services/RuleEngineAdapter";
import { CustomerSummaryHeader } from "@/components/customers/customer-summary-header";
import apiClient from "@/lib/api";

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
  selectedMode?: "IMPS" | "NEFT" | "RTGS" | "UPI";
  onModeChange?: (mode: "IMPS" | "NEFT" | "RTGS" | "UPI") => void;
  onAddBeneficiary?: (b: BeneficiaryData) => void;
  isLoading?: boolean;
}

export const WorkstationStep2: React.FC<WorkstationStep2Props> = ({
  customer,
  beneficiaries,
  selectedBeneficiary,
  onSelectBeneficiary,
  amount,
  onAmountChange,
  pricingResult: initialPricingResult,
  onBack,
  onContinue,
  selectedMode: propsSelectedMode,
  onModeChange,
  onAddBeneficiary,
  isLoading = false,
}) => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "favorite">("all");
  const [sortBy, setSortBy] = useState<"recent" | "used" | "alphabetical">("recent");

  // Track which row/card is expanded for inline details
  const [expandedBeneficiaryId, setExpandedBeneficiaryId] = useState<string | null>(
    selectedBeneficiary?.id || null
  );

  const toggleExpandRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedBeneficiaryId((prev) => (prev === id ? null : id));
  };

  // Load Transaction Modes from Database
  const dbTransactionModes: TransactionModeRecord[] = RuleEngineService.getTransactionModes();
  const [selectedMode, setSelectedMode] = useState<"IMPS" | "NEFT" | "RTGS" | "UPI">(
    propsSelectedMode || "IMPS"
  );

  // Beneficiary limit state (fetched fresh on selection)
  const [beneficiaryLimitLoaded, setBeneficiaryLimitLoaded] = useState(false);
  const [beneficiaryLimitFailed, setBeneficiaryLimitFailed] = useState(false);
  const [beneficiaryDailyRem, setBeneficiaryDailyRem] = useState<number>(-1);
  const [beneficiaryMonthlyRem, setBeneficiaryMonthlyRem] = useState<number>(-1);
  const [beneficiaryIsActive, setBeneficiaryIsActive] = useState<boolean>(true);

  // Fetch fresh limits from backend when a beneficiary is selected
  useEffect(() => {
    if (!selectedBeneficiary?.id) {
      setBeneficiaryLimitLoaded(false);
      setBeneficiaryLimitFailed(false);
      setBeneficiaryDailyRem(-1);
      setBeneficiaryMonthlyRem(-1);
      setBeneficiaryIsActive(true);
      return;
    }

    let isMounted = true;
    const benId = selectedBeneficiary.id;
    setBeneficiaryLimitLoaded(false);
    setBeneficiaryLimitFailed(false);

    apiClient
      .get(`/beneficiaries/${benId}/limits`)
      .then((res) => {
        const data = res.data?.data || res.data;
        if (!isMounted || !data) return;

        const freshDailyRem = Number(data.daily_remaining ?? selectedBeneficiary.dailyRemaining ?? 50000);
        const freshMonthlyRem = Number(data.monthly_remaining ?? selectedBeneficiary.monthlyRemaining ?? 200000);
        const isActive = Boolean(data.is_active ?? selectedBeneficiary.status !== "INACTIVE");

        setBeneficiaryDailyRem(freshDailyRem);
        setBeneficiaryMonthlyRem(freshMonthlyRem);
        setBeneficiaryIsActive(isActive);
        setBeneficiaryLimitLoaded(true);
        setBeneficiaryLimitFailed(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setBeneficiaryDailyRem(selectedBeneficiary.dailyRemaining ?? 50000);
        setBeneficiaryMonthlyRem(selectedBeneficiary.monthlyRemaining ?? 200000);
        setBeneficiaryIsActive(selectedBeneficiary.status !== "INACTIVE");
        setBeneficiaryLimitLoaded(true);
        setBeneficiaryLimitFailed(true);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedBeneficiary?.id]);

  // Navigate to dedicated Add Beneficiary page
  const handleNavigateToAddBeneficiary = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("draftCustomerId", customer?.id || "");
      sessionStorage.setItem("draftCustomerMobile", customer?.mobile || "");
      sessionStorage.setItem("draftCustomerName", customer?.name || "");
    }
    useTransactionMemoryStore.getState().setSelectedCustomer(customer);
    useTransactionMemoryStore.getState().setReferrerUrl("/retailer/dmt");
    router.push(
      `/retailer/beneficiaries/add?customerId=${customer?.id || ""}&customerMobile=${customer?.mobile || ""}`
    );
  };

  // Navigate to dedicated Remove Beneficiary page
  const handleNavigateToRemoveBeneficiary = (b: BeneficiaryData, e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== "undefined") {
      sessionStorage.setItem("selected_bene_for_remove", JSON.stringify(b));
    }
    router.push(`/retailer/beneficiaries/remove?id=${b.id}&customerId=${customer?.id || ""}`);
  };

  // Handle transaction mode changes
  const handleModeSelect = (mode: "IMPS" | "NEFT" | "RTGS" | "UPI") => {
    setSelectedMode(mode);
    if (onModeChange) {
      onModeChange(mode);
    }
  };

  // Dynamic pricing calculations
  const modeInfo = dbTransactionModes.find((m) => m.mode_code === selectedMode) || dbTransactionModes[0];
  const isModeDisabled = !modeInfo?.enabled;

  const retailerWallet = useRetailerStore((state) => state.wallet);
  const currentWalletBalance = retailerWallet?.mainBalance ?? initialPricingResult.walletBalance ?? 235750.0;

  const livePricingResult = useMemo(() => {
    return RuleEngineService.evaluatePricing({
      amount,
      transactionMode: selectedMode,
      walletBalance: currentWalletBalance,
      dailyRemaining: initialPricingResult.dailyLimitRemaining,
      monthlyRemaining: initialPricingResult.monthlyLimitRemaining,
      beneficiaryBankName: selectedBeneficiary?.bankName || "Partner Bank",
      beneficiaryDailyRemaining:
        beneficiaryLimitLoaded && beneficiaryDailyRem >= 0
          ? beneficiaryDailyRem
          : initialPricingResult.dailyLimitRemaining,
      beneficiaryMonthlyRemaining:
        beneficiaryLimitLoaded && beneficiaryMonthlyRem >= 0
          ? beneficiaryMonthlyRem
          : initialPricingResult.monthlyLimitRemaining,
      beneficiaryStatus: selectedBeneficiary?.status || "ACTIVE",
      isBeneficiaryActive: beneficiaryIsActive,
      limitLoadFailed: beneficiaryLimitFailed,
    });
  }, [
    amount,
    selectedMode,
    initialPricingResult,
    selectedBeneficiary,
    beneficiaryLimitLoaded,
    beneficiaryDailyRem,
    beneficiaryMonthlyRem,
    beneficiaryIsActive,
    beneficiaryLimitFailed,
    currentWalletBalance,
  ]);

  const pricingResult = {
    ...livePricingResult,
    dailyLimitRemaining:
      beneficiaryLimitLoaded && beneficiaryDailyRem >= 0
        ? beneficiaryDailyRem
        : initialPricingResult.dailyLimitRemaining,
    monthlyLimitRemaining:
      beneficiaryLimitLoaded && beneficiaryMonthlyRem >= 0
        ? beneficiaryMonthlyRem
        : initialPricingResult.monthlyLimitRemaining,
    isBeneficiaryLimitLoaded: beneficiaryLimitLoaded,
    isBeneficiaryLimitFailed: beneficiaryLimitFailed,
  };

  const fee = Number(pricingResult?.convenienceFee ?? 0);
  const gst = Number(pricingResult?.gstAmount ?? 0);
  const totalDebit =
    amount > 0 ? Number(pricingResult?.totalDebit ?? pricingResult?.totalPayable ?? amount + fee + gst) : 0;
  const hasLimitBreach =
    amount > 0 &&
    (amount > (pricingResult?.dailyLimitRemaining ?? 0) || amount > (pricingResult?.monthlyLimitRemaining ?? 0));
  const hasInsufficientWallet = amount > 0 && totalDebit > (pricingResult?.walletBalance ?? 0);

  const [localBeneficiaries, setLocalBeneficiaries] = useState<BeneficiaryData[]>(beneficiaries);
  useEffect(() => {
    setLocalBeneficiaries(beneficiaries);
  }, [beneficiaries]);

  const handleToggleBeneficiaryFavorite = async (bId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setLocalBeneficiaries((prev) =>
      prev.map((b) => (b.id === bId ? { ...b, isFavorite: !b.isFavorite } : b))
    );
    try {
      await retailerApi.toggleBeneficiaryFavorite(bId);
    } catch (err) {
      console.error("Failed to toggle beneficiary favorite in DB:", err);
      setLocalBeneficiaries((prev) =>
        prev.map((b) => (b.id === bId ? { ...b, isFavorite: !b.isFavorite } : b))
      );
    }
  };

  const cleanBeneficiaries = useMemo(() => deduplicateBeneficiaries(localBeneficiaries), [localBeneficiaries]);

  // Filter and Sort Beneficiaries
  const filteredBeneficiaries = useMemo(() => {
    return cleanBeneficiaries.filter((b) => {
      const matchesSearch =
        (b.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.accountNumber || "").includes(searchTerm) ||
        (b.bankName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.ifsc || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter = filterType === "favorite" ? b.isFavorite : true;
      return matchesSearch && matchesFilter;
    });
  }, [cleanBeneficiaries, searchTerm, filterType]);

  const sortedBeneficiaries = useMemo(() => {
    return [...filteredBeneficiaries].sort((a, b) => {
      if (sortBy === "used") {
        return (b.transferCount || 0) - (a.transferCount || 0);
      }
      if (sortBy === "alphabetical") {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });
  }, [filteredBeneficiaries, sortBy]);

  const displayedBeneficiaries = sortedBeneficiaries;

  const handleRowClick = (b: BeneficiaryData) => {
    onSelectBeneficiary(b);
    setTimeout(() => {
      const el = document.querySelector('input[inputmode="numeric"]') as HTMLInputElement;
      if (el) {
        el.focus();
        el.select();
      }
    }, 50);
  };

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "100%", lg: "1.45fr 1fr" },
        gap: { xs: 2, lg: 2.5 },
        alignItems: "start",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        overflowX: "hidden",
      }}
    >
      {/* ── LEFT PANEL: BENEFICIARY CONSOLE (GLASSMORPHISM CARD) ── */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, sm: 2.5 },
          borderRadius: { xs: "18px", sm: "22px" },
          bgcolor: "rgba(11, 15, 25, 0.85)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(245, 158, 11, 0.2)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6), 0 0 24px rgba(245, 158, 11, 0.06)",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
          overflowX: "hidden",
          position: "relative",
        }}
      >
        {/* Subtle top gold glow accent */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: "15%",
            right: "15%",
            height: "1px",
            background: "linear-gradient(90deg, transparent 0%, rgba(245, 158, 11, 0.6) 50%, transparent 100%)",
            boxShadow: "0 0 10px rgba(245, 158, 11, 0.5)",
          }}
        />

        {/* Customer Header Component */}
        <CustomerSummaryHeader
          customer={customer}
          onChangeCustomer={() => {
            if (onBack) onBack();
          }}
          onViewCustomerProfile={() => {
            if (onBack) onBack();
          }}
        />

        {/* ── CONSOLE HEADER: TITLE & + ADD BENEFICIARY BUTTON ── */}
        <Stack
          direction="row"
          sx={{
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1.5,
            flexWrap: "wrap",
            gap: 1,
            width: "100%",
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Typography
              sx={{
                fontWeight: 900,
                fontSize: { xs: "15px", sm: "17px" },
                letterSpacing: "-0.2px",
                background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #F59E0B 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Beneficiary Selection
            </Typography>
            <Chip
              label={`${filteredBeneficiaries.length}${
                filteredBeneficiaries.length !== cleanBeneficiaries.length ? ` / ${cleanBeneficiaries.length}` : ""
              }`}
              size="small"
              sx={{
                height: 22,
                px: 0.5,
                fontSize: "11px",
                fontWeight: 800,
                bgcolor: "rgba(245, 158, 11, 0.15)",
                color: "#FBBF24",
                border: "1px solid rgba(245, 158, 11, 0.35)",
              }}
            />
          </Stack>

          <Button
            size="small"
            variant="contained"
            startIcon={<PersonAddIcon sx={{ fontSize: 15, color: "#080B11" }} />}
            onClick={handleNavigateToAddBeneficiary}
            sx={{
              height: 34,
              px: 2,
              borderRadius: "10px",
              fontWeight: 900,
              fontSize: "12px",
              background: "linear-gradient(135deg, #FDE68A 0%, #F59E0B 50%, #D97706 100%)",
              color: "#080B11",
              textTransform: "none",
              boxShadow: "0 4px 14px rgba(245, 158, 11, 0.35)",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #B45309 100%)",
                boxShadow: "0 6px 18px rgba(245, 158, 11, 0.45)",
                transform: "translateY(-1px)",
              },
            }}
          >
            + Add Beneficiary
          </Button>
        </Stack>

        {/* ── SEARCH & FILTER CONTROLS ── */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2, width: "100%" }}>
          <TextField
            fullWidth
            size="small"
            suppressHydrationWarning
            autoComplete="off"
            placeholder="Search beneficiary / account / bank / IFSC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            slotProps={{
              htmlInput: {
                suppressHydrationWarning: true,
                autoComplete: "off",
                name: "disable_autofill_bene_search",
                "data-lpignore": "true",
                "data-1p-ignore": "true",
                "data-bwignore": "true",
              },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#60A5FA", fontSize: 18 }} />
                  </InputAdornment>
                ),
                sx: {
                  height: 38,
                  borderRadius: "8px",
                  bgcolor: "rgba(255, 255, 255, 0.05)",
                  color: "#FFFFFF",
                  fontSize: "12.5px",
                },
              },
            }}
          />

          <Stack direction="row" spacing={1} sx={{ width: { xs: "100%", sm: "auto" } }}>
            <Select
              size="small"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              sx={{
                flex: { xs: 1, sm: "none" },
                minWidth: { xs: 0, sm: 140 },
                height: 38,
                fontSize: "12px",
                fontWeight: 700,
                color: "#FFFFFF",
                bgcolor: "rgba(255, 255, 255, 0.08)",
                borderRadius: "8px",
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
                flex: { xs: 1, sm: "none" },
                minWidth: { xs: 0, sm: 140 },
                height: 38,
                fontSize: "12px",
                fontWeight: 700,
                color: "#FFFFFF",
                bgcolor: "rgba(255, 255, 255, 0.08)",
                borderRadius: "8px",
                ".MuiSelect-icon": { color: "#FFFFFF" },
              }}
            >
              <MenuItem value="recent">Sort: Most Recent</MenuItem>
              <MenuItem value="used">Sort: Highest Used</MenuItem>
              <MenuItem value="alphabetical">Sort: A-Z</MenuItem>
            </Select>
          </Stack>
        </Stack>

        {/* ── BENEFICIARY LIST CONTAINER (RESPONSIVE: CARDS ON MOBILE, TABLE ON DESKTOP) ── */}
        <Box
          sx={{
            flex: 1,
            width: "100%",
            maxWidth: "100%",
            overflowX: "hidden",
            minHeight: "280px",
            maxHeight: { xs: "none", md: "560px", lg: "calc(100vh - 280px)" },
            overflowY: "auto",
            pr: { xs: 0, sm: 0.5 },
            pb: 1,
            position: "relative",
            boxSizing: "border-box",
          }}
        >
          {isLoading ? (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <CircularProgress size={28} sx={{ color: "#60A5FA", mb: 1.5 }} />
              <Typography sx={{ color: "#93C5FD", fontWeight: 800, fontSize: "13px" }}>
                Loading verified beneficiaries from core banking...
              </Typography>
            </Box>
          ) : filteredBeneficiaries.length === 0 ? (
            <Paper
              elevation={0}
              onClick={handleNavigateToAddBeneficiary}
              sx={{
                p: { xs: 3, sm: 4 },
                textAlign: "center",
                bgcolor: "rgba(37, 99, 235, 0.06)",
                borderRadius: "14px",
                border: "2px dashed rgba(37, 99, 235, 0.35)",
                width: "100%",
                boxSizing: "border-box",
                cursor: "pointer",
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  bgcolor: "rgba(37, 99, 235, 0.12)",
                  borderColor: "#2563EB",
                },
              }}
            >
              <AccountBalanceIcon sx={{ fontSize: 44, color: "#60A5FA", mb: 1 }} />
              <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "16px", mb: 0.5 }}>
                {searchTerm ? "No matching beneficiaries found." : "No beneficiaries found"}
              </Typography>
              <Typography
                sx={{ color: "rgba(255, 255, 255, 0.65)", fontSize: "13px", mb: 2.5, maxWidth: 400, mx: "auto" }}
              >
                {searchTerm
                  ? "Try searching with a different name, bank or account number."
                  : "Add a beneficiary to make a payout."}
              </Typography>
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleNavigateToAddBeneficiary();
                }}
                sx={{
                  height: 38,
                  px: 3,
                  borderRadius: "8px",
                  fontWeight: 800,
                  fontSize: "13px",
                  bgcolor: "#2563EB",
                  color: "#FFFFFF",
                  textTransform: "none",
                }}
              >
                + Add Beneficiary
              </Button>
            </Paper>
          ) : (
            <>
              {/* ── 1. MOBILE BENEFICIARY CARD VIEW (xs / sm only) ── */}
              <Box sx={{ display: { xs: "flex", md: "none" }, flexDirection: "column", gap: 1.5, width: "100%" }}>
                {displayedBeneficiaries.map((b) => {
                  const isSelected =
                    selectedBeneficiary?.id === b.id ||
                    (selectedBeneficiary?.accountNumber &&
                      b.accountNumber &&
                      selectedBeneficiary.accountNumber === b.accountNumber);
                  const isExpanded = expandedBeneficiaryId === b.id;
                  const rawAccount = b.accountNumber || b.maskedAccountNumber || "";
                  const bAny = b as any;

                  return (
                    <Paper
                      key={b.id}
                      elevation={0}
                      onClick={() => handleRowClick(b)}
                      sx={{
                        p: 1.5,
                        borderRadius: "14px",
                        bgcolor: isSelected ? "rgba(245, 158, 11, 0.12)" : "rgba(255, 255, 255, 0.03)",
                        border: isSelected ? "1.5px solid #F59E0B" : "1px solid rgba(255, 255, 255, 0.08)",
                        boxShadow: isSelected ? "0 4px 20px rgba(245, 158, 11, 0.25)" : "none",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {/* Top Row: Avatar + Name + Bank + Status */}
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, flex: 1 }}>
                          <Avatar
                            sx={{
                              width: 34,
                              height: 34,
                              bgcolor: isSelected ? "#F59E0B" : "rgba(255, 255, 255, 0.12)",
                              color: isSelected ? "#080B11" : "#FFFFFF",
                              fontWeight: 900,
                              fontSize: "12px",
                              flexShrink: 0,
                              border: isSelected ? "1px solid #FEF08A" : "none",
                            }}
                          >
                            {(b.name || "B").slice(0, 2).toUpperCase()}
                          </Avatar>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                              <Typography
                                sx={{
                                  fontWeight: 900,
                                  color: isSelected ? "#FDE68A" : "#FFFFFF",
                                  fontSize: "14px",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {b.name}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={(e) => handleToggleBeneficiaryFavorite(b.id, e)}
                                sx={{ p: 0.25 }}
                                title={b.isFavorite ? "Remove from Favorites" : "Mark as Favorite"}
                              >
                                {b.isFavorite ? (
                                  <StarIcon sx={{ color: "#FBBF24", fontSize: 16 }} />
                                ) : (
                                  <StarBorderIcon sx={{ color: "rgba(255, 255, 255, 0.3)", fontSize: 16, "&:hover": { color: "#FBBF24" } }} />
                                )}
                              </IconButton>
                            </Box>
                            <Typography sx={{ color: "#60A5FA", fontSize: "11.5px", fontWeight: 700 }}>
                              {b.bankName}
                            </Typography>
                          </Box>
                        </Box>

                        <Chip
                          icon={<CheckCircleIcon sx={{ "&&": { color: "#4ADE80", fontSize: 11 } }} />}
                          label="Verified"
                          size="small"
                          sx={{
                            height: 20,
                            bgcolor: "rgba(74, 222, 128, 0.12)",
                            color: "#4ADE80",
                            fontWeight: 800,
                            fontSize: "9.5px",
                          }}
                        />
                      </Box>

                      {/* Middle Row: Account Number + Limits */}
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          p: 1,
                          borderRadius: "8px",
                          bgcolor: "rgba(0, 0, 0, 0.25)",
                          mb: 1,
                        }}
                      >
                        <Box>
                          <Typography sx={{ color: "#94A3B8", fontSize: "9.5px", fontWeight: 700 }}>
                            ACCOUNT NUMBER
                          </Typography>
                          <Typography
                            sx={{
                              color: "#FFFFFF",
                              fontFamily: "monospace",
                              fontSize: "12.5px",
                              fontWeight: 800,
                            }}
                          >
                            {rawAccount}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: "right" }}>
                          <Typography sx={{ color: "#94A3B8", fontSize: "9.5px", fontWeight: 700 }}>
                            MONTHLY REMAINING
                          </Typography>
                          <Typography
                            sx={{
                              color: "#34D399",
                              fontFamily: "monospace",
                              fontSize: "12.5px",
                              fontWeight: 800,
                            }}
                          >
                            ₹{(b.monthlyRemaining ?? 200000).toLocaleString()}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Bottom Action Controls */}
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Button
                          size="small"
                          variant="text"
                          onClick={(e) => toggleExpandRow(b.id, e)}
                          endIcon={
                            isExpanded ? (
                              <KeyboardArrowUpIcon sx={{ fontSize: 15 }} />
                            ) : (
                              <KeyboardArrowDownIcon sx={{ fontSize: 15 }} />
                            )
                          }
                          sx={{
                            color: isExpanded ? "#60A5FA" : "#94A3B8",
                            fontSize: "11px",
                            fontWeight: 700,
                            p: 0,
                            textTransform: "none",
                          }}
                        >
                          {isExpanded ? "Hide Details" : "View Details"}
                        </Button>

                        <Button
                          size="small"
                          variant={isSelected ? "contained" : "outlined"}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(b);
                          }}
                          sx={{
                            height: 28,
                            px: 1.5,
                            fontSize: "11px",
                            fontWeight: 800,
                            borderRadius: "6px",
                            bgcolor: isSelected ? "#2563EB" : "transparent",
                            borderColor: isSelected ? "#2563EB" : "rgba(255, 255, 255, 0.2)",
                            color: isSelected ? "#FFFFFF" : "rgba(255, 255, 255, 0.8)",
                            textTransform: "none",
                          }}
                        >
                          {isSelected ? "Selected ✓" : "Select"}
                        </Button>
                      </Box>

                      {/* Collapsible Mobile Details */}
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box
                          sx={{
                            mt: 1.25,
                            pt: 1.25,
                            borderTop: "1px dashed rgba(255, 255, 255, 0.12)",
                            display: "grid",
                            gridTemplateColumns: "repeat(2, 1fr)",
                            gap: 1,
                          }}
                        >
                          <Box>
                            <Typography sx={{ color: "#94A3B8", fontSize: "9.5px", fontWeight: 700 }}>IFSC</Typography>
                            <Typography sx={{ color: "#93C5FD", fontFamily: "monospace", fontSize: "11.5px", fontWeight: 700 }}>
                              {b.ifsc}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography sx={{ color: "#94A3B8", fontSize: "9.5px", fontWeight: 700 }}>Branch</Typography>
                            <Typography sx={{ color: "#FFFFFF", fontSize: "11.5px", fontWeight: 600 }}>
                              {b.branchName || "Main Branch"}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography sx={{ color: "#94A3B8", fontSize: "9.5px", fontWeight: 700 }}>Daily Remaining</Typography>
                            <Typography sx={{ color: "#34D399", fontSize: "11.5px", fontWeight: 700 }}>
                              ₹{(b.todayRemaining ?? 24990).toLocaleString()}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography sx={{ color: "#94A3B8", fontSize: "9.5px", fontWeight: 700 }}>Relationship</Typography>
                            <Typography sx={{ color: "#FBBF24", fontSize: "11.5px", fontWeight: 700 }}>
                              {b.relationship || "Family"}
                            </Typography>
                          </Box>

                          <Box sx={{ gridColumn: "span 2", mt: 0.5 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<DeleteIcon sx={{ fontSize: 13 }} />}
                              onClick={(e) => handleNavigateToRemoveBeneficiary(b, e)}
                              sx={{
                                height: 26,
                                px: 1.25,
                                borderRadius: "6px",
                                fontSize: "10.5px",
                                fontWeight: 800,
                                textTransform: "none",
                                width: "100%",
                              }}
                            >
                              Remove Beneficiary
                            </Button>
                          </Box>
                        </Box>
                      </Collapse>
                    </Paper>
                  );
                })}
              </Box>

              {/* ── 2. DESKTOP BENEFICIARY TABLE (md+ only) ── */}
              <Box sx={{ display: { xs: "none", md: "block" } }}>
                <TableContainer
                  component={Paper}
                  elevation={0}
                  sx={{
                    bgcolor: "transparent",
                    borderRadius: "10px",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    overflow: "visible",
                  }}
                >
                  <Table size="small" aria-label="beneficiary table" stickyHeader>
                    <TableHead>
                      <TableRow sx={{ "& th": { bgcolor: "#131E38" } }}>
                        <TableCell sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "11px", fontWeight: 800, py: 1, pl: 2 }}>
                          Beneficiary
                        </TableCell>
                        <TableCell sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "11px", fontWeight: 800, py: 1 }}>
                          Bank Account
                        </TableCell>
                        <TableCell sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "11px", fontWeight: 800, py: 1 }}>
                          Monthly Limit
                        </TableCell>
                        <TableCell sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "11px", fontWeight: 800, py: 1, textAlign: "center" }}>
                          Verified
                        </TableCell>
                        <TableCell sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "11px", fontWeight: 800, py: 1, pr: 2, textAlign: "right" }}>
                          Action
                        </TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {displayedBeneficiaries.map((b) => {
                        const isSelected =
                          selectedBeneficiary?.id === b.id ||
                          (selectedBeneficiary?.accountNumber &&
                            b.accountNumber &&
                            selectedBeneficiary.accountNumber === b.accountNumber);
                        const isExpanded = expandedBeneficiaryId === b.id;
                        const rawAccount = b.accountNumber || b.maskedAccountNumber || "";
                        const bAny = b as any;

                        return (
                          <React.Fragment key={b.id}>
                            <TableRow
                              onClick={() => handleRowClick(b)}
                              sx={{
                                cursor: "pointer",
                                transition: "all 120ms ease",
                                bgcolor: isSelected
                                  ? "rgba(245, 158, 11, 0.14)"
                                  : isExpanded
                                  ? "rgba(255, 255, 255, 0.04)"
                                  : "transparent",
                                borderLeft: isSelected ? "4px solid #F59E0B" : "4px solid transparent",
                                "&:hover": {
                                  bgcolor: isSelected ? "rgba(245, 158, 11, 0.20)" : "rgba(255, 255, 255, 0.05)",
                                },
                              }}
                            >
                              <TableCell sx={{ py: 1.25, pl: isSelected ? 1.5 : 2, borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                                  <Avatar
                                    sx={{
                                      width: 28,
                                      height: 28,
                                      bgcolor: isSelected ? "#F59E0B" : "rgba(255, 255, 255, 0.10)",
                                      color: isSelected ? "#080B11" : "#FFFFFF",
                                      fontWeight: 900,
                                      fontSize: "11px",
                                    }}
                                  >
                                    {(b.name || "Beneficiary").slice(0, 2).toUpperCase()}
                                  </Avatar>
                                  <Box>
                                    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                                      <Typography sx={{ fontWeight: 800, color: isSelected ? "#FDE68A" : "#FFFFFF", fontSize: "13px", lineHeight: 1.2 }}>
                                        {b.name}
                                      </Typography>
                                      <IconButton
                                size="small"
                                onClick={(e) => handleToggleBeneficiaryFavorite(b.id, e)}
                                sx={{ p: 0.25 }}
                                title={b.isFavorite ? "Remove from Favorites" : "Mark as Favorite"}
                              >
                                {b.isFavorite ? (
                                  <StarIcon sx={{ color: "#FBBF24", fontSize: 16 }} />
                                ) : (
                                  <StarBorderIcon sx={{ color: "rgba(255, 255, 255, 0.3)", fontSize: 16, "&:hover": { color: "#FBBF24" } }} />
                                )}
                              </IconButton>
                                    </Stack>
                                  </Box>
                                </Stack>
                              </TableCell>

                              <TableCell sx={{ py: 1.25, borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                                <Typography sx={{ color: "#60A5FA", fontSize: "12.5px", fontWeight: 800, lineHeight: 1.2 }}>
                                  {b.bankName}
                                </Typography>
                                <Typography sx={{ color: "rgba(255, 255, 255, 0.90)", fontFamily: "monospace", fontSize: "12px", fontWeight: 700 }}>
                                  {rawAccount}
                                </Typography>
                              </TableCell>

                              <TableCell sx={{ py: 1.25, borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                                <Typography sx={{ color: "#FFFFFF", fontWeight: 800, fontSize: "13px" }}>
                                  ₹{(b.monthlyLimit ?? 200000).toLocaleString()}
                                </Typography>
                                <Typography sx={{ color: "#4ADE80", fontSize: "10.5px", fontWeight: 700 }}>
                                  ₹{(b.monthlyRemaining ?? 200000).toLocaleString()} rem
                                </Typography>
                              </TableCell>

                              <TableCell sx={{ py: 1.25, textAlign: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                                {b.isVerified !== false ? (
                                  <Chip
                                    icon={<CheckCircleIcon sx={{ "&&": { color: "#4ADE80", fontSize: 13 } }} />}
                                    label="✓ Verified"
                                    size="small"
                                    sx={{
                                      height: 22,
                                      bgcolor: "rgba(74, 222, 128, 0.12)",
                                      color: "#4ADE80",
                                      fontWeight: 800,
                                      fontSize: "10.5px",
                                    }}
                                  />
                                ) : (
                                  <Chip
                                    label="● Pending"
                                    size="small"
                                    sx={{
                                      height: 22,
                                      bgcolor: "rgba(251, 191, 36, 0.12)",
                                      color: "#FBBF24",
                                      fontWeight: 800,
                                      fontSize: "10.5px",
                                    }}
                                  />
                                )}
                              </TableCell>

                              <TableCell sx={{ py: 1.25, pr: 2, textAlign: "right", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                                <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", alignItems: "center" }}>
                                  <Button
                                    size="small"
                                    variant="text"
                                    onClick={(e) => toggleExpandRow(b.id, e)}
                                    endIcon={
                                      isExpanded ? (
                                        <KeyboardArrowUpIcon sx={{ fontSize: 16 }} />
                                      ) : (
                                        <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />
                                      )
                                    }
                                    sx={{
                                      color: isExpanded ? "#60A5FA" : "rgba(255, 255, 255, 0.75)",
                                      fontSize: "11px",
                                      fontWeight: 700,
                                      textTransform: "none",
                                      p: 0.5,
                                      minWidth: "auto",
                                    }}
                                  >
                                    View Details
                                  </Button>

                                  <Button
                                    size="small"
                                    variant={isSelected ? "contained" : "outlined"}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRowClick(b);
                                    }}
                                    sx={{
                                      height: 26,
                                      px: 1.25,
                                      fontSize: "10.5px",
                                      fontWeight: 900,
                                      borderRadius: "6px",
                                      bgcolor: isSelected ? "#F59E0B" : "transparent",
                                      borderColor: isSelected ? "#F59E0B" : "rgba(255, 255, 255, 0.2)",
                                      color: isSelected ? "#080B11" : "rgba(255, 255, 255, 0.8)",
                                      textTransform: "none",
                                      "&:hover": {
                                        bgcolor: isSelected ? "#D97706" : "rgba(245, 158, 11, 0.15)",
                                      },
                                    }}
                                  >
                                    {isSelected ? "Selected ✓" : "Select"}
                                  </Button>
                                </Stack>
                              </TableCell>
                            </TableRow>

                            <TableRow>
                              <TableCell colSpan={5} sx={{ p: 0, borderBottom: isExpanded ? "1px solid rgba(255, 255, 255, 0.10)" : "none" }}>
                                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                  <Box sx={{ p: 2, bgcolor: "rgba(10, 17, 34, 0.95)", borderTop: "1px dashed rgba(255, 255, 255, 0.10)" }}>
                                    <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", mb: 1.5 }}>
                                      Beneficiary Details
                                    </Typography>
                                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5, mb: 2 }}>
                                      <Box>
                                        <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "10.5px", fontWeight: 700 }}>Beneficiary Name</Typography>
                                        <Typography sx={{ color: "#FFFFFF", fontWeight: 800, fontSize: "13px" }}>{b.name}</Typography>
                                      </Box>
                                      <Box>
                                        <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "10.5px", fontWeight: 700 }}>Bank</Typography>
                                        <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "13px" }}>{b.bankName}</Typography>
                                      </Box>
                                      <Box>
                                        <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "10.5px", fontWeight: 700 }}>Account Number</Typography>
                                        <Typography sx={{ color: "#FFFFFF", fontFamily: "monospace", fontWeight: 800, fontSize: "13px" }}>{rawAccount}</Typography>
                                      </Box>
                                    </Box>
                                    <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", my: 1.5 }} />
                                    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        color="error"
                                        startIcon={<DeleteIcon sx={{ fontSize: 14 }} />}
                                        onClick={(e) => handleNavigateToRemoveBeneficiary(b, e)}
                                        sx={{
                                          height: 28,
                                          px: 1.5,
                                          borderRadius: "6px",
                                          fontWeight: 800,
                                          fontSize: "11px",
                                          textTransform: "none",
                                        }}
                                      >
                                        Remove Beneficiary
                                      </Button>
                                    </Stack>
                                  </Box>
                                </Collapse>
                              </TableCell>
                            </TableRow>
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </>
          )}
        </Box>

        {/* ── FOOTER SUMMARY STRIP ── */}
        <Stack
          direction="row"
          sx={{
            mt: 1.5,
            pt: 1.25,
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Typography sx={{ color: "rgba(255, 255, 255, 0.65)", fontSize: "12px", fontWeight: 700 }}>
            Showing <strong>{displayedBeneficiaries.length}</strong> of <strong>{cleanBeneficiaries.length}</strong> beneficiaries
          </Typography>
        </Stack>
      </Paper>

      {/* ── RIGHT PANEL (TRANSACTION MODE & TRANSFER AMOUNT - GLASSMORPHISM CARD) ── */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.75 },
          borderRadius: { xs: "18px", sm: "22px" },
          bgcolor: "rgba(11, 15, 25, 0.85)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(245, 158, 11, 0.2)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6), 0 0 24px rgba(245, 158, 11, 0.06)",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
          overflowX: "hidden",
          position: "relative",
        }}
      >
        {/* Subtle top gold glow accent */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: "15%",
            right: "15%",
            height: "1px",
            background: "linear-gradient(90deg, transparent 0%, rgba(245, 158, 11, 0.6) 50%, transparent 100%)",
            boxShadow: "0 0 10px rgba(245, 158, 11, 0.5)",
          }}
        />

        <Box>
          {/* ── TRANSACTION MODE SEGMENTED CONTROL ── */}
          <Box sx={{ mb: 2 }}>
            <Typography
              sx={{
                fontWeight: 900,
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                mb: 1,
              }}
            >
              TRANSACTION MODE
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 0.75,
                bgcolor: "rgba(8, 11, 17, 0.85)",
                p: 0.6,
                borderRadius: "12px",
                border: "1px solid rgba(245, 158, 11, 0.2)",
              }}
            >
              {dbTransactionModes.map((m) => {
                const isSelected = selectedMode === m.mode_code;
                return (
                  <Button
                    key={m.mode_id}
                    disabled={!m.enabled}
                    onClick={() => handleModeSelect(m.mode_code)}
                    sx={{
                      height: 36,
                      borderRadius: "9px",
                      fontWeight: 900,
                      fontSize: { xs: "10.5px", sm: "11.5px" },
                      p: 0.5,
                      color: isSelected ? "#080B11" : "rgba(255, 255, 255, 0.75)",
                      background: isSelected
                        ? "linear-gradient(135deg, #FDE68A 0%, #F59E0B 50%, #D97706 100%)"
                        : "transparent",
                      boxShadow: isSelected ? "0 2px 10px rgba(245, 158, 11, 0.4)" : "none",
                      textTransform: "none",
                      transition: "all 0.15s ease",
                      "&:hover": {
                        background: isSelected
                          ? "linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #B45309 100%)"
                          : "rgba(245, 158, 11, 0.08)",
                        color: isSelected ? "#080B11" : "#FDE68A",
                      },
                    }}
                  >
                    {m.mode_name}
                  </Button>
                );
              })}
            </Box>

            {isModeDisabled && (
              <Typography sx={{ color: "#EF4444", fontSize: "11px", fontWeight: 700, mt: 0.5 }}>
                This transaction mode is currently unavailable.
              </Typography>
            )}
          </Box>

          {/* Transfer Amount Input Component */}
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

          {/* One-Click Enterprise Auto Correction Bar */}
          <SmartAutoCorrectionBar validationResult={pricingResult} onAutoFixAmount={onAmountChange} />

          <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", my: 2 }} />

          {/* Financial Summary Table */}
          <Stack spacing={1.25}>
            <Typography
              sx={{
                fontWeight: 900,
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              FINANCIAL SUMMARY ({selectedMode})
            </Typography>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.65)", fontSize: "12.5px" }}>Transfer Amount</Typography>
              <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "13.5px" }}>
                ₹{Number(amount || 0).toLocaleString()}
              </Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "#4ADE80", fontWeight: 700, fontSize: "12.5px" }}>Beneficiary Receives</Typography>
              <Typography sx={{ fontWeight: 900, color: "#4ADE80", fontSize: "13.5px" }}>
                ₹{Number(amount || 0).toLocaleString()}
              </Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.65)", fontSize: "12.5px" }}>Convenience Fee</Typography>
              <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "12.5px" }}>
                + ₹
                {Number(fee || 0).toLocaleString(undefined, {
                  minimumFractionDigits: (fee || 0) % 1 !== 0 ? 2 : 0,
                  maximumFractionDigits: 2,
                })}
              </Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.65)", fontSize: "12.5px" }}>
                GST ({pricingResult?.gstPercentage ?? 0}%)
              </Typography>
              <Typography sx={{ fontWeight: 800, color: "#93C5FD", fontSize: "12.5px" }}>
                + ₹
                {Number(gst || 0).toLocaleString(undefined, {
                  minimumFractionDigits: (gst || 0) % 1 !== 0 ? 2 : 0,
                  maximumFractionDigits: 2,
                })}
              </Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between", pt: 0.5, borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.85)", fontWeight: 700, fontSize: "13px" }}>Total Debit from Wallet</Typography>
              <Typography
                sx={{
                  fontWeight: 900,
                  fontSize: "16px",
                  background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #F59E0B 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                ₹
                {Number(totalDebit || 0).toLocaleString(undefined, {
                  minimumFractionDigits: (totalDebit || 0) % 1 !== 0 ? 2 : 0,
                  maximumFractionDigits: 2,
                })}
              </Typography>
            </Stack>
          </Stack>
        </Box>

        {/* ── BOTTOM ACTIONS ── */}
        <Stack spacing={1.5} sx={{ mt: 3, width: "100%" }}>
          <Button
            fullWidth
            variant="contained"
            disabled={!selectedBeneficiary || amount <= 0 || hasLimitBreach || hasInsufficientWallet || isModeDisabled}
            onClick={onContinue}
            endIcon={<ArrowForwardIcon />}
            sx={{
              height: 48,
              borderRadius: "12px",
              fontWeight: 900,
              fontSize: "14.5px",
              background: "linear-gradient(135deg, #FDE68A 0%, #F59E0B 50%, #D97706 100%)",
              color: "#080B11",
              textTransform: "none",
              letterSpacing: "-0.2px",
              boxShadow: "0 6px 24px rgba(245, 158, 11, 0.45)",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #B45309 100%)",
                boxShadow: "0 8px 30px rgba(245, 158, 11, 0.6)",
                transform: "translateY(-1px)",
              },
              "&.Mui-disabled": {
                background: "rgba(255, 255, 255, 0.08)",
                color: "rgba(255, 255, 255, 0.35)",
                boxShadow: "none",
                cursor: "not-allowed",
              },
            }}
          >
            Proceed to Authorization →
          </Button>

          <Button
            fullWidth
            variant="outlined"
            onClick={onBack}
            startIcon={<ArrowBackIcon />}
            sx={{
              height: 42,
              borderRadius: "10px",
              fontWeight: 700,
              fontSize: "13px",
              color: "rgba(255, 255, 255, 0.8)",
              borderColor: "rgba(245, 158, 11, 0.25)",
              bgcolor: "rgba(255, 255, 255, 0.02)",
              textTransform: "none",
              "&:hover": {
                borderColor: "#F59E0B",
                color: "#FDE68A",
                bgcolor: "rgba(245, 158, 11, 0.08)",
              },
            }}
          >
            Back to Customer
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default WorkstationStep2;
