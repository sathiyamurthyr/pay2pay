"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Paper,
  Avatar,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  Button,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PersonIcon from "@mui/icons-material/Person";
import SecurityIcon from "@mui/icons-material/Security";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AssignmentIcon from "@mui/icons-material/Assignment";
import EventRepeatIcon from "@mui/icons-material/EventRepeat";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ListAltIcon from "@mui/icons-material/ListAlt";
import HistoryIcon from "@mui/icons-material/History";
import SettingsIcon from "@mui/icons-material/Settings";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import LanguageIcon from "@mui/icons-material/Language";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import { useRouter } from "next/navigation";
import { NotificationCenter } from "@/app-shell/components/NotificationCenter";

export const NexusEnterpriseBankingView: React.FC = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [filterBeneficiary, setFilterBeneficiary] = useState("all");
  const [activeQuickTab, setActiveQuickTab] = useState("Quick");

  const beneficiaryCards = [
    {
      id: 1,
      name: "Sarah Chen",
      account: "AC: 4567-xxxx-1290",
      status: "ACTIVE",
      statusType: "active",
      country: "Germany",
      flag: "🇩🇪",
      recentAmount: "-$1,500.00",
      avatarBg: "#2563EB",
      avatarText: "SC",
    },
    {
      id: 2,
      name: "Vertex Solutions",
      account: "AC: 4567-xxxx-1290",
      status: "VERIFIED",
      statusType: "verified",
      country: "Spain",
      flag: "🇪🇸",
      recentAmount: "-$773.80",
      avatarBg: "#0284C7",
      avatarText: "V",
    },
    {
      id: 3,
      name: "Marcus Rodriguez",
      account: "AC: 4567-xxxx-1290",
      status: "ACTIVE",
      statusType: "active",
      country: "Mexico",
      flag: "🇲🇽",
      recentAmount: "-$356.00",
      avatarBg: "#0D9488",
      avatarText: "MR",
    },
    {
      id: 4,
      name: "Innovatech Ltd",
      account: "AC: 4567-xxxx-1290",
      status: "VERIFIED",
      statusType: "verified",
      country: "Germany",
      flag: "🇩🇪",
      recentAmount: "-$296.00",
      avatarBg: "#1E40AF",
      avatarText: "IN",
    },
  ];

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "100vh",
        bgcolor: "#050B14",
        backgroundImage: "radial-gradient(ellipse at 50% 0%, #0F1D33 0%, #050B14 100%)",
        color: "#F8FAFC",
        fontFamily: "'Inter', sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── 1. 50px TOP HEADER ── */}
      <Box
        sx={{
          height: 50,
          px: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: "rgba(10, 18, 32, 0.85)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        {/* Brand Logo */}
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: "6px",
              background: "linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: "14px",
              color: "#FFFFFF",
              boxShadow: "0 0 12px rgba(37, 99, 235, 0.5)",
            }}
          >
            P
          </Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, fontSize: "16px", letterSpacing: "0.5px" }}>
            Pay2Pay <span style={{ color: "#38BDF8", fontWeight: 400 }}>Retailer Portal</span>
          </Typography>
        </Stack>

        {/* Center Search Input */}
        <TextField
          placeholder="Search customers, transactions, accounts..."
          variant="outlined"
          size="small"
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <SearchIcon sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: 18 }} />
                </InputAdornment>
              ),
              sx: {
                height: 32,
                width: 380,
                borderRadius: "16px",
                bgcolor: "rgba(255, 255, 255, 0.06)",
                fontSize: "12px",
                color: "#FFFFFF",
                "& fieldset": { borderColor: "rgba(255, 255, 255, 0.1)" },
                "&:hover fieldset": { borderColor: "rgba(255, 255, 255, 0.25)" },
              },
            },
          }}
        />

        {/* Right Action Icons */}
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <IconButton size="small" sx={{ color: "rgba(255, 255, 255, 0.7)" }}>
            <SearchIcon sx={{ fontSize: 18 }} />
          </IconButton>

          <NotificationCenter />

          <Box sx={{ position: "relative" }}>
            <Avatar
              sx={{
                width: 28,
                height: 28,
                bgcolor: "#1E293B",
                fontSize: "12px",
                fontWeight: 700,
                border: "1px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              U
            </Avatar>
            <Box
              sx={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 7,
                height: 7,
                borderRadius: "50%",
                bgcolor: "#22C55E",
                border: "1.5px solid #050B14",
              }}
            />
          </Box>
        </Stack>
      </Box>

      {/* ── 2. 50px SUB-HEADER TABS ── */}
      <Box
        sx={{
          height: 40,
          px: 3,
          display: "flex",
          alignItems: "center",
          bgcolor: "rgba(10, 18, 32, 0.5)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <Stack direction="row" spacing={4}>
          {["Dashboard", "Accounts", "Payments", "Analytics"].map((tab) => {
            const isActive = activeTab === tab;
            return (
              <Box
                key={tab}
                onClick={() => setActiveTab(tab)}
                sx={{
                  py: 1,
                  position: "relative",
                  cursor: "pointer",
                  color: isActive ? "#38BDF8" : "rgba(255, 255, 255, 0.6)",
                  fontWeight: isActive ? 700 : 500,
                  fontSize: "13px",
                  transition: "all 150ms ease",
                  "&:hover": { color: "#FFFFFF" },
                  "&::after": isActive
                    ? {
                        content: '""',
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: "2px",
                        bgcolor: "#38BDF8",
                        boxShadow: "0 0 8px #38BDF8",
                      }
                    : {},
                }}
              >
                {tab}
              </Box>
            );
          })}
        </Stack>
      </Box>

      {/* ── 3. 60px METRICS BAR (6 Stat Cards) ── */}
      <Box
        sx={{
          px: 3,
          py: 1.5,
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(6, 1fr)" },
          gap: 1.5,
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          bgcolor: "rgba(10, 18, 32, 0.4)",
        }}
      >
        {/* Metric 1 */}
        <Box sx={{ px: 1.5, py: 0.75, borderRadius: "10px", bgcolor: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.25 }}>
            <PeopleAltIcon sx={{ fontSize: 14, color: "rgba(255, 255, 255, 0.5)" }} />
            <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 700, color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase" }}>
              ACTIVE CUSTOMERS:
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "14px", color: "#FFFFFF" }}>
              124,506
            </Typography>
            <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 700, color: "#22C55E" }}>
              (▲2.1%)
            </Typography>
          </Stack>
        </Box>

        {/* Metric 2 */}
        <Box sx={{ px: 1.5, py: 0.75, borderRadius: "10px", bgcolor: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.25 }}>
            <LanguageIcon sx={{ fontSize: 14, color: "rgba(255, 255, 255, 0.5)" }} />
            <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 700, color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase" }}>
              GLOBAL VOLUME:
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "14px", color: "#FFFFFF" }}>
              $3.8B
            </Typography>
            <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 700, color: "#EF4444" }}>
              (▼0.4%)
            </Typography>
          </Stack>
        </Box>

        {/* Metric 3 */}
        <Box sx={{ px: 1.5, py: 0.75, borderRadius: "10px", bgcolor: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.25 }}>
            <PersonAddIcon sx={{ fontSize: 14, color: "rgba(255, 255, 255, 0.5)" }} />
            <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 700, color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase" }}>
              NEW ONBOARDING:
            </Typography>
          </Stack>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "14px", color: "#FFFFFF" }}>
            492
          </Typography>
        </Box>

        {/* Metric 4 */}
        <Box sx={{ px: 1.5, py: 0.75, borderRadius: "10px", bgcolor: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.25 }}>
            <WarningAmberIcon sx={{ fontSize: 14, color: "rgba(255, 255, 255, 0.5)" }} />
            <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 700, color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase" }}>
              FRAUD ALERTS:
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "14px", color: "#FFFFFF" }}>
              3
            </Typography>
            <Chip label="LOW" size="small" sx={{ bgcolor: "rgba(34, 197, 94, 0.15)", color: "#22C55E", fontWeight: 800, height: 16, fontSize: "9px" }} />
          </Stack>
        </Box>

        {/* Metric 5 */}
        <Box sx={{ px: 1.5, py: 0.75, borderRadius: "10px", bgcolor: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
          <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 700, color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase", display: "block", mb: 0.25 }}>
            KEY METRICS:
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "14px", color: "#FFFFFF" }}>
              $11.7B
            </Typography>
            <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 700, color: "#22C55E" }}>
              (▲2.4%)
            </Typography>
          </Stack>
        </Box>

        {/* Metric 6 */}
        <Box sx={{ px: 1.5, py: 0.75, borderRadius: "10px", bgcolor: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
          <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 700, color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase", display: "block", mb: 0.25 }}>
            RELATIVE VOLUME:
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "14px", color: "#FFFFFF" }}>
              $13,692
            </Typography>
            <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 700, color: "#22C55E" }}>
              (▲0.9%)
            </Typography>
          </Stack>
        </Box>
      </Box>

      {/* ── 4. MAIN WORKSPACE (BENEFICIARY CARDS + OPERATIONS PANEL) ── */}
      <Box
        sx={{
          p: 3,
          flex: 1,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 340px" },
          gap: 3,
        }}
      >
        {/* LEFT WORKSPACE: BENEFICIARY CARDS CONTAINER */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: "20px",
            bgcolor: "rgba(12, 22, 38, 0.65)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 12px 40px rgba(0, 0, 0, 0.4)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: "16px", letterSpacing: "0.5px", color: "#FFFFFF" }}>
              BENEFICIARY CARDS
            </Typography>
            <Select
              size="small"
              value={filterBeneficiary}
              onChange={(e) => setFilterBeneficiary(e.target.value)}
              sx={{
                height: 32,
                fontSize: "12px",
                fontWeight: 600,
                color: "rgba(255, 255, 255, 0.8)",
                bgcolor: "rgba(255, 255, 255, 0.05)",
                borderRadius: "10px",
                "& fieldset": { borderColor: "rgba(255, 255, 255, 0.12)" },
              }}
            >
              <MenuItem value="all">All Beneficiaries</MenuItem>
              <MenuItem value="active">Active Only</MenuItem>
              <MenuItem value="verified">Verified Only</MenuItem>
            </Select>
          </Stack>

          {/* 2x2 Beneficiary Cards Grid */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 2.5, flex: 1 }}>
            {beneficiaryCards.map((card) => (
              <Paper
                key={card.id}
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: "16px",
                  bgcolor: "rgba(18, 30, 52, 0.75)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "all 150ms ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    borderColor: "rgba(56, 189, 248, 0.5)",
                    boxShadow: "0 12px 32px rgba(37, 99, 235, 0.25)",
                  },
                }}
              >
                {/* Card Top: Avatar + Info + Bank Icon */}
                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                    <Avatar
                      sx={{
                        width: 44,
                        height: 44,
                        bgcolor: card.avatarBg,
                        color: "#FFFFFF",
                        fontWeight: 800,
                        fontSize: "16px",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                      }}
                    >
                      {card.avatarText}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "15px", lineHeight: 1.2 }}>
                        {card.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "12px" }}>
                        {card.account}
                      </Typography>
                    </Box>
                  </Stack>

                  <AccountBalanceIcon sx={{ color: "rgba(255, 255, 255, 0.4)", fontSize: 22 }} />
                </Stack>

                {/* Status Pill */}
                <Box sx={{ mb: 2 }}>
                  <Chip
                    label={card.status}
                    size="small"
                    sx={{
                      height: 22,
                      px: 1,
                      fontSize: "10px",
                      fontWeight: 800,
                      bgcolor: "rgba(34, 197, 94, 0.15)",
                      color: "#22C55E",
                      border: "1px solid rgba(34, 197, 94, 0.3)",
                    }}
                  />
                </Box>

                {/* Card Bottom: Country & Recent Amount */}
                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-end" }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.4)", fontSize: "11px", display: "block" }}>
                      Country
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#FFFFFF", fontSize: "13px" }}>
                      {card.flag} {card.country}
                    </Typography>
                  </Box>

                  <Box sx={{ textAlign: "right" }}>
                    <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.4)", fontSize: "11px", display: "block" }}>
                      Recent
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "15px" }}>
                      {card.recentAmount}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            ))}
          </Box>
        </Paper>

        {/* RIGHT WORKSPACE: OPERATIONS PANEL */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: "20px",
            bgcolor: "rgba(12, 22, 38, 0.65)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 12px 40px rgba(0, 0, 0, 0.4)",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {/* Header */}
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: "14px", letterSpacing: "0.5px", color: "rgba(255, 255, 255, 0.7)" }}>
              OPERATIONS PANEL
            </Typography>
            <IconButton size="small" sx={{ color: "rgba(255, 255, 255, 0.5)" }}>
              <MoreHorizIcon />
            </IconButton>
          </Stack>

          {/* Operations List */}
          <Stack spacing={1}>
            {/* Active Item: Transaction Approvals */}
            <Box
              sx={{
                p: 1.5,
                borderRadius: "12px",
                bgcolor: "rgba(37, 99, 235, 0.25)",
                border: "1px solid rgba(37, 99, 235, 0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
              }}
            >
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <CheckCircleIcon sx={{ color: "#38BDF8", fontSize: 18 }} />
                <Typography variant="body2" sx={{ fontWeight: 700, color: "#FFFFFF", fontSize: "13px" }}>
                  Transaction Approvals
                </Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: "#F97316", fontWeight: 700, fontSize: "12px" }}>
                (14 pending)
              </Typography>
            </Box>

            {/* Item 2 */}
            <Box sx={{ p: 1.25, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", "&:hover": { bgcolor: "rgba(255, 255, 255, 0.05)" } }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <PersonIcon sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: 18 }} />
                <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "13px" }}>
                  New Account Requests
                </Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "12px" }}>
                (6)
              </Typography>
            </Box>

            {/* Item 3 */}
            <Box sx={{ p: 1.25, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", "&:hover": { bgcolor: "rgba(255, 255, 255, 0.05)" } }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <SecurityIcon sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: 18 }} />
                <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "13px" }}>
                  Compliance Review
                </Typography>
              </Stack>
              <ChevronRightIcon sx={{ color: "rgba(255, 255, 255, 0.4)", fontSize: 16 }} />
            </Box>

            {/* Item 4 */}
            <Box sx={{ p: 1.25, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", "&:hover": { bgcolor: "rgba(255, 255, 255, 0.05)" } }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <WarningAmberIcon sx={{ color: "#EF4444", fontSize: 18 }} />
                <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "13px" }}>
                  Risk Alerts
                </Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: "#EF4444", fontWeight: 700, fontSize: "12px" }}>
                (2 High)
              </Typography>
            </Box>

            {/* Item 5 */}
            <Box sx={{ p: 1.25, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", "&:hover": { bgcolor: "rgba(255, 255, 255, 0.05)" } }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <AssignmentIcon sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: 18 }} />
                <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "13px" }}>
                  Audit Logs
                </Typography>
              </Stack>
              <ChevronRightIcon sx={{ color: "rgba(255, 255, 255, 0.4)", fontSize: 16 }} />
            </Box>

            {/* Item 6 */}
            <Box sx={{ p: 1.25, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", "&:hover": { bgcolor: "rgba(255, 255, 255, 0.05)" } }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <EventRepeatIcon sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: 18 }} />
                <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "13px" }}>
                  Scheduled Tasks
                </Typography>
              </Stack>
              <ChevronRightIcon sx={{ color: "rgba(255, 255, 255, 0.4)", fontSize: 16 }} />
            </Box>
          </Stack>

          {/* 3 Action Tabs */}
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            {["Quick", "Change", "Settings"].map((tabName) => {
              const isSelected = activeQuickTab === tabName;
              return (
                <Button
                  key={tabName}
                  size="small"
                  onClick={() => setActiveQuickTab(tabName)}
                  startIcon={
                    tabName === "Quick" ? <ListAltIcon sx={{ fontSize: 14 }} /> : tabName === "Change" ? <HistoryIcon sx={{ fontSize: 14 }} /> : <SettingsIcon sx={{ fontSize: 14 }} />
                  }
                  sx={{
                    flex: 1,
                    height: 36,
                    fontSize: "11px",
                    fontWeight: 700,
                    borderRadius: "10px",
                    color: isSelected ? "#FFFFFF" : "rgba(255, 255, 255, 0.7)",
                    bgcolor: isSelected ? "#2563EB" : "rgba(255, 255, 255, 0.05)",
                    border: isSelected ? "1px solid #3B82F6" : "1px solid rgba(255, 255, 255, 0.1)",
                    "&:hover": { bgcolor: isSelected ? "#1D4ED8" : "rgba(255, 255, 255, 0.1)" },
                  }}
                >
                  {tabName}
                </Button>
              );
            })}
          </Stack>

          {/* Line Chart Section */}
          <Box sx={{ mt: 1.5 }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, fontSize: "11px", color: "rgba(255, 255, 255, 0.6)", textTransform: "uppercase" }}>
                OPERATIONS OVERVIEW:
              </Typography>
              <Select
                size="small"
                defaultValue="24h"
                sx={{
                  height: 24,
                  fontSize: "10px",
                  color: "rgba(255, 255, 255, 0.7)",
                  bgcolor: "rgba(255, 255, 255, 0.05)",
                  "& fieldset": { borderColor: "rgba(255, 255, 255, 0.1)" },
                }}
              >
                <MenuItem value="24h">Last 24 Hours</MenuItem>
                <MenuItem value="7d">Last 7 Days</MenuItem>
              </Select>
            </Stack>

            {/* Glowing Blue SVG Area Line Chart */}
            <Box sx={{ width: "100%", height: 120, position: "relative" }}>
              <svg width="100%" height="100%" viewBox="0 0 300 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0,80 Q 40,90 75,50 T 150,70 T 225,30 T 300,20 L 300,100 L 0,100 Z"
                  fill="url(#blueGradient)"
                />
                <path
                  d="M 0,80 Q 40,90 75,50 T 150,70 T 225,30 T 300,20"
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="2.5"
                />
              </svg>
              {/* X Axis Labels */}
              <Stack direction="row" sx={{ justifyContent: "space-between", px: 0.5, mt: 0.5 }}>
                {["0", "6", "12", "18", "24"].map((h) => (
                  <Typography key={h} variant="caption" sx={{ fontSize: "9px", color: "rgba(255, 255, 255, 0.4)" }}>
                    {h}
                  </Typography>
                ))}
              </Stack>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* ── 5. FOOTER ── */}
      <Box
        sx={{
          py: 1.5,
          textAlign: "center",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          bgcolor: "rgba(5, 11, 20, 0.9)",
        }}
      >
        <Typography variant="caption" sx={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.4)" }}>
          © 2021 SUPER REX PRODUCTS PRIVATE LIMITED | Pay2Pay Retailer Portal
        </Typography>
      </Box>
    </Box>
  );
};
