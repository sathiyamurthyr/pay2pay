import React, { useState, useEffect } from "react";
import { Box } from "@mui/material";
import { WorkstationHeader } from "./WorkstationHeader";
import { WorkstationStep1 } from "./WorkstationStep1";
import { WorkstationStep2 } from "./WorkstationStep2";
import { WorkstationStep3 } from "./WorkstationStep3";
import { WorkstationStep4 } from "./WorkstationStep4";
import { CustomerData } from "../../hooks/useCustomer";
import { BeneficiaryData } from "../../hooks/useBeneficiary";

export interface EnterpriseWorkstationProps {
  amount: number;
  onAmountChange: (val: number) => void;
  charges: number;
  totalPayable: number;
  customer: CustomerData | null;
  beneficiaries: BeneficiaryData[];
  selectedBeneficiary: BeneficiaryData | null;
  onSelectCustomer: (cust: CustomerData) => void;
  onSelectBeneficiary: (b: BeneficiaryData) => void;
  onSearchCustomer: (q: string) => void;
  isSearching?: boolean;
}

export const EnterpriseWorkstationModule: React.FC<EnterpriseWorkstationProps> = ({
  amount,
  onAmountChange,
  charges,
  totalPayable,
  customer,
  beneficiaries,
  selectedBeneficiary,
  onSelectCustomer,
  onSelectBeneficiary,
  onSearchCustomer,
  isSearching = false,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        setCurrentStep(1);
      } else if (e.key === "F3" && customer) {
        e.preventDefault();
        setCurrentStep(2);
      } else if (e.key === "F4" && customer) {
        e.preventDefault();
        setCurrentStep(2);
      } else if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        if (currentStep === 1 && customer) setCurrentStep(2);
        else if (currentStep === 2 && selectedBeneficiary && amount > 0) setCurrentStep(3);
        else if (currentStep === 3) setCurrentStep(4);
      } else if (e.key === "Escape") {
        if (currentStep > 1 && currentStep < 4) setCurrentStep((prev) => prev - 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep, customer, selectedBeneficiary, amount]);

  return (
    <Box
      sx={{
        width: "100%",
        height: "100vh", // Full screen zero browser scroll
        maxHeight: "100vh",
        bgcolor: "#0B132B",
        color: "#FFFFFF",
        overflow: "hidden", // ZERO BROWSER SCROLLBAR
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 1. GLOBAL FIXED 64px HEADER */}
      <WorkstationHeader walletBalance={customer?.walletBalance ?? 124500} />

      {/* 2. ZERO-SCROLL BODY (height: calc(100vh - 64px)) */}
      <Box sx={{ flex: 1, px: 3, py: 1.5, height: "calc(100vh - 64px)", overflow: "hidden" }}>
        {currentStep === 1 && (
          <WorkstationStep1
            customer={customer}
            onSearchCustomer={onSearchCustomer}
            onSelectCustomer={(c) => {
              onSelectCustomer(c);
              setCurrentStep(2);
            }}
            onContinue={() => setCurrentStep(2)}
            isSearching={isSearching}
          />
        )}

        {currentStep === 2 && (
          <WorkstationStep2
            customer={customer}
            beneficiaries={beneficiaries}
            selectedBeneficiary={selectedBeneficiary}
            onSelectBeneficiary={onSelectBeneficiary}
            amount={amount}
            onAmountChange={onAmountChange}
            charges={charges}
            totalPayable={totalPayable}
            onBack={() => setCurrentStep(1)}
            onContinue={() => setCurrentStep(3)}
          />
        )}

        {currentStep === 3 && (
          <WorkstationStep3
            customer={customer}
            beneficiary={selectedBeneficiary}
            amount={amount}
            charges={charges}
            totalPayable={totalPayable}
            onBack={() => setCurrentStep(2)}
            onAuthorize={() => setCurrentStep(4)}
          />
        )}

        {currentStep === 4 && (
          <WorkstationStep4
            customer={customer}
            beneficiary={selectedBeneficiary}
            amount={amount}
            charges={charges}
            totalPayable={totalPayable}
            onNewTransfer={() => {
              onAmountChange(0);
              setCurrentStep(1);
            }}
          />
        )}
      </Box>
    </Box>
  );
};
