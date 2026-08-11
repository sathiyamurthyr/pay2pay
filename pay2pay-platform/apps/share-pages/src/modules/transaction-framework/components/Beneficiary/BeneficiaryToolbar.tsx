import React, { useState, useEffect } from "react";
import { Box, Stack, TextField, InputAdornment, Chip, Button } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PersonAddIcon from "@mui/icons-material/PersonAdd";

export interface BeneficiaryToolbarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onAddBeneficiary?: () => void;
}

export const BeneficiaryToolbar: React.FC<BeneficiaryToolbarProps> = ({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  onAddBeneficiary,
}) => {
  const [localQuery, setLocalQuery] = useState(searchQuery);

  // 300ms Debounce Handler for Universal Search
  useEffect(() => {
    const handler = setTimeout(() => {
      onSearchChange(localQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [localQuery, onSearchChange]);

  const filterChips = [
    { id: "all", label: "All" },
    { id: "favourite", label: "Favourite ⭐" },
    { id: "recent", label: "Recent 🕒" },
    { id: "verified", label: "Verified 🟢" },
    { id: "family", label: "Family 👨‍👩‍👧" },
    { id: "business", label: "Business 💼" },
    { id: "hdfc", label: "HDFC" },
    { id: "icici", label: "ICICI" },
    { id: "sbi", label: "SBI" },
    { id: "axis", label: "Axis" },
  ];

  return (
    <Stack spacing={1.5} sx={{ width: "100%" }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "space-between", width: "100%" }}>
        {/* Search Bar (Name, Account, Mobile, Nickname, Code) */}
        <TextField
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          placeholder="Universal Beneficiary Search (Name, Account, Mobile, IFSC, Code)..."
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#60A5FA", fontSize: 20 }} />
                </InputAdornment>
              ),
              sx: {
                height: 44,
                fontSize: "14px",
                fontWeight: 600,
                color: "#FFFFFF",
                borderRadius: "12px",
                bgcolor: "rgba(8, 17, 31, 0.85)",
                "& fieldset": { borderColor: "rgba(255, 255, 255, 0.12)" },
                "&:hover fieldset": { borderColor: "#3B82F6" },
              },
            },
          }}
          sx={{ flex: 1 }}
        />

        {/* Add Beneficiary Action Button */}
        <Button
          variant="contained"
          onClick={onAddBeneficiary}
          startIcon={<PersonAddIcon sx={{ fontSize: 18 }} />}
          sx={{
            height: 44,
            borderRadius: "12px",
            px: 2.5,
            fontSize: "14px",
            fontWeight: 700,
            color: "#FFFFFF",
            bgcolor: "#2563EB",
            boxShadow: "0 4px 16px rgba(37, 99, 235, 0.4)",
            "&:hover": { bgcolor: "#1D4ED8" },
            "&:active": { transform: "scale(0.98)" },
            transition: "all 150ms ease",
            whiteSpace: "nowrap",
          }}
        >
          + Add Beneficiary
        </Button>
      </Stack>

      {/* One-Click Chip Filters */}
      <Stack direction="row" spacing={1} sx={{ overflowX: "auto", py: 0.5, "&::-webkit-scrollbar": { display: "none" } }}>
        {filterChips.map((chip) => {
          const isActive = activeFilter === chip.id;
          return (
            <Chip
              key={chip.id}
              label={chip.label}
              onClick={() => onFilterChange(chip.id)}
              sx={{
                height: 32,
                px: 1.5,
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: isActive ? 800 : 600,
                bgcolor: isActive ? "#2563EB" : "rgba(255, 255, 255, 0.05)",
                color: isActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.80)",
                border: isActive ? "1px solid #3B82F6" : "1px solid rgba(255, 255, 255, 0.10)",
                cursor: "pointer",
                "&:hover": { bgcolor: isActive ? "#1D4ED8" : "rgba(255, 255, 255, 0.12)" },
                transition: "all 150ms ease",
              }}
            />
          );
        })}
      </Stack>
    </Stack>
  );
};
