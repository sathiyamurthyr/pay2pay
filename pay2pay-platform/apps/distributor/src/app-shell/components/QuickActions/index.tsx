import React from "react";
import { Chip, Stack } from "@mui/material";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import { tokens } from "@/design-system/tokens/design-tokens";

export const QuickActions: React.FC = () => (
  <Stack direction="row" spacing={1}>
    <Chip
      icon={<FlashOnIcon sx={{ fontSize: "14px !important", color: "#FFD54F !important" }} />}
      label="PROD Switch 100%"
      size="small"
      sx={{ bgcolor: tokens.colors.brand.primarySubtle, color: tokens.colors.brand.secondary, fontWeight: 800, fontSize: "11px" }}
    />
  </Stack>
);
