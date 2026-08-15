"use client";

import React, { useState, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  TextField,
  Button,
  Chip,
  CircularProgress,
  Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

import { Customer } from "@/types/dmt";
import { TopBar } from "./TopBar";
import { StepSidebar } from "./StepSidebar";
import { CustomerResultCard } from "./CustomerResultCard";
import { StatGrid } from "./StatGrid";
import { TrustPanel } from "./TrustPanel";
import { WizardFooter } from "./WizardFooter";

export interface CustomerIdentificationStepProps {
  initialCustomer?: Customer | null;
  onSearchCustomer?: (query: string) => Promise<Customer | null>;
  onContinue?: (customer: Customer) => void;
}

export function CustomerIdentificationStep({
  initialCustomer = null,
  onSearchCustomer,
  onContinue,
}: CustomerIdentificationStepProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(initialCustomer);
  const [notFound, setNotFound] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setNotFound(false);

    try {
      if (onSearchCustomer) {
        const result = await onSearchCustomer(query);
        if (result) {
          setCustomer(result);
        } else {
          setCustomer(null);
          setNotFound(true);
        }
      } else {
        const cleanMobile = query.replace(/\D/g, "");
        const res = await fetch(`/api/v1/customers/lookup?mobile=${cleanMobile}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.customer_id) {
            setCustomer({
              customerId: data.customer_id,
              fullName: data.full_name || "Customer",
              initials: (data.full_name || "C").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
              mobile: data.mobile_number || query,
              aadhaarMasked: data.aadhaar_masked || "—",
              verified: data.is_kyc_verified || false,
              riskLevel: data.risk_level || "Low",
              customerSince: data.created_at || new Date().toISOString(),
              limits: {
                monthlyLimit: data.monthly_limit || 200000,
                monthlyUsed: data.monthly_used || 0,
                monthlyRemaining: (data.monthly_limit || 200000) - (data.monthly_used || 0),
                usedPercent: Math.round(((data.monthly_used || 0) / (data.monthly_limit || 200000)) * 100),
                remainingPercent: 100 - Math.round(((data.monthly_used || 0) / (data.monthly_limit || 200000)) * 100),
              },
            });
          } else {
            setCustomer(null);
            setNotFound(true);
          }
        } else {
          setCustomer(null);
          setNotFound(true);
        }
      }
    } catch {
      setCustomer(null);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeCustomer = () => {
    setCustomer(null);
    setQuery("");
    setNotFound(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f6f2e9", pb: 12 }}>
      {/* 1. TOP BAR */}
      <TopBar />

      {/* 2. THREE-COLUMN BODY */}
      <Box sx={{ maxWidth: 1440, mx: "auto", px: 3, pt: 3 }}>
        <Stack direction={{ xs: "column", lg: "row" }} spacing={3} sx={{ alignItems: "flex-start" }}>
          {/* LEFT SIDEBAR (250px) */}
          <StepSidebar activeStep={1} />

          {/* CENTER WORKSPACE (FLEX-FILL) */}
          <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, md: 3.5 },
                borderRadius: "18px",
                bgcolor: "#FFFFFF",
                border: "1px solid #e7e2d4",
                boxShadow: "0 4px 20px rgba(11, 19, 48, 0.04)",
              }}
            >
              {/* HEADER ROW */}
              <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: "#1c2340", fontSize: "22px", fontFamily: "serif" }}>
                    Customer Identification
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#6b7290", fontSize: "13px" }}>
                    Identify customer by Mobile Number, Aadhaar, or Customer ID
                  </Typography>
                </Box>
                <Chip label="Step 1 of 6" size="small" sx={{ fontWeight: 800, bgcolor: "#faf7f0", color: "#7a1329", border: "1px solid #d4af37" }} />
              </Stack>

              {/* SEARCH FIELD FORM */}
              <Box component="form" onSubmit={handleSearch} sx={{ mb: 3 }}>
                <Typography variant="caption" component="label" htmlFor="customer-search-input" sx={{ color: "#1c2340", fontWeight: 700, display: "block", mb: 1 }}>
                  Customer Mobile Number / ID / Aadhaar
                </Typography>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <TextField
                    id="customer-search-input"
                    inputRef={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Enter 10-digit mobile number, Customer ID, or Aadhaar..."
                    fullWidth
                    size="medium"
                    slotProps={{
                      input: {
                        startAdornment: <SearchIcon sx={{ color: "#6b7290", mr: 1 }} />,
                      },
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "12px",
                        bgcolor: "#faf7f0",
                        "& fieldset": { borderColor: "#e7e2d4" },
                        "&:hover fieldset": { borderColor: "#d4af37" },
                        "&.Mui-focused fieldset": { borderColor: "#d4af37", borderWidth: 2 },
                      },
                    }}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading || !query.trim()}
                    endIcon={loading ? <CircularProgress size={18} color="inherit" /> : <ArrowForwardIcon />}
                    sx={{
                      background: "linear-gradient(135deg, #7a1329 0%, #5e0f22 100%)",
                      color: "#FFFFFF",
                      fontWeight: 800,
                      px: 3,
                      height: 54,
                      borderRadius: "12px",
                      textTransform: "none",
                      fontSize: "15px",
                      border: "1px solid #d4af37",
                      whiteSpace: "nowrap",
                      "&:hover": { background: "#5e0f22" },
                    }}
                  >
                    {loading ? "Searching..." : "Search Customer"}
                  </Button>
                </Stack>

                <Typography variant="caption" sx={{ color: "#6b7290", fontSize: "11px", display: "block", mt: 1 }}>
                  Accepts 10-digit mobile number, 12-digit Aadhaar number, or Customer Account ID
                </Typography>
              </Box>

              {/* SEARCH NOT FOUND STATE */}
              {notFound && (
                <Alert severity="warning" sx={{ mb: 3, borderRadius: "12px", border: "1px solid #d4af37", bgcolor: "#faf7f0", color: "#1c2340" }}>
                  No customer record found for "<strong>{query}</strong>". Please verify the mobile number or click below to register a new customer.
                </Alert>
              )}

              {/* CUSTOMER RESULT CARD & STATS */}
              {customer && (
                <>
                  <CustomerResultCard customer={customer} onChangeCustomer={handleChangeCustomer} />
                  <StatGrid limits={customer.limits} lastTransaction={customer.lastTransaction} />
                </>
              )}
            </Paper>
          </Box>

          {/* RIGHT SIDEBAR (290px) */}
          <TrustPanel />
        </Stack>
      </Box>

      {/* 3. BOTTOM ACTION BAR */}
      <WizardFooter
        activeStep={1}
        totalSteps={6}
        canContinue={!!customer}
        onPrevious={() => {}}
        onContinue={() => customer && onContinue && onContinue(customer)}
      />
    </Box>
  );
}
