"use client";

import React from "react";
import { Box, Paper, Typography, Stack, Chip, Avatar, Button } from "@mui/material";
import VerifiedIcon from "@mui/icons-material/Verified";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ShieldIcon from "@mui/icons-material/Shield";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import { Customer } from "@/types/dmt";
import { formatDate } from "@/lib/format";
import { useRouter } from "next/navigation";

export interface CustomerResultCardProps {
  customer: Customer;
  onChangeCustomer: () => void;
  /** Current page path to use as return destination after Aadhaar verification */
  returnTo?: string;
}

export function CustomerResultCard({ customer, onChangeCustomer, returnTo }: CustomerResultCardProps) {
  const aadhaarVerified = Boolean(
    customer.aadhaarVerified ||
    customer.aadhaarVerificationStatus === "VERIFIED" ||
    (customer as any).aadhaar_verified ||
    (customer as any).aadhaar_verification_status === "VERIFIED" ||
    (customer as any).aadhaar_status === "VERIFIED" ||
    (customer as any).kyc_status === "VERIFIED" ||
    (customer as any).kyc_status === "APPROVED" ||
    (customer as any).kycStatus === "VERIFIED" ||
    customer.kycStatus === "VERIFIED" ||
    (customer as any).kyc_level === "FULL_KYC" ||
    (customer as any).kycLevel === "FULL_KYC"
  );

  const handleVerifyAadhaar = () => {
    const params = new URLSearchParams({
      customer_id: customer.customerId,
      mobile: customer.mobile.replace(/\D/g, ""),
      name: customer.fullName,
      context: "CUSTOMER_VERIFICATION",
      return_to: returnTo || "/retailer/dmt",
    });
    router.push(`/retailer/customers/aadhaar-verify?${params.toString()}`);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: "16px",
        bgcolor: "#faf7f0",
        border: "1px solid #e7e2d4",
        mb: 3,
      }}
    >
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" } }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          {/* AVATAR WITH VERIFIED BADGE */}
          <Box sx={{ position: "relative" }}>
            <Avatar
              sx={{
                width: 52,
                height: 52,
                bgcolor: "#7a1329",
                color: "#f0d98c",
                fontWeight: 900,
                fontSize: "18px",
                fontFamily: "serif",
                border: "2px solid #d4af37",
              }}
            >
              {customer.initials}
            </Avatar>
            <VerifiedIcon
              sx={{
                position: "absolute",
                bottom: -2,
                right: -2,
                color: "#1e8e5a",
                fontSize: 20,
                bgcolor: "#FFFFFF",
                borderRadius: "50%",
              }}
            />
          </Box>

          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5, flexWrap: "wrap", gap: 0.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#1c2340", fontSize: "18px", fontFamily: "serif" }}>
                {customer.fullName}
              </Typography>
              <Chip
                icon={<CheckCircleIcon sx={{ fontSize: "14px !important", color: "#1e8e5a !important" }} />}
                label="Verified Customer"
                size="small"
                sx={{ height: 22, fontSize: "11px", fontWeight: 700, bgcolor: "#eaf6ef", color: "#1e8e5a" }}
              />
              {/* Dynamic Aadhaar status chip */}
              {aadhaarVerified ? (
                <Chip
                  icon={<FingerprintIcon sx={{ fontSize: "13px !important", color: "#1e8e5a !important" }} />}
                  label="Aadhaar Verified"
                  size="small"
                  sx={{ height: 22, fontSize: "11px", fontWeight: 700, bgcolor: "#eaf6ef", color: "#1e8e5a" }}
                />
              ) : (
                <Chip
                  icon={<WarningAmberIcon sx={{ fontSize: "13px !important", color: "#92400e !important" }} />}
                  label="Aadhaar Pending"
                  size="small"
                  sx={{ height: 22, fontSize: "11px", fontWeight: 700, bgcolor: "#fef3c7", color: "#92400e" }}
                />
              )}
            </Stack>

            <Typography variant="caption" sx={{ color: "#6b7290", display: "block" }}>
              ID: <strong>{customer.customerId}</strong> • Mobile: <strong>{customer.mobile}</strong> • Aadhaar: <strong>{customer.aadhaarMasked || "Not verified"}</strong>
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
            <Chip
              icon={<ShieldIcon sx={{ fontSize: "14px !important", color: "#1e8e5a !important" }} />}
              label={`Risk Level: ${customer.riskLevel}`}
              size="small"
              sx={{ height: 22, fontSize: "11px", fontWeight: 700, bgcolor: "#eaf6ef", color: "#1e8e5a", mb: 0.5 }}
            />
            <Typography variant="caption" sx={{ color: "#6b7290", display: "block" }}>
              Customer Since: {formatDate(customer.customerSince)}
            </Typography>
          </Box>

          {/* Aadhaar Verify button — only when NOT verified */}
          {!aadhaarVerified && (
            <Button
              variant="contained"
              onClick={handleVerifyAadhaar}
              startIcon={<FingerprintIcon />}
              size="small"
              sx={{
                background: "linear-gradient(135deg, #7a1329, #5e0f22)",
                color: "#f0d98c",
                fontWeight: 700,
                textTransform: "none",
                borderRadius: "10px",
                px: 2,
                py: 0.8,
                fontSize: "12px",
                border: "1px solid #d4af37",
                whiteSpace: "nowrap",
                "&:hover": { background: "#5e0f22" },
              }}
            >
              Verify Aadhaar
            </Button>
          )}

          <Button
            variant="outlined"
            onClick={onChangeCustomer}
            sx={{
              borderColor: "#d4af37",
              color: "#7a1329",
              fontWeight: 700,
              textTransform: "none",
              borderRadius: "10px",
              px: 2,
              py: 0.8,
              fontSize: "13px",
              "&:hover": { bgcolor: "rgba(212, 175, 55, 0.1)", borderColor: "#7a1329" },
            }}
          >
            Change
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
