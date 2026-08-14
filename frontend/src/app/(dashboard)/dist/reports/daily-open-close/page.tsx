"use client";

import React from "react";
import { AppShell } from "@/app-shell/AppShell";
import DailyOpenCloseReportPage from "@/app/(dashboard)/admin/reports/daily-open-close/page";

export default function DISTDailyOpenCloseReportPage() {
  return (
    <AppShell pageTitle="Distributor Portal — Daily Open & Close Reconciliation" activePath="/dist/reports/daily-open-close">
      <DailyOpenCloseReportPage />
    </AppShell>
  );
}
