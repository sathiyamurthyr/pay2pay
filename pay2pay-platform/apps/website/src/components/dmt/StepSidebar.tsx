"use client";

import React from "react";
import { Box, Paper, Typography, Stack } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import PersonIcon from "@mui/icons-material/Person";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import RateReviewIcon from "@mui/icons-material/RateReview";
import LockIcon from "@mui/icons-material/Lock";
import ReceiptIcon from "@mui/icons-material/Receipt";

export interface StepSidebarProps {
  activeStep: number;
}

const WIZARD_STEPS = [
  { step: 1, label: "Customer Identification", icon: PersonIcon },
  { step: 2, label: "Select Beneficiary", icon: AccountBalanceIcon },
  { step: 3, label: "Transfer Amount", icon: CurrencyRupeeIcon },
  { step: 4, label: "Review Summary", icon: RateReviewIcon },
  { step: 5, label: "Security MPIN", icon: LockIcon },
  { step: 6, label: "Receipt Dispatch", icon: ReceiptIcon },
];

export function StepSidebar({ activeStep = 1 }: StepSidebarProps) {
  return (
    <Box
      component="aside"
      aria-label="Wizard Steps Progress"
      sx={{
        width: { xs: "100%", lg: 250 },
        flexShrink: 0,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: "18px",
          bgcolor: "#FFFFFF",
          border: "1px solid #e7e2d4",
          boxShadow: "0 4px 20px rgba(11, 19, 48, 0.04)",
        }}
      >
        <Typography variant="caption" sx={{ color: "#6b7290", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.8px", display: "block", mb: 2 }}>
          TRANSFER WIZARD
        </Typography>

        <Stack spacing={1.5} sx={{ position: "relative" }}>
          {WIZARD_STEPS.map((st) => {
            const isActive = activeStep === st.step;
            const isCompleted = activeStep > st.step;
            const IconComp = st.icon;

            return (
              <Paper
                key={st.step}
                elevation={0}
                aria-current={isActive ? "step" : undefined}
                sx={{
                  p: 1.5,
                  borderRadius: "12px",
                  bgcolor: isActive ? "#7a1329" : "#FFFFFF",
                  color: isActive ? "#FFFFFF" : "#1c2340",
                  border: isActive ? "1px solid #7a1329" : "1px solid #e7e2d4",
                  transition: "all 0.2s ease",
                  boxShadow: isActive ? "0 4px 14px rgba(122, 19, 41, 0.25)" : "none",
                }}
              >
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      bgcolor: isActive ? "#d4af37" : isCompleted ? "#1e8e5a" : "#f6f2e9",
                      color: isActive ? "#5e0f22" : isCompleted ? "#FFFFFF" : "#6b7290",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isCompleted ? <CheckIcon sx={{ fontSize: 16 }} /> : <IconComp sx={{ fontSize: 16 }} />}
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: isActive ? "#f0d98c" : "#6b7290",
                        fontSize: "10px",
                        fontWeight: 700,
                        display: "block",
                        lineHeight: 1,
                      }}
                    >
                      STEP 0{st.step}
                    </Typography>
                    <Typography
                      variant="subtitle2"
                      noWrap
                      sx={{
                        fontWeight: isActive ? 800 : 600,
                        fontSize: "13px",
                        lineHeight: 1.2,
                        color: isActive ? "#FFFFFF" : "#1c2340",
                      }}
                    >
                      {st.label}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      </Paper>
    </Box>
  );
}
