"use client";

import React from "react";
import { AppShell } from "@/app-shell/AppShell";
import LedgerReportPage from "@/app/(dashboard)/admin/reports/transaction-ledger/page";

export default function DISTLedgerReportPage() {
  return (
    <AppShell pageTitle="Distributor Portal — Transaction Ledger" activePath="/dist/reports/transaction-ledger">
      <LedgerReportPage />
    </AppShell>
  );
}
