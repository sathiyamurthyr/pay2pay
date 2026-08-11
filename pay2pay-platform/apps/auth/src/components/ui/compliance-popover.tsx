"use client";

import React, { useState, useRef, useEffect } from "react";
import { ShieldCheck, Copy, CheckCircle2, X } from "lucide-react";

export interface ComplianceData {
  gstNumber?: string;
  panNumber?: string;
  cinNumber?: string;
  createdDate?: string;
  verifiedOn?: string;
  entityType?: string;
}

interface CompliancePopoverProps {
  rowId: string;
  data: ComplianceData;
}

export const CompliancePopover: React.FC<CompliancePopoverProps> = ({ rowId, data }) => {
  const [open, setOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, []);

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      /* ignore */
    }
  };

  const fields: Array<{ key: string; label: string; value?: string; copyable?: boolean }> = [
    { key: "gst", label: "GST Number", value: data.gstNumber, copyable: true },
    { key: "pan", label: "PAN Number", value: data.panNumber, copyable: true },
    { key: "cin", label: "CIN Number", value: data.cinNumber, copyable: true },
    { key: "entity", label: "Entity Type", value: data.entityType },
    { key: "created", label: "Enrolled On", value: data.createdDate },
    { key: "verified", label: "Verified On", value: data.verifiedOn },
  ].filter((f) => f.value);

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        id={`compliance-trigger-${rowId}`}
        onClick={(e) => { e.stopPropagation(); setOpen((p) => !p); }}
        aria-label="View compliance information"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="
          inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md
          bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]
          text-xs font-semibold
          hover:bg-[#DCFCE7] hover:border-[#86EFAC]
          transition-colors duration-100
          focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A]/40
          whitespace-nowrap
        "
      >
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
        Compliance Info
      </button>

      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-labelledby={`compliance-trigger-${rowId}`}
          onClick={(e) => e.stopPropagation()}
          className="
            absolute left-0 top-full mt-1.5 z-[999]
            w-72 bg-white rounded-xl border border-[#D9E2EC]
            shadow-xl shadow-black/10 overflow-hidden
          "
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#F3F6FA] border-b border-[#D9E2EC]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#15803D]" />
              <span className="text-[13px] font-semibold text-[#111827]">Compliance Details</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close compliance popover"
              className="p-0.5 rounded text-[#9CA3AF] hover:text-[#374151] hover:bg-[#E5E7EB] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Fields */}
          <div className="p-3 space-y-2">
            {fields.map((field, i) => (
              <div
                key={field.key}
                className={`flex items-center justify-between gap-2 ${
                  i < fields.length - 1 ? "pb-2 border-b border-[#F3F4F6]" : ""
                }`}
              >
                <span className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wide shrink-0">
                  {field.label}
                </span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-mono text-[12px] font-semibold text-[#111827] truncate">
                    {field.value}
                  </span>
                  {field.copyable && field.value && (
                    <button
                      onClick={() => copyToClipboard(field.value!, field.key)}
                      aria-label={`Copy ${field.label}`}
                      className="p-0.5 rounded text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F3F4F6] transition-colors shrink-0"
                    >
                      {copiedKey === field.key
                        ? <CheckCircle2 className="w-3 h-3 text-[#16A34A]" />
                        : <Copy className="w-3 h-3" />
                      }
                    </button>
                  )}
                </div>
              </div>
            ))}
            {fields.length === 0 && (
              <p className="text-[12px] text-[#9CA3AF] text-center py-2">
                No compliance data on record.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompliancePopover;
