"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Volume2,
  Smartphone,
  Mail,
  MessageSquare,
  Send,
  Shield,
  Clock,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  Radio,
  Sliders,
  Check,
  Vibrate,
  Play,
  Moon,
} from "lucide-react";
import {
  notificationEngine,
  ServerNotificationPreferences,
  NotificationCategory,
} from "@/services/notification-engine";

export default function NotificationSettingsPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Push Permission State
  const [pushStatus, setPushStatus] = useState<"default" | "granted" | "denied">("default");
  const [pushSubscribed, setPushSubscribed] = useState<boolean>(false);
  const [pushLoading, setPushLoading] = useState<boolean>(false);

  // Server Preferences
  const [prefs, setPrefs] = useState<ServerNotificationPreferences>({
    in_app_enabled: true,
    push_enabled: true,
    email_enabled: true,
    whatsapp_enabled: false,
    sms_enabled: true,
    transactional_enabled: true,
    security_enabled: true,
    operational_enabled: true,
    do_not_disturb: false,
    dnd_start_time: "22:00",
    dnd_end_time: "08:00",
    language_preference: "en",
  });

  // Client Audio/Haptic Settings
  const [audioSettings, setAudioSettings] = useState(notificationEngine.getSettings());

  // Load server preferences on mount
  const loadPreferences = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const serverPrefs = await notificationEngine.fetchServerPreferences();
      if (serverPrefs) {
        setPrefs(serverPrefs);
      }
      setAudioSettings(notificationEngine.getSettings());

      // Check Push Permission
      if (typeof window !== "undefined" && "Notification" in window) {
        setPushStatus(Notification.permission);
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.pushManager.getSubscription().then((sub) => {
              setPushSubscribed(!!sub);
            });
          });
        }
      }
    } catch (err: any) {
      setError("Failed to load notification preferences from server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Handle Save
  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setError(null);
    try {
      const ok = await notificationEngine.saveServerPreferences(prefs);
      if (ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setError("Server failed to update preferences. Please retry.");
      }
    } catch (err: any) {
      setError("An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  // Toggle Web Push
  const handleTogglePush = async () => {
    setPushLoading(true);
    setError(null);
    try {
      if (pushSubscribed) {
        await notificationEngine.unsubscribeFromPush();
        setPushSubscribed(false);
        setPrefs((p) => ({ ...p, push_enabled: false }));
      } else {
        const subscribed = await notificationEngine.subscribeToPush();
        if (subscribed) {
          setPushSubscribed(true);
          setPushStatus("granted");
          setPrefs((p) => ({ ...p, push_enabled: true }));
        } else {
          setError("Push permission was denied or not supported in this browser.");
        }
      }
    } catch (err: any) {
      setError("Failed to configure push subscription.");
    } finally {
      setPushLoading(false);
    }
  };

  // Test Audio / Haptic
  const handleTestAudio = (cat: NotificationCategory) => {
    if (cat === "SUCCESS") notificationEngine.notify("TOPUP_APPROVED");
    else if (cat === "INFO") notificationEngine.notify("TOPUP_SUBMITTED");
    else if (cat === "WARNING") notificationEngine.notify("WALLET_LOW");
    else if (cat === "ERROR") notificationEngine.notify("TOPUP_REJECTED");
    else if (cat === "CRITICAL") notificationEngine.notify("FRAUD_RISK_ALERT");
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-blue-600" /> Notification & Alert Preferences
          </h1>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Manage multi-channel delivery (In-App, Desktop Push, WhatsApp, SMS, Email) with server-enforced tenant isolation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadPreferences}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>

          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-4 h-4 text-emerald-200" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Saving..." : saveSuccess ? "Saved Successfully" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Status Alerts */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Preferences updated and synchronized with your enterprise account.</span>
        </div>
      )}

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Delivery Channels & Event Categories (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Delivery Channels */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Delivery Channels</h3>
              </div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Multi-Channel</span>
            </div>

            <div className="p-5 divide-y divide-slate-100 space-y-4">
              {/* In-App Alerts */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600 mt-0.5">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">In-App Live Alerts</h4>
                    <p className="text-xs text-slate-500">Real-time SSE event stream, bell badge, and desktop chime cues.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs.in_app_enabled}
                    onChange={(e) => setPrefs({ ...prefs, in_app_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Desktop Push */}
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 mt-0.5">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-800">Windows & Browser Push</h4>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          pushSubscribed
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {pushSubscribed ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Native OS desktop push alerts even when the portal window is in the background.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTogglePush}
                    disabled={pushLoading}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      pushSubscribed
                        ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        : "bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                    }`}
                  >
                    {pushLoading
                      ? "Configuring..."
                      : pushSubscribed
                      ? "Unsubscribe"
                      : "Enable Push"}
                  </button>
                </div>
              </div>

              {/* Email Notifications */}
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-sky-50 text-sky-600 mt-0.5">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Email Digest & Approval Receipts</h4>
                    <p className="text-xs text-slate-500">Transaction receipts and admin decision notifications sent to registered email.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs.email_enabled}
                    onChange={(e) => setPrefs({ ...prefs, email_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* WhatsApp Alerts */}
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 mt-0.5">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">WhatsApp Cloud Alerts</h4>
                    <p className="text-xs text-slate-500">Meta Cloud API alerts for topup approval/rejection and critical ledger notices.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs.whatsapp_enabled}
                    onChange={(e) => setPrefs({ ...prefs, whatsapp_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* SMS Alerts */}
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-600 mt-0.5">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">SMS Transactional Alerts</h4>
                    <p className="text-xs text-slate-500">High-priority OTPs, password resets, and critical wallet debit SMS.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs.sms_enabled}
                    onChange={(e) => setPrefs({ ...prefs, sms_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Section 2: Event Subscriptions */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Event Categories</h3>
              </div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Filters</span>
            </div>

            <div className="p-5 divide-y divide-slate-100 space-y-4">
              {/* Financial & Transactions */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Financial & Transactions</h4>
                  <p className="text-xs text-slate-500">Top-Up submissions/approvals, wallet credit/debits, payouts, recharges, settlements.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs.transactional_enabled}
                    onChange={(e) => setPrefs({ ...prefs, transactional_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Security & Access */}
              <div className="flex items-center justify-between pt-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Security & Authentication</h4>
                  <p className="text-xs text-slate-500">New login detections, password/MPIN changes, suspicious activity, device authorizations.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs.security_enabled}
                    onChange={(e) => setPrefs({ ...prefs, security_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Operational & Partner Governance */}
              <div className="flex items-center justify-between pt-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Operational & Partner Approvals</h4>
                  <p className="text-xs text-slate-500">Retailer KYC verification, partner approval actions (SD/Dist), MDR rate modifications.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs.operational_enabled}
                    onChange={(e) => setPrefs({ ...prefs, operational_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Quiet Hours & Audio Synthesizer Controls */}
        <div className="space-y-6">
          {/* Do Not Disturb (DND) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900">Do Not Disturb</h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.do_not_disturb}
                  onChange={(e) => setPrefs({ ...prefs, do_not_disturb: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Mutes non-critical push notifications and audio alerts during scheduled hours.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Quiet From</label>
                <input
                  type="time"
                  value={prefs.dnd_start_time || "22:00"}
                  onChange={(e) => setPrefs({ ...prefs, dnd_start_time: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Quiet Until</label>
                <input
                  type="time"
                  value={prefs.dnd_end_time || "08:00"}
                  onChange={(e) => setPrefs({ ...prefs, dnd_end_time: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Sound & Haptic Test Studio */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center gap-2 mb-3">
              <Volume2 className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Audio & Haptic Feedback</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Synthesized Web Audio chimes and mobile vibrations (zero external asset dependency).
            </p>

            <div className="space-y-2">
              <button
                onClick={() => handleTestAudio("SUCCESS")}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/60 text-emerald-900 text-xs font-bold transition-all cursor-pointer"
              >
                <span>Success Chime (Approval / Credit)</span>
                <Play className="w-3.5 h-3.5 text-emerald-600" />
              </button>

              <button
                onClick={() => handleTestAudio("INFO")}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 text-blue-900 text-xs font-bold transition-all cursor-pointer"
              >
                <span>Info Tap (Submitted / Processing)</span>
                <Play className="w-3.5 h-3.5 text-blue-600" />
              </button>

              <button
                onClick={() => handleTestAudio("WARNING")}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/60 text-amber-900 text-xs font-bold transition-all cursor-pointer"
              >
                <span>Warning Pulse (Low Balance / Limit)</span>
                <Play className="w-3.5 h-3.5 text-amber-600" />
              </button>

              <button
                onClick={() => handleTestAudio("ERROR")}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/60 text-rose-900 text-xs font-bold transition-all cursor-pointer"
              >
                <span>Error Buzz (Rejection / Failed)</span>
                <Play className="w-3.5 h-3.5 text-rose-600" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
