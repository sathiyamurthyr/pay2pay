"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ShieldCheck, Plus, Check, X, Lock } from "lucide-react";

export default function RolesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"roles" | "matrix">("matrix");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", code: "", description: "" });

  const { data: matrixData, isLoading } = useQuery({
    queryKey: ["permission-matrix"],
    queryFn: async () => {
      const res = await apiClient.get("/roles/matrix");
      return res.data;
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiClient.post("/roles", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permission-matrix"] });
      setIsModalOpen(false);
      setFormData({ name: "", code: "", description: "" });
    },
  });

  const roles = matrixData?.roles || [];
  const permissions = matrixData?.permissions || [];
  const matrix = matrixData?.matrix || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Roles & Permission Matrix</h1>
          <p className="text-xs text-slate-400 mt-1">Enterprise Access Control & Granular RBAC Permission Matrix</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab("matrix")}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                activeTab === "matrix" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              Permission Matrix Grid
            </button>
            <button
              onClick={() => setActiveTab("roles")}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                activeTab === "roles" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              Role List
            </button>
          </div>
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Custom Role
          </Button>
        </div>
      </div>

      {activeTab === "matrix" ? (
        <Card className="glass-card">
          <CardHeader>
            <div>
              <CardTitle>Enterprise RBAC Permission Matrix</CardTitle>
              <CardDescription>Granular permission mapping across Platform Roles</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-slate-500 text-xs">Loading Permission Matrix...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/90 text-slate-300 border-b border-slate-800">
                      <th className="py-3.5 px-4 font-semibold w-64 sticky left-0 bg-slate-900 z-10">Permission Code</th>
                      <th className="py-3.5 px-4 font-semibold w-28">Module</th>
                      {roles.map((r: any) => (
                        <th key={r.code} className="py-3.5 px-4 font-semibold text-center min-w-[120px]">
                          <div className="font-bold text-white text-xs">{r.name}</div>
                          <div className="text-[10px] font-mono text-slate-400 font-normal">{r.code}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {permissions.map((p: any) => (
                      <tr key={p.code} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono font-medium text-slate-200 sticky left-0 bg-[#0c1220] z-10 border-r border-slate-800">
                          {p.code}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="neutral" className="text-[10px]">{p.module}</Badge>
                        </td>
                        {roles.map((r: any) => {
                          const isAssigned = matrix[r.code]?.includes(p.code) || r.code === "PLATFORM_ADMIN";
                          return (
                            <td key={r.code} className="py-3 px-4 text-center">
                              {isAssigned ? (
                                <div className="inline-flex w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 items-center justify-center text-emerald-400">
                                  <Check className="w-3.5 h-3.5" />
                                </div>
                              ) : (
                                <div className="inline-flex w-6 h-6 rounded-full bg-slate-800/40 items-center justify-center text-slate-600">
                                  <X className="w-3.5 h-3.5" />
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((r: any) => (
            <Card key={r.code} className="glass-card">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">{r.name}</h3>
                    <p className="text-xs font-mono text-blue-400">{r.code}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-400 mb-4">{r.description || "Enterprise standard role definition."}</p>
                <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-800">
                  <span className="text-slate-500 font-mono">v{r.version}</span>
                  {r.is_system ? (
                    <Badge variant="info" className="flex items-center gap-1">
                      <Lock className="w-3 h-3" /> System Role
                    </Badge>
                  ) : (
                    <Badge variant="neutral">Custom Role</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Custom Role Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Enterprise Role">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createRoleMutation.mutate(formData);
          }}
          className="space-y-4"
        >
          <Input
            label="Role Name"
            placeholder="e.g. Regional Risk Officer"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="Role Code"
            placeholder="e.g. REGIONAL_RISK_OFFICER"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            required
          />
          <Input
            label="Description"
            placeholder="Role duties and scope..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={createRoleMutation.isPending}>
              {createRoleMutation.isPending ? "Creating..." : "Save Role"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
