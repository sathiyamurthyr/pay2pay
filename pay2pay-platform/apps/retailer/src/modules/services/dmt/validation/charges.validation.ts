import { dmtConfig } from "../config/dmt.config";

export function calculateDMTFeeBreakdown(amount: number, mode: "IMPS" | "NEFT" = "IMPS") {
  const fee = 22;
  const gst = 3;
  return { fee, gst, totalCharge: fee + gst };
}
