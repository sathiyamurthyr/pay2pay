export function validateMobileNumber(mobile: string): { valid: boolean; error?: string } {
  if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) {
    return { valid: false, error: "Please enter a valid 10-digit Indian mobile number." };
  }
  return { valid: true };
}

export function validateCustomerRegistration(data: { name: string; mobile: string; dob: string }): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!data.name || data.name.trim().length < 3) errors.name = "Full Name must be at least 3 characters.";
  const mobileRes = validateMobileNumber(data.mobile);
  if (!mobileRes.valid) errors.mobile = mobileRes.error || "Invalid mobile number.";
  if (!data.dob) errors.dob = "Date of birth is required for eKYC registration.";
  return { valid: Object.keys(errors).length === 0, errors };
}
