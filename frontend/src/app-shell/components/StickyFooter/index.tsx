import React from "react";
import { Paper, Box, Typography, Stack } from "@mui/material";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import { Button } from "@/design-system/components";
import { tokens } from "@/design-system/tokens/design-tokens";

export interface StickyFooterProps {
  leftAction?: React.ReactNode;
  contextText?: string;
  rightAction?: React.ReactNode;
}

export const StickyFooter: React.FC<StickyFooterProps> = ({
  leftAction = <Button variant="outlined" color="primary">← Back</Button>,
  contextText = "Step 1 of 6: Customer Search & Identification",
  rightAction = <Button variant="contained" color="primary">Continue to Transfer →</Button>,
}) => (
  <Paper
    elevation={0}
    sx={{
      height: 64,
      px: 3,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      bgcolor: "rgba(15, 23, 42, 0.9)",
      backdropFilter: "blur(20px)",
      borderTop: `1px solid ${tokens.colors.neutral.dark.border}`,
      position: "sticky",
      bottom: 0,
      zIndex: 1100,
    }}
  >
    {/* Left Zone: Previous Action */}
    <Box>{leftAction}</Box>

    {/* Center Zone: Workflow Context & Shortcuts */}
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
      <Typography variant="body2" sx={{ color: tokens.colors.neutral.dark.textSecondary, fontWeight: 600 }}>
        {contextText}
      </Typography>
      <Stack direction="row" spacing={0.5} sx={{ bgcolor: tokens.colors.neutral.dark.surface, px: 1, py: 0.3, borderRadius: tokens.radii.xs, alignItems: "center" }}>
        <KeyboardIcon sx={{ fontSize: 14, color: tokens.colors.neutral.dark.textMuted }} />
        <Typography variant="caption" sx={{ color: tokens.colors.neutral.dark.textMuted, fontWeight: 700, fontSize: "10px" }}>
          Ctrl+Enter (Fast Submit)
        </Typography>
      </Stack>
    </Stack>

    {/* Right Zone: Primary Action */}
    <Box>{rightAction}</Box>
  </Paper>
);
