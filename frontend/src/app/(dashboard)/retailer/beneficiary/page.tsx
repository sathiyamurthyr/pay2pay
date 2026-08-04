"use client";

import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Chip,
  Avatar,
  Stack,
  TextField,
  InputAdornment,
  Card,
  CardContent,
} from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import SearchIcon from "@mui/icons-material/Search";
import VerifiedIcon from "@mui/icons-material/Verified";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import ContactsIcon from "@mui/icons-material/Contacts";
import FlashOnIcon from "@mui/icons-material/FlashOn";

import { BeneficiaryMasterSlideOver } from "@/components/master/beneficiary-master-slide-over";
import { useTransactionMemoryStore } from "@/stores/use-transaction-memory-store";
import { useRouter } from "next/navigation";

interface BeneficiaryRecord {
  id: string;
  name: string;
  accountNumber: string;
  bankName: string;
  ifsc: string;
  verified: boolean;
  pennyDropStatus: string;
  lastTxnDate: string;
  lastTxnAmount: string;
}

const MOCK_BENEFICIARIES: BeneficiaryRecord[] = [
  {
    id: "BEN-101",
    name: "Kavitha Sharma",
    accountNumber: "50100998822",
    bankName: "HDFC Bank",
    ifsc: "HDFC0000128",
    verified: true,
    pennyDropStatus: "MATCHED",
    lastTxnDate: "02 Aug 2026",
    lastTxnAmount: "₹25,000",
  },
  {
    id: "BEN-102",
    name: "Suresh Patel",
    accountNumber: "30998811223",
    bankName: "State Bank of India",
    ifsc: "SBIN0001088",
    verified: true,
    pennyDropStatus: "MATCHED",
    lastTxnDate: "01 Aug 2026",
    lastTxnAmount: "₹10,000",
  },
  {
    id: "BEN-103",
    name: "Rajesh Kumar",
    accountNumber: "001105991823",
    bankName: "ICICI Bank",
    ifsc: "ICIC0000011",
    verified: true,
    pennyDropStatus: "MATCHED",
    lastTxnDate: "28 Jul 2026",
    lastTxnAmount: "₹15,000",
  },
];

export default function BeneficiaryPage() {
  const router = useRouter();
  const { setSelectedBeneficiary } = useTransactionMemoryStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [slideOverOpen, setSlideOverOpen] = useState(false);

  const filteredBeneficiaries = MOCK_BENEFICIARIES.filter(
    (b) =>
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.accountNumber.includes(searchTerm) ||
      b.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.ifsc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectBeneficiaryForPayout = (bene: BeneficiaryRecord) => {
    const formatted = {
      public_id: bene.id,
      beneficiary_id: bene.id,
      account_holder_name: bene.name,
      account_number: bene.accountNumber,
      ifsc_code: bene.ifsc,
      bank_name: bene.bankName,
      is_verified: bene.verified,
    };
    setSelectedBeneficiary(formatted);
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
          <Avatar sx={{ bgcolor: "#FDE047", color: "#1E1B4B", width: 48, height: 48 }}>
            <ContactsIcon sx={{ fontSize: 30 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: "-0.5px" }}>
              Beneficiary Master Directory
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85, fontWeight: 700 }}>
              Single Source of Truth Bank Account Master & Penny Drop Verification
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
          + Add New Beneficiary
        </Button>
      </Paper>

      {/* Search Bar */}
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3.5, border: "1px solid #E2E8F0", backgroundColor: "#FFFFFF" }}>
        <TextField
          fullWidth
          placeholder="Search Beneficiary by Name, Account Number, Bank, or IFSC..."
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

      {/* Beneficiary Grid Cards */}
      <Grid container spacing={2.5}>
        {filteredBeneficiaries.map((b) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={b.id}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 4,
                border: "1px solid #E2E8F0",
                transition: "all 0.2s ease",
                "&:hover": { boxShadow: "0 8px 24px rgba(30, 27, 75, 0.08)", borderColor: "#818CF8" },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                    <Avatar
                      src={`https://logo.clearbit.com/${b.bankName.toLowerCase().replace(/\s+/g, "")}.com`}
                      sx={{ width: 42, height: 42, bgcolor: "#312E81", fontWeight: 800 }}
                    >
                      {b.bankName.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#1E1B4B" }}>
                        {b.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700 }}>
                        {b.bankName}
                      </Typography>
                    </Box>
                  </Stack>

                  <Chip
                    icon={<VerifiedIcon sx={{ fontSize: "16px !important", color: "#16A34A !important" }} />}
                    label="Penny Drop Verified"
                    size="small"
                    sx={{ backgroundColor: "#DCFCE7", color: "#15803D", fontWeight: 800, fontSize: "0.68rem" }}
                  />
                </Stack>

                <Box sx={{ p: 1.5, borderRadius: 2.5, bgcolor: "#F8FAFC", mb: 2 }}>
                  <Stack direction="row" sx={{ justifyContent: "space-between", mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700 }}>
                      Account Number
                    </Typography>
                    <Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 800 }}>
                      ••••••••{b.accountNumber.slice(-4)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700 }}>
                      IFSC Code
                    </Typography>
                    <Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 800, color: "#312E81" }}>
                      {b.ifsc}
                    </Typography>
                  </Stack>
                </Box>

                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: "#94A3B8", display: "block" }}>
                      Last Transfer
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: "#16A34A" }}>
                      {b.lastTxnAmount} ({b.lastTxnDate})
                    </Typography>
                  </Box>

                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleSelectBeneficiaryForPayout(b)}
                    sx={{ borderRadius: 2.5, fontWeight: 800, textTransform: "none" }}
                  >
                    Select for Payout →
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Enterprise Beneficiary Master Slide-Over Panel */}
      <BeneficiaryMasterSlideOver
        open={slideOverOpen}
        onClose={() => setSlideOverOpen(false)}
        onSuccess={(newBene) => {
          handleSelectBeneficiaryForPayout(newBene);
        }}
      />
    </Box>
  );
}
