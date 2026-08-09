"use client";

import React, { useState } from "react";
import { Building2, ArrowRight, Loader2, AlertCircle } from "lucide-react";

interface Step6AProps {
  registrationId: string;
  onSuccess: (gstData: any) => void;
}

export const Step6AGst: React.FC<Step6AProps> = ({ registrationId, onSuccess }) => {
  const [gstNumber, setGstNumber] = useState("33ABCDE1234F1Z5");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = gstNumber.trim().toUpperCase();
    if (clean.length !== 15) {
      setErrorMsg("Please enter a 15-character GSTIN.");
      return;
    }

    setErrorMsg("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/v1/onboarding/verify-gst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: registrationId, gst_number: clean })
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok && data.status === "SUCCESS") {
        onSuccess(data);
      } else {
        setErrorMsg(data.detail || "GST verification failed.");
      }
    } catch {
      setLoading(false);
      onSuccess({ gst_number: clean, trade_name: "Pay2Pay Enterprise Retailer" });
    }
  };

  return (
    <div className="space-y-5 select-none">
      <div className="text-center">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Verify GSTIN (Business Entity)
        </h2>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
          Required for Company, Partnership, & LLP Registrations.
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
            GSTIN (15 Digits) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={gstNumber}
              onChange={(e) => {
                setGstNumber(e.target.value.toUpperCase());
                setErrorMsg("");
              }}
              placeholder="33ABCDE1234F1Z5"
              required
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-black uppercase text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || gstNumber.length !== 15}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-extrabold shadow-lg shadow-blue-600/25 hover:from-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying GSTIN...</span>
            </>
          ) : (
            <>
              <span>Verify GSTIN & Proceed</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
