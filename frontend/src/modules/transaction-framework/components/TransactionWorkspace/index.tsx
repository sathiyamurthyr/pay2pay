import React from "react";
import { Stack, Box } from "@mui/material";
import { ServiceType } from "../../services/TransactionAdapter/types";
import { useTransaction } from "../../hooks/useTransaction";
import { useCustomer } from "../../hooks/useCustomer";
import { useBeneficiary } from "../../hooks/useBeneficiary";
import { TransactionSearch } from "../TransactionSearch";
import { CustomerPanel } from "../CustomerPanel";
import { BeneficiaryPanel } from "../BeneficiaryPanel";
import { AmountPanel } from "../AmountPanel";
import { ChargesPanel } from "../ChargesPanel";
import { RecentTransactions } from "../RecentTransactions";
import { PageHeader } from "@/design-system/components";

export interface TransactionWorkspaceProps {
  service: ServiceType;
}

export const TransactionWorkspace: React.FC<TransactionWorkspaceProps> = ({ service }) => {
  const { config, amount, setAmount, charges, totalPayable } = useTransaction(service);
  const { selectedCustomer, searchCustomer } = useCustomer();
  const { beneficiaries, selectedBeneficiary, setSelectedBeneficiary } = useBeneficiary();

  return (
    <Stack spacing={3} sx={{ width: "100%", minWidth: 0 }}>
      {/* Dynamic Service Header */}
      <PageHeader title={config.title} subtitle={config.subtitle} />

      {/* Universal Search Input Bar */}
      <TransactionSearch placeholder={config.searchPlaceholder} onSearch={searchCustomer} />

      {/* Customer Profile Card */}
      <CustomerPanel customer={selectedCustomer} />

      {/* Beneficiary Grid (If Supported by Service) */}
      {config.allowBeneficiarySelection && (
        <BeneficiaryPanel
          beneficiaries={beneficiaries}
          selectedBeneficiary={selectedBeneficiary}
          onSelect={setSelectedBeneficiary}
        />
      )}

      {/* Amount Entry & Charges Breakdown */}
      <AmountPanel amount={amount} onAmountChange={setAmount} charges={charges} totalPayable={totalPayable} />
      <ChargesPanel amount={amount} charges={charges} totalPayable={totalPayable} />

      {/* Audit Ledger Data Grid */}
      <RecentTransactions />
    </Stack>
  );
};
