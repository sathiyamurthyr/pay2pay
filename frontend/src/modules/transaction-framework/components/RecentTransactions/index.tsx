import React from "react";
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, Paper } from "@mui/material";
import { StatusChip } from "@/design-system/components";

export interface TransactionRowItem {
  id: string;
  customer: string;
  mobile: string;
  beneficiary: string;
  bank: string;
  channel: string;
  amount: string;
  fee: string;
  status: "success" | "warning" | "error" | "info";
  date: string;
}

export interface RecentTransactionsProps {
  transactions?: TransactionRowItem[];
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({ transactions = [] }) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
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
          fontSize: "20px",
          letterSpacing: "-0.2px",
          mb: 2,
          display: "block",
        }}
      >
        Recent Transactions Audit Ledger
      </Typography>

      <Box sx={{ maxHeight: 300, overflowY: "auto" }}>
        {transactions.length === 0 ? (
          <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "14px", py: 3, textAlign: "center" }}>
            No recent transactions found in audit ledger.
          </Typography>
        ) : (
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
                <TableCell align="right">TIMESTAMP</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((row) => (
                <TableRow
                  key={row.id}
                  sx={{
                    "&:hover": { bgcolor: "rgba(255, 255, 255, 0.05)" },
                    "& td": { borderColor: "rgba(255, 255, 255, 0.08)", color: "#FFFFFF", py: 1.25 },
                  }}
                >
                  <TableCell sx={{ fontFamily: "monospace", fontWeight: 700, color: "#60A5FA" }}>{row.id}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{row.customer}</TableCell>
                  <TableCell sx={{ color: "rgba(255, 255, 255, 0.70)" }}>{row.mobile}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{row.beneficiary}</TableCell>
                  <TableCell>{row.bank}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: "#38BDF8" }}>{row.channel}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: "#4ADE80" }}>{row.amount}</TableCell>
                  <TableCell sx={{ color: "rgba(255, 255, 255, 0.70)" }}>{row.fee}</TableCell>
                  <TableCell>
                    <StatusChip status={row.status} label={row.status.toUpperCase()} />
                  </TableCell>
                  <TableCell align="right" sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>
                    {row.date}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>
    </Paper>
  );
};
