"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface StatCardProps {
  label: string;
  value: string | number;
  subLabel?: string;
  trend?: { direction: "up" | "down" | "flat"; value: string };
  color?: "green" | "blue" | "red" | "amber" | "indigo" | "gray" | "violet" | "teal";
  icon?: React.ReactNode;
  onClick?: () => void;
}

const COLOR_MAP: Record<string, { value: string; icon: string; bg: string; border: string; left: string }> = {
  green:  { value: "#065F46", icon: "#10B981", bg: "#D1FAE5", border: "#6EE7B7",  left: "#10B981" },
  blue:   { value: "#1E40AF", icon: "#3B82F6", bg: "#DBEAFE", border: "#93C5FD",  left: "#3B82F6" },
  red:    { value: "#991B1B", icon: "#EF4444", bg: "#FEE2E2", border: "#FECACA",  left: "#EF4444" },
  amber:  { value: "#92400E", icon: "#F59E0B", bg: "#FEF3C7", border: "#FCD34D",  left: "#F59E0B" },
  indigo: { value: "#312E81", icon: "#6C63FF", bg: "#EDE9FE", border: "#DDD6FE",  left: "#6C63FF" },
  violet: { value: "#4C1D95", icon: "#8B5CF6", bg: "#F3E8FF", border: "#DDD6FE",  left: "#8B5CF6" },
  teal:   { value: "#134E4A", icon: "#14B8A6", bg: "#CCFBF1", border: "#5EEAD4",  left: "#14B8A6" },
  gray:   { value: "#1E293B", icon: "#64748B", bg: "#F1F5F9", border: "#CBD5E1",  left: "#64748B" },
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subLabel,
  trend,
  color = "indigo",
  icon,
  onClick,
}) => {
  const c = COLOR_MAP[color] || COLOR_MAP.indigo;

  return (
    <button
      onClick={onClick}
      className={`
        flex-1 min-w-0 text-left p-4 rounded-xl border bg-white
        transition-all duration-150
        ${onClick ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5" : "cursor-default"}
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6C63FF]/40
      `}
      style={{
        borderColor: c.border,
        borderLeftWidth: "3px",
        borderLeftColor: c.left,
      }}
      aria-label={`${label}: ${value}${subLabel ? ` — ${subLabel}` : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#64748B]">
            {label}
          </p>
          <p
            className="text-[28px] font-extrabold leading-tight mt-1.5 font-mono tabular-nums tracking-tight"
            style={{ color: c.value }}
          >
            {value}
          </p>
          {subLabel && (
            <p className="text-[11px] text-[#94A3B8] mt-0.5 truncate">{subLabel}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-1.5">
              {trend.direction === "up" && <TrendingUp className="w-3 h-3 text-emerald-500" />}
              {trend.direction === "down" && <TrendingDown className="w-3 h-3 text-red-500" />}
              {trend.direction === "flat" && <Minus className="w-3 h-3 text-[#64748B]" />}
              <span
                className="text-[11px] font-semibold"
                style={{
                  color: trend.direction === "up" ? "#059669"
                    : trend.direction === "down" ? "#DC2626"
                    : "#64748B",
                }}
              >
                {trend.value}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div
            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: c.bg }}
          >
            <div style={{ color: c.icon }}>{icon}</div>
          </div>
        )}
      </div>
    </button>
  );
};

export default StatCard;
