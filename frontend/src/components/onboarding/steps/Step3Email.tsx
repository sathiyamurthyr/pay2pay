"use client";

import React, { useState } from "react";
import { Mail, ArrowRight, Loader2, AlertCircle } from "lucide-react";

interface Step3Props {
  registrationId: string;
  onSuccess: (email: string) => void;
}

export const Step3Email: React.FC<Step3Props> = ({ registrationId, onSuccess }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!clean.includes("@") || !clean.includes(".")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setErrorMsg("");
    setLoading(true);

    const targetRegId = registrationId || (typeof window !== "undefined" ? (localStorage.getItem("pay2pay_reg_id") || localStorage.getItem("pay2pay_reg_mobile") || "") : "");

    try {
      const res = await fetch("/api/v1/onboarding/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: targetRegId, email: clean })
      });
      const data = await res.json().catch(() => ({}));
      setLoading(false);

      if (res.ok && data.status === "SUCCESS") {
        if (typeof window !== "undefined") {
          localStorage.setItem("pay2pay_reg_email", clean);
        }
        onSuccess(clean);
      } else {
        setErrorMsg(data.message || data.detail || "Failed to dispatch email verification code.");
      }
    } catch {
      setLoading(false);
      setErrorMsg("Unable to dispatch email verification code. Please check your connection.");
    }
  };

  return (
    <div className="space-y-5 select-none">
      <div className="text-center">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Verify Email Address
        </h2>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
          Provide your business email for official notices & statements.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Email Address <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrorMsg("");
              }}
              placeholder="retailer@pay2pay.in"
              required
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !email.includes("@")}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-extrabold shadow-lg shadow-blue-600/25 hover:from-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Sending Email OTP...</span>
            </>
          ) : (
            <>
              <span>Continue & Send Email OTP</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
