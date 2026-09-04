"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import api from "@/lib/api";
import {
  CreditCard, Search, Plus, RefreshCw, FileSpreadsheet, ChevronRight,
  Wifi, Battery, ShieldCheck, X, Cpu, CheckCircle2, AlertTriangle, Store, Building2, Sliders, DollarSign, Scale, Volume2,
  ChevronDown, Check, Phone, Layers, Edit3, Trash2, ArrowRight, UserCheck, ShieldAlert, Sparkles, SlidersHorizontal, ArrowUpDown,
  Smartphone, Send, Receipt, Fingerprint, Power
} from "lucide-react";
import { DataTable, type TableColumn } from "@/components/ui/data-table";

// Web Audio API Synthesizers for Feedback
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
    console.error("Audio error", e);
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
    console.error("Audio error", e);
  }
};

// Searchable Retailer Selection Component
function SearchableRetailerSelect({
  retailers,
  value,
  onChange,
  allowClear = false,
  placeholder = "Select Retailer Outlet..."
}: {
  retailers: any[];
  value: string;
  onChange: (val: string) => void;
  allowClear?: boolean;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterText, setFilterText] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedRetailer = retailers.find((r) => r.public_id === value || r.retailer_code === value || String(r.id) === value);

  const filteredRetailers = retailers.filter((r) => {
    const q = filterText.toLowerCase().trim();
    if (!q) return true;
    const mob = r.registered_mobile || r.mobile || "";
    const text = `${r.store_name || ""} ${r.retailer_code || ""} ${r.owner_name || ""} ${mob} ${r.legal_name || ""}`.toLowerCase();
    return text.includes(q);
  });

  const displayLabel = selectedRetailer
    ? `${selectedRetailer.store_name || selectedRetailer.owner_name} (${selectedRetailer.retailer_code})${selectedRetailer.registered_mobile || selectedRetailer.mobile ? ` • ${selectedRetailer.registered_mobile || selectedRetailer.mobile}` : ""}`
    : placeholder;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-lg border border-[#D1D5DB] bg-white p-2.5 text-[#111827] text-left text-xs font-bold hover:border-[#2563EB] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none transition-all cursor-pointer shadow-2xs"
      >
        <span className="truncate">{displayLabel}</span>
        <div className="flex items-center gap-1.5 ml-2 shrink-0">
          {allowClear && value && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="text-[#94A3B8] hover:text-[#DC2626] p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-[#94A3B8] transition-transform duration-200 ${isOpen ? "rotate-180 text-[#2563EB]" : ""}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-full rounded-xl border border-[#E2E8F0] bg-white shadow-2xl overflow-hidden p-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
            <input
              type="text"
              autoFocus
              placeholder="Search store, code, owner, mobile..."
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

          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {allowClear && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                  setFilterText("");
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-[#64748B] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
              >
                -- Unassigned / Inventory Stock --
              </button>
            )}
            {filteredRetailers.length === 0 ? (
              <div className="p-4 text-center text-xs font-semibold text-[#94A3B8]">
                No matching retailers found
              </div>
            ) : (
              filteredRetailers.map((r) => {
                const isSelected = r.public_id === value || r.retailer_code === value;
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
                      <div className="font-bold text-[#0F172A]">{r.store_name || r.owner_name} <span className="font-mono text-[11px] text-[#64748B]">({r.retailer_code})</span></div>
                      <div className="text-[11px] text-[#64748B] font-medium">{r.owner_name} {r.registered_mobile || r.mobile ? `| ${r.registered_mobile || r.mobile}` : ""}</div>
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
  // Navigation Tabs: "machines" (POS Machines) | "mdr" (POS MDR Configuration) | "services" (Platform Service & POS Availability)
  const [activeTab, setActiveTab] = useState<"machines" | "mdr" | "services">("machines");

  // Tab 3: Platform Services & POS Settlement Modes State (Live DB/API, Zero LocalStorage)
  const [servicesList, setServicesList] = useState<any[]>([]);
  const [posModesList, setPosModesList] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState<boolean>(false);
  const [togglingServiceCode, setTogglingServiceCode] = useState<string | null>(null);
  const [togglingPosModeCode, setTogglingPosModeCode] = useState<string | null>(null);

  // Tab 1: POS Machines State
  const [machines, setMachines] = useState<any[]>([]);
  const [totalMachines, setTotalMachines] = useState(0);
  const [loadingMachines, setLoadingMachines] = useState(true);
  const [searchMachine, setSearchMachine] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [vendorFilter, setVendorFilter] = useState("ALL");
  const [vendors, setVendors] = useState<any[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);

  // Tab 2: POS MDR Configuration State
  const [mdrConfigs, setMdrConfigs] = useState<any[]>([]);
  const [totalMdr, setTotalMdr] = useState(0);
  const [loadingMdr, setLoadingMdr] = useState(true);
  const [searchMdr, setSearchMdr] = useState("");
  const [mdrScopeFilter, setMdrScopeFilter] = useState<"ALL" | "DEFAULT" | "RETAILER">("ALL");

  // Modals & Drawers State
  const [showMachineModal, setShowMachineModal] = useState(false);
  const [editingMachine, setEditingMachine] = useState<any | null>(null);
  const [selectedMachineDetails, setSelectedMachineDetails] = useState<any | null>(null);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);

  const [showMdrModal, setShowMdrModal] = useState(false);
  const [editingMdrConfig, setEditingMdrConfig] = useState<any | null>(null);
  const [showDefaultMdrModal, setShowDefaultMdrModal] = useState(false);

  // Form Data & Feedback
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [alertState, setAlertState] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: ""
  });

  // Machine Form Initial State
  const [machineForm, setMachineForm] = useState({
    serial_number: "",
    mobile_number: "",
    vendor_id: "",
    vendor_name: "",
    vendor_commission_type: "PERCENTAGE",
    vendor_commission_value: 0.0,
    pos_model: "Android POS Terminal",
    machine_type: "ANDROID_POS",
    os_version: "Android 11",
    firmware_version: "v2.4.1",
    sim_iccid: "",
    telecom_provider: "Airtel M2M",
    mapped_retailer_id: "",
    company_id: "",
    status: "ACTIVE"
  });

  // Retailer MDR Form Initial State
  const [mdrForm, setMdrForm] = useState({
    retailer_id: "",
    payment_mode: "POS - Instant",
    mdr: "1.70" as string | number,
    mdr_type: "PERCENTAGE",
    gst_rate: "0.00" as string | number,
    remarks: "",
    is_active: true
  });

  // Load Vendors Master
  const fetchVendors = async () => {
    try {
      const res = await api.get("/api/v1/machines/vendors");
      setVendors(res.data.items || []);
    } catch (e) {
      console.error("Failed to load vendors", e);
    }
  };

  // Load Active & Approved Retailers & Companies from DB
  const fetchRetailersAndCompanies = async () => {
    try {
      let retList: any[] = [];
      try {
        const rRes = await api.get("/api/v1/pos/admin/approved-retailers");
        retList = rRes.data.items || [];
      } catch {
        try {
          const rRes2 = await api.get("/api/v1/retailers/approved");
          retList = rRes2.data.items || [];
        } catch {
          const rRes3 = await api.get("/api/v1/retailers");
          retList = rRes3.data.items || [];
        }
      }

      const cRes = await api.get("/api/v1/companies");
      setRetailers(retList);
      setCompanies(cRes.data.items || []);
      if (cRes.data.items?.length > 0 && !machineForm.company_id) {
        setMachineForm(prev => ({ ...prev, company_id: cRes.data.items[0].public_id }));
      }
    } catch (e) {
      console.error("Failed to load setup data", e);
    }
  };

  // Fetch Machines List
  const fetchMachines = async () => {
    try {
      setLoadingMachines(true);
      const res = await api.get("/api/v1/machines", {
        params: {
          search: searchMachine || undefined,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          vendor_id: vendorFilter !== "ALL" ? vendorFilter : undefined
        }
      });
      setMachines(res.data.items || []);
      setTotalMachines(res.data.total || 0);
    } catch (err) {
      console.error("Failed to fetch machines", err);
    } finally {
      setLoadingMachines(false);
    }
  };

  // Fetch MDR Configurations List (Always active only, hides deactivated T+2)
  const fetchMdrConfigs = async () => {
    try {
      setLoadingMdr(true);
      const res = await api.get("/api/v1/pos/admin/mdr-configs", {
        params: {
          search: searchMdr || undefined,
          scope: mdrScopeFilter !== "ALL" ? mdrScopeFilter : undefined,
          is_active: true
        }
      });
      // Filter strictly active records only (hides deactivated T+2)
      const rawList = res.data.items || [];
      const activeList = rawList.filter((c: any) => c.is_active !== false);
      setMdrConfigs(activeList);
      setTotalMdr(activeList.length);
    } catch (err) {
      console.error("Failed to fetch MDR configs", err);
    } finally {
      setLoadingMdr(false);
    }
  };

  // Fetch Platform Services & POS Modes (Zero Local Storage, DB/API Driven)
  const fetchServicesAndModes = async () => {
    try {
      setLoadingServices(true);
      const res = await api.get("/api/v1/admin/services/status");
      if (res.data) {
        setServicesList(res.data.services || []);
        setPosModesList(res.data.pos_modes || []);
      }
    } catch (err) {
      console.error("Failed to load services and POS modes:", err);
    } finally {
      setLoadingServices(false);
    }
  };

  // Toggle Platform Service Availability via Live DB Stored Procedure
  const handleToggleService = async (serviceCode: string, currentEnabled: boolean) => {
    const nextState = !currentEnabled;
    setServicesList((prev) =>
      prev.map((s) => (s.code === serviceCode ? { ...s, is_enabled: nextState } : s))
    );
    setTogglingServiceCode(serviceCode);
    try {
      const res = await api.patch(`/api/v1/admin/services/${serviceCode}/toggle`, {
        is_enabled: nextState
      });
      playSuccessSound();
      setAlertState({
        type: "success",
        message: `Service '${serviceCode}' availability updated to ${nextState ? "ENABLED" : "DISABLED"} via DB Stored Procedure.`
      });
      if (res.data?.service) {
        setServicesList((prev) =>
          prev.map((s) => (s.code === serviceCode ? { ...s, is_enabled: res.data.service.is_enabled } : s))
        );
      }
    } catch (err: any) {
      setServicesList((prev) =>
        prev.map((s) => (s.code === serviceCode ? { ...s, is_enabled: currentEnabled } : s))
      );
      playErrorSound();
      setAlertState({
        type: "error",
        message: err.response?.data?.detail || `Failed to update service '${serviceCode}'.`
      });
    } finally {
      setTogglingServiceCode(null);
    }
  };

  // Toggle POS Settlement Mode Availability via Live DB Stored Procedure
  const handleTogglePosMode = async (modeCode: string, currentActive: boolean) => {
    const nextState = !currentActive;
    setPosModesList((prev) =>
      prev.map((m) => (m.code === modeCode ? { ...m, is_active: nextState } : m))
    );
    setTogglingPosModeCode(modeCode);
    try {
      const res = await api.patch(`/api/v1/admin/services/pos-modes/${encodeURIComponent(modeCode)}/toggle`, {
        is_active: nextState
      });
      playSuccessSound();
      setAlertState({
        type: "success",
        message: `POS Settlement Mode '${modeCode}' updated to ${nextState ? "ENABLED" : "DISABLED"} via DB Stored Procedure.`
      });
      if (res.data?.mode) {
        setPosModesList((prev) =>
          prev.map((m) => (m.code === modeCode ? { ...m, is_active: res.data.mode.is_active } : m))
        );
      }
    } catch (err: any) {
      setPosModesList((prev) =>
        prev.map((m) => (m.code === modeCode ? { ...m, is_active: currentActive } : m))
      );
      playErrorSound();
      setAlertState({
        type: "error",
        message: err.response?.data?.detail || `Failed to update POS mode '${modeCode}'.`
      });
    } finally {
      setTogglingPosModeCode(null);
    }
  };

  useEffect(() => {
    fetchVendors();
    fetchRetailersAndCompanies();
    fetchServicesAndModes();
  }, []);

  useEffect(() => {
    if (activeTab === "machines") {
      fetchMachines();
    } else if (activeTab === "mdr") {
      fetchMdrConfigs();
      fetchServicesAndModes();
    } else if (activeTab === "services") {
      fetchServicesAndModes();
    }
  }, [activeTab, searchMachine, statusFilter, vendorFilter, searchMdr, mdrScopeFilter]);

  const parseErrorMessage = (err: any): string => {
    if (!err.response?.data) return "Network error or operation failure.";
    const data = err.response.data;
    if (typeof data.detail === "string") return data.detail;
    if (typeof data.message === "string") return data.message;
    if (Array.isArray(data.detail)) {
      return data.detail.map((item: any) => item.msg).join(" | ");
    }
    return "Invalid input data.";
  };

  // Handle Machine Creation or Update
  const handleSaveMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError("");

    try {
      const isVendorSelected = Boolean(machineForm.vendor_id && machineForm.vendor_id.trim());
      const vendorName = isVendorSelected ? machineForm.vendor_name : null;
      const vendorId = isVendorSelected ? machineForm.vendor_id : null;
      const vendorCommVal = isVendorSelected ? (Number(machineForm.vendor_commission_value) || 0) : 0.0;
      const vendorCommType = isVendorSelected ? (machineForm.vendor_commission_type || "PERCENTAGE") : "PERCENTAGE";

      if (editingMachine) {
        await api.put(`/api/v1/machines/${editingMachine.public_id}`, {
          serial_number: machineForm.serial_number,
          mobile_number: machineForm.mobile_number || null,
          vendor_id: vendorId,
          vendor_name: vendorName,
          vendor_commission_type: vendorCommType,
          vendor_commission_value: vendorCommVal,
          pos_model: machineForm.pos_model,
          status: machineForm.status,
          mapped_retailer_id: machineForm.mapped_retailer_id ? machineForm.mapped_retailer_id : null
        });
        playSuccessSound();
        setAlertState({
          type: "success",
          message: `POS Machine "${machineForm.serial_number}" updated successfully.`
        });
      } else {
        await api.post("/api/v1/machines", {
          ...machineForm,
          mobile_number: machineForm.mobile_number || null,
          vendor_id: vendorId,
          vendor_name: vendorName,
          vendor_commission_type: vendorCommType,
          vendor_commission_value: vendorCommVal,
          mapped_retailer_id: machineForm.mapped_retailer_id || null,
          company_id: machineForm.company_id || (companies[0]?.public_id ?? null)
        });
        playSuccessSound();
        setAlertState({
          type: "success",
          message: `POS Machine "${machineForm.serial_number}" registered and assigned successfully!`
        });
      }
      setShowMachineModal(false);
      setEditingMachine(null);
      fetchMachines();
    } catch (err: any) {
      const msg = parseErrorMessage(err);
      setModalError(msg);
      playErrorSound();
      setAlertState({ type: "error", message: `Machine Action Failed: ${msg}` });
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Machine Modal
  const openEditMachine = (m: any) => {
    setEditingMachine(m);
    setMachineForm({
      serial_number: m.serial_number || "",
      mobile_number: m.mobile_number || "",
      vendor_id: m.vendor_id || "",
      vendor_name: m.vendor_name || "",
      vendor_commission_type: m.vendor_commission_type || "PERCENTAGE",
      vendor_commission_value: m.vendor_commission_value ?? 0.0,
      pos_model: m.pos_model || "Android POS Terminal",
      machine_type: m.machine_type || "ANDROID_POS",
      os_version: m.os_version || "Android 11",
      firmware_version: m.firmware_version || "v2.4.1",
      sim_iccid: m.sim_iccid || "",
      telecom_provider: m.telecom_provider || "Airtel M2M",
      mapped_retailer_id: m.mapped_retailer_id || "",
      company_id: m.company_id || (companies[0]?.public_id ?? ""),
      status: m.status || "ACTIVE"
    });
    setModalError("");
    setShowMachineModal(true);
  };

  // Open Details Drawer
  const openDetailsDrawer = async (m: any) => {
    try {
      const res = await api.get(`/api/v1/machines/${m.public_id}`);
      setSelectedMachineDetails(res.data);
      setShowDetailsDrawer(true);
    } catch (e) {
      console.error("Failed to load machine details", e);
    }
  };

  // Handle Machine Quick Status Toggle
  const handleToggleStatus = async (machineId: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" || currentStatus === "ASSIGNED" ? "INACTIVE" : "ACTIVE";
    try {
      await api.post(`/api/v1/machines/${machineId}/status`, { status: newStatus });
      playSuccessSound();
      setAlertState({
        type: "success",
        message: `Machine status updated to ${newStatus}`
      });
      fetchMachines();
      if (selectedMachineDetails && selectedMachineDetails.machine.public_id === machineId) {
        setSelectedMachineDetails((prev: any) => ({
          ...prev,
          machine: { ...prev.machine, status: newStatus }
        }));
      }
    } catch (err: any) {
      playErrorSound();
      setAlertState({ type: "error", message: `Status update failed: ${parseErrorMessage(err)}` });
    }
  };

  // Handle Retailer MDR Save / Override
  const handleSaveMdr = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError("");

    const parsedMdr = parseFloat(String(mdrForm.mdr));
    const parsedGst = parseFloat(String(mdrForm.gst_rate));

    if (isNaN(parsedMdr) || parsedMdr < 0) {
      setModalError("MDR Rate Percentage must be a valid non-negative number.");
      setSubmitting(false);
      return;
    }
    if (isNaN(parsedGst) || parsedGst < 0) {
      setModalError("GST Rate Percentage must be a valid non-negative number (0.0 or greater).");
      setSubmitting(false);
      return;
    }

    try {
      if (editingMdrConfig) {
        const configId = editingMdrConfig.id || editingMdrConfig.public_id;
        await api.put(`/api/v1/pos/admin/mdr-configs/${configId}`, {
          id: configId,
          mdr: parsedMdr,
          mdr_type: mdrForm.mdr_type || "PERCENTAGE",
          gst_rate: parsedGst,
          remarks: mdrForm.remarks,
          is_active: mdrForm.is_active
        });
        playSuccessSound();
        setAlertState({
          type: "success",
          message: `POS MDR Configuration for "${editingMdrConfig.payment_mode}" updated successfully.`
        });
      } else {
        await api.post("/api/v1/pos/admin/mdr-configs", {
          retailer_id: mdrForm.retailer_id || null,
          payment_mode: mdrForm.payment_mode,
          mdr: parsedMdr,
          mdr_type: mdrForm.mdr_type || "PERCENTAGE",
          gst_rate: parsedGst,
          remarks: mdrForm.remarks,
          is_active: mdrForm.is_active
        });
        playSuccessSound();
        setAlertState({
          type: "success",
          message: `Retailer POS MDR configured successfully!`
        });
      }
      setShowMdrModal(false);
      setEditingMdrConfig(null);
      fetchMdrConfigs();
    } catch (err: any) {
      const msg = parseErrorMessage(err);
      setModalError(msg);
      playErrorSound();
      setAlertState({ type: "error", message: `MDR Configuration Failed: ${msg}` });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Auto-Provision Default MDR for a Retailer
  const handleProvisionDefaults = async (retailerId: string, retailerName: string) => {
    try {
      await api.post(`/api/v1/pos/admin/retailers/${retailerId}/provision-defaults`);
      playSuccessSound();
      setAlertState({
        type: "success",
        message: `Default POS MDR (Instant 1.70% & T1 1.60%) auto-provisioned for ${retailerName}.`
      });
      fetchMdrConfigs();
    } catch (e: any) {
      playErrorSound();
      setAlertState({ type: "error", message: `Auto-provisioning failed: ${parseErrorMessage(e)}` });
    }
  };

  // Open Edit MDR Config Modal
  const openEditMdr = (cfg: any) => {
    setEditingMdrConfig(cfg);
    setMdrForm({
      retailer_id: cfg.retailer_id || "",
      payment_mode: cfg.payment_mode,
      mdr: cfg.mdr !== undefined && cfg.mdr !== null ? String(cfg.mdr) : "1.70",
      mdr_type: cfg.mdr_type || "PERCENTAGE",
      gst_rate: cfg.gst_rate !== undefined && cfg.gst_rate !== null ? String(cfg.gst_rate) : "0.00",
      remarks: cfg.remarks || "",
      is_active: cfg.is_active ?? true
    });
    setModalError("");
    setShowMdrModal(true);
  };

  // Global default MDR items
  const defaultMdrConfigs = useMemo(() => {
    return mdrConfigs.filter(c => c.is_default);
  }, [mdrConfigs]);

  // Tab 1: Machines Table Columns
  const machineColumns: TableColumn<any>[] = [
    {
      id: "serial_number",
      header: "Terminal Serial & Model",
      sortable: true,
      cell: (m) => (
        <div>
          <div className="font-mono text-xs font-black text-[#2563EB] flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-[#2563EB]" />
            {m.serial_number}
          </div>
          <span className="text-[11px] text-[#64748B] font-medium">{m.pos_model || "Android POS"}</span>
        </div>
      ),
    },
    {
      id: "mobile_number",
      header: "Machine Mobile / SIM",
      sortable: true,
      cell: (m) => (
        <div className="font-mono text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5 text-[#64748B]" />
          {m.mobile_number || <span className="text-[#94A3B8] font-normal italic">Not Registered</span>}
        </div>
      ),
    },
    {
      id: "vendor_commission",
      header: "POS Vendor & Commission",
      cell: (m) => (
        <div>
          {m.vendor_id || m.vendor_name ? (
            <>
              <span className="font-bold text-xs text-[#0F172A] block">{m.vendor_name || m.vendor_id}</span>
              <span className="inline-block mt-0.5 px-2 py-0.5 bg-[#F1F5F9] text-[#334155] border border-[#CBD5E1] rounded text-[11px] font-mono font-black">
                {m.vendor_commission_value ?? 0}% {m.vendor_commission_type || "PERCENT"}
              </span>
            </>
          ) : (
            <span className="px-2 py-0.5 bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] rounded text-[11px] font-semibold">
              Direct / No Vendor
            </span>
          )}
        </div>
      ),
    },
    {
      id: "mapped_retailer",
      header: "Assigned Retailer Outlet",
      cell: (m) => (
        <div>
          {m.mapped_retailer_id ? (
            <div className="font-sans text-xs">
              <div className="font-bold text-[#0F172A] flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-[#2563EB]" />
                {m.retailer_name || "Retailer Outlet"}
              </div>
              <span className="text-[11px] text-[#64748B] font-mono">
                {m.retailer_code} {m.retailer_mobile ? `• ${m.retailer_mobile}` : ""}
              </span>
            </div>
          ) : (
            <span className="px-2 py-0.5 bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] rounded text-[11px] font-bold">
              Unassigned / In Stock
            </span>
          )}
        </div>
      ),
    },
    {
      id: "status",
      header: "Machine Status",
      sortable: true,
      cell: (m) => {
        const isAct = m.status === "ACTIVE" || m.status === "ASSIGNED";
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black ${
              isAct
                ? "bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]"
                : "bg-[#FEF2F2] text-[#991B1B] border border-[#FCA5A5]"
            }`}
          >
            {isAct ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
            {m.status}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: (m) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openDetailsDrawer(m)}
            className="px-2.5 py-1 text-[11px] font-bold text-[#2563EB] bg-[#EFF6FF] border border-[#BFDBFE] hover:bg-[#DBEAFE] rounded-md transition-all cursor-pointer"
          >
            Details
          </button>
          <button
            onClick={() => openEditMachine(m)}
            className="p-1 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-md transition-colors cursor-pointer"
            title="Edit Machine Spec"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  // Tab 2: MDR Configurations Table Columns
  const mdrColumns: TableColumn<any>[] = [
    {
      id: "retailer",
      header: "Retailer Outlet / Scope",
      sortable: true,
      cell: (c) => (
        <div>
          {c.is_default ? (
            <div className="flex items-center gap-1.5 font-bold text-xs text-[#2563EB]">
              <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
              Global System Default Rate
            </div>
          ) : (
            <div className="font-sans text-xs">
              <div className="font-bold text-[#0F172A] flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-[#2563EB]" />
                {c.retailer_name || "Custom Retailer"}
              </div>
              <span className="text-[11px] text-[#64748B] font-mono">
                {c.retailer_code} {c.retailer_mobile ? `• ${c.retailer_mobile}` : ""}
              </span>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "payment_mode",
      header: "POS Mode",
      sortable: true,
      cell: (c) => (
        <span className="font-bold text-xs text-[#0F172A] bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-1 rounded-md">
          {c.payment_mode}
        </span>
      ),
    },
    {
      id: "mdr_rate",
      header: "Applied MDR (%)",
      sortable: true,
      cell: (c) => (
        <div className="font-mono text-xs">
          <span className="font-black text-[#1E40AF] bg-[#EFF6FF] border border-[#BFDBFE] px-2 py-0.5 rounded text-xs">
            {c.mdr}%
          </span>
          <span className="text-[11px] text-[#64748B] block mt-0.5 font-medium">{c.mdr_type}</span>
        </div>
      ),
    },
    {
      id: "gst_rate",
      header: "GST Rate",
      cell: (c) => (
        <span className="font-mono text-xs font-bold text-[#334155]">
          {Number(c.gst_rate || 0).toFixed(0)}%
        </span>
      ),
    },
    {
      id: "scope_badge",
      header: "Scope Type",
      cell: (c) => (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-black ${
            c.is_default
              ? "bg-[#E0E7FF] text-[#3730A3] border border-[#C7D2FE]"
              : "bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]"
          }`}
        >
          {c.is_default ? "GLOBAL DEFAULT" : "RETAILER OVERRIDE"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Active Status",
      cell: (c) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black ${
            c.is_active
              ? "bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]"
              : "bg-[#FEF2F2] text-[#991B1B] border border-[#FCA5A5]"
          }`}
        >
          {c.is_active ? "ACTIVE" : "INACTIVE"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: (c) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditMdr(c)}
            className="px-2.5 py-1 text-[11px] font-bold text-[#2563EB] bg-[#EFF6FF] border border-[#BFDBFE] hover:bg-[#DBEAFE] rounded-md transition-all cursor-pointer"
          >
            Edit Rate
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight flex items-center gap-3">
            <CreditCard className="w-7 h-7 text-[#2563EB]" /> POS Machines & Retailer Configuration
          </h1>
          <p className="mt-1 text-sm font-medium text-[#64748B]">
            Configure physical POS hardware, vendor commissions, retailer assignments, and retailer-wise POS MDR rates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === "machines" ? (
            <button
              onClick={() => {
                setEditingMachine(null);
                setMachineForm({
                  serial_number: "",
                  mobile_number: "",
                  vendor_id: "",
                  vendor_name: "",
                  vendor_commission_type: "PERCENTAGE",
                  vendor_commission_value: 0.0,
                  pos_model: "Android POS Terminal",
                  machine_type: "ANDROID_POS",
                  os_version: "Android 11",
                  firmware_version: "v2.4.1",
                  sim_iccid: "",
                  telecom_provider: "Airtel M2M",
                  mapped_retailer_id: "",
                  company_id: companies[0]?.public_id || "",
                  status: "ACTIVE"
                });
                setModalError("");
                setShowMachineModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2563EB] text-xs font-extrabold text-white hover:bg-[#1D4ED8] shadow-2xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add POS Machine
            </button>
          ) : activeTab === "mdr" ? (
            <button
              onClick={() => {
                setEditingMdrConfig(null);
                setMdrForm({
                  retailer_id: retailers[0]?.public_id || "",
                  payment_mode: "POS - Instant",
                  mdr: 1.70,
                  mdr_type: "PERCENTAGE",
                  gst_rate: 0.00,
                  remarks: "",
                  is_active: true
                });
                setModalError("");
                setShowMdrModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2563EB] text-xs font-extrabold text-white hover:bg-[#1D4ED8] shadow-2xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Configure Retailer MDR
            </button>
          ) : (
            <button
              onClick={fetchServicesAndModes}
              disabled={loadingServices}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2563EB] text-xs font-extrabold text-white hover:bg-[#1D4ED8] shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loadingServices ? "animate-spin" : ""}`} /> Refresh Service Status
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2">
        <button
          onClick={() => setActiveTab("machines")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === "machines"
              ? "bg-[#2563EB] text-white shadow-xs"
              : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Tab 1 — POS Machines ({totalMachines})
        </button>
        <button
          onClick={() => setActiveTab("mdr")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === "mdr"
              ? "bg-[#2563EB] text-white shadow-xs"
              : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]"
          }`}
        >
          <Scale className="w-4 h-4" />
          Tab 2 — POS MDR Configuration ({totalMdr})
        </button>
        <button
          onClick={() => setActiveTab("services")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === "services"
              ? "bg-[#2563EB] text-white shadow-xs"
              : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]"
          }`}
        >
          <Sliders className="w-4 h-4" />
          Tab 3 — Service & POS Enable/Disable ({servicesList.length + posModesList.length})
        </button>
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
            className="p-1 hover:opacity-75 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* TAB 1: POS MACHINES CONTENT */}
      {activeTab === "machines" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Machines", value: totalMachines, color: "#2563EB", bg: "#EFF6FF", icon: CreditCard },
              { label: "Assigned & Active", value: machines.filter(m => m.mapped_retailer_id && (m.status === "ACTIVE" || m.status === "ASSIGNED")).length, color: "#16A34A", bg: "#DCFCE7", icon: CheckCircle2 },
              { label: "Inventory Stock", value: machines.filter(m => !m.mapped_retailer_id).length, color: "#D97706", bg: "#FEF3C7", icon: Layers },
              { label: "Configured Vendors", value: vendors.length || 7, color: "#9333EA", bg: "#F3E8FF", icon: Building2 },
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

          {/* POS Machines Table */}
          <DataTable
            data={machines}
            columns={machineColumns}
            keyExtractor={(m) => m.public_id}
            loading={loadingMachines}
            totalRecords={totalMachines}
            pageSize={10}
            onRefresh={fetchMachines}
            onAddNew={() => {
              setEditingMachine(null);
              setMachineForm({
                serial_number: "",
                mobile_number: "",
                vendor_id: "",
                vendor_name: "",
                vendor_commission_type: "PERCENTAGE",
                vendor_commission_value: 0.0,
                pos_model: "Android POS Terminal",
                machine_type: "ANDROID_POS",
                os_version: "Android 11",
                firmware_version: "v2.4.1",
                sim_iccid: "",
                telecom_provider: "Airtel M2M",
                mapped_retailer_id: "",
                company_id: companies[0]?.public_id || "",
                status: "ACTIVE"
              });
              setModalError("");
              setShowMachineModal(true);
            }}
            addNewLabel="Add POS Machine"
            searchPlaceholder="Search Serial Number, Mobile, Vendor, Retailer..."
            filterOptions={[
              {
                key: "status",
                label: "Status",
                options: [
                  { label: "All Statuses", value: "ALL" },
                  { label: "Active", value: "ACTIVE" },
                  { label: "Assigned", value: "ASSIGNED" },
                  { label: "Inactive", value: "INACTIVE" },
                  { label: "Blocked", value: "BLOCKED" },
                ],
              },
            ]}
          />
        </div>
      )}

      {/* TAB 2: POS MDR CONFIGURATION CONTENT */}
      {activeTab === "mdr" && (
        <div className="space-y-6">
          {/* POS Settlement Modes Availability Quick Controls (Requirement 2 & 7) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-[#0F172A] flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#2563EB]" />
                  POS Settlement Mode Controls (Independent Enable / Disable)
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Control availability of each settlement mode. Disabled modes are blocked in Retailer Top-Up and rejected by backend.
                </p>
              </div>
              <button
                onClick={fetchServicesAndModes}
                disabled={loadingServices}
                className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-[#334155] transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingServices ? "animate-spin text-[#2563EB]" : ""}`} />
                Refresh Status
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {posModesList.map((mode) => {
                const isActive = mode.is_active;
                const isToggling = togglingPosModeCode === mode.code;
                return (
                  <div
                    key={mode.code}
                    className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                      isActive
                        ? "bg-gradient-to-br from-[#F0FDF4] to-white border-[#BBF7D0] shadow-2xs"
                        : "bg-gradient-to-br from-[#FEF2F2] to-white border-[#FCA5A5] opacity-80"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isActive ? "bg-[#16A34A] animate-pulse" : "bg-[#DC2626]"}`} />
                        <span className="font-mono text-sm font-extrabold text-[#0F172A]">{mode.name}</span>
                      </div>
                      <p className="text-[11px] text-[#64748B] mt-1 font-medium">
                        {mode.code === "POS - Instant"
                          ? "Instant wallet credit (1.70% MDR)"
                          : mode.code === "POS+T1"
                          ? "T+1 day settlement (1.60% MDR)"
                          : "T+2 settlement mode"}
                      </p>
                    </div>

                    <button
                      onClick={() => handleTogglePosMode(mode.code, isActive)}
                      disabled={isToggling}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                        isActive
                          ? "bg-[#16A34A] hover:bg-[#15803D] text-white shadow-2xs"
                          : "bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-2xs"
                      }`}
                    >
                      {isToggling ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : isActive ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                      {isActive ? "ENABLED" : "DISABLED"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Default MDR Rates Highlight Banner */}
          <div className="rounded-2xl border border-[#BFDBFE] bg-gradient-to-r from-[#EFF6FF] to-[#F8FAFC] p-5 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#2563EB] text-white text-[11px] font-black uppercase tracking-wider">
                    System Standard
                  </span>
                  <h3 className="text-base font-extrabold text-[#0F172A]">
                    Global Default POS MDR Configuration
                  </h3>
                </div>
                <p className="text-xs text-[#64748B] font-medium">
                  Applied automatically to all retailers without custom overrides. Auto-provisioned on retailer onboarding approval.
                </p>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-[#E2E8F0] shadow-2xs">
                  <span className="text-xs font-bold text-[#64748B]">POS - Instant:</span>
                  <span className="font-mono text-sm font-black text-[#2563EB]">1.70%</span>
                  <span className="text-[10px] text-[#64748B] font-mono">0% GST</span>
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-[#E2E8F0] shadow-2xs">
                  <span className="text-xs font-bold text-[#64748B]">POS+T1:</span>
                  <span className="font-mono text-sm font-black text-[#16A34A]">1.60%</span>
                  <span className="text-[10px] text-[#64748B] font-mono">0% GST</span>
                </div>
              </div>
            </div>
          </div>

          {/* Retailer-wise MDR Configuration Table */}
          <DataTable
            data={mdrConfigs}
            columns={mdrColumns}
            keyExtractor={(c) => c.id}
            loading={loadingMdr}
            totalRecords={totalMdr}
            pageSize={10}
            onRefresh={fetchMdrConfigs}
            onAddNew={() => {
              setEditingMdrConfig(null);
              setMdrForm({
                retailer_id: retailers[0]?.public_id || "",
                payment_mode: "POS - Instant",
                mdr: 1.70,
                mdr_type: "PERCENTAGE",
                gst_rate: 0.00,
                remarks: "",
                is_active: true
              });
              setModalError("");
              setShowMdrModal(true);
            }}
            addNewLabel="Configure Retailer MDR"
            searchPlaceholder="Search by Store Name, Retailer Code, Owner..."
            filterOptions={[
              {
                key: "scope",
                label: "Scope Filter",
                options: [
                  { label: "All Rates", value: "ALL" },
                  { label: "Retailer Overrides", value: "RETAILER" },
                  { label: "Global Defaults", value: "DEFAULT" },
                ],
              },
            ]}
          />
        </div>
      )}

      {/* TAB 3: PLATFORM SERVICE & POS AVAILABILITY (LIVE DB / SP DRIVEN) */}
      {activeTab === "services" && (
        <div className="space-y-6">
          {/* Card 1: POS Settlement Modes Independent Controls */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#2563EB] text-white text-[11px] font-black uppercase tracking-wider">
                    Requirement 2
                  </span>
                  <h3 className="text-base font-extrabold text-[#0F172A]">
                    POS Top-Up Settlement Mode Controls
                  </h3>
                </div>
                <p className="text-xs text-[#64748B] mt-1">
                  POS Top-Up is governed by independent settlement controls. If an administrator disables POS T+2, it is immediately hidden and prohibited from retailer submission, while Instant and T+1 remain fully operational.
                </p>
              </div>

              <button
                onClick={fetchServicesAndModes}
                disabled={loadingServices}
                className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-[#334155] transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingServices ? "animate-spin text-[#2563EB]" : ""}`} />
                Sync Status from DB
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {posModesList.map((mode) => {
                const isActive = mode.is_active;
                const isToggling = togglingPosModeCode === mode.code;
                return (
                  <div
                    key={mode.code}
                    className={`rounded-2xl border p-5 transition-all flex flex-col justify-between space-y-4 ${
                      isActive
                        ? "bg-gradient-to-br from-[#F0FDF4] to-white border-[#BBF7D0] shadow-sm"
                        : "bg-gradient-to-br from-[#FEF2F2] to-[#FFF5F5] border-[#FCA5A5] shadow-sm"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-base font-extrabold text-[#0F172A]">
                          {mode.name}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                            isActive
                              ? "bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]"
                              : "bg-[#FEF2F2] text-[#991B1B] border border-[#FCA5A5]"
                          }`}
                        >
                          {isActive ? "ENABLED" : "DISABLED"}
                        </span>
                      </div>

                      <p className="text-xs text-[#64748B]">
                        {mode.code === "POS - Instant"
                          ? "Instant wallet credit upon payment receipt approval. Configured Rate: 1.70% MDR (0% GST)."
                          : mode.code === "POS+T1"
                          ? "Next business day settlement (T+1). Configured Rate: 1.60% MDR (0% GST)."
                          : "Second business day settlement (T+2). Independent settlement toggle."}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#64748B]">
                        Retailer Access:
                      </span>
                      <button
                        onClick={() => handleTogglePosMode(mode.code, isActive)}
                        disabled={isToggling}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 ${
                          isActive
                            ? "bg-[#16A34A] hover:bg-[#15803D] text-white"
                            : "bg-[#DC2626] hover:bg-[#B91C1C] text-white"
                        }`}
                      >
                        {isToggling ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : isActive ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <X className="w-3.5 h-3.5" />
                        )}
                        {isActive ? "Click to Disable" : "Click to Enable"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 2: Platform Customer Services Availability */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#6C63FF] text-white text-[11px] font-black uppercase tracking-wider">
                  Requirement 1
                </span>
                <h3 className="text-base font-extrabold text-[#0F172A]">
                  Platform Customer Service Configuration
                </h3>
              </div>
              <p className="text-xs text-[#64748B] mt-1">
                Admin controls whether each platform customer service is available to retailers. State changes execute stored procedure <code>sp_toggle_platform_service</code> directly on the live PostgreSQL ledger.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-black text-[#64748B] uppercase tracking-wider">
                    <th className="py-3 px-4">Service</th>
                    <th className="py-3 px-4">Service Code</th>
                    <th className="py-3 px-4">Service Description</th>
                    <th className="py-3 px-4">Current Status</th>
                    <th className="py-3 px-4 text-right">Admin Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {servicesList.map((svc) => {
                    const isEnabled = svc.is_enabled;
                    const isToggling = togglingServiceCode === svc.code;
                    return (
                      <tr key={svc.code} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-[#0F172A]">
                          <div className="flex items-center gap-2.5">
                            {svc.code === "RECHARGE" ? (
                              <Smartphone className="w-4 h-4 text-[#2563EB]" />
                            ) : svc.code === "DMT" ? (
                              <Send className="w-4 h-4 text-[#16A34A]" />
                            ) : svc.code === "BBPS" ? (
                              <Receipt className="w-4 h-4 text-[#D97706]" />
                            ) : svc.code === "AEPS" ? (
                              <Fingerprint className="w-4 h-4 text-[#9333EA]" />
                            ) : (
                              <CreditCard className="w-4 h-4 text-[#2563EB]" />
                            )}
                            <span>{svc.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[#334155] font-bold text-[11px]">
                            {svc.code}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[#64748B]">
                          {svc.code === "RECHARGE"
                            ? "Prepaid & postpaid mobile recharge across all telecom operators"
                            : svc.code === "DMT"
                            ? "Domestic Money Transfer (Instant IMPS / NEFT 24x7)"
                            : svc.code === "BBPS"
                            ? "Bharat Bill Payment System (Electricity, Water, Gas, Fastag)"
                            : svc.code === "AEPS"
                            ? "Aadhaar Enabled Payment System (Cash withdrawal & inquiry)"
                            : "POS Card swipe settlement top-up working capital"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase ${
                              isEnabled
                                ? "bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]"
                                : "bg-[#FEF2F2] text-[#991B1B] border border-[#FCA5A5]"
                            }`}
                          >
                            {isEnabled ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <X className="w-3 h-3" />
                            )}
                            {isEnabled ? "ENABLED" : "DISABLED"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleToggleService(svc.code, isEnabled)}
                            disabled={isToggling}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50 ${
                              isEnabled
                                ? "bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5] hover:bg-[#FEE2E2]"
                                : "bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0] hover:bg-[#DCFCE7]"
                            }`}
                          >
                            {isToggling ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : isEnabled ? (
                              <Power className="w-3.5 h-3.5" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            {isEnabled ? "Disable Service" : "Enable Service"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT POS MACHINE */}
      {showMachineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-2xl space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-3">
              <h3 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#2563EB]" />
                {editingMachine ? "Edit POS Machine Specification" : "Deploy & Assign POS Machine"}
              </h3>
              <button
                type="button"
                onClick={() => setShowMachineModal(false)}
                className="text-[#64748B] hover:text-[#0F172A] p-1 rounded-lg hover:bg-[#F1F5F9] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-[#991B1B] text-xs font-bold flex items-start gap-2.5 shadow-2xs">
                <AlertTriangle className="h-4 w-4 text-[#DC2626] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-extrabold block">Validation Error:</span>
                  <span className="font-medium">{modalError}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveMachine} className="space-y-4 text-xs">
              {/* Retailer Outlet Mapping */}
              <div>
                <label className="font-bold text-[#374151] block mb-1">
                  Assign Retailer Outlet <span className="text-[#64748B] font-normal">(Optional, leave empty for Inventory Stock)</span>
                </label>
                <SearchableRetailerSelect
                  retailers={retailers}
                  value={machineForm.mapped_retailer_id}
                  onChange={(val) => setMachineForm({ ...machineForm, mapped_retailer_id: val })}
                  allowClear={true}
                  placeholder="Select Retailer Outlet or leave unassigned..."
                />
              </div>

              {/* Serial Number & Mobile */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-[#374151] block mb-1">POS Serial Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SN10001"
                    value={machineForm.serial_number}
                    onChange={(e) => setMachineForm({ ...machineForm, serial_number: e.target.value.toUpperCase() })}
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 font-mono text-[#111827] focus:border-[#2563EB] focus:outline-none font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#374151] block mb-1">Machine Mobile Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={machineForm.mobile_number}
                    onChange={(e) => setMachineForm({ ...machineForm, mobile_number: e.target.value })}
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 font-mono text-[#111827] focus:border-[#2563EB] focus:outline-none font-bold"
                  />
                </div>
              </div>

              {/* Vendor & Vendor Commission */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-[#374151] block mb-1">
                    POS Vendor <span className="text-[#64748B] font-normal">(Optional)</span>
                  </label>
                  <select
                    value={machineForm.vendor_id}
                    onChange={(e) => {
                      const selVal = e.target.value;
                      if (!selVal) {
                        setMachineForm({
                          ...machineForm,
                          vendor_id: "",
                          vendor_name: "",
                          vendor_commission_value: 0.0
                        });
                      } else {
                        const v = vendors.find(x => x.vendor_code === selVal);
                        setMachineForm({
                          ...machineForm,
                          vendor_id: selVal,
                          vendor_name: v?.vendor_name || selVal,
                          vendor_commission_value: v?.default_commission_value ?? 0.50
                        });
                      }
                    }}
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 text-[#111827] font-bold cursor-pointer"
                  >
                    <option value="">-- No Vendor / Direct Terminal (Optional) --</option>
                    {vendors.map((v) => (
                      <option key={v.vendor_code} value={v.vendor_code}>
                        {v.vendor_name} ({v.default_commission_value}%)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#374151] block mb-1">
                    Vendor Commission (%) <span className="text-[#64748B] font-normal">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    disabled={!machineForm.vendor_id}
                    value={machineForm.vendor_commission_value}
                    onChange={(e) => setMachineForm({ ...machineForm, vendor_commission_value: parseFloat(e.target.value) || 0 })}
                    placeholder={machineForm.vendor_id ? "0.50" : "0.00 (No Vendor)"}
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 font-mono text-[#111827] focus:border-[#2563EB] focus:outline-none font-bold disabled:bg-[#F1F5F9] disabled:text-[#94A3B8]"
                  />
                </div>
              </div>

              {/* Hardware Model & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-[#374151] block mb-1">POS Hardware Model</label>
                  <select
                    value={machineForm.pos_model}
                    onChange={(e) => setMachineForm({ ...machineForm, pos_model: e.target.value })}
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 text-[#111827] font-bold cursor-pointer"
                  >
                    <option value="Android POS Terminal">Android POS Terminal (Pax A920)</option>
                    <option value="Verifone V200c Countertop">Verifone V200c Countertop</option>
                    <option value="Ingenico Move/5000">Ingenico Move/5000 Wireless</option>
                    <option value="Pay2Pay Smart EDC">Pay2Pay Smart EDC</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#374151] block mb-1">Machine Status</label>
                  <select
                    value={machineForm.status}
                    onChange={(e) => setMachineForm({ ...machineForm, status: e.target.value })}
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 text-[#111827] font-bold cursor-pointer"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="ASSIGNED">ASSIGNED</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="BLOCKED">BLOCKED</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-[#E5E7EB] pt-4">
                <button
                  type="button"
                  onClick={() => setShowMachineModal(false)}
                  className="rounded-lg border border-[#D1D5DB] bg-white px-4 py-2 text-xs font-extrabold text-[#374151] hover:bg-[#F8FAFC] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[#2563EB] px-5 py-2 text-xs font-extrabold text-white hover:bg-[#1D4ED8] transition-all shadow-2xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editingMachine ? "Update Machine Spec" : "Deploy POS Machine"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIGURE RETAILER POS MDR */}
      {showMdrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-2xl space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-3">
              <h3 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                <Scale className="w-5 h-5 text-[#2563EB]" />
                {editingMdrConfig ? `Edit POS MDR Rate (${editingMdrConfig.payment_mode})` : "Configure Retailer POS MDR"}
              </h3>
              <button
                type="button"
                onClick={() => setShowMdrModal(false)}
                className="text-[#64748B] hover:text-[#0F172A] p-1 rounded-lg hover:bg-[#F1F5F9] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-[#991B1B] text-xs font-bold flex items-start gap-2.5 shadow-2xs">
                <AlertTriangle className="h-4 w-4 text-[#DC2626] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-extrabold block">Error:</span>
                  <span className="font-medium">{modalError}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveMdr} className="space-y-4 text-xs">
              {!editingMdrConfig && (
                <div>
                  <label className="font-bold text-[#374151] block mb-1">Target Retailer Outlet *</label>
                  <SearchableRetailerSelect
                    retailers={retailers}
                    value={mdrForm.retailer_id}
                    onChange={(val) => setMdrForm({ ...mdrForm, retailer_id: val })}
                    placeholder="Select retailer to override MDR..."
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-[#374151] block mb-1">POS Payment Mode *</label>
                  <select
                    value={mdrForm.payment_mode}
                    disabled={Boolean(editingMdrConfig)}
                    onChange={(e) => {
                      const mode = e.target.value;
                      const defVal = mode === "POS - Instant" ? 1.70 : 1.60;
                      setMdrForm({ ...mdrForm, payment_mode: mode, mdr: defVal });
                    }}
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 text-[#111827] font-bold cursor-pointer disabled:bg-[#F1F5F9]"
                  >
                    <option value="POS - Instant">POS - Instant (Default: 1.70%)</option>
                    <option value="POS+T1">POS+T1 (Default: 1.60%)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#374151] block mb-1">MDR Rate Percentage (%) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={mdrForm.mdr}
                    onChange={(e) => setMdrForm({ ...mdrForm, mdr: e.target.value })}
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 font-mono text-[#111827] focus:border-[#2563EB] focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-[#374151] block mb-1">GST Rate Percentage (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={mdrForm.gst_rate}
                    onChange={(e) => setMdrForm({ ...mdrForm, gst_rate: e.target.value })}
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 font-mono text-[#111827] focus:border-[#2563EB] focus:outline-none font-bold"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#374151] block mb-1">Active Status</label>
                  <select
                    value={mdrForm.is_active ? "true" : "false"}
                    onChange={(e) => setMdrForm({ ...mdrForm, is_active: e.target.value === "true" })}
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 text-[#111827] font-bold cursor-pointer"
                  >
                    <option value="true">ACTIVE</option>
                    <option value="false">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#374151] block mb-1">Remarks / Justification</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Special high volume merchant discount"
                  value={mdrForm.remarks}
                  onChange={(e) => setMdrForm({ ...mdrForm, remarks: e.target.value })}
                  className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 text-[#111827] focus:border-[#2563EB] focus:outline-none font-medium"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-[#E5E7EB] pt-4">
                <button
                  type="button"
                  onClick={() => setShowMdrModal(false)}
                  className="rounded-lg border border-[#D1D5DB] bg-white px-4 py-2 text-xs font-extrabold text-[#374151] hover:bg-[#F8FAFC] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[#2563EB] px-5 py-2 text-xs font-extrabold text-white hover:bg-[#1D4ED8] transition-all shadow-2xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editingMdrConfig ? "Save MDR Changes" : "Apply Custom MDR"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILS DRAWER (Slide-Over) */}
      {showDetailsDrawer && selectedMachineDetails && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#2563EB]">
                    Terminal Specification & Timeline
                  </span>
                  <h2 className="text-xl font-extrabold text-[#0F172A] flex items-center gap-2 mt-0.5">
                    <Cpu className="w-6 h-6 text-[#2563EB]" />
                    {selectedMachineDetails.machine.serial_number}
                  </h2>
                </div>
                <button
                  onClick={() => setShowDetailsDrawer(false)}
                  className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status & Assignment Banner */}
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#64748B]">Terminal Status:</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-black ${
                      selectedMachineDetails.machine.status === "ACTIVE" || selectedMachineDetails.machine.status === "ASSIGNED"
                        ? "bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]"
                        : "bg-[#FEF2F2] text-[#991B1B] border border-[#FCA5A5]"
                    }`}
                  >
                    {selectedMachineDetails.machine.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#64748B]">Assigned Retailer:</span>
                  <span className="text-xs font-bold text-[#0F172A]">
                    {selectedMachineDetails.machine.retailer_name || "Unassigned"}
                  </span>
                </div>
                {selectedMachineDetails.machine.assigned_at && (
                  <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                    <span>Assignment Date:</span>
                    <span className="font-mono">
                      {new Date(selectedMachineDetails.machine.assigned_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Hardware Spec Grid */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-[#0F172A] tracking-wider">
                  Hardware & Network Telemetry
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                    <span className="text-[11px] text-[#64748B] block font-medium">POS Mobile Number</span>
                    <span className="font-mono font-bold text-[#0F172A]">
                      {selectedMachineDetails.machine.mobile_number || "None"}
                    </span>
                  </div>
                  <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                    <span className="text-[11px] text-[#64748B] block font-medium">POS Vendor</span>
                    <span className="font-bold text-[#0F172A]">
                      {selectedMachineDetails.machine.vendor_name || (selectedMachineDetails.machine.vendor_id ? selectedMachineDetails.machine.vendor_id : "None (Direct)")}
                    </span>
                  </div>
                  <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                    <span className="text-[11px] text-[#64748B] block font-medium">Vendor Commission</span>
                    <span className="font-mono font-bold text-[#2563EB]">
                      {selectedMachineDetails.machine.vendor_id ? `${selectedMachineDetails.machine.vendor_commission_value ?? 0}%` : "0.00% (N/A)"}
                    </span>
                  </div>
                  <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                    <span className="text-[11px] text-[#64748B] block font-medium">Hardware Model</span>
                    <span className="font-bold text-[#0F172A]">
                      {selectedMachineDetails.machine.pos_model}
                    </span>
                  </div>
                  <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                    <span className="text-[11px] text-[#64748B] block font-medium">Terminal ID (TID)</span>
                    <span className="font-mono font-bold text-[#0F172A]">
                      {selectedMachineDetails.machine.tid}
                    </span>
                  </div>
                  <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                    <span className="text-[11px] text-[#64748B] block font-medium">Merchant ID (MID)</span>
                    <span className="font-mono font-bold text-[#0F172A]">
                      {selectedMachineDetails.machine.mid}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status History Timeline */}
              {selectedMachineDetails.status_history?.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase text-[#0F172A] tracking-wider">
                    Deployment History Timeline
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedMachineDetails.status_history.map((h: any, i: number) => (
                      <div key={i} className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-xs">
                        <div className="flex items-center justify-between font-bold text-[#0F172A]">
                          <span>Status Changed: {h.previous || "INITIAL"} → {h.new}</span>
                          <span className="text-[10px] text-[#64748B] font-mono">
                            {h.date ? new Date(h.date).toLocaleDateString() : ""}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#64748B] mt-0.5">{h.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions in Drawer */}
            <div className="pt-4 border-t border-[#E2E8F0] flex gap-3">
              <button
                onClick={() => {
                  setShowDetailsDrawer(false);
                  openEditMachine(selectedMachineDetails.machine);
                }}
                className="flex-1 py-2.5 bg-[#2563EB] text-white text-xs font-extrabold rounded-lg hover:bg-[#1D4ED8] transition-all cursor-pointer text-center"
              >
                Edit Specification
              </button>
              <button
                onClick={() => handleToggleStatus(selectedMachineDetails.machine.public_id, selectedMachineDetails.machine.status)}
                className="flex-1 py-2.5 bg-[#F1F5F9] text-[#334155] border border-[#CBD5E1] text-xs font-extrabold rounded-lg hover:bg-[#E2E8F0] transition-all cursor-pointer text-center"
              >
                {selectedMachineDetails.machine.status === "ACTIVE" || selectedMachineDetails.machine.status === "ASSIGNED" ? "Deactivate Machine" : "Activate Machine"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
