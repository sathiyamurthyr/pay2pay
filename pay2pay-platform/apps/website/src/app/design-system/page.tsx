"use client";

import React from "react";
import { Box, Typography, Stack, Divider, Paper } from "@mui/material";
import {
  Button,
  SearchInput,
  StatusChip,
  MetricCard,
  GlassCard,
  CustomerCard,
  TransactionCard,
  ProgressBar,
} from "@/design-system/components";
import { tokens } from "@/design-system/tokens/design-tokens";

export default function DesignSystemShowcase() {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: tokens.colors.neutral.dark.bg, color: tokens.colors.neutral.dark.textPrimary, p: 4 }}>
      <Typography variant="h3" sx={{ fontWeight: 900, mb: 1, color: tokens.colors.brand.secondary }}>
        PAY2PAY ENTERPRISE DESIGN SYSTEM
      </Typography>
      <Typography variant="body1" sx={{ color: tokens.colors.neutral.dark.textSecondary, mb: 4 }}>
        Sprint 0 Component & Token Interactive Showcase Gallery
      </Typography>

      <Divider sx={{ borderColor: tokens.colors.neutral.dark.border, mb: 4 }} />

      {/* ── 1. COLOR TOKENS SHOWCASE ── */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
          1. Color Palette Tokens
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" }, gap: 2 }}>
          {[
            { label: "Primary Blue", color: tokens.colors.brand.primary },
            { label: "Secondary Blue", color: tokens.colors.brand.secondary },
            { label: "Accent Blue", color: tokens.colors.brand.accent },
            { label: "Dark Background", color: tokens.colors.neutral.dark.bg },
            { label: "Dark Surface", color: tokens.colors.neutral.dark.surfaceSolid },
            { label: "Success Green", color: tokens.colors.status.success },
            { label: "Warning Amber", color: tokens.colors.status.warning },
            { label: "Error Red", color: tokens.colors.status.error },
          ].map((c) => (
            <Paper key={c.label} elevation={0} sx={{ p: 2, bgcolor: tokens.colors.neutral.dark.surface, border: `1px solid ${tokens.colors.neutral.dark.border}` }}>
              <Box sx={{ height: 48, borderRadius: "8px", bgcolor: c.color, mb: 1 }} />
              <Typography variant="caption" sx={{ fontWeight: 800, color: tokens.colors.neutral.dark.textPrimary, display: "block" }}>
                {c.label}
              </Typography>
              <Typography variant="caption" sx={{ color: tokens.colors.neutral.dark.textSecondary }}>
                {c.color}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Box>

      {/* ── 2. BUTTON PRIMITIVES ── */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
          2. Action Buttons
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button variant="contained" color="primary">
            Primary Action
          </Button>
          <Button variant="outlined" color="primary">
            Secondary Action
          </Button>
          <Button variant="text" color="inherit">
            Text Button
          </Button>
        </Stack>
      </Box>

      {/* ── 3. SEARCH INPUT & FORM CONTROLS ── */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
          3. Enterprise Inputs & Controls
        </Typography>
        <Box sx={{ maxWidth: 600, mb: 2 }}>
          <SearchInput />
        </Box>
        <Stack direction="row" spacing={1}>
          <StatusChip status="success" label="SYSTEM ONLINE (100%)" />
          <StatusChip status="warning" label="SLOW BANK RESPONSE" />
          <StatusChip status="error" label="SWITCH TIMEOUT" />
          <StatusChip status="info" label="AI ROUTING ACTIVE" />
        </Stack>
      </Box>

      {/* ── 4. CARDS & GLASS SURFACES ── */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
          4. Metric & Glassmorphism Cards
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 3 }}>
          <MetricCard title="Today's Transaction Volume" value="₹1,24,500.00" subtitle="+18.4% vs Yesterday" trend="UP" />
          <MetricCard title="Gross Margin Commission" value="₹450.00" subtitle="Instant Payout Credited" />
          <GlassCard>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: tokens.colors.brand.secondary }}>
              AI Route Optimization
            </Typography>
            <Typography variant="body2" sx={{ color: tokens.colors.neutral.dark.textSecondary, mt: 1 }}>
              HDFC SmartSwitch route selected. 99.9% success probability.
            </Typography>
          </GlassCard>
        </Box>
      </Box>

      {/* ── 5. CUSTOMER & TRANSACTION CARDS ── */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
          5. Customer & Transaction Primitives
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
          <CustomerCard name="Ramesh Kumar" mobile="9876543210" status="ACTIVE" kyc="eKYC VERIFIED" />
          <TransactionCard txnId="98124012" amount="₹25,000.00" status="success" date="07 Aug 2026, 12:45 PM" />
        </Box>
      </Box>

      {/* ── 6. PROGRESS BAR ── */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
          6. Progress Indicators
        </Typography>
        <Typography variant="caption" sx={{ color: tokens.colors.neutral.dark.textSecondary, mb: 1, display: "block" }}>
          Transfer Processing (75%)
        </Typography>
        <ProgressBar value={75} />
      </Box>
    </Box>
  );
}
