import { Metadata } from "next";
import { OrganizationMappingDashboard } from "@/components/admin/mapping/OrganizationMappingDashboard";

export const metadata: Metadata = {
  title: "Organization Mapping | Pay2Pay Enterprise Admin",
  description:
    "Centralized administrative console for managing Tenant, Company Master, Master Distributor, Distributor, and Retailer relationships and access scope.",
};

export default function AdminOrganizationMappingPage() {
  return <OrganizationMappingDashboard />;
}
