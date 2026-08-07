import React from "react";
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, Paper } from "@mui/material";
import { StatusChip } from "@/design-system/components";

export const RecentTransactions: React.FC = () => {
  const rows = [
    { id: "TXN-98124012", customer: "Ramesh Kumar", amount: "₹25,000.00", status: "success", date: "Today, 12:45 PM" },
    { id: "TXN-98124011", customer: "Suresh Kumar", amount: "₹10,000.00", status: "success", date: "Today, 11:30 AM" },
    { id: "TXN-98124010", customer: "Anita Devi", amount: "₹5,000.00", status: "success", date: "Today, 10:15 AM" },
  ];

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: "16px",
        bgcolor: "#FFFFFF",
        border: "1px solid #E2E8F0",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: "#2563EB",
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "1px",
          mb: 2,
          display: "block",
        }}
      >
        RECENT TRANSACTION AUDIT LEDGER
      </Typography>

      <Table size="small">
        <TableHead>
          <TableRow sx={{ "& th": { borderColor: "#E2E8F0", color: "#64748B", fontWeight: 700 } }}>
            <TableCell>Transaction ID</TableCell>
            <TableCell>Customer</TableCell>
            <TableCell>Amount</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Date</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id} sx={{ "& td": { borderColor: "#E2E8F0", color: "#0F172A" } }}>
              <TableCell sx={{ fontWeight: 800 }}>{r.id}</TableCell>
              <TableCell>{r.customer}</TableCell>
              <TableCell sx={{ fontWeight: 900, color: "#2563EB" }}>{r.amount}</TableCell>
              <TableCell><StatusChip status="success" label="SUCCESS" /></TableCell>
              <TableCell sx={{ color: "#64748B" }}>{r.date}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
};
