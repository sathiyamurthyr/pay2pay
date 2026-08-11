"use client";

import React, { useState } from "react";
import { Box, Paper, Typography, Stack, Alert } from "@mui/material";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { M3CurrencyInput, M3Select } from "@/components/ui/form-components";
import { M3Button } from "@/components/ui/m3-components";
import { retailerApi } from "@/services/retailer-api";
import { useRetailerStore } from "@/stores/use-retailer-store";

export default function SettlementPage() {
  const { wallet, updateWallet } = useRetailerStore();
  const [amount, setAmount] = useState("10000");
  const [mode, setMode] = useState<"IMPS" | "NEFT">("IMPS");
  const [bank, setBank] = useState("ICICI_MAIN");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<any | null>(null);

  const registeredBanks = [
    { value: "ICICI_MAIN", label: "ICICI Bank - 001105991823 (Primary Settlement Bank)" },
    { value: "HDFC_SEC", label: "HDFC Bank - 50100998822 (Secondary)" },
  ];

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const numericAmt = parseFloat(amount) || 0;
    const res = await retailerApi.requestSettlement({
      amount: numericAmt,
      mode,
      bankAccountId: bank,
    });

    setLoading(false);
    setSuccess(res);

    if (res.status === "SUCCESS") {
      updateWallet({
        mainBalance: wallet.mainBalance - numericAmt - res.charge,
        todaySettlement: wallet.todaySettlement + numericAmt,
      });
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "20px", pb: 4 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "7fr 5fr" }, gap: 3 }}>
        <Paper elevation={0} sx={{ p: 3.5, borderRadius: 3.5, border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
          <form onSubmit={handleSettle}>
            <Stack spacing={2.5}>
              <M3Select label="Registered Bank Account" value={bank} onChange={(e) => setBank(e.target.value)} options={registeredBanks} />
              <M3CurrencyInput label="Settlement Amount (INR)" value={amount} onChange={(e) => setAmount(e.target.value)} />

              <M3Button type="submit" variant="contained" loading={loading} fullWidth sx={{ py: 1.5 }}>
                Initiate Instant Bank Settlement ₹{parseFloat(amount || "0").toLocaleString("en-IN")}
              </M3Button>

              {success && (
                <Alert severity="success" icon={<CheckCircleIcon />} sx={{ borderRadius: 2.5 }}>
                  Settlement Completed! Bank UTR: {success.utr}. Amount credited to your bank account.
                </Alert>
              )}
            </Stack>
          </form>
        </Paper>
      </Box>
    </Box>
  );
}
