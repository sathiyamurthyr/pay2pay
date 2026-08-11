"use client";

import React, { useState } from "react";
import { Box, Typography, CircularProgress, Tooltip, IconButton, Chip } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";

interface ScannableQrCodeProps {
  value: string;
  size?: number;
  label?: string;
  subLabel?: string;
  showCopy?: boolean;
}

export default function ScannableQrCode({
  value,
  size = 200,
  label = "Scan with Mobile Camera or UPI App",
  subLabel = "iOS & Android Camera Compatible",
  showCopy = true,
}: ScannableQrCodeProps) {
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(
    value
  )}`;

  const handleCopyValue = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box
      sx={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        p: 2.5,
        borderRadius: "20px",
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E7EB",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
        maxWidth: "100%",
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F8FAFC",
          borderRadius: "16px",
          overflow: "hidden",
          border: "1px solid #F1F5F9",
        }}
      >
        {loading && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#FFFFFF",
              zIndex: 1,
            }}
          >
            <CircularProgress size={28} />
          </Box>
        )}

        <img
          src={qrImageUrl}
          alt="Scannable QR Code"
          width={size}
          height={size}
          onLoad={() => setLoading(false)}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      </Box>

      {label && (
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 800, color: "#111827", mt: 2, textAlign: "center", fontSize: "14px" }}
        >
          {label}
        </Typography>
      )}

      {subLabel && (
        <Typography
          variant="caption"
          sx={{ color: "#6B7280", mt: 0.5, textAlign: "center", fontSize: "12px", fontWeight: 500 }}
        >
          {subLabel}
        </Typography>
      )}

      {showCopy && (
        <Box sx={{ mt: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
          <Chip
            icon={<QrCodeScannerIcon sx={{ "&&": { color: "#16A34A", fontSize: 14 } }} />}
            label="Real Scannable QR"
            size="small"
            sx={{ backgroundColor: "#DCFCE7", color: "#16A34A", fontWeight: 800, height: 24, fontSize: "11px" }}
          />
          <Tooltip title={copied ? "Copied!" : "Copy QR String"}>
            <IconButton size="small" onClick={handleCopyValue} sx={{ border: "1px solid #E5E7EB", borderRadius: "8px" }}>
              {copied ? <CheckCircleIcon sx={{ fontSize: 14, color: "#16A34A" }} /> : <ContentCopyIcon sx={{ fontSize: 14 }} />}
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
}
