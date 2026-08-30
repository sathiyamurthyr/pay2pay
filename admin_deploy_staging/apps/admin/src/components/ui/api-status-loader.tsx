"use client";

import React, { useEffect, useState } from "react";
import { Box, Typography, CircularProgress, LinearProgress, Paper, Chip } from "@mui/material";
import { CheckCircle2, AlertCircle, ShieldCheck, Cpu } from "lucide-react";

export interface ApiStatusStep {
  label: string;
  sublabel?: string;
}

interface ApiStatusLoaderProps {
  isLoading: boolean;
  title?: string;
  steps?: ApiStatusStep[];
  error?: string | null;
  successMessage?: string | null;
}

const DEFAULT_GENERATE_STEPS: ApiStatusStep[] = [
  { label: "Connecting Cashfree eKYC Gateway...", sublabel: "Establishing secure SSL connection to Cashfree API" },
  { label: "Validating Wallet Balance (₹11.80)...", sublabel: "Debiting ₹10.00 (+ ₹1.80 GST) from Retailer Main Wallet" },
  { label: "Requesting UIDAI Aadhaar OTP Dispatch...", sublabel: "Sending SMS request to Aadhaar registered mobile" },
  { label: "OTP Dispatched Successfully!", sublabel: "Check your mobile phone for the 6-digit OTP code" },
];

export const ApiStatusLoader: React.FC<ApiStatusLoaderProps> = ({
  isLoading,
  title = "Cashfree Aadhaar eKYC Verification",
  steps = DEFAULT_GENERATE_STEPS,
  error,
  successMessage,
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setCurrentStepIdx(0);
      return;
    }
    const interval = setInterval(() => {
      setCurrentStepIdx((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1200);

    return () => clearInterval(interval);
  }, [isLoading, steps.length]);

  if (!isLoading && !error && !successMessage) return null;

  const currentStep = steps[currentStepIdx] || steps[0];
  const progressPercent = isLoading ? ((currentStepIdx + 1) / steps.length) * 100 : 100;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        my: 2,
        borderRadius: 3,
        bgcolor: error ? "#FEF2F2" : successMessage ? "#F0FDF4" : "#F8FAFC",
        border: "1px solid",
        borderColor: error ? "#FECACA" : successMessage ? "#BBF7D0" : "#E2E8F0",
        transition: "all 0.3s ease",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {isLoading && <CircularProgress size={22} thickness={5} sx={{ color: "#2563EB" }} />}
          {successMessage && <CheckCircle2 size={24} style={{ color: "#16A34A" }} />}
          {error && <AlertCircle size={24} style={{ color: "#DC2626" }} />}
          
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: error ? "#991B1B" : successMessage ? "#166534" : "#0F172A" }}>
              {isLoading ? title : successMessage ? "API Status: Verified" : "API Status: Error"}
            </Typography>
            {isLoading && (
              <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 500 }}>
                Live API Response: HTTP 200 IN-PROGRESS
              </Typography>
            )}
          </Box>
        </Box>

        <Chip
          icon={isLoading ? <Cpu size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
          label={isLoading ? `Step ${currentStepIdx + 1}/${steps.length}` : error ? "FAILED" : "SUCCESS"}
          size="small"
          sx={{
            fontWeight: 700,
            fontSize: "0.7rem",
            bgcolor: error ? "#FEE2E2" : successMessage ? "#DCFCE7" : "#EFF6FF",
            color: error ? "#991B1B" : successMessage ? "#15803D" : "#1D4ED8",
          }}
        />
      </Box>

      {isLoading && (
        <>
          <LinearProgress
            variant="determinate"
            value={progressPercent}
            sx={{
              height: 6,
              borderRadius: 3,
              mb: 1.5,
              bgcolor: "#E2E8F0",
              "& .MuiLinearProgress-bar": {
                borderRadius: 3,
                bgcolor: "#2563EB",
                transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              },
            }}
          />
          <Box sx={{ pl: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: "#1E293B" }}>
              {currentStep.label}
            </Typography>
            {currentStep.sublabel && (
              <Typography variant="caption" sx={{ color: "#64748B", display: "block", mt: 0.2 }}>
                {currentStep.sublabel}
              </Typography>
            )}
          </Box>
        </>
      )}

      {successMessage && (
        <Typography variant="body2" sx={{ color: "#15803D", fontWeight: 600, mt: 0.5 }}>
          {successMessage}
        </Typography>
      )}

      {error && (
        <Typography variant="body2" sx={{ color: "#B91C1C", fontWeight: 600, mt: 0.5 }}>
          {error}
        </Typography>
      )}
    </Paper>
  );
};
