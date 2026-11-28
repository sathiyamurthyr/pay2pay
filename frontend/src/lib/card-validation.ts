/**
 * Credit Card & Mobile Validation Helpers for Retailer Card Management.
 */

export function sanitizeDigits(value: string): string {
  return String(value || "").replace(/\D/g, "");
}

export function normalizeIndianMobile(value: string): string {
  let digits = sanitizeDigits(value);
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return digits;
}

export function isValidIndianMobile(value: string): boolean {
  const digits = normalizeIndianMobile(value);
  return /^[6-9]\d{9}$/.test(digits);
}

export function luhnCheck(rawCardNumber: string): boolean {
  const digits = sanitizeDigits(rawCardNumber);
  if (digits.length < 13 || digits.length > 19) {
    return false;
  }
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (shouldDouble) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

export function formatCardInputDisplay(rawCardNumber: string): string {
  const digits = sanitizeDigits(rawCardNumber).slice(0, 19);
  if (digits.length <= 15 && (digits.startsWith("34") || digits.startsWith("37"))) {
    // Amex 4-6-5 grouping
    const p1 = digits.slice(0, 4);
    const p2 = digits.slice(4, 10);
    const p3 = digits.slice(10, 15);
    return [p1, p2, p3].filter(Boolean).join(" ");
  }
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

export function maskCardPreview(rawCardNumber: string): string {
  const digits = sanitizeDigits(rawCardNumber);
  if (digits.length < 4) return "XXXX-XXXX-XXXX-XXXX";
  const last4 = digits.slice(-4);
  if (digits.length === 15) {
    return `XXXX-XXXXXX-X${last4}`;
  }
  return `XXXX-XXXX-XXXX-${last4}`;
}

export function ordinalDay(day: number): string {
  if (!Number.isFinite(day) || day < 1 || day > 31) return String(day);
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}
