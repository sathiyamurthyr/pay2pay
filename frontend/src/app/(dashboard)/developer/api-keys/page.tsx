"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Key,
  Webhook,
  Plus,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Globe,
  X
} from "lucide-react";

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showWhModal, setShowWhModal] = useState(false);

  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  const [keyFormData, setKeyFormData] = useState({
    key_name: "",
    scopes: "transactions.read,settlements.write"
  });

  const [whFormData, setWhFormData] = useState({
    target_url: "",
    events: "transaction.created,settlement.completed"
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const kRes = await api.get("/api/v1/developer/keys");
      setKeys(kRes.data);

      const wRes = await api.get("/api/v1/developer/webhooks");
      setWebhooks(wRes.data);
    } catch (err) {
      console.error("Failed to load developer data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post("/api/v1/developer/keys", keyFormData);
      setCreatedSecret(res.data.secret_key_raw);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "API Key creation failed");
    }
  };

  const handleWhSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/developer/webhooks", whFormData);
      setShowWhModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Webhook registration failed");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Key className="h-8 w-8 text-emerald-400" />
            API Keys & Webhooks Gateway
          </h1>
          <p className="mt-1 text-slate-400">
            Generate production API keys and register HMAC-signed webhook notification endpoints
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setCreatedSecret(null); setShowKeyModal(true); }}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition-all"
          >
            <Plus className="h-4 w-4" />
            Generate API Key
          </button>
          <button
            onClick={() => setShowWhModal(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-all"
          >
            <Webhook className="h-4 w-4" />
            Add Webhook Endpoint
          </button>
        </div>
      </div>

      {/* API Keys Table */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
          <Key className="h-5 w-5 text-emerald-400" /> Active API Keys
        </h2>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-2xl">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 uppercase font-mono text-xs text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">Key Name</th>
                <th className="px-5 py-4">Client ID</th>
                <th className="px-5 py-4">Scopes</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400">Loading API Keys...</td></tr>
              ) : keys.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400">No API keys generated yet.</td></tr>
              ) : (
                keys.map((k) => (
                  <tr key={k.public_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 font-semibold text-slate-100">{k.key_name}</td>
                    <td className="px-5 py-4 font-mono text-xs text-emerald-400 font-semibold">{k.client_id}</td>
                    <td className="px-5 py-4 text-xs text-slate-400 font-mono">{k.scopes}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {k.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Webhooks Table */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
          <Webhook className="h-5 w-5 text-blue-400" /> Webhook Subscriptions
        </h2>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-2xl">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 uppercase font-mono text-xs text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">Target Endpoint URL</th>
                <th className="px-5 py-4">HMAC Secret Key</th>
                <th className="px-5 py-4">Events</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400">Loading Webhooks...</td></tr>
              ) : webhooks.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400">No webhooks registered yet.</td></tr>
              ) : (
                webhooks.map((w) => (
                  <tr key={w.public_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-blue-400 font-semibold">{w.target_url}</td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-400">{w.secret_key}</td>
                    <td className="px-5 py-4 text-xs text-slate-400 font-mono">{w.events}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {w.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Key className="h-5 w-5 text-emerald-400" /> Generate API Key
              </h2>
              <button onClick={() => setShowKeyModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            {createdSecret ? (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                  <span className="font-semibold text-sm">Save your Secret Key now!</span>
                  <p className="mt-1">For security, this secret key will never be shown again.</p>
                  <div className="mt-3 font-mono p-2.5 rounded bg-slate-950 text-white font-bold break-all border border-emerald-500/40">
                    {createdSecret}
                  </div>
                </div>
                <button
                  onClick={() => setShowKeyModal(false)}
                  className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleKeySubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-medium text-slate-300">Key Identifier Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Partner API Integration"
                    value={keyFormData.key_name}
                    onChange={(e) => setKeyFormData({ ...keyFormData, key_name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-300">Scopes</label>
                  <input
                    type="text"
                    value={keyFormData.scopes}
                    onChange={(e) => setKeyFormData({ ...keyFormData, scopes: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="flex justify-end pt-4 border-t border-slate-800">
                  <button type="submit" className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 shadow-lg">
                    Generate Secret Key
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Webhook Modal */}
      {showWhModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Webhook className="h-5 w-5 text-blue-400" /> Add Webhook Subscription
              </h2>
              <button onClick={() => setShowWhModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleWhSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-medium text-slate-300">Target Webhook URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://api.merchant.com/webhooks/pay2pay"
                  value={whFormData.target_url}
                  onChange={(e) => setWhFormData({ ...whFormData, target_url: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="font-medium text-slate-300">Subscribed Events</label>
                <input
                  type="text"
                  value={whFormData.events}
                  onChange={(e) => setWhFormData({ ...whFormData, events: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button type="submit" className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 shadow-lg">
                  Register Webhook Endpoint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
