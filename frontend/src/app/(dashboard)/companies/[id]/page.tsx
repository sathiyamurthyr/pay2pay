"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import api from "@/lib/api";
import {
  Building2,
  CheckCircle2,
  AlertOctagon,
  Clock,
  ChevronLeft,
  Shield,
  CreditCard,
  Settings,
  Palette,
  FileText,
  Landmark,
  UserCheck,
  History,
  FileCheck,
  Lock,
  Activity,
  Check,
  XCircle,
  RefreshCw
} from "lucide-react";

interface CompanyDetails {
  public_id: string;
  tenant_id: string;
  company_code: string;
  company_name: string;
  legal_name: string;
  display_name?: string;
  short_name?: string;
  tenant_code: string;
  company_type: string;
  industry?: string;
  business_category?: string;
  website?: string;
  description?: string;
  gst_number?: string;
  pan_number?: string;
  cin_number?: string;
  msme_number?: string;
  tan_number?: string;
  status: string;
  version_no: number;
  created_date: string;

  contact?: any;
  address?: any;
  bank?: any;
  subscription?: any;
  branding?: any;
  settings?: any;
  documents: any[];
  status_history: any[];
  approvals: any[];
}

export default function CompanyDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("basic");
  const [actionLoading, setActionLoading] = useState(false);
  const [comments, setComments] = useState("");

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/v1/companies/${id}`);
      setCompany(res.data);
    } catch (err) {
      console.error("Failed to load company details", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleApprove = async () => {
    try {
      setActionLoading(true);
      await api.post(`/api/v1/companies/${id}/approve`, { comments: comments || "Approved by Platform Super Admin" });
      fetchDetails();
    } catch (err) {
      console.error("Approval failed", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      setActionLoading(true);
      await api.post(`/api/v1/companies/${id}/status`, { status: newStatus, reason: comments || `Status changed to ${newStatus}` });
      fetchDetails();
    } catch (err) {
      console.error("Status update failed", err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !company) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-3 text-emerald-400">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="text-lg font-medium">Loading Company Detail Views...</span>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "basic", label: "Basic & Registration", icon: Building2 },
    { id: "contact", label: "Contact & Address", icon: UserCheck },
    { id: "banking", label: "Banking & Settlement", icon: Landmark },
    { id: "subscription", label: "Subscription & Limits", icon: CreditCard },
    { id: "approval", label: "Approval & Status Workflow", icon: History },
    { id: "settings", label: "Company Settings", icon: Settings },
    { id: "branding", label: "Branding & Customization", icon: Palette },
    { id: "documents", label: "Documents Library", icon: FileCheck },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/companies"
            className="flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900 p-2.5 text-slate-400 hover:text-slate-200"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-100">{company.company_name}</h1>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  company.status === "ACTIVE"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : company.status === "PENDING_APPROVAL"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}
              >
                {company.status}
              </span>
            </div>
            <p className="mt-0.5 font-mono text-xs text-slate-400">
              Code: {company.company_code} | Tenant: {company.tenant_code} | Version: v{company.version_no}
            </p>
          </div>
        </div>

        {/* Workflow Approval Quick Actions */}
        <div className="flex items-center gap-3">
          {company.status === "PENDING_APPROVAL" && (
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-emerald-500 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              Approve Onboarding
            </button>
          )}

          {company.status === "ACTIVE" && (
            <button
              onClick={() => handleStatusChange("SUSPENDED")}
              disabled={actionLoading}
              className="flex items-center gap-2 rounded-lg bg-rose-600/80 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
            >
              <AlertOctagon className="h-4 w-4" />
              Suspend Company
            </button>
          )}

          {company.status === "SUSPENDED" && (
            <button
              onClick={() => handleStatusChange("ACTIVE")}
              disabled={actionLoading}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Re-Activate Company
            </button>
          )}
        </div>
      </div>

      {/* 8 Tab Navigation Header */}
      <div className="flex overflow-x-auto gap-1 border-b border-slate-800 bg-slate-950/40 p-1 rounded-xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
        {/* Tab 1: Basic & Registration */}
        {activeTab === "basic" && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-100 border-b border-slate-800 pb-3">Corporate & Legal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <span className="text-xs text-slate-400">Legal Name</span>
                <p className="text-sm font-semibold text-slate-200 mt-1">{company.legal_name}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400">Display Name</span>
                <p className="text-sm font-semibold text-slate-200 mt-1">{company.display_name || "N/A"}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400">Company Type</span>
                <p className="text-sm font-semibold text-emerald-400 mt-1">{company.company_type}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400">Industry</span>
                <p className="text-sm font-semibold text-slate-200 mt-1">{company.industry || "N/A"}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400">Business Category</span>
                <p className="text-sm font-semibold text-slate-200 mt-1">{company.business_category || "N/A"}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400">Website</span>
                <p className="text-sm font-mono text-cyan-400 mt-1">{company.website || "N/A"}</p>
              </div>
            </div>

            <h3 className="text-lg font-bold text-slate-100 border-b border-slate-800 pb-3 pt-4">Statutory Registration Numbers</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                <span className="text-xs font-mono text-slate-400 uppercase">GST Number</span>
                <p className="text-base font-mono font-bold text-emerald-400 mt-1">{company.gst_number || "Not Provided"}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                <span className="text-xs font-mono text-slate-400 uppercase">PAN Number</span>
                <p className="text-base font-mono font-bold text-blue-400 mt-1">{company.pan_number || "Not Provided"}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                <span className="text-xs font-mono text-slate-400 uppercase">CIN Number</span>
                <p className="text-base font-mono font-bold text-purple-400 mt-1">{company.cin_number || "Not Provided"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Contact & Address */}
        {activeTab === "contact" && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-100 border-b border-slate-800 pb-3">Primary Contact Representative</h3>
            {company.contact ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <span className="text-xs text-slate-400">Primary Contact</span>
                  <p className="text-sm font-semibold text-slate-200 mt-1">{company.contact.primary_contact}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Designation</span>
                  <p className="text-sm font-semibold text-slate-200 mt-1">{company.contact.designation}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Mobile</span>
                  <p className="text-sm font-mono text-slate-200 mt-1">{company.contact.mobile}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Email</span>
                  <p className="text-sm font-mono text-emerald-400 mt-1">{company.contact.email}</p>
                </div>
              </div>
            ) : <p className="text-slate-400">No contact details registered.</p>}

            <h3 className="text-lg font-bold text-slate-100 border-b border-slate-800 pb-3 pt-4">Registered Office Address</h3>
            {company.address ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <span className="text-xs text-slate-400">State / Region</span>
                  <p className="text-sm font-semibold text-slate-200 mt-1">{company.address.state}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">City</span>
                  <p className="text-sm font-semibold text-slate-200 mt-1">{company.address.city}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Pincode</span>
                  <p className="text-sm font-mono text-slate-200 mt-1">{company.address.pincode}</p>
                </div>
                <div className="md:col-span-3">
                  <span className="text-xs text-slate-400">Full Address</span>
                  <p className="text-sm text-slate-200 mt-1">{company.address.address}</p>
                </div>
              </div>
            ) : <p className="text-slate-400">No registered address provided.</p>}
          </div>
        )}

        {/* Tab 3: Banking & Settlement */}
        {activeTab === "banking" && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-100 border-b border-slate-800 pb-3">Settlement Bank Account</h3>
            {company.bank ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <span className="text-xs text-slate-400">Settlement Bank</span>
                  <p className="text-sm font-semibold text-slate-200 mt-1">{company.bank.settlement_bank_name}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Account Holder</span>
                  <p className="text-sm font-semibold text-slate-200 mt-1">{company.bank.account_holder}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Account Number</span>
                  <p className="text-sm font-mono text-emerald-400 mt-1">{company.bank.account_number}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">IFSC Code</span>
                  <p className="text-sm font-mono text-blue-400 mt-1">{company.bank.ifsc}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Verification Status</span>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {company.bank.verification_status}
                  </span>
                </div>
              </div>
            ) : <p className="text-slate-400">No settlement banking details found.</p>}
          </div>
        )}

        {/* Tab 4: Subscription */}
        {activeTab === "subscription" && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-100 border-b border-slate-800 pb-3">Subscription Tier & Operating Limits</h3>
            {company.subscription ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                  <span className="text-xs text-slate-400">Plan Tier</span>
                  <p className="text-xl font-bold text-emerald-400 mt-1">{company.subscription.plan_name}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                  <span className="text-xs text-slate-400">Max Retailers Limit</span>
                  <p className="text-xl font-bold text-slate-200 mt-1">{company.subscription.maximum_retailers}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                  <span className="text-xs text-slate-400">Max POS Machines</span>
                  <p className="text-xl font-bold text-slate-200 mt-1">{company.subscription.maximum_machines}</p>
                </div>
              </div>
            ) : <p className="text-slate-400">No active subscription plan allocated.</p>}
          </div>
        )}

        {/* Tab 5: Approval Workflow History */}
        {activeTab === "approval" && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-100 border-b border-slate-800 pb-3">Audit Trail & Status History Timeline</h3>
            <div className="space-y-4">
              {company.status_history.map((h, i) => (
                <div key={i} className="flex items-start gap-4 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                  <Activity className="h-5 w-5 text-emerald-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{h.previous_status} → {h.new_status}</span>
                      <span className="text-xs font-mono text-slate-400">{new Date(h.created_date).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{h.reason}</p>
                    <p className="text-xs font-mono text-emerald-400 mt-0.5">By: {h.changed_by_email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 6: Company Settings */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-100 border-b border-slate-800 pb-3">Operational Preferences & Security Settings</h3>
            {company.settings ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <span className="text-xs text-slate-400">Base Currency</span>
                  <p className="text-sm font-semibold text-slate-200 mt-1">{company.settings.currency}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Timezone</span>
                  <p className="text-sm font-semibold text-slate-200 mt-1">{company.settings.timezone}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Date Format</span>
                  <p className="text-sm font-mono text-slate-200 mt-1">{company.settings.date_format}</p>
                </div>
              </div>
            ) : <p className="text-slate-400">No company settings found.</p>}
          </div>
        )}

        {/* Tab 7: Branding */}
        {activeTab === "branding" && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-100 border-b border-slate-800 pb-3">Brand Palette & Customization</h3>
            {company.branding ? (
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded border border-slate-700" style={{ backgroundColor: company.branding.primary_colour }} />
                  <div>
                    <span className="text-xs text-slate-400">Primary Colour</span>
                    <p className="text-sm font-mono text-slate-200">{company.branding.primary_colour}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded border border-slate-700" style={{ backgroundColor: company.branding.secondary_colour }} />
                  <div>
                    <span className="text-xs text-slate-400">Secondary Colour</span>
                    <p className="text-sm font-mono text-slate-200">{company.branding.secondary_colour}</p>
                  </div>
                </div>
              </div>
            ) : <p className="text-slate-400">No custom branding set.</p>}
          </div>
        )}

        {/* Tab 8: Documents */}
        {activeTab === "documents" && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-100 border-b border-slate-800 pb-3">Verification Documents Vault</h3>
            {company.documents.length > 0 ? (
              <div className="space-y-3">
                {company.documents.map((d, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-emerald-400" />
                      <div>
                        <p className="font-semibold text-slate-200">{d.document_name}</p>
                        <span className="text-xs font-mono text-slate-400">{d.document_type} (v{d.version})</span>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {d.verification_status}
                    </span>
                  </div>
                ))}
              </div>
            ) : <p className="text-slate-400">No documents uploaded yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
