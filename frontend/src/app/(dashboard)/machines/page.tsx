"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import api from "@/lib/api";
import {
  CreditCard, Search, Plus, RefreshCw, FileSpreadsheet, ChevronRight,
  Wifi, Battery, ShieldCheck, X, Cpu, CheckCircle2, AlertTriangle, Store, Building2, Sliders, DollarSign, Scale, Volume2,
  ChevronDown, Check
} from "lucide-react";
import { DataTable, type TableColumn } from "@/components/ui/data-table";

// Web Audio API Sound Synthesizer
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
  } catch (e) {
    console.error("Audio playback error", e);
  }
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
  } catch (e) {
    console.error("Audio playback error", e);
  }
};

function SearchableRetailerSelect({
  retailers,
  value,
  onChange,
}: {
  retailers: any[];
  value: string;
  onChange: (val: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterText, setFilterText] = useState("");
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedRetailer = retailers.find((r) => r.public_id === value);

  const filteredRetailers = retailers.filter((r) => {
    const q = filterText.toLowerCase().trim();
    if (!q) return true;
    const text = `${r.store_name} ${r.retailer_code} ${r.owner_name} ${r.legal_name || ""}`.toLowerCase();
    return text.includes(q);
  });

  const displayLabel = selectedRetailer
    ? `${selectedRetailer.store_name} (${selectedRetailer.retailer_code}) - ${selectedRetailer.owner_name}`
    : "Select Retailer Outlet...";

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-lg border border-[#D1D5DB] bg-white p-2.5 text-[#111827] text-left text-xs font-bold hover:border-[#2563EB] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none transition-all cursor-pointer shadow-2xs"
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown className={`w-4 h-4 text-[#94A3B8] shrink-0 ml-2 transition-transform duration-200 ${isOpen ? "rotate-180 text-[#2563EB]" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-full rounded-xl border border-[#E2E8F0] bg-white shadow-2xl overflow-hidden p-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
            <input
              type="text"
              autoFocus
              placeholder="Search store name, code, or owner..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full pl-8 pr-7 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:bg-white transition-all"
            />
            {filterText && (
              <button
                type="button"
                onClick={() => setFilterText("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {filteredRetailers.length === 0 ? (
              <div className="p-4 text-center text-xs font-semibold text-[#94A3B8]">
                No matching retailers found
              </div>
            ) : (
              filteredRetailers.map((r) => {
                const isSelected = r.public_id === value;
                return (
                  <button
                    key={r.public_id}
                    type="button"
                    onClick={() => {
                      onChange(r.public_id);
                      setIsOpen(false);
                      setFilterText("");
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-[#2563EB]/10 text-[#2563EB] font-extrabold"
                        : "text-[#334155] font-semibold hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="font-bold text-[#0F172A]">{r.store_name} <span className="font-mono text-[11px] text-[#64748B]">({r.retailer_code})</span></div>
                      <div className="text-[11px] text-[#64748B] font-medium">{r.owner_name}</div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#2563EB] shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MachinesPage() {
  const [machines, setMachines] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modal & Notification State
  const [showModal, setShowModal] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [modalError, setModalError] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Alert Banner State
  const [alertState, setAlertState] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: ""
  });

  const [formData, setFormData] = useState({
    serial_number: "",
    tid: "",
    mid: "",
    pos_model: "Pax A920",
    machine_type: "ANDROID_POS",
    os_version: "Android 11",
    firmware_version: "v2.4.1",
    sim_iccid: "",
    telecom_provider: "Airtel M2M",
    mapped_retailer_id: "",
    company_id: "",
    monthly_rental_fee: 500.0,
    mdr_rule_code: "MDR_SWIPE_1.5",
    gst_rate: 18.0
  });

  const fetchMachines = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/machines", {
        params: { search, status: statusFilter }
      });
      setMachines(res.data.items || []);
      setTotal(res.data.total || (res.data.items ? res.data.items.length : 0));
    } catch (err) {
      console.error("Failed to fetch machines", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSetupData = async () => {
    try {
      const compRes = await api.get("/api/v1/companies");
      setCompanies(compRes.data.items || []);

      const retRes = await api.get("/api/v1/retailers");
      setRetailers(retRes.data.items || []);

      if (compRes.data.items && compRes.data.items.length > 0) {
        setFormData(prev => ({ ...prev, company_id: compRes.data.items[0].public_id }));
      }
      if (retRes.data.items && retRes.data.items.length > 0) {
        setFormData(prev => ({ ...prev, mapped_retailer_id: retRes.data.items[0].public_id }));
      }
    } catch (err) {
      console.error("Failed to load setup data", err);
    }
  };

  useEffect(() => {
    fetchMachines();
    fetchSetupData();
  }, [search, statusFilter]);

  const parseErrorMessage = (err: any): string => {
    if (!err.response?.data) return "Network error or terminal registration failure.";
    const data = err.response.data;

    if (typeof data.detail === "string") return data.detail;
    if (typeof data.message === "string") return data.message;

    if (Array.isArray(data.detail)) {
      return data.detail
        .map((item: any) => {
          const field = item.loc ? item.loc[item.loc.length - 1] : "field";
          return `Field "${field.toUpperCase()}": ${item.msg}`;
        })
        .join(" | ");
    }
    return "Invalid terminal input values provided.";
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError("");

    try {
      await api.post("/api/v1/machines", formData);
      setShowModal(false);
      
      playSuccessSound();
      setAlertState({
        type: "success",
        message: `POS Swipe Terminal "${formData.serial_number}" deployed and mapped successfully!`
      });
      
      setFormData({
        ...formData,
        serial_number: "",
        tid: "",
        mid: ""
      });

      fetchMachines();
    } catch (err: any) {
      const parsedErr = parseErrorMessage(err);
      setModalError(parsedErr);
      
      playErrorSound();
      setAlertState({
        type: "error",
        message: `Deployment Failed: ${parsedErr}`
      });
    } finally {
      setSubmitting(false);
    }
  };

  const activeMachines = machines.filter(m => m.status === "ACTIVE").length;

  // Columns definition for DataTable
  const columns: TableColumn<any>[] = [
    {
      id: "terminal_info",
      header: "Serial Number & TID",
      sortable: true,
      cell: (m) => (
        <div>
          <span className="font-sans text-xs font-bold text-[#111827] block">{m.pos_model || "Pax A920"}</span>
          <span className="font-mono text-xs font-bold text-[#2563EB]">{m.serial_number}</span>
          <div className="text-[11px] text-[#64748B] font-mono">TID: {m.tid} | MID: {m.mid}</div>
        </div>
      ),
    },
    {
      id: "mapped_retailer",
      header: "Mapped Retailer Outlet",
      sortable: true,
      cell: (m) => (
        <div className="font-sans text-xs">
          <div className="font-bold text-[#0F172A] flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5 text-[#2563EB]" />
            {m.retailer_name || "Metro Retail Outlet"}
          </div>
          <span className="text-[11px] text-[#64748B] font-mono">Code: {m.retailer_code || "RET001"}</span>
        </div>
      ),
    },
    {
      id: "monthly_rental",
      header: "Monthly Rental (₹)",
      sortable: true,
      cell: (m) => (
        <span className="font-mono text-xs font-extrabold text-[#0F172A]">
          ₹{m.monthly_rental_fee || 500}.00 / mo
        </span>
      ),
    },
    {
      id: "mdr_gst",
      header: "MDR & GST Code",
      cell: (m) => (
        <div className="font-mono text-xs">
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] block w-fit">
            MDR: 1.50%
          </span>
          <span className="text-[11px] text-[#64748B] font-mono mt-0.5 block">GST: 18.00%</span>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      cell: (m) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
            m.status === "ACTIVE"
              ? "bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]"
              : "bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]"
          }`}
        >
          {m.status || "ACTIVE"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight flex items-center gap-3">
            <CreditCard className="w-7 h-7 text-[#2563EB]" /> POS Swipe Machine Directory
          </h1>
          <p className="mt-1 text-sm font-medium text-[#64748B]">
            Configure POS Terminal deployments, retailer outlet mappings, monthly rental fees, MDR rules, and GST rates
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/financial-config/rules"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] text-xs font-extrabold text-[#2563EB] hover:bg-[#DBEAFE] transition-all"
          >
            <Scale className="w-4 h-4" /> MDR & GST Rules Config
          </Link>
          <button
            onClick={() => {
              setModalError("");
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2563EB] text-xs font-extrabold text-white hover:bg-[#1D4ED8] shadow-2xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Deploy & Map POS Terminal
          </button>
        </div>
      </div>

      {/* Global Success / Failure Banner */}
      {alertState.type && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold ${
            alertState.type === "success"
              ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]"
              : "bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]"
          }`}
        >
          <div className="flex items-center gap-2">
            {alertState.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-[#16A34A] shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-[#DC2626] shrink-0" />
            )}
            <span>{alertState.message}</span>
          </div>
          <button
            onClick={() => setAlertState({ type: null, message: "" })}
            className="p-1 hover:opacity-75"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total POS Terminals", value: total || machines.length, color: "#2563EB", bg: "#EFF6FF", icon: CreditCard },
          { label: "Active Swiping",     value: activeMachines,           color: "#16A34A", bg: "#DCFCE7", icon: CheckCircle2 },
          { label: "Mapped Retailers",   value: retailers.length || 2,     color: "#0284C7", bg: "#E0F2FE", icon: Store },
          { label: "Monthly Rental (Avg)", value: "₹500 / mo",           color: "#D97706", bg: "#FEF3C7", icon: DollarSign },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">{label}</p>
              <h3 className="mt-1 text-2xl font-extrabold text-[#0F172A]">{value}</h3>
            </div>
            <div className="rounded-xl p-3" style={{ background: bg, color }}>
              <Icon className="h-6 w-6" />
            </div>
          </div>
        ))}
      </div>

      {/* Enterprise Data Table with exact Company Page Grid Header */}
      <DataTable
        data={machines}
        columns={columns}
        keyExtractor={(m) => m.public_id || m.serial_number}
        loading={loading}
        totalRecords={total}
        pageSize={10}
        onRefresh={fetchMachines}
        onAddNew={() => {
          setModalError("");
          setShowModal(true);
        }}
        addNewLabel="Deploy POS Terminal"
        searchPlaceholder="Search POS terminals by Serial Number, TID, MID, model..."
        filterOptions={[
          {
            key: "status",
            label: "Status",
            options: [
              { label: "Active", value: "ACTIVE" },
              { label: "Inactive", value: "INACTIVE" },
              { label: "Pending", value: "PENDING" },
            ],
          },
        ]}
      />

      {/* Deploy & Map Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-2xl space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-3">
              <h3 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#2563EB]" /> Deploy & Map POS Terminal
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-[#64748B] hover:text-[#0F172A] p-1 rounded-lg hover:bg-[#F1F5F9] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Error Banner */}
            {modalError && (
              <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-[#991B1B] text-xs font-bold flex items-start gap-2.5 shadow-2xs">
                <AlertTriangle className="h-4 w-4 text-[#DC2626] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-extrabold block">Validation / Terminal Error:</span>
                  <span className="font-medium">{modalError}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-[#374151] block mb-1">Target Retailer Outlet Mapping *</label>
                <SearchableRetailerSelect
                  retailers={retailers}
                  value={formData.mapped_retailer_id}
                  onChange={(val) => setFormData({ ...formData, mapped_retailer_id: val })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-[#374151] block mb-1">Serial Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SN-POS-998811"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 font-mono text-[#111827] focus:border-[#2563EB] focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#374151] block mb-1">POS Model</label>
                  <select
                    value={formData.pos_model}
                    onChange={(e) => setFormData({ ...formData, pos_model: e.target.value })}
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 text-[#111827] font-bold cursor-pointer"
                  >
                    <option value="Pax A920">Pax A920 Android POS</option>
                    <option value="Verifone V200c">Verifone V200c Countertop</option>
                    <option value="Ingenico Move/5000">Ingenico Move/5000 Wireless</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-[#374151] block mb-1">Terminal ID (TID - Min 8 chars) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TID8822001"
                    value={formData.tid}
                    onChange={(e) => setFormData({ ...formData, tid: e.target.value })}
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 font-mono text-[#111827] focus:border-[#2563EB] focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#374151] block mb-1">Merchant ID (MID) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MID99114400"
                    value={formData.mid}
                    onChange={(e) => setFormData({ ...formData, mid: e.target.value })}
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 font-mono text-[#111827] focus:border-[#2563EB] focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-[#374151] block mb-1">Monthly Rental Fee (₹)</label>
                  <input
                    type="number"
                    value={formData.monthly_rental_fee}
                    onChange={(e) => setFormData({ ...formData, monthly_rental_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 font-mono text-[#111827] focus:border-[#2563EB] focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#374151] block mb-1">MDR Rate Rule</label>
                  <select
                    value={formData.mdr_rule_code}
                    onChange={(e) => setFormData({ ...formData, mdr_rule_code: e.target.value })}
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 text-[#111827] font-bold cursor-pointer"
                  >
                    <option value="MDR_SWIPE_1.5">Standard Swipe MDR (1.50%)</option>
                    <option value="MDR_PREMIUM_2.0">Premium Credit Card MDR (2.00%)</option>
                    <option value="MDR_FLAT_DEBIT">Flat Debit MDR (0.90%)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-[#E5E7EB] pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-[#D1D5DB] bg-white px-4 py-2 text-xs font-extrabold text-[#374151] hover:bg-[#F8FAFC] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[#2563EB] px-5 py-2 text-xs font-extrabold text-white hover:bg-[#1D4ED8] transition-all shadow-2xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Register & Deploy Terminal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
