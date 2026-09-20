"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  X,
  Network,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";
import {
  adminOrgMappingApi,
  CascadedOptionsResponse,
  UnmappedItem,
} from "@/services/admin-org-mapping-api";

interface AssignMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialEntityType?: "DISTRIBUTOR" | "RETAILER" | null;
  initialEntityId?: string | null;
  initialEntityName?: string | null;
  unmappedList?: UnmappedItem[];
}

export const AssignMappingModal: React.FC<AssignMappingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialEntityType = null,
  initialEntityId = null,
  initialEntityName = null,
  unmappedList = [],
}) => {
  const [entityType, setEntityType] = useState<"DISTRIBUTOR" | "RETAILER">("DISTRIBUTOR");
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [selectedEntityName, setSelectedEntityName] = useState<string>("");

  const [options, setOptions] = useState<CascadedOptionsResponse | null>(null);
  const [loadingOptions, setLoadingOptions] = useState<boolean>(false);

  // Cascaded parent selections
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedMasterDistId, setSelectedMasterDistId] = useState<string>("");
  const [selectedDistributorId, setSelectedDistributorId] = useState<string>("");

  const [reason, setReason] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Initialize or reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSubmitError(null);
      setSubmitSuccess(null);
      setReason("");

      if (initialEntityType) {
        setEntityType(initialEntityType);
      }
      if (initialEntityId) {
        setSelectedEntityId(initialEntityId);
        setSelectedEntityName(initialEntityName || initialEntityId);
      } else {
        setSelectedEntityId("");
        setSelectedEntityName("");
      }

      fetchOptions();
    }
  }, [isOpen, initialEntityType, initialEntityId, initialEntityName]);

  const fetchOptions = async () => {
    setLoadingOptions(true);
    try {
      const res = await adminOrgMappingApi.getOptions();
      setOptions(res);
      // Auto-select tenant if only 1 or default
      if (res.tenants && res.tenants.length > 0) {
        setSelectedTenantId(res.tenants[0].id);
      }
    } catch (err) {
      console.error("Failed to load options", err);
    } finally {
      setLoadingOptions(false);
    }
  };

  // Filtered companies based on selected tenant
  const availableCompanies = useMemo(() => {
    if (!options?.companies) return [];
    if (!selectedTenantId) return options.companies;
    return options.companies.filter((c) => c.tenant_id === selectedTenantId);
  }, [options, selectedTenantId]);

  // Auto-select first company when availableCompanies changes
  useEffect(() => {
    if (availableCompanies.length > 0) {
      if (!availableCompanies.some((c) => c.id === selectedCompanyId)) {
        setSelectedCompanyId(availableCompanies[0].id);
      }
    } else {
      setSelectedCompanyId("");
    }
  }, [availableCompanies, selectedCompanyId]);

  // Filtered master distributors based on selected company
  const availableMasterDistributors = useMemo(() => {
    if (!options?.master_distributors) return [];
    if (!selectedCompanyId) return options.master_distributors;
    return options.master_distributors.filter((md) => md.company_id === selectedCompanyId);
  }, [options, selectedCompanyId]);

  // Auto-select first master distributor when availableMasterDistributors changes
  useEffect(() => {
    if (availableMasterDistributors.length > 0) {
      if (!availableMasterDistributors.some((md) => md.id === selectedMasterDistId)) {
        setSelectedMasterDistId(availableMasterDistributors[0].id);
      }
    } else {
      setSelectedMasterDistId("");
    }
  }, [availableMasterDistributors, selectedMasterDistId]);

  // Filtered distributors based on selected master distributor
  const availableDistributors = useMemo(() => {
    if (!options?.distributors) return [];
    if (!selectedMasterDistId) return options.distributors;
    return options.distributors.filter((d) => d.master_distributor_id === selectedMasterDistId);
  }, [options, selectedMasterDistId]);

  // Auto-select first distributor when availableDistributors changes
  useEffect(() => {
    if (availableDistributors.length > 0) {
      if (!availableDistributors.some((d) => d.id === selectedDistributorId)) {
        setSelectedDistributorId(availableDistributors[0].id);
      }
    } else {
      setSelectedDistributorId("");
    }
  }, [availableDistributors, selectedDistributorId]);

  // Candidates for unmapped / target entity if not preselected
  const selectableEntities = useMemo(() => {
    if (!unmappedList) return [];
    return unmappedList.filter((u) => u.entity_type === entityType);
  }, [unmappedList, entityType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!selectedEntityId) {
      setSubmitError("Please select an entity to map.");
      return;
    }

    let parentType: "MASTER_DISTRIBUTOR" | "DISTRIBUTOR";
    let parentId: string;

    if (entityType === "DISTRIBUTOR") {
      if (!selectedMasterDistId) {
        setSubmitError("Please select a Master Distributor parent.");
        return;
      }
      parentType = "MASTER_DISTRIBUTOR";
      parentId = selectedMasterDistId;
    } else {
      if (!selectedDistributorId) {
        setSubmitError("Please select a Distributor parent.");
        return;
      }
      parentType = "DISTRIBUTOR";
      parentId = selectedDistributorId;
    }

    if (!reason.trim() || reason.trim().length < 5) {
      setSubmitError("A valid justification reason (at least 5 characters) is required for audit logging.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminOrgMappingApi.assignMapping({
        entity_type: entityType,
        entity_id: selectedEntityId,
        parent_type: parentType,
        parent_id: parentId,
        reason: reason.trim(),
      });

      setSubmitSuccess(res.message);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Mapping assignment failed. Please check hierarchy integrity.";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />

        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-slate-200">
          {/* Header */}
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                <Network className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {initialEntityId ? "Assign / Reassign Mapping" : "Create Organization Mapping"}
                </h3>
                <p className="text-xs text-slate-500">
                  Enforces strict Tenant & Company hierarchy rules
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {submitError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">Validation Error</p>
                  <p className="mt-0.5">{submitError}</p>
                </div>
              </div>
            )}

            {submitSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <p className="font-semibold">{submitSuccess}</p>
              </div>
            )}

            {/* Target Entity Selection */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Target Entity to Map
              </label>

              {initialEntityId ? (
                <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/50 flex items-center justify-between">
                  <div>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800">
                      {entityType}
                    </span>
                    <p className="font-bold text-slate-900 text-sm mt-1">{selectedEntityName}</p>
                    <p className="text-[11px] font-mono text-slate-500 mt-0.5">ID: {selectedEntityId}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEntityType("DISTRIBUTOR");
                        setSelectedEntityId("");
                      }}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${
                        entityType === "DISTRIBUTOR"
                          ? "bg-amber-500 text-white border-amber-600"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      Distributor
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEntityType("RETAILER");
                        setSelectedEntityId("");
                      }}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${
                        entityType === "RETAILER"
                          ? "bg-emerald-600 text-white border-emerald-700"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      Retailer
                    </button>
                  </div>

                  <select
                    value={selectedEntityId}
                    onChange={(e) => {
                      setSelectedEntityId(e.target.value);
                      const match = selectableEntities.find((u) => u.entity_id === e.target.value);
                      setSelectedEntityName(match ? match.name : e.target.value);
                    }}
                    className="w-full text-xs font-medium border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">-- Select Unmapped {entityType} --</option>
                    {selectableEntities.map((item) => (
                      <option key={item.entity_id} value={item.entity_id}>
                        {item.name} ({item.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Cascaded Parent Hierarchy */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                Assign Authoritative Parent Hierarchy
              </label>

              {/* 1. Tenant */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  1. Tenant Scope
                </label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  disabled={loadingOptions}
                >
                  {options?.tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Company Master */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  2. Company Master
                </label>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  disabled={availableCompanies.length === 0}
                  required
                >
                  {availableCompanies.length === 0 && (
                    <option value="">No companies under selected tenant</option>
                  )}
                  {availableCompanies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Master Distributor */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  3. Master Distributor {entityType === "DISTRIBUTOR" && "(Direct Parent)"}
                </label>
                <select
                  value={selectedMasterDistId}
                  onChange={(e) => setSelectedMasterDistId(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  disabled={availableMasterDistributors.length === 0}
                  required
                >
                  {availableMasterDistributors.length === 0 && (
                    <option value="">No Master Distributors under selected company</option>
                  )}
                  {availableMasterDistributors.map((md) => (
                    <option key={md.id} value={md.id}>
                      {md.name} ({md.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Distributor (If mapping Retailer) */}
              {entityType === "RETAILER" && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    4. Distributor (Direct Parent)
                  </label>
                  <select
                    value={selectedDistributorId}
                    onChange={(e) => setSelectedDistributorId(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    disabled={availableDistributors.length === 0}
                    required
                  >
                    {availableDistributors.length === 0 && (
                      <option value="">No Distributors under selected Master Distributor</option>
                    )}
                    {availableDistributors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Audit Justification Reason */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center justify-between">
                <span>Reason / Justification</span>
                <span className="text-[10px] font-normal text-slate-400">Required for Audit Log</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain the reason for this mapping assignment or transfer..."
                rows={2}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
                required
                minLength={5}
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-xs font-bold text-white transition-colors shadow-xs"
              >
                {submitting ? (
                  <>
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    Validating & Committing...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Commit Mapping
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
