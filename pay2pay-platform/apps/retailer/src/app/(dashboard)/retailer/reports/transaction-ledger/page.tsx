"use client";

import React from "react";
import { AppShell } from "@/app-shell/AppShell";
import { RetailerLedgerReport } from "@/modules/reports/RetailerLedgerReport";

export default function RetailerLedgerReportPage() {
  return (
    <AppShell pageTitle="Retailer Portal — Transaction Ledger" activePath="/retailer/reports/transaction-ledger">
      <RetailerLedgerReport />
    </AppShell>
  );
}
