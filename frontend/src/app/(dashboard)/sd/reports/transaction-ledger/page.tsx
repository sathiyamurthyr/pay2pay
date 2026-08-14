"use client";

import React from "react";
import { AppShell } from "@/app-shell/AppShell";
import LedgerReportPage from "@/app/(dashboard)/admin/reports/transaction-ledger/page";

export default function SDLedgerReportPage() {
  return (
    <AppShell pageTitle="SD Portal — Transaction Ledger" activePath="/sd/reports/transaction-ledger">
      <LedgerReportPage />
    </AppShell>
  );
}
