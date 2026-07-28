"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import {
  Store,
  Search,
  Plus,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  XCircle,
  ChevronRight,
  X
} from "lucide-react";

export default function RetailersPage() {
  const [retailers, setRetailers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modal & Setup Data
  const [showModal, setShowModal] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [distributors, setDistributors] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    retailer_code: "",
    store_name: "",
    legal_name: "",
    owner_name: "",
    business_category: "Electronics & Mobiles",
    store_type: "BRICK_AND_MORTAR",
    mapped_distributor_id: "",
    company_id: "",

    primary_contact: "",
    mobile: "",
    email: "",
    state: "Tamil Nadu",
    city: "Chennai",
    address: "",
    pincode: "600001",

    settlement_bank_name: "HDFC Bank",
    account_holder: "",
    account_number: "",
    ifsc: "HDFC0001234",

    pan_number: "",
    gst_number: "",
    aadhaar_number: ""
  });

  const fetchRetailers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/retailers", {
        params: { search, status: statusFilter }
      });
      setRetailers(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      console.error("Failed to fetch retailers", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSetupData = async () => {
    try {
      const compRes = await api.get("/api/v1/companies");
      setCompanies(compRes.data.items);

      const distRes = await api.get("/api/v1/organization/distributors");
      setDistributors(distRes.data.items);

      if (compRes.data.items.length > 0) {
        setFormData(prev => ({ ...prev, company_id: compRes.data.items[0].public_id }));
      }
      if (distRes.data.items.length > 0) {
        setFormData(prev => ({ ...prev, mapped_distributor_id: distRes.data.items[0].public_id }));
      }
    } catch (err) {
      console.error("Failed to load setup data", err);
    }
  };

  useEffect(() => {
    fetchRetailers();
    fetchSetupData();
  }, [search, statusFilter]);

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/retailers", formData);
      setShowModal(false);
      fetchRetailers();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Retailer onboarding failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Store className="h-8 w-8 text-emerald-400" />
            Retailer Directory & Onboarding
          </h1>
          <p className="mt-1 text-slate-400">
            Multi-tenant merchant directory, settlement accounts & KYC verification workflows
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition-all"
        >
          <Plus className="h-4 w-4" />
          Onboard Retailer
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search store name, retailer code, owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950/60 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="PENDING_APPROVAL">PENDING APPROVAL</option>
          <option value="SUSPENDED">SUSPENDED</option>
        </select>
      </div>

      {/* Grid Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 uppercase font-mono text-xs text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">Retailer Code</th>
                <th className="px-5 py-4">Store & Legal Name</th>
                <th className="px-5 py-4">Owner</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    Loading Retailer Network...
                  </td>
                </tr>
              ) : retailers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    No retailer outlets found matching query.
                  </td>
                </tr>
              ) : (
                retailers.map((r) => (
                  <tr key={r.public_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-emerald-400 font-semibold">{r.retailer_code}</td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-100">{r.store_name}</div>
                      <div className="text-xs text-slate-400">{r.legal_name}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-200">{r.owner_name}</td>
                    <td className="px-5 py-4 text-xs font-mono text-slate-400">{r.business_category}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          r.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/retailers/${r.public_id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:underline"
                      >
                        View Profile <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Onboarding Wizard Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Store className="h-5 w-5 text-emerald-400" />
                Retailer Onboarding Wizard
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleOnboardSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-slate-300">Retailer Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="RET-CHE-101"
                    value={formData.retailer_code}
                    onChange={(e) => setFormData({ ...formData, retailer_code: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-300">Mapped Distributor *</label>
                  <select
                    value={formData.mapped_distributor_id}
                    onChange={(e) => setFormData({ ...formData, mapped_distributor_id: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                  >
                    {distributors.map((d) => (
                      <option key={d.public_id} value={d.public_id}>{d.business_name} ({d.email})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-slate-300">Store Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Sri Venkateswara Mobiles"
                    value={formData.store_name}
                    onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-300">Legal Business Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Sri Venkateswara Traders Pvt Ltd"
                    value={formData.legal_name}
                    onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="font-medium text-slate-300">Owner Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Venkatesh Rao"
                    value={formData.owner_name}
                    onChange={(e) => setFormData({ ...formData, owner_name: e.target.value, primary_contact: e.target.value, account_holder: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-300">Mobile (10 Digits) *</label>
                  <input
                    type="text"
                    required
                    placeholder="9876543210"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-300">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="store@pay2pay.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-slate-300">Settlement Bank Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="HDFC Bank"
                    value={formData.settlement_bank_name}
                    onChange={(e) => setFormData({ ...formData, settlement_bank_name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-300">Account Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="50100234567890"
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-slate-300">IFSC Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="HDFC0001234"
                    value={formData.ifsc}
                    onChange={(e) => setFormData({ ...formData, ifsc: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-300">Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="78 Anna Salai, Chennai"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 shadow-lg"
                >
                  Onboard Retailer Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
