import React from "react";
import AdminTransactionReport from "@/modules/reports/AdminTransactionReport";

export const metadata = {
  title: "Admin Transaction Report | Pay2Pay Enterprise",
  description: "Centralized Single Source of Truth Transaction and Wallet Ledger Report",
};

export default function AdminTransactionReportPage() {
  return <AdminTransactionReport />;
}
