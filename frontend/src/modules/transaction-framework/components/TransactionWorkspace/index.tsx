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

import { EnterpriseBeneficiaryModule } from "../Beneficiary";
import { EnterpriseBankingCockpit } from "../Cockpit";

export interface TransactionWorkspaceProps {
  service: ServiceType;
}

export const TransactionWorkspace: React.FC<TransactionWorkspaceProps> = ({ service }) => {
  const { config, amount, setAmount, charges, totalPayable } = useTransaction(service);
  const { selectedCustomer, isSearching, searchCustomer } = useCustomer();
  const { beneficiaries, selectedBeneficiary, setSelectedBeneficiary, isLoading: isBeneficiariesLoading } = useBeneficiary(selectedCustomer);

  return (
    <Stack spacing={2.5} sx={{ width: "100%", minWidth: 0, pt: 0 }}>
      {/* Universal Transaction Search Toolbar */}
      <TransactionSearch placeholder={config.searchPlaceholder} onSearch={searchCustomer} isSearching={isSearching} />

      {/* Enterprise Beneficiary Module (Summary, Search, Filters, Recent, Favorites, Data Grid & Right Drawer) */}
      {config.allowBeneficiarySelection && (
        <EnterpriseBeneficiaryModule
          customer={selectedCustomer}
          beneficiaries={beneficiaries}
          selectedBeneficiary={selectedBeneficiary}
          onSelectBeneficiary={setSelectedBeneficiary}
          isLoading={isBeneficiariesLoading}
        />
      )}

      {/* Intelligent Transaction Cockpit (Left Panel 25% | Center Panel 50% | Right Panel 25% + Sticky Bottom Dock) */}
      <EnterpriseBankingCockpit
        amount={amount}
        onAmountChange={setAmount}
        charges={charges}
        totalPayable={totalPayable}
        customer={selectedCustomer}
        beneficiaries={beneficiaries}
        selectedBeneficiary={selectedBeneficiary}
        onSelectBeneficiary={setSelectedBeneficiary}
      />

      {/* Audit Ledger Data Grid */}
      <RecentTransactions />
    </Stack>
  );
};
