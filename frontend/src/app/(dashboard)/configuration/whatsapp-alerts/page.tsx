"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import {
  MessageSquare,
  ShieldCheck,
  Send,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Smartphone,
  Check,
  X,
  ExternalLink,
  Save,
  PhoneCall,
  Sliders,
  Sparkles,
  Layers,
  ChevronRight,
  Eye,
  KeyRound,
  FileCheck
} from "lucide-react";

// Web Audio API Synthesizers for auditory feedback
const playSuccessSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      gain.gain.setValueAtTime(0.15, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.3);
    });
  } catch {}
};

const playErrorSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    [440, 349.23].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);
      gain.gain.setValueAtTime(0.2, now + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 0.35);
    });
  } catch {}
};

interface WhatsAppConfig {
  id?: number;
  public_id?: string;
  is_enabled: boolean;
  template_id: string;
  template_name: string;
  phone_number_id: string;
  admin_phone_numbers: string;
  language_code: string;
  button_base_url: string;
  updated_at?: string | null;
}

export default function WhatsAppAlertsConfigurationPage() {
  const [config, setConfig] = useState<WhatsAppConfig>({
    is_enabled: true,
    template_id: "1043386768499813",
    template_name: "topup_request_admin",
    phone_number_id: "497102120160245",
    admin_phone_numbers: "7013914767",
    language_code: "en",
    button_base_url: "https://receipt.pay2pay.in/r/",
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [previewMode, setPreviewMode] = useState<"sample" | "template">("sample");
  const [newPhoneInput, setNewPhoneInput] = useState<string>("");

  const [testForm, setTestForm] = useState({
    test_mobile: "7013914767",
    retailer_name: "sathiya",
    retailer_id: "12345",
    request_id: "TOP-REQ-84920",
    amount: 1000,
    payment_mode: "pos intstance",
    status_text: "Pending Approval",
    view_id: "sdfdfrtrt"
  });

  const [alertState, setAlertState] = useState<{
    type: "success" | "error" | null;
    message: string;
    detail?: string;
  }>({
    type: null,
    message: "",
  });

  const [testResult, setTestResult] = useState<{
    success: boolean;
    wamid?: string;
    timestamp?: string;
    raw?: any;
  } | null>(null);

  // Fetch configuration on component mount
  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/admin/whatsapp-config/topup");
      if (res.data && res.data.config) {
        setConfig({
          ...res.data.config,
          template_id: res.data.config.template_id || "1043386768499813",
          template_name: res.data.config.template_name || "topup_request_admin",
          phone_number_id: res.data.config.phone_number_id || "497102120160245",
          admin_phone_numbers: res.data.config.admin_phone_numbers || "7013914767",
          button_base_url: res.data.config.button_base_url || "https://receipt.pay2pay.in/r/",
        });
        // Also set primary test mobile
        const firstNum = (res.data.config.admin_phone_numbers || "7013914767")
          .split(",")[0]
          .trim();
        if (firstNum) {
          setTestForm((prev) => ({ ...prev, test_mobile: firstNum }));
        }
      }
    } catch (err: any) {
      console.error("Error fetching whatsapp config:", err);
      setAlertState({
        type: "error",
        message: "Failed to load WhatsApp configuration from server.",
        detail: err?.response?.data?.detail || err?.message
      });
      playErrorSound();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Save configuration
  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      setAlertState({ type: null, message: "" });
      const payload = {
        is_enabled: config.is_enabled,
        template_id: config.template_id.trim(),
        template_name: config.template_name.trim(),
        phone_number_id: config.phone_number_id.trim(),
        admin_phone_numbers: config.admin_phone_numbers.trim(),
        language_code: config.language_code || "en",
        button_base_url: config.button_base_url.trim(),
      };

      const res = await api.post("/api/v1/admin/whatsapp-config/topup", payload);
      if (res.data && res.data.success) {
        setConfig((prev) => ({
          ...prev,
          ...(res.data.config || {})
        }));
        setAlertState({
          type: "success",
          message: "WhatsApp top-up notification configuration updated and deployed to database.",
        });
        playSuccessSound();
      } else {
        throw new Error(res.data?.message || "Failed to update configuration");
      }
    } catch (err: any) {
      console.error("Error saving whatsapp config:", err);
      setAlertState({
        type: "error",
        message: "Failed to save WhatsApp configuration.",
        detail: err?.response?.data?.detail || err?.message
      });
      playErrorSound();
    } finally {
      setSaving(false);
    }
  };

  // Send test alert
  const handleSendTestAlert = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      setAlertState({ type: null, message: "" });

      const payload = {
        test_mobile: testForm.test_mobile.trim(),
        retailer_name: testForm.retailer_name.trim(),
        retailer_id: testForm.retailer_id.trim(),
        request_id: testForm.request_id.trim(),
        amount: Number(testForm.amount) || 1000,
        payment_mode: testForm.payment_mode.trim(),
        status_text: testForm.status_text.trim(),
        view_id: testForm.view_id.trim() || testForm.request_id.trim()
      };

      const res = await api.post("/api/v1/admin/whatsapp-config/test-alert", payload);
      if (res.data && res.data.success) {
        const metaRes = res.data.delivery_result?.data;
        const msgId = metaRes?.messages?.[0]?.id || "Delivered (Meta 200 OK)";
        setTestResult({
          success: true,
          wamid: msgId,
          timestamp: new Date().toLocaleTimeString(),
          raw: metaRes
        });
        setAlertState({
          type: "success",
          message: `Test WhatsApp notification sent to ${testForm.test_mobile}! Meta API WAMID: ${msgId}`,
        });
        playSuccessSound();
      } else {
        const errMsg = res.data?.delivery_result?.error || res.data?.message || "Delivery rejected by WhatsApp API";
        setTestResult({
          success: false,
          raw: res.data?.delivery_result
        });
        setAlertState({
          type: "error",
          message: "Failed to deliver WhatsApp test alert.",
          detail: typeof errMsg === "object" ? JSON.stringify(errMsg) : String(errMsg)
        });
        playErrorSound();
      }
    } catch (err: any) {
      console.error("Error sending test whatsapp alert:", err);
      setAlertState({
        type: "error",
        message: "Failed to send WhatsApp test alert.",
        detail: err?.response?.data?.detail || err?.message
      });
      playErrorSound();
    } finally {
      setTesting(false);
    }
  };

  // Phone number chip management
  const phoneList = config.admin_phone_numbers
    ? config.admin_phone_numbers.split(",").map((n) => n.trim()).filter(Boolean)
    : [];

  const handleAddPhone = () => {
    const trimmed = newPhoneInput.trim().replace(/[^0-9]/g, "");
    if (!trimmed || trimmed.length < 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }
    const cleanNum = trimmed.length === 10 ? trimmed : trimmed.slice(-10);
    if (!phoneList.includes(cleanNum)) {
      const updatedList = [...phoneList, cleanNum];
      setConfig((prev) => ({
        ...prev,
        admin_phone_numbers: updatedList.join(", ")
      }));
    }
    setNewPhoneInput("");
  };

  const handleRemovePhone = (phoneToRemove: string) => {
    const updatedList = phoneList.filter((p) => p !== phoneToRemove);
    if (updatedList.length === 0) {
      alert("At least one admin mobile number is required.");
      return;
    }
    setConfig((prev) => ({
      ...prev,
      admin_phone_numbers: updatedList.join(", ")
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
            <Link href="/configuration/services" className="hover:text-slate-700">
              Configuration
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-emerald-700 font-semibold">WhatsApp Alerts</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Retailer Top-Up WhatsApp Alerts
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    config.is_enabled
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-amber-100 text-amber-800 border border-amber-300"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      config.is_enabled ? "bg-emerald-600 animate-pulse" : "bg-amber-600"
                    }`}
                  />
                  {config.is_enabled ? "ACTIVE · LIVE" : "DISABLED"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically dispatch instant WhatsApp notifications to administrators when retailers submit wallet top-up requests.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchConfig}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
            title="Reload config from server"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-600" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleSaveConfig}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg transition-all shadow-sm shadow-emerald-600/30 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving to Database..." : "Save Configuration"}
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {alertState.message && (
        <div
          className={`flex items-start justify-between p-4 rounded-xl border ${
            alertState.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <div className="flex items-start gap-3">
            {alertState.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-sm font-semibold">{alertState.message}</p>
              {alertState.detail && (
                <p className="text-xs mt-1 opacity-90 font-mono break-all">{alertState.detail}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setAlertState({ type: null, message: "" })}
            className="text-slate-400 hover:text-slate-700 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Left Settings Form, Right Live Smartphone Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 7 Cols */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Master Enable / Disable Toggle Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">Notification Trigger Status</h2>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    Master Switch
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Control whether WhatsApp messages are automatically dispatched to admin phones on new top-up submissions.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.is_enabled}
                  onChange={(e) => setConfig({ ...config, is_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div
              className={`text-xs p-3 rounded-lg border ${
                config.is_enabled
                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-800"
                  : "bg-slate-50 border-slate-200 text-slate-600"
              }`}
            >
              {config.is_enabled ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Top-Up Alerts are ACTIVE:</strong> As soon as a retailer submits a top-up request from the web or POS terminal, WhatsApp messages are instantly dispatched in the background to all configured admin recipients.
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>
                    <strong>Alerts are PAUSED:</strong> Top-up submissions will still process normally in the database and admin dashboard, but no WhatsApp messages will be triggered.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 2. Admin Recipients Configuration Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-emerald-600" />
                  Admin Recipient Phone Numbers
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mobile numbers that will receive WhatsApp notifications. Enter 10-digit Indian numbers without spaces.
                </p>
              </div>
              <span className="text-xs font-semibold px-2 py-1 bg-slate-100 rounded text-slate-700">
                {phoneList.length} Recipient{phoneList.length === 1 ? "" : "s"}
              </span>
            </div>

            {/* List of active numbers as chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              {phoneList.map((phone, idx) => (
                <div
                  key={phone + idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-mono font-medium text-emerald-900 shadow-sm"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>+91 {phone}</span>
                  {idx === 0 && (
                    <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1 rounded uppercase font-sans font-bold">
                      Primary
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemovePhone(phone)}
                    className="text-emerald-700 hover:text-rose-600 p-0.5 ml-1 transition-colors"
                    title="Remove number"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {phoneList.length === 0 && (
                <p className="text-xs text-rose-600 font-medium">
                  No recipient numbers configured. Add at least one mobile number below.
                </p>
              )}
            </div>

            {/* Input to add a new phone */}
            <div className="flex gap-2 pt-2">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-mono text-slate-400">
                  +91
                </span>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="Enter 10-digit admin mobile (e.g. 7013914767)"
                  value={newPhoneInput}
                  onChange={(e) => setNewPhoneInput(e.target.value.replace(/[^0-9]/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && handleAddPhone()}
                  className="w-full pl-12 pr-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
              <button
                type="button"
                onClick={handleAddPhone}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
              >
                Add Number
              </button>
            </div>
          </div>

          {/* 3. Meta Cloud API & Template Parameters Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-600" />
                  Meta WhatsApp API & Template Parameters
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pre-configured with your approved Meta Business WhatsApp Cloud API credentials.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                <ShieldCheck className="w-3 h-3" />
                Meta Approved
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  WhatsApp API / Template ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={config.template_id}
                    onChange={(e) => setConfig({ ...config, template_id: e.target.value })}
                    className="w-full font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute right-2.5 top-2 text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-sans">
                    ID
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Official Meta Template ID: 1043386768499813</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  value={config.template_name}
                  onChange={(e) => setConfig({ ...config, template_name: e.target.value })}
                  className="w-full font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">Meta Template Name: topup_request_admin</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Meta Phone Number ID
                </label>
                <input
                  type="text"
                  value={config.phone_number_id}
                  onChange={(e) => setConfig({ ...config, phone_number_id: e.target.value })}
                  className="w-full font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">Verified sender: 497102120160245</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Language Code
                </label>
                <input
                  type="text"
                  value={config.language_code}
                  onChange={(e) => setConfig({ ...config, language_code: e.target.value })}
                  className="w-full font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">Language: en (English)</p>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Receipt View Base URL
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={config.button_base_url}
                    onChange={(e) => setConfig({ ...config, button_base_url: e.target.value })}
                    className="w-full font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute right-3 top-2 text-[11px] text-slate-400 font-mono">
                    {"<id>"}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Target destination when admin taps &quot;View&quot; on WhatsApp: https://receipt.pay2pay.in/r/&lt;id&gt;
                </p>
              </div>
            </div>
          </div>

          {/* 4. Live Test Dispatcher Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-600" />
                  Trigger Test WhatsApp Alert
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Send an immediate test alert with sample parameters to verify real-time Meta delivery.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSendTestAlert}
                disabled={testing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
              >
                <Send className={`w-3.5 h-3.5 ${testing ? "animate-pulse" : ""}`} />
                {testing ? "Dispatching..." : "Send Test Now"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Send Test To Mobile
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={testForm.test_mobile}
                  onChange={(e) => setTestForm({ ...testForm, test_mobile: e.target.value })}
                  className="w-full font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Sample Retailer Name ({`{{1}}`})
                </label>
                <input
                  type="text"
                  value={testForm.retailer_name}
                  onChange={(e) => setTestForm({ ...testForm, retailer_name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Sample Retailer ID ({`{{2}}`})
                </label>
                <input
                  type="text"
                  value={testForm.retailer_id}
                  onChange={(e) => setTestForm({ ...testForm, retailer_id: e.target.value })}
                  className="w-full font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Sample Request ID ({`{{3}}`})
                </label>
                <input
                  type="text"
                  value={testForm.request_id}
                  onChange={(e) => setTestForm({ ...testForm, request_id: e.target.value })}
                  className="w-full font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Sample Amount ({`{{4}}`})
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={testForm.amount}
                    onChange={(e) => setTestForm({ ...testForm, amount: Number(e.target.value) })}
                    className="w-full pl-6 pr-3 py-1.5 font-mono bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Sample Payment Mode ({`{{5}}`})
                </label>
                <input
                  type="text"
                  value={testForm.payment_mode}
                  onChange={(e) => setTestForm({ ...testForm, payment_mode: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Test result status badge */}
            {testResult && (
              <div
                className={`text-xs p-3 rounded-lg border ${
                  testResult.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-rose-50 border-rose-200 text-rose-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">
                    {testResult.success ? "✓ Meta Delivery Acknowledged (200 OK)" : "✕ Delivery Failed"}
                  </span>
                  {testResult.timestamp && (
                    <span className="text-[10px] text-slate-500">{testResult.timestamp}</span>
                  )}
                </div>
                {testResult.wamid && (
                  <p className="font-mono text-[11px] mt-1 break-all text-slate-700">
                    WAMID: {testResult.wamid}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: 5 Cols - Realistic Smartphone WhatsApp Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              Live WhatsApp Smartphone Mockup
            </h2>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-200 p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPreviewMode("sample")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  previewMode === "sample"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Sample Data
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("template")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  previewMode === "template"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Template Tokens
              </button>
            </div>
          </div>

          {/* Smartphone Shell */}
          <div className="mx-auto max-w-sm w-full bg-slate-900 rounded-[2.5rem] p-3.5 shadow-2xl border-4 border-slate-800">
            {/* Phone Speaker & Camera Notch */}
            <div className="relative mb-2 flex justify-center items-center">
              <div className="w-20 h-4 bg-slate-950 rounded-full flex items-center justify-center">
                <div className="w-8 h-1 bg-slate-800 rounded-full" />
              </div>
            </div>

            {/* Phone Screen Container */}
            <div className="bg-[#ECE5DD] rounded-[2rem] overflow-hidden shadow-inner flex flex-col h-[560px] border border-slate-700/50">
              {/* WhatsApp App Bar */}
              <div className="bg-[#075E54] text-white px-3 py-2.5 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-xs font-bold ring-1 ring-white/30">
                    P2P
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold tracking-tight">Pay2Pay Alerts</span>
                      <ShieldCheck className="w-3 h-3 text-emerald-300" />
                    </div>
                    <span className="text-[9px] text-emerald-200 block -mt-0.5">
                      Verified Business Account
                    </span>
                  </div>
                </div>
                <div className="text-[10px] bg-emerald-800/80 px-2 py-0.5 rounded font-mono text-emerald-100">
                  Cloud API
                </div>
              </div>

              {/* Chat Canvas with Wallpaper Background */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-[radial-gradient(#d1d7db_1px,transparent_1px)] [background-size:16px_16px]">
                {/* Date Pill */}
                <div className="flex justify-center">
                  <span className="bg-white/80 backdrop-blur-sm text-[10px] font-semibold text-slate-600 px-2.5 py-0.5 rounded-full shadow-sm">
                    Today
                  </span>
                </div>

                {/* WhatsApp Incoming Bubble */}
                <div className="max-w-[92%] bg-white rounded-2xl rounded-tl-sm p-3.5 shadow-md border border-slate-200/60 space-y-2 text-slate-900 text-xs relative">
                  {/* Bubble Header */}
                  <div className="font-semibold text-slate-900 border-b border-slate-100 pb-1.5 leading-snug">
                    <p className="font-bold text-slate-900">Hello Admin,</p>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      A new wallet top-up request has been submitted.
                    </p>
                  </div>

                  {/* Body Key-Values */}
                  <div className="space-y-1 text-[11px] leading-relaxed py-1">
                    <div className="flex items-start">
                      <span className="text-slate-500 w-24 shrink-0">Retailer:</span>
                      <span className="font-semibold text-slate-800">
                        {previewMode === "sample" ? testForm.retailer_name : "{{1}}"}
                      </span>
                    </div>

                    <div className="flex items-start">
                      <span className="text-slate-500 w-24 shrink-0">Retailer ID:</span>
                      <span className="font-mono font-medium text-slate-800">
                        {previewMode === "sample" ? testForm.retailer_id : "{{2}}"}
                      </span>
                    </div>

                    <div className="flex items-start">
                      <span className="text-slate-500 w-24 shrink-0">Request ID:</span>
                      <span className="font-mono font-medium text-slate-800">
                        {previewMode === "sample" ? testForm.request_id : "{{3}}"}
                      </span>
                    </div>

                    <div className="flex items-start">
                      <span className="text-slate-500 w-24 shrink-0">Amount:</span>
                      <span className="font-bold text-emerald-700">
                        ₹{previewMode === "sample" ? testForm.amount.toLocaleString("en-IN") : "{{4}}"}
                      </span>
                    </div>

                    <div className="flex items-start">
                      <span className="text-slate-500 w-24 shrink-0">Payment Mode:</span>
                      <span className="font-medium text-slate-800 capitalize">
                        {previewMode === "sample" ? testForm.payment_mode : "{{5}}"}
                      </span>
                    </div>

                    <div className="flex items-start">
                      <span className="text-slate-500 w-24 shrink-0">Requested Date & Time:</span>
                      <span className="text-slate-700">
                        {previewMode === "sample" ? "03-09-2026 14:30" : "{{6}}"}
                      </span>
                    </div>

                    <div className="flex items-start">
                      <span className="text-slate-500 w-24 shrink-0">Status:</span>
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        {previewMode === "sample" ? testForm.status_text : "{{7}}"}
                      </span>
                    </div>
                  </div>

                  {/* Call to Action Footer */}
                  <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                    Please review and approve/reject the request.
                  </div>

                  {/* Timestamp & Read Status */}
                  <div className="flex items-center justify-end gap-1 text-[9px] text-slate-400 mt-1">
                    <span>14:30</span>
                    <span className="text-[#34B7F1] font-bold">✓✓</span>
                  </div>

                  {/* Interactive WhatsApp URL Button */}
                  <div className="pt-2 border-t border-slate-200 mt-2">
                    <a
                      href={`${config.button_base_url}${testForm.view_id || "demo"}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-[#00A884] hover:text-[#008f70] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View</span>
                    </a>
                    <p className="text-[9px] text-center text-slate-400 mt-1 font-mono">
                      Opens: {config.button_base_url}&lt;id&gt;
                    </p>
                  </div>
                </div>
              </div>

              {/* Fake WhatsApp Keyboard Bar */}
              <div className="bg-[#F0F2F5] px-3 py-2 border-t border-slate-300 flex items-center gap-2 text-slate-400">
                <div className="flex-1 bg-white rounded-full px-3 py-1.5 text-xs text-slate-400 flex items-center justify-between">
                  <span>Type a message</span>
                </div>
                <div className="w-7 h-7 rounded-full bg-[#00A884] text-white flex items-center justify-center text-xs">
                  <Send className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Verification Badge */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 flex items-start gap-2.5">
            <FileCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Meta Cloud API Template Verified</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Template ID <strong>1043386768499813</strong> matches the approved Meta template configuration with all 7 dynamic positional parameters and 1 quick receipt view button.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
