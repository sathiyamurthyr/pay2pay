"use client";

import React from "react";
import { AppShell } from "@/app-shell/AppShell";
import { RetailerLedgerReport } from "@/modules/reports/RetailerLedgerReport";

export default function RetailerDailyOpenCloseReportPage() {
  return (
    <AppShell pageTitle="Retailer Portal — Daily Open & Close Reconciliation" activePath="/retailer/reports/daily-open-close">
      <RetailerLedgerReport />
    </AppShell>
  );
}
