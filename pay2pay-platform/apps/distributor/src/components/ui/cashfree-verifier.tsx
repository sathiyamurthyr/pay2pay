"use client";

import React, { useState } from "react";
import api from "@/lib/api";
import { ShieldCheck, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

interface CashfreePanVerifierProps {
  pan: string;
  name?: string;
  onVerified?: (result: any) => void;
}

export function CashfreePanVerifier({ pan, name, onVerified }: CashfreePanVerifierProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleVerify = async () => {
    if (!pan || pan.length < 10) {
      alert("Please enter a valid 10-character PAN number first.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/api/v1/verification/pan", { pan, name });
      setResult(res.data);
      if (onVerified) onVerified(res.data);
    } catch (err) {
      console.error("PAN verification error", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        disabled={loading || !pan}
        onClick={handleVerify}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2563EB] text-white text-[11px] font-extrabold hover:bg-[#1D4ED8] disabled:opacity-50 transition-all cursor-pointer shadow-2xs"
      >
        {loading ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying PAN…
          </>
        ) : (
          <>
            <ShieldCheck className="w-3.5 h-3.5" /> Verify PAN (Instant Verification)
          </>
        )}
      </button>

      {result && (
        <div
          className={`p-2.5 rounded-xl border text-[11px] font-bold space-y-0.5 ${
            result.status === "VALID"
              ? "bg-[#DCFCE7] border-[#BBF7D0] text-[#15803D]"
              : "bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]"
          }`}
        >
          <div className="flex items-center gap-1.5">
            {result.status === "VALID" ? (
              <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
            )}
            <span>{result.message}</span>
          </div>
          {result.registered_name && (
            <div className="font-mono text-[10px] text-[#334155] pl-5.5">
              Holder: {result.registered_name}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
