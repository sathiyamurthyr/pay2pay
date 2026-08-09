"use client";

import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  Chip,
  Avatar,
  Grid,
  CircularProgress,
  IconButton,
  Divider,
  Tooltip,
} from "@mui/material";
import { motion } from "framer-motion";

// Icons
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckIcon from "@mui/icons-material/Check";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import NotificationsIcon from "@mui/icons-material/Notifications";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import SpeedIcon from "@mui/icons-material/Speed";

// ─────────────────────────────────────────────────────────────────────────────
// LUXURY BANKING COLOR PALETTE TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const NAVY_PRIMARY = "#0F2C59";
const MAROON_PRIMARY = "#7B1E3A";
const GOLD_PREMIUM = "#D4AF37";
const GOLD_CHAMPAGNE = "#F7E7B6";
const WHITE = "#FFFFFF";

const MAROON_GOLD_GRADIENT = "linear-gradient(135deg, #7B1E3A 0%, #912544 45%, #D4AF37 100%)";
const NAVY_GRADIENT = "linear-gradient(135deg, #0F2C59 0%, #1A407B 100%)";

const GLASS_CARD = {
  background: "rgba(255, 255, 255, 0.75)",
  backdropFilter: "blur(16px)",
  border: "1px solid rgba(212, 175, 55, 0.25)",
  boxShadow: "0 8px 32px rgba(15, 44, 89, 0.08)",
};

export default function DmtPresentationPage() {
  const [activeTab, setActiveTab] = useState<"SPLIT" | "NEW_ONLY">("SPLIT");

  return (
    <Box sx={{ width: "100vw", minHeight: "100vh", bgcolor: "#0B132B", color: WHITE, overflowX: "hidden", p: 0 }}>
      {/* ── TOP PRESENTATION CONTROLS BAR ── */}
      <Box sx={{ px: 4, py: 2, bgcolor: "#070D1E", borderBottom: "1px solid rgba(212,175,55,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: GOLD_PREMIUM, fontSize: "20px", letterSpacing: "1px" }}>
            ENTERPRISE DMT WORKSPACE REDESIGN
          </Typography>
          <Chip label="4K Presentation Canvas (3840 × 2160)" size="small" sx={{ bgcolor: "rgba(212,175,55,0.15)", color: GOLD_PREMIUM, border: "1px solid #D4AF37", fontWeight: 700 }} />
        </Stack>

        <Stack direction="row" spacing={2}>
          <Button
            variant={activeTab === "SPLIT" ? "contained" : "outlined"}
            onClick={() => setActiveTab("SPLIT")}
            sx={{
              bgcolor: activeTab === "SPLIT" ? GOLD_PREMIUM : "transparent",
              color: activeTab === "SPLIT" ? "#000" : GOLD_PREMIUM,
              borderColor: GOLD_PREMIUM,
              fontWeight: 800,
              textTransform: "none",
            }}
          >
            BEFORE vs AFTER Split View
          </Button>
          <Button
            variant={activeTab === "NEW_ONLY" ? "contained" : "outlined"}
            onClick={() => setActiveTab("NEW_ONLY")}
            sx={{
              bgcolor: activeTab === "NEW_ONLY" ? GOLD_PREMIUM : "transparent",
              color: activeTab === "NEW_ONLY" ? "#000" : GOLD_PREMIUM,
              borderColor: GOLD_PREMIUM,
              fontWeight: 800,
              textTransform: "none",
            }}
          >
            Full New Enterprise View
          </Button>
        </Stack>
      </Box>

      {/* ── MAIN CANVAS GRID (50% LEFT / 50% RIGHT) ── */}
      <Grid container sx={{ width: "100%", minHeight: "calc(100vh - 65px)" }}>
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* LEFT HALF: CURRENT DESIGN (PROBLEMS & ANNOTATIONS)                */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {(activeTab === "SPLIT") && (
          <Grid
            size={{ xs: 12, lg: 6 }}
            sx={{
              borderRight: "2px solid rgba(239, 68, 68, 0.4)",
              bgcolor: "#F3F4F6",
              color: "#1F2937",
              p: 3,
              position: "relative",
            }}
          >
            {/* BADGE */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Chip label="🔴 CURRENT DESIGN (Legacy)" sx={{ bgcolor: "#FEE2E2", color: "#DC2626", fontWeight: 900, fontSize: "14px", px: 1 }} />
              <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 700 }}>FLAT • CLUTTERED • WEAK CONTRAST</Typography>
            </Box>

            {/* RED ANNOTATIONS */}
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}>
              {["❌ Poor hierarchy", "❌ Weak CTA", "❌ Empty space", "❌ Hard to scan", "❌ No premium banking feel"].map((anno) => (
                <Chip key={anno} label={anno} size="small" sx={{ bgcolor: "#DC2626", color: "#FFF", fontWeight: 800, fontSize: "12px" }} />
              ))}
            </Stack>

            {/* SIMULATED OLD DMT SCREEN */}
            <Paper elevation={0} sx={{ p: 3, bgcolor: "#FFFFFF", borderRadius: "8px", border: "1px solid #E5E7EB", position: "relative" }}>
              <Typography variant="h6" sx={{ color: "#111827", fontWeight: 700, mb: 2 }}>DMT Money Transfer</Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 8 }}>
                  <Box sx={{ p: 2, border: "1px solid #D1D5DB", borderRadius: "6px", bgcolor: "#FFFFFF" }}>
                    <Typography variant="caption" sx={{ color: "#6B7280" }}>Customer Mobile</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      <Box sx={{ flex: 1, p: 1, border: "1px solid #9CA3AF", borderRadius: "4px", fontSize: "13px", color: "#9CA3AF" }}>
                        Enter mobile number...
                      </Box>
                      <Button variant="contained" size="small" sx={{ bgcolor: "#2563EB", textTransform: "none" }}>Validate</Button>
                    </Stack>
                  </Box>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Box sx={{ p: 2, border: "1px solid #D1D5DB", borderRadius: "6px", bgcolor: "#F9FAFB" }}>
                    <Typography variant="caption" sx={{ color: "#6B7280" }}>Balance</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#111827" }}>₹48,250.00</Typography>
                  </Box>
                </Grid>
              </Grid>

              {/* ANNOTATION OVERLAYS */}
              <Box sx={{ position: "relative", p: 2, border: "1px dashed #EF4444", borderRadius: "8px", mb: 2, bgcolor: "#FEF2F2" }}>
                <Typography variant="caption" sx={{ color: "#DC2626", fontWeight: 800, display: "block" }}>
                  ❌ ANNOTATION: 3 Cards Competing for Equal Visual Attention
                </Typography>
                <Typography variant="body2" sx={{ color: "#4B5563", fontSize: "12px", mt: 0.5 }}>
                  Beneficiaries, Transfer Amount, and Limits are displayed simultaneously, causing decision fatigue for retail agents.
                </Typography>
              </Box>

              <Grid container spacing={1.5}>
                {["Beneficiary Search", "Transfer Mode", "Wallet Impact", "Daily Limit", "Monthly Limit", "NPCI Status"].map((card) => (
                  <Grid key={card} size={{ xs: 4 }}>
                    <Paper elevation={0} sx={{ p: 1.5, border: "1px solid #E5E7EB", borderRadius: "6px", bgcolor: "#FFFFFF" }}>
                      <Typography variant="caption" sx={{ color: "#9CA3AF", fontSize: "10px", display: "block" }}>CARD</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "#374151" }}>{card}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* RIGHT HALF: NEW ENTERPRISE DESIGN (LUXURY BANKING CONSOLE)        */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Grid
          size={{ xs: 12, lg: activeTab === "NEW_ONLY" ? 12 : 6 }}
          sx={{
            bgcolor: "#0F2C59",
            p: 3,
            color: WHITE,
            backgroundImage: "radial-gradient(circle at 80% 20%, rgba(212, 175, 55, 0.12) 0%, transparent 60%)",
          }}
        >
          {/* BADGE & GREEN ANNOTATIONS */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Chip label="🟢 NEW ENTERPRISE DESIGN (Luxury Banking)" sx={{ bgcolor: GOLD_PREMIUM, color: "#000", fontWeight: 900, fontSize: "14px", px: 1 }} />
            <Typography variant="caption" sx={{ color: GOLD_CHAMPAGNE, fontWeight: 700 }}>ONE STEP = ONE SCREEN • GLASSMORPHISM • 60 FPS</Typography>
          </Box>

          <Stack direction="row" spacing={1} sx={{ mb: 2.5, flexWrap: "wrap", gap: 0.8 }}>
            {[
              "✓ Premium Banking Theme",
              "✓ Better Information Hierarchy",
              "✓ Faster User Journey",
              "✓ Enterprise UX",
              "✓ Better CTA Visibility",
              "✓ Luxury Glassmorphism",
              "✓ Improved Readability",
              "✓ Modern Workflow",
            ].map((green) => (
              <Chip key={green} label={green} size="small" sx={{ bgcolor: "#16A34A", color: "#FFF", fontWeight: 800, fontSize: "11px" }} />
            ))}
          </Stack>

          {/* ── HIGH-END ENTERPRISE WORKSPACE CONSOLE ── */}
          <Grid container spacing={2}>
            {/* LEFT VERTICAL STEP NAVIGATION (REQUIREMENT) */}
            <Grid size={{ xs: 3 }}>
              <Paper elevation={0} sx={{ ...GLASS_CARD, p: 2, borderRadius: "16px" }}>
                <Typography variant="caption" sx={{ color: GOLD_PREMIUM, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", mb: 2, display: "block" }}>
                  WORKFLOW STEPS
                </Typography>

                <Stack spacing={1.5}>
                  {[
                    { label: "Customer", status: "CURRENT", desc: "Identity Search" },
                    { label: "Beneficiary", status: "PENDING", desc: "Account Select" },
                    { label: "Amount", status: "PENDING", desc: "Transfer Value" },
                    { label: "Review", status: "PENDING", desc: "Summary Check" },
                    { label: "Authenticate", status: "PENDING", desc: "Security MPIN" },
                    { label: "Success", status: "PENDING", desc: "Receipt Generated" },
                  ].map((step, idx) => {
                    const isCurrent = step.status === "CURRENT";
                    return (
                      <Box
                        key={step.label}
                        sx={{
                          p: 1.2,
                          borderRadius: "10px",
                          bgcolor: isCurrent ? MAROON_PRIMARY : "rgba(255,255,255,0.05)",
                          border: isCurrent ? `1px solid ${GOLD_PREMIUM}` : "1px solid transparent",
                          color: isCurrent ? WHITE : "#94A3B8",
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                        }}
                      >
                        <Box sx={{ width: 24, height: 24, borderRadius: "50%", bgcolor: isCurrent ? GOLD_PREMIUM : "#1E293B", color: isCurrent ? "#000" : "#FFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 800 }}>
                          {idx + 1}
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ fontWeight: 800, display: "block", color: isCurrent ? WHITE : "#CBD5E1", fontSize: "12px" }}>
                            {step.label}
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: "10px", color: isCurrent ? GOLD_CHAMPAGNE : "#64748B" }}>
                            {step.desc}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              </Paper>
            </Grid>

            {/* CENTER WORKSPACE: CUSTOMER CARD & MAROON-GOLD GRADIENT CTA */}
            <Grid size={{ xs: 6 }}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: "18px", bgcolor: "#FFFFFF", color: "#0F172A", border: `2px solid ${GOLD_PREMIUM}`, boxShadow: "0 12px 40px rgba(0,0,0,0.25)" }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: NAVY_PRIMARY, fontSize: "20px", mb: 2 }}>
                  Customer Identification
                </Typography>

                <Stack direction="row" spacing={1.5} sx={{ mb: 2.5 }}>
                  <Box sx={{ flex: 1, p: 1.5, borderRadius: "12px", border: `2px solid ${GOLD_PREMIUM}`, bgcolor: "#FFFFFF", display: "flex", alignItems: "center", gap: 1 }}>
                    <SearchIcon sx={{ color: GOLD_PREMIUM }} />
                    <Typography variant="body2" sx={{ color: "#64748B", fontWeight: 600 }}>Enter 10-digit mobile number...</Typography>
                  </Box>
                  {/* MAROON TO GOLD GRADIENT CTA */}
                  <Button
                    variant="contained"
                    sx={{
                      background: MAROON_GOLD_GRADIENT,
                      color: WHITE,
                      fontWeight: 800,
                      px: 3,
                      borderRadius: "12px",
                      textTransform: "none",
                      boxShadow: "0 6px 20px rgba(212, 175, 55, 0.35)",
                    }}
                  >
                    Search Customer
                  </Button>
                </Stack>

                {/* CUSTOMER CARD WITH EKYC PROFILE & PHOTO */}
                <Paper elevation={0} sx={{ p: 2.5, borderRadius: "14px", bgcolor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                  <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                    <Avatar
                      alt="Sathiya Murthy.R"
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"
                      sx={{ bgcolor: NAVY_PRIMARY, color: GOLD_PREMIUM, width: 56, height: 56, fontWeight: 900, fontSize: "20px", border: `2px solid ${GOLD_PREMIUM}` }}
                    >
                      SM
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: NAVY_PRIMARY, fontSize: "17px" }}>
                          Sathiya Murthy.R
                        </Typography>
                        <Chip label="✓ Cashfree eKYC Verified" size="small" sx={{ bgcolor: "#ECFDF3", color: "#16A34A", fontWeight: 800, fontSize: "11px" }} />
                        <Chip label="Low Risk" size="small" sx={{ bgcolor: "#ECFDF3", color: "#16A34A", fontWeight: 800, fontSize: "11px" }} />
                      </Stack>
                      <Typography variant="caption" sx={{ color: "#64748B", display: "block" }}>
                        Customer ID: CUST-992664 • Mobile: +91 91766 69426
                      </Typography>
                    </Box>
                  </Stack>

                  {/* VERIFIED EKYC & AADHAAR DETAILS BAR */}
                  <Box sx={{ mt: 2, p: 1.5, borderRadius: "10px", bgcolor: "rgba(15,44,89,0.06)", border: "1px solid rgba(15,44,89,0.15)" }}>
                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600, fontSize: "11px" }}>Masked Aadhaar</Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0F2C59", fontFamily: "monospace" }}>XXXX-XXXX-4748</Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600, fontSize: "11px" }}>DOB / Gender</Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0F2C59" }}>09-06-1983 (Male)</Typography>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600, fontSize: "11px", display: "block" }}>Verified Address</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "#334155", fontSize: "12px", lineHeight: "1.3" }}>
                          S/O RAMASAMY, No. 42/B, GST Main Road, Near Bus Stand, Chromepet, Chengalpattu, Tamil Nadu - 600044
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" sx={{ color: "#64748B" }}>Monthly Limit Remaining</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: NAVY_PRIMARY }}>₹200,000.00</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" sx={{ color: "#64748B" }}>Recent Activity</Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#0F172A" }}>eKYC Verified (Just now)</Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Paper>

              {/* STICKY GLASS FOOTER NAVIGATION */}
              <Paper elevation={0} sx={{ ...GLASS_CARD, mt: 2, p: 2, borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Button variant="outlined" sx={{ color: NAVY_PRIMARY, borderColor: NAVY_PRIMARY, fontWeight: 700, borderRadius: "10px", textTransform: "none" }}>← Previous</Button>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: NAVY_PRIMARY }}>Step 1 of 6</Typography>
                <Button variant="contained" sx={{ background: MAROON_GOLD_GRADIENT, color: WHITE, fontWeight: 800, borderRadius: "10px", textTransform: "none" }}>
                  Continue to Beneficiary →
                </Button>
              </Paper>
            </Grid>

            {/* RIGHT PANEL: GLASS LIVE INTELLIGENCE */}
            <Grid size={{ xs: 3 }}>
              <Paper elevation={0} sx={{ ...GLASS_CARD, p: 2.5, borderRadius: "16px" }}>
                <Typography variant="caption" sx={{ color: GOLD_PREMIUM, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", mb: 2, display: "block" }}>
                  LIVE BANKING INTELLIGENCE
                </Typography>

                <Stack spacing={2}>
                  <Box sx={{ p: 1.5, borderRadius: "10px", bgcolor: "rgba(22,163,74,0.15)", border: "1px solid #16A34A" }}>
                    <Typography variant="caption" sx={{ color: "#16A34A", fontWeight: 800, display: "block" }}>NPCI IMPS Switch</Typography>
                    <Typography variant="subtitle2" sx={{ color: "#FFF", fontWeight: 700 }}>100% Operational (0.8s Latency)</Typography>
                  </Box>

                  <Box sx={{ p: 1.5, borderRadius: "10px", bgcolor: "rgba(15,44,89,0.4)", border: "1px solid rgba(212,175,55,0.3)" }}>
                    <Typography variant="caption" sx={{ color: GOLD_PREMIUM, fontWeight: 800, display: "block" }}>Cashfree V2 Gateway</Typography>
                    <Typography variant="subtitle2" sx={{ color: "#FFF", fontWeight: 700 }}>99.8% Success Rate</Typography>
                  </Box>

                  <Box sx={{ p: 1.5, borderRadius: "10px", bgcolor: "rgba(123,30,58,0.3)", border: "1px solid #7B1E3A" }}>
                    <Typography variant="caption" sx={{ color: GOLD_CHAMPAGNE, fontWeight: 800, display: "block" }}>Anti-Fraud Engine</Typography>
                    <Typography variant="subtitle2" sx={{ color: "#FFF", fontWeight: 700 }}>Risk Score 0.02 (Cleared)</Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}
