"use client";

import React from "react";
import { AppShell } from "@/app-shell/AppShell";
import TaxReportPage from "@/app/(dashboard)/admin/reports/tax/page";

export default function SDTaxReportPage() {
  return (
    <AppShell pageTitle="SD Portal — Tax & GST Report" activePath="/sd/reports/tax">
      <TaxReportPage />
    </AppShell>
  );
}
