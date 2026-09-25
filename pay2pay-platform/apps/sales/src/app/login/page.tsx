"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSalesAuth } from "@/lib/auth";
import {
  Lock, Mail, ShieldCheck, ArrowRight, RefreshCw, AlertCircle,
  Sparkles, Network, Eye, EyeOff, Smartphone, MessageSquare,
  QrCode, TrendingUp, Layers, CheckCircle2, PhoneCall, HelpCircle
} from "lucide-react";

export default function SalesLoginPage() {
  const router = useRouter();
  const { login, sendWhatsAppOtp, verifyWhatsAppOtp, user } = useSalesAuth();

  // Auth Modes: 'PASSWORD' | 'WHATSAPP_OTP'
  const [authMode, setAuthMode] = useState<"WHATSAPP_OTP" | "PASSWORD">("WHATSAPP_OTP");

  // Password Login State
  const [identifier, setIdentifier] = useState("sales@pay2pay.in");
  const [password, setPassword] = useState("Sales@12345");
  const [showPassword, setShowPassword] = useState(false);

  // WhatsApp OTP State
  const [mobileOrEmail, setMobileOrEmail] = useState("9876543210");
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
    setIsLoading(true);

    const result = await login(identifier, password);
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
    <div className="min-h-screen w-full bg-[#070b14] text-slate-100 flex flex-col justify-between relative overflow-x-hidden selection:bg-amber-500 selection:text-slate-950 font-sans">
      
      {/* ── Background Ambient Glows & Glass Grid ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-96 md:w-[500px] h-96 md:h-[500px] bg-amber-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 right-0 w-80 md:w-[450px] h-80 md:h-[450px] bg-yellow-500/10 rounded-full blur-[160px]" />
        <div className="absolute -bottom-24 left-1/3 w-96 md:w-[500px] h-96 md:h-[500px] bg-amber-600/10 rounded-full blur-[150px]" />

        {/* Fine Matrix Pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #f59e0b 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* ── Top Header Navigation Bar ── */}
      <header className="w-full px-4 sm:px-8 py-3.5 flex items-center justify-between z-20 border-b border-white/5 bg-slate-950/40 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 p-[1px] shadow-lg shadow-amber-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-[#0c1220] rounded-[11px] flex items-center justify-center overflow-hidden p-1.5">
              <Image
                src="/images/logo_transparent.png"
                alt="Pay2Pay"
                width={36}
                height={36}
                className="object-contain"
                onError={(e) => {
                  // fallback if image not found
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
              <Network className="w-5 h-5 text-amber-400 hidden" />
            </div>
          </div>
          <div>
            <div className="font-black text-sm sm:text-base tracking-tight flex items-center gap-1.5">
              <span className="text-white">Pay2Pay</span>
              <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent font-extrabold">
                Sales Portal
              </span>
            </div>
            <div className="text-[10px] text-amber-200/60 font-medium tracking-wide">
              Tenant Hierarchy & Field Force Suite
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] font-semibold backdrop-blur-md">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Strict Tenant Isolation</span>
            <span className="sm:hidden">Secured</span>
          </div>
        </div>
      </header>

      {/* ── Main Portal Split Layout ── */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10 z-10">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* ─────────────────────────────────────────────────────────────
              LEFT HERO PANEL: Hierarchy Features & Gold-Yellow Typography
             ───────────────────────────────────────────────────────────── */}
          <div className="hidden lg:flex lg:col-span-7 flex-col justify-center space-y-7 pr-4">
            
            {/* Enterprise Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/10 via-yellow-500/15 to-transparent border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider w-fit shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Dedicated Field Force Management</span>
            </div>

            {/* Gold-Yellow Gradient Hero Heading */}
            <div className="space-y-3">
              <h1 className="text-4xl xl:text-5xl font-black tracking-tight leading-[1.15] text-white">
                Powering Field Operations with{" "}
                <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent drop-shadow-sm">
                  Tenant-Isolated
                </span>{" "}
                Network Intelligence.
              </h1>
              <p className="text-slate-300/80 text-sm xl:text-base leading-relaxed max-w-xl">
                Real-time visibility into your designated <strong className="text-amber-300">Super Distributor &rarr; Distributor &rarr; Retailer</strong> hierarchy, POS terminal telemetry, and dynamic MDR configuration with zero cross-tenant data leakage.
              </p>
            </div>

            {/* Glassmorphic Feature Badges */}
            <div className="grid grid-cols-2 gap-3.5 pt-1">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-amber-500/20 backdrop-blur-xl shadow-lg shadow-black/40 hover:border-amber-500/40 transition-all duration-200 space-y-1">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <Network className="w-4 h-4" />
                  <span>Hierarchy Lineage</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Strict mapped scope covering Super Distributors, Distributors & Retailers.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-amber-500/20 backdrop-blur-xl shadow-lg shadow-black/40 hover:border-amber-500/40 transition-all duration-200 space-y-1">
                <div className="flex items-center gap-2 text-yellow-400 font-bold text-xs">
                  <QrCode className="w-4 h-4" />
                  <span>POS & Dynamic MDR</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Live machine tracking and granular Visa, Mastercard, RuPay & Amex slabs.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-amber-500/20 backdrop-blur-xl shadow-lg shadow-black/40 hover:border-amber-500/40 transition-all duration-200 space-y-1">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                  <TrendingUp className="w-4 h-4" />
                  <span>Financial Transactions</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Instant transaction summaries across POS, DMT, AEPS, BBPS & Payouts.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-amber-500/20 backdrop-blur-xl shadow-lg shadow-black/40 hover:border-amber-500/40 transition-all duration-200 space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Backend SQL Isolation</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Enforced at database and API layers with tamper-proof tenant constraints.
                </p>
              </div>
            </div>

            {/* Direct WhatsApp Security Note */}
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 text-emerald-300 text-xs">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-[11px] leading-tight">
                <strong className="text-emerald-300 font-bold">Fast WhatsApp OTP Sign In:</strong>{" "}
                <span className="text-emerald-200/80">Log in securely without memorizing complex passwords via WhatsApp Cloud verification.</span>
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              RIGHT CARD: Glassmorphic Auth Panel (Mobile & Web Optimized)
             ───────────────────────────────────────────────────────────── */}
          <div className="w-full lg:col-span-5">
            <div className="relative rounded-3xl bg-slate-900/80 backdrop-blur-2xl border border-amber-500/30 p-6 sm:p-8 shadow-2xl shadow-black/80">
              
              {/* Top Golden Light Line Accent */}
              <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />

              {/* Card Brand Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 p-[1.5px] shadow-xl shadow-amber-500/20 mb-3.5">
                  <div className="w-full h-full bg-[#0c1220] rounded-[14px] flex items-center justify-center overflow-hidden p-2">
                    <Image
                      src="/images/logo_transparent.png"
                      alt="Pay2Pay Logo"
                      width={44}
                      height={44}
                      className="object-contain"
                      priority
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  </div>
                </div>
                
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-1.5">
                  <span>Sales Portal</span>
                  <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                    Login
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Authenticate to access your assigned tenant network
                </p>
              </div>

              {/* ── Auth Mode Switcher (Glassmorphic Tabs) ── */}
              <div className="grid grid-cols-2 p-1 rounded-2xl bg-black/40 border border-white/5 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("WHATSAPP_OTP");
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    authMode === "WHATSAPP_OTP"
                      ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md shadow-amber-500/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp OTP</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("PASSWORD");
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    authMode === "PASSWORD"
                      ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md shadow-amber-500/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Password</span>
                </button>
              </div>

              {/* Alert Feedback Messages */}
              {error && (
                <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <div className="leading-tight">
                    <span className="font-semibold text-rose-200">Authentication Alert: </span>
                    {error}
                  </div>
                </div>
              )}

              {successMsg && (
                <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  <div className="leading-tight font-medium">
                    {successMsg}
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  MODE 1: WHATSAPP OTP LOGIN
                 ───────────────────────────────────────────────────────────── */}
              {authMode === "WHATSAPP_OTP" && (
                <div>
                  {!otpSent ? (
                    <form onSubmit={handleSendOtp} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-amber-300/90 mb-1.5">
                          Registered Mobile or Email
                        </label>
                        <div className="relative">
                          <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/70" />
                          <input
                            type="text"
                            value={mobileOrEmail}
                            onChange={(e) => setMobileOrEmail(e.target.value)}
                            placeholder="e.g. 9876543210 or sales@pay2pay.in"
                            required
                            className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 focus:border-amber-400 rounded-2xl text-xs sm:text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400/20 transition font-medium"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 active:scale-[0.99] text-slate-950 text-xs sm:text-sm font-black rounded-2xl shadow-xl shadow-amber-500/20 hover:shadow-amber-500/30 transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                            <span>Sending WhatsApp OTP...</span>
                          </>
                        ) : (
                          <>
                            <MessageSquare className="w-4 h-4 text-slate-950" />
                            <span>Get WhatsApp OTP Code</span>
                            <ArrowRight className="w-4 h-4 text-slate-950" />
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold uppercase tracking-wider text-amber-300/90">
                            Enter 6-Digit WhatsApp OTP
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setOtpSent(false);
                              setOtpCode("");
                            }}
                            className="text-[11px] text-slate-400 hover:text-amber-300 underline"
                          >
                            Change Number
                          </button>
                        </div>

                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/70" />
                          <input
                            type="text"
                            maxLength={6}
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                            placeholder="• • • • • •"
                            required
                            autoFocus
                            className="w-full pl-10 pr-4 py-3 bg-black/50 border border-amber-500/50 focus:border-amber-400 rounded-2xl text-center tracking-[0.4em] text-lg text-amber-300 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition font-mono font-bold"
                          />
                        </div>

                        {demoOtpCode && (
                          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 bg-amber-500/5 border border-amber-500/20 px-3 py-1.5 rounded-xl">
                            <span>Test Code: <strong className="text-amber-300 font-mono font-bold">{demoOtpCode}</strong></span>
                            <button
                              type="button"
                              onClick={() => setOtpCode(demoOtpCode)}
                              className="text-amber-400 hover:underline font-bold"
                            >
                              Auto-Fill OTP
                            </button>
                          </div>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading || otpCode.length < 4}
                        className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 active:scale-[0.99] text-slate-950 text-xs sm:text-sm font-black rounded-2xl shadow-xl shadow-amber-500/20 hover:shadow-amber-500/30 transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                            <span>Verifying Credentials...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-slate-950" />
                            <span>Verify & Enter Sales Portal</span>
                          </>
                        )}
                      </button>

                      {/* Resend Timer */}
                      <div className="text-center pt-1">
                        {resendTimer > 0 ? (
                          <span className="text-[11px] text-slate-500">
                            Resend code in <strong className="text-slate-400">{resendTimer}s</strong>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSendOtp()}
                            disabled={isLoading}
                            className="text-[11px] text-amber-400 hover:underline font-semibold"
                          >
                            Resend WhatsApp Code
                          </button>
                        )}
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  MODE 2: PASSWORD LOGIN
                 ───────────────────────────────────────────────────────────── */}
              {authMode === "PASSWORD" && (
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  {/* Email / Identifier */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-amber-300/90 mb-1.5">
                      Email or Employee Code
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/70" />
                      <input
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="sales@pay2pay.in"
                        required
                        autoComplete="username"
                        className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 focus:border-amber-400 rounded-2xl text-xs sm:text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400/20 transition font-medium"
                      />
                    </div>
                  </div>

                  {/* Password with Show/Hide Toggle */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-amber-300/90 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/70" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                        autoComplete="current-password"
                        className="w-full pl-10 pr-10 py-3 bg-black/50 border border-white/10 focus:border-amber-400 rounded-2xl text-xs sm:text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400/20 transition font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-amber-300 transition"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 active:scale-[0.99] text-slate-950 text-xs sm:text-sm font-black rounded-2xl shadow-xl shadow-amber-500/20 hover:shadow-amber-500/30 transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                        <span>Verifying Scope...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In with Password</span>
                        <ArrowRight className="w-4 h-4 text-slate-950" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* ── Demo Account Quick Selection ── */}
              <div className="mt-5 p-3.5 rounded-2xl bg-black/40 border border-white/10 text-[11px] text-slate-400 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300">Demo Sales Accounts:</span>
                  <span className="text-[10px] text-slate-500">1-Click Login</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("PASSWORD");
                      setIdentifier("sales@pay2pay.in");
                      setPassword("Sales@12345");
                    }}
                    className="p-2 rounded-xl bg-white/[0.03] hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/30 text-left transition"
                  >
                    <div className="text-white font-semibold truncate">Vikram Rathore</div>
                    <div className="text-[10px] text-amber-400">All-Tenant Scope</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("PASSWORD");
                      setIdentifier("rajesh.sales@pay2pay.in");
                      setPassword("Sales@12345");
                    }}
                    className="p-2 rounded-xl bg-white/[0.03] hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/30 text-left transition"
                  >
                    <div className="text-white font-semibold truncate">Rajesh Sharma</div>
                    <div className="text-[10px] text-amber-400">Cluster Mapped</div>
                  </button>
                </div>
              </div>

              {/* Security Compliance Footer */}
              <div className="mt-4 text-center">
                <span className="text-[10px] text-slate-500 inline-flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Protected by 256-Bit TLS & Database-Enforced Tenant Guard
                </span>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="w-full px-4 sm:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between z-20 border-t border-white/5 bg-slate-950/40 backdrop-blur-md text-[11px] text-slate-500 gap-2 sm:gap-0">
        <div>
          &copy; {new Date().getFullYear()} Pay2Pay Network Services. All rights reserved.
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span>Enterprise Portal</span>
          <span>&bull;</span>
          <span>Security Protocol v2.8</span>
          <span>&bull;</span>
          <span className="text-amber-400 font-medium">Sales & Field Suite</span>
        </div>
      </footer>

    </div>
  );
}
