"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  TextField,
  InputAdornment,
  Box,
  Typography,
  Stack,
  Chip,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import DashboardIcon from "@mui/icons-material/Dashboard";
import SendIcon from "@mui/icons-material/Send";
import PersonIcon from "@mui/icons-material/Person";
import ContactsIcon from "@mui/icons-material/Contacts";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import QrCodeIcon from "@mui/icons-material/QrCode";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";

const SEARCH_ITEMS = [
  { label: "Dashboard", category: "Navigation", path: "/retailer-dashboard", icon: DashboardIcon },
  { label: "Money Transfer (DMT)", category: "Navigation", path: "/retailer/dmt", icon: SendIcon },
  { label: "Topup Request (Proof Upload)", category: "Wallet", path: "/retailer/topup-request", icon: CloudUploadIcon },
  { label: "Wallet & Balances", category: "Wallet", path: "/retailer/wallet", icon: AccountBalanceWalletIcon },
  { label: "Wallet Top-up", category: "Wallet", path: "/retailer/wallet-topup", icon: AccountBalanceWalletIcon },
  { label: "Wallet Ledger", category: "Wallet", path: "/retailer/wallet-ledger", icon: ReceiptLongIcon },
  { label: "Add New Customer", category: "Action", path: "/retailer/customers/new", icon: PersonIcon },
  { label: "Add New Beneficiary", category: "Action", path: "/retailer/beneficiary/new", icon: ContactsIcon },
  { label: "AEPS Cash Out", category: "Navigation", path: "/retailer/aeps", icon: FingerprintIcon },
  { label: "UPI Services", category: "Navigation", path: "/retailer/upi", icon: QrCodeIcon },
  { label: "Transactions Ledger", category: "Navigation", path: "/retailer/transactions", icon: ReceiptLongIcon },
  { label: "Customer Directory", category: "Navigation", path: "/retailer/customers", icon: PersonIcon },
  { label: "Beneficiary Directory", category: "Navigation", path: "/retailer/beneficiary", icon: ContactsIcon },
];

export const UniversalSearchDialog: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const router = useRouter();
  const { branding } = useCompanyBranding();
  const brandPrimary = branding?.primary_colour || "#059669";

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const filtered = SEARCH_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  // Reset query and selected index on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Ensure active keyboard-selected item is scrolled into view
  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex]);

  const handleSelect = useCallback(
    (path: string) => {
      onClose();
      router.push(path);
    },
    [onClose, router]
  );

  // Global keyboard shortcuts (Ctrl+K to toggle, Escape to close)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) {
          onClose();
        }
      } else if (e.key === "Escape" && open) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [open, onClose]);

  // Keyboard navigation inside the search dialog
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filtered.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % filtered.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filtered.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered.length > 0 && filtered[selectedIndex]) {
        handleSelect(filtered[selectedIndex].path);
      }
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(4px)",
          },
        },
        paper: {
          elevation: 12,
          sx: {
            borderRadius: "16px",
            overflow: "hidden",
            bgcolor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
            m: { xs: 2, sm: "auto" },
            width: { xs: "calc(100% - 32px)", sm: "560px" },
          },
        },
      }}
    >
      {/* ── Search Input Container ────────────────────────────────── */}
      <Box sx={{ p: 2, pb: 1.5, bgcolor: "#FFFFFF" }}>
        <TextField
          autoFocus
          fullWidth
          placeholder="Universal Search across Customers, Beneficiaries, Services..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleInputKeyDown}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start" sx={{ mr: 1 }}>
                  <SearchIcon sx={{ color: brandPrimary, fontSize: 22 }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  {query ? (
                    <Box
                      component="button"
                      type="button"
                      onClick={() => setQuery("")}
                      sx={{
                        mr: 1,
                        p: 0.5,
                        border: "none",
                        bgcolor: "transparent",
                        cursor: "pointer",
                        color: "#94A3B8",
                        display: "flex",
                        alignItems: "center",
                        borderRadius: "4px",
                        "&:hover": { color: "#64748B", bgcolor: "#F1F5F9" },
                      }}
                      aria-label="Clear search"
                    >
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </Box>
                  ) : null}
                  <Box
                    onClick={onClose}
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.6,
                      px: 0.85,
                      py: 0.35,
                      bgcolor: "#F8FAFC",
                      border: "1px solid #CBD5E1",
                      borderRadius: "6px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      "&:hover": {
                        bgcolor: "#F1F5F9",
                        borderColor: "#94A3B8",
                      },
                    }}
                    title="Press Escape to close"
                  >
                    <Typography
                      component="span"
                      sx={{
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        fontFamily: "monospace",
                        color: "#334155",
                        letterSpacing: "0.02em",
                      }}
                    >
                      ESC
                    </Typography>
                    <Typography
                      component="span"
                      sx={{
                        fontSize: "0.65rem",
                        fontWeight: 500,
                        color: "#64748B",
                        display: { xs: "none", sm: "inline" },
                      }}
                    >
                      to close
                    </Typography>
                  </Box>
                </InputAdornment>
              ),
            },
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "12px",
              bgcolor: "#F8FAFC",
              transition: "all 0.2s ease-in-out",
              "& fieldset": {
                borderColor: "#E2E8F0",
                borderWidth: "1px",
              },
              "&:hover fieldset": {
                borderColor: "#CBD5E1",
              },
              "&.Mui-focused": {
                bgcolor: "#FFFFFF",
                "& fieldset": {
                  borderColor: brandPrimary,
                  borderWidth: "1.5px",
                  boxShadow: `0 0 0 3px ${brandPrimary}1F`,
                },
              },
              "& input": {
                py: 1.25,
                fontSize: "0.925rem",
                fontWeight: 500,
                color: "#0F172A",
                "&::placeholder": {
                  color: "#94A3B8",
                  opacity: 1,
                  fontSize: "0.875rem",
                },
              },
            },
          }}
        />
      </Box>

      <Divider sx={{ borderColor: "#F1F5F9" }} />

      {/* ── Search Results List ───────────────────────────────────── */}
      <DialogContent
        sx={{
          p: 1.5,
          pb: 1.5,
          maxHeight: { xs: 320, sm: 380 },
          scrollPaddingBottom: "8px",
          "&::-webkit-scrollbar": {
            width: "6px",
          },
          "&::-webkit-scrollbar-track": {
            background: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "#E2E8F0",
            borderRadius: "4px",
          },
          "&::-webkit-scrollbar-thumb:hover": {
            background: "#CBD5E1",
          },
        }}
      >
        {filtered.length === 0 ? (
          <Box sx={{ py: 5, px: 3, textAlign: "center" }}>
            <SearchIcon sx={{ fontSize: 36, color: "#CBD5E1", mb: 1 }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569" }}>
              No matching results found
            </Typography>
            <Typography variant="caption" sx={{ color: "#94A3B8", mt: 0.5, display: "block" }}>
              No navigation modules or actions match "{query}".
            </Typography>
          </Box>
        ) : (
          <List disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            {filtered.map((item, idx) => {
              const IconComp = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <ListItemButton
                  key={idx}
                  ref={(el) => {
                    itemRefs.current[idx] = el;
                  }}
                  onClick={() => handleSelect(item.path)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  sx={{
                    borderRadius: "10px",
                    py: 0.85,
                    px: 1.5,
                    transition: "all 0.15s ease",
                    bgcolor: isSelected ? `${brandPrimary}12` : "transparent",
                    border: isSelected ? `1px solid ${brandPrimary}4D` : "1px solid transparent",
                    "&:hover": {
                      bgcolor: isSelected ? `${brandPrimary}1A` : "rgba(241, 245, 249, 0.8)",
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 38 }}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: isSelected ? `${brandPrimary}1F` : "#F1F5F9",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <IconComp
                        sx={{
                          fontSize: 18,
                          color: isSelected ? brandPrimary : "#64748B",
                          transition: "color 0.15s ease",
                        }}
                      />
                    </Box>
                  </ListItemIcon>
                  <ListItemText
                    sx={{ my: 0 }}
                    primary={
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.875rem",
                          color: isSelected ? "#0F172A" : "#1E293B",
                          lineHeight: 1.3,
                        }}
                      >
                        {item.label}
                      </Typography>
                    }
                    secondary={
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: "0.725rem",
                          fontWeight: 500,
                          color: isSelected ? brandPrimary : "#64748B",
                          lineHeight: 1.2,
                        }}
                      >
                        {item.category}
                      </Typography>
                    }
                  />
                  <Chip
                    label={
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <span>Jump</span>
                        <span style={{ fontSize: "0.8rem", lineHeight: 1 }}>→</span>
                      </Stack>
                    }
                    size="small"
                    sx={{
                      height: 24,
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      bgcolor: isSelected ? brandPrimary : "#F8FAFC",
                      color: isSelected ? "#FFFFFF" : "#64748B",
                      border: isSelected ? `1px solid ${brandPrimary}` : "1px solid #E2E8F0",
                      borderRadius: "6px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      "& .MuiChip-label": {
                        px: 1,
                      },
                    }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        )}
      </DialogContent>

      <Divider sx={{ borderColor: "#F1F5F9" }} />

      {/* ── Command Palette Footer ────────────────────────────────── */}
      <Box
        sx={{
          px: 2,
          py: 1,
          bgcolor: "#F8FAFC",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Box
              sx={{
                px: 0.6,
                py: 0.15,
                bgcolor: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: "4px",
                fontSize: "0.65rem",
                fontWeight: 700,
                color: "#475569",
              }}
            >
              ↑↓
            </Box>
            <Typography variant="caption" sx={{ color: "#64748B", fontSize: "0.7rem", fontWeight: 500 }}>
              Navigate
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Box
              sx={{
                px: 0.6,
                py: 0.15,
                bgcolor: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: "4px",
                fontSize: "0.65rem",
                fontWeight: 700,
                color: "#475569",
              }}
            >
              ↵
            </Box>
            <Typography variant="caption" sx={{ color: "#64748B", fontSize: "0.7rem", fontWeight: 500 }}>
              Open
            </Typography>
          </Stack>
        </Stack>
        <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "0.7rem", fontWeight: 500 }}>
          {filtered.length} {filtered.length === 1 ? "item" : "items"}
        </Typography>
      </Box>
    </Dialog>
  );
};
