"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Building2,
  Network,
  Users,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Edit,
  Unlink,
} from "lucide-react";
import {
  adminOrgMappingApi,
  EntityDetailsResponse,
} from "@/services/admin-org-mapping-api";

interface EntityDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: string | null;
  entityId: string | null;
  onAssignClick: (type: string, id: string, name: string) => void;
  onUnmapClick: (type: string, id: string, name: string) => void;
}

export const EntityDetailsDrawer: React.FC<EntityDetailsDrawerProps> = ({
  isOpen,
  onClose,
  entityType,
  entityId,
  onAssignClick,
  onUnmapClick,
}) => {
  const [data, setData] = useState<EntityDetailsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !entityType || !entityId) {
      setData(null);
      return;
    }
    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await adminOrgMappingApi.getEntityDetails(entityType, entityId);
        setData(res);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load entity details");
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [isOpen, entityType, entityId]);

  if (!isOpen) return null;

  const getTypeColor = (type: string) => {
    switch (type) {
      case "TENANT":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "COMPANY_MASTER":
      case "COMPANY":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "MASTER_DISTRIBUTOR":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "DISTRIBUTOR":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "RETAILER":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200">
          {/* Header */}
          <div className="px-6 py-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Network className="w-5 h-5 text-indigo-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">Entity Details</h2>
                <p className="text-xs text-slate-500">Organization Hierarchy Node</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
                <Clock className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="text-sm font-medium">Loading details...</p>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Unable to fetch details</p>
                  <p className="text-xs mt-1 text-rose-600">{error}</p>
                </div>
              </div>
            )}

            {data && !loading && (
              <>
                {/* Main Card */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getTypeColor(
                        data.entity_type
                      )}`}
                    >
                      {data.entity_type.replace("_", " ")}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        data.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          data.status === "ACTIVE" ? "bg-emerald-500" : "bg-slate-400"
                        }`}
                      />
                      {data.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{data.name}</h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Code: {data.code} {data.entity_ref_id ? `• Ref ID: #${data.entity_ref_id}` : ""}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono mt-1 break-all">
                      ID: {data.entity_id}
                    </p>
                  </div>
                </div>

                {/* Lineage / Organizational Path */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    Organizational Lineage
                  </h4>
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Tenant</span>
                      <span className="font-semibold text-slate-900">
                        {data.tenant ? `${data.tenant.name} (${data.tenant.code})` : "Global / None"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Company Master</span>
                      <span className="font-semibold text-slate-900">
                        {data.company ? `${data.company.name} (${data.company.code})` : "None"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Master Distributor</span>
                      <span className="font-semibold text-slate-900">
                        {data.master_distributor
                          ? `${data.master_distributor.name} (${data.master_distributor.code})`
                          : data.entity_type === "RETAILER" || data.entity_type === "DISTRIBUTOR"
                          ? "Unmapped"
                          : "N/A"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-500 font-medium">Distributor</span>
                      <span className="font-semibold text-slate-900">
                        {data.distributor
                          ? `${data.distributor.name} (${data.distributor.code})`
                          : data.entity_type === "RETAILER"
                          ? "Unmapped"
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subordinate Statistics */}
                {Object.keys(data.counts).length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-indigo-500" />
                      Subordinate Hierarchy Counts
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(data.counts).map(([k, v]) => (
                        <div key={k} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                          <p className="text-[11px] text-slate-500 capitalize">
                            {k.replace("_", " ")}
                          </p>
                          <p className="text-lg font-bold text-slate-900 mt-0.5">{v}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mapped Users */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-indigo-500" />
                      Mapped Users ({data.mapped_users.length})
                    </span>
                  </h4>
                  {data.mapped_users.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                      No direct users mapped to this entity record.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {data.mapped_users.map((u) => (
                        <div
                          key={u.id}
                          className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">{u.name}</p>
                            <p className="text-[11px] text-slate-500">{u.email}</p>
                          </div>
                          <div className="text-right">
                            <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[10px] text-slate-700 font-semibold">
                              {u.role}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Timestamps */}
                <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-100 space-y-1">
                  {data.created_at && (
                    <p className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Created:{" "}
                      {new Date(data.created_at).toLocaleString()}
                    </p>
                  )}
                  {data.updated_at && (
                    <p className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Updated:{" "}
                      {new Date(data.updated_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          {data && (
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-2">
              {(data.entity_type === "DISTRIBUTOR" || data.entity_type === "RETAILER") && (
                <>
                  <button
                    onClick={() => {
                      onClose();
                      onAssignClick(data.entity_type, data.entity_id, data.name);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-xs"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Reassign Mapping
                  </button>

                  <button
                    onClick={() => {
                      onClose();
                      onUnmapClick(data.entity_type, data.entity_id, data.name);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs transition-colors"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    Unmap
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
