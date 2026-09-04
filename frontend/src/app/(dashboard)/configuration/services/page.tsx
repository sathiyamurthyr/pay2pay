"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Sliders, RefreshCw, CheckCircle2, AlertTriangle, X,
  CreditCard, Smartphone, Send, Receipt, Fingerprint, Power, ShieldCheck
} from "lucide-react";

// Web Audio API Synthesizers for Feedback
const playSuccessSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      gain.gain.setValueAtTime(0.15, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.3);
    });
  } catch (e) {
    console.error("Audio error", e);
  }
};

const playErrorSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    [440, 349.23].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);
      gain.gain.setValueAtTime(0.2, now + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 0.35);
    });
  } catch (e) {
    console.error("Audio error", e);
  }
};

export default function ServicesConfigurationPage() {
  const [servicesList, setServicesList] = useState<any[]>([]);
  const [posModesList, setPosModesList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [togglingServiceCode, setTogglingServiceCode] = useState<string | null>(null);
  const [togglingPosModeCode, setTogglingPosModeCode] = useState<string | null>(null);
  const [alertState, setAlertState] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: ""
  });

  const fetchServicesAndModes = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/admin/services/status");
      if (res.data) {
        setServicesList(res.data.services || []);
        setPosModesList(res.data.pos_modes || []);
      }
    } catch (err: any) {
      console.error("Failed to load services and POS modes:", err);
      setAlertState({
        type: "error",
        message: err.response?.data?.detail || "Failed to load services from live DB."
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServicesAndModes();
  }, []);

  const handleToggleService = async (serviceCode: string, currentEnabled: boolean) => {
    const nextState = !currentEnabled;
    setServicesList((prev) =>
      prev.map((s) => (s.code === serviceCode ? { ...s, is_enabled: nextState } : s))
    );
    setTogglingServiceCode(serviceCode);
    try {
      const res = await api.patch(`/api/v1/admin/services/${serviceCode}/toggle`, {
        is_enabled: nextState
      });
      playSuccessSound();
      setAlertState({
        type: "success",
        message: `Service '${serviceCode}' availability updated to ${nextState ? "ENABLED" : "DISABLED"} via DB Stored Procedure.`
      });
      if (res.data?.service) {
        setServicesList((prev) =>
          prev.map((s) => (s.code === serviceCode ? { ...s, is_enabled: res.data.service.is_enabled } : s))
        );
      }
    } catch (err: any) {
      setServicesList((prev) =>
        prev.map((s) => (s.code === serviceCode ? { ...s, is_enabled: currentEnabled } : s))
      );
      playErrorSound();
      setAlertState({
        type: "error",
        message: err.response?.data?.detail || `Failed to update service '${serviceCode}'.`
      });
    } finally {
      setTogglingServiceCode(null);
    }
  };

  const handleTogglePosMode = async (modeCode: string, currentActive: boolean) => {
    const nextState = !currentActive;
    setPosModesList((prev) =>
      prev.map((m) => (m.code === modeCode ? { ...m, is_active: nextState } : m))
    );
    setTogglingPosModeCode(modeCode);
    try {
      const res = await api.patch(`/api/v1/admin/services/pos-modes/${encodeURIComponent(modeCode)}/toggle`, {
        is_active: nextState
      });
      playSuccessSound();
      setAlertState({
        type: "success",
        message: `POS Settlement Mode '${modeCode}' updated to ${nextState ? "ENABLED" : "DISABLED"} via DB Stored Procedure.`
      });
      if (res.data?.mode) {
        setPosModesList((prev) =>
          prev.map((m) => (m.code === modeCode ? { ...m, is_active: res.data.mode.is_active } : m))
        );
      }
    } catch (err: any) {
      setPosModesList((prev) =>
        prev.map((m) => (m.code === modeCode ? { ...m, is_active: currentActive } : m))
      );
      playErrorSound();
      setAlertState({
        type: "error",
        message: err.response?.data?.detail || `Failed to update POS mode '${modeCode}'.`
      });
    } finally {
      setTogglingPosModeCode(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight flex items-center gap-3">
            <Sliders className="w-7 h-7 text-[#2563EB]" /> Service Availability Configuration
          </h1>
          <p className="mt-1 text-sm font-medium text-[#64748B]">
            Control platform customer service access and POS settlement modes. Changes reflect dynamically in the Retailer app with strict backend DB enforcement.
          </p>
        </div>

        <button
          onClick={fetchServicesAndModes}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2563EB] text-xs font-extrabold text-white hover:bg-[#1D4ED8] shadow-2xs transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Sync Live DB
        </button>
      </div>

      {/* Global Success / Failure Banner */}
      {alertState.type && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold ${
            alertState.type === "success"
              ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]"
              : "bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]"
          }`}
        >
          <div className="flex items-center gap-2">
            {alertState.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-[#16A34A] shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-[#DC2626] shrink-0" />
            )}
            <span>{alertState.message}</span>
          </div>
          <button
            onClick={() => setAlertState({ type: null, message: "" })}
            className="p-1 hover:opacity-75 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Section 1: POS Settlement Modes Independent Controls (Requirement 2) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#2563EB] text-white text-[11px] font-black uppercase tracking-wider">
                Independent Controls
              </span>
              <h3 className="text-base font-extrabold text-[#0F172A]">
                POS Top-Up Settlement Mode Controls
              </h3>
            </div>
            <p className="text-xs text-[#64748B] mt-1">
              POS Top-Up is governed by separate settlement switches. If Admin disables POS T+2, it is immediately hidden and prohibited from retailer submission, while Instant and T+1 continue working.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {posModesList.map((mode) => {
            const isActive = mode.is_active;
            const isToggling = togglingPosModeCode === mode.code;
            return (
              <div
                key={mode.code}
                className={`rounded-2xl border p-5 transition-all flex flex-col justify-between space-y-4 ${
                  isActive
                    ? "bg-gradient-to-br from-[#F0FDF4] to-white border-[#BBF7D0] shadow-sm"
                    : "bg-gradient-to-br from-[#FEF2F2] to-[#FFF5F5] border-[#FCA5A5] shadow-sm"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-base font-extrabold text-[#0F172A]">
                      {mode.name}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        isActive
                          ? "bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]"
                          : "bg-[#FEF2F2] text-[#991B1B] border border-[#FCA5A5]"
                      }`}
                    >
                      {isActive ? "ENABLED" : "DISABLED"}
                    </span>
                  </div>

                  <p className="text-xs text-[#64748B]">
                    {mode.code === "POS - Instant"
                      ? "Instant wallet credit upon payment receipt approval. Configured Rate: 1.70% MDR (0% GST)."
                      : mode.code === "POS+T1"
                      ? "Next business day settlement (T+1). Configured Rate: 1.60% MDR (0% GST)."
                      : "Second business day settlement (T+2). Independent settlement toggle."}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#64748B]">
                    Retailer Access:
                  </span>
                  <button
                    onClick={() => handleTogglePosMode(mode.code, isActive)}
                    disabled={isToggling}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 ${
                      isActive
                        ? "bg-[#16A34A] hover:bg-[#15803D] text-white"
                        : "bg-[#DC2626] hover:bg-[#B91C1C] text-white"
                    }`}
                  >
                    {isToggling ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : isActive ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <X className="w-3.5 h-3.5" />
                    )}
                    {isActive ? "Click to Disable" : "Click to Enable"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Platform Customer Services Availability (Requirement 1) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#6C63FF] text-white text-[11px] font-black uppercase tracking-wider">
              Stored Procedure Engine
            </span>
            <h3 className="text-base font-extrabold text-[#0F172A]">
              Platform Customer Service Configuration
            </h3>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Admin controls whether each platform customer service is available to retailers. State changes execute stored procedure <code>sp_toggle_platform_service</code> directly on the live PostgreSQL ledger.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-black text-[#64748B] uppercase tracking-wider">
                <th className="py-3 px-4">Service</th>
                <th className="py-3 px-4">Service Code</th>
                <th className="py-3 px-4">Service Description</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-4 text-right">Admin Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {servicesList.map((svc) => {
                const isEnabled = svc.is_enabled;
                const isToggling = togglingServiceCode === svc.code;
                return (
                  <tr key={svc.code} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#0F172A]">
                      <div className="flex items-center gap-2.5">
                        {svc.code === "RECHARGE" ? (
                          <Smartphone className="w-4 h-4 text-[#2563EB]" />
                        ) : svc.code === "DMT" ? (
                          <Send className="w-4 h-4 text-[#16A34A]" />
                        ) : svc.code === "BBPS" ? (
                          <Receipt className="w-4 h-4 text-[#D97706]" />
                        ) : svc.code === "AEPS" ? (
                          <Fingerprint className="w-4 h-4 text-[#9333EA]" />
                        ) : (
                          <CreditCard className="w-4 h-4 text-[#2563EB]" />
                        )}
                        <span>{svc.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[#334155] font-bold text-[11px]">
                        {svc.code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#64748B]">
                      {svc.code === "RECHARGE"
                        ? "Prepaid & postpaid mobile recharge across all telecom operators"
                        : svc.code === "DMT"
                        ? "Domestic Money Transfer (Instant IMPS / NEFT 24x7)"
                        : svc.code === "BBPS"
                        ? "Bharat Bill Payment System (Electricity, Water, Gas, Fastag)"
                        : svc.code === "AEPS"
                        ? "Aadhaar Enabled Payment System (Cash withdrawal & inquiry)"
                        : "POS Card swipe settlement top-up working capital"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase ${
                          isEnabled
                            ? "bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]"
                            : "bg-[#FEF2F2] text-[#991B1B] border border-[#FCA5A5]"
                        }`}
                      >
                        {isEnabled ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                        {isEnabled ? "ENABLED" : "DISABLED"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleService(svc.code, isEnabled)}
                        disabled={isToggling}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50 ${
                          isEnabled
                            ? "bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5] hover:bg-[#FEE2E2]"
                            : "bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0] hover:bg-[#DCFCE7]"
                        }`}
                      >
                        {isToggling ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : isEnabled ? (
                          <Power className="w-3.5 h-3.5" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        {isEnabled ? "Disable Service" : "Enable Service"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
