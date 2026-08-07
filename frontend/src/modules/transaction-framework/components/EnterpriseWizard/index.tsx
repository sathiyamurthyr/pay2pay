import React, { useState, useEffect } from "react";
import { Box } from "@mui/material";
import { WizardHeader } from "./WizardHeader";
import { Step1CustomerSearch } from "./Step1CustomerSearch";
import { Step2BeneficiaryAmount } from "./Step2BeneficiaryAmount";
import { Step3Authentication } from "./Step3Authentication";
import { Step4LiveProcessing } from "./Step4LiveProcessing";
import { WizardFooter } from "./WizardFooter";
import { CustomerData } from "../../hooks/useCustomer";
import { BeneficiaryData } from "../../hooks/useBeneficiary";

export interface EnterpriseWizardProps {
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

export const EnterpriseWizardModule: React.FC<EnterpriseWizardProps> = ({
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

  // Global Keyboard Navigation Listener
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
    <Box sx={{ width: "100%", minHeight: "100vh", bgcolor: "#0B132B", color: "#FFFFFF", display: "flex", flexDirection: "column" }}>
      {/* 1. STICKY 68px HEADER BAR */}
      <WizardHeader currentStep={currentStep} walletBalance={customer?.walletBalance ?? 124500} />

      {/* 2. DYNAMIC WIZARD STEP VIEW */}
      <Box sx={{ flex: 1, px: 3, py: 2, width: "100%" }}>
        {currentStep === 1 && (
          <Step1CustomerSearch
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
          <Step2BeneficiaryAmount
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
          <Step3Authentication
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
          <Step4LiveProcessing
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

      {/* 3. CONTEXT-AWARE STICKY FOOTER BAR */}
      <WizardFooter
        currentStep={currentStep}
        onBack={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
        onContinue={() => {
          if (currentStep === 4) {
            onAmountChange(0);
            setCurrentStep(1);
          } else {
            setCurrentStep((prev) => Math.min(4, prev + 1));
          }
        }}
        canContinue={
          currentStep === 1 ? !!customer : currentStep === 2 ? !!selectedBeneficiary && amount > 0 : true
        }
      />
    </Box>
  );
};
