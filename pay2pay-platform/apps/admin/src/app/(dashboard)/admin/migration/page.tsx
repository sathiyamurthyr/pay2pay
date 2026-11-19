import { Metadata } from "next";
import { AccountMigrationDashboard } from "@/components/admin/migration/AccountMigrationDashboard";

export const metadata: Metadata = {
  title: "Account Migration Hub | Pay2Pay Enterprise Admin",
  description:
    "Admin-only hierarchical account migration (Retailer to Distributor, Distributor to Super Distributor) with immutable audit trail and data preservation.",
};

export default function AdminAccountMigrationPage() {
  return <AccountMigrationDashboard />;
}
