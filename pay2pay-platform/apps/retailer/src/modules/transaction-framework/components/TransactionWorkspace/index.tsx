"use client";
import React, { useEffect } from "react";
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

import { EnterpriseWorkstationModule } from "../EnterpriseWorkstation";

export interface TransactionWorkspaceProps {
  service: ServiceType;
}

export const TransactionWorkspace: React.FC<TransactionWorkspaceProps> = ({ service }) => {
  const { selectedCustomer, isSearching, hasSearched, searchCustomer, resetCustomer } = useCustomer();
  const { config, amount, setAmount, charges, totalPayable, pricingResult } = useTransaction(service, selectedCustomer);
  const { beneficiaries, selectedBeneficiary, setSelectedBeneficiary, isLoading: isLoadingBeneficiaries } = useBeneficiary(selectedCustomer);

  // Auto-load customer from URL params set by "Transfer Funds Now" on the beneficiary page.
  // Reads window.location.search directly — no localStorage, no hardcoding.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const autoQuery = params.get("customerMobile") || params.get("customerId");
    if (autoQuery && !selectedCustomer) {
      searchCustomer(autoQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once on mount only

  return (
    <Box sx={{ width: "100%", minWidth: 0, pt: 0 }}>
      {/* Enterprise Banking Workstation (CBS / Temenos / Finacle / RazorpayX Zero Browser Scroll Workstation) */}
      <EnterpriseWorkstationModule
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
        onResetCustomer={resetCustomer}
        isSearching={isSearching}
        hasSearched={hasSearched}
        pricingResult={pricingResult}
        isLoadingBeneficiaries={isLoadingBeneficiaries}
      />
    </Box>
  );
};
