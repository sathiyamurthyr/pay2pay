"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Building2, Plus, Search, CheckCircle, ShieldAlert } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function CompaniesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", code: "", tax_id: "", email: "", phone: "" });
  const [error, setError] = useState<string | null>(null);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const res = await apiClient.get("/companies");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiClient.post("/companies", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setIsModalOpen(false);
      setFormData({ name: "", code: "", tax_id: "", email: "", phone: "" });
      setError(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || "Failed to create company");
    },
  });

  const filteredCompanies = companies.filter(
    (c: any) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Company Management</h1>
          <p className="text-xs text-slate-400 mt-1">Tenant Child Enterprise Units & Tax Compliance Profiles</p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Company
        </Button>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div className="relative w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <Input
                placeholder="Search by company name or code..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <p className="text-xs text-slate-400 font-mono">Total Companies: {filteredCompanies.length}</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Company Name</th>
                  <th className="py-3.5 px-4 font-semibold">Code</th>
                  <th className="py-3.5 px-4 font-semibold">Tax ID</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Version</th>
                  <th className="py-3.5 px-4 font-semibold">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">Loading enterprise companies...</td>
                  </tr>
                ) : filteredCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">No companies found. Click Add Company to register.</td>
                  </tr>
                ) : (
                  filteredCompanies.map((comp: any) => (
                    <tr key={comp.public_id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-medium text-white flex items-center gap-2.5">
                        <Building2 className="w-4 h-4 text-blue-400" />
                        <span>{comp.name}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-blue-400">{comp.code}</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-400">{comp.tax_id || "N/A"}</td>
                      <td className="py-3.5 px-4">
                        <Badge variant={comp.status === "ACTIVE" ? "success" : "neutral"}>{comp.status}</Badge>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-400">v{comp.version}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">{formatDate(comp.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Company Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register Enterprise Company">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(formData);
          }}
          className="space-y-4"
        >
          <Input
            label="Company Name"
            placeholder="e.g. Retailer Enterprise Ltd"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="Company Code"
            placeholder="e.g. COMP_001"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            required
          />
          <Input
            label="Tax Identification Number (Tax ID)"
            placeholder="e.g. TAX-9940-001"
            value={formData.tax_id}
            onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Save Company"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
