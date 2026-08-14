"use client";

import React from "react";
import { AppShell } from "@/app-shell/AppShell";
import TaxReportPage from "@/app/(dashboard)/admin/reports/tax/page";

export default function DISTTaxReportPage() {
  return (
    <AppShell pageTitle="Distributor Portal — Tax & GST Report" activePath="/dist/reports/tax">
      <TaxReportPage />
    </AppShell>
  );
}
