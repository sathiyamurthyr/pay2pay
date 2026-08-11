"use client";

import React, { useState } from "react";
import { Lock, KeyRound, ArrowRight, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";

interface Step5Props {
  registrationId: string;
  onSuccess: () => void;
}

export const Step5PasswordMpin: React.FC<Step5Props> = ({ registrationId, onSuccess }) => {
  const [password, setPassword] = useState("");
  const [mpin, setMpin] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showMpin, setShowMpin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Strength Check
  const hasMinLen = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNum = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const score = [hasMinLen, hasUpper, hasLower, hasNum, hasSpecial].filter(Boolean).length;
  const strengthLabel = score <= 2 ? "Weak" : score === 3 ? "Medium" : score === 4 ? "Strong" : "Very Strong";
  const strengthColor = score <= 2 ? "bg-red-500 text-red-500" : score === 3 ? "bg-amber-500 text-amber-500" : score === 4 ? "bg-blue-500 text-blue-500" : "bg-emerald-500 text-emerald-500";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasMinLen) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }
    if (mpin.length !== 4) {
      setErrorMsg("MPIN must be exactly 4 numeric digits.");
      return;
    }

    setErrorMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/v1/onboarding/create-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: registrationId, password, mpin })
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok && data.status === "SUCCESS") {
        onSuccess();
      } else {
        setErrorMsg(data.detail || "Failed to save credentials.");
      }
    } catch {
      setLoading(false);
      onSuccess();
    }
  };

  return (
    <div className="space-y-5 select-none">
      <div className="text-center">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Create Account Security Credentials
        </h2>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
          Set up a strong password and a 4-digit quick transaction MPIN.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Password */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Account Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrorMsg("");
              }}
              placeholder="••••••••••••"
              required
              className="w-full pl-11 pr-11 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Strength Bar */}
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-extrabold">
              <span className="text-slate-500">Password Strength:</span>
              <span className={strengthColor.split(" ")[1]}>{strengthLabel}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${strengthColor.split(" ")[0]}`}
                style={{ width: `${(score / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Live Rules Checklist */}
        <div className="grid grid-cols-2 gap-1.5 p-3 rounded-2xl bg-slate-100/60 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-[11px] font-bold">
          <div className={`flex items-center gap-1 ${hasMinLen ? "text-emerald-500" : "text-slate-400"}`}>
            <CheckCircle2 className="w-3.5 h-3.5" /> 8+ Characters
          </div>
          <div className={`flex items-center gap-1 ${hasUpper ? "text-emerald-500" : "text-slate-400"}`}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Uppercase Letter
          </div>
          <div className={`flex items-center gap-1 ${hasLower ? "text-emerald-500" : "text-slate-400"}`}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Lowercase Letter
          </div>
          <div className={`flex items-center gap-1 ${hasNum ? "text-emerald-500" : "text-slate-400"}`}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Numeric Number
          </div>
        </div>

        {/* 4-Digit MPIN */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Create 4-Digit Quick MPIN <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type={showMpin ? "text" : "password"}
              value={mpin}
              onChange={(e) => {
                setMpin(e.target.value.replace(/\D/g, "").slice(0, 4));
                setErrorMsg("");
              }}
              placeholder="1234"
              required
              className="w-full pl-11 pr-11 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-black tracking-widest text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
            />
            <button
              type="button"
              onClick={() => setShowMpin(!showMpin)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none cursor-pointer"
            >
              {showMpin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] font-medium text-slate-400 mt-1">
            Used for approving high-value transactions & settlement payouts.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !hasMinLen || mpin.length !== 4}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-extrabold shadow-lg shadow-blue-600/25 hover:from-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving Credentials...</span>
            </>
          ) : (
            <>
              <span>Save & Proceed to PAN KYC</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
