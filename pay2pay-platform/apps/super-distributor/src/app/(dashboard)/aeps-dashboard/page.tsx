"use client";

import React, { useEffect, useState } from "react";
import { 
  Fingerprint, DollarSign, CheckCircle2, RefreshCw, 
  Cpu, Activity, ShieldCheck, Search, Building2
} from "lucide-react";
import apiClient from "@/lib/api";

interface AepsMetrics {
  today_transfers_count: number;
  today_volume_amount: number;
  cash_withdrawals_count: number;
  balance_enquiries_count: number;
  success_rate_pct: number;
  failure_rate_pct: number;
  active_devices_count: number;
  service_breakdown: Record<string, number>;
  status_breakdown: Record<string, number>;
}

export default function AepsDashboardPage() {
  const [metrics, setMetrics] = useState<AepsMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/aeps/dashboard");
      setMetrics(res.data.data);
    } catch (err) {
      console.error("Failed to fetch AEPS telemetry", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Fingerprint className="w-7 h-7 text-emerald-400" /> AEPS Banking Telemetry
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time Aadhaar Cash Withdrawals, Biometric Match SLA & RD Service Devices
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-[#F9FAFB] text-[#374151] rounded-lg border border-[#D1D5DB] text-sm font-semibold transition-all shadow-2xs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh Telemetry
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-2xs relative overflow-hidden text-[#111827]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[#6B7280] text-xs font-bold uppercase tracking-wider">Cash Withdrawal Volume</p>
              <h3 className="text-2xl font-extrabold text-[#111827] mt-1">
                ₹{metrics?.today_volume_amount?.toLocaleString() ?? 0}
              </h3>
              <p className="text-xs text-[#166534] font-bold flex items-center gap-1 mt-2">
                <Fingerprint className="w-3.5 h-3.5" /> {metrics?.cash_withdrawals_count ?? 0} withdrawals
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#DCFCE7] border border-[#BBF7D0] flex items-center justify-center text-[#166534]">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-2xs relative overflow-hidden text-[#111827]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[#6B7280] text-xs font-bold uppercase tracking-wider">Biometric Match Rate</p>
              <h3 className="text-2xl font-extrabold text-[#166534] mt-1">
                {metrics?.success_rate_pct ?? 100}%
              </h3>
              <p className="text-xs text-[#6B7280] font-medium mt-2">PID Block Encryption Active</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#DCFCE7] border border-[#BBF7D0] flex items-center justify-center text-[#166534]">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-2xs relative overflow-hidden text-[#111827]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[#6B7280] text-xs font-bold uppercase tracking-wider">Balance Enquiries</p>
              <h3 className="text-2xl font-extrabold text-[#2563EB] mt-1">
                {metrics?.balance_enquiries_count ?? 0}
              </h3>
              <p className="text-xs text-[#2563EB] font-bold mt-2">Instant Account Check</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#DBEAFE] border border-[#BFDBFE] flex items-center justify-center text-[#1D4ED8]">
              <Search className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-2xs relative overflow-hidden text-[#111827]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[#6B7280] text-xs font-bold uppercase tracking-wider">Active RD Devices</p>
              <h3 className="text-2xl font-extrabold text-[#111827] mt-1">
                {metrics?.active_devices_count ?? 0}
              </h3>
              <p className="text-xs text-[#6B7280] font-medium mt-2">Mantra, Morpho, Startek</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center text-[#374151]">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* NPCI Bank Switch Matrix */}
      <div className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-2xs space-y-4 text-[#111827]">
        <h3 className="text-base font-extrabold text-[#111827] flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#166534]" /> NPCI Bank IIN Routing Matrix
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { iin: "607094", bank: "State Bank of India", status: "ONLINE", latency: "1.2s" },
            { iin: "607152", bank: "ICICI Bank", status: "ONLINE", latency: "0.9s" },
            { iin: "607076", bank: "HDFC Bank", status: "ONLINE", latency: "1.1s" },
          ].map((b, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-[#FAFBFC] border border-[#E5E7EB] flex justify-between items-center text-[#111827]">
              <div>
                <p className="font-extrabold text-[#111827] text-sm">{b.bank}</p>
                <p className="text-xs text-[#6B7280] font-mono font-medium">IIN: {b.iin} | Latency: {b.latency}</p>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]">
                {b.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
