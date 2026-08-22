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
} from "@mui/material";
import { retailerApi } from "@/services/retailer-api";

import SearchIcon from "@mui/icons-material/Search";
import StarIcon from "@mui/icons-material/Star";
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
import { BeneficiaryData } from "../../hooks/useBeneficiary";
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
}) => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "favorite">("all");
  const [sortBy, setSortBy] = useState<"recent" | "used" | "alphabetical">("recent");
  const [visibleCount, setVisibleCount] = useState(30);

  // Track which row is expanded for inline details
  const [expandedBeneficiaryId, setExpandedBeneficiaryId] = useState<string | null>(
    selectedBeneficiary?.id || null
  );

  // Track unmasked account viewing
  const [revealedAccounts, setRevealedAccounts] = useState<{ [id: string]: boolean }>({});

  const toggleAccountVisibility = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRevealedAccounts((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

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

    apiClient.get(`/beneficiaries/${benId}/limits`)
      .then((res) => {
        const data = res.data?.data || res.data;
        if (!isMounted || !data) return;

        const freshDailyRem = Number(data.daily_remaining ?? selectedBeneficiary.dailyRemaining ?? 50000);
        const freshMonthlyRem = Number(data.monthly_remaining ?? selectedBeneficiary.monthlyRemaining ?? 200000);
        const isActive = Boolean(data.is_active ?? (selectedBeneficiary.status !== "INACTIVE"));

        setBeneficiaryDailyRem(freshDailyRem);
        setBeneficiaryMonthlyRem(freshMonthlyRem);
        setBeneficiaryIsActive(isActive);
        setBeneficiaryLimitLoaded(true);
        setBeneficiaryLimitFailed(false);
      })
      .catch((err) => {
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

  // Navigate to dedicated Add Beneficiary page (NO MODAL)
  const handleNavigateToAddBeneficiary = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("draftCustomerId", customer?.id || "");
      sessionStorage.setItem("draftCustomerMobile", customer?.mobile || "");
      sessionStorage.setItem("draftCustomerName", customer?.name || "");
    }
    useTransactionMemoryStore.getState().setSelectedCustomer(customer);
    useTransactionMemoryStore.getState().setReferrerUrl("/retailer/dmt");
    router.push(`/retailer/beneficiaries/add?customerId=${customer?.id || ""}&customerMobile=${customer?.mobile || ""}`);
  };

  // Navigate to dedicated Remove Beneficiary page (NO MODAL)
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
  const currentWalletBalance = retailerWallet?.mainBalance ?? initialPricingResult.walletBalance ?? 235750.00;

  const livePricingResult = useMemo(() => {
    return RuleEngineService.evaluatePricing({
      amount,
      transactionMode: selectedMode,
      walletBalance: currentWalletBalance,
      dailyRemaining: initialPricingResult.dailyLimitRemaining,
      monthlyRemaining: initialPricingResult.monthlyLimitRemaining,
      beneficiaryBankName: selectedBeneficiary?.bankName || "Partner Bank",
      beneficiaryDailyRemaining: beneficiaryLimitLoaded && beneficiaryDailyRem >= 0 ? beneficiaryDailyRem : initialPricingResult.dailyLimitRemaining,
      beneficiaryMonthlyRemaining: beneficiaryLimitLoaded && beneficiaryMonthlyRem >= 0 ? beneficiaryMonthlyRem : initialPricingResult.monthlyLimitRemaining,
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
  ]);

  const pricingResult = {
    ...livePricingResult,
    dailyLimitRemaining: beneficiaryLimitLoaded && beneficiaryDailyRem >= 0 ? beneficiaryDailyRem : initialPricingResult.dailyLimitRemaining,
    monthlyLimitRemaining: beneficiaryLimitLoaded && beneficiaryMonthlyRem >= 0 ? beneficiaryMonthlyRem : initialPricingResult.monthlyLimitRemaining,
    isBeneficiaryLimitLoaded: beneficiaryLimitLoaded,
    isBeneficiaryLimitFailed: beneficiaryLimitFailed,
  };

  const fee = Number(pricingResult?.convenienceFee ?? 0);
  const gst = Number(pricingResult?.gstAmount ?? 0);
  const totalDebit = amount > 0 ? Number(pricingResult?.totalDebit ?? pricingResult?.totalPayable ?? (amount + fee + gst)) : 0;
  const hasLimitBreach = amount > 0 && (amount > (pricingResult?.dailyLimitRemaining ?? 0) || amount > (pricingResult?.monthlyLimitRemaining ?? 0));
  const hasInsufficientWallet = amount > 0 && totalDebit > (pricingResult?.walletBalance ?? 0);

  // Filter and Sort Beneficiaries
  const filteredBeneficiaries = beneficiaries.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.accountNumber.includes(searchTerm) ||
      b.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.ifsc.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterType === "favorite" ? b.isFavorite : true;
    return matchesSearch && matchesFilter;
  });

  const sortedBeneficiaries = [...filteredBeneficiaries].sort((a, b) => {
    if (sortBy === "used") {
      return (b.transferCount || 0) - (a.transferCount || 0);
    }
    if (sortBy === "alphabetical") {
      return a.name.localeCompare(b.name);
    }
    return 0;
  });

  const displayedBeneficiaries = sortedBeneficiaries.slice(0, visibleCount);

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
        gridTemplateColumns: { xs: "1fr", lg: "1.45fr 1fr" },
        gap: 2.5,
        alignItems: "start",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        minHeight: "75vh",
      }}
    >
      {/* ── LEFT PANEL: COMPACT ENTERPRISE BENEFICIARY TABLE CONSOLE ── */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: "16px",
          bgcolor: "rgba(18, 27, 48, 0.85)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          display: "flex",
          flexDirection: "column",
          minHeight: "75vh",
          boxSizing: "border-box",
        }}
      >
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
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5, flexWrap: "wrap", gap: 1 }}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
            <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "16px", letterSpacing: "-0.2px" }}>
              Beneficiary Selection
            </Typography>
            <Chip
              label={`${filteredBeneficiaries.length}${filteredBeneficiaries.length !== beneficiaries.length ? ` / ${beneficiaries.length}` : ""}`}
              size="small"
              sx={{
                height: 22,
                px: 0.5,
                fontSize: "11px",
                fontWeight: 800,
                bgcolor: "rgba(37, 99, 235, 0.2)",
                color: "#60A5FA",
                border: "1px solid rgba(96, 165, 250, 0.35)",
              }}
            />
          </Stack>

          <Button
            size="small"
            variant="contained"
            startIcon={<PersonAddIcon sx={{ fontSize: 16 }} />}
            onClick={handleNavigateToAddBeneficiary}
            sx={{
              height: 32,
              px: 2,
              borderRadius: "8px",
              fontWeight: 800,
              fontSize: "12px",
              bgcolor: "#2563EB",
              color: "#FFFFFF",
              "&:hover": { bgcolor: "#1D4ED8" },
            }}
          >
            + Add Beneficiary
          </Button>
        </Stack>

        {/* ── SEARCH & FILTER CONTROLS ── */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
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
                  height: 36,
                  borderRadius: "8px",
                  bgcolor: "rgba(255, 255, 255, 0.05)",
                  color: "#FFFFFF",
                  fontSize: "12.5px",
                },
              },
            }}
          />

          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            <Select
              size="small"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              sx={{
                height: 36,
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
                height: 36,
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

        {/* ── BENEFICIARY LIST: COMPACT ENTERPRISE TABLE WITH INTERNAL SCROLL ── */}
        <Box
          sx={{
            flex: 1,
            width: "100%",
            minHeight: "360px",
            overflowY: "auto",
            overflowX: "auto",
            maxHeight: { xs: "560px", lg: "calc(100vh - 230px)" },
            pr: 0.5,
            pb: 5,
            "&::-webkit-scrollbar": { width: "6px", height: "6px" },
            "&::-webkit-scrollbar-track": { background: "rgba(255, 255, 255, 0.02)", borderRadius: "4px" },
            "&::-webkit-scrollbar-thumb": { background: "rgba(96, 165, 250, 0.3)", borderRadius: "4px" },
            "&::-webkit-scrollbar-thumb:hover": { background: "rgba(96, 165, 250, 0.6)" },
          }}
        >
          {filteredBeneficiaries.length === 0 ? (
            <Paper
              elevation={0}
              onClick={handleNavigateToAddBeneficiary}
              sx={{
                p: 4,
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
              <Typography sx={{ color: "rgba(255, 255, 255, 0.65)", fontSize: "13px", mb: 2.5, maxWidth: 400, mx: "auto" }}>
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
                }}
              >
                + Add Beneficiary
              </Button>
            </Paper>
          ) : (
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
                {/* ── TABLE HEAD (5 PRIMARY COLUMNS) ── */}
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
                    const isSelected = selectedBeneficiary?.id === b.id;
                    const isExpanded = expandedBeneficiaryId === b.id;
                    const isAccountRevealed = true;
                    const rawAccount = b.accountNumber || b.maskedAccountNumber || "0630104000156974";
                    const maskedAcc = rawAccount;
                    const bAny = b as any;

                    return (
                      <React.Fragment key={b.id}>
                        {/* ── MAIN ROW ── */}
                        <TableRow
                          onClick={() => handleRowClick(b)}
                          sx={{
                            cursor: "pointer",
                            transition: "all 120ms ease",
                            bgcolor: isSelected
                              ? "rgba(37, 99, 235, 0.20)"
                              : isExpanded
                              ? "rgba(255, 255, 255, 0.04)"
                              : "transparent",
                            borderLeft: isSelected ? "4px solid #2563EB" : "4px solid transparent",
                            "&:hover": {
                              bgcolor: isSelected ? "rgba(37, 99, 235, 0.25)" : "rgba(255, 255, 255, 0.05)",
                            },
                          }}
                        >
                          {/* Column 1: Beneficiary Name + Favorite */}
                          <TableCell sx={{ py: 1.25, pl: isSelected ? 1.5 : 2, borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                              <Avatar
                                sx={{
                                  width: 28,
                                  height: 28,
                                  bgcolor: isSelected ? "#2563EB" : "rgba(255, 255, 255, 0.10)",
                                  color: "#FFFFFF",
                                  fontWeight: 800,
                                  fontSize: "11px",
                                }}
                              >
                                {(b.name || "Beneficiary").slice(0, 2).toUpperCase()}
                              </Avatar>

                              <Box>
                                <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                                  <Typography sx={{ fontWeight: 800, color: isSelected ? "#93C5FD" : "#FFFFFF", fontSize: "13px", lineHeight: 1.2 }}>
                                    {b.name}
                                  </Typography>
                                  {b.isFavorite && (
                                    <StarIcon sx={{ color: "#FBBF24", fontSize: 14 }} />
                                  )}
                                </Stack>
                              </Box>
                            </Stack>
                          </TableCell>

                          {/* Column 2: Bank Account (Bank Name + Full Account Number) */}
                          <TableCell sx={{ py: 1.25, borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                            <Typography sx={{ color: "#60A5FA", fontSize: "12.5px", fontWeight: 800, lineHeight: 1.2 }}>
                              {b.bankName}
                            </Typography>
                            <Typography sx={{ color: "rgba(255, 255, 255, 0.90)", fontFamily: "monospace", fontSize: "12px", fontWeight: 700 }}>
                              {rawAccount}
                            </Typography>
                          </TableCell>

                          {/* Column 3: Monthly Limit */}
                          <TableCell sx={{ py: 1.25, borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                            <Typography sx={{ color: "#FFFFFF", fontWeight: 800, fontSize: "13px" }}>
                              ₹{(b.monthlyLimit ?? 200000).toLocaleString()}
                            </Typography>
                            <Typography sx={{ color: "#4ADE80", fontSize: "10.5px", fontWeight: 700 }}>
                              ₹{(b.monthlyRemaining ?? 200000).toLocaleString()} rem
                            </Typography>
                          </TableCell>

                          {/* Column 4: Verified Status */}
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

                          {/* Column 5: Action (View Details / Select) */}
                          <TableCell sx={{ py: 1.25, pr: 2, textAlign: "right", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                            <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", alignItems: "center" }}>
                              <Button
                                size="small"
                                variant="text"
                                onClick={(e) => toggleExpandRow(b.id, e)}
                                endIcon={isExpanded ? <KeyboardArrowUpIcon sx={{ fontSize: 16 }} /> : <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />}
                                sx={{
                                  color: isExpanded ? "#60A5FA" : "rgba(255, 255, 255, 0.75)",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  textTransform: "none",
                                  p: 0.5,
                                  minWidth: "auto",
                                  "&:hover": { color: "#93C5FD", bgcolor: "rgba(255, 255, 255, 0.05)" },
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
                                  fontWeight: 800,
                                  borderRadius: "6px",
                                  bgcolor: isSelected ? "#2563EB" : "transparent",
                                  borderColor: isSelected ? "#2563EB" : "rgba(255, 255, 255, 0.2)",
                                  color: isSelected ? "#FFFFFF" : "rgba(255, 255, 255, 0.8)",
                                  "&:hover": {
                                    bgcolor: isSelected ? "#1D4ED8" : "rgba(37, 99, 235, 0.15)",
                                    borderColor: "#2563EB",
                                  },
                                }}
                              >
                                {isSelected ? "Selected ✓" : "Select"}
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>

                        {/* ── INLINE EXPANDED ROW DETAILS (NO MODAL) ── */}
                        <TableRow>
                          <TableCell colSpan={5} sx={{ p: 0, borderBottom: isExpanded ? "1px solid rgba(255, 255, 255, 0.10)" : "none" }}>
                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                              <Box
                                sx={{
                                  p: 2,
                                  bgcolor: "rgba(10, 17, 34, 0.95)",
                                  borderTop: "1px dashed rgba(255, 255, 255, 0.10)",
                                }}
                              >
                                <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", mb: 1.5 }}>
                                  Beneficiary Details
                                </Typography>

                                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" }, gap: 1.5, mb: 2 }}>
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
                                    <Typography sx={{ color: "#FFFFFF", fontFamily: "monospace", fontWeight: 800, fontSize: "13px" }}>
                                      {rawAccount}
                                    </Typography>
                                  </Box>

                                  <Box>
                                    <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "10.5px", fontWeight: 700 }}>IFSC</Typography>
                                    <Typography sx={{ color: "#93C5FD", fontFamily: "monospace", fontWeight: 800, fontSize: "12.5px" }}>{b.ifsc}</Typography>
                                  </Box>

                                  <Box>
                                    <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "10.5px", fontWeight: 700 }}>Branch</Typography>
                                    <Typography sx={{ color: "#FFFFFF", fontWeight: 600, fontSize: "12.5px" }}>{b.branchName || "Main Branch"}</Typography>
                                  </Box>

                                  <Box>
                                    <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "10.5px", fontWeight: 700 }}>Relationship</Typography>
                                    <Typography sx={{ color: "#FBBF24", fontWeight: 800, fontSize: "12.5px" }}>{b.relationship || "Family"}</Typography>
                                  </Box>

                                  <Box>
                                    <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "10.5px", fontWeight: 700 }}>Risk Level</Typography>
                                    <Typography sx={{ color: "#4ADE80", fontWeight: 800, fontSize: "12px" }}>{bAny.riskLevel || "Low Risk"}</Typography>
                                  </Box>

                                  <Box>
                                    <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "10.5px", fontWeight: 700 }}>Status</Typography>
                                    <Typography sx={{ color: b.status === "INACTIVE" ? "#F87171" : "#60A5FA", fontWeight: 800, fontSize: "12px" }}>
                                      {b.status === "INACTIVE" ? "Inactive" : "Active"}
                                    </Typography>
                                  </Box>

                                  <Box>
                                    <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "10.5px", fontWeight: 700 }}>Verification</Typography>
                                    <Typography sx={{ color: "#4ADE80", fontWeight: 800, fontSize: "12px" }}>
                                      {b.isVerified !== false ? "Verified" : "Pending"}
                                    </Typography>
                                  </Box>

                                  <Box>
                                    <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "10.5px", fontWeight: 700 }}>Today's Remaining</Typography>
                                    <Typography sx={{ color: "#34D399", fontWeight: 800, fontSize: "12.5px" }}>₹{(b.todayRemaining ?? 24990).toLocaleString()}</Typography>
                                  </Box>

                                  <Box>
                                    <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "10.5px", fontWeight: 700 }}>Monthly Remaining</Typography>
                                    <Typography sx={{ color: "#4ADE80", fontWeight: 800, fontSize: "12.5px" }}>₹{(b.monthlyRemaining ?? 200000).toLocaleString()}</Typography>
                                  </Box>

                                  <Box>
                                    <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "10.5px", fontWeight: 700 }}>Total Transactions</Typography>
                                    <Typography sx={{ color: "#FFFFFF", fontWeight: 800, fontSize: "12.5px" }}>{b.transferCount || 6}</Typography>
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
                                      borderColor: "rgba(239, 68, 68, 0.4)",
                                      color: "#FCA5A5",
                                      "&:hover": { bgcolor: "rgba(239, 68, 68, 0.15)", borderColor: "#EF4444" },
                                    }}
                                  >
                                    Remove Beneficiary
                                  </Button>

                                  <Button
                                    size="small"
                                    variant="contained"
                                    onClick={() => handleRowClick(b)}
                                    sx={{
                                      height: 28,
                                      px: 2,
                                      borderRadius: "6px",
                                      fontWeight: 800,
                                      fontSize: "11px",
                                      bgcolor: "#2563EB",
                                      color: "#FFFFFF",
                                    }}
                                  >
                                    Transfer to This Beneficiary →
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
          )}
        </Box>
      </Paper>

      {/* ── RIGHT PANEL (TRANSACTION MODE & TRANSFER AMOUNT) ── */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: "16px",
          bgcolor: "rgba(18, 27, 48, 0.85)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          display: "flex",
          flexDirection: "column",
          minHeight: "75vh",
          justifyContent: "space-between",
          boxSizing: "border-box",
        }}
      >
        <Box>
          {/* ── TRANSACTION MODE SEGMENTED CONTROL ── */}
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", mb: 1 }}>
              TRANSACTION MODE
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 0.75,
                bgcolor: "rgba(255, 255, 255, 0.05)",
                p: 0.5,
                borderRadius: "10px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
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
                      height: 34,
                      borderRadius: "7px",
                      fontWeight: 800,
                      fontSize: "11px",
                      color: isSelected ? "#FFFFFF" : "rgba(255, 255, 255, 0.7)",
                      bgcolor: isSelected ? "#2563EB" : "transparent",
                      boxShadow: isSelected ? "0 2px 8px rgba(37, 99, 235, 0.4)" : "none",
                      "&:hover": {
                        bgcolor: isSelected ? "#2563EB" : "rgba(255, 255, 255, 0.1)",
                      },
                      "&.Mui-disabled": {
                        color: "rgba(255, 255, 255, 0.25)",
                      },
                    }}
                  >
                    {m.icon} {m.mode_name}
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

          <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.1)", my: 1.5 }} />

          {/* Financial Summary Table */}
          <Stack spacing={1}>
            <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              FINANCIAL SUMMARY ({selectedMode})
            </Typography>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12.5px" }}>Transfer Amount</Typography>
              <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "13.5px" }}>₹{Number(amount || 0).toLocaleString()}</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "#4ADE80", fontWeight: 700, fontSize: "12.5px" }}>Beneficiary Receives</Typography>
              <Typography sx={{ fontWeight: 900, color: "#4ADE80", fontSize: "13.5px" }}>₹{Number(amount || 0).toLocaleString()}</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12.5px" }}>Convenience Fee</Typography>
              <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "12.5px" }}>+ ₹{Number(fee || 0).toLocaleString(undefined, { minimumFractionDigits: (fee || 0) % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12.5px" }}>GST ({pricingResult?.gstPercentage ?? 18}%)</Typography>
              <Typography sx={{ fontWeight: 800, color: "#93C5FD", fontSize: "12.5px" }}>+ ₹{Number(gst || 0).toLocaleString(undefined, { minimumFractionDigits: (gst || 0) % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12.5px" }}>Total Debit from Wallet</Typography>
              <Typography sx={{ fontWeight: 900, color: "#FBBF24", fontSize: "14px" }}>₹{Number(totalDebit || 0).toLocaleString(undefined, { minimumFractionDigits: (totalDebit || 0) % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}</Typography>
            </Stack>
          </Stack>
        </Box>

        {/* ── BOTTOM ACTIONS ── */}
        <Stack spacing={1.5} sx={{ mt: 3 }}>
          <Tooltip
            title={
              !selectedBeneficiary
                ? "Please select a beneficiary from the left panel"
                : amount <= 0
                ? "Please enter a valid transfer amount"
                : hasLimitBreach
                ? "Transfer amount exceeds available limits"
                : hasInsufficientWallet
                ? `Wallet balance (₹${(pricingResult?.walletBalance ?? 0).toLocaleString()}) is insufficient. Please load your wallet to proceed with this transfer.`
                : ""
            }
          >
            <Box sx={{ width: "100%" }}>
              <Button
                fullWidth
                variant="contained"
                disabled={!selectedBeneficiary || amount <= 0 || hasLimitBreach || hasInsufficientWallet || isModeDisabled}
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
