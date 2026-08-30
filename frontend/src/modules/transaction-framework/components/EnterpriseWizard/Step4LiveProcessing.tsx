import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Stack,
  Paper,
  Button,
  Chip,
  Divider,
  Grid,
  Alert,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PrintIcon from "@mui/icons-material/Print";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ShareIcon from "@mui/icons-material/Share";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import RepeatIcon from "@mui/icons-material/Repeat";
import AddIcon from "@mui/icons-material/Add";
import ErrorIcon from "@mui/icons-material/Error";
import PlayCircleFilledIcon from "@mui/icons-material/PlayCircleFilled";
import { CustomerData } from "../../hooks/useCustomer";
import { BeneficiaryData } from "../../hooks/useBeneficiary";

export interface Step4LiveProcessingProps {
  customer: CustomerData | null;
  beneficiary: BeneficiaryData | null;
  amount: number;
  charges: number;
  totalPayable: number;
  onNewTransfer: () => void;
  isFailureTest?: boolean;
}

export const Step4LiveProcessing: React.FC<Step4LiveProcessingProps> = ({
  customer,
  beneficiary,
  amount,
  charges,
  totalPayable,
  onNewTransfer,
  isFailureTest = false,
}) => {
  const [processingStep, setProcessingStep] = useState(1);
  const [isCompleted, setIsCompleted] = useState(false);

  const steps = [
    "Transaction Initiated",
    "Operator Wallet Debited",
    "AI Smart Route Selected (HDFC DirectSwitch)",
    "NPCI IMPS Switch Accepted",
    "Destination Bank Ledger Accepted",
    "Account Settlement Complete",
  ];

  useEffect(() => {
    if (processingStep <= steps.length) {
      const timer = setTimeout(() => {
        setProcessingStep((prev) => prev + 1);
      }, 400); // 400ms per step simulation
      return () => clearTimeout(timer);
    } else {
      setIsCompleted(true);
    }
  }, [processingStep]);

  const utr = "421809124012";
  const rrn = "RRN-89120412";
  const receiptNo = "REC-98124012";

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", py: 2 }}>
      {/* 1. LIVE PROCESSING TIMELINE (BEFORE COMPLETION) */}
      {!isCompleted && !isFailureTest && (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: "20px",
            bgcolor: "rgba(18, 27, 48, 0.85)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            textAlign: "center",
          }}
        >
          <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "14px", letterSpacing: "0.08em", textTransform: "uppercase", mb: 3 }}>
            LIVE TRANSACTION PROCESSING & SETTLEMENT ENGINE
          </Typography>

          <Stack spacing={2} sx={{ maxWidth: 600, mx: "auto", textAlign: "left" }}>
            {steps.map((step, idx) => {
              const stepNum = idx + 1;
              const isDone = stepNum < processingStep;
              const isCurrent = stepNum === processingStep;

              return (
                <Paper
                  key={step}
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: "12px",
                    bgcolor: isCurrent ? "rgba(37, 99, 235, 0.2)" : isDone ? "rgba(34, 197, 94, 0.1)" : "rgba(255, 255, 255, 0.03)",
                    border: isCurrent ? "1px solid #3B82F6" : isDone ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                    {isDone ? (
                      <CheckCircleIcon sx={{ color: "#4ADE80", fontSize: 20 }} />
                    ) : isCurrent ? (
                      <PlayCircleFilledIcon sx={{ color: "#60A5FA", fontSize: 20 }} />
                    ) : (
                      <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "rgba(255, 255, 255, 0.3)", ml: 0.5 }} />
                    )}
                    <Typography sx={{ fontWeight: isCurrent ? 800 : 700, color: isCurrent ? "#60A5FA" : isDone ? "#4ADE80" : "rgba(255, 255, 255, 0.5)", fontSize: "14px" }}>
                      Step {stepNum}: {step}
                    </Typography>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </Paper>
      )}

      {/* 2. SUCCESS RECEIPT (AFTER COMPLETION) */}
      {isCompleted && !isFailureTest && (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: "20px",
            bgcolor: "rgba(18, 27, 48, 0.9)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(34, 197, 94, 0.4)",
            boxShadow: "0 8px 32px rgba(34, 197, 94, 0.2)",
          }}
        >
          <Stack direction="row" spacing={2} sx={{ alignItems: "center", mb: 3 }}>
            <CheckCircleIcon sx={{ color: "#4ADE80", fontSize: 44 }} />
            <Box>
              <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "22px" }}>
                TRANSACTION SETTLED SUCCESSFULLY!
              </Typography>
              <Typography sx={{ color: "#4ADE80", fontWeight: 700, fontSize: "14px" }}>
                Receipt No: <strong>{receiptNo}</strong> · UTR: <strong>{utr}</strong> · RRN: <strong>{rrn}</strong>
              </Typography>
            </Box>
          </Stack>

          <Paper elevation={0} sx={{ p: 3, borderRadius: "14px", bgcolor: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)", mb: 3 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" }, gap: 2 }}>
              <Box>
                <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px", fontWeight: 700 }}>CUSTOMER</Typography>
                <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "14px" }}>{customer?.name}</Typography>
              </Box>
              <Box>
                <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px", fontWeight: 700 }}>BENEFICIARY</Typography>
                <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "14px" }}>{beneficiary?.name}</Typography>
              </Box>
              <Box>
                <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px", fontWeight: 700 }}>TRANSFER AMOUNT</Typography>
                <Typography sx={{ fontWeight: 900, color: "#4ADE80", fontSize: "18px" }}>₹{amount.toLocaleString()}.00</Typography>
              </Box>
              <Box>
                <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px", fontWeight: 700 }}>TOTAL WALLET DEBIT</Typography>
                <Typography sx={{ fontWeight: 900, color: "#38BDF8", fontSize: "18px" }}>₹{totalPayable.toLocaleString()}.00</Typography>
              </Box>
            </Box>
          </Paper>

          {/* Action Button Bar */}
          <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", gap: 1 }}>
            <Button variant="contained" startIcon={<PrintIcon />} sx={{ height: 44, borderRadius: "10px", fontWeight: 800, bgcolor: "#2563EB" }}>
              Print Receipt
            </Button>
            <Button variant="outlined" startIcon={<PictureAsPdfIcon />} sx={{ height: 44, borderRadius: "10px", fontWeight: 700, color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.2)" }}>
              Download PDF
            </Button>
            <Button variant="outlined" startIcon={<ShareIcon />} sx={{ height: 44, borderRadius: "10px", fontWeight: 700, color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.2)" }}>
              Share WhatsApp
            </Button>
            <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={() => navigator.clipboard.writeText(utr)} sx={{ height: 44, borderRadius: "10px", fontWeight: 700, color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.2)" }}>
              Copy UTR
            </Button>

            <Button variant="contained" color="success" onClick={onNewTransfer} startIcon={<AddIcon />} sx={{ height: 44, borderRadius: "10px", fontWeight: 900, ml: "auto" }}>
              + New Transfer
            </Button>
          </Stack>
        </Paper>
      )}

      {/* 3. STRUCTURED FAILURE SCREEN (IF EXCEPTION OCCURS) */}
      {isFailureTest && (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: "20px",
            bgcolor: "rgba(239, 68, 68, 0.15)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
          }}
        >
          <Stack direction="row" spacing={2} sx={{ alignItems: "center", mb: 2 }}>
            <ErrorIcon sx={{ color: "#EF4444", fontSize: 44 }} />
            <Box>
              <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "20px" }}>
                UNABLE TO COMPLETE TRANSACTION
              </Typography>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "14px" }}>
                Reason: Destination Bank NPCI Switch Timed Out (Code: ERR_NPCI_504)
              </Typography>
            </Box>
          </Stack>

          <Alert severity="info" sx={{ bgcolor: "rgba(37, 99, 235, 0.2)", color: "#FFFFFF", borderRadius: "12px", mb: 3 }}>
            Refund Status: Operator Wallet automatically credited with ₹{totalPayable.toLocaleString()}.00 (Zero loss guarantee).
          </Alert>

          <Stack direction="row" spacing={2}>
            <Button variant="contained" color="primary" onClick={onNewTransfer} startIcon={<RepeatIcon />}>
              Retry via Alternative Route (ICICI Bank)
            </Button>
            <Button variant="outlined" sx={{ color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.2)" }}>
              Raise Support Ticket
            </Button>
          </Stack>
        </Paper>
      )}
    </Box>
  );
};
