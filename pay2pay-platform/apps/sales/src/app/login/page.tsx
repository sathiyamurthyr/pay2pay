"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSalesAuth } from "@/lib/auth";
import {
  Lock, Mail, ShieldCheck, ArrowRight, RefreshCw, AlertCircle,
  Sparkles, Network, Eye, EyeOff, Smartphone, MessageSquare,
  QrCode, TrendingUp, Layers, CheckCircle2, PhoneCall, HelpCircle,
  Building2, Users, CreditCard, ChevronRight
} from "lucide-react";

export default function SalesLoginPage() {
  const router = useRouter();
  const { login, sendWhatsAppOtp, verifyWhatsAppOtp, user } = useSalesAuth();

  // Auth Modes: 'PASSWORD' | 'WHATSAPP_OTP'
  const [authMode, setAuthMode] = useState<"PASSWORD" | "WHATSAPP_OTP">("PASSWORD");

  // Password Login State (Empty defaults for production)
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // WhatsApp OTP State (Empty defaults for production)
  const [mobileOrEmail, setMobileOrEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [maskedMobile, setMaskedMobile] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [demoOtpCode, setDemoOtpCode] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  // Resend Timer Countdown
  useEffect(() => {
    let interval: any = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Password Submit Handler
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!identifier.trim() || !password.trim()) {
      setError("Please enter your registered identifier and password.");
      return;
    }

    setIsLoading(true);
    const result = await login(identifier.trim(), password.trim());
    setIsLoading(false);

    if (result.success) {
      router.replace("/dashboard");
    } else {
      setError(result.error || "Authentication failed. Please verify your credentials.");
    }
  };

  // Send WhatsApp OTP Handler
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!mobileOrEmail.trim()) {
      setError("Please enter your registered mobile number or email.");
      return;
    }

    setIsLoading(true);
    const result = await sendWhatsAppOtp(mobileOrEmail.trim());
    setIsLoading(false);

    if (result.success && result.session_id) {
      setSessionId(result.session_id);
      setMaskedMobile(result.masked_mobile || mobileOrEmail);
      setDemoOtpCode(result.demo_otp || "");
      setOtpSent(true);
      setResendTimer(60);
      setSuccessMsg(`OTP sent to WhatsApp ${result.masked_mobile || ""}`);
    } else {
      setError(result.error || "Failed to dispatch WhatsApp OTP. Please try again.");
    }
  };

  // Verify WhatsApp OTP Handler
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!otpCode.trim() || otpCode.trim().length < 4) {
      setError("Please enter the complete 6-digit WhatsApp OTP.");
      return;
    }

    setIsLoading(true);
    const result = await verifyWhatsAppOtp(sessionId, otpCode.trim());
    setIsLoading(false);

    if (result.success) {
      router.replace("/dashboard");
    } else {
      setError(result.error || "Invalid OTP code entered. Please try again.");
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F5F6FA] text-[#1F2937] flex flex-col justify-between relative selection:bg-[#94003A] selection:text-white font-sans">
      
      {/* ── Top Header Navigation Bar ── */}
      <header className="w-full px-4 sm:px-8 py-3.5 flex items-center justify-between z-20 border-b border-[#E5E7EB] bg-white shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#94003A] text-[#E7B631] flex items-center justify-center font-bold shadow-md">
            <Network className="w-5 h-5 text-[#E7B631]" />
          </div>
          <div>
            <div className="font-black text-sm sm:text-base tracking-tight flex items-center gap-1.5">
              <span className="text-[#94003A]">Pay2Pay</span>
              <span className="text-[#E7B631] font-extrabold">Sales Portal</span>
            </div>
            <div className="text-[10px] text-[#6B7280] font-medium tracking-wide">
              Tenant Hierarchy & Field Force Management
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F8E6EE] border border-pink-200 text-[#94003A] text-[11px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-[#94003A]" />
            <span className="hidden sm:inline">Tenant Isolated</span>
            <span className="sm:hidden">Secured</span>
          </div>
        </div>
      </header>

      {/* ── Main Portal Split Layout ── */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 z-10 max-w-[1500px] w-full mx-auto">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          
          {/* ─────────────────────────────────────────────────────────────
              LEFT HERO PANEL: Hierarchy Features & Maroon+Gold Branding
             ───────────────────────────────────────────────────────────── */}
          <div className="hidden lg:flex lg:col-span-7 flex-col justify-center space-y-6 pr-4">
            
            {/* Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F8E6EE] border border-pink-200 text-[#94003A] text-xs font-bold uppercase tracking-wider w-fit shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#94003A]" />
              <span>Dedicated Field Force Management</span>
            </div>

            {/* Maroon + Gold Heading */}
            <div className="space-y-2.5">
              <h1 className="text-3xl xl:text-4xl font-black tracking-tight leading-[1.2] text-[#1F2937]">
                Empower your <span className="text-[#94003A]">Sales Force</span> & Manage Distribution
              </h1>
              <p className="text-sm text-[#4B5563] leading-relaxed">
                Seamlessly onboard merchant partners, manage multi-tier hierarchical distribution networks, and track live POS swipe settlements in real-time.
              </p>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-2 gap-3.5 pt-1">
              <div className="p-3.5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs flex items-start gap-3">
                <div className="p-2 rounded-xl bg-[#F8E6EE] text-[#94003A] shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#1F2937]">Strict Tenant Scoping</h4>
                  <p className="text-[11px] text-[#6B7280] mt-0.5">Isolated distribution hierarchy</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs flex items-start gap-3">
                <div className="p-2 rounded-xl bg-[#FEF3C7] text-[#D97706] shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#1F2937]">3-Tier Network Tree</h4>
                  <p className="text-[11px] text-[#6B7280] mt-0.5">Super Dist &rarr; Dist &rarr; Retailer</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs flex items-start gap-3">
                <div className="p-2 rounded-xl bg-[#DCFCE7] text-[#16A34A] shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#1F2937]">POS MDR Management</h4>
                  <p className="text-[11px] text-[#6B7280] mt-0.5">Hardware tracking & commission</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs flex items-start gap-3">
                <div className="p-2 rounded-xl bg-[#DBEAFE] text-[#2563EB] shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#1F2937]">Instant WhatsApp OTP</h4>
                  <p className="text-[11px] text-[#6B7280] mt-0.5">Zero-latency secure login</p>
                </div>
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              RIGHT PANEL: White Surface Login Form in Maroon + Gold
             ───────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-5 w-full">
            <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
              
              {/* Header Title */}
              <div className="mb-6 text-center lg:text-left">
                <h2 className="text-2xl font-black text-[#1F2937] tracking-tight">
                  Sign In to Sales Portal
                </h2>
                <p className="text-xs text-[#6B7280] mt-1">
                  Enter your credentials or authenticate via WhatsApp OTP
                </p>
              </div>

              {/* Authentication Mode Switcher Tabs: 1. Password, 2. WhatsApp OTP */}
              <div className="flex items-center p-1 bg-[#F5F6FA] border border-[#E5E7EB] rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("PASSWORD");
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    authMode === "PASSWORD"
                      ? "bg-[#94003A] text-white shadow-sm"
                      : "text-[#6B7280] hover:text-[#1F2937]"
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Password</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("WHATSAPP_OTP");
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    authMode === "WHATSAPP_OTP"
                      ? "bg-[#94003A] text-white shadow-sm"
                      : "text-[#6B7280] hover:text-[#1F2937]"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp OTP</span>
                </button>
              </div>

              {/* Error & Success Messages */}
              {error && (
                <div className="p-3 mb-5 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B] text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 mb-5 rounded-xl bg-[#DCFCE7] border border-[#86EFAC] text-[#166534] text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* ── 1. PASSWORD AUTHENTICATION (DEFAULT) ── */}
              {authMode === "PASSWORD" && (
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#374151] mb-1.5">
                      Registered Mobile / Email / User ID
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="Enter registered mobile, email or user ID"
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#D1D5DB] rounded-xl text-xs text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#94003A] focus:ring-2 focus:ring-[#F8E6EE] transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#374151] mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#D1D5DB] rounded-xl text-xs text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#94003A] focus:ring-2 focus:ring-[#F8E6EE] transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#374151] cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-xl bg-[#94003A] hover:bg-[#78002F] text-white font-bold text-xs shadow-md shadow-pink-900/20 flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <>
                        <span>Sign In with Password</span>
                        <ArrowRight className="w-4 h-4 text-[#E7B631]" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* ── 2. WHATSAPP OTP AUTHENTICATION ── */}
              {authMode === "WHATSAPP_OTP" && (
                <div className="space-y-4">
                  {!otpSent ? (
                    <form onSubmit={handleSendOtp} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-[#374151] mb-1.5">
                          Registered Mobile Number
                        </label>
                        <div className="relative">
                          <Smartphone className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            required
                            value={mobileOrEmail}
                            onChange={(e) => setMobileOrEmail(e.target.value)}
                            placeholder="Enter 10-digit mobile number"
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#D1D5DB] rounded-xl text-xs text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#94003A] focus:ring-2 focus:ring-[#F8E6EE] transition"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 rounded-xl bg-[#94003A] hover:bg-[#78002F] text-white font-bold text-xs shadow-md shadow-pink-900/20 flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                      >
                        {isLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        ) : (
                          <>
                            <span>Send WhatsApp OTP</span>
                            <ArrowRight className="w-4 h-4 text-[#E7B631]" />
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-[#374151]">
                            Enter 6-Digit WhatsApp OTP
                          </label>
                          <span className="text-[11px] text-[#6B7280]">
                            Sent to {maskedMobile}
                          </span>
                        </div>
                        <input
                          type="text"
                          maxLength={6}
                          required
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          placeholder="••••••"
                          className="w-full py-2.5 px-4 bg-white border border-[#D1D5DB] rounded-xl text-center text-lg font-mono font-bold tracking-widest text-[#1F2937] focus:outline-none focus:border-[#94003A] focus:ring-2 focus:ring-[#F8E6EE] transition"
                        />
                      </div>

                      {demoOtpCode && (
                        <div className="p-2.5 bg-[#FEF3C7] border border-[#FCD34D] rounded-xl text-xs flex items-center justify-between">
                          <span className="text-[#92400E]">Demo Test OTP: <strong>{demoOtpCode}</strong></span>
                          <button
                            type="button"
                            onClick={() => setOtpCode(demoOtpCode)}
                            className="px-2 py-0.5 bg-[#D97706] text-white rounded text-[10px] font-bold cursor-pointer"
                          >
                            Autofill
                          </button>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 rounded-xl bg-[#E7B631] hover:bg-[#D3A51F] text-[#1F2937] font-extrabold text-xs shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                      >
                        {isLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-[#1F2937]" />
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-[#94003A]" />
                            <span>Verify & Enter Dashboard</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <button
                          type="button"
                          onClick={() => setOtpSent(false)}
                          className="text-[#6B7280] hover:text-[#1F2937] underline cursor-pointer"
                        >
                          Change Number
                        </button>
                        <button
                          type="button"
                          disabled={resendTimer > 0 || isLoading}
                          onClick={() => handleSendOtp()}
                          className="text-[#94003A] font-bold disabled:text-gray-400 cursor-pointer"
                        >
                          {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="w-full py-3 px-4 sm:px-8 border-t border-[#E5E7EB] bg-white text-center text-xs text-[#6B7280]">
        Pay2Pay Financial Technologies Pvt Ltd · Sales Portal & Hierarchy Suite
      </footer>
    </div>
  );
}
