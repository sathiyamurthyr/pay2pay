"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ShieldAlert, ArrowLeft } from "lucide-react";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setTokenError("This password reset link has expired. Please request a new password reset link.");
        setVerifying(false);
        return;
      }

      try {
        const envUrl = process.env.NEXT_PUBLIC_API_URL || "";
        const baseUrl = envUrl ? (envUrl.endsWith("/api/v1") ? envUrl : `${envUrl.replace(/\/+$/, "")}/api/v1`) : "/api/v1";
        const res = await fetch(`${baseUrl}/auth/enterprise/password-reset/verify?token=${encodeURIComponent(token)}`);
        
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "This password reset link has expired. Please request a new password reset link.");
        }

        const data = await res.json();
        if (data.valid || data.status === "VALID") {
          setTokenValid(true);
        } else {
          setTokenError(data.message || "This password reset link has expired. Please request a new password reset link.");
        }
      } catch (err: any) {
        setTokenError(err.message || "This password reset link has expired. Please request a new password reset link.");
      } finally {
        setVerifying(false);
      }
    }

    verifyToken();
  }, [token]);

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "", color: "bg-slate-800" };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    switch (score) {
      case 1:
        return { score: 25, label: "Weak", color: "bg-rose-500" };
      case 2:
        return { score: 50, label: "Fair", color: "bg-amber-500" };
      case 3:
        return { score: 75, label: "Strong", color: "bg-emerald-500" };
      case 4:
        return { score: 100, label: "Enterprise Grade", color: "bg-blue-500" };
      default:
        return { score: 0, label: "", color: "bg-slate-800" };
    }
  };

  const strength = getPasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (newPassword.length < 8) {
      setSubmitError("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setSubmitError("New password and confirm password do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const envUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const baseUrl = envUrl ? (envUrl.endsWith("/api/v1") ? envUrl : `${envUrl.replace(/\/+$/, "")}/api/v1`) : "/api/v1";
      const res = await fetch(`${baseUrl}/auth/enterprise/password-reset/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token,
          new_password: newPassword
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Unable to reset password. Please try again.");
      }

      setSuccessMsg("Password updated successfully. Please sign in using your new password.");

      setTimeout(() => {
        router.push("/retailer/login?reset=success");
      }, 2500);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to update password.");
    } finally {
      setSubmitting(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#090d16] text-white">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          <p className="text-sm font-medium text-slate-400">Verifying secure password reset token...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#090d16] text-white">
        <div className="w-full max-w-md p-8 rounded-2xl shadow-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl text-center space-y-6">
          <div className="inline-flex w-14 h-14 rounded-full bg-rose-500/10 text-rose-400 items-center justify-center border border-rose-500/20">
            <ShieldAlert className="w-7 h-7" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Link Expired or Invalid</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {tokenError || "This password reset link has expired. Please request a new password reset link."}
            </p>
          </div>

          <Link href="/forgot-password" className="block w-full">
            <button
              type="button"
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition shadow-lg shadow-blue-600/25"
            >
              Request New Link
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#090d16] text-white">
      <div className="w-full max-w-md p-8 rounded-2xl shadow-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl">
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-blue-600/20 text-blue-400 items-center justify-center mb-4 border border-blue-500/20">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Create New Password</h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Enter a strong new password for your Pay2Pay account
          </p>
        </div>

        {submitError && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center text-xs text-rose-400">
            <AlertCircle className="w-4 h-4 mr-2.5 flex-shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {successMsg ? (
          <div className="text-center py-4 space-y-4">
            <div className="inline-flex w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 items-center justify-center border border-emerald-500/20">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <p className="text-sm font-semibold text-emerald-400">{successMsg}</p>
            <p className="text-xs text-slate-400">Redirecting to Sign In...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-4 pr-11 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {newPassword && (
                <div className="mt-2.5 space-y-1.5">
                  <div className="flex justify-between items-center text-[11px] font-medium text-slate-400">
                    <span>Password Strength</span>
                    <span className="font-semibold text-slate-200">{strength.label}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${strength.color} transition-all duration-300`}
                      style={{ width: `${strength.score}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Confirm New Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm transition shadow-lg shadow-blue-600/25 flex items-center justify-center"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating Password...
                </>
              ) : (
                "Update Password"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#090d16] text-white">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
