"use client";

import React from "react";
import TopupRequestReportView from "@/components/reports/TopupRequestReportView";

export default function AdminTopupRequestsReportPage() {
  return (
    <div className="space-y-4">
      <TopupRequestReportView
        userRole="ADMIN"
        theme="light"
        title="Network Topup Requests & Reconciliation Report"
        subtitle="Dynamic multi-tenant ledger audit, payment slip verification, MDR deductions, and partner allocation tracking across SD, Distributor, and Retailer tiers."
      />
    </div>
  );
}
