"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Send, Search, RefreshCw, Eye, CheckCircle2, RotateCcw, 
  ShieldAlert, Clock, X 
} from "lucide-react";
import apiClient from "@/lib/api";
import { EnterpriseDataGrid, ColumnConfig } from "@/components/ui/enterprise-data-grid";

interface DmtTxn {
  public_id: string;
  transaction_number: string;
  rrn: string | null;
  utr: string | null;
  transfer_amount: number;
  service_charge: number;
  total_debit_amount: number;
  transaction_mode: string;
  bank_name: string;
  beneficiary_name: string;
  transaction_status: string;
  initiated_at: string;
}

export default function DmtTransactionsPage() {
  const [transactions, setTransactions] = useState<DmtTxn[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Reversal Modal State
  const [showRevModal, setShowRevModal] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<DmtTxn | null>(null);
  const [revReason, setRevReason] = useState("");
  const [reversing, setReversing] = useState(false);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (searchQuery) params.query = searchQuery;
      if (statusFilter) params.transaction_status = statusFilter;

      const res = await apiClient.get("/dmt/transfers", { params });
      setTransactions(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch DMT transactions", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions();
  };

  const handleReversalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTxn) return;
    setReversing(true);

    try {
      await apiClient.post(`/dmt/transfers/${selectedTxn.public_id}/reverse`, {
        reason: revReason || "Customer Dispute Reversal",
      });
      setShowRevModal(false);
      setSelectedTxn(null);
      setRevReason("");
      fetchTransactions();
    } catch (err) {
      console.error("Failed to reverse transaction", err);
    } finally {
      setReversing(false);
    }
  };

  const columns: ColumnConfig<DmtTxn>[] = [
    {
      id: "transaction_number",
      header: "Transaction Details",
      cell: (t) => (
        <div>
          <p className="font-semibold text-[#1F2937] dark:text-white font-mono">{t.transaction_number}</p>
          <p className="text-xs text-[#6B7280]">{new Date(t.initiated_at).toLocaleString()}</p>
        </div>
      ),
      sortable: true,
    },
    {
      id: "beneficiary_name",
      header: "Beneficiary & Bank",
      cell: (t) => (
        <div>
          <p className="font-medium text-[#1F2937] dark:text-white">{t.beneficiary_name}</p>
          <p className="text-xs text-[#6B7280]">{t.bank_name}</p>
        </div>
      ),
      sortable: true,
    },
    {
      id: "transfer_amount",
      header: "Amount & Debit",
      cell: (t) => (
        <div className="font-mono">
          <p className="font-semibold text-[#1F2937] dark:text-white">₹{t.transfer_amount?.toLocaleString()}</p>
          <p className="text-xs text-[#6B7280]">Debit: ₹{t.total_debit_amount}</p>
        </div>
      ),
      sortable: true,
      isNumeric: true,
    },
    {
      id: "utr",
      header: "UTR / RRN Identification",
      cell: (t) => (
        <span className="font-mono text-xs font-semibold text-[#123B73] dark:text-[#60A5FA]">
          {t.utr || t.rrn || "N/A"}
        </span>
      ),
      sortable: true,
    },
    {
      id: "transaction_status",
      header: "Status",
      cell: (t) => (
        <span className={`ent-badge ${
          t.transaction_status === "SUCCESS" 
            ? "ent-badge-success"
            : t.transaction_status === "REVERSED"
            ? "ent-badge-error"
            : "ent-badge-warning"
        }`}>
          {t.transaction_status}
        </span>
      ),
      sortable: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E7EB]">
        <div>
          <h1 className="ent-page-title">DMT Money Transfer Explorer</h1>
          <p className="ent-caption mt-0.5">
            Real-time audit ledger of Domestic Money Transfers, UTR numbers &amp; instant reversals
          </p>
        </div>
      </div>

      {/* Enterprise Data Grid */}
      <EnterpriseDataGrid
        columns={columns}
        data={transactions}
        keyExtractor={(t) => t.public_id}
        loading={loading}
        onRefresh={fetchTransactions}
        numericSumKey="transfer_amount"
        onViewRow={(t) => { setSelectedTxn(t); setShowRevModal(true); }}
        bulkActions={[
          {
            label: "Reverse Selected Transactions",
            variant: "danger",
            action: (selected) => {
              alert(`Initiating reversal request for ${selected.length} transactions.`);
            }
          }
        ]}
      />

      {/* Reversal Modal */}
      {showRevModal && selectedTxn && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl text-[#111827]">
            <h3 className="text-lg font-extrabold text-[#111827] flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-[#DC2626]" /> Reverse DMT Transaction
            </h3>
            <p className="text-xs text-[#6B7280]">
              Txn: <span className="font-mono text-[#111827] font-bold">{selectedTxn.transaction_number}</span> | Amount: <strong className="text-[#111827]">₹{selectedTxn.total_debit_amount}</strong>
            </p>

            <form onSubmit={handleReversalSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-[#6B7280] font-bold block mb-1">Reversal Reason *</label>
                <textarea
                  required
                  value={revReason}
                  onChange={(e) => setRevReason(e.target.value)}
                  placeholder="Enter detailed reason for manual reversal..."
                  className="w-full px-3 py-2 bg-white border border-[#D1D5DB] rounded-lg text-sm text-[#111827] focus:outline-none focus:border-[#2563EB] h-24"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRevModal(false)}
                  className="px-4 py-2 border border-[#D1D5DB] bg-white text-[#374151] rounded-lg text-xs font-bold hover:bg-[#FAFBFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reversing}
                  className="px-4 py-2 bg-[#DC2626] text-white rounded-lg text-xs font-bold hover:bg-[#B91C1C]"
                >
                  {reversing ? "Reversing..." : "Confirm Reversal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
