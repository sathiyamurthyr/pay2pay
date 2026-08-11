"use client";

import React from "react";
import { Box, Paper, Typography, Stack, Chip, IconButton, Tooltip } from "@mui/material";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import LandmarkIcon from "@mui/icons-material/AccountBalance";
import SpeedIcon from "@mui/icons-material/Speed";

export interface DmtEnterpriseHeaderProps {
  walletBalance?: number;
  bankName?: string;
  successRatePct?: number;
  impsOperational?: boolean;
  todaysTransfersCount?: number;
  todaysTransferAmount?: number;
  onSpeakerClick?: () => void;
}

export const DmtEnterpriseHeader: React.FC<DmtEnterpriseHeaderProps> = ({
  walletBalance = 48250.75,
  bankName = "HDFC Bank",
  successRatePct = 99.4,
  impsOperational = true,
  todaysTransfersCount = 84,
  todaysTransferAmount = 145280,
  onSpeakerClick,
}) => {
  const formattedBalance = walletBalance.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formattedTodayAmount = todaysTransferAmount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <Paper
      elevation={0}
      role="region"
      aria-label="Money Transfer Enterprise Banking Header"
      sx={{
        position: "relative",
        minHeight: { xs: "auto", md: "260px" },
        maxHeight: { md: "280px" },
        p: { xs: "20px", sm: "24px", lg: "28px" },
        mb: 3,
        borderRadius: "24px",
        background: "linear-gradient(90deg, #0F2C59 0%, #184A8C 100%)",
        color: "#FFFFFF",
        boxShadow: "0 12px 36px rgba(15, 44, 89, 0.22)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        overflow: "hidden",
        transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* ── SPEAKER BUTTON (TOP-RIGHT CORNER) ── */}
      <Tooltip title="Voice Alert &amp; Soundbox Settings">
        <IconButton
          onClick={onSpeakerClick}
          aria-label="Voice Alert and Soundbox Settings"
          sx={{
            position: "absolute",
            top: { xs: "16px", md: "20px" },
            right: { xs: "16px", md: "20px" },
            width: 38,
            height: 38,
            borderRadius: "12px",
            backgroundColor: "rgba(255, 255, 255, 0.12)",
            border: "1px solid rgba(255, 255, 255, 0.22)",
            color: "#FFFFFF",
            zIndex: 2,
            transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
            "&:hover": {
              backgroundColor: "#2563EB",
              borderColor: "#2563EB",
              boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)",
              transform: "scale(1.05)",
            },
          }}
        >
          <VolumeUpIcon sx={{ fontSize: 20, color: "#FFFFFF" }} />
        </IconButton>
      </Tooltip>

      {/* ── TWO-COLUMN SPLIT (LEFT 60% / RIGHT 40%) ── */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={{ xs: 3, md: 4 }}
        sx={{
          alignItems: "stretch",
          justifyContent: "space-between",
          height: "100%",
        }}
      >
        {/* ── LEFT COLUMN (60%): TITLE + SUBTITLE + BADGE + OPERATIONAL KPI SUMMARY ── */}
        <Box
          sx={{
            flex: { md: "0 0 58%", lg: "0 0 60%" },
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            pr: { md: 2 },
          }}
        >
          {/* Header Title Row */}
          <Box>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}>
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: "14px",
                  backgroundColor: "rgba(255, 255, 255, 0.12)",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <FlashOnIcon sx={{ color: "#FDE047", fontSize: 26 }} />
              </Box>

              <Typography
                variant="h1"
                sx={{
                  color: "#FFFFFF",
                  fontSize: { xs: "24px", sm: "28px", lg: "32px" },
                  fontWeight: 700,
                  lineHeight: 1.1,
                  letterSpacing: "-0.5px",
                }}
              >
                Money Transfer
              </Typography>

              {/* Enterprise Badge */}
              <Chip
                label="Enterprise Payout"
                size="small"
                sx={{
                  backgroundColor: "rgba(255, 255, 255, 0.12)",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  color: "#FFFFFF",
                  borderRadius: "12px",
                  fontWeight: 700,
                  fontSize: "12px",
                  height: "26px",
                  px: 0.5,
                }}
              />
            </Stack>

            <Typography
              variant="subtitle1"
              sx={{
                color: "#D8E6FF",
                fontSize: "16px",
                fontWeight: 500,
                mt: 1,
              }}
            >
              Enterprise DMT &amp; Bank Payout
            </Typography>
          </Box>

          {/* Operational KPI Summary (Horizontal Row) */}
          <Box
            sx={{
              mt: { xs: 2.5, md: 3 },
              pt: 2,
              borderTop: "1px solid rgba(255, 255, 255, 0.18)",
            }}
          >
            <Stack
              direction="row"
              spacing={{ xs: 2, sm: 4 }}
              sx={{
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "nowrap",
              }}
            >
              {/* Op KPI 1: Today's Transfers */}
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: "#BFD5FF",
                    fontSize: "13px",
                    fontWeight: 600,
                    display: "block",
                  }}
                >
                  Today's Transfers
                </Typography>
                <Typography
                  variant="subtitle1"
                  sx={{
                    color: "#FFFFFF",
                    fontSize: "16px",
                    fontWeight: 700,
                    mt: 0.25,
                  }}
                >
                  {todaysTransfersCount} Txns
                </Typography>
              </Box>

              {/* Op KPI 2: Today's Transfer Amount */}
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: "#BFD5FF",
                    fontSize: "13px",
                    fontWeight: 600,
                    display: "block",
                  }}
                >
                  Today's Amount
                </Typography>
                <Typography
                  variant="subtitle1"
                  sx={{
                    color: "#FFFFFF",
                    fontSize: "16px",
                    fontWeight: 700,
                    fontFamily: "monospace",
                    mt: 0.25,
                  }}
                >
                  ₹{formattedTodayAmount}
                </Typography>
              </Box>

              {/* Op KPI 3: Success Rate */}
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: "#BFD5FF",
                    fontSize: "13px",
                    fontWeight: 600,
                    display: "block",
                  }}
                >
                  Success Rate
                </Typography>
                <Typography
                  variant="subtitle1"
                  sx={{
                    color: "#22C55E",
                    fontSize: "16px",
                    fontWeight: 700,
                    mt: 0.25,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span>🟢</span> {successRatePct}%
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Box>

        {/* ── RIGHT COLUMN (40%): 3 EQUAL SIZE KPI CARDS ── */}
        <Stack
          spacing={1.25}
          sx={{
            flex: { md: "0 0 38%", lg: "0 0 38%" },
            justifyContent: "center",
          }}
        >
          {/* EQUAL KPI CARD 1: Wallet Balance */}
          <Paper
            elevation={0}
            sx={{
              width: "100%",
              height: "56px",
              borderRadius: "16px",
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
              px: "16px",
              py: "10px",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.14)",
                borderColor: "rgba(255, 255, 255, 0.3)",
                transform: "translateY(-1px)",
              },
            }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <AccountBalanceWalletIcon sx={{ color: "#BFD5FF", fontSize: 18 }} />
              <Typography
                variant="caption"
                sx={{
                  color: "#BFD5FF",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                Wallet Balance
              </Typography>
            </Stack>
            <Typography
              variant="subtitle1"
              sx={{
                color: "#FFFFFF",
                fontSize: "17px",
                fontWeight: 700,
                fontFamily: "monospace",
              }}
            >
              ₹{formattedBalance}
            </Typography>
          </Paper>

          {/* EQUAL KPI CARD 2: Destination Bank */}
          <Paper
            elevation={0}
            sx={{
              width: "100%",
              height: "56px",
              borderRadius: "16px",
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
              px: "16px",
              py: "10px",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.14)",
                borderColor: "rgba(255, 255, 255, 0.3)",
                transform: "translateY(-1px)",
              },
            }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <LandmarkIcon sx={{ color: "#BFD5FF", fontSize: 18 }} />
              <Typography
                variant="caption"
                sx={{
                  color: "#BFD5FF",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                Destination Bank
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Typography
                variant="subtitle1"
                sx={{
                  color: "#FFFFFF",
                  fontSize: "15px",
                  fontWeight: 700,
                }}
              >
                {bankName}
              </Typography>
              <Typography
                variant="subtitle2"
                sx={{
                  color: "#22C55E",
                  fontSize: "13px",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                <span>🟢</span> {successRatePct}%
              </Typography>
            </Stack>
          </Paper>

          {/* EQUAL KPI CARD 3: IMPS Network */}
          <Paper
            elevation={0}
            sx={{
              width: "100%",
              height: "56px",
              borderRadius: "16px",
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
              px: "16px",
              py: "10px",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.14)",
                borderColor: "rgba(255, 255, 255, 0.3)",
                transform: "translateY(-1px)",
              },
            }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <SpeedIcon sx={{ color: "#BFD5FF", fontSize: 18 }} />
              <Typography
                variant="caption"
                sx={{
                  color: "#BFD5FF",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                IMPS Network
              </Typography>
            </Stack>
            <Typography
              variant="subtitle2"
              sx={{
                color: "#22C55E",
                fontSize: "14px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>🟢</span> {impsOperational ? "24×7 Operational" : "Network Delay"}
            </Typography>
          </Paper>
        </Stack>
      </Stack>
    </Paper>
  );
};

export default DmtEnterpriseHeader;
