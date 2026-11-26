"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, KeyRound, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import DemoShell from "@/components/inspel-demo/DemoShell";
import { loginVendor, resolveDemoPath, saveDemoSession } from "@/lib/inspel-demo-api";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next");

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fillDemoCredentials = () => {
    setUserId("9876512345");
    setPassword("Demo2026!");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await loginVendor({ user_id: userId, password });
      saveDemoSession(res.access_token, res.vendor);
      const target =
        nextUrl && nextUrl.startsWith("/") ? nextUrl : resolveDemoPath("/catalogue");
      router.push(target);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto py-14 px-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-blue-900/5 overflow-hidden">
        <div className="bg-gradient-to-r from-[#040E2B] to-[#1A56DB] px-7 py-6 text-white">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-200 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Vendor Authentication
          </div>
          <h1 className="text-2xl font-bold">Sign in to INSPEL Portal</h1>
          <p className="text-xs text-blue-100/90 mt-1">
            Access all 8 payment products, checkout, and isolated purchase history.
          </p>
        </div>

        <div className="p-7 space-y-5">
          <div className="p-4 rounded-xl bg-[#F0F4FF] border border-blue-200 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#040E2B] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#1A56DB]" />
                Demo Vendor Credentials
              </span>
              <button
                type="button"
                onClick={fillDemoCredentials}
                className="px-2.5 py-1 rounded-lg bg-[#1A56DB] hover:bg-[#1648C8] text-white text-[11px] font-semibold cursor-pointer"
              >
                Auto-Fill Demo
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
              <div>
                <span className="text-slate-500">User ID:</span>{" "}
                <span className="font-mono font-semibold">9876512345</span>
              </div>
              <div>
                <span className="text-slate-500">Password:</span>{" "}
                <span className="font-mono font-semibold">Demo2026!</span>
              </div>
              <div className="col-span-2 text-[11px] text-slate-500">
                Account: demoUser (contact@inspeltech.com)
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mobile Number / User ID or Email
              </label>
              <input
                type="text"
                required
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="9876512345 or contact@inspeltech.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#1A56DB] focus:ring-2 focus:ring-blue-100 outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter vendor password"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 focus:border-[#1A56DB] focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#1A56DB] hover:bg-[#1648C8] disabled:opacity-60 text-white font-semibold text-sm shadow-sm transition-colors cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  Sign In &amp; Open Catalogue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-600 pt-2">
            New prospective vendor?{" "}
            <Link
              href={resolveDemoPath(
                nextUrl ? `/register?next=${encodeURIComponent(nextUrl)}` : "/register"
              )}
              className="text-[#1A56DB] font-semibold hover:underline"
            >
              Create a vendor account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function InspelDemoLoginPage() {
  return (
    <DemoShell>
      <Suspense fallback={<div className="p-16 text-center text-sm text-slate-500">Loading login...</div>}>
        <LoginFormContent />
      </Suspense>
    </DemoShell>
  );
}
