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

import { EnterpriseWizardModule } from "../EnterpriseWizard";

export interface TransactionWorkspaceProps {
  service: ServiceType;
}

export const TransactionWorkspace: React.FC<TransactionWorkspaceProps> = ({ service }) => {
  const { config, amount, setAmount, charges, totalPayable } = useTransaction(service);
  const { selectedCustomer, isSearching, searchCustomer } = useCustomer();
  const { beneficiaries, selectedBeneficiary, setSelectedBeneficiary } = useBeneficiary(selectedCustomer);

  return (
    <Box sx={{ width: "100%", minWidth: 0, pt: 0 }}>
      {/* 4-Step Enterprise Transaction Wizard (Step 1: Search → Step 2: Beneficiary & Amount → Step 3: Authorize → Step 4: Live Settlement) */}
      <EnterpriseWizardModule
        amount={amount}
        onAmountChange={setAmount}
        charges={charges}
        totalPayable={totalPayable}
        customer={selectedCustomer}
        beneficiaries={beneficiaries}
        selectedBeneficiary={selectedBeneficiary}
        onSelectCustomer={(c) => searchCustomer(c.mobile)}
        onSelectBeneficiary={setSelectedBeneficiary}
        onSearchCustomer={searchCustomer}
        isSearching={isSearching}
      />
    </Box>
  );
};
