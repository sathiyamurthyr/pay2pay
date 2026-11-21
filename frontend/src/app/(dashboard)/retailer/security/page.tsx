"use client";

import React, { useState } from "react";
import { Shield, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import apiClient from "@/lib/api";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";

export default function RetailerSecurityPage() {
  const branding = useCompanyBranding();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) {
      setMessage({ type: "error", text: "Security PIN must be exactly 4 numeric digits" });
      return;
    }
    if (pin !== confirmPin) {
      setMessage({ type: "error", text: "PIN confirmation does not match" });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const res = await apiClient.post("/auth/security/pin", {
        pin: pin.trim(),
        confirm_pin: confirmPin.trim(),
      });
      if (res.data && res.data.success !== false) {
        setMessage({ type: "success", text: "Security PIN updated successfully!" });
        setPin("");
        setConfirmPin("");
      } else {
        throw new Error(res.data?.message || "PIN update failed");
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || "Failed to update Security PIN. Please try again.";
      setMessage({ type: "error", text: String(detail) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4 sm:p-6 ent-animate-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-xs"
          style={{
            backgroundColor: branding.primary_colour ? `${branding.primary_colour}15` : "#EFF6FF",
            color: branding.primary_colour || "#2563EB",
          }}
        >
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h1 className="ent-page-title">Account Security & PIN Settings</h1>
          <p className="ent-caption mt-0.5">
            {branding.display_name} Retailer Security Management
          </p>
        </div>
      </div>

      {/* Main Security Card */}
      <div className="ent-card p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="ent-card-title flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-500" />
            Transaction Security PIN
          </h2>
          <p className="ent-body text-xs mt-1 text-slate-500">
            Your 4-digit security PIN authorizes high-value transfers, wallet operations, and unlocks screen lock sessions across {branding.display_name}.
          </p>
        </div>

        {/* Feedback Alert */}
        {message && (
          <div
            className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-medium ent-animate-in ${
              message.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleUpdatePin} className="space-y-4">
          <div>
            <label className="ent-label" htmlFor="new-pin">
              New 4-Digit Security PIN
            </label>
            <input
              id="new-pin"
              className="ent-input tracking-widest text-center text-lg font-bold"
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              required
            />
          </div>

          <div>
            <label className="ent-label" htmlFor="confirm-pin">
              Confirm New 4-Digit Security PIN
            </label>
            <input
              id="confirm-pin"
              className="ent-input tracking-widest text-center text-lg font-bold"
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || pin.length !== 4 || pin !== confirmPin}
            className="ent-btn ent-btn-primary w-full py-3 text-sm font-semibold rounded-xl flex items-center justify-center gap-2"
            style={{
              backgroundColor: branding.primary_colour || undefined,
            }}
          >
            <Lock className="w-4 h-4" />
            {loading ? "Updating PIN..." : "Update Security PIN"}
          </button>
        </form>

        <div className="ent-card-alt p-4 space-y-1.5 text-xs text-slate-500">
          <p className="font-semibold text-slate-700">Security Guidelines:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Never share your security PIN with anyone, including customer support.</li>
            <li>Avoid using consecutive digits (e.g. 1234) or your birth year.</li>
            <li>All PIN changes are cryptographically hashed and audited under your account.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
