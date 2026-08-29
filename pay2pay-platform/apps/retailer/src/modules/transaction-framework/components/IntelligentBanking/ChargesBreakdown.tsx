import React from "react";
import { Box, Typography, Stack, Paper, Table, TableBody, TableCell, TableRow } from "@mui/material";

export interface ChargesBreakdownProps {
  amount: number;
  charges: number;
}

export const ChargesBreakdown: React.FC<ChargesBreakdownProps> = ({ amount, charges }) => {
  const gst = Math.round(charges * 0.18);
  const totalDebit = amount + charges + gst;

  return (
    <Stack spacing={2} sx={{ p: 1 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: "12px", bgcolor: "rgba(18, 27, 48, 0.75)", border: "1px solid rgba(255, 255, 255, 0.12)" }}>
        <Table size="small">
          <TableBody>
            <TableRow sx={{ "& td": { color: "#FFFFFF", fontSize: "13px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", py: 1 } }}>
              <TableCell sx={{ color: "rgba(255, 255, 255, 0.70)", fontWeight: 600 }}>Transfer Principal Amount</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>₹{amount.toLocaleString()}.00</TableCell>
            </TableRow>

            <TableRow sx={{ "& td": { color: "#FFFFFF", fontSize: "13px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", py: 1 } }}>
              <TableCell sx={{ color: "rgba(255, 255, 255, 0.70)", fontWeight: 600 }}>Retailer Surcharge (Admin Slab)</TableCell>
              <TableCell align="right" sx={{ color: "#60A5FA", fontWeight: 800 }}>+ ₹{charges.toLocaleString()}.00</TableCell>
            </TableRow>

            <TableRow sx={{ "& td": { color: "#FFFFFF", fontSize: "13px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", py: 1 } }}>
              <TableCell sx={{ color: "rgba(255, 255, 255, 0.70)", fontWeight: 600 }}>GST on Surcharge (18%)</TableCell>
              <TableCell align="right" sx={{ color: "#93C5FD", fontWeight: 700 }}>+ ₹{gst.toLocaleString()}.00</TableCell>
            </TableRow>

            <TableRow sx={{ "& td": { color: "#FFFFFF", fontSize: "14px", py: 1.25 } }}>
              <TableCell sx={{ fontWeight: 900, color: "#3B82F6" }}>TOTAL WALLET DEBIT</TableCell>
              <TableCell align="right" sx={{ fontWeight: 900, color: "#3B82F6", fontSize: "16px" }}>₹{totalDebit.toLocaleString()}.00</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
};
