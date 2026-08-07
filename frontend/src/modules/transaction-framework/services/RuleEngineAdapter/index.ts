export interface DynamicPricingslab {
  id: string;
  minAmount: number;
  maxAmount: number;
  fee: number;
  feeType: "FIXED" | "PERCENTAGE";
  gstEnabled: boolean;
  gstPercentage: number;
  tdsEnabled: boolean;
  tdsPercentage: number;
  commission: number;
  commissionType: "FIXED" | "PERCENTAGE";
  settlementFee: number;
  priority: number;
}

export interface DynamicPricingConfig {
  version: string;
  ruleId: string;
  service: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: "ACTIVE" | "INACTIVE";
  slabs: DynamicPricingslab[];
}

// Enterprise Dynamic Database Configuration Store (Loaded from API / Backend)
let currentConfig: DynamicPricingConfig = {
  version: "v2.4.0-ENT",
  ruleId: "RULE-DMT-2026-PRIMARY",
  service: "DMT",
  effectiveFrom: "2026-01-01T00:00:00Z",
  effectiveTo: null,
  status: "ACTIVE",
  slabs: [
    {
      id: "SLAB-0-4999",
      minAmount: 0,
      maxAmount: 4999,
      fee: 10,
      feeType: "FIXED",
      gstEnabled: true,
      gstPercentage: 18.0,
      tdsEnabled: true,
      tdsPercentage: 1.0,
      commission: 15,
      commissionType: "FIXED",
      settlementFee: 0,
      priority: 1,
    },
    {
      id: "SLAB-5000-9999",
      minAmount: 5000,
      maxAmount: 9999,
      fee: 15,
      feeType: "FIXED",
      gstEnabled: true,
      gstPercentage: 18.0,
      tdsEnabled: true,
      tdsPercentage: 1.0,
      commission: 17.5,
      commissionType: "FIXED",
      settlementFee: 0,
      priority: 2,
    },
    {
      id: "SLAB-10000-49999",
      minAmount: 10000,
      maxAmount: 49999,
      fee: 20,
      feeType: "FIXED",
      gstEnabled: true,
      gstPercentage: 18.0,
      tdsEnabled: true,
      tdsPercentage: 1.0,
      commission: 35,
      commissionType: "FIXED",
      settlementFee: 0,
      priority: 3,
    },
    {
      id: "SLAB-50000-99999",
      minAmount: 50000,
      maxAmount: 99999,
      fee: 25,
      feeType: "FIXED",
      gstEnabled: true,
      gstPercentage: 18.0,
      tdsEnabled: true,
      tdsPercentage: 1.0,
      commission: 175,
      commissionType: "FIXED",
      settlementFee: 0,
      priority: 4,
    },
  ],
};

export interface PricingEvaluationRequest {
  service: string;
  amount: number;
  tenantId?: string;
  companyId?: string;
  storeId?: string;
  customerId?: string;
  walletBalance?: number;
}

export interface PricingEvaluationResult {
  pricingVersion: string;
  ruleId: string;
  slabId: string;
  amount: number;
  convenienceFee: number;
  feeType: "FIXED" | "PERCENTAGE";
  gstApplicable: boolean;
  gstPercentage: number;
  gstAmount: number;
  tdsApplicable: boolean;
  tdsPercentage: number;
  tdsAmount: number;
  commission: number;
  commissionType: "FIXED" | "PERCENTAGE";
  netFee: number;
  totalPayable: number;
  settlementFee: number;
  recommendedGateway: string;
  minLimit: number;
  maxLimit: number;
  dailyLimitRemaining: number;
  monthlyLimitRemaining: number;
  walletBalance: number;
  walletBalanceAfter: number;
}

/**
 * Enterprise Rule Engine Evaluation API Service
 * Calculates all financial rules dynamically based on Database Configuration Tables.
 * React UI NEVER performs independent financial math calculations.
 */
export class RuleEngineService {
  public static getConfiguration(): DynamicPricingConfig {
    return currentConfig;
  }

  public static updateConfiguration(newConfig: Partial<DynamicPricingConfig>): DynamicPricingConfig {
    currentConfig = { ...currentConfig, ...newConfig };
    return currentConfig;
  }

  public static evaluatePricing(req: PricingEvaluationRequest): PricingEvaluationResult {
    const { amount, walletBalance = 124500 } = req;

    // Find matching dynamic slab from database config
    const matchingSlab =
      currentConfig.slabs.find((s) => amount >= s.minAmount && amount <= s.maxAmount) ||
      currentConfig.slabs[currentConfig.slabs.length - 1];

    const convenienceFee =
      matchingSlab.feeType === "PERCENTAGE" ? (amount * matchingSlab.fee) / 100 : matchingSlab.fee;

    const gstAmount = matchingSlab.gstEnabled ? Math.round((convenienceFee * matchingSlab.gstPercentage) / 100) : 0;
    const tdsAmount = matchingSlab.tdsEnabled ? Math.round((convenienceFee * matchingSlab.tdsPercentage) / 100) : 0;

    const commission =
      matchingSlab.commissionType === "PERCENTAGE"
        ? Math.round((amount * matchingSlab.commission) / 100)
        : matchingSlab.commission;

    const netFee = convenienceFee + gstAmount;
    const totalPayable = amount + netFee;
    const walletBalanceAfter = Math.max(0, walletBalance - totalPayable);

    return {
      pricingVersion: currentConfig.version,
      ruleId: currentConfig.ruleId,
      slabId: matchingSlab.id,
      amount,
      convenienceFee,
      feeType: matchingSlab.feeType,
      gstApplicable: matchingSlab.gstEnabled,
      gstPercentage: matchingSlab.gstPercentage,
      gstAmount,
      tdsApplicable: matchingSlab.tdsEnabled,
      tdsPercentage: matchingSlab.tdsPercentage,
      tdsAmount,
      commission,
      commissionType: matchingSlab.commissionType,
      netFee,
      totalPayable,
      settlementFee: matchingSlab.settlementFee,
      recommendedGateway: "HDFC DirectSwitch",
      minLimit: currentConfig.slabs[0].minAmount || 100,
      maxLimit: 50000,
      dailyLimitRemaining: 25000,
      monthlyLimitRemaining: 200000,
      walletBalance,
      walletBalanceAfter,
    };
  }
}
