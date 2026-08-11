"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KeyRound, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#090d16]">
      <div className="glass-panel w-full max-w-md p-8 rounded-2xl shadow-2xl border border-slate-800 bg-slate-900/85">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 items-center justify-center mb-3">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Reset Password</h2>
          <p className="text-xs text-slate-400 mt-1">Enter your email address to receive reset instructions</p>
        </div>

        {submitted ? (
          <div className="text-center py-4 space-y-4">
            <div className="inline-flex w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-sm text-slate-200">Password reset link has been dispatched to <span className="font-semibold text-white">{email}</span>.</p>
            <Link href="/login">
              <Button variant="outline" className="w-full mt-4">
                Back to Sign In
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Enterprise Email Address"
              type="email"
              placeholder="admin@pay2pay.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" variant="primary" className="w-full">
              Send Password Reset Link
            </Button>
            <div className="text-center pt-2">
              <Link href="/login" className="inline-flex items-center text-xs text-slate-400 hover:text-white transition">
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
