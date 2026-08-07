"use client";

import React from "react";
import { Box, Paper, Typography, Stack, Button, Chip } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

export interface WizardFooterProps {
  activeStep: number;
  totalSteps?: number;
  canContinue: boolean;
  onPrevious: () => void;
  onContinue: () => void;
}

export function WizardFooter({
  activeStep = 1,
  totalSteps = 6,
  canContinue = false,
  onPrevious,
  onContinue,
}: WizardFooterProps) {
  return (
    <Paper
      elevation={0}
      component="footer"
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 72,
        bgcolor: "#101a3d",
        background: "linear-gradient(135deg, #101a3d 0%, #0b1330 100%)",
        borderTop: "1px solid rgba(231, 226, 212, 0.15)",
        zIndex: 1100,
        px: 3,
        display: "flex",
        alignItems: "center",
      }}
    >
      <Box sx={{ maxWidth: 1440, width: "100%", mx: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* PREVIOUS BUTTON */}
        <Button
          variant="text"
          disabled={activeStep <= 1}
          onClick={onPrevious}
          startIcon={<ArrowBackIcon />}
          aria-label="Previous / Go Back"
          sx={{
            color: "rgba(255, 255, 255, 0.85)",
            fontWeight: 700,
            textTransform: "none",
            fontSize: "14px",
            "&.Mui-disabled": { color: "rgba(255, 255, 255, 0.3)" },
          }}
        >
          Previous / Go Back
        </Button>

        {/* STEP INDICATOR */}
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", display: { xs: "none", sm: "flex" } }}>
          <Typography variant="caption" sx={{ color: "#a8adc4", fontWeight: 700, fontSize: "12px" }}>
            Step {activeStep} of {totalSteps}
          </Typography>
          <Stack direction="row" spacing={0.6}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <Box
                key={i}
                sx={{
                  width: i + 1 === activeStep ? 16 : 6,
                  height: 6,
                  borderRadius: "3px",
                  bgcolor: i + 1 === activeStep ? "#d4af37" : i + 1 < activeStep ? "#1e8e5a" : "rgba(255,255,255,0.2)",
                  transition: "all 0.3s ease",
                }}
              />
            ))}
          </Stack>
          <Chip label="Customer Identification" size="small" sx={{ height: 20, fontSize: "11px", fontWeight: 700, bgcolor: "rgba(212,175,55,0.15)", color: "#f0d98c" }} />
        </Stack>

        {/* CONTINUE CTA */}
        <Button
          variant="contained"
          disabled={!canContinue}
          onClick={onContinue}
          endIcon={<ArrowForwardIcon />}
          aria-label="Continue to Beneficiary / Next Step"
          sx={{
            background: "linear-gradient(135deg, #7a1329 0%, #5e0f22 100%)",
            color: "#FFFFFF",
            fontWeight: 800,
            px: 3,
            py: 1,
            borderRadius: "12px",
            textTransform: "none",
            fontSize: "14px",
            border: "1px solid #d4af37",
            boxShadow: "0 4px 14px rgba(122, 19, 41, 0.3)",
            "&:hover": { background: "#5e0f22" },
            "&.Mui-disabled": { bgcolor: "rgba(255, 255, 255, 0.12)", color: "rgba(255, 255, 255, 0.3)", border: "none" },
          }}
        >
          Continue to Beneficiary →
        </Button>
      </Box>
    </Paper>
  );
}
