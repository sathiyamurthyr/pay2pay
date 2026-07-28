"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import {
  Store,
  ChevronLeft,
  Building,
  CreditCard,
  FileCheck,
  Wallet,
  History,
  ShieldCheck,
  CheckCircle,
  XCircle,
  RefreshCw,
  Phone,
  Mail,
  MapPin
} from "lucide-react";

export default function RetailerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const retailerId = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"store" | "contact" | "bank" | "kyc" | "wallet" | "history">("store");
  const [approvalComments, setApprovalComments] = useState("");

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/v1/retailers/${retailerId}`);
      setData(res.data);
    } catch (err) {
      console.error("Failed to load retailer details", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (retailerId) fetchDetails();
  }, [retailerId]);

  const handleApprovalAction = async (action: "APPROVE" | "REJECT") => {
    try {
      await api.post(`/api/v1/retailers/${retailerId}/approve`, {
        action,
        comments: approvalComments || `${action}D via Enterprise Portal`
      });
      fetchDetails();
    } catch (err: any) {
      alert(err.response?.data?.detail || `Failed to ${action} retailer`);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-3 text-emerald-400">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="text-lg font-medium">Loading Retailer Profile...</span>
        </div>
      </div>
    );
  }

  const { retailer, contacts, addresses, banks, kyc, wallet, status_history, approvals } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/retailers"
            className="flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900 p-2.5 text-slate-400 hover:text-slate-200"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-100">{retailer.store_name}</h1>
              <span className="font-mono text-xs text-emerald-400 font-semibold px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                {retailer.retailer_code}
              </span>
              <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {retailer.status}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">Legal Name: {retailer.legal_name} | Owner: {retailer.owner_name}</p>
          </div>
        </div>

        {/* Approval Actions */}
        {retailer.status === "PENDING_APPROVAL" && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleApprovalAction("APPROVE")}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 shadow-lg"
            >
              <CheckCircle className="h-4 w-4" />
              Approve KYC & Activate
            </button>
            <button
              onClick={() => handleApprovalAction("REJECT")}
              className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 shadow-lg"
            >
              <XCircle className="h-4 w-4" />
              Reject Application
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-950/40 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("store")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "store" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Store className="h-4 w-4" /> Store Details
        </button>
        <button
          onClick={() => setActiveTab("contact")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "contact" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Phone className="h-4 w-4" /> Contact & Address
        </button>
        <button
          onClick={() => setActiveTab("bank")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "bank" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <CreditCard className="h-4 w-4" /> Banking & Settlement
        </button>
        <button
          onClick={() => setActiveTab("kyc")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "kyc" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileCheck className="h-4 w-4" /> KYC Verification
        </button>
        <button
          onClick={() => setActiveTab("wallet")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "wallet" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Wallet className="h-4 w-4" /> Wallet & Limits
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "history" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <History className="h-4 w-4" /> Status History
        </button>
      </div>

      {/* Tab Contents */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-2xl">
        {activeTab === "store" && (
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <span className="text-xs text-slate-400 font-mono">Retailer Code</span>
              <div className="font-mono text-emerald-400 font-semibold">{retailer.retailer_code}</div>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-mono">Business Category</span>
              <div className="text-slate-200 font-medium">{retailer.business_category}</div>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-mono">Store Type</span>
              <div className="text-slate-200 font-medium">{retailer.store_type}</div>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-mono">Onboarded Date</span>
              <div className="text-slate-200 font-medium">{new Date(retailer.created_date).toLocaleDateString()}</div>
            </div>
          </div>
        )}

        {activeTab === "contact" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-200 mb-3">Primary Contact Persons</h3>
              {contacts.map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/40">
                  <div>
                    <div className="font-medium text-slate-100">{c.primary_contact}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-emerald-400" /> {c.mobile}</span>
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-blue-400" /> {c.email}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-200 mb-3">Outlet Address</h3>
              {addresses.map((a: any, i: number) => (
                <div key={i} className="p-3 rounded-lg border border-slate-800 bg-slate-950/40 text-xs text-slate-300">
                  <div className="flex items-center gap-2 text-slate-100 font-semibold mb-1">
                    <MapPin className="h-4 w-4 text-emerald-400" /> {a.city}, {a.state} - {a.pincode}
                  </div>
                  <div>{a.address}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "bank" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">Settlement Bank Account</h3>
            {banks.map((b: any, i: number) => (
              <div key={i} className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-slate-800 bg-slate-950/40 text-sm">
                <div>
                  <span className="text-xs text-slate-400">Bank Name</span>
                  <div className="font-semibold text-slate-100">{b.bank_name}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Account Holder</span>
                  <div className="text-slate-200">{b.account_holder}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Account Number</span>
                  <div className="font-mono text-emerald-400 font-semibold">{b.account_number}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-400">IFSC Code</span>
                  <div className="font-mono text-slate-200">{b.ifsc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "kyc" && (
          <div className="space-y-4 text-sm">
            <h3 className="font-semibold text-slate-200">KYC Identification Numbers</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                <span className="text-xs text-slate-400">PAN Number</span>
                <div className="font-mono text-lg font-bold text-slate-100">{kyc?.pan || "N/A"}</div>
              </div>
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                <span className="text-xs text-slate-400">GST Number</span>
                <div className="font-mono text-lg font-bold text-slate-100">{kyc?.gst || "N/A"}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "wallet" && (
          <div className="space-y-4 text-sm">
            <h3 className="font-semibold text-slate-200">Wallet Balance & Limits</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                <span className="text-xs text-slate-400">Wallet Float Balance</span>
                <div className="font-mono text-2xl font-bold text-emerald-400">₹{wallet?.balance.toLocaleString("en-IN") || 0}</div>
              </div>
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                <span className="text-xs text-slate-400">Daily Transaction Limit</span>
                <div className="font-mono text-lg font-semibold text-slate-200">₹{wallet?.daily_limit.toLocaleString("en-IN") || 0}</div>
              </div>
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                <span className="text-xs text-slate-400">Single Transaction Limit</span>
                <div className="font-mono text-lg font-semibold text-slate-200">₹{wallet?.single_limit.toLocaleString("en-IN") || 0}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-3 text-xs">
            <h3 className="font-semibold text-slate-200 text-sm mb-2">Status Audit Trail</h3>
            {status_history.map((h: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/40">
                <div>
                  <span className="font-semibold text-slate-100">{h.previous}</span> → <span className="font-semibold text-emerald-400">{h.new}</span>
                  <div className="text-slate-400 mt-0.5">{h.reason}</div>
                </div>
                <div className="text-right text-slate-500 font-mono">
                  <div>{h.by}</div>
                  <div>{new Date(h.date).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
