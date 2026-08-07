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
        bgcolor: "rgba(18, 27, 48, 0.75)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.37)",
        color: "#FFFFFF",
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: "#60A5FA",
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
          <TableRow sx={{ "& th": { borderColor: "rgba(255, 255, 255, 0.12)", color: "rgba(255, 255, 255, 0.88)", fontWeight: 700 } }}>
            <TableCell>Transaction ID</TableCell>
            <TableCell>Customer</TableCell>
            <TableCell>Amount</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Date</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id} sx={{ "& td": { borderColor: "rgba(255, 255, 255, 0.08)", color: "#FFFFFF" } }}>
              <TableCell sx={{ fontWeight: 800 }}>{r.id}</TableCell>
              <TableCell>{r.customer}</TableCell>
              <TableCell sx={{ fontWeight: 900, color: "#60A5FA" }}>{r.amount}</TableCell>
              <TableCell><StatusChip status="success" label="SUCCESS" /></TableCell>
              <TableCell sx={{ color: "rgba(255, 255, 255, 0.65)" }}>{r.date}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
};
