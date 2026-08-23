"use client";

import React, { useState } from "react";
import {
  CreditCard, ArrowRight, Loader2, AlertCircle,
  CheckCircle2, Building2, BadgeCheck, Hash, MapPin, ChevronRight
} from "lucide-react";

interface Step8Props {
  registrationId: string;
  initialName?: string;
  initialAccountNumber?: string;
  initialIfsc?: string;
  onSuccess: (bankData: any) => void;
  onBack?: () => void;
}

export const Step8Bank: React.FC<Step8Props> = ({
  registrationId,
  initialName = "",
  initialAccountNumber = "",
  initialIfsc = "",
  onSuccess,
  onBack
}) => {
  const [accountNumber, setAccountNumber] = useState(initialAccountNumber || "");
  const [ifsc, setIfsc] = useState(initialIfsc || "");
  const [name, setName] = useState(initialName || "");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [bankResult, setBankResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber || !ifsc || !name) {
      setErrorMsg("Please fill all required bank details.");
      return;
    }
    if (accountNumber.length < 9) {
      setErrorMsg("Please enter a valid bank account number (min 9 digits).");
      return;
    }
    if (ifsc.length !== 11) {
      setErrorMsg("IFSC code must be exactly 11 characters.");
      return;
    }

    setErrorMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/v1/onboarding/verify-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registration_id: registrationId,
          account_number: accountNumber.trim(),
          ifsc: ifsc.trim().toUpperCase(),
          name: name.trim()
        })
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok && data.status === "SUCCESS") {
        setBankResult(data);
      } else {
        setErrorMsg(data.detail || data.message || "Bank account verification failed. Please check your details.");
      }
    } catch {
      setLoading(false);
      setErrorMsg("Network error. Please check your connection and try again.");
    }
  };

  // ── Screen 2: Verified Success Card ──────────────────────────────────
  if (bankResult) {
    const masked = bankResult.account_number_masked || (accountNumber ? `XXXX-XXXX-${accountNumber.slice(-4)}` : "XXXX-XXXX");
    const bankName = bankResult.bank_name || "Verified Bank Account";
    const branch = bankResult.branch || "—";
    const beneName = bankResult.name_at_bank || (name ? name.toUpperCase() : "VERIFIED ACCOUNT HOLDER");
    const ifscCode = bankResult.ifsc || (ifsc ? ifsc.toUpperCase() : "—");
    const accType = bankResult.account_type || "SAVINGS";

    return (
      <div className="space-y-5 select-none">
        {/* Success Banner */}
        <div className="p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">
              ✅ Bank Account Verified Successfully
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-500 font-semibold mt-0.5">
              Reverse Penny Drop completed. Your settlement account is linked.
            </p>
          </div>
        </div>

        {/* Verified Bank Profile Card */}
        <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4">

          {/* Header: Bank Icon + Bank Name */}
          <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/10 dark:bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
              <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider">
                Verified Settlement Account
              </span>
              <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                {bankName}
              </h4>
              {branch !== "—" && (
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" /> {branch}
                </p>
              )}
            </div>
          </div>

          {/* Grid: Account Details */}
          <div className="grid grid-cols-2 gap-4 text-xs">

            {/* Beneficiary Name */}
            <div className="col-span-2">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-0.5">
                Beneficiary Name
              </span>
              <p className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                <BadgeCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                {beneName}
              </p>
            </div>

            {/* Masked Account Number */}
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-0.5">
                Account Number
              </span>
              <p className="font-mono font-black text-slate-900 dark:text-white tracking-wider flex items-center gap-1">
                <Hash className="w-3 h-3 text-slate-400" /> {masked}
              </p>
            </div>

            {/* IFSC */}
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-0.5">
                IFSC Code
              </span>
              <p className="font-mono font-black text-slate-900 dark:text-white tracking-wider">
                {ifscCode}
              </p>
            </div>

            {/* Account Type */}
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-0.5">
                Account Type
              </span>
              <p className="font-extrabold text-slate-800 dark:text-slate-200">
                {accType}
              </p>
            </div>

            {/* Verification Status */}
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-0.5">
                Status
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-black text-[10px] uppercase tracking-wider">
                <CheckCircle2 className="w-3 h-3" /> VERIFIED
              </span>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={() => onSuccess(bankResult)}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-extrabold shadow-lg shadow-blue-600/25 hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Continue to Shop Details</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // ── Screen 1: Input Form ──────────────────────────────────────────────
  return (
    <div className="space-y-5 select-none">
      <div className="text-center">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Settlement Bank Account Verification
        </h2>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
          Instant Cashfree Reverse Penny Drop Sync &amp; Bank Account Audit.
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
            Bank Account Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="bank_account_number"
            name="bank_account_number"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={accountNumber}
            onChange={(e) => { setAccountNumber(e.target.value.replace(/\D/g, "")); setErrorMsg(""); }}
            placeholder="Enter 9-18 digit account number"
            maxLength={18}
            required
            className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-black text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            IFSC Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="ifsc_code"
            name="ifsc_code"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={ifsc}
            onChange={(e) => { setIfsc(e.target.value.toUpperCase().slice(0, 11)); setErrorMsg(""); }}
            placeholder="e.g. SBIN0001234"
            maxLength={11}
            required
            className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-black uppercase text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Account Holder Name (Matching PAN) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="account_holder_name"
            name="account_holder_name"
            inputMode="text"
            autoComplete="name"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            value={name}
            onChange={(e) => { setName(e.target.value.toUpperCase()); setErrorMsg(""); }}
            placeholder="Enter account holder name as per bank records"
            required
            className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-bold uppercase text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !accountNumber || !ifsc || !name}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-extrabold shadow-lg shadow-blue-600/25 hover:from-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying via Cashfree Reverse Penny Drop...</span>
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              <span>Verify Bank &amp; Save Progress</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
