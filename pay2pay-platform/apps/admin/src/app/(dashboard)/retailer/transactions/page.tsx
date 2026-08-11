"use client";

import React, { useState } from "react";
import { Box, Typography, Stack, MenuItem, TextField } from "@mui/material";
import { EnterpriseDataGrid, DataGridColumn } from "@/components/ui/enterprise-data-grid";
import { M3StatusChip } from "@/components/ui/m3-components";

interface FullTxnRecord {
  id: string;
  type: string;
  recipient: string;
  amount: number;
  charge: number;
  margin: number;
  status: string;
  utr: string;
  date: string;
}

const ALL_TXNS: FullTxnRecord[] = [
  { id: "TXN-90124", type: "DMT Transfer", recipient: "Kavitha Sharma (HDFC - 501009)", amount: 5000, charge: 10, margin: 6.50, status: "SUCCESS", utr: "UTR202608039012", date: "2026-08-03 18:24" },
  { id: "TXN-90123", type: "AEPS Cash Out", recipient: "Ramesh Kumar (Aadhaar **4412)", amount: 2000, charge: 0, margin: 5.00, status: "SUCCESS", utr: "RRN202608037719", date: "2026-08-03 18:10" },
  { id: "TXN-90122", type: "UPI QR Load", recipient: "Direct Wallet Top-up", amount: 10000, charge: 0, margin: 0.00, status: "SUCCESS", utr: "UPI202608036601", date: "2026-08-03 17:45" },
  { id: "TXN-90121", type: "BBPS Bill Pay", recipient: "TNEB Electricity (049281)", amount: 1450, charge: 0, margin: 3.50, status: "SUCCESS", utr: "BBPS202608034412", date: "2026-08-03 17:15" },
  { id: "TXN-90120", type: "Mobile Recharge", recipient: "Airtel Prepaid (9840192837)", amount: 299, charge: 0, margin: 7.45, status: "SUCCESS", utr: "OP8839201", date: "2026-08-03 16:50" },
  { id: "TXN-90119", type: "DMT Transfer", recipient: "Suresh Patel (SBI - 204918)", amount: 12000, charge: 20, margin: 14.00, status: "PENDING", utr: "UTR202608033321", date: "2026-08-03 16:20" },
  { id: "TXN-90118", type: "Settlement", recipient: "ICICI Bank (A/C: 001105991)", amount: 25000, charge: 5, margin: 0.00, status: "SETTLED", utr: "BANKUTR77182", date: "2026-08-03 15:10" },
];

export default function TransactionsPage() {
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filtered = statusFilter === "ALL" ? ALL_TXNS : ALL_TXNS.filter((t) => t.status === statusFilter);

  const columns: DataGridColumn<FullTxnRecord>[] = [
    { id: "id", label: "Txn ID", minWidth: 110, format: (val) => <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: "monospace" }}>{val}</Typography> },
    { id: "type", label: "Service", minWidth: 140, format: (val) => <Typography variant="body2" sx={{ fontWeight: 600 }}>{val}</Typography> },
    { id: "recipient", label: "Recipient / Account", minWidth: 220 },
    { id: "amount", label: "Amount", align: "right", format: (val) => <Typography variant="body2" sx={{ fontWeight: 800, fontFamily: "monospace" }}>₹{val.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Typography> },
    { id: "charge", label: "Fee", align: "right", format: (val) => <Typography variant="body2" sx={{ color: "#6B7280" }}>₹{val.toFixed(2)}</Typography> },
    { id: "margin", label: "Margin", align: "right", format: (val) => <Typography variant="body2" sx={{ fontWeight: 700, color: "#16A34A" }}>+₹{val.toFixed(2)}</Typography> },
    { id: "status", label: "Status", align: "center", format: (val) => <M3StatusChip status={val} /> },
    { id: "utr", label: "Bank UTR / RRN", minWidth: 160, format: (val) => <Typography variant="caption" sx={{ fontFamily: "monospace" }}>{val}</Typography> },
    { id: "date", label: "Timestamp", minWidth: 150 },
  ];

  return (
    <Box sx={{ spaceY: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 800, color: "#111827", mb: 0.5 }}>
        All Transactions & Audit Ledger
      </Typography>
      <Typography variant="body2" sx={{ color: "#6B7280", mb: 3 }}>
        Complete historical ledger with CSV/Excel export, UTR tracking & instant search.
      </Typography>

      <EnterpriseDataGrid
        title="Transaction History"
        columns={columns}
        rows={filtered}
        keyExtractor={(r) => r.id}
        searchPlaceholder="Search by Txn ID, Recipient, UTR..."
        actionButton={
          <TextField
            select
            size="small"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 140, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          >
            <MenuItem value="ALL">All Statuses</MenuItem>
            <MenuItem value="SUCCESS">Success</MenuItem>
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="FAILED">Failed</MenuItem>
            <MenuItem value="SETTLED">Settled</MenuItem>
          </TextField>
        }
      />
    </Box>
  );
}
