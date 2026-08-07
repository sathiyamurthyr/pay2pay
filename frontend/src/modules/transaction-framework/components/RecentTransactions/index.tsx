import React from "react";
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, Paper } from "@mui/material";
import { StatusChip } from "@/design-system/components";

export const RecentTransactions: React.FC = () => {
  const rows = [
    { id: "TXN-98124012", customer: "Ramesh Kumar", mobile: "9876543210", beneficiary: "Sarah Chen", bank: "HDFC Bank", channel: "IMPS", amount: "₹25,000.00", fee: "₹125.00", status: "success", date: "Today, 13:45:12" },
    { id: "TXN-98124011", customer: "Suresh Kumar", mobile: "9876543211", beneficiary: "Vertex Solutions", bank: "ICICI Bank", channel: "IMPS", amount: "₹10,000.00", fee: "₹50.00", status: "success", date: "Today, 13:30:05" },
    { id: "TXN-98124010", customer: "Anita Devi", mobile: "9876543212", beneficiary: "Marcus Rodriguez", bank: "SBI", channel: "NEFT", amount: "₹5,000.00", fee: "₹25.00", status: "success", date: "Today, 13:15:44" },
  ];

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3, // 24px padding
        borderRadius: "16px",
        bgcolor: "rgba(18, 27, 48, 0.75)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.37)",
        color: "#FFFFFF",
        width: "100%",
        overflowX: "auto",
      }}
    >
      <Typography
        sx={{
          color: "#60A5FA",
          fontWeight: 600,
          fontSize: "20px", // Section Heading 20px (Weight 600)
          letterSpacing: "-0.2px",
          mb: 2,
          display: "block",
        }}
      >
        Recent Transactions Audit Ledger
      </Typography>

      <Box sx={{ maxHeight: 300, overflowY: "auto" }}>
        <Table size="small" stickyHeader sx={{ minWidth: 800 }}>
          <TableHead>
            <TableRow
              sx={{
                "& th": {
                  bgcolor: "rgba(15, 23, 42, 0.95)",
                  borderColor: "rgba(255, 255, 255, 0.12)",
                  color: "rgba(255, 255, 255, 0.70)",
                  fontWeight: 800,
                  fontSize: "12px",
                  py: 1.5,
                },
              }}
            >
              <TableCell>TRANSACTION ID</TableCell>
              <TableCell>CUSTOMER</TableCell>
              <TableCell>MOBILE</TableCell>
              <TableCell>BENEFICIARY</TableCell>
              <TableCell>BANK NAME</TableCell>
              <TableCell>CHANNEL</TableCell>
              <TableCell>AMOUNT</TableCell>
              <TableCell>FEE</TableCell>
              <TableCell>STATUS</TableCell>
              <TableCell>TIMESTAMP</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow
                key={r.id}
                sx={{
                  "& td": { borderColor: "rgba(255, 255, 255, 0.08)", color: "#FFFFFF", fontSize: "14px", py: 1.25 },
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.04)" },
                  transition: "all 150ms ease",
                }}
              >
                <TableCell sx={{ fontWeight: 800, fontFamily: "monospace" }}>{r.id}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{r.customer}</TableCell>
                <TableCell sx={{ color: "rgba(255, 255, 255, 0.70)" }}>{r.mobile}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{r.beneficiary}</TableCell>
                <TableCell>{r.bank}</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#60A5FA" }}>{r.channel}</TableCell>
                <TableCell sx={{ fontWeight: 900, color: "#FFFFFF" }}>{r.amount}</TableCell>
                <TableCell sx={{ color: "#60A5FA" }}>{r.fee}</TableCell>
                <TableCell><StatusChip status="success" label="SUCCESS" /></TableCell>
                <TableCell sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "12px" }}>{r.date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  );
};
