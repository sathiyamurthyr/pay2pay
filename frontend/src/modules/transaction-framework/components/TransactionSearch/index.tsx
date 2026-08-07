import React from "react";
import { Box, Stack, Chip, Button } from "@mui/material";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import { SearchInput } from "@/design-system/components";
import { tokens } from "@/design-system/tokens/design-tokens";

export interface TransactionSearchProps {
  placeholder?: string;
  onSearch?: (val: string) => void;
}

export const TransactionSearch: React.FC<TransactionSearchProps> = ({
  placeholder = "Enter Customer Mobile Number (10 digits)...",
}) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: { xs: "1fr", md: "1fr auto" },
      gap: 2,
      width: "100%",
      alignItems: "center",
    }}
  >
    <SearchInput placeholder={placeholder} />
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      <Button variant="outlined" startIcon={<QrCodeScannerIcon />} sx={{ borderRadius: tokens.radii.md }}>
        Scan QR
      </Button>
      <Button variant="outlined" startIcon={<ContentPasteIcon />} sx={{ borderRadius: tokens.radii.md }}>
        Paste
      </Button>
      <Button variant="contained" startIcon={<PersonAddIcon />} sx={{ borderRadius: tokens.radii.md }}>
        Register
      </Button>
    </Stack>
  </Box>
);
