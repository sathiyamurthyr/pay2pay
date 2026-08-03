"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Users, UserPlus, Search, Filter, RefreshCw, Eye, ShieldCheck, 
  AlertCircle, CheckCircle2, Ban, Clock, X, ChevronRight 
} from "lucide-react";
import apiClient from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { EnterpriseDataGrid, ColumnConfig, SoftBadge } from "@/components/ui/enterprise-data-grid";

interface Customer {
  public_id: string;
  customer_number: string;
  customer_category: string;
  customer_type: string;
  full_name: string;
  mobile_number: string;
  email: string | null;
  kyc_level: string;
  kyc_status: string;
  risk_category: string;
  customer_status: string;
  registration_date: string | null;
}

export default function CustomerDirectoryPage() {
  const { isRetailer } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Registration Modal State
  const [showRegModal, setShowRegModal] = useState(false);
  const [regForm, setRegForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    mobile_number: "",
    email: "",
    dob: "",
    gender: "MALE",
    customer_category: "REGULAR",
    customer_type: "INDIVIDUAL",
  });
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regError, setRegError] = useState("");

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/customers");
      setCustomers(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch customers", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegSubmitting(true);
    setRegError("");

    try {
      await apiClient.post("/customers", regForm);
      setShowRegModal(false);
      setRegForm({
        first_name: "", middle_name: "", last_name: "",
        mobile_number: "", email: "", dob: "", gender: "MALE",
        customer_category: "REGULAR", customer_type: "INDIVIDUAL",
      });
      fetchCustomers();
    } catch (err: any) {
      setRegError(err.response?.data?.message || "Failed to register customer");
    } finally {
      setRegSubmitting(false);
    }
  };

  const columns: ColumnConfig<Customer>[] = [
    {
      id: "full_name",
      header: "Customer Details",
      cell: (c) => (
        <div>
          <p className="font-semibold text-[#1F2937] dark:text-white">{c.full_name}</p>
          <p className="text-xs text-[#6B7280] font-mono mt-0.5">{c.customer_number}</p>
        </div>
      ),
      sortable: true,
    },
    {
      id: "mobile_number",
      header: "Mobile & Email",
      cell: (c) => (
        <div>
          <p className="text-[#1F2937] dark:text-white">{c.mobile_number}</p>
          <p className="text-xs text-[#6B7280]">{c.email || "No email"}</p>
        </div>
      ),
      sortable: true,
    },
    {
      id: "customer_category",
      header: "Category",
      cell: (c) => <span className="font-mono text-xs text-[#123B73] font-semibold">{c.customer_category}</span>,
      sortable: true,
    },
    {
      id: "kyc_level",
      header: "KYC Level",
      cell: (c) => <span className="font-mono text-xs text-[#6B7280]">{c.kyc_level}</span>,
      sortable: true,
    },
    {
      id: "customer_status",
      header: "Status",
      cell: (c) => <SoftBadge status={c.customer_status} />,
      sortable: true,
    },
    {
      id: "risk_category",
      header: "Risk Category",
      cell: (c) => <SoftBadge status={c.risk_category === "HIGH" ? "BLOCKED" : "ACTIVE"} />,
      sortable: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E7EB]">
        <div>
          <h1 className="ent-page-title">Customer Directory</h1>
          <p className="ent-caption mt-0.5">
            Full customer registry, KYC tier management &amp; Customer 360° view
          </p>
        </div>
        {isRetailer && (
          <button
            onClick={() => setShowRegModal(true)}
            className="ent-btn ent-btn-primary"
          >
            <UserPlus className="w-4 h-4" />
            <span>New Customer Registration</span>
          </button>
        )}
      </div>

      {/* Enterprise Data Grid */}
      <EnterpriseDataGrid
        columns={columns}
        data={customers}
        keyExtractor={(c) => c.public_id}
        loading={loading}
        onRefresh={fetchCustomers}
        onViewRow={(c) => window.location.href = `/customers/customer-360?id=${c.public_id}`}
        onAddNew={isRetailer ? () => setShowRegModal(true) : undefined}
        addNewLabel={isRetailer ? "Register Customer" : undefined}
      />

      {/* Registration Modal */}
      {showRegModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 w-full max-w-xl space-y-5 shadow-xl">
            <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-4">
              <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#6C63FF]" /> New Customer Registration
              </h3>
              <button onClick={() => setShowRegModal(false)} className="text-[#94A3B8] hover:text-[#0F172A] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {regError && (
              <div className="p-3 bg-[#FEE2E2] border border-[#FECACA] rounded-lg text-[#991B1B] text-sm">
                {regError}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="ent-label">First Name *</label>
                  <input
                    type="text"
                    required
                    value={regForm.first_name}
                    onChange={(e) => setRegForm({ ...regForm, first_name: e.target.value })}
                    className="ent-input"
                  />
                </div>
                <div>
                  <label className="ent-label">Middle Name</label>
                  <input
                    type="text"
                    value={regForm.middle_name}
                    onChange={(e) => setRegForm({ ...regForm, middle_name: e.target.value })}
                    className="ent-input"
                  />
                </div>
                <div>
                  <label className="ent-label">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={regForm.last_name}
                    onChange={(e) => setRegForm({ ...regForm, last_name: e.target.value })}
                    className="ent-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ent-label">Mobile Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="10-digit mobile"
                    value={regForm.mobile_number}
                    onChange={(e) => setRegForm({ ...regForm, mobile_number: e.target.value })}
                    className="ent-input"
                  />
                </div>
                <div>
                  <label className="ent-label">Email Address</label>
                  <input
                    type="email"
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    className="ent-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="ent-label">Date of Birth</label>
                  <input
                    type="date"
                    value={regForm.dob}
                    onChange={(e) => setRegForm({ ...regForm, dob: e.target.value })}
                    className="ent-input"
                  />
                </div>
                <div>
                  <label className="ent-label">Category</label>
                  <select
                    value={regForm.customer_category}
                    onChange={(e) => setRegForm({ ...regForm, customer_category: e.target.value })}
                    className="ent-input pr-8"
                  >
                    <option value="REGULAR">Regular</option>
                    <option value="PREMIUM">Premium</option>
                    <option value="VIP">VIP</option>
                    <option value="CORPORATE">Corporate</option>
                  </select>
                </div>
                <div>
                  <label className="ent-label">Type</label>
                  <select
                    value={regForm.customer_type}
                    onChange={(e) => setRegForm({ ...regForm, customer_type: e.target.value })}
                    className="ent-input pr-8"
                  >
                    <option value="INDIVIDUAL">Individual</option>
                    <option value="BUSINESS">Business</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowRegModal(false)}
                  className="ent-btn ent-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={regSubmitting}
                  className="ent-btn ent-btn-primary"
                >
                  {regSubmitting ? "Registering..." : "Submit Registration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
