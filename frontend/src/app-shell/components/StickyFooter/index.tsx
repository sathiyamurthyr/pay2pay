import React from "react";
import { Paper, Typography, Stack, Button, Chip } from "@mui/material";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

export interface StickyFooterProps {
  stepText?: string;
  onBack?: () => void;
  onContinue?: () => void;
}

export const StickyFooter: React.FC<StickyFooterProps> = ({
  stepText = "Step 1 of 6: Customer Search & Identification",
  onBack,
  onContinue,
}) => (
  <Paper
    elevation={0}
    sx={{
      height: 64, // Exact 64px height constraint
      px: 3, // 24px padding
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      bgcolor: "rgba(15, 23, 42, 0.95)",
      backdropFilter: "blur(20px)",
      borderTop: "1px solid rgba(255, 255, 255, 0.12)",
      width: "100%",
      position: "sticky",
      bottom: 0,
      zIndex: 1100,
    }}
  >
    {/* Left Zone: Previous Button */}
    <Button
      variant="outlined"
      startIcon={<ArrowBackIcon />}
      onClick={onBack}
      sx={{
        height: 44,
        borderRadius: "12px",
        px: 3,
        fontSize: "16px",
        fontWeight: 600,
        color: "#FFFFFF",
        borderColor: "rgba(255, 255, 255, 0.25)",
        bgcolor: "rgba(255, 255, 255, 0.05)",
        "&:hover": { bgcolor: "rgba(255, 255, 255, 0.12)", borderColor: "#60A5FA", transform: "translateY(-2px)" },
        "&:active": { transform: "scale(0.98)" },
        transition: "all 150ms ease",
      }}
    >
      Previous Step
    </Button>

    {/* Center Zone: Workflow Progress & Keyboard Shortcuts */}
    <Stack direction="row" spacing={3} sx={{ alignItems: "center" }}>
      <Typography sx={{ color: "#FFFFFF", fontWeight: 700, fontSize: "16px" }}>
        {stepText}
      </Typography>
      <Chip
        icon={<KeyboardIcon sx={{ "&&": { fontSize: 16, color: "#60A5FA" } }} />}
        label="Ctrl+Enter (Submit)"
        size="small"
        sx={{
          bgcolor: "rgba(255, 255, 255, 0.08)",
          color: "rgba(255, 255, 255, 0.90)",
          fontWeight: 700,
          fontSize: "13px",
          height: 28,
          border: "1px solid rgba(255, 255, 255, 0.12)",
        }}
      />
    </Stack>

    {/* Right Zone: Large Primary Action Button */}
    <Button
      variant="contained"
      endIcon={<ArrowForwardIcon />}
      onClick={onContinue}
      sx={{
        height: 44,
        borderRadius: "12px",
        px: 4,
        fontSize: "16px",
        fontWeight: 800,
        color: "#FFFFFF",
        bgcolor: "#2563EB",
        boxShadow: "0 4px 16px rgba(37, 99, 235, 0.4)",
        "&:hover": { bgcolor: "#1D4ED8", transform: "translateY(-2px)" },
        "&:active": { transform: "scale(0.98)" },
        transition: "all 150ms ease",
      }}
    >
      Continue to Transfer
    </Button>
  </Paper>
);
