import { dmtConfig } from "../config/dmt.config";

export function validateTransferAmount(amount: number, remainingDailyLimit: number): { valid: boolean; error?: string } {
  if (!amount || amount <= 0) {
    return { valid: false, error: "Transfer amount must be greater than ₹0." };
  }
  if (amount > dmtConfig.maxSingleTxnLimit) {
    return { valid: false, error: `Single transaction amount cannot exceed ₹${dmtConfig.maxSingleTxnLimit.toLocaleString()}.` };
  }
  if (amount > remainingDailyLimit) {
    return { valid: false, error: `Amount exceeds customer daily remaining limit (₹${remainingDailyLimit.toLocaleString()}).` };
  }
  return { valid: true };
}
