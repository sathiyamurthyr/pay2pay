"use client";

import React from "react";
import { GstReportModule } from "@/modules/reports/GstReportModule";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";

export default function AdminGstReportPage() {
  const { branding } = useCompanyBranding();
  const compLabel = branding?.company_name || branding?.display_name || "Company";

  return (
    <GstReportModule
      portalType="admin"
      title="Admin Consolidated GST Report"
      subtitle={`Comprehensive statutory service-wise GST reconciliation for ${compLabel} across retailers and gateways.`}
    />
  );
}
