"use client";

import React, { useState, useEffect } from "react";
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
import DashboardIcon from "@mui/icons-material/Dashboard";
import SendIcon from "@mui/icons-material/Send";
import PersonIcon from "@mui/icons-material/Person";
import ContactsIcon from "@mui/icons-material/Contacts";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import QrCodeIcon from "@mui/icons-material/QrCode";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";

const SEARCH_ITEMS = [
  { label: "Dashboard", category: "Navigation", path: "/retailer-dashboard", icon: DashboardIcon },
  { label: "Money Transfer (DMT)", category: "Navigation", path: "/retailer/dmt", icon: SendIcon },
  { label: "Add New Customer", category: "Action", path: "/retailer/customers/new", icon: PersonIcon },
  { label: "Add New Beneficiary", category: "Action", path: "/retailer/beneficiary/new", icon: ContactsIcon },
  { label: "Wallet & Top-Up", category: "Navigation", path: "/retailer/wallet", icon: AccountBalanceWalletIcon },
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
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const filtered = SEARCH_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (path: string) => {
    onClose();
    router.push(path);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { borderRadius: 4, p: 1 } } }}>
      <Box sx={{ p: 1.5 }}>
        <TextField
          autoFocus
          fullWidth
          placeholder="Universal Search across Customers, Beneficiaries, Services... (Ctrl+K)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#0284C7" }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Chip label="ESC to close" size="small" sx={{ fontSize: "0.65rem", fontWeight: 700 }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 3,
              bgcolor: "#F8FAFC",
            },
          }}
        />
      </Box>

      <Divider />

      <DialogContent sx={{ p: 1, maxHeight: 380 }}>
        {filtered.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="body2" sx={{ color: "#64748B" }}>
              No matching modules or customers found for "{query}".
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {filtered.map((item, idx) => {
              const IconComp = item.icon;
              return (
                <ListItemButton
                  key={idx}
                  onClick={() => handleSelect(item.path)}
                  sx={{ borderRadius: 2.5, my: 0.5, py: 1.25 }}
                >
                  <ListItemIcon sx={{ minWidth: 38 }}>
                    <IconComp sx={{ color: "#0284C7" }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={<Typography variant="body2" sx={{ fontWeight: 800, color: "#0F172A" }}>{item.label}</Typography>}
                    secondary={<Typography variant="caption" sx={{ color: "#64748B" }}>{item.category}</Typography>}
                  />
                  <Chip label="Jump →" size="small" sx={{ fontSize: "0.65rem", fontWeight: 800, bgcolor: "#F1F5F9" }} />
                </ListItemButton>
              );
            })}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};
