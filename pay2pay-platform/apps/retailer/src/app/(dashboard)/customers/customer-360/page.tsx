"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  User, ShieldCheck, FileText, Sliders, ShieldAlert, Users, 
  History, Settings, CheckCircle2, Clock, UploadCloud, Plus, AlertCircle, Ban, ArrowLeft
} from "lucide-react";
import Link from "next/link";
import apiClient from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { BlurImage } from "@/components/ui/blur-image";
import { KNOWN_BLURHASHES } from "@/lib/blurhash";

function Customer360Content() {
  const { isRetailer, isAdmin, activeRole } = useAuth();
  const searchParams = useSearchParams();
  const customerId = searchParams.get("id");

  const [c360, setC360] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "kyc" | "documents" | "services" | "limits" | "risk" | "relationships" | "timeline"
  >("overview");

  // Status Change Modal State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("ACTIVE");
  const [statusReason, setStatusReason] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);

  const fetchCustomer360 = async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/customers/${customerId}/360`);
      setC360(res.data.data);
    } catch (err) {
      console.error("Failed to fetch customer 360", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer360();
  }, [customerId]);

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return;
    setStatusUpdating(true);
    try {
      await apiClient.patch(`/customers/${customerId}/status`, {
        to_status: newStatus,
        reason: statusReason,
      });
      setShowStatusModal(false);
      setStatusReason("");
      fetchCustomer360();
    } catch (err) {
      console.error("Failed to update status", err);
    } finally {
      setStatusUpdating(false);
    }
  };

  if (!customerId) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>No customer ID provided.</p>
        <Link href="/customers" className="text-blue-400 hover:underline mt-2 inline-block">
          Return to Customer Directory
        </Link>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading Customer 360° Profile...</div>;
  }

  const customer = c360?.customer;

  return (
    <div className="max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center gap-3">
        <Link href="/customers" className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Customer 360° Single Source of Truth
          </h1>
          <p className="text-xs text-slate-400">
            ID: <span className="font-mono text-blue-400">{customer?.customer_number}</span> | Public ID: {customer?.public_id}
          </p>
        </div>
      </div>

      {/* Role Banner */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/90 border border-blue-500/20 text-xs shadow-md">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <span className="font-bold text-slate-200">
            {isRetailer
              ? "🏪 Retailer Merchant Portal — Customer & Beneficiary Registration Mode"
              : "👑 Platform Admin — Risk Supervision & Governance Mode"}
          </span>
        </div>
        <span className="font-mono text-[11px] font-bold text-blue-400 bg-blue-950/60 px-3 py-1 rounded-lg border border-blue-500/30">
          Active Role: {activeRole}
        </span>
      </div>

      {/* Customer Header Card */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          {customer?.photo_url || customer?.photo_base64 ? (
            <BlurImage 
              src={customer.photo_url || customer.photo_base64} 
              blurhash={KNOWN_BLURHASHES.AVATAR}
              alt={customer.full_name} 
              className="w-16 h-16 rounded-2xl border-2 border-blue-400/40 shadow-lg shadow-blue-500/30 bg-slate-800"
              imageClassName="w-full h-full object-cover rounded-2xl"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-blue-500/30 border border-blue-400/30">
              {customer?.full_name?.charAt(0) || "C"}
            </div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold text-white tracking-tight">{customer?.full_name || "Customer Profile"}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                {customer?.customer_category || "INDIVIDUAL"}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                customer?.customer_status === "ACTIVE" 
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
              }`}>
                {customer?.customer_status || "ACTIVE"}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 mt-2.5 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><span className="text-slate-500 font-medium">Mobile:</span> <strong className="text-slate-200 font-mono">{customer?.mobile_number || "N/A"}</strong></span>
              <span className="flex items-center gap-1.5"><span className="text-slate-500 font-medium">Email:</span> <strong className="text-slate-200">{customer?.email || "N/A"}</strong></span>
              <span className="flex items-center gap-1.5"><span className="text-slate-500 font-medium">KYC Level:</span> <strong className="text-blue-400 font-semibold">{customer?.kyc_level || "FULL_KYC"}</strong></span>
              <span className="flex items-center gap-1.5"><span className="text-slate-500 font-medium">Risk:</span> <strong className={customer?.risk_category === "HIGH" ? "text-rose-400" : "text-emerald-400"}>{customer?.risk_category || "LOW"}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowStatusModal(true)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 text-sm font-medium transition-all shadow-sm flex items-center gap-2"
          >
            Change Status
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-800 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: "overview", label: "360° Overview", icon: User },
          { id: "kyc", label: "KYC Centre", icon: ShieldCheck },
          { id: "documents", label: "Documents", icon: FileText },
          { id: "services", label: "Service Eligibility", icon: Settings },
          { id: "limits", label: "Transaction Limits", icon: Sliders },
          { id: "risk", label: "Risk Scorecard", icon: ShieldAlert },
          { id: "relationships", label: "Relationships", icon: Users },
          { id: "timeline", label: "Timeline & Audit", icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                isActive
                  ? "bg-gradient-to-r from-blue-600/25 to-indigo-600/25 text-blue-400 border border-blue-500/40 shadow-md shadow-blue-500/10 font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}

      {/* 1. Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl border border-slate-800/90 bg-slate-900/90 shadow-xl backdrop-blur-xl space-y-4">
            <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
              Registered Address Records
            </h3>
            {c360?.addresses?.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">No registered address records.</p>
            ) : (
              c360?.addresses?.map((addr: any) => (
                <div key={addr.public_id} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                  <div className="flex justify-between items-center text-xs font-semibold text-blue-400">
                    <span>{addr.address_type} ADDRESS</span>
                    {addr.is_primary && <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">PRIMARY</span>}
                  </div>
                  <p className="text-sm font-medium text-slate-200">{addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ""}</p>
                  <p className="text-xs text-slate-400">{addr.city}, {addr.state} - {addr.pin_code}, {addr.country}</p>
                </div>
              ))
            )}
          </div>

          <div className="p-6 rounded-2xl border border-slate-800/90 bg-slate-900/90 shadow-xl backdrop-blur-xl space-y-4">
            <h3 className="text-base font-semibold text-white tracking-tight">Verified Identities</h3>
            {c360?.identities?.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">No identities linked.</p>
            ) : (
              c360?.identities?.map((id: any) => (
                <div key={id.public_id} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block">{id.identity_type}</span>
                    <span className="text-sm font-mono text-white font-semibold">{id.identity_number_masked}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {id.verification_status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 2. KYC Centre */}
      {activeTab === "kyc" && (
        <div className="p-6 rounded-2xl border border-slate-800/90 bg-slate-900/90 shadow-xl backdrop-blur-xl space-y-6">
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-4">
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight">KYC Verification Record</h3>
              <p className="text-xs text-slate-400">Real-time status of Aadhaar, PAN, CKYC and face match</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {c360?.kyc?.kyc_status || "VERIFIED"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-xs text-slate-400">Aadhaar Validation</span>
              <p className="text-sm font-semibold text-emerald-400 mt-1">Verified</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-xs text-slate-400">PAN Validation</span>
              <p className="text-sm font-semibold text-emerald-400 mt-1">Verified</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-xs text-slate-400">Face Match Score</span>
              <p className="text-sm font-semibold text-blue-400 mt-1">98.5% Match</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-xs text-slate-400">Liveness Check</span>
              <p className="text-sm font-semibold text-emerald-400 mt-1">Passed</p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Documents */}
      {activeTab === "documents" && (
        <div className="p-6 rounded-2xl border border-slate-800/90 bg-slate-900/90 shadow-xl backdrop-blur-xl space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-semibold text-white tracking-tight">Customer Documents Vault</h3>
            <button className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20">
              <UploadCloud className="w-4 h-4" /> Upload Document
            </button>
          </div>
          {c360?.documents?.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No documents uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {c360?.documents?.map((doc: any) => (
                <div key={doc.public_id} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {doc.file_url ? (
                      <BlurImage 
                        src={doc.file_url} 
                        blurhash={KNOWN_BLURHASHES.DOCUMENT_DEFAULT}
                        alt={doc.document_name} 
                        className="w-12 h-12 rounded-lg border border-slate-600 bg-slate-900 shrink-0"
                        imageClassName="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                        <FileText className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <span className="text-xs font-semibold text-blue-400 block">{doc.document_type}</span>
                      <span className="text-sm font-medium text-white">{doc.document_name}</span>
                      <span className="text-xs text-slate-400 block">Doc #: {doc.document_number || "N/A"}</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {doc.verification_status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Services */}
      {activeTab === "services" && (
        <div className="p-6 rounded-2xl border border-slate-800/90 bg-slate-900/90 shadow-xl backdrop-blur-xl space-y-4">
          <h3 className="text-base font-semibold text-white tracking-tight">Configured Financial Services Eligibility</h3>
          {c360?.services?.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">Default financial services enabled based on KYC level.</p>
          ) : (
            <div className="space-y-3">
              {c360?.services?.map((svc: any) => (
                <div key={svc.public_id} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex justify-between items-center">
                  <div>
                    <span className="text-sm font-semibold text-white">{svc.service_name}</span>
                    <span className="text-xs font-mono text-slate-400 block">{svc.service_code}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    svc.is_enabled ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  }`}>
                    {svc.is_enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Limits */}
      {activeTab === "limits" && (
        <div className="p-6 rounded-2xl border border-slate-800/90 bg-slate-900/90 shadow-xl backdrop-blur-xl space-y-4">
          <h3 className="text-base font-semibold text-white tracking-tight">Transaction Limit Hierarchy</h3>
          <p className="text-xs text-slate-400">Limit Rule: Platform &gt; Company &gt; RM &gt; SD &gt; Distributor &gt; Retailer &gt; Category &gt; Individual Override ("Nearest Configuration Wins")</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-xs text-slate-400">Single Transaction Limit</span>
              <p className="text-lg font-bold text-white mt-1 font-mono">₹25,000</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-xs text-slate-400">Daily Amount Limit</span>
              <p className="text-lg font-bold text-white mt-1 font-mono">₹1,00,000</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-xs text-slate-400">Monthly Amount Limit</span>
              <p className="text-lg font-bold text-white mt-1 font-mono">₹5,00,000</p>
            </div>
          </div>
        </div>
      )}

      {/* 6. Risk */}
      {activeTab === "risk" && (
        <div className="p-6 rounded-2xl border border-slate-800/90 bg-slate-900/90 shadow-xl backdrop-blur-xl space-y-4">
          <h3 className="text-base font-semibold text-white tracking-tight">AML & Risk Scorecard</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-xs text-slate-400">Risk Score</span>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{c360?.risk_profile?.risk_score || 15} / 100</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-xs text-slate-400">Sanction Check</span>
              <p className="text-sm font-semibold text-emerald-400 mt-1">Clear (No Match)</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-xs text-slate-400">PEP Flag</span>
              <p className="text-sm font-semibold text-slate-300 mt-1">False</p>
            </div>
          </div>
        </div>
      )}

      {/* 7. Relationships */}
      {activeTab === "relationships" && (
        <div className="p-6 rounded-2xl border border-slate-800/90 bg-slate-900/90 shadow-xl backdrop-blur-xl space-y-4">
          <h3 className="text-base font-semibold text-white tracking-tight">Nominees & Related Entities</h3>
          {c360?.relationships?.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">No related nominees or family members linked.</p>
          ) : (
            <div className="space-y-3">
              {c360?.relationships?.map((rel: any) => (
                <div key={rel.public_id} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-semibold text-blue-400 block">{rel.relation_type}</span>
                    <span className="text-sm font-semibold text-white">{rel.related_name}</span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">{rel.related_mobile}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 8. Timeline */}
      {activeTab === "timeline" && (
        <div className="p-6 rounded-2xl border border-slate-800/90 bg-slate-900/90 shadow-xl backdrop-blur-xl space-y-4">
          <h3 className="text-base font-semibold text-white tracking-tight">Audit & Activity Timeline</h3>
          {c360?.timeline?.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">No events recorded in timeline.</p>
          ) : (
            <div className="space-y-4">
              {c360?.timeline?.map((ev: any) => (
                <div key={ev.public_id} className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-white">{ev.event_title}</p>
                    <p className="text-xs text-slate-400">{ev.event_description}</p>
                  </div>
                  <span className="text-xs font-mono text-slate-400">{new Date(ev.event_timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-white">Update Customer Status</h3>
            <form onSubmit={handleStatusChange} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="BLOCKED">BLOCKED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Reason *</label>
                <textarea
                  required
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none h-24"
                  placeholder="Enter detailed reason for status change..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={statusUpdating}
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg text-sm"
                >
                  {statusUpdating ? "Saving..." : "Update Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Customer360Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading Customer 360...</div>}>
      <Customer360Content />
    </Suspense>
  );
}
