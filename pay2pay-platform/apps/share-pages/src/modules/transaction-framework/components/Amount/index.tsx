import React from "react";
import { Stack, Paper, Typography } from "@mui/material";
import { TransferAmountInput } from "./TransferAmountInput";
import { QuickAmountSelector } from "./QuickAmountSelector";
import { AmountInWords } from "./AmountInWords";
import { TransferSummary } from "./TransferSummary";
import { AIRouteRecommendation } from "./AIRouteRecommendation";
import { TransferPreview } from "./TransferPreview";
import { AmountValidation } from "./AmountValidation";
import { RuleEngineService } from "../../services/RuleEngineAdapter";

export interface EnterpriseAmountWorkspaceProps {
  amount: number;
  onAmountChange: (val: number) => void;
  charges: number;
  totalPayable: number;
  customerName?: string;
  customerMobile?: string;
  beneficiaryName?: string;
  beneficiaryAccount?: string;
  bankName?: string;
}

export const EnterpriseAmountWorkspace: React.FC<EnterpriseAmountWorkspaceProps> = ({
  amount,
  onAmountChange,
  charges,
  totalPayable,
  customerName,
  customerMobile,
  beneficiaryName,
  beneficiaryAccount,
  bankName,
}) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3, // 24px padding
        borderRadius: "16px",
        bgcolor: "rgba(18, 27, 48, 0.75)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25)",
        width: "100%",
      }}
    >
      <Stack spacing={3}>
        {/* Section Heading: 20px Section Heading */}
        <Typography
          sx={{
            color: "#60A5FA",
            fontWeight: 600,
            fontSize: "20px",
            letterSpacing: "-0.2px",
          }}
        >
          Transfer Amount & Settlement Workspace
        </Typography>

        {/* 1. Large 64px Amount Input */}
        <TransferAmountInput amount={amount} onAmountChange={onAmountChange} />

        {/* 2. Amount In Words Live Conversion */}
        <AmountInWords amount={amount} />

        {/* 3. Quick Amount Selector Chips */}
        <QuickAmountSelector amount={amount} onSelect={onAmountChange} />

        {/* 4. Live Validation & Risk Alerts */}
        <AmountValidation validationResult={RuleEngineService.evaluatePricing({ service: "DMT", amount })} />

        {/* 5. Compact Financial KPI Summary Cards */}
        <TransferSummary amount={amount} charges={charges} totalPayable={totalPayable} />

        {/* 6. AI Smart Route Optimization Recommendation Engine */}
        <AIRouteRecommendation amount={amount} />

        {/* 7. Complete Transfer Audit Preview */}
        <TransferPreview
          customerName={customerName}
          customerMobile={customerMobile}
          beneficiaryName={beneficiaryName}
          beneficiaryAccount={beneficiaryAccount}
          bankName={bankName}
          amount={amount}
          totalPayable={totalPayable}
        />
      </Stack>
    </Paper>
  );
};
