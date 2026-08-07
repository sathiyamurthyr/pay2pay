import React, { useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Paper,
  Button,
  Divider,
  TextField,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import SendIcon from "@mui/icons-material/Send";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { CustomerData } from "../../hooks/useCustomer";
import { BeneficiaryData } from "../../hooks/useBeneficiary";

export interface WorkstationStep3Props {
  customer: CustomerData | null;
  beneficiary: BeneficiaryData | null;
  amount: number;
  charges: number;
  totalPayable: number;
  onBack: () => void;
  onAuthorize: () => void;
}

export const WorkstationStep3: React.FC<WorkstationStep3Props> = ({
  customer,
  beneficiary,
  amount,
  charges,
  totalPayable,
  onBack,
  onAuthorize,
}) => {
  const [pin, setPin] = useState("");

  const handleKeypadPress = (val: string) => {
    if (val === "C") setPin("");
    else if (val === "⌫") setPin((prev) => prev.slice(0, -1));
    else if (pin.length < 6) setPin((prev) => prev + val);
  };

  const keypad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"];

  return (
    <Box sx={{ maxWidth: 860, mx: "auto", pt: 2 }}>
      <Paper
        elevation={0}
        sx={{
          p: 3.5,
          borderRadius: "16px",
          bgcolor: "rgba(18, 27, 48, 0.85)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 3 }}>
          <LockIcon sx={{ color: "#2563EB", fontSize: 26 }} />
          <Box>
            <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "18px" }}>
              AUTHORIZE TRANSACTION SETTLEMENT
            </Typography>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>
              Enter operator 4-digit PIN to execute immediate IMPS settlement
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 320px" }, gap: 3 }}>
          {/* Audit Card */}
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: "14px", bgcolor: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", mb: 2 }}>
              AUDIT PREVIEW
            </Typography>

            <Stack spacing={1.25}>
              <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Source Customer</Typography>
                <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "13px" }}>{customer?.name} ({customer?.mobile})</Typography>
              </Stack>

              <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Target Beneficiary</Typography>
                <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "13px" }}>{beneficiary?.name}</Typography>
              </Stack>

              <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Bank & Account</Typography>
                <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "13px" }}>{beneficiary?.bankName} · {beneficiary?.accountNumber}</Typography>
              </Stack>

              <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", my: 0.5 }} />

              <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Transfer Amount</Typography>
                <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "16px" }}>₹{amount.toLocaleString()}.00</Typography>
              </Stack>

              <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Net Wallet Debit</Typography>
                <Typography sx={{ fontWeight: 900, color: "#3B82F6", fontSize: "16px" }}>₹{totalPayable.toLocaleString()}.00</Typography>
              </Stack>

              <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "12px" }}>Settlement ETA</Typography>
                <Typography sx={{ fontWeight: 800, color: "#4ADE80", fontSize: "13px" }}>1.2 sec (IMPS DirectSwitch)</Typography>
              </Stack>
            </Stack>
          </Paper>

          {/* Keypad & Pin Entry */}
          <Stack spacing={2} sx={{ alignItems: "center" }}>
            <TextField
              type="password"
              value={pin}
              placeholder="• • • •"
              slotProps={{
                input: {
                  sx: {
                    height: 52,
                    fontSize: "26px",
                    letterSpacing: "10px",
                    fontWeight: 900,
                    color: "#FFFFFF",
                    bgcolor: "rgba(8, 17, 31, 0.9)",
                    borderRadius: "10px",
                    textAlign: "center",
                    "& input": { textAlign: "center" },
                  },
                },
              }}
            />

            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, width: "100%" }}>
              {keypad.map((k) => (
                <Button
                  key={k}
                  variant="outlined"
                  onClick={() => handleKeypadPress(k)}
                  sx={{
                    height: 48,
                    borderRadius: "10px",
                    fontWeight: 900,
                    fontSize: "17px",
                    color: "#FFFFFF",
                    borderColor: "rgba(255, 255, 255, 0.15)",
                    bgcolor: "rgba(255, 255, 255, 0.05)",
                  }}
                >
                  {k}
                </Button>
              ))}
            </Box>

            <Button
              fullWidth
              variant="contained"
              onClick={onAuthorize}
              startIcon={<SendIcon />}
              sx={{
                height: 50,
                borderRadius: "12px",
                fontWeight: 900,
                fontSize: "15px",
                bgcolor: "#2563EB",
                boxShadow: "0 4px 16px rgba(37, 99, 235, 0.4)",
              }}
            >
              AUTHORIZE & EXECUTE (Ctrl+Enter)
            </Button>

            <Button fullWidth variant="text" onClick={onBack} startIcon={<ArrowBackIcon />} sx={{ color: "rgba(255, 255, 255, 0.7)", fontWeight: 700 }}>
              Back to Beneficiary & Amount
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
};
