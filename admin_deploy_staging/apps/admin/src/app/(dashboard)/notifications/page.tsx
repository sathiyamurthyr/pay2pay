"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Bell,
  RefreshCw,
  Plus,
  Search,
  Filter,
  Mail,
  MessageSquare,
  Send,
  Smartphone,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  X,
  Layers,
  CheckCheck,
  AlertTriangle,
  Radio,
} from "lucide-react";

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

const STATUS_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  QUEUED: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
  DELIVERED: { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" },
  FAILED: { bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200" },
  SENT: { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" },
  PENDING: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" },
};

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  EMAIL: <Mail className="h-3.5 w-3.5 text-blue-600" />,
  SMS: <MessageSquare className="h-3.5 w-3.5 text-amber-600" />,
  WHATSAPP: <Send className="h-3.5 w-3.5 text-emerald-600" />,
  PUSH: <Smartphone className="h-3.5 w-3.5 text-purple-600" />,
  IN_APP: <Bell className="h-3.5 w-3.5 text-violet-600" />,
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
      setSendForm({
        channel: "EMAIL",
        recipient_address: "",
        subject: "",
        body: "",
        priority: "NORMAL",
        notification_type: "TRANSACTIONAL",
        business_event: "",
      });
      fetchNotifications();
      setTimeout(() => setSendSuccess(""), 4000);
    } catch (err) {
      console.error("Failed to send notification", err);
    } finally {
      setSending(false);
    }
  };

  const filtered = notifications.filter((n) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      n.recipient_address?.toLowerCase().includes(q) ||
      n.subject?.toLowerCase().includes(q) ||
      n.business_event?.toLowerCase().includes(q)
    );
  });

  const totalDelivered = notifications.filter((n) => n.notif_status === "DELIVERED" || n.notif_status === "SENT").length;
  const totalFailed = notifications.filter((n) => n.notif_status === "FAILED").length;
  const totalQueued = notifications.filter((n) => n.notif_status === "QUEUED" || n.notif_status === "PENDING").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {sendSuccess && (
        <div
          className="fixed top-5 right-5 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl border bg-emerald-50 border-emerald-200 text-emerald-800 shadow-xl shadow-emerald-500/10 text-sm font-semibold transition-all"
          style={{ animation: "fadeSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}
        >
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{sendSuccess}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/25 shrink-0">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Notification Log</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-xs font-bold">
                {notifications.length} Logs
              </span>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm font-medium mt-0.5">
              Real-time audit trail of outbound SMS, Email, WhatsApp & Push communications
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <button
            onClick={fetchNotifications}
            disabled={refreshing}
            title="Refresh notifications"
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowSend(true)}
            id="notification-send-btn"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-violet-500/20 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Send Notification</span>
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Dispatched</span>
            <Layers className="w-4 h-4 text-violet-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{notifications.length}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Delivered</span>
            <CheckCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">{totalDelivered}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Queued</span>
            <Radio className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">{totalQueued}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Failed</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-600 mt-2">{totalFailed}</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recipient address, subject, or business event..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold focus:bg-white focus:outline-none focus:border-violet-500 cursor-pointer"
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
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold focus:bg-white focus:outline-none focus:border-violet-500 cursor-pointer"
          >
            <option value="">All Channels</option>
            <option value="EMAIL">Email</option>
            <option value="SMS">SMS</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="PUSH">Push</option>
            <option value="IN_APP">In-App</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75">
                <th className="px-5 py-3.5 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">Channel</th>
                <th className="px-5 py-3.5 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">Recipient</th>
                <th className="px-5 py-3.5 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">Subject / Event</th>
                <th className="px-5 py-3.5 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">Type</th>
                <th className="px-5 py-3.5 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">Priority</th>
                <th className="px-5 py-3.5 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">Status</th>
                <th className="px-5 py-3.5 text-slate-600 font-extrabold uppercase tracking-wider text-[11px] text-center">Retries</th>
                <th className="px-5 py-3.5 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-violet-600 mb-2" />
                    <span className="font-bold text-xs">Loading outbound notifications...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-slate-400">
                    <Bell className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-700 font-bold text-sm">No notifications found</p>
                    <p className="text-slate-400 text-xs mt-0.5">Try modifying your filters or dispatch a new notification</p>
                  </td>
                </tr>
              ) : (
                filtered.map((n) => {
                  const sStyle = STATUS_BADGES[n.notif_status] || STATUS_BADGES.PENDING;
                  return (
                    <tr key={n.public_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                            {CHANNEL_ICONS[n.channel] || <Bell className="h-3.5 w-3.5 text-slate-500" />}
                          </div>
                          <span className="font-bold text-slate-800 text-xs">{n.channel}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-800 font-mono text-xs font-semibold">{n.recipient_address}</td>
                      <td className="px-5 py-3.5 text-slate-700 max-w-[220px] truncate">
                        {n.subject || n.business_event || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-200">
                          {n.notification_type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                            n.priority === "CRITICAL" || n.priority === "HIGH"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : n.priority === "LOW"
                              ? "bg-slate-100 text-slate-700 border-slate-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {n.priority}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${sStyle.bg} ${sStyle.text} ${sStyle.border}`}>
                          {n.notif_status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs text-center font-bold">{n.retry_count}</td>
                      <td className="px-5 py-3.5 text-slate-400 text-xs font-medium">
                        {new Date(n.created_date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Send Notification Modal */}
      {showSend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center text-violet-700">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">Send Notification</h2>
                  <p className="text-xs font-medium text-slate-500">Dispatch outbound communications directly</p>
                </div>
              </div>
              <button
                onClick={() => setShowSend(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSend} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Delivery Channel <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={sendForm.channel}
                    onChange={(e) => setSendForm({ ...sendForm, channel: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-bold focus:bg-white focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all cursor-pointer"
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
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Priority Level
                  </label>
                  <select
                    value={sendForm.priority}
                    onChange={(e) => setSendForm({ ...sendForm, priority: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-bold focus:bg-white focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all cursor-pointer"
                  >
                    <option>LOW</option>
                    <option>NORMAL</option>
                    <option>HIGH</option>
                    <option>CRITICAL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Recipient Address <span className="text-rose-500">*</span>
                </label>
                <input
                  value={sendForm.recipient_address}
                  onChange={(e) => setSendForm({ ...sendForm, recipient_address: e.target.value })}
                  placeholder="user@example.com or +919876543210"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-semibold placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Subject Line
                </label>
                <input
                  value={sendForm.subject}
                  onChange={(e) => setSendForm({ ...sendForm, subject: e.target.value })}
                  placeholder="Subject line for email / push notifications..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-semibold placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Message Content
                </label>
                <textarea
                  value={sendForm.body}
                  onChange={(e) => setSendForm({ ...sendForm, body: e.target.value })}
                  rows={3}
                  placeholder="Full notification body text..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Business Event Code
                </label>
                <input
                  value={sendForm.business_event}
                  onChange={(e) => setSendForm({ ...sendForm, business_event: e.target.value })}
                  placeholder="e.g. PAYOUT_SUCCESS, KYC_APPROVED, SYSTEM_ALERT"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-semibold placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all"
                />
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSend(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 transition-all text-xs sm:text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-violet-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {sending ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Dispatch Now</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
