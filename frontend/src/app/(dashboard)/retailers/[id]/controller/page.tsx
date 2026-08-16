"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Store,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  PauseCircle,
  RefreshCw,
  Zap,
  SlidersHorizontal,
  TrendingUp,
  KeyRound,
  LogOut,
  UserCog,
  Wallet,
  Copy,
  Check,
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Activity,
  Network,
  Lock,
  Unlock,
  ArrowUpCircle,
  ArrowDownCircle,
  ExternalLink,
  Shield,
  Settings2,
  BadgeCheck,
} from "lucide-react";

import {
  getRetailerOverview,
  updateRetailerStatus,
  toggleRetailerServices,
  updateRetailerLimits,
  resetRetailerCredentials,
  revokeRetailerSessions,
  impersonateRetailer,
  adjustRetailerWallet,
  type RetailerOverview,
  type ServiceToggles,
  type RetailerLimits,
} from "@/services/admin-retailer-controller-api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = (status || "").toUpperCase();
  const map: Record<string, string> = {
    ACTIVE: "bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]",
    APPROVED: "bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]",
    PENDING: "bg-[#FEF9C3] text-[#854D0E] border-[#FDE68A]",
    REJECTED: "bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]",
    SUSPENDED: "bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold border ${
        map[s] || "bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]"
      }`}
    >
      {s === "ACTIVE" || s === "APPROVED" ? (
        <CheckCircle2 className="w-3.5 h-3.5" />
      ) : s === "SUSPENDED" || s === "REJECTED" ? (
        <XCircle className="w-3.5 h-3.5" />
      ) : (
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
      )}
      {s}
    </span>
  );
}

function Panel({
  title,
  icon,
  accent = "#2563EB",
  children,
}: {
  title: string;
  icon: React.ReactNode;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
      <div
        className="flex items-center gap-3 px-5 py-4 border-b border-[#F1F5F9]"
        style={{ borderLeftWidth: 3, borderLeftColor: accent, borderLeftStyle: "solid" }}
      >
        <span style={{ color: accent }}>{icon}</span>
        <h2 className="text-[13px] font-extrabold text-[#0F172A] tracking-tight">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      id={`toggle-${label.toLowerCase().replace(/\s+/g, "-")}`}
      onClick={() => onChange(!value)}
      disabled={disabled}
      className={`flex items-center justify-between w-full px-4 py-3 rounded-xl border transition-all cursor-pointer ${
        value
          ? "bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8]"
          : "bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "hover:shadow-sm"}`}
    >
      <span className="text-[12px] font-bold">{label}</span>
      <span
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          value ? "bg-[#2563EB]" : "bg-[#CBD5E1]"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
            value ? "translate-x-4" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}

function Toast({
  msg,
  type,
  onClose,
}: {
  msg: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold text-white animate-slide-in-up ${
        type === "success" ? "bg-[#16A34A]" : "bg-[#DC2626]"
      }`}
    >
      {type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
      {msg}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RetailerControllerPage() {
  const params = useParams();
  const router = useRouter();
  const retailerId = params.id as string;

  const [overview, setOverview] = useState<RetailerOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Panel-local state
  const [statusReason, setStatusReason] = useState("");
  const [serviceToggles, setServiceToggles] = useState<ServiceToggles>({});
  const [limits, setLimits] = useState<RetailerLimits>({});
  const [credOpts, setCredOpts] = useState({
    reset_password: false,
    reset_mpin: false,
    reason: "",
  });
  const [walletType, setWalletType] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [walletAmount, setWalletAmount] = useState("");
  const [walletReason, setWalletReason] = useState("");
  const [walletRef, setWalletRef] = useState("");
  const [impersonationToken, setImpersonationToken] = useState<string | null>(null);
  const [impersonationUrl, setImpersonationUrl] = useState<string | null>(null);

  const showToast = (msg: string, type: "success" | "error") => setToast({ msg, type });

  const loadOverview = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getRetailerOverview(retailerId);
      setOverview(res.retailer);
      setServiceToggles(res.retailer.service_toggles);
      setLimits(res.retailer.limits);
    } catch {
      showToast("Failed to load retailer overview.", "error");
    } finally {
      setLoading(false);
    }
  }, [retailerId]);

  useEffect(() => {
    if (retailerId) loadOverview();
  }, [retailerId, loadOverview]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  // ── Action handlers ──

  const handleStatusAction = async (action: "APPROVE" | "REJECT" | "SUSPEND" | "REACTIVATE") => {
    setBusy(`status-${action}`);
    try {
      await updateRetailerStatus(retailerId, action, statusReason || undefined);
      showToast(`Retailer ${action.toLowerCase()}d successfully.`, "success");
      setStatusReason("");
      await loadOverview();
    } catch {
      showToast(`Failed to ${action.toLowerCase()} retailer.`, "error");
    } finally {
      setBusy(null);
    }
  };

  const handleServiceToggle = async (key: keyof ServiceToggles, value: boolean) => {
    const updated = { ...serviceToggles, [key]: value };
    setServiceToggles(updated);
    setBusy(`service-${key}`);
    try {
      await toggleRetailerServices(retailerId, { [key]: value });
      showToast(`Service toggle updated.`, "success");
    } catch {
      setServiceToggles(serviceToggles);
      showToast("Failed to update service toggle.", "error");
    } finally {
      setBusy(null);
    }
  };

  const handleLimitsSave = async () => {
    setBusy("limits");
    try {
      await updateRetailerLimits(retailerId, limits);
      showToast("Transaction limits saved successfully.", "success");
    } catch {
      showToast("Failed to save limits.", "error");
    } finally {
      setBusy(null);
    }
  };

  const handleCredentialsReset = async () => {
    if (!credOpts.reset_password && !credOpts.reset_mpin) {
      showToast("Select at least one credential to reset.", "error");
      return;
    }
    setBusy("credentials");
    try {
      await resetRetailerCredentials(retailerId, credOpts);
      showToast("Credentials reset successfully. Notification dispatched.", "success");
    } catch {
      showToast("Failed to reset credentials.", "error");
    } finally {
      setBusy(null);
    }
  };

  const handleRevokeSessions = async () => {
    setBusy("revoke");
    try {
      const res = await revokeRetailerSessions(retailerId);
      showToast(`${res.revoked_sessions_count} session(s) terminated immediately.`, "success");
    } catch {
      showToast("Failed to revoke sessions.", "error");
    } finally {
      setBusy(null);
    }
  };

  const handleImpersonate = async () => {
    setBusy("impersonate");
    try {
      const res = await impersonateRetailer(retailerId);
      setImpersonationToken(res.delegated_access_token);
      setImpersonationUrl(res.redirect_url);
      showToast(`15-minute delegated session created.`, "success");
    } catch {
      showToast("Failed to generate impersonation token.", "error");
    } finally {
      setBusy(null);
    }
  };

  const handleWalletAdjust = async () => {
    const amt = parseFloat(walletAmount);
    if (!amt || amt <= 0) { showToast("Enter a valid amount.", "error"); return; }
    if (!walletReason.trim()) { showToast("Reason is required.", "error"); return; }
    setBusy("wallet");
    try {
      const res = await adjustRetailerWallet(retailerId, walletType, amt, walletReason, walletRef || undefined);
      showToast(
        `₹${amt.toLocaleString()} ${walletType.toLowerCase()}ed. New balance: ₹${res.new_balance.toLocaleString()}`,
        "success"
      );
      setWalletAmount("");
      setWalletReason("");
      setWalletRef("");
      await loadOverview();
    } catch {
      showToast("Wallet adjustment failed.", "error");
    } finally {
      setBusy(null);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center gap-3 text-sm font-semibold text-[#64748B]">
        <RefreshCw className="w-5 h-5 animate-spin text-[#2563EB]" />
        Loading Retailer Controller…
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-[#64748B]">
        <AlertTriangle className="w-10 h-10 text-[#EF4444]" />
        <p className="text-sm font-semibold">Could not load retailer data.</p>
        <button
          onClick={loadOverview}
          className="px-4 py-2 text-xs font-bold bg-[#2563EB] text-white rounded-xl"
        >
          Retry
        </button>
      </div>
    );
  }

  const r = overview;
  const riskColor = r.risk_profile?.risk_tier === "LOW_RISK"
    ? "#16A34A"
    : r.risk_profile?.risk_tier === "MEDIUM_RISK"
    ? "#D97706"
    : "#DC2626";

  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-6">
      {/* ─── Hero Header ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#E2E8F0] pb-5">
        <div className="flex items-center gap-4">
          <Link
            href={`/retailers/${retailerId}`}
            className="flex items-center justify-center w-10 h-10 rounded-xl border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight flex items-center gap-2">
                <Settings2 className="w-6 h-6 text-[#7C3AED]" />
                Admin Controller
              </h1>
              <StatusBadge status={r.status} />
            </div>
            <p className="mt-1 text-xs font-medium text-[#64748B]">
              <span className="font-bold text-[#334155]">{r.store_name}</span>{" "}
              &mdash; {r.retailer_name} &mdash;{" "}
              <span className="font-mono text-[#2563EB]">{r.retailer_code}</span>
            </p>
          </div>
        </div>
        <button
          onClick={loadOverview}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E2E8F0] bg-white text-[11px] font-bold text-[#475569] hover:bg-[#F8FAFC] transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#2563EB]" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ─── 360° Overview ─── */}
      <Panel title="360° Retailer Overview" icon={<Store className="w-5 h-5" />} accent="#2563EB">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Info cell */}
          {[
            { label: "Mobile", value: r.mobile, icon: <Phone className="w-3.5 h-3.5" /> },
            { label: "Email", value: r.email || "—", icon: <Mail className="w-3.5 h-3.5" /> },
            { label: "PAN", value: r.pan_number || "—", icon: <CreditCard className="w-3.5 h-3.5" /> },
            {
              label: "Location",
              value: `${r.city}, ${r.state} - ${r.pincode}`,
              icon: <MapPin className="w-3.5 h-3.5" />,
            },
          ].map(({ label, value, icon }) => (
            <div key={label} className="flex flex-col gap-1 p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
                {icon} {label}
              </span>
              <span className="text-[12px] font-bold text-[#0F172A] truncate">{value}</span>
            </div>
          ))}

          {/* Wallet balance */}
          <div className="flex flex-col gap-1 p-3 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE]">
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#3B82F6] uppercase tracking-wider">
              <Wallet className="w-3.5 h-3.5" /> Wallet Balance
            </span>
            <span className="text-[18px] font-extrabold text-[#1D4ED8]">
              ₹{r.wallet_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* KYC status */}
          <div className="flex flex-col gap-1 p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0]">
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#16A34A] uppercase tracking-wider">
              <BadgeCheck className="w-3.5 h-3.5" /> KYC Status
            </span>
            <span className="text-[12px] font-extrabold text-[#15803D]">{r.kyc_status}</span>
          </div>

          {/* Risk profile */}
          {r.risk_profile && (
            <div className="flex flex-col gap-1 p-3 rounded-xl bg-[#FEF9C3] border border-[#FDE68A]">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#92400E] uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5" /> Risk Profile
              </span>
              <span className="text-[12px] font-extrabold" style={{ color: riskColor }}>
                {r.risk_profile.risk_tier.replace("_", " ")} — Score {r.risk_profile.risk_score}
              </span>
            </div>
          )}

          {/* Distributor */}
          {r.assigned_distributor && (
            <div className="flex flex-col gap-1 p-3 rounded-xl bg-[#F5F3FF] border border-[#DDD6FE] col-span-full sm:col-span-2">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#7C3AED] uppercase tracking-wider">
                <Network className="w-3.5 h-3.5" /> Assigned Distributor
              </span>
              <span className="text-[12px] font-bold text-[#4C1D95]">
                {r.assigned_distributor.dist_name}{" "}
                <span className="text-[#7C3AED] font-mono">({r.assigned_distributor.dist_code})</span>
              </span>
            </div>
          )}
        </div>
      </Panel>

      {/* ─── Status & Lifecycle ─── */}
      <Panel title="Status & Lifecycle Control" icon={<Activity className="w-5 h-5" />} accent="#7C3AED">
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-[#64748B] mb-1.5 block">
              Reason / Audit Note (optional)
            </label>
            <input
              id="status-reason-input"
              type="text"
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="e.g. KYC documents verified successfully"
              className="w-full px-3 py-2.5 text-[12px] font-medium border border-[#E2E8F0] rounded-xl bg-[#F8FAFC] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(
              [
                { action: "APPROVE" as const, label: "Approve", cls: "bg-[#16A34A] hover:bg-[#15803D] text-white", icon: <CheckCircle2 className="w-4 h-4" /> },
                { action: "REJECT" as const, label: "Reject", cls: "bg-[#DC2626] hover:bg-[#B91C1C] text-white", icon: <XCircle className="w-4 h-4" /> },
                { action: "SUSPEND" as const, label: "Suspend", cls: "bg-[#F59E0B] hover:bg-[#D97706] text-white", icon: <PauseCircle className="w-4 h-4" /> },
                { action: "REACTIVATE" as const, label: "Reactivate", cls: "bg-[#2563EB] hover:bg-[#1D4ED8] text-white", icon: <Zap className="w-4 h-4" /> },
              ] as const
            ).map(({ action, label, cls, icon }) => (
              <button
                key={action}
                id={`status-action-${action.toLowerCase()}`}
                onClick={() => handleStatusAction(action)}
                disabled={busy === `status-${action}`}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-extrabold transition-all cursor-pointer shadow-sm ${cls} ${busy === `status-${action}` ? "opacity-60" : ""}`}
              >
                {busy === `status-${action}` ? <RefreshCw className="w-4 h-4 animate-spin" /> : icon}
                {label}
              </button>
            ))}
          </div>
        </div>
      </Panel>

      {/* ─── Service Toggles ─── */}
      <Panel title="Service Toggles" icon={<SlidersHorizontal className="w-5 h-5" />} accent="#0891B2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(
            [
              { key: "dmt_enabled" as const, label: "DMT — Domestic Money Transfer" },
              { key: "aeps_enabled" as const, label: "AEPS — Aadhaar Enabled Payment" },
              { key: "bbps_enabled" as const, label: "BBPS — Bill Payment" },
              { key: "upi_enabled" as const, label: "UPI — Unified Payment Interface" },
              { key: "settlement_enabled" as const, label: "Settlement — Bank Transfer" },
              { key: "card_to_cash_enabled" as const, label: "Card-to-Cash" },
              { key: "recharge_enabled" as const, label: "Recharge — Mobile / DTH" },
            ] as const
          ).map(({ key, label }) => (
            <Toggle
              key={key}
              label={label}
              value={!!(serviceToggles as Record<string, boolean>)[key]}
              onChange={(v) => handleServiceToggle(key, v)}
              disabled={busy === `service-${key}`}
            />
          ))}
        </div>
      </Panel>

      {/* ─── Transaction Limits ─── */}
      <Panel title="Transaction Velocity Limits" icon={<TrendingUp className="w-5 h-5" />} accent="#059669">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {(
            [
              { key: "daily_limit" as const, label: "Daily Limit (₹)", placeholder: "500000" },
              { key: "monthly_limit" as const, label: "Monthly Limit (₹)", placeholder: "2500000" },
              { key: "per_tx_limit" as const, label: "Per-Transaction Limit (₹)", placeholder: "50000" },
              { key: "max_daily_tx_count" as const, label: "Max Daily Transactions", placeholder: "200" },
            ] as const
          ).map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-[11px] font-bold text-[#64748B] mb-1.5 block">{label}</label>
              <input
                id={`limit-${key}`}
                type="number"
                value={(limits as Record<string, number | undefined>)[key] ?? ""}
                onChange={(e) =>
                  setLimits((prev) => ({ ...prev, [key]: parseFloat(e.target.value) || undefined }))
                }
                placeholder={placeholder}
                className="w-full px-3 py-2.5 text-[12px] font-semibold border border-[#E2E8F0] rounded-xl bg-[#F8FAFC] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#059669]/30 focus:border-[#059669]"
              />
            </div>
          ))}
        </div>
        <button
          id="save-limits-btn"
          onClick={handleLimitsSave}
          disabled={busy === "limits"}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#059669] text-white text-[12px] font-extrabold hover:bg-[#047857] transition-all cursor-pointer shadow-sm"
        >
          {busy === "limits" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Save Limits
        </button>
      </Panel>

      {/* ─── Security Operations ─── */}
      <Panel title="Security Operations" icon={<KeyRound className="w-5 h-5" />} accent="#DC2626">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Credential Reset */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Credential Reset</p>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  id="reset-password-checkbox"
                  type="checkbox"
                  checked={credOpts.reset_password}
                  onChange={(e) => setCredOpts((p) => ({ ...p, reset_password: e.target.checked }))}
                  className="w-4 h-4 accent-[#DC2626] rounded"
                />
                <span className="text-[12px] font-semibold text-[#334155] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#DC2626]" /> Reset Login Password
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  id="reset-mpin-checkbox"
                  type="checkbox"
                  checked={credOpts.reset_mpin}
                  onChange={(e) => setCredOpts((p) => ({ ...p, reset_mpin: e.target.checked }))}
                  className="w-4 h-4 accent-[#DC2626] rounded"
                />
                <span className="text-[12px] font-semibold text-[#334155] flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#DC2626]" /> Reset Transaction MPIN
                </span>
              </label>
            </div>
            <input
              id="cred-reset-reason"
              type="text"
              value={credOpts.reason}
              onChange={(e) => setCredOpts((p) => ({ ...p, reason: e.target.value }))}
              placeholder="Reason for credential reset"
              className="w-full px-3 py-2 text-[12px] border border-[#E2E8F0] rounded-xl bg-[#F8FAFC] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
            />
            <button
              id="reset-credentials-btn"
              onClick={handleCredentialsReset}
              disabled={busy === "credentials"}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#DC2626] text-white text-[12px] font-extrabold hover:bg-[#B91C1C] transition-all cursor-pointer"
            >
              {busy === "credentials" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              Reset Selected Credentials
            </button>
          </div>

          {/* Session Revoke */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Session Management</p>
            <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA]">
              <p className="text-[12px] font-semibold text-[#991B1B] mb-3">
                Terminates all active sessions and invalidates device tokens immediately across all devices.
              </p>
              <button
                id="revoke-sessions-btn"
                onClick={handleRevokeSessions}
                disabled={busy === "revoke"}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#991B1B] text-white text-[12px] font-extrabold hover:bg-[#7F1D1D] transition-all cursor-pointer"
              >
                {busy === "revoke" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                Revoke All Sessions
              </button>
            </div>
          </div>
        </div>
      </Panel>

      {/* ─── Wallet Adjustment ─── */}
      <Panel title="Wallet Adjustment" icon={<Wallet className="w-5 h-5" />} accent="#7C3AED">
        <div className="space-y-4">
          <div className="flex gap-3">
            {(["CREDIT", "DEBIT"] as const).map((t) => (
              <button
                key={t}
                id={`wallet-type-${t.toLowerCase()}`}
                onClick={() => setWalletType(t)}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[12px] font-extrabold border transition-all cursor-pointer ${
                  walletType === t
                    ? t === "CREDIT"
                      ? "bg-[#DCFCE7] border-[#16A34A] text-[#166534]"
                      : "bg-[#FEE2E2] border-[#DC2626] text-[#991B1B]"
                    : "bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]"
                }`}
              >
                {t === "CREDIT" ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
                {t}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-[#64748B] mb-1.5 block">Amount (₹)</label>
              <input
                id="wallet-amount-input"
                type="number"
                value={walletAmount}
                onChange={(e) => setWalletAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2.5 text-[12px] font-bold border border-[#E2E8F0] rounded-xl bg-[#F8FAFC] text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#64748B] mb-1.5 block">Reason *</label>
              <input
                id="wallet-reason-input"
                type="text"
                value={walletReason}
                onChange={(e) => setWalletReason(e.target.value)}
                placeholder="Adjustment reason"
                className="w-full px-3 py-2.5 text-[12px] font-medium border border-[#E2E8F0] rounded-xl bg-[#F8FAFC] text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#64748B] mb-1.5 block">Reference ID (optional)</label>
              <input
                id="wallet-ref-input"
                type="text"
                value={walletRef}
                onChange={(e) => setWalletRef(e.target.value)}
                placeholder="Bank / ticket ref"
                className="w-full px-3 py-2.5 text-[12px] font-medium border border-[#E2E8F0] rounded-xl bg-[#F8FAFC] text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
              />
            </div>
          </div>
          <button
            id="wallet-adjust-btn"
            onClick={handleWalletAdjust}
            disabled={busy === "wallet"}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-extrabold text-white transition-all cursor-pointer shadow-sm ${
              walletType === "CREDIT"
                ? "bg-[#16A34A] hover:bg-[#15803D]"
                : "bg-[#DC2626] hover:bg-[#B91C1C]"
            }`}
          >
            {busy === "wallet" ? <RefreshCw className="w-4 h-4 animate-spin" /> : walletType === "CREDIT" ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
            Apply {walletType}
          </button>
        </div>
      </Panel>

      {/* ─── Support Impersonation ─── */}
      <Panel title="Support Impersonation" icon={<UserCog className="w-5 h-5" />} accent="#0891B2">
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#ECFEFF] border border-[#A5F3FC]">
            <p className="text-[12px] font-semibold text-[#0E7490]">
              Generates a <strong>15-minute time-bound delegated access token</strong> scoped to{" "}
              <code className="bg-[#CFFAFE] px-1 rounded font-mono text-[11px]">RETAILER_SUPPORT_READ_WRITE</code>. All
              actions taken during this session are logged under your admin audit trail.
            </p>
          </div>

          {impersonationToken ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0]">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A] flex-shrink-0" />
                <code className="text-[11px] font-mono text-[#166534] break-all flex-1">{impersonationToken}</code>
                <button
                  id="copy-token-btn"
                  onClick={() => copyToClipboard(impersonationToken, "token")}
                  className="flex-shrink-0 p-1.5 rounded-lg hover:bg-[#DCFCE7] transition-all"
                >
                  {copied === "token" ? <Check className="w-4 h-4 text-[#16A34A]" /> : <Copy className="w-4 h-4 text-[#64748B]" />}
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  id="open-impersonation-btn"
                  onClick={() => impersonationUrl && router.push(impersonationUrl)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0891B2] text-white text-[12px] font-extrabold hover:bg-[#0E7490] transition-all cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" /> Open Retailer Session
                </button>
                <button
                  onClick={() => { setImpersonationToken(null); setImpersonationUrl(null); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E2E8F0] text-[12px] font-bold text-[#64748B] hover:bg-[#F8FAFC] transition-all cursor-pointer"
                >
                  <Unlock className="w-4 h-4" /> Clear
                </button>
              </div>
            </div>
          ) : (
            <button
              id="generate-impersonation-btn"
              onClick={handleImpersonate}
              disabled={busy === "impersonate"}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0891B2] text-white text-[12px] font-extrabold hover:bg-[#0E7490] transition-all cursor-pointer shadow-sm"
            >
              {busy === "impersonate" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserCog className="w-4 h-4" />}
              Generate Delegated Session
            </button>
          )}
        </div>
      </Panel>

      {/* ─── Toast ─── */}
      {toast && (
        <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
