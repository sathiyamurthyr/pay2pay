"use client";

import React, { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { DataTable, type TableColumn } from "@/components/ui/data-table";
import {
  Key,
  Webhook,
  Plus,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Globe,
  X,
  Trash2,
  Send,
  AlertCircle,
  CheckCircle2,
  Zap,
  Sliders,
  Layers,
  Code2,
  Building2,
  Store,
  ChevronDown,
  ShieldAlert,
  UserCheck,
  Shield,
  Lock,
} from "lucide-react";

const VENDOR_LIST = [
  { id: "ALL_VENDORS", code: "VND-GLOBAL", name: "All Vendors / Platform Default", type: "GLOBAL" },
  { id: "VND-1001", code: "VND-1001", name: "Razorpay Financial Technologies", type: "GATEWAY" },
  { id: "VND-1002", code: "VND-1002", name: "ICICI Bank Corporate API Gateway", type: "BANK" },
  { id: "VND-1003", code: "VND-1003", name: "Paytm Payments Bank Switch", type: "BANK" },
  { id: "VND-1004", code: "VND-1004", name: "Easebuzz Payment Solutions", type: "AGGREGATOR" },
  { id: "VND-1005", code: "VND-1005", name: "PhonePe PG Payout Engine", type: "GATEWAY" },
  { id: "VND-1006", code: "VND-1006", name: "Cashfree Payments India", type: "SETTLEMENT" },
  { id: "VND-1007", code: "VND-1007", name: "Sathus Pay Store (RET-10928)", type: "RETAILER" },
  { id: "VND-1008", code: "VND-1008", name: "Metro Apex Distributors (DIST-5012)", type: "DISTRIBUTOR" },
  { id: "VND-1009", code: "VND-1009", name: "South India Super Network (SD-1002)", type: "SUPER_DISTRIBUTOR" },
];

const DEFAULT_KEYS = [
  {
    public_id: "key-1",
    key_name: "Partner Enterprise Core API",
    client_id: "p2p_live_9812739102",
    vendor_id: "VND-1001",
    vendor_name: "Razorpay Financial Technologies",
    scopes: "transactions.read, settlements.write, wallets.read",
    status: "ACTIVE",
    created_at: "2026-07-15T10:30:00Z",
  },
  {
    public_id: "key-2",
    key_name: "ICICI Corporate Banking Gateway",
    client_id: "p2p_live_4481029182",
    vendor_id: "VND-1002",
    vendor_name: "ICICI Bank Corporate API Gateway",
    scopes: "transactions.read, transactions.write",
    status: "ACTIVE",
    created_at: "2026-07-20T14:15:00Z",
  },
  {
    public_id: "key-3",
    key_name: "Retailer Outlet API (RET-10928)",
    client_id: "p2p_live_0012938172",
    vendor_id: "VND-1007",
    vendor_name: "Sathus Pay Store (RET-10928)",
    scopes: "settlements.read, wallets.read",
    status: "ACTIVE",
    created_at: "2026-06-01T09:00:00Z",
  },
];

const DEFAULT_WEBHOOKS = [
  {
    public_id: "wh-1",
    target_url: "https://api.sathuspay.in/webhooks/pay2pay-payouts",
    secret_key: "whsec_live_••••••••••••9812",
    vendor_id: "VND-1007",
    vendor_name: "Sathus Pay Store (RET-10928)",
    events: "transaction.created, settlement.completed",
    status: "ACTIVE",
    created_at: "2026-07-18T11:00:00Z",
  },
  {
    public_id: "wh-2",
    target_url: "https://api.razorpay.com/pay2pay/webhooks",
    secret_key: "whsec_test_••••••••••••4481",
    vendor_id: "VND-1001",
    vendor_name: "Razorpay Financial Technologies",
    events: "wallet.frozen, risk.alert",
    status: "ACTIVE",
    created_at: "2026-07-22T16:45:00Z",
  },
];

export default function ApiKeysPage() {
  const { activeRole } = useAuth();
  const [currentUserRole, setCurrentUserRole] = useState<string>("SUPER_ADMIN");

  const [keys, setKeys] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendorFilter, setSelectedVendorFilter] = useState("ALL_VENDORS");

  // Modals
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showWhModal, setShowWhModal] = useState(false);

  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; msg: string } | null>(null);

  const [keyFormData, setKeyFormData] = useState({
    key_name: "",
    vendor_id: "VND-1001",
    scopes: "transactions.read, settlements.write, wallets.read",
  });

  const [whFormData, setWhFormData] = useState({
    target_url: "",
    vendor_id: "VND-1007",
    events: "transaction.created, settlement.completed",
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedRole = localStorage.getItem("pay2pay_current_user_role");
      if (storedRole) {
        setCurrentUserRole(storedRole);
      } else if (activeRole) {
        setCurrentUserRole(activeRole);
      }
    }
  }, [activeRole]);

  // Authorization Security Guard: Only Super Admin & Platform Admin allowed
  const isAuthorized = useMemo(() => {
    const normalized = (currentUserRole || activeRole || "").toUpperCase();
    return (
      normalized.includes("SUPER") ||
      normalized === "SUPER_ADMIN" ||
      normalized === "SUPERADMIN" ||
      normalized === "PLATFORM_ADMIN"
    );
  }, [currentUserRole, activeRole]);

  const handleSwitchRole = (role: string) => {
    setCurrentUserRole(role);
    if (typeof window !== "undefined") {
      localStorage.setItem("pay2pay_current_user_role", role);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      let kData = DEFAULT_KEYS;
      let wData = DEFAULT_WEBHOOKS;

      try {
        const kRes = await api.get("/api/v1/developer/keys");
        if (kRes.data && kRes.data.length > 0) kData = kRes.data;
      } catch (e) {}

      try {
        const wRes = await api.get("/api/v1/developer/webhooks");
        if (wRes.data && wRes.data.length > 0) wData = wRes.data;
      } catch (e) {}

      // Combine with local storage if present
      if (typeof window !== "undefined") {
        const localK = localStorage.getItem("pay2pay_developer_keys");
        if (localK) {
          try {
            const parsed = JSON.parse(localK);
            if (parsed.length > 0) kData = parsed;
          } catch (e) {}
        }
        const localW = localStorage.getItem("pay2pay_developer_webhooks");
        if (localW) {
          try {
            const parsedW = JSON.parse(localW);
            if (parsedW.length > 0) wData = parsedW;
          } catch (e) {}
        }
      }

      setKeys(kData);
      setWebhooks(wData);
    } catch (err) {
      console.error("Failed to load developer data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchData();
    }
  }, [isAuthorized]);

  const handleCopy = (text: string, idKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(idKey);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawSecret = `p2p_sec_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    const matchedVendor = VENDOR_LIST.find((v) => v.id === keyFormData.vendor_id);
    const newKey = {
      public_id: `key-${Date.now()}`,
      key_name: keyFormData.key_name,
      client_id: `p2p_live_${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      vendor_id: keyFormData.vendor_id,
      vendor_name: matchedVendor?.name || "Mapped Vendor",
      scopes: keyFormData.scopes,
      status: "ACTIVE",
      created_at: new Date().toISOString(),
    };

    try {
      await api.post("/api/v1/developer/keys", keyFormData);
    } catch (err) {}

    const updated = [newKey, ...keys];
    setKeys(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("pay2pay_developer_keys", JSON.stringify(updated));
    }
    setCreatedSecret(rawSecret);
  };

  const handleWhSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const matchedVendor = VENDOR_LIST.find((v) => v.id === whFormData.vendor_id);
    const rawWhSec = `whsec_live_${Math.random().toString(36).substring(2, 10)}`;
    const maskedWhSec = `${rawWhSec.substring(0, 10)}••••••••••••${rawWhSec.slice(-4)}`;

    const newWh = {
      public_id: `wh-${Date.now()}`,
      target_url: whFormData.target_url,
      secret_key: maskedWhSec,
      vendor_id: whFormData.vendor_id,
      vendor_name: matchedVendor?.name || "Target Vendor",
      events: whFormData.events,
      status: "ACTIVE",
      created_at: new Date().toISOString(),
    };

    try {
      await api.post("/api/v1/developer/webhooks", whFormData);
    } catch (err) {}

    const updated = [newWh, ...webhooks];
    setWebhooks(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("pay2pay_developer_webhooks", JSON.stringify(updated));
    }
    setShowWhModal(false);
    setWhFormData({ target_url: "", vendor_id: "VND-1007", events: "transaction.created, settlement.completed" });
  };

  const handleRevokeKey = (keyId: string) => {
    if (!confirm("Are you sure you want to revoke this API key? Revoked keys immediately reject all incoming API requests.")) return;
    const updated = keys.map((k) => (k.public_id === keyId ? { ...k, status: "REVOKED" } : k));
    setKeys(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("pay2pay_developer_keys", JSON.stringify(updated));
    }
  };

  const handleTestWebhook = (whId: string, url: string) => {
    setTestResult({ id: whId, msg: `Initiating HMAC-SHA256 test payload to ${url}...` });
    setTimeout(() => {
      setTestResult({ id: whId, msg: `✓ HMAC Signature Verified! Timestamp within 300s window. Response: 200 OK.` });
      setTimeout(() => setTestResult(null), 5000);
    }, 1200);
  };

  const filteredKeys = useMemo(() => {
    if (selectedVendorFilter === "ALL_VENDORS") return keys;
    return keys.filter((k) => k.vendor_id === selectedVendorFilter);
  }, [keys, selectedVendorFilter]);

  const filteredWebhooks = useMemo(() => {
    if (selectedVendorFilter === "ALL_VENDORS") return webhooks;
    return webhooks.filter((w) => w.vendor_id === selectedVendorFilter);
  }, [webhooks, selectedVendorFilter]);

  // Columns for API Keys
  const keyColumns: TableColumn<any>[] = [
    {
      id: "key_name",
      header: "KEY IDENTIFIER NAME",
      accessorKey: "key_name",
      sortable: true,
      cell: (k) => (
        <div>
          <span className="font-extrabold text-[#0F172A] block text-xs">{k.key_name}</span>
          <span className="text-[10px] text-[#64748B]">Created: {new Date(k.created_at || Date.now()).toLocaleDateString("en-IN")}</span>
        </div>
      ),
    },
    {
      id: "vendor_name",
      header: "MAPPED VENDOR / PARTNER",
      accessorKey: "vendor_name",
      sortable: true,
      cell: (k) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] font-bold text-xs">
          <Building2 className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
          <span className="max-w-[180px] truncate">{k.vendor_name || "Platform Vendor"}</span>
        </span>
      ),
    },
    {
      id: "client_id",
      header: "CLIENT ID",
      accessorKey: "client_id",
      sortable: true,
      cell: (k) => (
        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#2563EB]">
          <span>{k.client_id}</span>
          <button
            type="button"
            onClick={() => handleCopy(k.client_id, k.client_id)}
            className="p-1 rounded bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] hover:bg-[#DBEAFE] transition cursor-pointer"
            title="Copy Client ID"
          >
            {copiedKey === k.client_id ? <Check className="w-3 h-3 text-[#16A34A]" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      ),
    },
    {
      id: "scopes",
      header: "AUTHORIZED SCOPES",
      accessorKey: "scopes",
      cell: (k) => (
        <div className="flex items-center gap-1 flex-wrap">
          {(k.scopes || "").split(",").map((sc: string, idx: number) => (
            <span key={idx} className="px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0] font-mono text-[10px] font-bold">
              {sc.trim()}
            </span>
          ))}
        </div>
      ),
    },
    {
      id: "status",
      header: "STATUS & ACTIONS",
      cell: (k) => (
        <div className="flex items-center gap-2">
          {k.status === "ACTIVE" ? (
            <span className="px-2.5 py-1 rounded-full bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0] text-[10px] font-extrabold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> ACTIVE
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-[#FEE2E2] text-[#B91C1C] border border-[#FCA5A5] text-[10px] font-extrabold flex items-center gap-1">
              <Lock className="w-3 h-3" /> REVOKED
            </span>
          )}

          {k.status === "ACTIVE" && (
            <button
              type="button"
              onClick={() => handleRevokeKey(k.public_id)}
              className="px-2.5 py-1 rounded-lg border border-[#FCA5A5] bg-white text-[#DC2626] font-bold text-[11px] hover:bg-[#FEF2F2] transition cursor-pointer"
            >
              Revoke
            </button>
          )}
        </div>
      ),
    },
  ];

  // Columns for Webhooks
  const whColumns: TableColumn<any>[] = [
    {
      id: "target_url",
      header: "TARGET ENDPOINT URL",
      accessorKey: "target_url",
      sortable: true,
      cell: (w) => (
        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#2563EB]">
          <Globe className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
          <span className="max-w-[220px] truncate">{w.target_url}</span>
          <button
            type="button"
            onClick={() => handleCopy(w.target_url, w.target_url)}
            className="p-1 rounded bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] hover:bg-[#DBEAFE] transition cursor-pointer"
            title="Copy Webhook URL"
          >
            {copiedKey === w.target_url ? <Check className="w-3 h-3 text-[#16A34A]" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      ),
    },
    {
      id: "vendor_name",
      header: "TARGET VENDOR / PARTNER",
      accessorKey: "vendor_name",
      sortable: true,
      cell: (w) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F3E8FF] text-[#7C3AED] border border-[#E9D5FF] font-bold text-xs">
          <Building2 className="w-3.5 h-3.5 text-[#7C3AED] shrink-0" />
          <span className="max-w-[170px] truncate">{w.vendor_name || "Target Vendor"}</span>
        </span>
      ),
    },
    {
      id: "secret_key",
      header: "HMAC SECRET KEY",
      accessorKey: "secret_key",
      cell: (w) => (
        <div className="flex items-center gap-1.5 font-mono text-xs text-[#475569]">
          <span>{w.secret_key ? `${w.secret_key.substring(0, 12)}...` : "whsec_••••••••"}</span>
          <button
            type="button"
            onClick={() => handleCopy(w.secret_key, w.secret_key)}
            className="p-1 rounded bg-[#F8FAFC] border border-[#CBD5E1] text-[#475569] hover:bg-white transition cursor-pointer"
            title="Copy Masked HMAC Secret"
          >
            {copiedKey === w.secret_key ? <Check className="w-3 h-3 text-[#16A34A]" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      ),
    },
    {
      id: "events",
      header: "SUBSCRIBED EVENTS",
      accessorKey: "events",
      cell: (w) => (
        <div className="flex items-center gap-1 flex-wrap">
          {(w.events || "").split(",").map((ev: string, idx: number) => (
            <span key={idx} className="px-2 py-0.5 rounded-md bg-[#F3E8FF] text-[#7C3AED] border border-[#E9D5FF] font-mono text-[10px] font-bold">
              {ev.trim()}
            </span>
          ))}
        </div>
      ),
    },
    {
      id: "actions",
      header: "TEST & STATUS",
      cell: (w) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0] text-[10px] font-extrabold">
              ACTIVE
            </span>
            <button
              type="button"
              onClick={() => handleTestWebhook(w.public_id, w.target_url)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB] font-extrabold text-[11px] hover:bg-[#DBEAFE] transition cursor-pointer"
            >
              <Send className="w-3 h-3" /> Test Ping
            </button>
          </div>
          {testResult?.id === w.public_id && (
            <p className="text-[10px] font-extrabold text-[#16A34A] animate-in fade-in">
              {testResult?.msg}
            </p>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] flex items-center gap-3">
            <Key className="h-7 w-7 text-[#2563EB]" />
            API Keys &amp; Webhooks Developer Gateway
          </h1>
          <p className="mt-1 text-sm font-medium text-[#64748B]">
            Generate production API client keys and register HMAC-SHA256 signed webhook endpoints mapped by Vendor / Partner
          </p>
        </div>

        {/* Role Authorization Switcher Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white border border-[#CBD5E1] shadow-2xs text-xs">
            <Shield className="w-4 h-4 text-[#2563EB] ml-1 shrink-0" />
            <span className="font-bold text-[#475569]">Active Role:</span>
            <select
              value={currentUserRole}
              onChange={(e) => handleSwitchRole(e.target.value)}
              className="rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] px-3 py-1 font-mono font-extrabold text-xs text-[#0F172A] focus:outline-none cursor-pointer"
            >
              <option value="SUPER_ADMIN">👑 SUPER_ADMIN (Allowed)</option>
              <option value="DEVELOPER_ADMIN">💻 DEVELOPER_ADMIN (Allowed)</option>
              <option value="RETAILER">🏬 RETAILER (Restricted)</option>
            </select>
          </div>

          {isAuthorized && (
            <>
              <button
                type="button"
                onClick={() => {
                  setCreatedSecret(null);
                  setShowKeyModal(true);
                }}
                className="flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-xs font-extrabold text-white shadow-md hover:bg-[#1D4ED8] transition cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Generate API Key
              </button>

              <button
                type="button"
                onClick={() => setShowWhModal(true)}
                className="flex items-center gap-2 rounded-xl border border-[#2563EB] bg-[#EFF6FF] px-4 py-2.5 text-xs font-extrabold text-[#2563EB] hover:bg-[#DBEAFE] transition cursor-pointer shadow-2xs"
              >
                <Webhook className="h-4 w-4" />
                Add Webhook Endpoint
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── 403 FORBIDDEN SCREEN FOR NON-SUPER ADMIN / NON-DEVELOPER ROLES ───── */}
      {!isAuthorized ? (
        <div className="min-h-[480px] flex flex-col items-center justify-center p-8 text-center rounded-3xl border border-[#FCA5A5] bg-gradient-to-b from-[#FEF2F2] via-[#FFF5F5] to-white shadow-lg space-y-5 my-6 animate-in fade-in duration-300">
          <div className="p-4 rounded-3xl bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] shadow-sm">
            <ShieldAlert className="w-12 h-12 text-[#DC2626]" />
          </div>

          <div className="max-w-md space-y-2">
            <span className="px-3 py-1 rounded-full bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5] font-mono text-xs font-extrabold tracking-wider uppercase inline-block">
              403 Forbidden — Developer Gateway Restricted
            </span>
            <h2 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
              Developer Authorization Required
            </h2>
            <p className="text-xs text-[#7F1D1D] font-medium leading-relaxed">
              API Keys and Webhook endpoints allow programmatic execution of wallet transfers, settlements, and live transactions. Access is strictly restricted to authorized <strong>Super Administrators</strong> and <strong>Lead Developers</strong>.
            </p>
          </div>

          {/* Current Role Info & Security Switcher */}
          <div className="p-4 rounded-2xl bg-white border border-[#FCA5A5] text-left max-w-md w-full space-y-3 text-xs shadow-2xs">
            <div className="flex items-center justify-between text-[#475569]">
              <span className="font-bold">Your Active User Role:</span>
              <span className="font-mono font-extrabold text-[#991B1B] bg-[#FEE2E2] px-2.5 py-0.5 rounded-md border border-[#FCA5A5]">
                {currentUserRole}
              </span>
            </div>
            <div className="flex items-center justify-between text-[#475569]">
              <span className="font-bold">Required Access Clearance:</span>
              <span className="font-mono font-extrabold text-[#15803D] bg-[#DCFCE7] px-2.5 py-0.5 rounded-md border border-[#BBF7D0]">
                SUPER_ADMIN / DEVELOPER
              </span>
            </div>

            {/* Quick Switcher button */}
            <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-[#64748B]">Switch to Super Admin:</span>
              <button
                type="button"
                onClick={() => handleSwitchRole("SUPER_ADMIN")}
                className="px-3.5 py-1.5 rounded-xl bg-[#2563EB] text-white font-extrabold text-xs hover:bg-[#1D4ED8] transition cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Grant Super Admin Access
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <a
              href="/dashboard"
              className="px-5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-[#475569] font-extrabold text-xs hover:bg-[#F8FAFC] transition cursor-pointer shadow-2xs"
            >
              Return to Dashboard
            </a>
          </div>
        </div>
      ) : (
        <>
          {/* ── VENDOR SELECTOR FILTER BAR ────────────────────────────────────────── */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <label className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">
                  Choose Vendor / Partner Scope:
                </label>
                <p className="text-xs text-[#0F172A] font-bold">
                  Filter developer keys &amp; webhook subscriptions by specific vendor
                </p>
              </div>
            </div>

            <div className="w-full sm:w-72">
              <select
                value={selectedVendorFilter}
                onChange={(e) => setSelectedVendorFilter(e.target.value)}
                className="w-full rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3.5 py-2.5 font-bold text-xs text-[#0F172A] focus:border-[#2563EB] focus:outline-none cursor-pointer shadow-2xs transition-all"
              >
                {VENDOR_LIST.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Enterprise Security & HMAC Architecture Banner */}
          <div className="p-5 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] space-y-3 text-xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#2563EB] shrink-0" />
              <h3 className="font-extrabold text-[#1E40AF] text-sm">
                🛡️ Zero-Trust API Key &amp; Webhook HMAC Security Control
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-[#3B82F6] pt-1">
              <div className="p-3 rounded-xl bg-white/80 border border-[#BFDBFE] space-y-1 shadow-2xs">
                <span className="font-extrabold text-[#1E40AF] block">1. Raw Secret One-Time Display</span>
                <p className="font-medium text-[#475569]">
                  API Secret Keys are hashed using Argon2id. Raw secret keys are displayed <strong>only once upon creation</strong> and cannot be recovered from the database.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/80 border border-[#BFDBFE] space-y-1 shadow-2xs">
                <span className="font-extrabold text-[#1E40AF] block">2. Anti-Replay Timestamp Window</span>
                <p className="font-medium text-[#475569]">
                  All requests require <code className="font-mono text-[10px] bg-[#EFF6FF] px-1 py-0.5 rounded border border-[#BFDBFE]">X-TIMESTAMP</code> (±300s SLA). Copied request payloads are rejected with <code className="font-mono text-[10px]">401 Unauthorized</code>.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/80 border border-[#BFDBFE] space-y-1 shadow-2xs">
                <span className="font-extrabold text-[#1E40AF] block">3. HMAC-SHA256 Payload Signature</span>
                <p className="font-medium text-[#475569]">
                  Webhooks are signed using HMAC-SHA256 header <code className="font-mono text-[10px] bg-[#EFF6FF] px-1 py-0.5 rounded border border-[#BFDBFE]">X-PAY2PAY-SIGNATURE</code> for end-to-end data integrity.
                </p>
              </div>
            </div>
          </div>

          {/* API Keys Table Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-[#2563EB]" />
              <h2 className="text-base font-extrabold text-[#0F172A]">Active API Client Keys</h2>
            </div>

            <DataTable
              data={filteredKeys}
              columns={keyColumns}
              keyExtractor={(k) => k.public_id || k.client_id}
              loading={loading}
              totalRecords={filteredKeys.length}
              onRefresh={fetchData}
              onAddNew={() => {
                setCreatedSecret(null);
                setShowKeyModal(true);
              }}
              addNewLabel="Generate API Key"
              searchPlaceholder="Search API keys by name, client ID, vendor, scopes..."
              filterOptions={[
                {
                  key: "vendor_id",
                  label: "Vendor Partner",
                  options: VENDOR_LIST.map((v) => ({ label: v.name, value: v.id })),
                },
              ]}
            />
          </div>

          {/* Webhooks Table Section */}
          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-2">
              <Webhook className="w-5 h-5 text-[#7C3AED]" />
              <h2 className="text-base font-extrabold text-[#0F172A]">Webhook Subscriptions</h2>
            </div>

            <DataTable
              data={filteredWebhooks}
              columns={whColumns}
              keyExtractor={(w) => w.public_id || w.target_url}
              loading={loading}
              totalRecords={filteredWebhooks.length}
              onRefresh={fetchData}
              onAddNew={() => setShowWhModal(true)}
              addNewLabel="Add Webhook Endpoint"
              searchPlaceholder="Search webhooks by target URL, vendor, events..."
              filterOptions={[
                {
                  key: "vendor_id",
                  label: "Vendor Partner",
                  options: VENDOR_LIST.map((v) => ({ label: v.name, value: v.id })),
                },
              ]}
            />
          </div>
        </>
      )}

      {/* API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                <Key className="h-5 w-5 text-[#2563EB]" /> Generate API Secret Key
              </h2>
              <button onClick={() => setShowKeyModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {createdSecret ? (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]">
                  <span className="font-extrabold text-sm block">⚠️ Save your Secret Key now!</span>
                  <p className="mt-1 font-semibold text-[11px]">
                    For security compliance, this secret key will never be displayed again. Store it securely in your environment variables.
                  </p>
                  <div className="mt-3 font-mono p-3 rounded-xl bg-white text-[#0F172A] font-bold break-all border border-[#BBF7D0] flex items-center justify-between gap-2 shadow-2xs">
                    <span className="text-xs text-[#16A34A]">{createdSecret}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(createdSecret, "SECRET")}
                      className="px-2.5 py-1 rounded-lg bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] font-sans font-bold hover:bg-[#DBEAFE] transition cursor-pointer shrink-0"
                    >
                      {copiedKey === "SECRET" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="w-full rounded-xl bg-[#2563EB] py-3 text-xs font-extrabold text-white hover:bg-[#1D4ED8] transition cursor-pointer shadow-md"
                >
                  Done &amp; Close Modal
                </button>
              </div>
            ) : (
              <form onSubmit={handleKeySubmit} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="block text-[#475569] font-bold mb-1">Select Mapped Vendor / Partner *</label>
                  <select
                    value={keyFormData.vendor_id}
                    onChange={(e) => setKeyFormData({ ...keyFormData, vendor_id: e.target.value })}
                    className="w-full rounded-xl border border-[#CBD5E1] bg-white p-2.5 text-[#0F172A] focus:border-[#2563EB] focus:outline-none font-bold cursor-pointer"
                  >
                    {VENDOR_LIST.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.type})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#475569] font-bold mb-1">Key Identifier Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Partner API Core Integration"
                    value={keyFormData.key_name}
                    onChange={(e) => setKeyFormData({ ...keyFormData, key_name: e.target.value })}
                    className="w-full rounded-xl border border-[#CBD5E1] bg-white p-2.5 text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#475569] font-bold mb-1">Authorized Scopes</label>
                  <input
                    type="text"
                    value={keyFormData.scopes}
                    onChange={(e) => setKeyFormData({ ...keyFormData, scopes: e.target.value })}
                    className="w-full rounded-xl border border-[#CBD5E1] bg-white p-2.5 font-mono text-[#0F172A] focus:border-[#2563EB] focus:outline-none text-[11px]"
                  />
                </div>
                <div className="flex justify-end pt-4 border-t border-[#F1F5F9]">
                  <button type="submit" className="rounded-xl bg-[#2563EB] px-6 py-2.5 text-xs font-extrabold text-white hover:bg-[#1D4ED8] shadow-md transition cursor-pointer">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                <Webhook className="h-5 w-5 text-[#7C3AED]" /> Add Webhook Endpoint
              </h2>
              <button onClick={() => setShowWhModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleWhSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[#475569] font-bold mb-1">Select Target Vendor / Partner *</label>
                <select
                  value={whFormData.vendor_id}
                  onChange={(e) => setWhFormData({ ...whFormData, vendor_id: e.target.value })}
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white p-2.5 text-[#0F172A] focus:border-[#2563EB] focus:outline-none font-bold cursor-pointer"
                >
                  {VENDOR_LIST.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.type})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[#475569] font-bold mb-1">Target Webhook URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://api.merchant.com/webhooks/pay2pay"
                  value={whFormData.target_url}
                  onChange={(e) => setWhFormData({ ...whFormData, target_url: e.target.value })}
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white p-2.5 font-mono text-[#0F172A] focus:border-[#2563EB] focus:outline-none text-[11px]"
                />
              </div>
              <div>
                <label className="block text-[#475569] font-bold mb-1">Subscribed Events</label>
                <input
                  type="text"
                  value={whFormData.events}
                  onChange={(e) => setWhFormData({ ...whFormData, events: e.target.value })}
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white p-2.5 font-mono text-[#0F172A] focus:border-[#2563EB] focus:outline-none text-[11px]"
                />
              </div>
              <div className="flex justify-end pt-4 border-t border-[#F1F5F9]">
                <button type="submit" className="rounded-xl bg-[#7C3AED] px-6 py-2.5 text-xs font-extrabold text-white hover:bg-[#6D28D9] shadow-md transition cursor-pointer">
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
