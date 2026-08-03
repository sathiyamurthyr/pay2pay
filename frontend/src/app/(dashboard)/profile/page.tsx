"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { 
  UserCircle, Key, Shield, Smartphone, Bell, Laptop, Plus, Copy, Check, ShieldCheck, AlertCircle
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function ProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"profile" | "password" | "sessions" | "apikeys" | "security">("profile");

  // Profile Form state
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password Change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // API Key state
  const [apiKeyName, setApiKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch active sessions
  const { data: sessions = [] } = useQuery({
    queryKey: ["user-sessions"],
    queryFn: async () => {
      const res = await apiClient.get("/profile/sessions");
      return res.data;
    },
    enabled: activeTab === "sessions",
  });

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.put("/profile", { full_name: fullName });
      return res.data;
    },
    onSuccess: () => {
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/profile/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      return res.data;
    },
    onSuccess: () => {
      setPasswordSuccess(true);
      setPasswordError(null);
      setCurrentPassword("");
      setNewPassword("");
      setTimeout(() => setPasswordSuccess(false), 3000);
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === "string" ? detail : (Array.isArray(detail) ? detail.map((d: any) => d?.msg || String(d)).join("; ") : (detail?.msg || err.message || "Failed to change password."));
      setPasswordError(msg);
    },
  });

  const createApiKeyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/profile/api-keys", { name: apiKeyName, scopes: ["read", "write"] });
      return res.data;
    },
    onSuccess: (data) => {
      setGeneratedKey(data.secret_key);
      setApiKeyName("");
    },
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Account & Security Center</h1>
        <p className="text-xs text-slate-400 mt-1">Manage Profile, Sessions, Security Credentials & API Keys</p>
      </div>

      {/* Profile Navigation Tabs */}
      <div className="flex bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
            activeTab === "profile" ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-slate-400 hover:text-white"
          }`}
        >
          <UserCircle className="w-4 h-4" /> My Profile
        </button>
        <button
          onClick={() => setActiveTab("password")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
            activeTab === "password" ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-slate-400 hover:text-white"
          }`}
        >
          <Key className="w-4 h-4" /> Change Password
        </button>
        <button
          onClick={() => setActiveTab("sessions")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
            activeTab === "sessions" ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-slate-400 hover:text-white"
          }`}
        >
          <Laptop className="w-4 h-4" /> Active Sessions
        </button>
        <button
          onClick={() => setActiveTab("apikeys")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
            activeTab === "apikeys" ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-slate-400 hover:text-white"
          }`}
        >
          <Shield className="w-4 h-4" /> API Keys
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
            activeTab === "security" ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-slate-400 hover:text-white"
          }`}
        >
          <Smartphone className="w-4 h-4" /> MFA Security
        </button>
      </div>

      {/* Tab 1: My Profile */}
      {activeTab === "profile" && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>My Profile Information</CardTitle>
            <CardDescription>Personal details and assigned enterprise scope</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-w-lg">
            {profileSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <Check className="w-4 h-4" /> Profile updated successfully!
              </div>
            )}
            <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <Input label="Email Address" value={user?.email || ""} disabled className="opacity-60 bg-slate-950" />
            <Input label="Tenant ID" value={user?.tenant_id || ""} disabled className="opacity-60 bg-slate-950 font-mono text-xs" />
            <Button variant="primary" onClick={() => updateProfileMutation.mutate()} disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending ? "Saving..." : "Save Profile Changes"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Change Password */}
      {activeTab === "password" && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Ensure your password is at least 8 characters with strong complexity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-w-lg">
            {passwordError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <Check className="w-4 h-4" /> Password changed successfully!
              </div>
            )}
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Button
              variant="primary"
              onClick={() => changePasswordMutation.mutate()}
              disabled={changePasswordMutation.isPending || !currentPassword || !newPassword}
            >
              {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Active Sessions */}
      {activeTab === "sessions" && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Active User Sessions</CardTitle>
            <CardDescription>View and manage all active sessions authenticated with your credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sessions.map((s: any) => (
                <div key={s.public_id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                      <Laptop className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">Current Web Session ({s.ip_address || "127.0.0.1"})</p>
                      <p className="text-[11px] text-slate-400 font-mono">Token JTI: {s.token_jti.substring(0, 16)}...</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Created: {formatDate(s.created_at)}</p>
                    </div>
                  </div>
                  <Badge variant="success">Active Session</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 4: API Keys */}
      {activeTab === "apikeys" && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Developer & Integration API Keys</CardTitle>
            <CardDescription>Generate secret API keys for automated programmatic integration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-3 max-w-lg">
              <Input
                placeholder="Key Description (e.g. Settlement Microservice)"
                value={apiKeyName}
                onChange={(e) => setApiKeyName(e.target.value)}
              />
              <Button
                variant="primary"
                onClick={() => createApiKeyMutation.mutate()}
                disabled={!apiKeyName || createApiKeyMutation.isPending}
              >
                <Plus className="w-4 h-4 mr-1" /> Generate
              </Button>
            </div>

            {generatedKey && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                <p className="text-xs font-semibold text-emerald-400">API Key Generated! Copy this secret key now (it will not be shown again):</p>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 font-mono text-xs text-white">
                  <span>{generatedKey}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedKey);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 5: MFA Security */}
      {activeTab === "security" && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Multi-Factor Authentication (MFA)</CardTitle>
            <CardDescription>Enhance login security with Time-based One-Time Passwords (TOTP)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-w-lg">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white">MFA Authentication Status</p>
                <p className="text-[11px] text-slate-400">TOTP Authenticator app enforcement</p>
              </div>
              <Badge variant={user?.mfa_enabled ? "success" : "neutral"}>
                {user?.mfa_enabled ? "Enabled" : "MFA Ready"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
