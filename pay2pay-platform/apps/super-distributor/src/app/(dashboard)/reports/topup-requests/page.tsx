"use client";

import React from "react";
import TopupRequestReportView from "@/components/reports/TopupRequestReportView";

export default function SDReportsTopupRequestsPage() {
  return (
    <div className="space-y-4">
      <TopupRequestReportView
        userRole="SUPER_DISTRIBUTOR"
        theme="dark"
        title="Topup Requests & Settlement Audit Report"
        subtitle="Network-wide topup allocations, UTR reconciliation, mapped distributors & fee audits."
      />
    </div>
  );
}
