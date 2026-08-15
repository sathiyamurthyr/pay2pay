"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, ArrowRight, Loader2, AlertCircle, CheckCircle2, LogIn, RefreshCw, ShieldAlert, FileText } from "lucide-react";

interface Step1Props {
  onSuccess: (regId: string, mobile: string, isResumed: boolean, savedStep?: number) => void;
}

interface IncompleteRegistrationInfo {
  currentStep: number;
  nextStep: number;
  totalSteps: number;
  completedCount: number;
  completionPercent: number;
  currentStepName: string;
  nextRoute: string;
  token: string;
  maskedMobile: string;
}

export const Step1Mobile: React.FC<Step1Props> = ({ onSuccess }) => {
  const router = useRouter();
  const [mobileNumber, setMobileNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Dynamic Server-Resolved States
  const [activeAccountState, setActiveAccountState] = useState<boolean>(false);
  const [underReviewState, setUnderReviewState] = useState<boolean>(false);
  const [restrictedState, setRestrictedState] = useState<string | null>(null);
  const [incompleteState, setIncompleteState] = useState<IncompleteRegistrationInfo | null>(null);

  const handleValidateAndContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = mobileNumber.replace(/\D/g, "");
    if (clean.length !== 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number.");
      return;
    }

    setErrorMsg("");
    setActiveAccountState(false);
    setUnderReviewState(false);
    setRestrictedState(null);
    setIncompleteState(null);
    setLoading(true);

    try {
      // 1. PRE-OTP MOBILE VALIDATION (Read-Only Check from Server State Resolver)
      const valRes = await fetch("/api/v1/onboarding/validate-mobile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile_number: clean })
      });
      const valData = await valRes.json();
      setLoading(false);

      if (!valRes.ok || valData.status === "ERROR") {
        setErrorMsg(valData.message || "Unable to validate mobile number. Please try again.");
        return;
      }

      // STATE 1: APPROVED & ACTIVE RETAILER
      if (valData.flow === "LOGIN" || valData.state === "APPROVED_ACTIVE") {
        setActiveAccountState(true);
        return;
      }

      // STATE 2: ONBOARDING COMPLETED, PENDING ADMIN APPROVAL (UNDER REVIEW)
      if (valData.flow === "ACCOUNT_UNDER_REVIEW" || valData.state === "ONBOARDING_COMPLETED_PENDING_APPROVAL") {
        setUnderReviewState(true);
        return;
      }

      // STATE 3: RESTRICTED / SUSPENDED / REJECTED
      if (valData.flow === "RESTRICTED" || valData.flow === "REJECTED") {
        setRestrictedState(valData.message || "Your account is restricted. Please contact support.");
        return;
      }

      // STATE 4: EXISTING INCOMPLETE ONBOARDING (RESUME REGISTRATION)
      if (valData.flow === "RESUME_ONBOARDING" || valData.can_resume === true) {
        setIncompleteState({
          currentStep: valData.current_step || 3,
          nextStep: valData.next_step || valData.current_step || 3,
          totalSteps: valData.total_steps || 13,
          completedCount: valData.completed_count || 1,
          completionPercent: valData.completion_percent || 8,
          currentStepName: valData.current_step_name || "Email Address",
          nextRoute: valData.next_route || "/register/email",
          token: valData.validation_token,
          maskedMobile: valData.masked_mobile || `******${clean.slice(-4)}`
        });
        return;
      }

      // STATE 5: BRAND NEW MOBILE NUMBER
      if (valData.can_register === true && valData.validation_token) {
        await triggerSendOtp(clean, valData.validation_token, false, undefined);
        return;
      }

      setErrorMsg("Unable to determine mobile status. Please try again.");
    } catch {
      setLoading(false);
      setErrorMsg("Connection error. Please check your network and try again.");
    }
  };

  const triggerSendOtp = async (cleanMobile: string, token: string, isResumed: boolean, targetStep?: number) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const sendRes = await fetch("/api/v1/onboarding/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile_number: cleanMobile, validation_token: token })
      });
      const sendData = await sendRes.json();
      setLoading(false);

      if (sendRes.ok && sendData.status === "SUCCESS") {
        onSuccess(sendData.registration_id || `REG_${cleanMobile}`, cleanMobile, isResumed, targetStep);
      } else {
        setErrorMsg(sendData.message || sendData.detail || "Failed to dispatch OTP. Please try again.");
      }
    } catch {
      setLoading(false);
      setErrorMsg("Failed to dispatch OTP. Please try again.");
    }
  };

  // ── 1. INCOMPLETE REGISTRATION SCREEN (RESUME REGISTRATION) ──
  if (incompleteState) {
    return (
      <div className="space-y-6 select-none text-center py-3">
        <div className="mx-auto w-16 h-16 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-xl shadow-amber-500/10">
          <RefreshCw className="w-8 h-8 animate-spin-slow" />
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Registration In Progress
          </h2>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">
            Your retailer registration is not completed yet. Please continue your registration from where you left off.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Registered Mobile:</span>
            <span className="text-xs font-black text-slate-900 dark:text-white">{incompleteState.maskedMobile}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Registration Status:</span>
            <span className="text-xs font-extrabold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              In Progress
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Progress:</span>
            <span className="text-xs font-black text-blue-600 dark:text-blue-400">
              {incompleteState.completedCount} / {incompleteState.totalSteps} steps completed ({incompleteState.completionPercent}%)
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(incompleteState.completionPercent, 8)}%` }}
            />
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Current Step:</span>
            <span className="text-xs font-extrabold text-slate-900 dark:text-white">
              Step {incompleteState.currentStep}: {incompleteState.currentStepName}
            </span>
          </div>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => triggerSendOtp(mobileNumber.replace(/\D/g, ""), incompleteState.token, true, incompleteState.currentStep)}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-extrabold shadow-lg shadow-blue-600/25 hover:from-blue-700 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Dispatching OTP...</span>
            </>
          ) : (
            <>
              <span>Continue Registration</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="text-xs font-bold text-slate-500">
          Want to use a different number?{" "}
          <button
            type="button"
            onClick={() => {
              setIncompleteState(null);
              setMobileNumber("");
            }}
            className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            Change Mobile
          </button>
        </p>
      </div>
    );
  }

  // ── 2. ACCOUNT UNDER REVIEW SCREEN ──
  if (underReviewState) {
    return (
      <div className="space-y-6 select-none text-center py-3">
        <div className="mx-auto w-16 h-16 rounded-3xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500 shadow-xl shadow-blue-500/10">
          <FileText className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Application Under Review
          </h2>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">
            Your retailer registration and KYC documents have been submitted and are currently under compliance review.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-left space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Registered Mobile:</span>
            <span className="text-xs font-black text-slate-900 dark:text-white">+91 {mobileNumber}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Verification Status:</span>
            <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">Pending Review</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push("/retailer/account-under-review")}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-extrabold shadow-lg shadow-blue-600/25 hover:from-blue-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>View Application Status</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // ── 3. APPROVED & ACTIVE RETAILER SCREEN ──
  if (activeAccountState) {
    return (
      <div className="space-y-6 select-none text-center py-3">
        <div className="mx-auto w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-xl shadow-emerald-500/10">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Account Active
          </h2>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">
            Your retailer account is active and verified. Please login with OTP to access your business workstation.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-left space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Registered Mobile:</span>
            <span className="text-xs font-black text-slate-900 dark:text-white">+91 {mobileNumber}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Account Status:</span>
            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">Active & Permitted</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push("/retailer/login")}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-extrabold shadow-lg shadow-blue-600/25 hover:from-blue-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogIn className="w-4 h-4" />
          <span>Go to Retailer Login</span>
        </button>
      </div>
    );
  }

  // ── 4. RESTRICTED / REJECTED SCREEN ──
  if (restrictedState) {
    return (
      <div className="space-y-6 select-none text-center py-3">
        <div className="mx-auto w-16 h-16 rounded-3xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-500 shadow-xl shadow-red-500/10">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Account Restricted
          </h2>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">
            {restrictedState}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setRestrictedState(null);
            setMobileNumber("");
          }}
          className="w-full py-3.5 rounded-2xl bg-slate-800 text-white text-sm font-extrabold hover:bg-slate-700 transition-all cursor-pointer"
        >
          Try Another Number
        </button>
      </div>
    );
  }

  // ── 5. INITIAL MOBILE INPUT FORM ──
  return (
    <div className="space-y-5 select-none">
      <div className="text-center">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Create Your Retailer Account
        </h2>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
          Let&apos;s start with your 10-digit mobile number.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleValidateAndContinue} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Mobile Number <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
              +91
            </span>
            <input
              type="text"
              value={mobileNumber}
              onChange={(e) => {
                setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10));
                setErrorMsg("");
              }}
              placeholder="9876543210"
              required
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
            />
          </div>
          <p className="text-[11px] font-medium text-slate-400 mt-1">
            Exactly 10 numeric digits. No country codes or spaces.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || mobileNumber.length !== 10}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-extrabold shadow-lg shadow-blue-600/25 hover:from-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Validating Mobile...</span>
            </>
          ) : (
            <>
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
