"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Building2, Loader2, UserPlus } from "lucide-react";
import DemoShell from "@/components/inspel-demo/DemoShell";
import { registerVendor, resolveDemoPath, saveDemoSession } from "@/lib/inspel-demo-api";

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next");

  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await registerVendor({
        name,
        company_name: companyName,
        email,
        mobile,
        password,
      });
      saveDemoSession(res.access_token, res.vendor);
      const target =
        nextUrl && nextUrl.startsWith("/") ? nextUrl : resolveDemoPath("/catalogue");
      router.push(target);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg w-full mx-auto py-12 px-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-blue-900/5 overflow-hidden">
        <div className="bg-gradient-to-r from-[#040E2B] to-[#1A56DB] px-7 py-6 text-white">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-200 uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4 text-emerald-400" />
            Vendor Onboarding
          </div>
          <h1 className="text-2xl font-bold">Register Vendor Account</h1>
          <p className="text-xs text-blue-100/90 mt-1">
            Each vendor receives an isolated account, order history, and downloadable GST receipts.
          </p>
        </div>

        <div className="p-7 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Vendor Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Arjun Kumar"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#1A56DB] focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  10-Digit Mobile / User ID
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                  placeholder="9876543210"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#1A56DB] focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Company / Organization Name
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Retail Solutions Pvt Ltd"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#1A56DB] focus:ring-2 focus:ring-blue-100 outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Work Email ID
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vendor@company.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#1A56DB] focus:ring-2 focus:ring-blue-100 outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password (min 6 characters)
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a secure password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#1A56DB] focus:ring-2 focus:ring-blue-100 outline-none text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#1A56DB] hover:bg-[#1648C8] disabled:opacity-60 text-white font-semibold text-sm shadow-sm transition-colors cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Register &amp; Browse Products
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-600 pt-2">
            Already registered?{" "}
            <Link
              href={resolveDemoPath(
                nextUrl ? `/login?next=${encodeURIComponent(nextUrl)}` : "/login"
              )}
              className="text-[#1A56DB] font-semibold hover:underline"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function InspelDemoRegisterPage() {
  return (
    <DemoShell>
      <Suspense fallback={<div className="p-16 text-center text-sm text-slate-500">Loading registration...</div>}>
        <RegisterFormContent />
      </Suspense>
    </DemoShell>
  );
}
