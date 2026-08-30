"use client";

import React from "react";
import { AppShell } from "@/app-shell/AppShell";
import { EnterpriseReportCenter } from "@/modules/report-center/EnterpriseReportCenter";

export default function RetailerTaxReportPage() {
  return (
    <AppShell pageTitle="Retailer Portal — Tax & GST Report" activePath="/retailer/reports/tax">
      <EnterpriseReportCenter />
    </AppShell>
  );
}
