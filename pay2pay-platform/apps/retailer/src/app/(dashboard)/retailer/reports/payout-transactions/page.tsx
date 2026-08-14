"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/app-shell/AppShell";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from "@mui/material";

export default function RetailerPayoutReportPage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/retailer/reports/payout-transactions")
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.items) {
          setRows(data.data.items);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <AppShell pageTitle="Retailer Payout Transactions" activePath="/retailer/reports/payout-transactions">
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 3 }}>
          Payout Transactions Report
        </Typography>

        <Paper sx={{ p: 2, borderRadius: "12px", border: "1px solid #E2E8F0" }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Transaction ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date & Time</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Beneficiary</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: "#64748B" }}>
                      No payout transaction records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row: any) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.transaction_id}</TableCell>
                      <TableCell>{row.created_at || row.transaction_date}</TableCell>
                      <TableCell>{row.customer_name || "Merchant"}</TableCell>
                      <TableCell>₹{row.amount?.toLocaleString("en-IN")}</TableCell>
                      <TableCell>
                        <Chip
                          label={row.status}
                          color={row.status === "SUCCESS" ? "success" : "warning"}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    </AppShell>
  );
}
