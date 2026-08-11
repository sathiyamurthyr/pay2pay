"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import api from "@/lib/api";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  CreditCard,
  Settings,
  Palette,
  FileText,
  Landmark,
  UserCheck,
  History,
  FileCheck,
  Activity,
  Check,
  XCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";

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
  contact?: {
    primary_contact?: string;
    designation?: string;
    mobile?: string;
    email?: string;
    support_email?: string;
    support_phone?: string;
  };
  address?: {
    address_type?: string;
    country?: string;
    state?: string;
    city?: string;
    address?: string;
    pincode?: string;
  };
  bank?: {
    settlement_bank_name?: string;
    account_holder?: string;
    account_number?: string;
    ifsc?: string;
    branch?: string;
    verification_status?: string;
  };
  subscription?: {
    plan_name?: string;
    maximum_retailers?: number;
    maximum_machines?: number;
    maximum_admin_users?: number;
    storage_limit_gb?: number;
    api_limit_per_minute?: number;
    status?: string;
  };
  branding?: {
    logo_url?: string;
    primary_colour?: string;
    secondary_colour?: string;
  };
  settings?: {
    currency?: string;
    timezone?: string;
    date_format?: string;
    auto_settlement?: boolean;
    auto_payout?: boolean;
  };
  documents: Array<{
    document_name?: string;
    document_type?: string;
    version?: number;
    verification_status?: string;
  }>;
  status_history: Array<{
    previous_status?: string;
    new_status?: string;
    reason?: string;
    changed_by_email?: string;
    created_date: string;
  }>;
  approvals: Array<{
    request_type?: string;
    status?: string;
    comments?: string;
  }>;
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
      let initialData = getFallbackCompany(id);
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("pay2pay_companies_state");
        if (saved) {
          try {
            const list = JSON.parse(saved);
            const found = list.find(
              (c: any) => c.company_code === id.toUpperCase() || c.public_id === id
            );
            if (found && found.status) {
              initialData.status = found.status;
            }
          } catch {
            // ignore
          }
        }
      }

      const res = await api.get(`/api/v1/companies/${id}`);
      if (res.data && res.data.company_name) {
        setCompany(res.data);
      } else {
        setCompany(initialData);
      }
    } catch {
      let initialData = getFallbackCompany(id);
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("pay2pay_companies_state");
        if (saved) {
          try {
            const list = JSON.parse(saved);
            const found = list.find(
              (c: any) => c.company_code === id.toUpperCase() || c.public_id === id
            );
            if (found && found.status) {
              initialData.status = found.status;
            }
          } catch {
            // ignore
          }
        }
      }
      setCompany(initialData);
    } finally {
      setLoading(false);
    }
  };

  const getFallbackCompany = (compKey: string): CompanyDetails => ({
    public_id: compKey,
    tenant_id: "tnt-001",
    company_code: compKey.toUpperCase(),
    company_name: compKey.includes("FIN")
      ? "FinPay Technologies Ltd"
      : compKey.includes("APEX")
      ? "Apex Financial Services Ltd"
      : compKey.includes("NEXUS")
      ? "Nexus Retail Payments Pvt Ltd"
      : "Pay2Pay Enterprise HQ",
    legal_name: "Pay2Pay Payment Technologies Pvt Ltd",
    display_name: "Pay2Pay Enterprise",
    short_name: "Pay2Pay",
    tenant_code: compKey.includes("FIN")
      ? "FINPAY_TNT"
      : compKey.includes("APEX")
      ? "APEX_TENANT"
      : compKey.includes("NEXUS")
      ? "NEXUS_TNT"
      : "DEFAULT_TENANT",
    company_type: "PUBLIC_LIMITED",
    industry: "FinTech & Banking Infrastructure",
    business_category: "Payment Aggregator",
    website: "https://pay2pay.in",
    description: "Enterprise Multi-Tenant Payment Platform & Settlement Gateway",
    gst_number: "27AAACP1234A1Z5",
    pan_number: "AAACP1234A",
    cin_number: "U72900MH2021PTC123456",
    msme_number: "UDYAM-MH-01-0012345",
    tan_number: "MUMP12345A",
    status: (compKey.includes("APEX") || compKey.includes("NOVA"))
      ? "PENDING_APPROVAL"
      : (compKey.includes("NEXUS") || compKey.includes("ZENITH"))
      ? "SUSPENDED"
      : compKey.includes("PRIMUS")
      ? "BLOCKED"
      : compKey.includes("SIGMA")
      ? "DRAFT"
      : "ACTIVE",
    version_no: 1,
    created_date: new Date().toISOString(),
    contact: {
      primary_contact: "Platform Operations Director",
      designation: "VP of Operations",
      mobile: "+91 98765 43210",
      email: "ops@pay2pay.in",
      support_email: "support@pay2pay.in",
      support_phone: "1800-123-4567",
    },
    address: {
      address_type: "REGISTERED",
      country: "India",
      state: "Maharashtra",
      city: "Mumbai",
      address: "Suite 402, Financial Tech Tower, BKC",
      pincode: "400051",
    },
    bank: {
      settlement_bank_name: "HDFC Bank Ltd",
      account_holder: "Pay2Pay Enterprise Settlement Escrow",
      account_number: "50200012345678",
      ifsc: "HDFC0000240",
      branch: "BKC Mumbai Branch",
      verification_status: "VERIFIED",
    },
    subscription: {
      plan_name: "ENTERPRISE_UNLIMITED",
      maximum_retailers: 50000,
      maximum_machines: 10000,
      maximum_admin_users: 500,
      storage_limit_gb: 1000,
      api_limit_per_minute: 10000,
      status: "ACTIVE",
    },
    branding: {
      logo_url: "/logo.png",
      primary_colour: "#123B73",
      secondary_colour: "#2F80ED",
    },
    settings: {
      currency: "INR",
      timezone: "Asia/Kolkata",
      date_format: "DD/MM/YYYY",
      auto_settlement: true,
      auto_payout: true,
    },
    documents: [
      { document_name: "GST Certificate", document_type: "GST_CERTIFICATE", version: 1, verification_status: "VERIFIED" },
      { document_name: "PAN Card Registration", document_type: "PAN_CARD", version: 1, verification_status: "VERIFIED" },
    ],
    status_history: [
      {
        previous_status: "PENDING_APPROVAL",
        new_status: "ACTIVE",
        reason: "Approved by Platform Super Admin",
        changed_by_email: "superadmin@pay2pay.in",
        created_date: new Date().toISOString(),
      },
    ],
    approvals: [
      { request_type: "ONBOARDING", status: "APPROVED", comments: "All KYC documents & settlement bank verified" },
    ],
  });

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const updateCompanyStatus = (newStatus: string) => {
    if (!company) return;
    const updated = { ...company, status: newStatus };
    setCompany(updated);

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pay2pay_companies_state");
      if (saved) {
        try {
          const list = JSON.parse(saved);
          if (Array.isArray(list)) {
            const updatedList = list.map((c: any) =>
              c.company_code === id.toUpperCase() || c.public_id === id ? { ...c, status: newStatus } : c
            );
            localStorage.setItem("pay2pay_companies_state", JSON.stringify(updatedList));
          }
        } catch {
          // ignore
        }
      }
    }
  };

  const handleApprove = async () => {
    try {
      setActionLoading(true);
      await api.post(`/api/v1/companies/${id}/approve`, { comments: comments || "Approved by Platform Super Admin" });
    } catch {
      // offline mode fallback
    } finally {
      updateCompanyStatus("ACTIVE");
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      setActionLoading(true);
      await api.post(`/api/v1/companies/${id}/status`, { status: newStatus, reason: comments || `Status changed to ${newStatus}` });
    } catch {
      // offline mode fallback
    } finally {
      updateCompanyStatus(newStatus);
      setActionLoading(false);
    }
  };

  if (loading || !company) {
    return (
      <div className="flex h-96 items-center justify-center bg-white">
        <div className="flex items-center gap-3 text-[#123B73]">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="text-base font-bold">Loading Company Details…</span>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "basic", label: "Basic & Registration", icon: Building2 },
    { id: "contact", label: "Contact & Address", icon: UserCheck },
    { id: "banking", label: "Banking & Settlement", icon: Landmark },
    { id: "subscription", label: "Subscription & Limits", icon: CreditCard },
    { id: "approval", label: "Approval Workflow", icon: History },
    { id: "settings", label: "Company Settings", icon: Settings },
    { id: "branding", label: "Branding", icon: Palette },
    { id: "documents", label: "Documents Library", icon: FileCheck },
  ];

  return (
    <div className="space-y-5 bg-[#F5F7FA] min-h-screen p-1">
      {/* ── Top Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-[#D9E2EC] bg-white p-4 rounded-xl shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/companies"
            aria-label="Back to company directory"
            className="p-2 rounded-lg border border-[#D9E2EC] bg-white text-[#374151] hover:bg-[#F3F6FA] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[22px] font-extrabold text-[#111827] tracking-tight leading-tight">
                {company.company_name}
              </h1>
              <StatusBadge status={company.status} />
            </div>
            <p className="text-[12px] font-mono font-semibold text-[#4B5563] mt-0.5">
              Code: <span className="text-[#123B73]">{company.company_code}</span> &nbsp;|&nbsp;
              Tenant: <span className="text-[#123B73]">{company.tenant_code}</span> &nbsp;|&nbsp;
              Version: <span className="text-[#6B7280]">v{company.version_no}</span>
            </p>
          </div>
        </div>

        {/* Workflow Approval Quick Actions */}
        <div className="flex items-center gap-2">
          {company.status === "PENDING_APPROVAL" && (
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-[13px] font-bold rounded-lg transition-colors shadow-sm"
            >
              <Check className="h-4 w-4" />
              Approve Onboarding
            </button>
          )}

          {company.status === "ACTIVE" && (
            <button
              onClick={() => handleStatusChange("SUSPENDED")}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[13px] font-bold rounded-lg transition-colors shadow-sm"
            >
              <XCircle className="h-4 w-4" />
              Suspend Company
            </button>
          )}

          {company.status === "SUSPENDED" && (
            <button
              onClick={() => handleStatusChange("ACTIVE")}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#123B73] hover:bg-[#0E2F5C] text-white text-[13px] font-bold rounded-lg transition-colors shadow-sm"
            >
              <CheckCircle2 className="h-4 w-4" />
              Re-Activate Company
            </button>
          )}
        </div>
      </div>

      {/* ── 8 Tab Navigation Strip ── */}
      <div className="flex overflow-x-auto gap-1 border border-[#D9E2EC] bg-[#F3F6FA] p-1.5 rounded-xl shadow-xs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 text-[12.5px] font-bold rounded-lg whitespace-nowrap transition-all ${
                isActive
                  ? "bg-[#123B73] text-white shadow-sm"
                  : "text-[#374151] hover:text-[#111827] hover:bg-white"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-[#6B7280]"}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── High-Contrast White Surface Container ── */}
      <div className="rounded-xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        {/* Tab 1: Basic & Registration */}
        {activeTab === "basic" && (
          <div className="space-y-6">
            <h2 className="text-[16px] font-extrabold text-[#111827] border-b border-[#E5E7EB] pb-2.5">
              Corporate &amp; Legal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Legal Name</span>
                <p className="text-[14px] font-bold text-[#111827] mt-1">{company.legal_name}</p>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Display Name</span>
                <p className="text-[14px] font-bold text-[#111827] mt-1">{company.display_name || "N/A"}</p>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Company Type</span>
                <p className="text-[14px] font-bold text-[#123B73] mt-1">{company.company_type.replace(/_/g, " ")}</p>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Industry</span>
                <p className="text-[14px] font-bold text-[#111827] mt-1">{company.industry || "N/A"}</p>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Business Category</span>
                <p className="text-[14px] font-bold text-[#111827] mt-1">{company.business_category || "N/A"}</p>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Website</span>
                <p className="text-[14px] font-mono font-bold text-[#2563EB] mt-1">
                  {company.website ? (
                    <a href={company.website} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                      {company.website} <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : "N/A"}
                </p>
              </div>
            </div>

            <h2 className="text-[16px] font-extrabold text-[#111827] border-b border-[#E5E7EB] pb-2.5 pt-4">
              Statutory Registration Numbers
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-4">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#15803D]">GST Number</span>
                <p className="text-[18px] font-mono font-extrabold text-[#111827] mt-1">{company.gst_number || "Not Provided"}</p>
              </div>
              <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-4">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#1D4ED8]">PAN Number</span>
                <p className="text-[18px] font-mono font-extrabold text-[#111827] mt-1">{company.pan_number || "Not Provided"}</p>
              </div>
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#374151]">CIN Number</span>
                <p className="text-[18px] font-mono font-extrabold text-[#111827] mt-1">{company.cin_number || "Not Provided"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Contact & Address */}
        {activeTab === "contact" && (
          <div className="space-y-6">
            <h2 className="text-[16px] font-extrabold text-[#111827] border-b border-[#E5E7EB] pb-2.5">
              Primary Contact Representative
            </h2>
            {company.contact ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Primary Contact</span>
                  <p className="text-[14px] font-bold text-[#111827] mt-1">{company.contact.primary_contact}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Designation</span>
                  <p className="text-[14px] font-bold text-[#111827] mt-1">{company.contact.designation}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Mobile</span>
                  <p className="text-[14px] font-mono font-bold text-[#111827] mt-1">{company.contact.mobile}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Email</span>
                  <p className="text-[14px] font-mono font-bold text-[#2563EB] mt-1">{company.contact.email}</p>
                </div>
              </div>
            ) : <p className="text-[13px] text-[#6B7280]">No contact details registered.</p>}

            <h2 className="text-[16px] font-extrabold text-[#111827] border-b border-[#E5E7EB] pb-2.5 pt-4">
              Registered Office Address
            </h2>
            {company.address ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">State / Region</span>
                  <p className="text-[14px] font-bold text-[#111827] mt-1">{company.address.state}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">City</span>
                  <p className="text-[14px] font-bold text-[#111827] mt-1">{company.address.city}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Pincode</span>
                  <p className="text-[14px] font-mono font-bold text-[#111827] mt-1">{company.address.pincode}</p>
                </div>
                <div className="md:col-span-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Full Address</span>
                  <p className="text-[14px] font-semibold text-[#111827] mt-1">{company.address.address}</p>
                </div>
              </div>
            ) : <p className="text-[13px] text-[#6B7280]">No registered address provided.</p>}
          </div>
        )}

        {/* Tab 3: Banking & Settlement */}
        {activeTab === "banking" && (
          <div className="space-y-6">
            <h2 className="text-[16px] font-extrabold text-[#111827] border-b border-[#E5E7EB] pb-2.5">
              Settlement Bank Account
            </h2>
            {company.bank ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Settlement Bank</span>
                  <p className="text-[14px] font-bold text-[#111827] mt-1">{company.bank.settlement_bank_name}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Account Holder</span>
                  <p className="text-[14px] font-bold text-[#111827] mt-1">{company.bank.account_holder}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Account Number</span>
                  <p className="text-[14px] font-mono font-bold text-[#123B73] mt-1">{company.bank.account_number}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">IFSC Code</span>
                  <p className="text-[14px] font-mono font-bold text-[#2563EB] mt-1">{company.bank.ifsc}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Verification Status</span>
                  <div className="mt-1">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                      {company.bank.verification_status}
                    </span>
                  </div>
                </div>
              </div>
            ) : <p className="text-[13px] text-[#6B7280]">No settlement banking details found.</p>}
          </div>
        )}

        {/* Tab 4: Subscription */}
        {activeTab === "subscription" && (
          <div className="space-y-6">
            <h2 className="text-[16px] font-extrabold text-[#111827] border-b border-[#E5E7EB] pb-2.5">
              Subscription Tier &amp; Operating Limits
            </h2>
            {company.subscription ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-[#D9E2EC] bg-[#FAFBFC] p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Plan Tier</span>
                  <p className="text-[20px] font-extrabold text-[#123B73] mt-1">{company.subscription.plan_name}</p>
                </div>
                <div className="rounded-xl border border-[#D9E2EC] bg-[#FAFBFC] p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Max Retailers Limit</span>
                  <p className="text-[20px] font-extrabold text-[#111827] mt-1">{company.subscription.maximum_retailers?.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-[#D9E2EC] bg-[#FAFBFC] p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Max POS Machines</span>
                  <p className="text-[20px] font-extrabold text-[#111827] mt-1">{company.subscription.maximum_machines?.toLocaleString()}</p>
                </div>
              </div>
            ) : <p className="text-[13px] text-[#6B7280]">No active subscription plan allocated.</p>}
          </div>
        )}

        {/* Tab 5: Approval Workflow History */}
        {activeTab === "approval" && (
          <div className="space-y-6">
            <h2 className="text-[16px] font-extrabold text-[#111827] border-b border-[#E5E7EB] pb-2.5">
              Audit Trail &amp; Status History Timeline
            </h2>
            <div className="space-y-3">
              {company.status_history.map((h, i) => (
                <div key={i} className="flex items-start gap-4 rounded-xl border border-[#D9E2EC] bg-[#FAFBFC] p-4">
                  <Activity className="h-5 w-5 text-[#16A34A] mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#111827] text-[14px]">
                        {h.previous_status} → {h.new_status}
                      </span>
                      <span className="text-xs font-mono font-semibold text-[#6B7280]">
                        {new Date(h.created_date).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-[#4B5563] mt-1">{h.reason}</p>
                    <p className="text-xs font-mono font-bold text-[#123B73] mt-0.5">By: {h.changed_by_email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 6: Company Settings */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <h2 className="text-[16px] font-extrabold text-[#111827] border-b border-[#E5E7EB] pb-2.5">
              Operational Preferences &amp; Security Settings
            </h2>
            {company.settings ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Base Currency</span>
                  <p className="text-[14px] font-bold text-[#111827] mt-1">{company.settings.currency}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Timezone</span>
                  <p className="text-[14px] font-bold text-[#111827] mt-1">{company.settings.timezone}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Date Format</span>
                  <p className="text-[14px] font-mono font-bold text-[#111827] mt-1">{company.settings.date_format}</p>
                </div>
              </div>
            ) : <p className="text-[13px] text-[#6B7280]">No company settings found.</p>}
          </div>
        )}

        {/* Tab 7: Branding */}
        {activeTab === "branding" && (
          <div className="space-y-6">
            <h2 className="text-[16px] font-extrabold text-[#111827] border-b border-[#E5E7EB] pb-2.5">
              Brand Palette &amp; Customization
            </h2>
            {company.branding ? (
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg border border-[#D9E2EC] shadow-xs" style={{ backgroundColor: company.branding.primary_colour }} />
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Primary Colour</span>
                    <p className="text-[14px] font-mono font-bold text-[#111827]">{company.branding.primary_colour}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg border border-[#D9E2EC] shadow-xs" style={{ backgroundColor: company.branding.secondary_colour }} />
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Secondary Colour</span>
                    <p className="text-[14px] font-mono font-bold text-[#111827]">{company.branding.secondary_colour}</p>
                  </div>
                </div>
              </div>
            ) : <p className="text-[13px] text-[#6B7280]">No custom branding set.</p>}
          </div>
        )}

        {/* Tab 8: Documents */}
        {activeTab === "documents" && (
          <div className="space-y-6">
            <h2 className="text-[16px] font-extrabold text-[#111827] border-b border-[#E5E7EB] pb-2.5">
              Verification Documents Vault
            </h2>
            {company.documents.length > 0 ? (
              <div className="space-y-3">
                {company.documents.map((d, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-xl border border-[#D9E2EC] bg-[#FAFBFC] p-4">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-5 w-5 text-[#16A34A]" />
                      <div>
                        <p className="font-bold text-[#111827] text-[14px]">{d.document_name}</p>
                        <span className="text-xs font-mono font-semibold text-[#6B7280]">{d.document_type} (v{d.version})</span>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                      {d.verification_status}
                    </span>
                  </div>
                ))}
              </div>
            ) : <p className="text-[13px] text-[#6B7280]">No documents uploaded yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
