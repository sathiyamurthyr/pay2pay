import React from "react";
import { Box, Typography, Stack, Paper, Table, TableBody, TableCell, TableRow } from "@mui/material";

export interface ChargesBreakdownProps {
  amount: number;
  charges?: number;
  gst?: number;
  totalDebit?: number;
}

export const ChargesBreakdown: React.FC<ChargesBreakdownProps> = ({ amount, charges = 22, gst = 3, totalDebit }) => {
  const effectiveCharges = charges ?? 22;
  const effectiveGst = gst ?? 3;
  const effectiveTotal = totalDebit ?? (amount + effectiveCharges + effectiveGst);

  return (
    <Stack spacing={2} sx={{ p: 1 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: "12px", bgcolor: "rgba(18, 27, 48, 0.75)", border: "1px solid rgba(255, 255, 255, 0.12)" }}>
        <Table size="small">
          <TableBody>
            <TableRow sx={{ "& td": { color: "#FFFFFF", fontSize: "13px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", py: 1 } }}>
              <TableCell sx={{ color: "rgba(255, 255, 255, 0.70)", fontWeight: 600 }}>Transfer Principal Amount</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>₹{amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
            </TableRow>

            <TableRow sx={{ "& td": { color: "#FFFFFF", fontSize: "13px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", py: 1 } }}>
              <TableCell sx={{ color: "rgba(255, 255, 255, 0.70)", fontWeight: 600 }}>Payout Service Charge</TableCell>
              <TableCell align="right" sx={{ color: "#60A5FA", fontWeight: 800 }}>+ ₹{effectiveCharges.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
            </TableRow>

            <TableRow sx={{ "& td": { color: "#FFFFFF", fontSize: "13px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", py: 1 } }}>
              <TableCell sx={{ color: "rgba(255, 255, 255, 0.70)", fontWeight: 600 }}>GST</TableCell>
              <TableCell align="right" sx={{ color: "#93C5FD", fontWeight: 700 }}>+ ₹{effectiveGst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
            </TableRow>

            <TableRow sx={{ "& td": { color: "#FFFFFF", fontSize: "14px", py: 1.25 } }}>
              <TableCell sx={{ fontWeight: 900, color: "#3B82F6" }}>TOTAL WALLET DEBIT</TableCell>
              <TableCell align="right" sx={{ fontWeight: 900, color: "#3B82F6", fontSize: "16px" }}>₹{effectiveTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
};
