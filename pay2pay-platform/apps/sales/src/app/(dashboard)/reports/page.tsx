"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { formatCurrency, formatDate, formatDateShort } from "@/lib/utils";
import {
  FileText, ArrowDownToLine, Store, QrCode, Receipt,
  Sliders, RefreshCw, Filter, Search, CheckCircle2
} from "lucide-react";
import * as XLSX from "xlsx";

export default function SalesReportsPage() {
  const [activeTab, setActiveTab] = useState<"RETAILER" | "POS" | "TRANSACTION" | "MDR">("RETAILER");

  // Fetch Retailers Report Data
  const { data: retailers = [], isLoading: isLoadingRetailers } = useQuery({
    queryKey: ["sales-report-retailers"],
    queryFn: async () => {
      const res = await apiClient.get("/sales/hierarchy/retailers?limit=500");
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: activeTab === "RETAILER",
  });

  // Fetch POS Report Data
  const { data: posList = [], isLoading: isLoadingPos } = useQuery({
    queryKey: ["sales-report-pos"],
    queryFn: async () => {
      const res = await apiClient.get("/sales/pos/machines");
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: activeTab === "POS",
  });

  // Fetch Transactions Report Data
  const { data: txns = [], isLoading: isLoadingTxns } = useQuery({
    queryKey: ["sales-report-txns"],
    queryFn: async () => {
      const res = await apiClient.get("/sales/transactions?limit=500");
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: activeTab === "TRANSACTION",
  });

  // Export to Excel / CSV
  const handleExport = () => {
    let exportData: any[] = [];
    let filename = "sales_report";

    if (activeTab === "RETAILER") {
      filename = "retailers_hierarchy_report";
      exportData = retailers.map((r: any) => ({
        "Store Name": r.store_name,
        "Retailer Code": r.retailer_code,
        "Owner Name": r.owner_name,
        "Mobile": r.mobile,
        "Distributor": r.distributor_name,
        "Super Distributor": r.super_distributor_name,
        "POS Machines": r.pos_count || 0,
        "Total Transactions": r.total_transactions_count || 0,
        "Total Volume (INR)": r.total_volume || 0,
        "Status": r.status,
      }));
    } else if (activeTab === "POS") {
      filename = "pos_terminals_report";
      exportData = posList.map((p: any) => ({
        "Terminal ID": p.terminal_id,
        "Serial Number": p.pos_machine_id,
        "Retailer Name": p.retailer_name,
        "Distributor": p.distributor_name,
        "Assigned Date": p.assigned_date,
        "Total Swipes": p.total_transactions_count || 0,
        "Gross Volume (INR)": p.total_volume || 0,
        "Status": p.status,
      }));
    } else if (activeTab === "TRANSACTION") {
      filename = "transactions_ledger_report";
      exportData = txns.map((t: any) => ({
        "Transaction ID": t.txn_id,
        "Date": t.created_at,
        "Service": t.service,
        "Retailer": t.retailer_name,
        "Distributor": t.distributor_name,
        "Amount (INR)": t.amount,
        "Commission (INR)": t.commission,
        "Status": t.status,
      }));
    } else {
      filename = "mdr_configuration_report";
      exportData = [
        { "Card Scheme": "Visa Credit & Debit", "Mode": "POS_INSTANT", "MDR (%)": "1.40%", "Status": "Active" },
        { "Card Scheme": "Mastercard Credit & Debit", "Mode": "POS_INSTANT", "MDR (%)": "1.40%", "Status": "Active" },
        { "Card Scheme": "RuPay Platinum & Commercial", "Mode": "POS_INSTANT", "MDR (%)": "1.25%", "Status": "Active" },
        { "Card Scheme": "Amex / Diners Club", "Mode": "POS_INSTANT", "MDR (%)": "2.20%", "Status": "Active" },
      ];
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6 w-full max-w-[1400px] 2xl:max-w-[1500px] mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#94003A] via-[#78002F] to-[#550020] border border-[#94003A]/20 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#E7B631] mb-2">
            <FileText className="w-4 h-4" />
            Governance, Compliance & Business Reports
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Sales Reports Center</h1>
          <p className="text-[#F8E6EE]/80 text-xs sm:text-sm mt-1 max-w-2xl font-medium">
            Export tenant-isolated reports for retail networks, hardware terminals, multi-service transactions, and MDR rate structures.
          </p>
        </div>

        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold shadow-sm transition"
        >
          <ArrowDownToLine className="w-4 h-4" />
          Export to Excel (.xlsx)
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-[#E5E7EB] shadow-xs overflow-x-auto">
        {[
          { id: "RETAILER", label: "Retailer Network Report", icon: Store },
          { id: "POS", label: "POS Terminals Report", icon: QrCode },
          { id: "TRANSACTION", label: "Transactions Report", icon: Receipt },
          { id: "MDR", label: "MDR Rate Report", icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 whitespace-nowrap ${
                isActive
                  ? "bg-[#94003A] text-white shadow-xs"
                  : "text-[#4B5563] hover:text-[#1F2937] hover:bg-[#FAFAFC]"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Report Data Preview */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden p-6 text-[#1F2937]">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
            Report Data Preview (Scoped)
          </div>
        </div>

        {activeTab === "RETAILER" && (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#FAFAFC] text-[#4B5563] uppercase font-bold">
                  <th className="py-3 px-4">Merchant Store</th>
                  <th className="py-3 px-4">Distributor</th>
                  <th className="py-3 px-4">Super Distributor</th>
                  <th className="py-3 px-4 text-center">POS Count</th>
                  <th className="py-3 px-4 text-right">Total Volume</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {retailers.slice(0, 15).map((r: any) => (
                  <tr key={r.public_id} className="hover:bg-[#FDF3F7]">
                    <td className="py-3 px-4 font-bold text-[#1F2937]">{r.store_name} ({r.retailer_code})</td>
                    <td className="py-3 px-4 text-[#4B5563]">{r.distributor_name}</td>
                    <td className="py-3 px-4 text-[#6B7280]">{r.super_distributor_name}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-[#D97706]">{r.pos_count || 0}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#16A34A]">
                      {formatCurrency(r.total_volume)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-[#DCFCE7] text-[#166534] text-[10px] font-bold border border-[#86EFAC]">
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "POS" && (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#FAFAFC] text-[#4B5563] uppercase font-bold">
                  <th className="py-3 px-4">Terminal ID</th>
                  <th className="py-3 px-4">Serial No</th>
                  <th className="py-3 px-4">Retailer</th>
                  <th className="py-3 px-4">Distributor</th>
                  <th className="py-3 px-4 text-right">Volume</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {posList.map((p: any) => (
                  <tr key={p.terminal_id} className="hover:bg-[#FDF3F7]">
                    <td className="py-3 px-4 font-bold text-[#1F2937] font-mono">{p.terminal_id}</td>
                    <td className="py-3 px-4 text-[#6B7280] font-mono">{p.pos_machine_id}</td>
                    <td className="py-3 px-4 text-[#1F2937] font-semibold">{p.retailer_name}</td>
                    <td className="py-3 px-4 text-[#4B5563]">{p.distributor_name}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#16A34A]">
                      {formatCurrency(p.total_volume)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-[#DCFCE7] text-[#166534] text-[10px] font-bold border border-[#86EFAC]">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "TRANSACTION" && (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#FAFAFC] text-[#4B5563] uppercase font-bold">
                  <th className="py-3 px-4">Txn ID</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Merchant</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {txns.slice(0, 15).map((t: any) => (
                  <tr key={t.id || t.txn_id} className="hover:bg-[#FDF3F7]">
                    <td className="py-3 px-4 font-bold text-[#1F2937] font-mono">{t.txn_id}</td>
                    <td className="py-3 px-4 text-[#6B7280] font-mono">{formatDate(t.created_at)}</td>
                    <td className="py-3 px-4 text-[#94003A] font-bold">{t.service}</td>
                    <td className="py-3 px-4 text-[#1F2937] font-medium">{t.retailer_name}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#1F2937]">
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-[#DCFCE7] text-[#166534] text-[10px] font-bold border border-[#86EFAC]">
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "MDR" && (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#FAFAFC] text-[#4B5563] uppercase font-bold">
                  <th className="py-3 px-4">Card Scheme / Type</th>
                  <th className="py-3 px-4">Settlement Mode</th>
                  <th className="py-3 px-4 text-center">MDR Rate (%)</th>
                  <th className="py-3 px-4 text-center">Governance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                <tr className="hover:bg-[#FDF3F7]">
                  <td className="py-3 px-4 font-bold text-[#1F2937]">Visa Credit & Debit</td>
                  <td className="py-3 px-4 text-[#4B5563]">POS - Instant Settlement</td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-[#D97706]">1.40%</td>
                  <td className="py-3 px-4 text-center text-[#16A34A] font-bold">Active Tenant Slab</td>
                </tr>
                <tr className="hover:bg-[#FDF3F7]">
                  <td className="py-3 px-4 font-bold text-[#1F2937]">Mastercard Credit & Debit</td>
                  <td className="py-3 px-4 text-[#4B5563]">POS - Instant Settlement</td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-[#D97706]">1.40%</td>
                  <td className="py-3 px-4 text-center text-[#16A34A] font-bold">Active Tenant Slab</td>
                </tr>
                <tr className="hover:bg-[#FDF3F7]">
                  <td className="py-3 px-4 font-bold text-[#1F2937]">RuPay Platinum & Commercial</td>
                  <td className="py-3 px-4 text-[#4B5563]">POS - Instant Settlement</td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-[#D97706]">1.25%</td>
                  <td className="py-3 px-4 text-center text-[#16A34A] font-bold">Active Tenant Slab</td>
                </tr>
                <tr className="hover:bg-[#FDF3F7]">
                  <td className="py-3 px-4 font-bold text-[#1F2937]">Amex / Diners Club</td>
                  <td className="py-3 px-4 text-[#4B5563]">POS - Instant Settlement</td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-[#D97706]">2.20%</td>
                  <td className="py-3 px-4 text-center text-[#16A34A] font-bold">Active Tenant Slab</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
