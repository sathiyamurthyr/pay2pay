"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { retailerApi } from "@/services/retailer-api";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Fingerprint,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Lock,
  RefreshCw,
  CreditCard,
  Info,
  BadgeCheck,
  Sparkles,
  LayoutDashboard,
  SendHorizontal,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type VerificationContext = "ONBOARDING" | "CUSTOMER_VERIFICATION";
type StepId = "enter_aadhaar" | "confirm_charge" | "enter_otp" | "success";

interface ChargePreview {
  verification_context: VerificationContext;
  is_chargeable: boolean;
  service_charge: number;
  tax_rate: number;
  cgst: number;
  sgst: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  hsn_sac: string;
  service_name: string;
  message: string;
}

interface VerificationResult {
  status: string;
  verification_status: string;
  customer_id?: string;
  customer_number?: string;
  ref_id?: string;
  masked_aadhaar?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  dob?: string;
  gender?: string;
  care_of?: string;
  house?: string;
  street?: string;
  locality?: string;
  district?: string;
  state?: string;
  pincode?: string;
  country?: string;
  full_address?: string;
  photo_url?: string;
  photo_avatar?: string;
  vendor_name?: string;
  vendor_reference?: string;
  verification_date?: string;
  verification_timestamp?: string;
  billing?: {
    base_fee: number;
    cgst: number;
    sgst: number;
    total_debited: number;
    hsn_sac: string;
    debit_txn_id: string;
    status: string;
  } | null;
  message?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// INNER WIZARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function AadhaarVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const customerId = searchParams?.get("customer_id") || searchParams?.get("customerId") || "";
  const customerMobile = searchParams?.get("mobile") || searchParams?.get("customerMobile") || "";
  const customerName = searchParams?.get("name") || searchParams?.get("customerName") || "";
  const returnTo = searchParams?.get("return_to") || "/retailer/dmt";
  const rawContext = (searchParams?.get("context") || "CUSTOMER_VERIFICATION").toUpperCase() as VerificationContext;
  const verificationContext: VerificationContext = rawContext === "ONBOARDING" ? "ONBOARDING" : "CUSTOMER_VERIFICATION";

  // Sequence: 1. Enter Aadhaar -> 2. Confirm Charge -> 3. Enter OTP -> 4. Success
  const [step, setStep] = useState<StepId>("enter_aadhaar");
  const [aadhaarInput, setAadhaarInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [refId, setRefId] = useState("");
  const [chargePreview, setChargePreview] = useState<ChargePreview | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chargeLoading, setChargeLoading] = useState(true);
  const [otpResendCountdown, setOtpResendCountdown] = useState(0);

  const otpRef = useRef<HTMLInputElement>(null);
  const aadhaarRef = useRef<HTMLInputElement>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch dynamic charge preview on mount — source of truth from backend
  useEffect(() => {
    setChargeLoading(true);
    retailerApi.aadhaarKyc
      .chargePreview(verificationContext)
      .then((data) => setChargePreview(data))
      .catch(() => setError("Unable to load charge preview. Please check your network."))
      .finally(() => setChargeLoading(false));
  }, [verificationContext]);

  // Autofocus Aadhaar input
  useEffect(() => {
    setTimeout(() => aadhaarRef.current?.focus(), 150);
  }, []);

  const startCountdown = () => {
    setOtpResendCountdown(60);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setOtpResendCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const formatAadhaar = (raw: string) =>
    raw.replace(/\D/g, "").slice(0, 12).replace(/(\d{4})(?=\d)/g, "$1-");

  const cleanAadhaar = aadhaarInput.replace(/\D/g, "");
  const isAadhaarValid = cleanAadhaar.length === 12;

  // Step 1: Proceed from Aadhaar entry to Confirmation screen
  const handleProceedToConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAadhaarValid) return;
    setError("");
    setStep("confirm_charge");
  };

  // Step 2: Confirm charge and send OTP via Cashfree
  const handleConfirmAndSendOtp = async () => {
    if (!isAadhaarValid) return;
    setError("");
    setLoading(true);
    try {
      const res = await retailerApi.aadhaarKyc.generateOtp({
        aadhaar_number: cleanAadhaar,
        customer_id: customerId || null,
        verification_context: verificationContext,
      });
      setRefId(res?.ref_id || res?.ref_number || "");
      setStep("enter_otp");
      startCountdown();
      setTimeout(() => otpRef.current?.focus(), 250);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (typeof detail === "object" && detail?.message) setError(detail.message);
      else if (typeof detail === "string") setError(detail);
      else setError("Failed to send Aadhaar OTP. Please verify the Aadhaar number and wallet balance.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Verify OTP code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpInput.length !== 6) return;
    setError("");
    setLoading(true);
    try {
      const res = await retailerApi.aadhaarKyc.verifyOtp({
        ref_id: refId,
        otp_code: otpInput,
        customer_id: customerId || null,
        aadhaar_number: cleanAadhaar,
        verification_context: verificationContext,
      });
      setVerificationResult(res);
      setStep("success");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (typeof detail === "string") setError(detail);
      else if (typeof detail === "object" && detail?.message) setError(detail.message);
      else setError("Aadhaar OTP verification failed. Verification fee has been refunded if debited.");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (otpResendCountdown > 0 || !isAadhaarValid) return;
    setError("");
    setLoading(true);
    try {
      const res = await retailerApi.aadhaarKyc.generateOtp({
        aadhaar_number: cleanAadhaar,
        customer_id: customerId || null,
        verification_context: verificationContext,
      });
      setRefId(res?.ref_id || res?.ref_number || "");
      setOtpInput("");
      startCountdown();
    } catch {
      setError("Failed to resend Aadhaar OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Return to DMT with preloaded customer
  const handleContinueToDmt = () => {
    const params = new URLSearchParams();
    if (verificationResult?.customer_id || customerId) {
      params.set("customer_id", verificationResult?.customer_id || customerId);
    }
    const mobileToUse = customerMobile || "";
    if (mobileToUse) params.set("mobile", mobileToUse);
    if (verificationResult?.full_name || customerName) {
      params.set("name", verificationResult?.full_name || customerName);
    }
    params.set("aadhaar_verified", "true");
    params.set("verified", "true");
    router.push(`${returnTo}?${params.toString()}`);
  };

  // Return to Dashboard
  const handleGoToDashboard = () => {
    router.push("/retailer-dashboard");
  };

  // ── DESIGN SYSTEM STYLES ──
  const s = {
    primaryBtn: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      background: "linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #B45309 100%)",
      color: "#080B11",
      border: "none",
      borderRadius: 14,
      padding: "14px 24px",
      fontSize: 15,
      fontWeight: 800,
      cursor: "pointer",
      width: "100%",
      justifyContent: "center",
      boxShadow: "0 8px 24px rgba(245,158,11,0.35)",
      transition: "all 0.2s ease",
    } as React.CSSProperties,
    outlineBtn: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: "rgba(255,255,255,0.05)",
      color: "rgba(255,255,255,0.75)",
      border: "1px solid rgba(255,255,255,0.15)",
      borderRadius: 14,
      padding: "14px 20px",
      fontSize: 14,
      fontWeight: 700,
      cursor: "pointer",
      transition: "all 0.2s ease",
    } as React.CSSProperties,
    input: {
      width: "100%",
      padding: "16px 18px",
      background: "rgba(15,23,42,0.6)",
      border: "1.5px solid rgba(245,158,11,0.4)",
      borderRadius: 14,
      color: "#FFFFFF",
      fontSize: 22,
      fontWeight: 800,
      letterSpacing: 4,
      outline: "none",
      boxSizing: "border-box" as const,
      caretColor: "#F59E0B",
      boxShadow: "inset 0 2px 4px rgba(0,0,0,0.4)",
    },
    label: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      color: "rgba(255,255,255,0.75)",
      fontSize: 12,
      fontWeight: 700,
      textTransform: "uppercase" as const,
      letterSpacing: 1,
      marginBottom: 8,
    },
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #080B11 0%, #0F172A 50%, #080B11 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background ambient lighting */}
      <div
        style={{
          position: "absolute",
          top: "-15%",
          left: "-10%",
          width: 550,
          height: 550,
          background: "radial-gradient(circle, rgba(245,158,11,0.12), transparent 70%)",
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-15%",
          right: "-10%",
          width: 600,
          height: 600,
          background: "radial-gradient(circle, rgba(56,189,248,0.1), transparent 70%)",
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />

      {/* Top Bar Back Button */}
      <div style={{ position: "absolute", top: 24, left: 24, zIndex: 10 }}>
        <button
          onClick={() => {
            if (step === "confirm_charge") setStep("enter_aadhaar");
            else if (step === "enter_otp") setStep("confirm_charge");
            else router.push(returnTo);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: 12,
            padding: "8px 16px",
            color: "#F59E0B",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            backdropFilter: "blur(12px)",
            transition: "all 0.2s ease",
          }}
        >
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      {/* Main Glass Container */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{
          width: "100%",
          maxWidth: 540,
          background: "rgba(15,23,42,0.75)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(245,158,11,0.25)",
          borderRadius: 24,
          padding: "36px 32px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.6), 0 0 20px rgba(245,158,11,0.1)",
          zIndex: 2,
        }}
      >
        {/* Header Badge & Title */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 68,
              height: 68,
              background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(15,23,42,0.8))",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px",
              border: "1.5px solid rgba(245,158,11,0.5)",
              boxShadow: "0 0 24px rgba(245,158,11,0.25)",
            }}
          >
            <Fingerprint size={36} color="#F59E0B" strokeWidth={1.75} />
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 900,
              background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #F59E0B 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "-0.5px",
            }}
          >
            Aadhaar eKYC Verification
          </h1>
          <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,0.55)", fontSize: 13.5 }}>
            {verificationContext === "ONBOARDING"
              ? "Free verification during initial customer onboarding"
              : "UIDAI Aadhaar OTP verification for Retailer DMT"}
          </p>

          {/* Customer info pill */}
          {(customerName || customerMobile) && (
            <div
              style={{
                marginTop: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(245,158,11,0.1)",
                border: "1px solid rgba(245,158,11,0.3)",
                borderRadius: 20,
                padding: "6px 14px",
              }}
            >
              <BadgeCheck size={15} color="#F59E0B" />
              <span style={{ color: "#FDE68A", fontSize: 13, fontWeight: 700 }}>
                {customerName ? `${customerName}` : ""}
                {customerName && customerMobile ? " · " : ""}
                {customerMobile ? `${customerMobile}` : ""}
              </span>
            </div>
          )}
        </div>

        {/* Step Indicator */}
        <StepIndicator step={step} />

        {/* Error notification */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{
                background: "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.5)",
                borderRadius: 12,
                padding: "12px 16px",
                marginBottom: 20,
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <AlertTriangle size={18} color="#F87171" style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ color: "#FCA5A5", fontSize: 13, lineHeight: 1.5, fontWeight: 600 }}>
                {error}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {/* ─────────────────────────────────────────────────────────────────
              STEP 1: ENTER AADHAAR NUMBER FIRST (Requirements 2, 3, 9)
          ───────────────────────────────────────────────────────────────── */}
          {step === "enter_aadhaar" && (
            <motion.div
              key="enter_aadhaar"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <form onSubmit={handleProceedToConfirmation}>
                <div style={s.label}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Lock size={14} color="#F59E0B" /> Enter Aadhaar Number
                  </span>
                  {/* Dynamic character counter: X / 12 Digits */}
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontWeight: 800,
                      color: isAadhaarValid ? "#4ADE80" : "#F59E0B",
                      fontSize: 12,
                    }}
                  >
                    {cleanAadhaar.length} / 12 Digits
                  </span>
                </div>

                <input
                  ref={aadhaarRef}
                  type="tel"
                  inputMode="numeric"
                  placeholder="XXXX - XXXX - XXXX"
                  value={aadhaarInput}
                  onChange={(e) => setAadhaarInput(formatAadhaar(e.target.value))}
                  maxLength={14}
                  style={s.input}
                  disabled={loading}
                  autoComplete="off"
                />

                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 8, marginBottom: 20 }}>
                  Enter the customer's 12-digit Aadhaar number as issued by UIDAI.
                </p>

                {/* Info preview banner */}
                <div
                  style={{
                    background: "rgba(245,158,11,0.08)",
                    border: "1px solid rgba(245,158,11,0.25)",
                    borderRadius: 12,
                    padding: "12px 16px",
                    marginBottom: 24,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Info size={18} color="#F59E0B" style={{ flexShrink: 0 }} />
                  <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, lineHeight: 1.4 }}>
                    {verificationContext === "ONBOARDING"
                      ? "Aadhaar verification is 100% free during customer registration."
                      : `Aadhaar verification charge: ₹${(chargePreview?.service_charge ?? 5.0).toFixed(2)} + applicable GST. Charges will be debited upon OTP dispatch.`}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!isAadhaarValid || loading}
                  style={{
                    ...s.primaryBtn,
                    opacity: !isAadhaarValid || loading ? 0.5 : 1,
                    cursor: !isAadhaarValid || loading ? "not-allowed" : "pointer",
                  }}
                >
                  <span>Continue to Verification</span>
                  <ArrowRight size={18} />
                </button>
              </form>
            </motion.div>
          )}

          {/* ─────────────────────────────────────────────────────────────────
              STEP 2: CONFIRMATION SCREEN / MODAL (Requirements 4, 10)
          ───────────────────────────────────────────────────────────────── */}
          {step === "confirm_charge" && (
            <motion.div
              key="confirm_charge"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 800, color: "#FFFFFF" }}>
                  Confirm Verification & Charges
                </h2>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
                  Please review the verification details before initiating OTP dispatch.
                </p>
              </div>

              {/* Aadhaar preview box */}
              <div
                style={{
                  background: "rgba(15,23,42,0.6)",
                  border: "1px solid rgba(245,158,11,0.3)",
                  borderRadius: 14,
                  padding: "14px 18px",
                  marginBottom: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                    Aadhaar Number
                  </div>
                  <div style={{ color: "#FDE68A", fontSize: 17, fontWeight: 900, letterSpacing: 2, marginTop: 2 }}>
                    XXXX-XXXX-{cleanAadhaar.slice(-4)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("enter_aadhaar")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#F59E0B",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Edit
                </button>
              </div>

              {/* Dynamic Charge Breakdown Card (Requirements 4, 10) */}
              {chargeLoading ? (
                <div style={{ textAlign: "center", padding: "28px 0" }}>
                  <Loader2 size={28} color="#F59E0B" style={{ animation: "spin 1s linear infinite" }} />
                  <p style={{ color: "rgba(255,255,255,0.4)", marginTop: 8, fontSize: 13 }}>Loading charge breakdown...</p>
                </div>
              ) : chargePreview ? (
                <ChargeBreakdownCard preview={chargePreview} />
              ) : null}

              {/* Confirmation Message */}
              <div
                style={{
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.25)",
                  borderRadius: 12,
                  padding: "14px 16px",
                  marginBottom: 24,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <AlertTriangle size={20} color="#F59E0B" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, lineHeight: 1.5 }}>
                  {chargePreview?.is_chargeable ? (
                    <>
                      Aadhaar verification charge of <strong>₹{(chargePreview.service_charge ?? 5.0).toFixed(2)}</strong> + GST (Total: <strong>₹{(chargePreview.total_amount ?? 5.9).toFixed(2)}</strong>) will be debited from your wallet. Are you sure you want to proceed?
                    </>
                  ) : (
                    <>
                      Aadhaar verification is free during customer registration. No wallet deduction will occur.
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons: Cancel vs Confirm & Send OTP */}
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setStep("enter_aadhaar")}
                  disabled={loading}
                  style={{ ...s.outlineBtn, flex: "0 0 auto" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAndSendOtp}
                  disabled={loading}
                  style={{ ...s.primaryBtn, flex: 1 }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                      <span>Sending OTP...</span>
                    </>
                  ) : (
                    <>
                      <SendHorizontal size={18} />
                      <span>Confirm & Send OTP</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* ─────────────────────────────────────────────────────────────────
              STEP 3: SEND OTP SCREEN (Requirements 5, 20)
          ───────────────────────────────────────────────────────────────── */}
          {step === "enter_otp" && (
            <motion.div
              key="enter_otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <form onSubmit={handleVerifyOtp}>
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 800, color: "#FFFFFF" }}>
                    Aadhaar OTP Sent
                  </h2>
                  <p style={{ margin: 0, color: "rgba(255,255,255,0.65)", fontSize: 13.5 }}>
                    OTP sent to the mobile number linked with Aadhaar.
                  </p>
                </div>

                {/* Aadhaar Reference Chip */}
                <div
                  style={{
                    background: "rgba(15,23,42,0.6)",
                    border: "1px solid rgba(245,158,11,0.25)",
                    borderRadius: 12,
                    padding: "10px 16px",
                    marginBottom: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Fingerprint size={16} color="#F59E0B" />
                    <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: 700 }}>
                      XXXX-XXXX-{cleanAadhaar.slice(-4)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("enter_aadhaar");
                      setOtpInput("");
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#F59E0B",
                      fontSize: 12,
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    Change Number
                  </button>
                </div>

                <div style={s.label}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <ShieldCheck size={14} color="#F59E0B" /> Enter 6-Digit OTP
                  </span>
                </div>

                {/* 6-Digit OTP Input Boxes */}
                <OtpInputRow value={otpInput} onChange={setOtpInput} disabled={loading} inputRef={otpRef} />

                {/* Resend Countdown Timer */}
                <div style={{ textAlign: "center", marginTop: 14, marginBottom: 20 }}>
                  {otpResendCountdown > 0 ? (
                    <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}>
                      Resend OTP in <strong style={{ color: "#F59E0B" }}>{otpResendCountdown}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={loading}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#F59E0B",
                        fontSize: 13,
                        cursor: "pointer",
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <RefreshCw size={13} /> Resend OTP
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => setStep("confirm_charge")}
                    disabled={loading}
                    style={{ ...s.outlineBtn, flex: "0 0 auto" }}
                  >
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button
                    type="submit"
                    disabled={otpInput.length !== 6 || loading}
                    style={{
                      ...s.primaryBtn,
                      flex: 1,
                      opacity: otpInput.length !== 6 || loading ? 0.5 : 1,
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify OTP</span>
                        <ShieldCheck size={18} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ─────────────────────────────────────────────────────────────────
              STEP 4: POST-VERIFICATION SUCCESS SCREEN (Requirement 20)
          ───────────────────────────────────────────────────────────────── */}
          {step === "success" && verificationResult && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <SuccessScreen
                result={verificationResult}
                context={verificationContext}
                onContinueDmt={handleContinueToDmt}
                onGoDashboard={handleGoToDashboard}
                primaryBtnStyle={s.primaryBtn}
                outlineBtnStyle={s.outlineBtn}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Trust & Compliance Footer */}
      <div
        style={{
          marginTop: 24,
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "rgba(255,255,255,0.35)",
          fontSize: 12,
          zIndex: 2,
        }}
      >
        <Lock size={13} />
        <span>Cashfree Aadhaar eKYC · 256-bit Encrypted · Auto-Refund Guaranteed</span>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: StepId }) {
  const steps: { id: StepId; label: string }[] = [
    { id: "enter_aadhaar", label: "Aadhaar" },
    { id: "confirm_charge", label: "Confirm" },
    { id: "enter_otp", label: "OTP" },
    { id: "success", label: "Verified" },
  ];
  const idx = steps.findIndex((s) => s.id === step);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 28 }}>
      {steps.map((s, i) => (
        <React.Fragment key={s.id}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  i < idx
                    ? "linear-gradient(135deg, #10B981, #059669)"
                    : i === idx
                    ? "linear-gradient(135deg, #F59E0B, #D97706)"
                    : "rgba(255,255,255,0.06)",
                border:
                  i < idx
                    ? "1.5px solid #10B981"
                    : i === idx
                    ? "1.5px solid #F59E0B"
                    : "1.5px solid rgba(255,255,255,0.12)",
                fontSize: 12,
                fontWeight: 800,
                color: i <= idx ? "#080B11" : "rgba(255,255,255,0.3)",
                boxShadow: i === idx ? "0 0 12px rgba(245,158,11,0.4)" : "none",
              }}
            >
              {i < idx ? <CheckCircle2 size={15} color="#FFFFFF" /> : i + 1}
            </div>
            <span
              style={{
                fontSize: 10.5,
                marginTop: 4,
                color: i <= idx ? "#FDE68A" : "rgba(255,255,255,0.3)",
                fontWeight: 700,
              }}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              style={{
                flex: 1,
                height: 2,
                marginBottom: 18,
                background:
                  i < idx
                    ? "linear-gradient(90deg, #10B981, #F59E0B)"
                    : "rgba(255,255,255,0.1)",
              }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function ChargeBreakdownCard({ preview }: { preview: ChargePreview }) {
  return (
    <div
      style={{
        background: preview.is_chargeable ? "rgba(245,158,11,0.06)" : "rgba(16,185,129,0.06)",
        border: `1px solid ${preview.is_chargeable ? "rgba(245,158,11,0.3)" : "rgba(16,185,129,0.3)"}`,
        borderRadius: 16,
        padding: "18px 20px",
        marginBottom: 18,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <CreditCard size={20} color={preview.is_chargeable ? "#F59E0B" : "#10B981"} />
        <span
          style={{
            fontWeight: 800,
            fontSize: 15,
            color: preview.is_chargeable ? "#FDE68A" : "#10B981",
          }}
        >
          {preview.is_chargeable ? "Billing Breakdown" : "FREE Verification"}
        </span>
      </div>

      {preview.is_chargeable ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: "rgba(255,255,255,0.6)" }}>Service Charge</span>
            <span style={{ color: "rgba(255,255,255,0.9)", fontWeight: 700 }}>
              ₹{preview.service_charge.toFixed(2)}
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: "rgba(255,255,255,0.6)" }}>
              CGST @ {((preview.tax_rate * 100) / 2).toFixed(0)}%
            </span>
            <span style={{ color: "rgba(255,255,255,0.9)", fontWeight: 700 }}>
              ₹{preview.cgst.toFixed(2)}
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: "rgba(255,255,255,0.6)" }}>
              SGST @ {((preview.tax_rate * 100) / 2).toFixed(0)}%
            </span>
            <span style={{ color: "rgba(255,255,255,0.9)", fontWeight: 700 }}>
              ₹{preview.sgst.toFixed(2)}
            </span>
          </div>

          <div
            style={{
              borderTop: "1px solid rgba(245,158,11,0.25)",
              paddingTop: 8,
              marginTop: 4,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ color: "#FFFFFF", fontSize: 14, fontWeight: 800 }}>Total Payable</span>
            <span style={{ color: "#F59E0B", fontSize: 16, fontWeight: 900 }}>
              ₹{preview.total_amount.toFixed(2)}
            </span>
          </div>

          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, margin: "6px 0 0", lineHeight: 1.4 }}>
            HSN/SAC: {preview.hsn_sac || "998313"} · Automatic full refund to wallet upon failure
          </p>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <CheckCircle2 size={16} color="#10B981" />
            <span style={{ color: "#10B981", fontWeight: 700, fontSize: 13 }}>Zero Charges Applicable</span>
          </div>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, margin: 0, lineHeight: 1.4 }}>
            {preview.message}
          </p>
        </div>
      )}
    </div>
  );
}

function OtpInputRow({
  value,
  onChange,
  disabled,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const digits = value.split("").concat(Array(6).fill("")).slice(0, 6);
  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center", position: "relative" }}>
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        maxLength={6}
        disabled={disabled}
        style={{
          position: "absolute",
          opacity: 0,
          width: "100%",
          height: "100%",
          top: 0,
          left: 0,
          cursor: "default",
        }}
        autoComplete="one-time-code"
      />
      {digits.map((d, i) => (
        <div
          key={i}
          onClick={() => inputRef.current?.focus()}
          style={{
            width: 52,
            height: 60,
            background: d ? "rgba(245,158,11,0.15)" : "rgba(15,23,42,0.6)",
            border: `2px solid ${
              d ? "#F59E0B" : i === value.length ? "rgba(245,158,11,0.7)" : "rgba(255,255,255,0.15)"
            }`,
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            fontWeight: 900,
            color: "#FDE68A",
            cursor: "text",
            transition: "all 0.15s ease",
            boxShadow: i === value.length ? "0 0 10px rgba(245,158,11,0.3)" : "none",
          }}
        >
          {d || ""}
        </div>
      ))}
    </div>
  );
}

function SuccessScreen({
  result,
  context,
  onContinueDmt,
  onGoDashboard,
  primaryBtnStyle,
  outlineBtnStyle,
}: {
  result: VerificationResult;
  context: VerificationContext;
  onContinueDmt: () => void;
  onGoDashboard: () => void;
  primaryBtnStyle: React.CSSProperties;
  outlineBtnStyle: React.CSSProperties;
}) {
  return (
    <div style={{ textAlign: "center" }}>
      {/* Checkmark badge */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
        style={{
          width: 76,
          height: 76,
          margin: "0 auto 16px",
          background: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.1))",
          border: "2px solid #10B981",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 36px rgba(16,185,129,0.35)",
        }}
      >
        <CheckCircle2 size={40} color="#10B981" />
      </motion.div>

      <h2
        style={{
          fontSize: 22,
          fontWeight: 900,
          margin: "0 0 4px",
          background: "linear-gradient(135deg, #34D399 0%, #10B981 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Aadhaar Verification Successful ✓
      </h2>
      <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13.5, margin: "0 0 20px" }}>
        Customer profile is now officially KYC-verified and authorized for money transfer.
      </p>

      {/* Customer Photo & Identity Card */}
      <div
        style={{
          background: "rgba(15,23,42,0.8)",
          border: "1px solid rgba(245,158,11,0.3)",
          borderRadius: 16,
          padding: "18px 20px",
          marginBottom: 16,
          textAlign: "left",
          display: "flex",
          gap: 16,
          alignItems: "center",
        }}
      >
        {result.photo_url ? (
          <img
            src={result.photo_url}
            alt="Customer Aadhaar Photo"
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              objectFit: "cover",
              border: "2px solid #F59E0B",
              flexShrink: 0,
              boxShadow: "0 0 12px rgba(245,158,11,0.3)",
            }}
          />
        ) : (
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #1E293B, #0F172A)",
              border: "2px solid #F59E0B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 900,
              color: "#FDE68A",
              flexShrink: 0,
            }}
          >
            {(result.full_name || "?").charAt(0).toUpperCase()}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: "#FFFFFF",
              fontWeight: 800,
              fontSize: 17,
              lineHeight: 1.3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {result.full_name || "Verified Customer"}
          </div>
          <div style={{ color: "#FDE68A", fontSize: 13, fontWeight: 700, marginTop: 3 }}>
            Aadhaar: {result.masked_aadhaar || "XXXX-XXXX-XXXX"}
          </div>
          <div style={{ color: "#34D399", fontSize: 12, fontWeight: 700, marginTop: 2 }}>
            ✓ UIDAI Verified & B2 Encrypted
          </div>
        </div>
      </div>

      {/* Dynamic Returned Demographic Details (Requirements 4, 20) */}
      <div
        style={{
          background: "rgba(15,23,42,0.6)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 14,
          padding: "16px 18px",
          marginBottom: 16,
          textAlign: "left",
        }}
      >
        <div style={{ color: "#FDE68A", fontSize: 12, fontWeight: 800, textTransform: "uppercase", marginBottom: 10 }}>
          Demographic & Address Details
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", fontSize: 12.5 }}>
          {result.dob && (
            <div>
              <span style={{ color: "rgba(255,255,255,0.45)" }}>DOB: </span>
              <span style={{ color: "#FFFFFF", fontWeight: 700 }}>{result.dob}</span>
            </div>
          )}
          {result.gender && (
            <div>
              <span style={{ color: "rgba(255,255,255,0.45)" }}>Gender: </span>
              <span style={{ color: "#FFFFFF", fontWeight: 700 }}>{result.gender}</span>
            </div>
          )}
          {result.care_of && (
            <div style={{ gridColumn: "span 2" }}>
              <span style={{ color: "rgba(255,255,255,0.45)" }}>C/O: </span>
              <span style={{ color: "#FFFFFF", fontWeight: 700 }}>{result.care_of}</span>
            </div>
          )}
          {result.pincode && (
            <div>
              <span style={{ color: "rgba(255,255,255,0.45)" }}>Pincode: </span>
              <span style={{ color: "#FFFFFF", fontWeight: 700 }}>{result.pincode}</span>
            </div>
          )}
          {result.state && (
            <div>
              <span style={{ color: "rgba(255,255,255,0.45)" }}>State: </span>
              <span style={{ color: "#FFFFFF", fontWeight: 700 }}>{result.state}</span>
            </div>
          )}
        </div>

        {result.full_address && (
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: 12 }}>
            <span style={{ color: "rgba(255,255,255,0.45)" }}>Full Address: </span>
            <span style={{ color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>{result.full_address}</span>
          </div>
        )}
      </div>

      {/* Transaction & Billing Audit (Paid Context Only) */}
      {result.billing && context === "CUSTOMER_VERIFICATION" && (
        <div
          style={{
            background: "rgba(245,158,11,0.06)",
            border: "1px solid rgba(245,158,11,0.25)",
            borderRadius: 14,
            padding: "14px 18px",
            marginBottom: 20,
            textAlign: "left",
          }}
        >
          <div style={{ color: "#FDE68A", fontSize: 12, fontWeight: 800, textTransform: "uppercase", marginBottom: 8 }}>
            Transaction Audit · Aadhaar Verification
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>
            <span>Verification Fee</span>
            <span style={{ color: "#FFFFFF", fontWeight: 700 }}>₹{(result.billing.base_fee || 5.0).toFixed(2)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "rgba(255,255,255,0.6)", marginBottom: 6 }}>
            <span>Total GST (18%)</span>
            <span style={{ color: "#FFFFFF", fontWeight: 700 }}>
              ₹{((result.billing.cgst || 0.45) + (result.billing.sgst || 0.45)).toFixed(2)}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13.5,
              fontWeight: 800,
              color: "#F59E0B",
              borderTop: "1px solid rgba(245,158,11,0.2)",
              paddingTop: 6,
            }}
          >
            <span>Total Debited</span>
            <span>₹{(result.billing.total_debited || 5.9).toFixed(2)}</span>
          </div>
          {result.billing.debit_txn_id && (
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 6, fontFamily: "monospace" }}>
              Ref: {result.billing.debit_txn_id}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons: PRIMARY "Continue to DMT", SECONDARY "Go to Dashboard" (Requirement 20) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button onClick={onContinueDmt} style={primaryBtnStyle}>
          <Sparkles size={18} />
          <span>Continue to DMT</span>
          <ArrowRight size={18} />
        </button>

        <button onClick={onGoDashboard} style={{ ...outlineBtnStyle, justifyContent: "center" }}>
          <LayoutDashboard size={16} />
          <span>Go to Dashboard</span>
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE EXPORT WITH SUSPENSE BOUNDARY
// ─────────────────────────────────────────────────────────────────────────────

export default function AadhaarVerifyPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#080B11",
          }}
        >
          <Loader2 size={36} color="#F59E0B" style={{ animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      }
    >
      <AadhaarVerifyContent />
    </Suspense>
  );
}
