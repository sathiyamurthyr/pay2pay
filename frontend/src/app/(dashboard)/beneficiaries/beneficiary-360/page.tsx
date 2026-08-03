"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Building2, ShieldCheck, FileText, Sliders, ShieldAlert, Users, 
  History, Settings, CheckCircle2, Clock, ArrowLeft, CreditCard, Send, Sparkles, RefreshCw
} from "lucide-react";
import Link from "next/link";
import apiClient from "@/lib/api";

export default function Beneficiary360Page() {
  const searchParams = useSearchParams();
  const beneficiaryId = searchParams.get("id");

  const [b360, setB360] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "pennydrop" | "upi" | "services" | "limits" | "risk" | "timeline">("overview");

  // Penny Drop Modal State
  const [verifying, setVerifying] = useState(false);
  const [verifResult, setVerifResult] = useState<any>(null);

  const fetchBeneficiary360 = async () => {
    if (!beneficiaryId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/beneficiaries/${beneficiaryId}/360`);
      setB360(res.data.data);
    } catch (err) {
      console.error("Failed to fetch beneficiary 360", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeneficiary360();
  }, [beneficiaryId]);

  const handlePennyDropTest = async () => {
    if (!beneficiaryId || !b360?.bank_accounts?.[0]) return;
    const bank = b360.bank_accounts[0];
    setVerifying(true);
    setVerifResult(null);

    try {
      const res = await apiClient.post(`/beneficiaries/${beneficiaryId}/verify/bank`, {
        account_number: bank.account_number_masked || "987654321",
        ifsc_code: bank.ifsc_code || "HDFC0001234",
        account_holder_name: bank.account_holder_name,
        bank_name: bank.bank_name,
        perform_penny_drop: true,
      });
      setVerifResult(res.data.data);
      fetchBeneficiary360();
    } catch (err) {
      console.error("Penny drop verification failed", err);
    } finally {
      setVerifying(false);
    }
  };

  if (!beneficiaryId) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>No beneficiary ID provided.</p>
        <Link href="/beneficiaries" className="text-indigo-400 hover:underline mt-2 inline-block">
          Return to Beneficiary Directory
        </Link>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading Beneficiary 360° Profile...</div>;
  }

  const beneficiary = b360?.beneficiary;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <Link href="/beneficiaries" className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Beneficiary 360° Inspection Engine
          </h1>
          <p className="text-xs text-slate-400">
            ID: <span className="font-mono text-indigo-400">{beneficiary?.beneficiary_number}</span> | Customer ID: {beneficiary?.customer_id}
          </p>
        </div>
      </div>

      {/* Profile Header Banner */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-900/80 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-500/20">
            {beneficiary?.full_name?.charAt(0) || "B"}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white">{beneficiary?.full_name}</h2>
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                {beneficiary?.relationship}
              </span>
              <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                beneficiary?.beneficiary_status === "ACTIVE" 
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              }`}>
                {beneficiary?.beneficiary_status}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-400">
              <span>Verification: <strong className="text-slate-200">{beneficiary?.verification_status}</strong></span>
              <span>Category: <strong className="text-slate-200">{beneficiary?.beneficiary_category}</strong></span>
              <span>Risk: <strong className={beneficiary?.risk_category === "HIGH" ? "text-rose-400" : "text-emerald-400"}>{beneficiary?.risk_category}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePennyDropTest}
            disabled={verifying}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-emerald-600/20"
          >
            <Sparkles className={`w-4 h-4 ${verifying ? "animate-spin" : ""}`} /> 
            {verifying ? "Verifying..." : "Run Penny Drop Test"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 overflow-x-auto pb-1">
        {[
          { id: "overview", label: "360° Overview", icon: Building2 },
          { id: "pennydrop", label: "Penny Drop Verification", icon: ShieldCheck },
          { id: "upi", label: "UPI Handles", icon: Send },
          { id: "services", label: "Service Eligibility", icon: Settings },
          { id: "limits", label: "Limit Hierarchy", icon: Sliders },
          { id: "risk", label: "Risk Scorecard", icon: ShieldAlert },
          { id: "timeline", label: "Audit Timeline", icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                isActive
                  ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
            <h3 className="text-base font-semibold text-white">Registered Bank Accounts</h3>
            {b360?.bank_accounts?.length === 0 ? (
              <p className="text-xs text-slate-500">No bank accounts linked.</p>
            ) : (
              b360?.bank_accounts?.map((acc: any) => (
                <div key={acc.public_id} className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-indigo-400">
                    <span>{acc.bank_name} ({acc.account_type})</span>
                    {acc.is_primary && <span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded">PRIMARY</span>}
                  </div>
                  <p className="text-sm font-mono text-white">{acc.account_number_masked}</p>
                  <p className="text-xs text-slate-400">IFSC: <strong className="text-slate-200 font-mono">{acc.ifsc_code}</strong> | Holder: {acc.account_holder_name}</p>
                </div>
              ))
            )}
          </div>

          <div className="glass-card p-6 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
            <h3 className="text-base font-semibold text-white">Registered UPI VPA Handles</h3>
            {b360?.upis?.length === 0 ? (
              <p className="text-xs text-slate-500">No UPI handles linked.</p>
            ) : (
              b360?.upis?.map((u: any) => (
                <div key={u.public_id} className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block">{u.provider_app || "UPI App"}</span>
                    <span className="text-sm font-mono text-white">{u.upi_id}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {u.verification_status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Penny Drop */}
      {activeTab === "pennydrop" && (
        <div className="glass-card p-6 rounded-xl border border-slate-800 bg-slate-900/60 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Penny Drop Bank Verification Engine</h3>
              <p className="text-xs text-slate-400">Real-time ₹1 credit validation & SequenceMatcher fuzzy name scoring</p>
            </div>
            <button
              onClick={handlePennyDropTest}
              disabled={verifying}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium"
            >
              {verifying ? "Testing..." : "Execute Penny Drop"}
            </button>
          </div>

          {verifResult && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 space-y-1">
              <p className="font-semibold text-sm">Penny Drop Executed Successfully</p>
              <p className="text-xs">Bank Ref: {verifResult.penny_drop_ref} | Name Returned: {verifResult.name_returned_by_bank}</p>
              <p className="text-xs">Fuzzy Match Score: <strong>{verifResult.name_match_score}%</strong> ({verifResult.is_name_matched ? "MATCHED" : "MISMATCH"})</p>
            </div>
          )}

          <div className="space-y-3">
            {b360?.verifications?.map((v: any) => (
              <div key={v.verification_id} className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-xs text-slate-400 block">Ref: {v.penny_drop_ref || "N/A"}</span>
                  <span className="text-sm font-medium text-white">Bank Returned: {v.name_returned_by_bank || "N/A"}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-emerald-400 block">{v.name_match_score}% Score</span>
                  <span className="text-xs text-slate-400">{v.verification_status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Limits */}
      {activeTab === "limits" && (
        <div className="glass-card p-6 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
          <h3 className="text-base font-semibold text-white">9-Tier Limit Hierarchy</h3>
          <p className="text-xs text-slate-400">Platform &gt; Company &gt; RM &gt; SD &gt; Distributor &gt; Retailer &gt; Customer Category &gt; Beneficiary Category &gt; Individual Override ("Nearest Configuration Wins")</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800">
              <span className="text-xs text-slate-400">Single Txn Cap</span>
              <p className="text-lg font-bold text-white mt-1">₹50,000</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800">
              <span className="text-xs text-slate-400">Daily Amount Cap</span>
              <p className="text-lg font-bold text-white mt-1">₹2,00,000</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800">
              <span className="text-xs text-slate-400">Monthly Amount Cap</span>
              <p className="text-lg font-bold text-white mt-1">₹10,00,000</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 7: Timeline */}
      {activeTab === "timeline" && (
        <div className="glass-card p-6 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
          <h3 className="text-base font-semibold text-white">Audit Activity Log</h3>
          <div className="space-y-3">
            {b360?.timeline?.map((t: any) => (
              <div key={t.public_id} className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 flex justify-between items-center">
                <div>
                  <p className="text-sm font-semibold text-white">{t.event_title}</p>
                  <p className="text-xs text-slate-400">{t.event_description}</p>
                </div>
                <span className="text-xs font-mono text-slate-500">{new Date(t.event_timestamp).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
