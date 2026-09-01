import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ShieldIcon from "@mui/icons-material/Shield";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
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
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const wallet = useRetailerStore((state) => state.wallet);

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
      if (e.key === "F2") {
        e.preventDefault();
        handleNavigateToRegister();
      } else if (e.ctrlKey && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        handleNavigateToRegister();
      } else if (e.key === "Escape") {
        setSearchInput("");
        setLocalHasSearched(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchInput, canCreateCustomer]);

  const showEmptyState = !isSearching && !customer && (Boolean(error) || hasSearched || localHasSearched);

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", pt: { xs: 1, sm: 2 }, px: { xs: 0.5, sm: 1.5 } }}>
      {/* 1. SEARCH CONSOLE WITH RESPONSIVE ACTION BUTTONS */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: "18px",
          bgcolor: "rgba(15, 23, 42, 0.85)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
          mb: 2.5,
        }}
      >
        <Typography
          sx={{
            color: "#60A5FA",
            fontWeight: 800,
            fontSize: "11.5px",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            mb: 1.25,
          }}
        >
          CUSTOMER SEARCH &amp; IDENTIFICATION
        </Typography>

        <form onSubmit={handleSearch} autoComplete="off" autoCorrect="off" autoCapitalize="off">
          <Stack spacing={1.5}>
            <TextField
              fullWidth
              autoFocus
              suppressHydrationWarning
              inputRef={searchInputRef}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by Mobile, Customer Code, Aadhaar, PAN..."
              autoComplete="off"
              slotProps={{
                htmlInput: {
                  suppressHydrationWarning: true,
                  readOnly: isReadOnly,
                  onFocus: () => setIsReadOnly(false),
                  onBlur: () => setIsReadOnly(true),
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
                      <SearchIcon sx={{ color: "#60A5FA", fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  sx: {
                    height: { xs: 46, sm: 50 },
                    fontSize: "14px",
                    color: "#FFFFFF",
                    bgcolor: "rgba(8, 17, 31, 0.9)",
                    borderRadius: "10px",
                  },
                },
              }}
            />

            <Stack direction="row" spacing={1.25} sx={{ width: "100%" }}>
              {/* PRIMARY SEARCH BUTTON */}
              <Button
                type="submit"
                variant="contained"
                disabled={isSearching || !searchInput.trim()}
                startIcon={isSearching ? <CircularProgress size={16} color="inherit" /> : <SearchIcon sx={{ fontSize: 18 }} />}
                sx={{
                  flex: 1,
                  height: { xs: 44, sm: 48 },
                  borderRadius: "10px",
                  fontWeight: 800,
                  fontSize: { xs: "13px", sm: "14px" },
                  bgcolor: "#2563EB",
                  color: "#FFFFFF",
                  whiteSpace: "nowrap",
                  boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
                  textTransform: "none",
                  "&:hover": {
                    bgcolor: "#1D4ED8",
                  },
                }}
              >
                {isSearching ? "Searching..." : "Search"}
              </Button>

              {/* PERSISTENT "NEW CUSTOMER" QUICK ACTION BUTTON */}
              {canCreateCustomer && (
                <Tooltip title="Register New Customer (F2 / Ctrl+N)" arrow>
                  <Button
                    variant="outlined"
                    onClick={handleNavigateToRegister}
                    startIcon={<PersonAddIcon sx={{ fontSize: 18 }} />}
                    aria-label="Register new customer"
                    sx={{
                      flex: 1,
                      height: { xs: 44, sm: 48 },
                      borderRadius: "10px",
                      fontWeight: 800,
                      fontSize: { xs: "13px", sm: "14px" },
                      color: "#60A5FA",
                      borderColor: "rgba(96, 165, 250, 0.4)",
                      bgcolor: "rgba(37, 99, 235, 0.12)",
                      boxShadow: "0 4px 14px rgba(37, 99, 235, 0.12)",
                      whiteSpace: "nowrap",
                      textTransform: "none",
                      "&:hover": {
                        bgcolor: "rgba(37, 99, 235, 0.22)",
                        borderColor: "#60A5FA",
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

      {/* 2. LOADING STATE SKELETON */}
      {isSearching && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: "18px",
            bgcolor: "rgba(18, 27, 48, 0.5)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <Stack direction="row" spacing={2} sx={{ alignItems: "center", mb: 2 }}>
            <Skeleton variant="circular" width={52} height={52} sx={{ bgcolor: "rgba(255, 255, 255, 0.1)" }} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="40%" height={28} sx={{ bgcolor: "rgba(255, 255, 255, 0.1)" }} />
              <Skeleton variant="text" width="60%" height={18} sx={{ bgcolor: "rgba(255, 255, 255, 0.1)" }} />
            </Box>
          </Stack>
        </Paper>
      )}

      {/* 3. CENTERED "CUSTOMER NOT FOUND" EMPTY-STATE CARD */}
      {showEmptyState && (
        <Paper
          elevation={0}
          onClick={handleNavigateToRegister}
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: "18px",
            bgcolor: "rgba(37, 99, 235, 0.06)",
            border: "2px dashed rgba(37, 99, 235, 0.35)",
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              bgcolor: "rgba(37, 99, 235, 0.12)",
              borderColor: "#2563EB",
              transform: "translateY(-2px)",
            },
          }}
        >
          <PersonAddIcon sx={{ fontSize: 52, color: "#2563EB", mb: 1 }} />
          <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "18px", mb: 0.5 }}>
            Customer Not Found
          </Typography>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.65)", fontSize: "13px", mb: 2.5, maxWidth: 460, mx: "auto" }}>
            No customer exists with the entered Mobile Number / Customer Code. Click below to register this customer.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PersonAddIcon />}
            onClick={(e) => {
              e.stopPropagation();
              handleNavigateToRegister();
            }}
            sx={{
              height: 44,
              px: 3,
              borderRadius: "10px",
              fontWeight: 800,
              fontSize: "13.5px",
              bgcolor: "#2563EB",
              boxShadow: "0 4px 16px rgba(37, 99, 235, 0.4)",
              textTransform: "none",
            }}
          >
            + Add New Customer
          </Button>
        </Paper>
      )}

      {/* 4. EXISTING CUSTOMER DETAILS CARD (CLEAN RESPONSIVE LAYOUT) */}
      {!isSearching && customer && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: "20px",
            bgcolor: "rgba(15, 23, 42, 0.9)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(59, 130, 246, 0.35)",
            boxShadow: "0 12px 36px rgba(0, 0, 0, 0.6), 0 0 20px rgba(37, 99, 235, 0.15)",
          }}
        >
          {/* Customer Header Info */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "flex-start", sm: "center" },
              justifyContent: "space-between",
              gap: 1.5,
              mb: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1, minWidth: 0 }}>
              <Avatar
                sx={{
                  width: { xs: 46, sm: 54 },
                  height: { xs: 46, sm: 54 },
                  bgcolor: "#2563EB",
                  color: "#FFFFFF",
                  fontSize: { xs: "18px", sm: "22px" },
                  fontWeight: 900,
                  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
                  flexShrink: 0,
                }}
              >
                {customer.name.charAt(0).toUpperCase()}
              </Avatar>

              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, flexWrap: "wrap" }}>
                  <Typography
                    sx={{
                      fontWeight: 900,
                      color: "#FFFFFF",
                      fontSize: { xs: "16px", sm: "19px" },
                      lineHeight: 1.2,
                    }}
                  >
                    {customer.name}
                  </Typography>
                  <Chip
                    icon={<ShieldIcon sx={{ "&&": { color: "#4ADE80", fontSize: 13 } }} />}
                    label={customer.kycStatus || "VERIFIED"}
                    size="small"
                    sx={{
                      bgcolor: "rgba(34, 197, 94, 0.18)",
                      color: "#4ADE80",
                      fontWeight: 800,
                      fontSize: "10px",
                      height: 20,
                    }}
                  />
                  {customer.mpin_enabled === false ? (
                    <Chip
                      label="MPIN NOT CREATED"
                      size="small"
                      sx={{
                        bgcolor: "rgba(245, 158, 11, 0.2)",
                        color: "#FBBF24",
                        fontWeight: 800,
                        fontSize: "9.5px",
                        height: 20,
                        border: "1px solid rgba(245, 158, 11, 0.4)",
                      }}
                    />
                  ) : (
                    <Chip
                      label="MPIN ACTIVE"
                      size="small"
                      sx={{
                        bgcolor: "rgba(16, 185, 129, 0.2)",
                        color: "#34D399",
                        fontWeight: 800,
                        fontSize: "9.5px",
                        height: 20,
                      }}
                    />
                  )}
                </Box>

                <Typography
                  sx={{
                    color: "#94A3B8",
                    fontSize: "12px",
                    fontWeight: 500,
                    mt: 0.4,
                    lineHeight: 1.3,
                  }}
                >
                  Customer Code: <strong style={{ color: "#60A5FA" }}>{customer.customerCode}</strong> · Mobile: <strong style={{ color: "#F8FAFC" }}>{customer.mobile}</strong>
                </Typography>
              </Box>
            </Box>

            {/* Wallet Balance on Desktop */}
            <Box sx={{ display: { xs: "none", sm: "block" }, textAlign: "right" }}>
              <Typography sx={{ color: "#94A3B8", fontSize: "10px", fontWeight: 700, letterSpacing: "0.5px" }}>
                WALLET BALANCE
              </Typography>
              <Typography sx={{ fontWeight: 900, color: "#FBBF24", fontSize: "18px", fontFamily: "var(--font-geist-mono), monospace" }}>
                ₹{(wallet?.mainBalance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.1)", my: 2 }} />

          {/* 2x2 Grid on Mobile / 4-Col on Desktop */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" },
              gap: 1.25,
            }}
          >
            <Box
              sx={{
                p: 1.25,
                borderRadius: "12px",
                bgcolor: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <Typography sx={{ color: "#94A3B8", fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.4px" }}>
                DAILY REMAINING
              </Typography>
              <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "14px", mt: 0.3, fontFamily: "var(--font-geist-mono), monospace" }}>
                ₹{Number(customer.dailyLimitRemaining ?? 25000).toLocaleString()}
              </Typography>
            </Box>

            <Box
              sx={{
                p: 1.25,
                borderRadius: "12px",
                bgcolor: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <Typography sx={{ color: "#94A3B8", fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.4px" }}>
                MONTHLY REMAINING
              </Typography>
              <Typography sx={{ fontWeight: 800, color: "#34D399", fontSize: "14px", mt: 0.3, fontFamily: "var(--font-geist-mono), monospace" }}>
                ₹{Number(customer.monthlyLimitRemaining ?? 200000).toLocaleString()}
              </Typography>
            </Box>

            <Box
              sx={{
                p: 1.25,
                borderRadius: "12px",
                bgcolor: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <Typography sx={{ color: "#94A3B8", fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.4px" }}>
                CATEGORY
              </Typography>
              <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "14px", mt: 0.3 }}>
                {customer.category || "REGULAR"}
              </Typography>
            </Box>

            <Box
              sx={{
                p: 1.25,
                borderRadius: "12px",
                bgcolor: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <Typography sx={{ color: "#94A3B8", fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.4px" }}>
                KYC LEVEL
              </Typography>
              <Typography sx={{ fontWeight: 800, color: "#FBBF24", fontSize: "14px", mt: 0.3 }}>
                {customer.kycLevel || "FULL_KYC"}
              </Typography>
            </Box>
          </Box>

          {/* Action Buttons */}
          <Stack
            direction={{ xs: "column-reverse", sm: "row" }}
            spacing={1.25}
            sx={{ mt: 2.5, width: "100%", justifyContent: "flex-end" }}
          >
            <Button
              variant="outlined"
              fullWidth={false}
              onClick={() => {
                setSearchInput("");
                setLocalHasSearched(false);
                if (onResetCustomer) onResetCustomer();
              }}
              sx={{
                width: { xs: "100%", sm: "auto" },
                height: { xs: 44, sm: 48 },
                px: 2.5,
                borderRadius: "10px",
                fontWeight: 700,
                fontSize: "13.5px",
                color: "#94A3B8",
                borderColor: "rgba(255, 255, 255, 0.2)",
                textTransform: "none",
                "&:hover": {
                  borderColor: "#FFFFFF",
                  color: "#FFFFFF",
                  bgcolor: "rgba(255, 255, 255, 0.05)",
                },
              }}
            >
              Search Another Customer
            </Button>

            {customer.mpin_enabled === false ? (
              <Button
                variant="contained"
                onClick={() => {
                  window.location.href = `/customers/create-pin?customer_id=${customer.id}`;
                }}
                startIcon={<ShieldIcon />}
                sx={{
                  width: { xs: "100%", sm: "auto" },
                  height: { xs: 44, sm: 48 },
                  px: 3,
                  borderRadius: "10px",
                  fontWeight: 900,
                  fontSize: "14px",
                  bgcolor: "#F59E0B",
                  color: "#0F172A",
                  textTransform: "none",
                  "&:hover": { bgcolor: "#D97706" },
                  boxShadow: "0 4px 16px rgba(245, 158, 11, 0.35)",
                }}
              >
                🔒 Create Required MPIN
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={onContinue}
                endIcon={<ArrowForwardIcon />}
                sx={{
                  width: { xs: "100%", sm: "auto" },
                  height: { xs: 44, sm: 48 },
                  px: 3,
                  borderRadius: "10px",
                  fontWeight: 900,
                  fontSize: "14px",
                  bgcolor: "#2563EB",
                  color: "#FFFFFF",
                  textTransform: "none",
                  "&:hover": { bgcolor: "#1D4ED8" },
                  boxShadow: "0 4px 16px rgba(37, 99, 235, 0.35)",
                }}
              >
                Continue to Beneficiary Selection
              </Button>
            )}
          </Stack>
        </Paper>
      )}
    </Box>
  );
};

export default WorkstationStep1;
