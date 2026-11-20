"use client";

import React from "react";
import { RetailerPayinReport } from "@/modules/reports/RetailerPayinReport";

export default function AdminPayinReportPage() {
  return (
    <RetailerPayinReport
      portalType="admin"
      title="Admin PayIn Transaction Report"
      subtitle="Searchable, auditable real-time view of all PayIn collections across companies, gateways, and retailer outlets."
    />
  );
}
