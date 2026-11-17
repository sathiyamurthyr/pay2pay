"use client";

import React, { Suspense } from "react";
import { RetailerDashboardView } from "@/modules/dashboard/RetailerDashboardView";

export default function RetailerPortalDashboardPage() {
  return (
    <Suspense fallback={null}>
      <RetailerDashboardView />
    </Suspense>
  );
}
