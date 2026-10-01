"use client";

import React from "react";
import TopupRequestReportView from "@/components/reports/TopupRequestReportView";

export default function DistributorReportsTopupRequestsPage() {
  return (
    <div className="space-y-4">
      <TopupRequestReportView
        userRole="DISTRIBUTOR"
        theme="dark"
        title="Distributor Topup Requests & Settlement Report"
        subtitle="Hierarchy tracking, approval lifecycle, MDR deduction audits, and payment slip proofs."
      />
    </div>
  );
}
