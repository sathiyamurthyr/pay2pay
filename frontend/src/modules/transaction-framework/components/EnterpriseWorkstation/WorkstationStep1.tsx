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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import ShieldIcon from "@mui/icons-material/Shield";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { CustomerData } from "../../hooks/useCustomer";

export interface WorkstationStep1Props {
  customer: CustomerData | null;
  onSearchCustomer: (query: string) => void;
  onSelectCustomer: (cust: CustomerData) => void;
  onContinue: () => void;
  isSearching?: boolean;
}

export const WorkstationStep1: React.FC<WorkstationStep1Props> = ({
  customer,
  onSearchCustomer,
  onSelectCustomer,
  onContinue,
  isSearching = false,
}) => {
  const [searchInput, setSearchInput] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSearchCustomer(searchInput.trim());
    }
  };

  const recentCustomers: CustomerData[] = [
    { id: "CUS-9812", customerCode: "CUS-0245", name: "Ramesh Kumar", mobile: "9876543210", walletBalance: 124500, dailyLimitRemaining: 25000, monthlyLimitRemaining: 200000, kycStatus: "VERIFIED", riskRating: "LOW", preferredBank: "HDFC" },
    { id: "CUS-9813", customerCode: "CUS-0246", name: "Priya Sharma", mobile: "9812345678", walletBalance: 85000, dailyLimitRemaining: 40000, monthlyLimitRemaining: 150000, kycStatus: "VERIFIED", riskRating: "LOW", preferredBank: "ICICI" },
    { id: "CUS-9814", customerCode: "CUS-0247", name: "Anand Verma", mobile: "9988776655", walletBalance: 210000, dailyLimitRemaining: 10000, monthlyLimitRemaining: 80000, kycStatus: "VERIFIED", riskRating: "MEDIUM", preferredBank: "SBI" },
  ];

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", pt: 2 }}>
      {/* 1. SEARCH CONSOLE */}
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

        <form onSubmit={handleSearch}>
          <Stack direction="row" spacing={1.5}>
            <TextField
              fullWidth
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by Mobile (9876543210), Aadhaar (XXXX XXXX 1234), or Code (CUS-0245)..."
              slotProps={{
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

            <Button
              type="submit"
              variant="contained"
              disabled={isSearching}
              sx={{
                height: 52,
                px: 4,
                borderRadius: "10px",
                fontWeight: 900,
                fontSize: "15px",
                bgcolor: "#2563EB",
                color: "#FFFFFF",
                boxShadow: "0 4px 16px rgba(37, 99, 235, 0.4)",
              }}
            >
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </Stack>
        </form>

        <Stack direction="row" spacing={1} sx={{ mt: 2, alignItems: "center", flexWrap: "wrap", gap: 1 }}>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "12px", fontWeight: 700 }}>
            RECENT CUSTOMERS:
          </Typography>
          {recentCustomers.map((rc) => (
            <Chip
              key={rc.id}
              avatar={<Avatar sx={{ bgcolor: "#2563EB", color: "#FFFFFF", fontWeight: 900 }}>{rc.name.charAt(0)}</Avatar>}
              label={`${rc.name} (${rc.mobile})`}
              onClick={() => onSelectCustomer(rc)}
              sx={{
                bgcolor: customer?.id === rc.id ? "#2563EB" : "rgba(255, 255, 255, 0.08)",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: "12px",
                height: 32,
                cursor: "pointer",
              }}
            />
          ))}
        </Stack>
      </Paper>

      {/* 2. CUSTOMER PROFILE CARD */}
      {customer && (
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
                <Chip label={`Risk: ${customer.riskRating || "LOW"}`} size="small" sx={{ bgcolor: "rgba(56, 189, 248, 0.2)", color: "#38BDF8", fontWeight: 800, fontSize: "11px" }} />
              </Stack>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.70)", fontSize: "13px", fontWeight: 600 }}>
                Customer Code: <strong style={{ color: "#60A5FA" }}>{customer.customerCode || `CUS-${customer.mobile.slice(-4)}`}</strong> · Mobile: <strong>{customer.mobile}</strong>
              </Typography>
            </Box>

            <Box sx={{ textAlign: "right" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px", fontWeight: 700, mb: 0.5 }}>
                RETAILER WALLET BALANCE
              </Typography>
              <Typography sx={{ fontWeight: 900, color: "#FBBF24", fontSize: "24px" }}>
                ₹{(customer.walletBalance ?? 124500).toLocaleString()}
              </Typography>
            </Box>
          </Stack>

          <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.12)", my: 2 }} />

          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2 }}>
            <Box>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px", fontWeight: 700 }}>DAILY REMAINING</Typography>
              <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "15px" }}>₹{(customer.dailyLimitRemaining ?? 25000).toLocaleString()}</Typography>
            </Box>
            <Box>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px", fontWeight: 700 }}>MONTHLY REMAINING</Typography>
              <Typography sx={{ fontWeight: 800, color: "#34D399", fontSize: "15px" }}>₹{(customer.monthlyLimitRemaining ?? 200000).toLocaleString()}</Typography>
            </Box>
            <Box>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px", fontWeight: 700 }}>PREFERRED BANK</Typography>
              <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "15px" }}>{customer.preferredBank || "HDFC Bank"}</Typography>
            </Box>
            <Box>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px", fontWeight: 700 }}>RELATIONSHIP MGR</Typography>
              <Typography sx={{ fontWeight: 800, color: "#93C5FD", fontSize: "15px" }}>Vikram Singh</Typography>
            </Box>
          </Box>

          <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              onClick={onContinue}
              endIcon={<ArrowForwardIcon />}
              sx={{
                height: 48,
                px: 4,
                borderRadius: "12px",
                fontWeight: 900,
                fontSize: "15px",
                bgcolor: "#2563EB",
                color: "#FFFFFF",
                boxShadow: "0 4px 16px rgba(37, 99, 235, 0.4)",
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
