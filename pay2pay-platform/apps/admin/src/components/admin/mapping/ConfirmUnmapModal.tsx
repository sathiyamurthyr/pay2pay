"use client";

import React, { useState } from "react";
import { X, AlertTriangle, Clock, Unlink } from "lucide-react";
import { adminOrgMappingApi } from "@/services/admin-org-mapping-api";

interface ConfirmUnmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  entityType: string | null;
  entityId: string | null;
  entityName: string | null;
}

export const ConfirmUnmapModal: React.FC<ConfirmUnmapModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  entityType,
  entityId,
  entityName,
}) => {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !entityType || !entityId) return null;

  const handleUnmap = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!reason.trim() || reason.trim().length < 5) {
      setError("Please provide a valid justification reason (at least 5 characters).");
      return;
    }

    setSubmitting(true);
    try {
      await adminOrgMappingApi.unmapEntity({
        entity_type: entityType as any,
        entity_id: entityId,
        reason: reason.trim(),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to unmap entity");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />

        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-slate-200">
          <div className="px-6 py-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold">Confirm Unmapping</h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-rose-400 hover:text-rose-700 hover:bg-rose-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleUnmap} className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {error}
              </div>
            )}

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove the organizational parent mapping for{" "}
              <span className="font-bold text-slate-900">{entityName}</span>? This record will be
              moved to <span className="font-bold text-amber-700">Unmapped Records</span>.
            </p>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Reason / Justification <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for removing parent relationship..."
                rows={2}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500 resize-none"
                required
                minLength={5}
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
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
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-xs font-bold text-white transition-colors shadow-xs"
              >
                {submitting ? (
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Unlink className="w-3.5 h-3.5" />
                )}
                Unmap Entity
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
