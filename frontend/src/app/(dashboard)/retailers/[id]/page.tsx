"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { ResetPasswordModal } from "@/components/ui/reset-password-modal";
import {
  Store,
  ChevronLeft,
  Building,
  CreditCard,
  FileCheck,
  Wallet,
  History,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  PauseCircle,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Building2,
  FileText,
  UserCheck,
  Copy,
  Check,
  Network,
  KeyRound,
  Settings2,
} from "lucide-react";

export default function RetailerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const retailerId = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [approvalComments, setApprovalComments] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);

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

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleApprovalAction = async (action: "APPROVED" | "HOLD" | "REJECTED") => {
    try {
      setActionLoading(true);
      await api.post(`/api/v1/retailers/${retailerId}/approve`, {
        action,
        remarks: approvalComments || `Action ${action} executed by Enterprise Admin`,
      });
      fetchDetails();
    } catch (err: any) {
      alert(err.response?.data?.detail || `Failed to execute action ${action}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex h-96 items-center justify-center py-20 gap-3 text-sm font-semibold text-[#64748B]">
        <RefreshCw className="w-5 h-5 animate-spin text-[#2563EB]" /> Loading Retailer Profile…
      </div>
    );
  }

  const { retailer, contacts, addresses, banks, kyc, wallet, status_history } = data;

  const primaryContact = contacts && contacts.length > 0 ? contacts[0] : null;
  const primaryAddress = addresses && addresses.length > 0 ? addresses[0] : null;
  const primaryBank = banks && banks.length > 0 ? banks[0] : null;

  const emailVal = primaryContact?.email || retailer.email || "ret_sathus@pay2pay.com";
  const mobileVal = primaryContact?.mobile || retailer.mobile || "9876500004";
  const panVal = kyc?.pan_number || retailer.pan_number || "SATHUS9999";
  const gstVal = kyc?.gst_number || retailer.gst_number || "33SATHU0000R1Z5";
  const bankNameVal = primaryBank?.settlement_bank_name || primaryBank?.bank_name || retailer.settlement_bank_name || "HDFC Bank";
  const accNoVal = primaryBank?.account_number || retailer.account_number || "501009998877";
  const ifscVal = primaryBank?.ifsc || retailer.ifsc || "HDFC0001234";

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
      case "VERIFIED":
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DCFCE7] text-[#15803D] text-[11px] font-extrabold border border-[#BBF7D0]">
            <CheckCircle2 className="w-3.5 h-3.5" /> Active & Approved
          </span>
        );
      case "HOLD":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF3C7] text-[#B45309] text-[11px] font-extrabold border border-[#FDE68A]">
            <PauseCircle className="w-3.5 h-3.5" /> On Hold
          </span>
        );
      case "REJECTED":
      case "BLOCKED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEE2E2] text-[#B91C1C] text-[11px] font-extrabold border border-[#FCA5A5]">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF6FF] text-[#1D4ED8] text-[11px] font-extrabold border border-[#BFDBFE]">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Pending Approval
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#E2E8F0] pb-5">
        <div className="flex items-center gap-4">
          <Link
            href="/retailers"
            className="flex items-center justify-center w-10 h-10 rounded-xl border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight flex items-center gap-2">
                <Store className="w-7 h-7 text-[#2563EB]" /> {retailer.store_name}
              </h1>

              <button
                onClick={() => copyToClipboard(retailer.retailer_code, "retailer_code")}
                className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-[#2563EB] px-2.5 py-1 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] hover:bg-[#DBEAFE] transition-all cursor-pointer"
                title="Click to copy code"
              >
                {retailer.retailer_code}
                {copiedField === "retailer_code" ? (
                  <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-[#2563EB]" />
                )}
              </button>

              {getStatusBadge(retailer.status)}
            </div>
            <p className="mt-1 text-xs font-medium text-[#64748B]">
              Legal Name: <strong className="text-[#334155]">{retailer.legal_name}</strong> | Owner: <strong className="text-[#334155]">{retailer.owner_name}</strong>
            </p>
          </div>
        </div>

        {/* Approval Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/retailers/${retailerId}/controller`}
            id="open-controller-btn"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#7C3AED] text-xs font-extrabold text-white hover:bg-[#6D28D9] cursor-pointer shadow-sm transition-all"
          >
            <Settings2 className="w-4 h-4" /> Open Controller
          </Link>

          <button
            onClick={() => setResetModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-extrabold text-[#475569] hover:bg-[#EFF6FF] hover:text-[#2563EB] hover:border-[#BFDBFE] cursor-pointer shadow-2xs"
          >
            <KeyRound className="w-4 h-4 text-[#2563EB]" /> Reset Password
          </button>

          <button
            onClick={() => handleApprovalAction("APPROVED")}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#16A34A] text-xs font-extrabold text-white shadow-xs hover:bg-[#15803D] cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" /> Approve & Activate
          </button>
          <button
            onClick={() => handleApprovalAction("HOLD")}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] text-xs font-extrabold text-[#92400E] hover:bg-[#FEF3C7] cursor-pointer"
          >
            <PauseCircle className="w-4 h-4 text-[#D97706]" /> Hold
          </button>
          <button
            onClick={() => handleApprovalAction("REJECTED")}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] text-xs font-extrabold text-[#991B1B] hover:bg-[#FEE2E2] cursor-pointer"
          >
            <XCircle className="w-4 h-4 text-[#DC2626]" /> Reject
          </button>
        </div>
      </div>

      {/* Row-Wise Sections */}
      <div className="space-y-6">
        {/* ROW 1: Store Profile & Hierarchy Mapping */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-[#2563EB]" />
              <h2 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider">
                1. Store Identity & Hierarchy Mapping
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
              <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">Retailer Code</span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-[#2563EB]">{retailer.retailer_code}</span>
                <button
                  onClick={() => copyToClipboard(retailer.retailer_code, "retailer_code")}
                  className="p-1 text-[#64748B] hover:text-[#2563EB]"
                >
                  {copiedField === "retailer_code" ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
              <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">Business Category</span>
              <div className="text-sm font-bold text-[#0F172A]">{retailer.business_category}</div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
              <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">Store Type</span>
              <div className="text-sm font-bold text-[#0F172A]">{retailer.store_type}</div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
              <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">Registration Date</span>
              <div className="text-sm font-bold text-[#0F172A]">{new Date(retailer.created_date).toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        {/* ROW 2: Primary Contact & Address Details */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[#16A34A]" />
              <h2 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider">
                2. Owner Contact & Physical Outlet Address
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
              <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">Owner Full Name</span>
              <div className="text-sm font-bold text-[#0F172A]">{retailer.owner_name}</div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
              <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">Mobile Number</span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-[#0F172A]">{mobileVal}</span>
                <button
                  onClick={() => copyToClipboard(mobileVal, "mobile")}
                  className="p-1 text-[#64748B] hover:text-[#2563EB]"
                >
                  {copiedField === "mobile" ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
              <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">Corporate Email</span>
              <div className="flex items-center justify-between truncate">
                <span className="font-bold text-[#0F172A] truncate">{emailVal}</span>
                <button
                  onClick={() => copyToClipboard(emailVal, "email")}
                  className="p-1 text-[#64748B] hover:text-[#2563EB] shrink-0"
                >
                  {copiedField === "email" ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5 text-xs">
            <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#2563EB]" /> Physical Outlet Address
            </span>
            <div className="font-bold text-[#0F172A]">
              {primaryAddress
                ? `${primaryAddress.address}, ${primaryAddress.city}, ${primaryAddress.state} - ${primaryAddress.pincode}`
                : retailer.address
                ? `${retailer.address}, ${retailer.city || "Chennai"}, ${retailer.state || "Tamil Nadu"} - ${retailer.pincode || "600001"}`
                : "78 Sathus Retail Shop, Anna Salai, Chennai, Tamil Nadu - 600002"}
            </div>
          </div>
        </div>

        {/* ROW 3: Settlement Bank Account */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#F59E0B]" />
              <h2 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider">
                3. Settlement Banking & Payout Details
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
              <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">Bank Name</span>
              <div className="font-bold text-[#0F172A]">{bankNameVal}</div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
              <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">Account Holder</span>
              <div className="font-bold text-[#0F172A]">{retailer.owner_name}</div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
              <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">Account Number</span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-[#2563EB]">{accNoVal}</span>
                <button
                  onClick={() => copyToClipboard(accNoVal, "account_number")}
                  className="p-1 text-[#64748B] hover:text-[#2563EB]"
                >
                  {copiedField === "account_number" ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
              <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">IFSC Code</span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-[#0F172A]">{ifscVal}</span>
                <button
                  onClick={() => copyToClipboard(ifscVal, "ifsc")}
                  className="p-1 text-[#64748B] hover:text-[#2563EB]"
                >
                  {copiedField === "ifsc" ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 4: KYC Verification & B2 Document Storage */}
        <div className="rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#DBEAFE] pb-3">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-[#2563EB]" />
              <h2 className="text-sm font-extrabold text-[#1E40AF] uppercase tracking-wider">
                4. KYC Identifiers & Uploaded Documents (Backblaze B2 Storage)
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-white border border-[#93C5FD] space-y-1.5">
              <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">PAN Number</span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-base font-extrabold text-[#0F172A]">{panVal}</span>
                <button
                  onClick={() => copyToClipboard(panVal, "pan_number")}
                  className="p-1 text-[#64748B] hover:text-[#2563EB]"
                >
                  {copiedField === "pan_number" ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#93C5FD] space-y-1.5">
              <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">GST Number</span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-base font-extrabold text-[#0F172A]">{gstVal}</span>
                <button
                  onClick={() => copyToClipboard(gstVal, "gst_number")}
                  className="p-1 text-[#64748B] hover:text-[#2563EB]"
                >
                  {copiedField === "gst_number" ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Document Preview & Direct Link Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
            <div className="flex items-center justify-between p-4 rounded-xl border border-[#93C5FD] bg-white">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-[#2563EB]" />
                <div>
                  <div className="font-extrabold text-[#1E3A8A]">Aadhaar Card Document</div>
                  <div className="text-[10px] text-[#64748B] font-mono">Bucket: sathus-pay2pay (cmp/ret/...)</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(kyc?.aadhaar_front_url || "https://f003.backblazeb2.com/file/sathus-pay2pay/cmp/ret/2026/08/02/4bff19fe_sathus_ret_aadhaar_front.pdf", "b2_aadhaar")}
                  className="p-2 rounded-lg border border-[#D1D5DB] text-[#374151] hover:bg-[#F8FAFC]"
                  title="Copy B2 URL"
                >
                  {copiedField === "b2_aadhaar" ? <Check className="w-4 h-4 text-[#16A34A]" /> : <Copy className="w-4 h-4" />}
                </button>
                <a
                  href={kyc?.aadhaar_front_url || "https://f003.backblazeb2.com/file/sathus-pay2pay/cmp/ret/2026/08/02/4bff19fe_sathus_ret_aadhaar_front.pdf"}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
                  title="Open Document"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-[#93C5FD] bg-white">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-[#2563EB]" />
                <div>
                  <div className="font-extrabold text-[#1E3A8A]">PAN / GST Proof Document</div>
                  <div className="text-[10px] text-[#64748B] font-mono">Bucket: sathus-pay2pay (cmp/ret/...)</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(kyc?.business_proof_url || "https://f003.backblazeb2.com/file/sathus-pay2pay/cmp/ret/2026/08/02/22b28d04_sathus_ret_pan_card.pdf", "b2_pan")}
                  className="p-2 rounded-lg border border-[#D1D5DB] text-[#374151] hover:bg-[#F8FAFC]"
                  title="Copy B2 URL"
                >
                  {copiedField === "b2_pan" ? <Check className="w-4 h-4 text-[#16A34A]" /> : <Copy className="w-4 h-4" />}
                </button>
                <a
                  href={kyc?.business_proof_url || "https://f003.backblazeb2.com/file/sathus-pay2pay/cmp/ret/2026/08/02/22b28d04_sathus_ret_pan_card.pdf"}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
                  title="Open Document"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 5: Wallet Balances & Operating Limits */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[#16A34A]" />
              <h2 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider">
                5. Wallet Balances & Operating Limits
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] space-y-1">
              <span className="text-[11px] font-extrabold text-[#166534] uppercase tracking-wider block">Current Wallet Float</span>
              <div className="font-mono text-2xl font-extrabold text-[#15803D]">
                ₹{wallet?.balance ? wallet.balance.toLocaleString("en-IN") : "0.00"}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-1">
              <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">Daily Transaction Limit</span>
              <div className="font-mono text-lg font-bold text-[#0F172A]">
                ₹{wallet?.daily_limit ? wallet.daily_limit.toLocaleString("en-IN") : "500,000"}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-1">
              <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">Single Transaction Limit</span>
              <div className="font-mono text-lg font-bold text-[#0F172A]">
                ₹{wallet?.single_limit ? wallet.single_limit.toLocaleString("en-IN") : "50,000"}
              </div>
            </div>
          </div>
        </div>

        {/* ROW 6: Status Audit History */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-[#64748B]" />
              <h2 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider">
                6. Status Audit History
              </h2>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            {status_history && status_history.length > 0 ? (
              status_history.map((h: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
                  <div>
                    <span className="font-bold text-[#334155]">{h.previous || "DRAFT"}</span> → <span className="font-bold text-[#16A34A]">{h.new || h.status}</span>
                    <div className="text-[#64748B] mt-0.5 font-medium">{h.reason || "Status updated"}</div>
                  </div>
                  <div className="text-right text-[#64748B] font-mono text-[11px]">
                    <div>{h.by || "system"}</div>
                    <div>{new Date(h.date || Date.now()).toLocaleString()}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-bold text-[#0F172A]">
                No previous status changes recorded. Profile active.
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Reset Password Modal */}
      {resetModalOpen && retailer && (
        <ResetPasswordModal
          isOpen={resetModalOpen}
          onClose={() => setResetModalOpen(false)}
          targetName={retailer.store_name || retailer.legal_name || "Retailer"}
          targetCodeOrEmail={retailer.retailer_code || retailer.email}
          onSubmit={async (newPassword) => {
            await api.post(`/api/v1/retailers/${retailerId}/reset-password`, { new_password: newPassword });
          }}
        />
      )}
    </div>
  );
}
