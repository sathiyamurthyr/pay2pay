"use client";

import React from "react";
import { AppShell } from "@/app-shell/AppShell";
import PayoutReportPage from "@/app/(dashboard)/admin/reports/payout-transactions/page";

export default function DISTPayoutReportPage() {
  return (
    <AppShell pageTitle="Distributor Portal — Payout Transactions" activePath="/dist/reports/payout-transactions">
      <PayoutReportPage />
    </AppShell>
  );
}
