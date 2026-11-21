"use client";

import React from "react";
import { GstReportModule } from "@/modules/reports/GstReportModule";

export default function AdminGstReportPage() {
  return (
    <GstReportModule
      portalType="admin"
      title="Admin Consolidated GST Report"
      subtitle="Comprehensive statutory service-wise GST reconciliation for Sathus Technologies Private Limited across all companies, retailers, and gateways."
    />
  );
}
