"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Webhook,
  RotateCw
} from "lucide-react";

export default function WebhooksPage() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/eip/webhooks/deliveries");
      setDeliveries(res.data);
    } catch (err) {
      console.error("Failed to fetch webhook deliveries", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const handleReplayWebhook = async (id: string) => {
    try {
      const res = await api.post(`/api/v1/eip/webhooks/replay/${id}`);
      alert(res.data.message);
      fetchDeliveries();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Webhook replay failed");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Webhook className="h-8 w-8 text-purple-400" />
            Webhook Delivery Console & Event Replay Engine
          </h1>
          <p className="mt-1 text-slate-400">
            Inspect real-time merchant webhook delivery logs, HTTP status codes, & re-trigger failed events
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 uppercase font-mono text-xs text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">Delivery Code</th>
                <th className="px-5 py-4">Event Code</th>
                <th className="px-5 py-4">Target URL</th>
                <th className="px-5 py-4">HTTP Status</th>
                <th className="px-5 py-4">Latency</th>
                <th className="px-5 py-4 font-mono text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">Loading Webhook Deliveries...</td></tr>
              ) : (
                deliveries.map((d) => (
                  <tr key={d.public_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 text-purple-400 font-bold">{d.delivery_code}</td>
                    <td className="px-5 py-4 text-slate-200">{d.event_code}</td>
                    <td className="px-5 py-4 text-slate-400 font-sans text-xs max-w-xs truncate">{d.target_url}</td>
                    <td className="px-5 py-4 font-bold text-emerald-400">HTTP {d.http_status}</td>
                    <td className="px-5 py-4 text-slate-400">{d.latency_ms} ms</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleReplayWebhook(d.public_id)}
                        className="flex items-center gap-1 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-400 hover:bg-purple-500/20 ml-auto"
                      >
                        <RotateCw className="h-3.5 w-3.5" /> Replay Event
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
