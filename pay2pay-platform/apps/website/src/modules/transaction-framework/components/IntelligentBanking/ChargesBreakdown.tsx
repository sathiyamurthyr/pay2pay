import React from "react";
import { Box, Typography, Stack, Paper, Table, TableBody, TableCell, TableRow } from "@mui/material";

export interface ChargesBreakdownProps {
  amount: number;
  charges: number;
}

export const ChargesBreakdown: React.FC<ChargesBreakdownProps> = ({ amount, charges }) => {
  const gst = Math.round(charges * 0.18);
  const fee = charges - gst;
  const platformFee = Math.round(fee * 0.2);
  const bankFee = Math.round(fee * 0.3);
  const retailerMargin = Math.round(fee * 0.5);
  const commission = Math.round(amount * 0.0035);
  const netProfit = retailerMargin + commission;

  return (
    <Stack spacing={2} sx={{ p: 1 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: "12px", bgcolor: "rgba(18, 27, 48, 0.75)", border: "1px solid rgba(255, 255, 255, 0.12)" }}>
        <Table size="small">
          <TableBody>
            <TableRow sx={{ "& td": { color: "#FFFFFF", fontSize: "13px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", py: 1 } }}>
              <TableCell sx={{ color: "rgba(255, 255, 255, 0.70)", fontWeight: 600 }}>Customer Convenience Fee (Gross)</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>+ ₹{fee.toLocaleString()}.00</TableCell>
            </TableRow>

            <TableRow sx={{ "& td": { color: "#FFFFFF", fontSize: "13px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", py: 1 } }}>
              <TableCell sx={{ color: "rgba(255, 255, 255, 0.70)", fontWeight: 600 }}>GST on Convenience Fee (18%)</TableCell>
              <TableCell align="right" sx={{ color: "#93C5FD", fontWeight: 700 }}>+ ₹{gst.toLocaleString()}.00</TableCell>
            </TableRow>

            <TableRow sx={{ "& td": { color: "#FFFFFF", fontSize: "13px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", py: 1 } }}>
              <TableCell sx={{ color: "rgba(255, 255, 255, 0.70)", fontWeight: 600 }}>Platform Infrastructure Fee (PAY2PAY Share)</TableCell>
              <TableCell align="right" sx={{ color: "rgba(255, 255, 255, 0.60)" }}>- ₹{platformFee.toLocaleString()}.00</TableCell>
            </TableRow>

            <TableRow sx={{ "& td": { color: "#FFFFFF", fontSize: "13px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", py: 1 } }}>
              <TableCell sx={{ color: "rgba(255, 255, 255, 0.70)", fontWeight: 600 }}>Destination Bank Interchange Fee</TableCell>
              <TableCell align="right" sx={{ color: "rgba(255, 255, 255, 0.60)" }}>- ₹{bankFee.toLocaleString()}.00</TableCell>
            </TableRow>

            <TableRow sx={{ "& td": { color: "#FFFFFF", fontSize: "13px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", py: 1 } }}>
              <TableCell sx={{ color: "rgba(255, 255, 255, 0.70)", fontWeight: 600 }}>Direct Gateway Cashback Commission</TableCell>
              <TableCell align="right" sx={{ color: "#4ADE80", fontWeight: 800 }}>+ ₹{commission.toLocaleString()}.00</TableCell>
            </TableRow>

            <TableRow sx={{ "& td": { color: "#FFFFFF", fontSize: "14px", py: 1.25 } }}>
              <TableCell sx={{ fontWeight: 900, color: "#4ADE80" }}>NET EXPECTED RETAILER PROFIT</TableCell>
              <TableCell align="right" sx={{ fontWeight: 900, color: "#4ADE80", fontSize: "16px" }}>+ ₹{netProfit.toLocaleString()}.00</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
};
