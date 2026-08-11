"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Key, Shield } from "lucide-react";

export default function PermissionsPage() {
  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const res = await apiClient.get("/permissions");
      return res.data;
    },
  });

  // Group permissions by module
  const groupedPermissions: Record<string, any[]> = {};
  permissions.forEach((p: any) => {
    if (!groupedPermissions[p.module]) {
      groupedPermissions[p.module] = [];
    }
    groupedPermissions[p.module].push(p);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">System Permissions</h1>
        <p className="text-xs text-slate-400 mt-1">Foundational RBAC Permission Definitions Grouped by Module</p>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-slate-500 text-xs">Loading permissions registry...</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedPermissions).map(([module, perms]) => (
            <Card key={module} className="glass-card">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle>{module} Module Permissions</CardTitle>
                    <CardDescription>{perms.length} registered action privileges</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {perms.map((p: any) => (
                    <div key={p.code} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                      <div>
                        <p className="font-mono text-xs text-blue-400 font-semibold">{p.code}</p>
                        <p className="text-[11px] text-slate-300 mt-0.5">{p.name}</p>
                      </div>
                      <Badge variant="info" className="text-[10px]">{p.action}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
