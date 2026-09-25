"use client";

import React, { useState } from "react";
import {
  CreditCard,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Building2,
  BadgeCheck,
  Hash,
  MapPin,
  ChevronRight,
  Edit3,
  RotateCcw
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
  const [confirmAccountNumber, setConfirmAccountNumber] = useState(initialAccountNumber || "");
  const [ifsc, setIfsc] = useState(initialIfsc || "");
  const [name, setName] = useState(initialName || "");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [bankResult, setBankResult] = useState<any>(null);

  // Editable fields for verified screen
  const [editableBeneficiaryName, setEditableBeneficiaryName] = useState("");
  const [editableAccountType, setEditableAccountType] = useState("SAVINGS");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber || !ifsc || !name) {
      setErrorMsg("Please fill all required bank details.");
      return;
    }
    if (confirmAccountNumber && accountNumber !== confirmAccountNumber) {
      setErrorMsg("Account numbers do not match. Please verify.");
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
        setEditableBeneficiaryName(
          data.name_at_bank || (name ? name.toUpperCase() : "VERIFIED ACCOUNT HOLDER")
        );
        setEditableAccountType(data.account_type || "SAVINGS");
      } else {
        setErrorMsg(
          data.detail ||
            data.message ||
            "Bank account verification failed. Please check your account number and IFSC."
        );
      }
    } catch {
      setLoading(false);
      setErrorMsg("Network error. Please check your connection and try again.");
    }
  };

  const handleContinue = () => {
    const finalData = {
      ...(bankResult || {}),
      account_number: accountNumber.trim(),
      ifsc: ifsc.trim().toUpperCase(),
      name_at_bank: editableBeneficiaryName || name,
      account_type: editableAccountType
    };
    onSuccess(finalData);
  };

  // ── Screen 2: Verified Success Card with Editable Beneficiary Name ───────
  if (bankResult) {
    const masked =
      bankResult.account_number_masked ||
      (accountNumber ? `XXXX-XXXX-${accountNumber.slice(-4)}` : "XXXX-XXXX");
    const bankName = bankResult.bank_name || "Verified Bank Account";
    const branch = bankResult.branch || "—";
    const ifscCode = bankResult.ifsc || ifsc.toUpperCase();

    return (
      <div className="space-y-5 select-none font-sans">
        {/* Success Banner */}
        <div className="p-4 rounded-2xl bg-[#DCFCE7] border border-[#16A34A]/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#16A34A]/10 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-[#16A34A]" />
            </div>
            <div>
              <p className="text-sm font-black text-[#16A34A]">
                ✅ Bank Account Verified Successfully
              </p>
              <p className="text-xs text-[#16A34A] font-medium">
                Penny drop check completed & linked for settlement.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setBankResult(null)}
            className="px-3 py-1.5 rounded-xl bg-[#F5F6FA] hover:bg-[#E5E7EB] border border-[#E5E7EB] text-[#4B5563] font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3 h-3 text-[#6B7280]" />
            <span>Change</span>
          </button>
        </div>

        {/* Verified Bank Profile Card */}
        <div className="p-5 rounded-3xl bg-[#FAFAFC] border border-[#E5E7EB] space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[#E5E7EB]">
            <div className="w-12 h-12 rounded-2xl bg-[#F8E6EE] flex items-center justify-center shrink-0 border border-[#94003A]/20">
              <Building2 className="w-6 h-6 text-[#94003A]" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-[#94003A] tracking-wider">
                Settlement Account
              </span>
              <h4 className="text-base font-black text-[#1F2937]">
                {bankName}
              </h4>
              {branch !== "—" && (
                <p className="text-xs font-semibold text-[#6B7280] flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" /> {branch}
                </p>
              )}
            </div>
          </div>

          {/* Editable Textbox for Beneficiary Name */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider">
                  Beneficiary Name (Editable if Wrong)
                </label>
                <span className="text-[10px] font-bold text-[#94003A] flex items-center gap-1">
                  <Edit3 className="w-2.5 h-2.5" /> Editable
                </span>
              </div>
              <input
                type="text"
                value={editableBeneficiaryName}
                onChange={(e) => setEditableBeneficiaryName(e.target.value)}
                placeholder="Beneficiary Name"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5E7EB] font-black text-sm text-[#1F2937] focus:outline-none focus:border-[#94003A]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-1">
                  Account Number
                </span>
                <p className="font-mono font-black text-[#1F2937] tracking-wider flex items-center gap-1">
                  <Hash className="w-3 h-3 text-[#6B7280]" /> {masked}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-1">
                  IFSC Code
                </span>
                <p className="font-mono font-black text-[#1F2937] tracking-wider">
                  {ifscCode}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-1">
                  Account Type
                </span>
                <select
                  value={editableAccountType}
                  onChange={(e) => setEditableAccountType(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#E5E7EB] font-bold text-[#1F2937] text-xs"
                >
                  <option value="SAVINGS">SAVINGS</option>
                  <option value="CURRENT">CURRENT</option>
                </select>
              </div>

              <div>
                <span className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-1">
                  Status
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#DCFCE7] border border-[#16A34A]/30 text-[#16A34A] font-black text-[10px] uppercase">
                  <CheckCircle2 className="w-3 h-3" /> VERIFIED
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setBankResult(null)}
            className="px-4 py-3.5 rounded-2xl bg-[#F5F6FA] hover:bg-[#E5E7EB] border border-[#E5E7EB] text-[#4B5563] font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Edit Account</span>
          </button>
          <button
            type="button"
            onClick={handleContinue}
            className="flex-1 py-3.5 rounded-2xl bg-[#94003A] hover:bg-[#78002F] text-white text-sm font-extrabold shadow-lg shadow-[#94003A]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Confirm & Continue to Shop Details</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Screen 1: Bank Details Input Form ────────────────────────────────────
  return (
    <div className="space-y-5 select-none font-sans">
      <div className="text-center">
        <h2 className="text-2xl font-black text-[#1F2937] tracking-tight">
          Settlement Bank Account Verification
        </h2>
        <p className="text-xs font-semibold text-[#6B7280] mt-1">
          Provide your commercial bank account for automated payouts & commissions.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-[#FEE2E2] border border-[#DC2626]/30 text-[#DC2626] text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-[#4B5563] mb-1">
            Account Holder Name (As per Bank Records) <span className="text-[#DC2626]">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrorMsg("");
            }}
            placeholder="Enter full name on bank account"
            required
            className="w-full px-4 py-3 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] text-sm font-bold text-[#1F2937] focus:outline-none focus:border-[#94003A]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#4B5563] mb-1">
              Account Number <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="password"
              value={accountNumber}
              onChange={(e) => {
                setAccountNumber(e.target.value.replace(/\D/g, ""));
                setErrorMsg("");
              }}
              placeholder="Enter bank account number"
              required
              className="w-full px-4 py-3 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] text-sm font-mono font-bold text-[#1F2937] focus:outline-none focus:border-[#94003A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4B5563] mb-1">
              Confirm Account Number <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={confirmAccountNumber}
              onChange={(e) => {
                setConfirmAccountNumber(e.target.value.replace(/\D/g, ""));
                setErrorMsg("");
              }}
              placeholder="Re-enter bank account number"
              required
              className="w-full px-4 py-3 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] text-sm font-mono font-bold text-[#1F2937] focus:outline-none focus:border-[#94003A]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#4B5563] mb-1">
            Bank IFSC Code <span className="text-[#DC2626]">*</span>
          </label>
          <input
            type="text"
            value={ifsc}
            onChange={(e) => {
              setIfsc(e.target.value.toUpperCase().slice(0, 11));
              setErrorMsg("");
            }}
            maxLength={11}
            placeholder="SBIN0001234 / HDFC0000001"
            required
            className="w-full px-4 py-3 rounded-2xl bg-[#FAFAFC] border border-[#E5E7EB] text-sm font-mono font-black text-[#1F2937] uppercase focus:outline-none focus:border-[#94003A]"
          />
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
            disabled={loading || !accountNumber || !ifsc}
            className="flex-1 py-3.5 rounded-2xl bg-[#94003A] hover:bg-[#78002F] text-white text-sm font-extrabold shadow-lg shadow-[#94003A]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Penny Drop...</span>
              </>
            ) : (
              <>
                <span>Verify & Link Bank</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
