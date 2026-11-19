"use client";

import React from "react";
import { AppShell } from "@/app-shell/AppShell";
import { RetailerPayinReport } from "@/modules/reports/RetailerPayinReport";

export default function SDPayinReportPage() {
  return (
    <AppShell pageTitle="SD Portal — PayIn Transactions" activePath="/sd/reports/payin-transactions">
      <RetailerPayinReport
        portalType="sd"
        title="Super Distributor PayIn Report"
        subtitle="Hierarchy-scoped view of merchant PayIn collections, gateway routing, and distributor margins."
      />
    </AppShell>
  );
}
