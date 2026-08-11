"use client";

import React from "react";
import {
  Card, CardContent, CardHeader, Button, ButtonProps, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Chip, ChipProps,
  Stepper, Step, StepLabel, Box, Typography, Skeleton, Badge, Drawer, Tabs, Tab
} from "@mui/material";

// ── Buttons ──
export interface M3ButtonProps extends ButtonProps {
  loading?: boolean;
}

export const M3Button: React.FC<M3ButtonProps> = ({
  children,
  loading = false,
  disabled,
  sx,
  ...props
}) => {
  return (
    <Button
      disabled={disabled || loading}
      sx={{
        borderRadius: 2.5,
        textTransform: "none",
        fontWeight: 700,
        px: 3,
        py: 1.25,
        boxShadow: "none",
        "&:hover": { boxShadow: "none" },
        ...sx,
      }}
      {...props}
    >
      {loading ? <CircularProgress size={20} color="inherit" /> : children}
    </Button>
  );
};

// ── Cards ──
export const M3Card: React.FC<{
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  sx?: any;
}> = ({ title, subtitle, action, children, sx }) => {
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: "1px solid #E5E7EB",
        backgroundColor: "#FFFFFF",
        p: 0,
        ...sx,
      }}
    >
      {(title || subtitle || action) && (
        <CardHeader
          title={typeof title === "string" ? <Typography variant="h6" sx={{ fontWeight: 700 }}>{title}</Typography> : title}
          subheader={subtitle}
          action={action}
          sx={{ pb: 1, borderBottom: "1px solid #F1F5F9" }}
        />
      )}
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>{children}</CardContent>
    </Card>
  );
};

// ── Dialogs ──
export const M3Dialog: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  maxWidth?: "xs" | "sm" | "md" | "lg";
}> = ({ open, onClose, title, children, actions, maxWidth = "sm" }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={maxWidth}
      slotProps={{
        paper: { sx: { borderRadius: 3, p: 1, border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" } },
      }}
    >
      <DialogTitle sx={{ fontWeight: 800, fontSize: "1.25rem", color: "#111827", pb: 1 }}>
        {title}
      </DialogTitle>
      <DialogContent sx={{ py: 2 }}>{children}</DialogContent>
      {actions && <DialogActions sx={{ px: 3, pb: 2.5 }}>{actions}</DialogActions>}
    </Dialog>
  );
};

// ── Status Chips ──
export const M3StatusChip: React.FC<{
  status: "SUCCESS" | "PENDING" | "FAILED" | "ACTIVE" | "VERIFIED" | "REJECTED" | string;
}> = ({ status }) => {
  const upper = status?.toUpperCase() || "";
  let color: ChipProps["color"] = "default";
  let bg = "#F3F4F6";
  let textColor = "#374151";

  if (["SUCCESS", "ACTIVE", "VERIFIED", "SETTLED"].includes(upper)) {
    bg = "#DCFCE7";
    textColor = "#15803D";
  } else if (["PENDING", "PROCESSING", "IN_REVIEW"].includes(upper)) {
    bg = "#FEF3C7";
    textColor = "#B45309";
  } else if (["FAILED", "REJECTED", "SUSPENDED"].includes(upper)) {
    bg = "#FEE2E2";
    textColor = "#B91C1C";
  }

  return (
    <Chip
      label={upper}
      size="small"
      sx={{
        backgroundColor: bg,
        color: textColor,
        fontWeight: 700,
        fontSize: "0.7rem",
        borderRadius: 1.5,
        px: 0.5,
      }}
    />
  );
};

// ── Stepper ──
export const M3Stepper: React.FC<{
  steps: string[];
  activeStep: number;
}> = ({ steps, activeStep }) => {
  return (
    <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
      {steps.map((label) => (
        <Step key={label}>
          <StepLabel
            slotProps={{
              stepIcon: {
                sx: {
                  "&.Mui-active": { color: "#2563EB" },
                  "&.Mui-completed": { color: "#16A34A" },
                },
              },
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 600, color: "#374151" }}>
              {label}
            </Typography>
          </StepLabel>
        </Step>
      ))}
    </Stepper>
  );
};

// ── Skeleton Loader ──
export const M3TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <Box sx={{ width: "100%", spaceY: 2, p: 2 }}>
      {[...Array(rows)].map((_, i) => (
        <Skeleton key={i} variant="rounded" height={48} sx={{ my: 1, borderRadius: 2 }} />
      ))}
    </Box>
  );
};
