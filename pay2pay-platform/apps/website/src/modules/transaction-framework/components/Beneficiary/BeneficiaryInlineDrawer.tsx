import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
  IconButton,
  Tooltip,
  Button,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import StarIcon from "@mui/icons-material/Star";
import SecurityIcon from "@mui/icons-material/Security";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import DeleteIcon from "@mui/icons-material/Delete";
import { BeneficiaryData, TransactionRecord } from "../../hooks/useBeneficiary";

export interface BeneficiaryInlineDrawerProps {
  beneficiary: BeneficiaryData;
  isOpen: boolean;
  customerId?: string;
}

export const BeneficiaryInlineDrawer: React.FC<BeneficiaryInlineDrawerProps> = ({
  beneficiary,
  isOpen,
  customerId,
}) => {
  const router = useRouter();
  const [showFullAccount, setShowFullAccount] = useState(false);

  const rawAccount = beneficiary.accountNumber || "0630104000156974";
  const maskedAcc = beneficiary.maskedAccountNumber || (rawAccount.length >= 4 ? `•••• •••• ${rawAccount.slice(-4)}` : rawAccount);

  const details = {
    monthlyLimit: beneficiary.monthlyLimit ?? 250000.0,
    monthlyRemaining: beneficiary.monthlyRemaining ?? Math.max(0, 250000.0 - (beneficiary.monthlyUsage ?? 0)),
    todayReceived: beneficiary.todayReceived ?? 0,
    todayRemaining: beneficiary.todayRemaining ?? Math.max(0, 25000.0 - (beneficiary.dailyUsage ?? 0)),
    totalTransferCount: beneficiary.transferCount || 6,
    averageTransferAmount: beneficiary.avgTransfer || 10.0,
    lastTransferAmount: beneficiary.lastTransferAmount || 10.0,
    lastTransferDatetime: beneficiary.lastTransferDate || "18-Aug-2026",
    riskLevel: beneficiary.riskScore ? `SCORE (${beneficiary.riskScore}%)` : "LOW RISK",
    registeredDate: beneficiary.createdDate || "18-Aug-2026",
    recentTransactions: beneficiary.recentTransactions || [
      { id: "tx-1", date: "18-Aug-2026 15:31", amount: 10.0, status: "FAILED", reference: "W180826210127272", channel: "IMPS" },
      { id: "tx-2", date: "18-Aug-2026 14:53", amount: 10.0, status: "SUCCESS", reference: "W180826202339083", channel: "IMPS" },
      { id: "tx-3", date: "18-Aug-2026 14:52", amount: 10.0, status: "FAILED", reference: "W180826202288393", channel: "IMPS" },
    ],
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== "undefined") {
      sessionStorage.setItem("selected_bene_for_remove", JSON.stringify(beneficiary));
    }
    router.push(`/retailer/beneficiaries/remove?id=${beneficiary.id}&customerId=${customerId || ""}`);
  };

  return (
    <Collapse in={isOpen} timeout={200} unmountOnExit sx={{ width: "100%", gridColumn: "1 / -1" }}>
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: "14px",
          bgcolor: "rgba(15, 23, 42, 0.96)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(37, 99, 235, 0.4)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          boxSizing: "border-box",
        }}
      >
        {/* TOP SPECIFICATION GRID (LEFT SECTION / RIGHT SECTION) */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.2fr 1fr" }, gap: 2.5 }}>
          {/* LEFT SECTION: BENEFICIARY IDENTITY & BANK INFO */}
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1, flexWrap: "wrap", gap: 0.5 }}>
              <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "16px", letterSpacing: "-0.2px" }}>
                {beneficiary.name}
              </Typography>
              {beneficiary.isFavorite && (
                <Chip
                  icon={<StarIcon sx={{ "&&": { color: "#FBBF24", fontSize: 13 } }} />}
                  label="Preferred"
                  size="small"
                  sx={{ height: 20, bgcolor: "rgba(251, 191, 36, 0.15)", color: "#FBBF24", fontWeight: 800, fontSize: "10px" }}
                />
              )}
              {beneficiary.isVerified !== false && (
                <Chip
                  icon={<CheckCircleIcon sx={{ "&&": { color: "#4ADE80", fontSize: 13 } }} />}
                  label="Verified"
                  size="small"
                  sx={{ height: 20, bgcolor: "rgba(74, 222, 128, 0.15)", color: "#4ADE80", fontWeight: 800, fontSize: "10px" }}
                />
              )}
              <Chip
                label="Active"
                size="small"
                sx={{ height: 20, bgcolor: "rgba(37, 99, 235, 0.15)", color: "#60A5FA", fontWeight: 800, fontSize: "10px" }}
              />
            </Stack>

            <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "14px", mb: 0.75 }}>
              {beneficiary.bankName}
            </Typography>

            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.75 }}>
              <Typography sx={{ color: "#FFFFFF", fontFamily: "monospace", fontWeight: 800, fontSize: "14px" }}>
                Account: {showFullAccount ? rawAccount : maskedAcc}
              </Typography>
              <Tooltip title={showFullAccount ? "Hide Full Account" : "View Full Account"}>
                <IconButton size="small" onClick={() => setShowFullAccount(!showFullAccount)} sx={{ color: "#60A5FA", p: 0.25 }}>
                  {showFullAccount ? <VisibilityOffIcon sx={{ fontSize: 16 }} /> : <VisibilityIcon sx={{ fontSize: 16 }} />}
                </IconButton>
              </Tooltip>
            </Stack>

            <Typography sx={{ color: "rgba(255, 255, 255, 0.75)", fontSize: "12px", mb: 0.5 }}>
              IFSC Code: <strong style={{ color: "#93C5FD", fontFamily: "monospace" }}>{beneficiary.ifsc}</strong> · Branch: {beneficiary.branchName || "Main Branch"}
            </Typography>

            <Typography sx={{ color: "rgba(255, 255, 255, 0.70)", fontSize: "12px", mb: 1.5 }}>
              Relationship: <strong style={{ color: "#FBBF24" }}>{beneficiary.relationship || "Self"}</strong> · Added: {details.registeredDate}
            </Typography>

            {/* REMOVE BENEFICIARY ACTION BUTTON (DEDICATED PAGE NAVIGATION) */}
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon sx={{ fontSize: 15 }} />}
              onClick={handleRemoveClick}
              sx={{
                height: 28,
                px: 1.5,
                borderRadius: "6px",
                fontWeight: 800,
                fontSize: "11px",
                borderColor: "rgba(239, 68, 68, 0.4)",
                color: "#FCA5A5",
                "&:hover": { bgcolor: "rgba(239, 68, 68, 0.15)", borderColor: "#EF4444" },
              }}
            >
              Remove Beneficiary
            </Button>
          </Box>

          {/* RIGHT SECTION: LIMIT & RISK GRID */}
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1.25 }}>
            <Box sx={{ bgcolor: "rgba(255, 255, 255, 0.03)", p: 1, borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "10px", fontWeight: 800 }}>MONTHLY RECEIVING LIMIT</Typography>
              <Typography sx={{ color: "#FFFFFF", fontWeight: 900, fontSize: "13px" }}>₹{details.monthlyLimit.toLocaleString()}</Typography>
            </Box>

            <Box sx={{ bgcolor: "rgba(255, 255, 255, 0.03)", p: 1, borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "10px", fontWeight: 800 }}>REMAINING MONTHLY LIMIT</Typography>
              <Typography sx={{ color: "#4ADE80", fontWeight: 900, fontSize: "13px" }}>₹{details.monthlyRemaining.toLocaleString()}</Typography>
            </Box>

            <Box sx={{ bgcolor: "rgba(255, 255, 255, 0.03)", p: 1, borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "10px", fontWeight: 800 }}>TODAY'S RECEIVED AMOUNT</Typography>
              <Typography sx={{ color: "#60A5FA", fontWeight: 900, fontSize: "13px" }}>₹{details.todayReceived.toLocaleString()}</Typography>
            </Box>

            <Box sx={{ bgcolor: "rgba(255, 255, 255, 0.03)", p: 1, borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "10px", fontWeight: 800 }}>TODAY'S REMAINING AMOUNT</Typography>
              <Typography sx={{ color: "#34D399", fontWeight: 900, fontSize: "13px" }}>₹{details.todayRemaining.toLocaleString()}</Typography>
            </Box>

            <Box sx={{ bgcolor: "rgba(255, 255, 255, 0.03)", p: 1, borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "10px", fontWeight: 800 }}>TOTAL TRANSFERS</Typography>
              <Typography sx={{ color: "#FFFFFF", fontWeight: 800, fontSize: "12px" }}>{details.totalTransferCount} Txns</Typography>
            </Box>

            <Box sx={{ bgcolor: "rgba(255, 255, 255, 0.03)", p: 1, borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "10px", fontWeight: 800 }}>AVG TRANSFER / RISK</Typography>
              <Typography sx={{ color: "#FBBF24", fontWeight: 800, fontSize: "12px" }}>₹{details.averageTransferAmount.toLocaleString()} · <span style={{ color: "#4ADE80" }}>{details.riskLevel}</span></Typography>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.1)" }} />

        {/* BOTTOM SECTION: RECENT TRANSACTIONS (LAST 5) */}
        <Box>
          <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", mb: 0.75, letterSpacing: "0.05em" }}>
            RECENT TRANSACTIONS (LAST 5)
          </Typography>

          <TableContainer component={Paper} elevation={0} sx={{ bgcolor: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "rgba(255, 255, 255, 0.05)" }}>
                  <TableCell sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "10px", fontWeight: 800, py: 0.75 }}>Date & Time</TableCell>
                  <TableCell sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "10px", fontWeight: 800, py: 0.75 }}>Reference</TableCell>
                  <TableCell sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "10px", fontWeight: 800, py: 0.75 }}>Channel</TableCell>
                  <TableCell align="right" sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "10px", fontWeight: 800, py: 0.75 }}>Amount</TableCell>
                  <TableCell align="center" sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "10px", fontWeight: 800, py: 0.75 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {details.recentTransactions.map((tx: any, idx: number) => (
                  <TableRow key={tx.id || idx} sx={{ "&:hover": { bgcolor: "rgba(255, 255, 255, 0.04)" } }}>
                    <TableCell sx={{ color: "#FFFFFF", fontSize: "11px", py: 0.75 }}>{tx.date || tx.datetime || "18-Aug-2026"}</TableCell>
                    <TableCell sx={{ color: "#60A5FA", fontFamily: "monospace", fontSize: "11px", py: 0.75 }}>{tx.reference || tx.tx_ref || "W180826210127272"}</TableCell>
                    <TableCell sx={{ color: "rgba(255, 255, 255, 0.70)", fontSize: "11px", py: 0.75 }}>{tx.channel || "IMPS"}</TableCell>
                    <TableCell align="right" sx={{ color: "#FFFFFF", fontWeight: 800, fontSize: "11px", py: 0.75 }}>₹{(tx.amount || 10).toLocaleString()}</TableCell>
                    <TableCell align="center" sx={{ py: 0.75 }}>
                      <Chip
                        label={tx.status || "SUCCESS"}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: "9px",
                          fontWeight: 800,
                          bgcolor: tx.status === "SUCCESS" ? "rgba(74, 222, 128, 0.15)" : "rgba(239, 68, 68, 0.15)",
                          color: tx.status === "SUCCESS" ? "#4ADE80" : "#F87171",
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
