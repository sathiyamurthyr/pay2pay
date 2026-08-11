// Shared Common Utilities for Pay2Pay Platform

export function logInfo(message: string, context?: Record<string, any>): void {
  console.log(`[PAY2PAY PLATFORM INFO] ${message}`, context || "");
}

export function logError(message: string, error?: any): void {
  console.error(`[PAY2PAY PLATFORM ERROR] ${message}`, error || "");
}
