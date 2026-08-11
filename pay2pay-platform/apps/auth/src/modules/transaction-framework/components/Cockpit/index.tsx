import React, { useState, useEffect } from "react";
import { Box, Stack } from "@mui/material";
import { TransactionContext } from "./TransactionContext";
import { TransferWorkspaceCenter } from "./TransferWorkspace";
import { LiveBankingIntelligence } from "./LiveBankingIntelligence";
import { TimelineDock } from "./TimelineDock";
import { KeyboardHelper } from "./KeyboardHelper";
import { CustomerData } from "../../hooks/useCustomer";
import { BeneficiaryData } from "../../hooks/useBeneficiary";

export interface EnterpriseBankingCockpitProps {
  amount: number;
  onAmountChange: (val: number) => void;
  charges: number;
  totalPayable: number;
  customer: CustomerData | null;
  beneficiaries: BeneficiaryData[];
  selectedBeneficiary: BeneficiaryData | null;
  onSelectBeneficiary: (b: BeneficiaryData) => void;
}

export const EnterpriseBankingCockpit: React.FC<EnterpriseBankingCockpitProps> = ({
  amount,
  onAmountChange,
  charges,
  totalPayable,
  customer,
  beneficiaries,
  selectedBeneficiary,
  onSelectBeneficiary,
}) => {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Global Keyboard listener for F2, F3, F4, Ctrl+Enter, Ctrl+S, Ctrl+/
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "/") {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
      } else if (e.ctrlKey && (e.key === "Enter" || e.code === "NumpadEnter")) {
        e.preventDefault();
        alert(`Executing Transfer of ₹${amount.toLocaleString()} via HDFC DirectSwitch...`);
      } else if (e.ctrlKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        alert("Transaction Draft Saved successfully!");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [amount]);

  return (
    <Box sx={{ width: "100%", position: "relative", pb: 4 }}>
      {/* 3-Column Enterprise Cockpit Grid: Left 25% | Center 50% | Right 25% */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: "minmax(280px, 1fr) minmax(600px, 2fr) minmax(280px, 1fr)",
          },
          gap: 3, // 24px gap
          width: "100%",
          alignItems: "start",
        }}
      >
        {/* Left Panel: Transaction Context (25%) */}
        <Box sx={{ width: "100%" }}>
          <TransactionContext customer={customer} beneficiary={selectedBeneficiary} />
        </Box>

        {/* Center Panel: Transfer Workspace (50%) */}
        <Box sx={{ width: "100%", minWidth: 0 }}>
          <TransferWorkspaceCenter
            amount={amount}
            onAmountChange={onAmountChange}
            charges={charges}
            totalPayable={totalPayable}
            customer={customer}
            selectedBeneficiary={selectedBeneficiary}
          />
        </Box>

        {/* Right Panel: Live Banking Intelligence (25%) */}
        <Box sx={{ width: "100%" }}>
          <LiveBankingIntelligence />
        </Box>
      </Box>

      {/* Sticky Bottom Dock with 8-Step Timeline */}
      <TimelineDock
        currentStep={3}
        onExecute={() => alert(`Executing Transfer of ₹${amount.toLocaleString()}...`)}
        onSaveDraft={() => alert("Transaction Draft Saved!")}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />

      {/* Keyboard Shortcuts Overlay Modal */}
      <KeyboardHelper open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </Box>
  );
};
