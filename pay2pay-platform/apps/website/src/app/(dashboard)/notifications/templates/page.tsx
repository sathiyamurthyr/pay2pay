"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { FileText, RefreshCw, Plus, Search, Eye } from "lucide-react";

interface Template {
  public_id: string;
  template_code: string;
  template_name: string;
  channel: string;
  notification_type: string;
  language: string;
  subject?: string;
  approval_status: string;
  template_status: string;
}

const CHANNEL_COLORS: Record<string, string> = {
  EMAIL: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  SMS: "bg-green-500/20 text-green-400 border-green-500/30",
  WHATSAPP: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  PUSH: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  IN_APP: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

export default function NotificationTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterChannel, setFilterChannel] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    template_code: "",
    template_name: "",
    channel: "EMAIL",
    notification_type: "TRANSACTIONAL",
    language: "en",
    subject: "",
    body_text: "",
    is_rich_html: false,
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  const fetchTemplates = async () => {
    try {
      const params: Record<string, string> = {};
      if (filterChannel) params.channel = filterChannel;
      const res = await api.get("/api/v1/notifications/templates", { params });
      setTemplates(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [filterChannel]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/v1/notifications/templates", form);
      setSuccess("Template created successfully!");
      setShowCreate(false);
      setForm({ template_code: "", template_name: "", channel: "EMAIL", notification_type: "TRANSACTIONAL", language: "en", subject: "", body_text: "", is_rich_html: false });
      fetchTemplates();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const filtered = templates.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return t.template_code.toLowerCase().includes(q) || t.template_name.toLowerCase().includes(q);
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <FileText className="h-5 w-5 text-white" />
            </div>
            Notification Templates
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage multi-channel message templates</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          id="template-create-btn"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-all text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          New Template
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-sm">
          ✓ {success}
        </div>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search template code or name..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 text-sm"
          />
        </div>
        <select
          value={filterChannel}
          onChange={(e) => setFilterChannel(e.target.value)}
          className="px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-300 text-sm focus:outline-none focus:border-violet-500"
        >
          <option value="">All Channels</option>
          <option value="EMAIL">Email</option>
          <option value="SMS">SMS</option>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="PUSH">Push</option>
          <option value="IN_APP">In-App</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-3 text-center py-16 text-slate-500">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            No templates found. Create your first template.
          </div>
        ) : (
          filtered.map((t) => (
            <div
              key={t.public_id}
              className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-violet-500/40 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full border ${CHANNEL_COLORS[t.channel] || "bg-slate-500/20 text-slate-400 border-slate-500/30"}`}>
                    {t.channel}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">
                    {t.notification_type}
                  </span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full border ${t.template_status === "ACTIVE" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-slate-500/20 text-slate-400 border-slate-500/30"}`}>
                  {t.template_status}
                </span>
              </div>
              <h3 className="text-white font-semibold">{t.template_name}</h3>
              <p className="text-slate-500 text-xs font-mono mt-1">{t.template_code}</p>
              {t.subject && <p className="text-slate-400 text-sm mt-2 truncate">{t.subject}</p>}
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-800">
                <span className="text-xs text-slate-500">Lang: {t.language.toUpperCase()}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${t.approval_status === "APPROVED" ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
                  {t.approval_status}
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
            <h2 className="text-lg font-bold text-white mb-4">New Notification Template</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Template Code *</label>
                  <input
                    value={form.template_code}
                    onChange={(e) => setForm({ ...form, template_code: e.target.value })}
                    placeholder="PAYOUT_SUCCESS_EMAIL"
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-violet-500 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Channel *</label>
                  <select
                    value={form.channel}
                    onChange={(e) => setForm({ ...form, channel: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-violet-500"
                    required
                  >
                    <option>EMAIL</option>
                    <option>SMS</option>
                    <option>WHATSAPP</option>
                    <option>PUSH</option>
                    <option>IN_APP</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Template Name *</label>
                <input
                  value={form.template_name}
                  onChange={(e) => setForm({ ...form, template_name: e.target.value })}
                  placeholder="Payout Success Email"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-violet-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Notification Type</label>
                  <select
                    value={form.notification_type}
                    onChange={(e) => setForm({ ...form, notification_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-violet-500"
                  >
                    <option>TRANSACTIONAL</option>
                    <option>MARKETING</option>
                    <option>OPERATIONAL</option>
                    <option>SECURITY</option>
                    <option>SYSTEM</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Language</label>
                  <input
                    value={form.language}
                    onChange={(e) => setForm({ ...form, language: e.target.value })}
                    placeholder="en"
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Subject</label>
                <input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Your payout of ₹{{amount}} is processed"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Body Text</label>
                <textarea
                  value={form.body_text}
                  onChange={(e) => setForm({ ...form, body_text: e.target.value })}
                  rows={4}
                  placeholder="Dear {{name}}, your payout..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-violet-500 resize-none font-mono"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-all text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-all text-sm font-medium disabled:opacity-50">
                  {saving ? "Saving..." : "Create Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
