"use client";

import React from "react";
import { AppShell } from "@/app-shell/AppShell";
import PayoutReportPage from "@/app/(dashboard)/admin/reports/payout-transactions/page";

export default function SDPayoutReportPage() {
  return (
    <AppShell pageTitle="SD Portal — Payout Transactions" activePath="/sd/reports/payout-transactions">
      <PayoutReportPage />
    </AppShell>
  );
}
