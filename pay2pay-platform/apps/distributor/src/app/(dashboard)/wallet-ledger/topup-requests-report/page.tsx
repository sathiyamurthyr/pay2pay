"use client";

import React from "react";
import TopupRequestReportView from "@/components/reports/TopupRequestReportView";

export default function DistributorWalletLedgerTopupReportPage() {
  return (
    <div className="space-y-4">
      <TopupRequestReportView
        userRole="DISTRIBUTOR"
        theme="dark"
        title="Wallet Ledger: Topup Requests & Reconciliation"
        subtitle="Central platform audit ledger for topup allocations, UTR tracking, and charges breakdown."
      />
    </div>
  );
}
