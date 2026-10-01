"use client";

import React, { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import {
  CreditCard, Search, RefreshCw, X, CheckCircle2, AlertTriangle,
  Lock, Unlock, Clock, Smartphone, Wifi, Battery, Cpu, Phone,
  Store, Percent, Info, Eye, Signal, Zap, FileText, AlertCircle,
  CalendarDays, Tag, Shield, ChevronDown, ChevronRight, Send
} from "lucide-react";

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const playSuccess = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [523, 659, 784].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.1);
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

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtDateTime = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const STATUS_CFG: Record<string, { bg: string; text: string; border: string; label: string; dot: string }> = {
  ACTIVE:          { bg: "#F0FDF4", text: "#166534", border: "#BBF7D0", label: "Active",          dot: "#22C55E" },
  ASSIGNED:        { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE", label: "Assigned",        dot: "#3B82F6" },
  INACTIVE:        { bg: "#F8FAFC", text: "#64748B", border: "#CBD5E1", label: "Inactive",        dot: "#94A3B8" },
  BLOCKED:         { bg: "#FEF2F2", text: "#991B1B", border: "#FCA5A5", label: "Blocked",         dot: "#EF4444" },
  FAULTY:          { bg: "#FFFBEB", text: "#92400E", border: "#FDE68A", label: "Faulty",          dot: "#F59E0B" },
  PENDING_BLOCK:   { bg: "#FFF7ED", text: "#C2410C", border: "#FED7AA", label: "Block Pending",   dot: "#FB923C" },
  PENDING_UNBLOCK: { bg: "#F5F3FF", text: "#6D28D9", border: "#DDD6FE", label: "Unblock Pending", dot: "#8B5CF6" },
};

function StatusPill({ status }: { status: string }) {
  const c = STATUS_CFG[status] || { bg: "#F8FAFC", text: "#64748B", border: "#E2E8F0", label: status, dot: "#94A3B8" };
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black border"
      style={{ background: c.bg, color: c.text, borderColor: c.border }}>
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: c.dot }} />
      {c.label}
    </span>
  );
}

// â”€â”€â”€ Block/Unblock Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function BlockModal({ machine, onClose, onDone }: { machine: any; onClose: () => void; onDone: (msg: string) => void }) {
  const isBlocked = machine?.status === "BLOCKED";
  const [type, setType] = useState<"BLOCK" | "UNBLOCK">(isBlocked ? "UNBLOCK" : "BLOCK");
  const [reason, setReason] = useState("");
  const [role, setRole] = useState("SD");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) { setErr("Reason is required."); return; }
    setSaving(true); setErr("");
    try {
      const res = await api.post(`/api/v1/machines/${machine.public_id}/block-request`, {
        request_type: type, reason: reason.trim(), requester_role: role
      });
      playSuccess();
      onDone(res.data?.message || `${type} request submitted successfully.`);
    } catch (e: any) {
      playError();
      setErr(e.response?.data?.detail || "Failed to submit request.");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-[#E2E8F0]">
        {/* Header */}
        <div className={`p-5 rounded-t-2xl border-b flex items-center justify-between ${type === "BLOCK" ? "bg-[#FEF2F2]" : "bg-[#F0FDF4]"}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${type === "BLOCK" ? "bg-[#FCA5A5]/30" : "bg-[#BBF7D0]/30"}`}>
              {type === "BLOCK" ? <Lock className="w-5 h-5 text-[#DC2626]" /> : <Unlock className="w-5 h-5 text-[#16A34A]" />}
            </div>
            <div>
              <h3 className="text-sm font-black text-[#0F172A]">
                {type === "BLOCK" ? "Raise Block Request" : "Raise Unblock Request"}
              </h3>
              <p className="text-[11px] text-[#64748B] font-medium mt-0.5 font-mono">{machine?.serial_number}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-black/5 rounded-lg cursor-pointer">
            <X className="w-4 h-4 text-[#64748B]" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          {/* Request Type Toggle */}
          <div className="grid grid-cols-2 gap-2">
            {(["BLOCK", "UNBLOCK"] as const).map(t => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`py-2.5 rounded-xl border-2 text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  type === t
                    ? t === "BLOCK" ? "bg-[#FEF2F2] border-[#DC2626] text-[#DC2626]" : "bg-[#F0FDF4] border-[#16A34A] text-[#16A34A]"
                    : "bg-white border-[#E2E8F0] text-[#94A3B8] hover:border-[#94003A]"
                }`}>
                {t === "BLOCK" ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                {t === "BLOCK" ? "Block Device" : "Unblock Device"}
              </button>
            ))}
          </div>

          {/* Role */}
          <div>
            <label className="text-xs font-bold text-[#374151] block mb-1.5">Your Role</label>
            <select value={role} onChange={e => setRole(e.target.value)}
              className="w-full rounded-lg border border-[#D1D5DB] p-2.5 text-xs font-bold text-[#111827] focus:outline-none focus:border-[#94003A] cursor-pointer">
              <option value="SD">Super Distributor (SD)</option>
              <option value="DISTRIBUTOR">Distributor</option>
              <option value="RETAILER">Retailer</option>
            </select>
          </div>

          {/* Reason */}
          <div>
            <label className="text-xs font-bold text-[#374151] block mb-1.5">
              Reason <span className="text-[#DC2626]">*</span>
            </label>
            <textarea rows={4} value={reason} onChange={e => setReason(e.target.value)}
              placeholder={type === "BLOCK" ? "e.g. Device lost / stolen / damaged / suspicious usage..." : "e.g. Issue resolved, device recovered..."}
              className="w-full rounded-lg border border-[#D1D5DB] p-3 text-xs font-semibold text-[#111827] placeholder-[#94A3B8] focus:outline-none focus:border-[#94003A] resize-none" />
            <p className="text-[10px] text-[#94A3B8] mt-0.5">{reason.length}/500</p>
          </div>

          {/* Info note */}
          <div className={`p-3 rounded-xl border text-xs font-semibold flex items-start gap-2 ${type === "BLOCK" ? "bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]" : "bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8]"}`}>
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            Request will be sent to Admin for review. The device status will not change until Admin approves.
          </div>

          {err && (
            <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-xs font-bold text-[#991B1B] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {err}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-extrabold text-[#64748B] hover:bg-[#F8FAFC] cursor-pointer transition-all">
              Cancel
            </button>
            <button type="submit" disabled={saving || !reason.trim()}
              className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold text-white cursor-pointer transition-all disabled:opacity-40 ${type === "BLOCK" ? "bg-[#DC2626] hover:bg-[#B91C1C]" : "bg-[#16A34A] hover:bg-[#15803D]"}`}>
              {saving ? "Submitting..." : `Submit ${type === "BLOCK" ? "Block" : "Unblock"} Request`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// â”€â”€â”€ Detail Drawer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function DeviceDrawer({
  data, mdr, history, onClose, onRequest
}: { data: any; mdr: any[]; history: any[]; onClose: () => void; onRequest: (m: any) => void }) {
  const m = data?.machine || data;
  const tel = data?.telemetry;
  const isBlocked = m?.status === "BLOCKED";
  const hasPending = m?.status?.startsWith("PENDING_");
  const batColor = (tel?.battery_percentage ?? 100) >= 60 ? "#22C55E" : (tel?.battery_percentage ?? 100) >= 20 ? "#F59E0B" : "#EF4444";

  const infoRows = [
    ["Serial Number", m?.serial_number, true],
    ["TID", m?.tid || "â€”", true],
    ["MID", m?.mid || "â€”", true],
    ["POS Model", m?.pos_model || "Android POS Terminal", false],
    ["Machine Type", m?.machine_type || "ANDROID_POS", false],
    ["OS Version", m?.os_version || "â€”", false],
    ["Firmware Version", m?.firmware_version || "â€”", false],
    ["SIM ICCID", m?.sim_iccid || "Not set", true],
    ["Telecom Provider", m?.telecom_provider || "â€”", false],
    ["Machine Mobile", m?.mobile_number || "Not set", true],
    ["Registered On", fmtDate(m?.created_date), false],
    ["Assigned On", m?.assigned_at ? fmtDateTime(m?.assigned_at) : "Not Assigned", false],
    ["Vendor", m?.vendor_name || "Direct / No Vendor", false],
    ["Vendor Commission", m?.vendor_commission_value != null ? `${m.vendor_commission_value}%` : "â€”", false],
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md shadow-2xl flex flex-col h-full">
        {/* Drawer Header */}
        <div className="bg-gradient-to-r from-[#1E293B] to-[#0F172A] p-5 text-white flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Smartphone className="w-4 h-4 text-amber-400" />
              <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider">POS Device Info</span>
            </div>
            <h2 className="text-base font-black font-mono">{m?.serial_number}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{m?.pos_model || "Android POS Terminal"}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#F1F5F9]">
          {/* Status + Action */}
          <div className="px-5 py-4 flex items-center justify-between">
            <StatusPill status={m?.status} />
            <button onClick={() => onRequest(m)} disabled={hasPending}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-extrabold border transition-all cursor-pointer disabled:opacity-40 ${
                isBlocked ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]" : "bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]"
              }`}>
              {isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {hasPending ? "Pending..." : isBlocked ? "Request Unblock" : "Request Block"}
            </button>
          </div>

          {/* Telemetry */}
          {tel && (
            <div className="px-5 py-4">
              <p className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider mb-3">Live Telemetry</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 text-center">
                  <Battery className="w-4 h-4 mx-auto mb-1" style={{ color: batColor }} />
                  <p className="text-xs font-black" style={{ color: batColor }}>{tel.battery_percentage ?? "â€”"}%</p>
                  <p className="text-[10px] text-[#94A3B8]">Battery</p>
                </div>
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 text-center">
                  <Wifi className="w-4 h-4 mx-auto mb-1 text-[#3B82F6]" />
                  <p className="text-xs font-black text-[#334155]">{tel.network_type || "4G"}</p>
                  <p className="text-[10px] text-[#94A3B8]">Network</p>
                </div>
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 text-center">
                  <Signal className="w-4 h-4 mx-auto mb-1 text-[#64748B]" />
                  <p className="text-xs font-black text-[#334155]">{tel.signal_strength ?? "â€”"}</p>
                  <p className="text-[10px] text-[#94A3B8]">Signal dBm</p>
                </div>
              </div>
            </div>
          )}

          {/* Device Info */}
          <div className="px-5 py-4">
            <p className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" /> Device Information
            </p>
            <div className="space-y-0 divide-y divide-[#F8FAFC] rounded-xl border border-[#F1F5F9] overflow-hidden">
              {infoRows.map(([label, value, mono]) => (
                <div key={label as string} className="flex items-center justify-between px-3.5 py-2.5 bg-white hover:bg-[#F8FAFC] transition-colors">
                  <span className="text-[11px] text-[#94A3B8] font-semibold shrink-0">{label}</span>
                  <span className={`text-[11px] font-bold text-[#0F172A] text-right ml-3 ${mono ? "font-mono" : ""}`}>{value as string}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Assigned Retailer */}
          {m?.mapped_retailer_id && (
            <div className="px-5 py-4">
              <p className="text-[10px] font-extrabold text-[#94003A] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5" /> Assigned Retailer
              </p>
              <div className="bg-[#FDF2F4] border border-[#F5C2D1] rounded-xl p-4 space-y-1.5">
                <p className="text-xs font-black text-[#0F172A]">{m.retailer_name || "Retailer"}</p>
                <p className="text-[11px] font-mono text-[#94003A]">{m.retailer_code}</p>
                {m.retailer_mobile && <p className="text-[11px] text-[#64748B]">{m.retailer_mobile}</p>}
              </div>
            </div>
          )}

          {/* MDR Rates */}
          {mdr.length > 0 && (
            <div className="px-5 py-4">
              <p className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5" /> Applied MDR Rates
              </p>
              <div className="space-y-2">
                {mdr.map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3">
                    <div>
                      <p className="text-xs font-bold text-[#0F172A]">{r.payment_mode}</p>
                      <p className="text-[10px] text-[#94A3B8]">{r.is_default ? "Global Default" : "Retailer Override"} Â· GST {r.gst_rate ?? 0}%</p>
                    </div>
                    <span className="text-sm font-black text-[#94003A] bg-[#FDF2F4] border border-[#F5C2D1] px-2.5 py-1 rounded-lg">{r.mdr}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Request History */}
          {history.length > 0 && (
            <div className="px-5 py-4">
              <p className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Block/Unblock Requests
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {history.map((h: any) => (
                  <div key={h.id} className={`p-3 rounded-xl border ${h.request_type === "BLOCK" ? "bg-[#FEF2F2] border-[#FCA5A5]" : "bg-[#F0FDF4] border-[#BBF7D0]"}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${h.request_type === "BLOCK" ? "bg-[#DC2626] text-white" : "bg-[#16A34A] text-white"}`}>
                        {h.request_type}
                      </span>
                      <span className="text-[10px] text-[#94A3B8]">{fmtDateTime(h.requested_at)}</span>
                    </div>
                    <p className="text-[11px] font-semibold text-[#334155] line-clamp-2">{h.reason}</p>
                    <p className="text-[10px] text-[#64748B] mt-0.5">by {h.requested_by}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="p-4 border-t border-[#E2E8F0]">
          <button onClick={() => onRequest(m)} disabled={hasPending}
            className={`w-full py-3 rounded-xl text-xs font-extrabold text-white flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 transition-all ${
              isBlocked ? "bg-[#16A34A] hover:bg-[#15803D]" : "bg-[#DC2626] hover:bg-[#B91C1C]"
            }`}>
            {isBlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            {hasPending ? "Request Already Pending..." : isBlocked ? "Request Unblock" : "Raise Block Request"}
          </button>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function PosInfoPage() {
  const [machines, setMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [alert, setAlert] = useState<{ type: "success" | "error" | null; msg: string }>({ type: null, msg: "" });

  // Drawer state
  const [drawerData, setDrawerData] = useState<any>(null);
  const [drawerMdr, setDrawerMdr] = useState<any[]>([]);
  const [drawerHistory, setDrawerHistory] = useState<any[]>([]);
  const [showDrawer, setShowDrawer] = useState(false);

  // Modal state
  const [blockTarget, setBlockTarget] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/machines", {
        params: { search: search || undefined, status: statusFilter !== "ALL" ? statusFilter : undefined }
      });
      setMachines(res.data.items || []);
    } catch (e) {
      console.error("Failed to load machines", e);
    } finally { setLoading(false); }
  };

  const openDrawer = async (m: any) => {
    setDrawerData(m); setDrawerMdr([]); setDrawerHistory([]); setShowDrawer(true);
    const [d, mdr, hist] = await Promise.allSettled([
      api.get(`/api/v1/machines/${m.public_id}`),
      api.get("/api/v1/pos/admin/mdr-configs", { params: { is_active: true } }),
      api.get(`/api/v1/machines/${m.public_id}/block-requests`)
    ]);
    if (d.status === "fulfilled") setDrawerData(d.value.data);
    if (mdr.status === "fulfilled") setDrawerMdr((mdr.value.data.items || []).slice(0, 6));
    if (hist.status === "fulfilled") setDrawerHistory(hist.value.data.items || []);
  };

  const openModal = (m: any) => { setBlockTarget(m); setShowModal(true); };

  useEffect(() => { load(); }, [search, statusFilter]);

  useEffect(() => {
    if (alert.type) { const t = setTimeout(() => setAlert({ type: null, msg: "" }), 5000); return () => clearTimeout(t); }
  }, [alert.type]);

  const filtered = useMemo(() => {
    if (!search) return machines;
    const q = search.toLowerCase();
    return machines.filter(m =>
      (m.serial_number || "").toLowerCase().includes(q) ||
      (m.retailer_name || "").toLowerCase().includes(q) ||
      (m.retailer_code || "").toLowerCase().includes(q) ||
      (m.mobile_number || "").includes(q)
    );
  }, [machines, search]);

  const stats = useMemo(() => ({
    total: machines.length,
    active: machines.filter(m => ["ACTIVE", "ASSIGNED"].includes(m.status)).length,
    blocked: machines.filter(m => m.status === "BLOCKED").length,
    pending: machines.filter(m => m.status?.startsWith("PENDING_")).length,
  }), [machines]);

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-6 pb-12 px-1">
      {/* Header */}
      <div className="rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#0A1628] p-6 sm:p-8 relative overflow-hidden">
          {/* decorative glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 text-amber-400 text-[11px] font-extrabold uppercase tracking-widest mb-3">
              <Smartphone className="w-4 h-4" />
              POS Terminal Monitor
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">My POS Devices</h1>
            <p className="text-slate-400 text-xs sm:text-sm font-medium max-w-2xl">
              View device info, registration date, MDR rates and raise block/unblock requests for POS terminals under your hierarchy.
            </p>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {[
              { label: "Total Devices", value: stats.total, color: "#94A3B8", bg: "rgba(255,255,255,0.05)" },
              { label: "Active / Assigned", value: stats.active, color: "#22C55E", bg: "rgba(34,197,94,0.08)" },
              { label: "Blocked", value: stats.blocked, color: "#EF4444", bg: "rgba(239,68,68,0.08)" },
              { label: "Pending Requests", value: stats.pending, color: "#F59E0B", bg: "rgba(245,158,11,0.08)" },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className="rounded-xl border border-white/10 px-4 py-3" style={{ background: bg }}>
                <p className="text-xl font-black" style={{ color }}>{value}</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alert */}
      {alert.type && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold ${
          alert.type === "success" ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]" : "bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]"
        }`}>
          <div className="flex items-center gap-2">
            {alert.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {alert.msg}
          </div>
          <button onClick={() => setAlert({ type: null, msg: "" })} className="cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <input type="text" placeholder="Search serial number, retailer, mobile..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#1E293B] focus:ring-2 focus:ring-[#1E293B]/10" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-bold text-[#334155] focus:outline-none focus:border-[#1E293B] cursor-pointer">
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="BLOCKED">Blocked</option>
          <option value="INACTIVE">Inactive</option>
          <option value="FAULTY">Faulty</option>
        </select>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#1E293B] text-white rounded-xl text-xs font-extrabold hover:bg-[#0F172A] cursor-pointer disabled:opacity-50 transition-all">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-[#E2E8F0] rounded-2xl p-5 animate-pulse">
              <div className="h-4 bg-[#F1F5F9] rounded w-3/4 mb-3" />
              <div className="h-3 bg-[#F1F5F9] rounded w-1/2 mb-2" />
              <div className="h-3 bg-[#F1F5F9] rounded w-2/3 mb-5" />
              <div className="h-9 bg-[#F8FAFC] rounded-xl" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-20 text-center">
          <div className="w-16 h-16 bg-[#F8FAFC] border border-[#E2E8F0] rounded-full flex items-center justify-center mx-auto mb-4">
            <Smartphone className="w-7 h-7 text-[#CBD5E1]" />
          </div>
          <h3 className="text-sm font-black text-[#0F172A] mb-1">No POS Devices Found</h3>
          <p className="text-xs text-[#64748B]">No POS machines are registered under your hierarchy yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(m => {
            const isBlocked = m.status === "BLOCKED";
            const hasPending = m.status?.startsWith("PENDING_");
            const isActive = ["ACTIVE", "ASSIGNED"].includes(m.status);

            return (
              <div key={m.public_id}
                className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden hover:shadow-lg hover:border-[#CBD5E1] transition-all group">

                {/* Card top color stripe */}
                <div className={`h-1 w-full ${isBlocked ? "bg-red-500" : isActive ? "bg-emerald-500" : hasPending ? "bg-amber-500" : "bg-slate-300"}`} />

                <div className="p-5 space-y-4">
                  {/* Device header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${isBlocked ? "bg-[#FEF2F2]" : isActive ? "bg-[#F0FDF4]" : "bg-[#F8FAFC]"}`}>
                        <Smartphone className={`w-5 h-5 ${isBlocked ? "text-[#EF4444]" : isActive ? "text-[#22C55E]" : "text-[#94A3B8]"}`} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-[#0F172A] font-mono">{m.serial_number}</p>
                        <p className="text-[11px] text-[#64748B]">{m.pos_model || "Android POS Terminal"}</p>
                      </div>
                    </div>
                    <StatusPill status={m.status} />
                  </div>

                  {/* Info rows */}
                  <div className="space-y-2 bg-[#F8FAFC] rounded-xl p-3">
                    {/* Create date */}
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                      <span className="text-[11px] text-[#64748B] font-medium">Registered:</span>
                      <span className="text-[11px] font-bold text-[#0F172A]">{fmtDate(m.created_date)}</span>
                    </div>
                    {/* Retailer */}
                    {m.retailer_name && (
                      <div className="flex items-center gap-2">
                        <Store className="w-3.5 h-3.5 text-[#94003A] shrink-0" />
                        <span className="text-[11px] font-bold text-[#0F172A] truncate">{m.retailer_name}</span>
                        <span className="text-[10px] font-mono text-[#64748B] shrink-0">({m.retailer_code})</span>
                      </div>
                    )}
                    {/* Mobile */}
                    {m.mobile_number && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                        <span className="text-[11px] font-mono font-bold text-[#0F172A]">{m.mobile_number}</span>
                      </div>
                    )}
                    {/* Vendor */}
                    {m.vendor_name && (
                      <div className="flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="text-[11px] text-[#334155] font-semibold truncate">{m.vendor_name}</span>
                        <span className="text-[11px] font-black text-[#94003A] shrink-0">{m.vendor_commission_value ?? 0}%</span>
                      </div>
                    )}
                    {/* MDR teaser */}
                    <div className="flex items-center gap-2">
                      <Percent className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                      <span className="text-[11px] text-[#64748B] font-medium">MDR:</span>
                      <span className="text-[11px] font-bold text-[#94003A]">View details â†’</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button onClick={() => openDrawer(m)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[11px] font-extrabold text-[#334155] cursor-pointer transition-all">
                      <Eye className="w-3.5 h-3.5" /> View Details
                    </button>
                    <button onClick={() => openModal(m)} disabled={hasPending}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-[11px] font-extrabold cursor-pointer disabled:opacity-40 transition-all ${
                        isBlocked
                          ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#166534] hover:bg-[#DCFCE7]"
                          : "bg-[#FEF2F2] border-[#FCA5A5] text-[#DC2626] hover:bg-[#FEE2E2]"
                      }`}>
                      {isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      {hasPending ? "Pending..." : isBlocked ? "Unblock" : "Block"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drawer */}
      {showDrawer && drawerData && (
        <DeviceDrawer data={drawerData} mdr={drawerMdr} history={drawerHistory}
          onClose={() => setShowDrawer(false)}
          onRequest={m => { setShowDrawer(false); openModal(m); }} />
      )}

      {/* Block Modal */}
      {showModal && blockTarget && (
        <BlockModal machine={blockTarget}
          onClose={() => setShowModal(false)}
          onDone={msg => { setShowModal(false); setAlert({ type: "success", msg }); load(); }} />
      )}
    </div>
  );
}

