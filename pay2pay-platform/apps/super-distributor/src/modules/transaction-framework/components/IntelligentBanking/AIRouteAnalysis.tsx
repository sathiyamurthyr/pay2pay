import React from "react";
import { Box, Typography, Stack, Paper, Chip, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

export const AIRouteAnalysis: React.FC = () => {
  const routes = [
    { bank: "HDFC Bank (DirectSwitch)", success: "99.94%", failure: "0.06%", latency: "42ms", retry: "0%", status: "RECOMMENDED", color: "#4ADE80" },
    { bank: "ICICI Bank (InstantPay)", success: "99.70%", failure: "0.30%", latency: "65ms", retry: "0.1%", status: "BACKUP 1", color: "#60A5FA" },
    { bank: "State Bank of India", success: "98.40%", failure: "1.60%", latency: "140ms", retry: "1.2%", status: "BACKUP 2", color: "#FBBF24" },
    { bank: "Axis Bank Express", success: "99.50%", failure: "0.50%", latency: "80ms", retry: "0.3%", status: "STABLE", color: "#60A5FA" },
  ];

  return (
    <Stack spacing={2} sx={{ p: 1 }}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: "12px",
          bgcolor: "rgba(37, 99, 235, 0.15)",
          border: "1px solid rgba(37, 99, 235, 0.3)",
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1 }}>
          <AutoAwesomeIcon sx={{ color: "#60A5FA", fontSize: 20 }} />
          <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "15px" }}>
            AI Route Selection Rationale
          </Typography>
        </Stack>
        <Typography sx={{ color: "rgba(255, 255, 255, 0.85)", fontSize: "13px", lineHeight: 1.5 }}>
          <strong>HDFC DirectSwitch</strong> selected automatically: Lowest network latency (42ms), zero drop rate over past 24h, and highest retailer margin yield (+₹18.00). Network load is optimal (12% capacity).
        </Typography>
      </Paper>

      <Table size="small">
        <TableHead>
          <TableRow sx={{ "& th": { bgcolor: "rgba(15, 23, 42, 0.9)", color: "rgba(255, 255, 255, 0.6)", fontSize: "11px", fontWeight: 800 } }}>
            <TableCell>GATEWAY ROUTE</TableCell>
            <TableCell>SUCCESS %</TableCell>
            <TableCell>FAILURE %</TableCell>
            <TableCell>LATENCY</TableCell>
            <TableCell>RETRY %</TableCell>
            <TableCell align="right">ROUTE STATUS</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {routes.map((r) => (
            <TableRow key={r.bank} sx={{ "& td": { color: "#FFFFFF", fontSize: "13px", py: 1, borderColor: "rgba(255, 255, 255, 0.08)" } }}>
              <TableCell sx={{ fontWeight: 700 }}>{r.bank}</TableCell>
              <TableCell sx={{ color: "#4ADE80", fontWeight: 800 }}>{r.success}</TableCell>
              <TableCell sx={{ color: "rgba(255, 255, 255, 0.50)" }}>{r.failure}</TableCell>
              <TableCell sx={{ color: "#60A5FA" }}>{r.latency}</TableCell>
              <TableCell sx={{ color: "rgba(255, 255, 255, 0.50)" }}>{r.retry}</TableCell>
              <TableCell align="right">
                <Chip label={r.status} size="small" sx={{ bgcolor: "rgba(255, 255, 255, 0.1)", color: r.color, fontWeight: 800, fontSize: "10px", height: 20 }} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Stack>
  );
};
