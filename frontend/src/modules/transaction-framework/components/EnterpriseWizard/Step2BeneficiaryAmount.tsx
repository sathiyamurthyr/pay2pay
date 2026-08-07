import React, { useState } from "react";
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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import StarIcon from "@mui/icons-material/Star";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FilterListIcon from "@mui/icons-material/FilterList";
import SortIcon from "@mui/icons-material/Sort";
import { CustomerData } from "../../hooks/useCustomer";
import { BeneficiaryData } from "../../hooks/useBeneficiary";
import { AmountInWords } from "../Amount/AmountInWords";

export interface Step2BeneficiaryAmountProps {
  customer: CustomerData | null;
  beneficiaries: BeneficiaryData[];
  selectedBeneficiary: BeneficiaryData | null;
  onSelectBeneficiary: (b: BeneficiaryData) => void;
  amount: number;
  onAmountChange: (val: number) => void;
  charges: number;
  totalPayable: number;
  onBack: () => void;
  onContinue: () => void;
}

export const Step2BeneficiaryAmount: React.FC<Step2BeneficiaryAmountProps> = ({
  customer,
  beneficiaries,
  selectedBeneficiary,
  onSelectBeneficiary,
  amount,
  onAmountChange,
  charges,
  totalPayable,
  onBack,
  onContinue,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "favorite" | "verified">("all");
  const [relationshipFilter, setRelationshipFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"recent" | "used" | "alphabetical">("recent");

  const quickAmounts = [500, 1000, 2000, 5000, 10000, 25000, 50000, 100000];

  // Filtering Logic
  const filteredBeneficiaries = beneficiaries
    .filter((b) => {
      const matchesSearch =
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.accountNumber.includes(searchTerm) ||
        b.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.ifsc.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter = filterType === "favorite" ? b.isFavorite : true;
      const matchesRel = relationshipFilter === "all" ? true : (b.relationship || "Family") === relationshipFilter;

      return matchesSearch && matchesFilter && matchesRel;
    })
    .sort((a, b) => {
      if (sortBy === "alphabetical") return a.name.localeCompare(b.name);
      if (sortBy === "used") return (b.transferCount || 0) - (a.transferCount || 0);
      return 0; // default recent
    });

  const gst = Math.round(charges * 0.18);
  const fee = charges - gst;
  const commission = Math.round(amount * 0.0035);
  const walletBalance = customer?.walletBalance ?? 124500;
  const balanceAfter = Math.max(0, walletBalance - totalPayable);

  return (
    <Box sx={{ width: "100%", py: 1 }}>
      {/* 1. STICKY LOCKED CUSTOMER BAR */}
      <Paper
        elevation={0}
        sx={{
          p: 1.75,
          px: 3,
          borderRadius: "14px",
          bgcolor: "rgba(18, 27, 48, 0.85)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          mb: 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Avatar sx={{ bgcolor: "#2563EB", color: "#FFFFFF", fontWeight: 900, width: 38, height: 38 }}>
            {customer?.name.charAt(0) || "C"}
          </Avatar>
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "15px" }}>
                {customer?.name || "Ramesh Kumar"}
              </Typography>
              <Chip label="LOCKED CUSTOMER" size="small" sx={{ bgcolor: "rgba(37, 99, 235, 0.2)", color: "#60A5FA", fontWeight: 800, height: 18, fontSize: "10px" }} />
            </Stack>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>
              Mobile: {customer?.mobile} · Code: <strong style={{ color: "#60A5FA" }}>{customer?.customerCode || `CUS-${customer?.mobile.slice(-4)}`}</strong>
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={3} sx={{ alignItems: "center" }}>
          <Box sx={{ textAlign: "right" }}>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "10px", fontWeight: 700 }}>DAILY REMAINING</Typography>
            <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "13px" }}>₹{(customer?.dailyLimitRemaining ?? 25000).toLocaleString()}</Typography>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "10px", fontWeight: 700 }}>WALLET BALANCE</Typography>
            <Typography sx={{ fontWeight: 900, color: "#FBBF24", fontSize: "15px" }}>₹{walletBalance.toLocaleString()}</Typography>
          </Box>
        </Stack>
      </Paper>

      {/* 2. SIDE-BY-SIDE ENTERPRISE COCKPIT GRID (LEFT 70% BENEFICIARIES | RIGHT 30% STICKY AMOUNT & SUMMARY) */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: "minmax(0, 6.5fr) minmax(360px, 3.5fr)",
            xl: "minmax(0, 7fr) minmax(380px, 3fr)",
          },
          gap: 2.5,
          alignItems: "start",
        }}
      >
        {/* LEFT PANEL (70%): BENEFICIARY SEARCH, FILTERS & RESPONSIVE GRID */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: "16px",
            bgcolor: "rgba(18, 27, 48, 0.75)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
          }}
        >
          <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", mb: 1.5 }}>
            BENEFICIARY MANAGEMENT SUITE ({filteredBeneficiaries.length} ACCOUNTS)
          </Typography>

          {/* Search, Filter Chips & Sorting Toolbar */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2, alignItems: "center" }}>
            <TextField
              fullWidth
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Name, Account, Bank, or IFSC..."
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: "#60A5FA", fontSize: 18 }} />
                    </InputAdornment>
                  ),
                  sx: { height: 40, color: "#FFFFFF", bgcolor: "rgba(8, 17, 31, 0.9)", borderRadius: "8px", fontSize: "13px" },
                },
              }}
            />

            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Chip
                label="All"
                onClick={() => setFilterType("all")}
                sx={{ height: 38, fontWeight: 800, bgcolor: filterType === "all" ? "#2563EB" : "rgba(255, 255, 255, 0.08)", color: "#FFFFFF", cursor: "pointer" }}
              />
              <Chip
                icon={<StarIcon sx={{ "&&": { color: "#FFD54F", fontSize: 14 } }} />}
                label="Favourites"
                onClick={() => setFilterType("favorite")}
                sx={{ height: 38, fontWeight: 800, bgcolor: filterType === "favorite" ? "#2563EB" : "rgba(255, 255, 255, 0.08)", color: "#FFFFFF", cursor: "pointer" }}
              />

              <Select
                size="small"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                sx={{ height: 38, color: "#FFFFFF", bgcolor: "rgba(255, 255, 255, 0.08)", borderRadius: "8px", fontSize: "12px", fontWeight: 700, "& fieldset": { border: "none" } }}
              >
                <MenuItem value="recent">Sort: Recent</MenuItem>
                <MenuItem value="used">Sort: Most Used</MenuItem>
                <MenuItem value="alphabetical">Sort: A-Z</MenuItem>
              </Select>
            </Stack>
          </Stack>

          {/* RESPONSIVE BENEFICIARY CARD GRID (4K: 4 cards/row, 2K: 3 cards/row, FHD: 2 cards/row) */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                lg: "repeat(2, 1fr)",
                xl: "repeat(3, 1fr)",
                "@media (min-width: 2400px)": { gridTemplateColumns: "repeat(4, 1fr)" },
              },
              gap: 1.75,
              maxHeight: 620, // Virtulized scrolling viewport
              overflowY: "auto",
              pr: 0.5,
            }}
          >
            {filteredBeneficiaries.map((b) => {
              const isSelected = selectedBeneficiary?.id === b.id;
              const maskedAcc = b.accountNumber.length >= 4 ? `XXXX XXXX ${b.accountNumber.slice(-4)}` : b.accountNumber;

              return (
                <Paper
                  key={b.id}
                  elevation={0}
                  onClick={() => onSelectBeneficiary(b)}
                  sx={{
                    width: "100%",
                    minHeight: 180, // Exact 320x180 card standard
                    p: 2,
                    borderRadius: "14px",
                    bgcolor: isSelected ? "rgba(37, 99, 235, 0.25)" : "rgba(255, 255, 255, 0.04)",
                    backdropFilter: "blur(12px)",
                    border: isSelected ? "2px solid #2563EB" : "1px solid rgba(255, 255, 255, 0.1)",
                    boxShadow: isSelected ? "0 4px 20px rgba(37, 99, 235, 0.4)" : "none",
                    cursor: "pointer",
                    transition: "all 150ms ease",
                    "&:hover": { bgcolor: isSelected ? "rgba(37, 99, 235, 0.3)" : "rgba(255, 255, 255, 0.08)", transform: "translateY(-2px)" },
                  }}
                >
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 0.75 }}>
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                      <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "15px" }}>{b.name}</Typography>
                      {b.isFavorite && <StarIcon sx={{ color: "#FFD54F", fontSize: 15 }} />}
                    </Stack>
                    <Chip label={b.relationship || "Family"} size="small" sx={{ bgcolor: "rgba(255, 255, 255, 0.1)", color: "#93C5FD", fontWeight: 700, height: 18, fontSize: "10px" }} />
                  </Stack>

                  <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "13px", mb: 0.25 }}>
                    {b.bankName}
                  </Typography>

                  <Typography sx={{ color: "#FFFFFF", fontFamily: "monospace", fontWeight: 800, fontSize: "14px", mb: 0.75 }}>
                    {maskedAcc}
                  </Typography>

                  <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px", mb: 1 }}>
                    IFSC: {b.ifsc}
                  </Typography>

                  <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", my: 0.75 }} />

                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                    <Chip icon={<CheckCircleIcon sx={{ "&&": { color: "#4ADE80", fontSize: 11 } }} />} label="VERIFIED" size="small" sx={{ bgcolor: "rgba(34, 197, 94, 0.15)", color: "#4ADE80", fontWeight: 800, height: 18, fontSize: "9px" }} />
                    <Typography sx={{ color: "#4ADE80", fontSize: "11px", fontWeight: 800 }}>99.9% Success</Typography>
                  </Stack>
                </Paper>
              );
            })}
          </Box>
        </Paper>

        {/* RIGHT PANEL (30%): STICKY AMOUNT INPUT & LIVE FINANCIAL SUMMARY */}
        <Paper
          elevation={0}
          sx={{
            position: "sticky",
            top: 88, // Exact top offset
            height: "fit-content",
            p: 2.5,
            borderRadius: "16px",
            bgcolor: "rgba(18, 27, 48, 0.85)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25)",
          }}
        >
          <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", mb: 1.5 }}>
            TRANSFER AMOUNT & FINANCIAL SUMMARY
          </Typography>

          {/* Large Amount Input */}
          <TextField
            fullWidth
            type="number"
            value={amount === 0 ? "" : amount}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onAmountChange(isNaN(val) ? 0 : val);
            }}
            placeholder="0.00"
            slotProps={{
              input: {
                startAdornment: <Typography sx={{ color: "#2563EB", fontWeight: 900, fontSize: "24px", mr: 0.5 }}>₹</Typography>,
                sx: {
                  height: 56,
                  fontSize: "26px",
                  fontWeight: 900,
                  color: "#FFFFFF",
                  bgcolor: "rgba(8, 17, 31, 0.9)",
                  borderRadius: "12px",
                  px: 1.5,
                  "& input": { textAlign: "right" },
                },
              },
            }}
          />

          {/* Amount In Words Live Converter */}
          <AmountInWords amount={amount} />

          {/* Quick Amount Preset Chips */}
          <Stack direction="row" spacing={0.75} sx={{ mt: 1.5, mb: 2, flexWrap: "wrap", gap: 0.75 }}>
            {quickAmounts.map((preset) => (
              <Chip
                key={preset}
                label={`+ ₹${preset.toLocaleString()}`}
                onClick={() => onAmountChange(preset)}
                sx={{
                  height: 32,
                  px: 1,
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: amount === preset ? 900 : 700,
                  bgcolor: amount === preset ? "#2563EB" : "rgba(255, 255, 255, 0.05)",
                  color: "#FFFFFF",
                  cursor: "pointer",
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.12)" },
                }}
              />
            ))}
          </Stack>

          <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.1)", my: 1.5 }} />

          {/* Financial KPI Summary Table */}
          <Stack spacing={1.25}>
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Transfer Amount</Typography>
              <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "14px" }}>₹{amount.toLocaleString()}</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Convenience Fee</Typography>
              <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "13px" }}>+ ₹{fee.toLocaleString()}</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>GST (18%)</Typography>
              <Typography sx={{ fontWeight: 800, color: "#93C5FD", fontSize: "13px" }}>+ ₹{gst.toLocaleString()}</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Retailer Commission</Typography>
              <Typography sx={{ fontWeight: 800, color: "#4ADE80", fontSize: "13px" }}>+ ₹{commission.toLocaleString()}</Typography>
            </Stack>

            <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", my: 0.5 }} />

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.80)", fontWeight: 700, fontSize: "13px" }}>NET WALLET DEBIT</Typography>
              <Typography sx={{ fontWeight: 900, color: "#3B82F6", fontSize: "17px" }}>₹{totalPayable.toLocaleString()}</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Wallet After Transfer</Typography>
              <Typography sx={{ fontWeight: 800, color: "#FBBF24", fontSize: "14px" }}>₹{balanceAfter.toLocaleString()}</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Settlement ETA</Typography>
              <Typography sx={{ fontWeight: 800, color: "#4ADE80", fontSize: "12px" }}>1.2 sec (IMPS)</Typography>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Recommended Route</Typography>
              <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "12px" }}>HDFC DirectSwitch</Typography>
            </Stack>
          </Stack>

          {/* Action CTAs */}
          <Stack spacing={1} sx={{ mt: 2.5 }}>
            <Button
              fullWidth
              variant="contained"
              disabled={amount <= 0 || !selectedBeneficiary}
              onClick={onContinue}
              endIcon={<ArrowForwardIcon />}
              sx={{
                height: 48,
                borderRadius: "10px",
                fontWeight: 900,
                fontSize: "14px",
                bgcolor: "#2563EB",
                color: "#FFFFFF",
                boxShadow: "0 4px 16px rgba(37, 99, 235, 0.4)",
                "&:hover": { bgcolor: "#1D4ED8" },
              }}
            >
              Proceed to Authorization →
            </Button>

            <Button
              fullWidth
              variant="outlined"
              onClick={onBack}
              startIcon={<ArrowBackIcon />}
              sx={{ height: 38, borderRadius: "8px", fontWeight: 700, fontSize: "12px", color: "rgba(255, 255, 255, 0.8)", borderColor: "rgba(255, 255, 255, 0.2)" }}
            >
              Back to Customer
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
};
