"use client";

import React, { useState } from "react";
import { Box, Typography, Avatar, Chip } from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";

export interface CompanyHeaderProps {
  logoUrl?: string;
  companyName?: string;
  legalName?: string;
  title?: string;
  subtitle?: string;
  variant?: "modal" | "page" | "compact" | "receipt";
  extraActions?: React.ReactNode;
  statusBadge?: React.ReactNode;
  sx?: any;
}

export const CompanyHeader: React.FC<CompanyHeaderProps> = ({
  logoUrl = "/branding/logo.png",
  companyName = "SUPER REX PRODUCTS PRIVATE LIMITED",
  legalName,
  title,
  subtitle,
  variant = "modal",
  extraActions,
  statusBadge,
  sx = {}
}) => {
  const [imgError, setImgError] = useState(false);

  const isModal = variant === "modal";
  const isPage = variant === "page";
  const isReceipt = variant === "receipt";

  // Modal variant header
  if (isModal) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
          p: 2,
          px: 2.5,
          bgcolor: "#0F172A",
          borderBottom: "1px solid #1E293B",
          borderRadius: "8px 8px 0 0",
          ...sx
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {/* Company Logo Box */}
          <Box
            sx={{
              width: 46,
              height: 46,
              borderRadius: "10px",
              bgcolor: "#1E293B",
              border: "1px solid #334155",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              p: 0.5,
              flexShrink: 0,
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
            }}
          >
            {!imgError && logoUrl ? (
              <Box
                component="img"
                src={logoUrl}
                alt={companyName}
                onError={() => setImgError(true)}
                sx={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  display: "block"
                }}
              />
            ) : (
              <Avatar
                sx={{
                  width: "100%",
                  height: "100%",
                  bgcolor: "#3B82F6",
                  color: "#FFFFFF",
                  fontSize: "18px",
                  fontWeight: 700,
                  borderRadius: "8px"
                }}
              >
                {companyName ? companyName.charAt(0).toUpperCase() : "P"}
              </Avatar>
            )}
          </Box>

          {/* Company Branding & Title Hierarchy */}
          <Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                fontSize: "12px",
                letterSpacing: "0.5px",
                color: "#60A5FA",
                textTransform: "uppercase",
                display: "block",
                lineHeight: 1.2
              }}
            >
              {companyName}
            </Typography>

            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                fontSize: "18px",
                color: "#F8FAFC",
                letterSpacing: "-0.3px",
                lineHeight: 1.3
              }}
            >
              {title || "Transaction Details"}
            </Typography>

            {subtitle && (
              <Typography
                variant="caption"
                sx={{
                  color: "#94A3B8",
                  fontSize: "11px",
                  fontWeight: 500,
                  display: "block",
                  mt: 0.2
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Right side actions or badges */}
        {(statusBadge || extraActions) && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            {statusBadge}
            {extraActions}
          </Box>
        )}
      </Box>
    );
  }

  // Page header variant
  if (isPage) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          ...sx
        }}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: "10px",
            bgcolor: "#1E293B",
            border: "1px solid #334155",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            p: 0.5,
            flexShrink: 0
          }}
        >
          {!imgError && logoUrl ? (
            <Box
              component="img"
              src={logoUrl}
              alt={companyName}
              onError={() => setImgError(true)}
              sx={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain"
              }}
            />
          ) : (
            <Avatar
              sx={{
                width: "100%",
                height: "100%",
                bgcolor: "#3B82F6",
                color: "#FFFFFF",
                fontSize: "16px",
                fontWeight: 700,
                borderRadius: "8px"
              }}
            >
              {companyName ? companyName.charAt(0).toUpperCase() : "P"}
            </Avatar>
          )}
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              fontSize: "11px",
              letterSpacing: "0.5px",
              color: "#38BDF8",
              textTransform: "uppercase",
              display: "block",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}
          >
            {companyName}
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              fontSize: "18px",
              color: "#FFFFFF",
              letterSpacing: "-0.3px",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}
          >
            {title || "Report"}
          </Typography>
          {subtitle && (
            <Typography
              variant="caption"
              sx={{
                color: "#94A3B8",
                fontSize: "11px",
                fontWeight: 500,
                display: "block",
                mt: 0.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
    );
  }

  // Generic / default fallback variant
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, ...sx }}>
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: "8px",
          bgcolor: "#1E293B",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 0.5,
          flexShrink: 0
        }}
      >
        {!imgError && logoUrl ? (
          <Box
            component="img"
            src={logoUrl}
            alt={companyName}
            onError={() => setImgError(true)}
            sx={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
          />
        ) : (
          <BusinessIcon sx={{ color: "#94A3B8", fontSize: 20 }} />
        )}
      </Box>
      <Box>
        <Typography sx={{ fontWeight: 700, fontSize: "14px", color: "#F8FAFC" }}>
          {companyName}
        </Typography>
        {title && (
          <Typography sx={{ fontSize: "12px", color: "#94A3B8" }}>
            {title}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default CompanyHeader;
