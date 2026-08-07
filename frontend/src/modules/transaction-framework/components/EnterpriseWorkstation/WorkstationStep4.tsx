import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Stack,
  Paper,
  Button,
  Chip,
  Divider,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PrintIcon from "@mui/icons-material/Print";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ShareIcon from "@mui/icons-material/Share";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AddIcon from "@mui/icons-material/Add";
import PlayCircleFilledIcon from "@mui/icons-material/PlayCircleFilled";
import { CustomerData } from "../../hooks/useCustomer";
import { BeneficiaryData } from "../../hooks/useBeneficiary";

export interface WorkstationStep4Props {
  customer: CustomerData | null;
  beneficiary: BeneficiaryData | null;
  amount: number;
  charges: number;
  totalPayable: number;
  onNewTransfer: () => void;
}

export const WorkstationStep4: React.FC<WorkstationStep4Props> = ({
  customer,
  beneficiary,
  amount,
  charges,
  totalPayable,
  onNewTransfer,
}) => {
  const [processingStep, setProcessingStep] = useState(1);
  const [isCompleted, setIsCompleted] = useState(false);

  const steps = [
    "Transaction Initiated",
    "Operator Wallet Debited",
    "NPCI IMPS Switch Accepted",
    "Gateway Accepted (HDFC DirectSwitch)",
    "Beneficiary Bank Accepted",
    "Amount Credited & Settled",
  ];

  useEffect(() => {
    if (processingStep <= steps.length) {
      const timer = setTimeout(() => setProcessingStep((prev) => prev + 1), 350);
      return () => clearTimeout(timer);
    } else {
      setIsCompleted(true);
    }
  }, [processingStep]);

  const utr = "421809124012";
  const rrn = "RRN-89120412";
  const receiptNo = "REC-98124012";
  const commission = Math.round(amount * 0.0035);

  return (
    <Box sx={{ maxWidth: 860, mx: "auto", pt: 2 }}>
      {!isCompleted ? (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: "16px",
            bgcolor: "rgba(18, 27, 48, 0.85)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
          }}
        >
          <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "14px", letterSpacing: "0.08em", textTransform: "uppercase", mb: 3, textAlign: "center" }}>
            LIVE TRANSACTION PROCESSING & SETTLEMENT ENGINE
          </Typography>

          <Stack spacing={1.5} sx={{ maxWidth: 540, mx: "auto" }}>
            {steps.map((step, idx) => {
              const stepNum = idx + 1;
              const isDone = stepNum < processingStep;
              const isCurrent = stepNum === processingStep;

              return (
                <Paper
                  key={step}
                  elevation={0}
                  sx={{
                    p: 1.75,
                    borderRadius: "10px",
                    bgcolor: isCurrent ? "rgba(37, 99, 235, 0.2)" : isDone ? "rgba(34, 197, 94, 0.1)" : "rgba(255, 255, 255, 0.03)",
                    border: isCurrent ? "1px solid #3B82F6" : isDone ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                    {isDone ? (
                      <CheckCircleIcon sx={{ color: "#4ADE80", fontSize: 18 }} />
                    ) : isCurrent ? (
                      <PlayCircleFilledIcon sx={{ color: "#60A5FA", fontSize: 18 }} />
                    ) : (
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "rgba(255, 255, 255, 0.3)", ml: 0.5 }} />
                    )}
                    <Typography sx={{ fontWeight: isCurrent ? 800 : 700, color: isCurrent ? "#60A5FA" : isDone ? "#4ADE80" : "rgba(255, 255, 255, 0.5)", fontSize: "13px" }}>
                      Step {stepNum}: {step}
                    </Typography>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </Paper>
      ) : (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: "16px",
            bgcolor: "rgba(18, 27, 48, 0.9)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(34, 197, 94, 0.4)",
            boxShadow: "0 8px 32px rgba(34, 197, 94, 0.2)",
          }}
        >
          <Stack direction="row" spacing={2} sx={{ alignItems: "center", mb: 3 }}>
            <CheckCircleIcon sx={{ color: "#4ADE80", fontSize: 40 }} />
            <Box>
              <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "20px" }}>
                SETTLED SUCCESSFULLY!
              </Typography>
              <Typography sx={{ color: "#4ADE80", fontWeight: 700, fontSize: "13px" }}>
                Receipt: <strong>{receiptNo}</strong> · UTR: <strong>{utr}</strong> · RRN: <strong>{rrn}</strong>
              </Typography>
            </Box>
          </Stack>

          <Paper elevation={0} sx={{ p: 2.5, borderRadius: "12px", bgcolor: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)", mb: 3 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2 }}>
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
                <Typography sx={{ fontWeight: 900, color: "#4ADE80", fontSize: "16px" }}>₹{amount.toLocaleString()}.00</Typography>
              </Box>
              <Box>
                <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px", fontWeight: 700 }}>NET COMMISSION</Typography>
                <Typography sx={{ fontWeight: 900, color: "#38BDF8", fontSize: "16px" }}>+ ₹{commission}.00</Typography>
              </Box>
            </Box>
          </Paper>

          <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", gap: 1 }}>
            <Button variant="contained" startIcon={<PrintIcon />} sx={{ height: 42, borderRadius: "8px", fontWeight: 800, bgcolor: "#2563EB" }}>
              Print Receipt
            </Button>
            <Button variant="outlined" startIcon={<PictureAsPdfIcon />} sx={{ height: 42, borderRadius: "8px", fontWeight: 700, color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.2)" }}>
              Download PDF
            </Button>
            <Button variant="outlined" startIcon={<ShareIcon />} sx={{ height: 42, borderRadius: "8px", fontWeight: 700, color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.2)" }}>
              Share
            </Button>
            <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={() => navigator.clipboard.writeText(utr)} sx={{ height: 42, borderRadius: "8px", fontWeight: 700, color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.2)" }}>
              Copy UTR
            </Button>

            <Button variant="contained" color="success" onClick={onNewTransfer} startIcon={<AddIcon />} sx={{ height: 42, borderRadius: "8px", fontWeight: 900, ml: "auto" }}>
              + New Transfer
            </Button>
          </Stack>
        </Paper>
      )}
    </Box>
  );
};
