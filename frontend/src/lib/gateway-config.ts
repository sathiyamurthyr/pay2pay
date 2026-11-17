/**
 * Centralized Payment Gateway Display Configuration.
 * Enterprise Standard for Sathus Financial Applications (Pay2Pay, Near4You, SMSPAY).
 *
 * Rules:
 * 1. Customer-facing gateway display must contain EXACTLY:
 *    - Provider A -> G-1 (Gateway G-1)
 *    - Provider B -> G-2 (Gateway G-2)
 * 2. Absolutely NO other gateway entries (no G-3, G-4, OceanPay, FastPay, ToursPay).
 * 3. Never expose actual vendor/provider names in customer-facing interfaces, tooltips,
 *    labels, or status summaries.
 * 4. Internal provider identifiers (BANKME, EXISTING) are preserved in the backend.
 */

export interface GatewayConfigItem {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  vendorCode: string;
  internalProviderRef: string;
  badge: string;
  badgeColor: string;
  iconText: string;
  isActive: boolean;
  isRecommended: boolean;
  supportedMethods: string[];
}

export const CONFIGURED_GATEWAYS: GatewayConfigItem[] = [
  {
    id: "gateway-g1",
    code: "G-1",
    name: "Gateway G-1",
    subtitle: "Primary Payment Gateway",
    vendorCode: "G-1",
    internalProviderRef: "BANKME",
    badge: "Active",
    badgeColor: "#10B981",
    iconText: "G-1",
    isActive: true,
    isRecommended: true,
    supportedMethods: ["CREDIT_CARD", "DEBIT_CARD", "UPI", "NET_BANKING"]
  },
  {
    id: "gateway-g2",
    code: "G-2",
    name: "Gateway G-2",
    subtitle: "Secondary Payment Gateway",
    vendorCode: "G-2",
    internalProviderRef: "EXISTING",
    badge: "Active",
    badgeColor: "#10B981",
    iconText: "G-2",
    isActive: true,
    isRecommended: false,
    supportedMethods: ["CREDIT_CARD", "DEBIT_CARD", "UPI", "NET_BANKING"]
  }
];

export function getCustomerGateway(gatewayIdOrCode?: string): GatewayConfigItem {
  if (!gatewayIdOrCode) return CONFIGURED_GATEWAYS[0];
  const cleaned = gatewayIdOrCode.trim().toUpperCase();
  const match = CONFIGURED_GATEWAYS.find(
    (g) =>
      g.id.toUpperCase() === cleaned ||
      g.code.toUpperCase() === cleaned ||
      g.vendorCode.toUpperCase() === cleaned ||
      g.internalProviderRef.toUpperCase() === cleaned
  );
  return match || CONFIGURED_GATEWAYS[0];
}

export function maskGatewayName(rawNameOrCode?: string): string {
  if (!rawNameOrCode) return "Gateway G-1";
  const upper = rawNameOrCode.toUpperCase();
  if (upper.includes("BANKME")) {
    return "Gateway G-1";
  }
  if (upper.includes("EXISTING")) {
    return "Gateway G-2";
  }
  return rawNameOrCode;
}
