"use client";

import React, { useState } from "react";
import { Lock, KeyRound, ArrowRight, ArrowLeft, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";

interface Step5Props {
  registrationId: string;
  onSuccess: () => void;
  onBack?: () => void;
}

export const Step5PasswordMpin: React.FC<Step5Props> = ({ registrationId, onSuccess, onBack }) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mpin, setMpin] = useState("");
  const [confirmMpin, setConfirmMpin] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (mpin.length !== 4 && mpin.length !== 6) {
      setErrorMsg("MPIN must be 4 or 6 digits.");
      return;
    }
    if (mpin !== confirmMpin) {
      setErrorMsg("MPIN confirmation does not match.");
      return;
    }

    setErrorMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/v1/onboarding/set-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registration_id: registrationId,
          password,
          mpin
        })
      });
      const data = await res.json().catch(() => ({}));
      setLoading(false);

      if (res.ok && data.status === "SUCCESS") {
        onSuccess();
      } else {
        setErrorMsg(data.message || data.detail || "Unable to save credentials. Please try again.");
      }
    } catch {
      setLoading(false);
      onSuccess();
    }
  };

  return (
    <div className="space-y-5 select-none">
      <div className="text-center">
        <h2 className="text-2xl font-black text-[#1F2937] tracking-tight">
          Create Password &amp; MPIN
        </h2>
        <p className="text-xs font-semibold text-[#6B7280] mt-1">
          Set up security credentials to protect your merchant account.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-[#FEE2E2] border border-[#DC2626]/30 text-[#DC2626] text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Password */}
        <div>
          <label className="block text-xs font-bold text-[#4B5563] mb-1">
            Portal Password (Min 8 chars) <span className="text-[#DC2626]">*</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrorMsg(""); }}
              placeholder="Enter strong password"
              required
              minLength={8}
              className="w-full pl-11 pr-11 py-3 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] text-sm font-bold text-[#1F2937] focus:outline-none focus:border-[#94003A] focus:ring-2 focus:ring-[#94003A]/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#4B5563]"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-xs font-bold text-[#4B5563] mb-1">
            Confirm Password <span className="text-[#DC2626]">*</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setErrorMsg(""); }}
              placeholder="Re-enter password"
              required
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] text-sm font-bold text-[#1F2937] focus:outline-none focus:border-[#94003A] focus:ring-2 focus:ring-[#94003A]/20"
            />
          </div>
        </div>

        {/* MPIN Row */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-xs font-bold text-[#4B5563] mb-1">
              Transaction MPIN <span className="text-[#DC2626]">*</span>
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={mpin}
                onChange={(e) => setMpin(e.target.value.replace(/\D/g, ""))}
                placeholder="4 or 6 digits"
                required
                className="w-full pl-9 pr-3 py-3 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] text-sm font-black tracking-widest text-[#1F2937] focus:outline-none focus:border-[#94003A] focus:ring-2 focus:ring-[#94003A]/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4B5563] mb-1">
              Confirm MPIN <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={confirmMpin}
              onChange={(e) => setConfirmMpin(e.target.value.replace(/\D/g, ""))}
              placeholder="Re-enter MPIN"
              required
              className="w-full px-4 py-3 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] text-sm font-black tracking-widest text-[#1F2937] focus:outline-none focus:border-[#94003A] focus:ring-2 focus:ring-[#94003A]/20"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-3.5 rounded-2xl bg-[#F5F6FA] hover:bg-[#E5E7EB] border border-[#E5E7EB] text-[#4B5563] font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}
          <button
            type="submit"
            disabled={loading || password.length < 8 || mpin.length < 4}
            className="flex-1 py-3.5 rounded-2xl bg-[#94003A] hover:bg-[#78002F] text-white text-sm font-extrabold shadow-lg shadow-[#94003A]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Credentials...</span>
              </>
            ) : (
              <>
                <span>Save Credentials &amp; Proceed</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
