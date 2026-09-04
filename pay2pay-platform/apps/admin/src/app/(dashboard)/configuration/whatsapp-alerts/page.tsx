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
  AlertTriangle,
  Info,
  Smartphone,
  Check,
  X,
  ExternalLink,
  Save,
  PhoneCall,
  Sliders,
  ChevronRight,
  KeyRound,
  FileCheck,
  Bell,
  Clock,
  UserCheck,
  Layers
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
  // Admin Alert
  is_enabled: boolean;
  template_id: string;
  template_name: string;
  phone_number_id: string;
  admin_phone_numbers: string;
  language_code: string;
  button_base_url: string;
  // Retailer Status Alert
  retailer_alert_enabled: boolean;
  retailer_template_id: string;
  retailer_template_name: string;
  retailer_language_code: string;
  retailer_button_base_url: string;
  updated_at?: string | null;
}

export default function WhatsAppAlertsConfigurationPage() {
  const [activeTab, setActiveTab] = useState<"admin" | "retailer">("admin");
  const [config, setConfig] = useState<WhatsAppConfig>({
    is_enabled: true,
    template_id: "1043386768499813",
    template_name: "topup_request_admin",
    phone_number_id: "497102120160245",
    admin_phone_numbers: "7013914767",
    language_code: "en",
    button_base_url: "https://receipt.pay2pay.in/r/",
    retailer_alert_enabled: true,
    retailer_template_id: "1586618753193150",
    retailer_template_name: "topup_status_retailer",
    retailer_language_code: "en",
    retailer_button_base_url: "https://receipt.pay2pay.in/r/",
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testingAdmin, setTestingAdmin] = useState<boolean>(false);
  const [testingRetailer, setTestingRetailer] = useState<boolean>(false);
  const [previewModeAdmin, setPreviewModeAdmin] = useState<"sample" | "template">("sample");
  const [previewModeRetailer, setPreviewModeRetailer] = useState<"sample" | "template">("sample");
  const [newPhoneInput, setNewPhoneInput] = useState<string>("");

  // Test form for Admin Alert
  const [adminTestForm, setAdminTestForm] = useState({
    test_mobile: "7013914767",
    retailer_name: "sathiya",
    retailer_id: "12345",
    request_id: "sdfdfrtrt",
    amount: 1000,
    payment_mode: "pos intstance",
    status_text: "Pending Approval",
    view_id: "sdfdfrtrt"
  });

  // Test form for Retailer Status Alert
  const [retailerTestForm, setRetailerTestForm] = useState({
    test_mobile: "7013914767",
    retailer_name: "123",
    request_id: "1000",
    amount_requested: 9999,
    approved_amount: 9999,
    wallet_credit: 9999,
    payment_mode: "pos",
    transaction_id: "123erdfdfdf",
    approved_date_time: "03-09-2026 14:30",
    status_text: "Approved",
    view_id: "1234"
  });

  const [alertState, setAlertState] = useState<{
    type: "success" | "error" | null;
    message: string;
    detail?: string;
  }>({
    type: null,
    message: "",
  });

  const [adminTestResult, setAdminTestResult] = useState<{
    success: boolean;
    wamid?: string;
    timestamp?: string;
    raw?: any;
  } | null>(null);

  const [retailerTestResult, setRetailerTestResult] = useState<{
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
          retailer_template_id: res.data.config.retailer_template_id || "1586618753193150",
          retailer_template_name: res.data.config.retailer_template_name || "topup_status_retailer",
          retailer_language_code: res.data.config.retailer_language_code || "en",
          retailer_button_base_url: res.data.config.retailer_button_base_url || "https://receipt.pay2pay.in/r/",
        });
        const firstNum = (res.data.config.admin_phone_numbers || "7013914767")
          .split(",")[0]
          .trim();
        if (firstNum) {
          setAdminTestForm((prev) => ({ ...prev, test_mobile: firstNum }));
          setRetailerTestForm((prev) => ({ ...prev, test_mobile: firstNum }));
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
        retailer_alert_enabled: config.retailer_alert_enabled,
        retailer_template_id: config.retailer_template_id.trim(),
        retailer_template_name: config.retailer_template_name.trim(),
        retailer_language_code: config.retailer_language_code || "en",
        retailer_button_base_url: config.retailer_button_base_url.trim(),
      };

      const res = await api.post("/api/v1/admin/whatsapp-config/topup", payload);
      if (res.data && res.data.success) {
        setConfig((prev) => ({
          ...prev,
          ...(res.data.config || {})
        }));
        setAlertState({
          type: "success",
          message: "All WhatsApp notification configurations updated and committed to PostgreSQL database.",
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

  // Send test alert to Admin
  const handleSendAdminTestAlert = async () => {
    try {
      setTestingAdmin(true);
      setAdminTestResult(null);
      setAlertState({ type: null, message: "" });

      const payload = {
        test_mobile: adminTestForm.test_mobile.trim(),
        retailer_name: adminTestForm.retailer_name.trim(),
        retailer_id: adminTestForm.retailer_id.trim(),
        request_id: adminTestForm.request_id.trim(),
        amount: Number(adminTestForm.amount) || 1000,
        payment_mode: adminTestForm.payment_mode.trim(),
        status_text: adminTestForm.status_text.trim(),
        view_id: adminTestForm.view_id.trim() || adminTestForm.request_id.trim()
      };

      const res = await api.post("/api/v1/admin/whatsapp-config/test-alert", payload);
      if (res.data && res.data.success) {
        const metaRes = res.data.delivery_result?.data || res.data.delivery_result?.meta_response;
        const msgId = metaRes?.messages?.[0]?.id || "Delivered (Meta 200 OK)";
        setAdminTestResult({
          success: true,
          wamid: msgId,
          timestamp: new Date().toLocaleTimeString(),
          raw: metaRes
        });
        setAlertState({
          type: "success",
          message: `Admin Test Alert delivered to +91 ${adminTestForm.test_mobile}! Meta WAMID: ${msgId}`,
        });
        playSuccessSound();
      } else {
        const errMsg = res.data?.delivery_result?.detail || res.data?.delivery_result?.error || res.data?.message || "Delivery rejected";
        setAdminTestResult({
          success: false,
          raw: res.data?.delivery_result
        });
        setAlertState({
          type: "error",
          message: "Failed to deliver Admin WhatsApp test alert.",
          detail: typeof errMsg === "object" ? JSON.stringify(errMsg) : String(errMsg)
        });
        playErrorSound();
      }
    } catch (err: any) {
      console.error("Error sending admin test alert:", err);
      setAlertState({
        type: "error",
        message: "Failed to send Admin WhatsApp test alert.",
        detail: err?.response?.data?.detail || err?.message
      });
      playErrorSound();
    } finally {
      setTestingAdmin(false);
    }
  };

  // Send test alert to Retailer
  const handleSendRetailerTestAlert = async () => {
    try {
      setTestingRetailer(true);
      setRetailerTestResult(null);
      setAlertState({ type: null, message: "" });

      const payload = {
        test_mobile: retailerTestForm.test_mobile.trim(),
        retailer_name: retailerTestForm.retailer_name.trim(),
        request_id: retailerTestForm.request_id.trim(),
        amount_requested: Number(retailerTestForm.amount_requested) || 9999,
        approved_amount: Number(retailerTestForm.approved_amount) || 9999,
        wallet_credit: Number(retailerTestForm.wallet_credit) || 9999,
        payment_mode: retailerTestForm.payment_mode.trim(),
        transaction_id: retailerTestForm.transaction_id.trim(),
        approved_date_time: retailerTestForm.approved_date_time.trim(),
        status_text: retailerTestForm.status_text.trim(),
        view_id: retailerTestForm.view_id.trim() || "1234"
      };

      const res = await api.post("/api/v1/admin/whatsapp-config/test-retailer-alert", payload);
      if (res.data && res.data.success) {
        const metaRes = res.data.delivery_result?.data || res.data.delivery_result?.meta_response;
        const msgId = metaRes?.messages?.[0]?.id || "Delivered (Meta 200 OK)";
        setRetailerTestResult({
          success: true,
          wamid: msgId,
          timestamp: new Date().toLocaleTimeString(),
          raw: metaRes
        });
        setAlertState({
          type: "success",
          message: `Retailer status notification sent to +91 ${retailerTestForm.test_mobile}! WAMID: ${msgId}`,
        });
        playSuccessSound();
      } else {
        const errMsg = res.data?.delivery_result?.detail || res.data?.message || "Template pending review in Meta";
        setRetailerTestResult({
          success: false,
          raw: res.data?.delivery_result
        });
        setAlertState({
          type: "error",
          message: "Retailer status notification status:",
          detail: typeof errMsg === "object" ? JSON.stringify(errMsg) : String(errMsg)
        });
        playErrorSound();
      }
    } catch (err: any) {
      console.error("Error sending retailer test alert:", err);
      setAlertState({
        type: "error",
        message: "Failed to test Retailer WhatsApp alert.",
        detail: err?.response?.data?.detail || err?.message
      });
      playErrorSound();
    } finally {
      setTestingRetailer(false);
    }
  };

  // Phone chips
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
                  Wallet Top-Up WhatsApp Alerts
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  DUAL-FLOW ENGINE
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated WhatsApp communications for both incoming retailer top-up submissions and admin approval/rejection updates.
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
            {saving ? "Saving to Database..." : "Save All Configuration"}
          </button>
        </div>
      </div>

      {/* Tab Navigation Pill Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-200/80 p-1.5 rounded-xl border border-slate-300/80 max-w-2xl">
        <button
          type="button"
          onClick={() => setActiveTab("admin")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all ${
            activeTab === "admin"
              ? "bg-white text-emerald-800 shadow-sm border border-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <Bell className="w-4 h-4 text-emerald-600" />
          <span>1. New Request Alert (To Admin)</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">
            1043386768499813
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("retailer")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all ${
            activeTab === "retailer"
              ? "bg-white text-emerald-800 shadow-sm border border-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <UserCheck className="w-4 h-4 text-teal-600" />
          <span>2. Status Update Alert (To Retailer)</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 font-mono">
            1586618753193150
          </span>
        </button>
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

      {/* ========================================================================= */}
      {/* TAB 1: ADMIN TOP-UP SUBMISSION ALERT (Template 1043386768499813)          */}
      {/* ========================================================================= */}
      {activeTab === "admin" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Settings */}
          <div className="lg:col-span-7 space-y-6">
            {/* Master Toggle Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">Admin Notification Switch</h2>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      Incoming Submissions
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Control automated WhatsApp alerts to Admin phones when retailers submit wallet top-up requests.
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
                      <strong>Admin Alerts are ACTIVE:</strong> WhatsApp messages are instantly dispatched to all admin phones whenever a retailer submits a top-up request.
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>
                      <strong>Admin Alerts are PAUSED:</strong> Requests process normally in the portal, but no WhatsApp messages are sent.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Admin Recipients Management */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 text-emerald-600" />
                    Admin Recipient Phone Numbers
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    10-digit Indian mobile numbers that receive WhatsApp notifications.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2 py-1 bg-slate-100 rounded text-slate-700">
                  {phoneList.length} Recipient{phoneList.length === 1 ? "" : "s"}
                </span>
              </div>

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
              </div>

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
                    className="w-full pl-12 pr-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
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

            {/* Template Specs */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-emerald-600" />
                    Meta Cloud API & Template ID
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Approved Meta WhatsApp credentials.</p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  <ShieldCheck className="w-3 h-3" />
                  Meta Approved
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">WhatsApp API / Template ID</label>
                  <input
                    type="text"
                    value={config.template_id}
                    onChange={(e) => setConfig({ ...config, template_id: e.target.value })}
                    className="w-full font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Official ID: 1043386768499813</p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Template Name</label>
                  <input
                    type="text"
                    value={config.template_name}
                    onChange={(e) => setConfig({ ...config, template_name: e.target.value })}
                    className="w-full font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">topup_request_admin</p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Meta Phone Number ID</label>
                  <input
                    type="text"
                    value={config.phone_number_id}
                    onChange={(e) => setConfig({ ...config, phone_number_id: e.target.value })}
                    className="w-full font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Receipt URL Base</label>
                  <input
                    type="text"
                    value={config.button_base_url}
                    onChange={(e) => setConfig({ ...config, button_base_url: e.target.value })}
                    className="w-full font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Test Trigger */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Send className="w-4 h-4 text-emerald-600" />
                    Test Dispatcher (To Admin)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Send a real sample alert to verify Meta connection.</p>
                </div>
                <button
                  type="button"
                  onClick={handleSendAdminTestAlert}
                  disabled={testingAdmin}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 ${testingAdmin ? "animate-pulse" : ""}`} />
                  {testingAdmin ? "Dispatching..." : "Send Test Alert"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Send Test To Mobile</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={adminTestForm.test_mobile}
                    onChange={(e) => setAdminTestForm({ ...adminTestForm, test_mobile: e.target.value })}
                    className="w-full font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Retailer Name (Var 1)</label>
                  <input
                    type="text"
                    value={adminTestForm.retailer_name}
                    onChange={(e) => setAdminTestForm({ ...adminTestForm, retailer_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Retailer ID (Var 2)</label>
                  <input
                    type="text"
                    value={adminTestForm.retailer_id}
                    onChange={(e) => setAdminTestForm({ ...adminTestForm, retailer_id: e.target.value })}
                    className="w-full font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Amount ₹ (Var 4)</label>
                  <input
                    type="number"
                    value={adminTestForm.amount}
                    onChange={(e) => setAdminTestForm({ ...adminTestForm, amount: Number(e.target.value) })}
                    className="w-full font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                  />
                </div>
              </div>

              {adminTestResult && (
                <div
                  className={`text-xs p-3 rounded-lg border ${
                    adminTestResult.success
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : "bg-rose-50 border-rose-200 text-rose-900"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      {adminTestResult.success ? "✓ Meta Delivery Acknowledged (200 OK)" : "✕ Delivery Failed"}
                    </span>
                    {adminTestResult.timestamp && (
                      <span className="text-[10px] text-slate-500">{adminTestResult.timestamp}</span>
                    )}
                  </div>
                  {adminTestResult.wamid && (
                    <p className="font-mono text-[11px] mt-1 break-all text-slate-700">
                      WAMID: {adminTestResult.wamid}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Smartphone Mockup */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                Live WhatsApp Smartphone Preview
              </h2>

              <div className="flex items-center bg-slate-200 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPreviewModeAdmin("sample")}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    previewModeAdmin === "sample"
                      ? "bg-white text-emerald-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Sample
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewModeAdmin("template")}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    previewModeAdmin === "template"
                      ? "bg-white text-emerald-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Tokens
                </button>
              </div>
            </div>

            {/* Smartphone Shell */}
            <div className="mx-auto max-w-sm w-full bg-slate-900 rounded-[2.5rem] p-3.5 shadow-2xl border-4 border-slate-800">
              <div className="relative mb-2 flex justify-center items-center">
                <div className="w-20 h-4 bg-slate-950 rounded-full flex items-center justify-center">
                  <div className="w-8 h-1 bg-slate-800 rounded-full" />
                </div>
              </div>

              <div className="bg-[#ECE5DD] rounded-[2rem] overflow-hidden shadow-inner flex flex-col h-[560px] border border-slate-700/50">
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
                    Template: 1043386768499813
                  </div>
                </div>

                <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-[radial-gradient(#d1d7db_1px,transparent_1px)] [background-size:16px_16px]">
                  <div className="flex justify-center">
                    <span className="bg-white/80 backdrop-blur-sm text-[10px] font-semibold text-slate-600 px-2.5 py-0.5 rounded-full shadow-sm">
                      Today
                    </span>
                  </div>

                  <div className="max-w-[92%] bg-white rounded-2xl rounded-tl-sm p-3.5 shadow-md border border-slate-200/60 space-y-2 text-slate-900 text-xs relative">
                    <div className="font-semibold text-slate-900 border-b border-slate-100 pb-1.5 leading-snug">
                      <p className="font-bold text-slate-900">Hello Admin,</p>
                      <p className="text-slate-600 text-[11px] mt-0.5">
                        A new wallet top-up request has been submitted.
                      </p>
                    </div>

                    <div className="space-y-1 text-[11px] leading-relaxed py-1">
                      <div className="flex items-start">
                        <span className="text-slate-500 w-24 shrink-0">Retailer:</span>
                        <span className="font-semibold text-slate-800">
                          {previewModeAdmin === "sample" ? adminTestForm.retailer_name : "{{1}}"}
                        </span>
                      </div>

                      <div className="flex items-start">
                        <span className="text-slate-500 w-24 shrink-0">Retailer ID:</span>
                        <span className="font-mono font-medium text-slate-800">
                          {previewModeAdmin === "sample" ? adminTestForm.retailer_id : "{{2}}"}
                        </span>
                      </div>

                      <div className="flex items-start">
                        <span className="text-slate-500 w-24 shrink-0">Request ID:</span>
                        <span className="font-mono font-medium text-slate-800">
                          {previewModeAdmin === "sample" ? adminTestForm.request_id : "{{3}}"}
                        </span>
                      </div>

                      <div className="flex items-start">
                        <span className="text-slate-500 w-24 shrink-0">Amount:</span>
                        <span className="font-bold text-emerald-700">
                          ₹{previewModeAdmin === "sample" ? adminTestForm.amount.toLocaleString("en-IN") : "{{4}}"}
                        </span>
                      </div>

                      <div className="flex items-start">
                        <span className="text-slate-500 w-24 shrink-0">Payment Mode:</span>
                        <span className="font-medium text-slate-800 capitalize">
                          {previewModeAdmin === "sample" ? adminTestForm.payment_mode : "{{5}}"}
                        </span>
                      </div>

                      <div className="flex items-start">
                        <span className="text-slate-500 w-24 shrink-0">Requested Date & Time:</span>
                        <span className="text-slate-700">
                          {previewModeAdmin === "sample" ? "03-09-2026 14:30" : "{{6}}"}
                        </span>
                      </div>

                      <div className="flex items-start">
                        <span className="text-slate-500 w-24 shrink-0">Status:</span>
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          {previewModeAdmin === "sample" ? adminTestForm.status_text : "{{7}}"}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                      Please review and approve/reject the request.
                    </div>

                    <div className="flex items-center justify-end gap-1 text-[9px] text-slate-400 mt-1">
                      <span>14:30</span>
                      <span className="text-[#34B7F1] font-bold">✓✓</span>
                    </div>

                    <div className="pt-2 border-t border-slate-200 mt-2">
                      <a
                        href={`${config.button_base_url}${adminTestForm.view_id || "demo"}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-[#00A884] hover:text-[#008f70] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors shadow-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RETAILER TOP-UP STATUS UPDATE ALERT (Template 1586618753193150)    */}
      {/* ========================================================================= */}
      {activeTab === "retailer" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Settings */}
          <div className="lg:col-span-7 space-y-6">
            {/* Master Toggle Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">Retailer Status Alert Switch</h2>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-teal-100 text-teal-800">
                      Approval & Rejection
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Automatically notify retailers on WhatsApp when their top-up request is approved or rejected by admin.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.retailer_alert_enabled}
                    onChange={(e) => setConfig({ ...config, retailer_alert_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-teal-600"></div>
                </label>
              </div>

              <div
                className={`text-xs p-3 rounded-lg border ${
                  config.retailer_alert_enabled
                    ? "bg-teal-50/70 border-teal-200 text-teal-900"
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                {config.retailer_alert_enabled ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>
                      <strong>Retailer Alerts are ACTIVE:</strong> As soon as an admin approves or rejects a request, WhatsApp messages are automatically delivered to the retailer&apos;s registered phone number.
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>
                      <strong>Retailer Alerts are PAUSED:</strong> Approval and rejection workflows continue as normal, but no status message is dispatched to retailers.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Template Parameters Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-teal-600" />
                    Retailer Template Configuration
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Template registered for retailer wallet top-up updates.</p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded">
                  <Clock className="w-3 h-3 text-amber-600" />
                  Meta: topup_status_retailer
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">WhatsApp API / Template ID</label>
                  <input
                    type="text"
                    value={config.retailer_template_id}
                    onChange={(e) => setConfig({ ...config, retailer_template_id: e.target.value })}
                    className="w-full font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Official ID: 1586618753193150</p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Template Name</label>
                  <input
                    type="text"
                    value={config.retailer_template_name}
                    onChange={(e) => setConfig({ ...config, retailer_template_name: e.target.value })}
                    className="w-full font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">topup_status_retailer</p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Language Code</label>
                  <input
                    type="text"
                    value={config.retailer_language_code}
                    onChange={(e) => setConfig({ ...config, retailer_language_code: e.target.value })}
                    className="w-full font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Receipt Base URL</label>
                  <input
                    type="text"
                    value={config.retailer_button_base_url}
                    onChange={(e) => setConfig({ ...config, retailer_button_base_url: e.target.value })}
                    className="w-full font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">https://receipt.pay2pay.in/r/&lt;id&gt;</p>
                </div>
              </div>
            </div>

            {/* Test Trigger for Retailer Template */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Send className="w-4 h-4 text-teal-600" />
                    Test Dispatcher (To Retailer)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Send a test status notification with sample values.</p>
                </div>
                <button
                  type="button"
                  onClick={handleSendRetailerTestAlert}
                  disabled={testingRetailer}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 ${testingRetailer ? "animate-pulse" : ""}`} />
                  {testingRetailer ? "Dispatching..." : "Send Test Status"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Send Test To Mobile</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={retailerTestForm.test_mobile}
                    onChange={(e) => setRetailerTestForm({ ...retailerTestForm, test_mobile: e.target.value })}
                    className="w-full font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Retailer / Greeting Name (Var 1)</label>
                  <input
                    type="text"
                    value={retailerTestForm.retailer_name}
                    onChange={(e) => setRetailerTestForm({ ...retailerTestForm, retailer_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Request ID (Var 2)</label>
                  <input
                    type="text"
                    value={retailerTestForm.request_id}
                    onChange={(e) => setRetailerTestForm({ ...retailerTestForm, request_id: e.target.value })}
                    className="w-full font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Amount Requested ₹ (Var 3)</label>
                  <input
                    type="number"
                    value={retailerTestForm.amount_requested}
                    onChange={(e) => setRetailerTestForm({ ...retailerTestForm, amount_requested: Number(e.target.value) })}
                    className="w-full font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Approved Amount ₹ (Var 4)</label>
                  <input
                    type="number"
                    value={retailerTestForm.approved_amount}
                    onChange={(e) => setRetailerTestForm({ ...retailerTestForm, approved_amount: Number(e.target.value) })}
                    className="w-full font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Wallet Credit ₹ (Var 5)</label>
                  <input
                    type="number"
                    value={retailerTestForm.wallet_credit}
                    onChange={(e) => setRetailerTestForm({ ...retailerTestForm, wallet_credit: Number(e.target.value) })}
                    className="w-full font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Payment Mode (Var 6)</label>
                  <input
                    type="text"
                    value={retailerTestForm.payment_mode}
                    onChange={(e) => setRetailerTestForm({ ...retailerTestForm, payment_mode: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Transaction ID (Var 7)</label>
                  <input
                    type="text"
                    value={retailerTestForm.transaction_id}
                    onChange={(e) => setRetailerTestForm({ ...retailerTestForm, transaction_id: e.target.value })}
                    className="w-full font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Status (Var 9)</label>
                  <select
                    value={retailerTestForm.status_text}
                    onChange={(e) => setRetailerTestForm({ ...retailerTestForm, status_text: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                  >
                    <option value="Approved">Approved (Success)</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Receipt ID (Button)</label>
                  <input
                    type="text"
                    value={retailerTestForm.view_id}
                    onChange={(e) => setRetailerTestForm({ ...retailerTestForm, view_id: e.target.value })}
                    className="w-full font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                  />
                </div>
              </div>

              {retailerTestResult && (
                <div
                  className={`text-xs p-3 rounded-lg border ${
                    retailerTestResult.success
                      ? "bg-teal-50 border-teal-200 text-teal-900"
                      : "bg-amber-50 border-amber-300 text-amber-900"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      {retailerTestResult.success ? "✓ Meta Delivery Successful" : "ℹ Delivery Result (Pending Meta Translation Approval)"}
                    </span>
                    {retailerTestResult.timestamp && (
                      <span className="text-[10px] text-slate-500">{retailerTestResult.timestamp}</span>
                    )}
                  </div>
                  {retailerTestResult.wamid && (
                    <p className="font-mono text-[11px] mt-1 break-all text-slate-700">
                      WAMID: {retailerTestResult.wamid}
                    </p>
                  )}
                  {retailerTestResult.raw && !retailerTestResult.success && (
                    <p className="text-[11px] mt-1 text-amber-800">
                      Note: Meta WhatsApp reviews newly submitted templates. Once approved in WhatsApp Business Manager, live messages will deliver instantly.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Smartphone Mockup for Retailer */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-teal-600" />
                Retailer WhatsApp Smartphone Preview
              </h2>

              <div className="flex items-center bg-slate-200 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPreviewModeRetailer("sample")}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    previewModeRetailer === "sample"
                      ? "bg-white text-teal-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Sample
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewModeRetailer("template")}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    previewModeRetailer === "template"
                      ? "bg-white text-teal-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Tokens
                </button>
              </div>
            </div>

            {/* Smartphone Shell */}
            <div className="mx-auto max-w-sm w-full bg-slate-900 rounded-[2.5rem] p-3.5 shadow-2xl border-4 border-slate-800">
              <div className="relative mb-2 flex justify-center items-center">
                <div className="w-20 h-4 bg-slate-950 rounded-full flex items-center justify-center">
                  <div className="w-8 h-1 bg-slate-800 rounded-full" />
                </div>
              </div>

              <div className="bg-[#ECE5DD] rounded-[2rem] overflow-hidden shadow-inner flex flex-col h-[590px] border border-slate-700/50">
                <div className="bg-[#075E54] text-white px-3 py-2.5 flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-teal-700 flex items-center justify-center text-xs font-bold ring-1 ring-white/30">
                      P2P
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold tracking-tight">Pay2Pay</span>
                        <ShieldCheck className="w-3 h-3 text-emerald-300" />
                      </div>
                      <span className="text-[9px] text-emerald-200 block -mt-0.5">
                        Official Wallet Network
                      </span>
                    </div>
                  </div>
                  <div className="text-[10px] bg-teal-800/80 px-2 py-0.5 rounded font-mono text-emerald-100">
                    Template: 1586618753193150
                  </div>
                </div>

                <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-[radial-gradient(#d1d7db_1px,transparent_1px)] [background-size:16px_16px]">
                  <div className="flex justify-center">
                    <span className="bg-white/80 backdrop-blur-sm text-[10px] font-semibold text-slate-600 px-2.5 py-0.5 rounded-full shadow-sm">
                      Today
                    </span>
                  </div>

                  {/* Incoming WhatsApp bubble to retailer */}
                  <div className="max-w-[92%] bg-white rounded-2xl rounded-tl-sm p-3.5 shadow-md border border-slate-200/60 space-y-2 text-slate-900 text-xs relative">
                    <div className="font-semibold text-slate-900 border-b border-slate-100 pb-1.5 leading-snug">
                      <p className="font-bold text-slate-900">
                        Hi {previewModeRetailer === "sample" ? retailerTestForm.retailer_name : "{{1}}"},
                      </p>
                      <p className="text-slate-600 text-[11px] mt-0.5">
                        Your wallet top-up request status is updated.
                      </p>
                    </div>

                    <div className="space-y-1 text-[11px] leading-relaxed py-1">
                      <div className="flex items-start">
                        <span className="text-slate-500 w-28 shrink-0">Request ID:</span>
                        <span className="font-mono font-medium text-slate-800">
                          {previewModeRetailer === "sample" ? retailerTestForm.request_id : "{{2}}"}
                        </span>
                      </div>

                      <div className="flex items-start">
                        <span className="text-slate-500 w-28 shrink-0">Amount Requested:</span>
                        <span className="font-medium text-slate-800">
                          ₹{previewModeRetailer === "sample" ? retailerTestForm.amount_requested.toLocaleString("en-IN") : "{{3}}"}
                        </span>
                      </div>

                      <div className="flex items-start">
                        <span className="text-slate-500 w-28 shrink-0">Approved Amount:</span>
                        <span className="font-bold text-emerald-700">
                          ₹{previewModeRetailer === "sample" ? retailerTestForm.approved_amount.toLocaleString("en-IN") : "{{4}}"}
                        </span>
                      </div>

                      <div className="flex items-start">
                        <span className="text-slate-500 w-28 shrink-0">Wallet Credit:</span>
                        <span className="font-bold text-emerald-700">
                          ₹{previewModeRetailer === "sample" ? retailerTestForm.wallet_credit.toLocaleString("en-IN") : "{{5}}"}
                        </span>
                      </div>

                      <div className="flex items-start">
                        <span className="text-slate-500 w-28 shrink-0">Payment Mode:</span>
                        <span className="font-medium text-slate-800 capitalize">
                          {previewModeRetailer === "sample" ? retailerTestForm.payment_mode : "{{6}}"}
                        </span>
                      </div>

                      <div className="flex items-start">
                        <span className="text-slate-500 w-28 shrink-0">Transaction ID:</span>
                        <span className="font-mono font-medium text-slate-800">
                          {previewModeRetailer === "sample" ? retailerTestForm.transaction_id : "{{7}}"}
                        </span>
                      </div>

                      <div className="flex items-start">
                        <span className="text-slate-500 w-28 shrink-0">Approved Date & Time:</span>
                        <span className="text-slate-700">
                          {previewModeRetailer === "sample" ? retailerTestForm.approved_date_time : "{{8}}"}
                        </span>
                      </div>

                      <div className="flex items-start">
                        <span className="text-slate-500 w-28 shrink-0">Status:</span>
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            retailerTestForm.status_text.toLowerCase().includes("app") || retailerTestForm.status_text.toLowerCase().includes("suc")
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-rose-100 text-rose-800 border border-rose-300"
                          }`}
                        >
                          {previewModeRetailer === "sample" ? retailerTestForm.status_text : "{{9}}"}
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 pt-1.5 border-t border-slate-100 space-y-0.5">
                      <p>Thank you for using Pay2Pay.</p>
                      <p className="font-semibold text-slate-700">SUPER REX PRODUCTS PRIVATE LIMITED</p>
                    </div>

                    <div className="flex items-center justify-end gap-1 text-[9px] text-slate-400 mt-1">
                      <span>14:30</span>
                      <span className="text-[#34B7F1] font-bold">✓✓</span>
                    </div>

                    <div className="pt-2 border-t border-slate-200 mt-2">
                      <a
                        href={`${config.retailer_button_base_url}${retailerTestForm.view_id || "1234"}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-[#00A884] hover:text-[#008f70] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors shadow-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Receipt</span>
                      </a>
                      <p className="text-[9px] text-center text-slate-400 mt-1 font-mono">
                        Opens: {config.retailer_button_base_url}&lt;id&gt;
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
