export function validateAccountNumber(accountNo: string): { valid: boolean; error?: string } {
  if (!accountNo || !/^\d{9,18}$/.test(accountNo)) {
    return { valid: false, error: "Account number must be between 9 and 18 digits." };
  }
  return { valid: true };
}

export function validateIFSCCode(ifsc: string): { valid: boolean; error?: string } {
  if (!ifsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase())) {
    return { valid: false, error: "Enter a valid 11-character IFSC code (e.g. HDFC0001234)." };
  }
  return { valid: true };
}
