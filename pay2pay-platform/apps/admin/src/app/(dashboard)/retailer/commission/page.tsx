"use client";

import React, { useState } from "react";
import {
  Box, Paper, Typography, Button, Chip, Table, TableBody, TableCell,
  TableHead, TableRow, LinearProgress
} from "@mui/material";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import StarIcon from "@mui/icons-material/Star";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

interface CommissionSlab {
  service: string;
  volumeRange: string;
  regularMargin: string;
  vipGoldMargin: string;
  settlementMode: string;
}

const COMMISSION_SLABS: CommissionSlab[] = [
  { service: "Money Transfer (DMT)", volumeRange: "₹1,000 - ₹5,000", regularMargin: "0.45% (Max ₹15)", vipGoldMargin: "0.55% (Max ₹20)", settlementMode: "Real-time IMPS" },
  { service: "AEPS Cash Out", volumeRange: "₹3,000 - ₹10,000", regularMargin: "₹10.00 flat", vipGoldMargin: "₹13.00 flat (+30% Bonus)", settlementMode: "Instant Wallet" },
  { service: "Swipe mPOS (Card)", volumeRange: "₹500 - ₹50,000", regularMargin: "0.25%", vipGoldMargin: "0.35%", settlementMode: "Instant Wallet" },
  { service: "Mobile Recharge", volumeRange: "₹10 - ₹2,999", regularMargin: "2.50%", vipGoldMargin: "3.20%", settlementMode: "Instant Wallet" },
  { service: "DTH Top-Up", volumeRange: "₹100 - ₹5,000", regularMargin: "3.00%", vipGoldMargin: "3.80%", settlementMode: "Instant Wallet" },
  { service: "BBPS Electricity & Gas", volumeRange: "₹500 - ₹25,000", regularMargin: "₹2.50 per bill", vipGoldMargin: "₹4.00 per bill", settlementMode: "Real-time BBPS" },
];

export default function CommissionPage() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "20px", pb: 4 }}>
      {/* KPI Cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2.5 }}>
        <Paper elevation={0} sx={{ p: "24px", borderRadius: "20px", border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 700, textTransform: "uppercase" }}>
              Today's Earnings
            </Typography>
            <TrendingUpIcon sx={{ color: "#16A34A" }} />
          </Box>
          <Typography variant="h4" sx={{ color: "#16A34A", fontWeight: 800, fontFamily: "monospace", fontSize: "32px" }}>
            +₹1,480.00
          </Typography>
          <Typography variant="caption" sx={{ color: "#6B7280", mt: 0.5, display: "block" }}>
            Credited across 42 transactions
          </Typography>
        </Paper>

        <Paper elevation={0} sx={{ p: "24px", borderRadius: "20px", border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 700, textTransform: "uppercase" }}>
              This Month's Earnings
            </Typography>
            <MonetizationOnIcon sx={{ color: "#2563EB" }} />
          </Box>
          <Typography variant="h4" sx={{ color: "#111827", fontWeight: 800, fontFamily: "monospace", fontSize: "32px" }}>
            ₹38,450.00
          </Typography>
          <Typography variant="caption" sx={{ color: "#6B7280", mt: 0.5, display: "block" }}>
            On track for Platinum status (+1.5x)
          </Typography>
        </Paper>

        <Paper elevation={0} sx={{ p: "24px", borderRadius: "20px", border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 700, textTransform: "uppercase" }}>
              Rewards Coins Balance
            </Typography>
            <StarIcon sx={{ color: "#D4AF37" }} />
          </Box>
          <Typography variant="h4" sx={{ color: "#B45309", fontWeight: 800, fontFamily: "monospace", fontSize: "32px" }}>
            8,450 Coins
          </Typography>
          <Typography variant="caption" sx={{ color: "#6B7280", mt: 0.5, display: "block" }}>
            Redeemable for cash top-up or gift cards
          </Typography>
        </Paper>
      </Box>

      {/* Progress to Platinum Status */}
      <Paper elevation={0} sx={{ p: "20px 24px", borderRadius: "20px", border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#111827" }}>
            Monthly Gold Tier Target Progress
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 800, color: "#2563EB" }}>
            ₹3,84,500 / ₹5,000,000 Volume (77%)
          </Typography>
        </Box>
        <LinearProgress variant="determinate" value={77} sx={{ height: 10, borderRadius: 5, backgroundColor: "#EFF6FF", "& .MuiLinearProgress-bar": { backgroundColor: "#2563EB" } }} />
      </Paper>

      {/* Official Commission Slab Matrix */}
      <Paper elevation={0} sx={{ p: "24px", borderRadius: "20px", border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
        <Typography variant="h6" sx={{ fontSize: "18px", fontWeight: 800, color: "#111827", mb: 2 }}>
          Official Service-wise Commission Slabs
        </Typography>
        <Table>
          <TableHead sx={{ backgroundColor: "#F8FAFC" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>Financial Service</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Transaction Slab</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Regular Margin</TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#B45309" }}>VIP Gold Margin (+20%)</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Settlement Mode</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {COMMISSION_SLABS.map((slab) => (
              <TableRow key={slab.service} hover>
                <TableCell sx={{ fontWeight: 800, color: "#111827" }}>{slab.service}</TableCell>
                <TableCell sx={{ fontFamily: "monospace" }}>{slab.volumeRange}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{slab.regularMargin}</TableCell>
                <TableCell sx={{ fontWeight: 800, color: "#16A34A" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <CheckCircleIcon sx={{ fontSize: 16, color: "#16A34A" }} />
                    {slab.vipGoldMargin}
                  </Box>
                </TableCell>
                <TableCell sx={{ color: "#4B5563" }}>{slab.settlementMode}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
