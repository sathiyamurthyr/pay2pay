import React from "react";
import { Box, Paper, Stack, Typography, Grid } from "@mui/material";
import { tokens } from "../tokens/design-tokens";

// ── 1. BASE APP SHELL ──
export interface AppShellProps {
  headerTitle?: string;
  headerSubtitle?: string;
  leftSidebar?: React.ReactNode;
  rightOperations?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  leftSidebar,
  rightOperations,
  children,
}) => {
  return (
    <Box
      sx={{
        width: "100vw",
        minHeight: "100vh",
        bgcolor: tokens.colors.neutral.dark.bg,
        color: tokens.colors.neutral.dark.textPrimary,
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          lg: leftSidebar && rightOperations
            ? "310px minmax(0, 1fr) 360px"
            : leftSidebar
            ? "310px minmax(0, 1fr)"
            : rightOperations
            ? "minmax(0, 1fr) 360px"
            : "1fr",
        },
        alignItems: "start",
        gap: 3,
        p: 2,
      }}
    >
      {leftSidebar && <Box sx={{ width: "100%", minWidth: 0 }}>{leftSidebar}</Box>}
      <Box sx={{ flex: 1, width: "100%", minWidth: 0 }}>{children}</Box>
      {rightOperations && <Box sx={{ width: "360px", minWidth: 0 }}>{rightOperations}</Box>}
    </Box>
  );
};

// ── 2. GENERAL PAGE LAYOUT ──
export const PageLayout: React.FC<{ title: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode }> = ({
  title,
  subtitle,
  actions,
  children,
}) => (
  <Stack spacing={3} sx={{ width: "100%", minWidth: 0 }}>
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, color: tokens.colors.neutral.dark.textPrimary }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" sx={{ color: tokens.colors.neutral.dark.textSecondary }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && <Box>{actions}</Box>}
    </Box>
    {children}
  </Stack>
);

// ── 3. TWO COLUMN LAYOUT ──
export const TwoColumnLayout: React.FC<{ left: React.ReactNode; right: React.ReactNode; ratio?: string }> = ({
  left,
  right,
  ratio = "1fr 1fr",
}) => (
  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: ratio }, gap: 3, width: "100%" }}>
    <Box sx={{ minWidth: 0 }}>{left}</Box>
    <Box sx={{ minWidth: 0 }}>{right}</Box>
  </Box>
);

// ── 4. THREE COLUMN LAYOUT ──
export const ThreeColumnLayout: React.FC<{ left: React.ReactNode; center: React.ReactNode; right: React.ReactNode }> = ({
  left,
  center,
  right,
}) => (
  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "300px minmax(0, 1fr) 320px" }, gap: 3, width: "100%" }}>
    <Box sx={{ minWidth: 0 }}>{left}</Box>
    <Box sx={{ minWidth: 0 }}>{center}</Box>
    <Box sx={{ minWidth: 0 }}>{right}</Box>
  </Box>
);

// ── 5. DASHBOARD LAYOUT ──
export const DashboardLayout: React.FC<{ kpiRow: React.ReactNode; mainContent: React.ReactNode; sideContent?: React.ReactNode }> = ({
  kpiRow,
  mainContent,
  sideContent,
}) => (
  <Stack spacing={3} sx={{ width: "100%" }}>
    <Box sx={{ width: "100%" }}>{kpiRow}</Box>
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: sideContent ? "minmax(0, 1fr) 360px" : "1fr" }, gap: 3 }}>
      <Box sx={{ minWidth: 0 }}>{mainContent}</Box>
      {sideContent && <Box sx={{ minWidth: 0 }}>{sideContent}</Box>}
    </Box>
  </Stack>
);

// ── 6. FORM LAYOUT ──
export const FormLayout: React.FC<{ header?: React.ReactNode; children: React.ReactNode; actions?: React.ReactNode }> = ({
  header,
  children,
  actions,
}) => (
  <Paper elevation={0} sx={{ p: 3, borderRadius: "12px", bgcolor: tokens.colors.neutral.dark.surface, border: `1px solid ${tokens.colors.neutral.dark.border}` }}>
    {header && <Box sx={{ mb: 2.5 }}>{header}</Box>}
    <Stack spacing={2.5}>{children}</Stack>
    {actions && <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${tokens.colors.neutral.dark.border}` }}>{actions}</Box>}
  </Paper>
);

// ── 7. DATA ENTRY LAYOUT ──
export const DataEntryLayout: React.FC<{ searchBar: React.ReactNode; entryForm: React.ReactNode; historyTable: React.ReactNode }> = ({
  searchBar,
  entryForm,
  historyTable,
}) => (
  <Stack spacing={3} sx={{ width: "100%" }}>
    <Box sx={{ width: "100%" }}>{searchBar}</Box>
    <Box sx={{ width: "100%" }}>{entryForm}</Box>
    <Box sx={{ width: "100%" }}>{historyTable}</Box>
  </Stack>
);

// ── 8. REPORT LAYOUT ──
export const ReportLayout: React.FC<{ filterBar: React.ReactNode; chartSummary: React.ReactNode; reportTable: React.ReactNode }> = ({
  filterBar,
  chartSummary,
  reportTable,
}) => (
  <Stack spacing={3} sx={{ width: "100%" }}>
    <Box sx={{ width: "100%" }}>{filterBar}</Box>
    <Box sx={{ width: "100%" }}>{chartSummary}</Box>
    <Box sx={{ width: "100%" }}>{reportTable}</Box>
  </Stack>
);

// ── 9. TRANSACTION LAYOUT ──
export const TransactionLayout: React.FC<{ customerHeader: React.ReactNode; beneficiaryGrid: React.ReactNode; amountForm: React.ReactNode; auditLedger: React.ReactNode }> = ({
  customerHeader,
  beneficiaryGrid,
  amountForm,
  auditLedger,
}) => (
  <Stack spacing={3} sx={{ width: "100%" }}>
    {customerHeader}
    {beneficiaryGrid}
    {amountForm}
    {auditLedger}
  </Stack>
);
