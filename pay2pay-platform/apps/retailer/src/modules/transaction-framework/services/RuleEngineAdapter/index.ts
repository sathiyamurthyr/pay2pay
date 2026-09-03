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

export interface TransactionModeRecord {
  mode_id: string;
  mode_code: "IMPS" | "NEFT" | "RTGS" | "UPI";
  mode_name: string;
  icon: string;
  enabled: boolean;
  display_order: number;
  minimum_amount: number;
  maximum_amount: number;
  estimated_settlement_seconds: number;
  supports_24x7: boolean;
  pricing_version: string;
}

export const DATABASE_TRANSACTION_MODES: TransactionModeRecord[] = [
  {
    mode_id: "MODE-001",
    mode_code: "IMPS",
    mode_name: "IMPS",
    icon: "⚡",
    enabled: true,
    display_order: 1,
    minimum_amount: 1,
    maximum_amount: 500000,
    estimated_settlement_seconds: 1,
    supports_24x7: true,
    pricing_version: "v2.4.0-ENT",
  },
  {
    mode_id: "MODE-002",
    mode_code: "NEFT",
    mode_name: "NEFT",
    icon: "🏦",
    enabled: true,
    display_order: 2,
    minimum_amount: 1,
    maximum_amount: 1000000,
    estimated_settlement_seconds: 1800,
    supports_24x7: true,
    pricing_version: "v2.4.0-ENT",
  },
  {
    mode_id: "MODE-003",
    mode_code: "RTGS",
    mode_name: "RTGS",
    icon: "🏛",
    enabled: true,
    display_order: 3,
    minimum_amount: 200000,
    maximum_amount: 10000000,
    estimated_settlement_seconds: 300,
    supports_24x7: true,
    pricing_version: "v2.4.0-ENT",
  },
  {
    mode_id: "MODE-004",
    mode_code: "UPI",
    mode_name: "UPI",
    icon: "📱",
    enabled: true,
    display_order: 4,
    minimum_amount: 1,
    maximum_amount: 100000,
    estimated_settlement_seconds: 1,
    supports_24x7: true,
    pricing_version: "v2.4.0-ENT",
  },
];

let currentConfig: DynamicPricingConfig = {
  version: "v2.4.0-ENT",
  ruleId: "RULE-DMT-2026-PRIMARY",
  service: "DMT",
  effectiveFrom: "2026-01-01T00:00:00Z",
  effectiveTo: null,
  status: "ACTIVE",
  slabs: [
    {
      id: "SLAB-0-500000",
      minAmount: 0,
      maxAmount: 500000,
      fee: 22,
      feeType: "FIXED",
      gstEnabled: true,
      gstPercentage: 0.0,
      tdsEnabled: false,
      tdsPercentage: 0.0,
      commission: 0,
      commissionType: "FIXED",
      settlementFee: 0,
      priority: 1,
    },
    {
      id: "SLAB-500001-1000000",
      minAmount: 500001,
      maxAmount: 1000000,
      fee: 22,
      feeType: "FIXED",
      gstEnabled: true,
      gstPercentage: 0.0,
      tdsEnabled: false,
      tdsPercentage: 0.0,
      commission: 0,
      commissionType: "FIXED",
      settlementFee: 0,
      priority: 2,
    },
  ],
};

export interface PricingEvaluationRequest {
  service: string;
  amount: number;
  transactionMode?: "IMPS" | "NEFT" | "RTGS" | "UPI";
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
  beneficiaryStatus?: string;
  isBeneficiaryActive?: boolean;
  limitLoadFailed?: boolean;
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
  selectedMode: "IMPS" | "NEFT" | "RTGS" | "UPI";
  modeName: string;
  estimatedSettlementSeconds: number;
  settlementEtaText: string;
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
  beneficiaryRemaining: number;
  customerRemaining: number;
  maximumAllowed: number;
  walletBalance: number;
  walletBalanceAfter: number;
  allowed: boolean;
  canProceed: boolean;
  validationMessage: string;
  suggestedAmount: number;
  validationErrors: RuleValidationError[];
  validationWarnings: RuleValidationError[];
  limitLoadFailed: boolean;
  isBeneficiaryActive: boolean;
}

export type PricingEvaluationResult = ComprehensiveValidationResult;

export class RuleEngineService {
  public static getConfiguration(): DynamicPricingConfig {
    return currentConfig;
  }

  public static getTransactionModes(): TransactionModeRecord[] {
    return DATABASE_TRANSACTION_MODES;
  }

  public static updateConfiguration(newConfig: Partial<DynamicPricingConfig>): DynamicPricingConfig {
    currentConfig = { ...currentConfig, ...newConfig };
    return currentConfig;
  }

  public static evaluatePricing(req: PricingEvaluationRequest): ComprehensiveValidationResult {
    const {
      amount,
      transactionMode = "IMPS",
      walletBalance = 0,
      // -1 sentinel means: not provided by caller — do NOT treat as exhausted
      dailyRemaining = -1,
      monthlyRemaining = -1,
      beneficiaryBankName = "HDFC Bank",
      beneficiaryDailyRemaining = -1,
      beneficiaryMonthlyRemaining = -1,
      beneficiaryStatus = "ACTIVE",
      isBeneficiaryActive = true,
      limitLoadFailed = false,
    } = req;

    // Resolve actual remaining values — if sentinel -1, treat as unlimited (50000/200000)
    const effectiveDailyRemaining   = dailyRemaining   >= 0 ? dailyRemaining   : 50000;
    const effectiveMonthlyRemaining = monthlyRemaining >= 0 ? monthlyRemaining : 200000;
    const effectiveBeneDailyRem     = beneficiaryDailyRemaining   >= 0 ? beneficiaryDailyRemaining   : 50000;
    const effectiveBeneMonthlyRem   = beneficiaryMonthlyRemaining  >= 0 ? beneficiaryMonthlyRemaining  : 200000;

    const modeInfo = DATABASE_TRANSACTION_MODES.find((m) => m.mode_code === transactionMode) || DATABASE_TRANSACTION_MODES[0];

    const matchingSlab =
      currentConfig.slabs.find((s) => amount >= s.minAmount && amount <= s.maxAmount) ||
      currentConfig.slabs[currentConfig.slabs.length - 1];

    let modeMultiplier = 1;
    if (transactionMode === "NEFT") modeMultiplier = 0.5; // Lower fee for batch NEFT
    else if (transactionMode === "RTGS") modeMultiplier = 2.0; // RTGS high value
    else if (transactionMode === "UPI") modeMultiplier = 0.0; // Zero fee for UPI

    const convenienceFee =
      matchingSlab.feeType === "PERCENTAGE"
        ? Number(((amount * matchingSlab.fee * modeMultiplier) / 100).toFixed(2))
        : Number((matchingSlab.fee * modeMultiplier).toFixed(2));

    const gstAmount = matchingSlab.gstEnabled
      ? matchingSlab.gstPercentage > 0
        ? Number(((convenienceFee * matchingSlab.gstPercentage) / 100).toFixed(2))
        : 3.0
      : 0;
    const tdsAmount = matchingSlab.tdsEnabled ? Number(((convenienceFee * matchingSlab.tdsPercentage) / 100).toFixed(2)) : 0;

    const commission =
      matchingSlab.commissionType === "PERCENTAGE"
        ? Number(((amount * matchingSlab.commission) / 100).toFixed(2))
        : matchingSlab.commission;

    const netFee = Number((convenienceFee + gstAmount).toFixed(2));
    const totalPayable = amount > 0 ? Number((amount + netFee).toFixed(2)) : 0;
    const walletBalanceAfter = Math.max(0, Number((walletBalance - totalPayable).toFixed(2)));

    const validationErrors: RuleValidationError[] = [];
    const validationWarnings: RuleValidationError[] = [];

    // Mode-specific validation checks
    if (!modeInfo.enabled) {
      validationErrors.push({
        code: "ERR_MODE_DISABLED",
        ruleStep: 2,
        title: "Mode Unavailable",
        message: `This transaction mode (${modeInfo.mode_name}) is currently unavailable.`,
        severity: "CRITICAL",
      });
    }

    if (transactionMode === "RTGS" && amount > 0 && amount < modeInfo.minimum_amount) {
      validationErrors.push({
        code: "ERR_RTGS_MIN_AMOUNT",
        ruleStep: 3,
        title: "RTGS Minimum Limit",
        message: `RTGS requires a minimum transfer amount of ₹${modeInfo.minimum_amount.toLocaleString()}.`,
        severity: "ERROR",
      });
    }

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

    if (amount > modeInfo.maximum_amount) {
      validationErrors.push({
        code: "ERR_MAX_AMOUNT",
        ruleStep: 4,
        title: "Maximum Per-Transaction Limit Exceeded",
        message: `Transfer amount ₹${amount.toLocaleString()} exceeds ${transactionMode} limit of ₹${modeInfo.maximum_amount.toLocaleString()}`,
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

    const beneficiaryRemaining = Math.min(effectiveBeneDailyRem, effectiveBeneMonthlyRem);
    const customerRemaining = Math.min(effectiveDailyRemaining, effectiveMonthlyRemaining);
    const maximumAllowed = Math.min(50000, effectiveDailyRemaining, effectiveMonthlyRemaining, beneficiaryRemaining, Math.max(0, walletBalance - netFee));
    const allowed = amount > 0 && validationErrors.length === 0;
    const canProceed = allowed;

    let validationMessage = "Ready to proceed";
    if (validationErrors.length > 0) {
      validationMessage = validationErrors[0].message;
    } else if (validationWarnings.length > 0) {
      validationMessage = validationWarnings[0].message;
    }

    let recommendedGateway = "HDFC DirectSwitch (IMPS)";
    if (transactionMode === "NEFT") recommendedGateway = "RBI Batch Switch (NEFT)";
    else if (transactionMode === "RTGS") recommendedGateway = "RBI High Value DirectSwitch (RTGS)";
    else if (transactionMode === "UPI") recommendedGateway = "NPCI UPI 2.0 Gateway";

    let settlementEtaText = "1.2 Seconds";
    if (modeInfo.estimated_settlement_seconds >= 1800) settlementEtaText = "Batch Mode (30 Mins)";
    else if (modeInfo.estimated_settlement_seconds >= 300) settlementEtaText = "5 Minutes (High Value)";

    return {
      pricingVersion: currentConfig.version,
      ruleId: currentConfig.ruleId,
      slabId: matchingSlab.id,
      amount,
      selectedMode: transactionMode,
      modeName: modeInfo.mode_name,
      estimatedSettlementSeconds: modeInfo.estimated_settlement_seconds,
      settlementEtaText,
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
      recommendedGateway,
      minLimit: modeInfo.minimum_amount,
      maxLimit: modeInfo.maximum_amount,
      dailyLimitRemaining: effectiveDailyRemaining,
      monthlyLimitRemaining: effectiveMonthlyRemaining,
      beneficiaryRemaining,
      customerRemaining,
      maximumAllowed,
      walletBalance,
      walletBalanceAfter,
      allowed,
      canProceed,
      validationMessage,
      suggestedAmount: amount > maximumAllowed ? maximumAllowed : amount,
      validationErrors,
      validationWarnings,
      limitLoadFailed,
      isBeneficiaryActive,
    };
  }
}
