"use client";

import React from "react";
import { CheckCircle2, Clock, XCircle, AlertTriangle, MinusCircle } from "lucide-react";

export type CompanyStatus =
  | "ACTIVE"
  | "PENDING_APPROVAL"
  | "SUSPENDED"
  | "BLOCKED"
  | "INACTIVE"
  | "DRAFT"
  | "VERIFIED"
  | "PROCESSING"
  | "FAILED"
  | "REVERSED";

interface StatusBadgeProps {
  status: CompanyStatus | string;
  showIcon?: boolean;
  size?: "sm" | "md";
}

const STATUS_CONFIG: Record<string, {
  label: string;
  bg: string;
  text: string;
  border: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = {
  ACTIVE: {
    label: "Active",
    bg: "#DCFCE7", text: "#15803D", border: "#BBF7D0",
    Icon: CheckCircle2,
  },
  SUCCESS: {
    label: "Success",
    bg: "#DCFCE7", text: "#15803D", border: "#BBF7D0",
    Icon: CheckCircle2,
  },
  VERIFIED: {
    label: "Verified",
    bg: "#DCFCE7", text: "#15803D", border: "#BBF7D0",
    Icon: CheckCircle2,
  },
  PENDING: {
    label: "Pending",
    bg: "#F3E8FF", text: "#7E22CE", border: "#DDD6FE",
    Icon: Clock,
  },
  PENDING_APPROVAL: {
    label: "Pending Approval",
    bg: "#F3E8FF", text: "#7E22CE", border: "#DDD6FE",
    Icon: Clock,
  },
  DRAFT: {
    label: "Draft",
    bg: "#F3E8FF", text: "#7E22CE", border: "#DDD6FE",
    Icon: Clock,
  },
  PROCESSING: {
    label: "Processing",
    bg: "#DBEAFE", text: "#1D4ED8", border: "#BFDBFE",
    Icon: Clock,
  },
  WARNING: {
    label: "Warning",
    bg: "#FEF3C7", text: "#B45309", border: "#FCD34D",
    Icon: AlertTriangle,
  },
  SUSPENDED: {
    label: "Suspended",
    bg: "#FEF3C7", text: "#B45309", border: "#FCD34D",
    Icon: AlertTriangle,
  },
  COOLING_PERIOD: {
    label: "Cooling Period",
    bg: "#FEF3C7", text: "#B45309", border: "#FCD34D",
    Icon: AlertTriangle,
  },
  BLOCKED: {
    label: "Blocked",
    bg: "#FEE2E2", text: "#B91C1C", border: "#FECACA",
    Icon: XCircle,
  },
  FAILED: {
    label: "Failed",
    bg: "#FEE2E2", text: "#B91C1C", border: "#FECACA",
    Icon: XCircle,
  },
  REVERSED: {
    label: "Reversed",
    bg: "#FEE2E2", text: "#B91C1C", border: "#FECACA",
    Icon: XCircle,
  },
  INACTIVE: {
    label: "Inactive",
    bg: "#F1F5F9", text: "#64748B", border: "#CBD5E1",
    Icon: MinusCircle,
  },
};

const DEFAULT_CONFIG = {
  label: "Unknown",
  bg: "#F1F5F9", text: "#64748B", border: "#CBD5E1",
  darkBg: "rgba(107,114,128,0.12)", darkText: "#9CA3AF", darkBorder: "rgba(107,114,128,0.25)",
  Icon: MinusCircle,
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showIcon = true,
  size = "md",
}) => {
  const key = (status || "").toUpperCase().replace(/\s+/g, "_");
  const config = STATUS_CONFIG[key] || DEFAULT_CONFIG;
  const { Icon } = config;

  const paddingClass = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-0.5 text-xs";
  const iconClass = size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3";

  return (
    <span
      style={{
        backgroundColor: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
      }}
      className={`inline-flex items-center gap-1 ${paddingClass} rounded-full font-semibold whitespace-nowrap`}
    >
      {showIcon && <Icon className={`${iconClass} shrink-0`} />}
      {config.label}
    </span>
  );
};

export default StatusBadge;
