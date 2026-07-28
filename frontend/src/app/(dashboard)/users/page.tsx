"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Users, UserPlus, Search, Shield, ShieldAlert } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    full_name: "",
    phone: "",
    role_ids: [] as string[],
  });
  const [error, setError] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await apiClient.get("/users");
      return res.data;
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await apiClient.get("/roles");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiClient.post("/users", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsModalOpen(false);
      setFormData({ email: "", username: "", password: "", full_name: "", phone: "", role_ids: [] });
      setError(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || "Failed to create admin user");
    },
  });

  const filteredUsers = users.filter(
    (u: any) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Admin User Management</h1>
          <p className="text-xs text-slate-400 mt-1">Enterprise Admin Users & RBAC Role Assignments</p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <UserPlus className="w-4 h-4 mr-1.5" /> Create Admin User
        </Button>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div className="relative w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <Input
                placeholder="Search users by name, email..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <p className="text-xs text-slate-400 font-mono">Total Users: {filteredUsers.length}</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">User Details</th>
                  <th className="py-3.5 px-4 font-semibold">Username</th>
                  <th className="py-3.5 px-4 font-semibold">Assigned Roles</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">MFA</th>
                  <th className="py-3.5 px-4 font-semibold">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">Loading admin users...</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">No admin users found.</td>
                  </tr>
                ) : (
                  filteredUsers.map((u: any) => (
                    <tr key={u.public_id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-blue-400">
                            {u.full_name?.charAt(0) || "U"}
                          </div>
                          <div>
                            <p className="font-medium text-white text-xs">{u.full_name}</p>
                            <p className="text-[11px] text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-blue-400">{u.username}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {u.roles?.map((r: any) => (
                            <Badge key={r.public_id || r.code} variant="info" className="text-[10px]">
                              {r.name}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={u.status === "ACTIVE" ? "success" : "danger"}>{u.status}</Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={u.mfa_enabled ? "success" : "neutral"}>
                          {u.mfa_enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">{formatDate(u.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create User Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Enterprise Admin User">
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
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Full Name"
              placeholder="e.g. John Doe"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
            <Input
              label="Username"
              placeholder="e.g. jdoe"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="jdoe@pay2pay.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <Input
              label="Initial Password"
              type="password"
              placeholder="Min 8 chars"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">Assign Enterprise Roles</label>
            <div className="space-y-2 max-h-36 overflow-y-auto p-3 rounded-xl bg-slate-900 border border-slate-800">
              {roles.map((r: any) => (
                <label key={r.public_id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.role_ids.includes(r.public_id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, role_ids: [...formData.role_ids, r.public_id] });
                      } else {
                        setFormData({ ...formData, role_ids: formData.role_ids.filter((id) => id !== r.public_id) });
                      }
                    }}
                    className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-semibold text-white">{r.name}</span>
                  <span className="text-[10px] text-slate-500">({r.code})</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating User..." : "Save Admin User"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
