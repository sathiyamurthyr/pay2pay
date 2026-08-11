import React, { useState } from "react";
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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import ShieldIcon from "@mui/icons-material/Shield";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import { CustomerData } from "../../hooks/useCustomer";

export interface Step1CustomerSearchProps {
  customer: CustomerData | null;
  onSearchCustomer: (query: string) => void;
  onSelectCustomer: (cust: CustomerData) => void;
  onContinue: () => void;
  isSearching?: boolean;
  hasSearched?: boolean;
  error?: string | null;
  onRegisterCustomer?: () => void;
}

export const Step1CustomerSearch: React.FC<Step1CustomerSearchProps> = ({
  customer,
  onSearchCustomer,
  onSelectCustomer,
  onContinue,
  isSearching = false,
  hasSearched = false,
  error = null,
  onRegisterCustomer,
}) => {
  const [searchInput, setSearchInput] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSearchCustomer(searchInput.trim());
    }
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: "auto", py: 2 }}>
      {/* 1. UNIVERSAL SEARCH CONSOLE */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: "20px",
          bgcolor: "rgba(18, 27, 48, 0.85)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
          mb: 3,
        }}
      >
        <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase", mb: 1.5 }}>
          STEP 1: CUSTOMER IDENTIFICATION & SEARCH
        </Typography>

        <form onSubmit={handleSearch} autoComplete="off" autoCorrect="off" autoCapitalize="off">
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField
              fullWidth
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Enter Mobile Number or Customer Code..."
              autoComplete="off"
              slotProps={{
                htmlInput: {
                  autoComplete: "new-password",
                  name: "no_autofill_wiz_cust_search",
                  autoCorrect: "off",
                  autoCapitalize: "off",
                  spellCheck: "false",
                  "data-lpignore": "true",
                  "data-1p-ignore": "true",
                },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: "#60A5FA" }} />
                    </InputAdornment>
                  ),
                  sx: {
                    height: 56,
                    fontSize: "15px",
                    color: "#FFFFFF",
                    bgcolor: "rgba(8, 17, 31, 0.9)",
                    borderRadius: "12px",
                  },
                },
              }}
            />

            <Button
              type="submit"
              variant="contained"
              disabled={isSearching || !searchInput.trim()}
              startIcon={isSearching ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />}
              sx={{
                height: 56,
                px: 4,
                borderRadius: "12px",
                fontWeight: 900,
                fontSize: "15px",
                bgcolor: "#2563EB",
                color: "#FFFFFF",
                boxShadow: "0 4px 16px rgba(37, 99, 235, 0.4)",
                minWidth: 140,
              }}
            >
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </Stack>
        </form>
      </Paper>

      {/* 2. LOADING STATE SKELETON */}
      {isSearching && (
        <Paper
          elevation={0}
          sx={{
            p: 3.5,
            borderRadius: "20px",
            bgcolor: "rgba(18, 27, 48, 0.5)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <Stack direction="row" spacing={2} sx={{ alignItems: "center", mb: 2 }}>
            <Skeleton variant="circular" width={72} height={72} sx={{ bgcolor: "rgba(255, 255, 255, 0.1)" }} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="40%" height={32} sx={{ bgcolor: "rgba(255, 255, 255, 0.1)" }} />
              <Skeleton variant="text" width="60%" height={20} sx={{ bgcolor: "rgba(255, 255, 255, 0.1)" }} />
            </Box>
          </Stack>
        </Paper>
      )}

      {/* 3. EMPTY STATE - CUSTOMER NOT FOUND */}
      {!isSearching && (error || (hasSearched && !customer)) && (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: "20px",
            bgcolor: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            textAlign: "center",
          }}
        >
          <PersonOffIcon sx={{ fontSize: 56, color: "#EF4444", mb: 1 }} />
          <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "20px", mb: 0.5 }}>
            Customer Not Found
          </Typography>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13.5px", mb: 3, maxWidth: 460, mx: "auto" }}>
            No customer records matched your search query in the database. Please verify the mobile number or register a new customer.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PersonAddIcon />}
            onClick={onRegisterCustomer || (() => alert("Register New Customer modal opened"))}
            sx={{
              height: 46,
              px: 3.5,
              borderRadius: "10px",
              fontWeight: 900,
              fontSize: "14px",
              bgcolor: "#2563EB",
            }}
          >
            + Register New Customer
          </Button>
        </Paper>
      )}

      {/* 4. CUSTOMER PROFILE CARD (API DRIVEN DATA BINDING) */}
      {!isSearching && customer && (
        <Paper
          elevation={0}
          sx={{
            p: 3.5,
            borderRadius: "20px",
            bgcolor: "rgba(37, 99, 235, 0.12)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(37, 99, 235, 0.35)",
            boxShadow: "0 8px 32px rgba(37, 99, 235, 0.25)",
            mb: 3,
          }}
        >
          <Stack direction={{ xs: "column", sm: "row" }} spacing={3} sx={{ alignItems: "center", mb: 3 }}>
            <Avatar sx={{ width: 72, height: 72, bgcolor: "#2563EB", color: "#FFFFFF", fontSize: "28px", fontWeight: 900 }}>
              {customer.name.charAt(0)}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 0.5 }}>
                <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "24px" }}>
                  {customer.name}
                </Typography>
                <Chip icon={<ShieldIcon sx={{ "&&": { color: "#4ADE80", fontSize: 14 } }} />} label={customer.kycStatus || "PENDING"} size="small" sx={{ bgcolor: "rgba(34, 197, 94, 0.2)", color: "#4ADE80", fontWeight: 800, fontSize: "11px" }} />
                {customer.riskRating && (
                  <Chip label={`Risk: ${customer.riskRating}`} size="small" sx={{ bgcolor: "rgba(56, 189, 248, 0.2)", color: "#38BDF8", fontWeight: 800, fontSize: "11px" }} />
                )}
              </Stack>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.70)", fontSize: "14px", fontWeight: 600 }}>
                Customer Code: <strong style={{ color: "#60A5FA" }}>{customer.customerCode}</strong> · Mobile: <strong>{customer.mobile}</strong>
              </Typography>
            </Box>

            <Box sx={{ textAlign: "right" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px", fontWeight: 700, mb: 0.5 }}>
                RETAILER WALLET BALANCE
              </Typography>
              <Typography sx={{ fontWeight: 900, color: "#FBBF24", fontSize: "26px" }}>
                ₹{Number(customer.walletBalance ?? 0).toLocaleString()}
              </Typography>
            </Box>
          </Stack>

          <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.12)", my: 2 }} />

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" }, gap: 2 }}>
            <Box>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px", fontWeight: 700 }}>DAILY REMAINING</Typography>
              <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "16px" }}>₹{Number(customer.dailyLimitRemaining ?? 0).toLocaleString()}</Typography>
            </Box>
            <Box>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px", fontWeight: 700 }}>MONTHLY REMAINING</Typography>
              <Typography sx={{ fontWeight: 800, color: "#34D399", fontSize: "16px" }}>₹{Number(customer.monthlyLimitRemaining ?? 0).toLocaleString()}</Typography>
            </Box>
            <Box>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px", fontWeight: 700 }}>PREFERRED BANK</Typography>
              <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "16px" }}>{customer.preferredBank || "—"}</Typography>
            </Box>
            <Box>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px", fontWeight: 700 }}>RELATIONSHIP MGR</Typography>
              <Typography sx={{ fontWeight: 800, color: "#93C5FD", fontSize: "16px" }}>{customer.relationshipManager || "—"}</Typography>
            </Box>
          </Box>

          <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              onClick={onContinue}
              endIcon={<ArrowForwardIcon />}
              sx={{
                height: 52,
                px: 4,
                borderRadius: "14px",
                fontWeight: 900,
                fontSize: "16px",
                bgcolor: "#2563EB",
                color: "#FFFFFF",
                boxShadow: "0 4px 20px rgba(37, 99, 235, 0.4)",
              }}
            >
              Continue to Beneficiary Selection →
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
};
