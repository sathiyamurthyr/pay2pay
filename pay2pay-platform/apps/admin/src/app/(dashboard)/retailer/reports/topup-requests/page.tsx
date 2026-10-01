"use client";

import React from "react";
import TopupRequestReportView from "@/components/reports/TopupRequestReportView";

export default function RetailerTopupReportPage() {
  return (
    <div className="space-y-4">
      <TopupRequestReportView
        userRole="RETAILER"
        theme="light"
        title="Topup Requests & Settlement Audit Report"
        subtitle="Live ledger audit, payment slip proofs, MDR deductions, and multi-tenant hierarchy tracking."
      />
    </div>
  );
}
