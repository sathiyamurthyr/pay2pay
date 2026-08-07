import React from "react";
import { AppShell } from "@/app-shell/AppShell";
import { ServiceType } from "../../services/TransactionAdapter/types";
import { TransactionWorkspace } from "../../components/TransactionWorkspace";

export interface TransactionLayoutProps {
  service: ServiceType;
}

export const TransactionLayout: React.FC<TransactionLayoutProps> = ({ service }) => {
  return (
    <AppShell pageTitle={`Service: ${service}`}>
      <TransactionWorkspace service={service} />
    </AppShell>
  );
};
