"use client";

import React from "react";
import { AppShell } from "@/app-shell/AppShell";
import DailyOpenCloseReportPage from "@/app/(dashboard)/admin/reports/daily-open-close/page";

export default function SDDailyOpenCloseReportPage() {
  return (
    <AppShell pageTitle="SD Portal — Daily Open & Close Reconciliation" activePath="/sd/reports/daily-open-close">
      <DailyOpenCloseReportPage />
    </AppShell>
  );
}
