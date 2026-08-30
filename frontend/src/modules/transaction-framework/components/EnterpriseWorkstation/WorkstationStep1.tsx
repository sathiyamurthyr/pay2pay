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
    <Box sx={{ maxWidth: 900, mx: "auto", pt: 2 }}>
      {/* 1. SEARCH CONSOLE WITH PERSISTENT "NEW CUSTOMER" QUICK ACTION */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: "16px",
          bgcolor: "rgba(18, 27, 48, 0.85)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          mb: 3,
        }}
      >
        <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", mb: 1.5 }}>
          CUSTOMER SEARCH & IDENTIFICATION
        </Typography>

        <form onSubmit={handleSearch} autoComplete="off" autoCorrect="off" autoCapitalize="off">
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField
              fullWidth
              autoFocus
              suppressHydrationWarning
              inputRef={searchInputRef}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by Mobile, Customer Code, Aadhaar, PAN, or Name..."
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
                      <SearchIcon sx={{ color: "#60A5FA" }} />
                    </InputAdornment>
                  ),
                  sx: {
                    height: 52,
                    fontSize: "15px",
                    color: "#FFFFFF",
                    bgcolor: "rgba(8, 17, 31, 0.9)",
                    borderRadius: "10px",
                  },
                },
              }}
            />

            <Stack direction="row" spacing={1.5} sx={{ width: { xs: "100%", sm: "auto" } }}>
              {/* PRIMARY SEARCH BUTTON */}
              <Button
                type="submit"
                variant="contained"
                disabled={isSearching || !searchInput.trim()}
                startIcon={isSearching ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />}
                sx={{
                  height: 52,
                  px: 4,
                  borderRadius: "10px",
                  fontWeight: 900,
                  fontSize: "15px",
                  bgcolor: "#2563EB",
                  color: "#FFFFFF",
                  whiteSpace: "nowrap",
                  boxShadow: "0 4px 16px rgba(37, 99, 235, 0.4)",
                  flex: { xs: 1, sm: "initial" },
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
                    startIcon={<PersonAddIcon />}
                    aria-label="Register new customer"
                    sx={{
                      height: 52,
                      px: 3,
                      borderRadius: "10px",
                      fontWeight: 900,
                      fontSize: "15px",
                      color: "#60A5FA",
                      borderColor: "rgba(96, 165, 250, 0.4)",
                      bgcolor: "rgba(37, 99, 235, 0.12)",
                      boxShadow: "0 4px 16px rgba(37, 99, 235, 0.15)",
                      whiteSpace: "nowrap",
                      flex: { xs: 1, sm: "initial" },
                      "&:hover": {
                        bgcolor: "rgba(37, 99, 235, 0.25)",
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
            p: 3.5,
            borderRadius: "16px",
            bgcolor: "rgba(18, 27, 48, 0.5)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <Stack direction="row" spacing={2} sx={{ alignItems: "center", mb: 2 }}>
            <Skeleton variant="circular" width={64} height={64} sx={{ bgcolor: "rgba(255, 255, 255, 0.1)" }} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="40%" height={32} sx={{ bgcolor: "rgba(255, 255, 255, 0.1)" }} />
              <Skeleton variant="text" width="60%" height={20} sx={{ bgcolor: "rgba(255, 255, 255, 0.1)" }} />
            </Box>
          </Stack>
        </Paper>
      )}

      {/* 3. CENTERED "CUSTOMER NOT FOUND" EMPTY-STATE CARD (NAVIGATES TO DEDICATED /customers/new PAGE) */}
      {showEmptyState && (
        <Paper
          elevation={0}
          onClick={handleNavigateToRegister}
          sx={{
            p: 4,
            borderRadius: "16px",
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
          <PersonAddIcon sx={{ fontSize: 64, color: "#2563EB", mb: 1.5 }} />
          <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "22px", mb: 0.5 }}>
            Customer Not Found
          </Typography>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.65)", fontSize: "14px", mb: 3, maxWidth: 500, mx: "auto" }}>
            No customer exists with the entered Mobile Number / Customer Code. Click below to navigate to the customer registration page.
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
              height: 48,
              px: 4,
              borderRadius: "12px",
              fontWeight: 900,
              fontSize: "15px",
              bgcolor: "#2563EB",
              boxShadow: "0 4px 20px rgba(37, 99, 235, 0.4)",
            }}
          >
            + Add New Customer
          </Button>
        </Paper>
      )}

      {/* 4. EXISTING CUSTOMER DETAILS CARD (EXACT UNCHANGED DESIGN & LAYOUT) */}
      {!isSearching && customer && (
        <Paper
          elevation={0}
          sx={{
            p: 3.5,
            borderRadius: "16px",
            bgcolor: "rgba(37, 99, 235, 0.12)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(37, 99, 235, 0.35)",
            boxShadow: "0 8px 32px rgba(37, 99, 235, 0.2)",
          }}
        >
          <Stack direction="row" spacing={3} sx={{ alignItems: "center", mb: 2.5 }}>
            <Avatar sx={{ width: 64, height: 64, bgcolor: "#2563EB", color: "#FFFFFF", fontSize: "24px", fontWeight: 900 }}>
              {customer.name.charAt(0)}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 0.5 }}>
                <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "22px" }}>
                  {customer.name}
                </Typography>
                <Chip icon={<ShieldIcon sx={{ "&&": { color: "#4ADE80", fontSize: 14 } }} />} label={customer.kycStatus || "VERIFIED"} size="small" sx={{ bgcolor: "rgba(34, 197, 94, 0.2)", color: "#4ADE80", fontWeight: 800, fontSize: "11px" }} />
                {customer.mpin_enabled === false ? (
                  <Chip label="MPIN NOT CREATED" size="small" sx={{ bgcolor: "rgba(245, 158, 11, 0.25)", color: "#FBBF24", fontWeight: 900, fontSize: "11px", border: "1px solid #F59E0B" }} />
                ) : (
                  <Chip label="MPIN ACTIVE" size="small" sx={{ bgcolor: "rgba(16, 185, 129, 0.25)", color: "#34D399", fontWeight: 800, fontSize: "11px" }} />
                )}
                {customer.riskRating && (
                  <Chip label={`Risk: ${customer.riskRating}`} size="small" sx={{ bgcolor: "rgba(56, 189, 248, 0.2)", color: "#38BDF8", fontWeight: 800, fontSize: "11px" }} />
                )}
              </Stack>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.70)", fontSize: "13px", fontWeight: 600 }}>
                Customer Code: <strong style={{ color: "#60A5FA" }}>{customer.customerCode}</strong> · Mobile: <strong>{customer.mobile}</strong>
              </Typography>
            </Box>

            <Box sx={{ textAlign: "right" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px", fontWeight: 700, mb: 0.5 }}>
                RETAILER WALLET BALANCE
              </Typography>
              <Typography sx={{ fontWeight: 900, color: "#FBBF24", fontSize: "24px" }}>
                ₹{(wallet?.mainBalance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </Typography>
            </Box>
          </Stack>

          <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.12)", my: 2 }} />

          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2 }}>
            <Box>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px", fontWeight: 700 }}>DAILY REMAINING</Typography>
              <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "15px" }}>₹{Number(customer.dailyLimitRemaining ?? 25000).toLocaleString()}</Typography>
            </Box>
            <Box>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px", fontWeight: 700 }}>MONTHLY REMAINING</Typography>
              <Typography sx={{ fontWeight: 800, color: "#34D399", fontSize: "15px" }}>₹{Number(customer.monthlyLimitRemaining ?? 200000).toLocaleString()}</Typography>
            </Box>
            <Box>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px", fontWeight: 700 }}>CATEGORY</Typography>
              <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "15px" }}>{customer.category || "REGULAR"}</Typography>
            </Box>
            <Box>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px", fontWeight: 700 }}>KYC LEVEL</Typography>
              <Typography sx={{ fontWeight: 800, color: "#FBBF24", fontSize: "15px" }}>{customer.kycLevel || "FULL_KYC"}</Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={2} sx={{ mt: 3, justifyContent: "flex-end", flexWrap: "wrap", gap: 1.5 }}>
            <Button
              variant="outlined"
              onClick={() => {
                setSearchInput("");
                setLocalHasSearched(false);
                if (onResetCustomer) onResetCustomer();
              }}
              sx={{
                py: 1.5,
                px: 3,
                borderRadius: "12px",
                fontWeight: 800,
                fontSize: "14px",
                color: "#94A3B8",
                borderColor: "rgba(255, 255, 255, 0.2)",
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
                onClick={() => { window.location.href = `/customers/create-pin?customer_id=${customer.id}`; }}
                startIcon={<ShieldIcon />}
                sx={{
                  py: 1.5,
                  px: 4,
                  borderRadius: "12px",
                  fontWeight: 900,
                  fontSize: "15px",
                  bgcolor: "#F59E0B",
                  color: "#0F172A",
                  "&:hover": { bgcolor: "#D97706" },
                  boxShadow: "0 4px 20px rgba(245, 158, 11, 0.4)",
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
                  py: 1.5,
                  px: 4,
                  borderRadius: "12px",
                  fontWeight: 900,
                  fontSize: "15px",
                  bgcolor: "#2563EB",
                  "&:hover": { bgcolor: "#1D4ED8" },
                  boxShadow: "0 4px 20px rgba(37, 99, 235, 0.4)",
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
