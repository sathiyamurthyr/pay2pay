import React, { useState, useMemo } from "react";
import { Box, Typography, Stack, Paper, Skeleton, Button } from "@mui/material";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import PersonAddIcon from "@mui/icons-material/PersonAdd";

import { BeneficiaryData } from "../../hooks/useBeneficiary";
import { CustomerData } from "../../hooks/useCustomer";
import { BeneficiarySummary } from "./BeneficiarySummary";
import { BeneficiaryToolbar } from "./BeneficiaryToolbar";
import { RecentBeneficiaryList } from "./RecentBeneficiaryList";
import { FavouriteBeneficiaryList } from "./FavouriteBeneficiaryList";
import { BeneficiaryDataGrid } from "./BeneficiaryDataGrid";
import { BeneficiaryDrawer } from "./BeneficiaryDrawer";

export interface EnterpriseBeneficiaryModuleProps {
  customer: CustomerData | null;
  beneficiaries: BeneficiaryData[];
  selectedBeneficiary: BeneficiaryData | null;
  onSelectBeneficiary: (ben: BeneficiaryData) => void;
  isLoading?: boolean;
  onAddBeneficiary?: () => void;
}

export const EnterpriseBeneficiaryModule: React.FC<EnterpriseBeneficiaryModuleProps> = ({
  customer,
  beneficiaries,
  selectedBeneficiary,
  onSelectBeneficiary,
  isLoading = false,
  onAddBeneficiary,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerBeneficiary, setDrawerBeneficiary] = useState<BeneficiaryData | null>(null);

  // Client-side filtering logic over the fetched beneficiaries
  const filteredBeneficiaries = useMemo(() => {
    return beneficiaries.filter((b) => {
      // 1. Search Query filter (Name, Account Number, Mobile, IFSC, Code)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = b.name.toLowerCase().includes(q);
        const matchesAcc = b.accountNumber.toLowerCase().includes(q);
        const matchesCode = b.beneficiaryCode?.toLowerCase().includes(q) || false;
        const matchesIfsc = b.ifsc.toLowerCase().includes(q);
        if (!matchesName && !matchesAcc && !matchesCode && !matchesIfsc) {
          return false;
        }
      }

      // 2. Chip Filter logic
      if (activeFilter === "favourite") return b.isFavorite;
      if (activeFilter === "recent") return true;
      if (activeFilter === "verified") return b.isVerified;
      if (activeFilter === "family") return b.relationship?.toLowerCase().includes("family") || b.relationship?.toLowerCase().includes("self") || b.relationship?.toLowerCase().includes("spouse");
      if (activeFilter === "business") return b.relationship?.toLowerCase().includes("business") || b.relationship?.toLowerCase().includes("vendor") || b.relationship?.toLowerCase().includes("partner");
      if (activeFilter === "hdfc") return b.bankName.toLowerCase().includes("hdfc");
      if (activeFilter === "icici") return b.bankName.toLowerCase().includes("icici");
      if (activeFilter === "sbi") return b.bankName.toLowerCase().includes("sbi") || b.bankName.toLowerCase().includes("state bank");
      if (activeFilter === "axis") return b.bankName.toLowerCase().includes("axis");

      return true;
    });
  }, [beneficiaries, searchQuery, activeFilter]);

  const handleOpenDrawer = (ben: BeneficiaryData) => {
    setDrawerBeneficiary(ben);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setDrawerBeneficiary(null);
  };

  return (
    <Stack spacing={2.5} sx={{ width: "100%" }}>
      {/* 1. SECTION 11: COMPACT CUSTOMER SUMMARY CARD */}
      <BeneficiarySummary customer={customer} />

      {/* 2. SECTION 4 & 5: UNIVERSAL SEARCH TOOLBAR & ONE-CLICK CHIP FILTERS */}
      <BeneficiaryToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onAddBeneficiary={onAddBeneficiary}
      />

      {/* 3. SECTION 1: 5 MOST RECENTLY USED HORIZONTAL LIST */}
      <RecentBeneficiaryList
        beneficiaries={beneficiaries}
        selectedBeneficiary={selectedBeneficiary}
        onSelect={onSelectBeneficiary}
      />

      {/* 4. SECTION 2: PINNED FAVOURITES HORIZONTAL STRIP */}
      <FavouriteBeneficiaryList
        beneficiaries={beneficiaries}
        selectedBeneficiary={selectedBeneficiary}
        onSelect={onSelectBeneficiary}
      />

      {/* 5. SECTION 3 & 8: ENTERPRISE VIRTUALIZED DATA GRID */}
      {isLoading ? (
        <Box sx={{ p: 2 }}>
          {[1, 2, 3, 4].map((idx) => (
            <Skeleton key={idx} variant="rounded" height={52} sx={{ mb: 1.5, borderRadius: "12px", bgcolor: "rgba(18, 27, 48, 0.5)" }} />
          ))}
        </Box>
      ) : filteredBeneficiaries.length === 0 ? (
        /* SECTION 10: CLEAN ZERO-RECORD EMPTY STATE */
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: "center",
            borderRadius: "16px",
            bgcolor: "rgba(18, 27, 48, 0.75)",
            backdropFilter: "blur(20px)",
            border: "1px dashed rgba(255, 255, 255, 0.2)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AccountBalanceIcon sx={{ color: "rgba(255, 255, 255, 0.3)", fontSize: 48, mb: 1.5 }} />
          <Typography sx={{ color: "#FFFFFF", fontWeight: 700, fontSize: "18px", mb: 0.5 }}>
            No Beneficiaries Found
          </Typography>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.70)", fontSize: "14px", mb: 2.5 }}>
            This customer has no matching beneficiary records.
          </Typography>
          <Button
            variant="contained"
            onClick={onAddBeneficiary}
            startIcon={<PersonAddIcon sx={{ fontSize: 18 }} />}
            sx={{
              height: 44,
              borderRadius: "12px",
              px: 3,
              fontSize: "15px",
              fontWeight: 700,
              color: "#FFFFFF",
              bgcolor: "#2563EB",
              boxShadow: "0 4px 16px rgba(37, 99, 235, 0.4)",
              "&:hover": { bgcolor: "#1D4ED8" },
            }}
          >
            + Add Beneficiary
          </Button>
        </Paper>
      ) : (
        <BeneficiaryDataGrid
          beneficiaries={filteredBeneficiaries}
          selectedBeneficiary={selectedBeneficiary}
          onSelect={onSelectBeneficiary}
          onOpenDrawer={handleOpenDrawer}
        />
      )}

      {/* 6. SECTION 6: ENTERPRISE RIGHT DRAWER */}
      <BeneficiaryDrawer
        open={drawerOpen}
        beneficiary={drawerBeneficiary}
        onClose={handleCloseDrawer}
        onSelectForTransfer={onSelectBeneficiary}
      />
    </Stack>
  );
};
