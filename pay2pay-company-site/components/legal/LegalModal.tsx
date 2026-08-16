"use client";

import React, { useEffect } from "react";
import { X, Shield, FileText } from "lucide-react";
import { siteConfig } from "@/config/site-config";
import { LegalDocument } from "@/types/site";

interface LegalModalProps {
  documentId: "terms" | "privacy" | "refund" | null;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ documentId, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (documentId) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [documentId, onClose]);

  if (!documentId) return null;

  const doc: LegalDocument = siteConfig.legal[documentId];
  if (!doc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-[#0A1222] border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-y-auto flex flex-col z-10">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white leading-none">{doc.title}</h3>
              <span className="text-[11px] text-slate-400 font-medium block mt-1">
                Last Updated: {doc.lastUpdated}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Summary */}
        <div className="my-6 p-4 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs text-blue-200 leading-relaxed shrink-0">
          {doc.summary}
        </div>

        {/* Policy Sections */}
        <div className="space-y-6 text-slate-300 text-xs leading-relaxed overflow-y-auto pr-1">
          {doc.sections.map((sec) => (
            <div key={sec.heading} className="space-y-2">
              <h4 className="font-bold text-white text-sm text-blue-300">
                {sec.heading}
              </h4>
              {Array.isArray(sec.content) ? (
                <ul className="list-disc pl-4 space-y-1 text-slate-300">
                  {sec.content.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-300">{sec.content}</p>
              )}
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            {siteConfig.company.legalName}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors"
          >
            Close Document
          </button>
        </div>
      </div>
    </div>
  );
};
