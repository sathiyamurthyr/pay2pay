"use client";

import React from "react";

export function OperatorLogo({
  code,
  className = "w-10 h-10",
  size = 40,
}: {
  code: string;
  className?: string;
  size?: number;
}) {
  const norm = (code || "").toUpperCase().trim();

  if (norm === "JIO") {
    return (
      <div
        className={`flex items-center justify-center rounded-full font-black text-white shadow-lg ${className}`}
        style={{
          background: "linear-gradient(135deg, #0A2540 0%, #0056B3 50%, #0080FF 100%)",
          border: "2px solid rgba(0, 128, 255, 0.4)",
        }}
      >
        <span className="tracking-tighter font-extrabold text-sm text-cyan-200">Jio</span>
      </div>
    );
  }

  if (norm === "AIRTEL") {
    return (
      <div
        className={`flex items-center justify-center rounded-full font-black text-white shadow-lg ${className}`}
        style={{
          background: "linear-gradient(135deg, #E60000 0%, #B30000 50%, #800000 100%)",
          border: "2px solid rgba(255, 60, 60, 0.4)",
        }}
      >
        <span className="tracking-tight font-extrabold text-xs text-white">airtel</span>
      </div>
    );
  }

  if (norm === "VI") {
    return (
      <div
        className={`flex items-center justify-center rounded-full font-black text-white shadow-lg ${className}`}
        style={{
          background: "linear-gradient(135deg, #FF6F00 0%, #D84315 50%, #B71C1C 100%)",
          border: "2px solid rgba(255, 140, 0, 0.4)",
        }}
      >
        <span className="tracking-tighter font-black text-xs text-yellow-300">!Vi</span>
      </div>
    );
  }

  if (norm === "BSNL") {
    return (
      <div
        className={`flex items-center justify-center rounded-full font-black text-white shadow-lg ${className}`}
        style={{
          background: "linear-gradient(135deg, #0288D1 0%, #01579B 50%, #003766 100%)",
          border: "2px solid rgba(2, 136, 209, 0.4)",
        }}
      >
        <span className="tracking-tighter font-bold text-[11px] text-blue-100">BSNL</span>
      </div>
    );
  }

  if (norm === "MTNL") {
    return (
      <div
        className={`flex items-center justify-center rounded-full font-black text-white shadow-lg ${className}`}
        style={{
          background: "linear-gradient(135deg, #388E3C 0%, #1B5E20 50%, #0D3813 100%)",
          border: "2px solid rgba(76, 175, 80, 0.4)",
        }}
      >
        <span className="tracking-tighter font-bold text-[10px] text-emerald-200">MTNL</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full font-bold text-white bg-slate-800 border border-slate-600 ${className}`}
    >
      <span className="text-xs">{norm.slice(0, 3)}</span>
    </div>
  );
}
