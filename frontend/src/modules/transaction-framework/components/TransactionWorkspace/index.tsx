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
  const { selectedCustomer, isSearching, searchCustomer } = useCustomer();
  const { beneficiaries, selectedBeneficiary, setSelectedBeneficiary, isLoading: isBeneficiariesLoading } = useBeneficiary(selectedCustomer);

  return (
    <Stack spacing={2.5} sx={{ width: "100%", minWidth: 0, pt: 0 }}>
      {/* Transaction Toolbar as Very First Primary Control (No Hero Section) */}
      <TransactionSearch placeholder={config.searchPlaceholder} onSearch={searchCustomer} isSearching={isSearching} />

      {/* Customer Profile Card */}
      <CustomerPanel customer={selectedCustomer} />

      {/* Beneficiary Grid (If Supported by Service) */}
      {config.allowBeneficiarySelection && (
        <BeneficiaryPanel
          beneficiaries={beneficiaries}
          selectedBeneficiary={selectedBeneficiary}
          onSelect={setSelectedBeneficiary}
          isLoading={isBeneficiariesLoading}
        />
      )}

      {/* Consolidated Transfer Summary Card (Amount, Charges, Commission, GST, Total, AI Suggestion) */}
      <AmountPanel amount={amount} onAmountChange={setAmount} charges={charges} totalPayable={totalPayable} />

      {/* Audit Ledger Data Grid */}
      <RecentTransactions />
    </Stack>
  );
};
