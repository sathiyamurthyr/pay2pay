"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Lock } from "lucide-react";

export default function SettingsPage() {
  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await apiClient.get("/settings");
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">System Settings</h1>
        <p className="text-xs text-slate-400 mt-1">Tenant System Configurations & Security Policy Defaults</p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <CardTitle>System Configuration Registry</CardTitle>
              <CardDescription>Key-value environment and security policies</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Config Key</th>
                  <th className="py-3.5 px-4 font-semibold">Value</th>
                  <th className="py-3.5 px-4 font-semibold">Category</th>
                  <th className="py-3.5 px-4 font-semibold">Version</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500 font-sans">Loading system settings...</td>
                  </tr>
                ) : configs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500 font-sans">No system settings initialized.</td>
                  </tr>
                ) : (
                  configs.map((c: any) => (
                    <tr key={c.public_id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-semibold text-white">{c.key}</td>
                      <td className="py-3.5 px-4 text-blue-400 font-bold">{c.value}</td>
                      <td className="py-3.5 px-4 font-sans">
                        <Badge variant="info">{c.category}</Badge>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">v{c.version}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
