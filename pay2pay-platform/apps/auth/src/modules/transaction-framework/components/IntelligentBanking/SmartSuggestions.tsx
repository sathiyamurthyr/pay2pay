import React from "react";
import { Box, Typography, Stack, Button, Paper } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import EventRepeatIcon from "@mui/icons-material/EventRepeat";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";

export const SmartSuggestions: React.FC = () => {
  return (
    <Stack spacing={2} sx={{ p: 1 }}>
      <Typography sx={{ color: "rgba(255, 255, 255, 0.70)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        AI RECOMMENDED OPERATOR ACTIONS
      </Typography>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(3, 1fr)" }, gap: 1.5 }}>
        <Button
          variant="contained"
          startIcon={<SendIcon />}
          sx={{
            height: 44,
            borderRadius: "12px",
            fontSize: "14px",
            fontWeight: 800,
            color: "#FFFFFF",
            bgcolor: "#2563EB",
            boxShadow: "0 4px 16px rgba(37, 99, 235, 0.4)",
            "&:hover": { bgcolor: "#1D4ED8" },
          }}
        >
          Transfer Now (HDFC Direct)
        </Button>

        <Button
          variant="outlined"
          startIcon={<SwapHorizIcon />}
          sx={{
            height: 44,
            borderRadius: "12px",
            fontSize: "14px",
            fontWeight: 700,
            color: "#FFFFFF",
            borderColor: "rgba(255, 255, 255, 0.2)",
            bgcolor: "rgba(255, 255, 255, 0.05)",
            "&:hover": { bgcolor: "rgba(255, 255, 255, 0.12)" },
          }}
        >
          Use Alternative Bank (ICICI)
        </Button>

        <Button
          variant="outlined"
          startIcon={<CallSplitIcon />}
          sx={{
            height: 44,
            borderRadius: "12px",
            fontSize: "14px",
            fontWeight: 700,
            color: "#FFFFFF",
            borderColor: "rgba(255, 255, 255, 0.2)",
            bgcolor: "rgba(255, 255, 255, 0.05)",
            "&:hover": { bgcolor: "rgba(255, 255, 255, 0.12)" },
          }}
        >
          Split Transaction (2 × ₹12,500)
        </Button>

        <Button
          variant="outlined"
          startIcon={<EventRepeatIcon />}
          sx={{
            height: 44,
            borderRadius: "12px",
            fontSize: "14px",
            fontWeight: 700,
            color: "#FFFFFF",
            borderColor: "rgba(255, 255, 255, 0.2)",
            bgcolor: "rgba(255, 255, 255, 0.05)",
            "&:hover": { bgcolor: "rgba(255, 255, 255, 0.12)" },
          }}
        >
          Schedule Transfer
        </Button>

        <Button
          variant="outlined"
          startIcon={<AccountBalanceWalletIcon sx={{ color: "#FBBF24" }} />}
          sx={{
            height: 44,
            borderRadius: "12px",
            fontSize: "14px",
            fontWeight: 700,
            color: "#FBBF24",
            borderColor: "rgba(251, 191, 36, 0.4)",
            bgcolor: "rgba(251, 191, 36, 0.1)",
            "&:hover": { bgcolor: "rgba(251, 191, 36, 0.2)" },
          }}
        >
          Instant Wallet Top-up
        </Button>
      </Box>
    </Stack>
  );
};
