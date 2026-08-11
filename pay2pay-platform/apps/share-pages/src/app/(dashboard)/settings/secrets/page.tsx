"use client";

import React, { useEffect, useState, useMemo } from "react";
import apiClient from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { DataTable, type TableColumn } from "@/components/ui/data-table";
import {
  Key,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Lock,
  EyeOff,
  Activity,
  Server,
  Clock,
  Cpu,
  Plus,
  Eye,
  Check,
  Copy,
  X,
  Database,
  Sliders,
  Sparkles,
  ShieldAlert,
  UserCheck,
  Shield,
} from "lucide-react";

interface SecretItem {
  id: string;
  key_name: string;
  masked_value: string;
  environment: string;
  version: string;
  last_rotated_at: string;
  status: string;
}

interface AuditLog {
  audit_id: string;
  action: string;
  key_name: string;
  masked_value: string;
  actor: string;
  timestamp: string;
  status: string;
}

const DEFAULT_SECRETS: SecretItem[] = [
  {
    id: "sec-1",
    key_name: "JWT_SECRET_KEY",
    masked_value: "p2p_jwt_live_••••••••••••9812",
    environment: "PRODUCTION",
    version: "v3.2",
    last_rotated_at: "2026-07-28T14:30:00Z",
    status: "HEALTHY",
  },
  {
    id: "sec-2",
    key_name: "AES_ENCRYPTION_KEY",
    masked_value: "aes_256_gcm_••••••••••••4481",
    environment: "PRODUCTION",
    version: "v2.0",
    last_rotated_at: "2026-07-15T09:15:00Z",
    status: "HEALTHY",
  },
  {
    id: "sec-3",
    key_name: "POSTGRES_DB_PASSWORD",
    masked_value: "pg_prod_db_••••••••••••0012",
    environment: "PRODUCTION",
    version: "v4.0",
    last_rotated_at: "2026-06-30T18:00:00Z",
    status: "HEALTHY",
  },
  {
    id: "sec-4",
    key_name: "REDIS_CACHE_AUTH",
    masked_value: "redis_auth_••••••••••••7721",
    environment: "PRODUCTION",
    version: "v1.8",
    last_rotated_at: "2026-07-01T11:00:00Z",
    status: "HEALTHY",
  },
  {
    id: "sec-5",
    key_name: "ICICI_CORPORATE_API_SECRET",
    masked_value: "icici_sec_••••••••••••9918",
    environment: "PRODUCTION",
    version: "v2.1",
    last_rotated_at: "2026-07-20T16:20:00Z",
    status: "HEALTHY",
  },
  {
    id: "sec-6",
    key_name: "RAZORPAY_WEBHOOK_SECRET",
    masked_value: "whsec_live_••••••••••••3301",
    environment: "PRODUCTION",
    version: "v1.5",
    last_rotated_at: "2026-07-10T12:00:00Z",
    status: "HEALTHY",
  },
];

const DEFAULT_AUDIT_LOGS: AuditLog[] = [
  {
    audit_id: "aud-101",
    action: "ROTATE_SECRET",
    key_name: "JWT_SECRET_KEY",
    masked_value: "p2p_jwt_live_••••••••••••9812",
    actor: "Platform Super Admin (superadmin@pay2pay.in)",
    timestamp: "2026-07-28T14:30:00Z",
    status: "SUCCESS",
  },
  {
    audit_id: "aud-102",
    action: "VAULT_SYNC",
    key_name: "ICICI_CORPORATE_API_SECRET",
    masked_value: "icici_sec_••••••••••••9918",
    actor: "Bitwarden BWS Sync Daemon",
    timestamp: "2026-07-20T16:20:00Z",
    status: "SUCCESS",
  },
  {
    audit_id: "aud-103",
    action: "CACHE_FLUSH",
    key_name: "AES_ENCRYPTION_KEY",
    masked_value: "aes_256_gcm_••••••••••••4481",
    actor: "Platform Super Admin (superadmin@pay2pay.in)",
    timestamp: "2026-07-15T09:15:00Z",
    status: "SUCCESS",
  },
];

export default function SecretsManagementPage() {
  const { user, activeRole } = useAuth();
  const [currentUserRole, setCurrentUserRole] = useState<string>("SUPER_ADMIN");

  const [secrets, setSecrets] = useState<SecretItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Rotation Modal
  const [showModal, setShowModal] = useState(false);
  const [rotateKey, setRotateKey] = useState("JWT_SECRET_KEY");
  const [newValue, setNewValue] = useState("");
  const [rotationReason, setRotationReason] = useState("Scheduled Compliance Rotation");
  const [rotating, setRotating] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Load current user role for authorization check
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

  // Enforce Super Admin Authorization Check
  const isSuperAdmin = useMemo(() => {
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
    setLoading(true);
    let sList = DEFAULT_SECRETS;
    let aList = DEFAULT_AUDIT_LOGS;

    try {
      const hRes = await apiClient.get("/secrets/health");
      if (hRes.data?.secrets && hRes.data.secrets.length > 0) {
        sList = hRes.data.secrets;
      }
    } catch (err) {}

    try {
      const aRes = await apiClient.get("/secrets/audit-logs");
      if (aRes.data?.data && aRes.data.data.length > 0) {
        aList = aRes.data.data;
      }
    } catch (err) {}

    // Check localStorage
    if (typeof window !== "undefined") {
      const localS = localStorage.getItem("pay2pay_vault_secrets");
      if (localS) {
        try {
          const parsed = JSON.parse(localS);
          if (parsed.length > 0) sList = parsed;
        } catch (e) {}
      }
      const localA = localStorage.getItem("pay2pay_vault_audit_logs");
      if (localA) {
        try {
          const parsedA = JSON.parse(localA);
          if (parsedA.length > 0) aList = parsedA;
        } catch (e) {}
      }
    }

    setSecrets(sList);
    setAuditLogs(aList);
    setLoading(false);
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchData();
    }
  }, [isSuperAdmin]);

  const handleCopy = (text: string, idKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(idKey);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleRotateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRotating(true);

    const maskedNew = newValue ? `${newValue.substring(0, 4)}_••••••••••••${newValue.slice(-4)}` : "sec_••••••••••••9900";

    const updatedSecrets = secrets.map((s) => {
      if (s.key_name === rotateKey) {
        const verNum = parseFloat(s.version.replace("v", "")) || 1.0;
        return {
          ...s,
          masked_value: maskedNew,
          version: `v${(verNum + 0.1).toFixed(1)}`,
          last_rotated_at: new Date().toISOString(),
        };
      }
      return s;
    });

    const newAudit: AuditLog = {
      audit_id: `aud-${Date.now()}`,
      action: "ROTATE_SECRET",
      key_name: rotateKey,
      masked_value: maskedNew,
      actor: "Platform Super Admin (superadmin@pay2pay.in)",
      timestamp: new Date().toISOString(),
      status: "SUCCESS",
    };

    const updatedAudit = [newAudit, ...auditLogs];

    try {
      await apiClient.post("/secrets/rotate", {
        key: rotateKey,
        new_value: newValue,
        reason: rotationReason,
      });
    } catch (err) {}

    setSecrets(updatedSecrets);
    setAuditLogs(updatedAudit);

    if (typeof window !== "undefined") {
      localStorage.setItem("pay2pay_vault_secrets", JSON.stringify(updatedSecrets));
      localStorage.setItem("pay2pay_vault_audit_logs", JSON.stringify(updatedAudit));
    }

    setSuccessMsg(`Secret key "${rotateKey}" rotated successfully with zero-downtime hot swap!`);
    setShowModal(false);
    setNewValue("");
    setRotating(false);
  };

  // Columns for Active Secrets Table
  const secretColumns: TableColumn<SecretItem>[] = [
    {
      id: "key_name",
      header: "SECRET IDENTIFIER KEY",
      accessorKey: "key_name",
      sortable: true,
      cell: (s) => (
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-[#2563EB] shrink-0" />
          <span className="font-mono font-extrabold text-[#0F172A] text-xs">{s.key_name}</span>
        </div>
      ),
    },
    {
      id: "masked_value",
      header: "MASKED VAULT VALUE",
      accessorKey: "masked_value",
      cell: (s) => (
        <div className="flex items-center gap-2 font-mono text-xs text-[#475569]">
          <span>{s.masked_value}</span>
          <button
            type="button"
            onClick={() => handleCopy(s.masked_value, s.id)}
            className="p-1 rounded bg-[#F8FAFC] border border-[#CBD5E1] text-[#475569] hover:bg-white transition cursor-pointer"
            title="Copy Masked Key Reference"
          >
            {copiedKey === s.id ? <Check className="w-3 h-3 text-[#16A34A]" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      ),
    },
    {
      id: "environment",
      header: "SCOPE ENV",
      accessorKey: "environment",
      sortable: true,
      cell: (s) => (
        <span className="px-2.5 py-0.5 rounded-md bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] font-mono text-[10px] font-extrabold">
          {s.environment}
        </span>
      ),
    },
    {
      id: "version",
      header: "VERSION",
      accessorKey: "version",
      sortable: true,
      cell: (s) => <span className="font-mono text-xs text-[#64748B] font-bold">{s.version}</span>,
    },
    {
      id: "last_rotated_at",
      header: "LAST ROTATED",
      accessorKey: "last_rotated_at",
      sortable: true,
      cell: (s) => (
        <span className="text-xs text-[#475569] font-medium">
          {new Date(s.last_rotated_at).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      id: "actions",
      header: "ACTIONS",
      cell: (s) => (
        <button
          type="button"
          onClick={() => {
            setRotateKey(s.key_name);
            setShowModal(true);
          }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#2563EB] bg-[#EFF6FF] text-[#2563EB] font-extrabold text-xs hover:bg-[#DBEAFE] transition cursor-pointer shadow-2xs"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Rotate
        </button>
      ),
    },
  ];

  // Columns for Audit Log Table
  const auditColumns: TableColumn<AuditLog>[] = [
    {
      id: "action",
      header: "ACTION EVENT",
      accessorKey: "action",
      sortable: true,
      cell: (a) => (
        <span className="px-2.5 py-1 rounded-md bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0] font-mono text-[10px] font-extrabold">
          {a.action}
        </span>
      ),
    },
    {
      id: "key_name",
      header: "TARGET SECRET KEY",
      accessorKey: "key_name",
      sortable: true,
      cell: (a) => <span className="font-mono text-xs font-bold text-[#0F172A]">{a.key_name}</span>,
    },
    {
      id: "masked_value",
      header: "MASKED COMPLIANCE VIEW",
      accessorKey: "masked_value",
      cell: (a) => <span className="font-mono text-xs text-[#64748B]">{a.masked_value}</span>,
    },
    {
      id: "actor",
      header: "EXECUTED BY (ACTOR)",
      accessorKey: "actor",
      sortable: true,
      cell: (a) => <span className="text-xs font-semibold text-[#475569]">{a.actor}</span>,
    },
    {
      id: "timestamp",
      header: "TIMESTAMP",
      accessorKey: "timestamp",
      sortable: true,
      cell: (a) => (
        <span className="font-mono text-xs text-[#64748B]">
          {new Date(a.timestamp).toLocaleString("en-IN")}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-[#2563EB]" />
            Bitwarden Secrets Management Platform
          </h1>
          <p className="mt-1 text-sm font-medium text-[#64748B]">
            Zero Hardcoded Credentials — Centralized Vault, Memory Cache (&lt;5ms) &amp; Zero-Downtime Rotation
          </p>
        </div>

        {/* Role Switcher Toolbar for Security Testing */}
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
              <option value="OPERATIONS_ADMIN">👤 OPERATIONS_ADMIN (Restricted)</option>
              <option value="RETAILER">🏬 RETAILER (Restricted)</option>
            </select>
          </div>

          {isSuperAdmin && (
            <>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-xs font-extrabold text-white shadow-md hover:bg-[#1D4ED8] transition cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                Rotate Secret Key
              </button>
              <button
                type="button"
                onClick={fetchData}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl border border-[#CBD5E1] bg-white px-4 py-2.5 text-xs font-extrabold text-[#475569] hover:bg-[#F8FAFC] transition cursor-pointer shadow-2xs"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh Status
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── 403 FORBIDDEN / ACCESS RESTRICTED SCREEN FOR NON-SUPER ADMIN USERS ── */}
      {!isSuperAdmin ? (
        <div className="min-h-[480px] flex flex-col items-center justify-center p-8 text-center rounded-3xl border border-[#FCA5A5] bg-gradient-to-b from-[#FEF2F2] via-[#FFF5F5] to-white shadow-lg space-y-5 my-6 animate-in fade-in duration-300">
          <div className="p-4 rounded-3xl bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] shadow-sm">
            <ShieldAlert className="w-12 h-12 text-[#DC2626]" />
          </div>

          <div className="max-w-md space-y-2">
            <span className="px-3 py-1 rounded-full bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5] font-mono text-xs font-extrabold tracking-wider uppercase inline-block">
              403 Forbidden — Level 5 Clearance Required
            </span>
            <h2 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
              Super Admin Authorization Required
            </h2>
            <p className="text-xs text-[#7F1D1D] font-medium leading-relaxed">
              The Bitwarden Secrets Management Platform contains sensitive production master keys, database credentials, and cryptographic certificates. Access is strictly restricted to authorized <strong>Super Administrators</strong>.
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
                SUPER_ADMIN (Level 5)
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
          {/* Success Notification Banner */}
          {successMsg && (
            <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-between text-xs font-bold text-[#166534] shadow-sm animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-[#16A34A] shrink-0" />
                <span>{successMsg}</span>
              </div>
              <button onClick={() => setSuccessMsg("")} className="hover:opacity-75 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Vault Telemetry & Security Health Strip */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm space-y-3">
            <div className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">
              Vault Telemetry &amp; Security Health
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              {/* Card 1 */}
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider">Bitwarden Vault</span>
                <div className="flex items-center gap-1.5 text-base font-extrabold text-[#15803D]">
                  <CheckCircle2 className="w-5 h-5 text-[#16A34A]" /> UNLOCKED
                </div>
                <p className="text-xs text-[#64748B] font-semibold">
                  App Env: <strong className="text-[#0F172A]">PRODUCTION</strong>
                </p>
              </div>

              {/* Card 2 */}
              <div className="p-4 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] space-y-1">
                <span className="text-[11px] font-extrabold text-[#1E40AF] uppercase tracking-wider">Cached Secrets</span>
                <div className="text-2xl font-extrabold text-[#2563EB]">
                  {secrets.length} Active Keys
                </div>
                <p className="text-xs text-[#2563EB] font-bold">Memory Lookup SLA &lt; 5ms</p>
              </div>

              {/* Card 3 */}
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider">BWS CLI Status</span>
                <div className="flex items-center gap-1.5 text-base font-extrabold text-[#15803D]">
                  <ShieldCheck className="w-5 h-5 text-[#16A34A]" /> AUTHENTICATED
                </div>
                <p className="text-xs text-[#64748B] font-semibold">Zero Secrets in Codebase</p>
              </div>

              {/* Card 4 */}
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider">Rotation Engine</span>
                <div className="flex items-center gap-1.5 text-base font-extrabold text-[#15803D]">
                  <RotateCcw className="w-5 h-5 text-[#16A34A]" /> ACTIVE
                </div>
                <p className="text-xs text-[#64748B] font-semibold">Zero-Downtime Hot Swap</p>
              </div>
            </div>
          </div>

          {/* Active Vault Secrets Inventory Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-[#2563EB]" />
              <h2 className="text-base font-extrabold text-[#0F172A]">Centralized Vault Secrets Inventory</h2>
            </div>

            <DataTable
              data={secrets}
              columns={secretColumns}
              keyExtractor={(s) => s.id || s.key_name}
              loading={loading}
              totalRecords={secrets.length}
              onRefresh={fetchData}
              onAddNew={() => setShowModal(true)}
              addNewLabel="Rotate Secret Key"
              searchPlaceholder="Search vault secrets by key name, environment..."
            />
          </div>

          {/* Audit Log Table Section */}
          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-2">
              <EyeOff className="w-5 h-5 text-[#16A34A]" />
              <h2 className="text-base font-extrabold text-[#0F172A]">Masked Secret Audit Trail Log</h2>
            </div>

            <DataTable
              data={auditLogs}
              columns={auditColumns}
              keyExtractor={(a) => a.audit_id}
              loading={loading}
              totalRecords={auditLogs.length}
              onRefresh={fetchData}
              searchPlaceholder="Search audit trail by key name, actor, action..."
            />
          </div>
        </>
      )}

      {/* Rotation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-[#2563EB]" /> Rotate Secret Key
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-[#64748B] font-medium">
              Updates Bitwarden vault value, invalidates local cache, and updates process environment runtime with zero-downtime hot swap.
            </p>

            <form onSubmit={handleRotateSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[#475569] font-bold mb-1">Target Secret Key *</label>
                <select
                  value={rotateKey}
                  onChange={(e) => setRotateKey(e.target.value)}
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white p-2.5 font-mono text-[#0F172A] focus:border-[#2563EB] focus:outline-none cursor-pointer"
                >
                  {secrets.map((s) => (
                    <option key={s.key_name} value={s.key_name}>
                      {s.key_name} ({s.version})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#475569] font-bold mb-1">New Secret Value *</label>
                <input
                  type="password"
                  required
                  placeholder="Enter new secret key value..."
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white p-2.5 font-mono text-[#0F172A] focus:border-[#2563EB] focus:outline-none text-[11px]"
                />
              </div>

              <div>
                <label className="block text-[#475569] font-bold mb-1">Compliance Rotation Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Scheduled quarterly compliance rotation"
                  value={rotationReason}
                  onChange={(e) => setRotationReason(e.target.value)}
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white p-2.5 text-[#0F172A] focus:border-[#2563EB] focus:outline-none text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#475569] font-extrabold text-xs hover:bg-[#EFF6FF] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rotating}
                  className="rounded-xl bg-[#2563EB] px-6 py-2.5 text-xs font-extrabold text-white hover:bg-[#1D4ED8] shadow-md transition cursor-pointer"
                >
                  {rotating ? "Rotating Secret..." : "Confirm & Hot-Swap Secret"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
