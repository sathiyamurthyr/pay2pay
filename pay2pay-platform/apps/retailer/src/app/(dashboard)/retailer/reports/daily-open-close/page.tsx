"use client";

import React from "react";
import { AppShell } from "@/app-shell/AppShell";
import DailyOpenCloseReportPage from "@/app/(dashboard)/admin/reports/daily-open-close/page";

export default function RetailerDailyOpenCloseReportPage() {
  return (
    <AppShell pageTitle="Retailer Portal — Daily Open & Close Report" activePath="/retailer/reports/daily-open-close">
      <DailyOpenCloseReportPage />
    </AppShell>
  );
}
