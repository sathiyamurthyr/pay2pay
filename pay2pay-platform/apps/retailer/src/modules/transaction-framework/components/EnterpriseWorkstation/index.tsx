import React, { useState, useEffect } from "react";
import { Box } from "@mui/material";
import { WorkstationStep1 } from "./WorkstationStep1";
import { WorkstationStep2 } from "./WorkstationStep2";
import { WorkstationStep4 } from "./WorkstationStep4";
import { CustomerData } from "../../hooks/useCustomer";
import { BeneficiaryData } from "../../hooks/useBeneficiary";
import { PricingEvaluationResult, RuleEngineService } from "../../services/RuleEngineAdapter";
import { useRetailerStore } from "@/stores/use-retailer-store";

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
  onResetCustomer?: () => void;
  isSearching?: boolean;
  hasSearched?: boolean;
  pricingResult?: PricingEvaluationResult;
  isLoadingBeneficiaries?: boolean;
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
  onResetCustomer,
  isSearching = false,
  hasSearched = false,
  pricingResult: propsPricingResult,
  isLoadingBeneficiaries = false,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedMode, setSelectedMode] = useState<"IMPS" | "NEFT" | "RTGS" | "UPI">("IMPS");
  const retailerWallet = useRetailerStore((state) => state.wallet);

  // Safely fallback to Step 1 only if customer is completely reset while on later steps
  useEffect(() => {
    if (!customer && currentStep > 1) {
      setCurrentStep(1);
    }
  }, [customer, currentStep]);

  // Dynamic Rule Engine Evaluation with Transaction Mode
  const pricingResult =
    propsPricingResult ||
    RuleEngineService.evaluatePricing({
      service: "DMT",
      amount,
      transactionMode: selectedMode,
      customerId: customer?.id,
      walletBalance: retailerWallet.mainBalance ?? 235750.00,
    });

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
      } else if (e.key === "Escape") {
        if (currentStep > 1) setCurrentStep((prev) => prev - 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep, customer, selectedBeneficiary, amount]);

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "calc(100vh - 56px)",
        bgcolor: "#080B11",
        color: "#FFFFFF",
        overflowY: "auto",
        overflowX: "hidden",
        display: "flex",
        flexDirection: "column",
        p: { xs: 1, sm: 2 },
        pb: { xs: 12, md: 6 },
      }}
    >
      {/* WORKSTATION BODY */}
      <Box sx={{ flex: 1, width: "100%", pb: 4 }}>
        {currentStep === 1 && (
          <WorkstationStep1
            customer={customer}
            onSearchCustomer={onSearchCustomer}
            onSelectCustomer={(c) => {
              onSelectCustomer(c);
              setCurrentStep(2);
            }}
            onContinue={() => setCurrentStep(2)}
            onResetCustomer={onResetCustomer}
            isSearching={isSearching}
            hasSearched={hasSearched}
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
            pricingResult={pricingResult}
            selectedMode={selectedMode}
            onModeChange={(mode) => setSelectedMode(mode)}
            onBack={() => setCurrentStep(1)}
            onContinue={() => setCurrentStep(3)}
            isLoading={isLoadingBeneficiaries}
          />
        )}

        {currentStep === 3 && (
          <WorkstationStep4
            customer={customer}
            beneficiary={selectedBeneficiary}
            amount={amount}
            charges={pricingResult.convenienceFee}
            totalPayable={pricingResult.totalPayable}
            transactionMode={selectedMode}
            onBack={() => setCurrentStep(2)}
            onAuthorize={() => {
              onAmountChange(0);
              setCurrentStep(1);
            }}
          />
        )}
      </Box>
    </Box>
  );
};
