"use client";

import React from "react";
import { RetailerPayinReport } from "@/modules/reports/RetailerPayinReport";

export default function AdminPayinTransactionsPage() {
  return (
    <RetailerPayinReport
      portalType="admin"
      title="PayIn Master Transactions Journal"
      subtitle="Authoritative real-time view of all collections, gateway routing, charges, and ledger credits."
    />
  );
}
