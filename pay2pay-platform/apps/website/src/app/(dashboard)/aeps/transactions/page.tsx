"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Fingerprint, Search, RefreshCw, Eye, CheckCircle2, ShieldCheck 
} from "lucide-react";
import apiClient from "@/lib/api";
import { EnterpriseDataGrid, ColumnConfig, SoftBadge } from "@/components/ui/enterprise-data-grid";

interface AepsTxn {
  public_id: string;
  transaction_number: string;
  rrn: string | null;
  masked_aadhaar: string;
  bank_name: string;
  service_type: string;
  transaction_amount: number;
  retailer_commission: number;
  transaction_status: string;
  initiated_at: string;
}

export default function AepsTransactionsPage() {
  const [transactions, setTransactions] = useState<AepsTxn[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/aeps/transfers");
      setTransactions(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch AEPS transactions", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const columns: ColumnConfig<AepsTxn>[] = [
    {
      id: "transaction_number",
      header: "Transaction Details",
      cell: (t) => (
        <div>
          <p className="font-semibold text-[#1F2937] dark:text-white font-mono">{t.transaction_number}</p>
          <p className="text-xs text-[#123B73] dark:text-[#60A5FA] font-mono">RRN: {t.rrn || "N/A"}</p>
        </div>
      ),
      sortable: true,
    },
    {
      id: "masked_aadhaar",
      header: "Masked Aadhaar & Bank",
      cell: (t) => (
        <div>
          <p className="font-mono font-medium text-[#1F2937] dark:text-white">{t.masked_aadhaar}</p>
          <p className="text-xs text-[#6B7280]">{t.bank_name}</p>
        </div>
      ),
      sortable: true,
    },
    {
      id: "transaction_amount",
      header: "Service & Amount",
      cell: (t) => (
        <div>
          <p className="font-semibold text-[#1F2937] dark:text-white">₹{t.transaction_amount?.toLocaleString()}</p>
          <p className="text-xs text-[#6B7280]">{t.service_type}</p>
        </div>
      ),
      sortable: true,
      isNumeric: true,
    },
    {
      id: "retailer_commission",
      header: "Retailer Comm",
      cell: (t) => (
        <span className="font-mono text-xs text-[#16A34A] font-bold">
          +₹{t.retailer_commission}
        </span>
      ),
      sortable: true,
      isNumeric: true,
    },
    {
      id: "transaction_status",
      header: "Status",
      cell: (t) => <SoftBadge status={t.transaction_status} />,
      sortable: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#D9E2EC] dark:border-[#2A3B5C]">
        <div>
          <h1 className="ent-page-title">AEPS Transaction Explorer</h1>
          <p className="ent-caption mt-0.5">
            Audit trail of Aadhaar Cash Withdrawals, RRN numbers &amp; commission earnings
          </p>
        </div>
        <Link
          href="/aeps/services"
          className="ent-btn ent-btn-primary"
        >
          <Fingerprint className="w-4 h-4" />
          <span>AEPS Banking Portal</span>
        </Link>
      </div>

      {/* Enterprise Data Grid */}
      <EnterpriseDataGrid
        columns={columns}
        data={transactions}
        keyExtractor={(t) => t.public_id}
        loading={loading}
        onRefresh={fetchTransactions}
        numericSumKey="transaction_amount"
      />
    </div>
  );
}
