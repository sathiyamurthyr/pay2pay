"use client";

import React from "react";
import { GstReportModule } from "@/modules/reports/GstReportModule";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";

export default function AdminTaxReportPage() {
  const { branding } = useCompanyBranding();
  const compLabel = branding?.company_name || branding?.display_name || "Company";

  return (
    <GstReportModule
      portalType="admin"
      title="Admin Consolidated GST & Tax Report"
      subtitle={`Statutory multi-service tax reconciliation and GSTR statements for ${compLabel}.`}
    />
  );
}
