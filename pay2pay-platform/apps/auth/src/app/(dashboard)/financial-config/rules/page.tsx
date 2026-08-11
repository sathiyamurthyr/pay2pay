"use client";

import React, { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DataTable, type TableColumn } from "@/components/ui/data-table";
import {
  Sliders,
  Plus,
  RefreshCw,
  Percent,
  Receipt,
  FileText,
  Layers,
  X,
  AlertCircle,
  CheckCircle2,
  Store,
  Building2,
  Zap,
  Info,
  LayoutGrid,
  List,
  CreditCard,
  Send,
  Landmark,
} from "lucide-react";

const SERVICE_TYPE_OPTIONS = [
  { value: "ALL", label: "🌐 All Platform Services", badgeBg: "#EFF6FF", badgeText: "#2563EB" },
  { value: "POS_SWIPE", label: "💳 POS Card Swipe Settlement", badgeBg: "#DCFCE7", badgeText: "#15803D" },
  { value: "UPI", label: "📱 UPI & QR Payments", badgeBg: "#F3E8FF", badgeText: "#7C3AED" },
  { value: "DMT", label: "💸 DMT Money Transfer", badgeBg: "#FEF3C7", badgeText: "#B45309" },
  { value: "AEPS", label: "🏧 AEPS Cash Withdrawal", badgeBg: "#E0F2FE", badgeText: "#0369A1" },
  { value: "BBPS", label: "🧾 BBPS Utility Bill Pay", badgeBg: "#DCFCE7", badgeText: "#047857" },
  { value: "RECHARGE", label: "⚡ Mobile & DTH Recharge", badgeBg: "#FFEDD5", badgeText: "#C2410C" },
  { value: "PAYOUT", label: "🔄 P2P Vendor Payouts", badgeBg: "#EEF2FF", badgeText: "#4338CA" },
];

export default function FinancialRulesPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("MDR");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Base Form Fields
  const [configCode, setConfigCode] = useState("");
  const [configName, setConfigName] = useState("");
  const [serviceType, setServiceType] = useState("ALL");
  const [filterService, setFilterService] = useState("ALL");
  const [hierarchyLevel, setHierarchyLevel] = useState("COMPANY");
  const [targetRetailerId, setTargetRetailerId] = useState("");
  const [priority, setPriority] = useState(5);

  // Sub-DTO Form Fields
  const [mdrPct, setMdrPct] = useState(1.5);
  const [gstCode, setGstCode] = useState("GST18");
  const [cgstPct, setCgstPct] = useState(9.0);
  const [sgstPct, setSgstPct] = useState(9.0);
  const [igstPct, setIgstPct] = useState(18.0);
  const [hsnCode, setHsnCode] = useState("998599");

  const [tdsSection, setTdsSection] = useState("194O");
  const [tdsPct, setTdsPct] = useState(1.0);
  const [thresholdAmount, setThresholdAmount] = useState(500000);

  const [rmCommPct, setRmCommPct] = useState(2.0);
  const [sdCommPct, setSdCommPct] = useState(5.0);
  const [distCommPct, setDistCommPct] = useState(10.0);
  const [retCommPct, setRetCommPct] = useState(83.0);

  const [settlementMode, setSettlementMode] = useState("AUTO");
  const [settlementCycle, setSettlementCycle] = useState("T_1");
  const [cutOffTime, setCutOffTime] = useState("18:00");
  const [retryCount, setRetryCount] = useState(3);

  // Rule Resolution Simulator State
  const [simRetailerId, setSimRetailerId] = useState("");
  const [simResult, setSimResult] = useState<any>(null);
  const [simLoading, setSimLoading] = useState(false);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/financial-config", {
        params: { config_type: activeTab }
      });
      setConfigs(res.data || []);
    } catch (err) {
      console.error("Failed to fetch configurations", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRetailers = async () => {
    try {
      const res = await api.get("/api/v1/retailers");
      setRetailers(res.data.items || []);
    } catch (err) {
      console.error("Failed to fetch retailers", err);
    }
  };

  useEffect(() => {
    fetchConfigs();
    fetchRetailers();
  }, [activeTab]);

  const resetForm = () => {
    setConfigCode("");
    setConfigName("");
    setHierarchyLevel("COMPANY");
    setTargetRetailerId("");
    setPriority(5);
    setMdrPct(1.5);
    setGstCode("GST18");
    setCgstPct(9.0);
    setSgstPct(9.0);
    setIgstPct(18.0);
    setHsnCode("998599");
    setTdsSection("194O");
    setTdsPct(1.0);
    setThresholdAmount(500000);
    setRmCommPct(2.0);
    setSdCommPct(5.0);
    setDistCommPct(10.0);
    setRetCommPct(83.0);
    setSettlementMode("AUTO");
    setSettlementCycle("T_1");
    setCutOffTime("18:00");
    setRetryCount(3);
  };

  const retailerOptions = useMemo(() => {
    return retailers.map((r) => ({
      value: r.public_id,
      label: `${r.store_name} (${r.retailer_code})`,
      subtext: `Owner: ${r.owner_name} | Code: ${r.retailer_code}`,
    }));
  }, [retailers]);

  const simRetailerOptions = useMemo(() => {
    return [
      {
        value: "",
        label: "(All Unmapped Retailers — Default Fallback Rule)",
        subtext: "Applies Company / Platform Default MDR & Commissions",
      },
      ...retailerOptions,
    ];
  }, [retailerOptions]);

  const handleSimulateResolve = async () => {
    try {
      setSimLoading(true);
      const res = await api.get("/api/v1/financial-config/resolve/effective", {
        params: { config_type: activeTab, retailer_id: simRetailerId || undefined }
      });
      setSimResult(res.data);
    } catch (err) {
      console.error("Simulation error", err);
    } finally {
      setSimLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setSubmitting(true);

    const calcPriority =
      hierarchyLevel === "RETAILER" ? 2 :
      hierarchyLevel === "DISTRIBUTOR" ? 3 :
      hierarchyLevel === "SUPER_DISTRIBUTOR" ? 4 :
      hierarchyLevel === "COMPANY" ? 6 : 7;

    const selectedRetailerObj = retailers.find(r => r.public_id === targetRetailerId);

    const payload: any = {
      config_code: configCode,
      config_type: activeTab,
      service_type: serviceType,
      config_name: hierarchyLevel === "RETAILER" && selectedRetailerObj
        ? `${configName} (${selectedRetailerObj.store_name})`
        : configName,
      hierarchy_level: hierarchyLevel,
      priority: calcPriority,
      version: "1.0",
      remarks: hierarchyLevel === "RETAILER" && selectedRetailerObj
        ? `Retailer Custom Override for ${selectedRetailerObj.store_name} (${selectedRetailerObj.retailer_code})`
        : `Default ${activeTab} Rule for ${hierarchyLevel}`
    };

    if (activeTab === "MDR") {
      payload.mdr = {
        level: hierarchyLevel,
        percentage: mdrPct,
        fixed_charge: 0.0,
        minimum_charge: 0.0,
        maximum_charge: 500.0,
        gst_applicable: true,
        priority: calcPriority
      };
    } else if (activeTab === "GST") {
      payload.gst = {
        gst_code: gstCode,
        cgst_pct: cgstPct,
        sgst_pct: sgstPct,
        igst_pct: igstPct,
        cess_pct: 0.0,
        hsn_code: hsnCode
      };
    } else if (activeTab === "TDS") {
      payload.tds = {
        tds_section: tdsSection,
        tds_percentage: tdsPct,
        threshold_amount: thresholdAmount,
        pan_required: true
      };
    } else if (activeTab === "COMMISSION") {
      payload.commission = {
        hierarchy_level: hierarchyLevel,
        rm_commission_pct: rmCommPct,
        super_distributor_commission_pct: sdCommPct,
        distributor_commission_pct: distCommPct,
        retailer_commission_pct: retCommPct,
        fixed_amount: 0.0
      };
    } else if (activeTab === "SETTLEMENT") {
      payload.settlement = {
        settlement_mode: settlementMode,
        settlement_cycle: settlementCycle,
        cut_off_time: cutOffTime,
        retry_count: retryCount,
        holiday_handling: "NEXT_WORKING_DAY",
        auto_settlement_enabled: true
      };
    }

    try {
      await api.post("/api/v1/financial-config", payload);

      setSuccessMsg(`Financial rule "${configCode}" created successfully!`);
      setShowModal(false);
      resetForm();
      fetchConfigs();
    } catch (err: any) {
      console.error("Rule creation error:", err);
      const detail = err.response?.data?.detail || err.response?.data?.message || err.message || "Rule creation failed";
      setErrorMsg(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (configId: string, newStatus: string) => {
    if (newStatus === "DELETE") {
      if (!confirm("Are you sure you want to delete this financial rule?")) return;
      setConfigs(prev => prev.filter(c => c.public_id !== configId));
      try {
        await api.delete(`/financial-config/${configId}`);
        setSuccessMsg("Financial rule deleted successfully");
        fetchConfigs();
      } catch (err: any) {
        alert(err.response?.data?.detail || "Delete failed");
        fetchConfigs();
      }
      return;
    }

    setConfigs(prev => prev.map(c => c.public_id === configId ? { ...c, approval_status: newStatus } : c));

    try {
      await api.patch(`/financial-config/${configId}/status`, null, {
        params: { status: newStatus }
      });
      setSuccessMsg(`Financial rule status updated to ${newStatus}`);
      fetchConfigs();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Status update failed");
      fetchConfigs();
    }
  };

  const tabs = [
    { id: "MDR", label: "MDR Rules", icon: Percent },
    { id: "GST", label: "GST Tax Code", icon: Receipt },
    { id: "TDS", label: "TDS Section 194O", icon: FileText },
    { id: "COMMISSION", label: "Commission Hierarchy", icon: Layers },
    { id: "SETTLEMENT", label: "Settlement Cycle", icon: Sliders },
  ];

  const columns: TableColumn<any>[] = [
    {
      id: "config_code",
      header: "CONFIG CODE",
      accessorKey: "config_code",
      sortable: true,
      cell: (c) => (
        <span className="font-mono font-extrabold text-[#2563EB]">{c.config_code}</span>
      ),
    },
    {
      id: "config_name",
      header: "RULE NAME",
      accessorKey: "config_name",
      sortable: true,
      cell: (c) => (
        <span className="font-bold text-[#0F172A]">{c.config_name}</span>
      ),
    },
    {
      id: "service_type",
      header: "SERVICE TYPE",
      accessorKey: "service_type",
      sortable: true,
      cell: (c) => {
        const svcVal = c.service_type || "ALL";
        const meta = SERVICE_TYPE_OPTIONS.find((s) => s.value === svcVal) || SERVICE_TYPE_OPTIONS[0];
        return (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-extrabold border"
            style={{ background: meta.badgeBg, color: meta.badgeText, borderColor: meta.badgeText + "40" }}
          >
            {meta.label}
          </span>
        );
      },
    },
    {
      id: "hierarchy_level",
      header: "HIERARCHY TARGET",
      accessorKey: "hierarchy_level",
      sortable: true,
      cell: (c) => {
        const isRetailerRule = c.hierarchy_level === "RETAILER";
        return isRetailerRule ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] font-bold">
            <Store className="w-3.5 h-3.5 text-[#2563EB]" /> Retailer Outlet Specific
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F8FAFC] text-[#475569] border border-[#E2E8F0] font-bold">
            <Building2 className="w-3.5 h-3.5 text-[#64748B]" /> {c.hierarchy_level} (Default Fallback)
          </span>
        );
      },
    },
    {
      id: "priority",
      header: "PRIORITY",
      accessorKey: "priority",
      sortable: true,
      cell: (c) => (
        <span className="font-mono font-bold text-[#D97706]">Priority #{c.priority}</span>
      ),
    },
    {
      id: "version",
      header: "VERSION",
      accessorKey: "version",
      sortable: true,
      cell: (c) => (
        <span className="font-mono text-[#64748B]">v{c.version || "1.0"}</span>
      ),
    },
    {
      id: "status",
      header: "STATUS & ACTIONS",
      cell: (c) => {
        const currentStatus = (c.approval_status || "APPROVED").toUpperCase();
        return (
          <select
            value={currentStatus === "APPROVED" || currentStatus === "ACTIVE" ? "APPROVED" : currentStatus}
            onChange={(e) => handleStatusChange(c.public_id, e.target.value)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-extrabold transition-all cursor-pointer focus:outline-none ${
              currentStatus === "APPROVED" || currentStatus === "ACTIVE"
                ? "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]"
                : currentStatus === "INACTIVE"
                ? "bg-[#FEF2F2] text-[#991B1B] border-[#FCA5A5]"
                : "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]"
            }`}
          >
            <option value="APPROVED">🟢 Active (Approved)</option>
            <option value="INACTIVE">🔴 Inactive</option>
            <option value="DELETE">🗑️ Delete Rule</option>
          </select>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] flex items-center gap-3">
            <Sliders className="h-7 w-7 text-[#2563EB]" />
            Financial Rule Configurations &amp; Retailer Setup
          </h1>
          <p className="mt-1 text-sm font-medium text-[#64748B]">
            Configure Retailer-specific MDR fees, GST codes, TDS sections &amp; Commission splits with automatic Default fallback
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Grid vs Table View Switcher */}
          <div className="flex items-center rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-1 shadow-2xs">
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-extrabold transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-white text-[#2563EB] shadow-2xs"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              <List className="h-4 w-4" />
              Table View
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-extrabold transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-white text-[#2563EB] shadow-2xs"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Grid View
            </button>
          </div>

          <button
            onClick={() => {
              setErrorMsg("");
              setShowModal(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-extrabold text-white shadow-2xs hover:bg-[#1D4ED8] transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Create Financial Rule
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-4 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-start gap-3 text-xs">
        <Info className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-extrabold text-[#1E40AF]">
            💡 Smart Rule Resolution Hierarchy (Retailer Override vs. Default Fallback)
          </p>
          <p className="text-[#3B82F6] font-medium leading-relaxed">
            If a Retailer Outlet is assigned a custom <strong>Retailer Rule</strong>, that rule takes top priority. If a Retailer is <strong>NOT mapped</strong> to any custom rule, the platform automatically applies the <strong>Company / Platform Default MDR, GST, and Commission</strong> rule.
          </p>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-between text-xs font-bold text-[#166534]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="text-[#166534] hover:text-[#14532D]">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tabs Row */}
      <div className="flex border-b border-[#E2E8F0] gap-2 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-extrabold transition-all border-b-2 cursor-pointer ${
                isActive
                  ? "border-[#2563EB] text-[#2563EB] bg-[#EFF6FF]"
                  : "border-transparent text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Rule Resolution Simulator Tool */}
      <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#0F172A]">
            <Zap className="w-4 h-4 text-[#D97706]" /> Test Effective Rule Resolution for Retailer
          </div>
          <span className="text-[11px] font-bold text-[#64748B]">Search Retailers &amp; Test Resolution</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full">
            <SearchableSelect
              options={simRetailerOptions}
              value={simRetailerId}
              onChange={(val) => setSimRetailerId(val)}
              placeholder="🔍 Search Retailer by Store Name, Code or Owner..."
              searchPlaceholder="Type retailer code or name to search..."
            />
          </div>

          <button
            onClick={handleSimulateResolve}
            disabled={simLoading}
            className="px-5 py-3 rounded-xl bg-[#0F172A] text-white text-xs font-extrabold hover:bg-[#1E293B] cursor-pointer flex items-center gap-2 shrink-0 shadow-2xs"
          >
            {simLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            Resolve Effective {activeTab} Rule
          </button>
        </div>

        {simResult && (
          <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-xs font-bold text-[#166534] flex items-center justify-between">
            <div>
              Effective Resolved Rule: <span className="font-mono text-[#2563EB] font-extrabold">{simResult.config_code}</span> ({simResult.config_name})
            </div>
            <div className="px-2.5 py-1 rounded-full bg-white border border-[#BBF7D0] font-mono text-[11px] text-[#15803D]">
              Hierarchy Level: {simResult.hierarchy_level} (Priority #{simResult.priority})
            </div>
          </div>
        )}
      </div>

      {/* Main Display: Table View vs Grid View */}
      {viewMode === "grid" ? (
        /* GRID VIEW CARDS DESIGN WITH SECTION HEADER */
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-extrabold text-[#0F172A]">Financial Rule Cards</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-extrabold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                {configs.length} Cards
              </span>
            </div>
            <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider">
              Grid View Layout
            </span>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {configs.map((c) => {
              const isRetailerRule = c.hierarchy_level === "RETAILER";
              const currentStatus = (c.approval_status || "APPROVED").toUpperCase();

              return (
                <div
                  key={c.public_id}
                  className="group relative rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-2xs hover:shadow-md hover:border-[#BFDBFE] transition-all duration-200"
                >
                  {/* Grid Card Header */}
                  <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                        <Sliders className="h-5 w-5 text-[#2563EB]" />
                      </div>
                      <div>
                        <span className="font-mono text-xs font-extrabold text-[#2563EB] tracking-wide block">
                          {c.config_code}
                        </span>
                        <span className="font-bold text-xs text-[#0F172A] truncate max-w-[140px] block">
                          {c.config_name}
                        </span>
                      </div>
                    </div>

                    <select
                      value={currentStatus === "APPROVED" || currentStatus === "ACTIVE" ? "APPROVED" : currentStatus}
                      onChange={(e) => handleStatusChange(c.public_id, e.target.value)}
                      className={`rounded-xl border px-2.5 py-1 text-[11px] font-extrabold transition-all cursor-pointer focus:outline-none ${
                        currentStatus === "APPROVED" || currentStatus === "ACTIVE"
                          ? "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]"
                          : currentStatus === "INACTIVE"
                          ? "bg-[#FEF2F2] text-[#991B1B] border-[#FCA5A5]"
                          : "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]"
                      }`}
                    >
                      <option value="APPROVED">🟢 Active</option>
                      <option value="INACTIVE">🔴 Inactive</option>
                      <option value="DELETE">🗑️ Delete</option>
                    </select>
                  </div>

                  {/* Grid Card Details */}
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E2E8F0]">
                      <span className="text-[#64748B] font-bold">Scope / Target:</span>
                      {isRetailerRule ? (
                        <span className="inline-flex items-center gap-1 text-[#1E40AF] font-bold">
                          <Store className="w-3.5 h-3.5 text-[#2563EB]" /> Retailer Specific
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#475569] font-bold">
                          <Building2 className="w-3.5 h-3.5 text-[#64748B]" /> {c.hierarchy_level} (Default)
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 font-mono">
                      <div className="p-2 rounded-xl bg-[#FFFBEB] border border-[#FDE68A]">
                        <span className="text-[10px] text-[#B45309] font-sans font-extrabold block uppercase">Priority Level</span>
                        <span className="font-extrabold text-[#D97706]">Priority #{c.priority}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                        <span className="text-[10px] text-[#64748B] font-sans font-extrabold block uppercase">Version</span>
                        <span className="font-bold text-[#0F172A]">v{c.version || "1.0"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* DATATABLE COMPONENT WITH RICH HEADER TOOLBAR (Search, Filter, Density, Columns, Export, Refresh, Auto-Refresh, Fullscreen, Action Button, Counter Badge) */
        <DataTable
          data={configs}
          columns={columns}
          keyExtractor={(c) => c.public_id || c.config_code}
          loading={loading}
          totalRecords={configs.length}
          onRefresh={fetchConfigs}
          onAddNew={() => {
            setErrorMsg("");
            setShowModal(true);
          }}
          addNewLabel="Create Financial Rule"
          searchPlaceholder={`Search ${activeTab} rules by code, name, hierarchy...`}
          filterOptions={[
            {
              key: "service_type",
              label: "Service Category",
              options: SERVICE_TYPE_OPTIONS.map((s) => ({
                label: s.label,
                value: s.value,
              })),
            },
            {
              key: "hierarchy_level",
              label: "Hierarchy Target Scope",
              options: [
                { label: "RETAILER (Specific Override)", value: "RETAILER" },
                { label: "DISTRIBUTOR (Override)", value: "DISTRIBUTOR" },
                { label: "SUPER DISTRIBUTOR (Override)", value: "SUPER_DISTRIBUTOR" },
                { label: "COMPANY (Default Fallback)", value: "COMPANY" },
                { label: "PLATFORM (Default Fallback)", value: "PLATFORM" },
              ],
            },
            {
              key: "approval_status",
              label: "Approval Status",
              options: [
                { label: "ACTIVE / APPROVED", value: "APPROVED" },
                { label: "INACTIVE", value: "INACTIVE" },
              ],
            },
          ]}
        />
      )}

      {/* Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <h2 className="text-lg font-bold text-[#111827] flex items-center gap-2">
                <Sliders className="h-5 w-5 text-[#2563EB]" />
                Create {activeTab} Financial Rule
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] text-xs font-bold text-[#991B1B] flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-[#DC2626] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-extrabold">Failed to Save Financial Rule</p>
                  <p className="font-mono text-[11px] mt-0.5 font-normal">{errorMsg}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-[#374151] block mb-1">Config Code *</label>
                  <input
                    type="text"
                    required
                    placeholder={activeTab === "MDR" ? "mdr-001" : activeTab === "GST" ? "gst-18" : activeTab === "TDS" ? "tds-194o" : activeTab === "COMMISSION" ? "comm-dist" : "settle-t1"}
                    value={configCode}
                    onChange={(e) => setConfigCode(e.target.value)}
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 font-mono text-[#111827] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none font-bold transition-all"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#374151] block mb-1">Rule Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Standard Rule Name"
                    value={configName}
                    onChange={(e) => setConfigName(e.target.value)}
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 text-[#111827] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none font-bold transition-all"
                  />
                </div>
              </div>

              {/* Target Service Type Selection */}
              <div>
                <label className="font-semibold text-[#374151] block mb-1">Target Service Category *</label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 text-[#111827] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none font-bold transition-all cursor-pointer"
                >
                  {SERVICE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Hierarchy Level Selection */}
              <div>
                <label className="font-semibold text-[#374151] block mb-1">Hierarchy Target &amp; Override Scope *</label>
                <select
                  value={hierarchyLevel}
                  onChange={(e) => setHierarchyLevel(e.target.value)}
                  className="w-full rounded-lg border border-[#D1D5DB] bg-white p-2.5 text-[#111827] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none font-bold transition-all cursor-pointer"
                >
                  <option value="RETAILER">🏬 Retailer Outlet Specific Override (Priority #2)</option>
                  <option value="DISTRIBUTOR">🏢 Distributor Specific Override (Priority #3)</option>
                  <option value="SUPER_DISTRIBUTOR">👑 Super Distributor Override (Priority #4)</option>
                  <option value="COMPANY">🏢 Company Default Fallback (Priority #6)</option>
                  <option value="PLATFORM">🌐 Platform Default Fallback (Priority #7)</option>
                </select>
              </div>

              {/* Searchable Retailer Selection when RETAILER is chosen */}
              {hierarchyLevel === "RETAILER" && (
                <div className="p-3.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] space-y-2">
                  <label className="font-extrabold text-[#1E40AF] block">Mapped Retailer Outlet (Searchable) *</label>
                  <SearchableSelect
                    options={retailerOptions}
                    value={targetRetailerId}
                    onChange={(val) => setTargetRetailerId(val)}
                    placeholder="🔍 Type retailer code or store name to search..."
                    searchPlaceholder="Search by RET code, store name, or owner..."
                    required
                  />
                  <p className="text-[11px] text-[#3B82F6] font-medium">
                    This custom {activeTab} rule will apply only to transactions from this selected retailer. All unmapped retailers automatically use the <strong>Company / Platform Default</strong>.
                  </p>
                </div>
              )}

              {/* Tab Specific Inputs */}
              {activeTab === "MDR" && (
                <div>
                  <label className="font-semibold text-[#374151] block mb-1">MDR Percentage (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={mdrPct}
                    onChange={(e) => setMdrPct(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-[#D1D5DB] bg-[#F8FAFC] p-2.5 font-mono text-[#111827] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none font-bold transition-all"
                  />
                </div>
              )}

              {activeTab === "GST" && (
                <div>
                  <label className="font-semibold text-[#374151] block mb-1">GST Tax Code</label>
                  <input
                    type="text"
                    value={gstCode}
                    onChange={(e) => setGstCode(e.target.value)}
                    className="w-full rounded-lg border border-[#D1D5DB] bg-[#F8FAFC] p-2.5 font-mono text-[#111827] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none font-bold transition-all"
                  />
                </div>
              )}

              {activeTab === "TDS" && (
                <div>
                  <label className="font-semibold text-[#374151] block mb-1">TDS Section Code</label>
                  <input
                    type="text"
                    value={tdsSection}
                    onChange={(e) => setTdsSection(e.target.value)}
                    className="w-full rounded-lg border border-[#D1D5DB] bg-[#F8FAFC] p-2.5 font-mono text-[#111827] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none font-bold transition-all"
                  />
                </div>
              )}

              {activeTab === "COMMISSION" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-[#374151] block mb-1">Retailer Comm %</label>
                    <input
                      type="number"
                      step="0.01"
                      value={retCommPct}
                      onChange={(e) => setRetCommPct(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-[#D1D5DB] bg-[#F8FAFC] p-2.5 font-mono text-[#111827] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none font-bold transition-all"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#374151] block mb-1">Distributor Comm %</label>
                    <input
                      type="number"
                      step="0.01"
                      value={distCommPct}
                      onChange={(e) => setDistCommPct(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-[#D1D5DB] bg-[#F8FAFC] p-2.5 font-mono text-[#111827] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none font-bold transition-all"
                    />
                  </div>
                </div>
              )}

              {activeTab === "SETTLEMENT" && (
                <div>
                  <label className="font-semibold text-[#374151] block mb-1">Settlement Cycle</label>
                  <select
                    value={settlementCycle}
                    onChange={(e) => setSettlementCycle(e.target.value)}
                    className="w-full rounded-lg border border-[#D1D5DB] bg-[#F8FAFC] p-2.5 text-[#111827] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none font-bold transition-all cursor-pointer"
                  >
                    <option value="T_0">T+0 (Same Day Instant)</option>
                    <option value="T_1">T+1 (Next Business Day)</option>
                    <option value="T_2">T+2 (Standard Cycle)</option>
                  </select>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-[#D1D5DB] text-[#374151] font-bold hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[#2563EB] px-6 py-2.5 text-xs font-extrabold text-white hover:bg-[#1D4ED8] shadow-2xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Saving Rule...
                    </>
                  ) : (
                    "Submit Rule for Production Approval"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
