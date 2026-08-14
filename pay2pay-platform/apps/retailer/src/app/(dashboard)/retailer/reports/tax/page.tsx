"use client";

import React from "react";
import { AppShell } from "@/app-shell/AppShell";
import TaxReportPage from "@/app/(dashboard)/admin/reports/tax/page";

export default function RetailerTaxReportPage() {
  return (
    <AppShell pageTitle="Retailer Portal — Tax Report" activePath="/retailer/reports/tax">
      <TaxReportPage />
    </AppShell>
  );
}
