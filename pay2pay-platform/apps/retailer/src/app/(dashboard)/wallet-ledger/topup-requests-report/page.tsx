"use client";

import React from "react";
import TopupRequestReportView from "@/components/reports/TopupRequestReportView";

export default function WalletLedgerTopupReportPage() {
  return (
    <div className="space-y-4">
      <TopupRequestReportView
        userRole="RETAILER"
        theme="light"
        title="Topup Requests & Settlement Audit Report"
        subtitle="Wallet allocation ledger, UTR tracking, MDR charges breakdown, and approval status audit."
      />
    </div>
  );
}
