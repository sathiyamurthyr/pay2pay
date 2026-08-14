"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Phone, ArrowLeft, CheckCircle2, RefreshCw, AlertCircle, Loader2, ShieldCheck } from "lucide-react";

export default function ForgotPasswordPage() {
  const [mobileNumber, setMobileNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("sa*****@gmail.com");
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (submitted && resendTimer > 0) {
      setCanResend(false);
      timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [submitted, resendTimer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawDigits = mobileNumber.replace(/\D/g, "");
    if (rawDigits.length < 10) {
      setErrorMsg("Please enter a valid 10-digit retailer mobile number.");
      return;
    }

    const cleanMobile = rawDigits.length >= 10 ? rawDigits.slice(-10) : rawDigits;

    setErrorMsg("");
    setLoading(true);

    try {
      const envUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const baseUrl = envUrl ? (envUrl.endsWith("/api/v1") ? envUrl : `${envUrl.replace(/\/+$/, "")}/api/v1`) : "/api/v1";
      const res = await fetch(`${baseUrl}/auth/enterprise/password-reset/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile_number: cleanMobile,
          tenant_id: "00000000-0000-0000-0000-000000000001",
          company_id: "PAY2PAY-ENTERPRISE"
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Unable to process password reset request.");
      }

      const data = await res.json();
      if (data.masked_email) {
        setMaskedEmail(data.masked_email);
      } else {
        setMaskedEmail("sa*****@gmail.com");
      }

      setSubmitted(true);
      setResendTimer(60);
      setCanResend(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Unable to send password reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    if (!canResend) return;
    setResendTimer(60);
    setCanResend(false);
    handleSubmit(new Event("submit") as any);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#090d16] text-white">
      <div className="w-full max-w-md p-8 rounded-2xl shadow-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl">
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-blue-600/20 text-blue-400 items-center justify-center mb-4 border border-blue-500/20">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Forgot Password</h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Reset your password securely using your registered account
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center text-xs text-rose-400">
            <AlertCircle className="w-4 h-4 mr-2.5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {submitted ? (
          <div className="text-center py-2 space-y-6">
            <div className="inline-flex w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 items-center justify-center border border-emerald-500/20">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white">Password Reset Link Sent</h3>
              <div className="text-xs text-slate-300 space-y-3 text-left bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 leading-relaxed">
                <p>
                  A password reset link has been sent to{" "}
                  <strong className="text-blue-400 font-mono font-bold tracking-wide">{maskedEmail}</strong>
                </p>
                <p>
                  Please check your Inbox and Spam/Junk folder.
                </p>
                <p className="text-amber-400 font-medium text-[11px] flex items-center pt-2 border-t border-slate-800/60">
                  ⏱ The link expires in 30 minutes.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Link href="/retailer/login" className="block w-full">
                <button
                  type="button"
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition shadow-lg shadow-blue-600/25"
                >
                  Back to Login
                </button>
              </Link>

              <button
                type="button"
                onClick={handleResend}
                disabled={!canResend}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold border transition flex items-center justify-center ${
                  canResend
                    ? "border-slate-700 bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
                    : "border-slate-800/50 bg-slate-900/50 text-slate-500 cursor-not-allowed"
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-2 ${!canResend ? "animate-spin" : ""}`} />
                {canResend ? "Resend Link" : `Resend Link (${resendTimer}s)`}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Retailer Mobile Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm font-semibold">
                  +91
                </div>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="Enter 10-digit mobile number"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ""))}
                  className="w-full pl-12 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm transition shadow-lg shadow-blue-600/25 flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validating Mobile...
                </>
              ) : (
                "Reset Password"
              )}
            </button>

            <div className="text-center pt-2">
              <Link href="/retailer/login" className="inline-flex items-center text-xs text-slate-400 hover:text-white transition font-medium">
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
