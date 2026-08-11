import React, { useState, useEffect } from "react";
import { useRetailerStore } from "@/stores/use-retailer-store";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { retailerApi } from "@/services/retailer-api";

import SearchIcon from "@mui/icons-material/Search";
import StarIcon from "@mui/icons-material/Star";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
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
import { BeneficiaryInlineDrawer } from "../Beneficiary/BeneficiaryInlineDrawer";
import { CustomerSummaryHeader } from "@/components/customers/customer-summary-header";
import { DuplicateBeneficiaryModal } from "@/components/payout/duplicate-beneficiary-modal";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "favorite">("all");
  const [sortBy, setSortBy] = useState<"recent" | "used" | "alphabetical">("recent");
  const [visibleCount, setVisibleCount] = useState(24);

  // Add Beneficiary Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [beneName, setBeneName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [isSubmittingBene, setIsSubmittingBene] = useState(false);
  const [addBeneError, setAddBeneError] = useState<string | null>(null);

  // Duplicate beneficiary modal state
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [existingDuplicateBene, setExistingDuplicateBene] = useState<any>(null);

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

        const freshDailyRem   = Number(data.daily_remaining   ?? selectedBeneficiary.dailyRemaining ?? 50000);
        const freshMonthlyRem = Number(data.monthly_remaining ?? selectedBeneficiary.monthlyRemaining ?? 200000);
        const isActive        = Boolean(data.is_active ?? (selectedBeneficiary.status !== "INACTIVE"));
        const isVerified      = Boolean(data.is_verified ?? true);

        if (process.env.NODE_ENV !== "production") {
          console.log("[Beneficiary Limit Validation]", {
            beneficiary_id:   benId,
            daily_limit:      Number(data.daily_limit   ?? 50000),
            daily_used:       Number(data.daily_used    ?? 0),
            daily_remaining:  freshDailyRem,
            monthly_limit:    Number(data.monthly_limit  ?? 200000),
            monthly_used:     Number(data.monthly_used   ?? 0),
            monthly_remaining: freshMonthlyRem,
            is_active:        isActive,
            is_verified:      isVerified,
          });
        }

        setBeneficiaryDailyRem(freshDailyRem);
        setBeneficiaryMonthlyRem(freshMonthlyRem);
        setBeneficiaryIsActive(isActive);
        setBeneficiaryLimitLoaded(true);
        setBeneficiaryLimitFailed(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn("[Beneficiary Limit Validation] Gracefully falling back to local beneficiary limits:", err);
        
        // Fall back to local beneficiary properties or standard default limits
        const fallbackDaily = selectedBeneficiary.dailyRemaining ?? 50000;
        const fallbackMonthly = selectedBeneficiary.monthlyRemaining ?? 200000;
        const isActive = selectedBeneficiary.status !== "INACTIVE";

        setBeneficiaryDailyRem(fallbackDaily);
        setBeneficiaryMonthlyRem(fallbackMonthly);
        setBeneficiaryIsActive(isActive);
        setBeneficiaryLimitLoaded(true);
        setBeneficiaryLimitFailed(false);
      });

    return () => { isMounted = false; };
  }, [selectedBeneficiary?.id, selectedBeneficiary?.status, selectedBeneficiary?.dailyRemaining, selectedBeneficiary?.monthlyRemaining]);

  // Real-time Pricing Recalculation on Mode or Amount Change
  const pricingResult = RuleEngineService.evaluatePricing({
    service: "DMT",
    amount,
    transactionMode: selectedMode,
    customerId: customer?.id,
    walletBalance: useRetailerStore.getState().wallet.mainBalance,
    beneficiaryDailyRemaining:   beneficiaryDailyRem,
    beneficiaryMonthlyRemaining: beneficiaryMonthlyRem,
    isBeneficiaryActive:         beneficiaryIsActive,
    beneficiaryStatus:           selectedBeneficiary?.status || "ACTIVE",
    limitLoadFailed:             beneficiaryLimitFailed,
  });

  const handleModeSelect = (modeCode: "IMPS" | "NEFT" | "RTGS" | "UPI") => {
    setSelectedMode(modeCode);
    if (onModeChange) onModeChange(modeCode);
  };

  // Deduplicate beneficiaries array so each account number / ID appears ONLY ONCE
  const uniqueBeneficiaries = React.useMemo(() => {
    const seen = new Set<string>();
    const list: BeneficiaryData[] = [];
    for (const b of beneficiaries) {
      if (b.status === "MERGED" || b.status === "INACTIVE") continue;
      const cleanAcc = (b.accountNumber || "").replace(/\D/g, "");
      const key = cleanAcc ? `${cleanAcc}-${(b.ifsc || "").toUpperCase()}` : b.id;
      if (!seen.has(key)) {
        seen.add(key);
        list.push(b);
      }
    }
    return list;
  }, [beneficiaries]);

  const filteredBeneficiaries = uniqueBeneficiaries
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

  const handleAddBeneficiarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!beneName.trim() || !accountNumber.trim() || !ifsc.trim()) {
      setAddBeneError("Beneficiary Name, Account Number, and IFSC are required.");
      return;
    }

    const cleanAcc = accountNumber.trim().replace(/\D/g, "");
    const cleanIfsc = ifsc.trim().toUpperCase();

    // Local Pre-check for duplicate active beneficiary
    const localMatch = beneficiaries.find(
      (b) =>
        b.status !== "MERGED" &&
        b.status !== "INACTIVE" &&
        ((b.accountNumber || "").replace(/\D/g, "") === cleanAcc) &&
        ((b.ifsc || "").toUpperCase() === cleanIfsc)
    );

    if (localMatch) {
      setExistingDuplicateBene({
        id: localMatch.id,
        name: localMatch.name,
        bankName: localMatch.bankName,
        accountNumber: localMatch.accountNumber,
        maskedAccountNumber: localMatch.maskedAccountNumber || `XXXX-${cleanAcc.slice(-4)}`,
        ifsc: localMatch.ifsc,
        verification_status: "VERIFIED",
        status: "ACTIVE",
      });
      setAddModalOpen(false);
      setDuplicateModalOpen(true);
      return;
    }

    setIsSubmittingBene(true);
    setAddBeneError(null);

    const newBene: BeneficiaryData = {
      id: `BEN-${Date.now()}`,
      name: beneName.trim(),
      accountNumber: accountNumber.trim(),
      maskedAccountNumber: `XXXX${accountNumber.trim().slice(-4)}`,
      ifsc: cleanIfsc,
      bankName: bankName.trim(),
      isFavorite: false,
      isVerified: true,
      transferCount: 0,
      monthlyUsage: 0,
      monthlyRemaining: 200000,
    };

    try {
      const res = await apiClient.post("/beneficiaries", {
        customer_id: customer?.id,
        full_name: beneName.trim(),
        account_number: accountNumber.trim(),
        ifsc_code: cleanIfsc,
        bank_name: bankName.trim(),
      });

      if (res.status === 200 || res.status === 201) {
        setIsSubmittingBene(false);
        if (onAddBeneficiary) onAddBeneficiary(newBene);
        onSelectBeneficiary(newBene);
        setAddModalOpen(false);
      }
    } catch (err: any) {
      setIsSubmittingBene(false);
      const detail = err?.response?.data?.detail;
      const status_code = err?.response?.status;
      if (status_code === 409 || (detail && typeof detail === "object" && detail.code === "BENEFICIARY_ALREADY_EXISTS")) {
        const existingData = detail?.existing_beneficiary || {
          name: beneName.trim(),
          bankName: bankName.trim(),
          maskedAccountNumber: `XXXX-${cleanAcc.slice(-4)}`,
          ifsc: cleanIfsc,
        };
        setExistingDuplicateBene(existingData);
        setAddModalOpen(false);
        setDuplicateModalOpen(true);
      } else {
        // Fallback for local demo
        if (onAddBeneficiary) onAddBeneficiary(newBene);
        onSelectBeneficiary(newBene);
        setAddModalOpen(false);
      }
    }
  };

  // Dynamic Rule Engine Financial Parameters
  const fee = pricingResult.convenienceFee;
  const gst = pricingResult.gstAmount;
  const commission = pricingResult.commission;
  const totalPayable = pricingResult.totalPayable;
  const balanceAfter = pricingResult.walletBalanceAfter;

  const currentModeInfo = dbTransactionModes.find((m) => m.mode_code === selectedMode);
  const isModeDisabled = currentModeInfo ? !currentModeInfo.enabled : false;

  const beneficiaryAvailableToReceive = selectedBeneficiary
    ? selectedBeneficiary.monthlyRemaining ?? Math.max(0, 200000 - (selectedBeneficiary.monthlyUsage ?? 0))
    : 50000;
  const isBeneficiaryLimitExceeded = amount > beneficiaryAvailableToReceive;

  const isProceedDisabled =
    amount <= 0 ||
    !selectedBeneficiary ||
    !pricingResult.canProceed ||
    isBeneficiaryLimitExceeded ||
    isModeDisabled;

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
        {/* PROMINENT ENTERPRISE CUSTOMER SUMMARY HEADER */}
        <CustomerSummaryHeader
          customer={customer}
          onChangeCustomer={onBack}
          onEditCustomer={() => {
            if (typeof window !== "undefined") {
              sessionStorage.setItem("draftCustomerMobile", customer?.mobile || "");
            }
            window.location.href = "/retailer/customers";
          }}
          onViewCustomerProfile={() => {
            if (typeof window !== "undefined") {
              sessionStorage.setItem("draftCustomerMobile", customer?.mobile || "");
            }
            window.location.href = "/retailer/customers";
          }}
        />

        {/* Quick Filters & Actions Bar */}
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1 }}>
          <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "15px", letterSpacing: "-0.2px" }}>
            Beneficiary Selection Console
          </Typography>

          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="contained"
              startIcon={<PersonAddIcon sx={{ fontSize: 16 }} />}
              onClick={async () => {
                try {
                  await retailerApi.createBeneficiarySession({
                    customer_id: customer?.id || (customer as any)?.public_id || "",
                    customer_mobile: customer?.mobile || "",
                    customer_name: customer?.name || "",
                    referrer: "/retailer/dmt",
                  });
                } catch {}
                window.location.href = "/retailer/beneficiary";
              }}
              sx={{
                height: 32,
                px: 2,
                borderRadius: "8px",
                fontWeight: 800,
                fontSize: "12px",
                bgcolor: "#2563EB",
                color: "#FFFFFF",
              }}
            >
              + Add Beneficiary
            </Button>

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
          autoComplete="off"
          placeholder="Search by Name, Account Number, or Bank..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          slotProps={{
            htmlInput: {
              autoComplete: "off",
              name: "disable_autofill_bene_search",
              autoCorrect: "off",
              autoCapitalize: "off",
              spellCheck: "false",
              "data-lpignore": "true",
              "data-1p-ignore": "true",
              "data-bwignore": "true",
              "aria-autocomplete": "none",
            },
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

        {/* Beneficiary Grid */}
        <Box
          onScroll={handleScroll}
          sx={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            pr: 0.5,
            width: "100%",
            maxWidth: "100%",
            "&::-webkit-scrollbar": {
              width: "4px",
            },
            "&::-webkit-scrollbar-track": {
              background: "transparent",
            },
            "&::-webkit-scrollbar-thumb": {
              background: "rgba(255, 255, 255, 0.2)",
              borderRadius: "4px",
            },
            "&::-webkit-scrollbar-thumb:hover": {
              background: "rgba(255, 255, 255, 0.4)",
            },
          }}
        >
          {filteredBeneficiaries.length === 0 ? (
            /* ACTIONABLE EMPTY STATE CARD (REPLACING DEAD-END MESSAGE) */
            <Paper
              elevation={0}
              onClick={() => setAddModalOpen(true)}
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
                  transform: "translateY(-2px)",
                },
              }}
            >
              <PersonAddIcon sx={{ fontSize: 56, color: "#2563EB", mb: 1 }} />
              <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "19px", mb: 0.5 }}>
                No Beneficiaries Found
              </Typography>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.65)", fontSize: "13.5px", mb: 3, maxWidth: 460, mx: "auto" }}>
                No beneficiary accounts match your search for this customer. Click below to add a new beneficiary and transfer money directly.
              </Typography>
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await retailerApi.createBeneficiarySession({
                      customer_id: customer?.id || (customer as any)?.public_id || "",
                      customer_mobile: customer?.mobile || "",
                      customer_name: customer?.name || "",
                      referrer: "/retailer/dmt",
                    });
                  } catch {}
                  window.location.href = "/retailer/beneficiary";
                }}
                sx={{
                  height: 44,
                  px: 3.5,
                  borderRadius: "10px",
                  fontWeight: 900,
                  fontSize: "14px",
                  bgcolor: "#2563EB",
                  color: "#FFFFFF",
                  boxShadow: "0 4px 16px rgba(37, 99, 235, 0.4)",
                }}
              >
                + Add New Beneficiary
              </Button>
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
                  <React.Fragment key={b.id}>
                    <Paper
                      elevation={0}
                      onClick={() => {
                        onSelectBeneficiary(b);
                        setTimeout(() => {
                          const el = document.querySelector('input[inputmode="numeric"]') as HTMLInputElement;
                          if (el) {
                            el.focus();
                            el.select();
                          }
                        }, 50);
                      }}
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

                    {isSelected && (
                      <BeneficiaryInlineDrawer beneficiary={b} isOpen={isSelected} />
                    )}
                  </React.Fragment>
                );
              })}
            </Box>
          )}
        </Box>
      </Paper>

      {/* ── RIGHT PANEL (32%): TRANSACTION MODE & TRANSFER AMOUNT ── */}
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
          {/* ── TRANSACTION MODE SEGMENTED CONTROL ── */}
          <Box sx={{ mb: 1.5 }}>
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

          <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.1)", my: 1 }} />

          {/* Financial Summary Table */}
          <Stack spacing={0.75}>
            <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              FINANCIAL SUMMARY ({selectedMode})
            </Typography>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Transfer Amount</Typography>
              <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "13px" }}>₹{amount.toLocaleString()}</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "#4ADE80", fontWeight: 700, fontSize: "12px" }}>Beneficiary Receives</Typography>
              <Typography sx={{ fontWeight: 900, color: "#4ADE80", fontSize: "13px" }}>₹{amount.toLocaleString()}</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Convenience Fee</Typography>
              <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "12px" }}>+ ₹{fee.toLocaleString(undefined, { minimumFractionDigits: fee % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>GST ({pricingResult.gstPercentage}%)</Typography>
              <Typography sx={{ fontWeight: 800, color: "#93C5FD", fontSize: "12px" }}>+ ₹{gst.toLocaleString(undefined, { minimumFractionDigits: gst % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Retailer Commission</Typography>
              <Typography sx={{ fontWeight: 800, color: "#4ADE80", fontSize: "12px" }}>+ ₹{commission.toLocaleString(undefined, { minimumFractionDigits: commission % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}</Typography>
            </Stack>

            <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", my: 0.25 }} />

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.80)", fontWeight: 700, fontSize: "12px" }}>NET WALLET DEBIT</Typography>
              <Typography sx={{ fontWeight: 900, color: !pricingResult.canProceed ? "#EF4444" : "#3B82F6", fontSize: "15px" }}>
                ₹{totalPayable.toLocaleString()}
              </Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Wallet After Transfer</Typography>
              <Typography sx={{ fontWeight: 800, color: !pricingResult.canProceed ? "#EF4444" : "#FBBF24", fontSize: "13px" }}>
                ₹{balanceAfter.toLocaleString()}
              </Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Settlement ETA</Typography>
              <Typography sx={{ fontWeight: 800, color: "#4ADE80", fontSize: "12px" }}>{pricingResult.settlementEtaText}</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Recommended Route</Typography>
              <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "11px" }}>{pricingResult.recommendedGateway}</Typography>
            </Stack>
          </Stack>
        </Box>

        {/* Action Buttons */}
        <Stack spacing={1} sx={{ pt: 1 }}>
          <Tooltip title={isProceedDisabled ? `Transfer cannot continue. Reason: ${pricingResult.validationMessage}` : ""} arrow placement="top">
            <Box component="span" sx={{ width: "100%" }}>
              <Button
                fullWidth
                variant="contained"
                disabled={isProceedDisabled}
                onClick={onContinue}
                endIcon={<ArrowForwardIcon />}
                sx={{
                  height: 44,
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
            sx={{ height: 34, borderRadius: "8px", fontWeight: 700, fontSize: "11.5px", color: "rgba(255, 255, 255, 0.8)", borderColor: "rgba(255, 255, 255, 0.2)" }}
          >
            Back to Customer
          </Button>
        </Stack>
      </Paper>

      {/* ── ADD BENEFICIARY DIALOG MODAL ── */}
      <Dialog open={addModalOpen} onClose={() => setAddModalOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleAddBeneficiarySubmit} autoComplete="off" autoCorrect="off" autoCapitalize="off">
          <DialogTitle sx={{ bgcolor: "#0F172A", color: "#FFFFFF", fontWeight: 900, fontSize: "18px" }}>
            💳 Add New Beneficiary
          </DialogTitle>
          <DialogContent sx={{ bgcolor: "#0F172A", pt: 2 }}>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "13px", mb: 2 }}>
              Register a new beneficiary bank account for customer <strong>{customer?.name}</strong>.
            </Typography>

            {addBeneError && (
              <Paper elevation={0} sx={{ p: 1.5, mb: 2, bgcolor: "rgba(239, 68, 68, 0.15)", border: "1px solid #EF4444", color: "#EF4444", fontSize: "12px", fontWeight: 800 }}>
                {addBeneError}
              </Paper>
            )}

            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Beneficiary Full Name"
                value={beneName}
                onChange={(e) => setBeneName(e.target.value)}
                required
                autoComplete="off"
                slotProps={{
                  htmlInput: { autoComplete: "new-password", name: "no_autofill_bene_fullname", autoCorrect: "off", autoCapitalize: "off", spellCheck: "false" },
                  input: { sx: { color: "#FFFFFF", bgcolor: "rgba(255, 255, 255, 0.08)", borderRadius: "8px" } },
                  inputLabel: { sx: { color: "rgba(255, 255, 255, 0.7)" } },
                }}
              />

              <TextField
                fullWidth
                label="Bank Account Number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                required
                autoComplete="off"
                slotProps={{
                  htmlInput: { autoComplete: "new-password", name: "no_autofill_bene_accnum", autoCorrect: "off", autoCapitalize: "off", spellCheck: "false" },
                  input: { sx: { color: "#FFFFFF", bgcolor: "rgba(255, 255, 255, 0.08)", borderRadius: "8px" } },
                  inputLabel: { sx: { color: "rgba(255, 255, 255, 0.7)" } },
                }}
              />

              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                <TextField
                  fullWidth
                  label="IFSC Code"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  required
                  autoComplete="off"
                  slotProps={{
                    htmlInput: { autoComplete: "new-password", name: "no_autofill_bene_ifsc", autoCorrect: "off", autoCapitalize: "off", spellCheck: "false" },
                    input: { sx: { color: "#FFFFFF", bgcolor: "rgba(255, 255, 255, 0.08)", borderRadius: "8px" } },
                    inputLabel: { sx: { color: "rgba(255, 255, 255, 0.7)" } },
                  }}
                />
                <TextField
                  fullWidth
                  label="Bank Name"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  required
                  autoComplete="off"
                  slotProps={{
                    htmlInput: { autoComplete: "new-password", name: "no_autofill_bene_bankname", autoCorrect: "off", autoCapitalize: "off", spellCheck: "false" },
                    input: { sx: { color: "#FFFFFF", bgcolor: "rgba(255, 255, 255, 0.08)", borderRadius: "8px" } },
                    inputLabel: { sx: { color: "rgba(255, 255, 255, 0.7)" } },
                  }}
                />
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ bgcolor: "#0F172A", p: 2 }}>
            <Button onClick={() => setAddModalOpen(false)} sx={{ color: "rgba(255, 255, 255, 0.6)" }}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={isSubmittingBene} sx={{ bgcolor: "#2563EB", fontWeight: 900 }}>
              {isSubmittingBene ? "Adding..." : "Add & Select Beneficiary"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ── DUPLICATE BENEFICIARY EXPLICIT CONFLICT MODAL ── */}
      <DuplicateBeneficiaryModal
        open={duplicateModalOpen}
        onClose={() => setDuplicateModalOpen(false)}
        existingBeneficiary={existingDuplicateBene}
        onUseExisting={(existingBene) => {
          const formattedBene: BeneficiaryData = {
            id: existingBene.id || `BEN-${Date.now()}`,
            name: existingBene.name || beneName.trim() || "Existing Beneficiary",
            accountNumber: existingBene.accountNumber || accountNumber.trim(),
            maskedAccountNumber: existingBene.maskedAccountNumber || `XXXX-${accountNumber.trim().slice(-4)}`,
            ifsc: existingBene.ifsc || ifsc.trim().toUpperCase(),
            bankName: existingBene.bankName || bankName.trim() || "Partner Bank",
            isFavorite: false,
            isVerified: true,
            transferCount: 0,
            monthlyUsage: 0,
            monthlyRemaining: 200000,
          };
          if (onAddBeneficiary) {
            onAddBeneficiary(formattedBene);
          }
          onSelectBeneficiary(formattedBene);
          setDuplicateModalOpen(false);
        }}
      />
    </Box>
  );
};
