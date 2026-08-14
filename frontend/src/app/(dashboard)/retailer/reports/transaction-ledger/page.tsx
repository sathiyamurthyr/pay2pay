"use client";

import React from "react";
import { AppShell } from "@/app-shell/AppShell";
import LedgerReportPage from "@/app/(dashboard)/admin/reports/transaction-ledger/page";

export default function RetailerLedgerReportPage() {
  return (
    <AppShell pageTitle="Retailer Portal — Transaction Ledger" activePath="/retailer/reports/transaction-ledger">
      <LedgerReportPage />
    </AppShell>
  );
}
