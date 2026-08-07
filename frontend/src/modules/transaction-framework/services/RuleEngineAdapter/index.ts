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
  dailyRemaining?: number;
  monthlyRemaining?: number;
  beneficiaryBankName?: string;
  beneficiaryDailyRemaining?: number;
  beneficiaryMonthlyRemaining?: number;
}

export interface RuleValidationError {
  code: string;
  ruleStep: number;
  title: string;
  message: string;
  severity: "CRITICAL" | "ERROR" | "WARNING" | "INFO";
  metadata?: {
    walletBalance?: number;
    requiredAmount?: number;
    shortfall?: number;
    dailyLimit?: number;
    dailyRemaining?: number;
    monthlyLimit?: number;
    monthlyRemaining?: number;
    suggestedRoute?: string;
    maintenanceWindow?: string;
  };
}

export interface ComprehensiveValidationResult {
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
  allowed: boolean;
  validationErrors: RuleValidationError[];
  validationWarnings: RuleValidationError[];
}

export type PricingEvaluationResult = ComprehensiveValidationResult;

export class RuleEngineService {
  public static getConfiguration(): DynamicPricingConfig {
    return currentConfig;
  }

  public static updateConfiguration(newConfig: Partial<DynamicPricingConfig>): DynamicPricingConfig {
    currentConfig = { ...currentConfig, ...newConfig };
    return currentConfig;
  }

  public static evaluatePricing(req: PricingEvaluationRequest): ComprehensiveValidationResult {
    const {
      amount,
      walletBalance = 124500,
      dailyRemaining = 25000,
      monthlyRemaining = 200000,
      beneficiaryBankName = "HDFC Bank",
      beneficiaryDailyRemaining = 50000,
      beneficiaryMonthlyRemaining = 200000,
    } = req;

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
    const totalPayable = amount > 0 ? amount + netFee : 0;
    const walletBalanceAfter = Math.max(0, walletBalance - totalPayable);

    const validationErrors: RuleValidationError[] = [];
    const validationWarnings: RuleValidationError[] = [];

    // 20-Point Strict Validation Order Execution
    if (amount <= 0) {
      validationErrors.push({
        code: "ERR_AMOUNT_REQUIRED",
        ruleStep: 1,
        title: "Amount Required",
        message: "Enter transfer amount to proceed with settlement",
        severity: "INFO",
      });
    }

    if (amount > 0 && amount < 100) {
      validationErrors.push({
        code: "ERR_MIN_AMOUNT",
        ruleStep: 3,
        title: "Minimum Amount Violation",
        message: `Transfer amount ₹${amount.toLocaleString()} is below minimum permitted limit of ₹100`,
        severity: "ERROR",
      });
    }

    if (amount > 50000) {
      validationErrors.push({
        code: "ERR_MAX_AMOUNT",
        ruleStep: 4,
        title: "Maximum Single Transfer Limit Exceeded",
        message: `Transfer amount ₹${amount.toLocaleString()} exceeds per-transaction limit of ₹50,000`,
        severity: "ERROR",
      });
    }

    if (amount > 0 && totalPayable > walletBalance) {
      const shortfall = totalPayable - walletBalance;
      validationErrors.push({
        code: "ERR_INSUFFICIENT_WALLET",
        ruleStep: 5,
        title: "Insufficient Wallet Balance",
        message: `Wallet Balance ₹${walletBalance.toLocaleString()} is less than Required Net Payable ₹${totalPayable.toLocaleString()}. Shortfall: ₹${shortfall.toLocaleString()}`,
        severity: "CRITICAL",
        metadata: {
          walletBalance,
          requiredAmount: totalPayable,
          shortfall,
        },
      });
    }

    if (amount > 0 && amount > dailyRemaining) {
      validationErrors.push({
        code: "ERR_CUSTOMER_DAILY_LIMIT",
        ruleStep: 6,
        title: "Daily Transfer Limit Exceeded",
        message: `Transfer amount ₹${amount.toLocaleString()} exceeds customer's remaining daily limit of ₹${dailyRemaining.toLocaleString()}`,
        severity: "CRITICAL",
        metadata: {
          dailyLimit: 25000,
          dailyRemaining,
        },
      });
    }

    if (amount > 0 && amount > monthlyRemaining) {
      validationErrors.push({
        code: "ERR_CUSTOMER_MONTHLY_LIMIT",
        ruleStep: 7,
        title: "Monthly Limit Reached",
        message: `Transfer amount ₹${amount.toLocaleString()} exceeds customer's remaining monthly limit of ₹${monthlyRemaining.toLocaleString()}`,
        severity: "CRITICAL",
        metadata: {
          monthlyLimit: 200000,
          monthlyRemaining,
        },
      });
    }

    if (amount > 0 && amount > beneficiaryDailyRemaining) {
      validationErrors.push({
        code: "ERR_BENEFICIARY_DAILY_LIMIT",
        ruleStep: 8,
        title: "Beneficiary Daily Receiving Limit Reached",
        message: `Beneficiary account has reached maximum daily receiving limit of ₹${beneficiaryDailyRemaining.toLocaleString()}`,
        severity: "ERROR",
      });
    }

    if (beneficiaryBankName.toLowerCase().includes("axis")) {
      validationWarnings.push({
        code: "WARN_BANK_DEGRADED",
        ruleStep: 16,
        title: "Bank Network Degraded",
        message: `${beneficiaryBankName} IMPS gateway latency is elevated. Re-routing via HDFC DirectSwitch recommended.`,
        severity: "WARNING",
        metadata: {
          suggestedRoute: "ICICI / HDFC DirectSwitch",
        },
      });
    }

    const allowed = amount > 0 && validationErrors.length === 0;

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
      minLimit: 100,
      maxLimit: 50000,
      dailyLimitRemaining: dailyRemaining,
      monthlyLimitRemaining: monthlyRemaining,
      walletBalance,
      walletBalanceAfter,
      allowed,
      validationErrors,
      validationWarnings,
    };
  }
}
