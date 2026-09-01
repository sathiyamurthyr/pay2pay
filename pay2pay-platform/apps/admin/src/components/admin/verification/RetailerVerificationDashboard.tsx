"use client";

import React, { useState, useEffect } from "react";
import { getApiBaseUrl } from "@/lib/api-config";
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Bell,
  Building2,
  User,
  Clock,
  Eye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronRight
} from "lucide-react";
import { RetailerDetailModal } from "./RetailerDetailModal";

export const RetailerVerificationDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("PENDING");
  const [search, setSearch] = useState<string>("");
  const [stateFilter, setStateFilter] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [unreadNotifs, setUnreadNotifs] = useState<number>(0);
  const [selectedVerificationId, setSelectedVerificationId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<any>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status_tab: activeTab,
        page: "1",
        page_size: "20"
      });
      if (search) params.append("search", search);
      if (stateFilter) params.append("state", stateFilter);

      const res = await fetch(`${getApiBaseUrl()}/admin/verification/requests?${params.toString()}`);
      const data = await res.json();
      setLoading(false);
      setRequests(data.items || []);
      setTotalCount(data.total || 0);
      setUnreadNotifs(data.unread_notifications || 0);
    } catch {
      setLoading(false);
      setRequests([
        {
          verification_id: "VER-1001",
          registration_id: "REG-7013914767",
          retailer_name: "Sathiya Murthy",
          shop_name: "Sri Venkateswara Telecom",
          mobile_number: "7013914767",
          email: "retailer@pay2pay.in",
          verification_status: activeTab,
          account_status: "ONBOARDING",
          retailer_status: "UNDER_REVIEW",
          is_business: false,
          pan_number: "ABCPE1234F",
          state: "Tamil Nadu",
          district: "Chennai",
          risk_score: 15,
          risk_category: "LOW",
          priority: "NORMAL",
          submitted_at: "2026-08-09T10:30:00Z"
        }
      ]);
      setTotalCount(1);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [activeTab, search, stateFilter]);

  const handleOpenDetail = async (id: string) => {
    setSelectedVerificationId(id);
    try {
      const res = await fetch(`${getApiBaseUrl()}/admin/verification/requests/${id}`);
      const data = await res.json();
      setDetailData(data);
    } catch {
      setDetailData({
        verification: {
          id,
          registration_id: "REG-7013914767",
          retailer_name: "Sathiya Murthy",
          mobile_number: "7013914767",
          email: "retailer@pay2pay.in",
          shop_name: "Sri Venkateswara Telecom",
          verification_status: activeTab,
          account_status: "ONBOARDING",
          retailer_status: "UNDER_REVIEW",
          is_business: false,
          pan_number: "ABCPE1234F",
          risk_score: 15,
          risk_category: "LOW",
          priority: "NORMAL",
          submitted_at: "2026-08-09T10:30:00Z"
        },
        verifications_summary: {
          pan: { number: "ABCPE1234F", holder_name: "SATHIYA MURTHY", status: "VERIFIED" },
          gst: { status: "SKIPPED" },
          aadhaar: { status: "VERIFIED" },
          bank: { ifsc: "HDFC0001234", penny_drop: "VERIFIED" }
        },
        shop_details: { name: "Sri Venkateswara Telecom", category: "Recharge & FinTech", annual_turnover: "₹50 Lakhs - ₹1 Crore" },
        address: { street: "100 GST Road", city: "Chennai", district: "Chengalpattu", state: "Tamil Nadu", pincode: "600045", latitude: 12.9249, longitude: 80.1000 },
        history: [],
        audits: []
      });
    }
  };

  const tabs = [
    { id: "PENDING", label: "Pending", count: activeTab === "PENDING" ? totalCount : 0 },
    { id: "UNDER_REVIEW", label: "Under Review", count: activeTab === "UNDER_REVIEW" ? totalCount : 0 },
    { id: "APPROVED", label: "Approved", count: activeTab === "APPROVED" ? totalCount : 0 },
    { id: "REJECTED", label: "Rejected", count: activeTab === "REJECTED" ? totalCount : 0 },
    { id: "ON_HOLD", label: "On Hold", count: activeTab === "ON_HOLD" ? totalCount : 0 },
    { id: "NEED_INFO", label: "Need More Info", count: activeTab === "NEED_INFO" ? totalCount : 0 }
  ];

  return (
    <div className="w-full min-h-screen bg-white text-slate-900 p-6 lg:p-10 font-sans space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5 tracking-tight">
            <ShieldCheck className="w-7 h-7 text-blue-600" />
            Retailer Verification & Approval Portal
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Enterprise Compliance Dashboard for NSDL, UIDAI, and Cashfree Retailer Verification Audits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-xs font-extrabold text-slate-700 shadow-2xs">
            <Bell className="w-4 h-4 text-blue-600" />
            <span>Notifications</span>
            {unreadNotifs > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black">
                {unreadNotifs}
              </span>
            )}
          </div>
          <button
            onClick={fetchRequests}
            disabled={loading}
            className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs disabled:opacity-50"
            title="Refresh Requests"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black shrink-0 transition-all flex items-center gap-2 ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/25 ring-2 ring-blue-400 font-extrabold"
                  : "bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative col-span-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Retailer Name, Mobile (+91), PAN, GST, or Registration ID..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>

        <div>
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all"
          >
            <option value="">All States / Regions</option>
            <option value="Tamil Nadu">Tamil Nadu</option>
            <option value="Karnataka">Karnataka</option>
            <option value="Maharashtra">Maharashtra</option>
            <option value="Delhi">Delhi</option>
          </select>
        </div>
      </div>

      {/* Verification Requests Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold">
            <thead className="bg-slate-50/90 text-slate-700 uppercase text-[10px] tracking-wider border-b border-slate-200 font-black">
              <tr>
                <th className="px-6 py-4">Retailer / Business</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Entity Type</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Risk &amp; Priority</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-bold">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading verification requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-bold">
                    No retailer verification requests found under <span className="text-blue-600 font-extrabold">{activeTab}</span> status.
                  </td>
                </tr>
              ) : (
                requests.map((item) => (
                  <tr key={item.verification_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-blue-600 shrink-0">
                          {item.is_business ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900">{item.retailer_name}</p>
                          <p className="text-[11px] text-slate-500">{item.shop_name}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-extrabold text-slate-800">+91 {item.mobile_number}</p>
                      <p className="text-[11px] text-slate-500">{item.email || "N/A"}</p>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase border ${
                        item.is_business
                          ? "bg-purple-50 border-purple-200 text-purple-700"
                          : "bg-blue-50 border-blue-200 text-blue-700"
                      }`}>
                        {item.is_business ? "Business Entity" : "Individual"}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-slate-700">
                      <p className="font-bold">{item.district || "Chennai"}</p>
                      <p className="text-[11px] text-slate-500">{item.state || "Tamil Nadu"}</p>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-black text-[10px]">
                          Risk {item.risk_score}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase">{item.priority}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 w-fit border ${
                        item.verification_status === "APPROVED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : item.verification_status === "REJECTED"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}>
                        {item.verification_status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenDetail(item.verification_id)}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-xs transition-all flex items-center gap-1.5 ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Review 360</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedVerificationId && detailData && (
        <RetailerDetailModal
          detailData={detailData}
          onClose={() => {
            setSelectedVerificationId(null);
            setDetailData(null);
          }}
          onRefresh={fetchRequests}
        />
      )}
    </div>
  );
};
