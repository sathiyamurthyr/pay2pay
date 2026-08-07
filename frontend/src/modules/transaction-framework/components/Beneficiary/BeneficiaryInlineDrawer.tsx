import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Stack,
  Paper,
  Chip,
  Divider,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import StarIcon from "@mui/icons-material/Star";
import SecurityIcon from "@mui/icons-material/Security";
import { BeneficiaryData, TransactionRecord } from "../../hooks/useBeneficiary";

export interface BeneficiaryInlineDrawerProps {
  beneficiary: BeneficiaryData;
  isOpen: boolean;
}

export const BeneficiaryInlineDrawer: React.FC<BeneficiaryInlineDrawerProps> = ({
  beneficiary,
  isOpen,
}) => {
  const [detailsCache, setDetailsCache] = useState<Record<string, any>>({});

  useEffect(() => {
    if (isOpen && beneficiary && !detailsCache[beneficiary.id]) {
      // Simulate API fetch: GET /beneficiaries/{beneficiaryId}/details
      const fetchedDetails = {
        monthlyLimit: 200000,
        monthlyRemaining: beneficiary.monthlyRemaining ?? 80000,
        todayReceived: 15000,
        todayRemaining: 35000,
        totalTransferCount: beneficiary.transferCount || 24,
        averageTransferAmount: beneficiary.avgTransfer || 12500,
        lastTransferAmount: beneficiary.lastTransferAmount || 10000,
        lastTransferDatetime: beneficiary.lastTransferDate || "2026-08-07 14:20:15",
        riskLevel: beneficiary.riskScore ? "LOW RISK (99.4%)" : "LOW RISK",
        registeredDate: beneficiary.createdDate || "2025-01-15",
        recentTransactions: beneficiary.recentTransactions || [
          { id: "TXN-89210", date: "2026-08-07", time: "14:20", amount: 10000, status: "SUCCESS", reference: "CMS892104512", channel: "IMPS", settlementTime: "0.9s" },
          { id: "TXN-88129", date: "2026-08-05", time: "11:14", amount: 15000, status: "SUCCESS", reference: "CMS881293019", channel: "IMPS", settlementTime: "1.1s" },
          { id: "TXN-87401", date: "2026-07-28", time: "09:45", amount: 50000, status: "SUCCESS", reference: "CMS874019284", channel: "NEFT", settlementTime: "1.4s" },
          { id: "TXN-86920", date: "2026-07-15", time: "16:02", amount: 30000, status: "SUCCESS", reference: "CMS869201948", channel: "IMPS", settlementTime: "0.8s" },
          { id: "TXN-85102", date: "2026-07-01", time: "10:30", amount: 10000, status: "FAILED", reference: "CMS851028391", channel: "UPI", settlementTime: "Failed" },
        ],
      };

      setDetailsCache((prev) => ({ ...prev, [beneficiary.id]: fetchedDetails }));
    }
  }, [isOpen, beneficiary, detailsCache]);

  const details = detailsCache[beneficiary?.id] || {
    monthlyLimit: 200000,
    monthlyRemaining: beneficiary.monthlyRemaining ?? 80000,
    todayReceived: 15000,
    todayRemaining: 35000,
    totalTransferCount: beneficiary.transferCount || 24,
    averageTransferAmount: 12500,
    lastTransferAmount: 10000,
    lastTransferDatetime: "2026-08-07 14:20:15",
    riskLevel: "LOW RISK",
    registeredDate: "2025-01-15",
    recentTransactions: [],
  };

  const maskedAcc = beneficiary.maskedAccountNumber || (beneficiary.accountNumber.length >= 4 ? `•••• •••• ${beneficiary.accountNumber.slice(-4)}` : beneficiary.accountNumber);

  return (
    <Collapse in={isOpen} timeout={200} unmountOnExit sx={{ width: "100%", gridColumn: "1 / -1" }}>
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: "12px",
          bgcolor: "rgba(15, 23, 42, 0.95)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(37, 99, 235, 0.4)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
          minHeight: 220,
          maxHeight: 280,
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          boxSizing: "border-box",
        }}
      >
        {/* TOP SPECIFICATION GRID (LEFT SECTION / RIGHT SECTION) */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
          {/* LEFT SECTION */}
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
              <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "16px" }}>
                {beneficiary.name}
              </Typography>
              {beneficiary.isFavorite && <Chip icon={<StarIcon sx={{ "&&": { color: "#FBBF24", fontSize: 13 } }} />} label="Preferred" size="small" sx={{ height: 20, bgcolor: "rgba(251, 191, 36, 0.15)", color: "#FBBF24", fontWeight: 800, fontSize: "10px" }} />}
              {beneficiary.isVerified && <Chip icon={<CheckCircleIcon sx={{ "&&": { color: "#4ADE80", fontSize: 13 } }} />} label="Verified" size="small" sx={{ height: 20, bgcolor: "rgba(74, 222, 128, 0.15)", color: "#4ADE80", fontWeight: 800, fontSize: "10px" }} />}
            </Stack>

            <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "13px", mb: 0.5 }}>
              {beneficiary.bankName}
            </Typography>

            <Typography sx={{ color: "rgba(255, 255, 255, 0.70)", fontSize: "12px", mb: 0.5 }}>
              Relationship: <strong style={{ color: "#93C5FD" }}>{beneficiary.relationship || "Family"}</strong>
            </Typography>

            <Typography sx={{ color: "#FFFFFF", fontFamily: "monospace", fontWeight: 800, fontSize: "13px", mb: 0.5 }}>
              Account: {maskedAcc} (Full: {beneficiary.accountNumber})
            </Typography>

            <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "11px" }}>
              IFSC: <strong>{beneficiary.ifsc}</strong> · Branch: {beneficiary.branchName || "Main Branch"}
            </Typography>
          </Box>

          {/* RIGHT SECTION */}
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1 }}>
            <Box>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "10px", fontWeight: 700 }}>MONTHLY RECEIVING LIMIT</Typography>
              <Typography sx={{ color: "#FFFFFF", fontWeight: 800, fontSize: "13px" }}>₹{details.monthlyLimit.toLocaleString()}</Typography>
            </Box>

            <Box>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "10px", fontWeight: 700 }}>REMAINING MONTHLY LIMIT</Typography>
              <Typography sx={{ color: "#4ADE80", fontWeight: 900, fontSize: "13px" }}>₹{details.monthlyRemaining.toLocaleString()}</Typography>
            </Box>

            <Box>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "10px", fontWeight: 700 }}>TODAY'S RECEIVED AMOUNT</Typography>
              <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "13px" }}>₹{details.todayReceived.toLocaleString()}</Typography>
            </Box>

            <Box>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "10px", fontWeight: 700 }}>TODAY'S REMAINING AMOUNT</Typography>
              <Typography sx={{ color: "#34D399", fontWeight: 800, fontSize: "13px" }}>₹{details.todayRemaining.toLocaleString()}</Typography>
            </Box>

            <Box>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "10px", fontWeight: 700 }}>TOTAL TRANSFERS</Typography>
              <Typography sx={{ color: "#FFFFFF", fontWeight: 800, fontSize: "12px" }}>{details.totalTransferCount} Txns</Typography>
            </Box>

            <Box>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "10px", fontWeight: 700 }}>AVG / LAST TRANSFER</Typography>
              <Typography sx={{ color: "#FBBF24", fontWeight: 800, fontSize: "12px" }}>₹{details.averageTransferAmount.toLocaleString()} / ₹{details.lastTransferAmount.toLocaleString()}</Typography>
            </Box>

            <Box>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "10px", fontWeight: 700 }}>RISK LEVEL</Typography>
              <Typography sx={{ color: "#4ADE80", fontWeight: 800, fontSize: "11px" }}>{details.riskLevel}</Typography>
            </Box>

            <Box>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "10px", fontWeight: 700 }}>REGISTERED DATE</Typography>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.80)", fontSize: "11px" }}>{details.registeredDate}</Typography>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.1)" }} />

        {/* BOTTOM SECTION: RECENT TRANSACTIONS (LAST 5) */}
        <Box>
          <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", mb: 0.75 }}>
            RECENT TRANSACTIONS (LAST 5)
          </Typography>

          <TableContainer component={Paper} elevation={0} sx={{ bgcolor: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "6px" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "rgba(255, 255, 255, 0.05)" }}>
                  <TableCell sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "10px", fontWeight: 800, py: 0.5 }}>Date & Time</TableCell>
                  <TableCell sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "10px", fontWeight: 800, py: 0.5 }}>Reference</TableCell>
                  <TableCell sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "10px", fontWeight: 800, py: 0.5 }}>Channel</TableCell>
                  <TableCell align="right" sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "10px", fontWeight: 800, py: 0.5 }}>Amount</TableCell>
                  <TableCell align="center" sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "10px", fontWeight: 800, py: 0.5 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {details.recentTransactions.map((tx: TransactionRecord) => (
                  <TableRow key={tx.id} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                    <TableCell sx={{ color: "#FFFFFF", fontSize: "11px", py: 0.5 }}>{tx.date} {tx.time}</TableCell>
                    <TableCell sx={{ color: "#93C5FD", fontFamily: "monospace", fontSize: "10px", py: 0.5 }}>{tx.reference}</TableCell>
                    <TableCell sx={{ color: "#FFFFFF", fontSize: "10px", fontWeight: 700, py: 0.5 }}>{tx.channel}</TableCell>
                    <TableCell align="right" sx={{ color: "#FFFFFF", fontWeight: 800, fontSize: "11px", py: 0.5 }}>₹{tx.amount.toLocaleString()}</TableCell>
                    <TableCell align="center" sx={{ py: 0.5 }}>
                      <Chip
                        label={tx.status}
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: "9px",
                          fontWeight: 800,
                          bgcolor: tx.status === "SUCCESS" ? "rgba(74, 222, 128, 0.15)" : "rgba(239, 68, 68, 0.15)",
                          color: tx.status === "SUCCESS" ? "#4ADE80" : "#EF4444",
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Paper>
    </Collapse>
  );
};
