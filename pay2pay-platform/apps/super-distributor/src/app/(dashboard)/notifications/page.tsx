"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Bell, RefreshCw, Plus, Search, Filter, Mail, MessageSquare, Send, Smartphone, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";

interface Notification {
  public_id: string;
  notification_type: string;
  channel: string;
  recipient_address: string;
  subject?: string;
  business_event?: string;
  priority: string;
  notif_status: string;
  retry_count: number;
  created_date: string;
}

const STATUS_STYLES: Record<string, string> = {
  QUEUED: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  DELIVERED: "bg-green-500/20 text-green-400 border-green-500/30",
  FAILED: "bg-red-500/20 text-red-400 border-red-500/30",
  SENT: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  PENDING: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  EMAIL: <Mail className="h-4 w-4" />,
  SMS: <MessageSquare className="h-4 w-4" />,
  WHATSAPP: <Send className="h-4 w-4" />,
  PUSH: <Smartphone className="h-4 w-4" />,
  IN_APP: <Bell className="h-4 w-4" />,
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterChannel, setFilterChannel] = useState("");
  const [search, setSearch] = useState("");
  const [showSend, setShowSend] = useState(false);
  const [sendForm, setSendForm] = useState({
    channel: "EMAIL",
    recipient_address: "",
    subject: "",
    body: "",
    priority: "NORMAL",
    notification_type: "TRANSACTIONAL",
    business_event: "",
  });
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState("");

  const fetchNotifications = async () => {
    try {
      setRefreshing(true);
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      if (filterChannel) params.channel = filterChannel;
      const res = await api.get("/api/v1/notifications/", { params });
      setNotifications(res.data || []);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [filterStatus, filterChannel]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post("/api/v1/notifications/send", sendForm);
      setSendSuccess("Notification queued successfully!");
      setShowSend(false);
      setSendForm({ channel: "EMAIL", recipient_address: "", subject: "", body: "", priority: "NORMAL", notification_type: "TRANSACTIONAL", business_event: "" });
      fetchNotifications();
      setTimeout(() => setSendSuccess(""), 3000);
    } catch (err) {
      console.error("Failed to send notification", err);
    } finally {
      setSending(false);
    }
  };

  const filtered = notifications.filter((n) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return n.recipient_address?.toLowerCase().includes(q) || n.subject?.toLowerCase().includes(q) || n.business_event?.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-3 text-violet-400">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="text-lg font-medium">Loading notifications...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Bell className="h-5 w-5 text-white" />
            </div>
            Notification Log
          </h1>
          <p className="text-slate-400 text-sm mt-1">All outbound communications — audit trail</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchNotifications}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-all text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowSend(true)}
            id="notification-send-btn"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-all text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Send Notification
          </button>
        </div>
      </div>

      {sendSuccess && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm">{sendSuccess}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recipient, subject, event..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 text-sm"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-300 text-sm focus:outline-none focus:border-violet-500"
        >
          <option value="">All Statuses</option>
          <option value="QUEUED">Queued</option>
          <option value="SENT">Sent</option>
          <option value="DELIVERED">Delivered</option>
          <option value="FAILED">Failed</option>
        </select>
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

      {/* Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80">
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Channel</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Recipient</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Subject / Event</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Type</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Priority</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Retries</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Sent At</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-slate-500">
                    <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    No notifications found
                  </td>
                </tr>
              ) : (
                filtered.map((n) => (
                  <tr key={n.public_id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-slate-300">
                        {CHANNEL_ICONS[n.channel] || <Bell className="h-4 w-4" />}
                        <span className="text-xs font-medium">{n.channel}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-mono text-xs">{n.recipient_address}</td>
                    <td className="px-4 py-3 text-slate-300 max-w-[200px] truncate">
                      {n.subject || n.business_event || <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">
                        {n.notification_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full border ${n.priority === "HIGH" ? "bg-red-500/20 text-red-400 border-red-500/30" : n.priority === "LOW" ? "bg-slate-500/20 text-slate-400 border-slate-500/30" : "bg-blue-500/20 text-blue-400 border-blue-500/30"}`}>
                        {n.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_STYLES[n.notif_status] || "bg-slate-500/20 text-slate-400 border-slate-500/30"}`}>
                        {n.notif_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs text-center">{n.retry_count}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(n.created_date).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Send Modal */}
      {showSend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f1623] border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Send className="h-5 w-5 text-violet-400" />
              Send Notification
            </h2>
            <form onSubmit={handleSend} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Channel *</label>
                  <select
                    value={sendForm.channel}
                    onChange={(e) => setSendForm({ ...sendForm, channel: e.target.value })}
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
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Priority</label>
                  <select
                    value={sendForm.priority}
                    onChange={(e) => setSendForm({ ...sendForm, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-violet-500"
                  >
                    <option>LOW</option>
                    <option>NORMAL</option>
                    <option>HIGH</option>
                    <option>CRITICAL</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Recipient Address *</label>
                <input
                  value={sendForm.recipient_address}
                  onChange={(e) => setSendForm({ ...sendForm, recipient_address: e.target.value })}
                  placeholder="email@example.com or +91XXXXXXXXXX"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-violet-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Subject</label>
                <input
                  value={sendForm.subject}
                  onChange={(e) => setSendForm({ ...sendForm, subject: e.target.value })}
                  placeholder="Notification subject line"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Body</label>
                <textarea
                  value={sendForm.body}
                  onChange={(e) => setSendForm({ ...sendForm, body: e.target.value })}
                  rows={3}
                  placeholder="Message body..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Business Event</label>
                <input
                  value={sendForm.business_event}
                  onChange={(e) => setSendForm({ ...sendForm, business_event: e.target.value })}
                  placeholder="e.g. PAYOUT_SUCCESS, KYC_APPROVED"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-violet-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSend(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="flex-1 px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-all text-sm font-medium disabled:opacity-50"
                >
                  {sending ? "Sending..." : "Send Notification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
