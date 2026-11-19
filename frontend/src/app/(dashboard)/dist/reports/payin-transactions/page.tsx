"use client";

import React from "react";
import { AppShell } from "@/app-shell/AppShell";
import { RetailerPayinReport } from "@/modules/reports/RetailerPayinReport";

export default function DistPayinReportPage() {
  return (
    <AppShell pageTitle="Distributor Portal — PayIn Transactions" activePath="/dist/reports/payin-transactions">
      <RetailerPayinReport
        portalType="dist"
        title="Distributor PayIn Report"
        subtitle="Hierarchy-scoped view of merchant PayIn collections, gateway routing, and distributor margins."
      />
    </AppShell>
  );
}
