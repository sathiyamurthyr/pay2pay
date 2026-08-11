import React from "react";
import { Stack, Box } from "@mui/material";
import { EnterpriseAmountWorkspace } from "../Amount";
import { IntelligentBankingWorkspace } from "../IntelligentBanking";
import { CustomerData } from "../../hooks/useCustomer";
import { BeneficiaryData } from "../../hooks/useBeneficiary";

export interface TransferWorkspaceProps {
  amount: number;
  onAmountChange: (val: number) => void;
  charges: number;
  totalPayable: number;
  customer: CustomerData | null;
  selectedBeneficiary: BeneficiaryData | null;
}

export const TransferWorkspaceCenter: React.FC<TransferWorkspaceProps> = ({
  amount,
  onAmountChange,
  charges,
  totalPayable,
  customer,
  selectedBeneficiary,
}) => {
  return (
    <Stack spacing={2.5} sx={{ width: "100%", minWidth: 0 }}>
      {/* 1. ENTERPRISE TRANSFER AMOUNT & SETTLEMENT WORKSPACE */}
      <EnterpriseAmountWorkspace
        amount={amount}
        onAmountChange={onAmountChange}
        charges={charges}
        totalPayable={totalPayable}
        customerName={customer?.name}
        customerMobile={customer?.mobile}
        beneficiaryName={selectedBeneficiary?.name}
        beneficiaryAccount={selectedBeneficiary?.accountNumber}
        bankName={selectedBeneficiary?.bankName}
      />

      {/* 2. INTELLIGENT BANKING WORKSPACE ACCORDION CONSOLE */}
      <IntelligentBankingWorkspace
        amount={amount}
        charges={charges}
        totalPayable={totalPayable}
        customerCode={customer?.customerCode}
        beneficiaryCode={selectedBeneficiary?.beneficiaryCode}
      />
    </Stack>
  );
};
