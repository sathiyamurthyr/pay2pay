"use client";

import React, { useState } from "react";
import {
  Bell,
  CheckCircle2,
  Clock,
  Wallet,
  Users,
  ShieldCheck,
  RefreshCw
} from "lucide-react";

export default function DistributorNotificationsPage() {
  const [notifications] = useState([
    {
      id: "NOTIF-01",
      title: "Welcome to Distributor Portal",
      message: "Your Pay2Pay distributor partner account is active. Start inviting retailers and configuring custom MDR.",
      type: "SYSTEM",
      time: "Just now",
      read: false
    },
    {
      id: "NOTIF-02",
      title: "MDR Setup Available",
      message: "You can now configure channel-specific MDR rates for mapped retailers under the MDR Setup tab.",
      type: "FEATURE",
      time: "1 hour ago",
      read: true
    },
    {
      id: "NOTIF-03",
      title: "Wallet Top-up Reminder",
      message: "Ensure adequate distributor balance to service high-volume retailer transactions smoothly.",
      type: "WALLET",
      time: "1 day ago",
      read: true
    }
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="pb-2 border-b border-white/[0.06] flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-amber-400" />
            Notifications
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Operational alerts, top-up approvals, and network announcements.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`p-4 rounded-2xl border transition-all ${
              n.read
                ? "bg-[#111827]/60 border-white/[0.06] text-slate-300"
                : "bg-amber-500/[0.04] border-amber-500/25 text-white shadow-lg shadow-amber-500/5"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    n.type === "WALLET"
                      ? "bg-amber-500/20 text-amber-400"
                      : n.type === "SYSTEM"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-blue-500/20 text-blue-400"
                  }`}
                >
                  {n.type === "WALLET" ? (
                    <Wallet className="w-4 h-4" />
                  ) : n.type === "SYSTEM" ? (
                    <ShieldCheck className="w-4 h-4" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white mb-0.5">{n.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{n.message}</p>
                </div>
              </div>
              <span className="text-[10px] text-slate-500 shrink-0">{n.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
