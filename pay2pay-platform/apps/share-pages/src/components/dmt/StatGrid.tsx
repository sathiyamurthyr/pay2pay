"use client";

import React from "react";
import { Box, Paper, Typography, Grid, LinearProgress } from "@mui/material";
import { CustomerLimits, LastTransaction } from "@/types/dmt";
import { formatINR, formatDate } from "@/lib/format";

export interface StatGridProps {
  limits: CustomerLimits;
  lastTransaction: LastTransaction;
}

export function StatGrid({ limits, lastTransaction }: StatGridProps) {
  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {/* 1. MONTHLY LIMIT */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Paper elevation={0} sx={{ p: 2, borderRadius: "12px", bgcolor: "#FFFFFF", border: "1px solid #e7e2d4" }}>
          <Typography variant="caption" sx={{ color: "#6b7290", fontWeight: 700, textTransform: "uppercase", fontSize: "11px", display: "block", mb: 0.5 }}>
            MONTHLY LIMIT
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "#1c2340", fontSize: "18px" }}>
            {formatINR(limits.monthlyLimit)}
          </Typography>
          <Typography variant="caption" sx={{ color: "#6b7290", fontSize: "11px" }}>
            Standard DMT Cap
          </Typography>
        </Paper>
      </Grid>

      {/* 2. MONTHLY USED */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Paper elevation={0} sx={{ p: 2, borderRadius: "12px", bgcolor: "#FFFFFF", border: "1px solid #e7e2d4" }}>
          <Typography variant="caption" sx={{ color: "#6b7290", fontWeight: 700, textTransform: "uppercase", fontSize: "11px", display: "block", mb: 0.5 }}>
            MONTHLY USED
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "#7a1329", fontSize: "18px" }}>
            {formatINR(limits.monthlyUsed)}
          </Typography>
          <Box sx={{ mt: 1 }}>
            <LinearProgress
              variant="determinate"
              value={limits.usedPercent}
              role="progressbar"
              aria-valuenow={limits.usedPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              sx={{ height: 6, borderRadius: "3px", bgcolor: "#f6f2e9", "& .MuiLinearProgress-bar": { bgcolor: "#7a1329" } }}
            />
            <Typography variant="caption" sx={{ color: "#6b7290", fontSize: "10px", display: "block", mt: 0.5 }}>
              {limits.usedPercent}% of total cap
            </Typography>
          </Box>
        </Paper>
      </Grid>

      {/* 3. MONTHLY REMAINING */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Paper elevation={0} sx={{ p: 2, borderRadius: "12px", bgcolor: "#FFFFFF", border: "1px solid #e7e2d4" }}>
          <Typography variant="caption" sx={{ color: "#6b7290", fontWeight: 700, textTransform: "uppercase", fontSize: "11px", display: "block", mb: 0.5 }}>
            REMAINING LIMIT
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "#1e8e5a", fontSize: "18px" }}>
            {formatINR(limits.monthlyRemaining)}
          </Typography>
          <Box sx={{ mt: 1 }}>
            <LinearProgress
              variant="determinate"
              value={limits.remainingPercent}
              role="progressbar"
              aria-valuenow={limits.remainingPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              sx={{ height: 6, borderRadius: "3px", bgcolor: "#f6f2e9", "& .MuiLinearProgress-bar": { bgcolor: "#1e8e5a" } }}
            />
            <Typography variant="caption" sx={{ color: "#6b7290", fontSize: "10px", display: "block", mt: 0.5 }}>
              {limits.remainingPercent}% available
            </Typography>
          </Box>
        </Paper>
      </Grid>

      {/* 4. LAST TRANSACTION */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Paper elevation={0} sx={{ p: 2, borderRadius: "12px", bgcolor: "#FFFFFF", border: "1px solid #e7e2d4" }}>
          <Typography variant="caption" sx={{ color: "#6b7290", fontWeight: 700, textTransform: "uppercase", fontSize: "11px", display: "block", mb: 0.5 }}>
            LAST TRANSACTION
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "#1c2340", fontSize: "18px" }}>
            {formatINR(lastTransaction.amount)}
          </Typography>
          <Typography variant="caption" sx={{ color: "#6b7290", fontSize: "11px" }}>
            {lastTransaction.mode} • {formatDate(lastTransaction.timestamp)}
          </Typography>
        </Paper>
      </Grid>
    </Grid>
  );
}
