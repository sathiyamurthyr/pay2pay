"use client";

import React from "react";
import { GstReportModule } from "@/modules/reports/GstReportModule";

export default function AdminTaxReportPage() {
  return (
    <GstReportModule
      portalType="admin"
      title="Admin Consolidated GST & Tax Report"
      subtitle="Statutory multi-service tax reconciliation and GSTR statements for Sathus Technologies Private Limited."
    />
  );
}
