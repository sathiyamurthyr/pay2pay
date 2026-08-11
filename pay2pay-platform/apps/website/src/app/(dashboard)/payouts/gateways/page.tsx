"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Building2,
  RefreshCw,
  CheckCircle2,
  Zap
} from "lucide-react";

export default function BankGatewaysPage() {
  const [gateways, setGateways] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGateways = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/payouts/gateways");
      setGateways(res.data);
    } catch (err) {
      console.error("Failed to fetch bank gateways", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGateways();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Building2 className="h-8 w-8 text-blue-400" />
            Integrated Bank Payout Gateways
          </h1>
          <p className="mt-1 text-slate-400">
            Active acquiring & beneficiary bank adapters, endpoint URLs, and priority routing matrix
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#0F172A]">
            <thead className="bg-[#F8FAFC] uppercase font-mono text-xs text-[#111827] border-b border-[#E2E8F0]">
              <tr>
                <th className="px-5 py-4 font-extrabold text-[#111827]">Gateway Code</th>
                <th className="px-5 py-4 font-extrabold text-[#111827]">Gateway Name</th>
                <th className="px-5 py-4 font-extrabold text-[#111827]">API Endpoint</th>
                <th className="px-5 py-4 font-extrabold text-[#111827]">Priority</th>
                <th className="px-5 py-4 font-extrabold text-[#111827]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-[#64748B] font-medium">Loading Bank Gateways...</td></tr>
              ) : gateways.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-[#64748B] font-medium">No bank gateways configured.</td></tr>
              ) : (
                gateways.map((g) => (
                  <tr key={g.gateway_code} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-[#2563EB] font-extrabold">{g.gateway_code}</td>
                    <td className="px-5 py-4 font-bold text-[#0F172A]">{g.gateway_name}</td>
                    <td className="px-5 py-4 font-mono text-xs text-[#475569] font-medium">{g.api_endpoint}</td>
                    <td className="px-5 py-4 font-mono text-xs font-bold text-[#D97706]">Priority #{g.priority}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                        {g.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
