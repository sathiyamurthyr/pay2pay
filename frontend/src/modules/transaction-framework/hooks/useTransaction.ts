import { useState } from "react";
import { ServiceType, SERVICE_CONFIGS } from "../services/TransactionAdapter/types";

export function useTransaction(service: ServiceType = "DMT") {
  const config = SERVICE_CONFIGS[service] || SERVICE_CONFIGS.DMT;
  const [amount, setAmount] = useState<number>(5000);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState(false);

  const charges = Math.round(amount * (config.defaultChargeRatePercentage / 100)) + config.fixedFeeRupees;
  const totalPayable = amount + charges;

  return {
    config,
    amount,
    setAmount,
    charges,
    totalPayable,
    activeStep,
    setActiveStep,
    isProcessing,
    setIsProcessing,
  };
}
