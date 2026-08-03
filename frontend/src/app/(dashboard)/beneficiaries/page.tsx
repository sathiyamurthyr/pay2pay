"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Building2, UserPlus, Search, Filter, RefreshCw, Eye, ShieldCheck, 
  CheckCircle2, Ban, Clock, X, CreditCard
} from "lucide-react";
import apiClient from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { EnterpriseDataGrid, ColumnConfig, SoftBadge } from "@/components/ui/enterprise-data-grid";

interface Beneficiary {
  public_id: string;
  beneficiary_number: string;
  customer_id: string;
  full_name: string;
  nickname: string | null;
  relationship: string;
  mobile_number: string | null;
  beneficiary_category: string;
  beneficiary_type: string;
  verification_status: string;
  risk_category: string;
  beneficiary_status: string;
  cooling_period_ends_at: string | null;
  is_favourite: boolean;
  registration_date: string | null;
}

export default function BeneficiaryDirectoryPage() {
  const { isRetailer, isAdmin, activeRole } = useAuth();
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);

  // Registration Modal State
  const [showRegModal, setShowRegModal] = useState(false);
  const [regForm, setRegForm] = useState({
    customer_id: "00000000-0000-0000-0000-000000000000",
    full_name: "",
    nickname: "",
    relationship: "FAMILY",
    mobile_number: "",
    email: "",
    beneficiary_category: "REGULAR",
    beneficiary_type: "INDIVIDUAL",
    account_number: "",
    ifsc_code: "",
    account_holder_name: "",
    bank_name: "",
    upi_id: "",
  });
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regError, setRegError] = useState("");

  const fetchBeneficiaries = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/beneficiaries");
      setBeneficiaries(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch beneficiaries", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeneficiaries();
  }, []);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegSubmitting(true);
    setRegError("");

    try {
      await apiClient.post("/beneficiaries", regForm);
      setShowRegModal(false);
      fetchBeneficiaries();
    } catch (err: any) {
      setRegError(err.response?.data?.message || "Failed to register beneficiary");
    } finally {
      setRegSubmitting(false);
    }
  };

  const columns: ColumnConfig<Beneficiary>[] = [
    {
      id: "full_name",
      header: "Beneficiary Details",
      cell: (b) => (
        <div>
          <p className="font-semibold text-[#1F2937] dark:text-white">{b.full_name}</p>
          <p className="text-xs text-[#6B7280] font-mono mt-0.5">{b.beneficiary_number}</p>
        </div>
      ),
      sortable: true,
    },
    {
      id: "relationship",
      header: "Relationship",
      cell: (b) => <span className="font-mono text-xs text-[#6B7280]">{b.relationship}</span>,
      sortable: true,
    },
    {
      id: "verification_status",
      header: "Verification",
      cell: (b) => <SoftBadge status={b.verification_status} />,
      sortable: true,
    },
    {
      id: "beneficiary_status",
      header: "Status",
      cell: (b) => <SoftBadge status={b.beneficiary_status} />,
      sortable: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#D9E2EC] dark:border-[#2A3B5C]">
        <div>
          <h1 className="ent-page-title">Beneficiary Registry &amp; Verification</h1>
          <p className="ent-caption mt-0.5">
            DMT payout beneficiary directory, penny drop verification &amp; cooling periods
          </p>
        </div>
        {isRetailer && (
          <button
            onClick={() => setShowRegModal(true)}
            className="ent-btn ent-btn-primary"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Beneficiary</span>
          </button>
        )}
      </div>

      {/* Role Banner */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-[#DBEAFE] border border-[#BFDBFE] text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#1D4ED8]" />
          <span className="font-bold text-[#1D4ED8]">
            {isRetailer
              ? "🏪 Retailer Portal — Primary Owner for Beneficiary Bank Account Registration & Penny Drop"
              : "👑 Platform Admin — Beneficiary Read-Only Governance & Risk Controls"}
          </span>
        </div>
        <span className="font-mono text-[11px] font-bold text-[#1D4ED8] bg-white px-2.5 py-0.5 rounded border border-[#BFDBFE]">
          Role: {activeRole}
        </span>
      </div>

      {/* Enterprise Data Grid */}
      <EnterpriseDataGrid
        columns={columns}
        data={beneficiaries}
        keyExtractor={(b) => b.public_id}
        loading={loading}
        onRefresh={fetchBeneficiaries}
        onViewRow={(b) => window.location.href = `/beneficiaries/beneficiary-360?id=${b.public_id}`}
        onAddNew={isRetailer ? () => setShowRegModal(true) : undefined}
        addNewLabel={isRetailer ? "Add Beneficiary" : undefined}
      />

      {/* Registration Modal */}
      {showRegModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-xl space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" /> Add New Beneficiary
              </h3>
              <button onClick={() => setShowRegModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {regError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-sm">
                {regError}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={regForm.full_name}
                    onChange={(e) => setRegForm({ ...regForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Relationship *</label>
                  <select
                    value={regForm.relationship}
                    onChange={(e) => setRegForm({ ...regForm, relationship: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="FAMILY">Family</option>
                    <option value="FRIEND">Friend</option>
                    <option value="BUSINESS">Business</option>
                    <option value="VENDOR">Vendor</option>
                    <option value="SELF">Self</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Bank Account Number</label>
                  <input
                    type="text"
                    placeholder="Account Number"
                    value={regForm.account_number}
                    onChange={(e) => setRegForm({ ...regForm, account_number: e.target.value, account_holder_name: regForm.full_name })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">IFSC Code</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC0001234"
                    value={regForm.ifsc_code}
                    onChange={(e) => setRegForm({ ...regForm, ifsc_code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">UPI ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. name@upi"
                  value={regForm.upi_id}
                  onChange={(e) => setRegForm({ ...regForm, upi_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRegModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={regSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-sm transition-all"
                >
                  {regSubmitting ? "Submitting..." : "Add Beneficiary"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
