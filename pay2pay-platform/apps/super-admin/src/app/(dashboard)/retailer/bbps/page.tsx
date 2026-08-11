"use client";

import React, { useState } from "react";
import { Box, Paper, Typography, Stack, Alert, Button, Divider } from "@mui/material";
import ReceiptIcon from "@mui/icons-material/Receipt";
import ShieldIcon from "@mui/icons-material/Shield";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { M3TextField, M3CurrencyInput, M3Select } from "@/components/ui/form-components";
import { M3Button } from "@/components/ui/m3-components";
import { retailerApi } from "@/services/retailer-api";
import { useRetailerStore } from "@/stores/use-retailer-store";

export default function BbpsPage() {
  const { wallet, updateWallet } = useRetailerStore();
  const [category, setCategory] = useState("ELECTRICITY");
  const [biller, setBiller] = useState("TNEB");
  const [consumerNo, setConsumerNo] = useState("0492819201");
  const [billData, setBillData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [paySuccess, setPaySuccess] = useState<any | null>(null);

  const categories = [
    { value: "ELECTRICITY", label: "Electricity Bill" },
    { value: "WATER", label: "Water Tax & Supply" },
    { value: "GAS", label: "Piped Gas & LPG Cylinder" },
    { value: "BROADBAND", label: "Broadband & Landline" },
    { value: "FASTAG", label: "FASTag Toll Recharge" },
  ];

  const billers = [
    { value: "TNEB", label: "Tamil Nadu Electricity Board (TNEB)" },
    { value: "BESCOM", label: "BESCOM Bangalore Electricity" },
    { value: "MSEDCL", label: "MSEDCL Maharashtra Electricity" },
    { value: "ADANI_GAS", label: "Adani Total Gas Ltd" },
  ];

  const handleFetchBill = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setBillData({
        customerName: "Senthil Nathan",
        billAmount: 1450.00,
        dueDate: "15 Aug 2026",
        billNumber: "BILL-2026-08129",
      });
    }, 1000);
  };

  const handlePayBill = async () => {
    if (!billData) return;
    setLoading(true);
    const res = await retailerApi.payBbpsBill({
      billerCategory: category,
      billerId: biller,
      consumerNumber: consumerNo,
      amount: billData.billAmount,
    });
    setLoading(false);

    updateWallet({
      mainBalance: wallet.mainBalance - billData.billAmount + 3.5,
      todayMargin: wallet.todayMargin + 3.5,
    });

    setPaySuccess(res);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "20px", pb: 4 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "7fr 5fr" }, gap: 3 }}>
        <Paper elevation={0} sx={{ p: 3.5, borderRadius: 3.5, border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
          <Stack spacing={2.5}>
            <M3Select
              label="Bill Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={categories}
            />

            <M3Select
              label="Select Utility Biller"
              value={biller}
              onChange={(e) => setBiller(e.target.value)}
              options={billers}
            />

            <M3TextField
              label="Consumer / Connection Number"
              value={consumerNo}
              onChange={(e) => setConsumerNo(e.target.value)}
            />

            <M3Button variant="contained" loading={loading} onClick={handleFetchBill} fullWidth>
              Fetch Outstanding Bill
            </M3Button>

            {billData && (
              <Box sx={{ p: 3, borderRadius: 3, backgroundColor: "#F8FAFC", border: "1px solid #E5E7EB", mt: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>
                  Bill Details Retrieved
                </Typography>
                <Stack spacing={1} sx={{ mb: 2.5 }}>
                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography variant="body2" sx={{ color: "#6B7280" }}>Consumer Name</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{billData.customerName}</Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography variant="body2" sx={{ color: "#6B7280" }}>Bill Amount</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: "#DC2626" }}>₹{billData.billAmount.toFixed(2)}</Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography variant="body2" sx={{ color: "#6B7280" }}>Due Date</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{billData.dueDate}</Typography>
                  </Stack>
                </Stack>

                <M3Button variant="contained" color="error" loading={loading} onClick={handlePayBill} fullWidth>
                  Pay Bill ₹{billData.billAmount.toFixed(2)}
                </M3Button>
              </Box>
            )}

            {paySuccess && (
              <Alert severity="success" icon={<CheckCircleIcon />} sx={{ borderRadius: 2.5 }}>
                Bill Payment Successful! Approval Ref: {paySuccess.approvalRefNum}. Retailer Margin: +₹3.50.
              </Alert>
            )}
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
