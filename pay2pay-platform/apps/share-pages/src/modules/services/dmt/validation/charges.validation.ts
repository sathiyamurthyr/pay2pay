import { dmtConfig } from "../config/dmt.config";

export function calculateDMTFeeBreakdown(amount: number, mode: "IMPS" | "NEFT" = "IMPS") {
  if (mode === "NEFT") {
    const fee = dmtConfig.neftFixedFee;
    return { fee, gst: Math.round(fee * 0.18), totalCharge: Math.round(fee * 1.18) };
  }
  const variableFee = Math.round(amount * (dmtConfig.impsChargePercent / 100));
  const fee = variableFee + dmtConfig.impsFixedFee;
  const gst = Math.round(fee * 0.18);
  return { fee, gst, totalCharge: fee + gst };
}
