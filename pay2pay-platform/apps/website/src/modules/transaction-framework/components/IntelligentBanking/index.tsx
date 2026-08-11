import React from "react";
import { TransferAccordion } from "./TransferAccordion";

export interface IntelligentBankingWorkspaceProps {
  amount: number;
  charges: number;
  totalPayable: number;
  customerCode?: string;
  beneficiaryCode?: string;
}

export const IntelligentBankingWorkspace: React.FC<IntelligentBankingWorkspaceProps> = ({
  amount,
  charges,
  totalPayable,
  customerCode,
  beneficiaryCode,
}) => {
  return (
    <TransferAccordion
      amount={amount}
      charges={charges}
      totalPayable={totalPayable}
      customerCode={customerCode}
      beneficiaryCode={beneficiaryCode}
    />
  );
};

export * from "./TransferAccordion";
export * from "./TransferDetails";
export * from "./AIRouteAnalysis";
export * from "./TransferLimits";
export * from "./ChargesBreakdown";
export * from "./TransactionTimeline";
export * from "./RecentTransfers";
export * from "./RiskAnalysis";
export * from "./OperatorIntelligence";
export * from "./SmartSuggestions";
export * from "./AuditPanel";
