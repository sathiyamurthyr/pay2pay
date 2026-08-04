"use client";

import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Avatar,
  Stack,
  InputAdornment,
  LinearProgress,
  IconButton,
  Tooltip,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import SearchIcon from "@mui/icons-material/Search";
import VerifiedIcon from "@mui/icons-material/Verified";
import ShieldIcon from "@mui/icons-material/Shield";
import LockIcon from "@mui/icons-material/Lock";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import PhoneIcon from "@mui/icons-material/Phone";
import HistoryIcon from "@mui/icons-material/History";

import { CustomerMasterSlideOver } from "@/components/master/customer-master-slide-over";
import { useTransactionMemoryStore } from "@/stores/use-transaction-memory-store";
import { useRouter } from "next/navigation";

interface CustomerRecord {
  id: string;
  name: string;
  mobile: string;
  email: string;
  kycStatus: "VERIFIED" | "PENDING";
  aadhaarStatus: "VERIFIED" | "PENDING";
  totalTxns: number;
  totalVolume: number;
  dailyLimitUsed: number;
  dailyLimitTotal: number;
  monthlyLimitUsed: number;
  monthlyLimitTotal: number;
  lastVisit: string;
  linkedBeneficiaries: number;
  riskScore: "LOW" | "MEDIUM" | "HIGH";
}

const MOCK_CUSTOMERS: CustomerRecord[] = [
  {
    id: "CUST-1001",
    name: "Kavitha Sharma",
    mobile: "+91 98401 92837",
    email: "kavitha.s@domain.com",
    kycStatus: "VERIFIED",
    aadhaarStatus: "VERIFIED",
    totalTxns: 24,
    totalVolume: 85000,
    dailyLimitUsed: 15000,
    dailyLimitTotal: 75000,
    monthlyLimitUsed: 45000,
    monthlyLimitTotal: 200000,
    lastVisit: "Today, 18:24 PM",
    linkedBeneficiaries: 3,
    riskScore: "LOW",
  },
  {
    id: "CUST-1002",
    name: "Ramesh Kumar",
    mobile: "+91 97102 83746",
    email: "ramesh.k@domain.com",
    kycStatus: "VERIFIED",
    aadhaarStatus: "VERIFIED",
    totalTxns: 15,
    totalVolume: 42000,
    dailyLimitUsed: 8000,
    dailyLimitTotal: 75000,
    monthlyLimitUsed: 28000,
    monthlyLimitTotal: 200000,
    lastVisit: "Today, 18:10 PM",
    linkedBeneficiaries: 2,
    riskScore: "LOW",
  },
  {
    id: "CUST-1003",
    name: "Suresh Patel",
    mobile: "+91 94441 02938",
    email: "suresh.p@domain.com",
    kycStatus: "VERIFIED",
    aadhaarStatus: "VERIFIED",
    totalTxns: 32,
    totalVolume: 120000,
    dailyLimitUsed: 25000,
    dailyLimitTotal: 75000,
    monthlyLimitUsed: 110000,
    monthlyLimitTotal: 200000,
    lastVisit: "Yesterday",
    linkedBeneficiaries: 5,
    riskScore: "LOW",
  },
  {
    id: "CUST-1004",
    name: "Meena Sundaram",
    mobile: "+91 98840 11928",
    email: "meena.s@domain.com",
    kycStatus: "PENDING",
    aadhaarStatus: "PENDING",
    totalTxns: 4,
    totalVolume: 8500,
    dailyLimitUsed: 5000,
    dailyLimitTotal: 75000,
    monthlyLimitUsed: 8500,
    monthlyLimitTotal: 200000,
    lastVisit: "3 days ago",
    linkedBeneficiaries: 1,
    riskScore: "MEDIUM",
  },
];

export default function CustomersPage() {
  const router = useRouter();
  const { setSelectedCustomer } = useTransactionMemoryStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [slideOverOpen, setSlideOverOpen] = useState(false);

  const filteredCustomers = MOCK_CUSTOMERS.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.mobile.includes(searchTerm) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectCustomerForPayout = (cust: CustomerRecord) => {
    const formatted = {
      public_id: cust.id,
      customer_number: cust.id,
      first_name: cust.name.split(" ")[0],
      last_name: cust.name.split(" ")[1] || "",
      full_name: cust.name,
      mobile_number: cust.mobile.replace(/\D/g, "").slice(-10),
      kyc_status: cust.kycStatus,
    };
    setSelectedCustomer(formatted);
    router.push("/retailer/dmt");
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pb: 6 }}>
      {/* Header Banner */}
      <Paper
        elevation={0}
        sx={{
          p: 3.5,
          borderRadius: 4,
          background: "linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)",
          color: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Avatar sx={{ bgcolor: "#4ADE80", color: "#1E1B4B", width: 48, height: 48 }}>
            <PersonIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: "-0.5px" }}>
              Customer Master Directory
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85, fontWeight: 700 }}>
              Single Source of Truth for Customer Identification, eKYC & Limit Audits
            </Typography>
          </Box>
        </Stack>

        <Button
          variant="contained"
          size="large"
          startIcon={<PersonAddIcon />}
          onClick={() => setSlideOverOpen(true)}
          sx={{
            borderRadius: 3,
            fontWeight: 800,
            px: 3,
            py: 1.2,
            backgroundColor: "#22C55E",
            "&:hover": { backgroundColor: "#16A34A" },
          }}
        >
          + Add New Customer
        </Button>
      </Paper>

      {/* Search & Filter Bar */}
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3.5, border: "1px solid #E2E8F0", backgroundColor: "#FFFFFF" }}>
        <TextField
          fullWidth
          placeholder="Search Customer by Name, Mobile Number, or Customer ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#94A3B8" }} />
                </InputAdornment>
              ),
            },
          }}
        />
      </Paper>

      {/* Customer Directory Table */}
      <Paper elevation={0} sx={{ borderRadius: 4, border: "1px solid #E2E8F0", backgroundColor: "#FFFFFF", overflow: "hidden" }}>
        <Table>
          <TableHead sx={{ backgroundColor: "#F8FAFC" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>Customer Info</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Customer ID</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>KYC Status</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Monthly Limit Usage</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="center">Risk Profile</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredCustomers.map((cust) => (
              <TableRow key={cust.id} hover>
                <TableCell>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                    <Avatar sx={{ bgcolor: "#312E81", width: 38, height: 38, fontWeight: 800, fontSize: "0.9rem" }}>
                      {cust.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        {cust.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#64748B" }}>
                        {cust.mobile}
                      </Typography>
                    </Box>
                  </Stack>
                </TableCell>

                <TableCell>
                  <Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 800, color: "#475569" }}>
                    {cust.id}
                  </Typography>
                </TableCell>

                <TableCell>
                  <Stack direction="row" spacing={0.8} sx={{ alignItems: "center" }}>
                    <Chip
                      icon={<VerifiedIcon sx={{ fontSize: "16px !important", color: "#16A34A !important" }} />}
                      label={cust.kycStatus === "VERIFIED" ? "Aadhaar eKYC Verified" : "Pending"}
                      size="small"
                      sx={{
                        backgroundColor: cust.kycStatus === "VERIFIED" ? "#DCFCE7" : "#FEF3C7",
                        color: cust.kycStatus === "VERIFIED" ? "#15803D" : "#92400E",
                        fontWeight: 800,
                        fontSize: "0.72rem",
                      }}
                    />
                  </Stack>
                </TableCell>

                <TableCell sx={{ minWidth: 180 }}>
                  <Box>
                    <Stack direction="row" sx={{ justifyContent: "space-between", mb: 0.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "#475569" }}>
                        ₹{cust.monthlyLimitUsed.toLocaleString("en-IN")} / ₹{cust.monthlyLimitTotal.toLocaleString("en-IN")}
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: "#16A34A" }}>
                        {Math.round((cust.monthlyLimitUsed / cust.monthlyLimitTotal) * 100)}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={(cust.monthlyLimitUsed / cust.monthlyLimitTotal) * 100}
                      sx={{ height: 6, borderRadius: 3, bgcolor: "#E2E8F0" }}
                    />
                  </Box>
                </TableCell>

                <TableCell align="center">
                  <Chip
                    label={cust.riskScore}
                    size="small"
                    sx={{
                      fontWeight: 800,
                      fontSize: "0.7rem",
                      backgroundColor: cust.riskScore === "LOW" ? "#E0F2FE" : "#FEE2E2",
                      color: cust.riskScore === "LOW" ? "#0369A1" : "#991B1B",
                    }}
                  />
                </TableCell>

                <TableCell align="right">
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleSelectCustomerForPayout(cust)}
                    sx={{ borderRadius: 2, textTransform: "none", fontWeight: 800 }}
                  >
                    Use for Payout →
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Enterprise Customer Master Slide-Over Panel */}
      <CustomerMasterSlideOver
        open={slideOverOpen}
        onClose={() => setSlideOverOpen(false)}
        onSuccess={(newCust) => {
          handleSelectCustomerForPayout(newCust);
        }}
      />
    </Box>
  );
}
