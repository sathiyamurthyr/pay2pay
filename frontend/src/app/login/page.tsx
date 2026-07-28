"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CreditCard, Lock, Mail, ShieldAlert, KeyRound } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [emailOrUsername, setEmailOrUsername] = useState("admin@pay2pay.com");
  const [password, setPassword] = useState("AivioSathus!321");
  const [mfaCode, setMfaCode] = useState("");
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await login(emailOrUsername, password, mfaCode || undefined);
      if (res?.requires_mfa) {
        setRequiresMfa(true);
        setError("MFA authentication code required to proceed.");
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Authentication failed. Invalid credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#090d16] relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="glass-panel w-full max-w-md p-8 rounded-2xl shadow-2xl border border-slate-800 relative z-10 bg-slate-900/85">
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 items-center justify-center shadow-lg shadow-blue-500/30 mb-4">
            <CreditCard className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Enterprise Admin Portal</h2>
          <p className="text-xs text-slate-400 mt-1">Retailer Multi-Tenant Swipe Settlement Platform</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-400 text-xs">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!requiresMfa ? (
            <>
              <div>
                <Input
                  label="Email address or Username"
                  type="text"
                  placeholder="admin@pay2pay.com"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  required
                />
              </div>
              <div>
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </>
          ) : (
            <div>
              <Input
                label="MFA Authenticator Code"
                type="text"
                placeholder="6-digit code"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                maxLength={6}
                required
              />
            </div>
          )}

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
              <input type="checkbox" className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500" />
              <span>Remember session</span>
            </label>
            <Link href="/forgot-password" className="text-blue-400 hover:text-blue-300 transition font-medium">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" variant="primary" size="lg" className="w-full mt-2" disabled={submitting}>
            {submitting ? "Authenticating..." : requiresMfa ? "Verify MFA Code" : "Sign In to Admin Portal"}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800 text-center text-[11px] text-slate-500">
          Strict RBAC Authorization & Tenant Isolation Active
        </div>
      </div>
    </div>
  );
}
