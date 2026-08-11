"use client";

import React, { useState } from "react";
import { Box, Paper, Typography, Stack, Tabs, Tab, Alert, Grid } from "@mui/material";
import PhoneAndroidIcon from "@mui/icons-material/PhoneAndroid";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { M3TextField, M3CurrencyInput, M3Select } from "@/components/ui/form-components";
import { M3Button } from "@/components/ui/m3-components";
import { retailerApi } from "@/services/retailer-api";
import { useRetailerStore } from "@/stores/use-retailer-store";

export default function RechargePage() {
  const { wallet, updateWallet } = useRetailerStore();
  const [tab, setTab] = useState<"MOBILE" | "DTH">("MOBILE");
  const [operator, setOperator] = useState("AIRTEL");
  const [number, setNumber] = useState("9840192837");
  const [amount, setAmount] = useState("299");
  const [loading, setLoading] = useState(false);
  const [txnSuccess, setTxnSuccess] = useState<any | null>(null);

  const operators = [
    { value: "AIRTEL", label: "Airtel Prepaid / Postpaid" },
    { value: "JIO", label: "Reliance Jio 4G/5G" },
    { value: "VI", label: "Vodafone Idea (Vi)" },
    { value: "BSNL", label: "BSNL Mobile" },
    { value: "TATA_PLAY", label: "Tata Play DTH" },
    { value: "AIRTEL_DTH", label: "Airtel Digital TV" },
  ];

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const numericAmt = parseFloat(amount) || 0;
    const res = await retailerApi.processRecharge({
      operator,
      mobileOrVcNumber: number,
      amount: numericAmt,
      rechargeType: tab,
    });

    setLoading(false);
    setTxnSuccess(res);

    if (res.status === "SUCCESS") {
      updateWallet({
        mainBalance: wallet.mainBalance - numericAmt + res.commission,
        todayMargin: wallet.todayMargin + res.commission,
      });
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "20px", pb: 4 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "7fr 5fr" }, gap: 3 }}>
        <Paper elevation={0} sx={{ p: 3.5, borderRadius: 3.5, border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
          <Tabs value={tab} onChange={(_, val) => setTab(val)} sx={{ mb: 3, borderBottom: "1px solid #E5E7EB" }}>
            <Tab label="Mobile Recharge" value="MOBILE" />
            <Tab label="DTH Connection" value="DTH" />
          </Tabs>

          <form onSubmit={handleRecharge}>
            <Stack spacing={2.5}>
              <M3Select label="Select Telecom / DTH Operator" value={operator} onChange={(e) => setOperator(e.target.value)} options={operators} />
              <M3TextField label={tab === "MOBILE" ? "Mobile Number" : "DTH VC / Subscriber ID"} value={number} onChange={(e) => setNumber(e.target.value)} />
              <M3CurrencyInput label="Recharge Amount (INR)" value={amount} onChange={(e) => setAmount(e.target.value)} />

              <M3Button type="submit" variant="contained" loading={loading} fullWidth sx={{ py: 1.5 }}>
                Process Recharge ₹{parseFloat(amount || "0").toFixed(2)}
              </M3Button>

              {txnSuccess && (
                <Alert severity="success" icon={<CheckCircleIcon />} sx={{ borderRadius: 2.5 }}>
                  Recharge Successful! Ref: {txnSuccess.operatorRef}. Retailer Commission: +₹{txnSuccess.commission.toFixed(2)}.
                </Alert>
              )}
            </Stack>
          </form>
        </Paper>
      </Box>
    </Box>
  );
}
