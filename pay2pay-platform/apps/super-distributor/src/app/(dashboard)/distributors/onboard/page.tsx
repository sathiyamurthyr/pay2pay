"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  ChevronLeft,
  Building2,
  User,
  Phone,
  Mail,
  Lock,
  MapPin,
  FileText,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Eye,
  EyeOff
} from "lucide-react";
import { SuperDistributorAPI } from "@/services/super-distributor-api";

export default function OnboardDistributorPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    business_name: "",
    owner_name: "",
    mobile: "",
    email: "",
    password: "",
    confirm_password: "",
    state: "",
    city: "",
    address: "",
    pincode: "",
    gst_number: "",
    pan_number: "",
    bank_account_number: "",
    ifsc: "",
    credit_limit: 100000,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.business_name.trim()) return setError("Business / Shop Name is required.");
    if (!formData.owner_name.trim()) return setError("Owner Name is required.");
    if (!formData.mobile.trim() || formData.mobile.replace(/\D/g, "").length < 10) {
      return setError("Valid 10-digit mobile number is required.");
    }
    if (!formData.email.trim()) return setError("Email address is required.");
    if (!formData.password || formData.password.length < 8) {
      return setError("Password must be at least 8 characters long.");
    }
    if (formData.password !== formData.confirm_password) {
      return setError("Passwords do not match.");
    }
    if (!formData.state.trim() || !formData.city.trim() || !formData.address.trim() || !formData.pincode.trim()) {
      return setError("Full location address and PIN code are required.");
    }

    try {
      setSubmitting(true);
      const res = await SuperDistributorAPI.onboardDistributor({
        business_name: formData.business_name.trim(),
        owner_name: formData.owner_name.trim(),
        mobile: formData.mobile.replace(/\D/g, "").slice(-10),
        email: formData.email.trim(),
        password: formData.password,
        state: formData.state.trim(),
        city: formData.city.trim(),
        address: formData.address.trim(),
        pincode: formData.pincode.trim(),
        gst_number: formData.gst_number.trim() || undefined,
        pan_number: formData.pan_number.trim() || undefined,
        bank_account_number: formData.bank_account_number.trim() || undefined,
        ifsc: formData.ifsc.trim() || undefined,
        credit_limit: Number(formData.credit_limit) || 100000,
      });

      setSuccessData(res.data || res);
    } catch (err: any) {
      console.error("Distributor onboarding error:", err);
      setError(err?.response?.data?.detail || err?.message || "Failed to onboard distributor partner.");
    } finally {
      setSubmitting(false);
    }
  };

  if (successData) {
    return (
      <div className="max-w-xl mx-auto py-10 animate-in fade-in zoom-in-95 duration-300">
        <div className="p-8 rounded-3xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/[0.1] shadow-2xl text-center space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-black text-slate-100">Distributor Partner Onboarded!</h2>
            <p className="text-xs text-slate-400 mt-1">
              The distributor profile has been created and automatically mapped under your Master Distributor account.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.06] text-left text-xs space-y-2 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">Distributor Code:</span>
              <span className="text-amber-400 font-bold">{successData.distributor_code || "Generated"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Business Name:</span>
              <span className="text-slate-200">{formData.business_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Mobile / Login:</span>
              <span className="text-slate-200">{formData.mobile}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status:</span>
              <span className="text-amber-400 font-bold">{successData.status || "PENDING"}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs">
            Notice: Account status is <strong>PENDING</strong>. Once approved by Admin, the distributor can log in and begin operations.
          </div>

          <div className="pt-3 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setSuccessData(null);
                setFormData({
                  business_name: "",
                  owner_name: "",
                  mobile: "",
                  email: "",
                  password: "",
                  confirm_password: "",
                  state: "",
                  city: "",
                  address: "",
                  pincode: "",
                  gst_number: "",
                  pan_number: "",
                  bank_account_number: "",
                  ifsc: "",
                  credit_limit: 100000,
                });
              }}
              className="px-4 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] text-xs font-bold text-slate-300 transition-colors"
            >
              Add Another Partner
            </button>
            <Link
              href="/distributors"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-md shadow-amber-500/20 transition-all"
            >
              View Distributors List
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* ── BREADCRUMB ── */}
      <Link
        href="/distributors"
        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-amber-300 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Back to Distributors</span>
      </Link>

      {/* ── HEADER ── */}
      <div className="pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
            Onboard New Distributor
          </h1>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/10 text-emerald-400 border border-emerald-500/20">
            Auto-Mapped
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Create distributor credentials with password setup. The new distributor will automatically be linked under your Master Hub.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── FORM ── */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Business & Contact */}
        <div className="p-6 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.08] space-y-4 shadow-sm">
          <h2 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4" /> 1. Business & Contact Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Business / Enterprise Name *
              </label>
              <input
                type="text"
                name="business_name"
                required
                value={formData.business_name}
                onChange={handleChange}
                placeholder="e.g. Apex Distribution Hub"
                className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-400/50"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Owner / Authorized Person Name *
              </label>
              <input
                type="text"
                name="owner_name"
                required
                value={formData.owner_name}
                onChange={handleChange}
                placeholder="e.g. Rajesh Sharma"
                className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-400/50"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Mobile Number (Login ID) *
              </label>
              <input
                type="tel"
                name="mobile"
                required
                maxLength={10}
                value={formData.mobile}
                onChange={handleChange}
                placeholder="10-digit mobile number"
                className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-400/50"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="distributor@pay2pay.in"
                className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-400/50"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Password Setup (No PIN) */}
        <div className="p-6 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.08] space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
              <Lock className="w-4 h-4" /> 2. Password Setup (No PIN Required)
            </h2>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-[11px] text-slate-400 hover:text-amber-300 flex items-center gap-1"
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showPassword ? "Hide" : "Show"} Passwords</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Login Password (Min 8 Chars) *
              </label>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                required
                minLength={8}
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-400/50"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Confirm Password *
              </label>
              <input
                type={showPassword ? "text" : "password"}
                name="confirm_password"
                required
                minLength={8}
                value={formData.confirm_password}
                onChange={handleChange}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-400/50"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Location Address */}
        <div className="p-6 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.08] space-y-4 shadow-sm">
          <h2 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4" /> 3. Address & Location
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Full Street Address *
              </label>
              <textarea
                name="address"
                required
                rows={2}
                value={formData.address}
                onChange={handleChange}
                placeholder="Shop / Office No, Building, Area"
                className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-400/50"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">State *</label>
              <input
                type="text"
                name="state"
                required
                value={formData.state}
                onChange={handleChange}
                placeholder="e.g. Tamil Nadu"
                className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-400/50"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">City *</label>
              <input
                type="text"
                name="city"
                required
                value={formData.city}
                onChange={handleChange}
                placeholder="e.g. Chennai"
                className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-400/50"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">PIN Code *</label>
              <input
                type="text"
                name="pincode"
                required
                maxLength={6}
                value={formData.pincode}
                onChange={handleChange}
                placeholder="e.g. 600001"
                className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-400/50"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Optional KYC & Banking */}
        <div className="p-6 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.08] space-y-4 shadow-sm">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" /> 4. KYC & Banking (Optional)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">PAN Number</label>
              <input
                type="text"
                name="pan_number"
                maxLength={10}
                value={formData.pan_number}
                onChange={handleChange}
                placeholder="ABCDE1234F"
                className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-400/50 uppercase"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">GST Number</label>
              <input
                type="text"
                name="gst_number"
                maxLength={15}
                value={formData.gst_number}
                onChange={handleChange}
                placeholder="33AAAAA0000A1Z5"
                className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-400/50 uppercase"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Bank Account No.</label>
              <input
                type="text"
                name="bank_account_number"
                value={formData.bank_account_number}
                onChange={handleChange}
                placeholder="Account number"
                className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-400/50"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">IFSC Code</label>
              <input
                type="text"
                name="ifsc"
                value={formData.ifsc}
                onChange={handleChange}
                placeholder="e.g. HDFC0001234"
                className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-400/50 uppercase"
              />
            </div>
          </div>
        </div>

        {/* ── SUBMIT BUTTON ── */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <Link
            href="/distributors"
            className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-bold text-slate-300 hover:bg-white/[0.08] transition-colors"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-md shadow-amber-500/20 transition-all disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Onboarding Distributor...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Submit & Onboard Partner</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
