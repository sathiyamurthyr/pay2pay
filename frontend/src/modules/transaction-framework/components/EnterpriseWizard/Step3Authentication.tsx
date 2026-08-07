import React, { useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Paper,
  Button,
  Grid,
  Divider,
  TextField,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import SendIcon from "@mui/icons-material/Send";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { CustomerData } from "../../hooks/useCustomer";
import { BeneficiaryData } from "../../hooks/useBeneficiary";

export interface Step3AuthenticationProps {
  customer: CustomerData | null;
  beneficiary: BeneficiaryData | null;
  amount: number;
  charges: number;
  totalPayable: number;
  onBack: () => void;
  onAuthorize: () => void;
}

export const Step3Authentication: React.FC<Step3AuthenticationProps> = ({
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
    if (val === "C") {
      setPin("");
    } else if (val === "⌫") {
      setPin((prev) => prev.slice(0, -1));
    } else if (pin.length < 6) {
      setPin((prev) => prev + val);
    }
  };

  const keypad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"];

  return (
    <Box sx={{ maxWidth: 960, mx: "auto", py: 2 }}>
      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: "20px",
          bgcolor: "rgba(18, 27, 48, 0.85)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 3 }}>
          <LockIcon sx={{ color: "#2563EB", fontSize: 28 }} />
          <Box>
            <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "20px" }}>
              STEP 3: AUTHORIZE TRANSFER TRANSACTION
            </Typography>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>
              Verify details & enter operator 4-digit security PIN to execute settlement
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 340px" }, gap: 4 }}>
          {/* LEFT: AUDIT SUMMARY CARD */}
          <Box>
            <Paper elevation={0} sx={{ p: 3, borderRadius: "16px", bgcolor: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", mb: 2 }}>
                FINAL TRANSACTION PREVIEW
              </Typography>

              <Stack spacing={1.5}>
                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Source Customer</Typography>
                  <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "14px" }}>{customer?.name} ({customer?.mobile})</Typography>
                </Stack>

                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Target Beneficiary</Typography>
                  <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "14px" }}>{beneficiary?.name}</Typography>
                </Stack>

                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Account & Bank</Typography>
                  <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "14px" }}>{beneficiary?.bankName} · {beneficiary?.accountNumber}</Typography>
                </Stack>

                <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", my: 1 }} />

                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Transfer Amount</Typography>
                  <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "18px" }}>₹{amount.toLocaleString()}.00</Typography>
                </Stack>

                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Net Wallet Debit</Typography>
                  <Typography sx={{ fontWeight: 900, color: "#3B82F6", fontSize: "18px" }}>₹{totalPayable.toLocaleString()}.00</Typography>
                </Stack>

                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "13px" }}>Settlement ETA</Typography>
                  <Typography sx={{ fontWeight: 800, color: "#4ADE80", fontSize: "14px" }}>1.2 sec (HDFC IMPS)</Typography>
                </Stack>
              </Stack>
            </Paper>
          </Box>

          {/* RIGHT: NUMERIC KEYPAD & AUTHORIZATION */}
          <Box>
            <Stack spacing={2} sx={{ alignItems: "center" }}>
              <TextField
                type="password"
                value={pin}
                placeholder="• • • •"
                slotProps={{
                  input: {
                    sx: {
                      height: 56,
                      fontSize: "28px",
                      letterSpacing: "12px",
                      fontWeight: 900,
                      color: "#FFFFFF",
                      bgcolor: "rgba(8, 17, 31, 0.9)",
                      borderRadius: "12px",
                      textAlign: "center",
                      "& input": { textAlign: "center" },
                    },
                  },
                }}
              />

              {/* Keypad Grid */}
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.25, width: "100%" }}>
                {keypad.map((k) => (
                  <Button
                    key={k}
                    variant="outlined"
                    onClick={() => handleKeypadPress(k)}
                    sx={{
                      height: 52,
                      borderRadius: "12px",
                      fontWeight: 900,
                      fontSize: "18px",
                      color: "#FFFFFF",
                      borderColor: "rgba(255, 255, 255, 0.15)",
                      bgcolor: "rgba(255, 255, 255, 0.05)",
                      "&:hover": { bgcolor: "rgba(255, 255, 255, 0.15)", borderColor: "#60A5FA" },
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
                  height: 56,
                  borderRadius: "14px",
                  fontWeight: 900,
                  fontSize: "16px",
                  bgcolor: "#2563EB",
                  color: "#FFFFFF",
                  boxShadow: "0 4px 20px rgba(37, 99, 235, 0.4)",
                  "&:hover": { bgcolor: "#1D4ED8" },
                }}
              >
                AUTHORIZE & EXECUTE (Ctrl+Enter)
              </Button>

              <Button fullWidth variant="text" onClick={onBack} startIcon={<ArrowBackIcon />} sx={{ color: "rgba(255, 255, 255, 0.7)", fontWeight: 700 }}>
                Back to Beneficiary & Amount
              </Button>
            </Stack>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};
