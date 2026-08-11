"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Sliders,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Power
} from "lucide-react";

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<any[]>([]);
  const [maint, setMaint] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [fRes, mRes] = await Promise.all([
        api.get("/api/v1/operations/feature-flags"),
        api.get("/api/v1/operations/maintenance")
      ]);
      setFlags(fRes.data);
      setMaint(mRes.data);
    } catch (err) {
      console.error("Failed to fetch feature flags", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleFlag = async (key: string) => {
    try {
      await api.post(`/api/v1/operations/feature-flags/${key}/toggle`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Toggle failed");
    }
  };

  const handleToggleMaintenance = async () => {
    try {
      const res = await api.post("/api/v1/operations/maintenance/toggle");
      setMaint(res.data);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Maintenance toggle failed");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Sliders className="h-8 w-8 text-emerald-400" />
            Runtime Feature Flags & Maintenance Mode Matrix
          </h1>
          <p className="mt-1 text-slate-400">
            Dynamically enable/disable production system features and emergency maintenance mode
          </p>
        </div>
        <button
          onClick={handleToggleMaintenance}
          className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all ${
            maint?.is_maintenance_mode
              ? "bg-amber-600 hover:bg-amber-500 shadow-amber-600/30"
              : "bg-rose-600 hover:bg-rose-500 shadow-rose-600/30"
          }`}
        >
          <Power className="h-4 w-4" />
          {maint?.is_maintenance_mode ? "Disable Maintenance Mode" : "Enable Emergency Maintenance"}
        </button>
      </div>

      {/* Flags Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {loading ? (
          <div className="col-span-2 p-12 text-center text-slate-400">Loading Feature Flags...</div>
        ) : (
          flags.map((f) => (
            <div key={f.flag_key} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-emerald-400 font-bold">{f.flag_key}</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  f.is_enabled
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}>
                  {f.is_enabled ? "ENABLED" : "DISABLED"}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{f.description}</p>
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="font-mono text-xs text-slate-400">Rollout: {f.rollout_percentage}%</span>
                <button
                  onClick={() => handleToggleFlag(f.flag_key)}
                  className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
                    f.is_enabled
                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20"
                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                  }`}
                >
                  {f.is_enabled ? "Disable Flag" : "Enable Flag"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
