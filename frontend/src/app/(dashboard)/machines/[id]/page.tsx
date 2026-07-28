"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import {
  CreditCard,
  ChevronLeft,
  Wifi,
  Battery,
  ShieldCheck,
  Activity,
  History,
  RefreshCw,
  Cpu,
  Radio,
  Lock
} from "lucide-react";

export default function MachineDetailsPage() {
  const params = useParams();
  const machineId = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"specs" | "telemetry" | "security" | "history">("specs");

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/v1/machines/${machineId}`);
      setData(res.data);
    } catch (err) {
      console.error("Failed to load machine details", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (machineId) fetchDetails();
  }, [machineId]);

  if (loading || !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-3 text-emerald-400">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="text-lg font-medium">Loading POS Terminal Specs...</span>
        </div>
      </div>
    );
  }

  const { machine, telemetry, key_profile, status_history } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/machines"
            className="flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900 p-2.5 text-slate-400 hover:text-slate-200"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-100">{machine.pos_model}</h1>
              <span className="font-mono text-xs text-emerald-400 font-semibold px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                SN: {machine.serial_number}
              </span>
              <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {machine.status}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400 font-mono">TID: {machine.tid} | MID: {machine.mid}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-950/40 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("specs")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "specs" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Cpu className="h-4 w-4" /> Terminal Specs
        </button>
        <button
          onClick={() => setActiveTab("telemetry")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "telemetry" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Activity className="h-4 w-4" /> Live Health & Telemetry
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "security" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Lock className="h-4 w-4" /> DUKPT Key Profile
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "history" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <History className="h-4 w-4" /> Status Audit Trail
        </button>
      </div>

      {/* Tab Contents */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-2xl">
        {activeTab === "specs" && (
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <span className="text-xs text-slate-400 font-mono">Serial Number</span>
              <div className="font-mono text-emerald-400 font-semibold">{machine.serial_number}</div>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-mono">Terminal ID (TID)</span>
              <div className="font-mono text-slate-200 font-semibold">{machine.tid}</div>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-mono">Merchant ID (MID)</span>
              <div className="font-mono text-slate-200 font-semibold">{machine.mid}</div>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-mono">SIM ICCID / Provider</span>
              <div className="font-mono text-slate-200">{machine.sim_iccid || "N/A"} ({machine.telecom_provider})</div>
            </div>
          </div>
        )}

        {activeTab === "telemetry" && (
          <div className="grid grid-cols-3 gap-6 text-sm">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
              <span className="text-xs text-slate-400 flex items-center gap-1.5"><Battery className="h-4 w-4 text-emerald-400" /> Battery Level</span>
              <div className="font-mono text-2xl font-bold text-emerald-400 mt-2">{telemetry?.battery_percentage || 100}%</div>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
              <span className="text-xs text-slate-400 flex items-center gap-1.5"><Wifi className="h-4 w-4 text-blue-400" /> Network Mode</span>
              <div className="font-mono text-2xl font-bold text-blue-400 mt-2">{telemetry?.network_type || "4G"}</div>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
              <span className="text-xs text-slate-400 flex items-center gap-1.5"><Radio className="h-4 w-4 text-purple-400" /> App Version</span>
              <div className="font-mono text-xl font-bold text-slate-200 mt-2">{telemetry?.app_version || "v1.8.0"}</div>
            </div>
          </div>
        )}

        {activeTab === "security" && (
          <div className="space-y-4 text-sm">
            <h3 className="font-semibold text-slate-200">DUKPT Key Profile & Master Key</h3>
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-slate-800 bg-slate-950/40 font-mono">
              <div>
                <span className="text-xs text-slate-400">DUKPT KSN</span>
                <div className="text-emerald-400 font-semibold">{key_profile?.ksn || "987654321"}</div>
              </div>
              <div>
                <span className="text-xs text-slate-400">Encryption Standard</span>
                <div className="text-slate-200">{key_profile?.encryption || "AES-256"}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-3 text-xs">
            <h3 className="font-semibold text-slate-200 text-sm mb-2">Status Audit Trail</h3>
            {status_history.map((h: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/40">
                <div>
                  <span className="font-semibold text-slate-100">{h.previous}</span> → <span className="font-semibold text-emerald-400">{h.new}</span>
                  <div className="text-slate-400 mt-0.5">{h.reason}</div>
                </div>
                <div className="text-right text-slate-500 font-mono">
                  <div>{h.by}</div>
                  <div>{new Date(h.date).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
