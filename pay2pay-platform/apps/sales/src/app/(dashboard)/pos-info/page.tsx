"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import api from "@/lib/api";
import {
  CreditCard, Search, RefreshCw, X, CheckCircle2, AlertTriangle,
  ShieldAlert, ShieldCheck, Smartphone, Wifi, Battery, Cpu,
  Phone, Store, Building2, Users, ChevronDown, ChevronRight,
  DollarSign, Percent, Clock, Send, AlertCircle, Eye, Lock,
  Unlock, Info, Zap, Signal, Layers, Receipt, FileText
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const playSuccess = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [523, 659, 784].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f; g.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.25);
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.1); o.stop(ctx.currentTime + i * 0.1 + 0.25);
    });
  } catch {}
};
const playError = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [440, 349].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "triangle"; o.frequency.value = f;
      g.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.15);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3);
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.15); o.stop(ctx.currentTime + i * 0.15 + 0.3);
    });
  } catch {}
};

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtDateTime = (d: string | null) =>
  d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; label: string; icon: any }> = {
  ACTIVE:    { bg: "#F0FDF4", text: "#166534", border: "#BBF7D0", label: "Active",       icon: CheckCircle2 },
  ASSIGNED:  { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE", label: "Assigned",     icon: CheckCircle2 },
  INACTIVE:  { bg: "#F8FAFC", text: "#64748B", border: "#CBD5E1", label: "Inactive",     icon: AlertCircle },
  BLOCKED:   { bg: "#FEF2F2", text: "#991B1B", border: "#FCA5A5", label: "Blocked",      icon: Lock },
  FAULTY:    { bg: "#FFFBEB", text: "#92400E", border: "#FDE68A", label: "Faulty",       icon: AlertTriangle },
  PENDING_BLOCK:   { bg: "#FFF7ED", text: "#C2410C", border: "#FED7AA", label: "Block Pending",   icon: Clock },
  PENDING_UNBLOCK: { bg: "#F5F3FF", text: "#6D28D9", border: "#DDD6FE", label: "Unblock Pending", icon: Clock },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { bg: "#F8FAFC", text: "#64748B", border: "#E2E8F0", label: status, icon: Info };
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black border"
      style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ─── Block/Unblock Request Modal ────────────────────────────────────────────
function BlockRequestModal({
  machine,
  onClose,
  onSuccess
}: { machine: any; onClose: () => void; onSuccess: (msg: string) => void }) {
  const [requestType, setRequestType] = useState<"BLOCK" | "UNBLOCK">("BLOCK");
  const [reason, setReason] = useState("");
  const [requesterRole, setRequesterRole] = useState("SD");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isBlocked = machine?.status === "BLOCKED";
  const defaultType = isBlocked ? "UNBLOCK" : "BLOCK";

  useEffect(() => {
    setRequestType(defaultType as "BLOCK" | "UNBLOCK");
  }, [machine]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) { setError("Please provide a reason."); return; }
    setSubmitting(true); setError("");
    try {
      const res = await api.post(`/api/v1/machines/${machine.public_id}/block-request`, {
        request_type: requestType,
        reason: reason.trim(),
        requester_role: requesterRole
      });
      playSuccess();
      onSuccess(res.data?.message || `${requestType} request raised successfully!`);
    } catch (err: any) {
      playError();
      setError(err.response?.data?.detail || "Failed to raise request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] w-full max-w-lg">
        {/* Header */}
        <div className={`p-5 rounded-t-2xl border-b ${requestType === "BLOCK" ? "bg-gradient-to-r from-[#FEF2F2] to-[#FFF7ED]" : "bg-gradient-to-r from-[#F0FDF4] to-[#EFF6FF]"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${requestType === "BLOCK" ? "bg-[#FCA5A5]/30" : "bg-[#BBF7D0]/30"}`}>
                {requestType === "BLOCK"
                  ? <Lock className="w-5 h-5 text-[#DC2626]" />
                  : <Unlock className="w-5 h-5 text-[#16A34A]" />}
              </div>
              <div>
                <h2 className="text-sm font-black text-[#0F172A]">
                  Raise {requestType === "BLOCK" ? "Block" : "Unblock"} Request
                </h2>
                <p className="text-xs text-[#64748B] font-medium mt-0.5">
                  {machine?.serial_number} — {machine?.pos_model || "POS Device"}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-[#F1F5F9] rounded-lg cursor-pointer">
              <X className="w-4 h-4 text-[#64748B]" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Request Type */}
          <div>
            <label className="block text-xs font-bold text-[#374151] mb-2">Request Type</label>
            <div className="grid grid-cols-2 gap-3">
              {(["BLOCK", "UNBLOCK"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setRequestType(t)}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-xs font-extrabold transition-all cursor-pointer ${
                    requestType === t
                      ? t === "BLOCK"
                        ? "bg-[#FEF2F2] border-[#DC2626] text-[#DC2626]"
                        : "bg-[#F0FDF4] border-[#16A34A] text-[#16A34A]"
                      : "bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#94003A]"
                  }`}
                >
                  {t === "BLOCK" ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  {t === "BLOCK" ? "Block Machine" : "Unblock Machine"}
                </button>
              ))}
            </div>
          </div>

          {/* Requester Role */}
          <div>
            <label className="block text-xs font-bold text-[#374151] mb-2">Your Role</label>
            <select
              value={requesterRole}
              onChange={(e) => setRequesterRole(e.target.value)}
              className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 text-xs font-bold text-[#111827] focus:outline-none focus:border-[#94003A] focus:ring-2 focus:ring-[#94003A]/20"
            >
              <option value="SD">Super Distributor (SD)</option>
              <option value="DISTRIBUTOR">Distributor</option>
              <option value="RETAILER">Retailer</option>
            </select>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-[#374151] mb-2">
              Reason / Issue Description <span className="text-[#DC2626]">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder={requestType === "BLOCK"
                ? "Describe the issue (e.g. device stolen, damaged, fraudulent usage, lost, etc.)..."
                : "Reason for unblocking (e.g. issue resolved, device recovered, etc.)..."}
              className="w-full rounded-lg border border-[#D1D5DB] bg-white p-3 text-xs font-semibold text-[#111827] placeholder-[#94A3B8] focus:outline-none focus:border-[#94003A] focus:ring-2 focus:ring-[#94003A]/20 resize-none"
            />
            <p className="text-[11px] text-[#94A3B8] mt-1 font-medium">{reason.length}/500 characters</p>
          </div>

          {/* Warning */}
          <div className={`p-3 rounded-xl border text-xs font-semibold ${requestType === "BLOCK" ? "bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]" : "bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8]"}`}>
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {requestType === "BLOCK"
                  ? "This request will be sent to Admin for review. The machine will not be automatically blocked until Admin takes action."
                  : "Admin will review your unblock request and restore the machine if the issue is resolved."}
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-xs font-bold text-[#991B1B] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-extrabold text-[#64748B] hover:bg-[#F8FAFC] transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold text-white transition-all cursor-pointer disabled:opacity-50 ${
                requestType === "BLOCK" ? "bg-[#DC2626] hover:bg-[#B91C1C]" : "bg-[#16A34A] hover:bg-[#15803D]"
              }`}
            >
              {submitting ? "Submitting..." : `Submit ${requestType === "BLOCK" ? "Block" : "Unblock"} Request`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Machine Detail Drawer ───────────────────────────────────────────────────
function MachineDetailDrawer({
  machine,
  mdrInfo,
  blockHistory,
  onClose,
  onRaiseRequest
}: {
  machine: any;
  mdrInfo: any[];
  blockHistory: any[];
  onClose: () => void;
  onRaiseRequest: (m: any) => void;
}) {
  const m = machine?.machine || machine;
  const telemetry = machine?.telemetry;
  const isBlocked = m.status === "BLOCKED";
  const hasPending = m.status?.startsWith("PENDING_");

  const batteryColor = telemetry?.battery_percentage >= 60 ? "#16A34A" : telemetry?.battery_percentage >= 20 ? "#D97706" : "#DC2626";
  const signalColor = (telemetry?.signal_strength || 0) >= -80 ? "#16A34A" : "#D97706";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Drawer Header */}
        <div className="bg-gradient-to-r from-[#94003A] to-[#78002F] p-5 text-white flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Smartphone className="w-5 h-5 text-[#F8E6EE]" />
              <span className="text-xs font-extrabold text-[#E7B631] uppercase tracking-wider">POS Device Details</span>
            </div>
            <h2 className="text-lg font-black">{m.serial_number}</h2>
            <p className="text-xs text-[#F8E6EE]/80 font-medium mt-0.5">{m.pos_model || "Android POS Terminal"}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Status + Quick Action */}
          <div className="flex items-center justify-between">
            <StatusBadge status={m.status} />
            <button
              onClick={() => onRaiseRequest(m)}
              disabled={hasPending}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer disabled:opacity-40 ${
                isBlocked
                  ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#166534] hover:bg-[#DCFCE7]"
                  : "bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B] hover:bg-[#FEE2E2]"
              }`}
            >
              {isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {isBlocked ? "Request Unblock" : "Request Block"}
            </button>
          </div>

          {/* Telemetry Strip */}
          {telemetry && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 text-center">
                <Battery className="w-4 h-4 mx-auto mb-1" style={{ color: batteryColor }} />
                <p className="text-xs font-black" style={{ color: batteryColor }}>{telemetry.battery_percentage ?? "—"}%</p>
                <p className="text-[10px] text-[#94A3B8] font-medium">Battery</p>
              </div>
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 text-center">
                <Wifi className="w-4 h-4 mx-auto mb-1" style={{ color: signalColor }} />
                <p className="text-xs font-black" style={{ color: signalColor }}>{telemetry.network_type || "4G"}</p>
                <p className="text-[10px] text-[#94A3B8] font-medium">Network</p>
              </div>
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 text-center">
                <Signal className="w-4 h-4 mx-auto mb-1 text-[#64748B]" />
                <p className="text-xs font-black text-[#334155]">{telemetry.signal_strength ?? "—"} dBm</p>
                <p className="text-[10px] text-[#94A3B8] font-medium">Signal</p>
              </div>
            </div>
          )}

          {/* Device Info */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-[#F1F5F9] border-b border-[#E2E8F0]">
              <span className="text-[11px] font-extrabold text-[#334155] uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" /> Device Information
              </span>
            </div>
            <div className="divide-y divide-[#F1F5F9]">
              {[
                ["Serial Number", m.serial_number, "mono"],
                ["TID", m.tid || "—", "mono"],
                ["MID", m.mid || "—", "mono"],
                ["POS Model", m.pos_model || "Android POS Terminal", ""],
                ["Machine Type", m.machine_type || "ANDROID_POS", ""],
                ["OS Version", m.os_version || "—", ""],
                ["Firmware", m.firmware_version || "—", ""],
                ["SIM ICCID", m.sim_iccid || "Not Set", "mono"],
                ["Telecom Provider", m.telecom_provider || "—", ""],
                ["Machine Mobile", m.mobile_number || "—", "mono"],
                ["Registered On", fmtDate(m.created_date), ""],
                ["Assigned On", m.assigned_at ? fmtDateTime(m.assigned_at) : "Not Assigned", ""],
              ].map(([label, value, type]) => (
                <div key={label as string} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[11px] text-[#64748B] font-semibold">{label}</span>
                  <span className={`text-[11px] font-bold text-[#0F172A] ${type === "mono" ? "font-mono" : ""}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Retailer Assignment */}
          {m.mapped_retailer_id && (
            <div className="bg-gradient-to-br from-[#FDF2F4] to-[#FEF9FB] border border-[#F5C2D1] rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#F5C2D1]">
                <span className="text-[11px] font-extrabold text-[#94003A] uppercase tracking-wider flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5" /> Assigned Retailer
                </span>
              </div>
              <div className="divide-y divide-[#F9E4EA]">
                {[
                  ["Store Name", m.retailer_name || "—"],
                  ["Retailer Code", m.retailer_code || "—"],
                  ["Mobile", m.retailer_mobile || "—"],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-[11px] text-[#94003A]/70 font-semibold">{label}</span>
                    <span className="text-[11px] font-bold text-[#94003A]">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MDR Charges */}
          {mdrInfo.length > 0 && (
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-[#F1F5F9] border-b border-[#E2E8F0]">
                <span className="text-[11px] font-extrabold text-[#334155] uppercase tracking-wider flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5" /> MDR Charges
                </span>
              </div>
              <div className="divide-y divide-[#F1F5F9]">
                {mdrInfo.map((m: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <span className="text-[11px] text-[#334155] font-bold block">{m.payment_mode}</span>
                      <span className="text-[10px] text-[#94A3B8] font-medium">{m.is_default ? "Global Default" : "Retailer Override"}</span>
                    </div>
                    <span className="text-sm font-black text-[#94003A] bg-[#FDF2F4] border border-[#F5C2D1] px-2.5 py-0.5 rounded-lg">
                      {m.mdr}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Block/Unblock Request History */}
          {blockHistory.length > 0 && (
            <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#FDE68A]">
                <span className="text-[11px] font-extrabold text-[#92400E] uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Request History
                </span>
              </div>
              <div className="divide-y divide-[#FEF3C7] max-h-40 overflow-y-auto">
                {blockHistory.map((h: any) => (
                  <div key={h.id} className="px-4 py-2.5">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${h.request_type === "BLOCK" ? "bg-[#FEF2F2] text-[#DC2626]" : "bg-[#F0FDF4] text-[#16A34A]"}`}>
                        {h.request_type}
                      </span>
                      <span className="text-[10px] text-[#94A3B8] font-medium">{fmtDateTime(h.requested_at)}</span>
                    </div>
                    <p className="text-[11px] text-[#92400E] font-semibold line-clamp-1">{h.reason}</p>
                    <p className="text-[10px] text-[#A16207] font-medium">by {h.requested_by}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="border-t border-[#E2E8F0] p-4 bg-[#F8FAFC]">
          <button
            onClick={() => onRaiseRequest(m)}
            disabled={hasPending}
            className={`w-full py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2 ${
              isBlocked
                ? "bg-[#16A34A] hover:bg-[#15803D] text-white"
                : "bg-[#DC2626] hover:bg-[#B91C1C] text-white"
            }`}
          >
            {isBlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            {hasPending ? "Request Already Pending..." : isBlocked ? "Request Unblock" : "Raise Block Request"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function PosInfoPage() {
  const [machines, setMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [alert, setAlert] = useState<{ type: "success" | "error" | null; message: string }>({ type: null, message: "" });

  const [selectedMachine, setSelectedMachine] = useState<any | null>(null);
  const [mdrInfo, setMdrInfo] = useState<any[]>([]);
  const [blockHistory, setBlockHistory] = useState<any[]>([]);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [targetMachine, setTargetMachine] = useState<any | null>(null);

  const fetchMachines = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/machines", {
        params: { search: search || undefined, status: statusFilter !== "ALL" ? statusFilter : undefined }
      });
      setMachines(res.data.items || []);
    } catch (err) {
      console.error("Failed to fetch machines", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMachineDetails = async (m: any) => {
    try {
      const [detailRes, mdrRes, histRes] = await Promise.allSettled([
        api.get(`/api/v1/machines/${m.public_id}`),
        api.get("/api/v1/pos/admin/mdr-configs", { params: { retailer_id: m.mapped_retailer_id, is_active: true } }),
        api.get(`/api/v1/machines/${m.public_id}/block-requests`)
      ]);
      setSelectedMachine(detailRes.status === "fulfilled" ? detailRes.value.data : m);
      setMdrInfo(mdrRes.status === "fulfilled" ? (mdrRes.value.data.items || []).slice(0, 5) : []);
      setBlockHistory(histRes.status === "fulfilled" ? (histRes.value.data.items || []) : []);
    } catch {}
  };

  const openDrawer = async (m: any) => {
    setSelectedMachine(m);
    setMdrInfo([]);
    setBlockHistory([]);
    setShowDrawer(true);
    await fetchMachineDetails(m);
  };

  const openBlockModal = (m: any) => {
    setTargetMachine(m);
    setShowBlockModal(true);
  };

  useEffect(() => { fetchMachines(); }, [search, statusFilter]);

  // Dismiss alert after 5s
  useEffect(() => {
    if (alert.type) {
      const t = setTimeout(() => setAlert({ type: null, message: "" }), 5000);
      return () => clearTimeout(t);
    }
  }, [alert]);

  const filtered = useMemo(() => {
    if (!search) return machines;
    const q = search.toLowerCase();
    return machines.filter((m) =>
      (m.serial_number || "").toLowerCase().includes(q) ||
      (m.retailer_name || "").toLowerCase().includes(q) ||
      (m.retailer_code || "").toLowerCase().includes(q) ||
      (m.mobile_number || "").includes(q)
    );
  }, [machines, search]);

  const stats = useMemo(() => ({
    total: machines.length,
    active: machines.filter((m) => m.status === "ACTIVE" || m.status === "ASSIGNED").length,
    blocked: machines.filter((m) => m.status === "BLOCKED").length,
    pending: machines.filter((m) => m.status?.startsWith("PENDING_")).length,
  }), [machines]);

  return (
    <div className="space-y-6 w-full max-w-[1400px] mx-auto pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#94003A] via-[#78002F] to-[#550020] rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#E7B631] mb-2">
            <CreditCard className="w-4 h-4" />
            POS Device Monitor
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            My POS Machines
          </h1>
          <p className="text-[#F8E6EE]/80 text-xs sm:text-sm mt-1 font-medium">
            View device info, MDR charges and raise block/unblock requests for POS terminals under your hierarchy.
          </p>
        </div>
        <button
          onClick={fetchMachines}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-extrabold border border-white/20 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Devices", value: stats.total, bg: "#F8FAFC", border: "#E2E8F0", text: "#0F172A", icon: Layers },
          { label: "Active / Assigned", value: stats.active, bg: "#F0FDF4", border: "#BBF7D0", text: "#166534", icon: CheckCircle2 },
          { label: "Blocked", value: stats.blocked, bg: "#FEF2F2", border: "#FCA5A5", text: "#991B1B", icon: Lock },
          { label: "Requests Pending", value: stats.pending, bg: "#FFFBEB", border: "#FDE68A", text: "#92400E", icon: Clock },
        ].map(({ label, value, bg, border, text, icon: Icon }) => (
          <div key={label} className="rounded-2xl border p-4 flex items-center gap-3" style={{ background: bg, borderColor: border }}>
            <div className="p-2 rounded-xl bg-white border" style={{ borderColor: border }}>
              <Icon className="w-4 h-4" style={{ color: text }} />
            </div>
            <div>
              <p className="text-lg font-black" style={{ color: text }}>{value}</p>
              <p className="text-[11px] font-semibold text-[#64748B]">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alert */}
      {alert.type && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold ${
          alert.type === "success" ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]" : "bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]"
        }`}>
          <div className="flex items-center gap-2">
            {alert.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            {alert.message}
          </div>
          <button onClick={() => setAlert({ type: null, message: "" })} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search by serial number, retailer, mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#94003A] focus:ring-2 focus:ring-[#94003A]/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-bold text-[#334155] focus:outline-none focus:border-[#94003A] cursor-pointer"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="BLOCKED">Blocked</option>
          <option value="INACTIVE">Inactive</option>
          <option value="FAULTY">Faulty</option>
        </select>
      </div>

      {/* Machine Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-[#E2E8F0] rounded-2xl p-5 animate-pulse">
              <div className="h-4 bg-[#F1F5F9] rounded w-3/4 mb-3" />
              <div className="h-3 bg-[#F1F5F9] rounded w-1/2 mb-4" />
              <div className="h-8 bg-[#F8FAFC] rounded-xl" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-16 text-center">
          <div className="w-16 h-16 bg-[#F8FAFC] border border-[#E2E8F0] rounded-full flex items-center justify-center mx-auto mb-4">
            <Smartphone className="w-7 h-7 text-[#CBD5E1]" />
          </div>
          <h3 className="text-sm font-black text-[#0F172A] mb-1">No POS Devices Found</h3>
          <p className="text-xs text-[#64748B] font-medium">No POS machines are assigned under your hierarchy yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((m) => {
            const isBlocked = m.status === "BLOCKED";
            const hasPending = m.status?.startsWith("PENDING_");
            const isActive = m.status === "ACTIVE" || m.status === "ASSIGNED";

            return (
              <div
                key={m.public_id}
                className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden hover:shadow-lg hover:border-[#94003A]/20 transition-all group"
              >
                {/* Card Top */}
                <div className={`px-5 py-4 border-b ${isBlocked ? "bg-[#FEF2F2] border-[#FCA5A5]" : hasPending ? "bg-[#FFFBEB] border-[#FDE68A]" : "bg-[#F8FAFC] border-[#E2E8F0]"}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${isBlocked ? "bg-[#FCA5A5]/30" : isActive ? "bg-[#BBF7D0]/30" : "bg-[#E2E8F0]/50"}`}>
                        <Smartphone className={`w-5 h-5 ${isBlocked ? "text-[#DC2626]" : isActive ? "text-[#16A34A]" : "text-[#94A3B8]"}`} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-[#0F172A] font-mono">{m.serial_number}</p>
                        <p className="text-[11px] text-[#64748B] font-medium">{m.pos_model || "Android POS Terminal"}</p>
                      </div>
                    </div>
                    <StatusBadge status={m.status} />
                  </div>
                </div>

                {/* Card Body */}
                <div className="px-5 py-4 space-y-3">
                  {/* Retailer */}
                  <div className="flex items-center gap-2">
                    <Store className="w-3.5 h-3.5 text-[#94003A] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#0F172A] truncate">
                        {m.retailer_name || <span className="text-[#94A3B8] font-normal italic">Not Assigned</span>}
                      </p>
                      {m.retailer_code && (
                        <p className="text-[10px] text-[#64748B] font-mono">{m.retailer_code}</p>
                      )}
                    </div>
                  </div>

                  {/* Mobile */}
                  {m.mobile_number && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                      <span className="text-xs font-bold text-[#0F172A] font-mono">{m.mobile_number}</span>
                    </div>
                  )}

                  {/* Vendor */}
                  {m.vendor_name && (
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
                      <span className="text-xs font-semibold text-[#334155]">
                        {m.vendor_name} — <span className="font-mono text-[#94003A]">{m.vendor_commission_value ?? 0}%</span>
                      </span>
                    </div>
                  )}

                  {/* Assigned date */}
                  <div className="flex items-center gap-2 text-[11px] text-[#94A3B8] font-medium">
                    <Clock className="w-3 h-3 shrink-0" />
                    Registered {fmtDate(m.created_date)}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="px-5 pb-4 pt-1 flex gap-2">
                  <button
                    onClick={() => openDrawer(m)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] text-xs font-extrabold text-[#334155] transition-all cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Details
                  </button>
                  <button
                    onClick={() => openBlockModal(m)}
                    disabled={hasPending}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-extrabold transition-all cursor-pointer disabled:opacity-40 ${
                      isBlocked
                        ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#166534] hover:bg-[#DCFCE7]"
                        : "bg-[#FEF2F2] border-[#FCA5A5] text-[#DC2626] hover:bg-[#FEE2E2]"
                    }`}
                  >
                    {isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    {hasPending ? "Pending..." : isBlocked ? "Unblock" : "Block"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Drawer */}
      {showDrawer && selectedMachine && (
        <MachineDetailDrawer
          machine={selectedMachine}
          mdrInfo={mdrInfo}
          blockHistory={blockHistory}
          onClose={() => setShowDrawer(false)}
          onRaiseRequest={(m) => {
            setShowDrawer(false);
            setTargetMachine(m);
            setShowBlockModal(true);
          }}
        />
      )}

      {/* Block/Unblock Modal */}
      {showBlockModal && targetMachine && (
        <BlockRequestModal
          machine={targetMachine}
          onClose={() => setShowBlockModal(false)}
          onSuccess={(msg) => {
            setShowBlockModal(false);
            playSuccess();
            setAlert({ type: "success", message: msg });
            fetchMachines();
          }}
        />
      )}
    </div>
  );
}
