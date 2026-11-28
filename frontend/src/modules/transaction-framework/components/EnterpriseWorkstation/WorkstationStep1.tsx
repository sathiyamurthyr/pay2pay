"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRetailerStore } from "@/stores/use-retailer-store";
import {
  Box,
  Typography,
  Stack,
  Paper,
  TextField,
  InputAdornment,
  Button,
  Avatar,
  Chip,
  Divider,
  CircularProgress,
  Skeleton,
  Tooltip,
  IconButton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ShieldIcon from "@mui/icons-material/Shield";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import SecurityIcon from "@mui/icons-material/Security";
import { CustomerData } from "../../hooks/useCustomer";

export interface WorkstationStep1Props {
  customer: CustomerData | null;
  onSearchCustomer: (query: string) => void;
  onSelectCustomer: (cust: CustomerData) => void;
  onContinue: () => void;
  onResetCustomer?: () => void;
  isSearching?: boolean;
  hasSearched?: boolean;
  error?: string | null;
  onRegisterCustomer?: () => void;
  canCreateCustomer?: boolean;
}

export const WorkstationStep1: React.FC<WorkstationStep1Props> = ({
  customer,
  onSearchCustomer,
  onSelectCustomer,
  onContinue,
  onResetCustomer,
  isSearching = false,
  hasSearched = false,
  error = null,
  onRegisterCustomer,
  canCreateCustomer = true,
}) => {
  const [searchInput, setSearchInput] = useState("");
  const [localHasSearched, setLocalHasSearched] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const wallet = useRetailerStore((state) => state.wallet);

  // Auto-populate & search customer if mobile is passed in URL query (e.g. returning from Aadhaar verification)
  useEffect(() => {
    const mobileParam = searchParams.get("mobile");
    if (mobileParam && !customer && !isSearching) {
      setSearchInput(mobileParam);
      setLocalHasSearched(true);
      onSearchCustomer(mobileParam);
    }
  }, [searchParams, customer, isSearching, onSearchCustomer]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchInput.trim()) {
      setLocalHasSearched(true);
      onSearchCustomer(searchInput.trim());
    }
  };

  const handleClear = () => {
    setSearchInput("");
    setLocalHasSearched(false);
    if (onResetCustomer) onResetCustomer();
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handleNavigateToRegister = () => {
    if (!canCreateCustomer) return;
    if (onRegisterCustomer) {
      onRegisterCustomer();
    } else {
      const mobileParam = searchInput.replace(/\D/g, "").slice(0, 10);
      if (typeof window !== "undefined" && mobileParam) {
        sessionStorage.setItem("draftCustomerMobile", mobileParam);
      }
      try {
        router.push("/retailer/customers");
      } catch {
        window.location.href = "/retailer/customers";
      }
    }
  };

  // Keyboard Shortcuts (F2 -> New Customer, Ctrl+N -> New Customer, Esc -> Clear Search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2" || (e.ctrlKey && (e.key === "n" || e.key === "N"))) {
        e.preventDefault();
        handleNavigateToRegister();
      } else if (e.key === "Escape") {
        handleClear();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchInput, canCreateCustomer]);

  const showEmptyState = !isSearching && !customer && (Boolean(error) || hasSearched || localHasSearched);

  const isAadhaarVerified = Boolean(
    customer && (
      customer.aadhaar_verified === true ||
      customer.aadhaarVerificationStatus === "VERIFIED" ||
      customer.aadhaar_verification_status === "VERIFIED" ||
      (customer as any).aadhaar_status === "VERIFIED" ||
      customer.kycStatus === "VERIFIED" ||
      (customer as any).kyc_status === "VERIFIED" ||
      (customer as any).kyc_status === "APPROVED" ||
      customer.kycLevel === "FULL_KYC" ||
      (customer as any).kyc_level === "FULL_KYC"
    )
  );

  return (
    <Box sx={{ maxWidth: 920, mx: "auto", pt: { xs: 1, sm: 2 }, px: { xs: 0.5, sm: 1.5 } }}>
      {/* ── 1. CUSTOMER SEARCH & IDENTIFICATION CARD ── */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.75 },
          borderRadius: { xs: "18px", sm: "22px" },
          bgcolor: "var(--surface, #FFFFFF)",
          border: "1px solid var(--brand-border, #E2E8F0)",
          boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)",
          mb: 2.5,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Dynamic Company Brand Top Accent Bar */}
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

        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
          <Box
            sx={{
              width: 26,
              height: 26,
              borderRadius: "7px",
              bgcolor: "var(--brand-surface, #EFF6FF)",
              border: "1px solid var(--brand-border, rgba(15, 59, 125, 0.25))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SearchIcon sx={{ color: "var(--brand-primary, #0F3B7D)", fontSize: 15 }} />
          </Box>
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: { xs: "12px", sm: "13px" },
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--brand-primary, #0F3B7D)",
            }}
          >
            CUSTOMER SEARCH &amp; IDENTIFICATION
          </Typography>
        </Stack>

        <form onSubmit={handleSearch} autoComplete="off" autoCorrect="off" autoCapitalize="off">
          <Stack spacing={1.5}>
            {/* Live entering count calculations */}
            {(() => {
              const trimmedInput = searchInput.trim();
              const digitsOnly = searchInput.replace(/\D/g, "");
              const isNumeric = searchInput.length > 0 && /^\d+$/.test(trimmedInput);
              const inputLength = searchInput.length;

              let countLabel = "";
              let countType: "mobile" | "aadhaar" | "generic_num" | "text" | "empty" = "empty";
              let isComplete = false;

              if (inputLength > 0) {
                if (isNumeric) {
                  if (digitsOnly.length <= 10) {
                    countType = "mobile";
                    countLabel = `${digitsOnly.length}/10`;
                    isComplete = digitsOnly.length === 10;
                  } else if (digitsOnly.length <= 12) {
                    countType = "aadhaar";
                    countLabel = `${digitsOnly.length}/12`;
                    isComplete = digitsOnly.length === 12;
                  } else {
                    countType = "generic_num";
                    countLabel = `${digitsOnly.length} digits`;
                    isComplete = false;
                  }
                } else {
                  countType = "text";
                  countLabel = `${inputLength} chars`;
                  isComplete = inputLength >= 3;
                }
              }

              return (
                <Box>
                  <TextField
                    fullWidth
                    autoFocus
                    suppressHydrationWarning
                    inputRef={searchInputRef}
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search by Mobile, Customer Code, Aadhaar, Name"
                    autoComplete="off"
                    slotProps={{
                      htmlInput: {
                        suppressHydrationWarning: true,
                        readOnly: isReadOnly,
                        onFocus: () => {
                          setIsReadOnly(false);
                          setIsFocused(true);
                        },
                        onBlur: () => {
                          setIsReadOnly(true);
                          setIsFocused(false);
                        },
                        autoComplete: "off",
                        name: "disable_autofill_cust_search",
                        id: "disable_autofill_cust_search_id",
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
                            <SearchIcon
                              sx={{
                                color: isFocused ? "var(--brand-primary, #0F3B7D)" : "#64748B",
                                fontSize: 20,
                                transition: "color 0.2s",
                              }}
                            />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end" sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                            {/* Live Entering Count Badge */}
                            {inputLength > 0 && (
                              <Chip
                                label={
                                  countType === "mobile" && isComplete
                                    ? "✔ 10/10 Mobile"
                                    : countType === "aadhaar" && isComplete
                                    ? "✔ 12/12 Aadhaar"
                                    : countLabel
                                }
                                size="small"
                                sx={{
                                  height: 24,
                                  fontSize: "11px",
                                  fontWeight: 900,
                                  fontFamily: "monospace",
                                  letterSpacing: "0.02em",
                                  bgcolor: isComplete ? "#DCFCE7" : "var(--brand-surface, #EFF6FF)",
                                  color: isComplete ? "#166534" : "var(--brand-primary, #0F3B7D)",
                                  border: isComplete
                                    ? "1px solid #86EFAC"
                                    : "1px solid var(--brand-border, rgba(15, 59, 125, 0.25))",
                                  transition: "all 0.2s ease-in-out",
                                }}
                              />
                            )}
                            {searchInput && (
                              <IconButton
                                size="small"
                                onClick={handleClear}
                                sx={{
                                  p: 0.5,
                                  color: "#64748B",
                                  "&:hover": {
                                    color: "var(--brand-primary, #0F3B7D)",
                                    bgcolor: "var(--brand-surface, #EFF6FF)",
                                  },
                                }}
                              >
                                <CloseRoundedIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            )}
                          </InputAdornment>
                        ),
                        sx: {
                          height: { xs: 48, sm: 52 },
                          fontSize: "14px",
                          color: "var(--text-primary, #0F172A)",
                          bgcolor: "#FFFFFF",
                          borderRadius: "12px",
                          border: isFocused
                            ? "1.5px solid var(--brand-primary, #0F3B7D)"
                            : "1.5px solid #CBD5E1",
                          boxShadow: isFocused
                            ? "0 0 0 3px var(--grid-search-focus-shadow, rgba(15, 59, 125, 0.14))"
                            : "0 1px 2px rgba(15, 23, 42, 0.04)",
                          transition: "all 0.2s ease-in-out",
                          "& .MuiOutlinedInput-notchedOutline": {
                            border: "none",
                          },
                          "& input": {
                            color: "var(--text-primary, #0F172A)",
                            fontWeight: 600,
                          },
                          "& input::placeholder": {
                            color: "#64748B",
                            opacity: 1,
                          },
                        },
                      },
                    }}
                  />

                  {/* Live Entering Count Status Helper Strip */}
                  {inputLength > 0 && (
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mt: 0.75,
                        px: 1,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "11px",
                          fontWeight: 700,
                          color: isComplete ? "#15803D" : "var(--brand-primary, #0F3B7D)",
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                        }}
                      >
                        {countType === "mobile" && (
                          isComplete
                            ? "✔ 10-Digit Mobile Number Ready to Search"
                            : `📱 Entering Mobile Number: ${digitsOnly.length}/10 digits (${10 - digitsOnly.length} remaining)`
                        )}
                        {countType === "aadhaar" && (
                          isComplete
                            ? "✔ 12-Digit Aadhaar Number Complete"
                            : `🪪 Entering Aadhaar Number: ${digitsOnly.length}/12 digits`
                        )}
                        {countType === "generic_num" && (
                          `🔢 Number Entered: ${digitsOnly.length} digits`
                        )}
                        {countType === "text" && (
                          `👤 Query Entered: ${inputLength} characters`
                        )}
                      </Typography>

                      <Typography sx={{ fontSize: "10.5px", color: "#64748B", fontFamily: "monospace" }}>
                        Press Enter ↵ to Search
                      </Typography>
                    </Box>
                  )}
                </Box>
              );
            })()}

            <Stack direction="row" spacing={1.25} sx={{ width: "100%" }}>
              {/* PRIMARY DYNAMIC COMPANY GRADIENT SEARCH BUTTON */}
              <Button
                type="submit"
                variant="contained"
                disabled={isSearching || !searchInput.trim()}
                startIcon={isSearching ? <CircularProgress size={16} color="inherit" /> : <SearchIcon sx={{ fontSize: 18 }} />}
                sx={{
                  flex: 1,
                  height: { xs: 46, sm: 50 },
                  borderRadius: "12px",
                  fontWeight: 900,
                  fontSize: { xs: "13.5px", sm: "14.5px" },
                  background: "var(--brand-gradient, linear-gradient(135deg, #0F3B7D 0%, #D4AF37 100%))",
                  color: "#FFFFFF",
                  whiteSpace: "nowrap",
                  boxShadow: "0 6px 18px rgba(15, 23, 42, 0.14)",
                  textTransform: "none",
                  letterSpacing: "-0.2px",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    filter: "brightness(1.06)",
                    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.2)",
                    transform: "translateY(-1px)",
                  },
                  "&:active": {
                    transform: "translateY(1px)",
                  },
                  "&.Mui-disabled": {
                    background: "#E2E8F0",
                    color: "#94A3B8",
                    boxShadow: "none",
                  },
                }}
              >
                {isSearching ? "Searching..." : "Search"}
              </Button>

              {/* SECONDARY BRAND-TINTED "+ NEW CUSTOMER" BUTTON */}
              {canCreateCustomer && (
                <Tooltip title="Register New Customer (F2 / Ctrl+N)" arrow>
                  <Button
                    variant="outlined"
                    onClick={handleNavigateToRegister}
                    startIcon={<PersonAddIcon sx={{ fontSize: 18 }} />}
                    aria-label="Register new customer"
                    sx={{
                      flex: 1,
                      height: { xs: 46, sm: 50 },
                      borderRadius: "12px",
                      fontWeight: 800,
                      fontSize: { xs: "13.5px", sm: "14.5px" },
                      color: "var(--brand-primary, #0F3B7D)",
                      borderColor: "var(--brand-border, #CBD5E1)",
                      bgcolor: "var(--brand-surface, #EFF6FF)",
                      boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
                      whiteSpace: "nowrap",
                      textTransform: "none",
                      letterSpacing: "-0.2px",
                      transition: "all 0.2s ease-in-out",
                      "& svg": { color: "var(--brand-primary, #0F3B7D)", transition: "color 0.2s ease" },
                      "&:hover": {
                        bgcolor: "var(--brand-primary, #0F3B7D)",
                        color: "#FFFFFF",
                        borderColor: "var(--brand-primary, #0F3B7D)",
                        boxShadow: "0 6px 18px rgba(15, 23, 42, 0.14)",
                        transform: "translateY(-1px)",
                        "& svg": { color: "#FFFFFF" },
                      },
                      "&:active": {
                        transform: "translateY(1px)",
                      },
                    }}
                  >
                    + New Customer
                  </Button>
                </Tooltip>
              )}
            </Stack>
          </Stack>
        </form>
      </Paper>

      {/* ── 2. LOADING STATE SKELETON ── */}
      {isSearching && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: "22px",
            bgcolor: "var(--surface, #FFFFFF)",
            border: "1px solid var(--brand-border, #E2E8F0)",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
          }}
        >
          <Stack direction="row" spacing={2} sx={{ alignItems: "center", mb: 2 }}>
            <Skeleton variant="circular" width={56} height={56} sx={{ bgcolor: "var(--brand-surface, #EFF6FF)" }} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="45%" height={28} sx={{ bgcolor: "#E2E8F0" }} />
              <Skeleton variant="text" width="65%" height={20} sx={{ bgcolor: "#F1F5F9" }} />
            </Box>
          </Stack>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1.25 }}>
            <Skeleton variant="rounded" height={60} sx={{ bgcolor: "#F1F5F9", borderRadius: "12px" }} />
            <Skeleton variant="rounded" height={60} sx={{ bgcolor: "#F1F5F9", borderRadius: "12px" }} />
          </Box>
        </Paper>
      )}

      {/* ── 3. CENTERED "CUSTOMER NOT FOUND" EMPTY-STATE CARD ── */}
      {showEmptyState && (
        <Paper
          elevation={0}
          onClick={handleNavigateToRegister}
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: "22px",
            bgcolor: "var(--surface, #FFFFFF)",
            border: "2px dashed var(--brand-border, #CBD5E1)",
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              bgcolor: "var(--brand-surface, #EFF6FF)",
              borderColor: "var(--brand-primary, #0F3B7D)",
              transform: "translateY(-2px)",
              boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
            },
          }}
        >
          <Box
            sx={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              bgcolor: "var(--brand-surface, #EFF6FF)",
              border: "1px solid var(--brand-border, rgba(15, 59, 125, 0.25))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 1.5,
              boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
            }}
          >
            <PersonAddIcon sx={{ fontSize: 32, color: "var(--brand-primary, #0F3B7D)" }} />
          </Box>
          <Typography sx={{ fontWeight: 900, color: "var(--text-primary, #0F172A)", fontSize: "19px", mb: 0.5 }}>
            Customer Not Found
          </Typography>
          <Typography sx={{ color: "var(--text-muted, #64748B)", fontSize: "13px", mb: 2.5, maxWidth: 460, mx: "auto" }}>
            No customer exists with the entered Mobile Number / Customer Code. Click below to register this customer.
          </Typography>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon sx={{ color: "#FFFFFF" }} />}
            onClick={(e) => {
              e.stopPropagation();
              handleNavigateToRegister();
            }}
            sx={{
              height: 46,
              px: 3.5,
              borderRadius: "12px",
              fontWeight: 900,
              fontSize: "14px",
              background: "var(--brand-gradient, linear-gradient(135deg, #0F3B7D 0%, #D4AF37 100%))",
              color: "#FFFFFF",
              boxShadow: "0 6px 18px rgba(15, 23, 42, 0.14)",
              textTransform: "none",
              "&:hover": {
                filter: "brightness(1.06)",
              },
            }}
          >
            + Add New Customer
          </Button>
        </Paper>
      )}

      {/* ── 4. CUSTOMER PROFILE CARD ── */}
      {!isSearching && customer && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.25, sm: 3 },
            borderRadius: { xs: "20px", sm: "24px" },
            bgcolor: "var(--surface, #FFFFFF)",
            border: "1px solid var(--brand-border, #E2E8F0)",
            boxShadow: "0 14px 36px rgba(15, 23, 42, 0.06)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Dynamic Brand Accent Top Strip */}
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

          {/* Customer Header Info */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "flex-start", sm: "center" },
              justifyContent: "space-between",
              gap: 1.5,
              mb: 2.25,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.75, flex: 1, minWidth: 0 }}>
              <Avatar
                sx={{
                  width: { xs: 50, sm: 58 },
                  height: { xs: 50, sm: 58 },
                  background: "var(--brand-gradient, linear-gradient(135deg, #0F3B7D 0%, #D4AF37 100%))",
                  color: "#FFFFFF",
                  fontSize: { xs: "20px", sm: "24px" },
                  fontWeight: 900,
                  border: "2px solid #FFFFFF",
                  boxShadow: "0 6px 16px rgba(15, 23, 42, 0.14)",
                  flexShrink: 0,
                }}
              >
                {customer.name.charAt(0).toUpperCase()}
              </Avatar>

              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, flexWrap: "wrap", mb: 0.5 }}>
                  <Typography
                    sx={{
                      fontWeight: 900,
                      fontSize: { xs: "18px", sm: "22px" },
                      lineHeight: 1.2,
                      letterSpacing: "-0.3px",
                      color: "var(--text-primary, #0F172A)",
                    }}
                  >
                    {customer.name}
                  </Typography>

                  {/* KYC STATUS BADGE (DYNAMIC) */}
                  {(() => {
                    const rawStatus = (customer.kycStatus || customer.kyc_status || "").toUpperCase();
                    const isApproved = rawStatus === "APPROVED" || rawStatus === "VERIFIED";
                    const isPending = rawStatus === "PENDING" || rawStatus === "UNDER_REVIEW";
                    const isRejected = rawStatus === "REJECTED" || rawStatus === "FAILED";
                    
                    const label = isApproved ? "VERIFIED" : isPending ? "KYC PENDING" : isRejected ? "REJECTED" : rawStatus || "UNVERIFIED";
                    const color = isApproved ? "#166534" : isPending ? "#92400E" : isRejected ? "#991B1B" : "#475569";
                    const dotColor = isApproved ? "#16A34A" : isPending ? "#D97706" : isRejected ? "#DC2626" : "#64748B";
                    const bgcolor = isApproved ? "#DCFCE7" : isPending ? "#FEF3C7" : isRejected ? "#FEE2E2" : "#F1F5F9";
                    const border = isApproved ? "1px solid #86EFAC" : isPending ? "1px solid #FCD34D" : isRejected ? "1px solid #FECACA" : "1px solid #CBD5E1";

                    return (
                      <Chip
                        icon={
                          <Box
                            sx={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              bgcolor: dotColor,
                              ml: 0.5,
                              mr: -0.25,
                            }}
                          />
                        }
                        label={label}
                        size="small"
                        sx={{
                          bgcolor,
                          border,
                          color,
                          fontWeight: 800,
                          fontSize: "10px",
                          height: 22,
                        }}
                      />
                    );
                  })()}

                  {/* AADHAAR VERIFIED / NOT VERIFIED BADGE (DYNAMIC) */}
                  {isAadhaarVerified ? (
                    <Chip
                      icon={
                        <Box
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            bgcolor: "var(--brand-primary, #0F3B7D)",
                            ml: 0.5,
                            mr: -0.25,
                          }}
                        />
                      }
                      label="✓ Aadhaar Verified"
                      size="small"
                      sx={{
                        bgcolor: "var(--brand-surface, #EFF6FF)",
                        border: "1px solid var(--brand-border, rgba(15, 59, 125, 0.25))",
                        color: "var(--brand-primary, #0F3B7D)",
                        fontWeight: 800,
                        fontSize: "9.5px",
                        height: 22,
                      }}
                    />
                  ) : (
                    <Chip
                      label="Aadhaar Not Verified"
                      size="small"
                      sx={{
                        bgcolor: "#FEE2E2",
                        border: "1px solid #FECACA",
                        color: "#991B1B",
                        fontWeight: 800,
                        fontSize: "9.5px",
                        height: 22,
                      }}
                    />
                  )}

                  {/* MPIN BADGE (DYNAMIC) */}
                  {customer.mpin_enabled ? (
                    <Chip
                      icon={
                        <Box
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            bgcolor: "#16A34A",
                            ml: 0.5,
                            mr: -0.25,
                          }}
                        />
                      }
                      label="MPIN ACTIVE"
                      size="small"
                      sx={{
                        bgcolor: "#DCFCE7",
                        border: "1px solid #86EFAC",
                        color: "#166534",
                        fontWeight: 800,
                        fontSize: "9.5px",
                        height: 22,
                      }}
                    />
                  ) : (
                    <Chip
                      label="MPIN NOT CREATED"
                      size="small"
                      sx={{
                        bgcolor: "#FEF3C7",
                        border: "1px solid #FCD34D",
                        color: "#92400E",
                        fontWeight: 800,
                        fontSize: "9.5px",
                        height: 22,
                      }}
                    />
                  )}
                </Box>

                <Typography
                  sx={{
                    color: "var(--text-muted, #64748B)",
                    fontSize: "12px",
                    fontWeight: 500,
                    lineHeight: 1.3,
                  }}
                >
                  Customer Code: <strong style={{ color: "var(--brand-primary, #0F3B7D)", fontFamily: "monospace" }}>{customer.customerCode || `CUST-${customer.mobile}`}</strong> · Mobile: <strong style={{ color: "var(--text-primary, #0F172A)" }}>{customer.mobile}</strong>
                </Typography>
              </Box>
            </Box>

            {/* Desktop Wallet Balance */}
            <Box sx={{ display: { xs: "none", sm: "block" }, textAlign: "right" }}>
              <Typography sx={{ color: "var(--text-muted, #64748B)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.5px" }}>
                WALLET BALANCE
              </Typography>
              <Typography
                sx={{
                  fontWeight: 900,
                  fontSize: "18px",
                  fontFamily: "var(--font-geist-mono), monospace",
                  color: "var(--brand-primary, #0F3B7D)",
                }}
              >
                ₹{(wallet?.mainBalance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ borderColor: "var(--border, #E2E8F0)", my: 2 }} />

          {/* ── CUSTOMER LIMIT INFORMATION (RESPONSIVE 2x2 MOBILE / 4-COL DESKTOP GRID) ── */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" },
              gap: 1.25,
            }}
          >
            {/* 1. DAILY REMAINING */}
            <Box
              sx={{
                p: 1.5,
                borderRadius: "14px",
                bgcolor: "var(--brand-surface, #EFF6FF)",
                border: "1px solid var(--brand-border, #E2E8F0)",
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: "var(--brand-primary, #0F3B7D)",
                  transform: "translateY(-1px)",
                },
              }}
            >
              <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mb: 0.5 }}>
                <AccountBalanceWalletRoundedIcon sx={{ fontSize: 15, color: "var(--brand-primary, #0F3B7D)" }} />
                <Typography sx={{ color: "var(--text-muted, #64748B)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  DAILY REMAINING
                </Typography>
              </Stack>
              <Typography
                sx={{
                  fontWeight: 900,
                  fontSize: { xs: "16px", sm: "18px" },
                  fontFamily: "var(--font-geist-mono), monospace",
                  color: "var(--brand-primary, #0F3B7D)",
                }}
              >
                ₹{Number(customer.dailyLimitRemaining ?? 25000).toLocaleString()}
              </Typography>
            </Box>

            {/* 2. MONTHLY REMAINING */}
            <Box
              sx={{
                p: 1.5,
                borderRadius: "14px",
                bgcolor: "#F0FDF4",
                border: "1px solid #BBF7D0",
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: "#16A34A",
                  transform: "translateY(-1px)",
                },
              }}
            >
              <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mb: 0.5 }}>
                <AccountBalanceRoundedIcon sx={{ fontSize: 15, color: "#16A34A" }} />
                <Typography sx={{ color: "var(--text-muted, #64748B)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  MONTHLY REMAINING
                </Typography>
              </Stack>
              <Typography
                sx={{
                  fontWeight: 900,
                  fontSize: { xs: "16px", sm: "18px" },
                  color: "#15803D",
                  fontFamily: "var(--font-geist-mono), monospace",
                }}
              >
                {customer.monthlyLimitRemaining !== undefined && customer.monthlyLimitRemaining !== null
                  ? `₹${Number(customer.monthlyLimitRemaining).toLocaleString()}`
                  : customer.monthly_remaining !== undefined && customer.monthly_remaining !== null
                  ? `₹${Number(customer.monthly_remaining).toLocaleString()}`
                  : "—"}
              </Typography>
            </Box>

            {/* 3. CATEGORY */}
            <Box
              sx={{
                p: 1.5,
                borderRadius: "14px",
                bgcolor: "var(--background-secondary, #F8FAFC)",
                border: "1px solid var(--border, #E2E8F0)",
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: "var(--brand-border, #CBD5E1)",
                  transform: "translateY(-1px)",
                },
              }}
            >
              <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mb: 0.5 }}>
                <CategoryRoundedIcon sx={{ fontSize: 15, color: "#64748B" }} />
                <Typography sx={{ color: "var(--text-muted, #64748B)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  CATEGORY
                </Typography>
              </Stack>
              <Typography sx={{ fontWeight: 800, color: "var(--text-primary, #0F172A)", fontSize: { xs: "15px", sm: "16px" } }}>
                {customer.category || customer.customer_category || "REGULAR"}
              </Typography>
            </Box>

            {/* 4. KYC LEVEL */}
            <Box
              sx={{
                p: 1.5,
                borderRadius: "14px",
                bgcolor: "var(--brand-surface, #EFF6FF)",
                border: "1px solid var(--brand-border, #E2E8F0)",
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: "var(--brand-primary, #0F3B7D)",
                  transform: "translateY(-1px)",
                },
              }}
            >
              <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mb: 0.5 }}>
                <VerifiedUserRoundedIcon sx={{ fontSize: 15, color: "var(--brand-primary, #0F3B7D)" }} />
                <Typography sx={{ color: "var(--text-muted, #64748B)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  KYC LEVEL
                </Typography>
              </Stack>
              <Typography sx={{ fontWeight: 800, color: "var(--brand-primary, #0F3B7D)", fontSize: { xs: "14px", sm: "15px" } }}>
                {customer.kycLevel || customer.kyc_level || (isAadhaarVerified ? "FULL_KYC" : "MINIMUM_KYC")}
              </Typography>
            </Box>
          </Box>

          {/* ── ACTION BUTTONS ── */}
          <Stack
            direction={{ xs: "column-reverse", sm: "row" }}
            spacing={1.25}
            sx={{ mt: 2.75, width: "100%", justifyContent: "flex-end" }}
          >
            {/* SECONDARY ACTION */}
            <Button
              variant="outlined"
              onClick={handleClear}
              sx={{
                width: { xs: "100%", sm: "auto" },
                height: { xs: 46, sm: 50 },
                px: 2.75,
                borderRadius: "12px",
                fontWeight: 800,
                fontSize: "13.5px",
                color: "var(--text-secondary, #334155)",
                borderColor: "var(--brand-border, #CBD5E1)",
                bgcolor: "var(--background-secondary, #F8FAFC)",
                textTransform: "none",
                letterSpacing: "-0.2px",
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  borderColor: "var(--brand-primary, #0F3B7D)",
                  color: "var(--brand-primary, #0F3B7D)",
                  bgcolor: "var(--brand-surface, #EFF6FF)",
                },
              }}
            >
              Search Another Customer
            </Button>

            {/* PRIMARY ACTION — AADHAAR VERIFICATION GUARD (Requirements 17, 19, 21) */}
            {!isAadhaarVerified ? (
              <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: "center", gap: 2, width: { xs: "100%", sm: "auto" } }}>
                <Typography sx={{ color: "#DC2626", fontSize: "13px", fontWeight: 700, textAlign: { xs: "center", sm: "right" } }}>
                  Aadhaar verification is required before money transfer.
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => {
                    const custId = customer.id || customer.public_id || "";
                    const mobile = customer.mobile || customer.mobile_number || "";
                    const name = customer.name || customer.fullName || "";
                    const params = new URLSearchParams({
                      customer_id: custId,
                      mobile: mobile,
                      name: name,
                      return_to: "/retailer/dmt",
                    });
                    router.push(`/retailer/customers/aadhaar-verify?${params.toString()}`);
                  }}
                  startIcon={<SecurityIcon sx={{ color: "#FFFFFF" }} />}
                  sx={{
                    width: { xs: "100%", sm: "auto" },
                    height: { xs: 48, sm: 52 },
                    px: 3.5,
                    borderRadius: "12px",
                    fontWeight: 900,
                    fontSize: "14.5px",
                    background: "linear-gradient(135deg, #EF4444 0%, #DC2626 50%, #B91C1C 100%)",
                    color: "#FFFFFF",
                    textTransform: "none",
                    letterSpacing: "-0.2px",
                    boxShadow: "0 6px 20px rgba(220, 38, 38, 0.25)",
                    "&:hover": {
                      background: "linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)",
                    },
                  }}
                >
                  Verify Aadhaar
                </Button>
              </Box>
            ) : customer.mpin_enabled === false ? (
              <Button
                variant="contained"
                onClick={() => {
                  window.location.href = `/customers/create-pin?customer_id=${customer.id}`;
                }}
                startIcon={<ShieldIcon sx={{ color: "#FFFFFF" }} />}
                sx={{
                  width: { xs: "100%", sm: "auto" },
                  height: { xs: 48, sm: 52 },
                  px: 3.5,
                  borderRadius: "12px",
                  fontWeight: 900,
                  fontSize: "14.5px",
                  background: "var(--brand-gradient, linear-gradient(135deg, #0F3B7D 0%, #D4AF37 100%))",
                  color: "#FFFFFF",
                  textTransform: "none",
                  letterSpacing: "-0.2px",
                  boxShadow: "0 6px 20px rgba(15, 23, 42, 0.16)",
                  "&:hover": {
                    filter: "brightness(1.06)",
                  },
                }}
              >
                🔒 Create Required MPIN
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={onContinue}
                endIcon={
                  <ArrowForwardIcon
                    className="arrow-icon"
                    sx={{
                      color: "#FFFFFF",
                      transition: "transform 0.2s ease-in-out",
                    }}
                  />
                }
                sx={{
                  width: { xs: "100%", sm: "auto" },
                  height: { xs: 48, sm: 52 },
                  px: 3.5,
                  borderRadius: "12px",
                  fontWeight: 900,
                  fontSize: "14.5px",
                  background: "var(--brand-gradient, linear-gradient(135deg, #0F3B7D 0%, #D4AF37 100%))",
                  color: "#FFFFFF",
                  textTransform: "none",
                  letterSpacing: "-0.2px",
                  boxShadow: "0 6px 20px rgba(15, 23, 42, 0.16)",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    filter: "brightness(1.06)",
                    boxShadow: "0 8px 26px rgba(15, 23, 42, 0.22)",
                    transform: "translateY(-1px)",
                    "& .arrow-icon": {
                      transform: "translateX(5px)",
                    },
                  },
                  "&:active": {
                    transform: "translateY(1px)",
                  },
                }}
              >
                Continue to Beneficiary Selection →
              </Button>
            )}
          </Stack>
        </Paper>
      )}
    </Box>
  );
};

export default WorkstationStep1;
