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
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import FirstPageIcon from "@mui/icons-material/FirstPage";
import LastPageIcon from "@mui/icons-material/LastPage";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";

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
      service: "DMT",
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
    amount > 0 ? Number(pricingResult?.totalPayable ?? amount + fee + gst) : 0;
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

  // ── PAGINATION & SCROLL VIEW MODE STATE ──
  const [page, setPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number | "all">(5);
  const [viewMode, setViewMode] = useState<"paginated" | "scroll">("paginated");

  // Reset page to 1 whenever search, filter, or sort changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterType, sortBy]);

  const totalBeneficiariesCount = sortedBeneficiaries.length;
  const effectivePageSize = typeof rowsPerPage === "number" ? rowsPerPage : 10;
  const totalPages =
    viewMode === "scroll" || rowsPerPage === "all"
      ? 1
      : Math.max(1, Math.ceil(totalBeneficiariesCount / effectivePageSize));

  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const displayedBeneficiaries = useMemo(() => {
    if (viewMode === "scroll" || rowsPerPage === "all") {
      return sortedBeneficiaries;
    }
    const startIndex = (page - 1) * effectivePageSize;
    return sortedBeneficiaries.slice(startIndex, startIndex + effectivePageSize);
  }, [sortedBeneficiaries, viewMode, rowsPerPage, page, effectivePageSize]);

  const startRecordIndex =
    totalBeneficiariesCount === 0
      ? 0
      : viewMode === "scroll" || rowsPerPage === "all"
      ? 1
      : (page - 1) * effectivePageSize + 1;
  const endRecordIndex =
    viewMode === "scroll" || rowsPerPage === "all"
      ? totalBeneficiariesCount
      : Math.min(page * effectivePageSize, totalBeneficiariesCount);

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
      {/* ── LEFT PANEL: BENEFICIARY CONSOLE ── */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, sm: 2.5 },
          borderRadius: { xs: "18px", sm: "22px" },
          bgcolor: "var(--surface, #FFFFFF)",
          border: "1px solid var(--brand-border, #E2E8F0)",
          boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
          overflowX: "hidden",
          position: "relative",
        }}
      >
        {/* Dynamic Brand Accent Top Bar */}
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

        {/* ── CONSOLE HEADER: TITLE, VIEW TOGGLE & + ADD BENEFICIARY BUTTON ── */}
        <Stack
          direction="row"
          sx={{
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1.5,
            flexWrap: { xs: "wrap", sm: "nowrap" },
            gap: 1,
            width: "100%",
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
            <Typography
              sx={{
                fontWeight: 900,
                fontSize: { xs: "15px", sm: "17px" },
                letterSpacing: "-0.2px",
                color: "var(--brand-primary, #0F3B7D)",
                whiteSpace: "nowrap",
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
                bgcolor: "var(--brand-surface, #EFF6FF)",
                color: "var(--brand-primary, #0F3B7D)",
                border: "1px solid var(--brand-border, rgba(15, 59, 125, 0.25))",
              }}
            />
          </Stack>

          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexShrink: 0 }}>
            {/* View Mode Toggle: Paginated vs Scroll */}
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                bgcolor: "var(--background-secondary, #F8FAFC)",
                border: "1px solid var(--border, #E2E8F0)",
                borderRadius: "8px",
                p: 0.3,
                gap: 0.3,
              }}
            >
              <Button
                size="small"
                onClick={() => {
                  setViewMode("paginated");
                  if (rowsPerPage === "all") setRowsPerPage(5);
                  setPage(1);
                }}
                startIcon={<FormatListNumberedIcon sx={{ fontSize: 13 }} />}
                sx={{
                  height: 28,
                  px: 1,
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: 800,
                  textTransform: "none",
                  bgcolor: viewMode === "paginated" ? "var(--brand-surface, #EFF6FF)" : "transparent",
                  color: viewMode === "paginated" ? "var(--brand-primary, #0F3B7D)" : "var(--text-muted, #64748B)",
                  border: viewMode === "paginated" ? "1px solid var(--brand-border, rgba(15, 59, 125, 0.25))" : "1px solid transparent",
                  "&:hover": {
                    bgcolor: "var(--brand-surface, #EFF6FF)",
                  },
                }}
              >
                Pages
              </Button>

              <Button
                size="small"
                onClick={() => {
                  setViewMode("scroll");
                  setRowsPerPage("all");
                }}
                startIcon={<UnfoldMoreIcon sx={{ fontSize: 13 }} />}
                sx={{
                  height: 28,
                  px: 1,
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: 800,
                  textTransform: "none",
                  bgcolor: viewMode === "scroll" ? "var(--brand-surface, #EFF6FF)" : "transparent",
                  color: viewMode === "scroll" ? "var(--brand-primary, #0F3B7D)" : "var(--text-muted, #64748B)",
                  border: viewMode === "scroll" ? "1px solid var(--brand-border, rgba(15, 59, 125, 0.25))" : "1px solid transparent",
                  "&:hover": {
                    bgcolor: "var(--brand-surface, #EFF6FF)",
                  },
                }}
              >
                Scroll
              </Button>
            </Box>

            <Button
              size="small"
              variant="contained"
              startIcon={<PersonAddIcon sx={{ fontSize: 15, color: "#FFFFFF" }} />}
              onClick={handleNavigateToAddBeneficiary}
              sx={{
                height: 34,
                px: 2,
                borderRadius: "10px",
                fontWeight: 900,
                fontSize: "12px",
                background: "var(--brand-gradient, linear-gradient(135deg, #0F3B7D 0%, #D4AF37 100%))",
                color: "#FFFFFF",
                textTransform: "none",
                whiteSpace: "nowrap",
                boxShadow: "0 4px 12px rgba(15, 23, 42, 0.14)",
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  filter: "brightness(1.06)",
                  boxShadow: "0 6px 16px rgba(15, 23, 42, 0.2)",
                  transform: "translateY(-1px)",
                },
              }}
            >
              + Add Beneficiary
            </Button>
          </Stack>
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
                    <SearchIcon sx={{ color: "var(--brand-primary, #0F3B7D)", fontSize: 18 }} />
                  </InputAdornment>
                ),
                sx: {
                  height: 38,
                  borderRadius: "8px",
                  bgcolor: "#FFFFFF",
                  color: "var(--text-primary, #0F172A)",
                  fontSize: "12.5px",
                  "& input": { color: "var(--text-primary, #0F172A)" },
                  "& input::placeholder": { color: "#64748B", opacity: 1 },
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
                color: "var(--text-primary, #0F172A)",
                bgcolor: "var(--background-secondary, #F8FAFC)",
                borderRadius: "8px",
                ".MuiSelect-icon": { color: "var(--text-secondary, #334155)" },
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
                color: "var(--text-primary, #0F172A)",
                bgcolor: "var(--background-secondary, #F8FAFC)",
                borderRadius: "8px",
                ".MuiSelect-icon": { color: "var(--text-secondary, #334155)" },
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
            minHeight: "260px",
            maxHeight: viewMode === "scroll" || rowsPerPage === "all" ? { xs: "520px", md: "560px", lg: "calc(100vh - 280px)" } : "none",
            overflowY: viewMode === "scroll" || rowsPerPage === "all" ? "auto" : "visible",
            pr: { xs: 0, sm: 0.5 },
            pb: 1,
            position: "relative",
            boxSizing: "border-box",
            scrollbarWidth: viewMode === "scroll" ? "thin" : "none",
            scrollbarColor: viewMode === "scroll" ? "var(--brand-primary) #F1F5F9" : "transparent transparent",
            msOverflowStyle: "none",
            "&::-webkit-scrollbar": {
              display: viewMode === "scroll" ? "block" : "none",
              width: "5px",
            },
            "&::-webkit-scrollbar-track": {
              background: "#F1F5F9",
              borderRadius: "8px",
            },
            "&::-webkit-scrollbar-thumb": {
              background: "var(--brand-border, #CBD5E1)",
              borderRadius: "8px",
              "&:hover": {
                background: "var(--brand-primary, #0F3B7D)",
              },
            },
          }}
        >
          {isLoading ? (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <CircularProgress size={28} sx={{ color: "var(--brand-primary, #0F3B7D)", mb: 1.5 }} />
              <Typography sx={{ color: "var(--brand-primary, #0F3B7D)", fontWeight: 800, fontSize: "13px" }}>
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
                bgcolor: "var(--brand-surface, #EFF6FF)",
                borderRadius: "14px",
                border: "2px dashed var(--brand-border, rgba(15, 59, 125, 0.35))",
                width: "100%",
                boxSizing: "border-box",
                cursor: "pointer",
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  borderColor: "var(--brand-primary, #0F3B7D)",
                },
              }}
            >
              <AccountBalanceIcon sx={{ fontSize: 44, color: "var(--brand-primary, #0F3B7D)", mb: 1 }} />
              <Typography sx={{ fontWeight: 800, color: "var(--text-primary, #0F172A)", fontSize: "16px", mb: 0.5 }}>
                {searchTerm ? "No matching beneficiaries found." : "No beneficiaries found"}
              </Typography>
              <Typography
                sx={{ color: "var(--text-muted, #64748B)", fontSize: "13px", mb: 2.5, maxWidth: 400, mx: "auto" }}
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
                  background: "var(--brand-gradient, linear-gradient(135deg, #0F3B7D 0%, #D4AF37 100%))",
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

                  return (
                    <Paper
                      key={b.id}
                      elevation={0}
                      onClick={() => handleRowClick(b)}
                      sx={{
                        p: 1.5,
                        borderRadius: "14px",
                        bgcolor: isSelected ? "var(--brand-surface, #EFF6FF)" : "#FFFFFF",
                        border: isSelected ? "1.5px solid var(--brand-primary, #0F3B7D)" : "1px solid var(--border, #E2E8F0)",
                        boxShadow: isSelected ? "0 4px 14px rgba(15, 23, 42, 0.08)" : "none",
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
                              background: isSelected ? "var(--brand-gradient)" : "#E2E8F0",
                              color: isSelected ? "#FFFFFF" : "var(--text-primary, #0F172A)",
                              fontWeight: 900,
                              fontSize: "12px",
                              flexShrink: 0,
                            }}
                          >
                            {(b.name || "B").slice(0, 2).toUpperCase()}
                          </Avatar>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                              <Typography
                                sx={{
                                  fontWeight: 900,
                                  color: isSelected ? "var(--brand-primary, #0F3B7D)" : "var(--text-primary, #0F172A)",
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
                                  <StarIcon sx={{ color: "var(--brand-secondary, #D4AF37)", fontSize: 16 }} />
                                ) : (
                                  <StarBorderIcon sx={{ color: "#94A3B8", fontSize: 16, "&:hover": { color: "var(--brand-primary, #0F3B7D)" } }} />
                                )}
                              </IconButton>
                            </Box>
                            <Typography sx={{ color: "var(--brand-primary, #0F3B7D)", fontSize: "11.5px", fontWeight: 700 }}>
                              {b.bankName}
                            </Typography>
                          </Box>
                        </Box>

                        <Chip
                          icon={<CheckCircleIcon sx={{ "&&": { color: "#16A34A", fontSize: 11 } }} />}
                          label="Verified"
                          size="small"
                          sx={{
                            height: 20,
                            bgcolor: "#DCFCE7",
                            color: "#166534",
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
                          bgcolor: "var(--background-secondary, #F8FAFC)",
                          border: "1px solid var(--border, #E2E8F0)",
                          mb: 1,
                        }}
                      >
                        <Box>
                          <Typography sx={{ color: "var(--text-muted, #64748B)", fontSize: "9.5px", fontWeight: 700 }}>
                            ACCOUNT NUMBER
                          </Typography>
                          <Typography
                            sx={{
                              color: "var(--text-primary, #0F172A)",
                              fontFamily: "monospace",
                              fontSize: "12.5px",
                              fontWeight: 800,
                            }}
                          >
                            {rawAccount}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: "right" }}>
                          <Typography sx={{ color: "var(--text-muted, #64748B)", fontSize: "9.5px", fontWeight: 700 }}>
                            MONTHLY REMAINING
                          </Typography>
                          <Typography
                            sx={{
                              color: "#15803D",
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
                            color: isExpanded ? "var(--brand-primary, #0F3B7D)" : "var(--text-muted, #64748B)",
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
                            bgcolor: isSelected ? "var(--brand-primary, #0F3B7D)" : "transparent",
                            borderColor: isSelected ? "var(--brand-primary, #0F3B7D)" : "#CBD5E1",
                            color: isSelected ? "#FFFFFF" : "var(--text-secondary, #334155)",
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
                            borderTop: "1px dashed #CBD5E1",
                            display: "grid",
                            gridTemplateColumns: "repeat(2, 1fr)",
                            gap: 1,
                          }}
                        >
                          <Box>
                            <Typography sx={{ color: "var(--text-muted, #64748B)", fontSize: "9.5px", fontWeight: 700 }}>IFSC</Typography>
                            <Typography sx={{ color: "var(--brand-primary, #0F3B7D)", fontFamily: "monospace", fontSize: "11.5px", fontWeight: 700 }}>
                              {b.ifsc}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography sx={{ color: "var(--text-muted, #64748B)", fontSize: "9.5px", fontWeight: 700 }}>Branch</Typography>
                            <Typography sx={{ color: "var(--text-primary, #0F172A)", fontSize: "11.5px", fontWeight: 600 }}>
                              {b.branchName || "Main Branch"}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography sx={{ color: "var(--text-muted, #64748B)", fontSize: "9.5px", fontWeight: 700 }}>Daily Remaining</Typography>
                            <Typography sx={{ color: "#15803D", fontSize: "11.5px", fontWeight: 700 }}>
                              ₹{(b.todayRemaining ?? 24990).toLocaleString()}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography sx={{ color: "var(--text-muted, #64748B)", fontSize: "9.5px", fontWeight: 700 }}>Relationship</Typography>
                            <Typography sx={{ color: "var(--brand-primary, #0F3B7D)", fontSize: "11.5px", fontWeight: 700 }}>
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
                    bgcolor: "#FFFFFF",
                    borderRadius: "10px",
                    border: "1px solid var(--border, #E2E8F0)",
                    overflow: "visible",
                  }}
                >
                  <Table size="small" aria-label="beneficiary table" stickyHeader>
                    <TableHead>
                      <TableRow sx={{ "& th": { bgcolor: "var(--brand-surface, #EFF6FF)", borderBottom: "1px solid var(--brand-border, #E2E8F0)" } }}>
                        <TableCell sx={{ color: "var(--brand-primary, #0F3B7D)", fontSize: "11px", fontWeight: 800, py: 1, pl: 2 }}>
                          Beneficiary
                        </TableCell>
                        <TableCell sx={{ color: "var(--brand-primary, #0F3B7D)", fontSize: "11px", fontWeight: 800, py: 1 }}>
                          Bank Account
                        </TableCell>
                        <TableCell sx={{ color: "var(--brand-primary, #0F3B7D)", fontSize: "11px", fontWeight: 800, py: 1 }}>
                          Monthly Limit
                        </TableCell>
                        <TableCell sx={{ color: "var(--brand-primary, #0F3B7D)", fontSize: "11px", fontWeight: 800, py: 1, textAlign: "center" }}>
                          Verified
                        </TableCell>
                        <TableCell sx={{ color: "var(--brand-primary, #0F3B7D)", fontSize: "11px", fontWeight: 800, py: 1, pr: 2, textAlign: "right" }}>
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

                        return (
                          <React.Fragment key={b.id}>
                            <TableRow
                              onClick={() => handleRowClick(b)}
                              sx={{
                                cursor: "pointer",
                                transition: "all 120ms ease",
                                bgcolor: isSelected
                                  ? "var(--brand-surface, #EFF6FF)"
                                  : isExpanded
                                  ? "#F8FAFC"
                                  : "#FFFFFF",
                                borderLeft: isSelected ? "4px solid var(--brand-primary, #0F3B7D)" : "4px solid transparent",
                                "&:hover": {
                                  bgcolor: "var(--brand-surface, #EFF6FF)",
                                },
                              }}
                            >
                              <TableCell sx={{ py: 1.25, pl: isSelected ? 1.5 : 2, borderBottom: "1px solid #F1F5F9" }}>
                                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                                  <Avatar
                                    sx={{
                                      width: 28,
                                      height: 28,
                                      background: isSelected ? "var(--brand-gradient)" : "#E2E8F0",
                                      color: isSelected ? "#FFFFFF" : "var(--text-primary, #0F172A)",
                                      fontWeight: 900,
                                      fontSize: "11px",
                                    }}
                                  >
                                    {(b.name || "Beneficiary").slice(0, 2).toUpperCase()}
                                  </Avatar>
                                  <Box>
                                    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                                      <Typography sx={{ fontWeight: 800, color: isSelected ? "var(--brand-primary, #0F3B7D)" : "var(--text-primary, #0F172A)", fontSize: "13px", lineHeight: 1.2 }}>
                                        {b.name}
                                      </Typography>
                                      <IconButton
                                        size="small"
                                        onClick={(e) => handleToggleBeneficiaryFavorite(b.id, e)}
                                        sx={{ p: 0.25 }}
                                        title={b.isFavorite ? "Remove from Favorites" : "Mark as Favorite"}
                                      >
                                        {b.isFavorite ? (
                                          <StarIcon sx={{ color: "var(--brand-secondary, #D4AF37)", fontSize: 16 }} />
                                        ) : (
                                          <StarBorderIcon sx={{ color: "#94A3B8", fontSize: 16, "&:hover": { color: "var(--brand-primary, #0F3B7D)" } }} />
                                        )}
                                      </IconButton>
                                    </Stack>
                                  </Box>
                                </Stack>
                              </TableCell>

                              <TableCell sx={{ py: 1.25, borderBottom: "1px solid #F1F5F9" }}>
                                <Typography sx={{ color: "var(--brand-primary, #0F3B7D)", fontSize: "12.5px", fontWeight: 800, lineHeight: 1.2 }}>
                                  {b.bankName}
                                </Typography>
                                <Typography sx={{ color: "var(--text-secondary, #334155)", fontFamily: "monospace", fontSize: "12px", fontWeight: 700 }}>
                                  {rawAccount}
                                </Typography>
                              </TableCell>

                              <TableCell sx={{ py: 1.25, borderBottom: "1px solid #F1F5F9" }}>
                                <Typography sx={{ color: "var(--text-primary, #0F172A)", fontWeight: 800, fontSize: "13px" }}>
                                  ₹{(b.monthlyLimit ?? 200000).toLocaleString()}
                                </Typography>
                                <Typography sx={{ color: "#15803D", fontSize: "10.5px", fontWeight: 700 }}>
                                  ₹{(b.monthlyRemaining ?? 200000).toLocaleString()} rem
                                </Typography>
                              </TableCell>

                              <TableCell sx={{ py: 1.25, textAlign: "center", borderBottom: "1px solid #F1F5F9" }}>
                                {b.isVerified !== false ? (
                                  <Chip
                                    icon={<CheckCircleIcon sx={{ "&&": { color: "#16A34A", fontSize: 13 } }} />}
                                    label="✓ Verified"
                                    size="small"
                                    sx={{
                                      height: 22,
                                      bgcolor: "#DCFCE7",
                                      color: "#166534",
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
                                      bgcolor: "#FEF3C7",
                                      color: "#92400E",
                                      fontWeight: 800,
                                      fontSize: "10.5px",
                                    }}
                                  />
                                )}
                              </TableCell>

                              <TableCell sx={{ py: 1.25, pr: 2, textAlign: "right", borderBottom: "1px solid #F1F5F9" }}>
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
                                      color: isExpanded ? "var(--brand-primary, #0F3B7D)" : "var(--text-muted, #64748B)",
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
                                      bgcolor: isSelected ? "var(--brand-primary, #0F3B7D)" : "transparent",
                                      borderColor: isSelected ? "var(--brand-primary, #0F3B7D)" : "#CBD5E1",
                                      color: isSelected ? "#FFFFFF" : "var(--text-secondary, #334155)",
                                      textTransform: "none",
                                      "&:hover": {
                                        bgcolor: isSelected ? "var(--brand-primary, #0F3B7D)" : "var(--brand-surface, #EFF6FF)",
                                        borderColor: "var(--brand-primary, #0F3B7D)",
                                      },
                                    }}
                                  >
                                    {isSelected ? "Selected ✓" : "Select"}
                                  </Button>
                                </Stack>
                              </TableCell>
                            </TableRow>

                            <TableRow>
                              <TableCell colSpan={5} sx={{ p: 0, borderBottom: isExpanded ? "1px solid #E2E8F0" : "none" }}>
                                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                  <Box sx={{ p: 2, bgcolor: "#F8FAFC", borderTop: "1px dashed #CBD5E1" }}>
                                    <Typography sx={{ color: "var(--brand-primary, #0F3B7D)", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", mb: 1.5 }}>
                                      Beneficiary Details
                                    </Typography>
                                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5, mb: 2 }}>
                                      <Box>
                                        <Typography sx={{ color: "var(--text-muted, #64748B)", fontSize: "10.5px", fontWeight: 700 }}>Beneficiary Name</Typography>
                                        <Typography sx={{ color: "var(--text-primary, #0F172A)", fontWeight: 800, fontSize: "13px" }}>{b.name}</Typography>
                                      </Box>
                                      <Box>
                                        <Typography sx={{ color: "var(--text-muted, #64748B)", fontSize: "10.5px", fontWeight: 700 }}>Bank</Typography>
                                        <Typography sx={{ color: "var(--brand-primary, #0F3B7D)", fontWeight: 800, fontSize: "13px" }}>{b.bankName}</Typography>
                                      </Box>
                                      <Box>
                                        <Typography sx={{ color: "var(--text-muted, #64748B)", fontSize: "10.5px", fontWeight: 700 }}>Account Number</Typography>
                                        <Typography sx={{ color: "var(--text-primary, #0F172A)", fontFamily: "monospace", fontWeight: 800, fontSize: "13px" }}>{rawAccount}</Typography>
                                      </Box>
                                    </Box>
                                    <Divider sx={{ borderColor: "#E2E8F0", my: 1.5 }} />
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

        {/* ── FOOTER SUMMARY & PAGINATION TOOLBAR ── */}
        <Box
          sx={{
            mt: 1.5,
            pt: 1.25,
            borderTop: "1px solid var(--border, #E2E8F0)",
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "stretch", sm: "center" },
            gap: 1.5,
            width: "100%",
          }}
        >
          {/* Left: Showing Details & Rows Selector */}
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap", justifyContent: { xs: "space-between", sm: "flex-start" } }}>
            <Typography sx={{ color: "var(--text-secondary, #334155)", fontSize: "12px", fontWeight: 700 }}>
              Showing{" "}
              <strong style={{ color: "var(--brand-primary, #0F3B7D)" }}>
                {totalBeneficiariesCount === 0
                  ? 0
                  : viewMode === "scroll" || rowsPerPage === "all"
                  ? `1–${totalBeneficiariesCount}`
                  : `${startRecordIndex}–${endRecordIndex}`}
              </strong>{" "}
              of <strong style={{ color: "var(--text-primary, #0F172A)" }}>{totalBeneficiariesCount}</strong> beneficiaries
            </Typography>

            {/* Rows Per Page Selector */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Typography sx={{ color: "var(--text-muted, #64748B)", fontSize: "11px", fontWeight: 700 }}>
                Rows:
              </Typography>
              <Select
                size="small"
                value={rowsPerPage}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "all") {
                    setRowsPerPage("all");
                    setViewMode("scroll");
                  } else {
                    setRowsPerPage(Number(val));
                    setViewMode("paginated");
                  }
                  setPage(1);
                }}
                sx={{
                  height: 28,
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "var(--brand-primary, #0F3B7D)",
                  bgcolor: "var(--brand-surface, #EFF6FF)",
                  borderRadius: "6px",
                  "& .MuiSelect-select": { py: 0.25, px: 1, pr: "24px !important" },
                  "& .MuiSelect-icon": { color: "var(--brand-primary, #0F3B7D)", fontSize: 16 },
                }}
              >
                <MenuItem value={5}>5 / page</MenuItem>
                <MenuItem value={10}>10 / page</MenuItem>
                <MenuItem value={20}>20 / page</MenuItem>
                <MenuItem value="all">All (Scroll)</MenuItem>
              </Select>
            </Box>
          </Stack>

          {/* Right: Pagination Controls */}
          {viewMode === "paginated" && totalPages > 1 && (
            <Stack
              direction="row"
              spacing={0.5}
              sx={{
                alignItems: "center",
                justifyContent: { xs: "center", sm: "flex-end" },
              }}
            >
              <IconButton
                size="small"
                disabled={page <= 1}
                onClick={() => setPage(1)}
                sx={{
                  color: page <= 1 ? "#CBD5E1" : "var(--text-secondary, #334155)",
                  p: 0.5,
                  display: { xs: "none", sm: "inline-flex" },
                }}
                title="First Page"
              >
                <FirstPageIcon sx={{ fontSize: 18 }} />
              </IconButton>

              <Button
                size="small"
                variant="outlined"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                startIcon={<NavigateBeforeIcon sx={{ fontSize: 16 }} />}
                sx={{
                  height: 28,
                  px: 1,
                  minWidth: "auto",
                  fontSize: "11px",
                  fontWeight: 800,
                  textTransform: "none",
                  borderRadius: "6px",
                  color: page <= 1 ? "#CBD5E1" : "var(--text-secondary, #334155)",
                  borderColor: "#CBD5E1",
                }}
              >
                Prev
              </Button>

              {/* Page Numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  if (totalPages <= 5) return true;
                  return Math.abs(p - page) <= 1 || p === 1 || p === totalPages;
                })
                .map((p, idx, arr) => {
                  const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && (
                        <Typography sx={{ color: "#94A3B8", fontSize: "11px", px: 0.25 }}>
                          …
                        </Typography>
                      )}
                      <Button
                        size="small"
                        onClick={() => setPage(p)}
                        sx={{
                          height: 28,
                          minWidth: 28,
                          p: 0,
                          fontSize: "11px",
                          fontWeight: page === p ? 900 : 700,
                          borderRadius: "6px",
                          bgcolor: page === p ? "var(--brand-surface, #EFF6FF)" : "transparent",
                          color: page === p ? "var(--brand-primary, #0F3B7D)" : "var(--text-secondary, #334155)",
                          border: page === p ? "1px solid var(--brand-primary, #0F3B7D)" : "1px solid transparent",
                          "&:hover": {
                            bgcolor: "var(--brand-surface, #EFF6FF)",
                          },
                        }}
                      >
                        {p}
                      </Button>
                    </React.Fragment>
                  );
                })}

              <Button
                size="small"
                variant="outlined"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                endIcon={<NavigateNextIcon sx={{ fontSize: 16 }} />}
                sx={{
                  height: 28,
                  px: 1,
                  minWidth: "auto",
                  fontSize: "11px",
                  fontWeight: 800,
                  textTransform: "none",
                  borderRadius: "6px",
                  color: page >= totalPages ? "#CBD5E1" : "var(--text-secondary, #334155)",
                  borderColor: "#CBD5E1",
                }}
              >
                Next
              </Button>

              <IconButton
                size="small"
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
                sx={{
                  color: page >= totalPages ? "#CBD5E1" : "var(--text-secondary, #334155)",
                  p: 0.5,
                  display: { xs: "none", sm: "inline-flex" },
                }}
                title="Last Page"
              >
                <LastPageIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Stack>
          )}

          {/* When in Scroll Mode: Quick toggle back to Pages */}
          {viewMode === "scroll" && (
            <Button
              size="small"
              variant="text"
              onClick={() => {
                setViewMode("paginated");
                if (rowsPerPage === "all") setRowsPerPage(5);
                setPage(1);
              }}
              startIcon={<FormatListNumberedIcon sx={{ fontSize: 14 }} />}
              sx={{
                height: 28,
                fontSize: "11px",
                fontWeight: 800,
                color: "var(--brand-primary, #0F3B7D)",
                textTransform: "none",
                alignSelf: { xs: "center", sm: "flex-end" },
              }}
            >
              Switch to Paginated View
            </Button>
          )}
        </Box>
      </Paper>

      {/* ── RIGHT PANEL (TRANSACTION MODE & TRANSFER AMOUNT) ── */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.75 },
          borderRadius: { xs: "18px", sm: "22px" },
          bgcolor: "var(--surface, #FFFFFF)",
          border: "1px solid var(--brand-border, #E2E8F0)",
          boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
          overflowX: "hidden",
          position: "relative",
        }}
      >
        {/* Dynamic Brand Accent Top Bar */}
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

        <Box>
          {/* ── TRANSACTION MODE SEGMENTED CONTROL ── */}
          <Box sx={{ mb: 2 }}>
            <Typography
              sx={{
                fontWeight: 900,
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--brand-primary, #0F3B7D)",
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
                bgcolor: "var(--background-secondary, #F8FAFC)",
                p: 0.6,
                borderRadius: "12px",
                border: "1px solid var(--brand-border, #E2E8F0)",
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
                      color: isSelected ? "#FFFFFF" : "var(--text-secondary, #334155)",
                      background: isSelected
                        ? "var(--brand-gradient, linear-gradient(135deg, #0F3B7D 0%, #D4AF37 100%))"
                        : "transparent",
                      boxShadow: isSelected ? "0 3px 10px rgba(15, 23, 42, 0.14)" : "none",
                      textTransform: "none",
                      transition: "all 0.15s ease",
                      "&:hover": {
                        background: isSelected
                          ? "var(--brand-gradient, linear-gradient(135deg, #0F3B7D 0%, #D4AF37 100%))"
                          : "var(--brand-surface, #EFF6FF)",
                        color: isSelected ? "#FFFFFF" : "var(--brand-primary, #0F3B7D)",
                      },
                    }}
                  >
                    {m.mode_name}
                  </Button>
                );
              })}
            </Box>

            {isModeDisabled && (
              <Typography sx={{ color: "#DC2626", fontSize: "11px", fontWeight: 700, mt: 0.5 }}>
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

          <Divider sx={{ borderColor: "var(--border, #E2E8F0)", my: 2 }} />

          {/* Financial Summary Table */}
          <Stack spacing={1.25}>
            <Typography
              sx={{
                fontWeight: 900,
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--brand-primary, #0F3B7D)",
              }}
            >
              FINANCIAL SUMMARY ({selectedMode})
            </Typography>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "var(--text-secondary, #334155)", fontSize: "12.5px" }}>Transfer Amount</Typography>
              <Typography sx={{ fontWeight: 800, color: "var(--text-primary, #0F172A)", fontSize: "13.5px" }}>
                ₹{Number(amount || 0).toLocaleString()}
              </Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "#15803D", fontWeight: 700, fontSize: "12.5px" }}>Beneficiary Receives</Typography>
              <Typography sx={{ fontWeight: 900, color: "#15803D", fontSize: "13.5px" }}>
                ₹{Number(amount || 0).toLocaleString()}
              </Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "var(--text-secondary, #334155)", fontSize: "12.5px" }}>Convenience Fee</Typography>
              <Typography sx={{ fontWeight: 800, color: "var(--brand-primary, #0F3B7D)", fontSize: "12.5px" }}>
                + ₹
                {Number(fee || 0).toLocaleString(undefined, {
                  minimumFractionDigits: (fee || 0) % 1 !== 0 ? 2 : 0,
                  maximumFractionDigits: 2,
                })}
              </Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "var(--text-secondary, #334155)", fontSize: "12.5px" }}>
                GST ({pricingResult?.gstPercentage ?? 0}%)
              </Typography>
              <Typography sx={{ fontWeight: 800, color: "var(--text-secondary, #334155)", fontSize: "12.5px" }}>
                + ₹
                {Number(gst || 0).toLocaleString(undefined, {
                  minimumFractionDigits: (gst || 0) % 1 !== 0 ? 2 : 0,
                  maximumFractionDigits: 2,
                })}
              </Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between", pt: 0.75, borderTop: "1px solid var(--border, #E2E8F0)" }}>
              <Typography sx={{ color: "var(--text-primary, #0F172A)", fontWeight: 700, fontSize: "13px" }}>Total Debit from Wallet</Typography>
              <Typography
                sx={{
                  fontWeight: 900,
                  fontSize: "16px",
                  color: "var(--brand-primary, #0F3B7D)",
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
              background: "var(--brand-gradient, linear-gradient(135deg, #0F3B7D 0%, #D4AF37 100%))",
              color: "#FFFFFF",
              textTransform: "none",
              letterSpacing: "-0.2px",
              boxShadow: "0 6px 20px rgba(15, 23, 42, 0.14)",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                filter: "brightness(1.06)",
                boxShadow: "0 8px 24px rgba(15, 23, 42, 0.2)",
                transform: "translateY(-1px)",
              },
              "&.Mui-disabled": {
                background: "#E2E8F0",
                color: "#94A3B8",
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
              color: "var(--brand-primary, #0F3B7D)",
              borderColor: "var(--brand-border, #CBD5E1)",
              bgcolor: "var(--brand-surface, #EFF6FF)",
              textTransform: "none",
              "&:hover": {
                borderColor: "var(--brand-primary, #0F3B7D)",
                bgcolor: "#FFFFFF",
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
