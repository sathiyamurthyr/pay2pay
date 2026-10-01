"use client";

import React from "react";
import TopupRequestReportView from "@/components/reports/TopupRequestReportView";

export default function DistributorTopupRequestsReportPage() {
  return (
    <div className="space-y-4">
      <TopupRequestReportView
        userRole="DISTRIBUTOR"
        theme="dark"
        title="Distributor Topup Requests & Reconciliation Report"
        subtitle="Authoritative audit of wallet allocations, UTR reconciliation, mapped retailers & MDR deductions."
      />
    </div>
  );
}
