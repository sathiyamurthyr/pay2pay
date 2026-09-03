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

  return (
    <Box sx={{ maxWidth: 920, mx: "auto", pt: { xs: 1, sm: 2 }, px: { xs: 0.5, sm: 1.5 } }}>
      {/* ── 1. CUSTOMER SEARCH & IDENTIFICATION (GLASSMORPHISM CARD) ── */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.75 },
          borderRadius: { xs: "18px", sm: "22px" },
          bgcolor: "rgba(11, 15, 25, 0.85)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(245, 158, 11, 0.2)",
          boxShadow: "0 16px 40px rgba(0, 0, 0, 0.6), 0 0 24px rgba(245, 158, 11, 0.08)",
          mb: 2.5,
          position: "relative",
          overflow: "hidden",
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

        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: "6px",
              bgcolor: "rgba(245, 158, 11, 0.15)",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SearchIcon sx={{ color: "#F59E0B", fontSize: 15 }} />
          </Box>
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: { xs: "12px", sm: "13px" },
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              background: "linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
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
                            <SearchIcon sx={{ color: isFocused ? "#F59E0B" : "#94A3B8", fontSize: 20, transition: "color 0.2s" }} />
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
                                  bgcolor: isComplete
                                    ? "rgba(34, 197, 94, 0.2)"
                                    : "rgba(251, 191, 36, 0.15)",
                                  color: isComplete ? "#4ADE80" : "#FDE047",
                                  border: isComplete
                                    ? "1px solid rgba(74, 222, 128, 0.5)"
                                    : "1px solid rgba(251, 191, 36, 0.4)",
                                  boxShadow: isComplete ? "0 0 10px rgba(34, 197, 94, 0.35)" : "none",
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
                                  color: "#94A3B8",
                                  "&:hover": { color: "#FDE68A", bgcolor: "rgba(245, 158, 11, 0.15)" },
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
                          color: "#FFFFFF",
                          bgcolor: "rgba(8, 11, 17, 0.85)",
                          borderRadius: "12px",
                          border: isFocused ? "1px solid #F59E0B" : "1px solid rgba(245, 158, 11, 0.25)",
                          boxShadow: isFocused ? "0 0 16px rgba(245, 158, 11, 0.25), inset 0 0 8px rgba(245, 158, 11, 0.05)" : "none",
                          transition: "all 0.2s ease-in-out",
                          "& .MuiOutlinedInput-notchedOutline": {
                            border: "none",
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
                          color: isComplete ? "#4ADE80" : "#FDE047",
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

                      <Typography sx={{ fontSize: "10.5px", color: "rgba(255, 255, 255, 0.5)", fontFamily: "monospace" }}>
                        Press Enter ↵ to Search
                      </Typography>
                    </Box>
                  )}
                </Box>
              );
            })()}

            <Stack direction="row" spacing={1.25} sx={{ width: "100%" }}>
              {/* PRIMARY GOLD-YELLOW GRADIENT SEARCH BUTTON */}
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
                  background: "linear-gradient(135deg, #FDE68A 0%, #F59E0B 50%, #D97706 100%)",
                  color: "#080B11",
                  whiteSpace: "nowrap",
                  boxShadow: "0 4px 20px rgba(245, 158, 11, 0.4)",
                  textTransform: "none",
                  letterSpacing: "-0.2px",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #B45309 100%)",
                    boxShadow: "0 6px 24px rgba(245, 158, 11, 0.5)",
                    transform: "translateY(-1px)",
                  },
                  "&:active": {
                    transform: "translateY(1px)",
                  },
                  "&.Mui-disabled": {
                    background: "rgba(255, 255, 255, 0.06)",
                    color: "rgba(255, 255, 255, 0.3)",
                    boxShadow: "none",
                  },
                }}
              >
                {isSearching ? "Searching..." : "Search"}
              </Button>

              {/* SECONDARY DARK GLASS "+ NEW CUSTOMER" BUTTON */}
              {canCreateCustomer && (
                <Tooltip title="Register New Customer (F2 / Ctrl+N)" arrow>
                  <Button
                    variant="outlined"
                    onClick={handleNavigateToRegister}
                    startIcon={<PersonAddIcon sx={{ fontSize: 18, color: "#FBBF24" }} />}
                    aria-label="Register new customer"
                    sx={{
                      flex: 1,
                      height: { xs: 46, sm: 50 },
                      borderRadius: "12px",
                      fontWeight: 800,
                      fontSize: { xs: "13.5px", sm: "14.5px" },
                      color: "#FDE68A",
                      borderColor: "rgba(245, 158, 11, 0.35)",
                      bgcolor: "rgba(245, 158, 11, 0.08)",
                      boxShadow: "0 4px 14px rgba(245, 158, 11, 0.08)",
                      whiteSpace: "nowrap",
                      textTransform: "none",
                      letterSpacing: "-0.2px",
                      transition: "all 0.2s ease-in-out",
                      "&:hover": {
                        bgcolor: "rgba(245, 158, 11, 0.18)",
                        borderColor: "#F59E0B",
                        boxShadow: "0 0 16px rgba(245, 158, 11, 0.25)",
                        transform: "translateY(-1px)",
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
            bgcolor: "rgba(11, 15, 25, 0.7)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(245, 158, 11, 0.2)",
          }}
        >
          <Stack direction="row" spacing={2} sx={{ alignItems: "center", mb: 2 }}>
            <Skeleton variant="circular" width={56} height={56} sx={{ bgcolor: "rgba(245, 158, 11, 0.15)" }} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="45%" height={28} sx={{ bgcolor: "rgba(255, 255, 255, 0.1)" }} />
              <Skeleton variant="text" width="65%" height={20} sx={{ bgcolor: "rgba(255, 255, 255, 0.08)" }} />
            </Box>
          </Stack>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1.25 }}>
            <Skeleton variant="rounded" height={60} sx={{ bgcolor: "rgba(255, 255, 255, 0.05)", borderRadius: "12px" }} />
            <Skeleton variant="rounded" height={60} sx={{ bgcolor: "rgba(255, 255, 255, 0.05)", borderRadius: "12px" }} />
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
            bgcolor: "rgba(245, 158, 11, 0.04)",
            backdropFilter: "blur(20px)",
            border: "2px dashed rgba(245, 158, 11, 0.35)",
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              bgcolor: "rgba(245, 158, 11, 0.09)",
              borderColor: "#F59E0B",
              transform: "translateY(-2px)",
              boxShadow: "0 12px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(245, 158, 11, 0.15)",
            },
          }}
        >
          <Box
            sx={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              bgcolor: "rgba(245, 158, 11, 0.15)",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 1.5,
              boxShadow: "0 0 20px rgba(245, 158, 11, 0.2)",
            }}
          >
            <PersonAddIcon sx={{ fontSize: 32, color: "#FBBF24" }} />
          </Box>
          <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "19px", mb: 0.5 }}>
            Customer Not Found
          </Typography>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.65)", fontSize: "13px", mb: 2.5, maxWidth: 460, mx: "auto" }}>
            No customer exists with the entered Mobile Number / Customer Code. Click below to register this customer.
          </Typography>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon sx={{ color: "#080B11" }} />}
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
              background: "linear-gradient(135deg, #FDE68A 0%, #F59E0B 50%, #D97706 100%)",
              color: "#080B11",
              boxShadow: "0 4px 20px rgba(245, 158, 11, 0.4)",
              textTransform: "none",
              "&:hover": {
                background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #B45309 100%)",
              },
            }}
          >
            + Add New Customer
          </Button>
        </Paper>
      )}

      {/* ── 4. CUSTOMER PROFILE CARD (LUXURY FINTECH GLASSMORPHISM) ── */}
      {!isSearching && customer && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.25, sm: 3 },
            borderRadius: { xs: "20px", sm: "24px" },
            bgcolor: "rgba(11, 15, 25, 0.9)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(245, 158, 11, 0.1)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Subtle top gold glow line */}
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: "10%",
              right: "10%",
              height: "1px",
              background: "linear-gradient(90deg, transparent 0%, rgba(245, 158, 11, 0.8) 50%, transparent 100%)",
              boxShadow: "0 0 12px rgba(245, 158, 11, 0.6)",
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
                  background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
                  color: "#FDE68A",
                  fontSize: { xs: "20px", sm: "24px" },
                  fontWeight: 900,
                  border: "2px solid #F59E0B",
                  boxShadow: "0 0 15px rgba(245, 158, 11, 0.35)",
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
                      background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #F59E0B 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {customer.name}
                  </Typography>

                  {/* VERIFIED GREEN GLASS BADGE */}
                  <Chip
                    icon={
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          bgcolor: "#4ADE80",
                          boxShadow: "0 0 6px #4ADE80",
                          ml: 0.5,
                          mr: -0.25,
                        }}
                      />
                    }
                    label={customer.kycStatus || "VERIFIED"}
                    size="small"
                    sx={{
                      bgcolor: "rgba(34, 197, 94, 0.15)",
                      border: "1px solid rgba(74, 222, 128, 0.4)",
                      color: "#4ADE80",
                      fontWeight: 800,
                      fontSize: "10px",
                      height: 22,
                      boxShadow: "0 0 10px rgba(34, 197, 94, 0.15)",
                    }}
                  />

                  {/* AADHAAR VERIFIED / NOT VERIFIED BADGE */}
                  {customer.aadhaar_verified || customer.aadhaarVerificationStatus === "VERIFIED" ? (
                    <Chip
                      icon={
                        <Box
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            bgcolor: "#38BDF8",
                            boxShadow: "0 0 6px #38BDF8",
                            ml: 0.5,
                            mr: -0.25,
                          }}
                        />
                      }
                      label="✓ Aadhaar Verified"
                      size="small"
                      sx={{
                        bgcolor: "rgba(14, 165, 233, 0.15)",
                        border: "1px solid rgba(56, 189, 248, 0.4)",
                        color: "#38BDF8",
                        fontWeight: 800,
                        fontSize: "9.5px",
                        height: 22,
                        boxShadow: "0 0 10px rgba(14, 165, 233, 0.2)",
                      }}
                    />
                  ) : (
                    <Chip
                      label="Aadhaar Not Verified"
                      size="small"
                      sx={{
                        bgcolor: "rgba(239, 68, 68, 0.15)",
                        border: "1px solid rgba(239, 68, 68, 0.4)",
                        color: "#F87171",
                        fontWeight: 800,
                        fontSize: "9.5px",
                        height: 22,
                      }}
                    />
                  )}

                  {/* MPIN ACTIVE / NOT CREATED BADGE */}
                  {customer.mpin_enabled === false ? (
                    <Chip
                      label="MPIN NOT CREATED"
                      size="small"
                      sx={{
                        bgcolor: "rgba(245, 158, 11, 0.15)",
                        border: "1px solid rgba(245, 158, 11, 0.4)",
                        color: "#FBBF24",
                        fontWeight: 800,
                        fontSize: "9.5px",
                        height: 22,
                      }}
                    />
                  ) : (
                    <Chip
                      icon={
                        <Box
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            bgcolor: "#34D399",
                            boxShadow: "0 0 6px #34D399",
                            ml: 0.5,
                            mr: -0.25,
                          }}
                        />
                      }
                      label="MPIN ACTIVE"
                      size="small"
                      sx={{
                        bgcolor: "rgba(16, 185, 129, 0.15)",
                        border: "1px solid rgba(52, 211, 153, 0.4)",
                        color: "#34D399",
                        fontWeight: 800,
                        fontSize: "9.5px",
                        height: 22,
                      }}
                    />
                  )}
                </Box>

                <Typography
                  sx={{
                    color: "#94A3B8",
                    fontSize: "12px",
                    fontWeight: 500,
                    lineHeight: 1.3,
                  }}
                >
                  Customer Code: <strong style={{ color: "#FDE68A", fontFamily: "monospace" }}>{customer.customerCode || `CUST-${customer.mobile}`}</strong> · Mobile: <strong style={{ color: "#F8FAFC" }}>{customer.mobile}</strong>
                </Typography>
              </Box>
            </Box>

            {/* Desktop Wallet Balance */}
            <Box sx={{ display: { xs: "none", sm: "block" }, textAlign: "right" }}>
              <Typography sx={{ color: "#94A3B8", fontSize: "10px", fontWeight: 700, letterSpacing: "0.5px" }}>
                WALLET BALANCE
              </Typography>
              <Typography
                sx={{
                  fontWeight: 900,
                  fontSize: "18px",
                  fontFamily: "var(--font-geist-mono), monospace",
                  background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textShadow: "0 0 10px rgba(245, 158, 11, 0.3)",
                }}
              >
                ₹{(wallet?.mainBalance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", my: 2 }} />

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
                bgcolor: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(245, 158, 11, 0.2)",
                boxShadow: "inset 0 0 12px rgba(245, 158, 11, 0.05)",
                transition: "all 0.2s ease",
                "&:hover": {
                  bgcolor: "rgba(245, 158, 11, 0.06)",
                  borderColor: "rgba(245, 158, 11, 0.4)",
                  transform: "translateY(-1px)",
                },
              }}
            >
              <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mb: 0.5 }}>
                <AccountBalanceWalletRoundedIcon sx={{ fontSize: 15, color: "#F59E0B" }} />
                <Typography sx={{ color: "#94A3B8", fontSize: "10px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  DAILY REMAINING
                </Typography>
              </Stack>
              <Typography
                sx={{
                  fontWeight: 900,
                  fontSize: { xs: "16px", sm: "18px" },
                  fontFamily: "var(--font-geist-mono), monospace",
                  background: "linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textShadow: "0 0 10px rgba(245, 158, 11, 0.3)",
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
                bgcolor: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(74, 222, 128, 0.2)",
                boxShadow: "inset 0 0 12px rgba(74, 222, 128, 0.05)",
                transition: "all 0.2s ease",
                "&:hover": {
                  bgcolor: "rgba(34, 197, 94, 0.06)",
                  borderColor: "rgba(74, 222, 128, 0.4)",
                  transform: "translateY(-1px)",
                },
              }}
            >
              <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mb: 0.5 }}>
                <AccountBalanceRoundedIcon sx={{ fontSize: 15, color: "#4ADE80" }} />
                <Typography sx={{ color: "#94A3B8", fontSize: "10px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  MONTHLY REMAINING
                </Typography>
              </Stack>
              <Typography
                sx={{
                  fontWeight: 900,
                  fontSize: { xs: "16px", sm: "18px" },
                  color: "#4ADE80",
                  fontFamily: "var(--font-geist-mono), monospace",
                  textShadow: "0 0 10px rgba(74, 222, 128, 0.3)",
                }}
              >
                ₹{Number(customer.monthlyLimitRemaining ?? 200000).toLocaleString()}
              </Typography>
            </Box>

            {/* 3. CATEGORY */}
            <Box
              sx={{
                p: 1.5,
                borderRadius: "14px",
                bgcolor: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                transition: "all 0.2s ease",
                "&:hover": {
                  bgcolor: "rgba(255, 255, 255, 0.06)",
                  borderColor: "rgba(255, 255, 255, 0.15)",
                  transform: "translateY(-1px)",
                },
              }}
            >
              <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mb: 0.5 }}>
                <CategoryRoundedIcon sx={{ fontSize: 15, color: "#94A3B8" }} />
                <Typography sx={{ color: "#94A3B8", fontSize: "10px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  CATEGORY
                </Typography>
              </Stack>
              <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: { xs: "15px", sm: "16px" } }}>
                {customer.category || "REGULAR"}
              </Typography>
            </Box>

            {/* 4. KYC LEVEL */}
            <Box
              sx={{
                p: 1.5,
                borderRadius: "14px",
                bgcolor: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(245, 158, 11, 0.2)",
                boxShadow: "inset 0 0 12px rgba(245, 158, 11, 0.05)",
                transition: "all 0.2s ease",
                "&:hover": {
                  bgcolor: "rgba(245, 158, 11, 0.06)",
                  borderColor: "rgba(245, 158, 11, 0.4)",
                  transform: "translateY(-1px)",
                },
              }}
            >
              <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mb: 0.5 }}>
                <VerifiedUserRoundedIcon sx={{ fontSize: 15, color: "#FBBF24" }} />
                <Typography sx={{ color: "#94A3B8", fontSize: "10px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  KYC LEVEL
                </Typography>
              </Stack>
              <Typography sx={{ fontWeight: 800, color: "#FBBF24", fontSize: { xs: "14px", sm: "15px" } }}>
                {customer.kycLevel || "FULL_KYC"}
              </Typography>
            </Box>
          </Box>

          {/* ── ACTION BUTTONS (PRIMARY GOLD CTA & SECONDARY DARK GLASS) ── */}
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
                color: "#E2E8F0",
                borderColor: "rgba(245, 158, 11, 0.3)",
                bgcolor: "rgba(255, 255, 255, 0.03)",
                textTransform: "none",
                letterSpacing: "-0.2px",
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  borderColor: "#F59E0B",
                  color: "#FDE68A",
                  bgcolor: "rgba(245, 158, 11, 0.08)",
                  boxShadow: "0 0 14px rgba(245, 158, 11, 0.15)",
                },
              }}
            >
              Search Another Customer
            </Button>

            {/* PRIMARY ACTION — AADHAAR VERIFICATION GUARD (Requirements 17, 19, 21) */}
            {!(customer.aadhaar_verified || customer.aadhaarVerificationStatus === "VERIFIED") ? (
              <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: "center", gap: 2, width: { xs: "100%", sm: "auto" } }}>
                <Typography sx={{ color: "#F87171", fontSize: "13px", fontWeight: 700, textAlign: { xs: "center", sm: "right" } }}>
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
                    boxShadow: "0 6px 24px rgba(239, 68, 68, 0.45)",
                    "&:hover": {
                      background: "linear-gradient(135deg, #F87171 0%, #DC2626 50%, #991B1B 100%)",
                      boxShadow: "0 8px 28px rgba(239, 68, 68, 0.6)",
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
                startIcon={<ShieldIcon sx={{ color: "#080B11" }} />}
                sx={{
                  width: { xs: "100%", sm: "auto" },
                  height: { xs: 48, sm: 52 },
                  px: 3.5,
                  borderRadius: "12px",
                  fontWeight: 900,
                  fontSize: "14.5px",
                  background: "linear-gradient(135deg, #FDE68A 0%, #F59E0B 50%, #D97706 100%)",
                  color: "#080B11",
                  textTransform: "none",
                  letterSpacing: "-0.2px",
                  boxShadow: "0 6px 24px rgba(245, 158, 11, 0.45)",
                  "&:hover": {
                    background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #B45309 100%)",
                    boxShadow: "0 8px 28px rgba(245, 158, 11, 0.55)",
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
                      color: "#080B11",
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
                  background: "linear-gradient(135deg, #FDE68A 0%, #F59E0B 50%, #D97706 100%)",
                  color: "#080B11",
                  textTransform: "none",
                  letterSpacing: "-0.2px",
                  boxShadow: "0 6px 24px rgba(245, 158, 11, 0.45), 0 0 12px rgba(245, 158, 11, 0.3)",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #B45309 100%)",
                    boxShadow: "0 8px 30px rgba(245, 158, 11, 0.6), 0 0 16px rgba(245, 158, 11, 0.4)",
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
