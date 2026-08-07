import { useState, useMemo } from "react";
import { ServiceType, SERVICE_CONFIGS } from "../services/TransactionAdapter/types";
import { RuleEngineService, PricingEvaluationResult } from "../services/RuleEngineAdapter";
import { CustomerData } from "../hooks/useCustomer";

export function useTransaction(service: ServiceType = "DMT", customer?: CustomerData | null) {
  const config = SERVICE_CONFIGS[service] || SERVICE_CONFIGS.DMT;
  const [amount, setAmount] = useState<number>(5000);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState(false);

  // Dynamic Rule Engine Evaluation from backend configuration tables
  const pricingResult: PricingEvaluationResult = useMemo(() => {
    return RuleEngineService.evaluatePricing({
      service,
      amount,
      customerId: customer?.id,
      walletBalance: customer?.walletBalance ?? 124500,
    });
  }, [service, amount, customer]);

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
