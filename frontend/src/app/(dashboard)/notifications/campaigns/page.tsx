"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Megaphone, RefreshCw, Plus, Search, Play, CheckCircle2 } from "lucide-react";

interface Campaign {
  public_id: string;
  campaign_code: string;
  campaign_name: string;
  campaign_type: string;
  channel: string;
  notification_type: string;
  audience_count: number;
  approval_status: string;
  campaign_status: string;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  APPROVED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  RUNNING: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  COMPLETED: "bg-green-500/20 text-green-400 border-green-500/30",
  PAUSED: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  CANCELLED: "bg-red-500/20 text-red-400 border-red-500/30",
};

const CHANNEL_COLORS: Record<string, string> = {
  EMAIL: "text-blue-400",
  SMS: "text-green-400",
  WHATSAPP: "text-emerald-400",
  PUSH: "text-purple-400",
  IN_APP: "text-orange-400",
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    campaign_code: "",
    campaign_name: "",
    campaign_type: "BROADCAST",
    channel: "EMAIL",
    notification_type: "MARKETING",
    scheduled_at: "",
    has_ab_test: false,
    open_tracking: true,
    click_tracking: true,
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  const fetchCampaigns = async () => {
    try {
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      const res = await api.get("/api/v1/notifications/campaigns", { params });
      setCampaigns(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [filterStatus]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/v1/notifications/campaigns", {
        ...form,
        scheduled_at: form.scheduled_at || undefined,
      });
      setSuccess("Campaign created successfully!");
      setShowCreate(false);
      fetchCampaigns();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const filtered = campaigns.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.campaign_code.toLowerCase().includes(q) || c.campaign_name.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-600 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/25">
              <Megaphone className="h-5 w-5 text-white" />
            </div>
            Campaign Manager
          </h1>
          <p className="text-slate-400 text-sm mt-1">Broadcast, drip and triggered communication campaigns</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          id="campaign-create-btn"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-600 text-white hover:bg-pink-700 transition-all text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          New Campaign
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-sm">
          <CheckCircle2 className="h-4 w-4" />
          {success}
        </div>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-pink-500 text-sm"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-300 text-sm focus:outline-none focus:border-pink-500"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="APPROVED">Approved</option>
          <option value="RUNNING">Running</option>
          <option value="COMPLETED">Completed</option>
          <option value="PAUSED">Paused</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-3 text-center py-16 text-slate-500">
            <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-30" />
            No campaigns found. Create your first campaign.
          </div>
        ) : (
          filtered.map((c) => (
            <div key={c.public_id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-pink-500/40 transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex gap-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/30">
                    {c.campaign_type}
                  </span>
                  <span className={`text-xs font-medium ${CHANNEL_COLORS[c.channel] || "text-slate-400"}`}>
                    {c.channel}
                  </span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_STYLES[c.campaign_status] || "bg-slate-500/20 text-slate-400 border-slate-500/30"}`}>
                  {c.campaign_status}
                </span>
              </div>
              <h3 className="text-white font-semibold">{c.campaign_name}</h3>
              <p className="text-slate-500 text-xs font-mono mt-1">{c.campaign_code}</p>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-slate-800/50 rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-white">{c.audience_count.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Audience</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-2.5 text-center">
                  <p className="text-xs font-medium text-slate-400">{c.notification_type}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Type</p>
                </div>
              </div>
              {c.scheduled_at && (
                <p className="text-xs text-slate-500 mt-3">
                  Scheduled: {new Date(c.scheduled_at).toLocaleString()}
                </p>
              )}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${c.approval_status === "APPROVED" ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
                  {c.approval_status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f1623] border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-4">Create Campaign</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Campaign Code *</label>
                  <input
                    value={form.campaign_code}
                    onChange={(e) => setForm({ ...form, campaign_code: e.target.value })}
                    placeholder="Q4_RETAILER_PROMO"
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-pink-500 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Channel *</label>
                  <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-pink-500">
                    <option>EMAIL</option><option>SMS</option><option>WHATSAPP</option><option>PUSH</option><option>IN_APP</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Campaign Name *</label>
                <input value={form.campaign_name} onChange={(e) => setForm({ ...form, campaign_name: e.target.value })} placeholder="Q4 Retailer Promotion" className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-pink-500" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Campaign Type</label>
                  <select value={form.campaign_type} onChange={(e) => setForm({ ...form, campaign_type: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-pink-500">
                    <option>BROADCAST</option><option>DRIP</option><option>TRIGGERED</option><option>TRANSACTIONAL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Notification Type</label>
                  <select value={form.notification_type} onChange={(e) => setForm({ ...form, notification_type: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-pink-500">
                    <option>MARKETING</option><option>TRANSACTIONAL</option><option>OPERATIONAL</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Scheduled At</label>
                <input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-pink-500" />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={form.open_tracking} onChange={(e) => setForm({ ...form, open_tracking: e.target.checked })} className="rounded" />
                  Open Tracking
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={form.click_tracking} onChange={(e) => setForm({ ...form, click_tracking: e.target.checked })} className="rounded" />
                  Click Tracking
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={form.has_ab_test} onChange={(e) => setForm({ ...form, has_ab_test: e.target.checked })} className="rounded" />
                  A/B Test
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-all text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-pink-600 text-white hover:bg-pink-700 transition-all text-sm font-medium disabled:opacity-50">{saving ? "Saving..." : "Create Campaign"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
