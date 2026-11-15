"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Wallet,
  RefreshCw,
  ArrowLeft,
  ShieldCheck,
  Check,
  Lock,
  Phone,
  CreditCard,
  Info,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  AlertCircle,
  FileText,
  HelpCircle,
  Shield,
  Layers,
  Building2,
  ArrowRight,
  ExternalLink,
  Copy,
  Clock,
  Headphones,
  XCircle,
  CheckCircle,
  Home,
  Calendar,
  Percent,
  Receipt,
  PlusCircle,
  Coins,
  Zap,
  Briefcase
} from "lucide-react";
import apiClient from "@/lib/api";
import { useWalletSync } from "@/context/WalletSyncProvider";
import { SectionHeader } from "@/components/shared";
import { CONFIGURED_GATEWAYS, getCustomerGateway, maskGatewayName, GatewayConfigItem } from "@/lib/gateway-config";

// ─── INDIAN CURRENCY IN WORDS CONVERTER ───
function numberToIndianWords(num: number): string {
  if (!num || isNaN(num) || num <= 0) return "";
  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
  ];

  function convertBelowThousand(n: number): string {
    let str = "";
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n > 0) {
      if (n < 20) {
        str += ones[n] + " ";
      } else {
        str += tens[Math.floor(n / 10)] + " ";
        if (n % 10 > 0) {
          str += ones[n % 10] + " ";
        }
      }
    }
    return str.trim();
  }

  let remaining = integerPart;
  const crores = Math.floor(remaining / 10000000);
  remaining %= 10000000;
  const lakhs = Math.floor(remaining / 100000);
  remaining %= 100000;
  const thousands = Math.floor(remaining / 1000);
  remaining %= 1000;
  const hundreds = remaining;

  const parts: string[] = [];
  if (crores > 0) parts.push(convertBelowThousand(crores) + " Crore");
  if (lakhs > 0) parts.push(convertBelowThousand(lakhs) + " Lakh");
  if (thousands > 0) parts.push(convertBelowThousand(thousands) + " Thousand");
  if (hundreds > 0) parts.push(convertBelowThousand(hundreds));

  let result = "Rupees " + parts.join(" ").trim();
  if (decimalPart > 0) {
    result += " and " + convertBelowThousand(decimalPart) + " Paise";
  }
  result += " Only";
  return result;
}

// ─── GATEWAY DEFINITIONS (CENTRALIZED CUSTOMER MASKING STANDARD) ───
type GatewayOption = GatewayConfigItem;
const GATEWAYS: GatewayOption[] = CONFIGURED_GATEWAYS;

// ─── CARD TYPE DEFINITIONS (EXACTLY 5 SCHEMES) ───
interface CardSchemeItem {
  id: string;
  name: string;
  category: string;
  card_network: string;
  mdr_percent?: number | null;
  mdr_display: string;
  mdr_treatment?: string | null;
  is_configured: boolean;
  brand_color: string;
  icon_text: string;
  rule_ref_id?: number | null;
}

const DEFAULT_CARD_SCHEMES: CardSchemeItem[] = [
  {
    id: "visa",
    name: "Visa",
    category: "Consumer Debit / Credit",
    card_network: "VISA",
    mdr_percent: 2.62,
    mdr_display: "2.62%",
    mdr_treatment: "COLLECT_ADDITIONALLY",
    is_configured: true,
    brand_color: "#1A1F71",
    icon_text: "VISA"
  },
  {
    id: "mastercard",
    name: "MasterCard",
    category: "Consumer Debit / Credit",
    card_network: "MASTERCARD",
    mdr_percent: 2.62,
    mdr_display: "2.62%",
    mdr_treatment: "COLLECT_ADDITIONALLY",
    is_configured: true,
    brand_color: "#EB001B",
    icon_text: "MC"
  },
  {
    id: "rupay",
    name: "RuPay",
    category: "Domestic NPCI Network",
    card_network: "RUPAY",
    mdr_percent: 1.80,
    mdr_display: "1.80%",
    mdr_treatment: "DEDUCT_FROM_TOPUP",
    is_configured: true,
    brand_color: "#097939",
    icon_text: "RUPAY"
  },
  {
    id: "amex_diners",
    name: "AMEX / Diners",
    category: "Premium Card Schemes",
    card_network: "AMEX",
    mdr_percent: 3.10,
    mdr_display: "3.10%",
    mdr_treatment: "COLLECT_ADDITIONALLY",
    is_configured: true,
    brand_color: "#006FCF",
    icon_text: "AMEX"
  },
  {
    id: "business_corporate",
    name: "Business / Corporate",
    category: "Commercial & Purchasing",
    card_network: "CORP",
    mdr_percent: 3.40,
    mdr_display: "3.40%",
    mdr_treatment: "COLLECT_ADDITIONALLY",
    is_configured: true,
    brand_color: "#475569",
    icon_text: "CORP"
  }
];

// ─── DYNAMIC MDR PREVIEW FROM BACKEND ───
interface MdrPreviewData {
  txn_amount: number;
  mdr_pct: number;
  mdr_fixed: number;
  mdr_amount: number;
  tax_pct: number;
  tax_amount: number;
  total_charges: number;
  customer_payable: number;
  retailer_credit: number;
  company_mdr_liability: number;
  mdr_treatment: string;
  rule_ref_id?: number | null;
  vendor_name: string;
  customer_payable_policy?: string;
  policy_display_name?: string;
}

// ─── STRICT 120-SECOND PROCESSING TIMEOUT CONSTANTS ───
const TOTAL_TIMEOUT_SECONDS = 120; // Maximum waiting duration: 120 seconds (2 minutes)
const POLLING_INTERVAL_MS = 4000;  // 4 seconds status inquiry

// ─── PREMIUM GLASSMORPHISM & GRADIENT DESIGN SYSTEM CONSTANTS ───
const glassCardStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.78)",
  backdropFilter: "blur(14px) saturate(150%)",
  WebkitBackdropFilter: "blur(14px) saturate(150%)",
  border: "1px solid rgba(148, 163, 184, 0.28)",
  boxShadow: "0 8px 24px rgba(16, 42, 67, 0.06)"
};

const summaryGlassStyle: React.CSSProperties = {
  background: "var(--glass-summary-bg)",
  backdropFilter: "var(--glass-summary-blur)",
  WebkitBackdropFilter: "var(--glass-summary-blur)",
  border: "var(--glass-summary-border)",
  boxShadow: "var(--glass-summary-shadow)"
};

const pageBackgroundStyle: React.CSSProperties = {
  background: "var(--gradient-page-bg)"
};

// ─── TRANSACTION RECORD INTERFACE ───
interface ActiveTransaction {
  tid: string;
  paymentUrl: string;
  gateway: string;
  customerMobile: string;
  cardType: string;
  cardNetwork: string;
  topupAmount: number;
  mdrPercent: number;
  mdrAmount: number;
  taxAmount: number;
  customerPayable: number;
  expectedCredit: number;
  initiatedAt: string; // ISO string
  startTimestamp: number; // ms - Source of truth for timer
  status: "PENDING" | "SUCCESS" | "FAILED" | "TIMED_OUT" | "CANCELLED";
  failureReason?: string;
  utr?: string;
}

export default function RetailerPayinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { walletData, refreshWallet: syncWallet } = useWalletSync();

  // Workflow State: FORM | PROCESSING | SUCCESS | FAILED
  const [currentStep, setCurrentStep] = useState<"FORM" | "PROCESSING">("FORM");
  const [activeTxn, setActiveTxn] = useState<ActiveTransaction | null>(null);

  // Form State
  const [gateways, setGateways] = useState<GatewayOption[]>(CONFIGURED_GATEWAYS);
  const [selectedGatewayId, setSelectedGatewayId] = useState<string>("gateway-g1");
  const selectedGateway = useMemo(() => {
    return gateways.find((g) => g.id === selectedGatewayId) || gateways[0] || CONFIGURED_GATEWAYS[0];
  }, [gateways, selectedGatewayId]);

  // Supported Card Schemes with Admin-Configured MDR (Display Only)
  const [cardSchemes, setCardSchemes] = useState<CardSchemeItem[]>(DEFAULT_CARD_SCHEMES);
  const [isLoadingSchemes, setIsLoadingSchemes] = useState<boolean>(false);
  const [customerMobile, setCustomerMobile] = useState<string>("");
  const [topupAmount, setTopupAmount] = useState<string>("");
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(true);

  // Dynamic MDR Preview State (Automatic from Backend)
  const [mdrPreview, setMdrPreview] = useState<MdrPreviewData | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
  const [mdrError, setMdrError] = useState<string | null>(null);

  // Authoritative Admin Customer Payable Policy State (Retrieved from Backend)
  const [activePolicy, setActivePolicy] = useState<{
    policy: string;
    displayName: string;
    mdrTreatment: string;
  }>({
    policy: "WITH_MDR",
    displayName: "Customer Pays MDR Charges",
    mdrTreatment: "COLLECT_ADDITIONALLY"
  });

  // UI Interactive States
  const [isInitiating, setIsInitiating] = useState<boolean>(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false);
  const [isRefreshingWallet, setIsRefreshingWallet] = useState<boolean>(false);
  const [refreshMessage, setRefreshMessage] = useState<string>("");
  const [copiedTid, setCopiedTid] = useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(TOTAL_TIMEOUT_SECONDS);
  const isCheckingRef = useRef<boolean>(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState<boolean>(false);

  // Fallback balance display
  const liveBalance = useMemo(() => {
    if (typeof walletData?.wallet_balance === "number") {
      return walletData.wallet_balance.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
    return "12,500.00";
  }, [walletData]);

  // Handle wallet refresh
  const handleRefreshWallet = async () => {
    setIsRefreshingWallet(true);
    try {
      await syncWallet();
      setRefreshMessage("Wallet balance refreshed");
    } catch {
      setRefreshMessage("Balance updated");
    } finally {
      setTimeout(() => setIsRefreshingWallet(false), 500);
      setTimeout(() => setRefreshMessage(""), 2500);
    }
  };

  // Fetch Admin-configured card schemes MDR rates & active policy for the authenticated company
  useEffect(() => {
    let isCancelled = false;
    async function fetchCompanyPayinConfig() {
      setIsLoadingSchemes(true);
      try {
        // 0. Fetch Dynamic Gateways configured by Admin
        try {
          const gwRes = await apiClient.get("/api/v1/payin/gateways");
          if (!isCancelled && gwRes.data && gwRes.data.success && Array.isArray(gwRes.data.gateways) && gwRes.data.gateways.length > 0) {
            const dynamicList: GatewayOption[] = gwRes.data.gateways.map((g: any, index: number) => ({
              id: g.id || `gateway-${(g.code || 'g1').toLowerCase().replace(/[^a-z0-9]/g, '')}`,
              code: g.code || `G-${index + 1}`,
              name: g.name || `Gateway G-${index + 1}`,
              subtitle: g.description || (index === 0 ? "Primary Payment Gateway" : "Secondary Payment Gateway"),
              vendorCode: g.vendorCode || g.code || `G-${index + 1}`,
              internalProviderRef: g.internalVendorCode || (index === 0 ? "BANKME" : "EXISTING"),
              badge: "Active",
              badgeColor: "#10B981",
              iconText: g.code || `G-${index + 1}`,
              isActive: g.is_active ?? true,
              isRecommended: index === 0,
              supportedMethods: g.supported_methods || ["CREDIT_CARD", "DEBIT_CARD", "UPI", "NET_BANKING"]
            }));
            setGateways(dynamicList);
            if (!dynamicList.some(g => g.id === selectedGatewayId) && dynamicList.length > 0) {
              setSelectedGatewayId(dynamicList[0].id);
            }
          }
        } catch (gwErr) {
          console.warn("Could not load dynamic gateways, falling back to default:", gwErr);
        }

        // 1. Fetch Company PayIn Options (Authoritative Admin Policy)
        try {
          const optRes = await apiClient.get("/api/v1/payin/options");
          if (!isCancelled && optRes.data) {
            const polCode = optRes.data.customer_payable_policy || "WITH_MDR";
            const polName = optRes.data.policy_display_name || (polCode === "WITH_MDR" ? "Customer Pays MDR Charges" : "Retailer Bears MDR Charges");
            const polTreat = optRes.data.mdr_treatment || (polCode === "WITH_MDR" ? "COLLECT_ADDITIONALLY" : "DEDUCT_FROM_TOPUP");
            setActivePolicy({
              policy: polCode,
              displayName: polName,
              mdrTreatment: polTreat
            });
            if (Array.isArray(optRes.data.card_schemes) && optRes.data.card_schemes.length > 0) {
              setCardSchemes(optRes.data.card_schemes);
            }
          }
        } catch (optErr) {
          console.warn("Could not load PayIn options:", optErr);
        }

        // 2. Fetch specific Gateway Card Schemes
        const res = await apiClient.get(`/api/v1/payin/card-schemes?vendor_code=${encodeURIComponent(selectedGateway.vendorCode)}`);
        if (!isCancelled && Array.isArray(res.data) && res.data.length > 0) {
          setCardSchemes(res.data);
        }
      } catch (err) {
        console.error("Failed to load Admin card schemes MDR:", err);
      } finally {
        if (!isCancelled) setIsLoadingSchemes(false);
      }
    }
    fetchCompanyPayinConfig();
    return () => {
      isCancelled = true;
    };
  }, [selectedGateway.vendorCode]);

  // Mobile Validation
  const cleanMobile = customerMobile.trim();
  const isMobileValid = /^[6-9]\d{9}$/.test(cleanMobile);
  const mobileError =
    cleanMobile.length > 0 && cleanMobile.length !== 10
      ? "Enter a valid 10-digit Indian mobile number"
      : cleanMobile.length === 10 && !isMobileValid
      ? "Mobile number must start with 6, 7, 8, or 9"
      : "";

  // Numeric Top-up Amount Validation
  const numericAmount = parseFloat(topupAmount) || 0;
  const isAmountValid = topupAmount.trim().length > 0 && !isNaN(numericAmount) && numericAmount >= 100 && numericAmount <= 100000;
  const amountError =
    topupAmount.trim().length > 0 && numericAmount < 100
      ? "Minimum top-up amount is ₹100"
      : numericAmount > 100000
      ? "Maximum top-up amount is ₹1,00,000"
      : "";

  // Amount in words: generated only when a valid top-up amount is entered
  const amountInWords = useMemo(() => {
    if (!isAmountValid || !numericAmount || numericAmount <= 0) return "";
    return numberToIndianWords(numericAmount);
  }, [isAmountValid, numericAmount]);

  // Fetch dynamic MDR preview from backend API (Authoritative Admin Configuration)
  useEffect(() => {
    let isCancelled = false;

    if (!isAmountValid || numericAmount < 100) {
      setMdrPreview(null);
      setMdrError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoadingPreview(true);
      setMdrError(null);
      try {
        const res = await apiClient.post("/api/v1/payin/mdr/preview", {
          amount: numericAmount,
          service_type_code: "UTILITY",
          payment_mode_code: "CARD",
          vendor_code: selectedGateway.vendorCode
        });
        if (!isCancelled && res.data) {
          setMdrPreview(res.data);
          setMdrError(null);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error("MDR Preview calculation failed:", err);
          const detail =
            err.response?.data?.detail ||
            "No active MDR configuration found for this payment gateway. Please contact administrator.";
          setMdrError(detail);
          setMdrPreview(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingPreview(false);
        }
      }
    }, 200);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [numericAmount, isAmountValid, selectedGateway.vendorCode]);

  // Financial Calculations derived from backend MDR preview or baseline fallback
  const calculations = useMemo(() => {
    if (mdrPreview) {
      const ratePct = Math.round(mdrPreview.mdr_pct * 10000) / 100;
      const isWithMdr = mdrPreview.mdr_treatment === "COLLECT_ADDITIONALLY" || mdrPreview.customer_payable_policy === "WITH_MDR";
      const policyDisplayName = mdrPreview.policy_display_name || (isWithMdr ? "Customer Pays MDR Charges" : "Retailer Bears MDR Charges");
      return {
        topupAmount: mdrPreview.txn_amount,
        ratePercent: ratePct,
        rateDisplay: `${ratePct.toFixed(2)}%`,
        mdrAmount: mdrPreview.mdr_amount,
        taxAmount: mdrPreview.tax_amount,
        totalFee: mdrPreview.total_charges,
        customerPayable: mdrPreview.customer_payable,
        expectedCredit: mdrPreview.retailer_credit,
        expectedWalletCredit: mdrPreview.retailer_credit,
        mdrTreatment: mdrPreview.mdr_treatment,
        policyDisplayName,
        customerPayablePolicy: mdrPreview.customer_payable_policy || (isWithMdr ? "WITH_MDR" : "WITHOUT_MDR")
      };
    }

    // Default baseline while loading (Admin-configured default)
    const rate = 0.0262;
    const mdrAmount = Math.round(numericAmount * rate * 100) / 100;
    const taxAmount = Math.round(mdrAmount * 0.18 * 100) / 100;
    const totalFee = Math.round((mdrAmount + taxAmount) * 100) / 100;
    const isWithMdr = activePolicy.policy === "WITH_MDR" || activePolicy.mdrTreatment === "COLLECT_ADDITIONALLY";
    const customerPayable = isWithMdr ? Math.round((numericAmount + totalFee) * 100) / 100 : numericAmount;
    const expectedWalletCredit = isWithMdr ? numericAmount : Math.max(0, Math.round((numericAmount - totalFee) * 100) / 100);

    return {
      topupAmount: numericAmount,
      ratePercent: 2.62,
      rateDisplay: "2.62%",
      mdrAmount,
      taxAmount,
      totalFee,
      customerPayable,
      expectedCredit: expectedWalletCredit,
      expectedWalletCredit,
      mdrTreatment: activePolicy.mdrTreatment,
      policyDisplayName: activePolicy.displayName,
      customerPayablePolicy: activePolicy.policy
    };
  }, [numericAmount, mdrPreview, activePolicy]);

  // Check URL or Session for active transaction on page load
  useEffect(() => {
    const urlTid = searchParams.get("tid");

    // Pure /retailer/payin or direct navigation without TID:
    // ALWAYS render clean PayIn form with fresh inputs!
    if (!urlTid) {
      setCurrentStep("FORM");
      setActiveTxn(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("smspay_active_payin");
      }
      return;
    }

    // Processing route requested: /retailer/payin?step=processing&tid=... or ?tid=...
    const stored =
      typeof window !== "undefined"
        ? sessionStorage.getItem(`smspay_active_payin_${urlTid}`) || sessionStorage.getItem("smspay_active_payin")
        : null;

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ActiveTransaction;
        if (parsed && parsed.tid === urlTid) {
          const nowMs = Date.now();
          const elapsed = Math.floor((nowMs - parsed.startTimestamp) / 1000);
          const remaining = Math.max(0, TOTAL_TIMEOUT_SECONDS - elapsed);

          if (parsed.status === "PENDING") {
            if (remaining <= 0) {
              // Strict 120s timeout reached: transition to TIMED_OUT immediately
              const timedOutTxn: ActiveTransaction = { ...parsed, status: "TIMED_OUT" };
              setActiveTxn(timedOutTxn);
              setRemainingSeconds(0);
              setCurrentStep("PROCESSING");
              sessionStorage.setItem("smspay_active_payin", JSON.stringify(timedOutTxn));
              sessionStorage.setItem(`smspay_active_payin_${urlTid}`, JSON.stringify(timedOutTxn));
              localStorage.removeItem("smspay_active_payin");
              sessionStorage.setItem("p2p_payin_timeout_tid", timedOutTxn.tid);
              return;
            } else {
              // Resume countdown with authoritative remaining seconds
              setActiveTxn(parsed);
              setRemainingSeconds(remaining);
              setCurrentStep("PROCESSING");

              // Sync authoritative status with backend in background
              apiClient.get(`/api/v1/payin/${urlTid}/status`).then((res) => {
                const remoteStatus = (res.data?.status || "PENDING").toUpperCase();
                if (remoteStatus === "SUCCESS" || remoteStatus === "SETTLED") {
                  const updated: ActiveTransaction = {
                    ...parsed,
                    status: "SUCCESS",
                    utr: res.data.provider_reference || res.data.utr || "UTR-" + Date.now().toString().slice(-6)
                  };
                  setActiveTxn(updated);
                  sessionStorage.setItem("smspay_active_payin", JSON.stringify(updated));
                  sessionStorage.setItem(`smspay_active_payin_${urlTid}`, JSON.stringify(updated));
                } else if (remoteStatus === "FAILED" || remoteStatus === "EXPIRED") {
                  const updated: ActiveTransaction = {
                    ...parsed,
                    status: "FAILED",
                    failureReason: res.data.error_message || "Payment was declined by cardholder or bank."
                  };
                  setActiveTxn(updated);
                  sessionStorage.setItem("smspay_active_payin", JSON.stringify(updated));
                  sessionStorage.setItem(`smspay_active_payin_${urlTid}`, JSON.stringify(updated));
                }
              }).catch((e) => {
                console.warn("Background status sync notice:", e?.message);
              });
              return;
            }
          } else {
            // Already final state: SUCCESS, FAILED, or TIMED_OUT
            setActiveTxn(parsed);
            setRemainingSeconds(0);
            setCurrentStep("PROCESSING");
            return;
          }
        }
      } catch (e) {
        console.warn("Failed to parse stored payin session", e);
      }
    }

    // If not in sessionStorage, inquire backend directly (company data isolation enforced by backend)
    let isMounted = true;
    apiClient.get(`/api/v1/payin/${urlTid}/status`)
      .then((res) => {
        if (!isMounted) return;
        const data = res.data;
        const nowMs = Date.now();
        const createdMs = data.created_at ? new Date(data.created_at).getTime() : nowMs;
        const elapsed = Math.floor((nowMs - createdMs) / 1000);
        const remaining = Math.max(0, TOTAL_TIMEOUT_SECONDS - elapsed);
        const remoteStatus = (data.status || "PENDING").toUpperCase();

        const finalStatus: ActiveTransaction["status"] =
          remoteStatus === "SUCCESS" || remoteStatus === "SETTLED"
            ? "SUCCESS"
            : remoteStatus === "FAILED" || remoteStatus === "EXPIRED"
            ? "FAILED"
            : remaining <= 0
            ? "TIMED_OUT"
            : "PENDING";

        const restoredTxn: ActiveTransaction = {
          tid: data.tid || urlTid,
          paymentUrl: data.payment_url || "",
          gateway: maskGatewayName(data.provider || data.vendor_code),
          customerMobile: data.customer_mobile || "—",
          cardType: data.payment_mode || "Card Payment",
          cardNetwork: "AUTO",
          topupAmount: Number(data.amount) || 0,
          mdrPercent: Number(data.mdr_rate) || 2.62,
          mdrAmount: Number(data.mdr_amount) || 0,
          taxAmount: Number(data.tax_amount) || 0,
          customerPayable: Number(data.customer_payable) || Number(data.amount) || 0,
          expectedCredit: Number(data.expected_credit) || Number(data.amount) || 0,
          initiatedAt: data.created_at
            ? new Date(data.created_at).toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true
              })
            : new Date().toLocaleString("en-IN"),
          startTimestamp: createdMs,
          status: finalStatus,
          utr: data.provider_reference || data.utr,
          failureReason: data.error_message
        };

        setActiveTxn(restoredTxn);
        setRemainingSeconds(finalStatus === "PENDING" ? remaining : 0);
        setCurrentStep("PROCESSING");
        sessionStorage.setItem("smspay_active_payin", JSON.stringify(restoredTxn));
        sessionStorage.setItem(`smspay_active_payin_${urlTid}`, JSON.stringify(restoredTxn));
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn("Invalid, expired, or unauthorized TID for authenticated company:", err?.message);
        router.replace("/retailer/payin");
        setCurrentStep("FORM");
        setActiveTxn(null);
      });

    return () => {
      isMounted = false;
    };
  }, [searchParams, router]);

  // ── STRICT 120-SECOND COUNTDOWN TICKER ──
  useEffect(() => {
    if (currentStep !== "PROCESSING" || !activeTxn || activeTxn.status !== "PENDING") {
      return;
    }

    const timer = setInterval(() => {
      const nowMs = Date.now();
      const elapsed = Math.floor((nowMs - activeTxn.startTimestamp) / 1000);
      const remaining = Math.max(0, TOTAL_TIMEOUT_SECONDS - elapsed);

      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        // Authoritative 120s timeout triggered!
        const timedOutTxn: ActiveTransaction = {
          ...activeTxn,
          status: "TIMED_OUT"
        };
        setActiveTxn(timedOutTxn);
        setRemainingSeconds(0);
        sessionStorage.setItem("smspay_active_payin", JSON.stringify(timedOutTxn));
        sessionStorage.setItem(`smspay_active_payin_${activeTxn.tid}`, JSON.stringify(timedOutTxn));
        localStorage.removeItem("smspay_active_payin");
        sessionStorage.setItem("p2p_payin_timeout_tid", activeTxn.tid);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentStep, activeTxn]);

  // Format Countdown into MM:SS format (e.g. 02:00, 01:59, 00:45)
  const formattedCountdown = useMemo(() => {
    const clamped = Math.max(0, remainingSeconds);
    const mins = Math.floor(clamped / 60);
    const secs = clamped % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, [remainingSeconds]);

  // Reset workflow and state for a fresh transaction
  const handleCreateNewTransaction = useCallback(() => {
    sessionStorage.removeItem("smspay_active_payin");
    if (activeTxn?.tid) {
      sessionStorage.removeItem(`smspay_active_payin_${activeTxn.tid}`);
    }
    localStorage.removeItem("smspay_active_payin");
    sessionStorage.removeItem("p2p_payin_timeout_tid");
    setActiveTxn(null);
    setCustomerMobile("");
    setTopupAmount("");
    setMdrPreview(null);
    setMdrError(null);
    setSelectedGatewayId("gateway-g1");
    setCurrentStep("FORM");
    router.replace("/retailer/payin");
  }, [router, activeTxn]);

  // ── STATUS POLLING AND MANUAL STATUS CHECK ──
  const checkStatus = useCallback(async (isManual: boolean = false) => {
    if (!activeTxn || !activeTxn.tid || activeTxn.status !== "PENDING") return;
    if (isCheckingRef.current) return; // Guard against overlapping API requests

    isCheckingRef.current = true;
    if (isManual) {
      setIsCheckingStatus(true);
    }

    try {
      const res = await apiClient.get(`/api/v1/payin/${activeTxn.tid}/status`);
      const data = res.data;
      const remoteStatus = (data.status || "PENDING").toUpperCase();

      if (remoteStatus === "SUCCESS" || remoteStatus === "SETTLED") {
        const updated: ActiveTransaction = {
          ...activeTxn,
          status: "SUCCESS",
          utr: data.provider_reference || data.utr || "UTR-" + Date.now().toString().slice(-6)
        };
        setActiveTxn(updated);
        sessionStorage.setItem("smspay_active_payin", JSON.stringify(updated));
        sessionStorage.setItem(`smspay_active_payin_${activeTxn.tid}`, JSON.stringify(updated));
        localStorage.removeItem("smspay_active_payin");
        // Note: Wallet balance update is strictly manual only — do NOT trigger automatic API requests
      } else if (remoteStatus === "FAILED" || remoteStatus === "EXPIRED") {
        const updated: ActiveTransaction = {
          ...activeTxn,
          status: "FAILED",
          failureReason: data.error_message || "Payment was declined by cardholder or bank."
        };
        setActiveTxn(updated);
        sessionStorage.setItem("smspay_active_payin", JSON.stringify(updated));
        sessionStorage.setItem(`smspay_active_payin_${activeTxn.tid}`, JSON.stringify(updated));
        localStorage.removeItem("smspay_active_payin");
      }
      // If remoteStatus is PENDING, keep checking until 120s limit. Do not fail transaction.
    } catch (err: any) {
      // Graceful network error handling: do NOT mark transaction failed
      console.warn("Status check notice:", err?.message);
    } finally {
      isCheckingRef.current = false;
      if (isManual) {
        setTimeout(() => setIsCheckingStatus(false), 500);
      }
    }
  }, [activeTxn]);

  // Automated Status Polling Interval (every 4 seconds during the 120s window)
  useEffect(() => {
    if (currentStep !== "PROCESSING" || !activeTxn || activeTxn.status !== "PENDING" || remainingSeconds <= 0) {
      return;
    }

    const interval = setInterval(() => {
      checkStatus(false);
    }, POLLING_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [currentStep, activeTxn, remainingSeconds, checkStatus]);

  // Copy TID to clipboard
  const handleCopyTid = () => {
    if (!activeTxn?.tid) return;
    navigator.clipboard.writeText(activeTxn.tid);
    setCopiedTid(true);
    setTimeout(() => setCopiedTid(false), 2000);
  };

  // Re-open Payment Tab if blocked or closed
  const handleReopenPaymentTab = () => {
    if (activeTxn?.paymentUrl) {
      window.open(activeTxn.paymentUrl, "_blank", "noopener,noreferrer");
    }
  };

  // ── INITIATE PAYMENT WORKFLOW ──
  const handleContinueToPayment = async () => {
    if (!isMobileValid || !isAmountValid || !acceptedTerms || isInitiating || !!mdrError) {
      return;
    }

    // 1. Open blank tab SYNCHRONOUSLY inside user gesture to avoid popup blocker!
    const newTab = typeof window !== "undefined" ? window.open("about:blank", "_blank") : null;

    setIsInitiating(true);

    try {
      const nowMs = Date.now();
      const uniqueRef = `REF-${nowMs}-${Math.floor(Math.random() * 1000)}`;

      // 2. Call backend PayIn initiation API (Authoritative Admin Configuration)
      const reqPayload = {
        amount: calculations.topupAmount,
        customer_name: "Sathus Retailer 3",
        customer_mobile: cleanMobile,
        reference_id: uniqueRef,
        payment_mode: "CARD",
        payment_mode_code: "CARD",
        vendor_code: selectedGateway.vendorCode,
        note: "SMSPAY Retailer PayIn Top-Up"
      };

      const res = await apiClient.post("/api/v1/payin/collect", reqPayload);
      const data = res.data;

      if (!data.success || !data.payment_url) {
        if (newTab) newTab.close();
        setMdrError(data.message || "Failed to initialize payment gateway order.");
        setIsInitiating(false);
        return;
      }

      const generatedTid = data.tid;
      const finalPaymentUrl = data.payment_url;

      // 3. Navigate the opened tab to real payment URL
      if (newTab) {
        try {
          newTab.location.href = finalPaymentUrl;
        } catch {
          // Fallback if blocked
          window.open(finalPaymentUrl, "_blank", "noopener,noreferrer");
        }
      }

      // 4. Construct Active Transaction record
      const initiatedAtStr = new Date(nowMs).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });

      const newTxnRecord: ActiveTransaction = {
        tid: generatedTid,
        paymentUrl: finalPaymentUrl,
        gateway: selectedGateway.name,
        customerMobile: cleanMobile,
        cardType: "Card Payment (Provider Identified)",
        cardNetwork: "AUTO",
        topupAmount: calculations.topupAmount,
        mdrPercent: calculations.ratePercent,
        mdrAmount: calculations.mdrAmount,
        taxAmount: calculations.taxAmount,
        customerPayable: calculations.customerPayable,
        expectedCredit: calculations.expectedWalletCredit,
        initiatedAt: initiatedAtStr,
        startTimestamp: nowMs,
        status: "PENDING"
      };

      setActiveTxn(newTxnRecord);
      setRemainingSeconds(TOTAL_TIMEOUT_SECONDS);
      sessionStorage.setItem("smspay_active_payin", JSON.stringify(newTxnRecord));
      sessionStorage.setItem(`smspay_active_payin_${generatedTid}`, JSON.stringify(newTxnRecord));
      localStorage.removeItem("smspay_active_payin");
      setCurrentStep("PROCESSING");
      router.push(`/retailer/payin?step=processing&tid=${generatedTid}`);
    } catch (err: any) {
      console.error("PayIn initiation failed:", err);
      // Close opened tab if initiation failed
      if (newTab) {
        newTab.close();
      }
      alert(err.response?.data?.detail || "Failed to initiate PayIn session. Please retry.");
    } finally {
      setIsInitiating(false);
    }
  };

  // Cancel Transaction handler
  const handleCancelTransaction = () => {
    if (!activeTxn) return;
    const confirmCancel = window.confirm("Are you sure you want to cancel this pending payment session?");
    if (confirmCancel) {
      sessionStorage.removeItem("smspay_active_payin");
      if (activeTxn.tid) {
        sessionStorage.removeItem(`smspay_active_payin_${activeTxn.tid}`);
      }
      localStorage.removeItem("smspay_active_payin");
      sessionStorage.removeItem("p2p_payin_timeout_tid");
      setActiveTxn(null);
      setCurrentStep("FORM");
      router.replace("/retailer/payin");
    }
  };

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER: STEP 2 – PAYMENT PROCESSING SCREEN (EXACT REFERENCE IMAGE MATCH)
  // ═════════════════════════════════════════════════════════════════════════
  if (currentStep === "PROCESSING" && activeTxn) {
    return (
      <div 
        className="w-full min-h-[calc(100vh-64px)] pb-28 lg:pb-12 text-[var(--color-primary-navy)] transition-colors"
        style={pageBackgroundStyle}
      >
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 space-y-4 animate-fadeIn">
        
        {/* ── TOP BREADCRUMBS: Home / PayIn / Payment Processing ── */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link href="/retailer/dashboard" className="hover:text-slate-800 transition-colors flex items-center">
            <Home className="w-3.5 h-3.5" />
          </Link>
          <span className="text-slate-300">/</span>
          <button
            onClick={() => {
              if (window.confirm("Return to PayIn form? Pending session will remain tracked.")) {
                setCurrentStep("FORM");
                router.push("/retailer/payin");
              }
            }}
            className="hover:text-slate-800 transition-colors cursor-pointer"
          >
            PayIn
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-bold">Payment Processing</span>
        </div>

        {/* ── MAIN HEADER & WALLET BALANCE ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              onClick={() => {
                if (window.confirm("Return to PayIn form? Current session will remain active.")) {
                  setCurrentStep("FORM");
                  router.push("/retailer/payin");
                }
              }}
              title="Back"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors mt-0.5 flex-shrink-0"
              aria-label="Back to PayIn form"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Payment Processing
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Your payment session has been initiated. Please complete the payment in the other browser tab.
              </p>
            </div>
          </div>

          {/* Upper-Right Wallet Balance Card */}
          <div className="relative group self-start md:self-auto min-w-[260px]">
            <div
              className="flex items-center justify-between p-3.5 rounded-xl border border-emerald-200/90 shadow-xs transition-all duration-300"
              style={{
                background: "linear-gradient(135deg, rgba(236, 253, 245, 0.95) 0%, rgba(209, 250, 229, 0.85) 100%)",
                backdropFilter: "blur(10px)"
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-emerald-800">
                    Wallet Balance
                  </span>
                  <span className="text-lg font-black text-emerald-950 font-mono tracking-tight">
                    ₹{liveBalance}
                  </span>
                </div>
              </div>

              <button
                onClick={handleRefreshWallet}
                title="Refresh Wallet Balance"
                disabled={isRefreshingWallet}
                className="p-1.5 rounded-lg text-emerald-800 hover:bg-emerald-200/60 transition-colors"
                aria-label="Refresh wallet"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshingWallet ? "animate-spin text-emerald-900" : ""}`} />
              </button>
            </div>
            {refreshMessage && (
              <div className="absolute right-0 top-full mt-1.5 z-20 px-3 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-lg shadow-lg flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                {refreshMessage}
              </div>
            )}
          </div>
        </div>

        {/* ── TWO-COLUMN WORKSPACE: LEFT (7 COLS) + RIGHT (5 COLS) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          
          {/* ═════════════════════════════════════════════════════════════════
              LEFT COLUMN: PROCESSING CARD, BANNER, DETAILS & ACTIONS
          ═════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 space-y-3.5">

            {/* 1. CENTRAL PAYMENT STATUS CARD */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 text-center sm:text-left">
              
              {/* Left: Illustration or Status Icon */}
              {activeTxn.status === "SUCCESS" ? (
                <div className="w-44 h-32 flex items-center justify-center flex-shrink-0">
                  <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center ring-8 ring-emerald-50">
                    <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                  </div>
                </div>
              ) : activeTxn.status === "FAILED" ? (
                <div className="w-44 h-32 flex items-center justify-center flex-shrink-0">
                  <div className="w-20 h-20 rounded-full bg-red-100 text-red-600 flex items-center justify-center ring-8 ring-red-50">
                    <XCircle className="w-12 h-12 text-red-600" />
                  </div>
                </div>
              ) : activeTxn.status === "TIMED_OUT" ? (
                <div className="w-44 h-32 flex items-center justify-center flex-shrink-0">
                  <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center ring-8 ring-amber-50">
                    <Clock className="w-12 h-12 text-amber-600 animate-pulse" />
                  </div>
                </div>
              ) : (
                /* Default PENDING: Fintech Payment Illustration */
                <div className="w-44 h-32 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 200 150" className="w-full h-full drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Soft Background Cloud/Bubble */}
                    <circle cx="100" cy="75" r="60" fill="#EFF6FF" />
                    <circle cx="150" cy="40" r="14" fill="#DBEAFE" />
                    <circle cx="45" cy="110" r="10" fill="#FEF3C7" />

                    {/* Laptop Base */}
                    <rect x="35" y="105" width="130" height="8" rx="4" fill="#CBD5E1" />
                    <path d="M45 105 L155 105 L145 45 L55 45 Z" fill="#3B82F6" />
                    <rect x="58" y="48" width="84" height="52" rx="2" fill="#FFFFFF" />

                    {/* Card on Screen */}
                    <rect x="66" y="56" width="68" height="38" rx="4" fill="#2563EB" />
                    <rect x="66" y="64" width="68" height="6" fill="#1E40AF" />
                    <rect x="72" y="76" width="16" height="10" rx="2" fill="#FDE047" />
                    
                    {/* Verified Check Badge on Card */}
                    <circle cx="118" cy="76" r="8" fill="#10B981" />
                    <path d="M115 76 L117 78 L122 73" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Gold Coins Stack Beside Laptop */}
                    <ellipse cx="45" cy="100" rx="14" ry="5" fill="#F59E0B" />
                    <rect x="31" y="94" width="28" height="6" fill="#FBBF24" />
                    <ellipse cx="45" cy="94" rx="14" ry="5" fill="#FDE047" />
                    <rect x="31" y="88" width="28" height="6" fill="#FBBF24" />
                    <ellipse cx="45" cy="88" rx="14" ry="5" fill="#FDE047" />
                    <rect x="31" y="82" width="28" height="6" fill="#FBBF24" />
                    <ellipse cx="45" cy="82" rx="14" ry="5" fill="#FDE047" />

                    {/* Right small coin stack */}
                    <ellipse cx="165" cy="104" rx="10" ry="4" fill="#F59E0B" />
                    <rect x="155" y="99" width="20" height="5" fill="#FBBF24" />
                    <ellipse cx="165" cy="99" rx="10" ry="4" fill="#FDE047" />
                  </svg>
                </div>
              )}

              {/* Right: Status Indicator, Heading, Badge & Countdown Timer (Centered as in reference) */}
              <div className="flex flex-col items-center justify-center text-center space-y-2">
                {activeTxn.status === "PENDING" && (
                  /* Circular Countdown Ring with Gradient */
                  <div className="relative w-16 h-16 sm:w-18 sm:h-18 flex items-center justify-center">
                    <svg className="w-16 h-16 sm:w-18 sm:h-18 transform -rotate-90" viewBox="0 0 64 64">
                      <circle
                        cx="32"
                        cy="32"
                        r="25"
                        stroke="#E2E8F0"
                        strokeWidth="5.5"
                        fill="none"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="25"
                        stroke="url(#spinnerBlueGrad)"
                        strokeWidth="5.5"
                        strokeDasharray="157"
                        strokeDashoffset={157 - (157 * Math.max(0, remainingSeconds)) / TOTAL_TIMEOUT_SECONDS}
                        strokeLinecap="round"
                        fill="none"
                        className="origin-center transition-all duration-1000 ease-linear"
                      />
                      <defs>
                        <linearGradient id="spinnerBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#38BDF8" />
                          <stop offset="100%" stopColor="#2563EB" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                )}

                <div className="space-y-1">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    {activeTxn.status === "SUCCESS"
                      ? "Payment Successful!"
                      : activeTxn.status === "FAILED"
                      ? "Payment Failed"
                      : activeTxn.status === "TIMED_OUT"
                      ? "Payment Verification Timed Out"
                      : "Payment Processing"}
                  </h2>
                  <div className="flex items-center justify-center">
                    <span
                      className={`inline-flex items-center px-3.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border ${
                        activeTxn.status === "SUCCESS"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : activeTxn.status === "FAILED"
                          ? "bg-red-100 text-red-800 border-red-300"
                          : activeTxn.status === "TIMED_OUT"
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : "bg-amber-100 text-amber-800 border-amber-300"
                      }`}
                    >
                      {activeTxn.status}
                    </span>
                  </div>
                </div>

                {/* Timer / Result Display */}
                <div className="pt-0.5">
                  {activeTxn.status === "PENDING" ? (
                    <>
                      <span className="block text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                        {formattedCountdown}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400 tracking-wide block">
                        Elapsed Time
                      </span>
                    </>
                  ) : activeTxn.status === "TIMED_OUT" ? (
                    <>
                      <span className="block text-2xl sm:text-3xl font-black text-amber-700 font-mono tracking-tight">
                        00:00
                      </span>
                      <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">
                        120s Timeout Reached
                      </span>
                    </>
                  ) : activeTxn.status === "SUCCESS" ? (
                    <>
                      <span className="block text-2xl sm:text-3xl font-black text-emerald-700 font-mono tracking-tight">
                        ₹{activeTxn.expectedCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
                        Wallet Balance Credited
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="block text-lg font-black text-red-700 tracking-tight">
                        Transaction Declined
                      </span>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        No Wallet Debit
                      </span>
                    </>
                  )}
                </div>
              </div>

            </div>

            {/* 2. CONTEXTUAL NOTIFICATION BANNER ACCORDING TO SESSION STATUS */}
            {activeTxn.status === "TIMED_OUT" ? (
              /* 120-SECOND TIMEOUT NOTIFICATION BANNER */
              <div className="bg-amber-50/90 border-2 border-amber-300 rounded-xl p-4 sm:p-5 flex flex-col gap-3 shadow-xs animate-fadeIn">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-sm sm:text-base font-black text-amber-950 leading-snug">
                      Payment verification is taking longer than expected. Your transaction status is not yet confirmed. Please check your transaction history before creating another payment.
                    </h3>
                    <p className="text-xs text-amber-800 font-medium leading-relaxed">
                      Your transaction is NOT automatically failed. It remains pending until the bank confirms the final status. If money was debited, the transaction will be reconciled and wallet credit will be processed according to verified payment status.
                    </p>
                  </div>
                </div>
              </div>
            ) : activeTxn.status === "SUCCESS" ? (
              /* SUCCESS RECEIPT BANNER */
              <div className="bg-emerald-50/90 border-2 border-emerald-300 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-emerald-950">
                      Payment Received & Wallet Credited!
                    </h3>
                    <p className="text-xs text-emerald-800 font-medium">
                      ₹{activeTxn.expectedCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })} has been added to your wallet balance. UTR: {activeTxn.utr || "CONFIRMED"}.
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black self-start sm:self-auto">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  Wallet Updated
                </span>
              </div>
            ) : activeTxn.status === "FAILED" ? (
              /* FAILURE BANNER */
              <div className="bg-red-50/90 border-2 border-red-300 rounded-xl p-4 sm:p-5 flex items-start gap-3 shadow-xs animate-fadeIn">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-red-950">
                    Payment Declined
                  </h3>
                  <p className="text-xs text-red-800 font-medium">
                    {activeTxn.failureReason || "Payment was declined by cardholder or bank."}
                  </p>
                </div>
              </div>
            ) : (
              /* DEFAULT PENDING PAYMENT TAB OPENED BANNER */
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                      A new tab has been opened for your payment with {maskGatewayName(activeTxn?.gateway || selectedGateway.name)}.
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Complete the payment in that tab. You can check the status here anytime.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReopenPaymentTab}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto flex-shrink-0"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  <span>Payment Tab Opened</span>
                </button>
              </div>
            )}

            {/* 3. TRANSACTION DETAILS CARD (TWO COLUMNS) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-black text-slate-900">
                  Transaction Details
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-xs sm:text-sm">
                
                {/* ── LEFT COLUMN ── */}
                <div className="space-y-3">
                  {/* TID with copy icon */}
                  <div className="flex items-center justify-between text-slate-600 gap-2">
                    <span className="flex items-center gap-1.5 text-slate-500 whitespace-nowrap text-xs">
                      <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      TID (Transaction ID)
                    </span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm tracking-tight">
                        {activeTxn.tid}
                      </span>
                      <button
                        onClick={handleCopyTid}
                        title="Copy TID"
                        className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {copiedTid && (
                        <span className="text-[10px] text-emerald-600 font-bold flex-shrink-0">Copied!</span>
                      )}
                    </div>
                  </div>

                  {/* Payment Gateway */}
                  <div className="flex items-center justify-between text-slate-600 gap-2">
                    <span className="flex items-center gap-1.5 text-slate-500 whitespace-nowrap text-xs">
                      <Layers className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      Payment Gateway
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-6 h-4 rounded bg-blue-600 text-white font-black text-[9px] flex items-center justify-center">
                        {maskGatewayName(activeTxn.gateway).includes("G-2") ? "G-2" : "G-1"}
                      </span>
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">{maskGatewayName(activeTxn.gateway || selectedGateway.name)}</span>
                    </div>
                  </div>

                  {/* Customer Mobile */}
                  <div className="flex items-center justify-between text-slate-600 gap-2">
                    <span className="flex items-center gap-1.5 text-slate-500 whitespace-nowrap text-xs">
                      <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      Customer Mobile Number
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                      {activeTxn.customerMobile}
                    </span>
                  </div>

                  {/* Card Type */}
                  <div className="flex items-center justify-between text-slate-600 gap-2">
                    <span className="flex items-center gap-1.5 text-slate-500 whitespace-nowrap text-xs">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      Card Type
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-[#1A1F71] text-white">
                        {activeTxn.cardNetwork || "VISA"}
                      </span>
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">{activeTxn.cardType}</span>
                    </div>
                  </div>

                  {/* Top-up Amount */}
                  <div className="flex items-center justify-between text-slate-600 gap-2">
                    <span className="flex items-center gap-1.5 text-slate-500 whitespace-nowrap text-xs">
                      <span className="font-bold text-slate-400">₹</span>
                      Top-up Amount
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                      ₹{activeTxn.topupAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* ── RIGHT COLUMN ── */}
                <div className="space-y-3">
                  {/* MDR Percentage */}
                  <div className="flex items-center justify-between text-slate-600 gap-2">
                    <span className="flex items-center gap-1.5 text-slate-500 whitespace-nowrap text-xs">
                      <Percent className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      MDR ({activeTxn.mdrPercent}%)
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                      ₹{activeTxn.mdrAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Applicable Tax */}
                  <div className="flex items-center justify-between text-slate-600 gap-2">
                    <span className="flex items-center gap-1.5 text-slate-500 whitespace-nowrap text-xs">
                      <Receipt className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      Applicable Tax (18% on MDR)
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                      ₹{activeTxn.taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Customer Payable Amount (Highlighted Light Blue Row) */}
                  <div className="flex items-center justify-between bg-blue-50/80 border border-blue-200/90 rounded-xl px-3 py-1.5 gap-2">
                    <span className="flex items-center gap-1.5 text-blue-950 font-bold text-xs">
                      <Wallet className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                      <span>Customer Payable Amount</span>
                    </span>
                    <span className="font-mono font-black text-blue-600 text-xs sm:text-sm flex-shrink-0">
                      ₹{activeTxn.customerPayable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Expected Wallet Credit (Highlighted Light Green Row) */}
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200/90 rounded-xl px-3 py-1.5 gap-2">
                    <span className="flex items-center gap-1.5 text-emerald-950 font-bold text-xs">
                      <Wallet className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span>Expected Wallet Credit</span>
                    </span>
                    <span className="font-mono font-black text-emerald-700 text-xs sm:text-sm flex-shrink-0">
                      ₹{activeTxn.expectedCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Initiated On Timestamp */}
                  <div className="flex items-center justify-between text-slate-600 pt-0.5 gap-2">
                    <span className="flex items-center gap-1.5 text-slate-500 whitespace-nowrap text-xs">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      Initiated On
                    </span>
                    <span className="text-[11px] font-semibold text-slate-700 truncate">
                      {activeTxn.initiatedAt}
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* 4. CONTEXTUAL ACTION BUTTONS */}
            {activeTxn.status === "TIMED_OUT" ? (
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleCreateNewTransaction}
                  className="w-full sm:flex-1 py-3 px-6 rounded-xl font-bold text-sm text-white bg-[#1D4ED8] hover:bg-[#1E40AF] active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-700/25 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create New Transaction</span>
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/retailer/transactions")}
                  className="w-full sm:w-auto py-3 px-6 rounded-xl font-bold text-sm text-[#1E293B] bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <FileText className="w-4 h-4 text-[#64748B]" />
                  <span>View Transaction History</span>
                </button>
              </div>
            ) : activeTxn.status === "SUCCESS" ? (
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => router.push("/retailer/dashboard")}
                  className="w-full sm:flex-1 py-3 px-6 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  <Home className="w-4 h-4" />
                  <span>Go to Dashboard</span>
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/retailer/transactions")}
                  className="w-full sm:w-auto py-3 px-6 rounded-xl font-bold text-sm text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>View in Transactions</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.removeItem("smspay_active_payin");
                    if (activeTxn?.tid) {
                      sessionStorage.removeItem(`smspay_active_payin_${activeTxn.tid}`);
                    }
                    localStorage.removeItem("smspay_active_payin");
                    setActiveTxn(null);
                    setCurrentStep("FORM");
                    router.replace("/retailer/payin");
                  }}
                  className="w-full sm:w-auto py-3 px-6 rounded-xl font-bold text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Add More Money</span>
                </button>
              </div>
            ) : activeTxn.status === "FAILED" ? (
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.removeItem("smspay_active_payin");
                    if (activeTxn?.tid) {
                      sessionStorage.removeItem(`smspay_active_payin_${activeTxn.tid}`);
                    }
                    localStorage.removeItem("smspay_active_payin");
                    setActiveTxn(null);
                    setCurrentStep("FORM");
                    router.replace("/retailer/payin");
                  }}
                  className="w-full sm:flex-1 py-3 px-6 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Retry Payment</span>
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/retailer/dashboard")}
                  className="w-full sm:w-auto py-3 px-6 rounded-xl font-bold text-sm text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Home className="w-4 h-4 text-slate-500" />
                  <span>Back to Dashboard</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => checkStatus(true)}
                  disabled={isCheckingStatus}
                  className="w-full sm:flex-1 py-3 px-6 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-75"
                >
                  <RefreshCw className={`w-4 h-4 ${isCheckingStatus ? "animate-spin" : ""}`} />
                  <span>{isCheckingStatus ? "Checking Status..." : "Check Payment Status"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCancelTransaction}
                  className="w-full sm:w-auto py-3 px-6 rounded-xl font-bold text-sm text-red-600 bg-white border border-red-300 hover:bg-red-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span>Cancel Transaction</span>
                </button>
              </div>
            )}

            {/* 5. BOTTOM INFORMATIONAL NOTICE */}
            <div className="flex items-center gap-2 pt-1 text-xs text-slate-500 font-medium">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>
                {activeTxn.status === "TIMED_OUT"
                  ? "Your transaction has not been cancelled. You can verify the final payment status anytime from your Transaction History."
                  : activeTxn.status === "SUCCESS"
                  ? "Transaction completed. The credited balance is immediately available for business transactions."
                  : activeTxn.status === "FAILED"
                  ? "If any amount was debited from your card, it will be refunded to the source account according to standard banking timelines."
                  : 'The status will be updated automatically. You can also click "Check Payment Status" to get the latest status.'}
              </span>
            </div>

            {/* TAB ANNOTATION INDICATOR */}
            <div className="pt-2 flex items-center justify-between text-xs">
              <span className="px-3.5 py-1.5 rounded-lg bg-white font-bold text-xs text-slate-700 border border-slate-300 shadow-xs">
                Original Tab (SMSPAY)
              </span>
              <button
                onClick={handleReopenPaymentTab}
                className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Switch to Payment Tab</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

          {/* ═════════════════════════════════════════════════════════════════
              RIGHT COLUMN: PAYMENT STATUS TIMELINE & NEED HELP CARD & MOCKUP
          ═════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-4">

            {/* 1. PAYMENT STATUS TIMELINE */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                <Clock className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-black text-slate-900">
                  Payment Status
                </h3>
              </div>

              {/* Vertical Stepper Timeline */}
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                
                {/* STAGE 1: Payment Initiated (Complete) */}
                <div className="relative">
                  <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">
                      Payment Initiated
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {activeTxn.initiatedAt}
                    </p>
                  </div>
                </div>

                {/* STAGE 2: Awaiting Payment */}
                <div className="relative">
                  {activeTxn.status === "SUCCESS" ? (
                    <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  ) : activeTxn.status === "FAILED" ? (
                    <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xs">
                      <XCircle className="w-3.5 h-3.5" />
                    </div>
                  ) : activeTxn.status === "TIMED_OUT" ? (
                    <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                      <Clock className="w-3 h-3" />
                    </div>
                  ) : (
                    <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center ring-4 ring-blue-100 shadow-xs animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  )}
                  <div>
                    <h4
                      className={`text-xs font-black ${
                        activeTxn.status === "SUCCESS"
                          ? "text-emerald-700"
                          : activeTxn.status === "FAILED"
                          ? "text-red-700"
                          : activeTxn.status === "TIMED_OUT"
                          ? "text-amber-800"
                          : "text-blue-600"
                      }`}
                    >
                      {activeTxn.status === "SUCCESS"
                        ? "Payment Authorized"
                        : activeTxn.status === "FAILED"
                        ? "Payment Declined"
                        : activeTxn.status === "TIMED_OUT"
                        ? "Awaiting Verification"
                        : "Awaiting Payment"}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                      {activeTxn.status === "SUCCESS"
                        ? "Cardholder authorized payment successfully."
                        : activeTxn.status === "FAILED"
                        ? "Card declined or session expired."
                        : activeTxn.status === "TIMED_OUT"
                        ? "120s limit reached on frontend. Remains pending in backend."
                        : "Complete the payment in the payment gateway tab."}
                    </p>
                  </div>
                </div>

                {/* STAGE 3: Payment Confirmation */}
                <div className="relative">
                  {activeTxn.status === "SUCCESS" ? (
                    <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  ) : activeTxn.status === "TIMED_OUT" ? (
                    <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-amber-100 text-amber-800 border-2 border-amber-400 flex items-center justify-center">
                      <AlertCircle className="w-3 h-3 text-amber-700" />
                    </div>
                  ) : (
                    <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full border-2 border-slate-300 bg-white flex items-center justify-center" />
                  )}
                  <div>
                    <h4
                      className={`text-xs font-bold ${
                        activeTxn.status === "SUCCESS"
                          ? "text-emerald-700 font-black"
                          : activeTxn.status === "TIMED_OUT"
                          ? "text-amber-800 font-black"
                          : "text-slate-600"
                      }`}
                    >
                      {activeTxn.status === "SUCCESS"
                        ? "Payment Confirmed"
                        : activeTxn.status === "TIMED_OUT"
                        ? "Verification Delayed"
                        : "Payment Confirmation"}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                      {activeTxn.status === "SUCCESS"
                        ? "Verified & confirmed by payment gateway."
                        : activeTxn.status === "TIMED_OUT"
                        ? "Delayed confirmation will be updated via bank webhook."
                        : "We are verifying the payment with the gateway."}
                    </p>
                  </div>
                </div>

                {/* STAGE 4: Wallet Credit */}
                <div className="relative">
                  {activeTxn.status === "SUCCESS" ? (
                    <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  ) : activeTxn.status === "TIMED_OUT" ? (
                    <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full border-2 border-amber-300 bg-amber-50 flex items-center justify-center">
                      <Clock className="w-2.5 h-2.5 text-amber-600" />
                    </div>
                  ) : (
                    <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full border-2 border-slate-300 bg-white flex items-center justify-center" />
                  )}
                  <div>
                    <h4
                      className={`text-xs font-bold ${
                        activeTxn.status === "SUCCESS"
                          ? "text-emerald-700 font-black"
                          : activeTxn.status === "TIMED_OUT"
                          ? "text-amber-800 font-bold"
                          : "text-slate-600"
                      }`}
                    >
                      {activeTxn.status === "SUCCESS"
                        ? "Wallet Credited"
                        : activeTxn.status === "TIMED_OUT"
                        ? "Auto-Credit Upon Bank Confirmation"
                        : "Wallet Credit"}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                      {activeTxn.status === "SUCCESS"
                        ? `₹${activeTxn.expectedCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })} credited to wallet.`
                        : activeTxn.status === "TIMED_OUT"
                        ? "Your wallet will be credited automatically once confirmed."
                        : "Your wallet will be credited after successful payment."}
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* 2. NEED HELP? CARD */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Headphones className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">
                    Need Help?
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Facing any issue with the payment?
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => checkStatus(true)}
                disabled={isCheckingStatus}
                className="py-1.5 px-3 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 text-xs font-bold transition-colors cursor-pointer flex-shrink-0 disabled:opacity-50"
              >
                Check Status
              </button>
            </div>

            {/* 3. NEW TAB (PAYMENT GATEWAY) BROWSER WINDOW PREVIEW */}
            <div className="relative pt-2">
              {/* Red Curved Arrow (Desktop only, pointing from left column action area to new tab preview) */}
              <div className="hidden lg:block absolute -left-12 bottom-20 z-10 pointer-events-none">
                <svg width="60" height="50" viewBox="0 0 60 50" fill="none">
                  <path
                    d="M 5 5 C 10 38, 35 48, 55 30"
                    stroke="#DC2626"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M 46 27 L 56 30 L 51 40"
                    stroke="#DC2626"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              </div>

              <div 
                onClick={handleReopenPaymentTab}
                className="bg-white rounded-2xl border border-slate-300 shadow-lg overflow-hidden cursor-pointer group transition-all duration-200 hover:shadow-xl hover:border-blue-400"
                title="Click to switch or re-open payment tab"
              >
                {/* Mac-style Window Chrome */}
                <div className="bg-slate-100 border-b border-slate-200 px-3 py-2 flex items-center justify-between select-none">
                  {/* Window Controls */}
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </div>

                  {/* Tab pill */}
                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-0.5 rounded-md text-[10px] font-bold text-slate-700 shadow-xs border border-slate-200/60 max-w-[200px] truncate">
                    <span className="w-3.5 h-3.5 rounded bg-blue-600 text-white font-black text-[8px] flex items-center justify-center flex-shrink-0">
                      G
                    </span>
                    <span className="truncate">{activeTxn?.gateway || selectedGateway.name} - Secure Payment</span>
                    <span className="text-slate-400 text-xs ml-1">×</span>
                  </div>

                  <span className="text-slate-400 text-xs font-bold px-1">+</span>
                </div>

                {/* Address Bar */}
                <div className="bg-slate-50 border-b border-slate-200 px-3 py-1 flex items-center gap-2 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="cursor-pointer hover:text-slate-600 text-xs">‹</span>
                    <span className="cursor-pointer hover:text-slate-600 text-xs">›</span>
                    <RefreshCw className="w-2.5 h-2.5 cursor-pointer hover:text-slate-600" />
                  </div>
                  <div className="flex-1 bg-white border border-slate-200 rounded px-2 py-0.5 flex items-center gap-1 text-[10px] text-slate-600 font-mono truncate">
                    <Lock className="w-2.5 h-2.5 text-emerald-600 flex-shrink-0" />
                    <span className="truncate">https://pay.gateway.internal/payment</span>
                  </div>
                  <span className="text-slate-400 text-xs">⋮</span>
                </div>

                {/* Payment Gateway Hosted Page Content Mockup */}
                <div className="p-4 space-y-3 bg-gradient-to-b from-white to-slate-50/50">
                  {/* Payment Gateway Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                        G
                      </span>
                      <span className="text-xs font-black text-slate-900">{activeTxn?.gateway || selectedGateway.name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <Lock className="w-2.5 h-2.5 text-emerald-600" />
                      <span>Secure Payment</span>
                    </div>
                  </div>

                  {/* Main Order Details & Card Graphic */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-slate-900">
                        Complete Your Payment
                      </h4>
                      <div className="text-[10px] text-slate-500 space-y-0.5">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400">Merchant :</span>
                          <span className="font-semibold text-slate-700">SMSPAY Operations</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400">Transaction ID :</span>
                          <span className="font-mono font-semibold text-slate-800">{activeTxn.tid}</span>
                        </div>
                        <div className="flex items-center gap-1 pt-0.5">
                          <span className="text-slate-400 font-bold">Amount Payable :</span>
                          <span className="font-mono font-black text-blue-600 text-xs">
                            ₹{activeTxn.customerPayable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 3D Blue Card Graphic */}
                    <div className="w-14 h-11 flex-shrink-0 relative">
                      <svg viewBox="0 0 64 48" className="w-full h-full drop-shadow-md">
                        <rect x="6" y="2" width="52" height="34" rx="4" fill="#3B82F6" transform="rotate(-6 32 20)" />
                        <rect x="8" y="10" width="52" height="34" rx="4" fill="#2563EB" />
                        <rect x="8" y="16" width="52" height="6" fill="#1D4ED8" />
                        <rect x="12" y="26" width="10" height="7" rx="1.5" fill="#FDE047" />
                        <circle cx="48" cy="32" r="4" fill="#60A5FA" opacity="0.8" />
                        <circle cx="53" cy="32" r="4" fill="#93C5FD" opacity="0.8" />
                      </svg>
                    </div>
                  </div>

                  {/* Pay With Card Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReopenPaymentTab();
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Lock className="w-3 h-3" />
                    <span>Pay with Card</span>
                  </button>

                  {/* Supported Schemes Row */}
                  <div className="flex items-center justify-center gap-2 pt-1 border-t border-slate-100 text-[9px] font-bold text-slate-400">
                    <span className="px-1.5 py-0.5 rounded bg-[#1A1F71] text-white font-black text-[8px]">VISA</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#EB001B] text-white font-black text-[8px]">MasterCard</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#097939] text-white font-black text-[8px]">RuPay</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#006FCF] text-white font-black text-[8px]">AMEX</span>
                  </div>
                </div>
              </div>

              {/* Label below window */}
              <div className="pt-2.5 flex justify-center">
                <span className="px-3.5 py-1 rounded-full border border-red-300 bg-red-50 text-red-600 font-bold text-xs shadow-xs">
                  New Tab ({activeTxn?.gateway || selectedGateway.name})
                </span>
              </div>
            </div>

          </div>

        </div>

      </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER: STEP 1 – MAIN PAYIN TOP-UP FORM (CENTRALIZED DOMAIN DESIGN SYSTEM)
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="payin-page">
      <div className="payin-page__container">
        
        {/* ── SINGLE CLEAR PAYIN PAGE TITLE ROW (HEADER CORRECTION) ── */}
        <div className="payin-secondary-header">
          <div className="payin-secondary-header__left-group">
            <Link
              href="/retailer/dashboard"
              className="payin-secondary-header__back-btn"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </Link>

            <div className="payin-secondary-header__title-group">
              <div className="payin-secondary-header__icon-box">
                <Layers className="w-5 h-5 text-blue-600" />
              </div>
              <h1 className="payin-secondary-header__title">
                PayIn (Add Money)
              </h1>
            </div>
          </div>

          <div className="payin-secondary-header__encryption-badge">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Bank-Grade 256-bit Encryption</span>
          </div>
        </div>

        {/* ── TWO-COLUMN WORKSPACE (CENTRALIZED DOMAIN GRID) ── */}
        <div className="payin-page__grid">
          
          {/* ═══════════════════════════════════════════════════════════════════
              LEFT COLUMN: 3 MAIN CARDS (01 DETAILS, 02 GATEWAY, 03 SCHEMES)
          ═══════════════════════════════════════════════════════════════════ */}
          <div className="payin-page__left-col">

            {/* 01. PAYMENT DETAILS FORM DOMAIN COMPONENT */}
            <div className="card-glass payin-details">
              <SectionHeader
                variant="teal"
                number="01"
                icon={<FileText className="w-4 h-4" />}
                title="Payment Details"
                description="Enter customer mobile number and required wallet top-up amount"
              />

              <div className="payin-details__grid">
                
                {/* Customer Mobile Number */}
                <div className="input-group">
                  <div className="input-label-row">
                    <label className="input-label">
                      CUSTOMER MOBILE NUMBER <span className="input-label__required">*</span>
                    </label>
                  </div>
                  <div className="input-wrapper">
                    <div className="input-prefix">
                      <Phone className="w-3.5 h-3.5" />
                      <span className="input-prefix__text">+91</span>
                    </div>
                    <input
                      type="tel"
                      maxLength={10}
                      autoComplete="off"
                      inputMode="numeric"
                      value={customerMobile}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        if (val.length <= 10) setCustomerMobile(val);
                      }}
                      placeholder="Enter 10-digit customer mobile"
                      className={`input-field input-field--with-prefix ${
                        mobileError
                          ? "input-field--error"
                          : isMobileValid
                          ? "input-field--valid"
                          : ""
                      }`}
                    />
                    {isMobileValid && (
                      <div className="input-valid-indicator">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  {mobileError ? (
                    <p className="input-error">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      {mobileError}
                    </p>
                  ) : (
                    <p className="input-subtext">
                      10-digit customer mobile number for SMS receipt
                    </p>
                  )}
                </div>

                {/* Top-up Amount */}
                <div className="input-group">
                  <div className="input-label-row">
                    <label className="input-label">
                      TOP-UP AMOUNT (INR) <span className="input-label__required">*</span>
                    </label>
                    <span className="input-limits-pill">
                      Min ₹100 · Max ₹1,00,000
                    </span>
                  </div>
                  <div className="input-wrapper">
                    <span className="input-prefix__currency">
                      ₹
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={topupAmount}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "" || /^\d+(\.\d{0,2})?$/.test(val)) {
                          setTopupAmount(val);
                        }
                      }}
                      placeholder="Enter top-up amount"
                      className={`input-field input-field--amount ${
                        amountError
                          ? "input-field--error"
                          : isAmountValid
                          ? "input-field--valid"
                          : ""
                      }`}
                    />
                    {isAmountValid && (
                      <div className="input-valid-indicator">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  {amountError ? (
                    <p className="input-error">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      {amountError}
                    </p>
                  ) : (
                    <p className="input-subtext">
                      Manual numeric entry only. No preset shortcuts.
                    </p>
                  )}
                </div>
              </div>

              {/* Amount in Words Panel (Always shown with '—' when empty) */}
              <div className="payin-details__words-panel">
                <Info className="payin-details__words-icon" />
                <div className="payin-details__words-content">
                  <span className="payin-details__words-label">
                    AMOUNT IN WORDS :
                  </span>
                  <span className="payin-details__words-text">
                    {amountInWords || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* 02. PAYMENT GATEWAY SELECTION DOMAIN COMPONENT */}
            <div className="card-glass payin-gateway">
              <SectionHeader
                variant="primary"
                number="02"
                icon={<Layers className="w-4 h-4" />}
                title="Select Payment Gateway"
                description="Choose an authorized payment gateway provider"
                action={
                  <span className="badge badge-counter">
                    {gateways.length} Active Gateway{gateways.length === 1 ? "" : "s"}
                  </span>
                }
              />

              {/* Gateway Cards Grid (Dynamic Active Gateways) */}
              <div className="payin-gateway__grid">
                {gateways.map((gateway) => {
                  const isSelected = selectedGatewayId === gateway.id;
                  return (
                    <button
                      key={gateway.id}
                      type="button"
                      onClick={() => setSelectedGatewayId(gateway.id)}
                      className={`payin-gateway__card ${isSelected ? "payin-gateway__card--active" : ""}`}
                    >
                      <div className="payin-gateway__card-top">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="payin-gateway__logo-box">
                            {gateway.code}
                          </div>
                          <div className="payin-gateway__name-group">
                            <div className="payin-gateway__name-row">
                              <span className="payin-gateway__name">
                                {gateway.name}
                              </span>
                              {gateway.isRecommended && (
                                <span className="badge badge-recommended">
                                  ★ Recommended
                                </span>
                              )}
                              <span className="badge badge-active">
                                <span className="badge-dot badge-dot--pulse" />
                                ACTIVE
                              </span>
                            </div>
                            <span className="payin-gateway__desc">
                              {gateway.subtitle}
                            </span>
                          </div>
                        </div>

                        <div className="payin-gateway__check-badge">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      </div>

                      <div className="payin-gateway__status-bar">
                        {isSelected ? (
                          <span className="payin-gateway__selected-indicator">
                            <div className="payin-gateway__selected-circle">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                            <span>Selected Gateway</span>
                          </span>
                        ) : (
                          <span className="payin-gateway__unselected-indicator">
                            <span>Available Gateway</span>
                          </span>
                        )}
                        <span className="payin-gateway__settlement-tag">
                          <Zap className="w-3.5 h-3.5 payin-gateway__settlement-icon" />
                          <span>Instant Settlement</span>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 03. SUPPORTED CARD SCHEMES & APPLICABLE MDR DOMAIN COMPONENT */}
            <div className="card-glass payin-schemes">
              <SectionHeader
                variant="success"
                number="03"
                icon={<CreditCard className="w-4 h-4" />}
                title="Supported Card Schemes & Applicable MDR"
                description="View supported card categories and their configured MDR rates for the selected payment gateway."
              />

              {/* Informational Display Grid (5 equal columns) */}
              <div className="payin-schemes__grid">
                {cardSchemes.map((scheme) => {
                  const sId = (scheme.id || "").toLowerCase();
                  const sNet = (scheme.card_network || "").toUpperCase();
                  const isVisa = sId === "visa" || sNet === "VISA";
                  const isMastercard = sId === "mastercard" || sNet === "MASTERCARD" || sNet === "MC";
                  const isRupay = sId === "rupay" || sNet === "RUPAY";
                  const isAmex = sId === "amex_diners" || sId === "amex" || sNet === "AMEX";
                  const isCorp = sId === "business_corporate" || sId === "corp" || sNet === "CORP" || sNet === "BUSINESS";

                  return (
                    <div key={scheme.id} className="payin-schemes__card">
                      <div className="payin-schemes__top">
                        {isVisa ? (
                          <span className="badge-scheme badge-scheme--visa">
                            VISA
                          </span>
                        ) : isMastercard ? (
                          <div className="flex items-center">
                            <svg viewBox="0 0 32 20" width="22" height="14" fill="none" className="flex-shrink-0">
                              <circle cx="10" cy="10" r="9" fill="#EB001B" />
                              <circle cx="22" cy="10" r="9" fill="#F79E1B" fillOpacity="0.9" />
                              <path d="M16 4.3A9 9 0 0 0 12.8 10 9 9 0 0 0 16 15.7 9 9 0 0 0 19.2 10 9 9 0 0 0 16 4.3Z" fill="#FF5F00" />
                            </svg>
                          </div>
                        ) : isRupay ? (
                          <div className="flex items-center">
                            <span className="card-brand-logo--rupay-text font-black italic text-xs text-[#1A1F71]">RuPay</span>
                            <span className="card-brand-logo--rupay-arrow font-black text-xs text-[#FF6600] ml-0.5">▶</span>
                          </div>
                        ) : isAmex ? (
                          <span className="badge-scheme badge-scheme--amex">
                            AMEX
                          </span>
                        ) : isCorp ? (
                          <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-slate-700">
                            <Briefcase className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <span className="badge-scheme badge-scheme--visa">
                            {scheme.name.slice(0, 4).toUpperCase()}
                          </span>
                        )}

                        <span className="payin-schemes__status-dot" title="Supported" />
                      </div>

                      <div className="my-0.5">
                        <span className="payin-schemes__name">
                          {scheme.name}
                        </span>
                        <span className="payin-schemes__category">
                          {scheme.category}
                        </span>
                      </div>

                      <div className="payin-schemes__bottom">
                        <span className="payin-schemes__mdr-label">
                          MDR
                        </span>
                        <span
                          className="payin-schemes__mdr-rate"
                        >
                          {scheme.is_configured ? scheme.mdr_display : "2.62%"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              RIGHT COLUMN: PAYMENT SUMMARY PANEL (EXACT DOMAIN COMPONENT)
          ═══════════════════════════════════════════════════════════════════ */}
          <div className="payin-page__right-col">
            
            <div className="payin-summary card-glass--summary">
              {/* Vibrant Royal Blue Header Banner */}
              <div className="payin-summary__header">
                <div className="payin-summary__header-left">
                  <div className="payin-summary__icon-box">
                    <Receipt className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="payin-summary__title">
                      Payment Summary
                    </h3>
                    <p className="payin-summary__subtitle">
                      Authoritative financial breakdown
                    </p>
                  </div>
                </div>
                <span className="badge badge-live">
                  <span className="badge-dot badge-dot--pulse" />
                  LIVE BREAKDOWN
                </span>
              </div>

              {/* Financial Details Table with Icons */}
              <div className="payin-summary__body">
                <div className="payin-summary__table">
                  <div className="payin-summary__row">
                    <span className="payin-summary__row-label">
                      <Layers className="payin-summary__row-icon" />
                      <span>Payment Gateway</span>
                    </span>
                    <span className="payin-summary__row-value">{selectedGateway.name}</span>
                  </div>
                  <div className="payin-summary__row">
                    <span className="payin-summary__row-label">
                      <Phone className="payin-summary__row-icon" />
                      <span>Customer Mobile</span>
                    </span>
                    <span className="payin-summary__row-value">
                      {cleanMobile ? `+91 ${cleanMobile}` : "—"}
                    </span>
                  </div>
                  <div className="payin-summary__row">
                    <span className="payin-summary__row-label">
                      <CreditCard className="payin-summary__row-icon" />
                      <span>Top-up Amount</span>
                    </span>
                    <span className="payin-summary__row-value">
                      ₹{calculations.topupAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="payin-summary__row">
                    <span className="payin-summary__row-label">
                      <Percent className="payin-summary__row-icon" />
                      <span>MDR Rate</span>
                    </span>
                    <span className="payin-summary__row-value">
                      {calculations.rateDisplay}
                    </span>
                  </div>
                  <div className="payin-summary__row">
                    <span className="payin-summary__row-label">
                      <Coins className="payin-summary__row-icon" />
                      <span>MDR Amount</span>
                    </span>
                    <span className="payin-summary__row-value">
                      ₹{calculations.mdrAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="payin-summary__row">
                    <span className="payin-summary__row-label">
                      <FileText className="payin-summary__row-icon" />
                      <span>Applicable Tax (18% GST)</span>
                    </span>
                    <span className="payin-summary__row-value">
                      ₹{calculations.taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* High-Contrast Highlight Boxes */}
                <div className="payin-summary__highlights">
                  
                  {/* Box 1: Customer Payable Amount */}
                  <div className="card-highlight-blue">
                    <div className="flex items-center gap-3">
                      <div className="card-highlight-blue__icon-box">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="card-highlight-blue__label">
                          CUSTOMER PAYABLE AMOUNT
                        </span>
                        <span className="card-highlight-blue__desc">
                          Total debit to customer card
                        </span>
                      </div>
                    </div>
                    <span className={`card-highlight-blue__value ${isLoadingPreview ? "opacity-60 animate-pulse" : ""}`}>
                      ₹{calculations.customerPayable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Box 2: Expected Wallet Credit */}
                  <div className="card-highlight-green">
                    <div className="flex items-center gap-3">
                      <div className="card-highlight-green__icon-box">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="card-highlight-green__label">
                          EXPECTED WALLET CREDIT
                        </span>
                        <span className="card-highlight-green__desc">
                          Net amount credited to balance
                        </span>
                      </div>
                    </div>
                    <span className={`card-highlight-green__value ${isLoadingPreview ? "opacity-60 animate-pulse" : ""}`}>
                      ₹{calculations.expectedCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* MDR Treatment Informational Banner */}
                {calculations.mdrTreatment && (
                  <div className="payin-summary__policy-row">
                    <span className="payin-summary__policy-label">Applied Policy:</span>
                    <span className="payin-summary__policy-pill">
                      {calculations.policyDisplayName || (
                        calculations.mdrTreatment === "COLLECT_ADDITIONALLY"
                          ? "Customer Pays MDR Charges"
                          : calculations.mdrTreatment === "DEDUCT_FROM_TOPUP"
                          ? "Retailer Bears MDR Charges"
                          : "Company Absorbs Charges"
                      )}
                    </span>
                  </div>
                )}

                {/* Error Message if MDR Configuration is Missing / Invalid */}
                {mdrError && (
                  <div className="payin-summary__error-box">
                    <AlertCircle className="payin-summary__error-icon" />
                    <div>
                      <span className="font-bold block text-xs">Payment Option Unavailable</span>
                      <span className="font-medium text-[11px] mt-0.5 block">{mdrError}</span>
                    </div>
                  </div>
                )}

                {/* Compliance Checkbox */}
                <div className="pt-0.5">
                  <label className="payin-summary__terms">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="payin-summary__checkbox"
                    />
                    <span className="payin-summary__terms-text">
                      I have reviewed the payment details and agree to the applicable payment terms.
                    </span>
                  </label>
                </div>

                {/* Primary Action Button with Gradient: linear-gradient(90deg, #2563EB 0%, #059669 100%) */}
                <div className="pt-0.5">
                  <button
                    type="button"
                    disabled={!isMobileValid || !isAmountValid || !acceptedTerms || isInitiating || !!mdrError || isLoadingPreview}
                    onClick={handleContinueToPayment}
                    className="btn-primary w-full"
                  >
                    {isInitiating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Initiating Payment Session...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Continue to Payment →</span>
                      </>
                    )}
                  </button>
                  <p className="payin-summary__helper-text">
                    Complete valid mobile number, amount, and agree to payment terms
                  </p>
                </div>

                {/* Security Assurance Footer */}
                <div className="payin-summary__security-footer">
                  <ShieldCheck className="payin-summary__security-icon" />
                  <span>256-bit SSL Encrypted • Instant Wallet Credit</span>
                </div>

              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
