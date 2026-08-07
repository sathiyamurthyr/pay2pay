import React, { useState } from "react";
import { Box, Stack, Button, TextField, CircularProgress } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import PersonAddIcon from "@mui/icons-material/PersonAdd";

export interface TransactionSearchProps {
  placeholder?: string;
  onSearch?: (val: string) => void;
  isSearching?: boolean;
}

export const TransactionSearch: React.FC<TransactionSearchProps> = ({
  placeholder = "Enter Customer Mobile / Account / Aadhaar (10 digits)...",
  onSearch,
  isSearching = false,
}) => {
  const [query, setQuery] = useState("");

  const handleTriggerSearch = () => {
    if (onSearch && query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleTriggerSearch();
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setQuery(text);
        if (onSearch) onSearch(text.trim());
      }
    } catch {}
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: "center",
        gap: 1.5,
        width: "100%",
        bgcolor: "rgba(18, 27, 48, 0.75)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        borderRadius: "16px",
        p: 1.5,
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25)",
      }}
    >
      <TextField
        fullWidth
        variant="outlined"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        slotProps={{
          input: {
            startAdornment: isSearching ? (
              <CircularProgress size={20} sx={{ color: "#60A5FA", mr: 1 }} />
            ) : (
              <SearchIcon
                onClick={handleTriggerSearch}
                sx={{ color: "#60A5FA", mr: 1, fontSize: 22, cursor: "pointer" }}
              />
            ),
            sx: {
              height: 48,
              fontSize: "15px",
              fontWeight: 600,
              color: "#FFFFFF",
              borderRadius: "12px",
              bgcolor: "rgba(8, 17, 31, 0.85)",
              "& fieldset": { borderColor: "rgba(255, 255, 255, 0.12)" },
              "&:hover fieldset": { borderColor: "#3B82F6" },
              "&.Mui-focused fieldset": { borderColor: "#2563EB", borderWidth: "2px" },
            },
          },
        }}
      />

      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexShrink: 0 }}>
        <Button
          variant="outlined"
          onClick={handleTriggerSearch}
          startIcon={<SearchIcon sx={{ fontSize: 20 }} />}
          sx={{
            height: 48,
            borderRadius: "12px",
            px: 2,
            fontSize: "14px",
            fontWeight: 700,
            color: "#FFFFFF",
            borderColor: "#2563EB",
            bgcolor: "#2563EB",
            "&:hover": { bgcolor: "#1D4ED8" },
            "&:active": { transform: "scale(0.98)" },
            transition: "all 150ms ease",
          }}
        >
          Search
        </Button>

        <Button
          variant="outlined"
          startIcon={<QrCodeScannerIcon sx={{ fontSize: 20 }} />}
          sx={{
            height: 48,
            borderRadius: "12px",
            px: 2,
            fontSize: "14px",
            fontWeight: 700,
            color: "#FFFFFF",
            borderColor: "rgba(255, 255, 255, 0.25)",
            bgcolor: "rgba(255, 255, 255, 0.05)",
            "&:hover": { bgcolor: "rgba(255, 255, 255, 0.12)", borderColor: "#60A5FA" },
            "&:active": { transform: "scale(0.98)" },
            transition: "all 150ms ease",
          }}
        >
          Scan QR
        </Button>

        <Button
          variant="outlined"
          onClick={handlePaste}
          startIcon={<ContentPasteIcon sx={{ fontSize: 20 }} />}
          sx={{
            height: 48,
            borderRadius: "12px",
            px: 2,
            fontSize: "14px",
            fontWeight: 700,
            color: "#FFFFFF",
            borderColor: "rgba(255, 255, 255, 0.25)",
            bgcolor: "rgba(255, 255, 255, 0.05)",
            "&:hover": { bgcolor: "rgba(255, 255, 255, 0.12)", borderColor: "#60A5FA" },
            "&:active": { transform: "scale(0.98)" },
            transition: "all 150ms ease",
          }}
        >
          Paste
        </Button>

        <Button
          variant="contained"
          startIcon={<PersonAddIcon sx={{ fontSize: 20 }} />}
          sx={{
            height: 48,
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
          }}
        >
          Register Customer
        </Button>
      </Stack>
    </Box>
  );
};
