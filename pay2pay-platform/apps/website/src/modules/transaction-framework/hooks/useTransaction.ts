import { useState, useMemo } from "react";
import { ServiceType, SERVICE_CONFIGS } from "../services/TransactionAdapter/types";
import { RuleEngineService, PricingEvaluationResult } from "../services/RuleEngineAdapter";
import { CustomerData } from "../hooks/useCustomer";
import { useRetailerStore } from "@/stores/use-retailer-store";

export function useTransaction(service: ServiceType = "DMT", customer?: CustomerData | null) {
  const config = SERVICE_CONFIGS[service] || SERVICE_CONFIGS.DMT;
  const [amount, setAmount] = useState<number>(0);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const retailerWallet = useRetailerStore((state) => state.wallet);

  // Dynamic Rule Engine Evaluation from backend configuration tables
  const pricingResult: PricingEvaluationResult = useMemo(() => {
    const currentBal = retailerWallet.mainBalance ?? 235750.00;
    return RuleEngineService.evaluatePricing({
      service,
      amount,
      customerId: customer?.id,
      walletBalance: currentBal,
    });
  }, [service, amount, customer, retailerWallet.mainBalance]);

  return {
    config,
    amount,
    setAmount,
    pricingResult,
    charges: pricingResult.convenienceFee,
    fee: pricingResult.convenienceFee,
    gst: pricingResult.gstAmount,
    tds: pricingResult.tdsAmount,
    commission: pricingResult.commission,
    netFee: pricingResult.netFee,
    totalPayable: pricingResult.totalPayable,
    balanceAfter: pricingResult.walletBalanceAfter,
    pricingVersion: pricingResult.pricingVersion,
    ruleId: pricingResult.ruleId,
    slabId: pricingResult.slabId,
    activeStep,
    setActiveStep,
    isProcessing,
    setIsProcessing,
  };
}
