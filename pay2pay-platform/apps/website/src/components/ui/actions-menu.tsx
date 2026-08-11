"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  MoreVertical,
  Eye,
  Edit2,
  ShieldOff,
  Trash2,
  ScrollText,
  Copy,
  ExternalLink,
} from "lucide-react";

export interface ActionItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
  dividerBefore?: boolean;
  disabled?: boolean;
}

interface ActionsMenuProps {
  rowId: string;
  actions?: ActionItem[];
  onView?: () => void;
  onEdit?: () => void;
  onSoftDelete?: () => void;
  onAuditLog?: () => void;
  onCopyId?: () => void;
  onOpenDetail?: () => void;
}

export const ActionsMenu: React.FC<ActionsMenuProps> = ({
  rowId,
  actions,
  onView,
  onEdit,
  onSoftDelete,
  onAuditLog,
  onCopyId,
  onOpenDetail,
}) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<"below" | "above">("below");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const defaultActions: ActionItem[] = [
    ...(onView ? [{ id: "view", label: "View Details", icon: <Eye className="w-3.5 h-3.5" />, onClick: onView }] : []),
    ...(onOpenDetail ? [{ id: "open", label: "Open in New Tab", icon: <ExternalLink className="w-3.5 h-3.5" />, onClick: onOpenDetail }] : []),
    ...(onEdit ? [{ id: "edit", label: "Edit Metadata", icon: <Edit2 className="w-3.5 h-3.5" />, onClick: onEdit }] : []),
    ...(onAuditLog ? [{ id: "audit", label: "Audit History Log", icon: <ScrollText className="w-3.5 h-3.5" />, onClick: onAuditLog }] : []),
    ...(onCopyId ? [{ id: "copy", label: "Copy Record ID", icon: <Copy className="w-3.5 h-3.5" />, onClick: onCopyId, dividerBefore: true }] : []),
    ...(onSoftDelete ? [{ id: "soft-delete", label: "Deactivate", icon: <ShieldOff className="w-3.5 h-3.5" />, onClick: onSoftDelete, variant: "danger" as const, dividerBefore: true }] : []),
  ];

  const resolvedActions = actions ?? defaultActions;

  const handleOpen = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setPosition(spaceBelow < 200 ? "above" : "below");
    }
    setOpen((p) => !p);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
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

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        id={`actions-menu-trigger-${rowId}`}
        onClick={(e) => { e.stopPropagation(); handleOpen(); }}
        aria-label="Open row actions menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="
          w-7 h-7 flex items-center justify-center rounded
          text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6]
          transition-colors duration-100
          focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50
        "
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-labelledby={`actions-menu-trigger-${rowId}`}
          onClick={(e) => e.stopPropagation()}
          style={{
            [position === "below" ? "top" : "bottom"]: "calc(100% + 4px)",
          }}
          className="
            absolute right-0 z-[999] min-w-[180px]
            bg-white rounded-lg border border-[#E5E7EB]
            shadow-lg shadow-black/10
            py-1 overflow-hidden
          "
        >
          {resolvedActions.map((action, idx) => (
            <React.Fragment key={action.id}>
              {action.dividerBefore && idx > 0 && (
                <div className="border-t border-[#E5E7EB] my-1" />
              )}
              <button
                role="menuitem"
                disabled={action.disabled}
                onClick={() => {
                  setOpen(false);
                  action.onClick();
                }}
                className={`
                  w-full flex items-center gap-2.5 px-3 py-2 text-[13px]
                  transition-colors duration-100 text-left
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2563EB]/40
                  ${action.disabled
                    ? "opacity-40 cursor-not-allowed"
                    : action.variant === "danger"
                      ? "text-[#B91C1C] hover:bg-[#FEF2F2]"
                      : "text-[#111827] hover:bg-[#F5F7FA]"
                  }
                `}
              >
                <span className={action.variant === "danger" ? "text-[#DC2626]" : "text-[#6B7280]"}>
                  {action.icon}
                </span>
                {action.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActionsMenu;
