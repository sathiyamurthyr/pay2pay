"use client";

import React from "react";
import { Box, Paper, Typography, Stack, Chip, Avatar, Button } from "@mui/material";
import VerifiedIcon from "@mui/icons-material/Verified";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ShieldIcon from "@mui/icons-material/Shield";
import { Customer } from "@/types/dmt";
import { formatDate } from "@/lib/format";

export interface CustomerResultCardProps {
  customer: Customer;
  onChangeCustomer: () => void;
}

export function CustomerResultCard({ customer, onChangeCustomer }: CustomerResultCardProps) {
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
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#1c2340", fontSize: "18px", fontFamily: "serif" }}>
                {customer.fullName}
              </Typography>
              <Chip
                icon={<CheckCircleIcon sx={{ fontSize: "14px !important", color: "#1e8e5a !important" }} />}
                label="Verified Customer"
                size="small"
                sx={{ height: 22, fontSize: "11px", fontWeight: 700, bgcolor: "#eaf6ef", color: "#1e8e5a" }}
              />
            </Stack>

            <Typography variant="caption" sx={{ color: "#6b7290", display: "block" }}>
              ID: <strong>{customer.customerId}</strong> • Mobile: <strong>{customer.mobile}</strong> • Aadhaar: <strong>{customer.aadhaarMasked}</strong>
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
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
            Change Customer
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
