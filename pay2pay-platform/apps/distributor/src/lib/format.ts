/**
 * Format currency using Indian digit grouping (e.g. ₹2,00,000, ₹1,31,550)
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format ISO date string into readable format (e.g., 14 Jan 2023)
 */
export function formatDate(isoString: string): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
