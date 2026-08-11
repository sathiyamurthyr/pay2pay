import React from "react";
import { Box, Typography, Stack } from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { tokens } from "@/design-system/tokens/design-tokens";

export const Breadcrumb: React.FC<{ items?: string[] }> = ({ items = ["Home", "Retailer", "Money Transfer"] }) => (
  <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
    {items.map((item, idx) => (
      <React.Fragment key={item}>
        {idx > 0 && <ChevronRightIcon sx={{ fontSize: 14, color: tokens.colors.neutral.dark.textMuted }} />}
        <Typography
          variant="caption"
          sx={{
            color: idx === items.length - 1 ? tokens.colors.neutral.dark.textPrimary : tokens.colors.neutral.dark.textSecondary,
            fontWeight: idx === items.length - 1 ? 700 : 500,
          }}
        >
          {item}
        </Typography>
      </React.Fragment>
    ))}
  </Stack>
);
