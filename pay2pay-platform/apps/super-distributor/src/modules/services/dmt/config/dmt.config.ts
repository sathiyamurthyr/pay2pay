export interface DMTConfig {
  serviceCode: "DMT";
  serviceName: "Domestic Money Transfer";
  maxSingleTxnLimit: number;
  monthlyCustomerLimit: number;
  defaultMode: "IMPS" | "NEFT" | "RTGS";
  impsChargePercent: number;
  impsFixedFee: number;
  neftFixedFee: number;
  otpExpirySeconds: number;
  requireBiometricForHighValue: boolean;
  highValueThreshold: number;
}

export const dmtConfig: DMTConfig = {
  serviceCode: "DMT",
  serviceName: "Domestic Money Transfer",
  maxSingleTxnLimit: 25000,
  monthlyCustomerLimit: 200000,
  defaultMode: "IMPS",
  impsChargePercent: 0.5,
  impsFixedFee: 10,
  neftFixedFee: 5,
  otpExpirySeconds: 180,
  requireBiometricForHighValue: true,
  highValueThreshold: 50000,
};
