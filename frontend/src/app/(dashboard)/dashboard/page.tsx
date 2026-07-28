"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, Users, HardDrive, DollarSign, Wallet, ArrowUpRight, ArrowDownRight,
  RefreshCw, Activity, AlertTriangle, Clock, CheckCircle2, TrendingUp, ShieldCheck
} from "lucide-react";

export default function DashboardPage() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["dashboard-widgets"],
    queryFn: async () => {
      const res = await apiClient.get("/dashboard/widgets");
      return res.data;
    },
    refetchInterval: autoRefresh ? 10000 : false, // 10 seconds real-time auto refresh
  });

  const getWidgetIcon = (key: string) => {
    switch (key) {
      case "total_companies": return Building2;
      case "active_retailers": return Users;
      case "total_machines": return HardDrive;
      case "todays_settlement": return DollarSign;
      case "wallet_liability": return Wallet;
      case "pending_payouts": return Clock;
      case "todays_profit": return TrendingUp;
      case "failed_settlement": return AlertTriangle;
      case "pending_approvals": return ShieldCheck;
      default: return Activity;
    }
  };

  const widgetKeys = [
    "total_companies", "active_retailers", "total_machines", "todays_settlement",
    "wallet_liability", "pending_payouts", "todays_profit", "failed_settlement", "pending_approvals"
  ];

  return (
    <div className="space-y-8">
      {/* Dashboard Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">Enterprise Executive Dashboard</h1>
            <Badge variant="success" className="animate-pulse">Live Refresh</Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">Multi-Tenant Swipe Settlement Real-time Operational Insights</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? "border-blue-500/40 text-blue-400" : ""}
          >
            <Activity className="w-3.5 h-3.5 mr-1.5" />
            {autoRefresh ? "Auto Refresh: 10s" : "Auto Refresh: Off"}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefetching ? "animate-spin" : ""}`} />
            Sync Now
          </Button>
        </div>
      </div>

      {/* 9 KPI Stat Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {widgetKeys.map((key) => {
          const item = data?.[key];
          const Icon = getWidgetIcon(key);
          const isDanger = key === "failed_settlement";
          const isWarning = key === "pending_approvals" || key === "pending_payouts";

          return (
            <Card key={key} className="glass-card hover:border-blue-500/40 transition-all duration-300">
              <CardHeader className="mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {item?.title || key.replace("_", " ")}
                </span>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isDanger ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                  isWarning ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                  "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <h3 className="text-2xl font-bold text-white tracking-tight font-mono">
                    {isLoading ? "---" : item?.value}
                  </h3>
                  {item?.change && (
                    <div className={`flex items-center text-xs font-semibold ${
                      item.trend === "up" ? "text-emerald-400" : item.trend === "down" ? "text-rose-400" : "text-slate-400"
                    }`}>
                      {item.trend === "up" ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
                      <span>{item.change}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Widget 10: Recent Activity Feed */}
      <Card className="glass-card">
        <CardHeader>
          <div>
            <CardTitle>Recent Platform Activities</CardTitle>
            <CardDescription>Live real-time immutable audit trail feed</CardDescription>
          </div>
          <Badge variant="info">Real-time Stream</Badge>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data?.recent_activities?.map((act: any) => (
              <div key={act.id} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{act.actor} performed <span className="text-blue-400">{act.action}</span></p>
                    <p className="text-[11px] text-slate-400">Target: {act.target}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="success" className="text-[10px]">{act.status}</Badge>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">{new Date(act.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
