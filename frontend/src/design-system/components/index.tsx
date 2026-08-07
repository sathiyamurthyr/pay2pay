import React from "react";
import {
  Button as MuiButton,
  ButtonProps as MuiButtonProps,
  IconButton as MuiIconButton,
  IconButtonProps as MuiIconButtonProps,
  TextField as MuiTextField,
  TextFieldProps as MuiTextFieldProps,
  Select as MuiSelect,
  SelectProps as MuiSelectProps,
  Checkbox as MuiCheckbox,
  Radio as MuiRadio,
  Switch as MuiSwitch,
  Chip as MuiChip,
  Paper,
  Box,
  Typography,
  Stack,
  Skeleton as MuiSkeleton,
  Dialog as MuiDialog,
  Drawer as MuiDrawer,
  Snackbar as MuiSnackbar,
  LinearProgress,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import WarningIcon from "@mui/icons-material/Warning";
import InfoIcon from "@mui/icons-material/Info";
import { tokens } from "../tokens/design-tokens";

// ── 1. BUTTON & ICON BUTTON ──
export const Button: React.FC<MuiButtonProps> = (props) => <MuiButton {...props} />;
export const IconButton: React.FC<MuiIconButtonProps> = (props) => <MuiIconButton {...props} />;

// ── 2. SEARCH INPUT ──
export const SearchInput: React.FC<MuiTextFieldProps> = (props) => (
  <MuiTextField
    fullWidth
    variant="outlined"
    placeholder="Search customer mobile, account, or transaction reference..."
    slotProps={{
      input: {
        startAdornment: <SearchIcon sx={{ color: tokens.colors.brand.primary, mr: 1, fontSize: 20 }} />,
        sx: {
          borderRadius: tokens.radii.md,
          bgcolor: tokens.colors.neutral.dark.surface,
          color: tokens.colors.neutral.dark.textPrimary,
          "& fieldset": { borderColor: tokens.colors.neutral.dark.border },
          "&:hover fieldset": { borderColor: tokens.colors.brand.primary },
        },
      },
    }}
    {...props}
  />
);

// ── 3. TEXTFIELD & SELECT ──
export const TextField: React.FC<MuiTextFieldProps> = (props) => <MuiTextField {...props} />;
export const Select: React.FC<MuiSelectProps> = (props) => <MuiSelect {...props} />;

// ── 4. SELECTION CONTROLS ──
export const Checkbox = MuiCheckbox;
export const Radio = MuiRadio;
export const Switch = MuiSwitch;

// ── 5. STATUS CHIP ──
export interface StatusChipProps {
  status: "success" | "warning" | "error" | "info";
  label: string;
}
export const StatusChip: React.FC<StatusChipProps> = ({ status, label }) => {
  const statusMap = {
    success: { bg: tokens.colors.status.successSubtle, color: tokens.colors.status.successText, icon: CheckCircleIcon },
    warning: { bg: tokens.colors.status.warningSubtle, color: tokens.colors.status.warningText, icon: WarningIcon },
    error: { bg: tokens.colors.status.errorSubtle, color: tokens.colors.status.errorText, icon: ErrorIcon },
    info: { bg: tokens.colors.status.infoSubtle, color: tokens.colors.status.infoText, icon: InfoIcon },
  };
  const cfg = statusMap[status];
  const IconComp = cfg.icon;

  return (
    <MuiChip
      icon={<IconComp sx={{ fontSize: "14px !important", color: `${cfg.color} !important` }} />}
      label={label}
      size="small"
      sx={{
        bgcolor: cfg.bg,
        color: cfg.color,
        fontWeight: 800,
        fontSize: "11px",
        borderRadius: tokens.radii.sm,
        border: `1px solid ${cfg.color}33`,
      }}
    />
  );
};

// ── 6. METRIC CARD ──
export interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: string;
  icon?: React.ReactNode;
}
export const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, trend, icon }) => (
  <Paper
    elevation={0}
    sx={{
      p: 2.5,
      borderRadius: tokens.radii.lg,
      bgcolor: tokens.colors.neutral.dark.surface,
      border: `1px solid ${tokens.colors.neutral.dark.border}`,
      background: tokens.colors.gradients.darkSurface,
    }}
  >
    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
      <Box>
        <Typography variant="caption" sx={{ color: tokens.colors.neutral.dark.textSecondary, fontWeight: 700, textTransform: "uppercase" }}>
          {title}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 900, color: tokens.colors.neutral.dark.textPrimary, mt: 0.5 }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ color: tokens.colors.status.successText, fontWeight: 700, mt: 0.5, display: "block" }}>
            {subtitle} {trend && `(${trend})`}
          </Typography>
        )}
      </Box>
      {icon && <Box sx={{ p: 1, borderRadius: tokens.radii.md, bgcolor: tokens.colors.brand.primarySubtle, color: tokens.colors.brand.primary }}>{icon}</Box>}
    </Stack>
  </Paper>
);

// ── 7. GLASS CARD & INFO CARD ──
export const GlassCard: React.FC<{ children: React.ReactNode; sx?: object }> = ({ children, sx }) => (
  <Paper
    elevation={0}
    sx={{
      p: 3,
      borderRadius: tokens.radii.lg,
      bgcolor: "rgba(18, 27, 48, 0.65)",
      backdropFilter: "blur(20px)",
      border: `1px solid ${tokens.colors.neutral.dark.border}`,
      boxShadow: tokens.shadows.md,
      ...sx,
    }}
  >
    {children}
  </Paper>
);

export const InfoCard: React.FC<{ title: string; description: string; type?: "info" | "warning" }> = ({ title, description }) => (
  <GlassCard sx={{ borderLeft: `4px solid ${tokens.colors.brand.primary}` }}>
    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: tokens.colors.brand.secondary }}>
      {title}
    </Typography>
    <Typography variant="body2" sx={{ color: tokens.colors.neutral.dark.textSecondary, mt: 0.5 }}>
      {description}
    </Typography>
  </GlassCard>
);

// ── 8. CUSTOMER & TRANSACTION CARDS ──
export const CustomerCard: React.FC<{ name: string; mobile: string; status: string; kyc: string }> = ({ name, mobile, status, kyc }) => (
  <GlassCard>
    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: tokens.colors.neutral.dark.textPrimary }}>
          {name}
        </Typography>
        <Typography variant="body2" sx={{ color: tokens.colors.neutral.dark.textSecondary }}>
          Mobile: {mobile}
        </Typography>
      </Box>
      <Stack direction="row" spacing={1}>
        <StatusChip status="success" label={kyc} />
        <StatusChip status="info" label={status} />
      </Stack>
    </Stack>
  </GlassCard>
);

export const TransactionCard: React.FC<{ txnId: string; amount: string; status: "success" | "warning" | "error"; date: string }> = ({
  txnId,
  amount,
  status,
  date,
}) => (
  <GlassCard>
    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: tokens.colors.neutral.dark.textPrimary }}>
          TXN #{txnId}
        </Typography>
        <Typography variant="caption" sx={{ color: tokens.colors.neutral.dark.textSecondary }}>
          {date}
        </Typography>
      </Box>
      <Box sx={{ textAlign: "right" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 900, color: tokens.colors.neutral.dark.textPrimary }}>
          {amount}
        </Typography>
        <StatusChip status={status} label={status.toUpperCase()} />
      </Box>
    </Stack>
  </GlassCard>
);

export const WalletCard: React.FC<{ balance: string; locked: string }> = ({ balance, locked }) => (
  <MetricCard title="Main Wallet Balance" value={balance} subtitle={`Locked: ${locked}`} />
);

export const NotificationCard: React.FC<{ title: string; message: string; time: string }> = ({ title, message, time }) => (
  <GlassCard>
    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: tokens.colors.neutral.dark.textPrimary }}>
      {title}
    </Typography>
    <Typography variant="body2" sx={{ color: tokens.colors.neutral.dark.textSecondary, my: 0.5 }}>
      {message}
    </Typography>
    <Typography variant="caption" sx={{ color: tokens.colors.neutral.dark.textMuted }}>
      {time}
    </Typography>
  </GlassCard>
);

// ── 9. HEADERS & SECTION HEADERS ──
export const SectionHeader: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode }> = ({ title, subtitle, action }) => (
  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
    <Box>
      <Typography variant="caption" sx={{ color: tokens.colors.brand.secondary, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px" }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" sx={{ color: tokens.colors.neutral.dark.textSecondary, display: "block" }}>
          {subtitle}
        </Typography>
      )}
    </Box>
    {action && <Box>{action}</Box>}
  </Box>
);

export const PageHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <Box sx={{ mb: 3 }}>
    <Typography variant="h3" sx={{ fontWeight: 900, color: tokens.colors.neutral.dark.textPrimary }}>
      {title}
    </Typography>
    {subtitle && (
      <Typography variant="body2" sx={{ color: tokens.colors.neutral.dark.textSecondary, mt: 0.5 }}>
        {subtitle}
      </Typography>
    )}
  </Box>
);

// ── 10. NAVIGATION COMPONENT PRIMITIVES ──
export const SidebarItem: React.FC<{ label: string; active?: boolean; onClick?: () => void }> = ({ label, active, onClick }) => (
  <Box
    onClick={onClick}
    sx={{
      height: 56,
      px: "20px",
      borderRadius: tokens.radii.lg,
      bgcolor: active ? tokens.colors.brand.primarySubtle : "transparent",
      color: active ? tokens.colors.neutral.dark.textPrimary : tokens.colors.neutral.dark.textSecondary,
      fontWeight: active ? 700 : 600,
      fontSize: tokens.typography.fontSizes.lg,
      display: "flex",
      alignItems: "center",
      cursor: "pointer",
      transition: tokens.transitions.fast,
      "&:hover": { bgcolor: "rgba(255,255,255,0.05)" },
    }}
  >
    {label}
  </Box>
);

export const SidebarSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant="caption" sx={{ color: tokens.colors.brand.secondary, fontWeight: 800, fontSize: "11px", letterSpacing: "1px", px: "20px", mb: 1, display: "block" }}>
      {title}
    </Typography>
    <Stack spacing={0.5}>{children}</Stack>
  </Box>
);

// ── 11. FEEDBACK & STATES ──
export const ProgressBar: React.FC<{ value: number }> = ({ value }) => (
  <LinearProgress variant="determinate" value={value} sx={{ borderRadius: tokens.radii.pill, height: 8, bgcolor: tokens.colors.neutral.dark.border }} />
);

export const Skeleton: React.FC<{ height?: number }> = ({ height = 40 }) => (
  <MuiSkeleton variant="rounded" height={height} sx={{ bgcolor: tokens.colors.neutral.dark.border }} />
);

export const EmptyState: React.FC<{ message?: string }> = ({ message = "No transactions found." }) => (
  <Box sx={{ textAlign: "center", py: 6 }}>
    <InfoIcon sx={{ fontSize: 48, color: tokens.colors.neutral.dark.textMuted, mb: 1 }} />
    <Typography variant="body1" sx={{ color: tokens.colors.neutral.dark.textSecondary, fontWeight: 600 }}>
      {message}
    </Typography>
  </Box>
);

export const ErrorState: React.FC<{ error?: string }> = ({ error = "An error occurred while loading data." }) => (
  <Box sx={{ textAlign: "center", py: 6 }}>
    <ErrorIcon sx={{ fontSize: 48, color: tokens.colors.status.errorText, mb: 1 }} />
    <Typography variant="body1" sx={{ color: tokens.colors.status.errorText, fontWeight: 700 }}>
      {error}
    </Typography>
  </Box>
);

// Exports
export const Dialog = MuiDialog;
export const Drawer = MuiDrawer;
export const Snackbar = MuiSnackbar;
export const TabBar = Box;
export const Wizard = Box;
export const DataGrid = Box;
export const TableToolbar = Box;
export const DatePicker = Box;
export const TimePicker = Box;

